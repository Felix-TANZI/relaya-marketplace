# backend/apps/catalog/serializers.py
# Serializers pour le catalogue de produits

from rest_framework import serializers
from django.db.models import Avg
import re
from .models import Product, Category, ProductMedia, ProductImage, ProductReview, MasterProduct, ProductCondition, PromotionCampaign, Brand, ColorDictionary, ProductAttribute, MasterProduct, AttributeRole, ProductVariant, ColorFamily


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
    variant = serializers.PrimaryKeyRelatedField(
        queryset=ProductVariant.objects.filter(deleted_at__isnull=True),
        required=False, allow_null=True,
        help_text=(
            "Variant précis auquel rattacher l'offre. Obligatoire pour "
            "les catégories Electronics où la fiche a des variant_axes déclarés. "
            "Facultatif pour les autres catégories."
        ),
    )

    class Meta:
        model = Product
        fields = [
            'id', 'title', 'description', 'short_description',
            'price_xaf', 'category', 'is_active', 'master',
            'variant',
            'condition', 'seller_note', 'stock_threshold',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def create(self, validated_data):
        from .models import Inventory, MasterProduct as _MP
 
        variant = validated_data.pop('variant', None)
        master = validated_data.pop('master', None)
 
        # ─── Cohérence variant ↔ master ─────────────────────────────
        # Si variant fourni, master est déduit automatiquement de variant.master
        # (on ignore un éventuel master fourni qui serait incohérent).
        if variant is not None:
            master = variant.master
 
        # ─── Création d'un master si aucun n'existe ─────────────────
        if master is None:
            # brand_fk : peut être fourni dans initial_data (pas dans les fields
            # explicites du serializer). Utile quand le vendeur choisit une
            # marque du registre Phase 1.2 pour son nouveau master.
            brand_fk_id = self.initial_data.get('brand_fk')
            brand_text = self.initial_data.get('brand', '')
 
            master = _MP.objects.create(
                title=validated_data.get('title', ''),
                description=validated_data.get('description', '') or '',
                category=validated_data.get('category'),
                brand=brand_text or '',
                brand_fk_id=brand_fk_id if brand_fk_id else None,
            )
 
        product = Product.objects.create(
            master=master,
            variant=variant,
            **validated_data,
        )
        stock_quantity = self.context.get('stock_quantity', 0)
        Inventory.objects.create(product=product, quantity=stock_quantity)
        return product

    def update(self, instance, validated_data):
        from .models import Inventory
 
        variant = validated_data.pop('variant', None)
        master = validated_data.pop('master', None)
 
        # Si le variant est fourni, on l'assigne (et on aligne le master)
        if variant is not None:
            instance.variant = variant
            instance.master = variant.master
        elif master is not None:
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
            'id', 'variant', 'price_xaf', 'compare_at_price', 'price_final',
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


class ProductVariantLightSerializer(serializers.ModelSerializer):
    """
    Version légère — utilisée dans les listes (liste des Variants d'un master,
    résultats de recherche). Pas de master imbriqué pour éviter les cycles.
    """
 
    display_name = serializers.SerializerMethodField()
    buy_box_price_xaf = serializers.SerializerMethodField()
    offers_count = serializers.SerializerMethodField()
 
    class Meta:
        model = ProductVariant
        fields = [
            "id",
            "sku",
            "barcode",
            "axis_values",
            "axis_key",
            "is_active",
            "moderation_status",
            "display_name",
            "buy_box_price_xaf",
            "offers_count",
        ]
        read_only_fields = fields   # Ce serializer est en lecture seule
 
    def get_display_name(self, obj):
        """Titre lisible : 'iPhone 15 Pro — Titane / 256 Go'."""
        return str(obj)
 
    def get_buy_box_price_xaf(self, obj):
        """Prix Buy Box (offre gagnante). None si aucune offre approuvée."""
        offer = obj.buy_box_offer
        return offer.price_xaf if offer else None
 
    def get_offers_count(self, obj):
        """Nombre d'offres approuvées disponibles."""
        return obj.offers.filter(
            is_active=True,
            moderation_status="APPROVED",
        ).count()
 
 
class ProductVariantSerializer(serializers.ModelSerializer):
    """
    Version complète — pour les pages détail et les endpoints admin.
    Inclut le master imbriqué (info légère) et toutes les métadonnées.
    """
 
    display_name = serializers.SerializerMethodField()
    master_title = serializers.CharField(source="master.title", read_only=True)
    master_slug = serializers.CharField(source="master.slug", read_only=True)
    master_variant_axes = serializers.JSONField(source="master.variant_axes", read_only=True)
    buy_box_price_xaf = serializers.SerializerMethodField()
    offers_count = serializers.SerializerMethodField()
 
    class Meta:
        model = ProductVariant
        fields = [
            "id",
            "master",
            "master_title",
            "master_slug",
            "master_variant_axes",
            "sku",
            "barcode",
            "axis_values",
            "axis_key",
            "is_active",
            "moderation_status",
            "moderated_at",
            "moderation_reason",
            "display_name",
            "buy_box_price_xaf",
            "offers_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id", "axis_key", "sku",
            "master_title", "master_slug", "master_variant_axes",
            "display_name", "buy_box_price_xaf", "offers_count",
            "created_at", "updated_at",
        ]
 
    def get_display_name(self, obj):
        return str(obj)
 
    def get_buy_box_price_xaf(self, obj):
        offer = obj.buy_box_offer
        return offer.price_xaf if offer else None
 
    def get_offers_count(self, obj):
        return obj.offers.filter(
            is_active=True,
            moderation_status="APPROVED",
        ).count()
 
 
class ProductVariantCreateSerializer(serializers.ModelSerializer):
    """
    Serializer de création — utilisé par l'endpoint POST vendor.
 
    Différences avec ProductVariantSerializer :
      - master est en input (id)
      - axis_values est input, axis_key et sku sont calculés côté modèle
      - moderation_status est forcé à PENDING (le vendeur ne peut pas
        auto-approuver son Variant)
    """
 
    class Meta:
        model = ProductVariant
        fields = ["master", "axis_values", "barcode"]
 
    def validate(self, attrs):
        """
        Validation :
          - Le master doit accepter la création (pas soft-deleted, existant)
          - axis_values doit être cohérent avec master.variant_axes
            (validation détaillée déléguée à ProductVariant.clean())
          - Pas de doublon (master, axis_values) — géré par contrainte DB
            mais on donne un message clair côté API
        """
        from .models import ProductVariant as PV
 
        master = attrs.get("master")
        axis_values = attrs.get("axis_values", {})
 
        # Vérifier l'unicité au niveau applicatif (pour un message d'erreur clair)
        axis_key = PV.compute_axis_key(axis_values)
        existing = PV.objects.filter(
            master=master, axis_key=axis_key, deleted_at__isnull=True,
        ).first()
        if existing is not None:
            raise serializers.ValidationError({
                "axis_values": (
                    f"Un Variant identique existe déjà (id={existing.id}, "
                    f"sku={existing.sku}). Réutilise-le pour créer ton offre."
                ),
                "existing_variant_id": existing.id,
                "existing_variant_sku": existing.sku,
            })
 
        return attrs
 
    def create(self, validated_data):
        """Force les champs de modération à leur valeur initiale."""
        validated_data["moderation_status"] = "APPROVED"
        validated_data["is_active"] = True
        return super().create(validated_data)  


class AdminVariantListSerializer(serializers.ModelSerializer):
    """
    Version LISTE — pour l'écran principal AdminVariantsPage.
    Optimisée pour affichage tableau : master_title, badges, compteurs.
    """
    master_title = serializers.CharField(source="master.title", read_only=True)
    master_slug = serializers.CharField(source="master.slug", read_only=True)
    master_category_name = serializers.CharField(
        source="master.category.name", read_only=True
    )
    display_name = serializers.SerializerMethodField()
    offers_count = serializers.SerializerMethodField()
    offers_approved_count = serializers.SerializerMethodField()
    buy_box_price_xaf = serializers.SerializerMethodField()
    moderated_by_username = serializers.CharField(
        source="moderated_by.username", read_only=True, default=None,
    )
 
    class Meta:
        model = ProductVariant
        fields = [
            "id", "sku", "barcode",
            "master", "master_title", "master_slug", "master_category_name",
            "axis_values", "axis_key",
            "display_name",
            "offers_count", "offers_approved_count", "buy_box_price_xaf",
            "is_active", "moderation_status",
            "moderated_at", "moderated_by_username", "moderation_reason",
            "created_at", "updated_at",
        ]
 
    def get_display_name(self, obj):
        return str(obj)
 
    def get_offers_count(self, obj):
        return obj.offers.count()
 
    def get_offers_approved_count(self, obj):
        return obj.offers.filter(
            is_active=True, moderation_status="APPROVED",
        ).count()
 
    def get_buy_box_price_xaf(self, obj):
        offer = obj.buy_box_offer
        return offer.price_xaf if offer else None
 
 
# ═══════════════════════════════════════════════════════════════════════════
# HELPER — Sérialisation d'un axe résolu (utilisé partout)
# ═══════════════════════════════════════════════════════════════════════════
 
def _resolve_axes(obj, attrs_by_slug=None):
    """
    Résout les axes d'un variant en utilisant le master.variant_axes et
    un dict attrs_by_slug (préchargé) ou une query directe.
    """
    if not obj.master.variant_axes:
        return []
 
    if attrs_by_slug is None:
        attrs_by_slug = {
            a.slug: a for a in ProductAttribute.objects.filter(
                slug__in=obj.master.variant_axes,
            )
        }
 
    resolved = []
    for slug in obj.master.variant_axes:
        attr = attrs_by_slug.get(slug)
        if attr is None:
            continue
        resolved.append({
            "slug": attr.slug,
            "name": attr.name,
            "values_type": attr.values_type,
            "unit": attr.unit or "",
            "value": obj.axis_values.get(slug),
        })
    return resolved
 
 
# ═══════════════════════════════════════════════════════════════════════════
# LIST SERIALIZER 
# ═══════════════════════════════════════════════════════════════════════════
 
class AdminVariantListSerializer(serializers.ModelSerializer):
    """Vue tableau — avec breadcrumb catégorie, image master, axes résolus."""
 
    master_title = serializers.CharField(source="master.title", read_only=True)
    master_slug = serializers.CharField(source="master.slug", read_only=True)
    master_category_id = serializers.IntegerField(source="master.category_id", read_only=True)
    master_category_name = serializers.CharField(source="master.category.name", read_only=True)
    master_category_parent_id = serializers.IntegerField(
        source="master.category.parent_id", read_only=True, default=None,
    )
    master_category_parent_name = serializers.SerializerMethodField()
    master_primary_image = serializers.SerializerMethodField()
    axes_resolved = serializers.SerializerMethodField()
    offers_count = serializers.SerializerMethodField()
    offers_approved_count = serializers.SerializerMethodField()
    offers_pending_count = serializers.SerializerMethodField()
    buy_box_price_xaf = serializers.SerializerMethodField()
    display_name = serializers.SerializerMethodField()
    moderated_by_username = serializers.CharField(
        source="moderated_by.username", read_only=True, default=None,
    )
 
    class Meta:
        model = ProductVariant
        fields = [
            "id", "sku", "barcode",
            "master", "master_title", "master_slug",
            "master_category_id", "master_category_name",
            "master_category_parent_id", "master_category_parent_name",
            "master_primary_image",
            "axis_values", "axis_key", "axes_resolved",
            "display_name",
            "offers_count", "offers_approved_count", "offers_pending_count",
            "buy_box_price_xaf",
            "is_active", "moderation_status",
            "moderated_at", "moderated_by_username", "moderation_reason",
            "created_at", "updated_at",
        ]
 
    def get_master_category_parent_name(self, obj):
        parent = getattr(obj.master.category, "parent", None)
        return parent.name if parent else None
 
    def get_master_primary_image(self, obj):
        request = self.context.get("request")
        img = obj.master.images.filter(is_primary=True).first() or obj.master.images.first()
        if not img or not img.image:
            return None
        url = img.image.url
        return request.build_absolute_uri(url) if request else url
 
    def get_axes_resolved(self, obj):
        return _resolve_axes(obj, self.context.get("attrs_by_slug"))
 
    def get_display_name(self, obj):
        return str(obj)
 
    def get_offers_count(self, obj):
        return obj.offers.count()
 
    def get_offers_approved_count(self, obj):
        return obj.offers.filter(is_active=True, moderation_status="APPROVED").count()
 
    def get_offers_pending_count(self, obj):
        return obj.offers.filter(moderation_status="PENDING").count()
 
    def get_buy_box_price_xaf(self, obj):
        offer = obj.buy_box_offer
        return offer.price_xaf if offer else None
 
 
# ═══════════════════════════════════════════════════════════════════════════
# OFFER BRIEF  — enrichi avec info vendeur complète
# ═══════════════════════════════════════════════════════════════════════════
 
class AdminVariantOfferBriefSerializer(serializers.ModelSerializer):
    """Carte offre riche pour la modale admin."""
 
    # ── Vendor (User) ────────────────────────────────────────────────
    vendor_user_id = serializers.IntegerField(source="vendor.id", read_only=True, default=None)
    vendor_username = serializers.CharField(source="vendor.username", read_only=True, default=None)
    vendor_first_name = serializers.CharField(source="vendor.first_name", read_only=True, default="")
    vendor_last_name = serializers.CharField(source="vendor.last_name", read_only=True, default="")
 
    # ── Vendor profile (boutique) ────────────────────────────────────
    vendor_profile_id = serializers.SerializerMethodField()
    vendor_business_name = serializers.SerializerMethodField()
    shop_slug = serializers.SerializerMethodField()
 
    # ── Product info ─────────────────────────────────────────────────
    condition_name = serializers.CharField(source="condition.name", read_only=True, default=None)
    real_image = serializers.SerializerMethodField()
    stock_quantity = serializers.SerializerMethodField()
 
    class Meta:
        model = Product
        fields = [
            "id", "title", "price_xaf", "seller_note", "stock_quantity",
            "moderation_status", "is_active",
            "vendor_user_id", "vendor_username", "vendor_first_name", "vendor_last_name",
            "vendor_profile_id", "vendor_business_name", "shop_slug",
            "condition_name", "real_image",
            "created_at",
        ]
 
    def get_vendor_profile_id(self, obj):
        try:
            return obj.vendor.vendor_profile.id
        except Exception:
            return None
 
    def get_vendor_business_name(self, obj):
        try:
            return obj.vendor.vendor_profile.business_name
        except Exception:
            return None
 
    def get_shop_slug(self, obj):
        try:
            return obj.vendor.vendor_profile.shop_slug
        except Exception:
            return None
 
    def get_real_image(self, obj):
        request = self.context.get("request")
        img_url = getattr(obj, "real_image", None)
        if not img_url:
            return None
        if hasattr(img_url, "url"):
            img_url = img_url.url
        return request.build_absolute_uri(img_url) if request else img_url
    
    def get_stock_quantity(self, obj):
        """Stock lu depuis ProductInventory.quantity (OneToOne)."""
        try:
            return obj.inventory.quantity
        except Exception:
            return 0
 
 
# ═══════════════════════════════════════════════════════════════════════════
# SIBLING VARIANT (léger, pour lister les autres variants du même master)
# ═══════════════════════════════════════════════════════════════════════════
 
class AdminVariantSiblingSerializer(serializers.ModelSerializer):
    """Variant frère — juste ce qu'il faut pour naviguer entre variants."""
 
    axes_resolved = serializers.SerializerMethodField()
    display_name = serializers.SerializerMethodField()
 
    class Meta:
        model = ProductVariant
        fields = [
            "id", "sku", "axis_values", "axes_resolved",
            "display_name", "moderation_status", "is_active",
        ]
 
    def get_axes_resolved(self, obj):
        return _resolve_axes(obj, self.context.get("attrs_by_slug"))
 
    def get_display_name(self, obj):
        return str(obj)
 
 
# ═══════════════════════════════════════════════════════════════════════════
# DETAIL, riche pour la modale
# ═══════════════════════════════════════════════════════════════════════════
 
class AdminVariantDetailSerializer(serializers.ModelSerializer):
    """Vue modale — master complet, axes, offres enrichies, siblings, stats."""
 
    # ── Master ───────────────────────────────────────────────────────
    master_title = serializers.CharField(source="master.title", read_only=True)
    master_slug = serializers.CharField(source="master.slug", read_only=True)
    master_description = serializers.CharField(source="master.description", read_only=True)
    master_category_id = serializers.IntegerField(source="master.category_id", read_only=True)
    master_category_name = serializers.CharField(source="master.category.name", read_only=True)
    master_category_parent_id = serializers.IntegerField(
        source="master.category.parent_id", read_only=True, default=None,
    )
    master_category_parent_name = serializers.SerializerMethodField()
    master_variant_axes = serializers.JSONField(source="master.variant_axes", read_only=True)
    master_primary_image = serializers.SerializerMethodField()
 
    # ── Axes & display ───────────────────────────────────────────────
    axes_resolved = serializers.SerializerMethodField()
    display_name = serializers.SerializerMethodField()
 
    # ── Relations enrichies ──────────────────────────────────────────
    offers = AdminVariantOfferBriefSerializer(many=True, read_only=True)
    sibling_variants = serializers.SerializerMethodField()
    stats = serializers.SerializerMethodField()
 
    # ── Modération ───────────────────────────────────────────────────
    moderated_by_username = serializers.CharField(
        source="moderated_by.username", read_only=True, default=None,
    )
 
    class Meta:
        model = ProductVariant
        fields = [
            "id", "sku", "barcode",
            "master", "master_title", "master_slug", "master_description",
            "master_category_id", "master_category_name",
            "master_category_parent_id", "master_category_parent_name",
            "master_variant_axes", "master_primary_image",
            "axis_values", "axis_key", "axes_resolved",
            "display_name",
            "offers", "sibling_variants", "stats",
            "is_active", "moderation_status",
            "moderated_at", "moderated_by_username", "moderation_reason",
            "created_at", "updated_at",
        ]
 
    def get_master_category_parent_name(self, obj):
        parent = getattr(obj.master.category, "parent", None)
        return parent.name if parent else None
 
    def get_master_primary_image(self, obj):
        request = self.context.get("request")
        img = obj.master.images.filter(is_primary=True).first() or obj.master.images.first()
        if not img or not img.image:
            return None
        url = img.image.url
        return request.build_absolute_uri(url) if request else url
 
    def get_axes_resolved(self, obj):
        return _resolve_axes(obj)
 
    def get_display_name(self, obj):
        return str(obj)
 
    def get_sibling_variants(self, obj):
        """Autres variants du même master (exclut self)."""
        siblings_qs = obj.master.variants.filter(is_active=True).exclude(pk=obj.pk).order_by("axis_key")
        return AdminVariantSiblingSerializer(
            siblings_qs, many=True, context=self.context,
        ).data
 
    def get_stats(self, obj):
        """Statistiques globales du variant."""
        offers = obj.offers.filter(is_active=True)
        approved = offers.filter(moderation_status="APPROVED")
        prices = list(approved.values_list("price_xaf", flat=True))

        # Stock lu depuis ProductInventory.quantity (OneToOne 'inventory')
        total_stock = 0
        for o in approved:
            try:
                total_stock += o.inventory.quantity or 0
            except Exception:
                pass  # Pas d'inventory rattachée → skip

        return {
            "total_offers": obj.offers.count(),
            "approved_offers": approved.count(),
            "pending_offers": obj.offers.filter(moderation_status="PENDING").count(),
            "rejected_offers": obj.offers.filter(moderation_status="REJECTED").count(),
            "price_min_xaf": min(prices) if prices else None,
            "price_max_xaf": max(prices) if prices else None,
            "total_stock": total_stock,
        }
 
 
# ═══════════════════════════════════════════════════════════════════════════
# MODERATION PAYLOAD
# ═══════════════════════════════════════════════════════════════════════════
 
class AdminVariantModerationSerializer(serializers.Serializer):
    """Payload pour approve/reject : commentaire optionnel."""
    moderation_reason = serializers.CharField(
        required=False, allow_blank=True, default="",
    )



# ═══════════════════════════════════════════════════════════════════════════
# HELPER — extraction du proposeur depuis admin_note
# ═══════════════════════════════════════════════════════════════════════════
 
_PROPOSED_BY_RE = re.compile(
    r"(?:Propos[eé][e]?\s*par\s+|Proposed by\s+)(?:@?(\w+))",
    re.IGNORECASE,
)
 
def _extract_proposed_by(admin_note: str) -> str | None:
    """
    Tente d'extraire le username du vendeur qui a proposé la marque
    depuis admin_note. Format attendu :
    'Proposée par vendor42 le 2025-11-05' (format libre, on cherche
    juste un username après 'Proposée par').
    """
    if not admin_note:
        return None
    m = _PROPOSED_BY_RE.search(admin_note)
    return m.group(1) if m else None
 
 
# ═══════════════════════════════════════════════════════════════════════════
# LIST SERIALIZER
# ═══════════════════════════════════════════════════════════════════════════
 
class AdminBrandListSerializer(serializers.ModelSerializer):
    """Vue tableau — infos essentielles + compteurs."""
 
    logo_url = serializers.SerializerMethodField()
    master_products_count = serializers.SerializerMethodField()
    active_masters_count = serializers.SerializerMethodField()
    proposed_by = serializers.SerializerMethodField()
 
    class Meta:
        model = Brand
        fields = [
            "id", "name", "slug",
            "logo_url",
            "country_of_origin", "website",
            "is_active", "is_verified",
            "master_products_count", "active_masters_count",
            "proposed_by",
            "created_at", "updated_at",
        ]
 
    def get_logo_url(self, obj):
        request = self.context.get("request")
        if not obj.logo:
            return None
        url = obj.logo.url
        return request.build_absolute_uri(url) if request else url
 
    def get_master_products_count(self, obj):
        return obj.master_products.count()
 
    def get_active_masters_count(self, obj):
        return obj.master_products.filter(
            moderation_status="APPROVED",
        ).count()
 
    def get_proposed_by(self, obj):
        """Extrait le username depuis admin_note si présent."""
        return _extract_proposed_by(obj.admin_note)
 
 
# ═══════════════════════════════════════════════════════════════════════════
# MASTER BRIEF (pour lister les fiches attachées)
# ═══════════════════════════════════════════════════════════════════════════
 
class AdminBrandMasterBriefSerializer(serializers.ModelSerializer):
    """Brève info d'une fiche maître attachée à la marque."""
 
    category_name = serializers.CharField(source="category.name", read_only=True)
    primary_image = serializers.SerializerMethodField()
    offers_count = serializers.SerializerMethodField()
 
    class Meta:
        model = MasterProduct
        fields = [
            "id", "slug", "title", "category_name",
            "primary_image", "offers_count",
            "moderation_status", "created_at",
        ]
 
    def get_primary_image(self, obj):
        request = self.context.get("request")
        img = obj.images.filter(is_primary=True).first() or obj.images.first()
        if not img or not img.image:
            return None
        url = img.image.url
        return request.build_absolute_uri(url) if request else url
 
    def get_offers_count(self, obj):
        return obj.offers.count()
 
 
# ═══════════════════════════════════════════════════════════════════════════
# DETAIL SERIALIZER
# ═══════════════════════════════════════════════════════════════════════════
 
class AdminBrandDetailSerializer(serializers.ModelSerializer):
    """Vue modale — brand complet + fiches attachées + stats."""
 
    logo_url = serializers.SerializerMethodField()
    master_products = serializers.SerializerMethodField()
    stats = serializers.SerializerMethodField()
    proposed_by = serializers.SerializerMethodField()
    is_deletable = serializers.SerializerMethodField()
 
    class Meta:
        model = Brand
        fields = [
            "id", "name", "slug",
            "logo", "logo_url",
            "description", "country_of_origin", "website",
            "is_active", "is_verified",
            "admin_note", "proposed_by",
            "master_products", "stats", "is_deletable",
            "created_at", "updated_at",
        ]
 
    def get_logo_url(self, obj):
        request = self.context.get("request")
        if not obj.logo:
            return None
        url = obj.logo.url
        return request.build_absolute_uri(url) if request else url
 
    def get_master_products(self, obj):
        """Fiches maîtres liées, limitées à 50 max pour éviter les payloads massifs."""
        qs = obj.master_products.select_related("category").prefetch_related(
            "images", "offers",
        ).order_by("-created_at")[:50]
        return AdminBrandMasterBriefSerializer(
            qs, many=True, context=self.context,
        ).data
 
    def get_stats(self, obj):
        """
        Statistiques métier :
        - Nombre de fiches maîtres (total et APPROVED)
        - Nombre d'offres cumulées sur toutes ces fiches
        - Nombre de vendeurs distincts qui ont une offre sous cette marque
        """
        from .models import Product
        all_masters = obj.master_products
        active_masters = all_masters.filter(moderation_status="APPROVED")
 
        offers = Product.objects.filter(master__brand_fk=obj)
        approved_offers = offers.filter(moderation_status="APPROVED")
 
        vendors_count = offers.values("vendor").distinct().count()
 
        return {
            "total_masters": all_masters.count(),
            "active_masters": active_masters.count(),
            "total_offers": offers.count(),
            "approved_offers": approved_offers.count(),
            "distinct_vendors": vendors_count,
        }
 
    def get_proposed_by(self, obj):
        return _extract_proposed_by(obj.admin_note)
 
    def get_is_deletable(self, obj):
        """
        Une marque n'est supprimable que si AUCUNE fiche maître ne l'utilise.
        Le champ brand_fk est protégé PROTECT côté modèle, donc tenter de
        supprimer une marque utilisée lèverait ProtectedError.
        """
        return not obj.master_products.exists()
 
 
# ═══════════════════════════════════════════════════════════════════════════
# CREATE / UPDATE SERIALIZER
# ═══════════════════════════════════════════════════════════════════════════
 
class AdminBrandCreateUpdateSerializer(serializers.ModelSerializer):
    """Formulaire admin création / édition d'une marque."""
 
    class Meta:
        model = Brand
        fields = [
            "name", "logo",
            "description", "country_of_origin", "website",
            "is_active", "is_verified",
            "admin_note",
        ]
 
    def validate_name(self, value):
        value = (value or "").strip()
        if len(value) < 2:
            raise serializers.ValidationError(
                "Le nom de la marque doit contenir au moins 2 caractères.",
            )
 
        # Unicité case-insensitive (au-delà de la contrainte DB `unique=True`)
        qs = Brand.objects.filter(name__iexact=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError(
                f"Une marque nommée '{value}' existe déjà.",
            )
 
        return value
 
 
# ═══════════════════════════════════════════════════════════════════════════
# MERGE SERIALIZER (payload de fusion)
# ═══════════════════════════════════════════════════════════════════════════
 
class AdminBrandMergeSerializer(serializers.Serializer):
    """
    Payload pour fusionner plusieurs marques dans une cible.
 
    Format :
    {
      "target_id": 42,
      "source_ids": [17, 23, 88]
    }
 
    Règles métier :
    - target doit exister et être is_verified (protection contre écrasement
      d'une marque officielle par une non-vérifiée)
    - target ne peut pas être dans source_ids (auto-fusion interdite)
    - source_ids doivent tous exister
    - Toutes les fiches maîtres des sources sont réassignées à la cible
    - Les sources sont ensuite supprimées
    """
    target_id = serializers.IntegerField()
    source_ids = serializers.ListField(
        child=serializers.IntegerField(),
        min_length=1,
    )
 
    def validate(self, attrs):
        target_id = attrs["target_id"]
        source_ids = attrs["source_ids"]
 
        if target_id in source_ids:
            raise serializers.ValidationError(
                "La marque cible ne peut pas être dans les sources.",
            )
 
        try:
            target = Brand.objects.get(pk=target_id)
        except Brand.DoesNotExist:
            raise serializers.ValidationError(
                {"target_id": "Marque cible introuvable."},
            )
 
        if not target.is_verified:
            raise serializers.ValidationError(
                {"target_id": (
                    f"La marque cible '{target.name}' n'est pas vérifiée. "
                    "Marque-la d'abord comme vérifiée avant la fusion."
                )},
            )
 
        sources_qs = Brand.objects.filter(pk__in=source_ids)
        if sources_qs.count() != len(source_ids):
            raise serializers.ValidationError(
                {"source_ids": "Une ou plusieurs marques sources sont introuvables."},
            )
 
        attrs["_target"] = target
        attrs["_sources"] = list(sources_qs)
        return attrs    



class AdminAttributeListSerializer(serializers.ModelSerializer):
    """Vue tableau — infos essentielles + compteurs."""
 
    category_name = serializers.CharField(source="category.name", read_only=True, default=None)
    values_count = serializers.SerializerMethodField()
    used_as_axis_count = serializers.SerializerMethodField()
 
    class Meta:
        model = ProductAttribute
        fields = [
            "id", "name", "slug",
            "role", "values_type", "attribute_type",
            "is_universal", "is_required",
            "category", "category_name",
            "values", "values_count", "unit",
            "used_as_axis_count",
            "display_order",
        ]
 
    def get_values_count(self, obj):
        if isinstance(obj.values, list):
            return len(obj.values)
        return 0
 
    def get_used_as_axis_count(self, obj):
        """
        Nombre de MasterProduct utilisant cet attribut comme axe de variante
        (via master.variant_axes JSON list contenant obj.slug).
        Pertinent uniquement si role=AXE mais on le calcule pour tous.
        """
        return MasterProduct.objects.filter(variant_axes__contains=[obj.slug]).count()
 
 
# ═══════════════════════════════════════════════════════════════════════════
# MASTER USING (pour lister les fiches qui utilisent l'attribut)
# ═══════════════════════════════════════════════════════════════════════════
 
class AdminAttributeMasterUsingSerializer(serializers.ModelSerializer):
    """Brève info d'une fiche maître qui utilise cet attribut comme axe."""
 
    category_name = serializers.CharField(source="category.name", read_only=True)
    primary_image = serializers.SerializerMethodField()
 
    class Meta:
        model = MasterProduct
        fields = [
            "id", "slug", "title", "category_name",
            "primary_image", "variant_axes",
            "moderation_status",
        ]
 
    def get_primary_image(self, obj):
        request = self.context.get("request")
        img = obj.images.filter(is_primary=True).first() or obj.images.first()
        if not img or not img.image:
            return None
        url = img.image.url
        return request.build_absolute_uri(url) if request else url
 
 
# ═══════════════════════════════════════════════════════════════════════════
# DETAIL SERIALIZER
# ═══════════════════════════════════════════════════════════════════════════
 
class AdminAttributeDetailSerializer(serializers.ModelSerializer):
    """Vue modale — attribut complet + fiches utilisatrices + stats."""
 
    category_name = serializers.CharField(source="category.name", read_only=True, default=None)
    category_parent_id = serializers.IntegerField(
        source="category.parent_id", read_only=True, default=None,
    )
    category_parent_name = serializers.SerializerMethodField()
    used_by_masters = serializers.SerializerMethodField()
    stats = serializers.SerializerMethodField()
 
    class Meta:
        model = ProductAttribute
        fields = [
            "id", "name", "slug",
            "role", "values_type", "attribute_type",
            "is_universal", "is_required",
            "category", "category_name", "category_parent_id", "category_parent_name",
            "values", "unit",
            "used_by_masters", "stats",
            "display_order",
        ]
 
    def get_category_parent_name(self, obj):
        if not obj.category or not obj.category.parent:
            return None
        return obj.category.parent.name
 
    def get_used_by_masters(self, obj):
        """Liste des masters qui déclarent cet attribut dans variant_axes (max 50)."""
        qs = MasterProduct.objects.filter(
            variant_axes__contains=[obj.slug],
        ).select_related("category").prefetch_related("images")[:50]
        return AdminAttributeMasterUsingSerializer(
            qs, many=True, context=self.context,
        ).data
 
    def get_stats(self, obj):
        used_masters = MasterProduct.objects.filter(variant_axes__contains=[obj.slug])
        return {
            "used_as_axis_count": used_masters.count(),
            "approved_masters_using": used_masters.filter(moderation_status="APPROVED").count(),
            "values_count": len(obj.values) if isinstance(obj.values, list) else 0,
        }
 
 
# ═══════════════════════════════════════════════════════════════════════════
# CREATE / UPDATE SERIALIZER
# ═══════════════════════════════════════════════════════════════════════════
 
class AdminAttributeCreateUpdateSerializer(serializers.ModelSerializer):
    """Formulaire admin création / édition d'un attribut."""
 
    class Meta:
        model = ProductAttribute
        fields = [
            "name", "slug",
            "role", "values_type", "attribute_type",
            "is_universal", "is_required",
            "category",
            "values", "unit",
            "display_order",
        ]
        extra_kwargs = {
            "slug": {"required": False},   # Auto-généré si omis
        }
 
    def validate_name(self, value):
        value = (value or "").strip()
        if len(value) < 2:
            raise serializers.ValidationError(
                "Le nom doit contenir au moins 2 caractères.",
            )
        return value
 
    def validate(self, attrs):
        is_universal = attrs.get(
            "is_universal", self.instance.is_universal if self.instance else False,
        )
        category = attrs.get(
            "category", self.instance.category if self.instance else None,
        )
 
        if is_universal and category is not None:
            raise serializers.ValidationError({
                "category": "Un attribut universel ne doit pas avoir de catégorie assignée.",
            })
        if not is_universal and category is None:
            raise serializers.ValidationError({
                "category": "Un attribut non universel DOIT avoir une catégorie.",
            })
 
        # Values doit être une liste
        values = attrs.get("values", self.instance.values if self.instance else [])
        if not isinstance(values, list):
            raise serializers.ValidationError({
                "values": "Le champ values doit être une liste JSON.",
            })
 
        return attrs
 
    def create(self, validated_data):
        # Auto-génération du slug si non fourni
        if not validated_data.get("slug"):
            from django.utils.text import slugify
            base = slugify(validated_data["name"]) or "attr"
            slug = base
            counter = 1
            while ProductAttribute.objects.filter(slug=slug).exists():
                slug = f"{base}-{counter}"
                counter += 1
            validated_data["slug"] = slug
        return super().create(validated_data)



class AdminColorListSerializer(serializers.ModelSerializer):
    """Vue liste/grille — infos essentielles + compteur d'usage."""
 
    used_by_variants_count = serializers.SerializerMethodField()
 
    class Meta:
        model = ColorDictionary
        fields = [
            "id", "slug",
            "family", "name", "name_en",
            "hex_code", "pattern_url",
            "is_neutral", "is_active",
            "display_order",
            "used_by_variants_count",
        ]
 
    def get_used_by_variants_count(self, obj):
        """Nombre de variants référençant cette couleur (via axis_values)."""
        # Recherche dans le JSONField axis_values — cherche cette valeur dans
        # n'importe quelle clé (couleur peut être sur phone-color, laptop-color, etc.)
        # NOTE : c'est une approximation, on regarde juste si le slug apparaît
        # comme valeur dans un axis_values quelconque.
        return ProductVariant.objects.filter(
            axis_values__icontains=obj.slug,
        ).count()
 
 
# ═══════════════════════════════════════════════════════════════════════════
# DETAIL SERIALIZER
# ═══════════════════════════════════════════════════════════════════════════
 
class AdminColorDetailSerializer(serializers.ModelSerializer):
    """Vue modale — couleur complète + stats usage."""
 
    stats = serializers.SerializerMethodField()
    is_deletable = serializers.SerializerMethodField()
 
    class Meta:
        model = ColorDictionary
        fields = [
            "id", "slug",
            "family", "name", "name_en",
            "hex_code", "pattern_url",
            "is_neutral", "is_active",
            "display_order",
            "stats", "is_deletable",
        ]
 
    def get_stats(self, obj):
        variants_using = ProductVariant.objects.filter(
            axis_values__icontains=obj.slug,
        )
        return {
            "variants_using": variants_using.count(),
            "approved_variants_using": variants_using.filter(
                moderation_status="APPROVED",
            ).count(),
        }
 
    def get_is_deletable(self, obj):
        """Une couleur n'est supprimable QUE si aucun variant ne la référence."""
        return not ProductVariant.objects.filter(
            axis_values__icontains=obj.slug,
        ).exists()
 
 
# ═══════════════════════════════════════════════════════════════════════════
# CREATE / UPDATE SERIALIZER
# ═══════════════════════════════════════════════════════════════════════════
 
class AdminColorCreateUpdateSerializer(serializers.ModelSerializer):
    """Formulaire admin création / édition d'une couleur."""
 
    class Meta:
        model = ColorDictionary
        fields = [
            "family", "name", "name_en",
            "hex_code", "pattern_url",
            "is_neutral", "is_active",
            "display_order",
        ]
 
    def validate_name(self, value):
        value = (value or "").strip()
        if len(value) < 2:
            raise serializers.ValidationError("Nom trop court.")
        return value
 
    def validate_hex_code(self, value):
        if not value:
            return value  # Vide autorisé (finitions non-colorées)
        value = value.strip()
        if not value.startswith("#"):
            value = "#" + value
        # Format #RRGGBB attendu (7 caractères total)
        import re
        if not re.match(r"^#[0-9A-Fa-f]{6}$", value):
            raise serializers.ValidationError(
                "Format hexadécimal invalide. Attendu : #RRGGBB.",
            )
        return value.upper()
 
    def validate(self, attrs):
        family = attrs.get(
            "family", self.instance.family if self.instance else ColorFamily.COLOR,
        )
        name = attrs.get("name", self.instance.name if self.instance else "")
 
        # Unicité (family, name) — au-delà de la contrainte DB
        qs = ColorDictionary.objects.filter(family=family, name__iexact=name)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError({
                "name": f"Une entrée '{name}' existe déjà dans la famille {family}.",
            })
 
        return attrs        
    


class AdminCategoryListSerializer(serializers.ModelSerializer):
    """Nœud d'arbre — infos essentielles + compteurs."""
 
    parent_name = serializers.CharField(source="parent.name", read_only=True, default=None)
    children_count = serializers.SerializerMethodField()
    masters_count = serializers.SerializerMethodField()
    attributes_count = serializers.SerializerMethodField()
 
    class Meta:
        model = Category
        fields = [
            "id", "name", "slug", "level",
            "parent", "parent_name",
            "icon_name", "description",
            "display_order",
            "is_active", "is_deprecated", "requires_admin_approval",
            "children_count", "masters_count", "attributes_count",
        ]
 
    def get_children_count(self, obj):
        return obj.children.filter(deleted_at__isnull=True).count()
 
    def get_masters_count(self, obj):
        return obj.master_products.count()
 
    def get_attributes_count(self, obj):
        return obj.attributes.count()
 
 
class AdminCategoryTreeNodeSerializer(serializers.ModelSerializer):
    """
    Nœud d'arbre AVEC enfants imbriqués — pour la vue arborescente.
    Utilise un dict `children_map` pré-calculé côté vue pour éviter N+1.
    """
    parent_name = serializers.CharField(source="parent.name", read_only=True, default=None)
    children_count = serializers.SerializerMethodField()
    masters_count = serializers.SerializerMethodField()
    attributes_count = serializers.SerializerMethodField()
    children = serializers.SerializerMethodField()
 
    class Meta:
        model = Category
        fields = [
            "id", "name", "slug", "level",
            "parent", "parent_name",
            "icon_name", "description",
            "display_order",
            "is_active", "is_deprecated", "requires_admin_approval",
            "children_count", "masters_count", "attributes_count",
            "children",
        ]
 
    def get_children_count(self, obj):
        children_map = self.context.get("children_map", {})
        return len(children_map.get(obj.id, []))
 
    def get_masters_count(self, obj):
        counts_map = self.context.get("masters_counts", {})
        return counts_map.get(obj.id, 0)
 
    def get_attributes_count(self, obj):
        counts_map = self.context.get("attributes_counts", {})
        return counts_map.get(obj.id, 0)
 
    def get_children(self, obj):
        children_map = self.context.get("children_map", {})
        kids = children_map.get(obj.id, [])
        # Tri : display_order puis name
        kids = sorted(kids, key=lambda c: (c.display_order, c.name.lower()))
        return AdminCategoryTreeNodeSerializer(
            kids, many=True, context=self.context,
        ).data
 
 
# ═══════════════════════════════════════════════════════════════════════════
# BRIEFS (masters attachés, attributs attachés)
# ═══════════════════════════════════════════════════════════════════════════
 
class AdminCategoryMasterBriefSerializer(serializers.ModelSerializer):
    """Fiche maître attachée à la catégorie."""
 
    primary_image = serializers.SerializerMethodField()
    offers_count = serializers.SerializerMethodField()
 
    class Meta:
        model = MasterProduct
        fields = [
            "id", "slug", "title",
            "primary_image", "offers_count",
            "moderation_status", "created_at",
        ]
 
    def get_primary_image(self, obj):
        request = self.context.get("request")
        img = obj.images.filter(is_primary=True).first() or obj.images.first()
        if not img or not img.image:
            return None
        url = img.image.url
        return request.build_absolute_uri(url) if request else url
 
    def get_offers_count(self, obj):
        return obj.offers.count()
 
 
class AdminCategoryAttributeBriefSerializer(serializers.ModelSerializer):
    """Attribut spécifique à la catégorie (non universel)."""
 
    values_count = serializers.SerializerMethodField()
 
    class Meta:
        model = ProductAttribute
        fields = [
            "id", "slug", "name",
            "role", "values_type", "unit",
            "values_count", "is_required",
        ]
 
    def get_values_count(self, obj):
        if isinstance(obj.values, list):
            return len(obj.values)
        return 0
 
 
# ═══════════════════════════════════════════════════════════════════════════
# DETAIL SERIALIZER
# ═══════════════════════════════════════════════════════════════════════════
 
class AdminCategoryDetailSerializer(serializers.ModelSerializer):
    """Modale de détail — catégorie + parent + enfants + fiches + attributs."""
 
    parent_name = serializers.CharField(source="parent.name", read_only=True, default=None)
    parent_slug = serializers.CharField(source="parent.slug", read_only=True, default=None)
    ancestors = serializers.SerializerMethodField()
 
    children = serializers.SerializerMethodField()
    master_products = serializers.SerializerMethodField()
    attributes = serializers.SerializerMethodField()
 
    stats = serializers.SerializerMethodField()
    is_deletable = serializers.SerializerMethodField()
 
    class Meta:
        model = Category
        fields = [
            "id", "name", "slug", "level",
            "parent", "parent_name", "parent_slug", "ancestors",
            "icon_name", "description",
            "display_order",
            "is_active", "is_deprecated", "requires_admin_approval",
            "children", "master_products", "attributes",
            "stats", "is_deletable",
        ]
 
    def get_ancestors(self, obj):
        """Chaîne d'ancêtres pour le breadcrumb (racine → parent direct)."""
        try:
            chain = obj.get_ancestors()
        except AttributeError:
            # Fallback si get_ancestors() n'existe pas
            chain = []
            current = obj.parent
            while current is not None:
                chain.insert(0, current)
                current = current.parent
        return [
            {"id": a.id, "name": a.name, "slug": a.slug}
            for a in chain
        ]
 
    def get_children(self, obj):
        """Enfants directs, triés par display_order + name."""
        kids = obj.children.filter(deleted_at__isnull=True).order_by(
            "display_order", "name",
        )
        return AdminCategoryListSerializer(
            kids, many=True, context=self.context,
        ).data
 
    def get_master_products(self, obj):
        """Jusqu'à 50 fiches attachées."""
        qs = obj.master_products.prefetch_related("images", "offers").order_by(
            "-created_at",
        )[:50]
        return AdminCategoryMasterBriefSerializer(
            qs, many=True, context=self.context,
        ).data
 
    def get_attributes(self, obj):
        """Attributs spécifiques à cette catégorie (pas les universels)."""
        qs = obj.attributes.order_by("role", "display_order", "name")
        return AdminCategoryAttributeBriefSerializer(
            qs, many=True, context=self.context,
        ).data
 
    def get_stats(self, obj):
        all_masters = obj.master_products
        return {
            "total_masters": all_masters.count(),
            "approved_masters": all_masters.filter(
                moderation_status="APPROVED",
            ).count(),
            "children_count": obj.children.filter(deleted_at__isnull=True).count(),
            "attributes_count": obj.attributes.count(),
            "level": obj.level,
        }
 
    def get_is_deletable(self, obj):
        """
        Une catégorie est supprimable si :
        - Aucune fiche maître ne l'utilise (protection PROTECT côté modèle)
        - Aucun enfant (sinon les enfants deviennent orphelins)
        - Aucun attribut spécifique (à réassigner ou supprimer avant)
        """
        return (
            not obj.master_products.exists()
            and not obj.children.filter(deleted_at__isnull=True).exists()
            and not obj.attributes.exists()
        )
 
 
# ═══════════════════════════════════════════════════════════════════════════
# CREATE / UPDATE SERIALIZER
# ═══════════════════════════════════════════════════════════════════════════
 
class AdminCategoryCreateUpdateSerializer(serializers.ModelSerializer):
    """Formulaire création / édition d'une catégorie."""
 
    class Meta:
        model = Category
        fields = [
            "name", "slug", "parent",
            "icon_name", "description",
            "display_order",
            "is_active", "is_deprecated", "requires_admin_approval",
        ]
        extra_kwargs = {
            "slug": {"required": False},  # Auto-généré si absent
        }
 
    def validate_name(self, value):
        value = (value or "").strip()
        if len(value) < 2:
            raise serializers.ValidationError(
                "Nom trop court (2 caractères minimum).",
            )
        return value
 
    def validate_description(self, value):
        if value and len(value) > 280:
            raise serializers.ValidationError(
                "Description limitée à 280 caractères.",
            )
        return value
 
    def validate_parent(self, value):
        """Empêche de mettre un parent qui serait un descendant de self (cycle)."""
        if value is None:
            return value
        if self.instance is not None:
            # Détection de cycle : parent ne doit pas être self ni un descendant
            if value.id == self.instance.id:
                raise serializers.ValidationError(
                    "Une catégorie ne peut pas être son propre parent.",
                )
            # Remonter la chaîne du parent proposé jusqu'à la racine
            # → si on rencontre self, c'est un cycle
            current = value
            visited = set()
            while current is not None:
                if current.id in visited:
                    # Cycle déjà présent dans la BD (dette)
                    break
                visited.add(current.id)
                if current.id == self.instance.id:
                    raise serializers.ValidationError(
                        "Ce parent créerait un cycle dans l'arbre.",
                    )
                current = current.parent
        return value
 
    def create(self, validated_data):
        # Auto-slug si absent
        if not validated_data.get("slug"):
            from django.utils.text import slugify
            base = slugify(validated_data["name"]) or "category"
            slug = base
            counter = 1
            while Category.objects.filter(slug=slug).exists():
                slug = f"{base}-{counter}"
                counter += 1
            validated_data["slug"] = slug
        return super().create(validated_data)