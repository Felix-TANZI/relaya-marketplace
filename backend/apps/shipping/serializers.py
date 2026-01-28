from rest_framework import serializers
from apps.orders.models import Order
from .models import Shipment, ShipmentEvent


class ShipmentEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = ShipmentEvent
        fields = ["id", "status", "message", "location", "created_at"]


class ShipmentSerializer(serializers.ModelSerializer):
    events = ShipmentEventSerializer(many=True, read_only=True)

    class Meta:
        model = Shipment
        fields = [
            "id",
            "order",
            "status",
            "courier_name",
            "courier_phone",
            "relay_point",
            "created_at",
            "updated_at",
            "events",
        ]


class ShipmentCreateSerializer(serializers.Serializer):
    """
    Créer un Shipment pour une commande.
    V1 : l’admin/support crée et assigne éventuellement un livreur.
    """
    order_id = serializers.IntegerField()
    courier_name = serializers.CharField(required=False, allow_blank=True, default="")
    courier_phone = serializers.CharField(required=False, allow_blank=True, default="")
    relay_point = serializers.CharField(required=False, allow_blank=True, default="")

    def validate_order_id(self, value):
        if not Order.objects.filter(id=value).exists():
            raise serializers.ValidationError("Order not found")
        return value

    def create(self, validated_data):
        order_id = validated_data["order_id"]
        shipment, created = Shipment.objects.get_or_create(order_id=order_id)

        shipment.courier_name = validated_data.get("courier_name", shipment.courier_name)
        shipment.courier_phone = validated_data.get("courier_phone", shipment.courier_phone)
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
