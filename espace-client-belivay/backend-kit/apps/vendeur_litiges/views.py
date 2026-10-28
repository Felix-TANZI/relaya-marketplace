# backend/apps/vendeur_litiges/views.py
# Routes des litiges et des retours de la boutique, sous /api/vendors/ (Q-51). Réponses : types de
# espace-vendeur/src/donnees/domaines/{litiges,retours}.ts, mêmes noms de champs. Refus attendus par l'écran : 200 avec
# { ok: false, raison } (reserve_proprietaire compris, comme la démonstration) ; dossier inconnu : 404 (→ null).
# Accès Préparation : preuves et photos oui, réponse, recours et choix non ; aucun montant (null).
from drf_spectacular.utils import extend_schema
from rest_framework import serializers, status
from rest_framework.response import Response

from apps.client_core.erreurs import introuvable
from apps.client_core.idempotence import idempotent
from apps.vendeur_core.acces import VueVendeur

from . import services
from .models import Dossier

TAG_LITIGES = ["Espace vendeur · litiges"]
TAG_RETOURS = ["Espace vendeur · retours"]


def _lire(serialiseur, request):
    s = serialiseur(data=request.data)
    s.is_valid(raise_exception=True)
    return s.validated_data


class Photo(serializers.Serializer):
    photo = serializers.CharField()


class BrouillonReponse(serializers.Serializer):
    posture = serializers.ChoiceField(choices=["accepte", "conteste", "arrangement"])
    arrangement = serializers.ChoiceField(choices=["remplacement", "remise"])
    texte = serializers.CharField(allow_blank=True, required=False, default="", max_length=4000)


class CorpsBrouillon(serializers.Serializer):
    brouillon = BrouillonReponse(allow_null=True)


class Reponse(serializers.Serializer):
    posture = serializers.ChoiceField(choices=["accepte", "conteste", "arrangement"])
    texte = serializers.CharField(allow_blank=True, required=False, default="", max_length=4000)
    arrangement = serializers.ChoiceField(choices=["remplacement", "remise"], allow_null=True, required=False, default=None)


class Recours(serializers.Serializer):
    texte = serializers.CharField(allow_blank=True, max_length=4000)


class Controles(serializers.Serializer):
    scelle = serializers.BooleanField()
    serie = serializers.BooleanField()


class BrouillonInspection(serializers.Serializer):
    controles = Controles()
    verdict = serializers.ChoiceField(choices=["conforme", "non_conforme"], allow_null=True, required=False, default=None)


class Inspection(serializers.Serializer):
    verdict = serializers.CharField()
    controles = Controles()


class Choix(serializers.Serializer):
    choix = serializers.ChoiceField(choices=["remplacer", "rembourser"])


# ── Litiges ─────────────────────────────────────────────────────────────────────────────────────────────


class LitigesVue(VueVendeur):
    @extend_schema(tags=TAG_LITIGES, summary="Litiges reçus (a_repondre | en_mediation | clos), triés par échéance")
    def get(self, request):
        return Response(services.litiges(self.boutique, self.proprietaire, request.query_params.get("state") or None))


class ReglesLitigesVue(VueVendeur):
    @extend_schema(tags=TAG_LITIGES, summary="Délais et seuils des litiges et des retours (registre)")
    def get(self, request):
        return Response(services.regles())


class CompteursLitigesVue(VueVendeur):
    @extend_schema(tags=TAG_LITIGES, summary="Compteurs des litiges et total gelé (null pour l'accès Préparation)")
    def get(self, request):
        return Response(services.compteurs_litiges(self.boutique, self.proprietaire))


class LitigeVue(VueVendeur):
    @extend_schema(tags=TAG_LITIGES, summary="Un litige : dires et photos du client, preuves, réponse, décision, recours")
    def get(self, request, ref):
        d = services.dossier(self.boutique, ref, Dossier.Voie.LITIGE)
        if d is None:
            raise introuvable("Ce litige n'existe pas.")
        return Response(services.vue_litige(d, self.proprietaire))


class PreuveVue(VueVendeur):
    @extend_schema(tags=TAG_LITIGES, summary="Ajouter une photo au dossier (propriétaire ou Préparation, Q-17)", request=Photo)
    @idempotent()
    def post(self, request, ref):
        return Response(services.ajouter_preuve(self.boutique, self.membre, ref, _lire(Photo, request)["photo"]))


class RetirerPreuveVue(VueVendeur):
    @extend_schema(tags=TAG_LITIGES, summary="Retirer une photo de la boutique (tant que la réponse n'est pas envoyée)")
    def delete(self, request, ref, ident):
        return Response(services.retirer_preuve(self.boutique, self.membre, ref, ident))


