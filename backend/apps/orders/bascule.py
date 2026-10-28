# backend/apps/orders/bascule.py
# Bascule vers un autre vendeur — feuille de route D8 : « Basculer automatiquement vers le vendeur suivant en cas de
# rupture, de lenteur ou de refus. » Spec v2.1, BV-DEV-02 :
#
#   R35.1  déclencheurs : bouton « Rupture », echeance dépassée (R44.2), refus du vendeur
#   R35.2  remplaçante choisie par le moteur (apps.orders.reassignment.find_reassignment_candidate)
#   R35.3  le client paie toujours le prix payé ; remplaçante moins chère : la différence lui est remboursée
#   R35.4  sans remplaçante : remboursement intégral le jour même
#   R35.5  la commission de la remplaçante se calcule sur son propre prix (R13)
#
# Argent (garde-fous) : le séquestre du vendeur défaillant est GELÉ dès la bascule, il ne peut plus jamais lui être
# versé ; sa réattribution à la remplaçante est l'objet de l'étape « argent » (R35.3, R25.2). Un remboursement passe
# toujours par une demande approuvée par un tiers (payments.settlements.create_refund).

import logging

from django.contrib.auth.models import User
from django.db import transaction
from django.utils import timezone

from apps.accounts.models import UserNotification
from apps.regles import services as regles
from apps.shipping.models import Shipment, ShipmentEvent

logger = logging.getLogger("apps.orders")

RUPTURE = "rupture"
ECHEANCE = "echeance"
REFUS = "refus"
MOTIFS = {
    RUPTURE: "Rupture signalée par le vendeur (R35.1).",
    ECHEANCE: "Échéance du vendeur dépassée (R35.1, R44.2).",
    REFUS: "Commande refusée par le vendeur (R35.1).",
}


def declencher(order, vendeur_user, motif: str) -> dict:
    """Bascule chaque article de ce vendeur (R35.1) ; rembourse ceux qui n'ont pas de remplaçante (R35.4)."""
    from .reassignment import find_reassignment_candidate

    texte = MOTIFS[motif]
    remplaces, sans = [], []
    for item in order.items.select_related("product__vendor", "product__master").filter(product__vendor=vendeur_user):
        remplacante = find_reassignment_candidate(item)
        if remplacante is not None:
            basculer(item, remplacante, texte)
            remplaces.append(item)
        else:
            sans.append(item)
    if sans:
        sans_remplacante(order, vendeur_user, sans, texte)
    return {"remplaces": len(remplaces), "rembourses": len(sans)}


@transaction.atomic
def basculer(order_item, remplacante, motif: str) -> None:
    """Passe l'article sur la remplaçante : nouveau colis, échéance et commission propres ; le client garde son prix."""
    order = order_item.order
    ancien = order_item.product
    prix_paye = order_item.price_xaf_snapshot

    # R35.3 : le client paie toujours le prix payé ; seuls l'offre et son libellé changent.
    order_item.product = remplacante
    order_item.title_snapshot = remplacante.title
    order_item.save(update_fields=["product", "title_snapshot"])

    for colis in Shipment.objects.filter(order=order, vendor=ancien.vendor).exclude(status=Shipment.Status.CANCELLED):
        colis.status = Shipment.Status.CANCELLED
        colis.save(update_fields=["status", "updated_at"])
        ShipmentEvent.record(shipment=colis, status=Shipment.Status.CANCELLED,
                             message=f"Bascule vers un autre vendeur. {motif}", location=order.city,
                             actor_role=ShipmentEvent.ACTOR_ROLE_SYSTEM)
    nouveau = (Shipment.objects.filter(order=order, vendor=remplacante.vendor).exclude(status=Shipment.Status.CANCELLED)
               .first() or Shipment.objects.create(order=order, vendor=remplacante.vendor, status=Shipment.Status.CREATED))
    _echeance(nouveau, remplacante.vendor)                                                       # A3 pour la remplaçante
    ShipmentEvent.record(shipment=nouveau, status=nouveau.status,
                         message="Colis créé par bascule vers un autre vendeur (R35).", location=order.city,
                         actor_role=ShipmentEvent.ACTOR_ROLE_SYSTEM)

    _commission_de_la_remplacante(order, ancien.vendor, remplacante, order_item.qty)              # R35.5
    _geler_le_sequestre(order, ancien.vendor, motif)                                              # garde-fou

    if order.user_id:
        UserNotification.objects.create(
            user=order.user, title=f"Article remplacé · commande #{order.id}",
            message=(f"Le vendeur de « {ancien.title} » ne peut pas honorer la commande. Un autre vendeur prend le "
                     "relais : même produit, même état, et tu paies toujours le même prix."),
            notification_type=UserNotification.NotificationType.ORDER, action_url=f"/orders/{order.id}",
        )
    ecart = (prix_paye - remplacante.price_xaf) * order_item.qty
    _alerter(order, f"Bascule sur la commande #{order.id}",
             f"« {ancien.title} » passe au vendeur {remplacante.vendor}. {motif} Séquestre du vendeur défaillant gelé : "
             f"à réattribuer au remplaçant (R35.3, R35.5)."
             + (f" Remplaçante moins chère : {ecart} F à rembourser au client (R35.3)." if ecart > 0 else ""))


