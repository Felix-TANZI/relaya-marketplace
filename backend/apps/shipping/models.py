import secrets
from datetime import time

from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from apps.orders.models import Order
from apps.accounts.models import CourierProfile


def shipment_evidence_retention_deadline():
    from apps.orders.models import PlatformSettings
    days = PlatformSettings.get_settings().evidence_retention_days
    return timezone.now() + timezone.timedelta(days=days)


class Zone(models.Model):
    """
    Zone de livraison — regroupe des quartiers pour le calcul de prix, les
    créneaux de groupage et l'amorçage (BelivaY_Regles_Systeme_DEV v2.0, §5).

    Le rattachement quartier -> zone se fait par correspondance texte dans
    `districts` : c'est volontairement simple (pas de geo-decoupage) tant que
    la couverture reste intra-Yaoundé.
    """

    class Tier(models.TextChoices):
        STANDARD = "STANDARD", "Standard"
        VAGUE_2 = "VAGUE_2", "Vague 2"
        VAGUE_3 = "VAGUE_3", "Vague 3 (périphérie)"

    name = models.CharField(max_length=120, unique=True)
    city = models.CharField(max_length=80)
    tier = models.CharField(max_length=20, choices=Tier.choices, default=Tier.STANDARD)
    districts = models.JSONField(
        default=list, blank=True,
        help_text="Quartiers rattachés à cette zone (comparaison texte, insensible à la casse).",
    )
    is_active = models.BooleanField(default=True)

    # Majoration Vague 3 — verrouillee a 1000F (provisoire) par
    # BelivaY_Addendum_Decisions_DEV.pdf v1.0 §7/§10.
    surcharge_xaf = models.PositiveIntegerField(
        default=1000,
        verbose_name="Majoration (FCFA)",
        help_text="Supplément appliqué aux commandes vers cette zone si tier=VAGUE_3. 1000F provisoire (Addendum Décisions v1.0) — ajustable par l'admin.",
    )

    # Amorçage (§5.4) — une seule zone à la fois, budget écrit d'avance.
    is_bootstrapping = models.BooleanField(default=False)
    bootstrap_budget_xaf = models.PositiveIntegerField(default=0)
    bootstrap_target_colis_per_tournee = models.PositiveIntegerField(default=8)
    bootstrap_started_at = models.DateTimeField(null=True, blank=True)

    # Créneaux fixes (§5.1) — deux par zone, à fixer par l'admin.
    morning_slot_start = models.TimeField(null=True, blank=True)
    morning_slot_end = models.TimeField(null=True, blank=True)
    afternoon_slot_start = models.TimeField(null=True, blank=True)
    afternoon_slot_end = models.TimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["city", "name"]
        verbose_name = "Zone"
        verbose_name_plural = "Zones"

    def __str__(self):
        return f"{self.name} ({self.city})"

    @classmethod
    def match(cls, city: str, district: str):
        """Résout la zone d'un quartier par correspondance texte. None si aucune zone ne le couvre."""
        district_norm = (district or "").strip().lower()
        if not district_norm:
            return None
        for zone in cls.objects.filter(is_active=True, city__iexact=(city or "").strip()):
            if any(district_norm == str(d).strip().lower() for d in (zone.districts or [])):
                return zone
        return None

    # Creneaux par defaut (Regles_Systeme_DEV v2.0 §5.1 : "deux creneaux fixes
    # par zone", horaires "a fixer par zone" — non decides. Ce fallback n'est
    # qu'un point de depart exploitable tant qu'une zone n'a pas ses propres
    # horaires configures en admin.
    DEFAULT_MORNING = (time(8, 0), time(13, 0))
    DEFAULT_AFTERNOON = (time(13, 0), time(18, 0))

    def morning_slot(self):
        return (
            self.morning_slot_start or self.DEFAULT_MORNING[0],
            self.morning_slot_end or self.DEFAULT_MORNING[1],
        )

    def afternoon_slot(self):
        return (
            self.afternoon_slot_start or self.DEFAULT_AFTERNOON[0],
            self.afternoon_slot_end or self.DEFAULT_AFTERNOON[1],
        )

    def sla_hours(self):
        """
        Delai annonce au client, en heures ouvrees — cale sur la tournee, pas
        une duree arbitraire (Addendum : "creneau suivant + 1" pour les zones
        exploitees ; 48h ouvrees pour Vague 2/3).
        """
        if self.tier in (self.Tier.VAGUE_2, self.Tier.VAGUE_3):
            return 48
        return 24


