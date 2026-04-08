# backend/apps/vendors/serializers.py
# Serializers espace vendeur BelivaY.
#
# Confidentialité client (côté vendeur) :
#   customer_name  → "Acheteur #XXXX"  (code anonyme basé sur un hash SHA-256 de l'user.id)
#   customer_phone → "Confidentiel"     (totalement masqué)
#   customer_email → non exposé dans VendorOrderSerializer
#
# Ce code est cohérent : le même acheteur aura toujours le même code "Acheteur #XXXX"
# sur toutes ses commandes, permettant de repérer les clients réguliers sans révéler
# leur identité.
#
# Commission :
#   Calculée depuis Order.commission_rate_snapshot (jamais codée en dur).
#   Tout vient de PlatformSettings, modifiable par l'admin.

import hashlib
from rest_framework import serializers
from .models import VendorProfile
from apps.orders.models import Order, OrderItem


# ─────────────────────────────────────────────────────────────────────────────
# PROFIL VENDEUR
# ─────────────────────────────────────────────────────────────────────────────

class VendorProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    email    = serializers.EmailField(source='user.email',    read_only=True)

    class Meta:
        model = VendorProfile
        fields = [
            'id', 'username', 'email', 'business_name', 'business_description',
            'phone', 'address', 'city', 'id_document', 'status',
            'created_at', 'updated_at', 'approved_at',
        ]
        read_only_fields = ['id', 'status', 'created_at', 'updated_at', 'approved_at']


class VendorApplicationSerializer(serializers.ModelSerializer):
    class Meta:
        model = VendorProfile
        fields = ['business_name', 'business_description', 'phone', 'address', 'city', 'id_document']

    def validate(self, data):
        if VendorProfile.objects.filter(user=self.context['request'].user).exists():
            raise serializers.ValidationError("Vous avez déjà une demande vendeur.")
        return data

    def create(self, validated_data):
        return VendorProfile.objects.create(user=self.context['request'].user, **validated_data)


class VendorStatsSerializer(serializers.Serializer):
    total_products  = serializers.IntegerField()
    active_products = serializers.IntegerField()
    total_orders    = serializers.IntegerField()
    total_revenue   = serializers.DecimalField(max_digits=10, decimal_places=2)


# ─────────────────────────────────────────────────────────────────────────────
# COMMANDES VENDEUR
# ─────────────────────────────────────────────────────────────────────────────

class VendorOrderItemSerializer(serializers.ModelSerializer):
    product_title = serializers.CharField(source='title_snapshot',      read_only=True)
    product_price = serializers.IntegerField(source='price_xaf_snapshot', read_only=True)
    product_image = serializers.SerializerMethodField()

    class Meta:
        model  = OrderItem
        fields = [
            'id', 'product', 'product_title', 'product_price',
            'product_image', 'qty', 'line_total_xaf', 'created_at',
        ]
        read_only_fields = fields

    def get_product_image(self, obj):
        if obj.product and hasattr(obj.product, 'images'):
            img = (
                obj.product.images.filter(is_primary=True).first()
                or obj.product.images.first()
            )
            if img and img.image:
                request = self.context.get('request')
                return request.build_absolute_uri(img.image.url) if request else img.image.url
        return None


