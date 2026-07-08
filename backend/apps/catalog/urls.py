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

    path("colors/", views.color_dictionary_list, name="color-dictionary-list"),
    path("colors/grouped/", views.color_dictionary_grouped, name="color-dictionary-grouped"),

    path('', include(router.urls)),
]
