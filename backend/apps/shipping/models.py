import secrets

from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from apps.orders.models import Order
from apps.accounts.models import CourierProfile


def shipment_evidence_retention_deadline():
    from apps.orders.models import PlatformSettings
    days = PlatformSettings.get_settings().evidence_retention_days
    return timezone.now() + timezone.timedelta(days=days)


class Shipment(models.Model):
    """
    Un Shipment représente la livraison liée à une commande.
    - V1: mise à jour manuelle (livreur/support/admin)
    - V2: assignation automatique + intégration partenaire logistique
    - V3: tracking GPS temps réel
    """

    class Status(models.TextChoices):
        CREATED = "CREATED", "Created"
        WAITING_MANUAL_ASSIGNMENT = "WAITING_MANUAL_ASSIGNMENT", "Waiting manual assignment"
        ZONE_UNCOVERED = "ZONE_UNCOVERED", "Zone uncovered"
        CAPACITY_BLOCKED = "CAPACITY_BLOCKED", "Capacity blocked"
        VEHICLE_INCOMPATIBLE = "VEHICLE_INCOMPATIBLE", "Vehicle incompatible"
        VALUE_LIMIT_EXCEEDED = "VALUE_LIMIT_EXCEEDED", "Parcel value exceeds courier trust tier"
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
    assignment_issue_code = models.CharField(max_length=40, blank=True, default="")
    assignment_issue_message = models.CharField(max_length=255, blank=True, default="")
    required_vehicle_type = models.CharField(max_length=20, blank=True, default="")
    parcel_size = models.CharField(max_length=20, blank=True, default="STANDARD")

    # Optional: point relais (plus tard)
    relay_point = models.CharField(max_length=120, blank=True, default="")
    accepted_at = models.DateTimeField(null=True, blank=True)
    penalty_notified_at = models.DateTimeField(null=True, blank=True)

    # Code que le livreur presente (QR ou saisie) pour que le client prouve
    # une remise physique reelle avant de confirmer la reception.
    receipt_confirmation_code = models.CharField(max_length=6, blank=True, default="")

    # Horodatage
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def ensure_receipt_confirmation_code(self) -> str:
        if not self.receipt_confirmation_code:
            self.receipt_confirmation_code = f"{secrets.randbelow(1_000_000):06d}"
            self.save(update_fields=["receipt_confirmation_code"])
        return self.receipt_confirmation_code

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


class ShipmentLocation(models.Model):
    class Source(models.TextChoices):
        DEVICE = "DEVICE", "Appareil livreur"
        SIMULATION = "SIMULATION", "Simulation locale"

    shipment = models.ForeignKey(Shipment, on_delete=models.CASCADE, related_name="locations")
    courier = models.ForeignKey(CourierProfile, on_delete=models.CASCADE, related_name="shipment_locations")
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)
    accuracy_m = models.FloatField(null=True, blank=True)
    speed_mps = models.FloatField(null=True, blank=True)
    heading_deg = models.FloatField(null=True, blank=True)
    source = models.CharField(max_length=16, choices=Source.choices, default=Source.DEVICE)
    captured_at = models.DateTimeField(default=timezone.now)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["captured_at", "id"]
        indexes = [
            models.Index(fields=["shipment", "-captured_at"], name="shipping_lo_shipmen_4ea9a9_idx"),
            models.Index(fields=["courier", "-captured_at"], name="shipping_lo_courier_1be985_idx"),
        ]

    def __str__(self):
        return f"ShipmentLocation(shipment={self.shipment_id}, {self.latitude}, {self.longitude})"


