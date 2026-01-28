from django.db import models
from apps.orders.models import Order


class Shipment(models.Model):
    """
    Un Shipment représente la livraison liée à une commande.
    - V1: mise à jour manuelle (livreur/support/admin)
    - V2: assignation automatique + intégration partenaire logistique
    - V3: tracking GPS temps réel
    """

    class Status(models.TextChoices):
        CREATED = "CREATED", "Created"
        ASSIGNED = "ASSIGNED", "Assigned"
        PICKED_UP = "PICKED_UP", "Picked up"
        IN_TRANSIT = "IN_TRANSIT", "In transit"
        OUT_FOR_DELIVERY = "OUT_FOR_DELIVERY", "Out for delivery"
        DELIVERED = "DELIVERED", "Delivered"
        FAILED = "FAILED", "Failed"
        CANCELLED = "CANCELLED", "Cancelled"

    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name="shipment")
    status = models.CharField(max_length=32, choices=Status.choices, default=Status.CREATED)

    # Infos livreur (V1 simple)
    courier_name = models.CharField(max_length=120, blank=True, default="")
    courier_phone = models.CharField(max_length=32, blank=True, default="")

    # Optional: point relais (plus tard)
    relay_point = models.CharField(max_length=120, blank=True, default="")

    # Horodatage
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Shipment(order={self.order_id}, status={self.status})"


class ShipmentEvent(models.Model):
    """
    Timeline d'un shipment : chaque event est un statut + message + localisation.
    """

    shipment = models.ForeignKey(Shipment, on_delete=models.CASCADE, related_name="events")
    status = models.CharField(max_length=32)
    message = models.CharField(max_length=255, blank=True, default="")
    location = models.CharField(max_length=120, blank=True, default="")

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"ShipmentEvent(shipment={self.shipment_id}, status={self.status})"
