# backend/apps/payments/intents/models.py
# Intention de paiement et tentatives d'encaissement.
#
# UNE INTENTION, N COMMANDES
#   Un panier eclate en plusieurs commandes mono-vendeur, mais l'acheteur
#   ne paie qu'UNE fois. PaymentIntent est cette unite de paiement.
#
# ACHETEUR != PAYEUR
#   Au Cameroun, payer pour un proche est le cas NOMINAL du segment diaspora.
#   Ce n'est pas un cas marginal a traiter comme suspect. On modelise donc
#   explicitement la relation, et le remboursement retourne TOUJOURS vers la
#   source de paiement d'origine.
#
# IDEMPOTENCE
#   `idempotency_key` est unique : un double clic ou un rejeu reseau ne cree
#   jamais deux intentions. Cote tentative, `external_reference` est unique :
#   le prestataire ne peut pas encaisser deux fois la meme demande.

import uuid

from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone

from apps.payments.domain.enums import PayerRelationship, PaymentIntentStatus
from apps.payments.domain.state_machines import PAYMENT_INTENT
from apps.payments.payees import crypto


class PaymentIntent(models.Model):
    """Intention de paiement d'un acheteur — une par panier valide."""

    class Status(models.TextChoices):
        DRAFT = PaymentIntentStatus.DRAFT.value, "Brouillon"
        REQUIRES_ACTION = PaymentIntentStatus.REQUIRES_ACTION.value, "Action acheteur attendue"
        PROCESSING = PaymentIntentStatus.PROCESSING.value, "En cours de traitement"
        SUCCEEDED = PaymentIntentStatus.SUCCEEDED.value, "Encaisse"
        FAILED = PaymentIntentStatus.FAILED.value, "Echoue"
        EXPIRED = PaymentIntentStatus.EXPIRED.value, "Expire"
        CANCELLED = PaymentIntentStatus.CANCELLED.value, "Annule"
        PARTIALLY_REFUNDED = PaymentIntentStatus.PARTIALLY_REFUNDED.value, "Partiellement rembourse"
        REFUNDED = PaymentIntentStatus.REFUNDED.value, "Rembourse"

    class Relationship(models.TextChoices):
        SELF = PayerRelationship.SELF.value, "L'acheteur paie lui-meme"
        THIRD_PARTY = PayerRelationship.THIRD_PARTY.value, "Un tiers paie"

    class RefundTarget(models.TextChoices):
        ORIGINAL_SOURCE = "ORIGINAL_SOURCE", "Source de paiement d'origine"
        BUYER_ACCOUNT = "BUYER_ACCOUNT", "Compte de l'acheteur (derogation)"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reference = models.CharField(max_length=40, unique=True, editable=False)
    idempotency_key = models.CharField(
        max_length=120, unique=True,
        verbose_name="Cle d'idempotence",
        help_text="Fournie par le client. Empeche le double encaissement.",
    )

    buyer = models.ForeignKey(
        User, on_delete=models.PROTECT, related_name="payment_intents",
    )

    # ── Payeur ───────────────────────────────────────────────────────────────
    payer_relationship = models.CharField(
        max_length=12, choices=Relationship.choices, default=Relationship.SELF,
    )
    payer_msisdn_enc = models.BinaryField(null=True, blank=True, editable=False)
    payer_msisdn_masked = models.CharField(max_length=32, blank=True, default="")
    payer_msisdn_fingerprint = models.CharField(
        max_length=64, blank=True, default="", db_index=True, editable=False,
        help_text="Detecte un meme numero payant pour un nombre anormal de comptes.",
    )
    payer_operator = models.CharField(max_length=10, blank=True, default="")
    payer_first_seen_at = models.DateTimeField(
        null=True, blank=True,
        help_text="Premiere utilisation de ce numero sur ce compte acheteur.",
    )
    refund_target = models.CharField(
        max_length=20, choices=RefundTarget.choices,
        default=RefundTarget.ORIGINAL_SOURCE,
        help_text="Rembourser ailleurs que vers la source d'origine cree un "
                  "transfert de valeur non consenti. Derogation a justifier.",
    )

    # ── Montants ─────────────────────────────────────────────────────────────
    amount_xaf = models.PositiveBigIntegerField(validators=[MinValueValidator(1)])
    amount_captured_xaf = models.PositiveBigIntegerField(default=0)
    amount_refunded_xaf = models.PositiveBigIntegerField(default=0)
    currency = models.CharField(max_length=3, default="XAF")

    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.DRAFT,
    )
    provider_code = models.CharField(max_length=30, blank=True, default="")

    # ── Instantanes figes (principe P3) ──────────────────────────────────────
    config_snapshot = models.JSONField(
        default=dict, blank=True,
        help_text="Regles resolues au moment de la creation. Une modification "
                  "ulterieure en administration n'affecte JAMAIS cette intention.",
    )
    distribution_plan = models.JSONField(
        default=dict, blank=True,
        help_text="Plan de repartition fige. Materialise en sequestres au Lot 7.",
    )
    resolution_trace = models.JSONField(
        default=dict, blank=True,
        help_text="Quelle regle a gagne, pourquoi les autres ont ete ecartees.",
    )

    risk_score = models.PositiveSmallIntegerField(default=0)
    expires_at = models.DateTimeField(null=True, blank=True)
    confirmed_at = models.DateTimeField(null=True, blank=True)
    failed_at = models.DateTimeField(null=True, blank=True)
    failure_reason = models.TextField(blank=True, default="")

    correlation_id = models.CharField(max_length=64, blank=True, default="", db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "payments"
        ordering = ["-created_at"]
        verbose_name = "Intention de paiement"
        verbose_name_plural = "Intentions de paiement"
        indexes = [
            models.Index(fields=["status", "created_at"]),
            models.Index(fields=["buyer", "status"]),
        ]

    def __str__(self):
        return f"{self.reference} — {self.amount_xaf} XAF ({self.status})"

    def save(self, *args, **kwargs):
        if not self.reference:
            annee = timezone.now().year
            compteur = PaymentIntent.objects.filter(created_at__year=annee).count() + 1
            self.reference = f"BLV-PAY-{annee}-{compteur:07d}"
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError(
            f"L'intention {self.reference} ne peut pas etre supprimee : "
            "des ecritures comptables et des tentatives y font reference."
        )

    # ── Payeur ───────────────────────────────────────────────────────────────

    @property
    def payer_msisdn(self) -> str:
        """Numero du payeur en clair. Uniquement pour emettre la demande."""
        if not self.payer_msisdn_enc:
            return ""
        return crypto.decrypt(self.payer_msisdn_enc)

    def set_payer(self, msisdn: str, operator: str) -> None:
        numero = (msisdn or "").strip().replace(" ", "")
        if not numero:
            raise ValidationError("Numero du payeur vide.")
        self.payer_msisdn_enc = crypto.encrypt(numero)
        self.payer_msisdn_masked = crypto.mask(numero)
        self.payer_msisdn_fingerprint = crypto.fingerprint(numero)
        self.payer_operator = operator

    # ── Etats ────────────────────────────────────────────────────────────────

    def transition_to(self, target: str, *, save: bool = True) -> "PaymentIntent":
        """
        Change d'etat en passant par la machine du domaine.

        Une transition non declaree leve IllegalTransition. Il n'existe aucun
        chemin implicite : un etat financier qui glisse sans declaration est
        un bug qui deplace de l'argent.
        """
        PAYMENT_INTENT.assert_transition(
            PaymentIntentStatus(self.status), PaymentIntentStatus(target)
        )
        self.status = target
        if save:
            self.save(update_fields=["status", "updated_at"])
        return self

    @property
    def is_final(self) -> bool:
        return PAYMENT_INTENT.is_terminal(PaymentIntentStatus(self.status))

    @property
    def is_expired(self) -> bool:
        return bool(self.expires_at and timezone.now() >= self.expires_at)

    @property
    def refundable_xaf(self) -> int:
        return max(0, self.amount_captured_xaf - self.amount_refunded_xaf)


class PaymentAttempt(models.Model):
    """
    Une tentative d'encaissement aupres du prestataire.

    Une intention peut en compter plusieurs : l'acheteur retente avec un
    autre numero, ou le premier essai expire. Chaque tentative porte sa
    propre cle d'idempotence envoyee au prestataire.
    """

    class Status(models.TextChoices):
        INITIATED = "INITIATED", "Emise"
        PENDING = "PENDING", "En attente de confirmation"
        SUCCESSFUL = "SUCCESSFUL", "Reussie"
        FAILED = "FAILED", "Echouee"
        TIMEOUT = "TIMEOUT", "Delai depasse"

    #: Etats ouverts — une tentative dans cet etat est reutilisable.
    OPEN_STATUSES = (Status.INITIATED, Status.PENDING)

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    intent = models.ForeignKey(
        PaymentIntent, on_delete=models.PROTECT, related_name="attempts",
    )
    external_reference = models.CharField(
        max_length=80, unique=True, editable=False,
        verbose_name="Reference externe",
        help_text="NOTRE cle d'idempotence, envoyee au prestataire.",
    )
    provider_code = models.CharField(max_length=30)
    provider_reference = models.CharField(
        max_length=120, blank=True, default="", db_index=True,
        help_text="Identifiant attribue par le prestataire.",
    )

    status = models.CharField(
        max_length=12, choices=Status.choices, default=Status.INITIATED,
    )
    provider_status_raw = models.CharField(
        max_length=60, blank=True, default="",
        help_text="Statut brut du prestataire, non traduit.",
    )
    error_code = models.CharField(max_length=30, blank=True, default="")
    error_message = models.TextField(blank=True, default="")

    amount_xaf = models.PositiveBigIntegerField()
    payer_msisdn_masked = models.CharField(max_length=32, blank=True, default="")
    payer_operator = models.CharField(max_length=10, blank=True, default="")

    request_payload = models.JSONField(default=dict, blank=True)
    response_payload = models.JSONField(default=dict, blank=True)

    poll_count = models.PositiveIntegerField(default=0)
    last_polled_at = models.DateTimeField(null=True, blank=True)
    settled_at = models.DateTimeField(
        null=True, blank=True,
        help_text="Horodatage de la confirmation VERIFIEE aupres du prestataire.",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "payments"
        ordering = ["-created_at"]
        verbose_name = "Tentative de paiement"
        verbose_name_plural = "Tentatives de paiement"
        indexes = [
            models.Index(fields=["status", "last_polled_at"]),
            models.Index(fields=["provider_code", "provider_reference"]),
        ]

    def __str__(self):
        return f"{self.external_reference} ({self.status})"

    def delete(self, *args, **kwargs):
        raise ValidationError(
            "Une tentative de paiement ne se supprime jamais : "
            "c'est une piece de la piste d'audit."
        )

    @property
    def is_open(self) -> bool:
        return self.status in self.OPEN_STATUSES