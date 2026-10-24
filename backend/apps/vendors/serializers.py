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
#   Calculée par apps.orders.commission.net_vendeur : net_b figé à la commande (spec v2.1, R22.1, R26.1).
#   Tout vient de PlatformSettings, modifiable par l'admin.

import hashlib
from apps.orders.commission import net_vendeur
from rest_framework import serializers
from apps.orders.models import Order, OrderItem
from apps.orders.serializers import DisputeEvidenceRequestSerializer
from apps.shipping.models import Shipment
from .models import (
    VendorProfile, VendorOrderNote, WithdrawalRequest,
    SubscriptionPlan, VendorSubscription,
    RequiredDocumentType, ShopModificationRequest,
    ShopModificationDocument, VendorLocation,
)
from apps.catalog.models import (
    MasterProduct, ProductAttribute, ProductVariant, Brand, Category
)


def estimate_shipment_distance_km(shipment) -> float:
    order = shipment.order
    city = (order.city or "").upper()
    address_seed = f"{order.address or ''}|{shipment.relay_point or ''}|{order.id}"
    address_score = sum(ord(ch) for ch in address_seed) % 36
    city_base = 5.2 if "YAOUNDE" in city else 6.4 if "DOUALA" in city else 4.8
    status_extra = {
        Shipment.Status.CREATED: 0.0,
        Shipment.Status.ASSIGNED: 0.8,
        Shipment.Status.PICKED_UP: 1.8,
        Shipment.Status.OUT_FOR_DELIVERY: 3.0,
        Shipment.Status.DELIVERED: 0.0,
        Shipment.Status.FAILED: 0.0,
        Shipment.Status.CANCELLED: 0.0,
    }.get(shipment.status, 0.0)
    return round(city_base + (address_score / 10) + status_extra, 1)


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
            # `total_points` accompagne `certification_tier` : la feuille compte
            # du portail affiche le palier ET le score qui y mene, sinon le
            # vendeur voit son niveau sans savoir ou il en est.
            'certification_tier', 'total_points',
            'plan_code', 'plan_name',
            'total_products', 'active_products',
            'total_revenue', 'total_orders',
            # Mobile Money de versement. Sans ces deux champs, l'espace vendeur
            # ne peut ni pre-remplir le numero enregistre, ni confirmer sa mise
            # a jour : `vendor_update_settings` renvoie ce meme serializer.
            'default_withdrawal_operator', 'default_withdrawal_phone',
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

    def create(self, validated_data):
        # Feuille de route D19 : une seule règle d'ouverture pour tous les écrans (apps.vendors.ouverture).
        from apps.vendors.ouverture import Refus, ouvrir_boutique

        try:
            return ouvrir_boutique(
                self.context['request'].user, nom=validated_data.get('business_name', ''),
                telephone=validated_data.get('phone', ''), description=validated_data.get('business_description', ''),
                adresse=validated_data.get('address', ''), ville=validated_data.get('city', ''),
                id_document=validated_data.get('id_document', ''),
            )
        except Refus as refus:
            raise serializers.ValidationError(refus.message)


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


SHIPMENT_STATUS_LABELS = {
    Shipment.Status.CREATED: 'Livraison créée',
    Shipment.Status.ASSIGNED: 'Livreur assigné',
    Shipment.Status.PICKED_UP: 'Colis pris en main',
    Shipment.Status.IN_TRANSIT: 'Colis en transit',
    Shipment.Status.OUT_FOR_DELIVERY: 'En cours de livraison',
    Shipment.Status.DELIVERED: 'Colis livré',
    Shipment.Status.FAILED: 'Livraison échouée',
    Shipment.Status.CANCELLED: 'Livraison annulée',
}


def _shipment_event_actor_label(event):
    """
    Signature de chaque entrée du journal (audit vendeur) : jamais le nom réel
    d'un acheteur (même convention que customer_name → "Acheteur #XXXX"),
    une identification utile pour les autres rôles, et "Système BelivaY" pour
    les transitions automatiques (dispatch, libération de mission...).
    """
    role = event.actor_role
    if role == 'COURIER':
        name = event.actor.get_full_name().strip() if event.actor else ''
        return f"Livreur {name}".strip() if name else 'Livreur'
    if role == 'RELAY_POINT':
        name = event.location or (event.actor.get_full_name().strip() if event.actor else '')
        return f"Point relais {name}".strip() if name else 'Point relais'
    if role == 'VENDOR':
        return 'Vous'
    if role == 'DISPATCHER':
        name = event.actor.get_full_name().strip() if event.actor else ''
        return f"Organisation de livraison ({name})" if name else 'Organisation de livraison'
    if role == 'SUPPORT':
        name = event.actor.get_full_name().strip() if event.actor else ''
        return f"Support BelivaY ({name})" if name else 'Support BelivaY'
    if role == 'CLIENT':
        if event.actor_id:
            code = hashlib.sha256(str(event.actor_id).encode()).hexdigest()[:4].upper()
            return f"Acheteur #{code}"
        return 'Acheteur'
    return 'Système BelivaY'


