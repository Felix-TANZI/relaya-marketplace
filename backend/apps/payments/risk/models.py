# backend/apps/payments/risk/models.py
# Detection du risque et Trust Score partenaire.
#
# ─────────────────────────────────────────────────────────────────────────────
# LE PAYEUR TIERS N'EST PAS UN SUSPECT
#
# Au Cameroun, payer pour un proche est le cas NOMINAL du segment diaspora,
# principal moteur de marge. Un systeme qui bloque par defaut ce comportement
# detruit le segment le plus rentable pour prevenir une fraude marginale.
#
# Le signal reellement discriminant d'une mule financiere n'est pas « un
# tiers paie ». C'est un MEME NUMERO servant un nombre anormal de comptes
# distincts. L'empreinte posee au Lot 4 sert exactement a cela.
# ─────────────────────────────────────────────────────────────────────────────
#
# ON MARQUE, ON NE BLOQUE PAS. Le blocage automatique est desactive par
# defaut : un score eleve produit une ALERTE, pas un refus. Un faux positif
# coute un client ; le laisser passer coute une transaction.

import uuid

from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from apps.payments.payees.models import PayeeAccount


class RiskSignal(models.Model):
    """Un signal detecte. Append-only, jamais un verdict a lui seul."""

    class Kind(models.TextChoices):
        SHARED_MSISDN_PAYEE = "SHARED_MSISDN_PAYEE", "Numero partage entre beneficiaires"
        SHARED_MSISDN_BUYER = "SHARED_MSISDN_BUYER", "Numero payeur servant plusieurs acheteurs"
        VELOCITY = "VELOCITY", "Cadence anormale"
        FAILED_BURST = "FAILED_BURST", "Rafale d'echecs"
        AMOUNT_ANOMALY = "AMOUNT_ANOMALY", "Montant inhabituel"
        LARGE_AMOUNT = "LARGE_AMOUNT", "Montant eleve"
        NEW_THIRD_PARTY_PAYER = "NEW_THIRD_PARTY_PAYER", "Nouveau payeur tiers"
        RECENT_MOMO_CHANGE = "RECENT_MOMO_CHANGE", "Numero recemment modifie"
        KYC_INCOMPLETE = "KYC_INCOMPLETE", "KYC incomplet"

    class Severity(models.TextChoices):
        HIGH = "HIGH", "Elevee"
        MEDIUM = "MEDIUM", "Moyenne"
        LOW = "LOW", "Faible"
        INFO = "INFO", "Information"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    assessment = models.ForeignKey(
        "payments.RiskAssessment", on_delete=models.PROTECT,
        related_name="signals",
    )
    kind = models.CharField(max_length=30, choices=Kind.choices)
    severity = models.CharField(max_length=8, choices=Severity.choices)
    weight = models.PositiveSmallIntegerField(default=0)

    detail = models.TextField(blank=True, default="")
    evidence = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = "payments"
        ordering = ["-weight", "kind"]
        verbose_name = "Signal de risque"
        verbose_name_plural = "Signaux de risque"
        indexes = [models.Index(fields=["kind", "created_at"])]

    def __str__(self):
        return f"{self.kind} ({self.severity}, poids {self.weight})"

    def delete(self, *args, **kwargs):
        raise ValidationError("Un signal de risque ne se supprime pas.")


