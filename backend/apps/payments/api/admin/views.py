# backend/apps/payments/api/admin/views.py
# API d'administration financiere.
#
# ─────────────────────────────────────────────────────────────────────────────
# CETTE COUCHE EXPOSE, ELLE NE REIMPLEMENTE JAMAIS
#
# `approve_payout`, `execute_refund`, `freeze_hold`, `create_adjustment` sont
# ecrits, testes, et portent la separation des roles, les machines a etats et
# les ecritures comptables.
#
# Les vues les APPELLENT. Aucune logique metier ici — c'est ce qui garantit
# qu'une interface ne pourra pas contourner un invariant, meme par erreur.
#
# Corollaire pratique : une SettlementError devient un 400 avec son message.
# Ces messages sont ecrits pour etre lus par un humain ; les afficher tels
# quels vaut mieux que de les traduire une seconde fois.
# ─────────────────────────────────────────────────────────────────────────────

import logging

from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.payments.escrow.models import EscrowEvent, EscrowHold
from apps.payments.intents.models import PaymentIntent
from apps.payments.payees.models import PayeeAccount
from apps.payments.reconciliation.models import Discrepancy, ReconciliationRun
from apps.payments.risk.models import RiskAssessment, TrustScore
from apps.payments.settlements.models import (
    Adjustment, PayoutRequest, Refund, SettlementBatch,
)
from apps.payments.tasks.models import TaskRun

from . import filters as f
from .pagination import FinancePagination
from .permissions import CanApproveMoney, IsFinanceStaff
from .serializers import (
    AdminAdjustmentSerializer, AdminBatchDetailSerializer,
    AdminBatchListSerializer, AdminDiscrepancySerializer,
    AdminEscrowDetailSerializer, AdminEscrowEventSerializer,
    AdminEscrowListSerializer, AdminIntentDetailSerializer,
    AdminIntentListSerializer, AdminPayeeSerializer,
    AdminPayoutDetailSerializer, AdminPayoutListSerializer,
    AdminReconciliationRunSerializer, AdminRefundSerializer,
    AdminRiskAssessmentSerializer, AdminTaskRunSerializer,
    AdminTrustScoreSerializer, BuildSettlementsSerializer,
    CreateAdjustmentSerializer, CreateRefundSerializer,
    OptionalCommentSerializer, ReasonInputSerializer,
    ResolveDiscrepancySerializer,
)

logger = logging.getLogger("apps.payments.api.admin")

TAG = ["Payments · Administration"]


class FinanceListView(generics.ListAPIView):
    """Base des listes : habilitation, pagination, periode."""

    permission_classes = [IsFinanceStaff]
    pagination_class = FinancePagination
    date_field = "created_at"
    search_fields: list = []

    def filtrer(self, queryset):
        params = self.request.query_params
        queryset = f.appliquer_periode(queryset, params, self.date_field)
        queryset = f.appliquer_statut(queryset, params)
        queryset = f.appliquer_recherche(queryset, params, self.search_fields)
        return queryset


def _erreur(exc) -> Response:
    """
    Traduit une erreur de service en reponse.

    Les messages des services sont ecrits pour etre lus par un humain — on
    les transmet tels quels plutot que de les reformuler une seconde fois.
    """
    return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)


# ═══════════════════════════════════════════════════════════════════════════
# TABLEAU DE BORD
# ═══════════════════════════════════════════════════════════════════════════

@extend_schema(tags=TAG, summary="Synthese financiere")
class FinanceDashboardView(APIView):
    """
    La question du matin : est-ce que tout va bien ?

    Reutilise `reporting.dashboard.build` — la meme synthese que la commande
    en terminal, y compris ses signaux et leurs actions recommandees.
    """

    permission_classes = [IsFinanceStaff]

    def get(self, request):
        from apps.payments.reporting.dashboard import build

        hors_ligne = request.query_params.get("offline") in ("1", "true")
        jours = int(request.query_params.get("days") or 7)
        return Response(build(interroger_prestataire=not hors_ligne,
                              jours=jours))


