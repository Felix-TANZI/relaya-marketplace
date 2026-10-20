# backend/apps/aftersales/views.py
# Routes de l'après-vente (CL-09, CL-11, CL-13). Réponses : types de site/src/donnees/source.ts (litiges, litige,
# commandeLitige, ouvrirLitige, ajouterPreuve, repondreArrangement, contesterDecision, retirerLitige, deposerRetour,
# choisirRemplacement, avis, envoyerAvis, voterAvis). Filtrage au queryset : le dossier ou la commande d'un autre
# client n'est jamais chargé (404). Logique : services.py.

from drf_spectacular.utils import extend_schema
from rest_framework import serializers
from rest_framework.response import Response

from apps.client_core.erreurs import introuvable
from apps.client_core.idempotence import idempotent
from apps.client_core.pagination import page
from apps.client_core.temps import maintenant_ms
from apps.client_core.vues import VueClient

from . import services
from .models import Litige

TAG_LITIGES = ["Espace client · Litiges et retours"]
TAG_AVIS = ["Espace client · Avis"]


class LitigesVue(VueClient):
    @extend_schema(tags=TAG_LITIGES, summary="Mes dossiers de litige")
    def get(self, request):
        qs = Litige.objects.filter(client=request.user).prefetch_related("preuves")
        elements, suivant = page(request, qs, taille=20)
        return Response({"litiges": [services.litige_json(x) for x in elements], "maintenant": maintenant_ms(), "next_cursor": suivant})


class NouveauLitige(serializers.Serializer):
    ref = serializers.CharField(max_length=20)
    colis = serializers.CharField(max_length=30)
    pb = serializers.ChoiceField(choices=Litige.Probleme.choices)
    description = serializers.CharField(max_length=2000, allow_blank=True, required=False, default="")
    souhait = serializers.ChoiceField(choices=Litige.Souhait.choices)
    photos = serializers.ListField(child=serializers.CharField(), required=False, default=list, max_length=10)
    origine = serializers.ChoiceField(choices=[("comptoir", "comptoir"), ("appli", "appli")], required=False, allow_null=True)


class OuvrirLitigeVue(VueClient):
    @extend_schema(tags=TAG_LITIGES, summary="Ouvrir un litige sur un colis (un dossier par colis)", request=NouveauLitige)
    @idempotent()
    def post(self, request):
        donnees = request.data.copy() if hasattr(request.data, "copy") else dict(request.data)
        if "pb" not in donnees and "probleme" in donnees:  # nom du contrat (openapi : probleme)
            donnees["pb"] = donnees["probleme"]
        entree = NouveauLitige(data=donnees)
        entree.is_valid(raise_exception=True)
        v = entree.validated_data
        lit = services.ouvrir(request.user, v["ref"], v["colis"], v["pb"], v["description"], v["souhait"], v["photos"], v.get("origine"))
        return Response(services.litige_json(lit))


class LitigeVue(VueClient):
    @extend_schema(tags=TAG_LITIGES, summary="Un dossier : état, échéance, réponse du vendeur, décision et motif")
    def get(self, request, id):
        return Response({"litige": services.litige_json(services.litige_du_client(request.user, id)), "maintenant": maintenant_ms()})


class PreuveVue(VueClient):
    @extend_schema(tags=TAG_LITIGES, summary="Verser une photo au dossier (horodatée par le serveur)", request=None, responses={204: None})
    def post(self, request, id):
        photo = request.FILES.get("photo") or request.data.get("photo")
        if not photo:
            raise serializers.ValidationError({"photo": ["Photo manquante."]})
        services.ajouter_preuve(request.user, id, photo)
        return Response(status=204)


class ArrangementEntree(serializers.Serializer):
    accepte = serializers.BooleanField()


class ArrangementVue(VueClient):
    @extend_schema(
        tags=TAG_LITIGES, summary="Répondre à l'arrangement proposé par le vendeur", request=ArrangementEntree, responses={204: None}
    )
    def post(self, request, id):
        entree = ArrangementEntree(data=request.data)
        entree.is_valid(raise_exception=True)
        services.repondre_arrangement(request.user, id, entree.validated_data["accepte"])
        return Response(status=204)


class RecoursEntree(serializers.Serializer):
    motif = serializers.CharField(max_length=2000, allow_blank=True)


