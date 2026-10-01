# backend/apps/whatsapp_assistant/conversation/outbox.py
# Tout envoi passe par ici : il est journalisé, et un échec n'interrompt jamais
# le traitement (Meta renverrait sinon le message du client).

import logging
from dataclasses import asdict

from apps.whatsapp_assistant.models import WhatsAppContact, WhatsAppMessage
from apps.whatsapp_assistant.providers import Button, ListSection, ProviderError, WhatsAppProvider

logger = logging.getLogger("apps.whatsapp_assistant")


def _deliver(contact: WhatsAppContact, message_type: str, text: str, payload: dict, send) -> WhatsAppMessage:
    record = WhatsAppMessage(
        contact=contact,
        direction=WhatsAppMessage.Direction.OUTBOUND,
        message_type=message_type,
        text=text,
        payload=payload,
    )
    try:
        record.provider_message_id = send() or ""
    except ProviderError as error:
        record.error = str(error)
        logger.warning("Envoi WhatsApp échoué vers +%s : %s", contact.wa_id, error)
    record.save()
    return record


def send_text(provider: WhatsAppProvider, contact: WhatsAppContact, text: str) -> WhatsAppMessage:
    return _deliver(contact, "text", text, {}, lambda: provider.send_text(contact.wa_id, text))


def send_buttons(
    provider: WhatsAppProvider, contact: WhatsAppContact, body: str, buttons: list[Button],
    image_id: str | None = None, footer: str = "",
) -> WhatsAppMessage:
    payload = {"buttons": [asdict(b) for b in buttons], "image_id": image_id, "footer": footer}
    return _deliver(
        contact, "buttons", body, payload,
        lambda: provider.send_buttons(contact.wa_id, body, buttons, image_id=image_id, footer=footer),
    )


def send_link_button(
    provider: WhatsAppProvider, contact: WhatsAppContact, body: str, button_text: str, url: str,
    image_id: str | None = None, footer: str = "",
) -> WhatsAppMessage:
    payload = {"button": button_text, "url": url, "image_id": image_id, "footer": footer}
    return _deliver(
        contact, "link", body, payload,
        lambda: provider.send_link_button(contact.wa_id, body, button_text, url, image_id=image_id, footer=footer),
    )


def send_image(
    provider: WhatsAppProvider, contact: WhatsAppContact, media_id: str, caption: str = "",
    message_type: str = "image", payload: dict | None = None,
) -> WhatsAppMessage:
    return _deliver(
        contact, message_type, caption, {"media_id": media_id, **(payload or {})},
        lambda: provider.send_image(contact.wa_id, media_id, caption),
    )


def send_template(
    provider: WhatsAppProvider, contact: WhatsAppContact, name: str, language: str,
    body_params: list[str], button_payloads: list[str] = (), summary: str = "",
) -> WhatsAppMessage:
    payload = {"template": name, "language": language, "params": list(body_params),
               "buttons": list(button_payloads)}
    return _deliver(
        contact, "template", summary or name, payload,
        lambda: provider.send_template(contact.wa_id, name, language, body_params, button_payloads),
    )


def send_location(
    provider: WhatsAppProvider, contact: WhatsAppContact, latitude: float, longitude: float,
    name: str = "", address: str = "",
) -> WhatsAppMessage:
    payload = {"latitude": float(latitude), "longitude": float(longitude), "address": address}
    return _deliver(
        contact, "location", name, payload,
        lambda: provider.send_location(contact.wa_id, latitude, longitude, name=name, address=address),
    )


def send_list(
    provider: WhatsAppProvider, contact: WhatsAppContact, body: str, button_label: str,
    sections: list[ListSection], header: str = "", footer: str = "",
) -> WhatsAppMessage:
    payload = {"button": button_label, "sections": [asdict(s) for s in sections], "header": header}
    return _deliver(
        contact, "list", body, payload,
        lambda: provider.send_list(contact.wa_id, body, button_label, sections, header=header, footer=footer),
    )