@extend_schema(tags=TAG, summary="Pilotage — series et tendances")
class FinanceAnalyticsView(APIView):
    """
    Ecran SEPARE du tableau de bord.

    ─────────────────────────────────────────────────────────────────────────
    DEUX QUESTIONS, DEUX ECRANS

    Le tableau de bord repond a « dois-je agir ce matin ? ». Celui-ci repond
    a « comment ca evolue ? ».

    Les melanger nuirait aux deux : une alerte perdue au milieu de
    graphiques est une alerte manquee, et un graphique coince entre deux
    avertissements n'est jamais lu.
    ─────────────────────────────────────────────────────────────────────────
    """

    permission_classes = [IsFinanceStaff]

    def get(self, request):
        from apps.payments.reporting.analytics import build

        try:
            jours = int(request.query_params.get("days") or 30)
        except ValueError:
            jours = 30
        # Au-dela d'un an, la requete coute plus qu'elle n'apprend.
        jours = max(7, min(365, jours))
        return Response(build(days=jours))


@extend_schema(tags=TAG, summary="Controle avant production")
class FinancePreflightView(APIView):
    """Les points bloquants avant une mise en production."""

    permission_classes = [IsFinanceStaff]

    def get(self, request):
        from io import StringIO

        from django.core.management import call_command

        tampon = StringIO()
        code = 0
        try:
            call_command("payments_preflight", stdout=tampon)
        except SystemExit as sortie:
            code = sortie.code or 0
        return Response({"exit_code": code, "output": tampon.getvalue()})


# ═══════════════════════════════════════════════════════════════════════════
# PAIEMENTS
# ═══════════════════════════════════════════════════════════════════════════

@extend_schema(tags=TAG, summary="Intentions de paiement")
class AdminIntentListView(FinanceListView):
    serializer_class = AdminIntentListSerializer
    search_fields = ["reference", "correlation_id", "payer_msisdn_masked"]

    def get_queryset(self):
        qs = PaymentIntent.objects.select_related("buyer").order_by("-created_at")
        qs = self.filtrer(qs)
        return f.appliquer_montant(qs, self.request.query_params)


@extend_schema(tags=TAG, summary="Detail d'une intention")
class AdminIntentDetailView(generics.RetrieveAPIView):
    permission_classes = [IsFinanceStaff]
    serializer_class = AdminIntentDetailSerializer
    lookup_field = "reference"
    queryset = PaymentIntent.objects.prefetch_related(
        "attempts", "escrow_holds__payee").select_related("buyer")


@extend_schema(tags=TAG, summary="Re-interroger le prestataire")
class AdminIntentPollView(APIView):
    """
    Le prestataire fait foi, jamais l'etat local (principe P6).

    Utile sur une intention bloquee : CamPay n'emet aucun webhook pour une
    transaction restee en attente.
    """

    permission_classes = [IsFinanceStaff]

    def post(self, request, reference):
        from apps.payments.application.collect import poll_attempt

        intent = get_object_or_404(PaymentIntent, reference=reference)
        tentative = intent.attempts.exclude(
            provider_reference="").order_by("-created_at").first()
        if tentative is None:
            return Response({"detail": "Aucune demande emise."},
                            status=status.HTTP_400_BAD_REQUEST)
        try:
            issue = poll_attempt(tentative)
        except Exception as exc:
            return _erreur(exc)
        return Response({"status": issue.status, "message": issue.message})


# ═══════════════════════════════════════════════════════════════════════════
# SEQUESTRES
# ═══════════════════════════════════════════════════════════════════════════

@extend_schema(tags=TAG, summary="Sequestres")
class AdminEscrowListView(FinanceListView):
    serializer_class = AdminEscrowListSerializer
    search_fields = ["reference", "intent__reference", "payee__payee_code"]

    def get_queryset(self):
        qs = EscrowHold.objects.select_related("payee", "intent").order_by(
            "-created_at")
        qs = self.filtrer(qs)
        qs = f.appliquer_beneficiaire(qs, self.request.query_params)
        composant = (self.request.query_params.get("component") or "").strip()
        if composant:
            qs = qs.filter(component=composant.upper())
        commande = (self.request.query_params.get("order_id") or "").strip()
        if commande.isdigit():
            qs = qs.filter(order_id=int(commande))
        return qs


