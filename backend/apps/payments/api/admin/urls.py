# backend/apps/payments/api/admin/urls.py
# Routes de l'administration financiere.
#
# A inclure dans relaya/urls.py :
#     path("api/payments/v2/admin/", include("apps.payments.api.admin.urls")),
#
# Toutes exigent l'habilitation `finance`. Les actions qui deplacent de
# l'argent exigent en plus `CanApproveMoney` — aujourd'hui identique, mais
# separee pour pouvoir resserrer sans toucher aux vues.

from django.urls import path

from . import config_views as cv
from . import views as v

app_name = "payments_admin"

urlpatterns = [
    # ── Synthese ────────────────────────────────────────────────────────────
    path("dashboard/", v.FinanceDashboardView.as_view(), name="dashboard"),
    path("preflight/", v.FinancePreflightView.as_view(), name="preflight"),
    path("analytics/", v.FinanceAnalyticsView.as_view(), name="analytics"),

    # ── Configuration financiere ────────────────────────────────────────
    # Aucune vue de modification directe : tout passe par une demande
    # approuvee par un tiers. C'est ce que la gouvernance impose.
    path("config/", cv.ConfigOverviewView.as_view(), name="config-overview"),
    path("config/requests/", cv.ConfigChangeRequestListView.as_view(),
         name="config-requests"),
    path("config/requests/<str:reference>/approve/",
         cv.ConfigChangeApproveView.as_view(), name="config-approve"),
    path("config/requests/<str:reference>/rollback/",
         cv.ConfigChangeRollbackView.as_view(), name="config-rollback"),
    path("config/requests/<str:reference>/reject/",
         cv.ConfigChangeRejectView.as_view(), name="config-reject"),
    path("config/<str:section>/", cv.ConfigDetailView.as_view(),
         name="config-detail"),

    # ── Paiements ───────────────────────────────────────────────────────────
    path("intents/", v.AdminIntentListView.as_view(), name="intents"),
    path("intents/<str:reference>/", v.AdminIntentDetailView.as_view(),
         name="intent-detail"),
    path("intents/<str:reference>/poll/", v.AdminIntentPollView.as_view(),
         name="intent-poll"),

    # ── Sequestres ──────────────────────────────────────────────────────────
    path("escrow/", v.AdminEscrowListView.as_view(), name="escrow"),
    path("escrow/events/", v.AdminEscrowEventListView.as_view(),
         name="escrow-events"),
    path("escrow/<str:reference>/", v.AdminEscrowDetailView.as_view(),
         name="escrow-detail"),
    path("escrow/<str:reference>/freeze/", v.AdminEscrowFreezeView.as_view(),
         name="escrow-freeze"),
    path("escrow/<str:reference>/unfreeze/",
         v.AdminEscrowUnfreezeView.as_view(), name="escrow-unfreeze"),
    path("escrow/<str:reference>/release/", v.AdminEscrowReleaseView.as_view(),
         name="escrow-release"),

    # ── Reglements ──────────────────────────────────────────────────────────
    path("settlements/", v.AdminBatchListView.as_view(), name="settlements"),
    path("settlements/build/", v.AdminBuildSettlementsView.as_view(),
         name="settlements-build"),
    path("settlements/<str:reference>/", v.AdminBatchDetailView.as_view(),
         name="settlement-detail"),
    path("settlements/<str:reference>/confirm/",
         v.AdminConfirmBatchView.as_view(), name="settlement-confirm"),
    path("settlements/<str:reference>/request-payout/",
         v.AdminRequestPayoutView.as_view(), name="settlement-request-payout"),

    # ── Versements ──────────────────────────────────────────────────────────
    path("payouts/", v.AdminPayoutListView.as_view(), name="payouts"),
    path("payouts/<str:reference>/", v.AdminPayoutDetailView.as_view(),
         name="payout-detail"),
    path("payouts/<str:reference>/approve/",
         v.AdminApprovePayoutView.as_view(), name="payout-approve"),
    path("payouts/<str:reference>/reject/",
         v.AdminRejectPayoutView.as_view(), name="payout-reject"),
    path("payouts/<str:reference>/execute/",
         v.AdminExecutePayoutView.as_view(), name="payout-execute"),

    # ── Remboursements ──────────────────────────────────────────────────────
    path("refunds/", v.AdminRefundListView.as_view(), name="refunds"),
    path("refunds/create/", v.AdminCreateRefundView.as_view(),
         name="refund-create"),
    path("refunds/<str:reference>/approve/",
         v.AdminApproveRefundView.as_view(), name="refund-approve"),
    path("refunds/<str:reference>/reject/",
         v.AdminRejectRefundView.as_view(), name="refund-reject"),
    path("refunds/<str:reference>/execute/",
         v.AdminExecuteRefundView.as_view(), name="refund-execute"),

    # ── Ajustements ─────────────────────────────────────────────────────────
    path("adjustments/", v.AdminAdjustmentListView.as_view(),
         name="adjustments"),
    path("adjustments/create/", v.AdminCreateAdjustmentView.as_view(),
         name="adjustment-create"),
    path("adjustments/<str:reference>/approve/",
         v.AdminApproveAdjustmentView.as_view(), name="adjustment-approve"),

    # ── Reconciliation ──────────────────────────────────────────────────────
    path("reconciliation/runs/", v.AdminReconciliationRunListView.as_view(),
         name="reconciliation-runs"),
    path("reconciliation/run/<str:level>/",
         v.AdminRunReconciliationView.as_view(), name="reconciliation-run"),
    path("reconciliation/discrepancies/",
         v.AdminDiscrepancyListView.as_view(), name="discrepancies"),
    path("reconciliation/discrepancies/<uuid:pk>/resolve/",
         v.AdminResolveDiscrepancyView.as_view(), name="discrepancy-resolve"),

    # ── Risque ──────────────────────────────────────────────────────────────
    path("risk/assessments/", v.AdminRiskAssessmentListView.as_view(),
         name="risk-assessments"),
    path("risk/trust-scores/", v.AdminTrustScoreListView.as_view(),
         name="trust-scores"),

    # ── Beneficiaires ───────────────────────────────────────────────────────
    path("payees/", v.AdminPayeeListView.as_view(), name="payees"),
    path("payees/<str:payee_code>/due/", v.AdminPayeeDueView.as_view(),
         name="payee-due"),

    # ── Ordonnanceur ────────────────────────────────────────────────────────
    path("tasks/health/", v.AdminTaskHealthView.as_view(), name="task-health"),
    path("tasks/runs/", v.AdminTaskRunListView.as_view(), name="task-runs"),
    path("tasks/<str:name>/run/", v.AdminRunTaskView.as_view(),
         name="task-run"),
]