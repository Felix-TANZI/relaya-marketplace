# backend/apps/payments/escrow/models.py
# Sequestres multi-acteurs.
#
# ─────────────────────────────────────────────────────────────────────────────
# LA CLE A QUATRE DIMENSIONS
#
#   EscrowHold = (PaymentIntent x Order? x PayeeAccount x EconomicComponent)
#
# Pourquoi pas (paiement x beneficiaire), comme initialement redige :
#
#   1. Un MEME vendeur peut avoir DEUX commandes dans un meme paiement.
#      Avec une cle a deux dimensions, geler le colis 1 gelerait le colis 2.
#      Le litige deviendrait scope au vendeur, pas au colis.
#
#   2. Un MEME partenaire peut porter DEUX roles sur un meme paiement.
#      Un Grand Centre est a la fois micro-hub (TRANSPORT) et point de
#      retrait (RELAY_HANDLING) : deux declencheurs de liberation differents.
#      Sans le composant dans la cle, l'un ne peut pas etre libere sans l'autre.
#
#   3. Les frais de livraison sont de niveau PAIEMENT, pas commande.
#      order_id est donc NUL pour TRANSPORT et renseigne pour GOODS.
#      Une cle unique ne peut pas decrire les deux.
# ─────────────────────────────────────────────────────────────────────────────
#
# order_id est un ENTIER, pas une cle etrangere : le domaine financier ne
# depend d'aucune autre application (principe P1). Le lien formel vit dans
# bridge/intent_orders.py.

import uuid

from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone

from apps.payments.domain.enums import (
    EconomicComponent,
    EscrowHoldStatus,
    ReleaseTrigger,
)
from apps.payments.domain.state_machines import ESCROW_HOLD
from apps.payments.intents.models import PaymentIntent
from apps.payments.payees.models import PayeeAccount


