# backend/apps/vendors/serializers.py
# Serializers pour l'espace vendeur

from rest_framework import serializers
from .models import VendorProfile
from apps.orders.models import Order, OrderItem


# ========== SERIALIZERS PROFIL VENDEUR ==========

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


# ========== SERIALIZERS COMMANDES ==========

class VendorOrderItemSerializer(serializers.ModelSerializer):
    """Serializer pour les items de commande du vendeur"""
    product_title = serializers.CharField(source='title_snapshot', read_only=True)
    product_price = serializers.IntegerField(source='price_xaf_snapshot', read_only=True)
    product_image = serializers.SerializerMethodField()
    
    class Meta:
        model = OrderItem
        fields = [
            'id', 
            'product', 
            'product_title',
            'product_price',
            'product_image',
            'qty', 
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
    """
    Serializer pour les commandes vendeur avec séparation payment/fulfillment status
    """
    items = serializers.SerializerMethodField()
    customer_name = serializers.SerializerMethodField()
    vendor_total = serializers.SerializerMethodField()
    
    # Champs calculés en lecture seule
    is_paid = serializers.ReadOnlyField()
    can_be_fulfilled = serializers.ReadOnlyField()
    
    # Labels lisibles pour les statuts
    payment_status_display = serializers.CharField(
        source='get_payment_status_display',
        read_only=True
    )
    fulfillment_status_display = serializers.CharField(
        source='get_fulfillment_status_display',
        read_only=True
    )
    
    class Meta:
        model = Order
        fields = [
            'id',
            'customer_name',
            'customer_email',
            'customer_phone',
            'city',
            'address',
            'note',
            'payment_status',
            'payment_status_display',
            'fulfillment_status',
            'fulfillment_status_display',
            'items',
            'vendor_total',
            'subtotal_xaf',
            'delivery_fee_xaf',
            'total_xaf',
            'is_paid',
            'can_be_fulfilled',
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
        if obj.user:
            return f"{obj.user.first_name} {obj.user.last_name}".strip() or obj.user.username
        return "Client anonyme"
    
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


# ========== NOUVEAUX SERIALIZERS (MISE À JOUR STATUTS) ==========

class UpdateFulfillmentStatusSerializer(serializers.Serializer):
    """
    Serializer pour mettre à jour le statut de livraison d'une commande
    Le vendeur ne peut modifier que le fulfillment_status, pas le payment_status
    """
    fulfillment_status = serializers.ChoiceField(
        choices=Order.FulfillmentStatus.choices,
        help_text="Nouveau statut de livraison : PENDING, PROCESSING, SHIPPED, DELIVERED, CANCELLED"
    )
    
    def validate_fulfillment_status(self, value):
        """Valider le changement de statut"""
        order = self.context.get('order')
        
        if not order:
            raise serializers.ValidationError("Commande non fournie dans le contexte")
        
        # Règles de transition de statuts
        current_status = order.fulfillment_status
        
        # Une commande annulée ne peut pas changer de statut
        if current_status == Order.FulfillmentStatus.CANCELLED:
            raise serializers.ValidationError(
                "Impossible de modifier le statut d'une commande annulée"
            )
        
        # Une commande livrée ne peut être que annulée (retour)
        if current_status == Order.FulfillmentStatus.DELIVERED:
            if value != Order.FulfillmentStatus.CANCELLED:
                raise serializers.ValidationError(
                    "Une commande livrée ne peut être qu'annulée"
                )
        
        # La commande doit être payée avant d'être traitée (sauf pour annulation)
        if value != Order.FulfillmentStatus.CANCELLED:
            if not order.is_paid:
                raise serializers.ValidationError(
                    "La commande doit être payée avant de pouvoir être traitée"
                )
        
        return value
    
    def update(self, instance, validated_data):
        """Mettre à jour le statut de livraison"""
        instance.fulfillment_status = validated_data['fulfillment_status']
        instance.save()
        return instance


class UpdatePaymentStatusSerializer(serializers.Serializer):
    """
    Serializer pour mettre à jour le statut de paiement d'une commande
    Utilisé par l'app payments principalement, mais peut être utilisé manuellement par le vendeur
    """
    payment_status = serializers.ChoiceField(
        choices=Order.PaymentStatus.choices,
        help_text="Nouveau statut de paiement : PENDING, PAID, FAILED, REFUNDED"
    )
    
    def validate_payment_status(self, value):
        """Valider le changement de statut de paiement"""
        order = self.context.get('order')
        
        if not order:
            raise serializers.ValidationError("Commande non fournie dans le contexte")
        
        current_status = order.payment_status
        
        # Une fois payé, on peut seulement rembourser
        if current_status == Order.PaymentStatus.PAID:
            if value not in [Order.PaymentStatus.PAID, Order.PaymentStatus.REFUNDED]:
                raise serializers.ValidationError(
                    "Une commande payée ne peut être que maintenue payée ou remboursée"
                )
        
        # Un remboursement est définitif
        if current_status == Order.PaymentStatus.REFUNDED:
            raise serializers.ValidationError(
                "Impossible de modifier le statut d'une commande remboursée"
            )
        
        return value
    
    def update(self, instance, validated_data):
        """Mettre à jour le statut de paiement"""
        instance.payment_status = validated_data['payment_status']
        instance.save()
        return instance