class VendorOrderSerializer(serializers.ModelSerializer):
    """
    Commande vue vendeur.

    Confidentialité :
      - customer_name  → "Acheteur #XXXX" (code hash SHA-256 sur l'user.id, 4 chars)
      - customer_phone → "Confidentiel"
      - customer_email → non exposé

    Finances vendeur (spec v2.1, R26.1 : le vendeur voit net_b, jamais ce qui est retenu) :
      - vendor_subtotal   : total des articles du vendeur, prix payés
      - vendor_net_amount : ce que le vendeur recevra (net_b figé à la commande, R22.1)
    """

    items                    = serializers.SerializerMethodField()
    customer_name            = serializers.SerializerMethodField()
    customer_phone           = serializers.SerializerMethodField()
    vendor_subtotal          = serializers.SerializerMethodField()
    vendor_net_amount        = serializers.SerializerMethodField()
    shipment                 = serializers.SerializerMethodField()

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
            'subtotal_xaf', 'delivery_fee_xaf', 'total_xaf',
            'vendor_subtotal', 'vendor_net_amount',
            'items', 'shipment',
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

    def get_vendor_net_amount(self, obj) -> int:
        from apps.orders.commission import net_vendeur
        return net_vendeur(obj, self.context.get('vendor'), self.get_vendor_subtotal(obj))

    # ── Articles ─────────────────────────────────────────────────────────────

    def get_items(self, obj):
        return VendorOrderItemSerializer(
            self._vendor_items(obj), many=True, context=self.context
        ).data

    def get_shipment(self, obj):
        vendor = self.context.get('vendor')
        shipment = obj.shipments.filter(vendor=vendor).first() if vendor else None
        if not shipment:
            return None

        order_created_label = 'Achat client initié'
        order_events = [
            {
                'id': f"order-{obj.id}-created",
                'status': 'ORDER_CREATED',
                'label': order_created_label,
                'previous_label': '',
                'message': f"Le client a initié la commande à {obj.city}.",
                'location': obj.city,
                'actor_label': self.get_customer_name(obj),
                'created_at': obj.created_at,
            }
        ]

        if obj.fulfillment_status in [
            Order.FulfillmentStatus.VENDOR_ACKNOWLEDGED,
            Order.FulfillmentStatus.PREPARING,
            Order.FulfillmentStatus.READY_FOR_PICKUP,
            Order.FulfillmentStatus.DRIVER_ASSIGNED,
            Order.FulfillmentStatus.PICKED_UP,
            Order.FulfillmentStatus.OUT_FOR_DELIVERY,
            Order.FulfillmentStatus.DELIVERED,
            Order.FulfillmentStatus.BUYER_CONFIRMED,
            Order.FulfillmentStatus.AUTO_CONFIRMED,
            Order.FulfillmentStatus.RELEASED_TO_VENDOR,
        ]:
            order_events.append({
                'id': f"order-{obj.id}-vendor",
                'status': 'VENDOR_PROCESSING',
                'label': 'Préparation vendeur',
                'previous_label': order_created_label,
                'message': 'La commande est suivie dans l’espace vendeur.',
                'location': obj.city,
                'actor_label': 'Vous',
                'created_at': obj.updated_at,
            })

        shipment_events = [
            {
                'id': event.id,
                'status': event.status,
                'label': SHIPMENT_STATUS_LABELS.get(event.status, event.status),
                'previous_label': (
                    SHIPMENT_STATUS_LABELS.get(event.previous_status, event.previous_status)
                    if event.previous_status else ''
                ),
                'message': event.message,
                'location': event.location,
                'actor_label': _shipment_event_actor_label(event),
                'created_at': event.created_at,
            }
            for event in shipment.events.all().select_related('actor').order_by('created_at')
        ]

        timeline = sorted(
            [*order_events, *shipment_events],
            key=lambda item: item['created_at'],
        )

        return {
            'id': shipment.id,
            'status': shipment.status,
            'courier_name': shipment.courier_name or '',
            'courier_phone': shipment.courier_phone or '',
            'relay_point': shipment.relay_point or '',
            'distance_km': estimate_shipment_distance_km(shipment),
            'timeline': timeline,
            # Code de remise (§8.2) : le vendeur le communique au livreur au
            # ramassage. Genere a la demande (l'assignation d'un livreur
            # suffit a le reveler au vendeur).
            'pickup_confirmation_code': shipment.ensure_pickup_confirmation_code() if shipment.courier_id else '',
            'created_at': shipment.created_at,
            'updated_at': shipment.updated_at,
        }


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

        # Spec v2.1 : le délai de préparation part du paiement (R45.1, R44.1), figé par apps.orders.delais ; il
        # n'y a pas d'étape d'acceptation (R44.3). L'accusé de réception ne le pose que pour une commande
        # antérieure, qui n'en a pas.
        if new_status == Order.FulfillmentStatus.VENDOR_ACKNOWLEDGED and instance.prep_deadline is None:
            from django.utils import timezone as _tz

            from apps.vendors.business_hours import add_business_hours
            from apps.vendors.models import VendorProfile as _VendorProfile

            vendor_user = self.context.get('vendor')
            vendor_profile = (
                _VendorProfile.objects.filter(user=vendor_user).first() if vendor_user else None
            )
            closed_days = vendor_profile.closed_days if vendor_profile else []
            instance.prep_deadline = add_business_hours(_tz.now(), 4, closed_days)
            instance.prep_reminder_sent_at = None
            instance.prep_admin_alert_sent_at = None
            instance.prep_reassignment_flagged_at = None

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
    courier_status       = serializers.SerializerMethodField()
    actor_roles          = serializers.SerializerMethodField()
    vendor_status        = serializers.SerializerMethodField()
    vendor_business_name = serializers.SerializerMethodField()
    vendor_plan          = serializers.SerializerMethodField()
    orders_count         = serializers.SerializerMethodField()
    total_orders         = serializers.SerializerMethodField()
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
            'is_vendor', 'is_courier', 'courier_status', 'actor_roles',
            'vendor_status', 'vendor_business_name', 'vendor_plan',
            # Commandes & dépenses
            'orders_count', 'total_orders', 'total_spent',
            # Profil & fidélité
            'is_banned', 'loyalty_tier', 'loyalty_points', 'city',
        ]
 
    # ── Rôle vendeur ────────────────────────────────────────────────────────
    def get_is_vendor(self, obj):
        return hasattr(obj, 'vendor_profile')

    def get_is_courier(self, obj):
        courier = getattr(obj, 'courier_profile', None)
        return bool(courier and courier.is_active)

    def get_courier_status(self, obj):
        courier = getattr(obj, 'courier_profile', None)
        if not courier:
            return None
        if courier.is_approved and courier.is_active:
            return 'APPROVED'
        if courier.is_active:
            return 'PENDING'
        return 'INACTIVE'

    def get_actor_roles(self, obj):
        roles = ['CLIENT']
        if hasattr(obj, 'vendor_profile'):
            roles.append('VENDOR')
        courier = getattr(obj, 'courier_profile', None)
        if courier:
            roles.append('COURIER')
        if getattr(obj, 'delivery_organization_profile', None):
            roles.append('DELIVERY_ORGANIZATION')
        if getattr(obj, 'relay_point_profile', None):
            roles.append('RELAY_POINT')
        if obj.is_staff:
            roles.append('STAFF')
        if obj.is_superuser:
            roles.append('ADMIN')
        return roles
 
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

    def get_total_orders(self, obj):
        return self.get_orders_count(obj)
 
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


class AdminMasterOfferSerializer(serializers.ModelSerializer):
    """Offre vue ADMIN — le vendeur EST visible (contrairement à l'acheteur)."""
    vendor_name     = serializers.CharField(source='vendor.username',                     read_only=True)
    vendor_business = serializers.CharField(source='vendor.vendor_profile.business_name',  read_only=True, default='N/A')
    condition_name  = serializers.CharField(source='condition.name',                       read_only=True, default=None)
    stock_quantity  = serializers.SerializerMethodField()

    class Meta:
        from apps.catalog.models import Product
        model  = Product
        fields = [
            'id', 'title', 'price_xaf', 'moderation_status', 'is_active',
            'condition_name', 'seller_note', 'stock_quantity',
            'vendor', 'vendor_name', 'vendor_business', 'created_at',
        ]

    def get_stock_quantity(self, obj):
        try:
            return obj.inventory.quantity
        except Exception:
            return 0


def _resolve_variant_axes(variant_axes_slugs):
    """Résout une liste de slugs d'axes en objets riches."""
    if not variant_axes_slugs:
        return []
    attrs = {
        a.slug: a for a in ProductAttribute.objects.filter(
            slug__in=variant_axes_slugs,
        )
    }
    resolved = []
    for slug in variant_axes_slugs:
        attr = attrs.get(slug)
        if attr is None:
            resolved.append({
                "slug": slug, "name": slug, "values_type": None,
                "unit": "", "found": False,
            })
        else:
            resolved.append({
                "slug": attr.slug,
                "name": attr.name,
                "values_type": attr.values_type,
                "unit": attr.unit or "",
                "found": True,
            })
    return resolved


