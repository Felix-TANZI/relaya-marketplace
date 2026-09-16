# backend/apps/whatsapp_assistant/conversation/vendor.py
# Le volet vendeur : prévenir une boutique dès qu'une commande est payée, et
# lui permettre de la faire avancer sans quitter WhatsApp.
#
# Identifiants des boutons (ils reviennent dans reply_id) :
#   ack:<commande>    « Je confirme » — accuse réception et passe en préparation
#   rdy:<commande>    « Colis prêt » — la commande attend un livreur
#   sale:<commande>   le détail d'une commande
#   sales             ce qu'il reste à préparer
#
# Confidentialité : BelivaY masque déjà l'acheteur à ses vendeurs. Ici aussi —
# jamais de nom ni de numéro de client, et le code de remise reste dans
# l'application, où le vendeur le lit pour le donner au livreur en main propre.

import logging

from apps.whatsapp_assistant.bridge import vendor_orders
from apps.whatsapp_assistant.conf import get_config
from apps.whatsapp_assistant.message_templates import NEW_ORDER
from apps.whatsapp_assistant.models import VendorNotification, WhatsAppContact
from apps.whatsapp_assistant.providers import Button, ListRow, ListSection, get_provider

from .outbox import send_buttons, send_list, send_template, send_text
from .texts import TEXTS, price, t

logger = logging.getLogger("apps.whatsapp_assistant")

COMMANDS = ("ack", "rdy", "sale", "sales")
MAX_ROWS = 10

# Ce qu'un vendeur écrit pour retrouver ce qu'il doit préparer. Volontairement
# distinct de « mes commandes », qui reste le suivi d'achat du client.
WORDS = {"mes ventes", "ventes", "vente", "ma boutique", "boutique",
         "a preparer", "commandes a preparer", "preparer",
         "my sales", "sales", "my shop", "shop", "to prepare", "orders to prepare"}


# ── Boutons touchés par le vendeur ─────────────────────────────────────────

def handle_reply(provider, contact: WhatsAppContact, reply: str) -> bool:
    command, _, argument = reply.partition(":")
    if command not in COMMANDS:
        return False

    vendor_ids = vendor_orders.vendors_with_phone(contact.wa_id)
    language = _language(contact)
    if not vendor_ids:
        send_text(provider, contact, t(language, "not_vendor"))
        return True

    users = _users(vendor_ids)
    order_id = int(argument) if argument.isdigit() else None
    if command == "ack" and order_id:
        _act(provider, contact, language, order_id, users, vendor_orders.acknowledge, "sale_acknowledged")
    elif command == "rdy" and order_id:
        _act(provider, contact, language, order_id, users, vendor_orders.mark_ready, "sale_ready")
    elif command == "sale" and order_id:
        _detail(provider, contact, language, order_id, users)
    else:
        _list(provider, contact, language, users)
    return True


def handle_text(provider, contact: WhatsAppContact, words: str) -> bool:
    """Un vendeur qui écrit « mes ventes » voit ce qu'il lui reste à préparer."""
    if words not in WORDS:
        return False
    vendor_ids = vendor_orders.vendors_with_phone(contact.wa_id)
    if not vendor_ids:
        return False                                # un client qui écrit « boutique » veut le catalogue
    _list(provider, contact, _language(contact), _users(vendor_ids))
    return True


def _list(provider, contact, language: str, users) -> None:
    orders = vendor_orders.orders_to_prepare(users)[:MAX_ROWS]
    if not orders:
        send_text(provider, contact, t(language, "sales_empty"))
        return
    if len(orders) == 1:
        _show(provider, contact, language, orders[0])
        return

    _remember(contact, "vendor:sales")
    rows = [
        ListRow(
            id=f"sale:{order.id}",
            title=t(language, "sales_row", ref=order.reference, total=price(order.total_xaf)),
            description=_status(language, order.status),
        )
        for order in orders
    ]
    send_list(
        provider, contact,
        t(language, "sales_body", count=len(orders)),
        t(language, "sales_button"),
        [ListSection(title=t(language, "sales_section"), rows=rows)],
    )


def _detail(provider, contact, language: str, order_id: int, users) -> None:
    order = vendor_orders.get_order(order_id, users)
    if order is None:
        send_text(provider, contact, t(language, "sale_not_yours"))
        return
    _show(provider, contact, language, order)


def _act(provider, contact, language: str, order_id: int, users, action, succes: str) -> None:
    order = vendor_orders.get_order(order_id, users)
    if order is None:
        send_text(provider, contact, t(language, "sale_not_yours"))
        return

    result = action(order_id, _owner(order_id, users))
    if result == vendor_orders.ActionResult.DONE:
        send_text(provider, contact, t(language, succes, ref=order.reference))
    elif result == vendor_orders.ActionResult.ALREADY:
        send_text(provider, contact, t(language, "sale_already", ref=order.reference))
    elif result == vendor_orders.ActionResult.INACTIVE:
        send_text(provider, contact, t(language, "sale_inactive", phone=get_config().support_phone))
        return
    elif result == vendor_orders.ActionResult.NOT_YOURS:
        send_text(provider, contact, t(language, "sale_not_yours"))
        return
    else:
        send_text(provider, contact, t(language, "sale_refused",
                                       ref=order.reference, status=_status(language, order.status)))
        return

    # Il vient d'agir : on lui remontre où en est la commande, et ce qui reste.
    _detail(provider, contact, language, order_id, users)