class ShipmentEvidence(models.Model):
    """Photo de chaîne de garde, purgable après PlatformSettings.evidence_retention_days sauf gel lié à un litige."""

    class Stage(models.TextChoices):
        VENDOR_PACKED = "VENDOR_PACKED", "Emballage vendeur"
        COURIER_PICKUP_VENDOR = "COURIER_PICKUP_VENDOR", "Enlèvement vendeur"
        RELAY_RECEIVED = "RELAY_RECEIVED", "Réception point relais"
        RELAY_RELEASED = "RELAY_RELEASED", "Sortie point relais"
        CUSTOMER_DELIVERY = "CUSTOMER_DELIVERY", "Remise client"
        RETURN_DEPOSIT = "RETURN_DEPOSIT", "Dépôt retour"

    shipment = models.ForeignKey(Shipment, on_delete=models.CASCADE, related_name="evidences")
    order_item = models.ForeignKey(
        "orders.OrderItem",
        on_delete=models.SET_NULL,
        related_name="shipment_evidences",
        null=True,
        blank=True,
    )
    stage = models.CharField(max_length=30, choices=Stage.choices)
    uploaded_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name="shipment_evidences")
    actor_role = models.CharField(max_length=20)
    file = models.FileField(upload_to="shipment-evidences/%Y/%m/", blank=True)
    description = models.CharField(max_length=255, blank=True)
    content_type = models.CharField(max_length=100, blank=True)
    size_bytes = models.PositiveBigIntegerField(default=0)
    sha256 = models.CharField(max_length=64, blank=True)
    retain_until = models.DateTimeField(default=shipment_evidence_retention_deadline)
    litigation_hold = models.BooleanField(default=False)
    purged_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["retain_until", "litigation_hold", "purged_at"]),
            models.Index(fields=["shipment", "stage"]),
        ]

    def __str__(self):
        return f"Preuve {self.stage} — Livraison #{self.shipment_id}"


class RelayParcel(models.Model):
    class Status(models.TextChoices):
        EXPECTED = "EXPECTED", "Attendu"
        RECEIVED = "RECEIVED", "Recu"
        STORED = "STORED", "Stocke"
        PICKED_UP = "PICKED_UP", "Retire"
        RETURN_REQUESTED = "RETURN_REQUESTED", "Retour demande"
        RETURNED_TO_VENDOR = "RETURNED_TO_VENDOR", "Retour vendeur"
        RETURNED_TO_BELIVAY = "RETURNED_TO_BELIVAY", "Retour BelivaY"

    shipment = models.OneToOneField(Shipment, on_delete=models.CASCADE, related_name="relay_parcel")
    relay_point = models.ForeignKey(
        "accounts.RelayPointProfile",
        on_delete=models.CASCADE,
        related_name="parcels",
    )
    status = models.CharField(max_length=24, choices=Status.choices, default=Status.EXPECTED)
    slot_code = models.CharField(max_length=80, blank=True, default="")
    pickup_code = models.CharField(max_length=24, blank=True, default="")
    proof_note = models.TextField(blank=True, default="")
    received_at = models.DateTimeField(null=True, blank=True)
    picked_up_at = models.DateTimeField(null=True, blank=True)
    returned_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]
        verbose_name = "Colis point relais"
        verbose_name_plural = "Colis points relais"

    def __str__(self):
        return f"RelayParcel(shipment={self.shipment_id}, relay={self.relay_point_id}, status={self.status})"


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


class RelayPointReview(models.Model):
    """
    Avis public laisse par un acheteur apres son retrait au point relais.

    Anonymat V5 : le gerant ne voit jamais l'identite complete de l'acheteur,
    seulement ses initiales. L'avis est rattache au colis retire, ce qui garantit
    qu'il provient d'un retrait reel et non d'un compte quelconque.
    """

    relay_point = models.ForeignKey(
        "accounts.RelayPointProfile",
        on_delete=models.CASCADE,
        related_name="reviews",
    )
    author = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="relay_point_reviews",
    )
    relay_parcel = models.OneToOneField(
        "shipping.RelayParcel",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="review",
        help_text="Retrait qui autorise cet avis. Un colis ne peut etre note qu'une fois.",
    )
    rating = models.PositiveSmallIntegerField(help_text="Note de 1 a 5 etoiles.")
    comment = models.TextField(blank=True, default="")
    thanked_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Date a laquelle le gerant a remercie l'acheteur.",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Avis point relais"
        verbose_name_plural = "Avis points relais"
        constraints = [
            models.CheckConstraint(
                check=models.Q(rating__gte=1) & models.Q(rating__lte=5),
                name="relay_review_rating_between_1_and_5",
            ),
        ]
        indexes = [models.Index(fields=["relay_point", "-created_at"])]

    def __str__(self):
        return f"Avis {self.rating}/5 - {self.relay_point.name}"

    @property
    def author_initials(self) -> str:
        """« Owen Pierre » devient « O. P. » ; a defaut, l'initiale du compte."""
        if not self.author:
            return "•. •."
        parts = [self.author.first_name.strip(), self.author.last_name.strip()]
        initiales = [f"{part[0].upper()}." for part in parts if part]
        if not initiales:
            initiales = [f"{(self.author.username or '?')[0].upper()}."]
        return " ".join(initiales)