class _FicheSpecV21Mixin(serializers.Serializer):
    """Champs de la spécification v2.1 remplis par l'équipe catalogue (apps/catalog/regles_catalogue.py)."""

    manques_publication = serializers.SerializerMethodField()
    colis = serializers.SerializerMethodField()

    CHAMPS_V21 = [
        "univers", "poids_kg", "dim_l1_cm", "dim_l2_cm", "dim_l3_cm", "carton", "made_in_cameroon",
        "manques_publication", "colis",
    ]

    def get_manques_publication(self, obj):
        from apps.catalog.regles_catalogue import manques_fiche
        return manques_fiche(obj)

    def get_colis(self, obj):
        from apps.catalog.regles_catalogue import colis_fiche
        return colis_fiche(obj)


class AdminMasterListSerializer(_FicheSpecV21Mixin, serializers.ModelSerializer):
    """Vue tableau — infos essentielles + variant_axes + brand_fk."""
 
    primary_image = serializers.SerializerMethodField()
    category_name = serializers.CharField(source="category.name", read_only=True)
    category_parent_id = serializers.IntegerField(
        source="category.parent_id", read_only=True, default=None,
    )
    category_parent_name = serializers.SerializerMethodField()
 
    # ── Brand (Phase 1.2) ────────────────────────────────────────────
    brand_fk_id = serializers.IntegerField(
        source="brand_fk.id", read_only=True, default=None,
    )
    brand_fk_name = serializers.CharField(
        source="brand_fk.name", read_only=True, default=None,
    )
    brand_fk_logo_url = serializers.SerializerMethodField()
    brand_fk_verified = serializers.BooleanField(
        source="brand_fk.is_verified", read_only=True, default=None,
    )
 
    # ── Variants (Phase 3) ───────────────────────────────────────────
    variants_count = serializers.SerializerMethodField()
    active_variants_count = serializers.SerializerMethodField()
    axes_resolved = serializers.SerializerMethodField()
 
    # ── Offres ──────────────────────────────────────────────────────
    offers_count = serializers.SerializerMethodField()
    active_offers_count = serializers.SerializerMethodField()
 
    class Meta:
        model = MasterProduct
        fields = [
            "id", "slug", "title", "brand",  # brand (texte legacy)
            "primary_image",
            "category", "category_name",
            "category_parent_id", "category_parent_name",
            "brand_fk", "brand_fk_id", "brand_fk_name", "brand_fk_logo_url", "brand_fk_verified",
            "variant_axes", "axes_resolved",
            "variants_count", "active_variants_count",
            "offers_count", "active_offers_count",
            "moderation_status", "moderated_at",
            "created_at", "updated_at",
        ] + _FicheSpecV21Mixin.CHAMPS_V21
 
    def get_primary_image(self, obj):
        request = self.context.get("request")
        img = obj.images.filter(is_primary=True).first() or obj.images.first()
        if not img or not img.image:
            return None
        url = img.image.url
        return request.build_absolute_uri(url) if request else url
 
    def get_category_parent_name(self, obj):
        if not obj.category or not obj.category.parent:
            return None
        return obj.category.parent.name
 
    def get_brand_fk_logo_url(self, obj):
        request = self.context.get("request")
        if not obj.brand_fk or not obj.brand_fk.logo:
            return None
        url = obj.brand_fk.logo.url
        return request.build_absolute_uri(url) if request else url
 
    def get_axes_resolved(self, obj):
        return _resolve_variant_axes(obj.variant_axes or [])
 
    def get_variants_count(self, obj):
        return obj.variants.count()
 
    def get_active_variants_count(self, obj):
        return obj.variants.filter(is_active=True, moderation_status="APPROVED").count()
 
    def get_offers_count(self, obj):
        return obj.offers.count()
 
    def get_active_offers_count(self, obj):
        return obj.offers.filter(is_active=True, moderation_status="APPROVED").count()
    

# ═══════════════════════════════════════════════════════════════════════════
# VARIANT BRIEF (pour lister les variants du master)
# ═══════════════════════════════════════════════════════════════════════════
 
class AdminMasterVariantBriefSerializer(serializers.ModelSerializer):
    """Brève info d'un variant attaché."""
    display_name = serializers.SerializerMethodField()
    offers_count = serializers.SerializerMethodField()
 
    class Meta:
        model = ProductVariant
        fields = [
            "id", "sku", "axis_values", "display_name",
            "moderation_status", "is_active", "offers_count",
        ]
 
    def get_display_name(self, obj):
        return str(obj)
 
    def get_offers_count(self, obj):
        return obj.offers.filter(is_active=True).count()    


