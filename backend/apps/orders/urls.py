# backend/apps/orders/urls.py
# URL patterns pour la gestion des commandes.

from django.urls import path
from .views import (
    OrderCreateView,
    OrderDetailView,
    MyOrdersView,
    OrderTrackingView,
    ConfirmReceiptView,
    OrderDisputeListCreateView,
    DisputeMessageCreateView,
)

urlpatterns = [
    path("", OrderCreateView.as_view(), name="order-create"),  # Create a new order
    path("my-orders/", MyOrdersView.as_view(), name="my-orders"), # List orders for the authenticated user
    path("<int:id>/", OrderDetailView.as_view(), name="order-detail"), # Retrieve order details by ID
    path("<int:id>/tracking/", OrderTrackingView.as_view(), name="order-tracking"),
    path("<int:id>/confirm-receipt/", ConfirmReceiptView.as_view(), name="order-confirm-receipt"),
    path("<int:id>/disputes/", OrderDisputeListCreateView.as_view(), name="order-disputes"),
    path("disputes/<int:dispute_id>/messages/", DisputeMessageCreateView.as_view(), name="order-dispute-messages"),
]
