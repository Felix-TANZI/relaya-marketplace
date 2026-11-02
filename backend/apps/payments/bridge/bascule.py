# backend/apps/payments/bridge/bascule.py
# Bascule vers un autre vendeur, côté argent — spec v2.1 :
#
#   R35.3  le client paie toujours le prix payé ; remplaçant moins cher : la différence est remboursée au client ;
#          remplaçant plus cher : BelivaY avance l'écart et le reprend sur les versements du vendeur défaillant (R25.2)
#   R35.4  sans remplaçant : l'article est remboursé
#   R35.5  le remplaçant est versé comme pour toute commande, sur sa commission propre (R13)
#
# Le séquestre du vendeur défaillant est RÉATTRIBUÉ en une seule écriture, sans argent nouveau :
#
#   DEBIT  2010  net des séquestres du vendeur défaillant (clos)
#   DEBIT  4010  sa commission (le produit n'est plus acquis)
#   DEBIT  4010  avance de BelivaY quand un remplaçant est plus cher (reprise ensuite : créance R25.2)
#   CREDIT 2010  net de chaque remplaçant (nouveau séquestre, versé comme toute commande)
#   CREDIT 4010  commission de chaque remplaçant
#   CREDIT 2010  ce qui revient au client (différence R35.3, articles sans remplaçant R35.4) : séquestre du client,
#                gelé, que la demande de remboursement vide
#
# L'équation I8 (2010 = séquestres immobilisants) reste vraie à chaque étape. Tout cas hors du chemin sûr (commande à
# payer au comptoir, montants qui ne collent pas, séquestre déjà existant pour un bénéficiaire) n'écrit rien et rend
# la main : la bascule garde alors le garde-fou d'origine (séquestre gelé, alerte).

import logging
from datetime import timedelta

from django.db import transaction
from django.utils import timezone

logger = logging.getLogger("apps.payments")


class HorsCheminSur(Exception):
    pass


def _nouveau_sequestre(intent, order_id, payee, gross, commission, geler_motif=""):
    from apps.payments.config.resolver import resolve_policy_for
    from apps.payments.escrow.models import EscrowHold

    if EscrowHold.objects.filter(intent=intent, order_id=order_id, payee=payee, component="GOODS").exists():
        raise HorsCheminSur(f"un séquestre existe déjà pour {payee.payee_code}")
    politique = resolve_policy_for(payee_type=payee.payee_type, component="GOODS")
    maintenant = timezone.now()
    hold = EscrowHold(intent=intent, order_id=order_id, payee=payee, component="GOODS", gross_amount_xaf=gross,
                      commission_xaf=commission, net_amount_xaf=gross - commission, currency="XAF",
                      status=EscrowHold.Status.PENDING, release_trigger=politique.release_trigger.value,
                      policy_snapshot=politique.as_snapshot())
    hold.full_clean(exclude=["reference"])
    hold.save()
    hold.transition_to(EscrowHold.Status.HELD, save=False)
    if politique.auto_confirm_hours:
        hold.auto_confirm_at = maintenant + timedelta(hours=politique.auto_confirm_hours)
    hold.dispute_window_ends_at = maintenant + timedelta(days=politique.dispute_window_days)
    if geler_motif:
        hold.transition_to(EscrowHold.Status.FROZEN, save=False)
        hold.frozen_reason = geler_motif
    hold.save()
    return hold


