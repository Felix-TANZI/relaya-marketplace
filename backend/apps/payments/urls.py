from django.urls import path
from .views import (
    PaymentInitView,
    PaymentDetailView,
    PaymentListByOrderView,
    PaymentSimulateSuccessView,
)

urlpatterns = [
    path("init/", PaymentInitView.as_view(), name="payment-init"),
    path("list/", PaymentListByOrderView.as_view(), name="payment-list-by-order"),
    path("<uuid:id>/", PaymentDetailView.as_view(), name="payment-detail"),
    path("<uuid:id>/simulate-success/", PaymentSimulateSuccessView.as_view(), name="payment-simulate-success"),
]
