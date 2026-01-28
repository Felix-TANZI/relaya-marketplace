from rest_framework import generics
from drf_spectacular.utils import extend_schema

from .models import Category, Product
from .serializers import (
    CategorySerializer,
    ProductListSerializer,
    ProductDetailSerializer,
)


@extend_schema(tags=["Catalog"], summary="Lister les catégories")
class CategoryListView(generics.ListAPIView):
    queryset = Category.objects.filter(is_active=True)
    serializer_class = CategorySerializer


@extend_schema(tags=["Catalog"], summary="Lister les produits")
class ProductListView(generics.ListAPIView):
    queryset = Product.objects.filter(is_active=True).select_related("category").prefetch_related("media")
    serializer_class = ProductListSerializer


@extend_schema(tags=["Catalog"], summary="Détails produit")
class ProductDetailView(generics.RetrieveAPIView):
    queryset = Product.objects.filter(is_active=True).select_related("category").prefetch_related("media", "inventory")
    serializer_class = ProductDetailSerializer
    lookup_field = "id"
