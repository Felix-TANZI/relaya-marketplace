import logging
import secrets
from datetime import time

from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from apps.orders.models import Order
from apps.accounts.models import CourierProfile


def shipment_evidence_retention_deadline():
    # values_list : ne lit QUE la colonne necessaire, jamais toute la ligne
    # (PlatformSettings.get_settings() le ferait) — ce callable est le
    # default= d'un champ ajoute par une migration ancienne (0009). Toute
    # migration ulterieure ajoutant un champ a PlatformSettings ferait
    # echouer un replay de migrations depuis zero si on selectionnait la
    # ligne entiere ici.
    from apps.orders.models import PlatformSettings
    days = (
        PlatformSettings.objects.filter(id=1)
        .values_list('evidence_retention_days', flat=True)
        .first()
    )
    if days is None:
        days = PlatformSettings._meta.get_field('evidence_retention_days').default
    return timezone.now() + timezone.timedelta(days=days)


def infer_actor_role(user):
    """
    Déduit le rôle d'un utilisateur authentifié pour signer un ShipmentEvent
    (VENDOR/COURIER/RELAY_POINT/SUPPORT/CLIENT) — même logique que les
    contrôles d'accès déjà en place (getattr(user, "courier_profile", None)
    dans shipping/views.py).
    """
    if not user or not getattr(user, "is_authenticated", False):
        return ShipmentEvent.ACTOR_ROLE_SYSTEM
    if getattr(user, "courier_profile", None):
        return "COURIER"
    if getattr(user, "relay_point_profile", None):
        return "RELAY_POINT"
    if getattr(user, "vendor_profile", None):
        return "VENDOR"
    if getattr(user, "delivery_organization_profile", None):
        return "DISPATCHER"
    if user.is_staff:
        return "SUPPORT"
    return "CLIENT"


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

    # Spécification v2.1 (R73) : les 12 zones de Yaoundé, Z1 à Z12, créées et tenues à jour depuis t_zones et
    # t_quartiers (apps/shipping/zones.py, synchroniser_zones) ; nom, vague et quartiers suivent ces tables.
    code = models.CharField(
        max_length=4, unique=True, null=True, blank=True,
        help_text="Z1 à Z12 (t_zones). Vide : ancienne zone hors référentiel v2.1.",
    )
    contour = models.JSONField(
        null=True, blank=True,
        help_text="Contour GeoJSON (Polygon ou MultiPolygon, coordonnées [longitude, latitude]) tracé par l'équipe "
                  "logistique (R75.2) ; l'épingle du client doit y tomber (R76.4).",
    )
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
        """Résout la zone d'un quartier. None si aucune zone ne le couvre.

        Un quartier du référentiel v2.1 (t_quartiers, alias compris, sans tenir compte des accents, tirets,
        espaces ni majuscules : R76.2) donne sa zone Z1 à Z12 ; un nom qui mène à deux quartiers de zones
        différentes ne donne aucune zone. Sinon, ancienne correspondance texte sur `districts`.
        """
        from apps.shipping.zones import chercher_quartiers

        trouves = {q["zone"] for q in chercher_quartiers(district)}
        if len(trouves) == 1:
            zone = cls.objects.filter(code=trouves.pop(), is_active=True).first()
            if zone is not None:
                return zone
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
    # Spec v2.1 (A3), figés au paiement : « C'est prêt » attendu (R44.1, R45.2) et échéance du vendeur (R44.2).
    pret_prevu = models.DateTimeField(null=True, blank=True, help_text="pret : debut + delai_h heures ouvrées (R45.2)")
    echeance_vendeur = models.DateTimeField(null=True, blank=True, help_text="echeance (R44.2) ; au-delà, la bascule s'applique (R35.1)")

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

    # Spec v2.1, R66.1 : code de dépôt (livreur -> relais), vérifié par le gérant à la réception ; il voyage dans le QR
    # du colis montré par l'application du livreur (R66.2).
    depot_code = models.CharField(max_length=6, blank=True, default="")
    # Feuille de route D11 : à domicile, remise au client avec le code ; le client le lit dans son suivi et le donne
    # au livreur, qui le saisit pour certifier la livraison.
    delivery_code = models.CharField(max_length=6, blank=True, default="")
    # R66.1 : essais faux par code {"remise"|"depot"|"livraison": {"n": int, "bloque_jusqu": iso}}
    codes_essais = models.JSONField(default=dict, blank=True)

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
        from apps.shipping.codes import nouveau_code

        if not self.pickup_confirmation_code:
            self.pickup_confirmation_code = nouveau_code()  # R66.1
            self.save(update_fields=["pickup_confirmation_code"])
        return self.pickup_confirmation_code

    def ensure_depot_code(self) -> str:
        from apps.shipping.codes import nouveau_code

        if not self.depot_code:
            self.depot_code = nouveau_code()  # R66.1
            self.save(update_fields=["depot_code"])
        return self.depot_code

    def ensure_delivery_code(self) -> str:
        from apps.shipping.codes import nouveau_code

        if not self.delivery_code:
            self.delivery_code = nouveau_code()  # D11
            self.save(update_fields=["delivery_code"])
        return self.delivery_code

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