def _show(provider, contact, language: str, order) -> None:
    _remember(contact, f"vendor:{order.id}")
    send_text(provider, contact, _order_text(language, order))

    buttons = []
    if order.status == "PAID_IN_ESCROW":
        buttons.append(Button(f"ack:{order.id}", t(language, "btn_ack")))
    elif order.status in ("VENDOR_ACKNOWLEDGED", "PREPARING"):
        buttons.append(Button(f"rdy:{order.id}", t(language, "btn_ready")))
    buttons.append(Button("sales", t(language, "btn_sales")))
    send_buttons(provider, contact, t(language, "sale_actions"), buttons)


def _order_text(language: str, order) -> str:
    blocks = [
        "\n".join([
            t(language, "sale_title", ref=order.reference, date=order.placed_on),
            _status(language, order.status),
        ]),
    ]
    # Le delai ne concerne que la preparation : une fois le colis pret, il
    # n'a plus de sens et disparait.
    if order.waiting:
        if order.late:
            blocks.append(t(language, "sale_late"))
        elif order.deadline:
            blocks.append(t(language, "sale_deadline", deadline=order.deadline))

    lines = [t(language, "sale_items")]
    lines += [t(language, "sale_item_line", title=title, qty=qty) for title, qty in order.items]
    blocks.append("\n".join(lines))

    blocks.append(t(language, "sale_total", total=price(order.total_xaf)))
    destination = [t(language, "sale_buyer", buyer=order.buyer, city=order.city)]
    if order.to_relay:
        destination.append(t(language, "sale_relay"))
    blocks.append("\n".join(destination))
    blocks.append(t(language, "sale_code"))
    return "\n\n".join(blocks)


def _status(language: str, status: str) -> str:
    key = f"vendor_{status}"
    if key in TEXTS.get(language, TEXTS["fr"]):
        return t(language, key)
    return t(language, "order_status_other", status=status)


def _users(vendor_ids) -> list[int]:
    """Les comptes utilisateurs derrière ces boutiques : c'est eux que le cœur connaît."""
    vendors = [vendor_orders.get_vendor(vendor_id) for vendor_id in vendor_ids]
    return [vendor.user_id for vendor in vendors if vendor]


def _owner(order_id: int, users) -> int:
    """Celui de ses comptes qui a effectivement un article dans cette commande."""
    concerned = set(vendor_orders.vendors_of_order(order_id))
    return next((user_id for user_id in users if user_id in concerned), users[0])


def _language(contact: WhatsAppContact) -> str:
    return contact.language or "fr"


def _remember(contact: WhatsAppContact, state: str) -> None:
    contact.state = state
    contact.save(update_fields=["state"])


# ── Envoi au paiement ──────────────────────────────────────────────────────

def notify_paid_order(order_id: int) -> None:
    """
    Appelée après validation en base, quand une commande vient d'être payée.
    Un message qui échoue ne doit jamais faire échouer un paiement.
    """
    config = get_config()
    if not (config.enabled and config.vendor_notifications):
        return
    try:
        for user_id in vendor_orders.vendors_of_order(order_id):
            _notify_vendor(config, order_id, user_id)
    except Exception:                                           # noqa: BLE001
        logger.exception("Notification vendeur impossible pour la commande %s.", order_id)


def _notify_vendor(config, order_id: int, vendor_user_id: int) -> None:
    vendor = vendor_orders.vendor_of_user(vendor_user_id)
    if vendor is None or not vendor.can_sell or not vendor.wa_id:
        logger.info("Commande %s : boutique %s sans numéro WhatsApp utilisable.", order_id, vendor_user_id)
        return
    order = vendor_orders.get_order(order_id, [vendor_user_id])
    if order is None:
        return

    recipient = config.vendor_notify_override or vendor.wa_id
    contact, _ = WhatsAppContact.objects.get_or_create(
        wa_id=recipient, defaults={"profile_name": vendor.shop, "language": vendor.language},
    )
    notification, created = VendorNotification.objects.get_or_create(
        kind=VendorNotification.Kind.NEW_ORDER, order_id=order_id, vendor_id=vendor.id,
        defaults={"recipient": recipient, "language": vendor.language},
    )
    if not created:
        return                                                  # déjà annoncée

    quantite = sum(qty for _, qty in order.items)
    record = send_template(
        get_provider(config), contact, NEW_ORDER, vendor.language,
        body_params=[order.reference, _articles(vendor.language, quantite),
                     order.deadline or _sans_delai(vendor.language)],
        button_payloads=[f"ack:{order_id}", f"sale:{order_id}"],
        summary=t(vendor.language, "template_order", ref=order.reference),
    )
    notification.provider_message_id = record.provider_message_id
    notification.error = record.error
    notification.save(update_fields=["provider_message_id", "error"])


def _articles(language: str, quantite: int) -> str:
    if language == "en":
        return f"{quantite} item" + ("s" if quantite > 1 else "")
    return f"{quantite} article" + ("s" if quantite > 1 else "")


def _sans_delai(language: str) -> str:
    """Le délai n'est calculé qu'à la confirmation : avant, on reste honnête."""
    return "dès que possible" if language != "en" else "as soon as possible"
