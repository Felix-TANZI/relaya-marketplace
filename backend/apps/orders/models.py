# backend/apps/orders/models.py
# Modèles commandes BelivaY — cycle de vie complet + escrow + commission.
#
# Règles de confidentialité client :
#   customer_name et customer_phone ne sont JAMAIS exposés bruts au vendeur.
#   Le VendorOrderSerializer les remplace par des identifiants anonymisés.
#
# Commission :
#   commission_rate_snapshot est copié depuis PlatformSettings à la création.
#   Les modifications ultérieures du taux n'affectent JAMAIS les commandes passées.

from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta
from apps.catalog.models import Product


class TimeStampedModel(models.Model):
    """Modèle abstrait — timestamps automatiques."""
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class Order(TimeStampedModel):
    """
    Commande BelivaY.

    Deux axes indépendants :
      - payment_status     : état financier (PENDING → PAID → REFUNDED…)
      - fulfillment_status : état logistique (CREATED → … → RELEASED_TO_VENDOR)

    L'escrow (séquestre) est géré via escrow_status, découplé du fulfillment
    pour permettre des blocages indépendants en cas de litige.
    """

    # ── Statuts paiement ──────────────────────────────────────────────────────
    class PaymentStatus(models.TextChoices):
        PENDING  = "PENDING",  "En attente de paiement"
        PAID     = "PAID",     "Payé"
        FAILED   = "FAILED",   "Échec du paiement"
        REFUNDED = "REFUNDED", "Remboursé"

    class DeliveryMethod(models.TextChoices):
        DELIVERY = "DELIVERY", "Livraison"
        PICKUP   = "PICKUP",   "Retrait en boutique"

    # ── Statuts fulfillment (cycle complet) ───────────────────────────────────
    class FulfillmentStatus(models.TextChoices):
        # Avant paiement
        CREATED             = "CREATED",             "Commande créée"
        # Côté vendeur
        PAID_IN_ESCROW      = "PAID_IN_ESCROW",      "Payée · Escrow bloqué"
        VENDOR_ACKNOWLEDGED = "VENDOR_ACKNOWLEDGED", "Confirmée par le vendeur"
        PREPARING           = "PREPARING",           "En préparation"
        READY_FOR_PICKUP    = "READY_FOR_PICKUP",    "Prête pour enlèvement"
        # Côté livreur
        DRIVER_ASSIGNED     = "DRIVER_ASSIGNED",     "Livreur assigné"
        PICKED_UP           = "PICKED_UP",           "Pris en charge par le livreur"
        OUT_FOR_DELIVERY    = "OUT_FOR_DELIVERY",    "En cours de livraison"
        # Livraison confirmée
        DELIVERED           = "DELIVERED",           "Livré"
        BUYER_CONFIRMED     = "BUYER_CONFIRMED",     "Réception confirmée par l'acheteur"
        AUTO_CONFIRMED      = "AUTO_CONFIRMED",      "Confirmée automatiquement (48h)"
        # Fonds libérés
        RELEASED_TO_VENDOR  = "RELEASED_TO_VENDOR",  "Fonds libérés au vendeur"
        # Fins alternatives
        DISPUTED            = "DISPUTED",            "Litige ouvert"
        CANCELLED           = "CANCELLED",           "Annulée"
        REFUNDED            = "REFUNDED",            "Remboursée"

    # ── Statuts escrow ────────────────────────────────────────────────────────
    class EscrowStatus(models.TextChoices):
        PENDING          = "PENDING",          "En attente de paiement"
        BLOCKED          = "BLOCKED",          "Fonds sécurisés en escrow"
        RELEASE_PENDING  = "RELEASE_PENDING",  "Libération en cours (24h)"
        RELEASED         = "RELEASED",         "Fonds libérés au vendeur"
        REFUNDED         = "REFUNDED",         "Remboursement total"
        PARTIAL_REFUNDED = "PARTIAL_REFUNDED", "Remboursement partiel"

    # ── Champs ────────────────────────────────────────────────────────────────

    user = models.ForeignKey(
        User, on_delete=models.CASCADE,
        related_name="orders", null=True, blank=True,
    )

    # Coordonnées client — confidentielles au vendeur (masquées dans le serializer)
    customer_email = models.EmailField(blank=True, null=True)
    customer_phone = models.CharField(max_length=20)

    # Livraison
    delivery_method = models.CharField(
        max_length=20,
        choices=DeliveryMethod.choices,
        default=DeliveryMethod.DELIVERY,
        verbose_name="Mode de livraison",
    )
    city    = models.CharField(max_length=50)
    address = models.CharField(max_length=255)
    note    = models.TextField(blank=True, null=True)

    # Statuts
    payment_status = models.CharField(
        max_length=30,
        choices=PaymentStatus.choices,
        default=PaymentStatus.PENDING,
        verbose_name="Statut de paiement",
    )
    fulfillment_status = models.CharField(
        max_length=30,
        choices=FulfillmentStatus.choices,
        default=FulfillmentStatus.CREATED,
        verbose_name="Statut de livraison",
    )
    escrow_status = models.CharField(
        max_length=20,
        choices=EscrowStatus.choices,
        default=EscrowStatus.PENDING,
        verbose_name="Statut de l'escrow",
    )

    # Montants
    subtotal_xaf     = models.PositiveIntegerField(default=0)
    delivery_fee_xaf = models.PositiveIntegerField(default=0)
    total_xaf        = models.PositiveIntegerField(default=0)

    # Snapshot du taux de commission au moment de la commande.
    # Garantit qu'une modification de PlatformSettings n'affecte pas le passé.
    commission_rate_snapshot = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=12.00,
        verbose_name="Taux de commission appliqué (%)",
        help_text="Copie du taux en vigueur au moment de la commande.",
    )

    # Délai de réponse vendeur (calculé à la confirmation paiement)
    vendor_reply_deadline = models.DateTimeField(
        null=True, blank=True,
        verbose_name="Délai de réponse vendeur",
    )

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Commande"
        verbose_name_plural = "Commandes"

    def __str__(self):
        return f"Commande #{self.id} — {self.payment_status} / {self.fulfillment_status}"

    # ── Propriétés calculées ──────────────────────────────────────────────────

    @property
    def is_paid(self) -> bool:
        return self.payment_status == self.PaymentStatus.PAID

    @property
    def can_be_fulfilled(self) -> bool:
        return self.is_paid and self.fulfillment_status not in (
            self.FulfillmentStatus.CANCELLED,
            self.FulfillmentStatus.REFUNDED,
        )

    @property
    def is_escrow_blocked(self) -> bool:
        return self.escrow_status == self.EscrowStatus.BLOCKED

    @property
    def is_funds_released(self) -> bool:
        return self.escrow_status == self.EscrowStatus.RELEASED

    # ── Transitions métier ────────────────────────────────────────────────────

    def confirm_payment(self) -> None:
        """Paiement confirmé — déclenche le séquestre et le délai vendeur."""
        settings = PlatformSettings.get_settings()
        self.payment_status     = self.PaymentStatus.PAID
        self.fulfillment_status = self.FulfillmentStatus.PAID_IN_ESCROW
        self.escrow_status      = self.EscrowStatus.BLOCKED
        hours = getattr(settings, "vendor_reply_h", 72)
        self.vendor_reply_deadline = timezone.now() + timedelta(hours=hours)
        self.save()

    def vendor_acknowledge(self) -> None:
        self.fulfillment_status = self.FulfillmentStatus.VENDOR_ACKNOWLEDGED
        self.save()

    def start_preparing(self) -> None:
        self.fulfillment_status = self.FulfillmentStatus.PREPARING
        self.save()

    def mark_ready_for_pickup(self) -> None:
        self.fulfillment_status = self.FulfillmentStatus.READY_FOR_PICKUP
        self.save()

    def assign_driver(self) -> None:
        self.fulfillment_status = self.FulfillmentStatus.DRIVER_ASSIGNED
        self.save()

    def mark_picked_up(self) -> None:
        self.fulfillment_status = self.FulfillmentStatus.PICKED_UP
        self.save()

    def mark_out_for_delivery(self) -> None:
        self.fulfillment_status = self.FulfillmentStatus.OUT_FOR_DELIVERY
        self.save()

    def mark_delivered(self) -> None:
        self.fulfillment_status = self.FulfillmentStatus.DELIVERED
        self.save()

    def buyer_confirm(self) -> None:
        self.fulfillment_status = self.FulfillmentStatus.BUYER_CONFIRMED
        self.escrow_status      = self.EscrowStatus.RELEASE_PENDING
        self.save()

    def auto_confirm(self) -> None:
        self.fulfillment_status = self.FulfillmentStatus.AUTO_CONFIRMED
        self.escrow_status      = self.EscrowStatus.RELEASE_PENDING
        self.save()

    def release_to_vendor(self) -> None:
        self.fulfillment_status = self.FulfillmentStatus.RELEASED_TO_VENDOR
        self.escrow_status      = self.EscrowStatus.RELEASED
        self.save()

    def cancel(self) -> None:
        self.fulfillment_status = self.FulfillmentStatus.CANCELLED
        if self.is_paid:
            self.escrow_status = self.EscrowStatus.REFUNDED
        self.save()

    def open_dispute(self) -> None:
        self.fulfillment_status = self.FulfillmentStatus.DISPUTED
        self.save()

    def refund(self, partial: bool = False) -> None:
        self.payment_status     = self.PaymentStatus.REFUNDED
        self.fulfillment_status = self.FulfillmentStatus.REFUNDED
        self.escrow_status = (
            self.EscrowStatus.PARTIAL_REFUNDED if partial
            else self.EscrowStatus.REFUNDED
        )
        self.save()


