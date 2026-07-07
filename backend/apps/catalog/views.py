# backend/apps/catalog/views.py
# Vues pour la gestion des produits et catégories avec filtres avancés

from rest_framework import viewsets, filters, status, generics
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticatedOrReadOnly, IsAuthenticated, IsAdminUser
from rest_framework.pagination import PageNumberPagination
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Avg, Count, Q
from drf_spectacular.utils import extend_schema, OpenApiParameter
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny

from .models import Product, Category, ProductReview, MasterProduct, ModerationStatus, PromotionCampaign
from .serializers import (
    ProductSerializer, 
    CategorySerializer,
    ProductReviewSerializer,
    ProductReviewCreateSerializer,
    MasterProductListSerializer,
    MasterProductDetailSerializer,
    PromotionCampaignSerializer,
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
                .prefetch_related('media', 'inventory', 'images', 'promotion_campaigns'))
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
    ordering_fields = ['price_xaf', 'created_at', 'title', 'belivay_rating_average', 'belivay_reviews_count']
    ordering = ['-belivay_rating_average', '-belivay_reviews_count', '-created_at']

    def get_queryset(self):
        return (
            Product.objects.all()
            .select_related('category', 'vendor')
            .prefetch_related('media', 'inventory', 'images', 'promotion_campaigns')
            .annotate(
                belivay_rating_average=Avg('reviews__rating', filter=Q(reviews__is_approved=True)),
                belivay_reviews_count=Count('reviews', filter=Q(reviews__is_approved=True)),
            )
        )

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
        tags=["Promotions"],
        summary="Proposer une promotion ou un Flash Deal pour ce produit",
        request=PromotionCampaignSerializer,
        responses={201: PromotionCampaignSerializer},
    )
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated], url_path='promotion-request')
    def promotion_request(self, request, pk=None):
        product = self.get_object()
        serializer = PromotionCampaignSerializer(
            data={**request.data, "product": product.id},
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        campaign = serializer.save()
        return Response(PromotionCampaignSerializer(campaign, context={"request": request}).data, status=status.HTTP_201_CREATED)


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
        .prefetch_related('images', 'offers', 'offers__inventory', 'offers__condition', 'offers__images')
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


@extend_schema(tags=["Promotions"], summary="Promotions et Flash Deals actifs")
class ActivePromotionCampaignListView(generics.ListAPIView):
    serializer_class = PromotionCampaignSerializer
    permission_classes = []

    def get_queryset(self):
        from django.utils import timezone

        now = timezone.now()
        campaign_type = self.request.query_params.get("type")
        qs = (
            PromotionCampaign.objects.filter(
                status=PromotionCampaign.Status.APPROVED,
                starts_at__lte=now,
                ends_at__gte=now,
            )
            .select_related("product", "product__category")
            .order_by("campaign_type", "ends_at")
        )
        if campaign_type in [PromotionCampaign.CampaignType.REGULAR, PromotionCampaign.CampaignType.FLASH]:
            qs = qs.filter(campaign_type=campaign_type)
        return qs


@extend_schema(tags=["Promotions"], summary="Liste admin des campagnes promotionnelles")
class AdminPromotionCampaignListView(generics.ListAPIView):
    serializer_class = PromotionCampaignSerializer
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        qs = (
            PromotionCampaign.objects.select_related(
                "product",
                "product__category",
                "requested_by",
                "approved_by",
            )
            .order_by("-created_at")
        )
        campaign_type = self.request.query_params.get("type")
        campaign_status = self.request.query_params.get("status")
        if campaign_type in [PromotionCampaign.CampaignType.REGULAR, PromotionCampaign.CampaignType.FLASH]:
            qs = qs.filter(campaign_type=campaign_type)
        if campaign_status in [choice[0] for choice in PromotionCampaign.Status.choices]:
            qs = qs.filter(status=campaign_status)
        return qs


@extend_schema(tags=["Promotions"], summary="Décision admin sur une campagne")
class AdminPromotionCampaignDecisionView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        campaign = generics.get_object_or_404(PromotionCampaign, pk=pk)
        decision = request.data.get("status")
        if decision not in [
            PromotionCampaign.Status.APPROVED,
            PromotionCampaign.Status.REJECTED,
            PromotionCampaign.Status.SUSPENDED,
        ]:
            return Response(
                {"status": "Choisissez APPROVED, REJECTED ou SUSPENDED."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        campaign.status = decision
        campaign.admin_note = request.data.get("admin_note", campaign.admin_note)
        if decision == PromotionCampaign.Status.APPROVED:
            campaign.approved_by = request.user
            campaign.rejection_reason = ""
        elif decision == PromotionCampaign.Status.REJECTED:
            campaign.approved_by = None
            campaign.rejection_reason = request.data.get("rejection_reason", campaign.rejection_reason)
        campaign.full_clean()
        campaign.save(update_fields=["status", "approved_by", "rejection_reason", "admin_note", "updated_at"])
        return Response(PromotionCampaignSerializer(campaign, context={"request": request}).data)
