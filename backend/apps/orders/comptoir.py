# backend/apps/orders/comptoir.py
# Paiement par Mobile Money au comptoir du relais — feuille de route D14 ; spec v2.1, BV-DEV-01 :
#
#   R42.1  seulement SI mode = relais
#   R42.2  plafond de st : r_cpt_nouveau SI nb_livrees = 0 ; r_cpt_confirme SI nb_sans_incident ≥ r_cpt_confirme_cmd ;
#          SINON r_cpt_panier (une commande sans incident : livrée et retirée sans refus, sans absence, sans litige
#          perdu par le client)
#   R42.3  avance = frais_client + (r_relais SI couverture > 0), payée par Mobile Money à la commande
#   R42.4  au_comptoir = st + frais_client − avance, payé par Mobile Money au relais, jamais en espèces ; la commande
#          reste « Validée » et le code de retrait invisible jusqu'à ce paiement
#   R42.5  refus au comptoir : avance gardée, nb_refus + 1 ;  R42.6  nb_refus ≥ r_cpt_refus_max : tout d'avance
#   R42.7  jamais pour la diaspora (après le lancement) ;  R42.8  codes de refus, dans cet ordre
#   R39.3  colis à payer au comptoir non retiré : compté comme un refus
#
# Les montants et les refus sont ceux du moteur (regles.moteur().comptoir) ; ici, les compteurs du client.

import logging

from django.utils import timezone

logger = logging.getLogger("apps.orders")

LIVREES = ("DELIVERED", "BUYER_CONFIRMED", "AUTO_CONFIRMED", "RELEASED_TO_VENDOR")
MESSAGES = {
    "comptoir_mode": "Le paiement au comptoir n'existe que pour un retrait au point relais.",
    "comptoir_interdit": "Le paiement au comptoir n'est pas proposé pour cette commande.",
    "comptoir_refus": "Après tes refus au comptoir, la commande se paie d'avance.",
    "comptoir_plafond": "Au comptoir, le panier ne peut pas dépasser {plafond} F pour ton compte.",
}
REFUS_AU_COMPTOIR = "Refus au comptoir : le client n'a pas payé le reste (R42.5)."
NON_RETIRE = "Colis à payer au comptoir non retiré après la garde : compté comme un refus (R39.3)."


def compte(user) -> dict:
    """nb_livrees, nb_sans_incident, nb_refus du client (R42.2, R42.5), comptés depuis la création du compte."""
    from .models import Order

    if user is None or not getattr(user, "is_authenticated", False):
        return {"nb_livrees": 0, "nb_sans_incident": 0, "nb_refus": 0}
    commandes = Order.objects.filter(user=user)
    livrees = commandes.filter(fulfillment_status__in=LIVREES)
    sans_incident = (livrees.filter(comptoir_refuse_le__isnull=True)
                     .exclude(disputes__resolution="REJECTED")  # litige perdu par le client
                     .exclude(shipments__status="FAILED")       # absence, refus à la porte
                     .distinct())
    return {"nb_livrees": livrees.count(), "nb_sans_incident": sans_incident.count(),
            "nb_refus": commandes.filter(comptoir_refuse_le__isnull=False).count()}


def compter_refus(order) -> None:
    """R42.5, R39.3 : refus au comptoir (ou colis à payer non retiré) ; l'avance est gardée."""
    from .models import Order

    Order.objects.filter(pk=order.pk, comptoir_refuse_le__isnull=True).update(comptoir_refuse_le=timezone.now())


def annoncer_retrait(order, code: str, relais: str) -> bool:
    """Le colis est au relais. R42.4 : tant que le reste n'est pas payé au comptoir, le code de retrait reste invisible ;
    le client apprend seulement ce qu'il paiera au guichet. Sinon le code part par SMS (D7, R78.1) et en notification."""
    from apps.accounts.models import UserNotification

    from . import sms

    a_payer = order.payment_status == order.PaymentStatus.VALIDATED
    if a_payer:
        reste = int(order.reste_comptoir_xaf or 0) + int(order.frais_momo_comptoir_xaf or 0)
        titre = f"Colis au relais · {reste} F à payer au comptoir · commande #{order.pk}"
        message = (f"Votre commande est arrivée au point relais {relais}. Payez {reste} F par Mobile Money au comptoir : "
                   "le code de retrait vous sera envoyé aussitôt.")
    else:
        sms.code_retrait(order, code, relais)
        titre = f"Colis prêt au retrait · commande #{order.pk}"
        message = f"Votre commande est arrivée au point relais {relais}. Code de retrait : {code}."
    if order.user_id:
        UserNotification.objects.create(user=order.user, title=titre[:160], message=message,
                                        notification_type=UserNotification.NotificationType.ORDER,
                                        action_url=f"/orders/{order.pk}")
    return not a_payer


def refuser(order, colis, motif: str, actor=None) -> None:
    """R42.5 (refus au comptoir) et R39.3 (colis à payer non retiré) : refus compté, avance gardée, aucun remboursement,
    colis renvoyés au vendeur. Garde-fou : la part d'avance mise en séquestre pour un vendeur (r_relais d'une livraison
    offerte, R42.3) est gelée et l'équipe alertée ; elle ne part jamais seule au vendeur."""
    from apps.payments.escrow.models import EscrowHold
    from apps.payments.escrow.services import freeze_hold
    from apps.shipping.models import RelayParcel, ShipmentEvent

    from .bascule import _alerter
    from .models import Order

    compter_refus(order)
    now = timezone.now()
    for parcel in colis:
        parcel.status = RelayParcel.Status.RETURNED_TO_VENDOR
        parcel.returned_at = now
        parcel.proof_note = f"{parcel.proof_note}\n{motif}".strip()
        parcel.save(update_fields=["status", "returned_at", "proof_note", "updated_at"])
        ShipmentEvent.record(shipment=parcel.shipment, status=parcel.shipment.status, message=motif,
                             location=parcel.relay_point.name, actor=actor,
                             actor_role="RELAY_POINT" if actor else ShipmentEvent.ACTOR_ROLE_SYSTEM)
    Order.objects.filter(pk=order.pk).update(fulfillment_status=Order.FulfillmentStatus.CANCELLED)
    from . import flash

    flash.rendre(order)  # D9 : l'article repart au vendeur, son stock flash revient à la vente
    try:
        for hold in EscrowHold.objects.filter(order_id=order.pk, component=EscrowHold.Component.GOODS,
                                              status__in=[EscrowHold.Status.PENDING, EscrowHold.Status.HELD]):
            freeze_hold(hold, reason=f"R42.5 : avance gardée, à ne pas verser au vendeur. {motif}")
    except Exception:  # le module financier ne bloque jamais le refus ; l'alerte part quand même
        logger.exception("Séquestre de l'avance non gelé pour la commande #%s.", order.pk)
    _alerter(order, f"Refus au comptoir · commande #{order.pk}",
             f"{motif} Avance de {order.avance_xaf} F gardée (R42.5) ; colis renvoyé au vendeur.")
