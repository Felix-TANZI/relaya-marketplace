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
from django.core.validators import MinValueValidator
from django.utils import timezone
from datetime import timedelta
from apps.catalog.models import Product


def dispute_evidence_retention_deadline():
    # Ne lit QUE la colonne necessaire (values_list), jamais toute la ligne
    # (PlatformSettings.get_settings() le ferait) : ce callable est utilise
    # comme default= d'un champ ajoute par une migration passee (0031). Une
    # migration ulterieure qui ajoute un champ a PlatformSettings ferait
    # echouer un replay de migrations depuis zero si on selectionnait la
    # ligne entiere ici — la colonne n'existerait pas encore a ce point du
    # graphe de migrations.
    jours = (
        PlatformSettings.objects.filter(id=1)
        .values_list('dispute_evidence_retention_days', flat=True)
        .first()
    )
    if jours is None:
        jours = PlatformSettings._meta.get_field('dispute_evidence_retention_days').default
    return timezone.now() + timedelta(days=jours)


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
    region  = models.CharField(max_length=50, blank=True, verbose_name="Région")
    district = models.CharField(max_length=100, blank=True, verbose_name="Quartier")
    zone = models.ForeignKey(
        "shipping.Zone", on_delete=models.SET_NULL, null=True, blank=True, related_name="orders",
        verbose_name="Zone de livraison",
        help_text="Resolue depuis city+district au checkout (Zone.match). None si aucune zone ne couvre ce quartier.",
    )
    address = models.CharField(max_length=255)
    address_precision = models.JSONField(
        blank=True,
        default=dict,
        verbose_name="Analyse de précision adresse",
        help_text="Adresse structurée pour aider le livreur: quartier, repères, score et instruction.",
    )
    delivery_latitude = models.DecimalField(
        max_digits=9, decimal_places=6, null=True, blank=True,
        verbose_name="Latitude de livraison",
        help_text="Position GPS donnée par le client au checkout, en complément de l'adresse.",
    )
    delivery_longitude = models.DecimalField(
        max_digits=9, decimal_places=6, null=True, blank=True,
        verbose_name="Longitude de livraison",
    )
    note    = models.TextField(blank=True, null=True)

    # Point relais choisi par l'acheteur au checkout (retrait via reseau de
    # points relais partenaires — distinct des boutiques BelivaY en dur).
    # Reserve la capacite du relais des la commande (RelayParcel EXPECTED).
    relay_point = models.ForeignKey(
        "accounts.RelayPointProfile",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="orders",
        verbose_name="Point relais choisi",
    )

    # Tiers autorise a retirer le colis a la place de l'acheteur (retrait
    # boutique/point relais). Le livreur/point relais verifie ce nom avant
    # de remettre le colis a une personne autre que le client.
    authorized_pickup_name = models.CharField(
        max_length=120, blank=True, default="",
        verbose_name="Nom du tiers autorisé au retrait",
    )
    authorized_pickup_phone = models.CharField(
        max_length=32, blank=True, default="",
        verbose_name="Téléphone du tiers autorisé au retrait",
    )

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
    # Spécification v2.1 (A1, A2) : subtotal_xaf = st ; delivery_fee_xaf = frais_client ; total_xaf = base_paiement.
    subtotal_xaf     = models.PositiveIntegerField(default=0)
    delivery_fee_xaf = models.PositiveIntegerField(default=0)
    total_xaf        = models.PositiveIntegerField(default=0)
    couverture_xaf   = models.PositiveIntegerField(default=0, help_text="Livraison offerte prise par BelivaY (R07.3)")
    frais_momo_xaf   = models.PositiveIntegerField(default=0, help_text="Frais Mobile Money payés par le client (R02.3)")
    total_a_payer_xaf = models.PositiveIntegerField(default=0, help_text="total_momo (R02.2), ou base_paiement par le Wallet (R02.5)")
    frais_detail     = models.JSONField(
        default=dict, blank=True,
        help_text="Calcul des frais figé au paiement (R12.3, R83.3) : boutiques, colis, distances, empreinte des réglages.",
    )

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

    # Bon de préparation — 4h ouvrées entre l'accusé de réception vendeur et
    # "prêt pour enlèvement", avec escalier (proposition validée, non écrite
    # dans les PDF de référence) : rappel à 4h, alerte admin à 6h,
    # réattribution signalée après 2 créneaux supplémentaires.
    prep_deadline = models.DateTimeField(null=True, blank=True, verbose_name="Délai de préparation (bon de préparation)")
    # Spec v2.1 (A3) : heure promise au client, figée au paiement et qui fait foi pour lui (R45.7).
    promesse_at = models.DateTimeField(null=True, blank=True, help_text="promesse (R45.3, R45.4)")
    promesse_texte = models.CharField(max_length=80, blank=True, default="", help_text="Texte de R45.6")
    prep_reminder_sent_at = models.DateTimeField(null=True, blank=True)
    prep_admin_alert_sent_at = models.DateTimeField(null=True, blank=True)
    prep_reassignment_flagged_at = models.DateTimeField(null=True, blank=True)

    # Horodatage de la transition PAID_IN_ESCROW → VENDOR_ACKNOWLEDGED — "début"
    # du compte à rebours de préparation (espace-vendeur, VD05-R02). Additif :
    # ne remplace pas le calcul existant de prep_deadline.
    vendor_acknowledged_at = models.DateTimeField(null=True, blank=True, verbose_name="Accusé de réception vendeur")

    # Bon de préparation (espace-vendeur BON-01/BON-02) : ouverture, quatre
    # cases cochées (modele/etat/accessoires/boite) avec qui a coché (journal),
    # référence scannée. Un seul JSONField plutôt qu'un modèle séparé — pas de
    # requêtage transversal nécessaire, juste de la présentation par commande.
    # Forme : {"opened_at": iso, "opened_by": "username",
    #          "checks": {"modele": {"fait": bool, "par": "username"}, …},
    #          "reference_verified_at": iso|null}
    prep_slip_state = models.JSONField(default=dict, blank=True, verbose_name="État du bon de préparation")

    # « Plus de temps » (DEL-01 à DEL-04, espace-vendeur VD-05) : une seule
    # prolongation possible, jamais au-delà de l'échéance absolue (début + 24h
    # ouvrées). prep_deadline porte la nouvelle échéance une fois prolongée.
    prep_extended = models.BooleanField(default=False, verbose_name="Délai de préparation déjà prolongé")

    # ── Annulation (Q-73 : quatre motifs affichés côté vendeur) ──────────────
    class CancellationReason(models.TextChoices):
        CLIENT_BEFORE_PICKUP = "CLIENT_BEFORE_PICKUP", "Annulée par le client avant ramassage"
        STOCKOUT             = "STOCKOUT",             "Rupture de stock"
        DISPUTE_LOST         = "DISPUTE_LOST",         "Litige perdu"
        BELIVAY              = "BELIVAY",              "Annulée par BelivaY"

    cancellation_reason = models.CharField(
        max_length=30, choices=CancellationReason.choices, blank=True, default="",
        verbose_name="Motif d'annulation",
    )
    cancelled_at = models.DateTimeField(null=True, blank=True, verbose_name="Annulée le")

    # Colis pas prêt au passage du livreur (espace-vendeur §8, POST .../not-ready) :
    # le ramassage repasse au créneau suivant disponible, sans pénalité automatique.
    not_ready_reason = models.CharField(max_length=255, blank=True, default="", verbose_name="Motif « colis pas prêt »")
    not_ready_at = models.DateTimeField(null=True, blank=True, verbose_name="Signalé pas prêt le")

    # Montant gelé par un litige ou un retour en cours (CMD-09) — distinct de
    # l'escrow global : c'est la part de CETTE sous-commande vendeur. Mis à
    # jour par le domaine litiges/retours ; None = rien de gelé (ou accès
    # Préparation, qui ne reçoit jamais de montant).
    frozen_amount_xaf = models.PositiveIntegerField(
        null=True, blank=True, verbose_name="Montant gelé (XAF)",
        help_text="Part vendeur gelée par un litige/retour ouvert sur cette commande ; vidé à la clôture (CMD-07).",
    )

    # Sous-commande de remplacement d'un retour (REFCL-R080) — créée par le
    # domaine retours (POST /returns/{id}/replacement) ; même parcours que
    # toute commande, mais sans garde ni argent propres (ils restent sur la
    # commande d'origine).
    replacement_of = models.ForeignKey(
        "self", on_delete=models.SET_NULL, null=True, blank=True, related_name="replacements",
        verbose_name="Remplace la commande",
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
        from apps.orders.delais import figer_au_paiement
        figer_au_paiement(self, timezone.now())

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
        ("COUNTERFEIT",      "Suspicion de contrefaçon"),
        ("REFUND_REQUEST",   "Demande de remboursement"),
        ("PAYMENT_NOT_RECOGNIZED", "Paiement non reconnu"),
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

    order      = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="disputes")
    order_item = models.ForeignKey(
        OrderItem, on_delete=models.CASCADE, null=True, blank=True, related_name="disputes",
        help_text="Article précis concerné par le litige. Requis pour les commandes multi-articles.",
    )
    product = models.ForeignKey(
        Product, on_delete=models.SET_NULL, null=True, blank=True, related_name="disputes",
        help_text="Snapshot relationnel du produit concerné, dérivé de order_item.",
    )
    vendor = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="vendor_disputes",
        help_text="Vendeur concerné par l'article litigieux.",
    )
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
    vendor_reply_deadline  = models.DateTimeField(
        null=True, blank=True, verbose_name="Délai de réponse vendeur (48h)",
        help_text="Démarre au contact vendeur (vendor_contacted=True), pas à l'ouverture du litige.",
    )
    silence_flagged_at     = models.DateTimeField(
        null=True, blank=True, verbose_name="Signalé pour arbitrage sur silence",
        help_text="Le vendeur n'a pas répondu sous 48h : arbitrage BelivaY sur pièces, présomption favorable à l'acheteur (pas un gain automatique).",
    )

    # ── Arrangement proposé (posture COMPROMISE, espace vendeur VD-07) ─────
    class ArrangementType(models.TextChoices):
        REMPLACEMENT = 'REMPLACEMENT', 'Remplacement'
        REMISE       = 'REMISE',       'Remise'

    vendor_arrangement_type = models.CharField(
        max_length=14, choices=ArrangementType.choices, null=True, blank=True,
        verbose_name="Type d'arrangement proposé",
        help_text="Rempli uniquement si vendor_reply_type = COMPROMISE (espace vendeur VD-07, POST /disputes/{ref}/answer).",
    )

    # ── Brouillon de réponse (gardé LIT-BROUILLON-H, sync best-effort) ─────
    draft_answer = models.JSONField(
        null=True, blank=True,
        verbose_name="Brouillon de réponse en cours",
        help_text="{posture, arrangement, texte, gardeA} — PUT /disputes/{ref}/draft. Sync best-effort : l'appareil garde sa propre copie.",
    )

    # ── Effet sur le Trust Score (DCS-02) ───────────────────────────────────
    class ScoreEffect(models.TextChoices):
        AUCUN = 'aucun', 'Aucun'
        G1    = 'g1',    'Échec léger'
        G3    = 'g3',    'Faute avérée'

    decision_score_effect = models.CharField(
        max_length=8, choices=ScoreEffect.choices, default=ScoreEffect.AUCUN,
        verbose_name="Effet décision sur le Trust Score",
        help_text=(
            "Pas de déclenchement automatique construit ici (Trust Score V5.5 pas encore "
            "implémenté — voir memoire projet) : reste à AUCUN tant qu'aucun processus admin "
            "ne le renseigne explicitement."
        ),
    )

    # ── Recours (appel) du vendeur ou du client sur une décision ────────────
    class AppealOutcome(models.TextChoices):
        PENDING    = 'PENDING',    'En attente'
        UPHELD     = 'UPHELD',     'Décision maintenue'
        OVERTURNED = 'OVERTURNED', 'Décision infirmée'

    appeal_text        = models.TextField(blank=True, default='', verbose_name="Texte du recours")
    appeal_filed_at     = models.DateTimeField(null=True, blank=True, verbose_name="Recours déposé le")
    appeal_filed_by     = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='filed_dispute_appeals',
        verbose_name="Recours déposé par",
    )
    appeal_decided_at  = models.DateTimeField(null=True, blank=True, verbose_name="Recours tranché le")
    appeal_outcome     = models.CharField(
        max_length=12, choices=AppealOutcome.choices, null=True, blank=True,
        verbose_name="Issue du recours",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Litige"
        verbose_name_plural = "Litiges"
        indexes = [
            models.Index(fields=["order_item", "opened_by", "status"], name="orders_disp_order_i_1bfe29_idx"),
        ]

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
        CLIENT = 'CLIENT', 'Client'
        COURIER = 'COURIER', 'Livreur'
        LOGISTICS = 'LOGISTICS', 'Organisation logistique'
        RELAY_POINT = 'RELAY_POINT', 'Point relais'
        SYSTEM = 'SYSTEM', 'Système'

    dispute     = models.ForeignKey(Dispute, on_delete=models.CASCADE, related_name="messages")
    sender      = models.ForeignKey(User, on_delete=models.CASCADE)
    message     = models.TextField()
    is_internal = models.BooleanField(
        default=False,
        help_text="True = note interne admin uniquement, invisible pour le vendeur.",
    )
    sender_role = models.CharField(
        max_length=20, choices=SenderRole.choices, default=SenderRole.ADMIN,
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
    class EvidenceType(models.TextChoices):
        PHOTO = 'PHOTO', 'Photo'
        VIDEO = 'VIDEO', 'Vidéo'
        DOCUMENT = 'DOCUMENT', 'Document'
        OTHER = 'OTHER', 'Autre'

    dispute     = models.ForeignKey(Dispute, on_delete=models.CASCADE, related_name="evidences")
    request     = models.ForeignKey(
        "DisputeEvidenceRequest",
        on_delete=models.SET_NULL,
        related_name="evidences",
        null=True,
        blank=True,
    )
    message     = models.ForeignKey(
        "DisputeMessage",
        on_delete=models.SET_NULL,
        related_name="evidences",
        null=True,
        blank=True,
        help_text="Message du fil de discussion auquel cette photo était jointe, le cas échéant.",
    )
    uploaded_by = models.ForeignKey(User, on_delete=models.CASCADE)
    evidence_type = models.CharField(max_length=16, choices=EvidenceType.choices, default=EvidenceType.PHOTO)
    uploader_role = models.CharField(max_length=20, blank=True)
    file        = models.FileField(upload_to="disputes/%Y/%m/")
    description = models.CharField(max_length=255, blank=True)
    content_type = models.CharField(max_length=100, blank=True)
    size_bytes = models.PositiveBigIntegerField(default=0)
    sha256 = models.CharField(max_length=64, blank=True)
    retain_until = models.DateTimeField(default=dispute_evidence_retention_deadline)
    litigation_hold = models.BooleanField(default=False)
    purged_at = models.DateTimeField(null=True, blank=True)
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]
        verbose_name = "Preuve Litige"
        verbose_name_plural = "Preuves Litiges"
        indexes = [
            models.Index(fields=["retain_until", "litigation_hold", "purged_at"]),
        ]

    def __str__(self):
        return f"Preuve — Litige #{self.dispute.id}"


class DisputeEvidenceRequest(models.Model):
    class RecipientRole(models.TextChoices):
        CLIENT = 'CLIENT', 'Client'
        VENDOR = 'VENDOR', 'Vendeur'
        COURIER = 'COURIER', 'Livreur'
        LOGISTICS = 'LOGISTICS', 'Organisation logistique'
        RELAY_POINT = 'RELAY_POINT', 'Point relais'

    class Status(models.TextChoices):
        PENDING = 'PENDING', 'En attente'
        SUBMITTED = 'SUBMITTED', 'Reçue'
        CANCELLED = 'CANCELLED', 'Annulée'
        EXPIRED = 'EXPIRED', 'Expirée'

    dispute = models.ForeignKey(Dispute, on_delete=models.CASCADE, related_name="evidence_requests")
    recipient_role = models.CharField(max_length=20, choices=RecipientRole.choices)
    requested_from = models.ForeignKey(User, on_delete=models.PROTECT, related_name="received_evidence_requests")
    requested_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name="created_evidence_requests")
    evidence_types = models.JSONField(blank=True, default=list)
    instructions = models.TextField()
    due_at = models.DateTimeField(blank=True, null=True)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.PENDING)
    responded_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["requested_from", "status"], name="orders_disp_request_8c68a8_idx"),
        ]

    def __str__(self):
        return f"Demande preuve #{self.id} — Litige #{self.dispute_id}"


