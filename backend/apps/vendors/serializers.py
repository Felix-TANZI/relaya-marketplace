# backend/apps/vendors/serializers.py
# Serializers pour l'interface vendeur avec gestion des statuts de paiement et livraison

from rest_framework import serializers
from apps.orders.models import Order, OrderItem


class VendorOrderItemSerializer(serializers.ModelSerializer):
    """Serializer pour les articles d'une commande (vue vendeur)"""
    product_title = serializers.CharField(source='title_snapshot', read_only=True)
    product_price = serializers.IntegerField(source='price_xaf_snapshot', read_only=True)
    
    class Meta:
        model = OrderItem
        fields = [
            'id',
            'product',
            'product_title',
            'product_price',
            'qty',
            'line_total_xaf'
        ]


class VendorOrderSerializer(serializers.ModelSerializer):
    """
    Serializer pour les commandes (vue vendeur)
    Permet de voir et modifier le fulfillment_status uniquement
    Le payment_status est géré par l'app payments
    """
    items = VendorOrderItemSerializer(many=True, read_only=True)
    
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
            'customer_email',
            'customer_phone',
            'city',
            'address',
            'note',
            'payment_status',
            'payment_status_display',
            'fulfillment_status',
            'fulfillment_status_display',
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
            'customer_email',
            'customer_phone',
            'city',
            'address',
            'note',
            'payment_status',
            'payment_status_display',
            'subtotal_xaf',
            'delivery_fee_xaf',
            'total_xaf',
            'items',
            'is_paid',
            'can_be_fulfilled',
            'created_at',
            'updated_at'
        ]


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