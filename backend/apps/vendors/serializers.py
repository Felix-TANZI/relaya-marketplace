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
from apps.orders.models import Order, OrderItem
from .models import (
    VendorProfile, VendorOrderNote, WithdrawalRequest,
    SubscriptionPlan, VendorSubscription,
    RequiredDocumentType, ShopModificationRequest,
    ShopModificationDocument, VendorLocation,
)    


# ─────────────────────────────────────────────────────────────────────────────
# PROFIL VENDEUR
# ─────────────────────────────────────────────────────────────────────────────

class VendorProfileSerializer(serializers.ModelSerializer):
    user_id        = serializers.SerializerMethodField()
    user_email     = serializers.SerializerMethodField()
    user_full_name = serializers.SerializerMethodField()
    plan_code      = serializers.SerializerMethodField()
    plan_name      = serializers.SerializerMethodField()
    total_products = serializers.SerializerMethodField()
    active_products= serializers.SerializerMethodField()
    total_revenue  = serializers.SerializerMethodField()
    total_orders   = serializers.SerializerMethodField()
 
    class Meta:
        model  = VendorProfile
        fields = [
            'id', 'user_id', 'user_email', 'user_full_name',
            'business_name', 'business_description',
            'phone', 'address', 'city', 'shop_slug',
            'id_document', 'status',
            'certification_tier',
            'plan_code', 'plan_name',
            'total_products', 'active_products',
            'total_revenue', 'total_orders',
            'created_at', 'updated_at', 'approved_at',
        ]
 
    def get_user_id(self, obj):
        return obj.user_id
 
    def get_user_email(self, obj):
        return obj.user.email
 
    def get_user_full_name(self, obj):
        u = obj.user
        return f"{u.first_name} {u.last_name}".strip() or u.username
 
    def get_plan_code(self, obj):
        return obj.active_plan_code   # 'FREE' | 'STARTER' | 'PRO' | 'BUSINESS'
 
    def get_plan_name(self, obj):
        plan_names = {
            'FREE':     'Gratuit',
            'STARTER':  'Starter',
            'PRO':      'Pro',
            'BUSINESS': 'Business',
        }
        return plan_names.get(obj.active_plan_code, obj.active_plan_code)
 
    def get_total_products(self, obj):
        from apps.catalog.models import Product
        return Product.objects.filter(vendor=obj.user).count()
 
    def get_active_products(self, obj):
        from apps.catalog.models import Product
        return Product.objects.filter(vendor=obj.user, is_active=True).count()
 
    def get_total_revenue(self, obj):
        from django.db.models import Sum
        from apps.orders.models import OrderItem
        return OrderItem.objects.filter(
            product__vendor=obj.user
        ).aggregate(t=Sum('line_total_xaf'))['t'] or 0
 
    def get_total_orders(self, obj):
        from apps.orders.models import OrderItem
        return OrderItem.objects.filter(
            product__vendor=obj.user
        ).values('order').distinct().count()


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