@extend_schema(tags=TAG, summary="Detail d'un sequestre")
class AdminEscrowDetailView(generics.RetrieveAPIView):
    permission_classes = [IsFinanceStaff]
    serializer_class = AdminEscrowDetailSerializer
    lookup_field = "reference"
    queryset = EscrowHold.objects.select_related("payee", "intent")


@extend_schema(tags=TAG, summary="Geler un sequestre",
               request=ReasonInputSerializer)
class AdminEscrowFreezeView(APIView):
    """
    Gele CE sequestre, et lui seul.

    Un litige sur un colis ne gele ni les autres colis du meme paiement, ni
    le transport, ni les autres beneficiaires.
    """

    permission_classes = [CanApproveMoney]

    def post(self, request, reference):
        from apps.payments.escrow.services import EscrowError, freeze_hold

        entree = ReasonInputSerializer(data=request.data)
        entree.is_valid(raise_exception=True)
        hold = get_object_or_404(EscrowHold, reference=reference)
        try:
            freeze_hold(hold, reason=entree.validated_data["reason"])
        except EscrowError as exc:
            return _erreur(exc)
        hold.refresh_from_db()
        return Response(AdminEscrowDetailSerializer(hold).data)


@extend_schema(tags=TAG, summary="Degeler un sequestre",
               request=ReasonInputSerializer)
class AdminEscrowUnfreezeView(APIView):
    permission_classes = [CanApproveMoney]

    def post(self, request, reference):
        from apps.payments.escrow.services import unfreeze_hold

        entree = ReasonInputSerializer(data=request.data)
        entree.is_valid(raise_exception=True)
        hold = get_object_or_404(EscrowHold, reference=reference)
        unfreeze_hold(hold, reason=entree.validated_data["reason"])
        hold.refresh_from_db()
        return Response(AdminEscrowDetailSerializer(hold).data)


@extend_schema(tags=TAG, summary="Liberer un sequestre (forcage)",
               request=ReasonInputSerializer)
class AdminEscrowReleaseView(APIView):
    """
    Liberation FORCEE, hors du cycle normal.

    Le motif est obligatoire : cette action fait sortir de l'argent du
    sequestre avant son echeance.
    """

    permission_classes = [CanApproveMoney]

    def post(self, request, reference):
        from apps.payments.escrow.services import EscrowError, release_hold

        entree = ReasonInputSerializer(data=request.data)
        entree.is_valid(raise_exception=True)
        hold = get_object_or_404(EscrowHold, reference=reference)
        try:
            release_hold(hold, force=True,
                         reason=f"{entree.validated_data['reason']} "
                                f"(par {request.user.username})")
        except EscrowError as exc:
            return _erreur(exc)
        hold.refresh_from_db()
        return Response(AdminEscrowDetailSerializer(hold).data)


@extend_schema(tags=TAG, summary="Evenements metier consommes")
class AdminEscrowEventListView(FinanceListView):
    serializer_class = AdminEscrowEventSerializer
    date_field = "received_at"
    search_fields = ["event_id", "intent_reference", "note", "emitter"]

    def get_queryset(self):
        qs = EscrowEvent.objects.order_by("-received_at")
        params = self.request.query_params
        qs = f.appliquer_periode(qs, params, "received_at")
        qs = f.appliquer_recherche(qs, params, self.search_fields)
        issue = (params.get("outcome") or "").strip().upper()
        if issue:
            qs = qs.filter(outcome=issue)
        return qs


# ═══════════════════════════════════════════════════════════════════════════
# REGLEMENTS
# ═══════════════════════════════════════════════════════════════════════════

@extend_schema(tags=TAG, summary="Lots de reglement")
class AdminBatchListView(FinanceListView):
    serializer_class = AdminBatchListSerializer
    search_fields = ["reference", "payee__payee_code", "exceptional_reason"]

    def get_queryset(self):
        qs = SettlementBatch.objects.select_related("payee", "payout").order_by(
            "-created_at")
        qs = self.filtrer(qs)
        return f.appliquer_beneficiaire(qs, self.request.query_params)


