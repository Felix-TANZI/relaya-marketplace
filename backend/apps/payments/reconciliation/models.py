# backend/apps/payments/reconciliation/models.py
# Reconciliation : detection des ecarts entre BelivaY et le prestataire.
#
# ─────────────────────────────────────────────────────────────────────────────
# TROIS NIVEAUX, TROIS QUESTIONS DIFFERENTES
#
#   N1 — SOLVABILITE       Detenons-nous au moins ce que nous devons ?
#   N2 — COHERENCE         Le registre dit-il la meme chose que les sequestres ?
#   N3 — TRANSACTIONNEL    Chaque transaction du prestataire a-t-elle sa
#                          contrepartie chez nous, et reciproquement ?
#
# Le N1 protege l'argent, le N2 detecte les bugs de code, le N3 detecte les
# transactions fantomes — celles qui n'existent que d'un seul cote.
# ─────────────────────────────────────────────────────────────────────────────
#
# UN ECART N'EST JAMAIS CORRIGE AUTOMATIQUEMENT. Il est constate, qualifie,
# documente et soumis a une decision humaine. Corriger automatiquement un
# ecart mal compris, c'est deplacer de l'argent sur la base d'une hypothese.

import uuid

from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone


class ReconciliationRun(models.Model):
    """Une execution de reconciliation. Append-only."""

    class Level(models.TextChoices):
        SOLVENCY = "SOLVENCY", "N1 — Solvabilite"
        ESCROW = "ESCROW", "N2 — Coherence du sequestre"
        TRANSACTIONAL = "TRANSACTIONAL", "N3 — Rapprochement transactionnel"
        UNKNOWN_PAYOUTS = "UNKNOWN_PAYOUTS", "Resolution des versements inconnus"

    class Status(models.TextChoices):
        RUNNING = "RUNNING", "En cours"
        CLEAN = "CLEAN", "Aucun ecart"
        DISCREPANCIES = "DISCREPANCIES", "Ecarts detectes"
        ERROR = "ERROR", "Erreur"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reference = models.CharField(max_length=48, unique=True, editable=False)
    level = models.CharField(max_length=20, choices=Level.choices)
    status = models.CharField(max_length=15, choices=Status.choices,
                              default=Status.RUNNING)

    period_start = models.DateTimeField(null=True, blank=True)
    period_end = models.DateTimeField(null=True, blank=True)

    checked_count = models.PositiveIntegerField(default=0)
    discrepancy_count = models.PositiveIntegerField(default=0)
    total_gap_xaf = models.BigIntegerField(default=0)

    summary = models.JSONField(default=dict, blank=True)
    error = models.TextField(blank=True, default="")

    started_at = models.DateTimeField(auto_now_add=True)
    finished_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        app_label = "payments"
        ordering = ["-started_at"]
        verbose_name = "Execution de reconciliation"
        verbose_name_plural = "Executions de reconciliation"
        indexes = [
            models.Index(fields=["level", "-started_at"]),
            models.Index(fields=["status", "-started_at"]),
        ]

    def __str__(self):
        return f"{self.reference} — {self.level} ({self.status})"

    def save(self, *args, **kwargs):
        if not self.reference:
            annee = timezone.now().year
            compteur = ReconciliationRun.objects.filter(
                started_at__year=annee).count() + 1
            self.reference = f"BLV-REC-{annee}-{compteur:06d}"
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError(
            "Une execution de reconciliation ne se supprime pas : c'est une "
            "piece de la piste d'audit financiere."
        )

    def finish(self, *, summary=None, error: str = "") -> "ReconciliationRun":
        ecarts = self.discrepancies.count()
        manque = sum(abs(d.gap_xaf) for d in self.discrepancies.all())
        statut = (
            self.Status.ERROR if error
            else (self.Status.DISCREPANCIES if ecarts else self.Status.CLEAN)
        )
        ReconciliationRun.objects.filter(pk=self.pk).update(
            status=statut, discrepancy_count=ecarts, total_gap_xaf=manque,
            summary=summary or {}, error=error[:2000],
            finished_at=timezone.now(),
        )
        self.refresh_from_db()
        return self


