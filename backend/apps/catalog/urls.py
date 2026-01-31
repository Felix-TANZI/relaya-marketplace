# backend/apps/catalog/urls.py
# URL patterns pour la gestion du catalogue de produits.

from django.urls import path
from .views import CategoryListView, ProductListView, ProductDetailView

urlpatterns = [
    path("categories/", CategoryListView.as_view(), name="categories-list"),
    path("products/", ProductListView.as_view(), name="products-list"),
    path("products/<int:id>/", ProductDetailView.as_view(), name="product-detail"),
]