@extend_schema(tags=TAG, summary="Detail d'un lot")
class AdminBatchDetailView(generics.RetrieveAPIView):
    permission_classes = [IsFinanceStaff]
    serializer_class = AdminBatchDetailSerializer
    lookup_field = "reference"
    queryset = SettlementBatch.objects.select_related(
        "payee").prefetch_related("covered_holds", "applied_adjustments__payee")


@extend_schema(tags=TAG, summary="Construire les lots du cycle",
               request=BuildSettlementsSerializer)
class AdminBuildSettlementsView(APIView):
    permission_classes = [CanApproveMoney]

    def post(self, request):
        from apps.payments.settlements.services import (
            SettlementError, build_batches_for_cycle, confirm_batch,
        )

        entree = BuildSettlementsSerializer(data=request.data)
        entree.is_valid(raise_exception=True)
        donnees = entree.validated_data

        lots = build_batches_for_cycle(
            cycle_key=donnees["cycle_key"], payee_type=donnees["payee_type"])

        confirmes, erreurs = 0, []
        if donnees["confirm"]:
            for lot in lots:
                try:
                    confirm_batch(lot)
                    confirmes += 1
                except SettlementError as exc:
                    erreurs.append(f"{lot.reference} : {exc}")

        return Response({
            "batches": AdminBatchListSerializer(lots, many=True).data,
            "created": len(lots), "confirmed": confirmes, "errors": erreurs,
        })


@extend_schema(tags=TAG, summary="Confirmer un lot")
class AdminConfirmBatchView(APIView):
    permission_classes = [CanApproveMoney]

    def post(self, request, reference):
        from apps.payments.settlements.services import (
            SettlementError, confirm_batch,
        )

        lot = get_object_or_404(SettlementBatch, reference=reference)
        try:
            confirm_batch(lot)
        except SettlementError as exc:
            return _erreur(exc)
        lot.refresh_from_db()
        return Response(AdminBatchDetailSerializer(lot).data)


@extend_schema(tags=TAG, summary="Demander le versement d'un lot")
class AdminRequestPayoutView(APIView):
    permission_classes = [CanApproveMoney]

    def post(self, request, reference):
        from apps.payments.settlements.services import (
            SettlementError, request_payout,
        )

        entree = OptionalCommentSerializer(data=request.data)
        entree.is_valid(raise_exception=True)
        lot = get_object_or_404(SettlementBatch, reference=reference)
        try:
            demande = request_payout(
                lot, requested_by=request.user,
                justification=entree.validated_data["comment"])
        except SettlementError as exc:
            return _erreur(exc)
        return Response(AdminPayoutDetailSerializer(demande).data,
                        status=status.HTTP_201_CREATED)


# ═══════════════════════════════════════════════════════════════════════════
# VERSEMENTS
# ═══════════════════════════════════════════════════════════════════════════

@extend_schema(tags=TAG, summary="Demandes de versement")
class AdminPayoutListView(FinanceListView):
    serializer_class = AdminPayoutListSerializer
    date_field = "requested_at"
    search_fields = ["reference", "payee__payee_code", "provider_reference",
                     "provider_external_reference"]

    def get_queryset(self):
        qs = PayoutRequest.objects.select_related("payee").order_by(
            "-requested_at")
        params = self.request.query_params
        qs = f.appliquer_periode(qs, params, "requested_at")
        qs = f.appliquer_statut(qs, params)
        qs = f.appliquer_recherche(qs, params, self.search_fields)
        qs = f.appliquer_beneficiaire(qs, params)
        return f.appliquer_montant(qs, params)


@extend_schema(tags=TAG, summary="Detail d'un versement")
class AdminPayoutDetailView(generics.RetrieveAPIView):
    permission_classes = [IsFinanceStaff]
    serializer_class = AdminPayoutDetailSerializer
    lookup_field = "reference"
    queryset = PayoutRequest.objects.select_related(
        "payee", "batch", "requested_by").prefetch_related(
        "approvals__approved_by")


@extend_schema(tags=TAG, summary="Approuver un versement",
               request=OptionalCommentSerializer)
