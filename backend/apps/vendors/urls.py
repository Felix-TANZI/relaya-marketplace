# backend/apps/vendors/urls.py
# URLs pour l'interface vendeur avec routes séparées pour statuts

from django.urls import path
from . import views

app_name = 'vendors'

urlpatterns = [
    # Liste des commandes du vendeur
    path(
        'orders/',
        views.get_vendor_orders,
        name='vendor-orders'
    ),
    
    # Détail d'une commande
    path(
        'orders/<int:order_id>/',
        views.get_vendor_order_detail,
        name='vendor-order-detail'
    ),
    
    # Mise à jour du statut de livraison (fulfillment)
    path(
        'orders/<int:order_id>/fulfillment-status/',
        views.update_fulfillment_status,
        name='update-fulfillment-status'
    ),
    
    # Mise à jour du statut de paiement (pour marquer manuellement comme payé)
    path(
        'orders/<int:order_id>/payment-status/',
        views.update_payment_status,
        name='update-payment-status'
    ),
]