class VendorOrderSerializer(serializers.ModelSerializer):
    """
    Commande vue vendeur.

    Confidentialité :
      - customer_name  → "Acheteur #XXXX" (code hash SHA-256 sur l'user.id, 4 chars)
      - customer_phone → "Confidentiel"
      - customer_email → non exposé

    Finances vendeur :
      - vendor_subtotal   : total des articles du vendeur avant commission
      - commission_rate   : taux snapshot de la commande (ex : 12.0)
      - commission_amount : BelivaY prélève ce montant
      - vendor_net_amount : ce que le vendeur recevra = vendor_subtotal - commission_amount
    """

    items                    = serializers.SerializerMethodField()
    customer_name            = serializers.SerializerMethodField()
    customer_phone           = serializers.SerializerMethodField()
    vendor_subtotal          = serializers.SerializerMethodField()
    commission_rate          = serializers.SerializerMethodField()
    commission_amount        = serializers.SerializerMethodField()
    vendor_net_amount        = serializers.SerializerMethodField()

    is_paid          = serializers.ReadOnlyField()
    can_be_fulfilled = serializers.ReadOnlyField()

    payment_status_display     = serializers.CharField(
        source='get_payment_status_display', read_only=True,
    )
    fulfillment_status_display = serializers.CharField(
        source='get_fulfillment_status_display', read_only=True,
    )
    escrow_status_display      = serializers.CharField(
        source='get_escrow_status_display', read_only=True,
    )

    class Meta:
        model  = Order
        fields = [
            'id', 'city', 'address', 'note',
            'customer_name', 'customer_phone',
            'payment_status',     'payment_status_display',
            'fulfillment_status', 'fulfillment_status_display',
            'escrow_status',      'escrow_status_display',
            'vendor_reply_deadline',
            'commission_rate_snapshot',
            'subtotal_xaf', 'delivery_fee_xaf', 'total_xaf',
            'vendor_subtotal', 'commission_rate', 'commission_amount', 'vendor_net_amount',
            'items',
            'is_paid', 'can_be_fulfilled',
            'created_at', 'updated_at',
        ]
        read_only_fields = fields

    # ── Confidentialité ───────────────────────────────────────────────────────

    def get_customer_name(self, obj) -> str:
        """
        Retourne un code anonyme non-réversible basé sur un hash SHA-256 de l'user.id.
        Exemple : "Acheteur #A3F7"
        Le même acheteur aura toujours le même code → repérage sans identification.
        """
        if obj.user:
            raw  = hashlib.sha256(str(obj.user_id).encode()).hexdigest()
            code = raw[:4].upper()
            return f"Acheteur #{code}"
        return "Acheteur"

    def get_customer_phone(self, obj) -> str:
        """Numéro de téléphone totalement masqué pour le vendeur."""
        return "Confidentiel"

    # ── Finances ─────────────────────────────────────────────────────────────

    def _vendor_items(self, obj):
        vendor = self.context.get('vendor')
        return obj.items.filter(product__vendor=vendor) if vendor else obj.items.none()

    def get_vendor_subtotal(self, obj) -> int:
        return sum(item.line_total_xaf for item in self._vendor_items(obj))

    def get_commission_rate(self, obj) -> float:
        return float(obj.commission_rate_snapshot)

    def get_commission_amount(self, obj) -> int:
        return round(self.get_vendor_subtotal(obj) * float(obj.commission_rate_snapshot) / 100)

    def get_vendor_net_amount(self, obj) -> int:
        return self.get_vendor_subtotal(obj) - self.get_commission_amount(obj)

    # ── Articles ─────────────────────────────────────────────────────────────

    def get_items(self, obj):
        return VendorOrderItemSerializer(
            self._vendor_items(obj), many=True, context=self.context
        ).data


# ─────────────────────────────────────────────────────────────────────────────
# TRANSITIONS STATUT — VENDEUR
# ─────────────────────────────────────────────────────────────────────────────

# Source de vérité : seules ces transitions sont acceptées par le backend pour un vendeur.
VENDOR_TRANSITIONS = {
    Order.FulfillmentStatus.PAID_IN_ESCROW:    [
        Order.FulfillmentStatus.VENDOR_ACKNOWLEDGED,
        Order.FulfillmentStatus.CANCELLED,
    ],
    Order.FulfillmentStatus.VENDOR_ACKNOWLEDGED: [
        Order.FulfillmentStatus.PREPARING,
        Order.FulfillmentStatus.CANCELLED,
    ],
    Order.FulfillmentStatus.PREPARING: [
        Order.FulfillmentStatus.READY_FOR_PICKUP,
    ],
}


