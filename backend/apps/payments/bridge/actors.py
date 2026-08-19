# backend/apps/payments/bridge/actors.py
# Resolution : entite metier <-> compte financier.
#
# Ce module est, avec bridge/models.py, le SEUL autorise a importer
# apps.vendors et apps.accounts. Tout le reste du module payments passe
# par payee_code et ignore l'existence de VendorProfile.

from __future__ import annotations

from django.db import transaction

from apps.payments.payees.models import PayeeAccount, PayeeType
from apps.payments.payees.services import create_payee

from .models import PayeeLink

PLATFORM_CODE_LABEL = "Plateforme BelivaY"


class BridgeError(Exception):
    """Erreur de resolution entre le metier et le financier."""


# ─────────────────────────────────────────────────────────────────────────────
# METIER -> FINANCIER
# ─────────────────────────────────────────────────────────────────────────────

def payee_for_vendor(vendor, *, create: bool = False) -> PayeeAccount | None:
    return _resolve(vendor=vendor, payee_type=PayeeType.VENDOR,
                    label=getattr(vendor, "business_name", str(vendor)), create=create)


def payee_for_delivery_company(company, *, create: bool = False) -> PayeeAccount | None:
    return _resolve(delivery_company=company, payee_type=PayeeType.DELIVERY_COMPANY,
                    label=getattr(company, "company_name", str(company)), create=create)


def payee_for_relay_point(relay, *, create: bool = False) -> PayeeAccount | None:
    label = (
        getattr(relay, "name", None)
        or getattr(relay, "shop_name", None)
        or f"Point relais #{relay.pk}"
    )
    return _resolve(relay_point=relay, payee_type=PayeeType.RELAY_POINT,
                    label=label, create=create)


def payee_for_buyer(user, *, create: bool = False) -> PayeeAccount | None:
    """
    Compte acheteur — utilise UNIQUEMENT pour les remboursements.

    Un remboursement emprunte exactement le meme chemin qu'un versement :
    un seul code de sortie de fonds, donc une seule surface a securiser.
    """
    label = user.get_full_name() or user.username
    return _resolve(user=user, payee_type=PayeeType.BUYER, label=label, create=create)


@transaction.atomic
def _resolve(*, payee_type: str, label: str, create: bool, **subject) -> PayeeAccount | None:
    champ, valeur = next(iter(subject.items()))
    if valeur is None:
        raise BridgeError(f"Entite metier absente pour {champ}.")

    lien = PayeeLink.objects.filter(**{champ: valeur}).select_related("payee_account").first()
    if lien is not None:
        return lien.payee_account

    if not create:
        return None

    compte = create_payee(payee_type=payee_type, display_label=label or "—")
    lien = PayeeLink(payee_account=compte, **{champ: valeur})
    lien.full_clean()
    lien.save()
    return compte


# ─────────────────────────────────────────────────────────────────────────────
# PLATEFORME
# ─────────────────────────────────────────────────────────────────────────────

@transaction.atomic
def platform_payee(*, create: bool = True) -> PayeeAccount | None:
    """Compte de la plateforme — unique, sans entite metier rattachee."""
    lien = PayeeLink.objects.filter(is_platform=True).select_related("payee_account").first()
    if lien is not None:
        return lien.payee_account
    if not create:
        return None

    compte = create_payee(payee_type=PayeeType.PLATFORM, display_label=PLATFORM_CODE_LABEL)
    lien = PayeeLink(payee_account=compte, is_platform=True)
    lien.full_clean()
    lien.save()
    return compte


# ─────────────────────────────────────────────────────────────────────────────
# FINANCIER -> METIER
# ─────────────────────────────────────────────────────────────────────────────

def subject_for_payee(payee: PayeeAccount):
    """
    Entite metier derriere un compte financier.

    Utilise par l'administration pour afficher un nom lisible.
    JAMAIS expose a un acheteur : la regle d'anonymat s'applique.
    """
    lien = PayeeLink.objects.filter(payee_account=payee).first()
    return lien.subject if lien else None


def label_for_payee_code(payee_code: str) -> str:
    """Libelle lisible d'un code beneficiaire. Repli sur le code lui-meme."""
    compte = PayeeAccount.objects.filter(payee_code=payee_code).first()
    if compte is None:
        return payee_code
    return compte.display_label or payee_code


def payee_by_code(payee_code: str) -> PayeeAccount | None:
    return PayeeAccount.objects.filter(payee_code=payee_code).first()


def payee_types_map(payee_codes: list[str]) -> dict:
    """
    {payee_code: PayeeType} — attendu par build_distribution_plan du domaine.
    """
    return {
        compte.payee_code: compte.domain_type
        for compte in PayeeAccount.objects.filter(payee_code__in=payee_codes)
    }


