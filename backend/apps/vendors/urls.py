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
    #  PROFIL VENDEUR 
    
    # Demande pour devenir vendeur
    path('apply/', views.apply_vendor, name='apply-vendor'),
    
    # Profil vendeur
    path('profile/', views.vendor_profile, name='vendor-profile'),
    
    # Statistiques du vendeur
    path('stats/', views.vendor_stats, name='vendor-stats'),
    
    #  GESTION DES PRODUITS (ViewSet) 
    
    # Toutes les routes produits (list, create, retrieve, update, delete)
    path('', include(router.urls)),
    
    #  GESTION DES IMAGES 
    
    # Upload d'images pour un produit
    path('products/<int:product_id>/images/', views.upload_product_image, name='upload-image'),
    
    # Supprimer une image
    path('products/<int:product_id>/images/<int:image_id>/', views.delete_product_image, name='delete-image'),
    
    # Définir l'image principale
    path('products/<int:product_id>/images/<int:image_id>/set-primary/', views.set_primary_image, name='set-primary-image'),
    
    #  GESTION DES COMMANDES 
    
    # Liste des commandes du vendeur
    path('orders/', views.vendor_orders, name='vendor-orders'),
    
    # Détail d'une commande
    path('orders/<int:order_id>/', views.vendor_order_detail, name='vendor-order-detail'),
    
    # Mettre à jour le statut (conservé pour compatibilité)
    path('orders/<int:order_id>/status/', views.update_order_status, name='update-order-status'),
    
    #  NOUVEAUX ENDPOINTS (SÉPARATION PAIEMENT/LIVRAISON) 
    
    # Mise à jour du statut de livraison
    path('orders/<int:order_id>/fulfillment-status/', views.update_fulfillment_status, name='update-fulfillment-status'),
    
    # Mise à jour du statut de paiement
    path('orders/<int:order_id>/payment-status/', views.update_payment_status, name='update-payment-status'),

    #  ADMINISTRATION 
    
    # Liste tous les vendeurs (admin)
    path('admin/vendors/', views.admin_list_vendors, name='admin-list-vendors'),
    
    # Détail vendeur (admin)
    path('admin/vendors/<int:vendor_id>/', views.admin_vendor_detail, name='admin-vendor-detail'),
    
    # Approuver un vendeur
    path('admin/vendors/<int:vendor_id>/approve/', views.admin_approve_vendor, name='admin-approve-vendor'),
    
    # Rejeter un vendeur
    path('admin/vendors/<int:vendor_id>/reject/', views.admin_reject_vendor, name='admin-reject-vendor'),
    
    # Suspendre un vendeur
    path('admin/vendors/<int:vendor_id>/suspend/', views.admin_suspend_vendor, name='admin-suspend-vendor'),

    #  ADMINISTRATION - DASHBOARD 
    
    # Statistiques globales dashboard
    path('admin/dashboard/stats/', views.admin_dashboard_stats, name='admin-dashboard-stats'),

    # Données analytiques (graphiques)
    path('admin/dashboard/analytics/', views.admin_analytics, name='admin-analytics'),

    #  ADMINISTRATION - GESTION PRODUITS 
    
    # Liste produits
    path('admin/products/', views.admin_list_products, name='admin-list-products'),
    
    # Détail produit
    path('admin/products/<int:product_id>/', views.admin_product_detail, name='admin-product-detail'),
    
    # Modifier produit
    path('admin/products/<int:product_id>/update/', views.admin_update_product, name='admin-update-product'),
    
    # Supprimer produit
    path('admin/products/<int:product_id>/delete/', views.admin_delete_product, name='admin-delete-product'),
    
    # Activer/désactiver (bannir)
    path('admin/products/<int:product_id>/toggle-status/', views.admin_toggle_product_status, name='admin-toggle-product-status'),

    #  ADMINISTRATION - GESTION COMMANDES 
    
    # Liste commandes
    path('admin/orders/', views.admin_list_orders, name='admin-list-orders'),
    
    # Détail commande
    path('admin/orders/<int:order_id>/', views.admin_order_detail, name='admin-order-detail'),
    
    # Modifier commande
    path('admin/orders/<int:order_id>/update/', views.admin_update_order, name='admin-update-order'),
    
    # Annuler commande
    path('admin/orders/<int:order_id>/cancel/', views.admin_cancel_order, name='admin-cancel-order'),
    
    # Export CSV
    path('admin/orders/export/csv/', views.admin_export_orders_csv, name='admin-export-orders-csv'),

    #  ADMINISTRATION - GESTION UTILISATEURS 
    
    # Liste utilisateurs
    path('admin/users/', views.admin_list_users, name='admin-list-users'),
    
    # Détail utilisateur
    path('admin/users/<int:user_id>/', views.admin_user_detail, name='admin-user-detail'),
    
    # Modifier utilisateur
    path('admin/users/<int:user_id>/update/', views.admin_update_user, name='admin-update-user'),
    
    # Bannir utilisateur
    path('admin/users/<int:user_id>/ban/', views.admin_ban_user, name='admin-ban-user'),
    
    # Débannir utilisateur
    path('admin/users/<int:user_id>/unban/', views.admin_unban_user, name='admin-unban-user'),
    
    # Supprimer utilisateur
    path('admin/users/<int:user_id>/delete/', views.admin_delete_user, name='admin-delete-user'),
    
    # Export CSV
    path('admin/users/export/csv/', views.admin_export_users_csv, name='admin-export-users-csv'),

    #  ADMINISTRATION - GESTION LITIGES 
    
    # Liste litiges
    path('admin/disputes/', views.admin_list_disputes, name='admin-list-disputes'),
    
    # Stats litiges
    path('admin/disputes/stats/', views.admin_dispute_stats, name='admin-dispute-stats'),
    
    # Détail litige
    path('admin/disputes/<int:dispute_id>/', views.admin_dispute_detail, name='admin-dispute-detail'),
    
    # Modifier litige
    path('admin/disputes/<int:dispute_id>/update/', views.admin_update_dispute, name='admin-update-dispute'),
    
    # Ajouter message
    path('admin/disputes/<int:dispute_id>/message/', views.admin_add_dispute_message, name='admin-add-dispute-message'),
    
    # Résoudre litige
    path('admin/disputes/<int:dispute_id>/resolve/', views.admin_resolve_dispute, name='admin-resolve-dispute'),
]