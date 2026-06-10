# backend/apps/catalog/serializers.py
# Serializers pour le catalogue de produits

from rest_framework import serializers
from django.db.models import Avg
from .models import Product, Category, ProductMedia, ProductImage, ProductReview, MasterProduct, ProductCondition


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'is_active', 'parent']


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


class ProductSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    media = ProductMediaSerializer(many=True, read_only=True)
    stock_quantity = serializers.SerializerMethodField()
    images = ProductImageSerializer(many=True, read_only=True)
    rating_average = serializers.SerializerMethodField()
    reviews_count = serializers.SerializerMethodField()
    price_final = serializers.SerializerMethodField()
    
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
        if obj.compare_at_price and obj.compare_at_price > obj.price_xaf:
            return obj.price_xaf
        if obj.discount > 0:
            return obj.price_xaf - (obj.price_xaf * obj.discount // 100)
        return obj.price_xaf


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

    class Meta:
        model = Product
        fields = [
            'id', 'price_xaf', 'compare_at_price', 'price_final',
            'discount_percent', 'is_on_promotion',
            'condition', 'seller_note', 'stock_quantity', 'is_active',
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