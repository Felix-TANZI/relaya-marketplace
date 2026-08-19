# backend/apps/payments/payees/models.py
# Identite financiere des beneficiaires.
#
# PRINCIPE STRUCTURANT : AUCUNE REFERENCE VERS LE METIER
#
#   PayeeAccount ne porte ni cle etrangere vers VendorProfile, ni
#   GenericForeignKey. Il possede une identite propre et stable : payee_code.
#
#   Pourquoi : un GenericForeignKey n'offre AUCUNE integrite referentielle en
#   base. Un enregistrement metier supprime laisserait un compte orphelin
#   pointant vers un solde d'argent reel. Et il violerait le principe P1
#   d'isolation du domaine financier.
#
#   Le lien vers le metier vit dans bridge/, seul module autorise a connaitre
#   les deux mondes, avec de vraies cles etrangeres et une contrainte CHECK.
#
# UN BENEFICIAIRE NE PEUT ETRE REGLE QUE SI :
#   kyc_status = VERIFIED  ET  payout_hold = False  ET  is_active = True
#   Aucune exception, y compris pour la plateforme.

import uuid

from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from apps.payments.domain.enums import PayeeType as DomainPayeeType

from . import crypto


class PayeeType(models.TextChoices):
    VENDOR = "VENDOR", "Vendeur"
    DELIVERY_COMPANY = "DELIVERY_COMPANY", "Entreprise de livraison"
    RELAY_POINT = "RELAY_POINT", "Point relais"
    PLATFORM = "PLATFORM", "Plateforme BelivaY"
    BUYER = "BUYER", "Acheteur"
    # Reserve Phase 2 — livreur independant.
    COURIER = "COURIER", "Livreur independant (reserve)"


#: Types autorises a exister en Phase 1.
PHASE1_TYPES = frozenset({
    PayeeType.VENDOR,
    PayeeType.DELIVERY_COMPANY,
    PayeeType.RELAY_POINT,
    PayeeType.PLATFORM,
    PayeeType.BUYER,
})

#: Prefixe du code par type — lisible a l'oeil nu dans une trace ou un log.
CODE_PREFIX = {
    PayeeType.VENDOR: "VND",
    PayeeType.DELIVERY_COMPANY: "DLV",
    PayeeType.RELAY_POINT: "RLY",
    PayeeType.PLATFORM: "PLT",
    PayeeType.BUYER: "BUY",
    PayeeType.COURIER: "CUR",
}


class KycStatus(models.TextChoices):
    PENDING = "PENDING", "En attente"
    VERIFIED = "VERIFIED", "Verifie"
    REJECTED = "REJECTED", "Rejete"
    SUSPENDED = "SUSPENDED", "Suspendu"


class MomoOperator(models.TextChoices):
    MTN = "MTN", "MTN Mobile Money"
    ORANGE = "ORANGE", "Orange Money"