class Return(models.Model):
    """
    Retour d'un article après livraison.

    Distinct de Dispute : un Dispute sert à trancher un désaccord ; un Return
    documente un retour déjà reconnu comme fondé (par le vendeur ou par un
    arbitrage), avec son propre cycle logistique (dépôt/ramassage → réception
    physique → inspection → remboursement).

    Règle verrouillée : le remboursement (evenement RETURN_COMPLETED) ne se
    déclenche JAMAIS à la simple demande — seulement après réception physique
    + inspection du colis retourné (voir events_in.return_completed).
    """

    class Reason(models.TextChoices):
        DAMAGED = "DAMAGED", "Article endommagé"
        NOT_AS_DESCRIBED = "NOT_AS_DESCRIBED", "Non conforme à la description"
        WRONG_ITEM = "WRONG_ITEM", "Mauvais article reçu"
        COUNTERFEIT = "COUNTERFEIT", "Suspicion de contrefaçon"
        HIDDEN_DEFECT = "HIDDEN_DEFECT", "Défaut caché (vice caché)"
        OTHER = "OTHER", "Autre"

    class Status(models.TextChoices):
        REQUESTED = "REQUESTED", "Demande de retour"
        APPROVED = "APPROVED", "Retour approuvé"
        REJECTED = "REJECTED", "Retour rejeté"
        AWAITING_DROPOFF = "AWAITING_DROPOFF", "En attente de dépôt/ramassage"
        RECEIVED = "RECEIVED", "Colis reçu — inspection en cours"
        MEDIATION = "MEDIATION", "Non conforme — médiation BelivaY"
        REPLACEMENT_PENDING = "REPLACEMENT_PENDING", "Remplacement choisi — préparation"
        REPLACEMENT_READY = "REPLACEMENT_READY", "Remplacement prêt pour enlèvement"
        REFUNDED = "REFUNDED", "Remboursé"
        CLOSED_NO_REFUND = "CLOSED_NO_REFUND", "Clôturé sans remboursement"

    class TransportMode(models.TextChoices):
        RELAY_DROPOFF = "RELAY_DROPOFF", "Dépôt en point relais"
        COURIER_PICKUP = "COURIER_PICKUP", "Ramassage à domicile"

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="returns")
    order_item = models.ForeignKey(OrderItem, on_delete=models.CASCADE, related_name="returns")
    requested_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name="requested_returns")
    vendor = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="vendor_returns",
        help_text="Vendeur du produit retourné, dérivé de order_item.",
    )

    reason = models.CharField(max_length=30, choices=Reason.choices)
    description = models.TextField(blank=True, default="")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.REQUESTED)

    transport_mode = models.CharField(
        max_length=20, choices=TransportMode.choices, default=TransportMode.RELAY_DROPOFF,
        help_text="Dépôt en point relais par défaut ; ramassage réservé aux colis encombrants.",
    )
    dropoff_relay_point = models.ForeignKey(
        "accounts.RelayPointProfile", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="return_dropoffs",
    )

    reviewed_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="reviewed_returns",
        help_text="Vendeur ou admin ayant approuvé/rejeté la demande initiale.",
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    review_note = models.TextField(blank=True, default="")

    received_at = models.DateTimeField(null=True, blank=True)
    received_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="received_returns",
        help_text="Point relais ou admin ayant constaté la réception physique du colis retourné.",
    )
    inspection_passed = models.BooleanField(null=True, blank=True)
    inspection_note = models.TextField(blank=True, default="")
    inspection_controles = models.JSONField(
        null=True, blank=True,
        verbose_name="Contrôles d'inspection soumis",
        help_text="{scelle, serie} — tel que soumis par POST /returns/{ref}/inspection.",
    )
    inspected_at = models.DateTimeField(null=True, blank=True, verbose_name="Inspecté le")
    inspected_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="inspected_returns",
    )
    refund_amount_xaf = models.IntegerField(null=True, blank=True)

    # ── Brouillon d'inspection (gardé sur l'appareil, sync best-effort) ─────
    draft_inspection = models.JSONField(
        null=True, blank=True,
        verbose_name="Brouillon d'inspection en cours",
        help_text="{controles, verdict} — PUT /returns/{ref}/draft (espace vendeur VD-07).",
    )

    # ── Défaut confirmé : remplacer ou rembourser (espace vendeur VD-07) ───
    class ReplacementChoice(models.TextChoices):
        REPLACE = 'REPLACE', 'Remplacer'
        REFUND  = 'REFUND',  'Rembourser'

    replacement_choice = models.CharField(
        max_length=10, choices=ReplacementChoice.choices, null=True, blank=True,
        verbose_name="Remède choisi par le vendeur",
    )
    replacement_order = models.ForeignKey(
        Order, on_delete=models.SET_NULL, null=True, blank=True, related_name="source_return",
        verbose_name="Sous-commande de remplacement",
        help_text=(
            "Créée par POST /returns/{ref}/replacement quand replacement_choice=REPLACE "
            "(REFCL-R080). Le domaine commandes expose son propre lien (Commande.remplacementDe / "
            "replacement_of) — coordination nécessaire, voir rapport de l'agent litiges/retours."
        ),
    )
    replacement_ship_deadline = models.DateTimeField(
        null=True, blank=True, verbose_name="Remplacement à expédier avant",
    )
    replacement_ready_at = models.DateTimeField(null=True, blank=True, verbose_name="Remplacement prêt le")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Retour"
        verbose_name_plural = "Retours"

    def __str__(self):
        return f"Retour #{self.id} — Commande #{self.order_id}"


