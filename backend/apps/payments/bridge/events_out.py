# backend/apps/payments/bridge/events_out.py
# Miroir de l'etat financier vers le modele metier.
#
# ─────────────────────────────────────────────────────────────────────────────
# LE PROBLEME QUE CE FICHIER RESOUT
#
# `Order` porte deja sa propre machine d'escrow :
#     escrow_status : PENDING · BLOCKED · RELEASE_PENDING · RELEASED · REFUNDED
#
# Le nouveau module porte `EscrowHold.status`. Sans coordination, il y aurait
# DEUX VERITES sur « l'argent est-il libere ? ». Elles divergeraient, et c'est
# la mauvaise qui deciderait parfois du versement.
#
# ─────────────────────────────────────────────────────────────────────────────
# LA REGLE, SANS AMBIGUITE
#
#   EscrowHold DECIDE.  Order.escrow_status REFLETE.
#
# Le champ metier devient un MIROIR EN LECTURE : il conserve le frontend
# existant fonctionnel sans modification, pendant que la decision migre vers
# le module financier.
#
# C'est le principe expand-then-contract : les deux representations
# coexistent, on peut comparer leurs verdicts sur des donnees reelles, et
# l'ancienne est retiree au Lot 18 — pas avant.
#
# CONSEQUENCE OPERATIONNELLE
#   Les methodes Order.buyer_confirm(), auto_confirm(), release_to_vendor()
#   ne doivent plus etre appelees pour PILOTER l'escrow. Elles restent
#   utilisables pour le seul `fulfillment_status`, qui est bien un fait
#   logistique et releve du domaine metier.
# ─────────────────────────────────────────────────────────────────────────────

from __future__ import annotations

import logging

logger = logging.getLogger("apps.payments.mirror")

#: EscrowHold.status  ->  (Order.escrow_status, Order.fulfillment_status | None)
#: None signifie : ne pas toucher au statut logistique, qui appartient au
#: domaine metier (principe P9).
MAPPING = {
    "PENDING": ("PENDING", None),
    "HELD": ("BLOCKED", "PAID_IN_ESCROW"),
    "RELEASE_SCHEDULED": ("RELEASE_PENDING", None),
    "RELEASED": ("RELEASED", "RELEASED_TO_VENDOR"),
    "FROZEN": ("BLOCKED", "DISPUTED"),
    "REFUNDED": ("REFUNDED", "REFUNDED"),
    "PARTIALLY_REFUNDED": ("PARTIAL_REFUNDED", None),
    "CANCELLED": ("PENDING", "CANCELLED"),
}


def mirror_hold(hold) -> bool:
    """
    Reporte l'etat d'un sequestre sur la commande correspondante.

    Ne concerne que les sequestres de NIVEAU COMMANDE : le transport est de
    niveau paiement et n'a pas de commande a refleter.

    Ne leve JAMAIS : un miroir en echec ne doit pas annuler une liberation
    de sequestre. L'incident est journalise, la reconciliation le verra.
    """
    if hold.order_id is None:
        return False

    correspondance = MAPPING.get(str(hold.status))
    if correspondance is None:
        return False
    escrow, fulfillment = correspondance

    try:
        from apps.orders.models import Order

        champs = {"escrow_status": escrow}

        # On n'ecrase JAMAIS un statut logistique plus avance : le domaine
        # metier reste maitre de fulfillment_status (principe P9).
        if fulfillment:
            commande = Order.objects.filter(pk=hold.order_id).only(
                "fulfillment_status").first()
            if commande is None:
                return False
            if _peut_avancer(commande.fulfillment_status, fulfillment):
                champs["fulfillment_status"] = fulfillment

        modifiees = Order.objects.filter(pk=hold.order_id).update(**champs)
        return bool(modifiees)

    except Exception:
        logger.exception(
            "Miroir impossible pour le sequestre %s vers la commande #%s. "
            "La liberation reste valide ; la reconciliation le verra.",
            hold.reference, hold.order_id,
        )
        return False