# ─────────────────────────────────────────────────────────────────────────────
# RESOLUTION POUR UNE COMMANDE
# ─────────────────────────────────────────────────────────────────────────────

def payee_codes_for_order(order) -> dict:
    """
    Beneficiaires concrets d'une commande, par type.

    Retourne {PayeeType: payee_code}, format attendu par le domaine.
    Les comptes manquants sont crees a la volee : une commande ne doit
    jamais echouer parce qu'un partenaire n'a pas encore de compte financier.
    Le KYC restera PENDING, donc aucun versement ne partira sans verification.
    """
    codes = {}

    vendeurs = {
        item.product.vendor
        for item in order.items.select_related("product__vendor")
        if getattr(item.product, "vendor_id", None)
    }
    if len(vendeurs) > 1:
        raise BridgeError(
            f"La commande #{order.pk} contient {len(vendeurs)} vendeurs. "
            "Apres l'eclatement du panier (Lot 12), une commande est mono-vendeur."
        )
    if vendeurs:
        from apps.vendors.models import VendorProfile
        utilisateur = next(iter(vendeurs))
        profil = VendorProfile.objects.filter(user=utilisateur).first()
        if profil is not None:
            compte = payee_for_vendor(profil, create=True)
            codes[PayeeType.VENDOR] = compte.payee_code

    expedition = getattr(order, "shipment", None)
    if expedition is not None:
        livreur = getattr(expedition, "courier", None)
        organisation = getattr(livreur, "delivery_organization", None) if livreur else None
        if organisation is not None:
            compte = payee_for_delivery_company(organisation, create=True)
            codes[PayeeType.DELIVERY_COMPANY] = compte.payee_code

    return codes


# ─────────────────────────────────────────────────────────────────────────────
# RESOLUTION D'UN UTILISATEUR VERS SON COMPTE PARTENAIRE — Lot 13
# ─────────────────────────────────────────────────────────────────────────────
#
# Cette connaissance vit ICI et nulle part ailleurs : bridge/ est le SEUL
# module autorise a connaitre VendorProfile, RelayPointProfile et les
# organisations de livraison.
#
# La couche API l'appelle sans jamais importer apps.vendors ni apps.accounts —
# c'est le principe P1, verifie par un test d'integration continue.


def has_partner_profile(user) -> bool:
    """
    L'utilisateur est-il un partenaire, INDEPENDAMMENT de son activite ?

    Un vendeur fraichement approuve n'a pas encore de compte financier : son
    PayeeAccount nait a sa premiere commande. Il reste un partenaire, et son
    espace doit lui montrer un etat VIDE plutot qu'un refus d'acces.
    """
    try:
        from apps.vendors.models import VendorProfile
        if VendorProfile.objects.filter(user=user).exists():
            return True
    except Exception:
        pass

    try:
        from apps.accounts.models import RelayPointProfile
        if RelayPointProfile.objects.filter(user=user).exists():
            return True
    except Exception:
        pass

    try:
        # ATTENTION : l'accesseur inverse est `delivery_organization_profile`,
        # pas `delivery_organization`. Ce dernier est la cle etrangere de
        # CourierProfile vers l'organisation — un objet different.
        if getattr(user, "delivery_organization_profile", None) is not None:
            return True
    except Exception:
        pass

    return partner_payee_for_user(user) is not None


def partner_payee_for_user(user):
    """
    Compte financier PARTENAIRE d'un utilisateur, ou None.

    NE CREE JAMAIS de compte : une lecture ne doit pas avoir d'effet de bord.
    Le type BUYER est exclu — un acheteur rembourse possede un compte
    financier, mais ce n'est pas un partenaire.
    """
    from apps.payments.payees.models import PayeeType

    try:
        from apps.vendors.models import VendorProfile
        profil = VendorProfile.objects.filter(user=user).first()
        if profil is not None:
            compte = payee_for_vendor(profil, create=False)
            if compte is not None:
                return compte
    except Exception:
        pass

    try:
        from apps.accounts.models import RelayPointProfile
        relais = RelayPointProfile.objects.filter(user=user).first()
        if relais is not None:
            compte = payee_for_relay_point(relais, create=False)
            if compte is not None:
                return compte
    except Exception:
        pass

    try:
        organisation = getattr(user, "delivery_organization_profile", None)
        if organisation is not None:
            compte = payee_for_delivery_company(organisation, create=False)
            if compte is not None:
                return compte
    except Exception:
        pass

    try:
        from apps.payments.bridge.models import PayeeLink
        lien = (
            PayeeLink.objects.filter(user=user)
            .exclude(payee_account__payee_type=PayeeType.BUYER)
            .select_related("payee_account").first()
        )
        if lien is not None:
            return lien.payee_account
    except Exception:
        pass

    return None