# ── Notification client a chaque etape de commande (D21) ────────────────────
#
# (type, critique, titre, texte) par statut de Shipment. "critique" declenche
# le repli SMS/WhatsApp existant (apps.notifications_client.services) si
# aucun appareil n'a recu le push. "type" respecte les choix du client :
# commande/incident restent toujours actifs (422 category_locked cote
# ReglagesNotifications), suivi est desactivable. Seuls les statuts que le
# CLIENT comprend sont notifies ici — les statuts d'exception internes
# (ZONE_UNCOVERED, CAPACITY_BLOCKED, VEHICLE_INCOMPATIBLE,
# VALUE_LIMIT_EXCEEDED, WAITING_MANUAL_ASSIGNMENT) relevent des outils
# d'exploitation, pas d'une notification client.
def _client_status_notifications():
    S = Shipment.Status
    return {
        S.ASSIGNED: ("commande", False, "Livreur affecté", "Un livreur a été affecté à votre commande {ref}."),
        S.PICKED_UP: ("suivi", False, "Colis récupéré", "Votre colis de la commande {ref} a été récupéré chez le vendeur."),
        S.IN_TRANSIT: ("suivi", False, "Colis en route", "Votre colis de la commande {ref} est en route."),
        S.OUT_FOR_DELIVERY: ("suivi", False, "Livraison en cours", "Le livreur arrive bientôt pour votre commande {ref}."),
        S.DELIVERED: ("commande", True, "Colis livré", "Votre commande {ref} a été livrée."),
        S.INCIDENT: ("incident", True, "Incident signalé", "Un incident est survenu sur la livraison de votre commande {ref}."),
        S.FAILED: ("commande", True, "Livraison échouée", "La livraison de votre commande {ref} a échoué."),
        S.CANCELLED: ("commande", True, "Livraison annulée", "La livraison de votre commande {ref} a été annulée."),
    }


def _notify_client_of_status(shipment, status):
    """Jamais bloquant : un prestataire en panne ou un module absent ne doit
    jamais casser un changement de statut de livraison (meme logique que
    envoyer_notification elle-meme, qui avale deja les echecs de push)."""
    entry = _client_status_notifications().get(status)
    if entry is None:
        return
    user = getattr(shipment.order, "user", None)
    if user is None:
        return  # commande invite (D3, sans compte) : pas d'appareil a notifier
    type_, critique, titre, texte = entry
    try:
        from apps.notifications_client.services import envoyer_notification
        envoyer_notification(user, type_, titre, texte.format(ref=f"BLV-{shipment.order_id:05d}"), critique=critique)
    except Exception:
        logging.getLogger("apps.shipping").exception(
            "Notification client echouee (shipment=%s, status=%s)", shipment.pk, status,
        )