class EscrowHold(models.Model):
    """Un montant sequestre, avec son propre cycle de liberation."""

    class Component(models.TextChoices):
        GOODS = EconomicComponent.GOODS.value, "Marchandise"
        TRANSPORT = EconomicComponent.TRANSPORT.value, "Transport"
        RELAY_HANDLING = EconomicComponent.RELAY_HANDLING.value, "Remise en point relais"

    class Status(models.TextChoices):
        PENDING = EscrowHoldStatus.PENDING.value, "En attente de paiement"
        HELD = EscrowHoldStatus.HELD.value, "Sous sequestre"
        RELEASE_SCHEDULED = EscrowHoldStatus.RELEASE_SCHEDULED.value, "Liberation programmee"
        RELEASED = EscrowHoldStatus.RELEASED.value, "Libere"
        FROZEN = EscrowHoldStatus.FROZEN.value, "Gele (litige)"
        REFUNDED = EscrowHoldStatus.REFUNDED.value, "Rembourse"
        PARTIALLY_REFUNDED = EscrowHoldStatus.PARTIALLY_REFUNDED.value, "Partiellement rembourse"
        CANCELLED = EscrowHoldStatus.CANCELLED.value, "Annule"

    class Trigger(models.TextChoices):
        BUYER_RECEIPT_CONFIRMED = ReleaseTrigger.BUYER_RECEIPT_CONFIRMED.value, "Reception confirmee"
        AUTO_CONFIRMED = ReleaseTrigger.AUTO_CONFIRMED.value, "Confirmation automatique"
        DELIVERY_PROOF_VALIDATED = ReleaseTrigger.DELIVERY_PROOF_VALIDATED.value, "Preuve de livraison validee"
        RELAY_HANDOVER_SCANNED = ReleaseTrigger.RELAY_HANDOVER_SCANNED.value, "Remise scannee"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reference = models.CharField(max_length=48, unique=True, editable=False)

    # ── Les quatre dimensions de la cle ──────────────────────────────────────
    intent = models.ForeignKey(
        PaymentIntent, on_delete=models.PROTECT, related_name="escrow_holds",
    )
    order_id = models.PositiveIntegerField(
        null=True, blank=True, db_index=True,
        verbose_name="Commande",
        help_text=(
            "Entier et NON cle etrangere : le domaine financier ne depend "
            "d'aucune autre application. Nul pour TRANSPORT, qui est de "
            "niveau paiement."
        ),
    )
    payee = models.ForeignKey(
        PayeeAccount, on_delete=models.PROTECT, related_name="escrow_holds",
    )
    component = models.CharField(max_length=20, choices=Component.choices)

    # ── Montants ─────────────────────────────────────────────────────────────
    gross_amount_xaf = models.PositiveBigIntegerField(validators=[MinValueValidator(1)])
    commission_xaf = models.PositiveBigIntegerField(default=0)
    net_amount_xaf = models.PositiveBigIntegerField()
    refunded_amount_xaf = models.PositiveBigIntegerField(default=0)
    currency = models.CharField(max_length=3, default="XAF")

    # ── Cycle de vie ─────────────────────────────────────────────────────────
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    release_trigger = models.CharField(max_length=30, choices=Trigger.choices)

    auto_confirm_at = models.DateTimeField(
        null=True, blank=True,
        help_text="Echeance de confirmation automatique sans litige.",
    )
    release_at = models.DateTimeField(
        null=True, blank=True,
        help_text="Echeance de liberation effective apres confirmation.",
    )
    dispute_window_ends_at = models.DateTimeField(null=True, blank=True)

    triggered_at = models.DateTimeField(null=True, blank=True)
    released_at = models.DateTimeField(null=True, blank=True)

    frozen_reason = models.TextField(blank=True, default="")
    frozen_at = models.DateTimeField(null=True, blank=True)

    #: Politique FIGEE a la creation (principe P3). Une modification en
    #: administration n'affecte jamais un sequestre en cours.
    policy_snapshot = models.JSONField(default=dict, blank=True)

    settlement_batch_ref = models.CharField(
        max_length=48, blank=True, default="", db_index=True,
        help_text="Lot de reglement qui a couvert ce sequestre (Lot 8).",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "payments"
        ordering = ["-created_at"]
        verbose_name = "Sequestre"
        verbose_name_plural = "Sequestres"
        constraints = [
            models.UniqueConstraint(
                fields=["intent", "order_id", "payee", "component"],
                name="unique_escrow_hold_key",
                nulls_distinct=False,
            ),
            models.CheckConstraint(
                condition=models.Q(net_amount_xaf__lte=models.F("gross_amount_xaf")),
                name="escrow_net_not_above_gross",
            ),
            models.CheckConstraint(
                condition=models.Q(refunded_amount_xaf__lte=models.F("net_amount_xaf")),
                name="escrow_refund_not_above_net",
            ),
        ]
        indexes = [
            models.Index(fields=["status", "release_at"]),
            models.Index(fields=["status", "auto_confirm_at"]),
            models.Index(fields=["payee", "status"]),
            models.Index(fields=["component", "status"]),
        ]

    def __str__(self):
        return f"{self.reference} — {self.component} {self.net_amount_xaf} XAF ({self.status})"

    def save(self, *args, **kwargs):
        if not self.reference:
            annee = timezone.now().year
            compteur = EscrowHold.objects.filter(created_at__year=annee).count() + 1
            self.reference = f"BLV-ESC-{annee}-{compteur:07d}"
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError(
            f"Le sequestre {self.reference} ne peut pas etre supprime : "
            "des ecritures comptables y font reference."
        )

    def clean(self):
        est_niveau_commande = self.component in (
            self.Component.GOODS, self.Component.RELAY_HANDLING,
        )
        if est_niveau_commande and self.order_id is None:
            raise ValidationError(
                f"Le composant {self.component} est de niveau commande : "
                "order_id est obligatoire."
            )
        if not est_niveau_commande and self.order_id is not None:
            raise ValidationError(
                f"Le composant {self.component} est de niveau paiement : "
                "order_id doit rester nul (frais mutualises sur le panier)."
            )

    # ── Transitions ──────────────────────────────────────────────────────────

    def transition_to(self, target: str, *, save: bool = True) -> "EscrowHold":
        """
        Change d'etat via la machine du domaine.

        Une transition non declaree leve IllegalTransition. Aucun chemin
        implicite : un sequestre qui glisse d'etat deplace de l'argent.
        """
        ESCROW_HOLD.assert_transition(
            EscrowHoldStatus(self.status), EscrowHoldStatus(target)
        )
        self.status = target
        if save:
            self.save(update_fields=["status", "updated_at"])
        return self

    # ── Etats derives ────────────────────────────────────────────────────────

    @property
    def is_final(self) -> bool:
        return ESCROW_HOLD.is_terminal(EscrowHoldStatus(self.status))

    @property
    def is_active(self) -> bool:
        """Un sequestre actif est HORS D'ATTEINTE de toute compensation."""
        return self.status in (self.Status.HELD, self.Status.RELEASE_SCHEDULED)

    @property
    def payable_amount_xaf(self) -> int:
        return max(0, self.net_amount_xaf - self.refunded_amount_xaf)

    @property
    def is_due_for_release(self) -> bool:
        return (
            self.status == self.Status.RELEASE_SCHEDULED
            and self.release_at is not None
            and self.release_at <= timezone.now()
        )

    @property
    def is_due_for_auto_confirm(self) -> bool:
        return (
            self.status == self.Status.HELD
            and self.auto_confirm_at is not None
            and self.auto_confirm_at <= timezone.now()
        )


class EscrowEvent(models.Model):
    """
    Journal des evenements metier consommes. Append-only.

    LE DOMAINE FINANCIER NE JUGE PAS LES FAITS METIER (principe P9).
    Il ne decide jamais qu'une livraison est valide : il consomme un
    evenement emis par le domaine competent APRES ses propres controles.

    Sans ce principe, le module financier finirait par contenir de la logique
    de validation logistique, dupliquee et divergente de celle du domaine
    livraison. Deux verites sur « est-ce livre ? », dont une decide du
    versement de l'argent.

    `event_id` est unique : rejouer un evenement n'a aucun effet supplementaire.
    """

    class Kind(models.TextChoices):
        BUYER_RECEIPT_CONFIRMED = "BUYER_RECEIPT_CONFIRMED", "Reception confirmee par l'acheteur"
        AUTO_CONFIRMED = "AUTO_CONFIRMED", "Confirmation automatique"
        DELIVERY_PROOF_VALIDATED = "DELIVERY_PROOF_VALIDATED", "Preuve de livraison validee"
        RELAY_HANDOVER_SCANNED = "RELAY_HANDOVER_SCANNED", "Remise scannee"
        DISPUTE_OPENED = "DISPUTE_OPENED", "Litige ouvert"
        DISPUTE_RESOLVED = "DISPUTE_RESOLVED", "Litige resolu"
        RETURN_INITIATED = "RETURN_INITIATED", "Retour initie"
        RETURN_COMPLETED = "RETURN_COMPLETED", "Retour finalise"
        ORDER_CANCELLED = "ORDER_CANCELLED", "Commande annulee"
        ADMIN_OVERRIDE = "ADMIN_OVERRIDE", "Intervention administrative"

    class Outcome(models.TextChoices):
        APPLIED = "APPLIED", "Applique"
        IGNORED = "IGNORED", "Ignore (doublon ou hors perimetre)"
        REJECTED = "REJECTED", "Rejete"
        ERROR = "ERROR", "Erreur"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    event_id = models.CharField(
        max_length=120, unique=True,
        help_text="Identifiant fourni par l'emetteur. Garantit l'idempotence.",
    )
    kind = models.CharField(max_length=30, choices=Kind.choices)
    emitter = models.CharField(
        max_length=60, blank=True, default="",
        help_text="Domaine emetteur : apps.orders, apps.shipping, relais…",
    )

    order_id = models.PositiveIntegerField(null=True, blank=True, db_index=True)
    intent_reference = models.CharField(max_length=40, blank=True, default="", db_index=True)
    component = models.CharField(max_length=20, blank=True, default="")
    payee_code = models.CharField(max_length=40, blank=True, default="")

    payload = models.JSONField(default=dict, blank=True)
    outcome = models.CharField(max_length=10, choices=Outcome.choices, default=Outcome.APPLIED)
    note = models.TextField(blank=True, default="")
    affected_holds = models.PositiveIntegerField(default=0)

    occurred_at = models.DateTimeField(default=timezone.now)
    received_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = "payments"
        ordering = ["-received_at"]
        verbose_name = "Evenement metier consomme"
        verbose_name_plural = "Evenements metier consommes"
        indexes = [
            models.Index(fields=["kind", "received_at"]),
            models.Index(fields=["outcome"]),
        ]

    def __str__(self):
        return f"{self.kind} — {self.event_id} ({self.outcome})"

    def delete(self, *args, **kwargs):
        raise ValidationError(
            "Un evenement consomme ne se supprime jamais : c'est la piste "
            "d'audit du declenchement des liberations."
        )