# backend/apps/wallet/views.py
# Routes « Portefeuille, moyens de paiement, factures » (CL-13 ; CWL-01 à CWL-12 ; CCO-07, CCO-14, CCO-15, CCO-20 ;
# DP-06, DP-16, DP-17, DP-23, DP-48 ; CAP-21, CAP-24).
#
#   Portefeuille (FF-WALLET, 404 si fermé) : GET me/wallet, POST me/wallet/topups, GET me/wallet/withdrawal-fee,
#                                            POST me/wallet/withdrawals
#   Moyens Mobile Money (toujours)         : GET/POST me/moyens-paiement, POST me/moyens-paiement/{id}/verify,
#                                            PATCH/DELETE me/moyens-paiement/{id}
#   Cartes (toujours)                      : GET/POST me/cartes, PATCH/DELETE me/cartes/{id}
#   Factures (toujours)                    : GET me/factures (paginé), GET orders/{id}/invoice.pdf
#
# Toute la logique est dans services.py et factures.py ; chaque requête ne voit que les objets du client connecté.

from django.http import HttpResponse
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.client_core import pont
from apps.client_core.erreurs import ErreurClient, introuvable
from apps.client_core.idempotence import idempotent
from apps.client_core.interrupteurs import module
from apps.client_core.pagination import page
from apps.client_core.temps import ms
from apps.client_core.vues import VueClient

from . import factures as fact
from . import serializers as s
from . import services

ARGENT = ["Espace client · Portefeuille, moyens de paiement, factures"]


def _lire(serialiseur, request):
    ser = serialiseur(data=request.data)
    ser.is_valid(raise_exception=True)
    return ser.validated_data


class VuePortefeuille(VueClient):
    permission_classes = [IsAuthenticated, module("FF-WALLET")]


# ── Portefeuille ────────────────────────────────────────────────────────────────────────────────────────────


class Portefeuille(VuePortefeuille):
    @extend_schema(tags=ARGENT, summary="Portefeuille : solde, retirable, historique, règles (portefeuille)")
    def get(self, request):
        return Response(services.donnees_portefeuille(request.user))


class Recharges(VuePortefeuille):
    @extend_schema(tags=ARGENT, summary="Recharger par Mobile Money ; crédit à la confirmation de l'agrégateur (recharger)")
    @idempotent()
    def post(self, request):
        d = _lire(s.MontantMoyen, request)
        return Response(services.recharger(request.user, d["montant"], d["moyen"]))


class FraisRetrait(VuePortefeuille):
    @extend_schema(tags=ARGENT, summary="Frais d'un retrait de ce montant maintenant (fraisRetrait)")
    def get(self, request):
        try:
            montant = int(request.query_params.get("montant", "0"))
        except ValueError:
            raise ErreurClient(
                status.HTTP_400_BAD_REQUEST, "invalid", "Montant invalide.", {"fields": {"montant": ["entier attendu"]}}
            ) from None
        return Response(services.frais_retrait(request.user, montant))


class Retraits(VuePortefeuille):
    @extend_schema(tags=ARGENT, summary="Retirer vers un numéro vérifié (retirer)")
    @idempotent()
    def post(self, request):
        d = _lire(s.MontantMoyen, request)
        return Response(services.retirer(request.user, d["montant"], d["moyen"]))


# ── Moyens Mobile Money ─────────────────────────────────────────────────────────────────────────────────────


class Moyens(VueClient):
    @extend_schema(tags=ARGENT, summary="Numéros Mobile Money, celui du compte d'abord (moyensPaiement)")
    def get(self, request):
        return Response(services.liste_moyens(request.user))

    @extend_schema(tags=ARGENT, summary="Ajouter un numéro MTN ou Orange : code envoyé par SMS (ajouterMoyen)")
    def post(self, request):
        d = _lire(s.Numero, request)
        return Response(services.ajouter_moyen(request.user, d["numero"]))


class VerifierMoyen(VueClient):
    @extend_schema(tags=ARGENT, summary="Confirmer un numéro par le code reçu (confirmerMoyen)")
    def post(self, request, id):
        d = _lire(s.Code, request)
        return Response(services.confirmer_moyen(request.user, id, d["code"]))


class UnMoyen(VueClient):
    @extend_schema(tags=ARGENT, summary="Numéro par défaut (moyenParDefaut)")
    def patch(self, request, id):
        if _lire(s.ParDefaut, request)["par_defaut"]:
            services.moyen_par_defaut(request.user, id)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @extend_schema(tags=ARGENT, summary="Retirer un numéro ; celui du compte ne se retire pas (retirerMoyen)")
    def delete(self, request, id):
        services.retirer_moyen(request.user, id)
        return Response(status=status.HTTP_204_NO_CONTENT)


# ── Cartes ──────────────────────────────────────────────────────────────────────────────────────────────────


class Cartes(VueClient):
    @extend_schema(tags=ARGENT, summary="Cartes enregistrées chez le prestataire (cartes)")
    def get(self, request):
        return Response(services.liste_cartes(request.user))

    @extend_schema(tags=ARGENT, summary="Enregistrer une carte à partir du jeton du prestataire (ajouterCarte)")
    def post(self, request):
        d = _lire(s.NouvelleCarte, request)
        return Response(services.ajouter_carte(request.user, d["jeton"], d.get("titulaire", "")))


class UneCarte(VueClient):
    @extend_schema(tags=ARGENT, summary="Carte par défaut (carteParDefaut)")
    def patch(self, request, id):
        if _lire(s.ParDefaut, request)["par_defaut"]:
            services.definir_carte_par_defaut(request.user, id)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @extend_schema(tags=ARGENT, summary="Retirer une carte (retirerCarte)")
    def delete(self, request, id):
        services.retirer_carte(request.user, id)
        return Response(status=status.HTTP_204_NO_CONTENT)


# ── Factures ────────────────────────────────────────────────────────────────────────────────────────────────


class Factures(VueClient):
    @extend_schema(tags=ARGENT, summary="Factures des commandes retirées, émises par BelivaY (factures)")
    def get(self, request):
        maintenant = timezone.now()
        commandes, suivant = page(request, fact.retirees(request.user), taille=20)
        premiere = not request.query_params.get("cursor")
        return Response(
            {
                "factures": fact.factures(request.user, commandes, maintenant),
                "annulees": fact.liste_annulees(request.user, maintenant) if premiere else [],
                "maintenant": ms(maintenant),
                "next_cursor": suivant,
            }
        )


class FacturePdf(VueClient):
    @extend_schema(tags=ARGENT, summary="Facture PDF d'une commande retirée (factures)")
    def get(self, request, id):
        try:
            order_id = pont.id_commande(id)
        except ValueError:
            raise introuvable() from None
        mc = fact.retirees(request.user).filter(order_id=order_id).first()
        if mc is None:
            raise introuvable("Pas de facture pour cette commande.")
        contenu = fact.pdf(request.user, mc, timezone.now())
        reponse = HttpResponse(contenu, content_type="application/pdf")
        reponse["Content-Disposition"] = f'attachment; filename="facture-{mc.ref}.pdf"'
        return reponse
