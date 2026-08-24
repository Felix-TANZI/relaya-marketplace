# backend/apps/payments/ledger/models.py
# Registre comptable en partie double.
#
# POURQUOI LA PARTIE DOUBLE
#   Sans elle, aucun moyen de repondre a : « le solde de mon compte marchand
#   correspond-il a ce que je dois a mes beneficiaires ? »
#   Et sans reponse a cette question, on ne detecte ni un bug, ni un detournement.
#
# QUATRE GARANTIES
#   1. Somme nulle    — debits = credits pour chaque transaction
#   2. Immuabilite    — aucune ecriture n'est modifiee ni supprimee, jamais
#   3. Chainage       — chaque transaction porte l'empreinte de la precedente
#   4. Correction     — une erreur se corrige par CONTRE-PASSATION
#
# Ces garanties sont appliquees a trois niveaux : Python, contraintes Django,
# et declencheurs PostgreSQL. Un contournement par requete SQL directe echoue
# aussi.

import hashlib
import json

from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone

from . import chart_of_accounts as coa


class LedgerImmutableError(Exception):
    """Tentative de modification ou suppression d'une ecriture comptable."""


class UnbalancedTransaction(Exception):
    """Debits et credits ne s'equilibrent pas."""


# ─────────────────────────────────────────────────────────────────────────────
# PLAN COMPTABLE
# ─────────────────────────────────────────────────────────────────────────────

class LedgerAccount(models.Model):
    """Compte du plan comptable. Cree par seed_chart_of_accounts."""

    class AccountType(models.TextChoices):
        ASSET = coa.ASSET, "Actif"
        LIABILITY = coa.LIABILITY, "Passif"
        REVENUE = coa.REVENUE, "Produit"
        EXPENSE = coa.EXPENSE, "Charge"
        SUSPENSE = coa.SUSPENSE, "Attente"

    class Side(models.TextChoices):
        DEBIT = coa.DEBIT, "Debiteur"
        CREDIT = coa.CREDIT, "Crediteur"

    class PspFamily(models.TextChoices):
        NONE = coa.FAMILY_NONE, "Non applicable"
        DERIVABLE = coa.FAMILY_DERIVABLE, "Derivable de nos evenements"
        PROVIDER = coa.FAMILY_PROVIDER, "Dependant du prestataire"

    code = models.CharField(max_length=10, unique=True, verbose_name="Code")
    name = models.CharField(max_length=120, verbose_name="Libelle")
    account_type = models.CharField(max_length=12, choices=AccountType.choices)
    normal_side = models.CharField(max_length=6, choices=Side.choices)
    psp_family = models.CharField(
        max_length=12, choices=PspFamily.choices, default=PspFamily.NONE,
        verbose_name="Famille PSP",
        help_text="PROVIDER = reconciliable seulement si le prestataire expose l'information.",
    )
    operator = models.CharField(max_length=20, blank=True, default="")
    is_auxiliary = models.BooleanField(
        default=False, verbose_name="Compte auxiliaire",
        help_text="Ventile par beneficiaire via le champ payee_code des ecritures.",
    )
    is_reserved = models.BooleanField(
        default=False, verbose_name="Reserve",
        help_text="Declare mais sans mouvement autorise en Phase 1.",
    )
    description = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = "payments"
        ordering = ["code"]
        verbose_name = "Compte comptable"
        verbose_name_plural = "Plan comptable"

    def __str__(self):
        return f"{self.code} — {self.name}"

    def delete(self, *args, **kwargs):
        raise LedgerImmutableError(
            f"Le compte {self.code} ne peut pas etre supprime : "
            "des ecritures y sont potentiellement rattachees."
        )


# ─────────────────────────────────────────────────────────────────────────────
# TRANSACTION COMPTABLE
# ─────────────────────────────────────────────────────────────────────────────

