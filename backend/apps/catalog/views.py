# backend/apps/catalog/views.py
# Vues pour la gestion des produits et catégories avec filtres avancés

from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticatedOrReadOnly, IsAuthenticated
from rest_framework.pagination import PageNumberPagination
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import extend_schema, OpenApiParameter
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny

from .models import Product, Category, ProductReview, MasterProduct, ModerationStatus
from .serializers import (
    ProductSerializer, 
    CategorySerializer,
    ProductReviewSerializer,
    ProductReviewCreateSerializer,
    MasterProductListSerializer,
    MasterProductDetailSerializer,
)
from .filters import ProductFilter, CategoryFilter


class StandardResultsSetPagination(PageNumberPagination):
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
    queryset = (Product.objects
                .filter(moderation_status=ModerationStatus.APPROVED)
                .select_related('category')
                .prefetch_related('media', 'inventory', 'images'))
    serializer_class = ProductSerializer
    pagination_class = StandardResultsSetPagination
    permission_classes = [IsAuthenticatedOrReadOnly]
    
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter
    ]
    
    filterset_class = ProductFilter
    search_fields = ['title', 'description']
    ordering_fields = ['price_xaf', 'created_at', 'title']
    ordering = ['-created_at']

    @extend_schema(
        tags=["Reviews"],
        summary="Get product reviews",
        description="Récupérer tous les avis approuvés d'un produit"
    )
    @action(detail=True, methods=['get'], permission_classes=[])
    def reviews(self, request, pk=None):
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
    summary="Liste des catégories avec filtres"
)
class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend]
    filterset_class = CategoryFilter


@extend_schema(tags=["Catalog"], summary="Fiches produits maîtres avec leurs offres")
class MasterProductViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = (
        MasterProduct.objects
        .filter(moderation_status=ModerationStatus.APPROVED)
        .select_related('category')
        .prefetch_related('images', 'offers', 'offers__inventory', 'offers__condition')
    )
    pagination_class   = StandardResultsSetPagination
    permission_classes = [IsAuthenticatedOrReadOnly]
    filter_backends    = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields   = ['category']
    search_fields      = ['title', 'brand']
    ordering_fields    = ['created_at', 'title']
    ordering           = ['-created_at']

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return MasterProductDetailSerializer
        return MasterProductListSerializer  

    def get_object(self):
        """Récupère une fiche par id (numérique) OU par slug (chaîne)."""
        from django.shortcuts import get_object_or_404
        qs = self.filter_queryset(self.get_queryset())
        value = str(self.kwargs.get(self.lookup_field, ''))
        obj = get_object_or_404(qs, pk=value) if value.isdigit() else get_object_or_404(qs, slug=value)
        self.check_object_permissions(self.request, obj)
        return obj  
    

@api_view(['GET'])
@permission_classes([AllowAny])
def list_active_conditions(request):
    """Liste des états actifs, pour le formulaire vendeur."""
    from .models import ProductCondition
    from .serializers import ProductConditionSerializer
    qs = ProductCondition.objects.filter(is_active=True)
    return Response(ProductConditionSerializer(qs, many=True).data)    