class RecoursVue(VueClient):
    @extend_schema(
        tags=TAG_LITIGES, summary="Contester la décision (une fois, sous LIT-RECOURS-H)", request=RecoursEntree, responses={204: None}
    )
    def post(self, request, id):
        entree = RecoursEntree(data=request.data)
        entree.is_valid(raise_exception=True)
        services.contester(request.user, id, entree.validated_data["motif"])
        return Response(status=204)


class RetirerVue(VueClient):
    @extend_schema(tags=TAG_LITIGES, summary="Retirer mon dossier", request=None, responses={204: None})
    def post(self, request, id):
        services.retirer(request.user, id)
        return Response(status=204)


class DepotRetourVue(VueClient):
    @extend_schema(tags=TAG_LITIGES, summary="« J'ai déposé le colis au relais »", request=None, responses={204: None})
    def post(self, request, id):
        services.deposer_retour(request.user, id)
        return Response(status=204)


class CommandeLitigeVue(VueClient):
    @extend_schema(tags=TAG_LITIGES, summary="Colis d'une commande, pour ouvrir un litige (?for=dispute)")
    def get(self, request, id):
        if request.query_params.get("for") != "dispute":
            # Le détail d'une commande reste la route de relaya : GET /api/orders/{id}/ (avec barre finale).
            raise serializers.ValidationError({"for": ["Seule la vue « dispute » est servie ici."]})
        c = services.commande_litige(request.user, id)
        if c is None:
            raise introuvable("Commande introuvable.")
        return Response(c)


class RemplacementEntree(serializers.Serializer):
    autre_vendeur = serializers.BooleanField()


class RemplacementVue(VueClient):
    @extend_schema(
        tags=TAG_LITIGES,
        summary="Le vendeur n'a plus l'article : autre vendeur ou remboursement",
        request=RemplacementEntree,
        responses={204: None},
    )
    def post(self, request, id):
        entree = RemplacementEntree(data=request.data)
        entree.is_valid(raise_exception=True)
        services.choisir_remplacement(request.user, id, entree.validated_data["autre_vendeur"])
        return Response(status=204)


class AvisEntree(serializers.Serializer):
    notes = serializers.ListField(child=serializers.IntegerField(), min_length=1, max_length=20)
    commentaire = serializers.CharField(max_length=2000, allow_blank=True, required=False, default="")
    photo = serializers.CharField(allow_null=True, allow_blank=True, required=False, default=None)


class AvisVue(VueClient):
    @extend_schema(tags=TAG_AVIS, summary="Commande à noter (fenêtre AVIS-FENETRE après le retrait)")
    def get(self, request, id):
        d = services.donnees_avis(request.user, id)
        if d is None:
            raise introuvable("Commande introuvable.")
        return Response(d)

    def _envoyer(self, request, id):
        donnees = dict(request.data.items()) if hasattr(request.data, "items") else {}
        if "notes" not in donnees and "notes[]" in donnees:
            donnees["notes"] = request.data.getlist("notes[]") if hasattr(request.data, "getlist") else donnees["notes[]"]
        elif hasattr(request.data, "getlist") and "notes" in donnees:
            donnees["notes"] = request.data.getlist("notes")
        entree = AvisEntree(data=donnees)
        entree.is_valid(raise_exception=True)
        v = entree.validated_data
        photo = request.FILES.get("photo") or v.get("photo") or None
        return Response(services.envoyer_avis(request.user, id, v["notes"], v["commentaire"], photo))

    @extend_schema(tags=TAG_AVIS, summary="Noter la commande (403 non_eligible, 410 fenetre_fermee)", request=AvisEntree)
    def post(self, request, id):
        return self._envoyer(request, id)

    @extend_schema(tags=TAG_AVIS, summary="Modifier mes notes tant que la fenêtre court", request=AvisEntree)
    def put(self, request, id):
        return self._envoyer(request, id)


class VoteEntree(serializers.Serializer):
    action = serializers.ChoiceField(choices=[("utile", "utile"), ("signaler", "signaler")])


class VoteVue(VueClient):
    @extend_schema(
        tags=TAG_AVIS,
        summary="« Utile » ou « Signaler » sur un avis produit (un vote par client)",
        request=VoteEntree,
        responses={204: None},
    )
    def post(self, request, id):
        entree = VoteEntree(data=request.data)
        entree.is_valid(raise_exception=True)
        services.voter(request.user, id, entree.validated_data["action"])
        return Response(status=204)