class BrouillonLitigeVue(VueVendeur):
    @extend_schema(tags=TAG_LITIGES, summary="Garder la réponse en cours (LIT-BROUILLON-H) ; null l'efface", request=CorpsBrouillon)
    def put(self, request, ref):
        services.garder_brouillon(self.boutique, ref, _lire(CorpsBrouillon, request)["brouillon"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class ReponseVue(VueVendeur):
    @extend_schema(tags=TAG_LITIGES, summary="Répondre au litige (propriétaire) : j'accepte, je conteste, arrangement", request=Reponse)
    @idempotent()
    def post(self, request, ref):
        v = _lire(Reponse, request)
        return Response(services.repondre(self.boutique, self.membre, ref, v["posture"], v["texte"], v["arrangement"]))


class RecoursVue(VueVendeur):
    @extend_schema(tags=TAG_LITIGES, summary="Recours du vendeur sur un litige perdu (une fois, LIT-RECOURS-H)", request=Recours)
    @idempotent()
    def post(self, request, ref):
        return Response(services.contester(self.boutique, self.membre, ref, _lire(Recours, request)["texte"]))


# ── Retours ─────────────────────────────────────────────────────────────────────────────────────────────


class RetoursVue(VueVendeur):
    @extend_schema(tags=TAG_RETOURS, summary="Retours (a_decider | en_route | clos)")
    def get(self, request):
        return Response(services.retours(self.boutique, self.proprietaire, request.query_params.get("state") or None))


class CompteursRetoursVue(VueVendeur):
    @extend_schema(tags=TAG_RETOURS, summary="Compteurs des retours")
    def get(self, request):
        return Response(services.compteurs_retours(self.boutique))


class RetourVue(VueVendeur):
    @extend_schema(tags=TAG_RETOURS, summary="Un retour : arrivée, inspection, suite, coûts (null pour l'accès Préparation)")
    def get(self, request, ref):
        d = services.dossier(self.boutique, ref, Dossier.Voie.RETOUR)
        if d is None:
            raise introuvable("Ce retour n'existe pas.")
        return Response(services.vue_retour(d, self.proprietaire))


class RecevoirVue(VueVendeur):
    @extend_schema(tags=TAG_RETOURS, summary="Retour remis par le livreur : lance RET-INSPECT-H (Q-72)", request=None)
    @idempotent()
    def post(self, request, ref):
        return Response(services.recevoir(self.boutique, self.membre, ref))


class PhotoRetourVue(VueVendeur):
    @extend_schema(tags=TAG_RETOURS, summary="Photo d'inspection (horodatée par le serveur)", request=Photo)
    @idempotent()
    def post(self, request, ref):
        return Response(services.ajouter_photo(self.boutique, self.membre, ref, _lire(Photo, request)["photo"]))


class RetirerPhotoRetourVue(VueVendeur):
    @extend_schema(tags=TAG_RETOURS, summary="Retirer une photo d'inspection pas encore envoyée")
    def delete(self, request, ref, ident):
        services.retirer_photo(self.boutique, ref, ident)
        return Response(status=status.HTTP_204_NO_CONTENT)


class BrouillonInspectionVue(VueVendeur):
    @extend_schema(tags=TAG_RETOURS, summary="Garder l'inspection en cours (contrôles, verdict)", request=BrouillonInspection)
    def put(self, request, ref):
        v = _lire(BrouillonInspection, request)
        services.garder_brouillon_inspection(self.boutique, ref, v["controles"], v["verdict"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class InspectionVue(VueVendeur):
    @extend_schema(tags=TAG_RETOURS, summary="Verdict d'inspection (2 photos, contrôles, sous RET-INSPECT-H)", request=Inspection)
    @idempotent()
    def post(self, request, ref):
        v = _lire(Inspection, request)
        return Response(services.inspecter(self.boutique, self.membre, ref, v["verdict"], v["controles"]))


class RemplacementVue(VueVendeur):
    @extend_schema(tags=TAG_RETOURS, summary="Défaut confirmé : remplacer ou rembourser (propriétaire)", request=Choix)
    @idempotent()
    def post(self, request, ref):
        return Response(services.proposer(self.boutique, self.membre, ref, _lire(Choix, request)["choix"]))


class RemplacementPretVue(VueVendeur):
    @extend_schema(tags=TAG_RETOURS, summary="Le remplacement est prêt pour le livreur", request=None)
    @idempotent()
    def post(self, request, ref):
        return Response(services.remplacement_pret(self.boutique, self.membre, ref))
