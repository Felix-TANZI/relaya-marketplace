# backend/apps/vendors/serializers.py
# Serializers pour l'espace vendeur

from rest_framework import serializers
from .models import VendorProfile
from django.contrib.auth.models import User
from apps.orders.models import Order, OrderItem


class VendorProfileSerializer(serializers.ModelSerializer):
    """Serializer pour le profil vendeur"""
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    
    class Meta:
        model = VendorProfile
        fields = [
            'id', 'username', 'email', 'business_name', 'business_description',
            'phone', 'address', 'city', 'id_document', 'status',
            'created_at', 'updated_at', 'approved_at'
        ]
        read_only_fields = ['id', 'status', 'created_at', 'updated_at', 'approved_at']


class VendorApplicationSerializer(serializers.ModelSerializer):
    """Serializer pour la demande de devenir vendeur"""
    
    class Meta:
        model = VendorProfile
        fields = [
            'business_name', 'business_description', 'phone',
            'address', 'city', 'id_document'
        ]
    
    def validate(self, data):
        """Vérifier que l'utilisateur n'est pas déjà vendeur"""
        user = self.context['request'].user
        if VendorProfile.objects.filter(user=user).exists():
            raise serializers.ValidationError("Vous avez déjà une demande vendeur.")
        return data
    
    def create(self, validated_data):
        """Créer le profil vendeur"""
        user = self.context['request'].user
        return VendorProfile.objects.create(user=user, **validated_data)


class VendorStatsSerializer(serializers.Serializer):
    """Serializer pour les statistiques du vendeur"""
    total_products = serializers.IntegerField()
    active_products = serializers.IntegerField()
    total_orders = serializers.IntegerField()
    total_revenue = serializers.DecimalField(max_digits=10, decimal_places=2)

class VendorOrderItemSerializer(serializers.ModelSerializer):
    """Serializer pour les items de commande du vendeur"""
    product_title = serializers.CharField(source='product.title', read_only=True)
    product_image = serializers.SerializerMethodField()
    
    class Meta:
        model = OrderItem
        fields = [
            'id', 
            'product', 
            'product_title',
            'product_image',
            'title_snapshot', 
            'qty', 
            'price_xaf_snapshot', 
            'line_total_xaf',
            'created_at'
        ]
        read_only_fields = fields
    
    def get_product_image(self, obj):
        """Retourner l'URL de la première image du produit"""
        if obj.product and hasattr(obj.product, 'images'):
            first_image = obj.product.images.filter(is_primary=True).first() or obj.product.images.first()
            if first_image and first_image.image:
                request = self.context.get('request')
                if request:
                    return request.build_absolute_uri(first_image.image.url)
                return first_image.image.url
        return None


class VendorOrderSerializer(serializers.ModelSerializer):
    """Serializer pour les commandes vendeur avec items filtrés"""
    items = serializers.SerializerMethodField()
    customer_name = serializers.SerializerMethodField()
    vendor_total = serializers.SerializerMethodField()
    
    class Meta:
        model = Order
        fields = [
            'id',
            'status',
            'customer_name',
            'customer_email',
            'customer_phone',
            'city',
            'address',
            'note',
            'items',
            'vendor_total',
            'subtotal_xaf',
            'delivery_fee_xaf',
            'total_xaf',
            'created_at',
            'updated_at'
        ]
        read_only_fields = fields
    
    def get_items(self, obj):
        """Retourner uniquement les items du vendeur"""
        vendor = self.context.get('vendor')
        if vendor:
            vendor_items = obj.items.filter(product__vendor=vendor)
            return VendorOrderItemSerializer(vendor_items, many=True, context=self.context).data
        return []
    
    def get_customer_name(self, obj):
        """Retourner le nom du client"""
        return f"{obj.user.first_name} {obj.user.last_name}".strip() or obj.user.username
    
    def get_vendor_total(self, obj):
        """Calculer le total pour ce vendeur uniquement"""
        vendor = self.context.get('vendor')
        if vendor:
            total = sum(
                item.line_total_xaf 
                for item in obj.items.filter(product__vendor=vendor)
            )
            return total
        return 0    