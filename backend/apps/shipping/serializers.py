from rest_framework import serializers
from rest_framework.exceptions import PermissionDenied
from django.utils import timezone
from django.shortcuts import get_object_or_404
from apps.orders.models import Dispute, Order
from apps.accounts.models import UserNotification
from .models import CourierSOSAlert, RelayParcel, Shipment, ShipmentEvent, ShipmentMessage


class ShipmentEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = ShipmentEvent
        fields = ["id", "status", "message", "location", "created_at"]


class ShipmentSerializer(serializers.ModelSerializer):
    events = ShipmentEventSerializer(many=True, read_only=True)
    courier = serializers.SerializerMethodField()
    customer_name = serializers.SerializerMethodField()
    customer_phone = serializers.SerializerMethodField()
    delivery_address = serializers.SerializerMethodField()
    city = serializers.SerializerMethodField()
    order_total_xaf = serializers.SerializerMethodField()
    courier_payout_xaf = serializers.SerializerMethodField()
    fulfillment_status = serializers.SerializerMethodField()
    vendor_names = serializers.SerializerMethodField()
    assignment = serializers.SerializerMethodField()
    relay_parcel = serializers.SerializerMethodField()

    class Meta:
        model = Shipment
        fields = [
            "id",
            "order",
            "status",
            "courier",
            "courier_name",
            "courier_phone",
            "customer_name",
            "customer_phone",
            "delivery_address",
            "city",
            "order_total_xaf",
            "courier_payout_xaf",
            "fulfillment_status",
            "vendor_names",
            "relay_point",
            "required_vehicle_type",
            "parcel_size",
            "assignment",
            "relay_parcel",
            "created_at",
            "updated_at",
            "events",
        ]

    def get_courier(self, obj):
        if not obj.courier:
            return None
        return {
            "id": obj.courier.id,
            "user_id": obj.courier.user_id,
            "phone": obj.courier.phone,
            "city": obj.courier.city,
            "vehicle_type": obj.courier.vehicle_type,
            "is_online": obj.courier.is_online,
        }

    def get_customer_name(self, obj):
        user = getattr(obj.order, "user", None)
        if user:
            full_name = f"{user.first_name} {user.last_name}".strip()
            if full_name:
                return full_name
            return user.username
        return obj.order.customer_email or f"Client #{obj.order_id}"

    def get_customer_phone(self, obj):
        return obj.order.customer_phone

    def get_delivery_address(self, obj):
        return obj.order.address

    def get_city(self, obj):
        return obj.order.city

    def get_order_total_xaf(self, obj):
        request = self.context.get("request")
        if request and hasattr(request.user, "courier_profile") and not request.user.is_staff:
            return self.get_courier_payout_xaf(obj)
        return obj.order.total_xaf

    def get_courier_payout_xaf(self, obj):
        return max(1000, round((obj.order.delivery_fee_xaf or 0) * 0.75)) if obj.order.delivery_fee_xaf else 1500

    def get_fulfillment_status(self, obj):
        return obj.order.fulfillment_status

    def get_vendor_names(self, obj):
        names = []
        items = obj.order.items.select_related("product__vendor__vendor_profile")
        for item in items:
            vendor_user = getattr(item.product, "vendor", None)
            if not vendor_user:
                continue
            vendor_profile = getattr(vendor_user, "vendor_profile", None)
            names.append(
                vendor_profile.business_name
                if vendor_profile and vendor_profile.business_name
                else vendor_user.get_full_name().strip() or vendor_user.username
            )
        return list(dict.fromkeys(names))

    def get_assignment(self, obj):
        return {
            "issue_code": obj.assignment_issue_code,
            "issue_message": obj.assignment_issue_message,
            "is_blocked": obj.status in [
                Shipment.Status.WAITING_MANUAL_ASSIGNMENT,
                Shipment.Status.ZONE_UNCOVERED,
                Shipment.Status.CAPACITY_BLOCKED,
                Shipment.Status.VEHICLE_INCOMPATIBLE,
            ],
        }

    def get_relay_parcel(self, obj):
        parcel = getattr(obj, "relay_parcel", None)
        if not parcel:
            return None
        return RelayParcelSerializer(parcel).data


