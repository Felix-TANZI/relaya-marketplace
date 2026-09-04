# backend/apps/orders/serializers.py
# Serializers pour les commandes avec séparation payment_status et fulfillment_status

from rest_framework import serializers
import os
from django.db.models import Count, Q
from django.utils.text import slugify
from django.utils import timezone
import unicodedata
from decimal import Decimal, ROUND_HALF_UP
from .models import (
    Order, OrderItem, Dispute, DisputeMessage,
    DisputeEvidence, DisputeEvidenceRequest, Return,
)
from apps.catalog.models import Category, Product, ProductMedia


def _city_variants(value):
    raw = (value or "").strip()
    if not raw:
        return []

    normalized = unicodedata.normalize("NFKD", raw)
    ascii_city = "".join(ch for ch in normalized if not unicodedata.combining(ch))
    compact = ascii_city.replace(" ", "").replace("-", "").replace("_", "").upper()

    variants = {raw, ascii_city, raw.upper(), ascii_city.upper(), compact}
    aliases = {
        "YAOUNDE": {"YAOUNDE", "Yaounde", "Yaoundé", "yaounde", "yaoundé"},
        "DOUALA": {"DOUALA", "Douala", "douala"},
    }
    variants.update(aliases.get(compact, set()))
    return [variant for variant in variants if variant]


def _commission_rate_for_product(product, settings):
    """Taux BelivaY au moment de la commande, avec priorité au plan vendeur actif."""
    base_rate = Decimal(str(settings.platform_commission_percent))
    vendor_profile = getattr(getattr(product, "vendor", None), "vendor_profile", None)
    plan = getattr(vendor_profile, "current_plan", None) if vendor_profile else None
    plan_active = False
    if vendor_profile and plan:
        expires_at = getattr(vendor_profile, "plan_expires_at", None)
        plan_active = expires_at is None or expires_at > timezone.now()
    if plan_active:
        base_rate = Decimal(str(plan.commission_rate))

    if product.price_xaf < 5000:
        base_rate += Decimal("3.00")

    return max(base_rate, Decimal("5.00"))


