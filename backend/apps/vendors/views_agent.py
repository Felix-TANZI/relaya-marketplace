# backend/apps/vendors/views_agent.py
# DEV-SRV-01, T07-4/5 — écrans de l'agent de terrain (admin.belivay.com), réservés au groupe « agents-terrain »
# (apps.common.droits). La logique vit dans apps.vendors.agent_terrain ; ici, seulement la lecture de la requête.
#
#   GET  /api/vendors/agent/vendeurs                     les vendeurs que l'agent a inscrits
#   POST /api/vendors/agent/vendeurs                     inscrire : boutique, téléphone, quartier (+ point GPS, repères)
#   GET  /api/vendors/agent/vendeurs/<id>                une fiche
#   POST /api/vendors/agent/vendeurs/<id>/pieces         photo de la pièce prise sur place (recto, verso, selfie)
#   POST /api/vendors/agent/vendeurs/<id>/produits       saisir un produit du catalogue (+ photos)
#   POST /api/vendors/agent/vendeurs/<id>/acces          nouveau mot de passe provisoire

from django.db import transaction
from drf_spectacular.utils import extend_schema
from rest_framework import serializers, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from apps.accounts.compliance import FichierRefuse
from apps.catalog.models import ProductImage
from apps.catalog.serializers import ProductCreateUpdateSerializer, ProductSerializer
from apps.common.droits import Partie
from apps.common.storage import televersement_en_memoire

from . import agent_terrain
from .ouverture import Refus
from .views import MAX_IMAGE_SIZE_BYTES, MAX_IMAGES_PER_PRODUCT

TAG = ["Agent terrain"]


# ── Description des échanges pour le schéma OpenAPI (cliquet de la revue du 29/10, E1) ──────────────────────────
# La logique reste dans apps.vendors.agent_terrain ; ces sérialiseurs ne servent qu'à documenter.

class _Identite(serializers.Serializer):
    verifiee = serializers.BooleanField()
    manquantes = serializers.ListField(child=serializers.CharField())
    refusees = serializers.ListField(child=serializers.CharField())
    en_attente = serializers.ListField(child=serializers.CharField())


class FicheVendeurSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    boutique = serializers.CharField()
    telephone = serializers.CharField()
    identifiant = serializers.CharField()
    quartier = serializers.CharField()
    statut = serializers.CharField()
    identite = _Identite()
    pieces = serializers.DictField(child=serializers.CharField(allow_null=True))
    produits = serializers.IntegerField()
    acces_provisoire_expire_le = serializers.DateTimeField(allow_null=True)
    inscrit_le = serializers.DateTimeField()
    mot_de_passe_provisoire = serializers.CharField(required=False, help_text="Rendu une seule fois.")


class InscriptionSerializer(serializers.Serializer):
    boutique = serializers.CharField()
    telephone = serializers.CharField()
    quartier = serializers.CharField(help_text="Nom d'un quartier de t_quartiers (ou appellation sans ambiguïté).")
    gerant = serializers.CharField(required=False)
    latitude = serializers.FloatField(required=False, allow_null=True)
    longitude = serializers.FloatField(required=False, allow_null=True)
    reperes = serializers.CharField(required=False)


class PieceAgentSerializer(serializers.Serializer):
    piece = serializers.ChoiceField(choices=["recto", "verso", "selfie"])
    fichier = serializers.FileField()


class ProduitAgentSerializer(ProductCreateUpdateSerializer):
    stock_quantity = serializers.IntegerField(required=False, min_value=0)
    photos = serializers.ListField(child=serializers.ImageField(), required=False)

    class Meta(ProductCreateUpdateSerializer.Meta):
        fields = [*ProductCreateUpdateSerializer.Meta.fields, "stock_quantity", "photos"]


class RefusSerializer(serializers.Serializer):
    raison = serializers.CharField(required=False)
    detail = serializers.CharField()


def _ip(request):
    return request.META.get("REMOTE_ADDR")


def _vendeur_ou_404(request, vendor_id):
    profil = agent_terrain.vendeur_de_l_agent(request.user, vendor_id)
    if profil is None:
        return None, Response({"detail": "Vendeur introuvable parmi vos inscriptions."}, status=status.HTTP_404_NOT_FOUND)
    return profil, None


def _point(valeur):
    if valeur in (None, ""):
        return None
    try:
        return round(float(valeur), 6)
    except (TypeError, ValueError):
        return None


@extend_schema(methods=["GET"], tags=TAG, summary="Agent — list my registered vendors",
               operation_id="agent_vendeurs_liste", responses=FicheVendeurSerializer(many=True))
@extend_schema(methods=["POST"], tags=TAG, summary="Agent — register a vendor", operation_id="agent_vendeurs_inscrire",
               request=InscriptionSerializer, responses={201: FicheVendeurSerializer, 400: RefusSerializer})
