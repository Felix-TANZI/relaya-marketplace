# backend/apps/whatsapp_assistant/conversation/customer.py
# Le client est prévenu à chaque étape de sa livraison, sans rien demander.
#
# Il était le seul des quatre acteurs à devoir écrire pour savoir où en était
# sa commande — alors que c'est lui qui a payé et qui attend.
#
# Quatre moments, un seul modèle Meta : le colis part de chez le vendeur, il
# arrive au point relais, le livreur est en route, c'est livré. Chaque moment
# n'est annoncé qu'une fois (contrainte d'unicité sur le colis et l'étape).

import logging

from apps.whatsapp_assistant.bridge import orders as orders_bridge
from apps.whatsapp_assistant.conf import get_config
from apps.whatsapp_assistant.message_templates import ORDER_UPDATE
from apps.whatsapp_assistant.models import CustomerNotification, WhatsAppContact
from apps.whatsapp_assistant.providers import get_provider

from .texts import t

logger = logging.getLogger("apps.whatsapp_assistant")

# Une livraison à domicile ne passe pas par un relais : l'étape « arrivé au
# point relais » ne la concerne pas.
RELAY_ONLY = ("at_relay",)


def notify_step(shipment_id: int, moment: str) -> None:
    """
    Appelée après validation en base, quand un colis franchit une étape.
    Un message raté ne doit jamais faire échouer une livraison.
    """
    config = get_config()
    if not (config.enabled and config.customer_notifications):
        return
    try:
        _notify(config, shipment_id, moment)
    except Exception:                                           # noqa: BLE001
        logger.exception("Notification client impossible pour le colis %s (%s).", shipment_id, moment)


def _notify(config, shipment_id: int, moment: str) -> None:
    step = orders_bridge.step_of(shipment_id)
    if step is None:
        return
    if moment in RELAY_ONLY and not step.to_relay:
        return                                          # le colis ne va pas en relais
    if moment == "at_relay" and not orders_bridge.has_relay_parcel(shipment_id):
        return
    if not step.wa_id:
        logger.info("Colis %s : le client n'a pas de numéro WhatsApp utilisable.", shipment_id)
        return

    recipient = config.customer_notify_override or step.wa_id
    contact, _ = WhatsAppContact.objects.get_or_create(wa_id=recipient)
    language = contact.language or "fr"

    notification, created = CustomerNotification.objects.get_or_create(
        kind=moment, shipment_id=shipment_id,
        defaults={"order_id": step.order_id, "recipient": recipient, "language": language},
    )
    if not created:
        return                                          # étape déjà annoncée

    record = _send(config, contact, language, step, moment)
    notification.provider_message_id = record.provider_message_id
    notification.error = record.error
    notification.save(update_fields=["provider_message_id", "error"])


def _send(config, contact, language: str, step, moment: str):
    from .outbox import send_template

    return send_template(
        get_provider(config), contact, ORDER_UPDATE, language,
        body_params=[step.reference, t(language, f"step_{moment}"), _place(language, step, moment)],
        button_payloads=[f"ord:{step.order_id}"],
        summary=t(language, "template_step", ref=step.reference),
    )


def _place(language: str, step, moment: str) -> str:
    """
    Où en est le colis, en une ligne. On annonce le créneau tant qu'il reste
    une promesse à tenir ; une fois livré, la destination suffit.
    """
    if moment == "delivered":
        return t(language, "step_place_relay" if step.to_relay else "step_place_home", place=step.place)
    if step.eta and moment != "at_relay":
        return t(language, "step_eta", eta=step.eta)
    return t(language, "step_place_relay" if step.to_relay else "step_place_home", place=step.place)
