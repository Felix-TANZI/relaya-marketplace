# backend/apps/catalog/serializers.py
# Serializers pour le catalogue de produits

from rest_framework import serializers
from django.db.models import Avg
from .models import Product, Category, ProductMedia, ProductImage, ProductReview, PromotionCampaign


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
    class Meta:
        model = Product
        fields = [
            'id',
            'title',
            'description',
            'short_description',
            'price_xaf',
            'category',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def create(self, validated_data):
        from .models import Inventory
        product = Product.objects.create(**validated_data)
        stock_quantity = self.context.get('stock_quantity', 0)
        Inventory.objects.create(product=product, quantity=stock_quantity)
        return product
    
    def update(self, instance, validated_data):
        from .models import Inventory
        stock_quantity = self.context.get('stock_quantity')
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        if stock_quantity is not None:
            inventory, created = Inventory.objects.get_or_create(product=instance)
            inventory.quantity = stock_quantity
            inventory.save()
        
        return instance
    
    def to_representation(self, instance):
        return ProductSerializer(instance, context=self.context).data
