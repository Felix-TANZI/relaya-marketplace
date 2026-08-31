# backend/apps/payments/settlements/models.py
# Reglements par cycle contractuel.
#
# ─────────────────────────────────────────────────────────────────────────────
# IL N'EXISTE NI SOLDE, NI BOUTON DE RETRAIT (principe P10)
#
# Seuls existent un MONTANT DU et des REGLEMENTS a date fixe. Cette
# modelisation n'est pas cosmetique : un partenaire qui peut reclamer son
# argent quand il veut fait de BelivaY un detenteur de monnaie electronique,
# avec le regime reglementaire correspondant.
#
# Reserve explicite : ce choix ne suffit pas a lui seul a garantir la
# qualification juridique. Le regulateur examine le flux de fonds reel, pas
# le nom des tables (voir Jalon B).
# ─────────────────────────────────────────────────────────────────────────────
#
# CHAINE :  EscrowHold liberes  ->  SettlementBatch  ->  PayoutRequest  ->  PSP
#           + Adjustment imputes         (1 seul appel /withdraw/ par lot)

import uuid

from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone

from apps.payments.domain.enums import (
    AdjustmentCategory,
    AdjustmentDirection,
    PayoutStatus,
    SettlementBatchStatus,
)
from apps.payments.domain.state_machines import PAYOUT, SETTLEMENT_BATCH
from apps.payments.escrow.models import EscrowHold
from apps.payments.payees.models import PayeeAccount


# ─────────────────────────────────────────────────────────────────────────────
# AJUSTEMENTS
# ─────────────────────────────────────────────────────────────────────────────