class RiskAssessment(models.Model):
    """
    Evaluation d'un objet financier. Append-only.

    Une evaluation est un CONSTAT horodate : elle n'est jamais recalculee
    a posteriori. Deux evaluations successives du meme objet coexistent et
    montrent l'evolution.
    """

    class Subject(models.TextChoices):
        PAYMENT_INTENT = "PAYMENT_INTENT", "Intention de paiement"
        PAYOUT_REQUEST = "PAYOUT_REQUEST", "Demande de versement"
        PAYEE = "PAYEE", "Beneficiaire"

    class Decision(models.TextChoices):
        ALLOW = "ALLOW", "Autorise"
        REVIEW = "REVIEW", "Revue manuelle recommandee"
        BLOCK = "BLOCK", "Bloque"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    subject_type = models.CharField(max_length=20, choices=Subject.choices)
    subject_ref = models.CharField(max_length=120, db_index=True)

    score = models.PositiveSmallIntegerField(default=0)
    decision = models.CharField(
        max_length=8, choices=Decision.choices, default=Decision.ALLOW,
    )
    policy_key = models.SlugField(max_length=120, blank=True, default="")
    policy_snapshot = models.JSONField(
        default=dict, blank=True,
        help_text="Seuils appliques, figes au moment de l'evaluation.",
    )
    note = models.TextField(blank=True, default="")

    #: Une decision humaine prime toujours sur le score.
    overridden_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="+",
    )
    override_reason = models.TextField(blank=True, default="")
    overridden_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = "payments"
        ordering = ["-created_at"]
        verbose_name = "Evaluation de risque"
        verbose_name_plural = "Evaluations de risque"
        indexes = [
            models.Index(fields=["subject_type", "subject_ref"]),
            models.Index(fields=["decision", "-created_at"]),
        ]

    def __str__(self):
        return f"{self.subject_type} {self.subject_ref} — {self.score} ({self.decision})"

    def delete(self, *args, **kwargs):
        raise ValidationError(
            "Une evaluation de risque ne se supprime pas : c'est une piece "
            "de la piste d'audit anti-fraude."
        )

    def override(self, *, decision: str, reason: str, user) -> "RiskAssessment":
        """
        Une decision humaine prime sur le score.

        Elle est tracee : qui, quand, pourquoi. Un operateur qui laisse
        passer une transaction a haut score engage sa responsabilite, et
        l'historique le montre.
        """
        if not reason.strip():
            raise ValidationError("Une decision manuelle exige une justification.")
        self.decision = decision
        self.override_reason = reason.strip()
        self.overridden_by = user
        self.overridden_at = timezone.now()
        self.save(update_fields=[
            "decision", "override_reason", "overridden_by", "overridden_at",
        ])
        return self


class TrustScore(models.Model):
    """
    Score de confiance d'un partenaire. Une ligne par calcul, append-only.

    L'historique compte autant que la valeur : un partenaire qui descend de
    80 a 55 en trois semaines pose un probleme different d'un partenaire
    stable a 55.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    payee = models.ForeignKey(
        PayeeAccount, on_delete=models.PROTECT, related_name="trust_scores",
    )
    score = models.PositiveSmallIntegerField()
    previous_score = models.PositiveSmallIntegerField(null=True, blank=True)

    orders_count = models.PositiveIntegerField(default=0)
    disputes_count = models.PositiveIntegerField(default=0)
    late_count = models.PositiveIntegerField(default=0)
    cancelled_count = models.PositiveIntegerField(default=0)

    breakdown = models.JSONField(default=dict, blank=True)
    policy_key = models.SlugField(max_length=120, blank=True, default="")
    window_days = models.PositiveSmallIntegerField(default=90)
    computed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = "payments"
        ordering = ["-computed_at"]
        verbose_name = "Score de confiance"
        verbose_name_plural = "Scores de confiance"
        indexes = [models.Index(fields=["payee", "-computed_at"])]

    def __str__(self):
        return f"{self.payee.payee_code} — {self.score}/100"

    def delete(self, *args, **kwargs):
        raise ValidationError(
            "Un score de confiance ne se supprime pas : son historique est "
            "la seule facon de distinguer une degradation d'un etat stable."
        )

    @property
    def delta(self) -> int:
        if self.previous_score is None:
            return 0
        return self.score - self.previous_score

    @classmethod
    def latest_for(cls, payee: PayeeAccount) -> "TrustScore | None":
        return cls.objects.filter(payee=payee).order_by("-computed_at").first()