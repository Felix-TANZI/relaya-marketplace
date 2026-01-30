from rest_framework import serializers
from .models import Product, Category, ProductMedia


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'is_active']


class ProductMediaSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductMedia
        fields = ['id', 'url', 'media_type', 'sort_order']


class ProductSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    media = ProductMediaSerializer(many=True, read_only=True)
    stock_quantity = serializers.SerializerMethodField()
    
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
            'updated_at'
        ]
    
    def get_stock_quantity(self, obj):
        "Récupérer la quantité en stock depuis le modèle Inventory"
        try:
            return obj.inventory.quantity
        except:
            return 0
