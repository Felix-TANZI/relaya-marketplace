# backend/apps/payments/wallet/views.py
# API du Wallet — feuille de route D16 ; spec v2.1, R03. Tout repond 403 « wallet_ferme » tant que
# r_wallet_ouvert = 0 (R03.2), sauf la lecture du suivi par l'equipe finance.

from django.contrib.auth.models import User
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.payments.api.admin.permissions import IsFinanceStaff, can_approve_money
from apps.payments.intents.models import PaymentIntent

from . import services
from .models import GestePortefeuille, MouvementPortefeuille

TAGS = ["Payments · Wallet"]


def _refus(exc: services.WalletError):
    code = status.HTTP_403_FORBIDDEN if exc.code == "wallet_ferme" else status.HTTP_400_BAD_REQUEST
    return Response({"code": exc.code, "detail": exc.message}, status=code)


def _mouvement(m: MouvementPortefeuille) -> dict:
    return {"id": str(m.id), "sorte": m.sorte, "libelle": m.libelle or m.get_sorte_display(),
            "montant_xaf": m.montant_xaf, "part_geste_xaf": m.part_geste_xaf, "frais_xaf": m.frais_xaf,
            "intent": m.intent_reference, "le": m.created_at}


def _etat(user) -> dict:
    from apps.regles import services as regles

    p = services.portefeuille_de(user)
    return {"ouvert": services.ouvert(), "solde_xaf": p.solde_xaf, "retirable_xaf": p.solde_retirable_xaf,
            "geste_xaf": p.solde_geste_xaf, "code_defini": bool(p.code_hash),
            "plafond_xaf": regles.reglage("r_wallet_plafond"), "code_des_xaf": regles.reglage("r_wallet_code_des"),
            "retrait_min_xaf": regles.reglage("r_retrait_wallet_min"),
            "mouvements": [_mouvement(m) for m in p.mouvements.all()[:50]]}


@extend_schema(tags=TAGS, summary="Mon Wallet")
class MonWalletView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(_etat(request.user))


@extend_schema(tags=TAGS, summary="Recharger mon Wallet par Mobile Money (gratuit, R03.3)")
class RechargeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        from apps.payments.application.collect import CollectError, initiate_collect

        try:
            intent = services.preparer_recharge(
                request.user, montant=request.data.get("montant_xaf") or 0,
                msisdn=(request.data.get("payer_msisdn") or "").replace(" ", ""),
                operator=request.data.get("payer_operator") or "", cle=request.data.get("cle") or "")
            issue = initiate_collect(intent)
        except services.WalletError as exc:
            return _refus(exc)
        except CollectError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"reference": intent.reference, "status": issue.status, "message": issue.message})


@extend_schema(tags=TAGS, summary="Payer une commande avec le Wallet (sans frais, R03.3 ; code au-delà, R03.5)")
class PayerView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, reference):
        intent = get_object_or_404(PaymentIntent, reference=reference, buyer=request.user)
        try:
            intent = services.payer(intent, user=request.user, code=request.data.get("code") or "")
        except services.WalletError as exc:
            return _refus(exc)
        return Response({"reference": intent.reference, "status": intent.status})


@extend_schema(tags=TAGS, summary="Choisir ou changer le code à 4 chiffres (R03.5)")
class CodeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            services.definir_code(request.user, request.data.get("code") or "", request.data.get("ancien") or "")
        except services.WalletError as exc:
            return _refus(exc)
        return Response({"code_defini": True})


@extend_schema(tags=TAGS, summary="Frais et somme reçue d'un retrait, avant validation (R03.4)")
class DevisRetraitView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not services.ouvert():
            return _refus(services.WalletError("wallet_ferme", "Le Wallet n'est pas encore ouvert."))
        try:
            montant = int(request.query_params.get("montant_xaf") or 0)
        except ValueError:
            montant = 0
        return Response(services.devis_retrait(request.user, montant))


@extend_schema(tags=TAGS, summary="Retirer vers le numéro qui a rechargé (R03.4)")
class RetraitView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            m = services.retirer(request.user, montant=request.data.get("montant_xaf") or 0,
                                 numero_masque=request.data.get("numero") or "", cle=request.data.get("cle") or "")
        except services.WalletError as exc:
            return _refus(exc)
        if m.sorte == MouvementPortefeuille.Sorte.RETRAIT_ANNULE:
            return Response({"code": "retrait_refuse", "detail": m.libelle}, status=status.HTTP_400_BAD_REQUEST)
        return Response({**_mouvement(m), "solde": _etat(request.user)["solde_xaf"]})


# ── Administration (feuille de route D16 : suivi du Wallet) ─────────────────────────────────────────────

def _geste(g: GestePortefeuille) -> dict:
    return {"id": g.pk, "client": g.client.username, "commande": g.order_id, "montant_xaf": g.montant_xaf,
            "motif": g.motif,
            "statut": g.statut, "demande_par": g.demande_par.username,
            "decide_par": g.decide_par.username if g.decide_par else None, "le": g.created_at}


@extend_schema(tags=TAGS, summary="Suivi des Wallets (finance)")
class SuiviWalletView(APIView):
    permission_classes = [IsAuthenticated, IsFinanceStaff]

    def get(self, request):
        mouvements = MouvementPortefeuille.objects.select_related("portefeuille__client")[:100]
        return Response({**services.suivi(),
                         "mouvements": [{**_mouvement(m), "client": m.portefeuille.client.username}
                                        for m in mouvements],
                         "gestes": [_geste(g) for g in GestePortefeuille.objects.select_related(
                             "client", "demande_par", "decide_par")[:50]]})


@extend_schema(tags=TAGS, summary="Demander un geste commercial sur un Wallet (R03.6)")
class GesteView(APIView):
    permission_classes = [IsAuthenticated, IsFinanceStaff]

    def post(self, request):
        client = get_object_or_404(User, pk=request.data.get("client_id"))
        try:
            g = services.demander_geste(client, montant=request.data.get("montant_xaf") or 0,
                                        motif=request.data.get("motif") or "", demande_par=request.user,
                                        order_id=request.data.get("order_id"))
        except services.WalletError as exc:
            return _refus(exc)
        return Response(_geste(g), status=status.HTTP_201_CREATED)


@extend_schema(tags=TAGS, summary="Approuver ou refuser un geste commercial (un autre membre de la finance)")
class GesteDecisionView(APIView):
    permission_classes = [IsAuthenticated, IsFinanceStaff]

    def post(self, request, pk):
        if not can_approve_money(request.user):
            return Response({"detail": "Approbation réservée à la finance."}, status=status.HTTP_403_FORBIDDEN)
        g = get_object_or_404(GestePortefeuille, pk=pk)
        try:
            g = services.decider_geste(g, par=request.user, accepte=bool(request.data.get("accepte")))
        except services.WalletError as exc:
            return _refus(exc)
        return Response(_geste(g))
