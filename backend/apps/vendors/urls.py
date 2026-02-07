# backend/apps/vendors/urls.py
# URLs pour l'espace vendeur

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

app_name = 'vendors'

# Router pour le ViewSet des produits
router = DefaultRouter()
router.register(r'products', views.VendorProductViewSet, basename='vendor-product')

urlpatterns = [
    # ========== PROFIL VENDEUR ==========
    
    # Demande pour devenir vendeur
    path('apply/', views.apply_vendor, name='apply-vendor'),
    
    # Profil vendeur
    path('profile/', views.vendor_profile, name='vendor-profile'),
    
    # Statistiques du vendeur
    path('stats/', views.vendor_stats, name='vendor-stats'),
    
    # ========== GESTION DES PRODUITS (ViewSet) ==========
    
    # Toutes les routes produits (list, create, retrieve, update, delete)
    path('', include(router.urls)),
    
    # ========== GESTION DES IMAGES ==========
    
    # Upload d'images pour un produit
    path('products/<int:product_id>/images/', views.upload_product_image, name='upload-image'),
    
    # Supprimer une image
    path('products/<int:product_id>/images/<int:image_id>/', views.delete_product_image, name='delete-image'),
    
    # Définir l'image principale
    path('products/<int:product_id>/images/<int:image_id>/set-primary/', views.set_primary_image, name='set-primary-image'),
    
    # ========== GESTION DES COMMANDES ==========
    
    # Liste des commandes du vendeur
    path('orders/', views.vendor_orders, name='vendor-orders'),
    
    # Détail d'une commande
    path('orders/<int:order_id>/', views.vendor_order_detail, name='vendor-order-detail'),
    
    # Mettre à jour le statut (legacy - conservé pour compatibilité)
    path('orders/<int:order_id>/status/', views.update_order_status, name='update-order-status'),
    
    # ========== NOUVEAUX ENDPOINTS (SÉPARATION PAIEMENT/LIVRAISON) ==========
    
    # Mise à jour du statut de livraison
    path('orders/<int:order_id>/fulfillment-status/', views.update_fulfillment_status, name='update-fulfillment-status'),
    
    # Mise à jour du statut de paiement
    path('orders/<int:order_id>/payment-status/', views.update_payment_status, name='update-payment-status'),
]