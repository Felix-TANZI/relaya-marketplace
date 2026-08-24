# backend/apps/payments/api/urls.py
# Routes de l'API financiere.
#
# A inclure dans relaya/urls.py, AVANT la route legacy :
#     path("api/payments/v2/", include("apps.payments.api.urls")),
#
# Le prefixe v2 evite toute collision avec l'API existante et permet aux
# deux de coexister pendant la periode de bascule.

from django.urls import path

from .views import (
    CheckPaymentView, InitiatePaymentView, MyAdjustmentsView, MyDueView,
    MyEscrowView, MyOrderEscrowView, MyPaymentDetailView, MyPaymentsView,
    MyPayoutsView, MyRefundsView, MyRelayTariffView, MySettlementDetailView,
    MySettlementsView,
)

app_name = "payments_api"

urlpatterns = [
    # ── Acheteur ────────────────────────────────────────────────────────────
    path("me/payments/", MyPaymentsView.as_view(), name="my-payments"),
    path("me/payments/<str:reference>/", MyPaymentDetailView.as_view(),
         name="my-payment-detail"),
    path("me/payments/<str:reference>/pay/", InitiatePaymentView.as_view(),
         name="initiate-payment"),
    path("me/payments/<str:reference>/check/", CheckPaymentView.as_view(),
         name="check-payment"),
    path("me/orders/<int:order_id>/protection/", MyOrderEscrowView.as_view(),
         name="my-order-protection"),
    path("me/refunds/", MyRefundsView.as_view(), name="my-refunds"),

    # ── Partenaire ──────────────────────────────────────────────────────────
    path("partner/due/", MyDueView.as_view(), name="partner-due"),
    path("partner/escrow/", MyEscrowView.as_view(), name="partner-escrow"),
    path("partner/settlements/", MySettlementsView.as_view(),
         name="partner-settlements"),
    path("partner/settlements/<str:reference>/",
         MySettlementDetailView.as_view(), name="partner-settlement-detail"),
    path("partner/adjustments/", MyAdjustmentsView.as_view(),
         name="partner-adjustments"),
    path("partner/payouts/", MyPayoutsView.as_view(), name="partner-payouts"),
    path("partner/relay-tariff/", MyRelayTariffView.as_view(),
         name="partner-relay-tariff"),
]