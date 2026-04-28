# backend/apps/orders/serializers.py
# Serializers pour les commandes avec séparation payment_status et fulfillment_status

from rest_framework import serializers
from django.conf import settings as django_settings
from django.db.models import Count, Q
from .models import Order, OrderItem, Dispute, DisputeMessage
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


class OrderDetailSerializer(serializers.ModelSerializer):
    """
    Serializer pour les commandes avec les deux statuts séparés :
    - payment_status : état du paiement
    - fulfillment_status : état de la livraison
    """
    items = OrderItemSerializer(many=True, read_only=True)
    delivery_mode = serializers.CharField(source='delivery_method', read_only=True)
    
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
            'delivery_mode',
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
    
    delivery_mode = serializers.ChoiceField(
        choices=['DELIVERY', 'PICKUP'],
        required=False,
        default='DELIVERY',
        help_text="Mode de reception: livraison ou retrait en boutique"
    )
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
        required=False,
        allow_blank=True,
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
        from .models import PlatformSettings
        from apps.shipping.models import Shipment, ShipmentEvent
        from apps.orders.models import OrderHistory
        from apps.accounts.models import CourierProfile, UserNotification

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
        
        delivery_mode = validated_data.get('delivery_mode', 'DELIVERY')

        # Calculer les frais de livraison
        settings = PlatformSettings.get_settings()
        delivery_fees = settings.delivery_fees or {}
        delivery_fee = 0 if delivery_mode == 'PICKUP' else delivery_fees.get(validated_data['city'], 2000)

        address = validated_data.get('address', '').strip()
        if delivery_mode == 'DELIVERY' and not address:
            raise serializers.ValidationError({
                'address': "L'adresse est obligatoire pour une livraison."
            })

        if delivery_mode == 'PICKUP':
            address = f"Retrait en boutique - {validated_data['city']}"

        note = validated_data.get('note', '').strip()
        if delivery_mode == 'PICKUP':
            note = f"[PICKUP] {note}".strip()
        
        # Créer la commande avec l'ancien format de status
        order = Order.objects.create(
            user=user,
            customer_email=validated_data.get('customer_email', ''),
            customer_phone=validated_data['customer_phone'],
            delivery_method=delivery_mode,
            city=validated_data['city'],
            address=address,
            note=note,
            subtotal_xaf=subtotal,
            delivery_fee_xaf=delivery_fee,
            total_xaf=subtotal + delivery_fee,
            payment_status=Order.PaymentStatus.PENDING,
            fulfillment_status=Order.FulfillmentStatus.CREATED,
        )
        
        # Créer les articles de la commande
        for item_data in order_items_data:
            OrderItem.objects.create(order=order, **item_data)

        shipment = Shipment.objects.create(order=order, status=Shipment.Status.CREATED)
        ShipmentEvent.objects.create(
            shipment=shipment,
            status=Shipment.Status.CREATED,
            message="Commande recuee et en attente de prise en charge",
            location=order.city,
        )

        # En mode local/dev, on court-circuite le paiement externe pour fluidifier les tests.
        if django_settings.DEBUG:
            order.confirm_payment()
            OrderHistory.objects.create(
                order=order,
                user=user,
                action="Paiement simulé automatiquement (dev)",
                field_name="payment_status",
                old_value=Order.PaymentStatus.PENDING,
                new_value=Order.PaymentStatus.PAID,
            )

            order.release_to_vendor()
            OrderHistory.objects.create(
                order=order,
                user=user,
                action="Fonds libérés automatiquement au vendeur (dev)",
                field_name="escrow_status",
                old_value=Order.EscrowStatus.BLOCKED,
                new_value=Order.EscrowStatus.RELEASED,
            )

        if delivery_mode == 'DELIVERY':
            active_statuses = [
                Shipment.Status.ASSIGNED,
                Shipment.Status.PICKED_UP,
                Shipment.Status.OUT_FOR_DELIVERY,
            ]
            city = (order.city or "").strip()
            courier = (
                CourierProfile.objects.filter(
                    is_active=True,
                    is_approved=True,
                    is_online=True,
                )
                .filter(Q(city__iexact=city) | Q(zones__icontains=city))
                .annotate(active_shipments_count=Count("shipments", filter=Q(shipments__status__in=active_statuses)))
                .order_by("active_shipments_count", "updated_at")
                .select_related("user")
                .first()
            )

            if courier:
                shipment.courier = courier
                shipment.courier_name = courier.user.get_full_name().strip() or courier.user.username
                shipment.courier_phone = courier.phone
                shipment.status = Shipment.Status.ASSIGNED
                shipment.save(update_fields=["courier", "courier_name", "courier_phone", "status", "updated_at"])
                order.assign_driver()
                ShipmentEvent.objects.create(
                    shipment=shipment,
                    status=Shipment.Status.ASSIGNED,
                    message="Livraison assignee automatiquement au livreur disponible",
                    location=order.city,
                )
                UserNotification.objects.create(
                    user=courier.user,
                    title=f"Nouvelle livraison #{order.id}",
                    message=f"Une commande est disponible dans ta tournee: {order.city} - {order.address}.",
                    notification_type=UserNotification.NotificationType.ORDER,
                    action_url="/courier",
                )
        
        return order


class DisputeMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.SerializerMethodField()

    class Meta:
        model = DisputeMessage
        fields = ['id', 'sender', 'sender_name', 'message', 'is_internal', 'created_at']
        read_only_fields = fields

    def get_sender_name(self, obj):
        return obj.sender.get_full_name() or obj.sender.username


class DisputeSerializer(serializers.ModelSerializer):
    messages = DisputeMessageSerializer(many=True, read_only=True)

    class Meta:
        model = Dispute
        fields = [
            'id',
            'order',
            'opened_by',
            'reason',
            'status',
            'description',
            'resolution',
            'resolution_note',
            'refund_amount_xaf',
            'created_at',
            'updated_at',
            'messages',
        ]
        read_only_fields = [
            'id',
            'order',
            'opened_by',
            'status',
            'resolution',
            'resolution_note',
            'refund_amount_xaf',
            'created_at',
            'updated_at',
            'messages',
        ]


class DisputeCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Dispute
        fields = ['reason', 'description']


class DisputeMessageCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = DisputeMessage
        fields = ['message']
