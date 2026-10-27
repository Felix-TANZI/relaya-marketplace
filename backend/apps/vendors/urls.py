# backend/apps/vendors/urls.py
# URLs pour l'espace vendeur

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from . import chart_views
from . import views_money_v2
from . import vd07_litiges
from . import vd07_retours

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
    path('masters/<int:master_id>/images/',
         views.upload_master_image, name='upload-master-image'),
    path('masters/<int:master_id>/images/<int:image_id>/',
         views.delete_master_image, name='delete-master-image'),    
      
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

    # Reçu PDF d'une commande
    path('orders/<int:order_id>/receipt-pdf/', views.vendor_order_receipt_pdf, name='vendor-order-receipt-pdf'),

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

    # RETOURS VENDEUR
    path('returns/',                                views.vendor_return_list,   name='vendor-return-list'),
    path('returns/<int:return_id>/review/',         views.vendor_return_review, name='vendor-return-review'),

    #  ESPACE VENDEUR AUTONOME — litiges / retours (12 oct.) — voir INTEGRATION-API.md §1 et
    #  src/api/domaines/{litiges,retours}.ts. Mêmes modèles orders.Dispute / orders.Return que
    #  les routes ci-dessus (ancien frontend) : rien n'est dupliqué côté données, seule la forme
    #  JSON change pour ce nouveau frontend (contrat Litige / Retour de
    #  src/donnees/domaines/{litiges,retours}.ts). PAS de slash final (même convention que le
    #  reste de ce bloc : src/api/outils.ts n'en ajoute pas). Seules les deux routes de LISTE
    #  auraient collisionné avec les routes ci-dessus (disputes/ , returns/) : elles sont donc
    #  servies sous /v2 ; tout le reste ne collisionne pas (ref non numérique type "BLV-00008"
    #  vs <int:dispute_id>/<int:return_id> ci-dessus, ou segment différent).
    path('disputes/rules',                          vd07_litiges.dispute_rules,          name='vd07-dispute-rules'),
    path('disputes/counts',                         vd07_litiges.dispute_counts,         name='vd07-dispute-counts'),
    path('disputes/v2',                             vd07_litiges.dispute_list_v2,        name='vd07-dispute-list'),
    path('disputes/<str:ref>/evidence',             vd07_litiges.dispute_evidence_add,    name='vd07-dispute-evidence-add'),
    path('disputes/<str:ref>/evidence/<int:piece_id>', vd07_litiges.dispute_evidence_remove, name='vd07-dispute-evidence-remove'),
    path('disputes/<str:ref>/draft',                vd07_litiges.dispute_draft,          name='vd07-dispute-draft'),
    path('disputes/<str:ref>/answer',               vd07_litiges.dispute_answer,         name='vd07-dispute-answer'),
    path('disputes/<str:ref>/appeal',               vd07_litiges.dispute_appeal,         name='vd07-dispute-appeal'),
    path('disputes/<str:ref>',                      vd07_litiges.dispute_detail_v2,      name='vd07-dispute-detail'),

    path('returns/counts',                          vd07_retours.return_counts,          name='vd07-return-counts'),
    path('returns/v2',                              vd07_retours.return_list_v2,         name='vd07-return-list'),
    path('returns/<str:ref>/receive',               vd07_retours.return_receive,         name='vd07-return-receive'),
    path('returns/<str:ref>/photos',                vd07_retours.return_photos_add,      name='vd07-return-photos-add'),
    path('returns/<str:ref>/photos/<int:photo_id>', vd07_retours.return_photo_remove,    name='vd07-return-photo-remove'),
    path('returns/<str:ref>/draft',                 vd07_retours.return_draft,           name='vd07-return-draft'),
    path('returns/<str:ref>/inspection',            vd07_retours.return_inspection,      name='vd07-return-inspection'),
    path('returns/<str:ref>/replacement/ready',     vd07_retours.return_replacement_ready, name='vd07-return-replacement-ready'),
    path('returns/<str:ref>/replacement',           vd07_retours.return_replacement,     name='vd07-return-replacement'),
    path('returns/<str:ref>',                       vd07_retours.return_detail_v2,       name='vd07-return-detail'),

    # AVIS VENDEUR
    path('reviews/',                                views.vendor_reviews,       name='vendor-reviews'),

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
    path('admin/masters/',                          views.admin_list_masters,    name='admin-masters'),
    path('admin/masters/<int:master_id>/',          views.admin_master_detail,   name='admin-master-detail'),
    path('admin/masters/<int:master_id>/update/',   views.admin_update_master,   name='admin-master-update'),
    path('admin/masters/<int:master_id>/approve/',  views.admin_approve_master,  name='admin-master-approve'),
    path('admin/masters/<int:master_id>/reject/',   views.admin_reject_master,   name='admin-master-reject'),
    path('admin/masters/<int:master_id>/delete/',   views.admin_delete_master,   name='admin-master-delete'),

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
    path('admin/disputes/<int:dispute_id>/request-evidence/', views.admin_request_dispute_evidence, name='admin-request-dispute-evidence'),

    #  ADMINISTRATION - RETOURS
    path('admin/returns/',                             views.admin_list_returns,          name='admin-list-returns'),
    path('admin/returns/<int:return_id>/received/',    views.admin_return_mark_received,  name='admin-return-mark-received'),
    path('admin/returns/<int:return_id>/finalize/',    views.admin_finalize_return,       name='admin-finalize-return'),

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
    #path('boutique/<slug:slug>/', views.public_shop,                name='public-shop'),

    #  ADMINISTRATION - PARAMÈTRES
    path('admin/settings/',         views.admin_get_settings,    name='admin-get-settings'),
    path('admin/settings/update/',  views.admin_update_settings, name='admin-update-settings'),

    #  ESPACE VENDEUR V2 (Lot 2/3 — additif, lecture seule, voir views_money_v2.py)
    path('v2/money-summary/', views_money_v2.vendor_money_summary_v2, name='vendor-v2-money-summary'),

    #  ESPACE VENDEUR AUTONOME (espace-client-belivay/espace-vendeur) — vague d'intégration du
    #  12 oct., domaine boutique/messages/notifications/aide/événements. PAS de slash final : ce
    #  nouveau frontend (src/api/outils.ts) n'en ajoute pas, et APPEND_SLASH convertirait un POST
    #  en GET au premier redirect. Voir INTEGRATION-API.md et le rapport de l'agent qui a construit
    #  ces routes pour le détail des écarts avec la liste confiée (compléments nécessaires au
    #  fonctionnement, changement de règle produit sur la messagerie directe).

    # BOUTIQUE — pause / fermetures programmées
    path('shop/pause',   views.vendor_shop_pause,  name='vendor-shop-pause'),
    path('shop/resume',  views.vendor_shop_resume, name='vendor-shop-resume'),
    path('shop/closures', views.vendor_shop_closures, name='vendor-shop-closures'),
    path('shop/closures/<int:closure_id>', views.vendor_shop_closure_detail, name='vendor-shop-closure-detail'),

    # AVIS — réponse privée (remplace la redirection WhatsApp de AvisDroitReponsePage.tsx)
    path('reviews/<int:review_id>/private-reply', views.vendor_review_private_reply, name='vendor-review-private-reply'),

    # MESSAGES — conversations vendeur ↔ client
    path('threads',                        views.vendor_threads,            name='vendor-threads'),
    path('threads/support',                views.vendor_thread_support,     name='vendor-thread-support'),
    path('threads/<int:thread_id>',        views.vendor_thread_detail,      name='vendor-thread-detail'),
    path('threads/<int:thread_id>/read',   views.vendor_thread_mark_read,   name='vendor-thread-read'),
    path('threads/<int:thread_id>/messages', views.vendor_thread_send_message, name='vendor-thread-messages'),
    path('quick-replies',                  views.vendor_quick_replies,      name='vendor-quick-replies'),

    # NOTIFICATIONS — alias de /api/auth/notifications/ (même modèle UserNotification)
    path('notifications',                      views.vendor_notifications_list,        name='vendor-notifications-list'),
    path('notifications/counts',               views.vendor_notifications_counts,      name='vendor-notifications-counts'),
    path('notifications/unread-count',         views.vendor_notifications_unread_count, name='vendor-notifications-unread-count'),
    path('notifications/settings',             views.vendor_notification_settings,     name='vendor-notification-settings'),
    path('notifications/read-all',             views.vendor_notifications_mark_all_read, name='vendor-notifications-read-all'),
    path('notifications/<int:notification_id>/read', views.vendor_notification_mark_read, name='vendor-notification-read'),

    # AIDE
    path('help/questions',            views.vendor_help_questions,           name='vendor-help-questions'),
    path('help/forbidden-products',   views.vendor_help_forbidden_products,  name='vendor-help-forbidden-products'),
    path('help/contacts',             views.vendor_help_contacts,            name='vendor-help-contacts'),
    path('help/tip',                  views.vendor_help_tip,                 name='vendor-help-tip'),

    # ÉVÉNEMENTS TEMPS RÉEL (§8) — GET /events (polling) et GET /events/stream (SSE)
    path('events',        views.vendor_events_list,   name='vendor-events-list'),
    path('events/stream', views.vendor_events_stream, name='vendor-events-stream'),

    #  ESPACE VENDEUR AUTONOME — commandes / préparation / remise / journal (12 oct.)
    #  Même convention sans slash final que le bloc ci-dessus (src/api/outils.ts).
    path('orders',                          views.ev_orders_vue,          name='ev-orders-vue'),
    path('orders/<int:order_id>',           views.ev_order_detail,        name='ev-order-detail'),
    path('orders/<int:order_id>/journal',   views.ev_order_journal,       name='ev-order-journal'),
    path('orders/<int:order_id>/ready',     views.ev_order_ready,         name='ev-order-ready'),
    path('orders/<int:order_id>/stockout',  views.ev_order_stockout,      name='ev-order-stockout'),
    path('orders/<int:order_id>/extend',    views.ev_order_extend,        name='ev-order-extend'),  # GET options / POST demande
    path('orders/<int:order_id>/slip',          views.ev_order_slip,        name='ev-order-slip'),
    path('orders/<int:order_id>/slip/open',     views.ev_order_slip_open,   name='ev-order-slip-open'),
    path('orders/<int:order_id>/slip/checks',   views.ev_order_slip_check, name='ev-order-slip-check'),
    path('orders/<int:order_id>/slip/verify',   views.ev_order_slip_verify, name='ev-order-slip-verify'),
    path('orders/<int:order_id>/handover',       views.ev_order_handover,      name='ev-order-handover'),
    path('handovers',                            views.ev_handovers_list,     name='ev-handovers-list'),
    path('orders/<int:order_id>/handover-code',       views.ev_handover_code,       name='ev-handover-code'),
    path('orders/<int:order_id>/handover-code/renew', views.ev_handover_code_renew, name='ev-handover-code-renew'),
    path('orders/<int:order_id>/receipt',   views.ev_order_receipt,       name='ev-order-receipt'),
    path('receipts',                        views.ev_receipts,            name='ev-receipts'),
    path('orders/<int:order_id>/not-ready', views.ev_order_not_ready,     name='ev-order-not-ready'),
    path('shop/closed-today',               views.ev_shop_closed_today,   name='ev-shop-closed-today'),

    #  ─────────────────────────────────────────────────────────────────────
    #  DOMAINE PRODUITS / OFFRES / CATALOGUE / STOCK / VENTES FLASH /
    #  QUESTIONS CLIENTS (12 oct.) — voir INTEGRATION-API.md. PAS de slash
    #  final (même raison que le bloc boutique/messages plus haut).
    #  ─────────────────────────────────────────────────────────────────────

    # OFFRES — réglages, catalogue, recherche
    path('config',                            views.vd_config,             name='vd-config'),
    path('catalog/search',                    views.vd_catalog_search,     name='vd-catalog-search'),
    path('catalog/suggest',                   views.vd_catalog_suggest,    name='vd-catalog-suggest'),
    path('catalog/recognize',                 views.vd_catalog_recognize,  name='vd-catalog-recognize'),
    path('catalog/barcode/<str:code>',        views.vd_catalog_barcode,    name='vd-catalog-barcode'),
    path('catalog/<int:master_id>/variants',  views.vd_catalog_variants,   name='vd-catalog-variants'),
    path('sheets/<int:master_id>/variants',   views.vd_catalog_variants,   name='vd-sheets-variants'),

    # OFFRES — liste / brouillon / nouveau produit / attache / export-import / aperçu
    path('offers',                   views.vd_offers_list,    name='vd-offers-list'),
    path('offers/new',               views.vd_offers_new,     name='vd-offers-new'),
    path('offers/draft',             views.vd_offers_draft,   name='vd-offers-draft'),
    path('offers/export',            views.vd_offers_export,  name='vd-offers-export'),
    path('offers/import',            views.vd_offers_import,  name='vd-offers-import'),
    path('offers/quote',             views.vd_offers_quote,   name='vd-offers-quote'),
    path('offers/publication',       views.vd_offer_publication, name='vd-offer-publication-current'),

    # OFFRES — détail et actions sur une offre
    path('offers/<int:offer_id>',                      views.vd_offer_detail,              name='vd-offer-detail'),
    path('offers/<int:offer_id>/restore',              views.vd_offer_restore,             name='vd-offer-restore'),
    path('offers/<int:offer_id>/duplicate',            views.vd_offer_duplicate,           name='vd-offer-duplicate'),
    path('offers/<int:offer_id>/attach',               views.vd_offer_attach,              name='vd-offer-attach'),
    path('offers/<int:offer_id>/pause',                views.vd_offer_pause,               name='vd-offer-pause'),
    path('offers/<int:offer_id>/stock',                views.vd_offer_stock,               name='vd-offer-stock'),
    path('offers/<int:offer_id>/photos',               views.vd_offer_photos,              name='vd-offer-photos'),
    path('offers/<int:offer_id>/photos/<int:photo_id>', views.vd_offer_photo_delete,       name='vd-offer-photo-delete'),
    path('offers/<int:offer_id>/price-advice',         views.vd_offer_price_advice,        name='vd-offer-price-advice'),
    path('offers/<int:offer_id>/publish',              views.vd_offer_publish,             name='vd-offer-publish'),
    path('offers/<int:offer_id>/price',                views.vd_offer_price,               name='vd-offer-price'),
    path('offers/<int:offer_id>/publication',          views.vd_offer_publication,         name='vd-offer-publication'),
    path('offers/<int:offer_id>/description-proposal', views.vd_offer_description_proposal, name='vd-offer-description-proposal'),

    # STOCK (AJ-A)
    path('stock',                         views.vd_stock_list,      name='vd-stock-list'),
    path('stock/movements',               views.vd_stock_movements, name='vd-stock-movements'),
    path('stock/export',                  views.vd_stock_export,    name='vd-stock-export'),
    path('stock/<int:offer_id>/adjust',   views.vd_stock_adjust,    name='vd-stock-adjust'),
    path('stock/<int:offer_id>/threshold', views.vd_stock_threshold, name='vd-stock-threshold'),

    # VENTES FLASH / PROMOTIONS
    path('promotions',                 views.vd_promotions_list_create, name='vd-promotions-list-create'),
    path('promotions/rules',           views.vd_promotions_rules,       name='vd-promotions-rules'),
    path('promotions/offers',          views.vd_promotions_offers,      name='vd-promotions-offers'),
    path('promotions/quote',           views.vd_promotions_quote,       name='vd-promotions-quote'),
    path('promotions/<int:promo_id>/stop', views.vd_promotions_stop,    name='vd-promotions-stop'),

    # QUESTIONS CLIENTS
    path('questions',                          views.vd_questions_list,           name='vd-questions-list'),
    path('questions/filter',                   views.vd_questions_filter,         name='vd-questions-filter'),
    path('questions/templates',                views.vd_questions_templates,      name='vd-questions-templates'),
    path('questions/templates/<int:template_id>', views.vd_questions_template_delete, name='vd-questions-template-delete'),
    path('questions/<int:question_id>/answer', views.vd_question_answer,         name='vd-question-answer'),
    path('questions/<int:question_id>/report', views.vd_question_report,         name='vd-question-report'),

    #  ─────────────────────────────────────────────────────────────────────
    #  DOMAINES ARGENT / VERSEMENTS / TRUST / PLANS (12 oct.) — voir
    #  INTEGRATION-API.md §1-3 et le rapport de l'agent qui a construit ces
    #  routes (apps/vendors/views.py, section "VAGUE D'INTÉGRATION ESPACE-
    #  VENDEUR AUTONOME"). Pas de slash final (même raison que les blocs
    #  précédents : src/api/outils.ts n'en ajoute pas).
    #  ─────────────────────────────────────────────────────────────────────

    # ARGENT
    path('money/releasing',            views.vendor_money_releasing,   name='vd-money-releasing'),
    path('money/frozen',               views.vendor_money_frozen,      name='vd-money-frozen'),
    path('money/summary',              views.vendor_money_summary,     name='vd-money-summary'),
    path('money/earnings',             views.vendor_money_earnings,    name='vd-money-earnings'),
    path('documents',                  views.vendor_documents_list,    name='vd-documents-list'),
    path('documents/<str:doc_type>/<str:period>', views.vendor_document_detail, name='vd-document-detail'),

    # VERSEMENTS
    path('payouts/next',               views.vendor_payouts_next,              name='vd-payouts-next'),
    path('payouts',                    views.vendor_payouts_history,           name='vd-payouts-history'),
    path('payout-number',              views.vendor_payout_number,             name='vd-payout-number'),            # GET + PUT
    path('payout-number/codes',        views.vendor_payout_number_codes,       name='vd-payout-number-codes'),      # POST + DELETE
    path('payout-number/codes/resend', views.vendor_payout_number_codes_resend, name='vd-payout-number-codes-resend'),

    # TRUST
    path('score',                      views.vendor_trust_score_view,          name='vd-score'),
    path('score/appeal',               views.vendor_trust_score_appeal,        name='vd-score-appeal'),
    path('account/status',             views.vendor_account_status,            name='vd-account-status'),
    path('account/decisions',          views.vendor_account_decisions,         name='vd-account-decisions'),
    path('account/decisions/<str:decision_id>', views.vendor_account_decision_detail, name='vd-account-decision-detail'),
    path('tiers',                      views.vendor_tiers,                     name='vd-tiers'),

    # PLANS — récompenses au mérite, vente flash offerte, services, stats, demande.
    # PAS de POST /visibility (DP-14, Q-32 : aucune visibilité payante — voir rapport de mission).
    path('rewards',                    views.vendor_rewards_list,              name='vd-rewards-list'),
    path('rewards/<int:reward_id>/use', views.vendor_reward_use,               name='vd-reward-use'),
    path('flash-sales',                views.vendor_flash_sales_create,        name='vd-flash-sales-create'),
    path('services',                   views.vendor_services,                  name='vd-services'),
    path('stats',                      views.vendor_plans_stats,               name='vd-plans-stats'),
    path('demand',                     views.vendor_demand,                    name='vd-demand'),
]