class UpdateFulfillmentStatusSerializer(serializers.Serializer):
    """
    Transition de statut livraison par le vendeur.
    Seules les transitions de VENDOR_TRANSITIONS sont autorisées.
    """
    fulfillment_status = serializers.ChoiceField(choices=Order.FulfillmentStatus.choices)

    def validate_fulfillment_status(self, value):
        order = self.context.get('order')
        if not order:
            raise serializers.ValidationError("Commande non fournie dans le contexte.")

        current = order.fulfillment_status
        allowed = VENDOR_TRANSITIONS.get(current, [])

        if value not in allowed:
            labels  = dict(Order.FulfillmentStatus.choices)
            allowed_labels = [labels.get(s, s) for s in allowed]
            raise serializers.ValidationError(
                f"Transition interdite depuis '{labels.get(current, current)}'. "
                f"Autorisées : {allowed_labels or ['aucune']}."
            )

        if value != Order.FulfillmentStatus.CANCELLED and not order.is_paid:
            raise serializers.ValidationError(
                "La commande doit être payée avant de pouvoir être traitée."
            )

        return value

    def update(self, instance, validated_data):
        from apps.orders.models import OrderHistory

        new_status = validated_data['fulfillment_status']
        old_status = instance.fulfillment_status

        instance.fulfillment_status = new_status

        # Annulation d'une commande payée → remboursement escrow
        if new_status == Order.FulfillmentStatus.CANCELLED and instance.is_paid:
            instance.escrow_status = Order.EscrowStatus.REFUNDED

        instance.save()

        OrderHistory.objects.create(
            order     = instance,
            action    = "Statut livraison modifié par le vendeur",
            field_name= "fulfillment_status",
            old_value = old_status,
            new_value = new_status,
        )

        return instance


class UpdatePaymentStatusSerializer(serializers.Serializer):
    """
    Mise à jour du statut de paiement (admin / système paiement).
    PENDING → PAID déclenche automatiquement le cycle escrow.
    """
    payment_status = serializers.ChoiceField(choices=Order.PaymentStatus.choices)

    def validate_payment_status(self, value):
        order = self.context.get('order')
        if not order:
            raise serializers.ValidationError("Commande non fournie dans le contexte.")

        current = order.payment_status

        if current == Order.PaymentStatus.PAID:
            if value not in [Order.PaymentStatus.PAID, Order.PaymentStatus.REFUNDED]:
                raise serializers.ValidationError(
                    "Une commande payée ne peut être que maintenue ou remboursée."
                )

        if current == Order.PaymentStatus.REFUNDED:
            raise serializers.ValidationError(
                "Impossible de modifier une commande déjà remboursée."
            )

        return value

    def update(self, instance, validated_data):
        from apps.orders.models import OrderHistory

        new_status = validated_data['payment_status']
        old_status = instance.payment_status

        if new_status == Order.PaymentStatus.PAID:
            # confirm_payment() met à jour fulfillment, escrow, deadline et sauvegarde
            instance.confirm_payment()
            OrderHistory.objects.create(
                order=instance, action="Paiement confirmé — escrow déclenché",
                field_name="payment_status", old_value=old_status, new_value=new_status,
            )
            return instance

        instance.payment_status = new_status

        if new_status == Order.PaymentStatus.REFUNDED:
            instance.escrow_status      = Order.EscrowStatus.REFUNDED
            instance.fulfillment_status = Order.FulfillmentStatus.REFUNDED

        instance.save()

        OrderHistory.objects.create(
            order=instance, action="Statut paiement modifié",
            field_name="payment_status", old_value=old_status, new_value=new_status,
        )

        return instance


# ─────────────────────────────────────────────────────────────────────────────
# ADMINISTRATION — DASHBOARD
# ─────────────────────────────────────────────────────────────────────────────

class AdminDashboardStatsSerializer(serializers.Serializer):
    # Utilisateurs
    total_users     = serializers.IntegerField()
    new_users_today = serializers.IntegerField()
    new_users_week  = serializers.IntegerField()
    new_users_month = serializers.IntegerField()
    # Vendeurs
    total_vendors     = serializers.IntegerField()
    pending_vendors   = serializers.IntegerField()
    approved_vendors  = serializers.IntegerField()
    rejected_vendors  = serializers.IntegerField()
    suspended_vendors = serializers.IntegerField()
    # Produits
    total_products    = serializers.IntegerField()
    active_products   = serializers.IntegerField()
    inactive_products = serializers.IntegerField()
    # Commandes
    total_orders      = serializers.IntegerField()
    pending_orders    = serializers.IntegerField()
    processing_orders = serializers.IntegerField()
    shipped_orders    = serializers.IntegerField()
    delivered_orders  = serializers.IntegerField()
    cancelled_orders  = serializers.IntegerField()
    # Revenus
    revenue_total   = serializers.IntegerField()
    revenue_today   = serializers.IntegerField()
    revenue_week    = serializers.IntegerField()
    revenue_month   = serializers.IntegerField()
    # Paiements
    paid_orders     = serializers.IntegerField()
    unpaid_orders   = serializers.IntegerField()
    failed_payments = serializers.IntegerField()