class AdminMasterDetailSerializer(_FicheSpecV21Mixin, serializers.ModelSerializer):
    """
    Vue modale — master complet avec variants attachés, brand_fk complet,
    axes résolus. Note : les 'offers' et 'images' restent gérés comme
    dans la version d'origine — cet enrichissement ajoute UNIQUEMENT
    les champs Phase 2 et Phase 1.2 sans casser les serializers legacy
    éventuellement utilisés par le frontend existant.
    """
 
    primary_image = serializers.SerializerMethodField()
    all_images = serializers.SerializerMethodField()
    category_name = serializers.CharField(source="category.name", read_only=True)
    category_parent_id = serializers.IntegerField(
        source="category.parent_id", read_only=True, default=None,
    )
    category_parent_name = serializers.SerializerMethodField()
 
    # Brand
    brand_fk_id = serializers.IntegerField(source="brand_fk.id", read_only=True, default=None)
    brand_fk_name = serializers.CharField(source="brand_fk.name", read_only=True, default=None)
    brand_fk_logo_url = serializers.SerializerMethodField()
    brand_fk_verified = serializers.BooleanField(
        source="brand_fk.is_verified", read_only=True, default=None,
    )
 
    # Variants + axes
    axes_resolved = serializers.SerializerMethodField()
    variants = AdminMasterVariantBriefSerializer(many=True, read_only=True)
 
    # Offres — on garde tel quel côté serializer léger pour ne pas casser
    offers_count = serializers.SerializerMethodField()
    active_offers_count = serializers.SerializerMethodField()
 
    # Modération
    moderated_by_username = serializers.CharField(
        source="moderated_by.username", read_only=True, default=None,
    )
 
    class Meta:
        model = MasterProduct
        fields = [
            "id", "slug", "title", "description",
            "brand",  # texte legacy
            "primary_image", "all_images",
            "category", "category_name",
            "category_parent_id", "category_parent_name",
            "brand_fk", "brand_fk_id", "brand_fk_name",
            "brand_fk_logo_url", "brand_fk_verified",
            "variant_axes", "axes_resolved",
            "variants",
            "offers_count", "active_offers_count",
            "moderation_status", "moderated_at",
            "moderated_by_username",
            "created_at", "updated_at",
        ] + _FicheSpecV21Mixin.CHAMPS_V21
 
    def get_primary_image(self, obj):
        request = self.context.get("request")
        img = obj.images.filter(is_primary=True).first() or obj.images.first()
        if not img or not img.image:
            return None
        url = img.image.url
        return request.build_absolute_uri(url) if request else url
 
    def get_all_images(self, obj):
        request = self.context.get("request")
        results = []
        for img in obj.images.all():
            if not img.image:
                continue
            url = img.image.url
            results.append({
                "id": img.id,
                "url": request.build_absolute_uri(url) if request else url,
                "is_primary": img.is_primary,
            })
        return results
 
    def get_category_parent_name(self, obj):
        if not obj.category or not obj.category.parent:
            return None
        return obj.category.parent.name
 
    def get_brand_fk_logo_url(self, obj):
        request = self.context.get("request")
        if not obj.brand_fk or not obj.brand_fk.logo:
            return None
        url = obj.brand_fk.logo.url
        return request.build_absolute_uri(url) if request else url
 
    def get_axes_resolved(self, obj):
        return _resolve_variant_axes(obj.variant_axes or [])
 
    def get_offers_count(self, obj):
        return obj.offers.count()
 
    def get_active_offers_count(self, obj):
        return obj.offers.filter(is_active=True, moderation_status="APPROVED").count()     


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
    evidence_requests = DisputeEvidenceRequestSerializer(many=True, read_only=True)
    # D15 : chaîne de garde de chaque colis et responsable quand une preuve manque (R60, R66.3)
    chaine_de_garde  = serializers.SerializerMethodField()

    class Meta:
        from apps.orders.models import Dispute
        model  = Dispute
        fields = [
            'id', 'order', 'order_detail', 'opened_by', 'opened_by_name',
            'reason', 'status', 'description',
            'resolution', 'resolution_note', 'resolved_by', 'resolved_by_name', 'resolved_at',
            'refund_amount_xaf',
            'vendor_can_reply', 'courier_can_reply',
            'messages', 'evidences', 'evidence_requests', 'chaine_de_garde',
            'created_at', 'updated_at',
        ]

    def get_chaine_de_garde(self, obj):
        from apps.shipping.preuves import chaine_de_garde

        return [chaine_de_garde(s) for s in obj.order.shipments.select_related("order")]

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
        return commission_console(obj)

    def get_courier_info(self, obj):
        shipment = getattr(obj, 'shipment', None)
        if not shipment:
            return None
        return {
            'courier_name':  shipment.courier_name or None,
            'courier_phone': shipment.courier_phone or None,
            'status':        shipment.status,
        }