class ShipmentEvent(models.Model):
    """
    Timeline d'un shipment : chaque event est un statut + message + localisation.
    """

    # Rôles possibles pour actor_role (même convention libre que
    # ShipmentEvidence.actor_role) : VENDOR, COURIER, RELAY_POINT, CLIENT,
    # SUPPORT. SYSTEM désigne une transition automatique (pas d'utilisateur
    # a l'origine du changement) — valeur sobre plutôt qu'une règle inventée
    # pour distinguer les cas automatiques.
    ACTOR_ROLE_SYSTEM = "SYSTEM"

    shipment = models.ForeignKey(Shipment, on_delete=models.CASCADE, related_name="events")
    status = models.CharField(max_length=32)
    previous_status = models.CharField(
        max_length=32, blank=True, default="",
        help_text="Statut du shipment juste avant cet événement, vide si c'est le premier événement.",
    )
    message = models.CharField(max_length=255, blank=True, default="")
    location = models.CharField(max_length=120, blank=True, default="")
    actor = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="shipment_events",
        help_text="Compte ayant déclenché ce changement — vide pour une transition automatique.",
    )
    actor_role = models.CharField(
        max_length=20, blank=True, default="",
        help_text="Rôle de l'acteur au moment de l'action (VENDOR, COURIER, RELAY_POINT, CLIENT, SUPPORT, SYSTEM).",
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"ShipmentEvent(shipment={self.shipment_id}, status={self.status})"

    @classmethod
    def record(cls, *, shipment, status, message="", location="", actor=None, actor_role=""):
        """
        Crée un event en capturant automatiquement previous_status (statut du
        dernier event existant pour ce shipment, vide s'il n'y en a aucun) —
        évite de dupliquer cette lecture dans chaque site d'appel.
        """
        previous_status = (
            cls.objects.filter(shipment=shipment)
            .order_by("-created_at", "-id")
            .values_list("status", flat=True)
            .first()
            or ""
        )
        event = cls.objects.create(
            shipment=shipment,
            status=status,
            previous_status=previous_status,
            message=message,
            location=location,
            actor=actor,
            actor_role=actor_role,
        )
        _notify_client_of_status(shipment, status)
        return event


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
        # D15 : contestation au retrait, le gérant photographie le déballage devant le client
        RELAY_UNPACKING = "RELAY_UNPACKING", "Déballage contesté au comptoir"
        CUSTOMER_DELIVERY = "CUSTOMER_DELIVERY", "Remise client"
        # Spec v2.1, R51.1 : preuve de l'absence du client (photo devant l'adresse)
        CUSTOMER_ABSENT = "CUSTOMER_ABSENT", "Client absent"
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
    # Sécurité avant main 2, DP-02 : le code de retrait n'est jamais gardé en clair. Il est chiffré (pour le montrer
    # au seul client de la commande) et le comptoir le vérifie par son empreinte HMAC, sans le déchiffrer. Ni l'un
    # ni l'autre ne s'affiche dans l'admin Django.
    pickup_code_chiffre = models.BinaryField(null=True, blank=True, editable=False)
    pickup_code_empreinte = models.CharField(max_length=64, blank=True, default="", db_index=True, editable=False)
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

    # Garde au relais (spec v2.1, A4 : apps/shipping/garde.py). La prolongation gratuite de l'ancienne règle
    # (Addendum v1.0 §3.2) n'existe plus dans la spec : le champ est gardé pour l'historique, sans effet.
    garde_extended = models.BooleanField(
        default=False,
        help_text="Ancienne prolongation de garde (Addendum v1.0) : sans effet depuis la spec v2.1.",
    )
    non_retrait_processed_at = models.DateTimeField(
        null=True, blank=True,
        help_text="Date a laquelle le non-retrait a ete traite (retour vendeur + remboursement partiel).",
    )
    # R36.3 : la garde se paie en espèces au gérant ; il confirme l'encaissement avant la remise.
    garde_encaissee_xaf = models.PositiveIntegerField(null=True, blank=True, help_text="garde_colis encaissée (R36.2)")
    garde_encaissee_at = models.DateTimeField(null=True, blank=True)
    garde_encaissee_par = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="+")
    # R50.2 : rappels par SMS aux jours r_rappel_j1 et r_rappel_j2 de garde.
    rappel_j1_at = models.DateTimeField(null=True, blank=True)
    rappel_j2_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @staticmethod
    def empreinte_code(code) -> str:
        """DP-02 : empreinte HMAC du code de retrait, seule forme sous laquelle le serveur le compare."""
        from apps.client_core.chiffrement import empreinte

        code = (code or "").strip().upper()
        return empreinte(f"retrait:{code}") if code else ""

    @classmethod
    def champs_du_code(cls, code) -> dict:
        """Les deux colonnes du code de retrait, pour un .update() sur plusieurs colis (§8.3 : un code par commande)."""
        from apps.client_core.chiffrement import chiffrer

        code = (code or "").strip().upper()
        return {"pickup_code_chiffre": chiffrer(code) if code else None, "pickup_code_empreinte": cls.empreinte_code(code)}

    @property
    def pickup_code(self) -> str:
        """Le code en clair, déchiffré à la demande : seul le client de la commande le voit (D12, R66.1)."""
        from apps.client_core.chiffrement import dechiffrer

        return dechiffrer(self.pickup_code_chiffre) if self.pickup_code_chiffre else ""

    @pickup_code.setter
    def pickup_code(self, code) -> None:
        for champ, valeur in self.champs_du_code(code).items():
            setattr(self, champ, valeur)

    def code_correct(self, code) -> bool:
        import hmac

        soumis = self.empreinte_code(code)
        return bool(self.pickup_code_empreinte and soumis) and hmac.compare_digest(self.pickup_code_empreinte, soumis)

    @property
    def garde_free_until(self):
        """Fin du jour 1, sans garde (t_garde) ; compté depuis l'arrivée du dernier colis de la commande (R37.1)."""
        from apps.shipping.garde import fin_du_jour_1

        return fin_du_jour_1(self.shipment.order)

    @property
    def garde_deadline(self):
        """Renvoi au vendeur quand j dépasse r_garde_jours (R37.2)."""
        from apps.shipping.garde import echeance_renvoi

        return echeance_renvoi(self.shipment.order)

    def garde_fee_due(self, at=None):
        """garde_colis de ce colis (R36.2) : grille t_garde au jour j de la commande, plafonnée à sa valeur."""
        from apps.shipping.garde import garde_colis, jour

        return garde_colis(self, jour(self.shipment.order, at))

    class Meta:
        ordering = ["-updated_at"]
        verbose_name = "Colis point relais"
        verbose_name_plural = "Colis points relais"

    def __str__(self):
        return f"RelayParcel(shipment={self.shipment_id}, relay={self.relay_point_id}, status={self.status})"


