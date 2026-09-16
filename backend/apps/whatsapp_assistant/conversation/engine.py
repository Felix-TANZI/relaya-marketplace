# backend/apps/whatsapp_assistant/conversation/engine.py
# Le « cerveau » de l'assistant : décide quel écran afficher à chaque message.
#
# Ordre de décision :
#   0. bouton ou mot d'un livreur → le volet livreur (il ne passe pas par l'accueil)
#   1. langue pas encore choisie  → proposer 🇫🇷 / 🇬🇧
#   2. bouton ou ligne touché     → l'écran correspondant (reply_id)
#   3. message non textuel        → explication + boutons
#   4. mot-clé (menu, aide…)      → l'écran correspondant
#   5. tout autre texte           → recherche d'articles

import logging
import re
import unicodedata

from apps.whatsapp_assistant.bridge.catalog import CatalogUnavailable
from apps.whatsapp_assistant.models import WhatsAppContact
from apps.whatsapp_assistant.providers import Button, IncomingMessage, WhatsAppProvider

from . import courier, screens
from .outbox import send_buttons
from .texts import t

logger = logging.getLogger("apps.whatsapp_assistant")

# Une salutation déclenche l'affiche publicitaire avant l'accueil ; « menu » non.
GREETINGS = {"bonjour", "bonsoir", "salut", "coucou", "hello", "hi", "hey", "good morning",
             "good evening", "bjr", "slt"}
MENU_WORDS = {"menu", "accueil", "home", "start", "debut", "demarrer"}
LANGUAGE_WORDS = {"langue", "language", "lang"}
HELP_WORDS = {"aide", "help", "support", "assistance", "contact"}
SHOP_WORDS = {"acheter", "boutique", "shop", "categories", "categorie", "category", "catalogue"}
SEARCH_WORDS = {"rechercher", "recherche", "chercher", "search"}
FRENCH_WORDS = {"fr", "francais", "french"}
ENGLISH_WORDS = {"en", "english", "anglais"}


def normalize(text: str) -> str:
    """« Bonjour !! » → « bonjour » ; « Français » → « francais »."""
    text = unicodedata.normalize("NFD", text or "")
    text = "".join(ch for ch in text if unicodedata.category(ch) != "Mn").lower()
    return " ".join(re.sub(r"[^a-z0-9 ]+", " ", text).split())


def handle_message(contact: WhatsAppContact, message: IncomingMessage, provider: WhatsAppProvider) -> None:
    try:
        return _decide(contact, message, provider)
    except CatalogUnavailable as error:
        # Le site en ligne ne répond pas : on le dit au client plutôt que de se taire.
        logger.warning("Catalogue indisponible pour +%s : %s", contact.wa_id, error)
        lang = contact.language or "fr"
        return send_buttons(provider, contact, t(lang, "catalog_unavailable"), [Button("menu", t(lang, "btn_menu"))])


def _decide(contact: WhatsAppContact, message: IncomingMessage, provider: WhatsAppProvider) -> None:
    reply = message.reply_id
    words = normalize(message.text)

    # 0. Livreur : ses boutons sont reconnaissables, et il ne choisit pas de
    #    langue — c'est celle de son application livreur qui s'applique.
    if reply and courier.handle_reply(provider, contact, reply):
        return
    if not reply and message.type == "text" and courier.handle_text(provider, contact, words):
        return

    # 1. Langue
    if reply.startswith("lang:"):
        return _set_language(provider, contact, "en" if reply == "lang:en" else "fr")
    if not contact.language:
        if words in FRENCH_WORDS:
            return _set_language(provider, contact, "fr")
        if words in ENGLISH_WORDS:
            return _set_language(provider, contact, "en")
        screens.poster(provider, contact)           # premier contact : l'affiche d'abord
        return screens.language_prompt(provider, contact)

    # 2. Boutons et lignes de liste
    if reply:
        return _route_reply(provider, contact, reply)

    # 3. Image, audio, position… : pas encore compris
    if message.type != "text":
        return screens.unsupported(provider, contact)

    # 4. Mots-clés
    if words in GREETINGS:
        screens.poster(provider, contact)           # comme chez MTN : l'affiche, puis l'accueil
        return screens.welcome(provider, contact)
    if not words or words in MENU_WORDS:
        return screens.welcome(provider, contact)
    if words in LANGUAGE_WORDS:
        return screens.language_prompt(provider, contact)
    if words in HELP_WORDS:
        return screens.help_screen(provider, contact)
    if words in SHOP_WORDS:
        return _open_shop(provider, contact)
    if words in SEARCH_WORDS:
        return screens.search_prompt(provider, contact)

    # 5. Texte libre : c'est un article recherché
    return screens.search(provider, contact, message.text.strip())


def _open_shop(provider, contact) -> None:
    """« Acheter » : l'affiche du catalogue (si l'admin en a prévu une), puis les catégories."""
    screens.poster(provider, contact, "shop")
    return screens.categories(provider, contact)


def _set_language(provider, contact, language: str) -> None:
    contact.language = language
    contact.save(update_fields=["language"])
    screens.welcome(provider, contact)


def _route_reply(provider, contact, reply: str) -> None:
    command, _, argument = reply.partition(":")
    simple = {
        "menu": screens.welcome,
        "shop": _open_shop,
        "search": screens.search_prompt,
        "help": screens.help_screen,
        "next": screens.next_product,
        "list": screens.back_to_list,
    }
    if command in simple:
        return simple[command](provider, contact)
    if command == "cats":                        # cats:<parent|root>:<page>
        parent, _, page = argument.partition(":")
        return screens.categories(provider, contact, _int(parent), _int(page) or 0)
    if command == "cat" and _int(argument):
        return screens.categories(provider, contact, _int(argument))
    if command == "all" and _int(argument):
        return screens.products_of_category(provider, contact, _int(argument))
    if command == "prod" and _int(argument):
        return screens.product_card(provider, contact, _int(argument))
    if command == "plist":
        return screens.product_list(provider, contact, _int(argument) or 0)
    return screens.welcome(provider, contact)   # ancien bouton devenu sans objet


def _int(value: str) -> int | None:
    return int(value) if value and value.isdigit() else None
