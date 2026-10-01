# backend/apps/whatsapp_assistant/conversation/relay.py
# Le volet point relais : prévenir le gérant qu'un colis part vers lui, le
# laisser le réceptionner, puis le remettre au client.
#
# Identifiants des boutons (ils reviennent dans reply_id) :
#   rcv:<colis>     « Colis reçu » — réception au comptoir
#   give            « Remettre » — demande le code de retrait au gérant
#   pcl:<colis>     le détail d'un colis
#   pcls            ce qu'il reste à traiter
#
# La remise se fait en deux temps : le gérant touche « Remettre », l'assistant
# attend son prochain message, qui doit être le code annoncé par le client.
# Cette attente est mémorisée dans contact.state.

import logging

from apps.whatsapp_assistant.bridge import relay as relay_bridge
from apps.whatsapp_assistant.conf import get_config
from apps.whatsapp_assistant.message_templates import RELAY_PARCEL
from apps.whatsapp_assistant.models import RelayNotification, WhatsAppContact
from apps.whatsapp_assistant.providers import Button, ListRow, ListSection, get_provider

from .outbox import send_buttons, send_list, send_template, send_text
from .texts import TEXTS, price, t

logger = logging.getLogger("apps.whatsapp_assistant")

COMMANDS = ("rcv", "give", "pcl", "pcls")
MAX_ROWS = 10
WAITING_CODE = "relay:code"         # état du gérant à qui l'on a demandé un code

# Ce qu'un gérant écrit pour retrouver ses colis.
WORDS = {"mes colis", "colis a traiter", "relais", "mon relais", "point relais",
         "my parcels", "parcels", "relay", "my relay", "relay point"}
CANCEL_WORDS = {"annuler", "annule", "stop", "retour", "cancel", "back"}


# ── Boutons touchés par le gérant ──────────────────────────────────────────

def handle_reply(provider, contact: WhatsAppContact, reply: str) -> bool:
    command, _, argument = reply.partition(":")
    if command not in COMMANDS:
        return False

    relay_ids = relay_bridge.relays_with_phone(contact.wa_id)
    language = _language(contact)
    if not relay_ids:
        send_text(provider, contact, t(language, "not_relay"))
        return True

    relay_id = relay_ids[0]
    parcel_id = int(argument) if argument.isdigit() else None
    if command == "rcv" and parcel_id:
        _receive(provider, contact, language, parcel_id, relay_id)
    elif command == "give":
        _ask_code(provider, contact, language)
    elif command == "pcl" and parcel_id:
        _detail(provider, contact, language, parcel_id, relay_id)
    else:
        _list(provider, contact, language, relay_id)
    return True


def handle_text(provider, contact: WhatsAppContact, words: str, raw: str = "") -> bool:
    """
    Deux cas : le gérant est en train de saisir un code de retrait, ou il écrit
    un mot-clé. Renvoie False pour tout le monde d'autre.
    """
    if contact.state == WAITING_CODE:
        _submit_code(provider, contact, words, raw)
        return True
    if words not in WORDS:
        return False
    relay_ids = relay_bridge.relays_with_phone(contact.wa_id)
    if not relay_ids:
        return False                                # un client qui écrit « relais » cherche autre chose
    _list(provider, contact, _language(contact), relay_ids[0])
    return True


def _list(provider, contact, language: str, relay_id: int) -> None:
    parcels = relay_bridge.active_parcels(relay_id)[:MAX_ROWS]
    if not parcels:
        send_text(provider, contact, t(language, "parcels_empty"))
        return
    if len(parcels) == 1:
        _show(provider, contact, language, parcels[0], relay_id)
        return

    _remember(contact, "relay:parcels")
    rows = [
        ListRow(
            id=f"pcl:{parcel.id}",
            title=t(language, "parcels_row_in" if parcel.to_receive else "parcels_row_out",
                    ref=parcel.reference),
            description=_status(language, parcel.status),
        )
        for parcel in parcels
    ]
    send_list(
        provider, contact,
        t(language, "parcels_body", count=len(parcels)),
        t(language, "parcels_button"),
        [ListSection(title=t(language, "parcels_section"), rows=rows)],
    )