class LedgerTransaction(models.Model):
    """
    Groupe d'ecritures equilibrees, atomique.

    Chainee par empreinte : chaque transaction contient le hash de la
    precedente. Toute alteration d'un enregistrement passe casse la chaine
    et devient detectable par verify_ledger_integrity.
    """

    class Kind(models.TextChoices):
        OPENING = "OPENING", "A-nouveau"
        COLLECT = "COLLECT", "Encaissement"
        ESCROW_RELEASE = "ESCROW_RELEASE", "Liberation de sequestre"
        PAYOUT = "PAYOUT", "Versement"
        REFUND = "REFUND", "Remboursement"
        ADJUSTMENT = "ADJUSTMENT", "Ajustement"
        RECONCILIATION = "RECONCILIATION", "Reconciliation"
        REVERSAL = "REVERSAL", "Contre-passation"

    seq = models.BigAutoField(primary_key=True)
    reference = models.CharField(max_length=48, unique=True, editable=False)
    kind = models.CharField(max_length=20, choices=Kind.choices)
    occurred_at = models.DateTimeField(default=timezone.now)
    description = models.TextField(blank=True, default="")

    # Rattachement metier — volontairement des CHAINES et non des cles
    # etrangeres : le registre ne doit dependre d'aucun autre modele (P1).
    source_type = models.CharField(
        max_length=40, blank=True, default="",
        help_text="PaymentIntent, SettlementBatch, Adjustment…",
    )
    source_ref = models.CharField(max_length=64, blank=True, default="")
    correlation_id = models.CharField(
        max_length=64, blank=True, default="", db_index=True,
        help_text="Permet de reconstituer une transaction de bout en bout.",
    )

    # Contre-passation
    reverses = models.ForeignKey(
        "self", on_delete=models.PROTECT, null=True, blank=True,
        related_name="reversed_by",
        verbose_name="Contre-passe la transaction",
    )

    # Chaine d'integrite
    previous_hash = models.CharField(max_length=64, blank=True, default="", editable=False)
    entry_hash = models.CharField(max_length=64, blank=True, default="", editable=False)

    created_at = models.DateTimeField(auto_now_add=True)
    created_by_label = models.CharField(
        max_length=80, blank=True, default="",
        help_text="Acteur ou tache a l'origine de l'ecriture.",
    )

    class Meta:
        app_label = "payments"
        ordering = ["-seq"]
        verbose_name = "Transaction comptable"
        verbose_name_plural = "Transactions comptables"
        indexes = [
            models.Index(fields=["source_type", "source_ref"]),
            models.Index(fields=["kind", "occurred_at"]),
        ]

    def __str__(self):
        return f"{self.reference} ({self.kind})"

    # ── Immuabilite ──────────────────────────────────────────────────────────

    def save(self, *args, **kwargs):
        if self.pk is not None and not kwargs.pop("_allow_hash_update", False):
            ancien = LedgerTransaction.objects.filter(pk=self.pk).first()
            if ancien is not None:
                raise LedgerImmutableError(
                    f"La transaction {self.reference} est figee. "
                    "Une erreur se corrige par CONTRE-PASSATION, jamais par modification."
                )
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise LedgerImmutableError(
            f"La transaction {self.reference} ne peut pas etre supprimee. "
            "Utiliser une contre-passation."
        )

    # ── Equilibre ────────────────────────────────────────────────────────────

    def imbalance(self) -> int:
        """Ecart debits - credits. Doit valoir zero."""
        total = 0
        for ligne in self.entries.all():
            total += ligne.amount_xaf if ligne.direction == LedgerEntry.Direction.DEBIT else -ligne.amount_xaf
        return total

    @property
    def is_balanced(self) -> bool:
        return self.imbalance() == 0

    def total_debit(self) -> int:
        return sum(
            e.amount_xaf for e in self.entries.all()
            if e.direction == LedgerEntry.Direction.DEBIT
        )

    # ── Chaine d'integrite ───────────────────────────────────────────────────

    def compute_hash(self) -> str:
        """
        Empreinte deterministe de la transaction et de ses lignes.

        Inclut previous_hash : alterer une transaction ancienne invalide
        toutes les suivantes.
        """
        lignes = [
            {
                "compte": e.account.code,
                "sens": e.direction,
                "montant": e.amount_xaf,
                "beneficiaire": e.payee_code or "",
            }
            for e in self.entries.order_by("id")
        ]
        charge = {
            "seq": self.seq,
            "reference": self.reference,
            "kind": self.kind,
            "occurred_at": self.occurred_at.isoformat(),
            "source": f"{self.source_type}:{self.source_ref}",
            "reverses": self.reverses_id or 0,
            "previous_hash": self.previous_hash,
            "lignes": lignes,
        }
        brut = json.dumps(charge, sort_keys=True, separators=(",", ":"))
        return hashlib.sha256(brut.encode("utf-8")).hexdigest()

    def verify_hash(self) -> bool:
        return self.entry_hash == self.compute_hash()


