# backend/apps/orders/urls.py
# URL patterns pour la gestion des commandes.

from django.urls import path
from .views import OrderCreateView, OrderDetailView, MyOrdersView # Importer la vue pour lister les commandes de l'utilisateur authentifié

urlpatterns = [
    path("", OrderCreateView.as_view(), name="order-create"),  # Create a new order
    path("my-orders/", MyOrdersView.as_view(), name="my-orders"), # List orders for the authenticated user
    path("<int:id>/", OrderDetailView.as_view(), name="order-detail"), # Retrieve order details by ID
]
