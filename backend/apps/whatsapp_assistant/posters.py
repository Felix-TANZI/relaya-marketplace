# backend/apps/whatsapp_assistant/posters.py
# Choix de l'affiche à montrer : par moment (accueil, recherche), campagnes
# actives, chacune à son tour, et pas plus d'une affiche par client et par
# moment sur une période (pas de harcèlement).

from datetime import timedelta

from django.db.models import Q
from django.utils import timezone

from .conf import get_config
from .models import WhatsAppContact, WhatsAppMessage, WhatsAppPoster


def message_type_for(placement: str) -> str:
    """Type journalisé de l'envoi : sert à la rotation et au délai, moment par moment."""
    return f"poster_{placement}"


def active_posters(placement: str):
    now = timezone.now()
    return (
        WhatsAppPoster.objects.filter(is_active=True, placement=placement)
        .filter(Q(starts_at__isnull=True) | Q(starts_at__lte=now))
        .filter(Q(ends_at__isnull=True) | Q(ends_at__gte=now))
        .order_by("display_order", "id")
    )


def next_poster(contact: WhatsAppContact, placement: str) -> WhatsAppPoster | None:
    posters = list(active_posters(placement))
    if not posters:
        return None
    sent = contact.messages.filter(
        direction=WhatsAppMessage.Direction.OUTBOUND, message_type=message_type_for(placement), error="",
    )
    last = sent.order_by("-created_at").first()
    cooldown = timedelta(minutes=get_config().poster_cooldown_minutes)
    if last and last.created_at > timezone.now() - cooldown:
        return None
    return posters[sent.count() % len(posters)]   # rotation : chacune son tour


def caption_for(poster: WhatsAppPoster, language: str) -> str:
    if language == "en":
        return poster.caption_en or poster.caption_fr
    if language == "fr":
        return poster.caption_fr or poster.caption_en
    # Langue pas encore choisie : les deux.
    if poster.caption_fr and poster.caption_en:
        return f"{poster.caption_fr}\n\n_{poster.caption_en}_"
    return poster.caption_fr or poster.caption_en