class AdminApprovePayoutView(APIView):
    """
    Le demandeur ne peut jamais approuver sa propre demande.

    Le service le refuse, et une contrainte en base le refuse aussi : un
    contournement par requete directe echouerait de la meme facon.
    """

    permission_classes = [CanApproveMoney]

    def post(self, request, reference):
        from apps.payments.settlements.services import (
            SettlementError, approve_payout,
        )

        entree = OptionalCommentSerializer(data=request.data)
        entree.is_valid(raise_exception=True)
        demande = get_object_or_404(PayoutRequest, reference=reference)
        try:
            demande = approve_payout(
                demande, approved_by=request.user,
                comment=entree.validated_data["comment"])
        except SettlementError as exc:
            return _erreur(exc)
        return Response(AdminPayoutDetailSerializer(demande).data)


@extend_schema(tags=TAG, summary="Rejeter un versement",
               request=ReasonInputSerializer)
class AdminRejectPayoutView(APIView):
    permission_classes = [CanApproveMoney]

    def post(self, request, reference):
        from apps.payments.settlements.services import (
            SettlementError, reject_payout,
        )

        entree = ReasonInputSerializer(data=request.data)
        entree.is_valid(raise_exception=True)
        demande = get_object_or_404(PayoutRequest, reference=reference)
        try:
            demande = reject_payout(demande, rejected_by=request.user,
                                    reason=entree.validated_data["reason"])
        except SettlementError as exc:
            return _erreur(exc)
        return Response(AdminPayoutDetailSerializer(demande).data)


@extend_schema(tags=TAG, summary="Executer un versement")
class AdminExecutePayoutView(APIView):
    """
    Emet le versement aupres du prestataire.

    Sur timeout, l'etat devient UNKNOWN — jamais FAILED. Retenter
    aveuglement peut doubler un versement reel.
    """

    permission_classes = [CanApproveMoney]

    def post(self, request, reference):
        from apps.payments.settlements.services import (
            SettlementError, execute_payout,
        )

        demande = get_object_or_404(PayoutRequest, reference=reference)
        try:
            demande = execute_payout(demande)
        except SettlementError as exc:
            return _erreur(exc)
        return Response(AdminPayoutDetailSerializer(demande).data)


# ═══════════════════════════════════════════════════════════════════════════
# REMBOURSEMENTS
# ═══════════════════════════════════════════════════════════════════════════

@extend_schema(tags=TAG, summary="Remboursements")
class AdminRefundListView(FinanceListView):
    serializer_class = AdminRefundSerializer
    search_fields = ["reference", "intent__reference", "detail"]

    def get_queryset(self):
        qs = Refund.objects.select_related(
            "intent", "requested_by", "approved_by", "payout").order_by(
            "-created_at")
        return self.filtrer(qs)


@extend_schema(tags=TAG, summary="Creer un remboursement",
               request=CreateRefundSerializer)
class AdminCreateRefundView(APIView):
    permission_classes = [CanApproveMoney]

    def post(self, request):
        from apps.payments.settlements.services import (
            SettlementError, create_refund,
        )

        entree = CreateRefundSerializer(data=request.data)
        entree.is_valid(raise_exception=True)
        donnees = entree.validated_data

        intent = get_object_or_404(
            PaymentIntent, reference=donnees["intent_reference"])
        try:
            remboursement = create_refund(
                intent, amount_xaf=donnees["amount_xaf"],
                reason=donnees["reason"], detail=donnees["detail"],
                requested_by=request.user)
        except SettlementError as exc:
            return _erreur(exc)
        return Response(AdminRefundSerializer(remboursement).data,
                        status=status.HTTP_201_CREATED)


@extend_schema(tags=TAG, summary="Approuver un remboursement")
class AdminApproveRefundView(APIView):
    """
    Le demandeur ne peut pas approuver.

    C'est le garde-fou contre la fraude par litige : ouvrir un litige, le
    faire trancher, puis encaisser.
    """

    permission_classes = [CanApproveMoney]

    def post(self, request, reference):
        from apps.payments.settlements.services import (
            SettlementError, approve_refund,
        )

        remboursement = get_object_or_404(Refund, reference=reference)
        try:
            remboursement = approve_refund(remboursement,
                                           approved_by=request.user)
        except SettlementError as exc:
            return _erreur(exc)
        return Response(AdminRefundSerializer(remboursement).data)