class AdminUserListSerializer(serializers.ModelSerializer):
    is_vendor            = serializers.SerializerMethodField()
    is_courier           = serializers.SerializerMethodField()
    vendor_status        = serializers.SerializerMethodField()
    vendor_business_name = serializers.SerializerMethodField()
    vendor_plan          = serializers.SerializerMethodField()
    orders_count         = serializers.SerializerMethodField()
    total_spent          = serializers.SerializerMethodField()
    is_banned            = serializers.SerializerMethodField()
    loyalty_tier         = serializers.SerializerMethodField()
    loyalty_points       = serializers.SerializerMethodField()
    city                 = serializers.SerializerMethodField()
 
    class Meta:
        from django.contrib.auth.models import User
        model  = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'is_staff', 'is_active', 'is_superuser',
            'date_joined', 'last_login',
            # Rôles
            'is_vendor', 'is_courier', 'vendor_status', 'vendor_business_name', 'vendor_plan',
            # Commandes & dépenses
            'orders_count', 'total_spent',
            # Profil & fidélité
            'is_banned', 'loyalty_tier', 'loyalty_points', 'city',
        ]
 
    # ── Rôle vendeur ────────────────────────────────────────────────────────
    def get_is_vendor(self, obj):
        return hasattr(obj, 'vendor_profile')

    def get_is_courier(self, obj):
        courier = getattr(obj, 'courier_profile', None)
        return bool(courier and courier.is_active)
 
    def get_vendor_status(self, obj):
        if hasattr(obj, 'vendor_profile'):
            return obj.vendor_profile.status
        return None
 
    def get_vendor_business_name(self, obj):
        if hasattr(obj, 'vendor_profile'):
            return obj.vendor_profile.business_name
        return None
 
    def get_vendor_plan(self, obj):
        """Retourne le code du plan actif : FREE | STARTER | PRO | BUSINESS"""
        if hasattr(obj, 'vendor_profile'):
            return obj.vendor_profile.active_plan_code
        return None
 
    # ── Commandes ───────────────────────────────────────────────────────────
    def get_orders_count(self, obj):
        return obj.orders.count()
 
    def get_total_spent(self, obj):
        from django.db.models import Sum
        return obj.orders.filter(
            payment_status='PAID'
        ).aggregate(t=Sum('total_xaf'))['t'] or 0
 
    # ── Profil & fidélité ────────────────────────────────────────────────────
    def get_is_banned(self, obj):
        profile = getattr(obj, 'profile', None)
        if profile:
            return getattr(profile, 'is_banned', False)
        return False
 
    def get_loyalty_points(self, obj):
        """Points = commandes payées × 100 (même logique que accounts/serializers.py)"""
        return obj.orders.count() * 100
 
    def get_loyalty_tier(self, obj):
        points = self.get_loyalty_points(obj)
        if points >= 2000: return 'DIAMOND'
        if points >= 1000: return 'GOLD'
        if points >= 500:  return 'SILVER'
        return 'BRONZE'
 
    def get_city(self, obj):
        """Ville depuis VendorProfile (si vendeur) ou UserProfile"""
        courier = getattr(obj, 'courier_profile', None)
        if courier:
            return courier.city or None
        if hasattr(obj, 'vendor_profile'):
            return obj.vendor_profile.city or None
        profile = getattr(obj, 'profile', None)
        if profile:
            return getattr(profile, 'city', None)
        return None
    

