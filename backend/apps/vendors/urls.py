# backend/apps/vendors/urls.py
# URLs pour l'interface vendeur

from django.urls import path
from . import views

app_name = 'vendors'

urlpatterns = [
    # ========== ROUTES VENDEUR  ==========
    
    # Demande pour devenir vendeur
    path('apply/', views.apply_vendor, name='apply-vendor'),
    
    # Profil vendeur
    path('profile/', views.get_vendor_profile, name='vendor-profile'),
    
    # Statistiques du vendeur
    path('stats/', views.get_vendor_stats, name='vendor-stats'),
    
    # ========== GESTION DES PRODUITS ==========
    
    # Liste des produits du vendeur
    path('products/', views.get_vendor_products, name='vendor-products'),
    
    # Créer un produit
    path('products/create/', views.create_product, name='create-product'),
    
    # Détail/Modifier/Supprimer un produit
    path('products/<int:product_id>/', views.product_detail, name='product-detail'),
    
    # Upload d'images pour un produit
    path('products/<int:product_id>/images/', views.upload_product_image, name='upload-image'),
    
    # Supprimer une image
    path('products/<int:product_id>/images/<int:image_id>/', views.delete_product_image, name='delete-image'),
    
    # Définir l'image principale
    path('products/<int:product_id>/images/<int:image_id>/set-primary/', views.set_primary_image, name='set-primary-image'),
    
    # ========== GESTION DES COMMANDES ==========
    
    # Liste des commandes du vendeur
    path('orders/', views.get_vendor_orders, name='vendor-orders'),
    
    # Détail d'une commande
    path('orders/<int:order_id>/', views.get_vendor_order_detail, name='vendor-order-detail'),
    
    # Mettre à jour le statut d'une commande 
    path('orders/<int:order_id>/status/', views.update_order_status, name='update-order-status'),
    
    # ========== NOUVEAUX ENDPOINTS  ==========
    
    # Mise à jour du statut de livraison (fulfillment)
    path('orders/<int:order_id>/fulfillment-status/', views.update_fulfillment_status, name='update-fulfillment-status'),
    
    # Mise à jour du statut de paiement (pour marquer manuellement comme payé)
    path('orders/<int:order_id>/payment-status/', views.update_payment_status, name='update-payment-status'),
]