class Discrepancy(models.Model):
    """
    Un ecart constate. JAMAIS corrige automatiquement.

    Chaque ecart porte une ACTION SUGGEREE : le but n'est pas d'alerter,
    c'est de permettre d'agir. Une alerte sans piste d'action finit ignoree.
    """

    class Kind(models.TextChoices):
        INSOLVENCY = "INSOLVENCY", "Insolvabilite"
        OPERATOR_LIQUIDITY = "OPERATOR_LIQUIDITY", "Liquidite par porteur"
        ESCROW_MISMATCH = "ESCROW_MISMATCH", "Ecart d'equation de sequestre"
        MISSING_LOCALLY = "MISSING_LOCALLY", "Transaction absente chez BelivaY"
        MISSING_AT_PROVIDER = "MISSING_AT_PROVIDER", "Absente chez le prestataire"
        AMOUNT_MISMATCH = "AMOUNT_MISMATCH", "Montant divergent"
        STATUS_MISMATCH = "STATUS_MISMATCH", "Statut divergent"
        FEE_MISMATCH = "FEE_MISMATCH", "Frais divergents"
        UNKNOWN_PAYOUT_RESOLVED = "UNKNOWN_PAYOUT_RESOLVED", "Versement inconnu resolu"
        UNKNOWN_PAYOUT_PENDING = "UNKNOWN_PAYOUT_PENDING", "Versement inconnu non resolu"

    class Severity(models.TextChoices):
        CRITICAL = "CRITICAL", "Critique — gel requis"
        HIGH = "HIGH", "Elevee"
        MEDIUM = "MEDIUM", "Moyenne"
        LOW = "LOW", "Faible"
        INFO = "INFO", "Information"

    class Resolution(models.TextChoices):
        OPEN = "OPEN", "Ouvert"
        INVESTIGATING = "INVESTIGATING", "En investigation"
        RESOLVED = "RESOLVED", "Resolu"
        ACCEPTED = "ACCEPTED", "Accepte (ecart connu)"
        FALSE_POSITIVE = "FALSE_POSITIVE", "Faux positif"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    run = models.ForeignKey(ReconciliationRun, on_delete=models.PROTECT,
                            related_name="discrepancies")
    kind = models.CharField(max_length=30, choices=Kind.choices)
    severity = models.CharField(max_length=10, choices=Severity.choices)

    subject_type = models.CharField(max_length=40, blank=True, default="")
    subject_ref = models.CharField(max_length=120, blank=True, default="",
                                   db_index=True)
    provider_reference = models.CharField(max_length=120, blank=True,
                                          default="", db_index=True)

    expected_xaf = models.BigIntegerField(default=0)
    observed_xaf = models.BigIntegerField(default=0)
    gap_xaf = models.BigIntegerField(default=0)

    detail = models.TextField(blank=True, default="")
    evidence = models.JSONField(default=dict, blank=True)
    suggested_action = models.TextField(blank=True, default="")

    resolution = models.CharField(max_length=15, choices=Resolution.choices,
                                  default=Resolution.OPEN)
    resolution_note = models.TextField(blank=True, default="")
    resolved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True,
                                    blank=True, related_name="+")
    resolved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = "payments"
        ordering = ["-created_at"]
        verbose_name = "Ecart de reconciliation"
        verbose_name_plural = "Ecarts de reconciliation"
        indexes = [
            models.Index(fields=["kind", "resolution"]),
            models.Index(fields=["severity", "resolution"]),
        ]

    def __str__(self):
        return f"{self.kind} — {self.gap_xaf} XAF ({self.resolution})"

    def delete(self, *args, **kwargs):
        raise ValidationError(
            "Un ecart constate ne se supprime pas. Le qualifier en faux "
            "positif si necessaire — la trace doit rester."
        )

    def resolve(self, *, resolution: str, note: str, user=None) -> "Discrepancy":
        if not note.strip():
            raise ValidationError("Une resolution exige une note explicative.")
        self.resolution = resolution
        self.resolution_note = note.strip()
        self.resolved_by = user
        self.resolved_at = timezone.now()
        self.save(update_fields=["resolution", "resolution_note",
                                 "resolved_by", "resolved_at"])
        return self