# backend/apps/client_core/webhooks.py
# Point d'entrée unique pour les webhooks d'argent de relaya-marketplace (décision D9) : CamPay (Mobile Money) et le
# prestataire carte (retour 3-D Secure) connaissent seulement la référence de la demande. Dans
# payments/webhooks/receiver.py, une fois la signature vérifiée :
#
#     from apps.client_core.webhooks import confirmer_paiement_externe
#     confirmer_paiement_externe(reference, reussi=(statut == "SUCCESSFUL"), cause="solde")
#
# La fonction retrouve l'application du kit à qui appartient la référence et lui passe le résultat. Elle est
# idempotente (un webhook rejoué ne change rien) et rend le domaine traité, ou None si la référence n'est pas au kit
# (elle reste alors à vos propres traitements).
import logging
import re

from django.db import transaction

log = logging.getLogger("apps.client_core.webhooks")

# Références du kit : commande du panier « BLV-<commande>-<tentative> » (apps.cart.paiement._demander_paiement).
COMMANDE = re.compile(r"^BLV-(\d+)-\d+$")


def _commande(reference: str, reussi: bool, cause: str) -> str | None:
    m = COMMANDE.match(reference)
    if not m:
        return None
    from apps.cart import paiement
    from apps.pickup.models import MontantsCommande

    order_id = int(m.group(1))
    montants = MontantsCommande.objects.filter(order_id=order_id).first()
    if montants is None:
        return None
    if montants.etat_paiement != MontantsCommande.EtatPaiement.ATTENTE:
        return "commande"  # déjà confirmée ou abandonnée : webhook rejoué
    if reussi:
        paiement.confirmer_paiement(order_id)
    else:
        paiement.echouer_paiement(order_id, cause if cause in ("expire", "solde", "carte") else "solde")
    return "commande"


def _appel(module: str, fonction: str, *args, **kw):
    import importlib

    try:
        f = getattr(importlib.import_module(module), fonction)
    except (ImportError, AttributeError):  # application du kit pas installée
        return None
    return f(*args, **kw)


def confirmer_paiement_externe(reference: str, reussi: bool = True, cause: str = "solde") -> str | None:
    """Résultat d'un paiement externe → l'application du kit concernée. Rend « commande », « diaspora », « listes »,
    « modules », « recharge », « retrait », « abonnement », ou None (référence inconnue du kit)."""
    reference = str(reference or "").strip()
    if not reference:
        return None
    with transaction.atomic():
        domaine = _commande(reference, reussi, cause)
        if domaine:
            return domaine
        if _appel("apps.diaspora.services", "confirmer_paiement", reference, reussi=reussi):
            return "diaspora"
        if reussi and _appel("apps.wishlists.services", "confirmer_paiement", reference):
            return "listes"
        if reussi and _appel("apps.extras.services", "confirmer_paiement", reference):
            return "modules"
        if _appel("apps.wallet.services", "confirmer_recharge", reference, reussi=reussi) is not None:
            return "recharge"
        if _appel("apps.wallet.services", "confirmer_retrait", reference, reussi=reussi) is not None:
            return "retrait"
        if _appel("apps.subscriptions.services", "confirmer_prelevement", reference, reussi=reussi) is not None:
            return "abonnement"
        if _appel("apps.subscriptions.services", "confirmer_cadeau", reference, reussi=reussi) is not None:
            return "abonnement"
    log.info("webhook : référence %s inconnue du kit", reference[:40])
    return None
