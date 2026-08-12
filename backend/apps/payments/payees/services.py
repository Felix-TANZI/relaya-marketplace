# backend/apps/payments/payees/services.py
# Operations sur les comptes beneficiaires.
#
# Toutes les operations sensibles passent par ici plutot que par une
# manipulation directe du modele : c'est le seul moyen de garantir que le
# journal d'audit est alimente et que les regles de securite s'appliquent.

from __future__ import annotations

from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from .models import (
    KycStatus,
    PayeeAccount,
    PayeeMomoChange,
    PayeeType,
    PHASE1_TYPES,
)


class PayeeError(Exception):
    """Erreur metier sur un compte beneficiaire."""


DEFAULT_COOLING_HOURS = 72


def _cooling_hours_for(payee: PayeeAccount) -> int:
    """
    Duree de refroidissement issue de la configuration.

    Aucune valeur en dur (principe P2) : on lit PayoutPolicy. Le repli n'est
    utilise que si la configuration est absente, et il est volontairement
    conservateur.
    """
    try:
        from apps.payments.config.models import PayoutPolicy
        politique = (
            PayoutPolicy.current()
            .filter(payee_type=payee.payee_type)
            .order_by("-priority")
            .first()
            or PayoutPolicy.current().filter(payee_type="").order_by("-priority").first()
        )
        if politique is not None:
            return politique.momo_change_cooling_hours
    except Exception:
        pass
    return DEFAULT_COOLING_HOURS


# ─────────────────────────────────────────────────────────────────────────────
# CREATION
# ─────────────────────────────────────────────────────────────────────────────

@transaction.atomic
def create_payee(
    *,
    payee_type: str,
    display_label: str,
    settlement_cycle_key: str = "",
    momo_operator: str = "",
    momo_number: str = "",
    created_by=None,
) -> PayeeAccount:
    """
    Cree un compte beneficiaire.

    Le KYC demarre TOUJOURS a PENDING : aucun versement n'est possible tant
    qu'une verification humaine n'a pas eu lieu.
    """
    if payee_type == PayeeType.COURIER:
        raise PayeeError(
            "Le type COURIER est reserve a la Phase 2 (referentiel §4). "
            "Aucun compte de ce type ne peut etre cree."
        )
    if payee_type not in PHASE1_TYPES:
        raise PayeeError(f"Type de beneficiaire non actif en Phase 1 : {payee_type}.")

    payee = PayeeAccount(
        payee_type=payee_type,
        display_label=display_label.strip(),
        settlement_cycle_key=settlement_cycle_key,
        kyc_status=KycStatus.PENDING,
    )

    if momo_number:
        if not momo_operator:
            raise PayeeError("Un numero Mobile Money exige un operateur.")
        payee.set_momo_number(momo_number, momo_operator)

    payee.full_clean(exclude=["payee_code"])
    payee.save()

    if momo_number:
        PayeeMomoChange.objects.create(
            payee=payee,
            new_masked=payee.momo_number_masked,
            new_operator=payee.momo_operator,
            new_fingerprint=payee.momo_fingerprint,
            reason="Enregistrement initial a la creation du compte.",
            changed_by=created_by,
        )

    return payee


# ─────────────────────────────────────────────────────────────────────────────
# KYC
# ─────────────────────────────────────────────────────────────────────────────

@transaction.atomic
def verify_kyc(payee: PayeeAccount, *, verified_by, note: str = "") -> PayeeAccount:
    """Valide le KYC. Condition absolue de tout versement."""
    if verified_by is None:
        raise PayeeError("La verification KYC exige un operateur identifie.")
    payee.kyc_status = KycStatus.VERIFIED
    payee.kyc_verified_at = timezone.now()
    payee.kyc_verified_by = verified_by
    payee.kyc_note = note
    payee.save(update_fields=[
        "kyc_status", "kyc_verified_at", "kyc_verified_by", "kyc_note", "updated_at",
    ])
    return payee


@transaction.atomic
def reject_kyc(payee: PayeeAccount, *, rejected_by, reason: str) -> PayeeAccount:
    if not reason or not reason.strip():
        raise PayeeError("Le motif de rejet KYC est obligatoire.")
    payee.kyc_status = KycStatus.REJECTED
    payee.kyc_verified_by = rejected_by
    payee.kyc_verified_at = timezone.now()
    payee.kyc_note = reason.strip()
    payee.save(update_fields=[
        "kyc_status", "kyc_verified_at", "kyc_verified_by", "kyc_note", "updated_at",
    ])
    return payee


@transaction.atomic
def suspend_kyc(payee: PayeeAccount, *, suspended_by, reason: str) -> PayeeAccount:
    if not reason or not reason.strip():
        raise PayeeError("Le motif de suspension est obligatoire.")
    payee.kyc_status = KycStatus.SUSPENDED
    payee.kyc_verified_by = suspended_by
    payee.kyc_note = reason.strip()
    payee.save(update_fields=[
        "kyc_status", "kyc_verified_by", "kyc_note", "updated_at",
    ])
    return payee