@extend_schema(tags=TAG, summary="Executer un remboursement")
class AdminExecuteRefundView(APIView):
    permission_classes = [CanApproveMoney]

    def post(self, request, reference):
        from apps.payments.settlements.services import (
            SettlementError, execute_refund,
        )

        remboursement = get_object_or_404(Refund, reference=reference)
        try:
            remboursement = execute_refund(remboursement)
        except SettlementError as exc:
            return _erreur(exc)
        return Response(AdminRefundSerializer(remboursement).data)


@extend_schema(tags=TAG, summary="Rejeter un remboursement",
               request=ReasonInputSerializer)
class AdminRejectRefundView(APIView):
    """Le sequestre reste GELE : rejeter n'est pas trancher le litige."""

    permission_classes = [CanApproveMoney]

    def post(self, request, reference):
        entree = ReasonInputSerializer(data=request.data)
        entree.is_valid(raise_exception=True)
        remboursement = get_object_or_404(Refund, reference=reference)

        if remboursement.status != Refund.Status.PENDING_APPROVAL:
            return Response(
                {"detail": f"Le remboursement est en {remboursement.status}."},
                status=status.HTTP_400_BAD_REQUEST)
        if request.user.id == remboursement.requested_by_id:
            return Response(
                {"detail": "Le demandeur ne peut pas rejeter sa propre "
                           "demande."},
                status=status.HTTP_400_BAD_REQUEST)

        remboursement.status = Refund.Status.REJECTED
        remboursement.detail = (
            f"{remboursement.detail}\nRejete : "
            f"{entree.validated_data['reason']}").strip()
        remboursement.save(update_fields=["status", "detail"])
        return Response(AdminRefundSerializer(remboursement).data)


# ═══════════════════════════════════════════════════════════════════════════
# AJUSTEMENTS
# ═══════════════════════════════════════════════════════════════════════════

@extend_schema(tags=TAG, summary="Ajustements")
class AdminAdjustmentListView(FinanceListView):
    serializer_class = AdminAdjustmentSerializer
    search_fields = ["reference", "payee__payee_code", "reason",
                     "source_event", "source_contract"]

    def get_queryset(self):
        qs = Adjustment.objects.select_related(
            "payee", "created_by", "approved_by").order_by("-created_at")
        qs = self.filtrer(qs)
        qs = f.appliquer_beneficiaire(qs, self.request.query_params)
        sens = (self.request.query_params.get("direction") or "").strip().upper()
        if sens:
            qs = qs.filter(direction=sens)
        return qs


@extend_schema(tags=TAG, summary="Creer un ajustement",
               request=CreateAdjustmentSerializer)
class AdminCreateAdjustmentView(APIView):
    permission_classes = [CanApproveMoney]

    def post(self, request):
        from apps.payments.settlements.services import (
            SettlementError, create_adjustment,
        )

        entree = CreateAdjustmentSerializer(data=request.data)
        entree.is_valid(raise_exception=True)
        donnees = entree.validated_data

        compte = get_object_or_404(PayeeAccount,
                                   payee_code=donnees["payee_code"])
        try:
            ajustement = create_adjustment(
                payee=compte, direction=donnees["direction"],
                category=donnees["category"], amount_xaf=donnees["amount_xaf"],
                reason=donnees["reason"], created_by=request.user,
                source_order_id=donnees.get("source_order_id"),
                max_offset_percent=donnees.get("max_offset_percent"))
        except SettlementError as exc:
            return _erreur(exc)
        return Response(AdminAdjustmentSerializer(ajustement).data,
                        status=status.HTTP_201_CREATED)


@extend_schema(tags=TAG, summary="Approuver un ajustement")
class AdminApproveAdjustmentView(APIView):
    permission_classes = [CanApproveMoney]

    def post(self, request, reference):
        from apps.payments.settlements.services import (
            SettlementError, approve_adjustment,
        )

        ajustement = get_object_or_404(Adjustment, reference=reference)
        try:
            ajustement = approve_adjustment(ajustement,
                                            approved_by=request.user)
        except SettlementError as exc:
            return _erreur(exc)
        return Response(AdminAdjustmentSerializer(ajustement).data)