class AdminUserDetailSerializer(serializers.ModelSerializer):
    is_vendor      = serializers.SerializerMethodField()
    vendor_profile = serializers.SerializerMethodField()
    profile        = serializers.SerializerMethodField()
    activity_logs  = serializers.SerializerMethodField()
    stats          = serializers.SerializerMethodField()
    # Nouveaux champs
    loyalty_points = serializers.SerializerMethodField()
    loyalty_tier   = serializers.SerializerMethodField()
    city           = serializers.SerializerMethodField()
    recent_orders  = serializers.SerializerMethodField()
 
    class Meta:
        from django.contrib.auth.models import User
        model  = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'is_staff', 'is_active', 'is_superuser',
            'date_joined', 'last_login',
            'is_vendor', 'vendor_profile', 'profile',
            'activity_logs', 'stats',
            'loyalty_points', 'loyalty_tier', 'city', 'recent_orders',
        ]
 
    def get_is_vendor(self, obj):
        return hasattr(obj, 'vendor_profile')
 
    def get_vendor_profile(self, obj):
        if hasattr(obj, 'vendor_profile'):
            return VendorProfileSerializer(obj.vendor_profile).data
        return None
 
    def get_profile(self, obj):
        if hasattr(obj, 'profile'):
            p = obj.profile
            return {
                'phone':                 p.phone,
                'bio':                   p.bio,
                'is_banned':             p.is_banned,
                'ban_reason':            p.ban_reason,
                'banned_at':             p.banned_at,
                'banned_by':             p.banned_by.username if p.banned_by else None,
                'newsletter_subscribed': p.newsletter_subscribed,
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
        avg        = round(total_xaf / total_paid, 2) if total_paid > 0 else 0
 
        vendor_stats = {}
        if hasattr(obj, 'vendor_profile'):
            from apps.catalog.models import Product
            products        = Product.objects.filter(vendor=obj)
            vendor_stats = {
                'total_products':  products.count(),
                'active_products': products.filter(is_active=True).count(),
            }
 
        return {
            'total_orders':        orders.count(),
            'paid_orders':         total_paid,
            'pending_orders':      orders.filter(payment_status='PENDING').count(),
            'total_spent':         total_xaf,
            'average_order_value': avg,
            **vendor_stats,
        }
 
    def get_loyalty_points(self, obj):
        return obj.orders.count() * 100
 
    def get_loyalty_tier(self, obj):
        pts = self.get_loyalty_points(obj)
        if pts >= 2000: return 'DIAMOND'
        if pts >= 1000: return 'GOLD'
        if pts >= 500:  return 'SILVER'
        return 'BRONZE'
 
    def get_city(self, obj):
        if hasattr(obj, 'vendor_profile'):
            return obj.vendor_profile.city or None
        profile = getattr(obj, 'profile', None)
        return getattr(profile, 'city', None) if profile else None
 
    def get_recent_orders(self, obj):
        """5 dernières commandes de l'utilisateur"""
        orders = obj.orders.order_by('-created_at')[:5]
        result = []
        for o in orders:
            result.append({
                'id':                 o.id,
                'total_xaf':          o.total_xaf,
                'payment_status':     o.payment_status,
                'fulfillment_status': o.fulfillment_status,
                'created_at':         o.created_at.isoformat(),
                'items_count':        o.items.count(),
            })
        return result    


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
            'vendor_can_reply', 'courier_can_reply',
            'messages', 'evidences',
            'created_at', 'updated_at',
        ]

    def get_order_detail(self, obj):
        return {
            'id':                 obj.order.id,
            'total_xaf':          obj.order.total_xaf,
            'customer_email':     obj.order.customer_email,
            'customer_phone':     obj.order.customer_phone,
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
    user_name  = serializers.CharField(
        source='user.username', read_only=True, default='Système'
    )
    # Forcer CharField pour éviter le bug DRF IPAddressField + DRF 3.15+
    ip_address = serializers.CharField(allow_null=True, allow_blank=True, read_only=True)

    class Meta:
        from apps.orders.models import OrderHistory
        model  = OrderHistory
        fields = [
            'id', 'user', 'user_name', 'action',
            'field_name', 'old_value', 'new_value',
            'timestamp', 'ip_address',
        ]


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
    courier_info      = serializers.SerializerMethodField()

    class Meta:
        from apps.orders.models import Order as OModel
        model  = OModel
        fields = [
            'id', 'customer_name', 'customer_email', 'customer_phone',
            'city', 'payment_status', 'fulfillment_status', 'escrow_status',
            'subtotal_xaf', 'delivery_fee_xaf', 'total_xaf',
            'commission_rate_snapshot', 'commission_amount',
            'items_count', 'vendor_names', 'courier_info',
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

    def get_courier_info(self, obj):
        shipment = getattr(obj, 'shipment', None)
        if not shipment:
            return None
        return {
            'courier_name':  shipment.courier_name or None,
            'courier_phone': shipment.courier_phone or None,
            'status':        shipment.status,
        }


class AdminOrderDetailSerializer(serializers.ModelSerializer):
    customer_name        = serializers.SerializerMethodField()
    items                = serializers.SerializerMethodField()
    history              = OrderHistorySerializer(many=True, read_only=True)
    payment_transactions = serializers.SerializerMethodField()
    commission_amount    = serializers.SerializerMethodField()
    courier_info         = serializers.SerializerMethodField()

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
            'courier_info',
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

    def get_courier_info(self, obj):
        shipment = getattr(obj, 'shipment', None)
        if not shipment:
            return None
        courier_full_name = None
        if shipment.courier and shipment.courier.user:
            u = shipment.courier.user
            courier_full_name = f"{u.first_name} {u.last_name}".strip() or u.username
        return {
            'shipment_status': shipment.status,
            'courier_name':    courier_full_name or shipment.courier_name or None,
            'courier_phone':   (shipment.courier.phone if shipment.courier else None) or shipment.courier_phone or None,
        }


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


# ─────────────────────────────────────────────────────────────────────────────
# PAIEMENTS VENDEUR — RÉSUMÉ ET RETRAITS
# ─────────────────────────────────────────────────────────────────────────────

class VendorPaymentSummarySerializer(serializers.Serializer):
    """
    KPIs financiers du vendeur calculés côté backend depuis ses commandes.
    Aucune valeur n'est codée en dur : les taux viennent de PlatformSettings.
    """
    # Solde libéré (commandes RELEASED_TO_VENDOR)
    total_released_xaf         = serializers.IntegerField()

    # Fonds bloqués en escrow (commandes payées, pas encore livrées/confirmées)
    total_blocked_xaf          = serializers.IntegerField()

    # En attente de libération (BUYER_CONFIRMED / AUTO_CONFIRMED, 24h restantes)
    total_release_pending_xaf  = serializers.IntegerField()

    # Revenus bruts totaux (tous statuts, hors annulés/remboursés)
    total_gross_xaf            = serializers.IntegerField()

    # Commission totale prélevée (toutes commandes libérées)
    total_commission_xaf       = serializers.IntegerField()

    # Nombre de commandes libérées
    released_orders_count      = serializers.IntegerField()

    # Nombre de commandes en escrow
    blocked_orders_count       = serializers.IntegerField()

    # Taux de commission actuel (depuis PlatformSettings)
    commission_rate            = serializers.DecimalField(max_digits=5, decimal_places=2)

    # Frais de retrait MoMo actuels (depuis PlatformSettings)
    withdrawal_fee_percent     = serializers.DecimalField(max_digits=4, decimal_places=2)

    # Montant minimum de retrait (depuis PlatformSettings)
    minimum_withdrawal_xaf     = serializers.IntegerField()

    # Projection mensuelle (moyenne des 3 derniers mois de net libéré)
    projection_monthly_xaf     = serializers.IntegerField()

    # Graphique 30 jours : liste de {date, released, blocked}
    chart_30_days              = serializers.ListField(child=serializers.DictField())

    # Retrait en cours (PENDING) — null si aucun
    pending_withdrawal         = serializers.DictField(allow_null=True)


class WithdrawalRequestSerializer(serializers.ModelSerializer):
    """Lecture d'une demande de retrait."""
    operator_display = serializers.CharField(source='get_operator_display', read_only=True)
    status_display   = serializers.CharField(source='get_status_display',   read_only=True)

    class Meta:
        from apps.vendors.models import WithdrawalRequest
        model  = WithdrawalRequest
        fields = [
            'id', 'reference',
            'amount_xaf', 'fee_percent_snapshot', 'fee_amount_xaf', 'net_amount_xaf',
            'operator', 'operator_display', 'phone_number',
            'status', 'status_display',
            'admin_note', 'processed_at',
            'created_at', 'updated_at',
        ]
        read_only_fields = fields


class WithdrawalRequestCreateSerializer(serializers.Serializer):
    """
    Création d'une demande de retrait.
    Les frais et le net sont calculés côté backend depuis PlatformSettings.
    """
    amount_xaf   = serializers.IntegerField(min_value=1, help_text="Montant à retirer en FCFA.")
    operator     = serializers.ChoiceField(
        choices=['ORANGE_MONEY', 'MTN_MOMO'],
        help_text="Opérateur Mobile Money : ORANGE_MONEY ou MTN_MOMO.",
    )
    phone_number = serializers.CharField(
        max_length=20,
        help_text="Numéro Mobile Money au format +237 6XX XXX XXX.",
    )

    def validate_phone_number(self, value):
        """Valide le format du numéro camerounais."""
        cleaned = value.replace(' ', '').replace('-', '')
        if not (cleaned.startswith('+237') or cleaned.startswith('237')):
            raise serializers.ValidationError(
                "Le numéro doit commencer par +237 (ex : +237 690 000 000)."
            )
        local = cleaned.lstrip('+').lstrip('237')
        if len(local) != 9 or not local.isdigit():
            raise serializers.ValidationError(
                "Numéro invalide. Format attendu : +237 6XX XXX XXX (9 chiffres locaux)."
            )
        return cleaned  # Stocké normalisé

    def validate(self, data):
        from apps.orders.models import PlatformSettings
        from apps.vendors.models import WithdrawalRequest

        vendor   = self.context['vendor']
        settings = PlatformSettings.get_settings()

        # Vérifier montant minimum
        min_xaf = settings.minimum_withdrawal_amount_xaf
        if data['amount_xaf'] < min_xaf:
            raise serializers.ValidationError(
                f"Le montant minimum de retrait est {min_xaf:,} FCFA.".replace(',', ' ')
            )

        # Vérifier qu'il n'y a pas déjà un retrait PENDING
        existing = WithdrawalRequest.objects.filter(
            vendor=vendor, status=WithdrawalRequest.Status.PENDING
        ).first()
        if existing:
            raise serializers.ValidationError(
                f"Vous avez déjà une demande en attente ({existing.reference}). "
                "Annulez-la avant d'en créer une nouvelle."
            )

        # Calculer les frais (snapshot au moment de la demande)
        fee_percent = float(settings.withdrawal_fee_percent)
        fee_xaf     = round(data['amount_xaf'] * fee_percent / 100)
        net_xaf     = data['amount_xaf'] - fee_xaf

        data['fee_percent_snapshot'] = settings.withdrawal_fee_percent
        data['fee_amount_xaf']       = fee_xaf
        data['net_amount_xaf']       = net_xaf

        return data

    def create(self, validated_data):
        from apps.vendors.models import WithdrawalRequest
        vendor = self.context['vendor']
        return WithdrawalRequest.objects.create(vendor=vendor, **validated_data)


# ─────────────────────────────────────────────────────────────────────────────
# LITIGES VENDEUR
# ─────────────────────────────────────────────────────────────────────────────

class VendorDisputeMessageSerializer(serializers.ModelSerializer):
    """
    Serializer message litige côté vendeur.
    - Les messages is_internal=True sont filtrés en amont (jamais exposés).
    - Le nom de l'expéditeur est anonymisé : un admin apparaît comme "Admin BelivaY".
    """
    sender_display = serializers.SerializerMethodField()

    class Meta:
        from apps.orders.models import DisputeMessage
        model  = DisputeMessage
        fields = ['id', 'sender_display', 'sender_role', 'message', 'created_at']
        read_only_fields = fields

    def get_sender_display(self, obj):
        if obj.sender_role == 'ADMIN':
            return 'Admin BelivaY'
        if obj.sender_role == 'SYSTEM':
            return 'BelivaY'
        # VENDOR : on affiche le nom de la boutique si dispo
        if hasattr(obj.sender, 'vendor_profile'):
            return obj.sender.vendor_profile.business_name
        return obj.sender.get_full_name() or obj.sender.username


class VendorDisputeEvidenceSerializer(serializers.ModelSerializer):
    """Pièce justificative jointe à un litige (lecture)."""
    uploaded_by_name = serializers.CharField(
        source='uploaded_by.get_full_name', read_only=True,
    )
    file_url = serializers.SerializerMethodField()

    class Meta:
        from apps.orders.models import DisputeEvidence
        model  = DisputeEvidence
        fields = ['id', 'file_url', 'description', 'uploaded_by_name', 'created_at']
        read_only_fields = fields

    def get_file_url(self, obj):
        request = self.context.get('request')
        if request and obj.file:
            return request.build_absolute_uri(obj.file.url)
        return obj.file.url if obj.file else None


class VendorDisputeListSerializer(serializers.ModelSerializer):
    """
    Litige dans la liste — données essentielles.
    Inclut la description de la plainte acheteur (visible par le vendeur).
    """
    order_ref            = serializers.SerializerMethodField()
    order_total_xaf      = serializers.IntegerField(source='order.total_xaf', read_only=True)
    vendor_escrow_amount = serializers.SerializerMethodField()
    reason_display       = serializers.CharField(source='get_reason_display', read_only=True)
    status_display       = serializers.CharField(source='get_status_display', read_only=True)
    vendor_reply_display = serializers.SerializerMethodField()
    # Deadline réponse vendeur (calculé depuis created_at + vendor_reply_h)
    vendor_deadline_iso  = serializers.SerializerMethodField()
    hours_remaining      = serializers.SerializerMethodField()
    assigned_admin_name  = serializers.SerializerMethodField()
    unread_messages      = serializers.SerializerMethodField()

    class Meta:
        from apps.orders.models import Dispute
        model  = Dispute
        fields = [
            'id', 'order', 'order_ref', 'order_total_xaf', 'vendor_escrow_amount',
            'reason', 'reason_display', 'status', 'status_display',
            'description',                    # Plainte acheteur — visible vendeur
            'vendor_contacted', 'vendor_replied',
            'vendor_reply_type', 'vendor_reply_display',
            'vendor_deadline_iso', 'hours_remaining',
            'assigned_admin_name', 'unread_messages',
            'created_at', 'updated_at',
        ]
        read_only_fields = fields

    def get_order_ref(self, obj):
        return f"BLV-{obj.order_id:05d}"

    def get_vendor_escrow_amount(self, obj):
        """Montant vendeur bloqué en escrow pour cette commande."""
        vendor = self.context.get('vendor')
        if not vendor:
            return 0
        items    = obj.order.items.filter(product__vendor=vendor)
        subtotal = sum(i.line_total_xaf for i in items)
        rate     = float(obj.order.commission_rate_snapshot)
        return round(subtotal * (1 - rate / 100))

    def get_vendor_reply_display(self, obj):
        if not obj.vendor_reply_type:
            return None
        labels = {
            'ACCEPT':     'Remboursement accepté',
            'CONTEST':    'Contesté',
            'COMPROMISE': 'Compromis proposé',
        }
        return labels.get(obj.vendor_reply_type, obj.vendor_reply_type)

    def get_vendor_deadline_iso(self, obj):
        """Deadline réponse vendeur depuis PlatformSettings."""
        from apps.orders.models import PlatformSettings
        from datetime import timedelta
        settings   = PlatformSettings.get_settings()
        deadline   = obj.created_at + timedelta(hours=settings.vendor_reply_h)
        return deadline.isoformat()

    def get_hours_remaining(self, obj):
        """Heures restantes avant deadline. Négatif si dépassé."""
        from apps.orders.models import PlatformSettings
        from datetime import timedelta
        from django.utils import timezone
        settings       = PlatformSettings.get_settings()
        deadline       = obj.created_at + timedelta(hours=settings.vendor_reply_h)
        remaining      = deadline - timezone.now()
        return max(0, int(remaining.total_seconds() / 3600))

    def get_assigned_admin_name(self, obj):
        if obj.assigned_admin:
            return obj.assigned_admin.get_full_name() or obj.assigned_admin.username
        return None

    def get_unread_messages(self, obj):
        """Nombre de messages admin non lus par le vendeur (approximatif)."""
        return obj.messages.filter(
            sender_role='ADMIN',
            is_internal=False,
        ).count()


class VendorDisputeDetailSerializer(VendorDisputeListSerializer):
    """
    Détail complet d'un litige côté vendeur.
    Messages filtrés : is_internal=False et sender_role != SYSTEM uniquement.
    """
    messages  = serializers.SerializerMethodField()
    evidences = VendorDisputeEvidenceSerializer(many=True, read_only=True)

    class Meta(VendorDisputeListSerializer.Meta):
        fields = VendorDisputeListSerializer.Meta.fields + [
            'resolution', 'resolution_note', 'refund_amount_xaf',
            'vendor_reply_text', 'vendor_proposed_amount', 'vendor_replied_at',
            'messages', 'evidences',
            'resolved_at',
        ]

    def get_messages(self, obj):
        """
        Filtrer les messages visibles pour le vendeur :
        - is_internal=False (pas de notes admin internes)
        - sender_role != SYSTEM (pas de messages système automatiques)
        """
        qs = obj.messages.filter(
            is_internal=False,
        ).exclude(sender_role='SYSTEM').order_by('created_at')
        return VendorDisputeMessageSerializer(
            qs, many=True, context=self.context,
        ).data


class VendorDisputeReplySerializer(serializers.Serializer):
    """
    Réponse formelle du vendeur à un litige (formulaire séparé du chat).
    Ne génère pas de message automatique — enregistre uniquement la position.
    """
    reply_type = serializers.ChoiceField(
        choices=['ACCEPT', 'CONTEST', 'COMPROMISE'],
        help_text="ACCEPT | CONTEST | COMPROMISE",
    )
    reply_text = serializers.CharField(
        min_length=20, max_length=5000,
        help_text="Explication détaillée de la position du vendeur (min 20 chars).",
    )
    proposed_amount = serializers.IntegerField(
        required=False, allow_null=True, min_value=1,
        help_text="Montant proposé en FCFA — requis si reply_type = COMPROMISE.",
    )

    def validate(self, data):
        if data['reply_type'] == 'COMPROMISE':
            if not data.get('proposed_amount'):
                raise serializers.ValidationError(
                    {'proposed_amount': "Le montant proposé est requis pour un compromis."}
                )
        return data


class VendorDisputeMessageCreateSerializer(serializers.Serializer):
    """Envoi d'un message dans le fil de discussion avec l'admin."""
    message = serializers.CharField(
        min_length=1, max_length=5000,
        help_text="Message envoyé à l'admin dans le cadre du litige.",
    )


class VendorLocationSerializer(serializers.ModelSerializer):
    class Meta:
        model  = VendorLocation
        fields = [
            'id', 'name', 'address', 'phone', 'email',
            'representative_name', 'representative_phone',
            'latitude', 'longitude', 'is_active', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']
 
 
class RequiredDocumentTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model  = RequiredDocumentType
        fields = ['id', 'name', 'description']
 
 
class ShopModificationDocumentSerializer(serializers.ModelSerializer):
    document_type_name = serializers.CharField(source='document_type.name', read_only=True)
    file_url = serializers.SerializerMethodField()
 
    class Meta:
        model  = ShopModificationDocument
        fields = ['id', 'document_type', 'document_type_name', 'file_url', 'description', 'uploaded_at']
        read_only_fields = ['id', 'uploaded_at']
 
    def get_file_url(self, obj):
        request = self.context.get('request')
        if obj.file:
            url = obj.file.url
            return request.build_absolute_uri(url) if request else url
        return None
 
 
class ShopModificationRequestSerializer(serializers.ModelSerializer):
    documents     = ShopModificationDocumentSerializer(many=True, read_only=True)
    required_docs = RequiredDocumentTypeSerializer(many=True, read_only=True)
 
    class Meta:
        model  = ShopModificationRequest
        fields = [
            'id', 'fields_requested', 'reason', 'status',
            'admin_note', 'required_docs', 'documents',
            'approved_at', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'status', 'admin_note', 'required_docs', 'approved_at', 'created_at', 'updated_at']
 
 
class SubscriptionPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model  = SubscriptionPlan
        fields = [
            'id', 'code', 'name', 'description',
            'price_monthly_xaf', 'price_annual_xaf',
            'commission_rate', 'max_products', 'max_boosts_month',
            'features', 'trial_days', 'plan_duration_days',
            'display_order',
        ]    