class RelayPickupAttempt(models.Model):
    """
    Trace chaque code de retrait saisi au comptoir.

    Sécurité avant main 2 : le relais scanne d'abord le QR du colis (R66.2), puis saisit le code. Les essais faux se
    comptent sur ce colis (R66.1 : r_code_essais essais, blocage r_code_blocage_h, dans Shipment.codes_essais) ; en
    plus, un relais qui accumule r_code_relais_echecs codes faux en r_code_relais_fenetre_h heures ne peut plus rien
    remettre jusqu'à ce que la fenêtre s'éclaircisse. Le code saisi n'est jamais gardé : seulement son empreinte (DP-02).
    """

    relay_point = models.ForeignKey(
        "accounts.RelayPointProfile",
        on_delete=models.CASCADE,
        related_name="pickup_attempts",
    )
    shipment = models.ForeignKey(Shipment, on_delete=models.CASCADE, null=True, blank=True, related_name="+")
    code = models.CharField(max_length=64, help_text="empreinte HMAC du code saisi (DP-02), jamais le code")
    success = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["relay_point", "success", "-created_at"])]
        verbose_name = "Tentative de retrait"
        verbose_name_plural = "Tentatives de retrait"

    def __str__(self):
        etat = "ok" if self.success else "echec"
        return f"RelayPickupAttempt(relay={self.relay_point_id}, colis={self.shipment_id}, {etat})"

    @staticmethod
    def max_essais() -> int:
        """Spec v2.1, R66.1 : r_code_essais essais faux bloquent le code."""
        from apps.regles import services as regles

        return regles.reglage("r_code_essais")

    @staticmethod
    def heures_blocage() -> int:
        """Spec v2.1, R66.1 : blocage de r_code_blocage_h heures."""
        from apps.regles import services as regles

        return regles.reglage("r_code_blocage_h")

    @classmethod
    def register(cls, relay_point, code, success, shipment=None):
        return cls.objects.create(relay_point=relay_point, shipment=shipment, success=success,
                                  code=RelayParcel.empreinte_code(code))

    @classmethod
    def relais_bloque_jusqua(cls, relay_point):
        """Fin du blocage du relais s'il a trop de codes faux sur la période, sinon None."""
        from apps.regles import services as regles

        limite = regles.reglage("r_code_relais_echecs")
        fenetre = timezone.timedelta(hours=regles.reglage("r_code_relais_fenetre_h"))
        if limite <= 0:
            return None
        echecs = list(cls.objects.filter(relay_point=relay_point, success=False,
                                         created_at__gte=timezone.now() - fenetre)
                      .order_by("-created_at").values_list("created_at", flat=True)[:limite])
        if len(echecs) < limite:
            return None
        return echecs[-1] + fenetre


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