def sans_remplacante(order, vendeur_user, items, motif: str) -> None:
    """R35.4 : pas de remplaçante ; le colis du vendeur est annulé et le client remboursé le jour même (demande de
    remboursement créée tout de suite, approuvée par un tiers avant que l'argent ne sorte)."""
    montant = sum(i.line_total_xaf for i in items)
    with transaction.atomic():
        for colis in Shipment.objects.filter(order=order, vendor=vendeur_user).exclude(status=Shipment.Status.CANCELLED):
            colis.status = Shipment.Status.CANCELLED
            colis.save(update_fields=["status", "updated_at"])
            ShipmentEvent.record(shipment=colis, status=Shipment.Status.CANCELLED,
                                 message=f"Aucun vendeur ne peut remplacer. {motif}", location=order.city,
                                 actor_role=ShipmentEvent.ACTOR_ROLE_SYSTEM)
        reste = Shipment.objects.filter(order=order).exclude(status=Shipment.Status.CANCELLED).exists()
        if not reste:
            order.fulfillment_status = order.FulfillmentStatus.CANCELLED
            order.cancellation_reason = order.CancellationReason.STOCKOUT
            order.cancelled_at = timezone.now()
            order.save(update_fields=["fulfillment_status", "cancellation_reason", "cancelled_at"])
            montant = order.total_a_payer_xaf or order.total_xaf  # R35.4 : remboursement intégral
    demande = _demander_le_remboursement(order, vendeur_user, montant, motif) if order.is_paid else None

    from .models import OrderHistory

    OrderHistory.objects.create(order=order, action=f"Sans remplaçant : {montant} F à rembourser (R35.4). {motif}",
                                field_name="fulfillment_status", old_value="", new_value=order.fulfillment_status)
    if order.user_id:
        UserNotification.objects.create(
            user=order.user, title=f"Article indisponible · commande #{order.id}",
            message=(f"Aucun vendeur ne peut fournir {', '.join(i.title_snapshot for i in items)}. Tu es remboursé "
                     f"de {montant} F sur ton moyen de paiement."),
            notification_type=UserNotification.NotificationType.ORDER, action_url=f"/orders/{order.id}",
        )
    _alerter(order, f"Remboursement à approuver aujourd'hui · commande #{order.id}",
             f"{motif} Aucun remplaçant (R35.2) : {montant} F à rembourser le jour même (R35.4)."
             + (f" Demande {demande} en attente d'approbation." if demande else " Demande à créer à la main."))


# ── Outils ─────────────────────────────────────────────────────────────────────────────────────────────


def _echeance(colis, vendeur) -> None:
    from .delais import pret_et_echeance

    r = pret_et_echeance(timezone.now(), regles.reglage("r_prep_h"), vendeur)
    Shipment.objects.filter(pk=colis.pk).update(pret_prevu=r["pret"], echeance_vendeur=r["echeance"])


