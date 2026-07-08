# backend/apps/catalog/serializers.py
# Serializers pour le catalogue de produits

from rest_framework import serializers
from django.db.models import Avg
from .models import Product, Category, ProductMedia, ProductImage, ProductReview, MasterProduct, ProductCondition, PromotionCampaign, Brand, ColorDictionary, ProductAttribute, MasterProduct, AttributeRole


class CategorySerializer(serializers.ModelSerializer):
    """
    Serializer de base — utilisé partout où on affiche UNE catégorie
    (fiche produit, listing, filtres, etc.).
 
    Version étendue : expose les nouveaux champs pour permettre au frontend
    de rendre l'icône, la description, et de détecter les catégories
    à modération renforcée.
    """
    full_path = serializers.CharField(read_only=True)
    effective_requires_approval = serializers.BooleanField(read_only=True)
 
    class Meta:
        model = Category
        fields = [
            "id",
            "name",
            "slug",
            "parent",
            "level",
            "icon_name",
            "description",
            "display_order",
            "is_active",
            "is_deprecated",
            "requires_admin_approval",
            "effective_requires_approval",
            "full_path",
        ]
        read_only_fields = [
            "level", "full_path", "effective_requires_approval",
        ]


class CategoryTreeSerializer(serializers.ModelSerializer):
    """
    Serializer arborescent — sérialise une catégorie AVEC ses enfants
    récursivement. Utilisé par l'endpoint /api/catalog/categories/tree/.
 
    Optimisation : les enfants sont récupérés depuis un dict pré-construit
    (voir CategoryTreeView) plutôt que via des requêtes N+1.
    """
    children = serializers.SerializerMethodField()
 
    class Meta:
        model = Category
        fields = [
            "id",
            "name",
            "slug",
            "level",
            "icon_name",
            "description",
            "display_order",
            "is_active",
            "is_deprecated",
            "requires_admin_approval",
            "children",
        ]
 
    def get_children(self, obj):
        """
        Récupère les enfants depuis le dict `children_map` du contexte,
        évite les requêtes récursives.
        """
        children_map = self.context.get("children_map", {})
        kids = children_map.get(obj.id, [])
        # Tri : display_order, puis name pour stabilité
        kids = sorted(kids, key=lambda c: (c.display_order, c.name))
        return CategoryTreeSerializer(
            kids, many=True, context=self.context,
        ).data
    

class CategoryFlatSerializer(serializers.ModelSerializer):
    """
    Version plate (pas d'enfants imbriqués) — utilisée pour les selects
    et les listes admin où on n'a pas besoin de l'arbre complet.
    Inclut le full_path pour l'affichage sans avoir à reconstruire côté client.
    """
    full_path = serializers.CharField(read_only=True)
 
    class Meta:
        model = Category
        fields = [
            "id",
            "name",
            "slug",
            "parent",
            "level",
            "icon_name",
            "is_active",
            "is_deprecated",
            "requires_admin_approval",
            "full_path",
        ]


class ProductMediaSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductMedia
        fields = ['id', 'url', 'media_type', 'sort_order']


class ProductImageSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()
    
    class Meta:
        model = ProductImage
        fields = ['id', 'image', 'image_url', 'is_primary', 'order', 'created_at']
        read_only_fields = ['id', 'created_at']
    
    def get_image_url(self, obj):
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None


class ProductReviewSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.username', read_only=True)
    user_first_name = serializers.CharField(source='user.first_name', read_only=True)
    
    class Meta:
        model = ProductReview
        fields = [
            'id', 'user', 'user_name', 'user_first_name',
            'rating', 'title', 'comment',
            'is_verified_purchase', 'created_at'
        ]
        read_only_fields = ['id', 'user', 'is_verified_purchase', 'created_at']


class ProductReviewCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductReview
        fields = ['product', 'rating', 'title', 'comment', 'order']
    
    def validate(self, data):
        user = self.context['request'].user
        product = data['product']
        
        if ProductReview.objects.filter(product=product, user=user).exists():
            raise serializers.ValidationError("Vous avez déjà laissé un avis pour ce produit.")
        
        return data
    
    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        
        if validated_data.get('order'):
            validated_data['is_verified_purchase'] = True
        
        return ProductReview.objects.create(**validated_data)