class OrderItem(TimeStampedModel):
    """
    Article d'une commande.
    Les données produit sont snapshotées pour garantir l'intégrité historique.
    """
    order   = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(Product, on_delete=models.PROTECT)

    title_snapshot     = models.CharField(max_length=200)
    price_xaf_snapshot = models.PositiveIntegerField()
    qty                = models.PositiveIntegerField()
    line_total_xaf     = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name = "Article de commande"
        verbose_name_plural = "Articles de commande"

    def __str__(self):
        return f"Commande #{self.order_id} — {self.title_snapshot} ×{self.qty}"


class OrderHistory(models.Model):
    """Audit log immuable de chaque modification de commande."""
    order      = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="history")
    user       = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    action     = models.CharField(max_length=100)
    field_name = models.CharField(max_length=100, blank=True)
    old_value  = models.TextField(blank=True)
    new_value  = models.TextField(blank=True)
    timestamp  = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)

    class Meta:
        ordering = ["-timestamp"]
        verbose_name = "Historique Commande"
        verbose_name_plural = "Historiques Commandes"

    def __str__(self):
        return f"Order #{self.order.id} — {self.action} — {self.timestamp}"


class Dispute(models.Model):
    """Litige sur une commande."""

    REASON_CHOICES = [
        ("NOT_RECEIVED",     "Commande non reçue"),
        ("DAMAGED",          "Article endommagé"),
        ("WRONG_ITEM",       "Mauvais article"),
        ("NOT_AS_DESCRIBED", "Non conforme à la description"),
        ("REFUND_REQUEST",   "Demande de remboursement"),
        ("OTHER",            "Autre"),
    ]
    STATUS_CHOICES = [
        ("OPEN",        "Ouvert"),
        ("IN_PROGRESS", "En cours"),
        ("RESOLVED",    "Résolu"),
        ("CLOSED",      "Fermé"),
    ]
    RESOLUTION_CHOICES = [
        ("REFUND",         "Remboursement"),
        ("EXCHANGE",       "Échange"),
        ("PARTIAL_REFUND", "Remboursement partiel"),
        ("REJECTED",       "Rejeté"),
        ("OTHER",          "Autre"),
    ]

    order     = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="disputes")
    opened_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name="opened_disputes")

    reason      = models.CharField(max_length=50, choices=REASON_CHOICES)
    status      = models.CharField(max_length=20, choices=STATUS_CHOICES, default="OPEN")
    description = models.TextField()

    resolution        = models.CharField(max_length=50, choices=RESOLUTION_CHOICES, blank=True, null=True)
    resolution_note   = models.TextField(blank=True, null=True)
    resolved_by       = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="resolved_disputes",
    )
    resolved_at       = models.DateTimeField(blank=True, null=True)
    refund_amount_xaf = models.IntegerField(blank=True, null=True)

    # ── Prise en charge admin ──────────────────────────────────────────────
    # Tous les admins peuvent voir et intervenir sur tous les litiges.
    # assigned_admin identifie qui a initié le premier contact avec une partie,
    # ce qui permet aux autres admins de savoir qui suit le dossier.
    assigned_admin = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='assigned_disputes',
        verbose_name="Admin en charge",
    )
    vendor_contacted = models.BooleanField(
        default=False,
        verbose_name="Vendeur contacté",
        help_text="Passe à True dès que l'admin envoie le premier message au vendeur.",
    )

    # ── Permissions de réponse (activées par l'admin) ──────────────────────
    vendor_can_reply = models.BooleanField(
        default=False,
        verbose_name="Vendeur autorisé à répondre",
        help_text="Si True, le vendeur peut envoyer des messages dans ce litige.",
    )
    courier_can_reply = models.BooleanField(
        default=False,
        verbose_name="Livreur autorisé à répondre",
        help_text="Si True, le livreur peut envoyer des messages dans ce litige.",
    )

    # ── Réponse formelle du vendeur (formulaire séparé du chat) ───────────
    class VendorReplyType(models.TextChoices):
        ACCEPT     = 'ACCEPT',     'Accepter le remboursement'
        CONTEST    = 'CONTEST',    'Contester le litige'
        COMPROMISE = 'COMPROMISE', 'Proposer un compromis'

    vendor_replied         = models.BooleanField(default=False, verbose_name="Vendeur a répondu formellement")
    vendor_reply_type      = models.CharField(
        max_length=12, choices=VendorReplyType.choices,
        null=True, blank=True, verbose_name="Type de réponse vendeur",
    )
    vendor_reply_text      = models.TextField(blank=True, default='', verbose_name="Explication vendeur")
    vendor_proposed_amount = models.IntegerField(
        null=True, blank=True,
        verbose_name="Montant proposé par le vendeur (FCFA)",
        help_text="Rempli uniquement si vendor_reply_type = COMPROMISE.",
    )
    vendor_replied_at      = models.DateTimeField(null=True, blank=True, verbose_name="Date réponse vendeur")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Litige"
        verbose_name_plural = "Litiges"

    def __str__(self):
        return f"Litige #{self.id} — Commande #{self.order.id}"


