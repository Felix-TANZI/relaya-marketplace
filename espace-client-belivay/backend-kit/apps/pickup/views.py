# backend/apps/pickup/views.py
# Commande après paiement (CL-09, CL-12) : annuler une boutique, changer de lieu, déléguer, racheter.
from drf_spectacular.utils import extend_schema
from rest_framework import serializers, status
from rest_framework.response import Response

from apps.client_core.erreurs import introuvable
from apps.client_core.idempotence import idempotent
from apps.client_core.vues import VueClient

from . import services

TAG = ["Espace client · commandes et retrait"]


class _Lieu(serializers.Serializer):
    lieu = serializers.CharField(help_text="relais (identifiant ou nom) ou adresse (identifiant ou libellé « Nom · Quartier »)")
    frais = serializers.IntegerField(min_value=0, default=0, help_text="montant annoncé au client (transfert + garde)")


class _Motif(serializers.Serializer):
    motif = serializers.CharField(max_length=255, allow_blank=True, default="")


class _Delegation(serializers.Serializer):
    prenom = serializers.CharField(max_length=120, allow_blank=True, default="")
    numero = serializers.CharField(max_length=20, allow_null=True, required=False, default=None)


def _lire(cls, request):
    s = cls(data=request.data)
    s.is_valid(raise_exception=True)
    return s.validated_data


@extend_schema(tags=TAG, summary="Aperçu de l'annulation d'une boutique (apercuAnnulation) : ?n= numéro du colis")
class Gerer(VueClient):
    def get(self, request, id):
        try:
            n = int(request.query_params.get("n", "1"))
        except ValueError:
            raise introuvable() from None
        return Response(services.apercu_annulation(id, request.user, n))


@extend_schema(tags=TAG, summary="Annuler une boutique (annulerColis) → montant remboursé ; 409 state_changed")
class AnnulerColis(VueClient):
    @idempotent()
    def post(self, request, id):
        return Response(services.annuler_colis(id, request.user, _lire(_Motif, request)["motif"]))


@extend_schema(tags=TAG, summary="Changer de relais (changerLieu) : 409 price_changed si le montant dû a changé")
class ChangerRelais(VueClient):
    def put(self, request, id):
        d = _lire(_Lieu, request)
        return Response(services.changer_lieu(request.user, order_ref=id, lieu=d["lieu"], frais_annonces=d["frais"]))


@extend_schema(tags=TAG, summary="Changer d'adresse (changerLieu) : 409 collected")
class ChangerAdresse(VueClient):
    def put(self, request, id):
        d = _lire(_Lieu, request)
        return Response(services.changer_lieu(request.user, order_ref=id, lieu=d["lieu"], frais_annonces=d["frais"], vers_adresse=True))


@extend_schema(tags=TAG, summary="Transférer un colis arrivé (changerLieu) : transfert + garde due (DP-37)")
class Transferer(VueClient):
    def post(self, request, id):
        d = _lire(_Lieu, request)
        return Response(services.changer_lieu(request.user, colis_ref=id, lieu=d["lieu"], frais_annonces=d["frais"]))


@extend_schema(tags=TAG, summary="Déléguer le retrait (deleguerRetrait) ; numero null : délégation retirée")
class Deleguer(VueClient):
    def put(self, request, id):
        d = _lire(_Delegation, request)
        services.deleguer(id, request.user, d["prenom"], d["numero"])
        return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema(tags=TAG, summary="Racheter (racheter) → nombre d'articles remis au panier")
class Racheter(VueClient):
    def post(self, request, id):
        return Response(services.racheter(id, request.user))
