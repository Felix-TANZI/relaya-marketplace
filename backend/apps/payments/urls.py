from django.urls import path
from .views import (
    PaymentInitView,
    PaymentDetailView,
    PaymentListByOrderView,
    MyPaymentsView,
    PaymentSimulateSuccessView,
    PaymentSimulateFailureView,
)

urlpatterns = [
    path("init/", PaymentInitView.as_view(), name="payment-init"),
    path("list/", PaymentListByOrderView.as_view(), name="payment-list-by-order"),
    path("mine/", MyPaymentsView.as_view(), name="payment-list-mine"),
    path("<uuid:id>/", PaymentDetailView.as_view(), name="payment-detail"),
    path("<uuid:id>/simulate-success/", PaymentSimulateSuccessView.as_view(), name="payment-simulate-success"),
    path("<uuid:id>/simulate-failure/", PaymentSimulateFailureView.as_view(), name="payment-simulate-failure"),
]