class ShipmentCreateSerializer(serializers.Serializer):
    """
    Créer un Shipment pour une commande.
    V1 : l’admin/support crée et assigne éventuellement un livreur.
    """
    order_id = serializers.IntegerField()
    courier_id = serializers.IntegerField(required=False)
    courier_name = serializers.CharField(required=False, allow_blank=True)
    courier_phone = serializers.CharField(required=False, allow_blank=True)
    relay_point = serializers.CharField(required=False, allow_blank=True, default="")
    required_vehicle_type = serializers.CharField(required=False, allow_blank=True, default="")
    parcel_size = serializers.CharField(required=False, allow_blank=True, default="STANDARD")

    def validate_order_id(self, value):
        if not Order.objects.filter(id=value).exists():
            raise serializers.ValidationError("Order not found")
        return value

    def create(self, validated_data):
        order_id = validated_data["order_id"]
        shipment, created = Shipment.objects.get_or_create(order_id=order_id)
        courier_id = validated_data.get("courier_id")

        if courier_id:
            from apps.accounts.models import CourierProfile

            courier = CourierProfile.objects.filter(
                id=courier_id,
                is_active=True,
                is_approved=True,
            ).select_related("user").first()
            if not courier:
                raise serializers.ValidationError({"courier_id": "Courier not found or not approved"})
            shipment.courier = courier
            shipment.courier_name = courier.user.get_full_name().strip() or courier.user.username
            shipment.courier_phone = courier.phone

        if "courier_name" in validated_data:
            shipment.courier_name = validated_data["courier_name"]
        if "courier_phone" in validated_data:
            shipment.courier_phone = validated_data["courier_phone"]
        shipment.relay_point = validated_data.get("relay_point", shipment.relay_point)
        shipment.required_vehicle_type = validated_data.get("required_vehicle_type", shipment.required_vehicle_type)
        shipment.parcel_size = validated_data.get("parcel_size", shipment.parcel_size or "STANDARD")

        # Si livreur renseigné => ASSIGNED, sinon tentative d'affectation partenaire.
        if shipment.courier_name or shipment.courier_phone:
            shipment.status = Shipment.Status.ASSIGNED
            shipment.assignment_issue_code = ""
            shipment.assignment_issue_message = ""
            shipment.save()
        else:
            shipment.save()
            from .assignment import assign_shipment_or_mark_blocked

            shipment = assign_shipment_or_mark_blocked(shipment, required_vehicle_type=shipment.required_vehicle_type)

        # Ajoute un event (V1 simple)
        ShipmentEvent.objects.create(
            shipment=shipment,
            status=shipment.status,
            message="Shipment created" if created else "Shipment updated",
            location="",
        )

        if shipment.courier_id:
            UserNotification.objects.create(
                user=shipment.courier.user,
                title=f"Nouvelle livraison #{shipment.order_id}",
                message=(
                    f"Une commande a ete assignee a ta tournee: "
                    f"{shipment.order.city} - {shipment.order.address}."
                ),
                notification_type=UserNotification.NotificationType.ORDER,
                action_url="/courier",
            )

        return shipment