class PromotionCampaignSerializer(serializers.ModelSerializer):
    product_title = serializers.CharField(source="product.title", read_only=True)
    discount_percent = serializers.ReadOnlyField()
    is_active_now = serializers.ReadOnlyField()
    remaining_stock = serializers.ReadOnlyField()

    class Meta:
        model = PromotionCampaign
        fields = [
            "id",
            "product",
            "product_title",
            "campaign_type",
            "status",
            "title",
            "starts_at",
            "ends_at",
            "reference_price_xaf",
            "promo_price_xaf",
            "discount_percent",
            "stock_reserved",
            "stock_claimed",
            "remaining_stock",
            "placement_fee_xaf",
            "commission_uplift_points",
            "rejection_reason",
            "admin_note",
            "is_active_now",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "status",
            "stock_claimed",
            "placement_fee_xaf",
            "commission_uplift_points",
            "rejection_reason",
            "admin_note",
            "created_at",
            "updated_at",
        ]

    def validate_product(self, product):
        request = self.context.get("request")
        if request and request.user and not request.user.is_staff:
            if product.vendor_id != request.user.id:
                raise serializers.ValidationError("Ce produit ne vous appartient pas.")
        return product

    def validate(self, data):
        product = data.get("product") or getattr(self.instance, "product", None)
        campaign_type = data.get("campaign_type") or getattr(self.instance, "campaign_type", None)
        reference_price = data.get("reference_price_xaf") or getattr(self.instance, "reference_price_xaf", None)
        promo_price = data.get("promo_price_xaf") or getattr(self.instance, "promo_price_xaf", None)

        if product and reference_price and reference_price < product.price_xaf:
            raise serializers.ValidationError({
                "reference_price_xaf": "Le prix de référence ne peut pas être inférieur au prix actuel du produit."
            })
        if reference_price and promo_price and promo_price >= reference_price:
            raise serializers.ValidationError({
                "promo_price_xaf": "Le prix promo doit être inférieur au prix de référence."
            })
        if campaign_type == PromotionCampaign.CampaignType.FLASH:
            stock_reserved = data.get("stock_reserved") or getattr(self.instance, "stock_reserved", 0)
            if stock_reserved < 5:
                raise serializers.ValidationError({"stock_reserved": "Un Flash Deal demande au moins 5 unités réservées."})
        return data

    def create(self, validated_data):
        request = self.context.get("request")
        if request and request.user and request.user.is_authenticated:
            validated_data["requested_by"] = request.user
        if validated_data.get("campaign_type") == PromotionCampaign.CampaignType.FLASH:
            validated_data.setdefault("commission_uplift_points", 5)
        campaign = PromotionCampaign(**validated_data)
        campaign.full_clean()
        campaign.save()
        return campaign


class ProductSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    media = ProductMediaSerializer(many=True, read_only=True)
    stock_quantity = serializers.SerializerMethodField()
    images = ProductImageSerializer(many=True, read_only=True)
    rating_average = serializers.SerializerMethodField()
    reviews_count = serializers.SerializerMethodField()
    price_final = serializers.SerializerMethodField()
    master_slug = serializers.CharField(source='master.slug', read_only=True, default=None)
    active_campaign = serializers.SerializerMethodField()
    
    class Meta:
        model = Product
        fields = [
            'id', 
            'title', 
            'slug',
            'description',
            'short_description',
            'price_xaf',
            'compare_at_price',
            'promo_end_date',
            'discount',
            'discount_percent',
            'is_on_promotion',
            'price_final', 
            'active_campaign',
            'stock_quantity',
            'is_active',
            'category',
            'media',
            'images',
            'rating_average',
            'reviews_count',
            'created_at',
            'updated_at',
            'condition',
            'seller_note',
            'master',
            'master_slug',
            
        ]
        read_only_fields = ['id', 'slug', 'created_at', 'updated_at']
    
    def get_stock_quantity(self, obj):
        try:
            return obj.inventory.quantity
        except:
            return 0
    
    def get_rating_average(self, obj):
        avg = ProductReview.objects.filter(
            product=obj, 
            is_approved=True
        ).aggregate(Avg('rating'))['rating__avg']
        return round(avg, 1) if avg else None
    
    def get_reviews_count(self, obj):
        return ProductReview.objects.filter(product=obj, is_approved=True).count()
    
    def get_price_final(self, obj):
        """Calculer le prix après réduction"""
        campaign = self._get_active_campaign(obj)
        if campaign:
            return campaign.promo_price_xaf
        if obj.compare_at_price and obj.compare_at_price > obj.price_xaf:
            return obj.price_xaf
        if obj.discount > 0:
            return obj.price_xaf - (obj.price_xaf * obj.discount // 100)
        return obj.price_xaf

    def _get_active_campaign(self, obj):
        campaigns = getattr(obj, "promotion_campaigns", None)
        if not campaigns:
            return None
        active = [campaign for campaign in campaigns.all() if campaign.is_active_now]
        if not active:
            return None
        active.sort(key=lambda campaign: campaign.campaign_type == PromotionCampaign.CampaignType.FLASH, reverse=True)
        return active[0]

    def get_active_campaign(self, obj):
        campaign = self._get_active_campaign(obj)
        if not campaign:
            return None
        return {
            "id": campaign.id,
            "campaign_type": campaign.campaign_type,
            "title": campaign.title,
            "ends_at": campaign.ends_at,
            "promo_price_xaf": campaign.promo_price_xaf,
            "discount_percent": campaign.discount_percent,
            "remaining_stock": campaign.remaining_stock,
        }


class ProductCreateUpdateSerializer(serializers.ModelSerializer):
    """
    Création/édition d'un produit (= une OFFRE) par un vendeur.

    Rattachement à une fiche maître :
      - master fourni  -> l'offre est rattachée à cette fiche existante (validée)
      - master absent  -> une NOUVELLE fiche est créée (en attente de validation)
    L'offre naît en PENDING (validation admin requise avant visibilité acheteur).
    """
    master = serializers.PrimaryKeyRelatedField(
        queryset=MasterProduct.objects.filter(moderation_status='APPROVED'),
        required=False, allow_null=True,
        help_text="Fiche existante à laquelle rattacher l'offre. Vide = nouvelle fiche.",
    )
    condition = serializers.PrimaryKeyRelatedField(
        queryset=ProductCondition.objects.filter(is_active=True),
        required=False, allow_null=True,
        help_text="État de l'offre (liste gérée par l'admin).",
    )

    class Meta:
        model = Product
        fields = [
            'id', 'title', 'description', 'short_description',
            'price_xaf', 'category', 'is_active', 'master',
            'condition', 'seller_note', 'stock_threshold',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def create(self, validated_data):
        from .models import Inventory, MasterProduct as _MP
        master = validated_data.pop('master', None)
        if master is None:
            # Pas de fiche choisie -> on en crée une (PENDING par défaut)
            master = _MP.objects.create(
                title=validated_data.get('title', ''),
                description=validated_data.get('description', '') or '',
                category=validated_data.get('category'),
            )
        product = Product.objects.create(master=master, **validated_data)
        stock_quantity = self.context.get('stock_quantity', 0)
        Inventory.objects.create(product=product, quantity=stock_quantity)
        return product

    def update(self, instance, validated_data):
        from .models import Inventory
        master = validated_data.pop('master', None)
        if master is not None:
            instance.master = master
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        stock_quantity = self.context.get('stock_quantity')
        if stock_quantity is not None:
            inventory, _ = Inventory.objects.get_or_create(product=instance)
            inventory.quantity = stock_quantity
            inventory.save()
        return instance

    def to_representation(self, instance):
        return ProductSerializer(instance, context=self.context).data



# ─────────────────────────────────────────────────────────────────────────────
# OFFRES & FICHES MAÎTRES
# ─────────────────────────────────────────────────────────────────────────────

class OfferSerializer(serializers.ModelSerializer):
    """Offre vue côté ACHETEUR : anonymisée, avec état + note, sans photo d'offre."""
    condition      = serializers.CharField(source='condition.name', read_only=True, default=None)
    stock_quantity = serializers.SerializerMethodField()
    price_final    = serializers.SerializerMethodField()
    real_image = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            'id', 'price_xaf', 'compare_at_price', 'price_final',
            'discount_percent', 'is_on_promotion',
            'condition', 'seller_note', 'stock_quantity', 'is_active',
            'real_image',
        ]

    def get_stock_quantity(self, obj):
        try:
            return obj.inventory.quantity
        except Exception:
            return 0

    def get_price_final(self, obj):
        if obj.compare_at_price and obj.compare_at_price > obj.price_xaf:
            return obj.price_xaf
        if obj.discount > 0:
            return obj.price_xaf - (obj.price_xaf * obj.discount // 100)
        return obj.price_xaf
    
    def get_real_image(self, obj):
        img = obj.images.filter(is_primary=True).first() or obj.images.first()
        if img and img.image:
            request = self.context.get('request')
            return request.build_absolute_uri(img.image.url) if request else img.image.url
        return None


class MasterProductListSerializer(serializers.ModelSerializer):
    category      = CategorySerializer(read_only=True)
    primary_image = serializers.SerializerMethodField()
    offers_count  = serializers.SerializerMethodField()
    buy_box       = serializers.SerializerMethodField()

    class Meta:
        model = MasterProduct
        fields = ['id', 'title', 'slug', 'brand', 'category',
                  'primary_image', 'offers_count', 'buy_box', 'created_at']

    def get_primary_image(self, obj):
        img = obj.images.filter(is_primary=True).first() or obj.images.first()
        if img and img.image:
            request = self.context.get('request')
            return request.build_absolute_uri(img.image.url) if request else img.image.url
        return None

    def get_offers_count(self, obj):
        return obj.offers.filter(is_active=True, moderation_status='APPROVED').count()

    def get_buy_box(self, obj):
        offer = obj.buy_box_offer
        return OfferSerializer(offer, context=self.context).data if offer else None


class MasterProductDetailSerializer(MasterProductListSerializer):
    images = serializers.SerializerMethodField()
    offers = serializers.SerializerMethodField()

    class Meta(MasterProductListSerializer.Meta):
        fields = MasterProductListSerializer.Meta.fields + ['description', 'images', 'offers']

    def get_images(self, obj):
        request = self.context.get('request')
        out = []
        for im in obj.images.all():
            url = request.build_absolute_uri(im.image.url) if request else im.image.url
            out.append({'id': im.id, 'image': url, 'is_primary': im.is_primary})
        return out

    def get_offers(self, obj):
        from apps.orders.models import PlatformSettings
        limit = PlatformSettings.get_settings().max_offers_displayed
        qs = (obj.offers.filter(is_active=True, moderation_status='APPROVED')
              .select_related('vendor', 'inventory', 'condition')
              .order_by('price_xaf')[:limit])
        return OfferSerializer(qs, many=True, context=self.context).data
    


class ProductConditionSerializer(serializers.ModelSerializer):
    class Meta:
        from .models import ProductCondition
        model  = ProductCondition
        fields = ['id', 'name', 'display_order', 'is_active']    


class BrandLightSerializer(serializers.ModelSerializer):
    """
    Version légère — utilisée quand une Brand est intégrée dans un autre
    serializer (ex : MasterProductDetailSerializer). Pas de description
    longue pour éviter d'alourdir les réponses.
    """
    logo_url = serializers.SerializerMethodField()
 
    class Meta:
        model = Brand
        fields = ["id", "name", "slug", "logo_url", "is_verified"]
 
    def get_logo_url(self, obj):
        if obj.logo:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.logo.url)
            return obj.logo.url
        return None
 
 
class BrandSerializer(serializers.ModelSerializer):
    """
    Version complète — pour les pages détail marque et les réponses admin.
    Inclut description, country, website, master_products_count.
    """
    logo_url = serializers.SerializerMethodField()
    master_products_count = serializers.SerializerMethodField()
 
    class Meta:
        model = Brand
        fields = [
            "id",
            "name",
            "slug",
            "logo_url",
            "description",
            "country_of_origin",
            "website",
            "is_active",
            "is_verified",
            "master_products_count",
            "created_at",
        ]
        read_only_fields = ["id", "created_at", "logo_url", "master_products_count"]
 
    def get_logo_url(self, obj):
        if obj.logo:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.logo.url)
            return obj.logo.url
        return None
 
    def get_master_products_count(self, obj):
        """Nombre de fiches maîtres utilisant cette marque."""
        return obj.master_products.count()
 
 