# ─────────────────────────────────────────────────────────────────────────────
# ADMINISTRATION — UTILISATEURS
# ─────────────────────────────────────────────────────────────────────────────

class AdminUserListSerializer(serializers.ModelSerializer):
    is_vendor     = serializers.SerializerMethodField()
    vendor_status = serializers.SerializerMethodField()
    orders_count  = serializers.SerializerMethodField()
    total_spent   = serializers.SerializerMethodField()

    class Meta:
        from django.contrib.auth.models import User
        model  = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'is_staff', 'is_active', 'is_superuser',
            'date_joined', 'last_login',
            'is_vendor', 'vendor_status',
            'orders_count', 'total_spent',
        ]

    def get_is_vendor(self, obj):
        return hasattr(obj, 'vendor_profile')

    def get_vendor_status(self, obj):
        if hasattr(obj, 'vendor_profile'):
            return obj.vendor_profile.status
        return None

    def get_orders_count(self, obj):
        return obj.orders.count()

    def get_total_spent(self, obj):
        from django.db.models import Sum
        return obj.orders.filter(payment_status='PAID').aggregate(
            t=Sum('total_xaf')
        )['t'] or 0


class AdminUserDetailSerializer(serializers.ModelSerializer):
    is_vendor      = serializers.SerializerMethodField()
    vendor_profile = serializers.SerializerMethodField()
    profile        = serializers.SerializerMethodField()
    activity_logs  = serializers.SerializerMethodField()
    stats          = serializers.SerializerMethodField()

    class Meta:
        from django.contrib.auth.models import User
        model  = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'is_staff', 'is_active', 'is_superuser',
            'date_joined', 'last_login',
            'is_vendor', 'vendor_profile', 'profile',
            'activity_logs', 'stats',
        ]

    def get_is_vendor(self, obj):
        return hasattr(obj, 'vendor_profile')

    def get_vendor_profile(self, obj):
        if hasattr(obj, 'vendor_profile'):
            return VendorProfileSerializer(obj.vendor_profile).data
        return None

    def get_profile(self, obj):
        if hasattr(obj, 'profile'):
            return {
                'phone':                 obj.profile.phone,
                'bio':                   obj.profile.bio,
                'is_banned':             obj.profile.is_banned,
                'ban_reason':            obj.profile.ban_reason,
                'banned_at':             obj.profile.banned_at,
                'banned_by':             obj.profile.banned_by.username if obj.profile.banned_by else None,
                'newsletter_subscribed': obj.profile.newsletter_subscribed,
            }
        return None

    def get_activity_logs(self, obj):
        return []

    def get_stats(self, obj):
        from django.db.models import Sum
        orders     = obj.orders.all()
        paid       = orders.filter(payment_status='PAID')
        total_paid = paid.count()
        total_xaf  = paid.aggregate(t=Sum('total_xaf'))['t'] or 0
        return {
            'total_orders':        orders.count(),
            'paid_orders':         total_paid,
            'pending_orders':      orders.filter(payment_status='PENDING').count(),
            'total_spent':         total_xaf,
            'average_order_value': int(total_xaf / total_paid) if total_paid else 0,
        }


class AdminUserUpdateSerializer(serializers.Serializer):
    is_staff     = serializers.BooleanField(required=False)
    is_active    = serializers.BooleanField(required=False)
    is_superuser = serializers.BooleanField(required=False)
    first_name   = serializers.CharField(required=False, allow_blank=True)
    last_name    = serializers.CharField(required=False, allow_blank=True)
    email        = serializers.EmailField(required=False)


# ─────────────────────────────────────────────────────────────────────────────
# ADMINISTRATION — LITIGES
# ─────────────────────────────────────────────────────────────────────────────

class DisputeMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source='sender.username', read_only=True)

    class Meta:
        from apps.orders.models import DisputeMessage
        model  = DisputeMessage
        fields = ['id', 'sender', 'sender_name', 'message', 'is_internal', 'created_at']


class DisputeEvidenceSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.CharField(source='uploaded_by.username', read_only=True)
    file_url         = serializers.SerializerMethodField()

    class Meta:
        from apps.orders.models import DisputeEvidence
        model  = DisputeEvidence
        fields = ['id', 'uploaded_by', 'uploaded_by_name', 'file', 'file_url', 'description', 'created_at']

    def get_file_url(self, obj):
        request = self.context.get('request')
        if request and obj.file:
            return request.build_absolute_uri(obj.file.url)
        return None


class AdminDisputeListSerializer(serializers.ModelSerializer):
    order_id       = serializers.IntegerField(source='order.id',        read_only=True)
    customer_name  = serializers.SerializerMethodField()
    opened_by_name = serializers.CharField(source='opened_by.username', read_only=True)
    messages_count = serializers.SerializerMethodField()

    class Meta:
        from apps.orders.models import Dispute
        model  = Dispute
        fields = [
            'id', 'order', 'order_id', 'opened_by', 'opened_by_name',
            'customer_name', 'reason', 'status', 'resolution',
            'messages_count', 'created_at', 'updated_at',
        ]

    def get_customer_name(self, obj):
        if obj.order.user:
            return obj.order.user.username
        return obj.order.customer_email or 'Invité'

    def get_messages_count(self, obj):
        return obj.messages.count()


class AdminDisputeDetailSerializer(serializers.ModelSerializer):
    order_detail     = serializers.SerializerMethodField()
    opened_by_name   = serializers.CharField(source='opened_by.username',  read_only=True)
    resolved_by_name = serializers.CharField(source='resolved_by.username', read_only=True, default=None)
    messages         = DisputeMessageSerializer(many=True, read_only=True)
    evidences        = DisputeEvidenceSerializer(many=True, read_only=True)

    class Meta:
        from apps.orders.models import Dispute
        model  = Dispute
        fields = [
            'id', 'order', 'order_detail', 'opened_by', 'opened_by_name',
            'reason', 'status', 'description',
            'resolution', 'resolution_note', 'resolved_by', 'resolved_by_name', 'resolved_at',
            'refund_amount_xaf',
            'messages', 'evidences',
            'created_at', 'updated_at',
        ]

    def get_order_detail(self, obj):
        return {
            'id':                 obj.order.id,
            'total_xaf':          obj.order.total_xaf,
            'payment_status':     obj.order.payment_status,
            'fulfillment_status': obj.order.fulfillment_status,
            'escrow_status':      obj.order.escrow_status,
            'created_at':         obj.order.created_at,
        }


class AdminDisputeUpdateSerializer(serializers.Serializer):
    status            = serializers.ChoiceField(choices=['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'], required=False)
    resolution        = serializers.ChoiceField(choices=['REFUND', 'EXCHANGE', 'PARTIAL_REFUND', 'REJECTED', 'OTHER'], required=False)
    resolution_note   = serializers.CharField(required=False, allow_blank=True)
    refund_amount_xaf = serializers.IntegerField(required=False, allow_null=True)


class DisputeMessageCreateSerializer(serializers.Serializer):
    message     = serializers.CharField()
    is_internal = serializers.BooleanField(default=False)


# ─────────────────────────────────────────────────────────────────────────────
# ADMINISTRATION — COMMANDES (admin voit tout, rien n'est masqué)
# ─────────────────────────────────────────────────────────────────────────────

class OrderHistorySerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.username', read_only=True, default='Système')

    class Meta:
        from apps.orders.models import OrderHistory
        model  = OrderHistory
        fields = ['id', 'user', 'user_name', 'action', 'field_name', 'old_value', 'new_value', 'timestamp', 'ip_address']


class AdminOrderItemSerializer(serializers.Serializer):
    id                 = serializers.IntegerField()
    product_id         = serializers.IntegerField()
    product_title      = serializers.CharField()
    product_image      = serializers.CharField(allow_null=True)
    vendor_name        = serializers.CharField()
    qty                = serializers.IntegerField()
    price_xaf_snapshot = serializers.IntegerField()
    line_total_xaf     = serializers.IntegerField()


