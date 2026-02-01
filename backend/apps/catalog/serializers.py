from rest_framework import serializers
from .models import Product, Category, ProductMedia, ProductImage


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'is_active']


class ProductMediaSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductMedia
        fields = ['id', 'url', 'media_type', 'sort_order']


class ProductImageSerializer(serializers.ModelSerializer):
    """Serializer pour les images de produits"""
    image_url = serializers.SerializerMethodField()
    
    class Meta:
        model = ProductImage
        fields = ['id', 'image', 'image_url', 'is_primary', 'order', 'created_at']
        read_only_fields = ['id', 'created_at']
    
    def get_image_url(self, obj):
        """Retourner l'URL complète de l'image"""
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None


class ProductSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    media = ProductMediaSerializer(many=True, read_only=True)
    stock_quantity = serializers.SerializerMethodField()
    images = ProductImageSerializer(many=True, read_only=True)
    
    class Meta:
        model = Product
        fields = [
            'id', 
            'title', 
            'slug',
            'description', 
            'price_xaf', 
            'stock_quantity',
            'is_active',
            'category',
            'media',
            'created_at',
            'images',
            'updated_at'
        ]
    
    def get_stock_quantity(self, obj):
        "Récupérer la quantité en stock depuis le modèle Inventory"
        try:
            return obj.inventory.quantity
        except:
            return 0