class DemandeAdresse(models.Model):
    """Adresse que BelivaY ne sait pas encore servir (BV-DEV-04) : épingle hors des 12 zones (R76.5, demande non
    servie) ou quartier absent de la liste (R76.2, « Autre quartier », que l'équipe logistique rattache)."""

    class Type(models.TextChoices):
        HORS_ZONE = "HORS_ZONE", "Hors des 12 zones (R76.5)"
        AUTRE_QUARTIER = "AUTRE_QUARTIER", "Autre quartier à rattacher (R76.2)"

    type = models.CharField(max_length=20, choices=Type.choices)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="+")
    quartier_saisi = models.CharField(max_length=120, blank=True, default="")
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    precision_m = models.FloatField(null=True, blank=True)
    quartier_rattache = models.CharField(
        max_length=120, blank=True, default="",
        help_text="Quartier de t_quartiers auquel l'équipe logistique rattache ce nom (R76.2).",
    )
    traitee = models.BooleanField(default=False)
    cree_le = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["traitee", "-cree_le"]
        verbose_name = "Demande d'adresse non servie"
        verbose_name_plural = "Demandes d'adresse non servies"

    def __str__(self):
        return f"{self.get_type_display()} · {self.quartier_saisi or '—'}"


class GrilleAchat(models.Model):
    """Grille d'achat signée par une entreprise de livraison (spec v2.1, R53) ; chaque ligne est contrôlée contre son
    plafond d'achat (R54, A10 : apps/shipping/grille.py)."""

    organisation = models.ForeignKey("accounts.DeliveryOrganizationProfile", on_delete=models.CASCADE, related_name="grilles_achat")
    signee_le = models.DateField(help_text="Date de signature (départ de l'exception R86)")
    annoncee_le = models.DateField(help_text="Annonce de la grille (R61.1 : préavis de r_preavis_grille_j jours)")
    entree_en_vigueur = models.DateField()
    note = models.TextField(blank=True, default="")
    cree_le = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-entree_en_vigueur"]
        verbose_name = "Grille d'achat d'une entreprise"
        verbose_name_plural = "Grilles d'achat des entreprises"

    def __str__(self):
        return f"{self.organisation} · en vigueur le {self.entree_en_vigueur:%d/%m/%Y}"

    def clean(self):
        from django.core.exceptions import ValidationError

        from apps.shipping.grille import entree_en_vigueur_min

        if self.annoncee_le and self.entree_en_vigueur and self.entree_en_vigueur < entree_en_vigueur_min(self.annoncee_le):
            raise ValidationError({"entree_en_vigueur": "R61.1 : une grille est annoncée au moins 30 jours avant d'entrer en vigueur."})