def reattribuer(order, ancien_vendeur, remplacements: list[dict], rembourses_xaf: int, frais_xaf: int,
                motif: str) -> dict:
    """
    `remplacements` : [{"paye": prix payé × qté, "vendeur": remplaçant (User), "prix": prix remplaçant × qté,
    "retenue": commission + TVA du remplaçant pour ces articles}] ; `rembourses_xaf` : prix payé des articles sans
    remplaçant ; `frais_xaf` : part des frais Mobile Money qui revient au client (R72.1).
    Retourne {"ok": bool, "remboursement": référence, "avance": F, "raison": str}.
    """
    from apps.orders.models import Order
    from apps.payments.escrow.models import EscrowHold
    from apps.payments.ledger import chart_of_accounts as coa
    from apps.payments.ledger.models import LedgerTransaction
    from apps.payments.ledger.posting import credit, debit, post
    from apps.payments.settlements.models import Adjustment, Refund
    from apps.payments.settlements.services import _systeme, create_adjustment, create_refund

    from .actors import payee_for_buyer, payee_for_vendor
    from .events_in import _demandeur_systeme
    from .remboursement_auto import intention_payee

    try:
        with transaction.atomic():
            if order.payment_status == Order.PaymentStatus.VALIDATED:
                raise HorsCheminSur("commande à payer au comptoir (R42.4)")
            ancien = payee_for_vendor(getattr(ancien_vendeur, "vendor_profile", None))
            anciens = list(EscrowHold.objects.select_for_update().filter(
                order_id=order.pk, payee=ancien, component="GOODS",
                status__in=[EscrowHold.Status.HELD, EscrowHold.Status.FROZEN]))
            paye = sum(r["paye"] for r in remplacements) + rembourses_xaf
            if not anciens or sum(h.gross_amount_xaf for h in anciens) != paye or any(
                    h.refunded_amount_xaf for h in anciens):
                raise HorsCheminSur("les séquestres du vendeur ne correspondent pas aux articles payés")
            intent = intention_payee(order)
            if intent is None or any(h.intent_id != intent.pk for h in anciens):
                raise HorsCheminSur("plusieurs paiements sur ces articles")

            net_ancien = sum(h.payable_amount_xaf for h in anciens)
            commission_ancienne = sum(h.commission_xaf for h in anciens)
            for h in anciens:  # clos : réattribué, plus rien à verser au vendeur défaillant
                if h.status == EscrowHold.Status.HELD:
                    h.transition_to(EscrowHold.Status.FROZEN, save=False)
                h.transition_to(EscrowHold.Status.REFUNDED, save=False)
                h.refunded_amount_xaf = h.net_amount_xaf
                h.frozen_reason = f"Réattribué par la bascule R35 : {motif}"[:500]
                h.save()

            par_vendeur, au_client, avance = {}, rembourses_xaf, 0
            for r in remplacements:
                ecart = r["paye"] - r["prix"]
                au_client += max(ecart, 0)                                       # R35.3 : moins cher, au client
                avance += max(-ecart, 0)                                         # R35.3 : plus cher, BelivaY avance
                v = par_vendeur.setdefault(r["vendeur"].pk, {"user": r["vendeur"], "gross": 0, "retenue": 0})
                v["gross"] += r["prix"]
                v["retenue"] += r["retenue"]
            nouveaux = [_nouveau_sequestre(intent, order.pk, payee_for_vendor(v["user"].vendor_profile, create=True),
                                           v["gross"], v["retenue"]) for v in par_vendeur.values()]
            client = (_nouveau_sequestre(intent, order.pk, payee_for_buyer(order.user, create=True), au_client, 0,
                                         geler_motif=f"Remboursement R35 : {motif}"[:500]) if au_client else None)

            lignes = [debit(coa.ESCROW_LIABILITY, net_ancien, label=f"Séquestre réattribué (R35) #{order.pk}")]
            if commission_ancienne:
                lignes.append(debit(coa.REVENUE_COMMISSION, commission_ancienne, label="Commission non acquise (R35)"))
            if avance:
                lignes.append(debit(coa.REVENUE_COMMISSION, avance, label="Avance de BelivaY (R35.3)"))
            for h in nouveaux:
                lignes.append(credit(coa.ESCROW_LIABILITY, h.net_amount_xaf, label=f"Séquestre du remplaçant {h.reference}"))
                if h.commission_xaf:
                    lignes.append(credit(coa.REVENUE_COMMISSION, h.commission_xaf, label="Commission du remplaçant (R35.5)"))
            if client:
                lignes.append(credit(coa.ESCROW_LIABILITY, au_client, label=f"Dû au client (R35.3, R35.4) {client.reference}"))
            post(kind=LedgerTransaction.Kind.ADJUSTMENT, lines=lignes,
                 description=f"Bascule R35 sur la commande #{order.pk} : séquestre réattribué. {motif}"[:500],
                 source_type="Order", source_ref=str(order.pk), correlation_id=intent.correlation_id,
                 created_by_label="bridge.bascule.reattribuer")

            reference = None
            if client:  # sortie d'argent : demande approuvée par un tiers, comme tout remboursement
                reference = create_refund(
                    intent, amount_xaf=au_client + frais_xaf, frais_momo_xaf=frais_xaf,
                    reason=Refund.Reason.CANCELLATION, requested_by=_demandeur_systeme(), holds=[client],
                    detail=f"R35.3/R35.4 : bascule sur la commande #{order.pk}. {motif}").reference
            if avance:  # R25.2 : l'avance est reprise sur les versements du vendeur défaillant
                create_adjustment(payee=ancien, direction=Adjustment.Direction.CREDIT,
                                  category=Adjustment.Category.REBILLING, amount_xaf=avance,
                                  reason=f"R35.3, R25.2 : écart avancé par BelivaY (commande #{order.pk})",
                                  created_by=_systeme(), source_order_id=order.pk,
                                  source_event=f"R35.3:commande-{order.pk}")
            return {"ok": True, "remboursement": reference, "avance": avance, "au_client": au_client, "raison": ""}
    except HorsCheminSur as exc:
        return {"ok": False, "remboursement": None, "avance": 0, "au_client": 0, "raison": str(exc)}
