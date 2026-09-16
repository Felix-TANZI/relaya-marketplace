# backend/apps/whatsapp_assistant/conversation/courier.py
# Le volet livreur : prévenir un livreur sur WhatsApp dès qu'un colis lui est
# assigné, et répondre aux boutons qu'il touche.
#
# Identifiants des boutons (ils reviennent dans reply_id) :
#   acc:<colis>    accepter la mission
#   mis:<colis>    voir les adresses d'une mission
#   mine           ses missions en cours
#   tour:<tournée>  les arrêts d'une tournée
#
# Confidentialité : le numéro du client n'est jamais envoyé ici — c'est
# bridge/deliveries.py qui garantit qu'il n'est même pas lu.

import logging

from apps.whatsapp_assistant.bridge import deliveries
from apps.whatsapp_assistant.conf import get_config
from apps.whatsapp_assistant.message_templates import MISSION, TOUR_RECAP
from apps.whatsapp_assistant.models import CourierNotification, WhatsAppContact
from apps.whatsapp_assistant.providers import Button, ListRow, ListSection, get_provider

from .outbox import send_buttons, send_list, send_location, send_template, send_text
from .texts import TEXTS, t

logger = logging.getLogger("apps.whatsapp_assistant")

COMMANDS = ("acc", "mis", "mine", "tour")
MAX_ROWS = 10           # limite WhatsApp d'une liste

# Mots par lesquels un livreur demande ses missions. Un client qui ecrit
# « livraison » cherche un article : seul un numero de livreur connu compte.
WORDS = {"mission", "missions", "mes missions", "ma mission", "livraison", "livraisons",
         "tournee", "tournees", "ma tournee", "course", "courses",
         "job", "jobs", "my job", "my jobs", "delivery", "deliveries", "round", "my round"}


# ── Boutons touchés par le livreur ─────────────────────────────────────────

def handle_reply(provider, contact: WhatsAppContact, reply: str) -> bool:
    """
    Traite un bouton livreur. Renvoie False si ce bouton n'en est pas un :
    la conversation client reprend alors son cours normal.
    """
    command, _, argument = reply.partition(":")
    if command not in COMMANDS:
        return False

    courier_ids = deliveries.couriers_with_phone(contact.wa_id)
    language = _language(contact, courier_ids)
    if not courier_ids:
        send_text(provider, contact, t(language, "not_courier"))
        return True

    number = int(argument) if argument.isdigit() else None
    if command == "acc" and number:
        _accept(provider, contact, language, number, courier_ids)
    elif command == "mis" and number:
        _mission_details(provider, contact, language, number, courier_ids)
    elif command == "tour" and number:
        _tour_stops(provider, contact, language, number, courier_ids)
    else:
        _my_missions(provider, contact, language, courier_ids)
    return True


def handle_text(provider, contact: WhatsAppContact, words: str) -> bool:
    """
    Un livreur qui ecrit « missions » ouvre sa liste au lieu de tomber sur
    l'assistant shopping. Renvoie False pour tout le monde d'autre.
    """
    if words not in WORDS:
        return False
    courier_ids = deliveries.couriers_with_phone(contact.wa_id)
    if not courier_ids:
        return False
    _my_missions(provider, contact, _language(contact, courier_ids), courier_ids)
    return True


def _accept(provider, contact, language, shipment_id, courier_ids) -> None:
    mission = deliveries.get_mission(shipment_id)
    if mission is None or mission.courier_id not in courier_ids:
        send_text(provider, contact, t(language, "not_yours"))
        return

    result = deliveries.accept_mission(shipment_id, mission.courier_id)
    if result == deliveries.AcceptResult.ACCEPTED:
        send_text(provider, contact, t(language, "accepted",
                                       ref=mission.reference, pickup=mission.pickup.summary))
    elif result == deliveries.AcceptResult.ALREADY:
        send_text(provider, contact, t(language, "already_accepted", ref=mission.reference))
    elif result == deliveries.AcceptResult.UNAVAILABLE:
        send_text(provider, contact, t(language, "unavailable",
                                       ref=mission.reference, status=_status(language, mission)))
        return
    elif result == deliveries.AcceptResult.INACTIVE:
        send_text(provider, contact, t(language, "inactive", phone=get_config().support_phone))
        return
    else:
        send_text(provider, contact, t(language, "not_yours"))
        return

    # Acceptée (ou déjà acceptée) : il part tout de suite, il lui faut les adresses.
    _mission_details(provider, contact, language, shipment_id, courier_ids)


def _mission_details(provider, contact, language, shipment_id, courier_ids) -> None:
    mission = deliveries.get_mission(shipment_id)
    if mission is None or mission.courier_id not in courier_ids:
        send_text(provider, contact, t(language, "not_yours"))
        return
    if mission.status not in deliveries.ACTIVE_STATUSES:
        send_text(provider, contact, t(language, "finished",
                                       ref=mission.reference, status=_status(language, mission)))
        return

    _remember(contact, f"courier:{mission.id}")
    send_text(provider, contact, _mission_text(language, mission))
    _send_pins(provider, contact, language, mission)

    buttons = []
    if not mission.accepted and mission.status == "ASSIGNED":
        buttons.append(Button(f"acc:{mission.id}", t(language, "btn_accept")))
    buttons.append(Button("mine", t(language, "btn_my_missions")))
    send_buttons(provider, contact, t(language, "mission_actions"), buttons)


