# backend/apps/orders/serializers.py
# Serializers pour les commandes avec séparation payment_status et fulfillment_status

from rest_framework import serializers
from .models import Order, OrderItem
from apps.catalog.models import Product


class OrderItemSerializer(serializers.ModelSerializer):
    """Serializer pour les articles d'une commande"""
    
    class Meta:
        model = OrderItem
        fields = [
            'id',
            'product',
            'title_snapshot',
            'price_xaf_snapshot',
            'qty',
            'line_total_xaf'
        ]
        read_only_fields = ['id', 'line_total_xaf']


class OrderSerializer(serializers.ModelSerializer):
    """
    Serializer pour les commandes avec les deux statuts séparés :
    - payment_status : état du paiement
    - fulfillment_status : état de la livraison
    """
    items = OrderItemSerializer(many=True, read_only=True)
    
    # Champs en lecture seule calculés
    is_paid = serializers.ReadOnlyField()
    can_be_fulfilled = serializers.ReadOnlyField()
    
    class Meta:
        model = Order
        fields = [
            'id',
            'user',
            'customer_email',
            'customer_phone',
            'city',
            'address',
            'note',
            'payment_status',
            'fulfillment_status',
            'subtotal_xaf',
            'delivery_fee_xaf',
            'total_xaf',
            'items',
            'is_paid',
            'can_be_fulfilled',
            'created_at',
            'updated_at'
        ]
        read_only_fields = [
            'id',
            'user',
            'subtotal_xaf',
            'delivery_fee_xaf',
            'total_xaf',
            'is_paid',
            'can_be_fulfilled',
            'created_at',
            'updated_at'
        ]


class OrderCreateSerializer(serializers.Serializer):
    """Serializer pour créer une nouvelle commande"""
    
    cart_items = serializers.ListField(
        child=serializers.DictField(),
        min_length=1,
        help_text="Liste des articles du panier avec product_id et qty"
    )
    city = serializers.ChoiceField(
        choices=['YAOUNDE', 'DOUALA'],
        help_text="Ville de livraison"
    )
    address = serializers.CharField(
        max_length=255,
        help_text="Adresse complète de livraison"
    )
    customer_phone = serializers.CharField(
        max_length=20,
        help_text="Numéro de téléphone du client"
    )
    customer_email = serializers.EmailField(
        required=False,
        allow_blank=True,
        help_text="Email du client (optionnel)"
    )
    note = serializers.CharField(
        required=False,
        allow_blank=True,
        help_text="Note pour la livraison (optionnel)"
    )

    def validate_cart_items(self, value):
        """Valider les articles du panier"""
        for item in value:
            if 'product_id' not in item or 'qty' not in item:
                raise serializers.ValidationError(
                    "Chaque article doit avoir 'product_id' et 'qty'"
                )
            
            if not isinstance(item['qty'], int) or item['qty'] < 1:
                raise serializers.ValidationError(
                    "La quantité doit être un entier positif"
                )
        
        return value

    def create(self, validated_data):
        """Créer une nouvelle commande"""
        from apps.shipping.models import ShippingRate
        
        cart_items = validated_data.pop('cart_items')
        user = self.context['request'].user if self.context['request'].user.is_authenticated else None
        
        # Calculer le sous-total
        subtotal = 0
        order_items_data = []
        
        for item in cart_items:
            try:
                product = Product.objects.get(id=item['product_id'])
            except Product.DoesNotExist:
                raise serializers.ValidationError(
                    f"Produit {item['product_id']} introuvable"
                )
            
            qty = item['qty']
            line_total = product.price_xaf * qty
            subtotal += line_total
            
            order_items_data.append({
                'product': product,
                'title_snapshot': product.title,
                'price_xaf_snapshot': product.price_xaf,
                'qty': qty,
                'line_total_xaf': line_total
            })
        
        # Calculer les frais de livraison
        try:
            shipping_rate = ShippingRate.objects.get(
                city=validated_data['city'],
                is_active=True
            )
            delivery_fee = shipping_rate.rate_xaf
        except ShippingRate.DoesNotExist:
            delivery_fee = 2000  # Frais par défaut
        
        # Créer la commande
        order = Order.objects.create(
            user=user,
            customer_email=validated_data.get('customer_email', ''),
            customer_phone=validated_data['customer_phone'],
            city=validated_data['city'],
            address=validated_data['address'],
            note=validated_data.get('note', ''),
            subtotal_xaf=subtotal,
            delivery_fee_xaf=delivery_fee,
            total_xaf=subtotal + delivery_fee,
            payment_status=Order.PaymentStatus.PENDING,
            fulfillment_status=Order.FulfillmentStatus.PENDING
        )
        
        # Créer les articles de la commande
        for item_data in order_items_data:
            OrderItem.objects.create(order=order, **item_data)
        
        return order