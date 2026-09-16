# backend/apps/whatsapp_assistant/inbox.py
# Réception d'un message : on enregistre le contact et le message (une seule
# fois, même si Meta renvoie le webhook), puis on passe la main au cerveau.

import logging

from django.db import IntegrityError, transaction
from django.utils import timezone

from .conversation.engine import handle_message
from .models import WhatsAppContact, WhatsAppMessage
from .providers import IncomingMessage, ProviderError, WhatsAppProvider

logger = logging.getLogger("apps.whatsapp_assistant")


def receive(message: IncomingMessage, provider: WhatsAppProvider) -> bool:
    """Traite un message reçu. Renvoie False s'il avait déjà été traité (doublon)."""
    contact, _ = WhatsAppContact.objects.get_or_create(wa_id=message.wa_id)
    contact.last_inbound_at = timezone.now()
    if message.profile_name:
        contact.profile_name = message.profile_name
    contact.save(update_fields=["last_inbound_at", "profile_name"])

    try:
        with transaction.atomic():
            WhatsAppMessage.objects.create(
                contact=contact,
                direction=WhatsAppMessage.Direction.INBOUND,
                provider_message_id=message.message_id,
                message_type=message.type,
                text=message.text,
                payload=message.raw,
            )
    except IntegrityError:
        logger.info("Message WhatsApp %s déjà traité : ignoré.", message.message_id)
        return False

    try:
        provider.mark_as_read(message.message_id)
    except ProviderError as error:
        logger.info("Accusé de lecture non envoyé : %s", error)

    handle_message(contact, message, provider)
    return True
