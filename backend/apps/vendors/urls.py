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
      
     path('', include(router.urls)),

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
    path('admin/vendors/stats/', views.admin_vendors_stats, name='admin-vendors-stats'),
    path('admin/finances/stats/', views.admin_finances_stats, name='admin-finances-stats'),
    path('admin/withdrawals/',                    views.admin_list_withdrawals,    name='admin-withdrawals'),
    path('admin/withdrawals/<int:wd_id>/approve/',views.admin_approve_withdrawal,  name='admin-approve-withdrawal'),
    path('admin/withdrawals/<int:wd_id>/reject/', views.admin_reject_withdrawal,   name='admin-reject-withdrawal'),
    path('admin/kyc/',                            views.admin_kyc_queue,           name='admin-kyc-queue'),
    path('admin/plans/',              views.admin_list_plans,   name='admin-plans-list'),
    path('admin/plans/<int:plan_id>/',views.admin_update_plan,  name='admin-update-plan'),
    path('admin/audit/',                              views.admin_audit_log,              name='admin-audit'),
    path('admin/reviews/',                       views.admin_list_reviews,   name='admin-reviews'),
    path('admin/reviews/stats/',                 views.admin_reviews_stats,  name='admin-reviews-stats'),
    path('admin/reviews/<int:review_id>/toggle/',views.admin_toggle_review,  name='admin-toggle-review'),
    path('admin/reviews/<int:review_id>/delete/',views.admin_delete_review,  name='admin-delete-review'),
    path('admin/subscriptions/',                       views.admin_list_subscriptions,      name='admin-subscriptions'),
    path('admin/subscriptions/<int:sub_id>/approve/',  views.admin_approve_subscription,    name='admin-approve-subscription'),
    path('admin/subscriptions/<int:sub_id>/reject/',   views.admin_reject_subscription,     name='admin-reject-subscription'),
    path('admin/notifications/broadcast/',             views.admin_broadcast_notification,  name='admin-broadcast'),
    path('admin/modifications/',                      views.admin_list_modifications,    name='admin-modifications'),
    path('admin/modifications/<int:mod_id>/approve/', views.admin_approve_modification,  name='admin-approve-modification'),
    path('admin/modifications/<int:mod_id>/reject/',  views.admin_reject_modification,   name='admin-reject-modification'),
    path('admin/certifications/', views.admin_certifications_stats, name='admin-certifications'),
    path('admin/certifications/',  views.admin_certifications_stats, name='admin-certifications'),
    path('admin/account/stats/',   views.admin_account_stats,        name='admin-account-stats'),
    path('admin/live/users/',  views.admin_live_users,  name='admin-live-users'),
    path('admin/vendors/map/', views.admin_vendors_map, name='admin-vendors-map'),
    path('admin/customers/broadcast/',         views.admin_customers_broadcast,         name='admin-customers-broadcast'),
    path('admin/customers/broadcast/preview/', views.admin_customers_broadcast_preview, name='admin-customers-broadcast-preview'),
    path('admin/customers/broadcast/history/', views.admin_customers_broadcast_history, name='admin-customers-broadcast-history'),
    path('admin/customers/loyalty/', views.admin_customers_loyalty, name='admin-customers-loyalty'),
    path('admin/logs/',       views.admin_system_logs, name='admin-logs'),
    path('admin/logs/clear/', views.admin_clear_logs,  name='admin-logs-clear'),
    path('admin/conditions/',                       views.admin_list_conditions,  name='admin-conditions'),
    path('admin/conditions/create/',                views.admin_create_condition, name='admin-create-condition'),
    path('admin/conditions/<int:cond_id>/update/',  views.admin_update_condition, name='admin-update-condition'),
    path('admin/conditions/<int:cond_id>/delete/',  views.admin_delete_condition, name='admin-delete-condition'),

    #  ADMINISTRATION - DASHBOARD 
    path('admin/dashboard/stats/',     views.admin_dashboard_stats, name='admin-dashboard-stats'),
    path('admin/dashboard/analytics/', views.admin_analytics,       name='admin-analytics'),
    path('admin/customers/stats/', views.admin_customers_stats, name='admin-customers-stats'),

    #  ADMINISTRATION - PRODUITS 
    path('admin/products/',                                   views.admin_list_products,          name='admin-list-products'),
    path('admin/products/<int:product_id>/',                  views.admin_product_detail,         name='admin-product-detail'),
    path('admin/products/<int:product_id>/update/',           views.admin_update_product,         name='admin-update-product'),
    path('admin/products/<int:product_id>/delete/',           views.admin_delete_product,         name='admin-delete-product'),
    path('admin/products/<int:product_id>/toggle-status/',    views.admin_toggle_product_status,  name='admin-toggle-product-status'),
    path('admin/products/<int:product_id>/approve/', views.admin_approve_product, name='admin-approve-product'),
    path('admin/products/<int:product_id>/reject/',  views.admin_reject_product,  name='admin-reject-product'),

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
    path('admin/disputes/<int:dispute_id>/toggle-reply/', views.admin_toggle_dispute_reply,  name='admin-toggle-dispute-reply'),

    #  ADMINISTRATION — LIVREURS & BROADCAST ÉTENDU
    path('admin/couriers/',                       views.admin_list_couriers,       name='admin-list-couriers'),
    path('admin/notifications/broadcast-extended/', views.admin_broadcast_extended, name='admin-broadcast-extended'),

    # BOUTIQUE
    path('shop/',                views.vendor_get_shop,               name='vendor-get-shop'),
    path('shop/update/',          views.vendor_update_shop,        name='vendor-shop-update'),
    path('shop/photo/',           views.vendor_upload_shop_photo,   name='vendor-shop-photo'),
    path('shop/banner/',          views.vendor_upload_shop_banner,  name='vendor-shop-banner'),
    path('shop/qr/',              views.vendor_shop_qr,             name='vendor-shop-qr'),
    
    # PARAMÈTRES
    path('settings/',             views.vendor_update_settings,    name='vendor-settings'),

    # CERTIFICATIONS
    path('certifications/',       views.vendor_certifications,      name='vendor-certifications'),

    # PLANS
    path('plans/',                views.vendor_list_plans,          name='vendor-plans'),
    path('plans/subscribe/',      views.vendor_subscribe_plan,      name='vendor-subscribe'),
    path('plans/history/',        views.vendor_subscription_history,name='vendor-sub-history'),

    # LOCATIONS
    path('locations/', views.vendor_locations_list, name='vendor-locations'),
    path('locations/create/', views.vendor_location_create, name='vendor-location-create'),
    path('locations/<int:location_id>/update/', views.vendor_location_update, name='vendor-location-update'),
    path('locations/<int:location_id>/delete/', views.vendor_location_delete, name='vendor-location-delete'),

    # MOD REQUESTS
    path('mod-requests/', views.vendor_mod_requests_list, name='vendor-mod-requests'),
    path('mod-requests/create/', views.vendor_mod_request_create, name='vendor-mod-request-create'),
    path('mod-requests/<int:request_id>/docs/', views.vendor_mod_request_upload_docs, name='vendor-mod-request-docs'),

    # DOC TYPES
    path('doc-types/', views.vendor_doc_types_list, name='vendor-doc-types'),

    # TRIAL PLAN
    path('plans/trial/', views.vendor_trial_activate, name='vendor-trial'),

    # BOUTIQUE PUBLIQUE
    path('boutique/<slug:slug>/', views.public_shop,                name='public-shop'),

    #  ADMINISTRATION - PARAMÈTRES 
    path('admin/settings/',         views.admin_get_settings,    name='admin-get-settings'),
    path('admin/settings/update/',  views.admin_update_settings, name='admin-update-settings'),
]