def _my_missions(provider, contact, language, courier_ids) -> None:
    missions = deliveries.active_missions(courier_ids)[:MAX_ROWS]
    if not missions:
        send_text(provider, contact, t(language, "missions_empty"))
        return
    if len(missions) == 1:
        _mission_details(provider, contact, language, missions[0].id, courier_ids)
        return

    _remember(contact, "courier:missions")
    rows = [
        ListRow(id=f"mis:{mission.id}", title=mission.reference, description=mission.delivery.summary)
        for mission in missions
    ]
    send_list(
        provider, contact,
        t(language, "missions_body", count=len(missions)),
        t(language, "missions_button"),
        [ListSection(title=t(language, "missions_section"), rows=rows)],
    )


def _tour_stops(provider, contact, language, tournee_id, courier_ids) -> None:
    missions = deliveries.missions_of_tour(tournee_id, courier_ids)[:MAX_ROWS]
    tour = deliveries.get_tour(tournee_id)
    if not missions or tour is None:
        send_text(provider, contact, t(language, "missions_empty"))
        return

    _remember(contact, f"courier:tour:{tournee_id}")
    lines = "\n".join(
        f"{number}. {mission.delivery.summary}" for number, mission in enumerate(missions, 1)
    )
    rows = [
        ListRow(
            id=f"mis:{mission.id}",
            title=t(language, "tour_row", number=number, ref=mission.reference),
            description=mission.delivery.summary,
        )
        for number, mission in enumerate(missions, 1)
    ]
    send_list(
        provider, contact,
        t(language, "tour_body", tour=_tour_label(language, tour), count=len(missions), lines=lines),
        t(language, "tour_button"),
        [ListSection(title=t(language, "tour_section"), rows=rows)],
    )


# ── Mise en forme d'une mission ────────────────────────────────────────────

def _mission_text(language: str, mission) -> str:
    blocks = [
        t(language, "mission_title", ref=mission.reference, status=_status(language, mission),
          items=mission.items_count, s="s" if mission.items_count > 1 else ""),
    ]
    if mission.tournee_id:
        # stop_order commence à 0 dans les tournées : le livreur compte à partir de 1.
        blocks.append(t(language, "mission_stop", number=mission.stop_order + 1))
    blocks.append(_pickup_block(language, mission.pickup))
    blocks.append(_delivery_block(language, mission))
    blocks.append(t(language, "privacy_note"))
    return "\n\n".join(blocks)


def _adresse(*values) -> list[str]:
    """
    Empile nom, ville et adresse sans repeter une information deja ecrite :
    « Boutique Demo / Douala / Akwa, Douala » devient « Boutique Demo / Akwa, Douala ».
    """
    kept: list[str] = []
    for value in values:
        text = (value or "").strip()
        if not text or any(text.lower() in other.lower() for other in kept):
            continue
        kept = [other for other in kept if other.lower() not in text.lower()] + [text]
    return kept


def _pickup_block(language: str, place) -> str:
    lines = [t(language, "pickup_title")]
    lines += _adresse(place.name, place.area, place.address)
    if place.landmarks:
        lines.append(t(language, "line_landmarks", value=place.landmarks))
    if place.phone:
        lines.append(t(language, "line_shop_phone", value=place.phone))
    if not place.has_pin:
        lines.append(t(language, "line_no_pin"))
    return "\n".join(lines)


def _delivery_block(language: str, mission) -> str:
    place = mission.delivery
    if mission.to_relay:
        lines = [t(language, "relay_title")]
        lines += _adresse(place.name or t(language, "relay_prefix"), place.area, place.address)
        if place.hours:
            lines.append(t(language, "line_hours", value=place.hours))
        if place.phone:
            lines.append(t(language, "line_relay_phone", value=place.phone))
    else:
        lines = [t(language, "home_title")]
        lines += _adresse(place.area, place.address)
        if place.landmarks:
            lines.append(t(language, "line_landmarks", value=place.landmarks))
        if place.hint:
            lines.append(t(language, "line_hint", value=place.hint))
        if place.note:
            lines.append(t(language, "line_note", value=place.note))
    if not place.has_pin:
        lines.append(t(language, "line_no_pin"))
    return "\n".join(lines)


def _send_pins(provider, contact, language: str, mission) -> None:
    """Épingles GPS : elles s'ouvrent dans Google Maps ou Plans d'un seul geste."""
    if mission.pickup.has_pin:
        send_location(
            provider, contact, mission.pickup.latitude, mission.pickup.longitude,
            name=t(language, "pin_pickup", name=mission.pickup.name or mission.pickup.area),
            address=mission.pickup.address or mission.pickup.area,
        )
    if mission.delivery.has_pin:
        send_location(
            provider, contact, mission.delivery.latitude, mission.delivery.longitude,
            name=t(language, "pin_delivery", ref=mission.reference),
            address=mission.delivery.address or mission.delivery.area,
        )


