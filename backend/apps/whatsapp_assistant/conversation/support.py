# backend/apps/whatsapp_assistant/conversation/support.py
# Parler à un humain : le client décrit son problème, la demande part dans le
# guichet de BelivaY (ContactMessage, celui du formulaire du site), l'équipe
# est prévenue, et l'assistant se met en retrait pour laisser un conseiller
# répondre dans la même conversation WhatsApp.
#
# Identifiants des boutons :
#   human       « Un conseiller » — ouvre la demande
#
# États mémorisés dans contact.state :
#   support:ask     on attend qu'il décrive son problème
#   support:email   on attend son adresse, faute de l'avoir trouvée
#   human           un conseiller a la main ; l'assistant se tait
#
# Ce silence est essentiel : sans lui, le robot répondrait par-dessus votre
# conseiller et le client recevrait deux voix contradictoires.

import logging
import re
from datetime import timedelta

from django.utils import timezone

from apps.whatsapp_assistant.bridge import support as support_bridge
from apps.whatsapp_assistant.conf import get_config
from apps.whatsapp_assistant.models import WhatsAppContact

from .outbox import send_text
from .texts import t

logger = logging.getLogger("apps.whatsapp_assistant")

COMMANDS = ("human",)
ASKING = "support:ask"
ASKING_EMAIL = "support:email"
HANDED_OVER = "human"
MIN_MESSAGE = 10

EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s.]+\.[a-z]{2,}$", re.IGNORECASE)

# Personne n'ecrit la meme formule : « humain », « je veux parler a un
# conseiller », « j ai une reclamation »... On reconnait donc un mot declencheur
# entier, dans une phrase courte — une recherche d'article, elle, est plus
# longue ou ne contient aucun de ces mots.
TRIGGERS = {"humain", "humaine", "conseiller", "conseillere", "agent", "operateur",
            "reclamation", "plainte", "assistance", "sav",
            "human", "adviser", "advisor", "operator", "complaint", "someone"}
MAX_WORDS = 8
CANCEL_WORDS = {"annuler", "annule", "stop", "retour", "cancel", "back"}
# Ce qui ramène l'assistant quand un conseiller a la main.
RESUME_WORDS = {"menu", "accueil", "home", "start", "assistant", "robot", "bot"}


def handle_incoming(provider, contact: WhatsAppContact, message, words: str) -> bool:
    """
    Point d'entrée unique, consulté avant tout le reste et pour TOUT type de
    message — y compris une photo ou un vocal : quand un conseiller a la main,
    l'assistant doit se taire quoi qu'il arrive.

    Renvoie True si le message a été pris en charge (réponse envoyée, ou
    silence volontaire), False si la conversation doit suivre son cours.
    """
    if contact.state == HANDED_OVER:
        return _while_human(provider, contact, words)

    reply = message.reply_id
    if reply and reply.partition(":")[0] in COMMANDS:
        _ask(provider, contact)
        return True
    if reply or message.type != "text":
        return False

    raw = (message.text or "").strip()
    if contact.state == ASKING:
        _submit(provider, contact, words, raw)
        return True
    if contact.state == ASKING_EMAIL:
        _submit_email(provider, contact, words, raw)
        return True
    if _asks_for_a_human(words):
        _ask(provider, contact)
        return True
    return False


def _asks_for_a_human(words: str) -> bool:
    """Vrai si cette phrase courte contient un mot qui reclame une personne."""
    mots = words.split()
    return len(mots) <= MAX_WORDS and bool(TRIGGERS & set(mots))


# ── Ouvrir la demande ──────────────────────────────────────────────────────

def _ask(provider, contact) -> None:
    _remember(contact, ASKING)
    send_text(provider, contact, t(_language(contact), "human_ask"))


def _submit(provider, contact, words: str, raw: str) -> None:
    language = _language(contact)
    if words in CANCEL_WORDS:
        return _cancel(provider, contact, language)

    message = (raw or "").strip()
    if len(message) < MIN_MESSAGE:
        send_text(provider, contact, t(language, "human_too_short"))
        return

    email = support_bridge.email_of_phone(contact.wa_id)
    if not email:
        # On ne connaît pas son adresse : on la demande une seule fois, en
        # gardant son message de côté pour ne pas le lui faire retaper.
        contact.state = ASKING_EMAIL
        contact.context = {"message": message[:support_bridge.MAX_MESSAGE]}
        contact.save(update_fields=["state", "context"])
        send_text(provider, contact, t(language, "human_ask_email"))
        return

    _deliver(provider, contact, language, message, email)


def _submit_email(provider, contact, words: str, raw: str) -> None:
    language = _language(contact)
    if words in CANCEL_WORDS:
        return _cancel(provider, contact, language)

    email = (raw or "").strip()
    if not EMAIL_PATTERN.match(email):
        send_text(provider, contact, t(language, "human_bad_email"))
        return

    message = (contact.context or {}).get("message", "")
    _deliver(provider, contact, language, message, email)


def _deliver(provider, contact, language: str, message: str, email: str) -> None:
    config = get_config()
    try:
        reference = support_bridge.open_request(
            wa_id=contact.wa_id,
            name=support_bridge.name_of_phone(contact.wa_id, contact.profile_name),
            email=email,
            message=message,
        )
    except Exception:                                       # noqa: BLE001
        logger.exception("Demande d'aide impossible pour +%s.", contact.wa_id)
        reference = None

    if reference is None:
        _remember(contact, "")
        send_text(provider, contact, t(language, "human_failed",
                                       phone=config.support_phone, email=config.support_email))
        return

    _hand_over(contact, config)
    send_text(provider, contact, t(language, "human_sent", ref=reference))


def _cancel(provider, contact, language: str) -> None:
    _remember(contact, "")
    send_text(provider, contact, t(language, "human_cancelled"))


# ── Pendant qu'un conseiller a la main ─────────────────────────────────────

def _hand_over(contact: WhatsAppContact, config) -> None:
    fin = timezone.now() + timedelta(hours=config.human_handover_hours)
    contact.state = HANDED_OVER
    contact.context = {"until": fin.isoformat()}
    contact.save(update_fields=["state", "context"])


def _while_human(provider, contact, words: str) -> bool:
    """
    L'assistant se tait. Le message reste journalisé — votre conseiller le lit
    dans l'admin — mais rien ne part automatiquement.
    """
    if words in RESUME_WORDS:
        resume(contact)
        from . import screens

        send_text(provider, contact, t(_language(contact), "human_back"))
        screens.welcome(provider, contact)
        return True

    if _expired(contact):
        resume(contact)
        return False                                # l'assistant reprend son cours normal
    return True                                     # silence volontaire


def _expired(contact: WhatsAppContact) -> bool:
    from django.utils.dateparse import parse_datetime

    fin = parse_datetime((contact.context or {}).get("until") or "")
    return fin is None or fin <= timezone.now()


def resume(contact: WhatsAppContact) -> None:
    """Rend la main à l'assistant."""
    contact.state = ""
    contact.context = {}
    contact.save(update_fields=["state", "context"])


def is_handed_over(contact: WhatsAppContact) -> bool:
    return contact.state == HANDED_OVER and not _expired(contact)


def _language(contact: WhatsAppContact) -> str:
    return contact.language or "fr"


def _remember(contact: WhatsAppContact, state: str) -> None:
    contact.state = state
    contact.context = {}
    contact.save(update_fields=["state", "context"])
