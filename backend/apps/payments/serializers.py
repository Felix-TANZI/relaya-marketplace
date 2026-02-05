# backend/apps/payments/serializers.py
# Serializers pour les paiements avec utilisation du payment_status

from rest_framework import serializers
from apps.orders.models import Order
from .models import PaymentTransaction


class PaymentInitSerializer(serializers.Serializer):
    """Serializer pour initialiser un paiement"""
    order_id = serializers.IntegerField(help_text="ID de la commande à payer")
    provider = serializers.ChoiceField(
        choices=["MTN_MOMO", "ORANGE_MONEY"],
        help_text="Fournisseur de paiement mobile"
    )
    phone = serializers.CharField(
        max_length=20,
        help_text="Numéro de téléphone pour le paiement"
    )

    def validate_order_id(self, value):
        """Valider que la commande existe et peut être payée"""
        try:
            order = Order.objects.get(id=value)
        except Order.DoesNotExist:
            raise serializers.ValidationError("Commande introuvable")
        
        # Vérifier que la commande n'est pas déjà payée
        if order.payment_status == Order.PaymentStatus.PAID:
            raise serializers.ValidationError("Cette commande est déjà payée")
        
        # Vérifier que la commande n'est pas annulée
        if order.fulfillment_status == Order.FulfillmentStatus.CANCELLED:
            raise serializers.ValidationError("Cette commande est annulée")
        
        return value

    def create(self, validated_data):
        """Créer une transaction de paiement"""
        order = Order.objects.get(id=validated_data["order_id"])

        # Créer la transaction
        tx = PaymentTransaction.objects.create(
            order=order,
            provider=validated_data["provider"],
            payer_phone=validated_data["phone"],
            amount_xaf=order.total_xaf,
            status=PaymentTransaction.Status.INITIATED,
            raw_payload={"mode": "mock_v1"},
        )
        
        return tx


class PaymentTransactionSerializer(serializers.ModelSerializer):
    """Serializer pour les transactions de paiement"""
    order_payment_status = serializers.CharField(
        source='order.payment_status',
        read_only=True,
        help_text="Statut de paiement de la commande"
    )
    order_payment_status_display = serializers.CharField(
        source='order.get_payment_status_display',
        read_only=True
    )
    
    class Meta:
        model = PaymentTransaction
        fields = [
            'id',
            'order',
            'provider',
            'status',
            'amount_xaf',
            'payer_phone',
            'order_payment_status',
            'order_payment_status_display',
            'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class SimulatePaymentSerializer(serializers.Serializer):
    """Serializer pour simuler le succès d'un paiement (dev/test)"""
    success = serializers.BooleanField(
        default=True,
        help_text="Simuler un succès (true) ou un échec (false)"
    )
    
    def update(self, instance, validated_data):
        """Mettre à jour le statut de la transaction et de la commande"""
        success = validated_data.get('success', True)
        
        if success:
            # Marquer la transaction comme réussie
            instance.status = PaymentTransaction.Status.CONFIRMED
            instance.save()
            
            # Marquer la commande comme payée
            order = instance.order
            order.payment_status = Order.PaymentStatus.PAID
            order.save()
        else:
            # Marquer la transaction comme échouée
            instance.status = PaymentTransaction.Status.FAILED
            instance.save()
            
            # Marquer le paiement comme échoué
            order = instance.order
            order.payment_status = Order.PaymentStatus.FAILED
            order.save()
        
        return instance