def _weighted_commission_rate(order_items_data, settings):
    total = sum(item["line_total_xaf"] for item in order_items_data)
    if total <= 0:
        return Decimal(str(settings.platform_commission_percent))
    weighted = Decimal("0.00")
    for item in order_items_data:
        rate = _commission_rate_for_product(item["product"], settings)
        weighted += Decimal(item["line_total_xaf"]) * rate
    return (weighted / Decimal(total)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def _compute_delivery_price(order_items_data, delivery_mode, destination_zone):
    """
    Grille de prix reelle (BelivaY_Regles_Systeme_DEV v2.0 §3.1), calculee
    cote serveur et figee au paiement (regle en dur #4) — remplace l'ancien
    forfait plat par ville.

    Base : 500F (retrait relais) / 1000F (livraison domicile) — couvre 1
    ramassage. +500F par vendeur supplementaire dans la MEME zone que les
    precedents, +1000F par vendeur supplementaire dans une zone DIFFERENTE.
    + majoration si la destination est en zone Vague 3.
    """
    seen_vendor_ids = set()
    vendors_in_order = []
    for item in order_items_data:
        vendor = item['product'].vendor
        vid = vendor.id if vendor else None
        if vid in seen_vendor_ids:
            continue
        seen_vendor_ids.add(vid)
        vendors_in_order.append(vendor)

    if not vendors_in_order:
        return 0

    base = 500 if delivery_mode == 'PICKUP' else 1000
    total = base

    def _vendor_zone_id(vendor):
        if not vendor:
            return None
        profile = getattr(vendor, "vendor_profile", None)
        return profile.zone_id if profile else None

    seen_zone_ids = set()
    first_zone_id = _vendor_zone_id(vendors_in_order[0])
    if first_zone_id:
        seen_zone_ids.add(first_zone_id)

    for vendor in vendors_in_order[1:]:
        zone_id = _vendor_zone_id(vendor)
        if zone_id and zone_id in seen_zone_ids:
            total += 500
        else:
            total += 1000
            if zone_id:
                seen_zone_ids.add(zone_id)

    if destination_zone is not None and destination_zone.tier == destination_zone.Tier.VAGUE_3:
        total += destination_zone.surcharge_xaf

    return total


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
    relay_point_name = serializers.CharField(source='relay_point.name', read_only=True, default=None)

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
            'region',
            'district',
            'address',
            'address_precision',
            'delivery_latitude',
            'delivery_longitude',
            'note',
            'authorized_pickup_name',
            'authorized_pickup_phone',
            'relay_point',
            'relay_point_name',
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
    district = serializers.CharField(
        max_length=100,
        required=False,
        allow_blank=True,
        help_text="Quartier de livraison"
    )
    delivery_latitude = serializers.DecimalField(
        max_digits=9, decimal_places=6, required=False, allow_null=True,
        help_text="Latitude GPS donnee par le client (bouton 'Ma position')"
    )
    delivery_longitude = serializers.DecimalField(
        max_digits=9, decimal_places=6, required=False, allow_null=True,
        help_text="Longitude GPS donnee par le client (bouton 'Ma position')"
    )
    address = serializers.CharField(
        max_length=255,
        required=False,
        allow_blank=True,
        help_text="Adresse complète de livraison"
    )
    address_precision = serializers.JSONField(
        required=False,
        help_text="Analyse structurée de l'adresse validée par le client"
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
    relay_point_id = serializers.IntegerField(
        required=False,
        allow_null=True,
        help_text="Point relais choisi par l'acheteur (retrait via reseau de points relais partenaires)",
    )
    authorized_pickup_name = serializers.CharField(
        max_length=120,
        required=False,
        allow_blank=True,
        help_text="Nom d'un tiers autorisé à retirer le colis à la place du client (optionnel)",
    )
    authorized_pickup_phone = serializers.CharField(
        max_length=32,
        required=False,
        allow_blank=True,
        help_text="Téléphone du tiers autorisé au retrait (optionnel)",
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

    def _get_or_create_demo_product(self, item):
        if not item.get('is_demo'):
            raise serializers.ValidationError(
                f"Produit {item['product_id']} introuvable"
            )

        title = str(item.get('title') or f"Produit demo {item['product_id']}").strip()
        if not title:
            title = f"Produit demo {item['product_id']}"

        try:
            price_xaf = int(item.get('price_xaf') or 0)
        except (TypeError, ValueError):
            price_xaf = 0
        if price_xaf < 1:
            price_xaf = 1000

        category, _ = Category.objects.get_or_create(
            slug="produits-demo",
            defaults={"name": "Produits demo", "is_active": True},
        )

        base_slug = slugify(f"demo-{item['product_id']}-{title}") or f"demo-{item['product_id']}"
        slug = base_slug
        suffix = 1
        while Product.objects.filter(slug=slug).exists():
            slug = f"{base_slug}-{suffix}"
            suffix += 1

        product = Product.objects.create(
            id=item['product_id'],
            title=title,
            slug=slug,
            description=(
                "Produit de demonstration cree automatiquement pour tester "
                "le workflow commande/livraison."
            ),
            short_description="Produit de demonstration pour test workflow.",
            price_xaf=price_xaf,
            discount=0,
            is_active=True,
            category=category,
        )

        image_url = str(item.get('image_url') or "").strip()
        if image_url:
            ProductMedia.objects.create(
                product=product,
                url=image_url,
                media_type="image",
                sort_order=0,
            )

        return product

    def create(self, validated_data):
        """Créer une nouvelle commande"""
        from .models import PlatformSettings
        from apps.shipping.models import Shipment, ShipmentEvent
        from apps.orders.models import OrderHistory
        from apps.accounts.models import UserNotification

        cart_items = validated_data.pop('cart_items')
        user = self.context['request'].user if self.context['request'].user.is_authenticated else None
        
        # Calculer le sous-total
        subtotal = 0
        order_items_data = []
        
        for item in cart_items:
            try:
                product = Product.objects.get(id=item['product_id'])
            except Product.DoesNotExist:
                product = self._get_or_create_demo_product(item)
            
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

        # Calculer les frais de livraison — grille reelle §3.1, jamais un
        # forfait plat par ville (regle en dur #4 : calcul cote serveur,
        # fige au paiement).
        settings = PlatformSettings.get_settings()
        from apps.shipping.models import Zone as _Zone

        destination_zone = _Zone.match(validated_data['city'], validated_data.get('district', ''))
        delivery_fee = _compute_delivery_price(order_items_data, delivery_mode, destination_zone)
        commission_rate_snapshot = _weighted_commission_rate(order_items_data, settings)

        address = validated_data.get('address', '').strip()
        if delivery_mode == 'DELIVERY' and not address:
            raise serializers.ValidationError({
                'address': "L'adresse est obligatoire pour une livraison."
            })

        relay_point_obj = None
        relay_point_id = validated_data.get('relay_point_id')
        if delivery_mode == 'PICKUP' and relay_point_id:
            from apps.accounts.models import RelayPointProfile
            from apps.shipping.models import RelayParcel as _RelayParcel

            try:
                relay_point_obj = RelayPointProfile.objects.get(
                    id=relay_point_id, is_active=True, status=RelayPointProfile.Status.APPROVED,
                )
            except RelayPointProfile.DoesNotExist:
                raise serializers.ValidationError({'relay_point_id': "Ce point relais n'est plus disponible."})

            occupancy = _RelayParcel.objects.filter(
                relay_point=relay_point_obj,
                status__in=[_RelayParcel.Status.EXPECTED, _RelayParcel.Status.RECEIVED, _RelayParcel.Status.STORED],
            ).count()
            if relay_point_obj.storage_capacity and occupancy >= relay_point_obj.storage_capacity:
                raise serializers.ValidationError({
                    'relay_point_id': "Ce point relais vient d'atteindre sa capacité — choisissez-en un autre.",
                })

            address = f"{relay_point_obj.name} - {relay_point_obj.address}"

        if delivery_mode == 'PICKUP' and not address:
            address = f"Retrait en boutique - {validated_data['city']}"

        address_precision = validated_data.get('address_precision') or {}
        if not isinstance(address_precision, dict):
            address_precision = {}

        note = validated_data.get('note', '').strip()
        if delivery_mode == 'PICKUP':
            note = f"[PICKUP] {note}".strip()

        # La region se deduit de la ville (une seule region par ville geree pour l'instant).
        region = {'YAOUNDE': 'Centre', 'DOUALA': 'Littoral'}.get(validated_data['city'], '')

        # Créer la commande avec l'ancien format de status
        order = Order.objects.create(
            user=user,
            customer_email=validated_data.get('customer_email', ''),
            customer_phone=validated_data['customer_phone'],
            delivery_method=delivery_mode,
            relay_point=relay_point_obj,
            city=validated_data['city'],
            region=region,
            district=validated_data.get('district', '').strip(),
            zone=destination_zone,
            address=address,
            address_precision=address_precision,
            delivery_latitude=validated_data.get('delivery_latitude'),
            delivery_longitude=validated_data.get('delivery_longitude'),
            note=note,
            authorized_pickup_name=validated_data.get('authorized_pickup_name', '').strip(),
            authorized_pickup_phone=validated_data.get('authorized_pickup_phone', '').strip(),
            subtotal_xaf=subtotal,
            delivery_fee_xaf=delivery_fee,
            total_xaf=subtotal + delivery_fee,
            commission_rate_snapshot=commission_rate_snapshot,
            payment_status=Order.PaymentStatus.PENDING,
            fulfillment_status=Order.FulfillmentStatus.CREATED,
        )
        
        # Créer les articles de la commande
        for item_data in order_items_data:
            OrderItem.objects.create(order=order, **item_data)

        vendor_users = {
            item_data['product'].vendor
            for item_data in order_items_data
            if item_data['product'].vendor_id
        }
        if not vendor_users:
            from apps.vendors.models import VendorProfile

            fallback_vendor = (
                VendorProfile.objects.filter(status=VendorProfile.Status.APPROVED)
                .filter(Q(city__iexact=order.city) | Q(city__isnull=True) | Q(city=""))
                .select_related("user")
                .order_by("created_at")
                .first()
            )
            if not fallback_vendor:
                fallback_vendor = (
                    VendorProfile.objects.filter(status=VendorProfile.Status.APPROVED)
                    .select_related("user")
                    .order_by("created_at")
                    .first()
                )
            if fallback_vendor:
                vendor_users.add(fallback_vendor.user)

        for vendor_user in vendor_users:
            UserNotification.objects.create(
                user=vendor_user,
                title=f"Commande initiée à {order.city}",
                message=(
                    f"Une commande a été initiée à {order.city}. "
                    f"Total estimé: {order.total_xaf} FCFA. Consulte ton espace vendeur pour la préparer."
                ),
                notification_type=UserNotification.NotificationType.ORDER,
                action_url="/seller/orders",
            )

        # Un colis par vendeur ET par commande (regle mere, Regles_Systeme_DEV
        # v2.0 §1/§10.1) : un Shipment par vendeur present dans la commande,
        # jamais un Shipment partage entre plusieurs vendeurs.
        created_shipments = []
        for vendor_user in vendor_users:
            shipment = Shipment.objects.create(
                order=order, vendor=vendor_user, status=Shipment.Status.CREATED,
            )
            created_shipments.append(shipment)
            ShipmentEvent.objects.create(
                shipment=shipment,
                status=Shipment.Status.CREATED,
                message="Commande recuee et en attente de prise en charge",
                location=order.city,
            )

            if relay_point_obj is not None:
                from apps.shipping.models import RelayParcel as _RelayParcel

                shipment.relay_point = relay_point_obj.name
                shipment.save(update_fields=["relay_point", "updated_at"])
                _RelayParcel.objects.create(
                    shipment=shipment,
                    relay_point=relay_point_obj,
                    status=_RelayParcel.Status.EXPECTED,
                    # pickup_code intentionnellement vide : regle en dur #3,
                    # le code de retrait ne part qu'a l'arrivee reelle du
                    # (dernier) colis au relais — voir RelayParcelReceiveSerializer.
                )

        # ─────────────────────────────────────────────────────────────────
        # LE COURT-CIRCUIT DE PAIEMENT EST DESACTIVE
        #
        # Ce bloc marquait la commande PAID et liberait les fonds au vendeur
        # des sa creation, quand le paiement n'existait pas encore.
        #
        # Il EMPECHE desormais tout paiement reel : `split_order_by_vendor`
        # refuse d'eclater une commande deja payee — on ne redistribue pas
        # de l'argent encaisse. Le checkout echouait donc silencieusement,
        # et aucune intention n'etait creee.
        #
        # Il rendait aussi le sequestre inutile : liberer au vendeur avant
        # meme la livraison annule toute la protection acheteur.
        #
        # La commande reste en PENDING. C'est l'encaissement reel qui la
        # fera passer en PAID, via le miroir du module financier.
        #
        # Pour reactiver ce raccourci — tests d'interface sans paiement —
        # poser BELIVAY_SIMULATE_PAYMENT=1 dans l'environnement. Le module
        # financier refusera alors d'eclater, ce qui est le comportement
        # attendu : on ne peut pas avoir les deux a la fois.
        # ─────────────────────────────────────────────────────────────────
        if os.environ.get("BELIVAY_SIMULATE_PAYMENT") == "1":
            order.confirm_payment()
            OrderHistory.objects.create(
                order=order,
                user=user,
                action="Paiement simulé (BELIVAY_SIMULATE_PAYMENT)",
                field_name="payment_status",
                old_value=Order.PaymentStatus.PENDING,
                new_value=Order.PaymentStatus.PAID,
            )

            order.release_to_vendor()
            OrderHistory.objects.create(
                order=order,
                user=user,
                action="Fonds libérés automatiquement au vendeur (simulation)",
                field_name="escrow_status",
                old_value=Order.EscrowStatus.BLOCKED,
                new_value=Order.EscrowStatus.RELEASED,
            )

        # Regle fondatrice (Regles_Systeme_DEV v2.0 §5) : un colis a destination
        # d'un relais part toujours en groupe, jamais individuellement des sa
        # creation. Si la zone est couverte, on laisse le colis en attente pour
        # le composeur de tournees (apps.shipping.tournees, execute
        # periodiquement) ; sinon — zone non couverte ou gros colis (cas 3,
        # jamais publie sur la bourse) — on retombe sur l'affectation
        # individuelle immediate, comme avant.
        from apps.shipping.assignment import assign_shipment_or_mark_blocked
        from apps.shipping.tournees import OVERSIZED_PARCEL_SIZES

        for shipment in created_shipments:
            zone_covered = order.zone_id is not None
            oversized = shipment.parcel_size in OVERSIZED_PARCEL_SIZES
            if zone_covered and not oversized:
                continue  # attend le composeur de tournees

            before_courier_id = shipment.courier_id
            assign_shipment_or_mark_blocked(shipment)
            if shipment.courier_id and shipment.courier_id != before_courier_id:
                UserNotification.objects.create(
                    user=shipment.courier.user,
                    title=f"Nouvelle livraison #{order.id}",
                    message=f"Une commande est disponible dans ta tournee: {order.city} - {order.address}.",
                    notification_type=UserNotification.NotificationType.ORDER,
                    action_url="/courier",
                )

        return order


class DisputeMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.SerializerMethodField()
    evidences = serializers.SerializerMethodField()

    class Meta:
        model = DisputeMessage
        fields = ['id', 'sender', 'sender_name', 'message', 'is_internal', 'created_at', 'evidences']
        read_only_fields = fields

    def get_sender_name(self, obj):
        return obj.sender.get_full_name() or obj.sender.username

    def get_evidences(self, obj):
        return DisputeEvidenceSerializer(
            obj.evidences.all(), many=True, context=self.context,
        ).data


class DisputeEvidenceSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.CharField(source='uploaded_by.username', read_only=True)
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = DisputeEvidence
        fields = ['id', 'request', 'evidence_type', 'uploader_role', 'uploaded_by_name', 'file_url', 'description', 'created_at']
        read_only_fields = fields

    def get_file_url(self, obj):
        request = self.context.get('request')
        if not obj.file:
            return None
        return request.build_absolute_uri(obj.file.url) if request else obj.file.url


class DisputeEvidenceRequestSerializer(serializers.ModelSerializer):
    requested_from_name = serializers.CharField(source='requested_from.username', read_only=True)
    requested_by_name = serializers.CharField(source='requested_by.username', read_only=True)
    evidences = DisputeEvidenceSerializer(many=True, read_only=True)

    class Meta:
        model = DisputeEvidenceRequest
        fields = [
            'id', 'dispute', 'recipient_role', 'requested_from', 'requested_from_name',
            'requested_by_name', 'evidence_types', 'instructions', 'due_at',
            'status', 'responded_at', 'created_at', 'evidences',
        ]
        read_only_fields = fields


class DisputeSerializer(serializers.ModelSerializer):
    messages = DisputeMessageSerializer(many=True, read_only=True)
    evidences = DisputeEvidenceSerializer(many=True, read_only=True)
    evidence_requests = serializers.SerializerMethodField()
    product_title = serializers.CharField(source='product.title', read_only=True)
    vendor_username = serializers.CharField(source='vendor.username', read_only=True)
    order_item_title = serializers.CharField(source='order_item.title_snapshot', read_only=True)

    def get_evidence_requests(self, obj):
        request = self.context.get('request')
        queryset = obj.evidence_requests.all()
        if request and not request.user.is_staff:
            queryset = queryset.filter(requested_from=request.user)
        return DisputeEvidenceRequestSerializer(queryset, many=True, context=self.context).data

    class Meta:
        model = Dispute
        fields = [
            'id',
            'order',
            'order_item',
            'order_item_title',
            'product',
            'product_title',
            'vendor',
            'vendor_username',
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
            'evidences',
            'evidence_requests',
        ]
        read_only_fields = [
            'id',
            'order',
            'product',
            'vendor',
            'opened_by',
            'status',
            'resolution',
            'resolution_note',
            'refund_amount_xaf',
            'created_at',
            'updated_at',
            'messages',
            'evidences',
            'evidence_requests',
        ]


class DisputeCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Dispute
        fields = ['order_item', 'reason', 'description']


class DisputeMessageCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = DisputeMessage
        fields = ['message']


class ReturnSerializer(serializers.ModelSerializer):
    order_item_title = serializers.CharField(source='order_item.title_snapshot', read_only=True)
    vendor_username = serializers.CharField(source='vendor.username', read_only=True)
    requested_by_name = serializers.SerializerMethodField()
    relay_point_name = serializers.CharField(source='dropoff_relay_point.name', read_only=True, default='')
    is_free_for_buyer = serializers.SerializerMethodField()

    class Meta:
        model = Return
        fields = [
            'id', 'order', 'order_item', 'order_item_title',
            'requested_by', 'requested_by_name', 'vendor', 'vendor_username',
            'reason', 'description', 'status',
            'transport_mode', 'dropoff_relay_point', 'relay_point_name',
            'reviewed_at', 'review_note',
            'received_at', 'inspection_passed', 'inspection_note',
            'refund_amount_xaf', 'is_free_for_buyer',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'order', 'requested_by', 'vendor', 'status',
            'reviewed_at', 'review_note',
            'received_at', 'inspection_passed', 'inspection_note',
            'refund_amount_xaf', 'created_at', 'updated_at',
        ]

    def get_requested_by_name(self, obj):
        return obj.requested_by.get_full_name() or obj.requested_by.username

    def get_is_free_for_buyer(self, obj):
        # Regle verrouillee (lancement) : tout retour accepte est un retour
        # pour faute produit — le renvoi n'est jamais facture a l'acheteur.
        # Le "retour pour convenance" payant est une phase future, non construite.
        return True


class ReturnCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Return
        fields = ['order_item', 'reason', 'description', 'transport_mode']


class ReturnReviewSerializer(serializers.Serializer):
    decision = serializers.ChoiceField(choices=['APPROVED', 'REJECTED'])
    note = serializers.CharField(required=False, allow_blank=True, default='')


class ReturnFinalizeSerializer(serializers.Serializer):
    inspection_passed = serializers.BooleanField()
    refund_amount_xaf = serializers.IntegerField(required=False, allow_null=True, default=None)
    note = serializers.CharField(required=False, allow_blank=True, default='')