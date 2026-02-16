# backend/apps/catalog/serializers.py
# Serializers pour le catalogue de produits

from rest_framework import serializers
from .models import Product, Category, ProductMedia, ProductImage
from django.contrib.auth.models import User
from django.db.models import Avg, Count


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
    
    # Stats des avis
    rating_average = serializers.SerializerMethodField()
    reviews_count = serializers.SerializerMethodField()
    
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
            'images',
            'rating_average',
            'reviews_count',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'slug', 'created_at', 'updated_at']
    
    def get_stock_quantity(self, obj):
        """Récupérer la quantité en stock depuis le modèle Inventory"""
        try:
            return obj.inventory.quantity
        except:
            return 0
    
    def get_rating_average(self, obj):
        """Calculer la moyenne des notes"""
        from .models import ProductReview
        avg = ProductReview.objects.filter(
            product=obj, 
            is_approved=True
        ).aggregate(Avg('rating'))['rating__avg']
        return round(avg, 1) if avg else None
    
    def get_reviews_count(self, obj):
        """Compter le nombre d'avis approuvés"""
        from .models import ProductReview
        return ProductReview.objects.filter(product=obj, is_approved=True).count()


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
    

class ProductReviewSerializer(serializers.ModelSerializer):
    """Serializer pour les avis produits"""
    user_name = serializers.CharField(source='user.username', read_only=True)
    user_first_name = serializers.CharField(source='user.first_name', read_only=True)
    
    class Meta:
        from .models import ProductReview
        model = ProductReview
        fields = [
            'id', 'user', 'user_name', 'user_first_name',
            'rating', 'title', 'comment',
            'is_verified_purchase', 'created_at'
        ]
        read_only_fields = ['id', 'user', 'is_verified_purchase', 'created_at']


class ProductReviewCreateSerializer(serializers.ModelSerializer):
    """Serializer pour créer un avis"""
    
    class Meta:
        from .models import ProductReview
        model = ProductReview
        fields = ['product', 'rating', 'title', 'comment', 'order']
    
    def validate(self, data):
        user = self.context['request'].user
        product = data['product']
        order = data.get('order')
        
        # Vérifier que l'utilisateur a acheté le produit
        if order:
            if not order.items.filter(product=product).exists():
                raise serializers.ValidationError("Ce produit n'est pas dans cette commande.")
            if order.user != user:
                raise serializers.ValidationError("Cette commande ne vous appartient pas.")
        
        # Vérifier qu'il n'a pas déjà laissé un avis pour cette commande
        from .models import ProductReview
        if order and ProductReview.objects.filter(product=product, user=user, order=order).exists():
            raise serializers.ValidationError("Vous avez déjà laissé un avis pour ce produit.")
        
        return data
    
    def create(self, validated_data):
        from .models import ProductReview
        validated_data['user'] = self.context['request'].user
        
        # Marquer comme achat vérifié si une commande est fournie
        if validated_data.get('order'):
            validated_data['is_verified_purchase'] = True
        
        return ProductReview.objects.create(**validated_data)    