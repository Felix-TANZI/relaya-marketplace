from django.db import models
from django.contrib.auth.models import User
from apps.orders.models import Order
from apps.accounts.models import CourierProfile


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
    courier = models.ForeignKey(
        CourierProfile,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="shipments",
    )
    courier_name = models.CharField(max_length=120, blank=True, default="")
    courier_phone = models.CharField(max_length=32, blank=True, default="")

    # Optional: point relais (plus tard)
    relay_point = models.CharField(max_length=120, blank=True, default="")
    accepted_at = models.DateTimeField(null=True, blank=True)
    penalty_notified_at = models.DateTimeField(null=True, blank=True)

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


class ShipmentMessage(models.Model):
    class Channel(models.TextChoices):
        CLIENT = "CLIENT", "Client"
        VENDOR = "VENDOR", "Vendeur"
        SUPPORT = "SUPPORT", "Support"

    class SenderRole(models.TextChoices):
        CLIENT = "CLIENT", "Client"
        COURIER = "COURIER", "Livreur"
        SYSTEM = "SYSTEM", "Systeme"

    shipment = models.ForeignKey(Shipment, on_delete=models.CASCADE, related_name="messages")
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name="shipment_messages")
    channel = models.CharField(max_length=16, choices=Channel.choices)
    sender_role = models.CharField(max_length=16, choices=SenderRole.choices, default=SenderRole.COURIER)
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"ShipmentMessage(shipment={self.shipment_id}, channel={self.channel})"


class CourierSOSAlert(models.Model):
    class Status(models.TextChoices):
        OPEN = "OPEN", "Ouverte"
        ACKNOWLEDGED = "ACKNOWLEDGED", "Prise en charge"
        RESOLVED = "RESOLVED", "Resolue"

    courier = models.ForeignKey(CourierProfile, on_delete=models.CASCADE, related_name="sos_alerts")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN)
    message = models.TextField(blank=True, default="")
    location = models.CharField(max_length=160, blank=True, default="")
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Alerte SOS livreur"
        verbose_name_plural = "Alertes SOS livreur"

    def __str__(self):
        return f"SOS #{self.id} - {self.courier.user.username} - {self.status}"