class BrandAutocompleteSerializer(serializers.ModelSerializer):
    """
    Ultra-léger — pour l'endpoint d'autocomplete du formulaire vendeur.
    Retourne uniquement ce qui est nécessaire pour rendre une ligne
    de résultat : nom, slug, logo miniature, badge verified.
    """
    logo_url = serializers.SerializerMethodField()
 
    class Meta:
        model = Brand
        fields = ["id", "name", "slug", "logo_url", "is_verified"]
 
    def get_logo_url(self, obj):
        if obj.logo:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.logo.url)
            return obj.logo.url
        return None     


class ColorDictionarySerializer(serializers.ModelSerializer):
    """
    Version publique — utilisée par les selects du formulaire vendeur et
    les filtres acheteur. Léger (pas de created_at/updated_at) pour être
    cachable côté frontend.
    """
 
    class Meta:
        model = ColorDictionary
        fields = [
            "id",
            "family",
            "name",
            "name_en",
            "slug",
            "hex_code",
            "pattern_url",
            "is_neutral",
            "display_order",
        ]
        read_only_fields = ["id", "slug"]       


class ProductAttributeSerializer(serializers.ModelSerializer):
    """
    Serializer pour un attribut. Expose maintenant le role (AXE/SPEC/OFFRE),
    is_universal et values_type — nécessaires au futur formulaire vendeur
    pour rendre le bon type d'input.
    """
 
    category_name = serializers.CharField(source="category.name", read_only=True)
 
    class Meta:
        model = ProductAttribute
        fields = [
            "id",
            "slug",
            "name",
            "attribute_type",           # sémantique legacy (SIZE/COLOR/MATERIAL/OTHER)
            "role",           # AXE / SPEC / OFFRE
            "values_type",    # SELECT / NUMBER / BOOL / TEXT / COLORDICT / BRAND
            "values",         # liste JSON pour values_type=SELECT
            "unit",           # unité pour values_type=NUMBER (Go, mAh, W...)
            "is_universal",
            "category",
            "category_name",
            "display_order",
        ]
        read_only_fields = ["id", "category_name"]
 
 