# ═══════════════════════════════════════════════════════════════════════════
# RECONCILIATION
# ═══════════════════════════════════════════════════════════════════════════

@extend_schema(tags=TAG, summary="Executions de reconciliation")
class AdminReconciliationRunListView(FinanceListView):
    serializer_class = AdminReconciliationRunSerializer
    date_field = "started_at"
    search_fields = ["reference", "error"]

    def get_queryset(self):
        qs = ReconciliationRun.objects.order_by("-started_at")
        params = self.request.query_params
        qs = f.appliquer_periode(qs, params, "started_at")
        qs = f.appliquer_statut(qs, params)
        qs = f.appliquer_recherche(qs, params, self.search_fields)
        niveau = (params.get("level") or "").strip().upper()
        return qs.filter(level=niveau) if niveau else qs


@extend_schema(tags=TAG, summary="Ecarts de reconciliation")
class AdminDiscrepancyListView(FinanceListView):
    serializer_class = AdminDiscrepancySerializer
    search_fields = ["subject_ref", "provider_reference", "detail",
                     "resolution_note"]

    def get_queryset(self):
        qs = Discrepancy.objects.select_related(
            "run", "resolved_by").order_by("-created_at")
        params = self.request.query_params
        qs = f.appliquer_periode(qs, params, "created_at")
        qs = f.appliquer_recherche(qs, params, self.search_fields)
        for cle, champ in (("severity", "severity"), ("kind", "kind"),
                           ("resolution", "resolution")):
            valeur = (params.get(cle) or "").strip().upper()
            if valeur:
                qs = qs.filter(**{champ: valeur})
        return qs


@extend_schema(tags=TAG, summary="Qualifier un ecart",
               request=ResolveDiscrepancySerializer)
class AdminResolveDiscrepancyView(APIView):
    """
    Un ecart n'est jamais corrige automatiquement : il est QUALIFIE.

    Corriger automatiquement un ecart mal compris deplacerait de l'argent
    sur la base d'une hypothese.
    """

    permission_classes = [CanApproveMoney]

    def post(self, request, pk):
        from django.core.exceptions import ValidationError

        entree = ResolveDiscrepancySerializer(data=request.data)
        entree.is_valid(raise_exception=True)
        ecart = get_object_or_404(Discrepancy, pk=pk)
        try:
            ecart.resolve(resolution=entree.validated_data["resolution"],
                          note=entree.validated_data["note"],
                          user=request.user)
        except ValidationError as exc:
            return _erreur(exc)
        return Response(AdminDiscrepancySerializer(ecart).data)


@extend_schema(tags=TAG, summary="Lancer une reconciliation")
class AdminRunReconciliationView(APIView):
    permission_classes = [CanApproveMoney]

    NIVEAUX = {
        "solvency": "reconcile_solvency",
        "escrow": "reconcile_escrow",
        "transactional": "reconcile_transactions",
        "unknown_payouts": "resolve_unknown_payouts",
    }

    def post(self, request, level):
        from apps.payments.reconciliation import services as rec

        nom = self.NIVEAUX.get(level)
        if nom is None:
            return Response(
                {"detail": f"Niveau inconnu : {level}. "
                           f"Attendu : {', '.join(self.NIVEAUX)}."},
                status=status.HTTP_400_BAD_REQUEST)
        try:
            run = getattr(rec, nom)()
        except Exception as exc:
            return _erreur(exc)
        return Response(AdminReconciliationRunSerializer(run).data)


# ═══════════════════════════════════════════════════════════════════════════
# RISQUE
# ═══════════════════════════════════════════════════════════════════════════

@extend_schema(tags=TAG, summary="Evaluations de risque")
class AdminRiskAssessmentListView(FinanceListView):
    serializer_class = AdminRiskAssessmentSerializer
    search_fields = ["subject_ref", "note", "override_reason"]

    def get_queryset(self):
        qs = RiskAssessment.objects.prefetch_related("signals").select_related(
            "overridden_by").order_by("-created_at")
        params = self.request.query_params
        qs = f.appliquer_periode(qs, params, "created_at")
        qs = f.appliquer_recherche(qs, params, self.search_fields)
        decision = (params.get("decision") or "").strip().upper()
        return qs.filter(decision=decision) if decision else qs


