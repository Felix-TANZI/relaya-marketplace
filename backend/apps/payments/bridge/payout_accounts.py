# backend/apps/payments/bridge/payout_accounts.py
# Le numero verifie atteint le module financier.
#
# ─────────────────────────────────────────────────────────────────────────────
# LE MAILLON QUI MANQUAIT
#
# `PayoutAccountVerifyView` marquait le compte verifie... et s'arretait la.
# Le numero restait dans `apps.accounts` et n'atteignait JAMAIS le
# `PayeeAccount` du module financier.
#
# Consequence : un partenaire pouvait verifier son numero depuis l'interface
# et rester bloque au versement avec « Aucun numero Mobile Money
# enregistre ». Il fallait le saisir en ligne de commande.
#
# ─────────────────────────────────────────────────────────────────────────────
# POURQUOI DEUX MODELES COHABITENT
#
# `PayoutAccount` gere la VERIFICATION : envoi du code, expiration, essais.
# `PayeeAccount` gere le VERSEMENT : chiffrement, empreinte, refroidissement
# de 72 h apres changement.
#
# Les fusionner melangerait deux responsabilites. Ce pont les relie : un
# numero verifie d'un cote devient un numero payable de l'autre.
# ─────────────────────────────────────────────────────────────────────────────

from __future__ import annotations

import logging

logger = logging.getLogger("apps.payments.bridge.payout_accounts")

#: Le vocabulaire differe d'un modele a l'autre.
OPERATEURS = {
    "MTN": "MTN",
    "MTN_MOMO": "MTN",
    "ORANGE": "ORANGE",
    "ORANGE_MONEY": "ORANGE",
}


def _compte_financier(user, owner_role: str):
    """
    Trouve le compte financier correspondant au role declare.

    On ne DEVINE pas : le role vient du compte de versement lui-meme. Un
    utilisateur peut etre a la fois vendeur et gerant de relais.
    """
    from apps.payments.bridge.actors import (
        payee_for_delivery_company, payee_for_relay_point, payee_for_vendor,
    )

    if owner_role == "VENDOR":
        from apps.vendors.models import VendorProfile

        profil = VendorProfile.objects.filter(user=user).first()
        return payee_for_vendor(profil, create=True) if profil else None

    if owner_role == "RELAY_POINT":
        from apps.accounts.models import RelayPointProfile

        profil = RelayPointProfile.objects.filter(user=user).first()
        return payee_for_relay_point(profil, create=True) if profil else None

    if owner_role == "DELIVERY_ORGANIZATION":
        profil = getattr(user, "delivery_organization_profile", None)
        return payee_for_delivery_company(profil, create=True) if profil else None

    if owner_role == "COURIER":
        # Un livreur est paye par SON ORGANISATION, pas par BelivaY. Son
        # numero ne concerne donc pas le module financier.
        return None

    return None


def sync_verified_account(payout_account) -> bool:
    """
    Reporte un numero verifie sur le compte financier du partenaire.

    Retourne True si le report a eu lieu. N'echoue JAMAIS bruyamment : une
    verification reussie ne doit pas etre annulee parce que le report a
    rate — le partenaire a fait sa part.
    """
    try:
        user = payout_account.user
        compte = _compte_financier(user, payout_account.owner_role)
        if compte is None:
            logger.info(
                "Aucun compte financier pour %s (%s) : report ignore.",
                user.username, payout_account.owner_role,
            )
            return False

        operateur = OPERATEURS.get(
            (payout_account.operator or "").upper(), "")
        if not operateur:
            logger.warning(
                "Operateur inconnu « %s » pour %s : report impossible.",
                payout_account.operator, user.username,
            )
            return False

        numero = (payout_account.phone_e164 or "").lstrip("+")
        if not numero:
            return False

        # ─────────────────────────────────────────────────────────────────
        # LE REFROIDISSEMENT NE SE DECLENCHE PAS SANS CHANGEMENT
        #
        # `set_momo_number` pose un delai de securite de 72 h a chaque
        # appel. Reporter un numero IDENTIQUE bloquerait donc les
        # versements pendant trois jours, sans raison.
        #
        # On compare avant d'ecrire.
        # ─────────────────────────────────────────────────────────────────
        if compte.momo_number == numero and compte.momo_operator == operateur:
            logger.debug("Numero inchange pour %s : rien a reporter.",
                         compte.payee_code)
            return False

        compte.set_momo_number(numero, operateur)
        compte.save(update_fields=[
            "momo_number_enc", "momo_number_masked", "momo_fingerprint",
            "momo_operator", "momo_changed_at", "updated_at",
        ])
        logger.info(
            "Numero de versement reporte sur %s (%s) depuis le compte "
            "verifie #%s.",
            compte.payee_code, compte.momo_number_masked, payout_account.pk,
        )
        return True

    except Exception:
        logger.exception(
            "Report du numero verifie impossible pour le compte #%s. "
            "La verification reste valide ; a rattraper.",
            getattr(payout_account, "pk", "?"),
        )
        return False