class DisputeMessage(models.Model):
    """
    Message dans un fil de litige.
    Le vendeur ne communique qu'avec l'admin (jamais directement avec le client).
    sender_role permet d'afficher "Admin BelivaY" côté vendeur sans exposer
    le nom réel de l'admin — tous les admins apparaissent comme "Admin BelivaY".
    """
    class SenderRole(models.TextChoices):
        VENDOR = 'VENDOR', 'Vendeur'
        ADMIN  = 'ADMIN',  'Admin BelivaY'
        SYSTEM = 'SYSTEM', 'Système'
        # CLIENT et LIVREUR ajoutés quand leurs espaces seront développés

    dispute     = models.ForeignKey(Dispute, on_delete=models.CASCADE, related_name="messages")
    sender      = models.ForeignKey(User, on_delete=models.CASCADE)
    message     = models.TextField()
    is_internal = models.BooleanField(
        default=False,
        help_text="True = note interne admin uniquement, invisible pour le vendeur.",
    )
    sender_role = models.CharField(
        max_length=10, choices=SenderRole.choices, default=SenderRole.ADMIN,
        verbose_name="Rôle de l'expéditeur",
    )
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]
        verbose_name = "Message Litige"
        verbose_name_plural = "Messages Litiges"

    def __str__(self):
        return f"Message de {self.sender.username} — Litige #{self.dispute.id}"


