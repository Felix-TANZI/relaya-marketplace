# backend/apps/payments/bridge/models.py
# LE SEUL POINT DE CONTACT entre le domaine financier et le reste du projet.
#
# Ce fichier est le seul du module payments autorise a importer
# apps.vendors et apps.accounts. Un test d'integration continue le verifie.
#
# POURQUOI CE MODELE PLUTOT QU'UN GenericForeignKey
#
#   Un GFK n'offre aucune integrite referentielle : rien n'empeche un
#   subject_id de pointer vers une ligne supprimee, laissant un compte
#   orphelin rattache a un solde d'argent reel.
#
#   Ici : de vraies cles etrangeres, ON DELETE PROTECT, et une contrainte
#   CHECK garantissant qu'EXACTEMENT UNE est renseignee. PostgreSQL refuse
#   toute ligne incoherente, y compris inseree en SQL direct.

from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q

from apps.payments.payees.models import PayeeAccount, PayeeType

# ── Lot 5 : lien intention <-> commandes ─────────────────────────────────────
from .intent_orders import PaymentIntentOrder  # noqa: F401,E402


class PayeeLink(models.Model):
    """Rattachement d'un compte financier a une entite metier."""

    payee_account = models.OneToOneField(
        PayeeAccount, on_delete=models.PROTECT, related_name="link",
    )

    # Exactement une de ces cles est renseignee — contrainte CHECK ci-dessous.
    vendor = models.OneToOneField(
        "vendors.VendorProfile", on_delete=models.PROTECT,
        null=True, blank=True, related_name="payee_link",
    )
    delivery_company = models.OneToOneField(
        "accounts.DeliveryOrganizationProfile", on_delete=models.PROTECT,
        null=True, blank=True, related_name="payee_link",
    )
    relay_point = models.OneToOneField(
        "accounts.RelayPointProfile", on_delete=models.PROTECT,
        null=True, blank=True, related_name="payee_link",
    )
    user = models.OneToOneField(
        User, on_delete=models.PROTECT,
        null=True, blank=True, related_name="payee_link",
        help_text="Pour un acheteur (remboursements).",
    )
    is_platform = models.BooleanField(
        default=False,
        help_text="Compte de la plateforme elle-meme — sans entite metier.",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "payments"
        verbose_name = "Rattachement beneficiaire"
        verbose_name_plural = "Rattachements beneficiaires"
        constraints = [
            models.CheckConstraint(
                condition=(
                    # Exactement une source renseignee
                    Q(vendor__isnull=False, delivery_company__isnull=True,
                      relay_point__isnull=True, user__isnull=True, is_platform=False)
                    | Q(vendor__isnull=True, delivery_company__isnull=False,
                        relay_point__isnull=True, user__isnull=True, is_platform=False)
                    | Q(vendor__isnull=True, delivery_company__isnull=True,
                        relay_point__isnull=False, user__isnull=True, is_platform=False)
                    | Q(vendor__isnull=True, delivery_company__isnull=True,
                        relay_point__isnull=True, user__isnull=False, is_platform=False)
                    | Q(vendor__isnull=True, delivery_company__isnull=True,
                        relay_point__isnull=True, user__isnull=True, is_platform=True)
                ),
                name="payee_link_exactly_one_subject",
                violation_error_message=(
                    "Un rattachement doit designer EXACTEMENT une entite metier "
                    "(vendeur, entreprise, point relais, utilisateur) "
                    "ou etre marque comme plateforme."
                ),
            ),
        ]

    def __str__(self):
        return f"{self.payee_account.payee_code} -> {self.subject_label}"

    # ── Resolution ───────────────────────────────────────────────────────────

    @property
    def subject(self):
        """L'entite metier rattachee, quelle qu'elle soit."""
        return self.vendor or self.delivery_company or self.relay_point or self.user

    @property
    def subject_label(self) -> str:
        if self.is_platform:
            return "Plateforme BelivaY"
        if self.vendor_id:
            return f"Vendeur : {self.vendor.business_name}"
        if self.delivery_company_id:
            return f"Entreprise : {self.delivery_company.company_name}"
        if self.relay_point_id:
            return f"Point relais : {self.relay_point_id}"
        if self.user_id:
            return f"Utilisateur : {self.user.username}"
        return "— non rattache —"

    @property
    def expected_payee_type(self) -> str:
        if self.is_platform:
            return PayeeType.PLATFORM
        if self.vendor_id:
            return PayeeType.VENDOR
        if self.delivery_company_id:
            return PayeeType.DELIVERY_COMPANY
        if self.relay_point_id:
            return PayeeType.RELAY_POINT
        if self.user_id:
            return PayeeType.BUYER
        return ""

    def clean(self):
        renseignes = sum([
            bool(self.vendor_id),
            bool(self.delivery_company_id),
            bool(self.relay_point_id),
            bool(self.user_id),
            bool(self.is_platform),
        ])
        if renseignes != 1:
            raise ValidationError(
                f"Exactement une entite doit etre designee (recu : {renseignes})."
            )
        attendu = self.expected_payee_type
        if self.payee_account_id and self.payee_account.payee_type != attendu:
            raise ValidationError(
                f"Incoherence de type : le compte {self.payee_account.payee_code} "
                f"est de type {self.payee_account.payee_type}, "
                f"mais le rattachement designe un {attendu}."
            )

    def delete(self, *args, **kwargs):
        raise ValidationError(
            "Un rattachement beneficiaire ne se supprime pas : "
            "il fait le lien avec des ecritures comptables."
        )