# ─────────────────────────────────────────────────────────────────────────────
# GEL
# ─────────────────────────────────────────────────────────────────────────────

@transaction.atomic
def hold_payouts(payee: PayeeAccount, *, held_by, reason: str) -> PayeeAccount:
    """
    Gele TOUS les versements d'un beneficiaire.

    A RESERVER aux cas graves : fraude, KYC, litige majeur, risque eleve.
    Une petite creance ne doit PAS geler l'integralite des reglements :
    elle s'impute sur le prochain lot, plafonnee. Geler tout pour 3 000 FCFA
    est disproportionne, contractuellement contestable et commercialement
    destructeur.
    """
    if not reason or not reason.strip():
        raise PayeeError("Le motif de gel est obligatoire.")
    payee.payout_hold = True
    payee.payout_hold_reason = reason.strip()
    payee.payout_hold_at = timezone.now()
    payee.payout_hold_by = held_by
    payee.save(update_fields=[
        "payout_hold", "payout_hold_reason", "payout_hold_at",
        "payout_hold_by", "updated_at",
    ])
    return payee


@transaction.atomic
def release_hold(payee: PayeeAccount, *, released_by, reason: str = "") -> PayeeAccount:
    payee.payout_hold = False
    payee.payout_hold_reason = ""
    payee.payout_hold_at = None
    payee.payout_hold_by = released_by
    payee.save(update_fields=[
        "payout_hold", "payout_hold_reason", "payout_hold_at",
        "payout_hold_by", "updated_at",
    ])
    return payee


# ─────────────────────────────────────────────────────────────────────────────
# NUMERO MOBILE MONEY
# ─────────────────────────────────────────────────────────────────────────────

@transaction.atomic
def change_momo_number(
    payee: PayeeAccount,
    *,
    msisdn: str,
    operator: str,
    changed_by=None,
    reason: str = "",
    source_ip: str | None = None,
) -> PayeeAccount:
    """
    Change le numero Mobile Money.

    Trois effets, tous obligatoires :
      1. Journalisation append-only du changement
      2. Horodatage qui declenche la periode de refroidissement
      3. Aucun versement possible avant la fin de ce delai

    C'est la contre-mesure au vecteur d'attaque le plus rentable :
    compromettre un compte, changer le numero, encaisser le reglement.
    Sans ce delai, la compromission se solde par une perte seche.
    """
    numero = (msisdn or "").strip().replace(" ", "")
    if not numero:
        raise PayeeError("Numero Mobile Money vide.")
    if not operator:
        raise PayeeError("Operateur Mobile Money requis.")

    from . import crypto

    nouvelle_empreinte = crypto.fingerprint(numero)
    if nouvelle_empreinte == payee.momo_fingerprint and operator == payee.momo_operator:
        raise PayeeError("Le numero et l'operateur sont deja ceux enregistres.")

    ancien_masque = payee.momo_number_masked
    ancien_operateur = payee.momo_operator
    ancienne_empreinte = payee.momo_fingerprint

    payee.set_momo_number(numero, operator)
    payee.save(update_fields=[
        "momo_number_enc", "momo_number_masked", "momo_fingerprint",
        "momo_operator", "momo_changed_at", "updated_at",
    ])

    PayeeMomoChange.objects.create(
        payee=payee,
        previous_masked=ancien_masque,
        new_masked=payee.momo_number_masked,
        previous_operator=ancien_operateur,
        new_operator=operator,
        previous_fingerprint=ancienne_empreinte,
        new_fingerprint=nouvelle_empreinte,
        reason=reason.strip(),
        changed_by=changed_by,
        source_ip=source_ip,
    )

    return payee


def shared_number_payees(payee: PayeeAccount) -> list[PayeeAccount]:
    """
    Autres beneficiaires utilisant le MEME numero.

    Le signal reellement discriminant d'une mule financiere n'est pas
    « un tiers paie » — c'est un meme numero servant un nombre anormal de
    comptes distincts.
    """
    if not payee.momo_fingerprint:
        return []
    return list(
        PayeeAccount.objects
        .filter(momo_fingerprint=payee.momo_fingerprint)
        .exclude(pk=payee.pk)
    )


# ─────────────────────────────────────────────────────────────────────────────
# ELIGIBILITE
# ─────────────────────────────────────────────────────────────────────────────

def payout_blockers(payee: PayeeAccount, now=None) -> list[str]:
    """Motifs empechant un versement, refroidissement lu depuis la configuration."""
    return payee.payout_blockers(cooling_hours=_cooling_hours_for(payee), now=now)


def can_receive_payout(payee: PayeeAccount, now=None) -> bool:
    return not payout_blockers(payee, now=now)


def assert_can_receive_payout(payee: PayeeAccount, now=None) -> None:
    """Leve une exception detaillee. A appeler avant tout versement."""
    motifs = payout_blockers(payee, now=now)
    if motifs:
        raise PayeeError(
            f"Versement impossible pour {payee.payee_code} : " + " ".join(motifs)
        )