class Adjustment(models.Model):
    """
    Penalite, compensation, correction ou refacturation.

    Sans ce modele, ces mouvements finiraient bricoles en modifiant des
    montants de sequestre — c'est-a-dire en falsifiant la comptabilite.

    S'applique a TOUS les types de beneficiaires, y compris l'acheteur :
    le cout de retour d'un colis non retire s'impute sur son remboursement.
    """

    class Direction(models.TextChoices):
        DEBIT = AdjustmentDirection.DEBIT.value, "BelivaY doit au partenaire"
        CREDIT = AdjustmentDirection.CREDIT.value, "Le partenaire doit a BelivaY"

    class Category(models.TextChoices):
        PENALTY = AdjustmentCategory.PENALTY.value, "Penalite"
        COMPENSATION = AdjustmentCategory.COMPENSATION.value, "Compensation"
        CORRECTION = AdjustmentCategory.CORRECTION.value, "Correction"
        REBILLING = AdjustmentCategory.REBILLING.value, "Refacturation"
        GOODWILL = AdjustmentCategory.GOODWILL.value, "Geste commercial"
        BONUS = AdjustmentCategory.BONUS.value, "Bonus"
        TRUST_SCORE = AdjustmentCategory.TRUST_SCORE.value, "Trust Score"
        RETURN_COST = AdjustmentCategory.RETURN_COST.value, "Cout de retour"

    class Status(models.TextChoices):
        PENDING_APPROVAL = "PENDING_APPROVAL", "En attente d'approbation"
        APPROVED = "APPROVED", "Approuve"
        APPLIED = "APPLIED", "Impute"
        CANCELLED = "CANCELLED", "Annule"
        DISPUTED = "DISPUTED", "Conteste"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reference = models.CharField(max_length=48, unique=True, editable=False)
    payee = models.ForeignKey(
        PayeeAccount, on_delete=models.PROTECT, related_name="adjustments",
    )
    direction = models.CharField(max_length=8, choices=Direction.choices)
    category = models.CharField(max_length=20, choices=Category.choices)
    amount_xaf = models.PositiveBigIntegerField(validators=[MinValueValidator(1)])
    remaining_xaf = models.PositiveBigIntegerField(
        default=0,
        help_text="Reste a imputer. Une creance importante s'etale sur "
                  "plusieurs reglements plutot que de vider un seul.",
    )

    reason = models.TextField(verbose_name="Motif", help_text="Obligatoire.")
    evidence_url = models.URLField(blank=True, default="")
    source_order_id = models.PositiveIntegerField(null=True, blank=True)
    source_event = models.CharField(max_length=120, blank=True, default="")

    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING_APPROVAL,
    )
    max_offset_percent = models.DecimalField(
        max_digits=5, decimal_places=2, null=True, blank=True,
        verbose_name="Retenue maximale (%)",
        help_text="Surcharge la politique. Vide = valeur de la PayoutPolicy.",
    )

    #: Regle contractuelle qui a autorise cet ajustement, s'il est
    #: automatique. Un ajustement contractuel n'a PAS d'approbateur humain :
    #: la decision a ete prise a la signature du contrat, pas colis par
    #: colis. La contrainte maker-checker reste satisfaite puisque
    #: `approved_by` demeure nul.
    source_contract = models.CharField(
        max_length=120, blank=True, default="", db_index=True,
        verbose_name="Contrat autorisant",
        help_text=(
            "Cle de la regle de remuneration qui a genere cet ajustement. "
            "Vide pour un ajustement decide par un operateur."
        ),
    )

    created_by = models.ForeignKey(
        User, on_delete=models.PROTECT, related_name="adjustments_created",
    )
    approved_by = models.ForeignKey(
        User, on_delete=models.PROTECT, null=True, blank=True,
        related_name="adjustments_approved",
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "payments"
        ordering = ["-created_at"]
        verbose_name = "Ajustement"
        verbose_name_plural = "Ajustements"
        constraints = [
            models.CheckConstraint(
                condition=(
                    models.Q(approved_by__isnull=True)
                    | ~models.Q(approved_by=models.F("created_by"))
                ),
                name="adjustment_maker_is_not_checker",
            ),
            models.CheckConstraint(
                condition=models.Q(remaining_xaf__lte=models.F("amount_xaf")),
                name="adjustment_remaining_not_above_amount",
            ),
        ]
        indexes = [
            models.Index(fields=["payee", "status", "direction"]),
        ]

    def __str__(self):
        signe = "+" if self.direction == self.Direction.DEBIT else "-"
        return f"{self.reference} {signe}{self.amount_xaf} XAF ({self.category})"

    def save(self, *args, **kwargs):
        if not self.reference:
            annee = timezone.now().year
            compteur = Adjustment.objects.filter(created_at__year=annee).count() + 1
            self.reference = f"BLV-ADJ-{annee}-{compteur:06d}"
        if not self.pk and not self.remaining_xaf:
            self.remaining_xaf = self.amount_xaf
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError(
            f"L'ajustement {self.reference} ne se supprime pas : il est "
            "rattache a des ecritures comptables. L'annuler."
        )

    @property
    def is_debt(self) -> bool:
        """Le partenaire doit de l'argent a BelivaY."""
        return self.direction == self.Direction.CREDIT

    @property
    def is_offsettable(self) -> bool:
        return (
            self.is_debt
            and self.status in (self.Status.APPROVED, self.Status.APPLIED)
            and self.remaining_xaf > 0
        )


# ─────────────────────────────────────────────────────────────────────────────
# LOT DE REGLEMENT
# ─────────────────────────────────────────────────────────────────────────────

class SettlementBatch(models.Model):
    """
    Agregation des sequestres liberes d'un beneficiaire sur une periode.

    Un vendeur avec 40 commandes liberees dans la semaine genere UN versement,
    pas 40. Chaque appel /withdraw/ a un cout et un risque d'echec ; chacun
    ajoute une ligne de reconciliation.

    Le relevé partenaire reste DETAILLE ligne par ligne : l'agregation est
    financiere, pas informationnelle.
    """

    class Status(models.TextChoices):
        DRAFT = SettlementBatchStatus.DRAFT.value, "Brouillon"
        CONFIRMED = SettlementBatchStatus.CONFIRMED.value, "Confirme"
        PENDING_APPROVAL = SettlementBatchStatus.PENDING_APPROVAL.value, "En attente d'approbation"
        APPROVED = SettlementBatchStatus.APPROVED.value, "Approuve"
        PROCESSING = SettlementBatchStatus.PROCESSING.value, "En cours de versement"
        PAID = SettlementBatchStatus.PAID.value, "Verse"
        FAILED = SettlementBatchStatus.FAILED.value, "Echoue"
        PARTIAL = SettlementBatchStatus.PARTIAL.value, "Partiel"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reference = models.CharField(max_length=48, unique=True, editable=False)
    payee = models.ForeignKey(
        PayeeAccount, on_delete=models.PROTECT, related_name="settlement_batches",
    )
    cycle_key = models.SlugField(max_length=120, blank=True, default="")

    period_start = models.DateTimeField()
    period_end = models.DateTimeField()

    gross_amount_xaf = models.PositiveBigIntegerField(
        default=0, help_text="Somme des sequestres liberes sur la periode.",
    )
    adjustments_xaf = models.BigIntegerField(
        default=0, help_text="Signe : negatif si une creance a ete retenue.",
    )
    net_amount_xaf = models.PositiveBigIntegerField(default=0)
    currency = models.CharField(max_length=3, default="XAF")

    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)

    is_exceptional = models.BooleanField(
        default=False,
        verbose_name="Reglement hors cycle",
        help_text=(
            "Derogation au cycle contractuel. Surveille : si la part "
            "d'exceptionnel devient importante, le modele s'apparente de "
            "fait a un portefeuille."
        ),
    )
    exceptional_reason = models.TextField(blank=True, default="")

    covered_holds = models.ManyToManyField(
        EscrowHold, related_name="settlement_batches", blank=True,
    )
    applied_adjustments = models.ManyToManyField(
        Adjustment, related_name="settlement_batches", blank=True,
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "payments"
        ordering = ["-created_at"]
        verbose_name = "Lot de reglement"
        verbose_name_plural = "Lots de reglement"
        indexes = [
            models.Index(fields=["payee", "status"]),
            models.Index(fields=["status", "period_end"]),
            models.Index(fields=["is_exceptional", "created_at"]),
        ]

    def __str__(self):
        return f"{self.reference} — {self.payee.payee_code} {self.net_amount_xaf} XAF"

    def save(self, *args, **kwargs):
        if not self.reference:
            moment = self.period_end or timezone.now()
            annee, semaine, _ = moment.isocalendar()
            compteur = SettlementBatch.objects.filter(created_at__year=annee).count() + 1
            marque = "X" if self.is_exceptional else "W"
            self.reference = f"BLV-STL-{annee}-{marque}{semaine:02d}-{compteur:06d}"
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError(
            f"Le lot {self.reference} ne se supprime pas : il constitue le "
            "justificatif de reglement du partenaire."
        )

    def transition_to(self, target: str, *, save: bool = True) -> "SettlementBatch":
        SETTLEMENT_BATCH.assert_transition(
            SettlementBatchStatus(self.status), SettlementBatchStatus(target)
        )
        self.status = target
        if save:
            self.save(update_fields=["status", "updated_at"])
        return self


# ─────────────────────────────────────────────────────────────────────────────
# VERSEMENT
# ─────────────────────────────────────────────────────────────────────────────

class PayoutRequest(models.Model):
    """
    Demande de versement vers le prestataire.

    DEUX REFERENCES, et ce n'est pas une redondance :
      - `reference`                 lisible, pour l'humain et l'audit
      - `provider_external_reference` UUID4, EXIGE par CamPay sur /withdraw/
        (« A valid UUID4. A request with a duplicate UUID will be rejected »)

    L'etat UNKNOWN est le coeur de la surete : sur un timeout, on ne sait pas
    si l'argent est parti. Aucune transition UNKNOWN -> PROCESSING n'existe :
    retenter aveuglement peut doubler un versement reel.
    """

    class Status(models.TextChoices):
        DRAFT = PayoutStatus.DRAFT.value, "Brouillon"
        PENDING_APPROVAL = PayoutStatus.PENDING_APPROVAL.value, "En attente d'approbation"
        APPROVED = PayoutStatus.APPROVED.value, "Approuve"
        PROCESSING = PayoutStatus.PROCESSING.value, "En cours"
        PAID = PayoutStatus.PAID.value, "Verse"
        FAILED = PayoutStatus.FAILED.value, "Echoue"
        UNKNOWN = PayoutStatus.UNKNOWN.value, "Issue INCONNUE"
        REJECTED = PayoutStatus.REJECTED.value, "Rejete"
        CANCELLED = PayoutStatus.CANCELLED.value, "Annule"
        REVERSED = PayoutStatus.REVERSED.value, "Contre-passe"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reference = models.CharField(max_length=48, unique=True, editable=False)
    provider_external_reference = models.CharField(
        max_length=64, unique=True, editable=False,
        help_text="UUID4 exige par CamPay. Jamais reutilise.",
    )

    batch = models.OneToOneField(
        SettlementBatch, on_delete=models.PROTECT, related_name="payout",
        null=True, blank=True,
    )
    payee = models.ForeignKey(
        PayeeAccount, on_delete=models.PROTECT, related_name="payout_requests",
    )

    amount_xaf = models.PositiveBigIntegerField(validators=[MinValueValidator(1)])
    psp_fee_xaf = models.PositiveBigIntegerField(
        default=0,
        help_text="Charge PLATEFORME. Jamais retenue au partenaire : "
                  "il recoit l'integralite de son net (referentiel §7.1).",
    )
    currency = models.CharField(max_length=3, default="XAF")

    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    required_approvals = models.PositiveSmallIntegerField(default=1)

    provider_code = models.CharField(max_length=30, blank=True, default="")
    provider_reference = models.CharField(max_length=120, blank=True, default="", db_index=True)
    provider_status_raw = models.CharField(max_length=60, blank=True, default="")
    error_code = models.CharField(max_length=30, blank=True, default="")
    error_message = models.TextField(blank=True, default="")
    response_payload = models.JSONField(default=dict, blank=True)

    payee_msisdn_masked = models.CharField(max_length=32, blank=True, default="")
    payee_operator = models.CharField(max_length=10, blank=True, default="")

    requested_by = models.ForeignKey(
        User, on_delete=models.PROTECT, related_name="payouts_requested",
    )
    requested_at = models.DateTimeField(auto_now_add=True)
    executed_at = models.DateTimeField(null=True, blank=True)
    settled_at = models.DateTimeField(null=True, blank=True)
    justification = models.TextField(blank=True, default="")

    class Meta:
        app_label = "payments"
        ordering = ["-requested_at"]
        verbose_name = "Demande de versement"
        verbose_name_plural = "Demandes de versement"
        indexes = [
            models.Index(fields=["status", "requested_at"]),
            models.Index(fields=["payee", "status"]),
        ]

    def __str__(self):
        return f"{self.reference} — {self.amount_xaf} XAF ({self.status})"

    def save(self, *args, **kwargs):
        if not self.reference:
            annee = timezone.now().year
            compteur = PayoutRequest.objects.filter(requested_at__year=annee).count() + 1
            self.reference = f"BLV-OUT-{annee}-{compteur:06d}"
        if not self.provider_external_reference:
            self.provider_external_reference = str(uuid.uuid4())
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError(
            f"Le versement {self.reference} ne se supprime pas : il deplace "
            "de l'argent reel."
        )

    def transition_to(self, target: str, *, save: bool = True) -> "PayoutRequest":
        PAYOUT.assert_transition(PayoutStatus(self.status), PayoutStatus(target))
        self.status = target
        if save:
            self.save(update_fields=["status"])
        return self

    @property
    def approvals_count(self) -> int:
        return self.approvals.count()

    @property
    def is_fully_approved(self) -> bool:
        return self.approvals_count >= self.required_approvals


class PayoutApproval(models.Model):
    """
    Une approbation. Append-only.

    Le demandeur ne peut jamais approuver sa propre demande, et un meme
    approbateur ne compte qu'une fois. Contraintes appliquees EN BASE.
    """

    payout = models.ForeignKey(
        PayoutRequest, on_delete=models.PROTECT, related_name="approvals",
    )
    approved_by = models.ForeignKey(
        User, on_delete=models.PROTECT, related_name="payout_approvals",
    )
    comment = models.TextField(blank=True, default="")
    approved_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = "payments"
        ordering = ["approved_at"]
        verbose_name = "Approbation de versement"
        verbose_name_plural = "Approbations de versement"
        constraints = [
            models.UniqueConstraint(
                fields=["payout", "approved_by"], name="unique_payout_approval",
            ),
        ]

    def __str__(self):
        return f"{self.payout.reference} approuve par {self.approved_by}"

    def delete(self, *args, **kwargs):
        raise ValidationError("Une approbation ne se supprime pas.")


# ─────────────────────────────────────────────────────────────────────────────
# REMBOURSEMENT
# ─────────────────────────────────────────────────────────────────────────────

class Refund(models.Model):
    """
    Remboursement vers l'acheteur.

    CamPay n'expose AUCUN endpoint de remboursement : un remboursement est
    donc techniquement un /withdraw/ vers le numero du PAYEUR.

    Il emprunte exactement le meme chemin qu'un versement — un seul code de
    sortie de fonds, donc une seule surface a securiser.

    Le retour se fait vers la SOURCE DE PAIEMENT D'ORIGINE. Rembourser
    ailleurs cree un transfert de valeur non consenti et constitue, en
    matiere de lutte anti-blanchiment, un schema classique.
    """

    class Reason(models.TextChoices):
        DISPUTE = "DISPUTE", "Litige"
        CANCELLATION = "CANCELLATION", "Annulation"
        ADMIN = "ADMIN", "Decision administrative"
        RECONCILIATION = "RECONCILIATION", "Ecart de reconciliation"
        DUPLICATE = "DUPLICATE", "Double encaissement"

    class Status(models.TextChoices):
        PENDING_APPROVAL = "PENDING_APPROVAL", "En attente d'approbation"
        APPROVED = "APPROVED", "Approuve"
        PROCESSING = "PROCESSING", "En cours"
        PAID = "PAID", "Rembourse"
        FAILED = "FAILED", "Echoue"
        UNKNOWN = "UNKNOWN", "Issue INCONNUE"
        REJECTED = "REJECTED", "Rejete"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reference = models.CharField(max_length=48, unique=True, editable=False)
    intent = models.ForeignKey(
        "payments.PaymentIntent", on_delete=models.PROTECT, related_name="refunds",
    )
    amount_xaf = models.PositiveBigIntegerField(validators=[MinValueValidator(1)])
    reason = models.CharField(max_length=20, choices=Reason.choices)
    detail = models.TextField(blank=True, default="")

    source_holds = models.ManyToManyField(
        EscrowHold, related_name="refunds", blank=True,
    )
    payout = models.OneToOneField(
        PayoutRequest, on_delete=models.PROTECT, null=True, blank=True,
        related_name="refund",
    )

    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING_APPROVAL,
    )
    requested_by = models.ForeignKey(
        User, on_delete=models.PROTECT, related_name="refunds_requested",
    )
    approved_by = models.ForeignKey(
        User, on_delete=models.PROTECT, null=True, blank=True,
        related_name="refunds_approved",
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = "payments"
        ordering = ["-created_at"]
        verbose_name = "Remboursement"
        verbose_name_plural = "Remboursements"
        constraints = [
            models.CheckConstraint(
                condition=(
                    models.Q(approved_by__isnull=True)
                    | ~models.Q(approved_by=models.F("requested_by"))
                ),
                name="refund_maker_is_not_checker",
            ),
        ]

    def __str__(self):
        return f"{self.reference} — {self.amount_xaf} XAF ({self.status})"

    def save(self, *args, **kwargs):
        if not self.reference:
            annee = timezone.now().year
            compteur = Refund.objects.filter(created_at__year=annee).count() + 1
            self.reference = f"BLV-RFD-{annee}-{compteur:06d}"
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError("Un remboursement ne se supprime pas.")