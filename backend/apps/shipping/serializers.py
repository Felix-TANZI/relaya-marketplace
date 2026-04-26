from rest_framework import serializers
from rest_framework.exceptions import PermissionDenied
from apps.orders.models import Order
from .models import Shipment, ShipmentEvent


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
    fulfillment_status = serializers.SerializerMethodField()
    vendor_names = serializers.SerializerMethodField()

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
            "fulfillment_status",
            "vendor_names",
            "relay_point",
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
        return obj.order.total_xaf

    def get_fulfillment_status(self, obj):
        return obj.order.fulfillment_status

    def get_vendor_names(self, obj):
        return list(
            obj.order.items.select_related("product__vendor")
            .values_list("product__vendor__shop_name", flat=True)
            .distinct()
        )


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

        # Si livreur renseigné => ASSIGNED
        if shipment.courier_name or shipment.courier_phone:
            shipment.status = Shipment.Status.ASSIGNED

        shipment.save()

        # Ajoute un event (V1 simple)
        ShipmentEvent.objects.create(
            shipment=shipment,
            status=shipment.status,
            message="Shipment created" if created else "Shipment updated",
            location="",
        )

        return shipment


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
            order.assign_driver()
        elif action == "DECLINE":
            shipment.status = Shipment.Status.CREATED
            shipment.courier = None
            shipment.courier_name = ""
            shipment.courier_phone = ""
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

        shipment.save(update_fields=["status", "courier", "courier_name", "courier_phone", "updated_at"])

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