def commission_console(order) -> int:
    """Console (R26.2) : somme des commissions figées des sous-commandes (spec v2.1, R14.1) ; une commande antérieure
    garde le calcul par son taux."""
    figees = [c.commission_b for c in order.commissions.all()]
    if figees:
        return sum(figees)
    return round(order.subtotal_xaf * float(order.commission_rate_snapshot) / 100)


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
            'commission_rate_snapshot', 'commission_amount', 'commissions',
            'couverture_xaf', 'frais_momo_xaf', 'total_a_payer_xaf',
            'vendor_reply_deadline',
            'items', 'history', 'payment_transactions',
            'courier_info',
            'created_at', 'updated_at',
        ]

    def get_customer_name(self, obj):
        if obj.user:
            return f"{obj.user.first_name} {obj.user.last_name}".strip() or obj.user.username
        return "Invité"

    commissions = serializers.SerializerMethodField()

    def get_commissions(self, obj):
        """Console (R26.2) : commission_b, tva_b et net_b de chaque sous-commande, avec ce qui les a fixés."""
        return [
            {"vendeur": c.vendor_id, "vendeur_nom": c.vendor.username, "st_b": c.st_b, "commission_b": c.commission_b,
             "tva_b": c.tva_b, "net_b": c.net_b, "plancher_retenu": c.plancher_retenu, "palier": c.palier,
             "decouverte": c.decouverte, "reste_b": c.reste_b, "exigence": c.exigence, "objectif": c.objectif}
            for c in obj.commissions.select_related("vendor")
        ]

    def get_commission_amount(self, obj):
        return commission_console(obj)

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
        # Le numero n'est plus expose en clair : un vendeur n'a pas besoin
        # du numero complet de son acheteur.
        from apps.payments.bridge import queries

        return queries.payments_of_order(obj.pk)

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
    master_title = serializers.CharField(source='master.title', read_only=True, default=None)
    vendor_profile_id = serializers.SerializerMethodField()

    class Meta:
        from apps.catalog.models import Product
        model  = Product
        fields = [
            'id', 'title', 'slug', 'price_xaf', 'is_active',
            'moderation_status', 'moderation_reason', 'master', 'master_title',
            'vendor', 'vendor_name', 'vendor_business', 'vendor_profile_id',
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
    
    def get_vendor_profile_id(self, obj):
        vp = getattr(obj.vendor, 'vendor_profile', None) if obj.vendor_id else None
        return vp.id if vp else None


class AdminProductUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        from apps.catalog.models import Product
        model  = Product
        fields = ['title', 'description', 'price_xaf', 'is_active', 'category']

    def validate_price_xaf(self, value):
        from apps.catalog.regles_catalogue import PrixNonPubliable, verifier_prix_publiable
        try:
            verifier_prix_publiable(value)  # R19.1
        except PrixNonPubliable as exc:
            raise serializers.ValidationError(exc.messages[0], code=exc.code_refus)
        return value


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
            'evidence_retention_days',
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
            'max_offers_displayed',
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

    # Nombre de commandes libérées
    released_orders_count      = serializers.IntegerField()

    # Nombre de commandes en escrow
    blocked_orders_count       = serializers.IntegerField()

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
            # Montant arbitre, necessaire pour chiffrer les remboursements
            # partiels dans « Mes ajustements » sans ouvrir chaque litige.
            'refund_amount_xaf',
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
        from apps.orders.commission import net_vendeur
        return net_vendeur(obj.order, vendor)  # net_b (R22.1, R26.1)

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
    evidence_requests = serializers.SerializerMethodField()

    class Meta(VendorDisputeListSerializer.Meta):
        # `refund_amount_xaf` a remonte dans le serializer LISTE : l'espace
        # vendeur en a besoin pour chiffrer les remboursements partiels sans
        # ouvrir chaque litige. Le laisser ici le declarerait deux fois.
        fields = VendorDisputeListSerializer.Meta.fields + [
            'resolution', 'resolution_note',
            'vendor_reply_text', 'vendor_proposed_amount', 'vendor_replied_at',
            'messages', 'evidences', 'evidence_requests',
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

    def get_evidence_requests(self, obj):
        vendor = self.context.get('vendor')
        if not vendor:
            return []
        requests = obj.evidence_requests.filter(requested_from=vendor)
        return DisputeEvidenceRequestSerializer(requests, many=True, context=self.context).data


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
            'id', 'name', 'address', 'description', 'phone', 'email',
            'representative_name', 'representative_phone',
            'latitude', 'longitude', 'quartier', 'is_active', 'is_main', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']

    def validate_quartier(self, value):
        """Un quartier de t_quartiers (recherche R76.2), rendu sous son nom officiel."""
        value = (value or '').strip()
        if not value:
            return ''
        from apps.shipping.zones import chercher_quartiers
        trouves = chercher_quartiers(value)
        if len(trouves) == 1:
            return trouves[0]['quartier']
        if trouves:
            raise serializers.ValidationError(
                "Plusieurs quartiers portent ce nom : " + ", ".join(q['quartier'] for q in trouves) + ".")
        raise serializers.ValidationError("Quartier inconnu de la liste de Yaoundé.")

    def validate(self, attrs):
        data = {}
        if self.instance:
            for field in self.Meta.fields:
                if hasattr(self.instance, field):
                    data[field] = getattr(self.instance, field)
        data.update(attrs)

        latitude = data.get('latitude')
        longitude = data.get('longitude')
        has_lat = latitude is not None and str(latitude).strip() != ''
        has_lng = longitude is not None and str(longitude).strip() != ''
        has_coords = has_lat and has_lng
        description = (data.get('description') or '').strip()

        if has_lat != has_lng:
            raise serializers.ValidationError({
                'latitude': "Latitude et longitude doivent être renseignées ensemble.",
                'longitude': "Latitude et longitude doivent être renseignées ensemble.",
            })

        if not has_coords and len(description) < 10:
            raise serializers.ValidationError({
                'description': "Ajoutez une description d'accès d'au moins 10 caractères ou pointez la boutique sur la carte.",
            })

        if 'description' in attrs:
            attrs['description'] = description
        return attrs
 
 
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


# ═════════════════════════════════════════════════════════════════════════════
# ESPACE VENDEUR (nouveau frontend, espace-client-belivay/espace-vendeur) —
# domaines commandes / préparation / remise / journal.
#
# Construit les types français de src/donnees/domaines/{commandes,preparation,
# remise}.ts à partir des modèles Django existants (Order, Shipment,
# ShipmentEvent, Dispute, Return) — aucun nouveau modèle de "commande vue
# vendeur" : ce sont des fonctions de présentation, pas un ORM parallèle.
#
# RÔLE : pas de modèle "employé / accès Préparation" côté serveur aujourd'hui
# (domaine "équipe" non câblé) — tout utilisateur vendeur authentifié est
# `role: 'proprietaire'`, jamais de montant masqué ici (simplification à
# resserrer quand ce domaine existera).
# ═════════════════════════════════════════════════════════════════════════════

from . import opening_hours as _oh

PARCEL_SIZE_TO_CLASSE = {
    'SMALL': 'S', 'STANDARD': 'M', 'LARGE': 'L', 'BULKY': 'XL',
}


def _ref_commande(order) -> str:
    """Référence opaque pour le nouveau frontend — simplification signalée :
    pas le format cosmétique « BLV-00008 » du TS d'origine (routage Django
    plus simple avec l'id numérique brut ; le frontend traite `ref` comme une
    chaîne opaque, seul l'affichage perd le préfixe)."""
    return str(order.id)


def _hhmm(ms: int) -> str:
    dt = _oh.ms_to_dt(ms + _oh.DECALAGE)
    return dt.strftime('%H:%M')


def _jour(ms: int) -> str:
    return _oh._jour_de(ms)  # noqa: SLF001 — module interne, même paquet logique


def _article_vendu(order_item) -> dict:
    product = order_item.product
    image = ''
    variante = ''
    etat = 'Neuf'
    categorie = ''
    if product:
        try:
            img = product.images.filter(is_primary=True).first() or product.images.first()
            if img and img.image:
                image = img.image.url
        except Exception:
            pass
        if product.variant_id and product.variant.axis_values:
            variante = ' / '.join(str(v) for v in product.variant.axis_values.values())
        if product.condition_id:
            etat = product.condition.name
        if product.category_id:
            categorie = product.category.name
    return {
        'offreId': str(product.id) if product else str(order_item.id),
        'titre': order_item.title_snapshot,
        'variante': variante,
        'etat': etat,
        'dessin': image,
        'categorie': categorie,
    }


def _ligne_commande(order_item, montants: bool) -> dict:
    product = order_item.product
    return {
        'article': _article_vendu(order_item),
        'quantite': order_item.qty,
        'prixUnitaire': order_item.price_xaf_snapshot if montants else None,
        'reference': (product.sku if product and product.sku else f"BLV-{order_item.id:05d}"),
        'aMettreDeCote': [],  # non modélisé côté catalogue (accessoires livrés) — toujours vide pour l'instant
    }


def _calendrier_boutique(vendor_profile) -> dict:
    return _oh.calendar_for_vendor(vendor_profile)


CANCELLATION_REASON_TO_MOTIF = {
    Order.CancellationReason.CLIENT_BEFORE_PICKUP: 'client_avant_ramassage',
    Order.CancellationReason.STOCKOUT: 'rupture',
    Order.CancellationReason.DISPUTE_LOST: 'litige_perdu',
    Order.CancellationReason.BELIVAY: 'belivay',
}


def _cancellation_for_order(order):
    if order.fulfillment_status not in (Order.FulfillmentStatus.CANCELLED, Order.FulfillmentStatus.REFUNDED):
        return None
    motif = CANCELLATION_REASON_TO_MOTIF.get(order.cancellation_reason, 'belivay')
    at = order.cancelled_at or order.updated_at
    return {'motif': motif, 'a': _oh.dt_to_ms(at)}


def _probleme_for_order(order, vendor_user):
    """
    `probleme` (Commande.probleme) : litige ou retour ouvert sur CETTE
    sous-commande vendeur. SIMPLIFICATION signalée (partagée avec le domaine
    litiges/retours, qui possède la construction fine) : `inspectionHeures`
    n'a pas de constante business écrite (RET-INSPECT-H non défini dans les
    décisions verrouillées) — posé à 0 plutôt qu'une valeur inventée ; à
    corriger par l'agent litiges/retours quand la règle existera.
    """
    from apps.orders.models import Dispute, Return

    dispute = (
        Dispute.objects.filter(order=order, vendor=vendor_user, status__in=['OPEN', 'IN_PROGRESS'])
        .order_by('-created_at').first()
    )
    if dispute:
        return {
            'type': 'litige',
            'echeance': _oh.dt_to_ms(dispute.vendor_reply_deadline) if dispute.vendor_reply_deadline else _oh.now_ms(),
            'motif': dispute.get_reason_display(),
            'repondu': dispute.vendor_replied,
        }

    retour = (
        Return.objects.filter(
            order=order, vendor=vendor_user,
        ).exclude(status__in=[Return.Status.REFUNDED, Return.Status.CLOSED_NO_REFUND, Return.Status.REJECTED])
        .order_by('-created_at').first()
    )
    if retour:
        arrivee_ms = _oh.dt_to_ms(retour.received_at) if retour.received_at else _oh.passage_suivant(_oh.now_ms(), {'horaires': [], 'passages': []})[0]
        return {
            'type': 'retour',
            'motif': retour.get_reason_display(),
            'arrivee': {'jour': _jour(arrivee_ms), 'creneau': [_hhmm(arrivee_ms), _hhmm(arrivee_ms)]},
            'inspectionHeures': 0,
        }
    return None


def _moyen_paiement_for_order(order) -> str:
    if order.delivery_method == Order.DeliveryMethod.PICKUP and order.payment_status == Order.PaymentStatus.PENDING:
        return 'comptoir'
    try:
        from apps.payments.models import PaymentTransaction
        tx = PaymentTransaction.objects.filter(order=order).order_by('-created_at').first()
        if tx and tx.provider in (PaymentTransaction.Provider.MTN_MOMO, PaymentTransaction.Provider.ORANGE_MONEY):
            return 'momo'
    except Exception:
        pass
    return 'momo'


def _statut_commande(order, probleme) -> str:
    if probleme and probleme['type'] == 'litige':
        return 'litige_gele'
    if probleme and probleme['type'] == 'retour':
        return 'retour_gele'
    FS = Order.FulfillmentStatus
    if order.fulfillment_status in (FS.CANCELLED, FS.REFUNDED):
        return 'annulee'
    if order.fulfillment_status in (FS.DELIVERED, FS.BUYER_CONFIRMED, FS.AUTO_CONFIRMED, FS.RELEASED_TO_VENDOR):
        return 'livree'
    if order.fulfillment_status in (FS.DRIVER_ASSIGNED, FS.PICKED_UP, FS.OUT_FOR_DELIVERY):
        return 'chez_le_livreur'
    if order.fulfillment_status == FS.READY_FOR_PICKUP:
        return 'prete'
    if order.fulfillment_status in (FS.PAID_IN_ESCROW, FS.VENDOR_ACKNOWLEDGED, FS.PREPARING):
        return 'a_preparer'
    if order.delivery_method == Order.DeliveryMethod.PICKUP and order.payment_status == Order.PaymentStatus.PENDING:
        return 'payable_au_retrait'
    return 'payee'


def _livreur_for_shipment(shipment):
    if not shipment or not shipment.courier_name:
        return None
    societe = ''
    try:
        if shipment.courier and shipment.courier.delivery_organization:
            societe = shipment.courier.delivery_organization.name
    except Exception:
        pass
    ramassage = _ramassage_for_shipment(shipment)
    return {
        'nom': shipment.courier_name,
        'societe': societe,
        'creneau': [_hhmm(ramassage['debut']), _hhmm(ramassage['fin'])],
        'photo': '',
    }


def _ramassage_for_shipment(shipment) -> dict:
    """Créneau de passage du livreur — tournée réelle si assignée, sinon la
    disponibilité estimée du colis (Shipment.estimated_availability_at)."""
    if shipment and shipment.tournee_id:
        t = shipment.tournee
        from .opening_hours import _a_heure
        jour = t.slot_date.isoformat()
        if t.period == t.Period.MORNING:
            return {'debut': _a_heure(jour, '08:00'), 'fin': _a_heure(jour, '12:00')}
        return {'debut': _a_heure(jour, '12:00'), 'fin': _a_heure(jour, '18:00')}
    eta = shipment.estimated_availability_at() if shipment else None
    if eta:
        ms = _oh.dt_to_ms(eta)
        return {'debut': ms, 'fin': ms + _oh.H}
    now = _oh.now_ms()
    return {'debut': now, 'fin': now + _oh.H}


def build_commande(order, vendor_profile) -> dict:
    vendor_user = vendor_profile.user
    montants = True  # pas d'accès Préparation câblé aujourd'hui (voir en-tête)

    items = list(order.items.filter(product__vendor=vendor_user))
    vendor_subtotal = sum(i.line_total_xaf for i in items)
    shipment = order.shipments.filter(vendor=vendor_user).first()
    probleme = _probleme_for_order(order, vendor_user)
    statut = _statut_commande(order, probleme)
    calendrier = _calendrier_boutique(vendor_profile)

    paid_at = order.created_at
    payee_a = _oh.dt_to_ms(paid_at)
    debut = _oh.dt_to_ms(order.vendor_acknowledged_at) if order.vendor_acknowledged_at else payee_a
    echeance = _oh.dt_to_ms(order.prep_deadline) if order.prep_deadline else None
    echeance_absolue = _oh.ajouter_ouvertes(debut, 24 * _oh.H, calendrier) if order.vendor_acknowledged_at else None

    ramassage = _ramassage_for_shipment(shipment) if shipment else None
    livreur = _livreur_for_shipment(shipment) if shipment else None

    garde = None if probleme else (net_vendeur(order, vendor_profile.user, vendor_subtotal))
    gele = order.frozen_amount_xaf

    from apps.orders.models import PlatformSettings
    liberation_jours = round((getattr(PlatformSettings.get_settings(), 'escrow_release_h', 72) or 72) / 24) or 1

    return {
        'ref': _ref_commande(order),
        'statut': statut,
        'payableAuRetrait': order.delivery_method == Order.DeliveryMethod.PICKUP,
        'payeeA': payee_a,
        'debut': debut,
        'echeance': echeance,
        'echeanceAbsolue': echeance_absolue,
        'prolongee': order.prep_extended,
        'calendrier': calendrier,
        'lignes': [_ligne_commande(i, montants) for i in items],
        'colis': PARCEL_SIZE_TO_CLASSE.get(shipment.parcel_size if shipment else '', 'M'),
        'garde': garde,
        'commissionMinimale': None,
        'remplacementDe': _ref_commande(order.replacement_of) if order.replacement_of_id else None,
        'liberationJours': liberation_jours,
        'argent': None if not montants else {
            'etat': _etat_argent_for_order(order),
            'liberation': _oh.dt_to_ms(order.updated_at) if order.escrow_status == Order.EscrowStatus.RELEASE_PENDING else None,
            'vendredi': None,
            'versement': None,
        },
        'livreur': livreur,
        'ramassage': ramassage,
        'preteA': _oh.dt_to_ms(order.updated_at) if order.fulfillment_status == Order.FulfillmentStatus.READY_FOR_PICKUP else None,
        'remiseA': _oh.dt_to_ms(shipment.buyer_confirmed_at) if shipment and shipment.buyer_confirmed_at else None,
        'retireeA': _oh.dt_to_ms(order.updated_at) if order.fulfillment_status in (
            Order.FulfillmentStatus.DELIVERED, Order.FulfillmentStatus.BUYER_CONFIRMED,
            Order.FulfillmentStatus.AUTO_CONFIRMED, Order.FulfillmentStatus.RELEASED_TO_VENDOR,
        ) else None,
        'confirmeeParLeClient': order.fulfillment_status in (
            Order.FulfillmentStatus.BUYER_CONFIRMED, Order.FulfillmentStatus.AUTO_CONFIRMED,
            Order.FulfillmentStatus.RELEASED_TO_VENDOR,
        ),
        'annulation': _cancellation_for_order(order),
        'probleme': probleme,
        'gele': gele,
        'moyenPaiement': _moyen_paiement_for_order(order),
    }


def _etat_argent_for_order(order) -> str:
    ES = Order.EscrowStatus
    if order.escrow_status == ES.BLOCKED:
        return 'en_cours'
    if order.escrow_status == ES.RELEASE_PENDING:
        return 'se_libere'
    if order.escrow_status in (ES.REFUNDED, ES.PARTIAL_REFUNDED):
        return 'repris'
    if order.escrow_status == ES.RELEASED:
        return 'verse'
    return 'a_verser'


FILTRE_VERS_STATUTS = {
    'prep': {'a_preparer', 'payable_au_retrait'},
    'cours': {'prete', 'chez_le_livreur'},
    'fin': {'livree', 'annulee', 'payee'},
    'pb': {'litige_gele', 'retour_gele'},
}


def build_vue_commandes(orders_qs, vendor_profile, filtre: str) -> dict:
    vendor_user = vendor_profile.user
    all_commandes = [build_commande(o, vendor_profile) for o in orders_qs]

    detail = {
        'prep': sum(1 for c in all_commandes if c['statut'] in ('a_preparer', 'payable_au_retrait')),
        'cours': sum(1 for c in all_commandes if c['statut'] in ('prete', 'chez_le_livreur')),
        'litiges': sum(1 for c in all_commandes if c['statut'] == 'litige_gele'),
        'retours': sum(1 for c in all_commandes if c['statut'] == 'retour_gele'),
        'terminees': sum(1 for c in all_commandes if c['statut'] == 'livree'),
        'annulees': sum(1 for c in all_commandes if c['statut'] == 'annulee'),
    }
    compteurs = {
        'prep': detail['prep'],
        'cours': detail['cours'],
        'fin': detail['terminees'] + detail['annulees'],
        'pb': detail['litiges'] + detail['retours'],
    }
    wanted = FILTRE_VERS_STATUTS.get(filtre, set())
    items = [c for c in all_commandes if c['statut'] in wanted]
    return {
        'compteurs': compteurs,
        'detail': detail,
        'total': len(all_commandes),
        'items': items,
        'maintenant': _oh.now_ms(),
    }


def build_entree_journal(order, vendor_profile) -> list:
    """
    EntreeJournal[] (JRN-02, du plus récent au plus ancien) — réutilise le
    même matériau que VendorOrderSerializer.get_shipment() (OrderHistory +
    ShipmentEvent), présenté dans le format attendu par le nouveau frontend
    (a, auteur, role, action, avant/après).
    """
    vendor_user = vendor_profile.user
    entries = []

    entries.append({
        'a': _oh.dt_to_ms(order.created_at),
        'auteur': 'Système BelivaY',
        'role': 'systeme',
        'action': 'Achat client initié',
    })

    if order.vendor_acknowledged_at:
        entries.append({
            'a': _oh.dt_to_ms(order.vendor_acknowledged_at),
            'auteur': 'Vous',
            'role': 'proprietaire',
            'action': 'Commande confirmée',
            'detail': 'prête avant',
            'detailA': _oh.dt_to_ms(order.prep_deadline) if order.prep_deadline else None,
        })

    if order.prep_extended:
        entries.append({
            'a': _oh.dt_to_ms(order.updated_at),
            'auteur': 'Vous',
            'role': 'proprietaire',
            'action': 'Plus de temps demandé',
        })

    if order.not_ready_at:
        entries.append({
            'a': _oh.dt_to_ms(order.not_ready_at),
            'auteur': 'Livreur',
            'role': 'systeme',
            'action': 'Colis signalé pas prêt',
            'detail': order.not_ready_reason or '',
        })

    shipment = order.shipments.filter(vendor=vendor_user).first()
    if shipment:
        for event in shipment.events.all().select_related('actor').order_by('created_at'):
            entries.append({
                'a': _oh.dt_to_ms(event.created_at),
                'auteur': _shipment_event_actor_label(event),
                'role': 'proprietaire' if event.actor_role == 'VENDOR' else 'systeme',
                'action': SHIPMENT_STATUS_LABELS.get(event.status, event.status),
                'detail': event.message or None,
                'avant': SHIPMENT_STATUS_LABELS.get(event.previous_status, event.previous_status) if event.previous_status else None,
                'apres': SHIPMENT_STATUS_LABELS.get(event.status, event.status),
            })

    cancellation = _cancellation_for_order(order)
    if cancellation:
        entries.append({
            'a': cancellation['a'],
            'auteur': 'Système BelivaY',
            'role': 'systeme',
            'action': 'Commande annulée',
            'detail': cancellation['motif'],
        })

    entries.sort(key=lambda e: e['a'], reverse=True)
    return entries


# ── Préparation (bon de préparation, extend-options, ready, stockout) ───────

VERIFICATIONS = ['modele', 'etat', 'accessoires', 'boite']


def build_bon_preparation(order, vendor_profile) -> dict:
    vendor_user = vendor_profile.user
    items = list(order.items.filter(product__vendor=vendor_user))
    shipment = order.shipments.filter(vendor=vendor_user).first()
    slip_state = order.prep_slip_state or {}
    checks_state = slip_state.get('checks', {})

    lignes = []
    for i in items:
        product = i.product
        lignes.append({
            'titre': i.title_snapshot,
            'variante': _article_vendu(i)['variante'],
            'etat': _article_vendu(i)['etat'],
            'dessin': _article_vendu(i)['dessin'],
            'reference': (product.sku if product and product.sku else f"BLV-{i.id:05d}"),
            'quantite': i.qty,
            'aMettreDeCote': [],
        })

    ramassage = None
    if shipment:
        r = _ramassage_for_shipment(shipment)
        ramassage = {
            'debut': r['debut'], 'fin': r['fin'],
            'livreur': shipment.courier_name or '',
            'photo': '',
        }

    vendor_subtotal = sum(i.line_total_xaf for i in items)
    garde = net_vendeur(order, vendor_profile.user, vendor_subtotal)
    from apps.orders.models import PlatformSettings
    liberation_jours = round((getattr(PlatformSettings.get_settings(), 'escrow_release_h', 72) or 72) / 24) or 1

    return {
        'ref': _ref_commande(order),
        'colis': PARCEL_SIZE_TO_CLASSE.get(shipment.parcel_size if shipment else '', 'M'),
        'payeeA': _oh.dt_to_ms(order.created_at),
        'payableAuRetrait': order.delivery_method == Order.DeliveryMethod.PICKUP,
        'echeance': _oh.dt_to_ms(order.prep_deadline) if order.prep_deadline else None,
        'lignes': lignes,
        'aVerifier': [
            {
                'cle': cle,
                'fait': bool(checks_state.get(cle, {}).get('fait')),
                'par': checks_state.get(cle, {}).get('par'),
            }
            for cle in VERIFICATIONS
        ],
        'ramassage': ramassage,
        'garde': garde,
        'liberationJours': liberation_jours,
        'aPreparer': order.fulfillment_status in (
            Order.FulfillmentStatus.PAID_IN_ESCROW, Order.FulfillmentStatus.VENDOR_ACKNOWLEDGED,
            Order.FulfillmentStatus.PREPARING,
        ),
    }


# ── Remise (handover) ────────────────────────────────────────────────────────

def build_remise(order, vendor_profile) -> dict:
    vendor_user = vendor_profile.user
    items = list(order.items.filter(product__vendor=vendor_user))
    shipment = order.shipments.filter(vendor=vendor_user).first()
    probleme = _probleme_for_order(order, vendor_user)

    FS = Order.FulfillmentStatus
    if order.fulfillment_status in (FS.CANCELLED, FS.REFUNDED):
        etape = 'annulee'
    elif shipment and shipment.buyer_confirmed_at:
        etape = 'remise'
    elif order.fulfillment_status == FS.READY_FOR_PICKUP:
        etape = 'prete'
    else:
        etape = 'a_preparer'

    livreur = None
    niveau_requis = 'Nouveau'
    plafonds = {'nouveau': 75000, 'confirme': 250000}
    if shipment and shipment.courier_id:
        livreur_base = _livreur_for_shipment(shipment) or {}
        niveau = 'Confirme'
        try:
            from apps.accounts.models import TrustScoreProfile
            tsp = TrustScoreProfile.objects.filter(user=shipment.courier.user, role='COURIER').first()
            if tsp:
                niveau = {'NEW': 'Nouveau', 'CONFIRMED': 'Confirme', 'GOLD': 'Or', 'PLATINUM': 'Or'}.get(tsp.tier, 'Confirme')
        except Exception:
            pass
        ramassage = _ramassage_for_shipment(shipment)
        livreur = {**livreur_base, 'debut': ramassage['debut'], 'fin': ramassage['fin'], 'niveau': niveau}

    vendor_subtotal = sum(i.line_total_xaf for i in items)
    garde = net_vendeur(order, vendor_profile.user, vendor_subtotal)
    from apps.orders.models import PlatformSettings
    liberation_jours = round((getattr(PlatformSettings.get_settings(), 'escrow_release_h', 72) or 72) / 24) or 1

    autres = list(
        Order.objects.filter(
            items__product__vendor=vendor_user,
            fulfillment_status=FS.READY_FOR_PICKUP,
        ).exclude(id=order.id).distinct().values_list('id', flat=True)[:10]
    )

    return {
        'ref': _ref_commande(order),
        'article': _article_vendu(items[0]) if items else None,
        'quantite': sum(i.qty for i in items),
        'colis': PARCEL_SIZE_TO_CLASSE.get(shipment.parcel_size if shipment else '', 'M'),
        'payableAuRetrait': order.delivery_method == Order.DeliveryMethod.PICKUP,
        'etape': etape,
        'echeance': _oh.dt_to_ms(order.prep_deadline) if order.prep_deadline else None,
        'preteA': _oh.dt_to_ms(order.updated_at) if order.fulfillment_status == FS.READY_FOR_PICKUP else None,
        'livreur': livreur,
        # Essais/blocage non câblés : la vérification du code se fait côté livreur,
        # pas encore construite dans ce backend (voir rapport).
        'essaisFaux': 0,
        'essaisMax': 3,
        'blocageHeures': 24,
        'bloqueJusqua': None,
        'nouveauCodeDemande': False,
        'remiseA': _oh.dt_to_ms(shipment.buyer_confirmed_at) if shipment and shipment.buyer_confirmed_at else None,
        'photos': [],
        'erreur': None,
        'creneauManque': (
            {'debut': _oh.dt_to_ms(order.not_ready_at), 'fin': _oh.dt_to_ms(order.not_ready_at) + _oh.H}
            if order.not_ready_at and etape != 'remise' else None
        ),
        'valeurColis': vendor_subtotal,
        'niveauRequis': niveau_requis,
        'plafonds': plafonds,
        'fileHeures': 72,
        'garde': garde,
        'suite': {
            'palier': vendor_profile.get_certification_tier_display(),
            'liberationJours': liberation_jours,
            'confirmationJours': 4,
            'numero': f"BLV-VS-{order.id:05d}",
        } if etape == 'remise' else None,
        'autresPourCeLivreur': [str(i) for i in autres],
    }


def build_recu(order, vendor_profile) -> dict:
    vendor_user = vendor_profile.user
    items = list(order.items.filter(product__vendor=vendor_user))
    vendor_subtotal = sum(i.line_total_xaf for i in items)
    garde = net_vendeur(order, vendor_profile.user, vendor_subtotal)
    moyen = _moyen_paiement_for_order(order)
    encaisse_a = None
    if order.payment_status == Order.PaymentStatus.PAID:
        encaisse_a = _oh.dt_to_ms(order.created_at)
    return {
        'ref': _ref_commande(order),
        'encaisseA': encaisse_a,
        'article': _article_vendu(items[0]) if items else None,
        'quantite': sum(i.qty for i in items),
        'colis': PARCEL_SIZE_TO_CLASSE.get(order.shipments.filter(vendor=vendor_user).values_list('parcel_size', flat=True).first() or '', 'M'),
        'prix': vendor_subtotal,
        'garde': garde,
        'moyen': moyen,
        'fraisPayesParLeClient': moyen == 'carte',
        'argent': {
            'etat': _etat_argent_for_order(order),
            'liberation': _oh.dt_to_ms(order.updated_at) if order.escrow_status == Order.EscrowStatus.RELEASE_PENDING else None,
            'vendredi': None,
        },
    }


def build_recu_resume(order, vendor_profile) -> dict:
    vendor_user = vendor_profile.user
    items = list(order.items.filter(product__vendor=vendor_user))
    vendor_subtotal = sum(i.line_total_xaf for i in items)
    garde = net_vendeur(order, vendor_profile.user, vendor_subtotal)
    encaisse_a = _oh.dt_to_ms(order.created_at) if order.payment_status == Order.PaymentStatus.PAID else None
    article = _article_vendu(items[0]) if items else {'titre': '', 'dessin': ''}
    return {
        'ref': _ref_commande(order),
        'encaisseA': encaisse_a,
        'titre': article.get('titre', ''),
        'dessin': article.get('dessin', ''),
        'prix': vendor_subtotal,
        'garde': garde,
    }    
