# backend/apps/vendors/urls.py
# URL patterns pour l'espace vendeur

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    apply_vendor, 
    vendor_profile, 
    vendor_stats,
    VendorProductViewSet,
    upload_product_image,  
    delete_product_image,
    set_primary_image,
    vendor_orders,
    vendor_order_detail,
    update_order_status,
)

router = DefaultRouter()
router.register(r'products', VendorProductViewSet, basename='vendor-products')

urlpatterns = [
    path('apply/', apply_vendor, name='vendor-apply'),  # Endpoint pour postuler en tant que vendeur
    path('profile/', vendor_profile, name='vendor-profile'), # Afficher et mettre à jour le profil du vendeur
    path('stats/', vendor_stats, name='vendor-stats'), # Statistiques du vendeur
    path('orders/', vendor_orders, name='vendor-orders'), # Liste des commandes du vendeur
    path('orders/<int:order_id>/', vendor_order_detail, name='vendor-order-detail'), # Détail d'une commande spécifique
    path('orders/<int:order_id>/status/', update_order_status, name='update-order-status'), # Mettre à jour le statut d'une commande
    path('products/<int:product_id>/images/', upload_product_image, name='upload-product-image'), # Télécharger une image pour un produit
    path('products/<int:product_id>/images/<int:image_id>/', delete_product_image, name='delete-product-image'), # Supprimer une image d'un produit
    path('products/<int:product_id>/images/<int:image_id>/set-primary/', set_primary_image, name='set-primary-image'), # Définir une image comme principale pour un produit
    path('', include(router.urls)),
]