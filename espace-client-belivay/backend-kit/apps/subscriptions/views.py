# backend/apps/subscriptions/views.py
# Routes « Abonnement et cagnotte » (CL-14 ; FF-ABONNEMENT, 404 si fermé ; CAB-43, CAB-44 ; DP-54) :
#   GET/POST/PATCH me/subscription, POST me/subscription/pay, me/subscription/cancel, me/subscription/resume,
#   POST subscription-gifts, POST me/cagnotte/payout.
# Logique : services.py ; règles : regles.py (site/src/donnees/prime.ts) et registre ABO-*.

from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.client_core.idempotence import idempotent
from apps.client_core.interrupteurs import module
from apps.client_core.vues import VueClient

from . import serializers as s
from . import services

PRIME = ["Espace client · Abonnement et cagnotte"]


def _lire(serialiseur, request):
    ser = serialiseur(data=request.data)
    ser.is_valid(raise_exception=True)
    return ser.validated_data


class VueAbonnement(VueClient):
    permission_classes = [IsAuthenticated, module("FF-ABONNEMENT")]


class MonAbonnement(VueAbonnement):
    @extend_schema(tags=PRIME, summary="Palier, prélèvements, usage, cagnotte, parrainage (prime)")
    def get(self, request):
        return Response(services.prime(request.user))

    @extend_schema(tags=PRIME, summary="Souscrire ; 409 trial_used pour un 2e essai sur le même numéro (souscrire)")
    @idempotent()
    def post(self, request):
        d = _lire(s.Souscription, request)
        return Response(services.souscrire(request.user, d["palier"], d["formule"], d["moyen"]))

    @extend_schema(tags=PRIME, summary="Moyen des prochains prélèvements (changerMoyenAbonnement)")
    def patch(self, request):
        services.changer_moyen(request.user, _lire(s.Moyen, request)["moyen"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class PayerAbonnement(VueAbonnement):
    @extend_schema(tags=PRIME, summary="Payer après un prélèvement refusé : grâce ABO-GRACE (payerAbonnement)")
    @idempotent()
    def post(self, request):
        return Response(services.payer(request.user, _lire(s.Moyen, request)["moyen"]))


class Resilier(VueAbonnement):
    @extend_schema(tags=PRIME, summary="Résilier en un tap (resilierAbonnement)")
    def post(self, request):
        services.resilier(request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)


class Reprendre(VueAbonnement):
    @extend_schema(tags=PRIME, summary="Reprendre un abonnement résilié avant sa fin (reprendreAbonnement)")
    def post(self, request):
        services.reprendre(request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)


class Offrir(VueAbonnement):
    @extend_schema(tags=PRIME, summary="Offrir un abonnement, payé par carte (offrirAbonnement)")
    def post(self, request):
        d = _lire(s.Cadeau, request)
        return Response(services.offrir(request.user, d["numero"], d["prenom"], d["palier"], d["mois"], d["message"], d["carte"]))


class VerserCagnotte(VueAbonnement):
    @extend_schema(tags=PRIME, summary="Verser la cagnotte disponible ; rend le montant versé (verserCagnotte)")
    def post(self, request):
        return Response(services.verser_cagnotte(request.user))
