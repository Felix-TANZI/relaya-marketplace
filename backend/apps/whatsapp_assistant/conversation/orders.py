# backend/apps/whatsapp_assistant/conversation/orders.py
# Le client suit sa commande : il écrit « ma commande », et voit où elle en est.
#
# Identifiants des boutons (ils reviennent dans reply_id) :
#   orders         ses commandes
#   ord:<commande> une commande en particulier
#
# Confidentialité : seules les commandes passées avec CE numéro sont lues —
# c'est WhatsApp qui garantit le numéro de l'expéditeur. Le code de réception
# ne sort jamais de l'application.

from apps.whatsapp_assistant.bridge import orders as orders_bridge
from apps.whatsapp_assistant.models import WhatsAppContact
from apps.whatsapp_assistant.providers import Button, ListRow, ListSection

from .outbox import send_buttons, send_link_button, send_list, send_text
from .texts import TEXTS, price, t

COMMANDS = ("orders", "ord")
MAX_ROWS = 10           # limite WhatsApp d'une liste

# Ce qu'un client écrit quand il cherche sa commande.
WORDS = {"commande", "commandes", "ma commande", "mes commandes", "suivi", "suivre",
         "ou est ma commande", "ou est ma livraison", "suivi de commande", "colis", "mon colis",
         "order", "orders", "my order", "my orders", "track", "tracking",
         "where is my order", "track my order", "parcel", "my parcel"}


def handle_reply(provider, contact: WhatsAppContact, reply: str) -> bool:
    """Traite un bouton de suivi. Renvoie False si ce bouton n'en est pas un."""
    command, _, argument = reply.partition(":")
    if command not in COMMANDS:
        return False

    language = contact.language or "fr"
    if command == "ord" and argument.isdigit():
        _detail(provider, contact, language, int(argument))
    else:
        _list(provider, contact, language)
    return True


def handle_text(provider, contact: WhatsAppContact, words: str) -> bool:
    """Un client qui écrit « ma commande » ouvre son suivi plutôt qu'une recherche d'article."""
    if words not in WORDS:
        return False
    _list(provider, contact, contact.language or "fr")
    return True


def _list(provider, contact, language: str) -> None:
    found = orders_bridge.orders_of_phone(contact.wa_id)[:MAX_ROWS]
    if not found:
        send_text(provider, contact, t(language, "orders_empty"))
        return
    if len(found) == 1:
        _show(provider, contact, language, found[0], alone=True)
        return

    _remember(contact, "orders")
    rows = [
        ListRow(
            id=f"ord:{order.id}",
            title=t(language, "orders_row", ref=order.reference, date=order.placed_on),
            description=_status(language, "order", order.status),
        )
        for order in found
    ]
    send_list(
        provider, contact,
        t(language, "orders_body", count=len(found)),
        t(language, "orders_button"),
        [ListSection(title=t(language, "orders_section"), rows=rows)],
    )


def _detail(provider, contact, language: str, order_id: int) -> None:
    order = orders_bridge.get_order(order_id, contact.wa_id)
    if order is None:                                   # pas la sienne, ou trop ancienne
        send_text(provider, contact, t(language, "orders_empty"))
        return
    _show(provider, contact, language, order, alone=False)


def _show(provider, contact, language: str, order, alone: bool) -> None:
    _remember(contact, f"order:{order.id}")
    send_text(provider, contact, _order_text(language, order))

    url = orders_bridge.order_url(order.id)
    if url:
        # Tant que la commande n'est pas payée, le bouton mène au paiement :
        # c'est la seule action qui débloque la suite.
        libelle = "btn_pay" if not order.paid else "btn_open_app"
        send_link_button(provider, contact, t(language, "order_actions"),
                         t(language, libelle), url)
        return
    # Pas de lien possible (site non HTTPS en développement) : on garde la navigation.
    buttons = [] if alone else [Button("orders", t(language, "btn_orders"))]
    buttons.append(Button("menu", t(language, "btn_menu")))
    send_buttons(provider, contact, t(language, "order_actions"), buttons)


def _order_text(language: str, order) -> str:
    blocks = [
        "\n".join([
            t(language, "order_title", ref=order.reference, date=order.placed_on),
            _status(language, "order", order.status),
        ]),
    ]
    if not order.paid:
        blocks.append(t(language, "order_unpaid"))

    if order.items:
        lines = [t(language, "order_items")]
        lines += [t(language, "order_item_line", title=title, qty=qty) for title, qty in order.items]
        blocks.append("\n".join(lines))

    total = [t(language, "order_total", total=price(order.total_xaf))]
    if order.delivery_fee_xaf:
        total.append(t(language, "order_delivery_fee", fee=price(order.delivery_fee_xaf)))
    blocks.append("\n".join(total))

    blocks.append(t(language, "order_relay" if order.to_relay else "order_home", place=order.destination))
    blocks.append(_parcels_block(language, order))
    if not order.finished:
        blocks.append(t(language, "order_privacy"))
    return "\n\n".join(blocks)


def _parcels_block(language: str, order) -> str:
    if not order.parcels:
        return t(language, "order_no_parcel")

    header = (t(language, "order_parcels_many", count=len(order.parcels))
              if len(order.parcels) > 1 else t(language, "order_parcels"))
    lines = [header]
    for parcel in order.parcels:
        lines.append(t(
            language, "order_parcel_line",
            ref=parcel.reference,
            shop=t(language, "order_parcel_shop", shop=parcel.shop) if parcel.shop else "",
            status=_status(language, "parcel", parcel.status),
        ))
        if parcel.eta:
            lines.append(t(language, "order_eta", eta=parcel.eta))
    return "\n".join(lines)


def _status(language: str, prefix: str, status: str) -> str:
    """Le statut en clair ; à défaut, le code brut plutôt qu'un silence trompeur."""
    key = f"{prefix}_{status}"
    if key in TEXTS.get(language, TEXTS["fr"]):
        return t(language, key)
    return t(language, "order_status_other", status=status)


def _remember(contact: WhatsAppContact, state: str) -> None:
    contact.state = state
    contact.save(update_fields=["state"])
