# backend/apps/payments/bridge/porte.py
# Refus d'un colis conforme à la porte, côté argent — spec v2.1, R85.2 : le colis repart au vendeur ; le client
# récupère rembourse = max(0 ; arrondi(produits − couv_concernee − r_refus_sup)) ; la livraison payée et les frais
# Mobile Money ne sont pas rendus (R72.2). Le vendeur n'est pas payé : il récupère son produit.
#
# Une écriture, sans argent nouveau (I8 tenu) :
#   DEBIT  2010  net des séquestres du vendeur (clos)
#   CREDIT 2010  ce qui revient au client : séquestre du client, gelé, vidé par une demande approuvée par un tiers
#   CREDIT 4010  le reste (r_refus_sup, part de la livraison offerte), ou DEBIT 4010 s'il manque
# Hors du chemin sûr : rien n'est écrit, le séquestre du vendeur est gelé et l'équipe le règle à la main.

from django.db import transaction

from .bascule import HorsCheminSur, _nouveau_sequestre


def rendre_au_client(order, vendeur_user, montant_client: int, motif: str) -> dict:
    from apps.payments.escrow.models import EscrowHold
    from apps.payments.escrow.services import freeze_hold
    from apps.payments.ledger import chart_of_accounts as coa
    from apps.payments.ledger.models import LedgerTransaction
    from apps.payments.ledger.posting import credit, debit, post
    from apps.payments.settlements.models import Refund
    from apps.payments.settlements.services import create_refund

    from .actors import payee_for_buyer, payee_for_vendor
    from .events_in import _demandeur_systeme
    from .remboursement_auto import intention_payee

    vendeur = payee_for_vendor(getattr(vendeur_user, "vendor_profile", None))
    try:
        with transaction.atomic():
            anciens = list(EscrowHold.objects.select_for_update().filter(
                order_id=order.pk, payee=vendeur, component="GOODS",
                status__in=[EscrowHold.Status.HELD, EscrowHold.Status.FROZEN]))
            intent = intention_payee(order)
            if not anciens or intent is None or any(h.intent_id != intent.pk for h in anciens):
                raise HorsCheminSur("séquestres introuvables ou sur plusieurs paiements")
            net = sum(h.payable_amount_xaf for h in anciens)
            montant_client = max(0, int(montant_client))
            for h in anciens:
                if h.status == EscrowHold.Status.HELD:
                    h.transition_to(EscrowHold.Status.FROZEN, save=False)
                h.transition_to(EscrowHold.Status.REFUNDED, save=False)
                h.refunded_amount_xaf = h.net_amount_xaf
                h.frozen_reason = motif[:500]
                h.save()
            client = (_nouveau_sequestre(intent, order.pk, payee_for_buyer(order.user, create=True), montant_client, 0,
                                         geler_motif=motif[:500]) if montant_client else None)
            lignes = [debit(coa.ESCROW_LIABILITY, net, label=f"Séquestre du vendeur clos (R85.2) #{order.pk}")]
            if client:
                lignes.append(credit(coa.ESCROW_LIABILITY, montant_client, label=f"Dû au client {client.reference}"))
            reste = net - montant_client
            if reste > 0:
                lignes.append(credit(coa.REVENUE_COMMISSION, reste, label="Supplément de refus et livraison (R85.2)"))
            elif reste < 0:
                lignes.append(debit(coa.REVENUE_COMMISSION, -reste, label="Complément rendu au client (R85.2)"))
            post(kind=LedgerTransaction.Kind.ADJUSTMENT, lines=lignes, description=motif[:500],
                 source_type="Order", source_ref=str(order.pk), correlation_id=intent.correlation_id,
                 created_by_label="bridge.porte.rendre_au_client")
            reference = None
            if client:
                reference = create_refund(intent, amount_xaf=montant_client, reason=Refund.Reason.CANCELLATION,
                                          requested_by=_demandeur_systeme(), holds=[client], detail=motif).reference
            return {"ok": True, "remboursement": reference}
    except HorsCheminSur as exc:
        for h in EscrowHold.objects.filter(order_id=order.pk, payee=vendeur, component="GOODS",
                                           status=EscrowHold.Status.HELD):
            freeze_hold(h, reason=f"{motif} À régler à la main : {exc}")
        return {"ok": False, "remboursement": None, "raison": str(exc)}