class Tournee(models.Model):
    """
    Regroupement de colis d'une meme zone, partant ensemble vers le relais,
    avec un seul livreur qui enchaine les arrets (Regles_Systeme_DEV v2.0
    §5 "RÈGLE FONDATRICE" + regle verrouillee n°10 : "les colis relais
    partent toujours en groupe, jamais un par un").

    Composee automatiquement par apps.shipping.tournees.compose_tournees_for_zone
    quand une zone atteint le seuil de colis, ou en sortie forcee apres deux
    creneaux d'attente (regle n°11 : toute sortie forcee est journalisee).
    """

    class Period(models.TextChoices):
        MORNING = "MORNING", "Matin"
        AFTERNOON = "AFTERNOON", "Après-midi"

    class Status(models.TextChoices):
        COMPOSED = "COMPOSED", "Composée"
        PUBLISHED = "PUBLISHED", "Publiée sur la bourse"
        DEPARTED = "DEPARTED", "Partie"
        COMPLETED = "COMPLETED", "Terminée"

    zone = models.ForeignKey(Zone, on_delete=models.PROTECT, related_name="tournees")
    slot_date = models.DateField()
    period = models.CharField(max_length=12, choices=Period.choices)
    courier = models.ForeignKey(
        CourierProfile, on_delete=models.SET_NULL, null=True, blank=True, related_name="tournees",
    )
    # Bourse aux courses (V1.1, "premier arrivé premier servi") : l'entreprise
    # qui publie/accepte le paquet — distincte du livreur, assigné seulement
    # au claim. Champ rempli uniquement pour un Tournee PUBLISHED puis
    # revendique.
    claimed_by_organization = models.ForeignKey(
        "accounts.DeliveryOrganizationProfile",
        on_delete=models.SET_NULL, null=True, blank=True, related_name="claimed_tournees",
    )
    claimed_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.COMPOSED)
    is_forced_exit = models.BooleanField(
        default=False,
        help_text="Sortie forcee sous le seuil de 4 colis, apres deux creneaux d'attente (regle n°11 : journalisee ici).",
    )
    colis_count = models.PositiveIntegerField(default=0)
    composed_at = models.DateTimeField(auto_now_add=True)
    departed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-composed_at"]
        indexes = [
            models.Index(fields=["zone", "slot_date", "period"]),
        ]

    def __str__(self):
        return f"Tournée {self.zone.name} · {self.slot_date} {self.get_period_display()}"