def return_photo_upload_path(instance, filename):
    return f"returns/{instance.return_obj_id}/{filename}"


class ReturnPhoto(models.Model):
    """
    Photo d'inspection d'un retour (espace vendeur VD-07, INP-01 : au moins
    RET_INSPECTION_MIN_PHOTOS requises avant de trancher le verdict).
    Même convention d'horodatage/empreinte que DisputeEvidence, sans le
    cycle de conservation litigation_hold (pas de délai légal connu ici).
    """
    return_obj = models.ForeignKey(Return, on_delete=models.CASCADE, related_name="photos")
    uploaded_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name="return_photos")
    file = models.FileField(upload_to="returns/%Y/%m/")
    content_type = models.CharField(max_length=100, blank=True)
    size_bytes = models.PositiveBigIntegerField(default=0)
    sha256 = models.CharField(max_length=64, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]
        verbose_name = "Photo de retour"
        verbose_name_plural = "Photos de retour"

    def __str__(self):
        return f"Photo — Retour #{self.return_obj_id}"


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
        default=96,
        verbose_name="Auto-confirmation escrow (h)",
        help_text="Délai après remise avant auto-confirmation sans litige. Verrouillé à 4 jours (96h) — Addendum Décisions v1.0 §3.1.",
    )
    escrow_release_h = models.PositiveIntegerField(
        default=72,
        verbose_name="Délai libération escrow (h)",
        help_text="Délai entre clôture du droit de retour (confirmation ou auto-confirmation) et libération effective des fonds. Verrouillé à J+3 (72h) — Addendum Décisions v1.0 §3.1.",
    )
    litige_window_days = models.PositiveIntegerField(
        default=4,
        verbose_name="Fenêtre litige (jours)",
        help_text="Jours après la remise pendant lesquels l'acheteur peut ouvrir un litige. Verrouillé à 4 jours, calé sur l'auto-confirmation — Addendum Décisions v1.0 §4.4.",
    )
    evidence_retention_days = models.PositiveIntegerField(
        default=8,
        validators=[MinValueValidator(1)],
        verbose_name="Conservation des preuves colis (jours)",
        help_text=(
            "Délai après lequel une preuve de livraison (ShipmentEvidence) sans litige "
            "ouvert est purgée. Sans effet sur une preuve déjà gelée par un litige actif."
        ),
    )
    dispute_evidence_retention_days = models.PositiveIntegerField(
        default=60,
        validators=[MinValueValidator(1)],
        verbose_name="Conservation des preuves de litige (jours)",
        help_text=(
            "Délai après lequel une preuve jointe à un litige (DisputeEvidence) est "
            "purgée automatiquement. Verrouillé à 60 jours — Addendum Décisions v1.0 §4.4."
        ),
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

    # ── Anomalie de prix (VD-PRIX-ANORMAL) ──────────────────────────────────
    # Reglages intentionnellement modifiables depuis l'admin, pas des
    # constantes codees en dur : a ajuster une fois le vrai catalogue rempli.
    price_anomaly_min_offers = models.PositiveIntegerField(
        default=3,
        verbose_name="Nb minimum d'autres offres pour comparer",
        help_text="En dessous de ce nombre d'autres offres sur la même fiche, on compare au prix précédent du vendeur (variation brutale) plutôt qu'à une médiane peu fiable.",
    )
    price_anomaly_low_flag_pct = models.DecimalField(
        max_digits=6, decimal_places=2, default=60.00,
        verbose_name="Seuil bas signalé (% médiane)",
        help_text="Prix inférieur à ce pourcentage de la médiane des autres offres : publié mais envoyé en file de contrôle admin.",
    )
    price_anomaly_high_flag_pct = models.DecimalField(
        max_digits=6, decimal_places=2, default=200.00,
        verbose_name="Seuil haut signalé (% médiane)",
    )
    price_anomaly_low_block_pct = models.DecimalField(
        max_digits=6, decimal_places=2, default=30.00,
        verbose_name="Seuil bas bloqué (% médiane)",
        help_text="Prix inférieur à ce pourcentage de la médiane : publication bloquée, le vendeur doit confirmer puis l'admin contrôle (quasi toujours un zéro en trop ou en moins).",
    )
    price_anomaly_high_block_pct = models.DecimalField(
        max_digits=6, decimal_places=2, default=500.00,
        verbose_name="Seuil haut bloqué (% médiane)",
    )
    price_own_variation_block_pct = models.DecimalField(
        max_digits=6, decimal_places=2, default=50.00,
        verbose_name="Variation brutale de son propre prix (%)",
        help_text="Si le vendeur change son propre prix de plus de ce pourcentage d'un coup, confirmation demandée.",
    )

    # ── Doublons (VD-DOUBLON) ────────────────────────────────────────────────
    duplicate_title_similarity_pct = models.DecimalField(
        max_digits=5, decimal_places=2, default=85.00,
        verbose_name="Seuil de similarité des titres (%)",
        help_text="Titres jugés 'doublon probable' à partir de ce pourcentage de similarité (après normalisation), même catégorie et même marque.",
    )
    duplicate_image_hash_max_distance = models.PositiveIntegerField(
        default=8,
        verbose_name="Distance max empreinte image (sur 64)",
        help_text="Deux photos principales sont jugées identiques si la distance de Hamming entre leurs empreintes (dHash 64 bits) est inférieure ou égale à cette valeur.",
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


class CommissionSousCommande(TimeStampedModel):
    """Commission d'une sous-commande (une boutique) figée au paiement (BV-DEV-03, A7 et A8).

    R13.2 : palier, univers, taux et offre de découverte sont figés ; R13.5 : la base, le taux et la décomposition sont
    gardés pour le contrat, la facture mensuelle et le support. Le vendeur ne voit que net_b (R26.1) ; la console voit
    commission_b, tva_b et net_b (R26.2)."""

    class Plancher(models.TextChoices):  # R14.4
        BAREME = "bareme_b", "Barème"
        TAUX_MIN = "taux_min", "Taux minimal"
        COM_MIN = "com_min", "Commission minimale"
        PLANCHER_OFFERT = "plancher_offert_b", "Plancher de la livraison offerte"

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="commissions")
    vendor = models.ForeignKey(User, on_delete=models.PROTECT, related_name="commissions_sous_commandes")
    st_b = models.PositiveIntegerField(help_text="Sous-total de la boutique, prix payés (R13.1)")
    commission_b = models.PositiveIntegerField(help_text="R14.1, arrondie (R20.1)")
    tva_b = models.PositiveIntegerField(default=0, help_text="R21.2")
    net_b = models.IntegerField(help_text="st_b − commission_b − tva_b (R22.1)")
    bareme_b = models.CharField(max_length=60, help_text="Valeur exacte (fraction), non arrondie (R20.1)")
    plancher_retenu = models.CharField(max_length=20, choices=Plancher.choices)
    couv_b = models.CharField(max_length=60, default="0", help_text="Part de la couverture, valeur exacte (R14.3)")
    palier = models.CharField(max_length=10, help_text="Palier du vendeur au paiement (R13.2, t_multiplicateurs)")
    decouverte = models.BooleanField(default=False, help_text="Offre de découverte au paiement (R17.3)")
    articles = models.JSONField(default=list, help_text="prix_i, q_i, univers_i, mic_i de chaque ligne (R13.5)")
    # Contrôle de rentabilité (A8, R92) : exact, non arrondi.
    liv_b = models.CharField(max_length=60, blank=True, default="")
    couts_b = models.CharField(max_length=60, blank=True, default="")
    reste_b = models.CharField(max_length=60, blank=True, default="")
    exigence = models.BooleanField(null=True, help_text="reste_b ≥ 0 (R92.4)")
    objectif = models.BooleanField(null=True, help_text="reste_b ≥ r_objectif_reste × couts_b (R92.4)")
    reglages = models.CharField(max_length=20, blank=True, default="", help_text="Empreinte des réglages appliqués")

    class Meta:
        constraints = [models.UniqueConstraint(fields=["order", "vendor"], name="orders_commission_une_par_boutique")]
        verbose_name = "Commission d'une sous-commande"
        verbose_name_plural = "Commissions des sous-commandes"

    def __str__(self):
        return f"Commande #{self.order_id} · {self.vendor} · {self.commission_b} F"
