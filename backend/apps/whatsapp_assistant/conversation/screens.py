# backend/apps/whatsapp_assistant/conversation/screens.py
# Les « écrans » de l'assistant : chacun envoie un message et note où en est
# le client (contact.state / contact.context).
#
# Identifiants des boutons et lignes (ils reviennent dans reply_id) :
#   lang:fr|en            menu  shop  search  help
#   cats:<parent|root>:<page>   cat:<id>   all:<id>
#   prod:<id>   plist:<page>   next   list

from apps.whatsapp_assistant import posters
from apps.whatsapp_assistant.bridge import catalog
from apps.whatsapp_assistant.conf import get_config
from apps.whatsapp_assistant.media import media_id_for
from apps.whatsapp_assistant.models import WhatsAppContact
from apps.whatsapp_assistant.providers import Button, ListRow, ListSection, WhatsAppProvider

from .outbox import send_buttons, send_image, send_link_button, send_list, send_text
from .texts import LANGUAGE_PROMPT, price, t

MAX_ROWS = 10       # limite WhatsApp d'une liste
PAGE_SIZE = 9       # articles par page : 9 + « Voir plus »


def _lang(contact: WhatsAppContact) -> str:
    return contact.language or "fr"


def first_name(contact: WhatsAppContact) -> str:
    return (contact.profile_name or "").split(" ")[0]


def _remember(contact: WhatsAppContact, state: str, context: dict | None = None) -> None:
    contact.state = state
    if context is not None:
        contact.context = context
    contact.save(update_fields=["state", "context"])


def _menu_button(lang: str) -> Button:
    return Button("menu", t(lang, "btn_menu"))


def _categories_button(lang: str) -> Button:
    return Button("shop", t(lang, "btn_categories"))


# ── Affiche, langue et accueil ──────────────────────────────────────────────

def poster(provider: WhatsAppProvider, contact: WhatsAppContact, placement: str = "welcome") -> bool:
    """Envoie l'affiche du moment (accueil ou recherche). Faux s'il n'y en a pas à montrer."""
    chosen = posters.next_poster(contact, placement)
    if chosen is None:
        return False
    media_id = media_id_for(provider, chosen.image.name)
    if not media_id:
        return False
    send_image(
        provider, contact, media_id, posters.caption_for(chosen, contact.language),
        message_type=posters.message_type_for(placement), payload={"poster_id": chosen.id},
    )
    return True


def language_prompt(provider: WhatsAppProvider, contact: WhatsAppContact) -> None:
    send_buttons(
        provider, contact,
        LANGUAGE_PROMPT.format(assistant=get_config().assistant_name),
        [Button("lang:fr", "🇫🇷 Français"), Button("lang:en", "🇬🇧 English")],
    )
    _remember(contact, "language")


def welcome(provider: WhatsAppProvider, contact: WhatsAppContact) -> None:
    lang = _lang(contact)
    who = first_name(contact)
    send_buttons(
        provider, contact,
        t(lang, "welcome", name=f" {who}" if who else "", assistant=get_config().assistant_name),
        [Button("shop", t(lang, "btn_shop")), Button("search", t(lang, "btn_search")), Button("help", t(lang, "btn_help"))],
        footer=t(lang, "welcome_footer"),
    )
    _remember(contact, "menu", {})


def help_screen(provider: WhatsAppProvider, contact: WhatsAppContact) -> None:
    lang = _lang(contact)
    config = get_config()
    send_buttons(
        provider, contact,
        t(lang, "help", phone=config.support_phone, email=config.support_email),
        [_categories_button(lang), _menu_button(lang)],
    )
    _remember(contact, "help")


def unsupported(provider: WhatsAppProvider, contact: WhatsAppContact) -> None:
    lang = _lang(contact)
    send_buttons(
        provider, contact, t(lang, "unsupported"),
        [Button("shop", t(lang, "btn_shop")), Button("search", t(lang, "btn_search")), _menu_button(lang)],
    )


# ── Catégories (celles de l'admin) ──────────────────────────────────────────