class AdminOrderListSerializer(serializers.ModelSerializer):
    """Admin — toutes les données client, rien masqué."""
    customer_name     = serializers.SerializerMethodField()
    items_count       = serializers.SerializerMethodField()
    vendor_names      = serializers.SerializerMethodField()
    commission_amount = serializers.SerializerMethodField()

    class Meta:
        from apps.orders.models import Order as OModel
        model  = OModel
        fields = [
            'id', 'customer_name', 'customer_email', 'customer_phone',
            'city', 'payment_status', 'fulfillment_status', 'escrow_status',
            'subtotal_xaf', 'delivery_fee_xaf', 'total_xaf',
            'commission_rate_snapshot', 'commission_amount',
            'items_count', 'vendor_names',
            'created_at', 'updated_at',
        ]

    def get_customer_name(self, obj):
        if obj.user:
            return f"{obj.user.first_name} {obj.user.last_name}".strip() or obj.user.username
        return "Invité"

    def get_items_count(self, obj):
        return obj.items.count()

    def get_vendor_names(self, obj):
        return list(obj.items.values_list('product__vendor__username', flat=True).distinct())

    def get_commission_amount(self, obj):
        return round(obj.subtotal_xaf * float(obj.commission_rate_snapshot) / 100)


class AdminOrderDetailSerializer(serializers.ModelSerializer):
    customer_name        = serializers.SerializerMethodField()
    items                = serializers.SerializerMethodField()
    history              = OrderHistorySerializer(many=True, read_only=True)
    payment_transactions = serializers.SerializerMethodField()
    commission_amount    = serializers.SerializerMethodField()

    class Meta:
        from apps.orders.models import Order as OModel
        model  = OModel
        fields = [
            'id', 'user', 'customer_name', 'customer_email', 'customer_phone',
            'city', 'address', 'note',
            'payment_status', 'fulfillment_status', 'escrow_status',
            'subtotal_xaf', 'delivery_fee_xaf', 'total_xaf',
            'commission_rate_snapshot', 'commission_amount',
            'vendor_reply_deadline',
            'items', 'history', 'payment_transactions',
            'created_at', 'updated_at',
        ]

    def get_customer_name(self, obj):
        if obj.user:
            return f"{obj.user.first_name} {obj.user.last_name}".strip() or obj.user.username
        return "Invité"

    def get_commission_amount(self, obj):
        return round(obj.subtotal_xaf * float(obj.commission_rate_snapshot) / 100)

    def get_items(self, obj):
        items_data = []
        for item in obj.items.select_related(
            'product', 'product__vendor'
        ).prefetch_related('product__images'):
            img = item.product.images.filter(is_primary=True).first()
            image_url = None
            if img:
                request = self.context.get('request')
                if request:
                    image_url = request.build_absolute_uri(img.image.url)
            items_data.append({
                'id':                 item.id,
                'product_id':         item.product.id,
                'product_title':      item.title_snapshot,
                'product_image':      image_url,
                'vendor_name':        item.product.vendor.username if item.product.vendor else 'N/A',
                'qty':                item.qty,
                'price_xaf_snapshot': item.price_xaf_snapshot,
                'line_total_xaf':     item.line_total_xaf,
            })
        return items_data

    def get_payment_transactions(self, obj):
        from apps.payments.models import PaymentTransaction
        txs = PaymentTransaction.objects.filter(order=obj).order_by('-created_at')
        return [
            {
                'id':           str(tx.id),
                'provider':     tx.provider,
                'status':       tx.status,
                'amount_xaf':   tx.amount_xaf,
                'payer_phone':  tx.payer_phone,
                'external_ref': tx.external_ref,
                'created_at':   tx.created_at,
            }
            for tx in txs
        ]


class AdminOrderUpdateSerializer(serializers.Serializer):
    """Admin peut modifier n'importe quel statut (cycle complet)."""
    payment_status     = serializers.ChoiceField(choices=Order.PaymentStatus.choices,     required=False)
    fulfillment_status = serializers.ChoiceField(choices=Order.FulfillmentStatus.choices, required=False)
    escrow_status      = serializers.ChoiceField(choices=Order.EscrowStatus.choices,      required=False)
    note               = serializers.CharField(required=False, allow_blank=True)