@api_view(["GET", "POST"])
@permission_classes([Partie("terrain")])
def agent_vendeurs(request):
    if request.method == "GET":
        from .models import VendorProfile

        vendeurs = VendorProfile.objects.filter(inscription_par_agent__isnull=False).select_related(
            "user", "inscription_par_agent").prefetch_related("locations", "user__compliance_documents")
        if not request.user.is_superuser:
            vendeurs = vendeurs.filter(inscription_par_agent__agent=request.user)
        return Response([agent_terrain.fiche(v) for v in vendeurs.order_by("-inscription_par_agent__cree_le")[:200]])

    donnees = request.data
    try:
        profil, mot_de_passe = agent_terrain.inscrire_vendeur(
            request.user, nom=str(donnees.get("boutique") or ""), telephone=str(donnees.get("telephone") or ""),
            quartier=str(donnees.get("quartier") or ""), gerant=str(donnees.get("gerant") or ""),
            latitude=_point(donnees.get("latitude")), longitude=_point(donnees.get("longitude")),
            reperes=str(donnees.get("reperes") or ""), ip=_ip(request),
        )
    except Refus as refus:
        return Response({"raison": refus.raison, "detail": refus.message}, status=status.HTTP_400_BAD_REQUEST)
    # Seule fois où le mot de passe provisoire existe en clair : l'agent le remet au vendeur sur place.
    return Response({**agent_terrain.fiche(profil), "mot_de_passe_provisoire": mot_de_passe},
                    status=status.HTTP_201_CREATED)


@extend_schema(tags=TAG, summary="Agent — one registered vendor", operation_id="agent_vendeur_fiche",
               responses={200: FicheVendeurSerializer, 404: RefusSerializer})
@api_view(["GET"])
@permission_classes([Partie("terrain")])
def agent_vendeur(request, vendor_id):
    profil, erreur = _vendeur_ou_404(request, vendor_id)
    return erreur or Response(agent_terrain.fiche(profil))


@televersement_en_memoire  # R8 : la photo reste en mémoire jusqu'à R2, jamais dans un fichier temporaire
@extend_schema(tags=TAG, summary="Agent — upload the vendor's ID photo taken on site",
               request={"multipart/form-data": PieceAgentSerializer},
               responses={201: FicheVendeurSerializer, 400: RefusSerializer, 404: RefusSerializer})
@api_view(["POST"])
@permission_classes([Partie("terrain")])
def agent_vendeur_piece(request, vendor_id):
    profil, erreur = _vendeur_ou_404(request, vendor_id)
    if erreur:
        return erreur
    piece = str(request.data.get("piece") or "").strip()
    fichier = request.FILES.get("fichier")
    if piece not in agent_terrain.PIECES or not fichier:
        return Response({"detail": "Indiquez la pièce (recto, verso ou selfie) et joignez la photo."},
                        status=status.HTTP_400_BAD_REQUEST)
    try:
        agent_terrain.deposer_piece_pour(request.user, profil, piece, fichier, ip=_ip(request))
    except FichierRefuse as refus:
        return Response({"detail": refus.message}, status=status.HTTP_400_BAD_REQUEST)
    profil.refresh_from_db()
    return Response(agent_terrain.fiche(profil), status=status.HTTP_201_CREATED)


@extend_schema(tags=TAG, summary="Agent — add a product to the vendor's catalogue",
               request={"multipart/form-data": ProduitAgentSerializer, "application/json": ProduitAgentSerializer},
               responses={201: ProductSerializer, 400: RefusSerializer, 404: RefusSerializer})
@api_view(["POST"])
@permission_classes([Partie("terrain")])
def agent_vendeur_produit(request, vendor_id):
    profil, erreur = _vendeur_ou_404(request, vendor_id)
    if erreur:
        return erreur
    photos = request.FILES.getlist("photos")
    if len(photos) > MAX_IMAGES_PER_PRODUCT:
        return Response({"photos": f"{MAX_IMAGES_PER_PRODUCT} photos au plus."}, status=status.HTTP_400_BAD_REQUEST)
    if any(photo.size > MAX_IMAGE_SIZE_BYTES for photo in photos):
        return Response({"photos": f"Chaque photo doit faire moins de {MAX_IMAGE_SIZE_BYTES // (1024 * 1024)} Mo."},
                        status=status.HTTP_400_BAD_REQUEST)
    try:
        stock = max(int(request.data.get("stock_quantity") or 0), 0)
    except (TypeError, ValueError):
        return Response({"stock_quantity": "Nombre entier attendu."}, status=status.HTTP_400_BAD_REQUEST)

    # Même sérialiseur que l'écran du vendeur : l'offre naît EN ATTENTE de modération, et le verrou d'identité
    # (apps.vendors.kyc) la garde invisible tant que la pièce n'est pas validée.
    serializer = ProductCreateUpdateSerializer(
        data=request.data, context={"request": request, "stock_quantity": stock, "translate_content": False})
    serializer.is_valid(raise_exception=True)
    with transaction.atomic():
        produit = serializer.save(vendor=profil.user)
        for rang, photo in enumerate(photos):
            ProductImage.objects.create(product=produit, image=photo, order=rang, is_primary=(rang == 0))
        agent_terrain.journaliser(request.user, profil, "produit", {"produit": produit.pk}, ip=_ip(request))
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@extend_schema(tags=TAG, summary="Agent — new temporary password for the vendor", request=None,
               responses={200: FicheVendeurSerializer, 404: RefusSerializer, 409: RefusSerializer})
@api_view(["POST"])
@permission_classes([Partie("terrain")])
def agent_vendeur_acces(request, vendor_id):
    profil, erreur = _vendeur_ou_404(request, vendor_id)
    if erreur:
        return erreur
    try:
        mot_de_passe = agent_terrain.nouvel_acces(request.user, profil, ip=_ip(request))
    except Refus as refus:
        return Response({"raison": refus.raison, "detail": refus.message}, status=status.HTTP_409_CONFLICT)
    return Response({**agent_terrain.fiche(profil), "mot_de_passe_provisoire": mot_de_passe})