def categories(provider: WhatsAppProvider, contact: WhatsAppContact, parent_id: int | None = None, page: int = 0) -> None:
    lang = _lang(contact)
    parent = catalog.get_category(parent_id) if parent_id else None
    if parent_id and parent is None:          # catégorie masquée entre-temps
        return categories(provider, contact)
    items = catalog.child_categories(parent.id) if parent else catalog.root_categories()

    if parent and not items:                  # sous-catégorie finale : ses articles
        return products_of_category(provider, contact, parent.id)
    if not items:
        send_buttons(provider, contact, t(lang, "no_categories"), [_menu_button(lang)])
        return None

    # Lignes de contrôle d'une sous-catégorie : « Tout voir » en tête, « Retour » en fin.
    head = [ListRow(f"all:{parent.id}", t(lang, "row_all"), t(lang, "row_all_desc", name=parent.name))] if parent else []
    tail = []
    if parent:
        back = f"cat:{parent.parent_id}" if parent.parent_id else "shop"
        tail = [ListRow(back, t(lang, "row_back"), t(lang, "row_back_desc"))]

    capacity = MAX_ROWS - len(head) - len(tail)
    if len(items) > capacity:
        capacity -= 1                         # place pour « Voir plus »
    start = page * capacity
    shown = items[start:start + capacity]
    rows = head + [ListRow(f"cat:{c.id}", c.name, _category_summary(lang, c)) for c in shown]
    if start + capacity < len(items):
        rows.append(ListRow(f"cats:{parent.id if parent else 'root'}:{page + 1}", t(lang, "row_more"), t(lang, "row_more_desc")))
    rows += tail

    send_list(
        provider, contact,
        t(lang, "subcategories_body", name=parent.name) if parent else t(lang, "categories_body"),
        t(lang, "subcategories_button") if parent else t(lang, "categories_button"),
        [ListSection(parent.name if parent else t(lang, "categories_section"), rows)],
    )
    _remember(contact, "categories")
    return None


def _category_summary(lang: str, category) -> str:
    """« 3 sous-catégories · 12 articles », « 12 articles », ou « Bientôt disponible »."""
    if category.product_count == 0:
        articles = t(lang, "coming_soon")
    elif category.product_count == 1:
        articles = t(lang, "article_one")
    else:
        articles = t(lang, "articles_count", count=category.product_count)
    if not category.children_count:
        return articles
    children = (t(lang, "children_one") if category.children_count == 1
                else t(lang, "children_count", count=category.children_count))
    return f"{children} · {articles}"


# ── Articles ────────────────────────────────────────────────────────────────

def products_of_category(provider: WhatsAppProvider, contact: WhatsAppContact, category_id: int) -> None:
    lang = _lang(contact)
    category = catalog.get_category(category_id)
    if category is None:
        return categories(provider, contact)
    ids = catalog.product_ids_in_category(category.id)
    if not ids:
        send_buttons(provider, contact, t(lang, "no_products", name=category.name),
                     [_categories_button(lang), _menu_button(lang)])
        _remember(contact, "categories")
        return None
    _remember(contact, "products", {"ids": ids, "title": category.name, "note": "", "index": None})
    return product_list(provider, contact)


def search_prompt(provider: WhatsAppProvider, contact: WhatsAppContact) -> None:
    poster(provider, contact, "search")         # l'affiche « recherche », si l'admin en a prévu une
    send_text(provider, contact, t(_lang(contact), "search_prompt"))
    _remember(contact, "search")


def search(provider: WhatsAppProvider, contact: WhatsAppContact, query: str) -> None:
    lang = _lang(contact)
    ids, mode = catalog.search_product_ids(query)
    if not ids:
        send_buttons(provider, contact, t(lang, "search_empty", query=query[:40]),
                     [_categories_button(lang), _menu_button(lang)])
        _remember(contact, "search")
        return
    note = {"fuzzy": t(lang, "search_fuzzy"), "related": t(lang, "search_related")}.get(mode, "")
    _remember(contact, "products", {
        "ids": ids, "title": t(lang, "search_title", query=query[:30]), "note": note, "index": None,
    })
    product_list(provider, contact)