# ─────────────────────────────────────────────────────────────────────────────
# ADMINISTRATION — PRODUITS
# ─────────────────────────────────────────────────────────────────────────────

class AdminProductListSerializer(serializers.ModelSerializer):
    vendor_name     = serializers.CharField(source='vendor.username',                         read_only=True)
    vendor_business = serializers.CharField(source='vendor.vendor_profile.business_name',     read_only=True, default='N/A')
    category_name   = serializers.CharField(source='category.name',                           read_only=True)
    stock_quantity  = serializers.SerializerMethodField()
    images_count    = serializers.SerializerMethodField()

    class Meta:
        from apps.catalog.models import Product
        model  = Product
        fields = [
            'id', 'title', 'slug', 'price_xaf', 'is_active',
            'vendor', 'vendor_name', 'vendor_business',
            'category', 'category_name',
            'stock_quantity', 'images_count',
            'created_at', 'updated_at',
        ]

    def get_stock_quantity(self, obj):
        try:
            return obj.inventory.quantity
        except Exception:
            return 0

    def get_images_count(self, obj):
        return obj.images.count()


class AdminProductUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        from apps.catalog.models import Product
        model  = Product
        fields = ['title', 'description', 'price_xaf', 'is_active', 'category']


# ─────────────────────────────────────────────────────────────────────────────
# ADMINISTRATION — ANALYTICS
# ─────────────────────────────────────────────────────────────────────────────

class RevenueDataPointSerializer(serializers.Serializer):
    date    = serializers.DateField()
    revenue = serializers.IntegerField()
    orders  = serializers.IntegerField()


class TopProductSerializer(serializers.Serializer):
    product_id     = serializers.IntegerField()
    product_title  = serializers.CharField()
    total_quantity = serializers.IntegerField()
    total_revenue  = serializers.IntegerField()


class TopVendorSerializer(serializers.Serializer):
    vendor_id     = serializers.IntegerField()
    vendor_name   = serializers.CharField()
    business_name = serializers.CharField()
    total_revenue = serializers.IntegerField()
    total_orders  = serializers.IntegerField()


class RecentActivitySerializer(serializers.Serializer):
    type        = serializers.CharField()
    description = serializers.CharField()
    timestamp   = serializers.DateTimeField()
    user        = serializers.CharField(required=False)
    amount      = serializers.IntegerField(required=False)


class AdminAnalyticsSerializer(serializers.Serializer):
    revenue_chart        = RevenueDataPointSerializer(many=True)
    top_products         = TopProductSerializer(many=True)
    top_vendors          = TopVendorSerializer(many=True)
    recent_activity      = RecentActivitySerializer(many=True)
    average_order_value  = serializers.IntegerField()
    conversion_rate      = serializers.FloatField()
    total_revenue_growth = serializers.FloatField()


# ─────────────────────────────────────────────────────────────────────────────
# ADMINISTRATION — PARAMÈTRES PLATEFORME
# ─────────────────────────────────────────────────────────────────────────────

class PlatformSettingsSerializer(serializers.ModelSerializer):
    """
    Tous les paramètres configurables par l'admin.
    Le frontend charge ce serializer via l'API — aucune valeur n'est codée en dur côté client.
    """
    updated_by_name = serializers.CharField(source='updated_by.username', read_only=True, default='Système')

    class Meta:
        from apps.orders.models import PlatformSettings
        model  = PlatformSettings
        fields = [
            'id',
            'platform_commission_percent',
            'mobile_money_fee_percent',
            'delivery_fees',
            'vendor_reply_h',
            'escrow_auto_confirm_h',
            'escrow_release_h',
            'litige_window_days',
            'minimum_order_amount_xaf',
            'default_delivery_days',
            'mtn_momo_enabled',
            'orange_money_enabled',
            'admin_email',
            'support_email',
            'maintenance_mode',
            'maintenance_message',
            'updated_at',
            'updated_by',
            'updated_by_name',
        ]