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
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from apps.accounts.compliance import FichierRefuse
from apps.catalog.models import ProductImage
from apps.catalog.serializers import ProductCreateUpdateSerializer
from apps.common.droits import Partie
from apps.common.storage import televersement_en_memoire

from . import agent_terrain
from .ouverture import Refus
from .views import MAX_IMAGE_SIZE_BYTES, MAX_IMAGES_PER_PRODUCT

TAG = ["Agent terrain"]


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


@extend_schema(tags=TAG, summary="Agent — list or register vendors")
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


@extend_schema(tags=TAG, summary="Agent — one registered vendor")
@api_view(["GET"])
@permission_classes([Partie("terrain")])
def agent_vendeur(request, vendor_id):
    profil, erreur = _vendeur_ou_404(request, vendor_id)
    return erreur or Response(agent_terrain.fiche(profil))


@televersement_en_memoire  # R8 : la photo reste en mémoire jusqu'à R2, jamais dans un fichier temporaire
@extend_schema(tags=TAG, summary="Agent — upload the vendor's ID photo taken on site")
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


@extend_schema(tags=TAG, summary="Agent — add a product to the vendor's catalogue")
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


@extend_schema(tags=TAG, summary="Agent — new temporary password for the vendor")
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
