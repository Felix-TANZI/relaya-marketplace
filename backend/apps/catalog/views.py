# backend/apps/catalog/views.py
# Vues pour la gestion du catalogue de produits.

from rest_framework import generics, filters
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes

from .models import Category, Product
from .serializers import CategorySerializer, ProductListSerializer, ProductDetailSerializer
from .filters import ProductFilter


@extend_schema(tags=["Catalog"], summary="Lister les catégories")
class CategoryListView(generics.ListAPIView):
    queryset = Category.objects.filter(is_active=True)
    serializer_class = CategorySerializer


@extend_schema(
    tags=["Catalog"],
    summary="Lister les produits avec filtres",
    parameters=[
        OpenApiParameter(name='search', description='Recherche par titre ou description', type=OpenApiTypes.STR),
        OpenApiParameter(name='category', description='ID de la catégorie', type=OpenApiTypes.INT),
        OpenApiParameter(name='price_min', description='Prix minimum en XAF', type=OpenApiTypes.INT),
        OpenApiParameter(name='price_max', description='Prix maximum en XAF', type=OpenApiTypes.INT),
        OpenApiParameter(name='ordering', description='Tri: price_xaf, -price_xaf, -created_at', type=OpenApiTypes.STR),
    ]
)
class ProductListView(generics.ListAPIView):
    queryset = Product.objects.filter(is_active=True).select_related("category").prefetch_related("media")
    serializer_class = ProductListSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = ProductFilter
    search_fields = ['title', 'description']
    ordering_fields = ['price_xaf', 'created_at']
    ordering = ['-created_at']


@extend_schema(tags=["Catalog"], summary="Détails produit")
class ProductDetailView(generics.RetrieveAPIView):
    queryset = Product.objects.filter(is_active=True).select_related("category").prefetch_related("media", "inventory")
    serializer_class = ProductDetailSerializer
    lookup_field = "id"