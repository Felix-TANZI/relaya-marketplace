# backend/apps/recus/views.py
# Boîte « Reçus » (DP-54). Logique : services.py. Réponses : types de site/src/donnees/source.ts (DonneesRecus,
# DetailRecu, ResultatRecu, EnvoiRecu).

from drf_spectacular.utils import extend_schema
from rest_framework import serializers
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle

from apps.client_core.idempotence import idempotent
from apps.client_core.vues import VueClient

from . import services
from .models import TYPES

TAG = ["Espace client · Reçus"]


def _lire(serializer_cls, request):
    s = serializer_cls(data=request.data)
    s.is_valid(raise_exception=True)
    return s.validated_data


class ActionRecu(serializers.Serializer):
    action = serializers.ChoiceField(choices=("offrir", "participer", "payer", "accepter", "refuser", "retirer"))
    p = serializers.CharField(max_length=40, required=False, allow_null=True)
    montant = serializers.IntegerField(min_value=0, required=False)
    moyen = serializers.CharField(max_length=120, required=False, allow_blank=True)
    qui = serializers.ChoiceField(choices=("payeur", "destinataire"), required=False, allow_null=True)
    mot = serializers.CharField(max_length=280, required=False, allow_blank=True, allow_null=True)
    discret = serializers.BooleanField(required=False, default=False)
    relais = serializers.CharField(max_length=160, required=False, allow_blank=True, allow_null=True)


class Texte(serializers.Serializer):
    texte = serializers.CharField(max_length=500, allow_blank=True)


class NouvelEnvoi(serializers.Serializer):
    type = serializers.ChoiceField(choices=TYPES)
    a = serializers.CharField(max_length=160)
    prenom = serializers.CharField(max_length=80)
    titre = serializers.CharField(max_length=200)
    occasion = serializers.CharField(max_length=20, required=False, allow_null=True, allow_blank=True)
    hotes = serializers.ListField(child=serializers.CharField(max_length=80), required=False)
    date = serializers.IntegerField(required=False, allow_null=True)
    lieu = serializers.CharField(max_length=160, required=False, allow_null=True, allow_blank=True)
    mot = serializers.CharField(max_length=280, required=False, allow_null=True, allow_blank=True)
    jusqua = serializers.IntegerField(required=False, allow_null=True)
    lignes = serializers.ListField(child=serializers.DictField(), required=False, max_length=60)
    frais = serializers.IntegerField(min_value=0, required=False)
    qui = serializers.ChoiceField(choices=("payeur", "destinataire"), required=False, allow_null=True)
    objectif = serializers.IntegerField(min_value=0, required=False, allow_null=True)
    cagnotte = serializers.DictField(required=False, allow_null=True)
    code = serializers.CharField(max_length=40, required=False, allow_null=True, allow_blank=True)
    ref = serializers.CharField(max_length=40, required=False, allow_null=True, allow_blank=True)
    detail = serializers.CharField(max_length=200, required=False, allow_null=True, allow_blank=True)
    lien = serializers.CharField(max_length=200, required=False, allow_null=True, allow_blank=True)


class LimiteEnvois(UserRateThrottle):
    """Anti-annuaire : 20 envois par jour (le site ne dit pas avant l'envoi si un numéro a un compte)."""

    scope = "recus_envois"
    rate = "20/day"


@extend_schema(tags=TAG, summary="Ma boîte « Reçus » (recus) : reçus à traiter d'abord, envoyés avec les réponses")
class Boite(VueClient):
    def get(self, request):
        return Response(services.boite(request.user))


@extend_schema(tags=TAG, summary="Un envoi et les moyens du compte (recu) ; 404 hors envoyeur et destinataire")
class Detail(VueClient):
    def get(self, request, id):
        return Response(services.detail(request.user, id))


@extend_schema(
    tags=TAG, summary="Exécuter un envoi (executerRecu) : 409 traite, 410 expire, 422 offert, montant, garantie, solde, moyen, diaspora"
)
class Action(VueClient):
    @idempotent()
    def post(self, request, id):
        return Response(services.executer(request.user, id, _lire(ActionRecu, request)))


@extend_schema(tags=TAG, summary="Remercier qui a payé (remercierRecu)")
class Merci(VueClient):
    def post(self, request, id):
        return Response(services.remercier(request.user, id, _lire(Texte, request)["texte"]))


@extend_schema(tags=TAG, summary="Envoyer à un proche par son numéro ou son e-mail (envoyerRecu) : 422 numero, moi, vide")
class Envoyer(VueClient):
    throttle_classes = [LimiteEnvois]

    def post(self, request):
        return Response(services.envoyer(request.user, _lire(NouvelEnvoi, request)))