class PayeeAccount(models.Model):
    """Identite financiere d'un beneficiaire, independante du metier."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    payee_code = models.CharField(
        max_length=40, unique=True, editable=False,
        verbose_name="Code beneficiaire",
        help_text="Identite stable a vie. Ex : PAY-VND-000341.",
    )
    payee_type = models.CharField(max_length=20, choices=PayeeType.choices)
    display_label = models.CharField(
        max_length=140, verbose_name="Libelle",
        help_text="Libelle neutre pour l'administration financiere.",
    )

    # ── KYC ──────────────────────────────────────────────────────────────────
    kyc_status = models.CharField(
        max_length=12, choices=KycStatus.choices, default=KycStatus.PENDING,
    )
    kyc_verified_at = models.DateTimeField(null=True, blank=True)
    kyc_verified_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="+",
    )
    kyc_note = models.TextField(blank=True, default="")

    # ── Gel administratif ────────────────────────────────────────────────────
    payout_hold = models.BooleanField(
        default=False, verbose_name="Versements geles",
        help_text="Reserve aux cas graves : fraude, KYC, litige majeur. "
                  "Une petite creance s'impute sur le prochain reglement, "
                  "elle ne gele pas tout.",
    )
    payout_hold_reason = models.TextField(blank=True, default="")
    payout_hold_at = models.DateTimeField(null=True, blank=True)
    payout_hold_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="+",
    )

    # ── Coordonnees Mobile Money ─────────────────────────────────────────────
    momo_operator = models.CharField(
        max_length=10, choices=MomoOperator.choices, blank=True, default="",
    )
    momo_number_enc = models.BinaryField(
        null=True, blank=True, editable=False,
        verbose_name="Numero chiffre",
    )
    momo_number_masked = models.CharField(
        max_length=32, blank=True, default="", editable=False,
        verbose_name="Numero masque",
    )
    momo_fingerprint = models.CharField(
        max_length=64, blank=True, default="", db_index=True, editable=False,
        verbose_name="Empreinte du numero",
        help_text="Detecte qu'un meme numero sert plusieurs beneficiaires — "
                  "signal de mule financiere — sans stocker le numero en clair.",
    )
    momo_changed_at = models.DateTimeField(
        null=True, blank=True,
        verbose_name="Dernier changement de numero",
        help_text="Declenche la periode de refroidissement avant tout versement.",
    )

    # ── Reglement ────────────────────────────────────────────────────────────
    settlement_cycle_key = models.SlugField(
        max_length=120, blank=True, default="",
        verbose_name="Cycle de reglement",
        help_text="config_key d'un SettlementCycle. Chaine et non cle etrangere : "
                  "le cycle est versionne, la reference doit survivre aux versions.",
    )

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "payments"
        ordering = ["payee_type", "payee_code"]
        verbose_name = "Beneficiaire (compte financier)"
        verbose_name_plural = "Beneficiaires (comptes financiers)"
        indexes = [
            models.Index(fields=["payee_type", "kyc_status"]),
            models.Index(fields=["payout_hold"]),
        ]

    def __str__(self):
        return f"{self.payee_code} — {self.display_label}"

    # ── Generation du code ───────────────────────────────────────────────────

    @classmethod
    def next_code(cls, payee_type: str) -> str:
        prefixe = CODE_PREFIX.get(payee_type, "GEN")
        dernier = (
            cls.objects.filter(payee_type=payee_type)
            .order_by("-payee_code")
            .values_list("payee_code", flat=True)
            .first()
        )
        numero = 1
        if dernier:
            try:
                numero = int(dernier.rsplit("-", 1)[1]) + 1
            except (IndexError, ValueError):
                numero = cls.objects.filter(payee_type=payee_type).count() + 1
        return f"PAY-{prefixe}-{numero:06d}"

    def save(self, *args, **kwargs):
        if not self.payee_code:
            self.payee_code = self.next_code(self.payee_type)
        super().save(*args, **kwargs)

    def clean(self):
        if self.payee_type == PayeeType.COURIER:
            raise ValidationError(
                "Le type COURIER est reserve a la Phase 2. "
                "Aucun compte de ce type ne peut etre cree en Phase 1."
            )
        if self.payee_type not in PHASE1_TYPES:
            raise ValidationError(f"Type de beneficiaire non actif : {self.payee_type}.")

    def delete(self, *args, **kwargs):
        raise ValidationError(
            f"Le beneficiaire {self.payee_code} ne peut pas etre supprime : "
            "des ecritures comptables y font reference. Le desactiver."
        )

    # ── Numero Mobile Money ──────────────────────────────────────────────────

    @property
    def momo_number(self) -> str:
        """Numero en clair. A n'appeler qu'au moment d'emettre un versement."""
        if not self.momo_number_enc:
            return ""
        return crypto.decrypt(self.momo_number_enc)

    def set_momo_number(self, msisdn: str, operator: str, *, now=None) -> None:
        """
        Enregistre un numero. NE SAUVEGARDE PAS — voir services.change_momo_number,
        qui journalise le changement et applique le refroidissement.
        """
        numero = (msisdn or "").strip().replace(" ", "")
        if not numero:
            raise ValidationError("Numero Mobile Money vide.")
        self.momo_number_enc = crypto.encrypt(numero)
        self.momo_number_masked = crypto.mask(numero)
        self.momo_fingerprint = crypto.fingerprint(numero)
        self.momo_operator = operator
        self.momo_changed_at = now or timezone.now()

    # ── Eligibilite au reglement ─────────────────────────────────────────────

    def payout_blockers(self, *, cooling_hours: int = 72, now=None) -> list[str]:
        """
        Liste des motifs empechant un versement. Vide = eligible.

        Retourner une LISTE plutot qu'un booleen permet d'afficher a l'admin
        tout ce qui bloque, pas seulement le premier motif rencontre.
        """
        moment = now or timezone.now()
        motifs = []

        if not self.is_active:
            motifs.append("Compte desactive.")
        if self.kyc_status != KycStatus.VERIFIED:
            motifs.append(f"KYC non verifie (statut : {self.get_kyc_status_display()}).")
        if self.payout_hold:
            motifs.append(f"Versements geles : {self.payout_hold_reason or 'sans motif'}.")
        if not self.momo_number_enc:
            motifs.append("Aucun numero Mobile Money enregistre.")
        if not self.momo_operator:
            motifs.append("Aucun operateur Mobile Money enregistre.")

        if self.momo_changed_at and cooling_hours > 0:
            from datetime import timedelta
            fin = self.momo_changed_at + timedelta(hours=cooling_hours)
            if moment < fin:
                restant = int((fin - moment).total_seconds() // 3600) + 1
                motifs.append(
                    f"Refroidissement apres changement de numero : "
                    f"{restant} h restantes."
                )

        return motifs

    def can_receive_payout(self, *, cooling_hours: int = 72, now=None) -> bool:
        return not self.payout_blockers(cooling_hours=cooling_hours, now=now)

    @property
    def domain_type(self) -> DomainPayeeType:
        """Traduction vers l'enumeration du domaine pur."""
        return DomainPayeeType(self.payee_type)


class PayeeMomoChange(models.Model):
    """
    Journal des changements de numero Mobile Money. Append-only.

    Ce journal existe parce que le changement de numero est LE vecteur
    d'attaque : compromettre un compte partenaire, changer le numero,
    encaisser le prochain reglement. Sans trace, la compromission est
    indetectable a posteriori.
    """

    payee = models.ForeignKey(
        PayeeAccount, on_delete=models.PROTECT, related_name="momo_changes",
    )
    previous_masked = models.CharField(max_length=32, blank=True, default="")
    new_masked = models.CharField(max_length=32)
    previous_operator = models.CharField(max_length=10, blank=True, default="")
    new_operator = models.CharField(max_length=10)
    previous_fingerprint = models.CharField(max_length=64, blank=True, default="")
    new_fingerprint = models.CharField(max_length=64)
    reason = models.TextField(blank=True, default="")
    changed_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="+",
    )
    source_ip = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = "payments"
        ordering = ["-created_at"]
        verbose_name = "Changement de numero Mobile Money"
        verbose_name_plural = "Changements de numero Mobile Money"

    def __str__(self):
        return f"{self.payee.payee_code} : {self.previous_masked or '—'} -> {self.new_masked}"

    def save(self, *args, **kwargs):
        if self.pk is not None:
            raise ValidationError("Le journal des changements est immuable.")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError(
            "Le journal des changements de numero ne se supprime jamais : "
            "c'est une piece d'audit."
        )