def _detail(provider, contact, language: str, parcel_id: int, relay_id: int) -> None:
    parcel = relay_bridge.get_parcel(parcel_id, relay_id)
    if parcel is None:
        send_text(provider, contact, t(language, "relay_not_yours"))
        return
    _show(provider, contact, language, parcel, relay_id)


def _show(provider, contact, language: str, parcel, relay_id: int) -> None:
    _remember(contact, f"relay:{parcel.id}")
    send_text(provider, contact, _parcel_text(language, parcel, relay_id))

    buttons = []
    if parcel.to_receive:
        buttons.append(Button(f"rcv:{parcel.id}", t(language, "btn_receive")))
    else:
        buttons.append(Button("give", t(language, "btn_handover")))
    buttons.append(Button("pcls", t(language, "btn_parcels")))
    send_buttons(provider, contact, t(language, "parcel_actions"), buttons)


def _receive(provider, contact, language: str, parcel_id: int, relay_id: int) -> None:
    parcel = relay_bridge.get_parcel(parcel_id, relay_id)
    if parcel is None:
        send_text(provider, contact, t(language, "relay_not_yours"))
        return

    result = relay_bridge.receive_parcel(parcel_id, relay_id)
    if result == relay_bridge.ActionResult.DONE:
        recu = relay_bridge.get_parcel(parcel_id, relay_id)
        send_text(provider, contact, t(language, "relay_received",
                                       ref=parcel.reference, slot=recu.slot_code or "—"))
    elif result == relay_bridge.ActionResult.ALREADY:
        send_text(provider, contact, t(language, "relay_already_received", ref=parcel.reference))
    elif result == relay_bridge.ActionResult.FULL:
        send_text(provider, contact, t(language, "relay_full"))
        return
    elif result == relay_bridge.ActionResult.INACTIVE:
        send_text(provider, contact, t(language, "relay_inactive", phone=get_config().support_phone))
        return
    elif result == relay_bridge.ActionResult.NOT_YOURS:
        send_text(provider, contact, t(language, "relay_not_yours"))
        return
    else:
        send_text(provider, contact, t(language, "relay_refused"))
        return

    _detail(provider, contact, language, parcel_id, relay_id)


# ── La remise, en deux temps ───────────────────────────────────────────────

def _ask_code(provider, contact, language: str) -> None:
    _remember(contact, WAITING_CODE)
    send_text(provider, contact, t(language, "ask_code"))


def _submit_code(provider, contact, words: str, raw: str) -> None:
    language = _language(contact)
    relay_ids = relay_bridge.relays_with_phone(contact.wa_id)
    if not relay_ids:
        _remember(contact, "")
        send_text(provider, contact, t(language, "not_relay"))
        return
    relay_id = relay_ids[0]

    if words in CANCEL_WORDS:
        _remember(contact, "")
        send_text(provider, contact, t(language, "code_cancelled"))
        _list(provider, contact, language, relay_id)
        return

    result, references = relay_bridge.hand_over(raw or words, relay_id)
    _remember(contact, "")
    if result == relay_bridge.ActionResult.DONE:
        send_text(provider, contact, t(language, "relay_handed", refs=", ".join(references)))
    elif result == relay_bridge.ActionResult.ALREADY:
        send_text(provider, contact, t(language, "relay_already_handed"))
    elif result == relay_bridge.ActionResult.NEEDS_APP:
        send_text(provider, contact, t(language, "relay_needs_app"))
    elif result == relay_bridge.ActionResult.INACTIVE:
        send_text(provider, contact, t(language, "relay_inactive", phone=get_config().support_phone))
        return
    else:
        send_text(provider, contact, t(language, "relay_bad_code"))
    _list(provider, contact, language, relay_id)


# ── Mise en forme ──────────────────────────────────────────────────────────

