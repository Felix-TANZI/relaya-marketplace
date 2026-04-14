# backend/apps/vendors/urls.py
# URLs pour l'espace vendeur

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from . import chart_views

app_name = 'vendors'

router = DefaultRouter()
router.register(r'products', views.VendorProductViewSet, basename='vendor-product')

urlpatterns = [
    #  PROFIL VENDEUR 
    path('apply/',      views.apply_vendor,   name='apply-vendor'),
    path('profile/',    views.vendor_profile, name='vendor-profile'),
    path('stats/',      views.vendor_stats,   name='vendor-stats'),

    #  ANALYTIQUES DASHBOARD
    path('full-stats/', chart_views.vendor_full_stats,  name='vendor-full-stats'),
    path('chart/',      chart_views.vendor_chart_data,  name='vendor-chart'),
    path('heatmap/',    chart_views.vendor_heatmap,     name='vendor-heatmap'),

    #  GESTION DES PRODUITS (ViewSet) 
    path('', include(router.urls)),

    #  GESTION DES IMAGES 
    path('products/<int:product_id>/images/',
         views.upload_product_image, name='upload-image'),
    path('products/<int:product_id>/images/<int:image_id>/',
         views.delete_product_image, name='delete-image'),
    path('products/<int:product_id>/images/<int:image_id>/set-primary/',
         views.set_primary_image, name='set-primary-image'),

     # Attributs d'une catégorie (pour formulaire produit)
     path('products/attributes/', views.vendor_product_attributes, name='vendor-product-attributes'),

     # Export CSV liste produits
     path('products/export/csv/', views.vendor_export_products_csv, name='vendor-export-products-csv'),

     # Import CSV produits
     path('products/import/csv/', views.vendor_import_products_csv, name='vendor-import-products-csv'),
     
     # Fiche produit PDF/HTML
     path('products/<int:product_id>/pdf/', views.vendor_product_pdf, name='vendor-product-pdf'),    

    #  GESTION DES COMMANDES 
    path('orders/',                              views.vendor_orders,             name='vendor-orders'),
    path('orders/<int:order_id>/',               views.vendor_order_detail,       name='vendor-order-detail'),
    path('orders/<int:order_id>/status/',        views.update_order_status,       name='update-order-status'),
    path('orders/<int:order_id>/fulfillment-status/', views.update_fulfillment_status, name='update-fulfillment-status'),
    path('orders/<int:order_id>/payment-status/',     views.update_payment_status,     name='update-payment-status'),
    
    # Note interne vendeur sur une commande
    path('orders/<int:order_id>/note/', views.vendor_order_note, name='vendor-order-note'),

    # Résumé financier (KPIs, escrow, projection, graphique 30j)
    path('payments/summary/', views.vendor_payment_summary, name='vendor-payment-summary'),
 
    # Historique des demandes de retrait
    path('withdrawals/', views.vendor_withdrawal_list, name='vendor-withdrawal-list'),
 
    # Créer une demande de retrait
    path('withdrawals/create/', views.vendor_withdrawal_create, name='vendor-withdrawal-create'),
 
    # Annuler une demande de retrait PENDING
    path('withdrawals/<int:withdrawal_id>/cancel/', views.vendor_withdrawal_cancel, name='vendor-withdrawal-cancel'),


    # LITIGES VENDEUR
    path('disputes/',                               views.vendor_dispute_list,           name='vendor-dispute-list'),
    path('disputes/<int:dispute_id>/',              views.vendor_dispute_detail,         name='vendor-dispute-detail'),
    path('disputes/<int:dispute_id>/reply/',        views.vendor_dispute_reply,          name='vendor-dispute-reply'),
    path('disputes/<int:dispute_id>/messages/',     views.vendor_dispute_send_message,   name='vendor-dispute-message'),
    path('disputes/<int:dispute_id>/evidences/',    views.vendor_dispute_upload_evidence, name='vendor-dispute-evidence'),

    #  ADMINISTRATION 
    path('admin/vendors/',                           views.admin_list_vendors,       name='admin-list-vendors'),
    path('admin/vendors/<int:vendor_id>/',           views.admin_vendor_detail,      name='admin-vendor-detail'),
    path('admin/vendors/<int:vendor_id>/approve/',   views.admin_approve_vendor,     name='admin-approve-vendor'),
    path('admin/vendors/<int:vendor_id>/reject/',    views.admin_reject_vendor,      name='admin-reject-vendor'),
    path('admin/vendors/<int:vendor_id>/suspend/',   views.admin_suspend_vendor,     name='admin-suspend-vendor'),

    #  ADMINISTRATION - DASHBOARD 
    path('admin/dashboard/stats/',     views.admin_dashboard_stats, name='admin-dashboard-stats'),
    path('admin/dashboard/analytics/', views.admin_analytics,       name='admin-analytics'),

    #  ADMINISTRATION - PRODUITS 
    path('admin/products/',                                   views.admin_list_products,          name='admin-list-products'),
    path('admin/products/<int:product_id>/',                  views.admin_product_detail,         name='admin-product-detail'),
    path('admin/products/<int:product_id>/update/',           views.admin_update_product,         name='admin-update-product'),
    path('admin/products/<int:product_id>/delete/',           views.admin_delete_product,         name='admin-delete-product'),
    path('admin/products/<int:product_id>/toggle-status/',    views.admin_toggle_product_status,  name='admin-toggle-product-status'),

    #  ADMINISTRATION - COMMANDES 
    path('admin/orders/',                            views.admin_list_orders,       name='admin-list-orders'),
    path('admin/orders/<int:order_id>/',             views.admin_order_detail,      name='admin-order-detail'),
    path('admin/orders/<int:order_id>/update/',      views.admin_update_order,      name='admin-update-order'),
    path('admin/orders/<int:order_id>/cancel/',      views.admin_cancel_order,      name='admin-cancel-order'),
    path('admin/orders/export/csv/',                 views.admin_export_orders_csv, name='admin-export-orders-csv'),

    #  ADMINISTRATION - UTILISATEURS 
    path('admin/users/',                          views.admin_list_users,       name='admin-list-users'),
    path('admin/users/<int:user_id>/',            views.admin_user_detail,      name='admin-user-detail'),
    path('admin/users/<int:user_id>/update/',     views.admin_update_user,      name='admin-update-user'),
    path('admin/users/<int:user_id>/ban/',        views.admin_ban_user,         name='admin-ban-user'),
    path('admin/users/<int:user_id>/unban/',      views.admin_unban_user,       name='admin-unban-user'),
    path('admin/users/<int:user_id>/delete/',     views.admin_delete_user,      name='admin-delete-user'),
    path('admin/users/export/csv/',               views.admin_export_users_csv, name='admin-export-users-csv'),

    #  ADMINISTRATION - LITIGES 
    path('admin/disputes/',                                views.admin_list_disputes,        name='admin-list-disputes'),
    path('admin/disputes/stats/',                          views.admin_dispute_stats,        name='admin-dispute-stats'),
    path('admin/disputes/<int:dispute_id>/',               views.admin_dispute_detail,       name='admin-dispute-detail'),
    path('admin/disputes/<int:dispute_id>/update/',        views.admin_update_dispute,       name='admin-update-dispute'),
    path('admin/disputes/<int:dispute_id>/message/',       views.admin_add_dispute_message,  name='admin-add-dispute-message'),
    path('admin/disputes/<int:dispute_id>/resolve/',       views.admin_resolve_dispute,      name='admin-resolve-dispute'),

    #  ADMINISTRATION - PARAMÈTRES 
    path('admin/settings/',         views.admin_get_settings,    name='admin-get-settings'),
    path('admin/settings/update/',  views.admin_update_settings, name='admin-update-settings'),
]