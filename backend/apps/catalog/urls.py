# backend/apps/catalog/urls.py

from django.urls import path, include
from . import views
from rest_framework.routers import DefaultRouter
from .views import (
    ActivePromotionCampaignListView,
    AdminPromotionCampaignDecisionView,
    AdminPromotionCampaignListView,
    ProductViewSet,
    CategoryViewSet,
    MasterProductViewSet
)

router = DefaultRouter()
router.register(r'products', ProductViewSet, basename='product')
router.register(r'categories', CategoryViewSet, basename='category')
router.register(r'master-products', MasterProductViewSet, basename='master-product')

urlpatterns = [
    path('promotions/active/', ActivePromotionCampaignListView.as_view(), name='active-promotions'),
    path('promotions/admin/', AdminPromotionCampaignListView.as_view(), name='admin-promotions'),
    path('promotions/admin/<int:pk>/decision/', AdminPromotionCampaignDecisionView.as_view(), name='admin-promotion-decision'),
    path('conditions/', views.list_active_conditions, name='conditions'),

    # Arborescence complète (public, cachable côté frontend)
    path("categories/tree/", views.categories_tree, name="categories-tree"),

    # Liste plate avec full_path (pour selects formulaires)
    path("categories/flat/", views.categories_flat, name="categories-flat"),

    # Autocomplete (utilisé par le formulaire vendeur, léger et rapide)
    path(
        "brands/autocomplete/",
        views.brands_autocomplete,
        name="brands-autocomplete",
    ),

    # Liste complète (page publique /marques)
    path(
        "brands/",
        views.brands_list,
        name="brands-list",
    ),

    # Proposition d'une nouvelle marque (vendeur authentifié)
    path(
        "brands/propose/",
        views.brand_propose,
        name="brand-propose",
    ),

    # Détail par slug (page publique /marques/<slug>)
    path(
        "brands/<slug:slug>/",
        views.brand_detail,
        name="brand-detail",
    ),

    # Variants d'une fiche (pour sélecteur buyer)
    path(
        "master-products/<slug:slug>/variants/",
        views.master_product_variants,
        name="master-product-variants",
    ),
    # Détail d'un Variant par SKU
    path(
        "variants/<str:sku>/",
        views.variant_detail,
        name="variant-detail",
    ),
 
    # ─── Vendor ────────────────────────────────────────────────────────
    # Trouver ou créer un Variant (idempotent — pour formulaire vendeur)
    path(
        "vendor/variants/find-or-create/",
        views.variant_find_or_create,
        name="variant-find-or-create",
    ),
    # Liste vendeur (inclut PENDING)
    path(
        "vendor/masters/<int:master_id>/variants/",
        views.vendor_master_variants,
        name="vendor-master-variants",
    ),

    # Attributs (canonique — remplace l'endpoint vendors/products/attributes/)
    path("attributes/", views.attributes_list, name="attributes-list"),
 
    # Axes résolus d'une MasterProduct
    path(
        "master-products/<slug:slug>/axes/",
        views.master_product_axes,
        name="master-product-axes",
    ),

    path("colors/", views.color_dictionary_list, name="color-dictionary-list"),
    path("colors/grouped/", views.color_dictionary_grouped, name="color-dictionary-grouped"),


     # ─── Admin Variants ────────────────────────────────────────────────
    path("admin/variants/", views.admin_variants_list,
         name="admin-variants-list"),
    path("admin/variants/bulk-approve/", views.admin_variants_bulk_approve,
         name="admin-variants-bulk-approve"),
    path("admin/variants/bulk-reject/", views.admin_variants_bulk_reject,
         name="admin-variants-bulk-reject"),
    path("admin/variants/<int:variant_id>/", views.admin_variant_detail,
         name="admin-variant-detail"),
    path("admin/variants/<int:variant_id>/approve/", views.admin_variant_approve,
         name="admin-variant-approve"),
    path("admin/variants/<int:variant_id>/reject/", views.admin_variant_reject,
         name="admin-variant-reject"),


    # ─── Admin Brands ────────────────────────────────────────────────────
    path("admin/brands/",
         views.admin_brands_list,
         name="admin-brands-list"),
    path("admin/brands/create/",
         views.admin_brands_create,
         name="admin-brands-create"),
    path("admin/brands/merge/",
         views.admin_brands_merge,
         name="admin-brands-merge"),
    path("admin/brands/bulk-verify/",
         views.admin_brands_bulk_verify,
         name="admin-brands-bulk-verify"),
    path("admin/brands/bulk-unverify/",
         views.admin_brands_bulk_unverify,
         name="admin-brands-bulk-unverify"),
    path("admin/brands/bulk-activate/",
         views.admin_brands_bulk_activate,
         name="admin-brands-bulk-activate"),
    path("admin/brands/bulk-deactivate/",
         views.admin_brands_bulk_deactivate,
         name="admin-brands-bulk-deactivate"),
    path("admin/brands/export/csv/",
         views.admin_brands_export_csv,
         name="admin-brands-export-csv"),
    path("admin/brands/<int:brand_id>/",
         views.admin_brand_detail,
         name="admin-brand-detail"),
    path("admin/brands/<int:brand_id>/update/",
         views.admin_brand_update,
         name="admin-brand-update"),
    path("admin/brands/<int:brand_id>/delete/",
         views.admin_brand_delete,
         name="admin-brand-delete"),
    path("admin/brands/<int:brand_id>/verify/",
         views.admin_brand_verify,
         name="admin-brand-verify"),
    path("admin/brands/<int:brand_id>/unverify/",
         views.admin_brand_unverify,
         name="admin-brand-unverify"),
    path("admin/brands/<int:brand_id>/activate/",
         views.admin_brand_activate,
         name="admin-brand-activate"),
    path("admin/brands/<int:brand_id>/deactivate/",
         views.admin_brand_deactivate,
         name="admin-brand-deactivate"),      


     # ─── Admin Attributes ───────────────────────────────────────────────
    path("admin/attributes/",
         views.admin_attributes_list,
         name="admin-attributes-list"),
    path("admin/attributes/create/",
         views.admin_attributes_create,
         name="admin-attributes-create"),
    path("admin/attributes/bulk-set-role/",
         views.admin_attributes_bulk_set_role,
         name="admin-attributes-bulk-set-role"),
    path("admin/attributes/bulk-toggle-required/",
         views.admin_attributes_bulk_toggle_required,
         name="admin-attributes-bulk-toggle-required"),
    path("admin/attributes/<int:attr_id>/",
         views.admin_attribute_detail,
         name="admin-attribute-detail"),
    path("admin/attributes/<int:attr_id>/update/",
         views.admin_attribute_update,
         name="admin-attribute-update"),
    path("admin/attributes/<int:attr_id>/delete/",
         views.admin_attribute_delete,
         name="admin-attribute-delete"),
    path("admin/attributes/<int:attr_id>/set-role/",
         views.admin_attribute_set_role,
         name="admin-attribute-set-role"),    


     # ─── Admin Colors ───────────────────────────────────────────────────
    path("admin/colors/",
         views.admin_colors_list,
         name="admin-colors-list"),
    path("admin/colors/create/",
         views.admin_colors_create,
         name="admin-colors-create"),
    path("admin/colors/bulk-activate/",
         views.admin_colors_bulk_activate,
         name="admin-colors-bulk-activate"),
    path("admin/colors/bulk-deactivate/",
         views.admin_colors_bulk_deactivate,
         name="admin-colors-bulk-deactivate"),
    path("admin/colors/<int:color_id>/",
         views.admin_color_detail,
         name="admin-color-detail"),
    path("admin/colors/<int:color_id>/update/",
         views.admin_color_update,
         name="admin-color-update"),
    path("admin/colors/<int:color_id>/delete/",
         views.admin_color_delete,
         name="admin-color-delete"),
    path("admin/colors/<int:color_id>/activate/",
         views.admin_color_activate,
         name="admin-color-activate"),
    path("admin/colors/<int:color_id>/deactivate/",
         views.admin_color_deactivate,
         name="admin-color-deactivate"),    

    path('', include(router.urls)),
]
