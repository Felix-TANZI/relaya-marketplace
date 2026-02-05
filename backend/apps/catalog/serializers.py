# backend/apps/catalog/serializers.py
# Serializers pour le catalogue de produits

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
    """Serializer principal pour les produits - utilisé pour la liste et le détail"""
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
            'updated_at',
            'images',
        ]
        read_only_fields = ['id', 'slug', 'created_at', 'updated_at']
    
    def get_stock_quantity(self, obj):
        """Récupérer la quantité en stock depuis le modèle Inventory"""
        try:
            return obj.inventory.quantity
        except:
            return 0


class ProductCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer pour la création et modification de produits par les vendeurs"""
    
    class Meta:
        model = Product
        fields = [
            'id',
            'title',
            'description',
            'price_xaf',
            'category',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def create(self, validated_data):
        """Créer un produit avec le stock initial"""
        from .models import Inventory
        
        # Créer le produit
        product = Product.objects.create(**validated_data)
        
        # Créer l'inventaire avec le stock_quantity si fourni
        stock_quantity = self.context.get('stock_quantity', 0)
        Inventory.objects.create(product=product, quantity=stock_quantity)
        
        return product
    
    def update(self, instance, validated_data):
        """Mettre à jour le produit et son stock"""
        from .models import Inventory
        
        # Récupérer stock_quantity du context si fourni
        stock_quantity = self.context.get('stock_quantity')
        
        # Mettre à jour les champs du produit
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Mettre à jour le stock si fourni
        if stock_quantity is not None:
            inventory, created = Inventory.objects.get_or_create(product=instance)
            inventory.quantity = stock_quantity
            inventory.save()
        
        return instance
    
    def to_representation(self, instance):
        """Utiliser ProductSerializer pour la représentation"""
        return ProductSerializer(instance, context=self.context).data