class Shipment(models.Model):
    """
    Un Shipment représente UN COLIS — un par vendeur et par commande (règle
    mère, BelivaY_Regles_Systeme_DEV v2.0 §1 et §10.1). Une commande
    multi-vendeurs produit donc plusieurs Shipment, un par sous-commande.

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
        INCIDENT = "INCIDENT", "Incident signalé"
        FAILED = "FAILED", "Failed"
        CANCELLED = "CANCELLED", "Cancelled"

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="shipments")
    vendor = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="vendor_colis",
        help_text="Vendeur de ce colis — un Shipment = un colis = un vendeur (règle mère).",
    )
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

    # Composeur de tournees (§5) : colis groupes par zone/creneau, un seul
    # livreur enchaine les arrets. stop_order fixe l'ordre de ramassage au
    # sein de la tournee (version minimale : pas d'optimisation d'itineraire,
    # juste un ordre stable par vendeur puis par anciennete du colis).
    tournee = models.ForeignKey(
        Tournee, on_delete=models.SET_NULL, null=True, blank=True, related_name="shipments",
    )
    stop_order = models.PositiveIntegerField(default=0)

    # Optional: point relais (plus tard)
    relay_point = models.CharField(max_length=120, blank=True, default="")
    accepted_at = models.DateTimeField(null=True, blank=True)
    penalty_notified_at = models.DateTimeField(null=True, blank=True)

    # Code que le livreur presente (QR ou saisie) pour que le client prouve
    # une remise physique reelle avant de confirmer la reception.
    receipt_confirmation_code = models.CharField(max_length=6, blank=True, default="")

    # Code de remise (3e code du systeme, §8.2) : le vendeur le communique au
    # livreur au ramassage pour valider le controle C1 (conformite). Distinct
    # du code de depot (RelayParcel.slot_code, livreur -> relais) et du code
    # de retrait (RelayParcel.pickup_code, relais -> acheteur).
    pickup_confirmation_code = models.CharField(max_length=6, blank=True, default="")

    # Distinct du statut DELIVERED (mis par le livreur) : date a laquelle
    # L'ACHETEUR a confirme la reception de CE colis precis (code saisi).
    buyer_confirmed_at = models.DateTimeField(null=True, blank=True)

    # Horodatage
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def ensure_receipt_confirmation_code(self) -> str:
        if not self.receipt_confirmation_code:
            self.receipt_confirmation_code = f"{secrets.randbelow(1_000_000):06d}"
            self.save(update_fields=["receipt_confirmation_code"])
        return self.receipt_confirmation_code

    def ensure_pickup_confirmation_code(self) -> str:
        if not self.pickup_confirmation_code:
            self.pickup_confirmation_code = f"{secrets.randbelow(1_000_000):06d}"
            self.save(update_fields=["pickup_confirmation_code"])
        return self.pickup_confirmation_code

    @property
    def order_items(self):
        """Articles de CE colis — ceux de la commande dont le produit appartient a ce vendeur."""
        if not self.vendor_id:
            return self.order.items.all()
        return self.order.items.filter(product__vendor_id=self.vendor_id)

    def estimated_availability_at(self):
        """
        SLA annoncé à l'acheteur — calé sur la tournée, jamais une durée
        arbitraire (Regles_Systeme_DEV v2.0 §5 ; proposition validée : "créneau
        suivant + 1" pour les zones exploitées, 48h ouvrées pour Vague 2/3).
        None si la zone n'est pas couverte (pas de promesse — ex. Douala,
        hors périmètre zones/relais).
        """
        zone = self.order.zone
        if zone is None:
            return None

        if self.tournee_id and self.tournee.departed_at:
            from .tournees import _slot_boundaries  # noqa: local import, evite un cycle au chargement du module

            after_departure = _slot_boundaries(zone, self.tournee.departed_at, self.tournee.departed_at + timezone.timedelta(days=3))
            return after_departure[0] if after_departure else self.tournee.departed_at + timezone.timedelta(hours=zone.sla_hours())

        return self.created_at + timezone.timedelta(hours=zone.sla_hours())

    def __str__(self):
        return f"Shipment(order={self.order_id}, vendor={self.vendor_id}, status={self.status})"


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
        RELAY_REFUSED = "RELAY_REFUSED", "Refus au contrôle relais"
        RELAY_RELEASED = "RELAY_RELEASED", "Sortie point relais"
        RELAY_RELEASED_SIGNATURE = "RELAY_RELEASED_SIGNATURE", "Signature au retrait relais"
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
        REFUSED = "REFUSED", "Refuse au controle"

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

    # Retrait par un tiers (Addendum Décisions v1.0, Parcours acheteur) : le
    # relais loggue la piece d'identite de la personne presente au guichet
    # quand elle differe de l'acheteur, pour tracabilite.
    picked_up_by_name = models.CharField(max_length=150, blank=True, default="")
    picked_up_by_id_reference = models.CharField(
        max_length=100, blank=True, default="",
        help_text="Type + numero de piece d'identite du tiers ayant retire le colis, loggue par le relais.",
    )

    # Garde au relais / non-retrait (Addendum Décisions v1.0 §3.2) : gratuite
    # J0->J+3, 200F/jour de J+3 a J+7, prolongeable UNE fois par l'acheteur.
    garde_extended = models.BooleanField(
        default=False,
        help_text="L'acheteur a utilise sa prolongation unique de garde (repousse l'echeance J+7).",
    )
    non_retrait_processed_at = models.DateTimeField(
        null=True, blank=True,
        help_text="Date a laquelle le non-retrait a ete traite (retour vendeur + remboursement partiel).",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    GARDE_FREE_DAYS = 3
    GARDE_DEADLINE_DAYS = 7
    GARDE_EXTENSION_DAYS = 4
    GARDE_DAILY_FEE_XAF = 200

    @property
    def garde_free_until(self):
        if not self.received_at:
            return None
        return self.received_at + timezone.timedelta(days=self.GARDE_FREE_DAYS)

    @property
    def garde_deadline(self):
        if not self.received_at:
            return None
        days = self.GARDE_DEADLINE_DAYS + (self.GARDE_EXTENSION_DAYS if self.garde_extended else 0)
        return self.received_at + timezone.timedelta(days=days)

    def garde_fee_due(self, at=None):
        """Frais de garde accumules a la date donnee (200F/jour au-dela de J+3)."""
        if not self.received_at:
            return 0
        moment = min(at or timezone.now(), self.garde_deadline)
        free_until = self.garde_free_until
        if moment <= free_until:
            return 0
        days_over = (moment - free_until).days + (1 if (moment - free_until).seconds else 0)
        return max(0, days_over) * self.GARDE_DAILY_FEE_XAF

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