#: Etats logistiques finaux : on ne revient jamais en arriere dessus.
TERMINAUX = {"RELEASED_TO_VENDOR", "CANCELLED", "REFUNDED"}


def _peut_avancer(actuel: str, cible: str) -> bool:
    if actuel == cible:
        return False
    if actuel in TERMINAUX:
        return False
    # DISPUTED prime sur tout sauf un etat terminal : un litige doit rester
    # visible tant qu'il n'est pas tranche.
    if actuel == "DISPUTED" and cible not in TERMINAUX:
        return False
    return True


def mirror_payment_confirmed(intent) -> int:
    """
    Passe les commandes couvertes en PAID a la confirmation de l'encaissement.

    Appelee apres la materialisation des sequestres : le paiement est
    confirme, les fonds sont sous sequestre.
    """
    try:
        from apps.orders.models import Order

        from .intent_orders import orders_for_intent

        commandes = list(orders_for_intent(intent))
        if not commandes:
            return 0

        modifiees = Order.objects.filter(
            pk__in=[c.pk for c in commandes],
            payment_status=Order.PaymentStatus.PENDING,
        ).update(
            payment_status=Order.PaymentStatus.PAID,
            fulfillment_status=Order.FulfillmentStatus.PAID_IN_ESCROW,
            escrow_status=Order.EscrowStatus.BLOCKED,
        )
        return modifiees
    except Exception:
        logger.exception(
            "Miroir de confirmation impossible pour l'intention %s.",
            getattr(intent, "reference", "?"),
        )
        return 0


def compare_states(order_id: int) -> dict:
    """
    Compare les deux representations pour une commande.

    Outil de la periode de coexistence : tant que les deux systemes tournent,
    une divergence doit se voir AVANT de couter de l'argent.
    """
    from apps.orders.models import Order
    from apps.payments.escrow.models import EscrowHold

    commande = Order.objects.filter(pk=order_id).first()
    if commande is None:
        return {"error": f"Commande #{order_id} introuvable."}

    holds = list(EscrowHold.objects.filter(
        order_id=order_id, component=EscrowHold.Component.GOODS))
    if not holds:
        return {
            "order_id": order_id,
            "order_escrow_status": commande.escrow_status,
            "hold_status": None,
            "aligned": None,
            "note": "Aucun sequestre : commande anterieure au nouveau module.",
        }

    hold = holds[0]
    attendu = MAPPING.get(str(hold.status), (None, None))[0]
    aligne = commande.escrow_status == attendu

    return {
        "order_id": order_id,
        "order_escrow_status": commande.escrow_status,
        "hold_reference": hold.reference,
        "hold_status": hold.status,
        "expected_order_status": attendu,
        "aligned": aligne,
        "note": ("Les deux representations concordent." if aligne else
                 "DIVERGENCE : le sequestre fait foi, la commande est "
                 "desynchronisee. Verifier que le miroir s'execute."),
    }


def compare_all(limit: int = 500) -> dict:
    """Balaie les commandes et compte les divergences."""
    from apps.payments.escrow.models import EscrowHold

    identifiants = (
        EscrowHold.objects
        .filter(component=EscrowHold.Component.GOODS, order_id__isnull=False)
        .values_list("order_id", flat=True).distinct()[:limit]
    )
    divergences = []
    verifiees = 0
    for identifiant in identifiants:
        resultat = compare_states(identifiant)
        verifiees += 1
        if resultat.get("aligned") is False:
            divergences.append(resultat)

    if divergences:
        logger.warning(
            "%s commande(s) desynchronisee(s) entre Order.escrow_status et "
            "EscrowHold. Le sequestre fait foi.", len(divergences),
        )
    return {
        "checked": verifiees,
        "diverged": len(divergences),
        "details": divergences[:20],
    }