def _parcel_text(language: str, parcel, relay_id: int) -> str:
    blocks = [t(language, "parcel_title", ref=parcel.reference,
                status=_status(language, parcel.status))]

    if parcel.to_receive:
        blocks.append(t(language, "parcel_expected", courier=parcel.courier_ref)
                      if parcel.courier_ref else t(language, "parcel_expected_plain"))
    else:
        blocks.append(t(language, "parcel_stored", date=parcel.received_on,
                        slot=parcel.slot_code or "—"))

    if parcel.items_count:
        blocks.append(t(language, "parcel_items", count=parcel.items_count,
                        s="s" if parcel.items_count > 1 else ""))

    garde = []
    if parcel.late:
        garde.append(t(language, "parcel_late"))
    elif parcel.deadline:
        garde.append(t(language, "parcel_free_until", date=parcel.free_until))
        garde.append(t(language, "parcel_deadline", date=parcel.deadline))
    if parcel.fee_due:
        garde.append(t(language, "parcel_fee", fee=price(parcel.fee_due)))
    if garde:
        blocks.append("\n".join(garde))

    relay = relay_bridge.get_relay(relay_id)
    if relay and relay.capacity:
        blocks.append(t(language, "parcel_capacity", stored=relay.stored, capacity=relay.capacity))
    if not parcel.to_receive:
        blocks.append(t(language, "parcel_privacy"))
    return "\n\n".join(blocks)


def _status(language: str, status: str) -> str:
    key = f"relay_{status}"
    if key in TEXTS.get(language, TEXTS["fr"]):
        return t(language, key)
    return t(language, "order_status_other", status=status)


def _language(contact: WhatsAppContact) -> str:
    return contact.language or "fr"


def _remember(contact: WhatsAppContact, state: str) -> None:
    contact.state = state
    contact.save(update_fields=["state"])


# ── Envoi au ramassage ─────────────────────────────────────────────────────

def notify_parcel_on_the_way(parcel_id: int) -> None:
    """
    Appelée après validation en base, quand un colis destiné à ce relais vient
    d'être ramassé chez le vendeur. Un envoi raté ne doit jamais faire échouer
    un ramassage.
    """
    config = get_config()
    if not (config.enabled and config.relay_notifications):
        return
    try:
        _notify(config, parcel_id)
    except Exception:                                           # noqa: BLE001
        logger.exception("Notification relais impossible pour le colis %s.", parcel_id)


def _notify(config, parcel_id: int) -> None:
    relay_id = relay_bridge.relay_of_parcel(parcel_id)
    if relay_id is None:
        return
    relay = relay_bridge.get_relay(relay_id)
    if relay is None or not relay.can_work or not relay.wa_id:
        logger.info("Colis %s : relais %s sans numéro WhatsApp utilisable.", parcel_id, relay_id)
        return
    parcel = relay_bridge.get_parcel(parcel_id, relay_id)
    if parcel is None:
        return

    recipient = config.relay_notify_override or relay.wa_id
    contact, _ = WhatsAppContact.objects.get_or_create(
        wa_id=recipient, defaults={"profile_name": relay.name, "language": relay.language},
    )
    notification, created = RelayNotification.objects.get_or_create(
        kind=RelayNotification.Kind.ON_THE_WAY, parcel_id=parcel_id, relay_id=relay.id,
        defaults={"recipient": recipient, "language": relay.language},
    )
    if not created:
        return

    record = send_template(
        get_provider(config), contact, RELAY_PARCEL, relay.language,
        body_params=[parcel.reference, _articles(relay.language, parcel.items_count),
                     relay.name],
        button_payloads=[f"pcl:{parcel_id}"],
        summary=t(relay.language, "template_relay", ref=parcel.reference),
    )
    notification.provider_message_id = record.provider_message_id
    notification.error = record.error
    notification.save(update_fields=["provider_message_id", "error"])


def _articles(language: str, quantite: int) -> str:
    if language == "en":
        return f"{quantite} item" + ("s" if quantite > 1 else "")
    return f"{quantite} article" + ("s" if quantite > 1 else "")