class LigneGrille(models.Model):
    class Type(models.TextChoices):
        DOMICILE = "DOMICILE", "Course à domicile (paramètre : niveau)"
        XL = "XL", "Course XL (paramètre : niveau)"
        RELAIS = "RELAIS", "Tournée relais, par colis (paramètre : format)"
        AUTRE_ZONE_TOURNEE = "AUTRE_ZONE_TOURNEE", "Tournée qui part d'une autre zone, par colis (R55)"
        SUPPLEMENT_FORMAT = "SUPPLEMENT_FORMAT", "Supplément de format (paramètre : C1, C2)"
        KM = "KM", "Km au-delà de r_km_inclus"
        BOUTIQUE_EN_PLUS = "BOUTIQUE_EN_PLUS", "Boutique en plus (paramètre : meme_zone, autre_zone)"
        RETOUR = "RETOUR", "Course de retour"
        TRANSFERT = "TRANSFERT", "Transfert entre relais"
        AGENCE_RELAIS = "AGENCE_RELAIS", "Agence qui sert de relais"
        INCIDENT = "INCIDENT", "Supplément d'incident (absence, refus, déplacement inutile)"

    grille = models.ForeignKey(GrilleAchat, on_delete=models.CASCADE, related_name="lignes")
    numero = models.PositiveSmallIntegerField()
    prestation = models.CharField(max_length=160)
    type = models.CharField(max_length=24, choices=Type.choices)
    param = models.CharField(max_length=20, blank=True, default="", help_text="Niveau, format ou zone selon le type")
    petit_paquet = models.BooleanField(default=False, help_text="Paquet de moins de r_depart_colis colis (ligne 5, R86, R55.2)")
    tarif = models.PositiveIntegerField()
    plafond_achat = models.PositiveIntegerField(null=True, blank=True, editable=False)
    controle = models.CharField(max_length=16, blank=True, default="", editable=False)
    controle_note = models.CharField(max_length=200, blank=True, default="", editable=False)

    class Meta:
        ordering = ["grille", "numero"]
        unique_together = [("grille", "numero")]
        verbose_name = "Ligne de grille d'achat"
        verbose_name_plural = "Lignes de grille d'achat"

    def __str__(self):
        return f"{self.numero}. {self.prestation} : {self.tarif} F ({self.controle})"

    def save(self, *args, **kwargs):
        from apps.shipping.grille import controler

        self.controle, self.plafond_achat, self.controle_note = controler(self, self.grille.signee_le)
        super().save(*args, **kwargs)


class AppelMasque(models.Model):
    """
    Feuille de route D33 : appel client-livreur avec numéro masqué. BelivaY appelle les deux personnes et les met en
    relation : aucun des deux ne voit le numéro de l'autre. Le journal sert aussi de preuve au livreur (R51.1 :
    r_client_appels appels avant de constater une absence).
    """

    class Sens(models.TextChoices):
        CLIENT_VERS_LIVREUR = "CLIENT_LIVREUR", "Le client appelle le livreur"
        LIVREUR_VERS_CLIENT = "LIVREUR_CLIENT", "Le livreur appelle le client"

    shipment = models.ForeignKey(Shipment, on_delete=models.CASCADE, related_name="appels_masques")
    sens = models.CharField(max_length=16, choices=Sens.choices)
    demande_par = models.ForeignKey(User, on_delete=models.PROTECT, related_name="appels_masques")
    prestataire = models.CharField(max_length=60)
    ok = models.BooleanField(default=False)
    reference = models.CharField(max_length=120, blank=True, default="")
    message = models.CharField(max_length=255, blank=True, default="")
    le = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-le"]
        verbose_name = "Appel masqué"
        verbose_name_plural = "Appels masqués"


class PrestationEntreprise(models.Model):
    """
    Spec v2.1, R53 (feuille de route, décision du 27/10/2026 : la grille remplace la part du transport) : chaque
    prestation faite par une entreprise de livraison, payée au tarif de sa ligne de grille ; versée le vendredi
    suivant (R43.1). Une ligne par prestation, pour la traçabilité et le contrôle de l'équipe finance.
    """

    organisation = models.ForeignKey("accounts.DeliveryOrganizationProfile", on_delete=models.PROTECT,
                                     related_name="prestations")
    shipment = models.ForeignKey(Shipment, on_delete=models.PROTECT, null=True, blank=True, related_name="prestations")
    nature = models.CharField(max_length=24, help_text="type de ligne de grille (LigneGrille.Type)")
    param = models.CharField(max_length=20, blank=True, default="")
    ligne = models.ForeignKey(LigneGrille, on_delete=models.SET_NULL, null=True, blank=True)
    quantite = models.PositiveIntegerField(default=1)
    tarif = models.PositiveIntegerField(default=0)
    montant = models.PositiveIntegerField(default=0)
    note = models.CharField(max_length=200, blank=True, default="")
    faite_le = models.DateTimeField(default=timezone.now, db_index=True)
    versee_semaine = models.CharField(max_length=10, blank=True, default="", help_text="vendredi du versement")

    class Meta:
        ordering = ["-faite_le"]
        constraints = [models.UniqueConstraint(fields=["shipment", "nature", "param"], name="prestation_unique")]
        verbose_name = "Prestation d'entreprise de livraison"
        verbose_name_plural = "Prestations d'entreprises de livraison"