class DisputeEvidence(models.Model):
    """Pièce justificative jointe à un litige."""
    dispute     = models.ForeignKey(Dispute, on_delete=models.CASCADE, related_name="evidences")
    uploaded_by = models.ForeignKey(User, on_delete=models.CASCADE)
    file        = models.FileField(upload_to="disputes/%Y/%m/")
    description = models.CharField(max_length=255, blank=True)
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]
        verbose_name = "Preuve Litige"
        verbose_name_plural = "Preuves Litiges"

    def __str__(self):
        return f"Preuve — Litige #{self.dispute.id}"


class PlatformSettings(models.Model):
    """
    Configuration globale BelivaY — singleton (id=1).

    IMPORTANT :
      - Tout ce qui est configurable par l'admin est ici.
      - Aucune valeur n'est codée en dur dans le frontend.
      - platform_commission_percent est le taux par défaut. Il est copié dans
        Order.commission_rate_snapshot à la création — les modifications futures
        n'affectent JAMAIS les commandes passées.
    """

    # ── Commissions ───────────────────────────────────────────────────────────
    platform_commission_percent = models.DecimalField(
        max_digits=5, decimal_places=2, default=12.00,
        verbose_name="Commission plateforme (%)",
        help_text="Ne s'applique qu'aux nouvelles commandes.",
    )
    mobile_money_fee_percent = models.DecimalField(
        max_digits=4, decimal_places=2, default=1.50,
        verbose_name="Frais Mobile Money (%)",
        help_text="Frais MTN/Orange négociés.",
    )

    # ── Frais de livraison ────────────────────────────────────────────────────
    # Format : {"Yaoundé": 1500, "Douala": 2000, "default": 2500}
    delivery_fees = models.JSONField(
        default=dict,
        verbose_name="Frais de livraison (FCFA/ville)",
        help_text='Ex : {"Yaoundé": 1500, "Douala": 2000, "default": 2500}',
    )

    # ── Fenêtres temporelles (configurables) ──────────────────────────────────
    vendor_reply_h = models.PositiveIntegerField(
        default=72,
        verbose_name="Délai réponse vendeur (h)",
    )
    escrow_auto_confirm_h = models.PositiveIntegerField(
        default=48,
        verbose_name="Auto-confirmation escrow (h)",
        help_text="Délai après livraison avant auto-confirmation sans litige.",
    )
    escrow_release_h = models.PositiveIntegerField(
        default=24,
        verbose_name="Délai libération escrow (h)",
        help_text="Délai entre confirmation et libération effective des fonds.",
    )
    litige_window_days = models.PositiveIntegerField(
        default=7,
        verbose_name="Fenêtre litige (jours)",
        help_text="Jours après livraison pendant lesquels l'acheteur peut ouvrir un litige.",
    )

    # ── Commande ─────────────────────────────────────────────────────────────
    minimum_order_amount_xaf = models.IntegerField(
        default=5000,
        verbose_name="Montant minimum commande (FCFA)",
    )

    # ── Stock ─────────────────────────────────────────────────────────────────
    default_stock_threshold = models.IntegerField(
        default=5,
        verbose_name="Seuil alerte stock par défaut",
        help_text=(
            "Quantité en dessous de laquelle un produit est signalé comme 'stock faible'. "
            "Chaque vendeur peut définir son propre seuil par produit ; "
            "si non renseigné, c'est ce seuil global qui s'applique."
        ),
    )

    # ── Retrait vendeur ────────────────────────────────────────────────────
    withdrawal_fee_percent = models.DecimalField(
        max_digits=4,
        decimal_places=2,
        default=1.50,
        verbose_name="Frais de retrait MoMo (%)",
        help_text=(
            "Frais prélevés sur chaque demande de retrait Mobile Money. "
            "Taux préférentiel BelivaY (Orange/MTN). "
            "Configurable depuis l'interface admin."
        ),
    )
    minimum_withdrawal_amount_xaf = models.IntegerField(
        default=1000,
        verbose_name="Montant minimum de retrait (FCFA)",
        help_text=(
            "Montant minimum qu'un vendeur peut retirer en une seule demande. "
            "Configurable depuis l'interface admin."
        ),
    )
    default_delivery_days = models.IntegerField(
        default=3,
        verbose_name="Délai livraison par défaut (jours)",
    )

    # ── Paiement ─────────────────────────────────────────────────────────────
    mtn_momo_enabled     = models.BooleanField(default=True,  verbose_name="MTN MoMo activé")
    orange_money_enabled = models.BooleanField(default=True,  verbose_name="Orange Money activé")

    # ── Contacts ─────────────────────────────────────────────────────────────
    admin_email   = models.EmailField(default="admin@belivay.cm")
    support_email = models.EmailField(default="support@belivay.cm")

    # ── Maintenance ──────────────────────────────────────────────────────────
    maintenance_mode    = models.BooleanField(default=False)
    maintenance_message = models.TextField(blank=True, default="")

    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
    )

    max_offers_displayed = models.PositiveIntegerField(
        default=7,
        verbose_name="Nombre d'offres affichées par fiche",
        help_text="Nombre maximum d'offres vendeurs visibles sur une fiche produit (côté acheteur).",
    )

    class Meta:
        verbose_name = "Paramètres Plateforme"
        verbose_name_plural = "Paramètres Plateforme"

    def __str__(self):
        return "Paramètres de la plateforme BelivaY"

    @classmethod
    def get_settings(cls) -> "PlatformSettings":
        """Récupère ou crée l'unique instance de configuration."""
        instance, _ = cls.objects.get_or_create(id=1)
        return instance