def _commission_de_la_remplacante(order, ancien_vendeur, remplacante, qty) -> None:
    """R35.5 : commission sur le prix de la remplaçante, même part de livraison offerte (R14.3) que l'ancien vendeur ;
    le contrôle de rentabilité (A8) de la commande d'origine ne s'applique pas à la bascule."""
    from .commission import decouverte, palier_vendeur
    from .models import CommissionSousCommande

    ancienne = CommissionSousCommande.objects.filter(order=order, vendor=ancien_vendeur).first()
    couv_b = ancienne.couv_b if ancienne else "0"
    from fractions import Fraction

    fiche = remplacante.master
    if fiche is None or not fiche.univers:  # fiche incomplète (R16.1) : pas de barème, la finance tranche
        _alerter(order, f"Commission de la remplaçante à fixer · commande #{order.id}",
                 f"La fiche de « {remplacante.title} » n'a pas d'univers (R16.1) : commission R35.5 non calculée.")
        return
    articles = [dict(prix_i=remplacante.price_xaf, q_i=qty, univers_i=fiche.univers, mic_i=fiche.made_in_cameroon)]
    palier, dec = palier_vendeur(remplacante.vendor), decouverte(remplacante.vendor)
    r = regles.moteur().commission(articles, palier, dec, Fraction(couv_b))
    CommissionSousCommande.objects.update_or_create(
        order=order, vendor=remplacante.vendor,
        defaults=dict(st_b=r["st_b"], commission_b=r["commission_b"], tva_b=r["tva_b"], net_b=r["net_b"],
                      bareme_b=r["bareme_b_exact"], plancher_retenu=r["plancher_retenu"], couv_b=couv_b, palier=palier,
                      decouverte=dec, articles=articles, reglages=ancienne.reglages if ancienne else ""),
    )
    if ancienne is not None and not order.items.filter(product__vendor=ancien_vendeur).exists():
        ancienne.delete()  # le vendeur défaillant n'a plus rien dans cette commande


def _geler_le_sequestre(order, vendeur_user, motif: str) -> None:
    """Garde-fou : la marchandise du vendeur défaillant ne lui sera jamais versée."""
    try:
        from apps.payments.bridge.actors import payee_for_vendor
        from apps.payments.escrow.models import EscrowHold
        from apps.payments.escrow.services import freeze_hold

        profil = getattr(vendeur_user, "vendor_profile", None)
        payee = payee_for_vendor(profil) if profil is not None else None
        if payee is None:
            return
        for hold in EscrowHold.objects.filter(order_id=order.pk, payee=payee, component=EscrowHold.Component.GOODS,
                                              status__in=[EscrowHold.Status.PENDING, EscrowHold.Status.HELD]):
            freeze_hold(hold, reason=f"Bascule R35 : à réattribuer au remplaçant. {motif}")
    except Exception:  # le module financier ne bloque jamais la bascule ; l'alerte part quand même
        logger.exception("Séquestre non gelé pour la commande #%s.", order.pk)


def _demander_le_remboursement(order, vendeur_user, montant: int, motif: str) -> str | None:
    try:
        from apps.payments.bridge.actors import payee_for_vendor
        from apps.payments.bridge.events_in import _demandeur_systeme
        from apps.payments.bridge.intent_orders import intent_for_order
        from apps.payments.escrow.models import EscrowHold
        from apps.payments.escrow.services import cancel_hold
        from apps.payments.settlements.models import Refund
        from apps.payments.settlements.services import create_refund

        intent = intent_for_order(order)
        if intent is None or montant <= 0:
            return None
        profil = getattr(vendeur_user, "vendor_profile", None)
        payee = payee_for_vendor(profil) if profil is not None else None
        holds = []
        for hold in EscrowHold.objects.filter(order_id=order.pk, payee=payee, component=EscrowHold.Component.GOODS):
            holds.append(cancel_hold(hold, reason=f"Sans remplaçant (R35.4). {motif}"))
        demande = create_refund(intent, amount_xaf=montant, reason=Refund.Reason.CANCELLATION,
                                requested_by=_demandeur_systeme(), holds=holds or None,
                                detail=f"R35.4 : aucun remplaçant sur la commande #{order.pk}. {motif}")
        return demande.reference
    except Exception:
        logger.exception("Remboursement R35.4 non créé pour la commande #%s.", order.pk)
        return None


def _alerter(order, titre: str, message: str) -> None:
    for admin in User.objects.filter(is_staff=True, is_active=True):
        UserNotification.objects.create(user=admin, title=titre[:160], message=message,
                                        notification_type=UserNotification.NotificationType.SYSTEM,
                                        action_url=f"/admin/operations/orders/{order.id}")