def _status(language: str, mission) -> str:
    if mission.status == "ASSIGNED" and not mission.accepted:
        return t(language, "status_to_accept")
    key = f"status_{mission.status}"
    if key in TEXTS.get(language, TEXTS["fr"]):
        return t(language, key)
    return t(language, "status_other", status=mission.status)


def _tour_label(language: str, tour) -> str:
    key = f"period_{tour.period}"
    period = t(language, key) if key in TEXTS.get(language, TEXTS["fr"]) else tour.period
    return t(language, "tour_label", zone=tour.zone, date=tour.slot_date, period=period)


def _remember(contact: WhatsAppContact, state: str) -> None:
    contact.state = state
    contact.save(update_fields=["state"])


def _language(contact: WhatsAppContact, courier_ids) -> str:
    """La langue du livreur, telle qu'il l'a choisie dans son application."""
    if contact.language:
        return contact.language
    for courier_id in courier_ids:
        courier = deliveries.get_courier(courier_id)
        if courier:
            contact.language = courier.language
            contact.save(update_fields=["language"])
            return courier.language
    return "fr"


# ── Envoi à l'assignation ──────────────────────────────────────────────────

def notify_assignment(shipment_id: int, courier_id: int, assignment_ref: str = "") -> None:
    """
    Appelée après validation en base par le signal de bridge/deliveries.py.
    Une notification qui échoue ne doit jamais faire échouer une assignation.
    """
    config = get_config()
    if not (config.enabled and config.courier_notifications):
        return
    try:
        _notify(config, shipment_id, courier_id, assignment_ref)
    except Exception:                                           # noqa: BLE001
        logger.exception("Notification livreur impossible pour le colis %s.", shipment_id)


def _notify(config, shipment_id: int, courier_id: int, assignment_ref: str) -> None:
    courier = deliveries.get_courier(courier_id)
    if courier is None or not courier.can_work or not courier.wa_id:
        logger.info("Colis %s : livreur %s sans numéro WhatsApp utilisable.", shipment_id, courier_id)
        return
    mission = deliveries.get_mission(shipment_id)
    if mission is None or mission.courier_id != courier_id:
        return                                                  # réassigné entre-temps

    # En développement, tout part vers le numéro d'essai.
    recipient = config.courier_notify_override or courier.wa_id
    contact = _contact_for(recipient, courier)

    notification, created = CourierNotification.objects.get_or_create(
        kind=CourierNotification.Kind.MISSION,
        shipment_id=shipment_id, courier_id=courier_id, assignment_ref=assignment_ref,
        defaults={"recipient": recipient, "language": courier.language},
    )
    if not created:
        return                                                  # même assignation déjà annoncée

    provider = get_provider(config)
    record = send_template(
        provider, contact, MISSION, courier.language,
        body_params=[mission.reference, mission.pickup.summary, mission.delivery.summary],
        button_payloads=[f"acc:{mission.id}", f"mis:{mission.id}"],
        summary=t(courier.language, "template_mission", ref=mission.reference),
    )
    notification.provider_message_id = record.provider_message_id
    notification.error = record.error
    notification.save(update_fields=["provider_message_id", "error"])

    # Le récapitulatif part quand la tournée est complète : c'est le dernier
    # arrêt assigné qui le déclenche.
    if mission.tournee_id and deliveries.is_last_stop(mission.id):
        _send_tour_recap(provider, contact, courier, mission.tournee_id)


def _send_tour_recap(provider, contact, courier, tournee_id: int) -> None:
    tour = deliveries.get_tour(tournee_id)
    missions = deliveries.missions_of_tour(tournee_id, [courier.id])
    if tour is None or not missions:
        return

    notification, created = CourierNotification.objects.get_or_create(
        kind=CourierNotification.Kind.TOUR_RECAP,
        tournee_id=tournee_id, courier_id=courier.id,
        defaults={"recipient": contact.wa_id, "language": courier.language},
    )
    if not created:
        return

    label = _tour_label(courier.language, tour)
    stops = " › ".join(
        f"{number}. {mission.delivery.summary}" for number, mission in enumerate(missions, 1)
    )
    record = send_template(
        provider, contact, TOUR_RECAP, courier.language,
        body_params=[label, str(len(missions)), stops],
        button_payloads=[f"tour:{tournee_id}"],
        summary=t(courier.language, "template_tour", tour=label),
    )
    notification.provider_message_id = record.provider_message_id
    notification.error = record.error
    notification.save(update_fields=["provider_message_id", "error"])


def _contact_for(wa_id: str, courier) -> WhatsAppContact:
    contact, _ = WhatsAppContact.objects.get_or_create(
        wa_id=wa_id, defaults={"profile_name": courier.name, "language": courier.language},
    )
    if not contact.language:
        contact.language = courier.language
        contact.save(update_fields=["language"])
    return contact