# ─────────────────────────────────────────────────────────────────────────────
# ECRITURE
# ─────────────────────────────────────────────────────────────────────────────

class LedgerEntry(models.Model):
    """
    Ligne d'ecriture. Montant TOUJOURS positif ; le sens porte le signe.

    Un montant negatif rendrait ambigus les totaux et masquerait les erreurs
    de saisie. La convention debit/credit est la seule utilisee.
    """

    class Direction(models.TextChoices):
        DEBIT = "DEBIT", "Debit"
        CREDIT = "CREDIT", "Credit"

    transaction = models.ForeignKey(
        LedgerTransaction, on_delete=models.PROTECT, related_name="entries",
    )
    account = models.ForeignKey(
        LedgerAccount, on_delete=models.PROTECT, related_name="entries",
    )
    direction = models.CharField(max_length=6, choices=Direction.choices)
    amount_xaf = models.PositiveBigIntegerField(
        validators=[MinValueValidator(1)],
        verbose_name="Montant (FCFA)",
        help_text="Toujours strictement positif. Le sens est porte par direction.",
    )
    currency = models.CharField(max_length=3, default="XAF")
    payee_code = models.CharField(
        max_length=40, blank=True, default="", db_index=True,
        verbose_name="Beneficiaire",
        help_text="Obligatoire sur un compte auxiliaire. Donne le solde individuel.",
    )
    label = models.CharField(max_length=200, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = "payments"
        ordering = ["id"]
        verbose_name = "Ecriture comptable"
        verbose_name_plural = "Ecritures comptables"
        indexes = [
            models.Index(fields=["account", "payee_code"]),
        ]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(amount_xaf__gt=0),
                name="ledger_entry_amount_positive",
            ),
        ]

    def __str__(self):
        signe = "D" if self.direction == self.Direction.DEBIT else "C"
        return f"{signe} {self.account.code} {self.amount_xaf}"

    def clean(self):
        if self.account_id and self.account.is_reserved:
            raise ValidationError(
                f"Le compte {self.account.code} est reserve : aucun mouvement "
                "n'est autorise en Phase 1."
            )
        if self.account_id and self.account.is_auxiliary and not self.payee_code:
            raise ValidationError(
                f"Le compte auxiliaire {self.account.code} exige un payee_code."
            )
        if self.account_id and not self.account.is_auxiliary and self.payee_code:
            raise ValidationError(
                f"Le compte {self.account.code} n'est pas auxiliaire : "
                "payee_code doit rester vide."
            )

    def save(self, *args, **kwargs):
        if self.pk is not None:
            raise LedgerImmutableError(
                "Une ecriture comptable ne se modifie jamais. "
                "Corriger par contre-passation."
            )
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise LedgerImmutableError("Une ecriture comptable ne se supprime jamais.")

    @property
    def signed_amount(self) -> int:
        """Montant signe selon le sens — pour les agregations."""
        return (
            self.amount_xaf
            if self.direction == self.Direction.DEBIT
            else -self.amount_xaf
        )