@extend_schema(tags=TAG, summary="Scores de confiance")
class AdminTrustScoreListView(FinanceListView):
    serializer_class = AdminTrustScoreSerializer
    date_field = "computed_at"
    search_fields = ["payee__payee_code", "payee__display_label"]

    def get_queryset(self):
        qs = TrustScore.objects.select_related("payee").order_by("-computed_at")
        params = self.request.query_params
        qs = f.appliquer_periode(qs, params, "computed_at")
        qs = f.appliquer_recherche(qs, params, self.search_fields)
        return f.appliquer_beneficiaire(qs, params)


# ═══════════════════════════════════════════════════════════════════════════
# BENEFICIAIRES
# ═══════════════════════════════════════════════════════════════════════════

@extend_schema(tags=TAG, summary="Comptes beneficiaires")
class AdminPayeeListView(FinanceListView):
    serializer_class = AdminPayeeSerializer
    search_fields = ["payee_code", "display_label", "momo_number_masked"]

    def get_queryset(self):
        qs = PayeeAccount.objects.order_by("payee_code")
        params = self.request.query_params
        qs = f.appliquer_recherche(qs, params, self.search_fields)
        genre = (params.get("payee_type") or "").strip().upper()
        if genre:
            qs = qs.filter(payee_type=genre)
        if params.get("blocked") in ("1", "true"):
            qs = qs.filter(payout_hold=True)
        return qs


@extend_schema(tags=TAG, summary="Situation financiere d'un beneficiaire")
class AdminPayeeDueView(APIView):
    permission_classes = [IsFinanceStaff]

    def get(self, request, payee_code):
        from apps.payments.settlements.services import amount_due

        compte = get_object_or_404(PayeeAccount, payee_code=payee_code)
        return Response({
            "payee": AdminPayeeSerializer(compte).data,
            "due": amount_due(compte),
        })


# ═══════════════════════════════════════════════════════════════════════════
# ORDONNANCEUR
# ═══════════════════════════════════════════════════════════════════════════

@extend_schema(tags=TAG, summary="Sante des taches planifiees")
class AdminTaskHealthView(APIView):
    """
    Sans ordonnanceur, aucun vendeur n'est jamais paye. Cet ecran doit le
    montrer avant qu'un partenaire ne le signale.
    """

    permission_classes = [IsFinanceStaff]

    def get(self, request):
        from apps.payments.tasks.base import list_tasks
        from apps.payments.tasks.jobs import GROUPS, SCHEDULE

        minutes = int(request.query_params.get("max_age_minutes") or 180)
        return Response({
            "health": TaskRun.health(max_age_minutes=minutes),
            "catalog": list_tasks(),
            "schedule": SCHEDULE,
            "groups": GROUPS,
        })


@extend_schema(tags=TAG, summary="Executions de taches")
class AdminTaskRunListView(FinanceListView):
    serializer_class = AdminTaskRunSerializer
    date_field = "started_at"
    search_fields = ["task_name", "error", "note"]

    def get_queryset(self):
        qs = TaskRun.objects.order_by("-started_at")
        params = self.request.query_params
        qs = f.appliquer_periode(qs, params, "started_at")
        qs = f.appliquer_statut(qs, params)
        qs = f.appliquer_recherche(qs, params, self.search_fields)
        nom = (params.get("task") or "").strip()
        return qs.filter(task_name=nom) if nom else qs


@extend_schema(tags=TAG, summary="Relancer une tache")
class AdminRunTaskView(APIView):
    permission_classes = [CanApproveMoney]

    def post(self, request, name):
        from apps.payments.tasks.base import REGISTRY, run_task

        if name not in REGISTRY:
            return Response(
                {"detail": f"Tache inconnue : {name}.",
                 "available": sorted(REGISTRY)},
                status=status.HTTP_400_BAD_REQUEST)
        return Response({"task": name, "result": run_task(name)})