def product_list(provider: WhatsAppProvider, contact: WhatsAppContact, page: int = 0) -> None:
    lang = _lang(contact)
    context = dict(contact.context or {})
    ids = context.get("ids") or []
    items = catalog.products_by_ids(ids[page * PAGE_SIZE:(page + 1) * PAGE_SIZE])
    if not items:
        return welcome(provider, contact)

    rows = [
        ListRow(f"prod:{p.id}", p.title, f"{price(p.price)} · {p.shop}" if p.shop else price(p.price))
        for p in items
    ]
    if (page + 1) * PAGE_SIZE < len(ids):
        rows.append(ListRow(f"plist:{page + 1}", t(lang, "row_more"), t(lang, "row_more_desc")))
    count = len(ids)
    body = t(lang, "products_body", title=context.get("title", ""), count=count, s="s" if count > 1 else "")
    if context.get("note"):
        body += "\n" + context["note"]

    send_list(provider, contact, body, t(lang, "products_button"),
              [ListSection(t(lang, "products_section"), rows)])
    context["page"] = page
    _remember(contact, "products", context)
    return None


def product_card(provider: WhatsAppProvider, contact: WhatsAppContact, product_id: int) -> None:
    lang = _lang(contact)
    product = catalog.get_product(product_id)
    context = dict(contact.context or {})
    ids = context.get("ids") or []
    if product is None:                       # retiré ou masqué entre-temps
        return product_list(provider, contact, context.get("page", 0)) if ids else welcome(provider, contact)

    price_line = f"💰 *{price(product.price)}*"
    if product.compare_at_price:
        price_line += f"  ~{price(product.compare_at_price)}~"
    lines = [f"*{product.title}*", price_line]
    if product.shop:
        lines.append(t(lang, "shop", shop=product.shop))
    if product.rating:
        lines.append(t(lang, "rating", rating=product.rating, reviews=product.reviews))
    if product.short_description:
        lines += ["", product.short_description[:300]]

    index = ids.index(product.id) if product.id in ids else None
    buttons = []
    if index is not None and index + 1 < len(ids):
        buttons.append(Button("next", t(lang, "btn_next")))
    if ids:
        buttons.append(Button("list", t(lang, "btn_list")))
    buttons.append(_menu_button(lang))
    image_id = media_id_for(provider, product.image_ref)

    # Option B : on achète dans l'application. Le bouton n'apparaît que si la
    # page du produit s'ouvre vraiment — jamais de lien cassé.
    url = catalog.buy_url(product)
    if url:
        send_link_button(provider, contact, "\n".join(lines), t(lang, "btn_buy"), _tracked(url),
                         image_id=image_id, footer=t(lang, "secure_checkout"))
        send_buttons(provider, contact, t(lang, "what_next"), buttons)
    else:
        lines += ["", t(lang, "not_buyable")]
        send_buttons(provider, contact, "\n".join(lines), buttons, image_id=image_id)
    context["index"] = index
    _remember(contact, "product", context)
    return None


def _tracked(url: str) -> str:
    """Marque la visite comme venant de l'assistant (statistiques du site), sans gêner le client."""
    separator = "&" if "?" in url else "?"
    return f"{url}{separator}utm_source=whatsapp&utm_medium=assistant&utm_campaign=catalogue"


def next_product(provider: WhatsAppProvider, contact: WhatsAppContact) -> None:
    context = contact.context or {}
    ids, index = context.get("ids") or [], context.get("index")
    if index is not None and index + 1 < len(ids):
        return product_card(provider, contact, ids[index + 1])
    send_text(provider, contact, t(_lang(contact), "last_product"))
    return back_to_list(provider, contact)


def back_to_list(provider: WhatsAppProvider, contact: WhatsAppContact) -> None:
    context = contact.context or {}
    index = context.get("index") or 0
    return product_list(provider, contact, page=index // PAGE_SIZE)
