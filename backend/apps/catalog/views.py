# backend/apps/catalog/views.py
# Vues pour la gestion des produits et catégories avec filtres avancés

from collections import defaultdict

from rest_framework import viewsets, filters, status, generics
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticatedOrReadOnly, IsAuthenticated, IsAdminUser
from rest_framework.pagination import PageNumberPagination
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Avg, Count, Q
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiParameter, OpenApiTypes
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from django.utils.text import slugify
from django.utils import timezone

from .models import Product, Category, ProductReview, MasterProduct, ModerationStatus, PromotionCampaign, Brand, ColorDictionary, ColorFamily, ProductAttribute, MasterProduct, AttributeRole, ProductVariant
from .serializers import (
    ProductSerializer, 
    CategorySerializer,
    ProductReviewSerializer,
    ProductReviewCreateSerializer,
    MasterProductListSerializer,
    MasterProductDetailSerializer,
    PromotionCampaignSerializer,
    CategoryTreeSerializer, 
    CategoryFlatSerializer,
    BrandSerializer, 
    BrandLightSerializer, 
    BrandAutocompleteSerializer,
    ColorDictionarySerializer,
    ProductAttributeSerializer, 
    MasterProductAxesSerializer,
    ProductVariantSerializer,
    ProductVariantLightSerializer,
    ProductVariantCreateSerializer,
    AdminVariantListSerializer,
    AdminVariantDetailSerializer,
    AdminVariantModerationSerializer,
 
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


@extend_schema(
    tags=["Catalog"],
    summary="Arborescence complète des catégories",
    description=(
        "Retourne l'arbre complet des catégories en une seule requête, "
        "avec les enfants imbriqués récursivement. Filtres disponibles :\n"
        "- include_deprecated : inclure les catégories obsolètes (défaut : False)\n"
        "- include_inactive : inclure les catégories désactivées (défaut : False)\n"
        "- root_slug : ne renvoyer que le sous-arbre sous cette racine "
        "(ex : ?root_slug=electronics)"
    ),
    parameters=[
        OpenApiParameter(name="include_deprecated", type=OpenApiTypes.BOOL, required=False),
        OpenApiParameter(name="include_inactive", type=OpenApiTypes.BOOL, required=False),
        OpenApiParameter(name="root_slug", type=OpenApiTypes.STR, required=False),
    ],
    responses={200: CategoryTreeSerializer(many=True)},
)
@api_view(["GET"])
@permission_classes([AllowAny])
def categories_tree(request):
    """
    Endpoint public : arbre des catégories.
 
    Perf : UNE SEULE requête SQL grâce à un pré-fetch en dict.
    Adapté aux catalogues de quelques milliers de catégories max.
    Au-delà, envisager un cache Redis (invalidation sur save Category).
    """
    include_deprecated = request.query_params.get(
        "include_deprecated", "false"
    ).lower() in ("1", "true", "yes")
    include_inactive = request.query_params.get(
        "include_inactive", "false"
    ).lower() in ("1", "true", "yes")
    root_slug = request.query_params.get("root_slug")
 
    # Base queryset : toutes les catégories non soft-deleted
    qs = Category.objects.all()  # SoftDeleteModel exclut les deleted par défaut
 
    if not include_deprecated:
        qs = qs.filter(is_deprecated=False)
    if not include_inactive:
        qs = qs.filter(is_active=True)
 
    all_cats = list(qs.order_by("level", "display_order", "name"))
 
    # Construction du dict parent_id → [children]
    children_map = defaultdict(list)
    by_id = {c.id: c for c in all_cats}
    for cat in all_cats:
        if cat.parent_id is not None and cat.parent_id in by_id:
            children_map[cat.parent_id].append(cat)
 
    # Sélection des racines à retourner
    if root_slug:
        root = next((c for c in all_cats if c.slug == root_slug), None)
        if root is None:
            return Response(
                {"detail": f"Racine '{root_slug}' introuvable."},
                status=404,
            )
        roots = [root]
    else:
        # Vraies racines : parent_id NULL
        roots = [c for c in all_cats if c.parent_id is None]
 
    serializer = CategoryTreeSerializer(
        roots,
        many=True,
        context={"children_map": children_map, "request": request},
    )
    return Response(serializer.data)
 
 
@extend_schema(
    tags=["Catalog"],
    summary="Liste plate des catégories (pour selects)",
    description=(
        "Retourne les catégories avec leur full_path (ex : "
        "'Electronics > Téléphonie > Smartphones iOS'). Pratique pour les "
        "selects dans le formulaire vendeur. Filtre par défaut : "
        "actives et non-deprecated uniquement."
    ),
    parameters=[
        OpenApiParameter(name="leaves_only", type=OpenApiTypes.BOOL, required=False,
                         description="Ne retourner que les feuilles (catégories sans enfants)."),
        OpenApiParameter(name="parent_slug", type=OpenApiTypes.STR, required=False,
                         description="Filtrer sur les descendants de cette catégorie."),
    ],
    responses={200: CategoryFlatSerializer(many=True)},
)
@api_view(["GET"])
@permission_classes([AllowAny])
def categories_flat(request):
    """Endpoint pour formulaires : liste plate avec full_path."""
    leaves_only = request.query_params.get(
        "leaves_only", "false"
    ).lower() in ("1", "true", "yes")
    parent_slug = request.query_params.get("parent_slug")
 
    qs = Category.objects.filter(is_active=True, is_deprecated=False)
 
    if parent_slug:
        parent = Category.objects.filter(slug=parent_slug).first()
        if not parent:
            return Response(
                {"detail": f"Catégorie '{parent_slug}' introuvable."},
                status=404,
            )
        descendant_ids = parent.get_descendants_ids()
        qs = qs.filter(id__in=descendant_ids)
 
    if leaves_only:
        # Feuilles = pas d'enfants actifs non-deprecated
        parent_ids_with_children = set(
            Category.objects
            .filter(is_active=True, is_deprecated=False, parent__isnull=False)
            .values_list("parent_id", flat=True)
        )
        qs = qs.exclude(id__in=parent_ids_with_children)
 
    qs = qs.order_by("level", "display_order", "name")
    serializer = CategoryFlatSerializer(qs, many=True, context={"request": request})
    return Response(serializer.data)


@extend_schema(
    tags=["Catalog"],
    summary="Autocomplete marques",
    description=(
        "Endpoint d'autocomplete pour le formulaire vendeur. "
        "Retourne les marques dont le nom contient la chaîne `q`, triées par "
        "pertinence (verified d'abord, puis exactitude du match). "
        "Utilisation typique : dans le formulaire de création de MasterProduct, "
        "au fur et à mesure que le vendeur tape la marque, on interroge cet "
        "endpoint avec ?q=samsu et on affiche les résultats."
    ),
    parameters=[
        OpenApiParameter(name="q", type=OpenApiTypes.STR, required=False,
                         description="Chaîne à rechercher (min 1 caractère)."),
        OpenApiParameter(name="verified_only", type=OpenApiTypes.BOOL, required=False,
                         description="Ne retourner que les marques vérifiées (défaut : False)."),
        OpenApiParameter(name="limit", type=OpenApiTypes.INT, required=False,
                         description="Nombre max de résultats (défaut 10, max 50)."),
    ],
    responses={200: BrandAutocompleteSerializer(many=True)},
)
@api_view(["GET"])
@permission_classes([AllowAny])
def brands_autocomplete(request):
    """Recherche fuzzy sur les marques actives."""
    q = request.query_params.get("q", "").strip()
    verified_only = request.query_params.get(
        "verified_only", "false"
    ).lower() in ("1", "true", "yes")
 
    try:
        limit = int(request.query_params.get("limit", "10"))
    except ValueError:
        limit = 10
    limit = max(1, min(limit, 50))
 
    qs = Brand.objects.filter(is_active=True)
 
    if verified_only:
        qs = qs.filter(is_verified=True)
 
    if q:
        # Recherche : contient q, insensible à la casse
        # (icontains fonctionne bien pour des catalogues < 10k marques ;
        #  au-delà, envisager un index trigram Postgres ou Meilisearch)
        qs = qs.filter(Q(name__icontains=q) | Q(slug__icontains=q))
 
    # Tri : verified d'abord (le -), puis match exact au début, puis alpha
    qs = qs.order_by("-is_verified", "name")[:limit]
 
    serializer = BrandAutocompleteSerializer(qs, many=True, context={"request": request})
    return Response(serializer.data)
 
 
@extend_schema(
    tags=["Catalog"],
    summary="Liste et détail des marques",
    description="Liste complète des marques actives, triées par is_verified puis nom.",
    parameters=[
        OpenApiParameter(name="verified_only", type=OpenApiTypes.BOOL, required=False),
    ],
    responses={200: BrandSerializer(many=True)},
)
@api_view(["GET"])
@permission_classes([AllowAny])
def brands_list(request):
    """Liste publique des marques (pour la page marques du site)."""
    verified_only = request.query_params.get(
        "verified_only", "true"
    ).lower() in ("1", "true", "yes")
 
    qs = Brand.objects.filter(is_active=True)
    if verified_only:
        qs = qs.filter(is_verified=True)
    qs = qs.order_by("-is_verified", "name")
 
    serializer = BrandSerializer(qs, many=True, context={"request": request})
    return Response(serializer.data)
 
 
@extend_schema(
    tags=["Catalog"],
    summary="Détail d'une marque",
    responses={200: BrandSerializer, 404: None},
)
@api_view(["GET"])
@permission_classes([AllowAny])
def brand_detail(request, slug):
    """Fiche d'une marque (page /marques/<slug>/)."""
    try:
        brand = Brand.objects.get(slug=slug, is_active=True)
    except Brand.DoesNotExist:
        return Response(
            {"detail": "Marque introuvable."},
            status=status.HTTP_404_NOT_FOUND,
        )
    return Response(BrandSerializer(brand, context={"request": request}).data)
 
 
@extend_schema(
    tags=["Vendors"],
    summary="Proposer une nouvelle marque (vendeur)",
    description=(
        "Le vendeur ne trouve pas sa marque dans l'autocomplete → il propose "
        "une nouvelle marque via cet endpoint. La marque est créée avec "
        "is_verified=False et attend la validation admin. "
        "Anti-doublon : rejet si une marque avec le même nom (insensible casse) "
        "existe déjà."
    ),
    request={
        "application/json": {
            "type": "object",
            "properties": {
                "name": {"type": "string", "example": "OnePlus"},
                "country_of_origin": {"type": "string", "example": "Chine"},
                "website": {"type": "string", "example": "https://oneplus.com"},
            },
            "required": ["name"],
        }
    },
    responses={201: BrandSerializer, 400: None, 409: None},
)
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def brand_propose(request):
    """Un vendeur propose une nouvelle marque à ajouter au registre."""
    name = (request.data.get("name") or "").strip()
    country = (request.data.get("country_of_origin") or "").strip()
    website = (request.data.get("website") or "").strip()
 
    if not name:
        return Response(
            {"detail": "Le champ 'name' est requis."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if len(name) < 2 or len(name) > 120:
        return Response(
            {"detail": "Le nom doit contenir entre 2 et 120 caractères."},
            status=status.HTTP_400_BAD_REQUEST,
        )
 
    # Anti-doublon strict (case-insensitive)
    if Brand.objects.filter(name__iexact=name).exists():
        existing = Brand.objects.filter(name__iexact=name).first()
        return Response(
            {
                "detail": f"La marque '{existing.name}' existe déjà.",
                "existing_brand": BrandAutocompleteSerializer(
                    existing, context={"request": request}
                ).data,
            },
            status=status.HTTP_409_CONFLICT,
        )
 
    # Génération de slug
    slug_base = slugify(name) or "marque"
    slug = slug_base
    counter = 1
    while Brand.objects.filter(slug=slug).exists():
        slug = f"{slug_base}-{counter}"
        counter += 1
 
    brand = Brand.objects.create(
        name=name,
        slug=slug,
        country_of_origin=country,
        website=website,
        is_verified=False,  # Attend validation admin
        is_active=True,
        admin_note=(
            f"Proposée par le vendeur {request.user.username} "
            f"(id={request.user.id})."
        ),
    )
 
    return Response(
        BrandSerializer(brand, context={"request": request}).data,
        status=status.HTTP_201_CREATED,
    )    


@extend_schema(
    tags=["Catalog"],
    summary="Liste du dictionnaire couleurs/finitions",
    description=(
        "Retourne les entrées du dictionnaire, filtrées par famille et statut. "
        "Utilisé pour peupler les selects du formulaire vendeur (choix de "
        "couleur pour un Variant) et les filtres acheteur."
    ),
    parameters=[
        OpenApiParameter(
            name="family",
            type=OpenApiTypes.STR,
            required=False,
            description="COLOR pour couleurs uniquement, FINISH pour finitions. Vide = toutes.",
            enum=["COLOR", "FINISH"],
        ),
        OpenApiParameter(
            name="neutral_only",
            type=OpenApiTypes.BOOL,
            required=False,
            description="Ne retourner que les couleurs neutres (défaut : False).",
        ),
        OpenApiParameter(
            name="include_inactive",
            type=OpenApiTypes.BOOL,
            required=False,
            description="Inclure les entrées désactivées (défaut : False).",
        ),
    ],
    responses={200: ColorDictionarySerializer(many=True)},
)
@api_view(["GET"])
@permission_classes([AllowAny])
def color_dictionary_list(request):
    """Liste plate — pour selects vendeur et filtres acheteur."""
    family = request.query_params.get("family", "").upper().strip()
    neutral_only = request.query_params.get(
        "neutral_only", "false"
    ).lower() in ("1", "true", "yes")
    include_inactive = request.query_params.get(
        "include_inactive", "false"
    ).lower() in ("1", "true", "yes")
 
    qs = ColorDictionary.objects.all()
 
    if not include_inactive:
        qs = qs.filter(is_active=True)
 
    if family:
        if family not in [c[0] for c in ColorFamily.choices]:
            return Response(
                {"detail": f"Family invalide. Valeurs acceptées : COLOR, FINISH."},
                status=400,
            )
        qs = qs.filter(family=family)
 
    if neutral_only:
        qs = qs.filter(is_neutral=True)
 
    qs = qs.order_by("family", "display_order", "name")
    serializer = ColorDictionarySerializer(qs, many=True, context={"request": request})
    return Response(serializer.data)
 
 
@extend_schema(
    tags=["Catalog"],
    summary="Dictionnaire groupé par famille",
    description=(
        "Version groupée du dictionnaire, pratique pour le frontend qui veut "
        "afficher deux sections distinctes 'Couleurs' et 'Finitions' sans "
        "avoir à faire un group-by côté client."
    ),
    responses={
        200: {
            "type": "object",
            "properties": {
                "COLOR": {"type": "array"},
                "FINISH": {"type": "array"},
            },
        },
    },
)
@api_view(["GET"])
@permission_classes([AllowAny])
def color_dictionary_grouped(request):
    """Retourne un dict {COLOR: [...], FINISH: [...]}. Une seule requête."""
    qs = (
        ColorDictionary.objects
        .filter(is_active=True)
        .order_by("family", "display_order", "name")
    )
    grouped = {"COLOR": [], "FINISH": []}
    ser = ColorDictionarySerializer(qs, many=True, context={"request": request})
    for entry in ser.data:
        family = entry["family"]
        if family in grouped:
            grouped[family].append(entry)
    return Response(grouped)


@extend_schema(
    tags=["Catalog"],
    summary="Liste des attributs (par catégorie et par rôle)",
    description=(
        "Retourne les attributs disponibles pour une catégorie donnée, "
        "avec possibilité de filtrer par rôle (AXE, SPEC, OFFRE).\n\n"
        "Comportement :\n"
        "- Sans category : retourne uniquement les attributs universels\n"
        "- Avec category : retourne les universels + ceux de la catégorie "
        "  + ceux de tous les ancêtres de la catégorie\n"
        "- Avec role : filtre supplémentaire (utile pour lister les AXES "
        "  disponibles pour un master)"
    ),
    parameters=[
        OpenApiParameter(name="category", type=OpenApiTypes.STR, required=False,
                         description="Slug de la catégorie."),
        OpenApiParameter(name="role", type=OpenApiTypes.STR, required=False,
                         description="AXE, SPEC ou OFFRE.",
                         enum=["AXE", "SPEC", "OFFRE"]),
        OpenApiParameter(name="values_type", type=OpenApiTypes.STR, required=False,
                         description="Filtrer par type de valeur (SELECT, NUMBER, ...)."),
        OpenApiParameter(name="universal_only", type=OpenApiTypes.BOOL, required=False,
                         description="Ne retourner que les universels."),
    ],
    responses={200: ProductAttributeSerializer(many=True)},
)
@api_view(["GET"])
@permission_classes([AllowAny])
def attributes_list(request):
    """Endpoint canonique pour les attributs — utilisé par le formulaire vendeur."""
    category_slug = request.query_params.get("category", "").strip()
    role = request.query_params.get("role", "").strip().upper()
    values_type = request.query_params.get("values_type", "").strip().upper()
    universal_only = request.query_params.get(
        "universal_only", "false"
    ).lower() in ("1", "true", "yes")
 
    # Validation role
    if role and role not in [r[0] for r in AttributeRole.choices]:
        return Response(
            {"detail": "role invalide. Valeurs : AXE, SPEC, OFFRE."},
            status=status.HTTP_400_BAD_REQUEST,
        )
 
    # Base queryset
    qs = ProductAttribute.objects.all()
 
    if universal_only:
        qs = qs.filter(is_universal=True)
    elif category_slug:
        # Résolution : catégorie + ancêtres + universels
        try:
            category = Category.objects.get(slug=category_slug)
        except Category.DoesNotExist:
            return Response(
                {"detail": f"Catégorie '{category_slug}' introuvable."},
                status=status.HTTP_404_NOT_FOUND,
            )
 
        ancestor_ids = [a.id for a in category.get_ancestors()]
        category_ids = [category.id] + ancestor_ids
 
        # Universels OU catégorie-spécifiques dans la lignée
        from django.db.models import Q
        qs = qs.filter(Q(is_universal=True) | Q(category_id__in=category_ids))
    else:
        # Ni category ni universal_only → uniquement universels par défaut
        qs = qs.filter(is_universal=True)
 
    if role:
        qs = qs.filter(role=role)
    if values_type:
        qs = qs.filter(values_type=values_type)
 
    # Ordre : universels d'abord, puis par ordre déclaré, puis par nom
    qs = qs.order_by("-is_universal", "display_order", "name")
 
    serializer = ProductAttributeSerializer(qs, many=True, context={"request": request})
    return Response(serializer.data)
 
 
@extend_schema(
    tags=["Catalog"],
    summary="Axes de variante d'une MasterProduct (résolus)",
    description=(
        "Retourne les axes déclarés dans variant_axes d'une MasterProduct, "
        "AVEC les informations complètes de chaque attribut (name, "
        "values_type, values, unit). Sert au formulaire vendeur pour rendre "
        "les inputs correspondants lors de la création d'un Variant."
    ),
    responses={200: MasterProductAxesSerializer, 404: None},
)
@api_view(["GET"])
@permission_classes([AllowAny])
def master_product_axes(request, slug):
    """Récupère les axes résolus d'une fiche."""
    try:
        master = MasterProduct.objects.get(slug=slug)
    except MasterProduct.DoesNotExist:
        return Response(
            {"detail": "Fiche introuvable."},
            status=status.HTTP_404_NOT_FOUND,
        )
    return Response(MasterProductAxesSerializer(master, context={"request": request}).data)


@extend_schema(
    tags=["Catalog"],
    summary="Variants d'une fiche produit",
    description=(
        "Retourne la liste des Variants actifs et approuvés d'une "
        "MasterProduct. Utilisé par la page fiche buyer pour proposer "
        "le sélecteur de Variant (couleur/stockage/etc.) au-dessus de la "
        "Buy Box."
    ),
    parameters=[
        OpenApiParameter(name="include_pending", type=OpenApiTypes.BOOL, required=False,
                         description="Inclure les Variants en attente de modération (admin only)."),
    ],
    responses={200: ProductVariantLightSerializer(many=True), 404: None},
)
@api_view(["GET"])
@permission_classes([AllowAny])
def master_product_variants(request, slug):
    """Liste des Variants d'une fiche."""
    try:
        master = MasterProduct.objects.get(slug=slug)
    except MasterProduct.DoesNotExist:
        return Response(
            {"detail": "Fiche introuvable."},
            status=status.HTTP_404_NOT_FOUND,
        )
 
    qs = master.variants.filter(is_active=True)
 
    # Par défaut : seulement les Variants approuvés (buyer-facing)
    include_pending = request.query_params.get(
        "include_pending", "false"
    ).lower() in ("1", "true", "yes")
    if not include_pending or not request.user.is_staff:
        qs = qs.filter(moderation_status="APPROVED")
 
    qs = qs.order_by("axis_key")
 
    serializer = ProductVariantLightSerializer(
        qs, many=True, context={"request": request},
    )
    return Response(serializer.data)
 
 
# ═══════════════════════════════════════════════════════════════════════════
#  PUBLIC — Détail d'un Variant
# ═══════════════════════════════════════════════════════════════════════════
 
@extend_schema(
    tags=["Catalog"],
    summary="Détail d'un Variant",
    responses={200: ProductVariantSerializer, 404: None},
)
@api_view(["GET"])
@permission_classes([AllowAny])
def variant_detail(request, sku):
    """Détail d'un Variant par son SKU canonique."""
    try:
        variant = ProductVariant.objects.select_related("master").get(
            sku=sku, is_active=True, moderation_status="APPROVED",
        )
    except ProductVariant.DoesNotExist:
        return Response(
            {"detail": "Variant introuvable."},
            status=status.HTTP_404_NOT_FOUND,
        )
    return Response(ProductVariantSerializer(
        variant, context={"request": request},
    ).data)
 
 
# ═══════════════════════════════════════════════════════════════════════════
#  VENDOR — Trouver ou proposer un Variant (endpoint idempotent)
# ═══════════════════════════════════════════════════════════════════════════
#
# Ce endpoint est crucial pour le futur formulaire vendeur :
# quand le vendeur soumet ses axis_values (ex : couleur=titane, stockage=256),
# on doit soit :
#   - Retourner le Variant existant (s'il y en a un) — le vendeur créera
#     son Offer dessus
#   - Créer un nouveau Variant (si aucun ne match) — soumis à modération
#
# C'est ce qui garantit qu'on n'a JAMAIS de doublons de Variants pour un
# même master + axis_values.
# ═══════════════════════════════════════════════════════════════════════════
 
@extend_schema(
    tags=["Vendors"],
    summary="Trouver ou créer un Variant (idempotent)",
    description=(
        "Endpoint idempotent : le vendeur envoie master + axis_values, on lui "
        "retourne le Variant existant qui match, OU on en crée un nouveau (soumis "
        "à modération admin).\n\n"
        "Cas d'usage : formulaire vendeur — après avoir choisi la fiche et "
        "renseigné les axes (couleur=titane, stockage=256), on appelle cet "
        "endpoint pour obtenir un variant_id, puis on crée le Product/Offer avec."
    ),
    request={
        "application/json": {
            "type": "object",
            "properties": {
                "master": {"type": "integer", "description": "ID de la MasterProduct"},
                "axis_values": {"type": "object", "additionalProperties": True},
                "barcode": {"type": "string", "description": "Optionnel"},
            },
            "required": ["master", "axis_values"],
        },
    },
    responses={200: ProductVariantSerializer, 201: ProductVariantSerializer, 400: None},
)
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def variant_find_or_create(request):
    """Trouve un Variant existant ou en crée un nouveau. Idempotent."""
    master_id = request.data.get("master")
    axis_values = request.data.get("axis_values", {})
 
    if not master_id:
        return Response(
            {"detail": "Champ 'master' requis."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if not isinstance(axis_values, dict):
        return Response(
            {"detail": "axis_values doit être un dict."},
            status=status.HTTP_400_BAD_REQUEST,
        )
 
    # Récupérer le master
    try:
        master = MasterProduct.objects.get(pk=master_id)
    except MasterProduct.DoesNotExist:
        return Response(
            {"detail": "Fiche produit introuvable."},
            status=status.HTTP_404_NOT_FOUND,
        )
 
    # Chercher un Variant existant
    axis_key = ProductVariant.compute_axis_key(axis_values)
    existing = ProductVariant.objects.filter(
        master=master, axis_key=axis_key, deleted_at__isnull=True,
    ).first()
 
    if existing is not None:
        # 200 OK — on retourne le Variant existant
        return Response(
            ProductVariantSerializer(existing, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )
 
    # Créer un nouveau Variant (soumis à modération)
    serializer = ProductVariantCreateSerializer(
        data={
            "master": master_id,
            "axis_values": axis_values,
            "barcode": request.data.get("barcode", ""),
        },
        context={"request": request},
    )
    serializer.is_valid(raise_exception=True)
    variant = serializer.save()
 
    return Response(
        ProductVariantSerializer(variant, context={"request": request}).data,
        status=status.HTTP_201_CREATED,
    )
 
 
# ═══════════════════════════════════════════════════════════════════════════
#  VENDOR — Liste des Variants d'un master (incluant PENDING pour prévisu)
# ═══════════════════════════════════════════════════════════════════════════
 
@extend_schema(
    tags=["Vendors"],
    summary="Variants d'une fiche (vue vendeur)",
    description=(
        "Retourne TOUS les Variants d'une fiche (y compris PENDING) pour "
        "que le vendeur voit ses propres soumissions en cours de validation."
    ),
    responses={200: ProductVariantLightSerializer(many=True)},
)
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def vendor_master_variants(request, master_id):
    """Liste vendeur — inclut les Variants PENDING."""
    try:
        master = MasterProduct.objects.get(pk=master_id)
    except MasterProduct.DoesNotExist:
        return Response(
            {"detail": "Fiche introuvable."},
            status=status.HTTP_404_NOT_FOUND,
        )
 
    qs = master.variants.filter(is_active=True).order_by("axis_key")
 
    serializer = ProductVariantLightSerializer(
        qs, many=True, context={"request": request},
    )
    return Response(serializer.data)    



@extend_schema(
    tags=["Admin Catalog"],
    summary="Liste des Variants (admin) — v2",
    description=(
        "Liste TOUS les Variants avec filtres avancés. "
        "Support catégorie, sous-catégorie, master, statut, recherche."
    ),
    parameters=[
        OpenApiParameter("moderation_status", str, description="PENDING / APPROVED / REJECTED"),
        OpenApiParameter("search", str, description="SKU, titre master, ou valeur d'axe"),
        OpenApiParameter("master", int, description="Filtrer par master ID"),
        OpenApiParameter("category", int, description="Filtrer par catégorie ID"),
        OpenApiParameter("parent_category", int, description="Filtrer par catégorie parente ID"),
        OpenApiParameter("is_active", bool, description="true / false"),
        OpenApiParameter("ordering", str, description="created_at / -created_at / sku / -sku"),
    ],
    responses={200: AdminVariantListSerializer(many=True)},
)
@api_view(["GET"])
@permission_classes([IsAdminUser])
def admin_variants_list(request):
    """Liste admin des Variants avec filtres avancés."""
    qs = ProductVariant.objects.select_related(
        "master", "master__category", "master__category__parent",
        "moderated_by",
    ).prefetch_related("offers", "master__images")
 
    # ─── Filtres ────────────────────────────────────────────────
    mod_status = request.query_params.get("moderation_status")
    if mod_status:
        qs = qs.filter(moderation_status=mod_status)
 
    master_id = request.query_params.get("master")
    if master_id:
        qs = qs.filter(master_id=master_id)
 
    category_id = request.query_params.get("category")
    if category_id:
        qs = qs.filter(master__category_id=category_id)
 
    parent_cat_id = request.query_params.get("parent_category")
    if parent_cat_id:
        # Le variant hérite du master. Filtrer sur les masters dont la
        # catégorie a ce parent OU qui EST elle-même le parent.
        qs = qs.filter(
            Q(master__category_id=parent_cat_id)
            | Q(master__category__parent_id=parent_cat_id)
        )
 
    is_active_param = request.query_params.get("is_active")
    if is_active_param is not None:
        qs = qs.filter(is_active=is_active_param.lower() == "true")
 
    search = request.query_params.get("search", "").strip()
    if search:
        qs = qs.filter(
            Q(sku__icontains=search)
            | Q(master__title__icontains=search)
            | Q(axis_key__icontains=search)
        )
 
    # ─── Ordering ───────────────────────────────────────────────
    ordering = request.query_params.get("ordering", "-created_at")
    allowed = {"created_at", "-created_at", "sku", "-sku",
               "updated_at", "-updated_at"}
    if ordering not in allowed:
        ordering = "-created_at"
    qs = qs.order_by(ordering)
 
    # ─── Pré-charger les ProductAttribute pour axes_resolved ────
    # Évite les N+1 queries : on collecte tous les slugs uniques
    # utilisés dans variant_axes des masters, puis on charge en 1 requête.
    all_axes_slugs = set()
    for v in qs:
        if v.master.variant_axes:
            all_axes_slugs.update(v.master.variant_axes)
    attrs_by_slug = {}
    if all_axes_slugs:
        attrs_by_slug = {
            a.slug: a for a in ProductAttribute.objects.filter(
                slug__in=all_axes_slugs,
            )
        }
 
    serializer = AdminVariantListSerializer(
        qs, many=True,
        context={"request": request, "attrs_by_slug": attrs_by_slug},
    )
    return Response(serializer.data)
 
 
@extend_schema(
    tags=["Admin Catalog"],
    summary="Détail d'un Variant (admin)",
    responses={200: AdminVariantDetailSerializer, 404: None},
)
@api_view(["GET"])
@permission_classes([IsAdminUser])
def admin_variant_detail(request, variant_id):
    """Détail complet d'un Variant avec offres et axes résolus."""
    try:
        variant = (
            ProductVariant.objects
            .select_related("master", "master__category", "moderated_by")
            .prefetch_related("offers", "offers__condition", "offers__vendor")
            .get(pk=variant_id)
        )
    except ProductVariant.DoesNotExist:
        return Response({"detail": "Variant introuvable."}, status=status.HTTP_404_NOT_FOUND)
 
    serializer = AdminVariantDetailSerializer(variant, context={"request": request})
    return Response(serializer.data)
 
 
def _apply_moderation(variant, request, new_status):
    """Helper commun approve/reject : met à jour statut + timestamp + admin."""
    reason = ""
    if request.data:
        s = AdminVariantModerationSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        reason = s.validated_data.get("moderation_reason", "")
 
    variant.moderation_status = new_status
    variant.moderated_at = timezone.now()
    variant.moderated_by = request.user
    if reason:
        variant.moderation_reason = reason
    variant.save(update_fields=[
        "moderation_status", "moderated_at", "moderated_by", "moderation_reason",
    ])
 
 
@extend_schema(
    tags=["Admin Catalog"],
    summary="Approuver un Variant",
    request=AdminVariantModerationSerializer,
    responses={200: AdminVariantDetailSerializer},
)
@api_view(["POST"])
@permission_classes([IsAdminUser])
def admin_variant_approve(request, variant_id):
    """Approuve un Variant."""
    try:
        variant = ProductVariant.objects.get(pk=variant_id)
    except ProductVariant.DoesNotExist:
        return Response({"detail": "Variant introuvable."}, status=status.HTTP_404_NOT_FOUND)
 
    _apply_moderation(variant, request, "APPROVED")
    serializer = AdminVariantDetailSerializer(variant, context={"request": request})
    return Response(serializer.data)
 
 
@extend_schema(
    tags=["Admin Catalog"],
    summary="Rejeter un Variant",
    request=AdminVariantModerationSerializer,
    responses={200: AdminVariantDetailSerializer},
)
@api_view(["POST"])
@permission_classes([IsAdminUser])
def admin_variant_reject(request, variant_id):
    """Rejette un Variant. Note : les offres rattachees ne sont PAS touchees automatiquement — l'admin les traite separement."""
    try:
        variant = ProductVariant.objects.get(pk=variant_id)
    except ProductVariant.DoesNotExist:
        return Response({"detail": "Variant introuvable."}, status=status.HTTP_404_NOT_FOUND)
 
    _apply_moderation(variant, request, "REJECTED")
    serializer = AdminVariantDetailSerializer(variant, context={"request": request})
    return Response(serializer.data)
 
 
@extend_schema(
    tags=["Admin Catalog"],
    summary="Approuver plusieurs Variants",
    description="Body attendu : { \"variant_ids\": [1, 2, 3], \"moderation_reason\": \"optionnel\" }",
)
@api_view(["POST"])
@permission_classes([IsAdminUser])
def admin_variants_bulk_approve(request):
    """Approuve en masse une liste de Variants."""
    ids = request.data.get("variant_ids", [])
    if not isinstance(ids, list) or not ids:
        return Response(
            {"detail": "variant_ids doit etre une liste non vide."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    reason = request.data.get("moderation_reason", "")
 
    n = ProductVariant.objects.filter(pk__in=ids).update(
        moderation_status="APPROVED",
        moderated_at=timezone.now(),
        moderated_by=request.user,
        moderation_reason=reason if reason else "",
    )
    return Response({"approved_count": n})
 
 
@extend_schema(
    tags=["Admin Catalog"],
    summary="Rejeter plusieurs Variants",
)
@api_view(["POST"])
@permission_classes([IsAdminUser])
def admin_variants_bulk_reject(request):
    """Rejette en masse une liste de Variants."""
    ids = request.data.get("variant_ids", [])
    if not isinstance(ids, list) or not ids:
        return Response(
            {"detail": "variant_ids doit etre une liste non vide."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    reason = request.data.get("moderation_reason", "")
 
    n = ProductVariant.objects.filter(pk__in=ids).update(
        moderation_status="REJECTED",
        moderated_at=timezone.now(),
        moderated_by=request.user,
        moderation_reason=reason if reason else "",
    )
    return Response({"rejected_count": n})