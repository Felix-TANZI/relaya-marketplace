# backend/apps/payments/bridge/remboursement_auto.py
# Remboursement automatique sans retour du colis — feuille de route D32 ; spec v2.1 :
#
#   R71.3  paye par BelivaY ; le vendeur est paye normalement (son sequestre n'est pas touche)
#   R68.2  toujours sur le moyen de paiement d'origine : Mobile Money -> le numero qui a paye ;
#          Wallet -> le Wallet (R03.6)
#   R25.2  il n'est jamais repris sur les versements du vendeur
#
# Ecritures : DEBIT 5040 remboursements automatiques, CREDIT tresorerie PSP (ou 2050 pour le Wallet).
# La decision (R71.1, R71.2) est prise dans apps.orders.remboursement_auto ; ici, seulement l'argent.

import logging

from apps.payments.ledger import chart_of_accounts as coa
from apps.payments.ledger.models import LedgerTransaction
from apps.payments.ledger.posting import credit, debit, post

logger = logging.getLogger("apps.payments")


def intention_payee(order):
    """L'intention qui a paye les articles : le reste au comptoir s'il existe (R42.4), sinon l'unique intention."""
    from apps.payments.intents.models import PaymentIntent

    intents = PaymentIntent.objects.filter(order_links__order=order,
                                           status=PaymentIntent.Status.SUCCEEDED).order_by("-created_at")
    return next((i for i in intents if i.idempotency_key.endswith("-comptoir")), None) or intents.first()


def empreinte_payeur(order) -> str:
    intent = intention_payee(order)
    return intent.payer_msisdn_fingerprint if intent else ""


def verser(order, *, montant: int, reference: str) -> tuple[str, str]:
    """Rembourse `montant` au client, aux frais de BelivaY. Retourne (etat, reference du versement)."""
    from apps.payments.settlements.models import PayoutRequest
    from apps.payments.settlements.services import verser_a_un_client
    from apps.payments.wallet import services as wallet
    from apps.payments.wallet.models import MouvementPortefeuille

    intent = intention_payee(order)
    if intent is None:
        raise ValueError(f"Aucun paiement encaissé pour la commande #{order.pk}.")
    justification = f"Remboursement automatique {reference} (commande #{order.pk}) — R71"
    if intent.provider_code == wallet.PRESTATAIRE:
        from django.db import transaction

        with transaction.atomic():  # rien ne sort vers un prestataire : mouvement et écriture ensemble
            p = wallet.portefeuille_de(intent.buyer, verrou=True)
            wallet._mouvement(p, MouvementPortefeuille.Sorte.REMBOURSEMENT, reference, retirable=montant,
                              intent_reference=intent.reference, libelle="Remboursement automatique (R71)")
            post(kind=LedgerTransaction.Kind.REFUND,
                 lines=[debit(coa.EXPENSE_AUTO_REFUND, montant, label=justification),
                        credit(coa.WALLET_LIABILITY, montant, label="Credit du Wallet")],
                 description=justification, source_type="RemboursementAuto", source_ref=reference,
                 created_by_label="bridge.remboursement_auto.verser")
        return PayoutRequest.Status.PAID, ""
    # Sécurité avant main 2 : verser_a_un_client enregistre « en cours », envoie hors transaction, puis conclut.
    versement, etat = verser_a_un_client(
        user=intent.buyer, msisdn=intent.payer_msisdn, operator=intent.payer_operator or "",
        masque=intent.payer_msisdn_masked, montant=montant, reference=reference, justification=justification,
        debits=[debit(coa.EXPENSE_AUTO_REFUND, montant, label=justification)])
    return etat, versement.reference


def degeler(order) -> None:
    """R71.3 : le vendeur est paye normalement ; le sequestre gele a l'ouverture du litige reprend son cycle."""
    from . import events_in

    try:
        events_in.dispute_resolved(order_id=order.pk, resolution="DISMISSED",
                                   event_id=f"rembt-auto-{order.pk}", emitter="apps.orders.remboursement_auto")
    except Exception:
        logger.exception("Séquestre non dégelé après le remboursement automatique de la commande #%s.", order.pk)