class RelayParcelSerializer(serializers.ModelSerializer):
    shipment_id = serializers.IntegerField(source="shipment.id", read_only=True)
    order_id = serializers.IntegerField(source="shipment.order_id", read_only=True)
    relay_point_name = serializers.CharField(source="relay_point.name", read_only=True)
    customer_phone = serializers.CharField(source="shipment.order.customer_phone", read_only=True)
    delivery_address = serializers.CharField(source="shipment.order.address", read_only=True)
    city = serializers.CharField(source="shipment.order.city", read_only=True)

    class Meta:
        model = RelayParcel
        fields = [
            "id",
            "shipment_id",
            "order_id",
            "relay_point",
            "relay_point_name",
            "status",
            "slot_code",
            "pickup_code",
            "proof_note",
            "customer_phone",
            "delivery_address",
            "city",
            "received_at",
            "picked_up_at",
            "returned_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class RelayParcelReceiveSerializer(serializers.Serializer):
    shipment_id = serializers.IntegerField(required=False)
    order_id = serializers.IntegerField(required=False)
    slot_code = serializers.CharField(required=False, allow_blank=True, default="")
    proof_note = serializers.CharField(required=False, allow_blank=True, default="")

    def validate(self, attrs):
        if not attrs.get("shipment_id") and not attrs.get("order_id"):
            raise serializers.ValidationError("shipment_id ou order_id est obligatoire.")
        return attrs

    def save(self, **kwargs):
        relay_point = self.context["relay_point"]
        shipment_qs = Shipment.objects.select_related("order")
        if self.validated_data.get("shipment_id"):
            shipment = get_object_or_404(shipment_qs, id=self.validated_data["shipment_id"])
        else:
            shipment = get_object_or_404(shipment_qs, order_id=self.validated_data["order_id"])

        active_count = RelayParcel.objects.filter(
            relay_point=relay_point,
            status__in=[RelayParcel.Status.RECEIVED, RelayParcel.Status.STORED],
        ).count()
        capacity = relay_point.storage_capacity or 0
        if capacity and active_count >= capacity:
            raise serializers.ValidationError({"capacity": "Capacite point relais atteinte."})

        import secrets

        parcel, _ = RelayParcel.objects.get_or_create(
            shipment=shipment,
            defaults={"relay_point": relay_point},
        )
        parcel.relay_point = relay_point
        parcel.status = RelayParcel.Status.STORED
        parcel.slot_code = self.validated_data.get("slot_code") or parcel.slot_code or f"SL-{relay_point.id}-{shipment.id}"
        parcel.pickup_code = parcel.pickup_code or secrets.token_hex(3).upper()
        parcel.proof_note = self.validated_data.get("proof_note", "")
        parcel.received_at = timezone.now()
        parcel.save()

        shipment.relay_point = relay_point.name
        shipment.status = Shipment.Status.IN_TRANSIT
        shipment.assignment_issue_code = ""
        shipment.assignment_issue_message = ""
        shipment.save(update_fields=["relay_point", "status", "assignment_issue_code", "assignment_issue_message", "updated_at"])
        ShipmentEvent.objects.create(
            shipment=shipment,
            status=Shipment.Status.IN_TRANSIT,
            message=f"Colis recu et stocke au point relais {relay_point.name}",
            location=relay_point.name,
        )
        return parcel


class RelayParcelPickupSerializer(serializers.Serializer):
    parcel_id = serializers.IntegerField()
    pickup_code = serializers.CharField()
    proof_note = serializers.CharField(required=False, allow_blank=True, default="")

    def save(self, **kwargs):
        relay_point = self.context["relay_point"]
        parcel = get_object_or_404(
            RelayParcel.objects.select_related("shipment", "shipment__order", "relay_point"),
            id=self.validated_data["parcel_id"],
            relay_point=relay_point,
        )
        if parcel.pickup_code and parcel.pickup_code != self.validated_data["pickup_code"]:
            raise serializers.ValidationError({"pickup_code": "Code de retrait incorrect."})
        parcel.status = RelayParcel.Status.PICKED_UP
        parcel.proof_note = self.validated_data.get("proof_note", parcel.proof_note)
        parcel.picked_up_at = timezone.now()
        parcel.save()

        shipment = parcel.shipment
        shipment.status = Shipment.Status.DELIVERED
        shipment.save(update_fields=["status", "updated_at"])
        shipment.order.mark_delivered()
        ShipmentEvent.objects.create(
            shipment=shipment,
            status=Shipment.Status.DELIVERED,
            message=f"Colis retire au point relais {relay_point.name}",
            location=relay_point.name,
        )
        return parcel


class RelayParcelReturnSerializer(serializers.Serializer):
    parcel_id = serializers.IntegerField()
    destination = serializers.ChoiceField(choices=["VENDOR", "BELIVAY"])
    proof_note = serializers.CharField(required=False, allow_blank=True, default="")

    def save(self, **kwargs):
        relay_point = self.context["relay_point"]
        parcel = get_object_or_404(
            RelayParcel.objects.select_related("shipment", "relay_point"),
            id=self.validated_data["parcel_id"],
            relay_point=relay_point,
        )
        destination = self.validated_data["destination"]
        parcel.status = RelayParcel.Status.RETURNED_TO_VENDOR if destination == "VENDOR" else RelayParcel.Status.RETURNED_TO_BELIVAY
        parcel.proof_note = self.validated_data.get("proof_note", parcel.proof_note)
        parcel.returned_at = timezone.now()
        parcel.save()

        ShipmentEvent.objects.create(
            shipment=parcel.shipment,
            status=parcel.shipment.status,
            message=f"Retour point relais vers {'vendeur' if destination == 'VENDOR' else 'BelivaY'}",
            location=relay_point.name,
        )
        return parcel


class ShipmentEventCreateSerializer(serializers.Serializer):
    """
    Ajouter un event au shipment.
    V1 : livreur/support/admin
    """
    order_id = serializers.IntegerField()
    status = serializers.ChoiceField(choices=Shipment.Status.choices)
    message = serializers.CharField(required=False, allow_blank=True, default="")
    location = serializers.CharField(required=False, allow_blank=True, default="")

    def validate_order_id(self, value):
        if not Shipment.objects.filter(order_id=value).exists():
            raise serializers.ValidationError("Shipment not found for this order")
        return value

    def create(self, validated_data):
        shipment = Shipment.objects.get(order_id=validated_data["order_id"])

        shipment.status = validated_data["status"]
        shipment.save(update_fields=["status", "updated_at"])

        event = ShipmentEvent.objects.create(
            shipment=shipment,
            status=validated_data["status"],
            message=validated_data.get("message", ""),
            location=validated_data.get("location", ""),
        )
        return event


class CourierShipmentActionSerializer(serializers.Serializer):
    action = serializers.ChoiceField(
        choices=[
            "ACCEPT",
            "DECLINE",
            "PICKED_UP",
            "OUT_FOR_DELIVERY",
            "DELIVERED",
            "FAILED",
            "NOTE",
        ]
    )
    message = serializers.CharField(required=False, allow_blank=True, default="")
    location = serializers.CharField(required=False, allow_blank=True, default="")

    def save(self, **kwargs):
        shipment = self.context["shipment"]
        request = self.context["request"]
        courier = getattr(request.user, "courier_profile", None)
        if not courier or not courier.is_approved or not courier.is_active:
            raise PermissionDenied("Courier account is not active or approved")
        if shipment.courier_id != courier.id:
            raise PermissionDenied("Shipment not assigned to this courier")

        action = self.validated_data["action"]
        message = self.validated_data.get("message", "")
        location = self.validated_data.get("location", "")
        order = shipment.order

        if action == "ACCEPT":
            shipment.status = Shipment.Status.ASSIGNED
            shipment.accepted_at = timezone.now()
            shipment.penalty_notified_at = None
            order.assign_driver()
        elif action == "DECLINE":
            shipment.status = Shipment.Status.CREATED
            shipment.courier = None
            shipment.courier_name = ""
            shipment.courier_phone = ""
            shipment.accepted_at = None
            order.mark_ready_for_pickup()
        elif action == "PICKED_UP":
            shipment.status = Shipment.Status.PICKED_UP
            order.mark_picked_up()
        elif action == "OUT_FOR_DELIVERY":
            shipment.status = Shipment.Status.OUT_FOR_DELIVERY
            order.mark_out_for_delivery()
        elif action == "DELIVERED":
            shipment.status = Shipment.Status.DELIVERED
            order.mark_delivered()
        elif action == "FAILED":
            shipment.status = Shipment.Status.FAILED

        shipment.save(update_fields=["status", "courier", "courier_name", "courier_phone", "accepted_at", "penalty_notified_at", "updated_at"])

        ShipmentEvent.objects.create(
            shipment=shipment,
            status=shipment.status,
            message=message or action.replace("_", " ").title(),
            location=location,
        )

        return shipment


class CourierDashboardLeaderboardSerializer(serializers.Serializer):
    name = serializers.CharField()
    score = serializers.CharField()
    badge = serializers.CharField()
    tone = serializers.CharField()


class CourierDashboardZoneSerializer(serializers.Serializer):
    zone = serializers.CharField()
    demand_percent = serializers.IntegerField()
    hint = serializers.CharField()


class CourierDashboardWeekSerializer(serializers.Serializer):
    label = serializers.CharField()
    earnings_xaf = serializers.IntegerField()
    deliveries = serializers.IntegerField()
    percent = serializers.IntegerField()


class CourierDashboardSerializer(serializers.Serializer):
    active_shipments = serializers.IntegerField()
    delivered_shipments = serializers.IntegerField()
    today_earnings_xaf = serializers.IntegerField()
    month_earnings_xaf = serializers.IntegerField()
    monthly_target_xaf = serializers.IntegerField()
    monthly_goal_percent = serializers.IntegerField()
    average_payout_xaf = serializers.IntegerField()
    online_minutes = serializers.IntegerField()
    status_label = serializers.CharField()
    distance_km = serializers.FloatField()
    average_delivery_minutes = serializers.IntegerField()
    performance_percent = serializers.IntegerField()
    recommended_departure = serializers.CharField()
    traffic_label = serializers.CharField()
    weather_label = serializers.CharField()
    leaderboard = CourierDashboardLeaderboardSerializer(many=True)
    zone_heatmap = CourierDashboardZoneSerializer(many=True)
    weekly_progress = CourierDashboardWeekSerializer(many=True)


class CourierNetworkShopSerializer(serializers.Serializer):
    vendor_id = serializers.IntegerField()
    vendor_name = serializers.CharField()
    shop_slug = serializers.CharField(allow_blank=True)
    city = serializers.CharField(allow_blank=True)
    address = serializers.CharField(allow_blank=True)
    phone = serializers.CharField(allow_blank=True)
    is_online = serializers.BooleanField()
    location_name = serializers.CharField(allow_blank=True)
    representative_name = serializers.CharField(allow_blank=True)
    representative_phone = serializers.CharField(allow_blank=True)
    latitude = serializers.FloatField(allow_null=True)
    longitude = serializers.FloatField(allow_null=True)


class CourierNetworkRelayPointSerializer(serializers.Serializer):
    name = serializers.CharField()
    city = serializers.CharField(allow_blank=True)
    address = serializers.CharField(allow_blank=True)
    shipments_count = serializers.IntegerField()


class CourierNetworkSerializer(serializers.Serializer):
    shops = CourierNetworkShopSerializer(many=True)
    relay_points = CourierNetworkRelayPointSerializer(many=True)


class CourierDisputeSerializer(serializers.ModelSerializer):
    ref = serializers.SerializerMethodField()
    label = serializers.SerializerMethodField()
    detail = serializers.CharField(source="description", read_only=True)
    status_display = serializers.SerializerMethodField()
    reason_display = serializers.SerializerMethodField()
    can_reply = serializers.BooleanField(source="courier_can_reply", read_only=True)

    class Meta:
        model = Dispute
        fields = [
            "id",
            "ref",
            "label",
            "status",
            "status_display",
            "reason",
            "reason_display",
            "detail",
            "can_reply",
            "created_at",
            "updated_at",
        ]

    def get_ref(self, obj):
        return f"LIT-{obj.id:03d}"

    def get_label(self, obj):
        return f"Commande #{obj.order_id}"

    def get_status_display(self, obj):
        return obj.get_status_display()

    def get_reason_display(self, obj):
        return obj.get_reason_display()


class ShipmentMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.SerializerMethodField()

    class Meta:
        model = ShipmentMessage
        fields = [
            "id",
            "shipment",
            "channel",
            "sender_role",
            "sender_name",
            "message",
            "created_at",
        ]
        read_only_fields = fields

    def get_sender_name(self, obj):
        full_name = obj.sender.get_full_name().strip()
        return full_name or obj.sender.username


class ShipmentMessageCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ShipmentMessage
        fields = ["channel", "message"]


class CourierShipmentScanSerializer(serializers.Serializer):
    code = serializers.CharField()
    action = serializers.ChoiceField(choices=["PICKED_UP", "OUT_FOR_DELIVERY", "DELIVERED"])


class CourierSettingsSerializer(serializers.Serializer):
    is_online = serializers.BooleanField(required=False)
    city = serializers.CharField(max_length=80, required=False)
    zones = serializers.ListField(
        child=serializers.CharField(max_length=60),
        required=False,
        allow_empty=False,
    )
    vehicle_type = serializers.ChoiceField(choices=[], required=False)
    preferred_language = serializers.ChoiceField(choices=["fr", "en"], required=False)
    gps_permission_granted = serializers.BooleanField(required=False)
    camera_permission_granted = serializers.BooleanField(required=False)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        from apps.accounts.models import CourierProfile

        self.fields["vehicle_type"].choices = CourierProfile.VehicleType.choices

    def to_representation(self, courier):
        return {
            "id": courier.id,
            "is_online": courier.is_online,
            "city": courier.city,
            "zones": courier.zones or [],
            "vehicle_type": courier.vehicle_type,
            "preferred_language": courier.preferred_language or "fr",
            "gps_permission_granted": courier.gps_permission_granted,
            "camera_permission_granted": courier.camera_permission_granted,
            "updated_at": courier.updated_at,
        }

    def update(self, instance, validated_data):
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save(update_fields=[*validated_data.keys(), "updated_at"])
        return instance


class CourierSOSAlertSerializer(serializers.ModelSerializer):
    courier_name = serializers.SerializerMethodField()

    class Meta:
        model = CourierSOSAlert
        fields = [
            "id",
            "courier",
            "courier_name",
            "status",
            "message",
            "location",
            "latitude",
            "longitude",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "courier", "courier_name", "status", "created_at", "updated_at"]

    def get_courier_name(self, obj):
        full_name = obj.courier.user.get_full_name().strip()
        return full_name or obj.courier.user.username


class CourierSOSCreateSerializer(serializers.Serializer):
    message = serializers.CharField(required=False, allow_blank=True, default="")
    location = serializers.CharField(required=False, allow_blank=True, default="")
    latitude = serializers.DecimalField(max_digits=9, decimal_places=6, required=False, allow_null=True)
    longitude = serializers.DecimalField(max_digits=9, decimal_places=6, required=False, allow_null=True)
