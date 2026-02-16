# backend/apps/catalog/views.py
# Vues pour la gestion des produits et catégories avec filtres avancés

from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticatedOrReadOnly, IsAuthenticated
from rest_framework.pagination import PageNumberPagination
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import extend_schema, OpenApiParameter

from .models import Product, Category, ProductReview
from .serializers import (
    ProductSerializer, 
    CategorySerializer,
    ProductReviewSerializer,
    ProductReviewCreateSerializer
)
from .filters import ProductFilter, CategoryFilter


class StandardResultsSetPagination(PageNumberPagination):
    """
    Pagination standard pour toutes les listes
    - 20 résultats par page par défaut
    - Paramètre page_size personnalisable (max 100)
    """
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


@extend_schema(
    tags=["Catalog"],
    summary="Liste des produits avec filtres et recherche",
    parameters=[
        OpenApiParameter(name='search', description='Recherche par titre ou description', type=str),
        OpenApiParameter(name='category', description='ID de la catégorie', type=int),
        OpenApiParameter(name='category_slug', description='Slug de la catégorie', type=str),
        OpenApiParameter(name='price_min', description='Prix minimum (XAF)', type=int),
        OpenApiParameter(name='price_max', description='Prix maximum (XAF)', type=int),
        OpenApiParameter(name='in_stock', description='Produits en stock uniquement', type=bool),
        OpenApiParameter(name='is_active', description='Produits actifs uniquement', type=bool),
        OpenApiParameter(name='ordering', description='Tri (ex: -price_xaf, created_at, title)', type=str),
        OpenApiParameter(name='page', description='Numéro de page', type=int),
        OpenApiParameter(name='page_size', description='Nombre de résultats par page (max 100)', type=int),
    ]
)
class ProductViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour les produits avec :
    - Filtrage avancé (catégorie, prix, stock, statut)
    - Recherche full-text (titre, description)
    - Tri personnalisable (prix, date, titre)
    - Pagination
    - Système d'avis
    """
    queryset = Product.objects.all().select_related('category').prefetch_related('media', 'inventory', 'images')
    serializer_class = ProductSerializer
    pagination_class = StandardResultsSetPagination
    permission_classes = [IsAuthenticatedOrReadOnly]
    
    # Backends de filtrage et recherche
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter
    ]
    
    # Configuration des filtres (utilise ProductFilter)
    filterset_class = ProductFilter
    
    # Configuration de la recherche
    search_fields = ['title', 'description']
    
    # Configuration du tri
    ordering_fields = ['price_xaf', 'created_at', 'title']
    ordering = ['-created_at']

    @extend_schema(
        tags=["Reviews"],
        summary="Get product reviews",
        description="Récupérer tous les avis approuvés d'un produit"
    )
    @action(detail=True, methods=['get'], permission_classes=[])
    def reviews(self, request, pk=None):
        """Récupérer tous les avis d'un produit"""
        product = self.get_object()
        
        reviews = ProductReview.objects.filter(
            product=product,
            is_approved=True
        ).select_related('user').order_by('-created_at')
        
        serializer = ProductReviewSerializer(reviews, many=True)
        return Response(serializer.data)

    @extend_schema(
        tags=["Reviews"],
        summary="Add product review",
        description="Ajouter un avis sur un produit (nécessite d'être authentifié)",
        request=ProductReviewCreateSerializer,
        responses={201: ProductReviewSerializer}
    )
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def add_review(self, request, pk=None):
        """Ajouter un avis sur un produit"""
        product = self.get_object()
        
        serializer = ProductReviewCreateSerializer(
            data={**request.data, 'product': product.id},
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        review = serializer.save()
        
        return Response(
            ProductReviewSerializer(review).data,
            status=status.HTTP_201_CREATED
        )


@extend_schema(
    tags=["Catalog"],
    summary="Liste des catégories avec filtres",
    parameters=[
        OpenApiParameter(name='name', description='Recherche par nom (partiel)', type=str),
        OpenApiParameter(name='is_active', description='Catégories actives uniquement', type=bool),
        OpenApiParameter(name='has_parent', description='True=sous-catégories, False=catégories principales', type=bool),
        OpenApiParameter(name='parent', description='ID de la catégorie parente', type=int),
    ]
)
class CategoryViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour les catégories avec :
    - Filtrage par nom, statut, hiérarchie
    - Pagination
    """
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    pagination_class = StandardResultsSetPagination
    
    # Backends de filtrage
    filter_backends = [DjangoFilterBackend]
    
    # Configuration des filtres (utilise CategoryFilter)
    filterset_class = CategoryFilter