class AttributeAxisResolvedSerializer(serializers.Serializer):
    """
    Serializer utilitaire — résout une liste de slugs (variant_axes)
    en objets ProductAttribute complets. Utilisé par le futur formulaire
    vendeur : quand on affiche une MasterProduct, on veut voir les axes
    résolus (name, values_type, values), pas juste des slugs opaques.
    """
    slug = serializers.CharField()
    name = serializers.CharField()
    values_type = serializers.CharField()
    values = serializers.JSONField()
    unit = serializers.CharField(allow_blank=True)
    is_universal = serializers.BooleanField()
 
 
class MasterProductAxesSerializer(serializers.ModelSerializer):
    """
    Vue légère d'une MasterProduct avec ses variant_axes RÉSOLUS.
    Pour l'endpoint /api/catalog/master-products/<id>/axes/.
    """
    variant_axes_resolved = serializers.SerializerMethodField()
 
    class Meta:
        model = MasterProduct
        fields = [
            "id",
            "slug",
            "title",
            "variant_axes",           # liste brute de slugs
            "variant_axes_resolved",  # attributs complets
        ]
 
    def get_variant_axes_resolved(self, obj):
        """
        Pour chaque slug de variant_axes, récupère l'attribut ProductAttribute
        correspondant. Ordre préservé (celui de variant_axes).
        """
        if not obj.variant_axes:
            return []
 
        attrs_by_slug = {
            a.slug: a
            for a in ProductAttribute.objects.filter(
                slug__in=obj.variant_axes,
                role=AttributeRole.AXE,
            )
        }
 
        resolved = []
        for slug in obj.variant_axes:
            attr = attrs_by_slug.get(slug)
            if attr is None:
                continue   # Slug orphelin — normalement bloqué par clean()
            resolved.append({
                "slug": attr.slug,
                "name": attr.name,
                "values_type": attr.values_type,
                "values": attr.values or [],
                "unit": attr.unit or "",
                "is_universal": attr.is_universal,
            })
        return resolved        