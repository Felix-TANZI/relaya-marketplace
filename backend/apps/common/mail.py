# backend/apps/common/mail.py
# Envoi des e-mails hors du fil de la requete.
#
# POURQUOI CE FICHIER
#
# Le projet envoyait ses e-mails de trois facons :
#   - `send_plain_email.delay(...)` (Celery) pour les comptes et les vendeurs ;
#   - `EmailMultiAlternatives(...).send()` en direct pour le formulaire de
#     contact — donc un aller-retour SMTP dans la requete de l'utilisateur ;
#   - `send_mail(...)` en direct dans le moteur de codes du kit espace-client.
#
# Trois comportements pour une meme chose, et deux d'entre eux bloquent la
# requete le temps du dialogue avec le serveur SMTP. Pour un code de connexion,
# cela veut dire une page qui attend Gmail avant de repondre.
#
# Plutot que de modifier chaque appelant — en particulier le kit, qu'on veut
# garder identique a sa source pour pouvoir le mettre a jour — on agit au seul
# endroit que Django fait traverser a TOUS les envois : le backend e-mail.
# `send_mail`, `EmailMessage.send()` et tout le reste passent par lui.
#
# NE JAMAIS PERDRE UN E-MAIL
#
# Un code de connexion ou une reinitialisation de mot de passe qui disparait
# est pire qu'un e-mail lent. Si la file Celery est injoignable, on bascule
# donc en envoi direct plutot que d'echouer en silence.

from __future__ import annotations

import logging

from django.conf import settings
from django.core.mail import get_connection
from django.core.mail.backends.base import BaseEmailBackend
from django.core.mail.message import EmailMessage, EmailMultiAlternatives

logger = logging.getLogger(__name__)

#: Reglage qui designe le backend chargé de l'envoi REEL (SMTP, console...).
#: Sans lui, la tache rappellerait ce backend-ci et tournerait en rond.
REGLAGE_BACKEND_REEL = "EMAIL_BACKEND_REEL"
BACKEND_REEL_PAR_DEFAUT = "django.core.mail.backends.smtp.EmailBackend"


def connexion_reelle():
    """Connexion vers le backend qui parle vraiment au serveur de mail."""
    return get_connection(
        backend=getattr(settings, REGLAGE_BACKEND_REEL, BACKEND_REEL_PAR_DEFAUT),
        fail_silently=False,
    )


def serialiser(message: EmailMessage) -> dict:
    """
    Reduit un message a des types que Celery sait transporter en JSON.

    On garde les pieces jointes et les variantes HTML : le formulaire de
    contact en envoie, et les perdre au passage serait une regression.
    """
    return {
        "subject": message.subject,
        "body": message.body,
        "from_email": message.from_email,
        "to": list(message.to),
        "cc": list(message.cc),
        "bcc": list(message.bcc),
        "reply_to": list(message.reply_to),
        "alternatives": [
            [contenu, type_mime]
            for contenu, type_mime in getattr(message, "alternatives", [])
        ],
        "attachments": [
            [nom, contenu, type_mime]
            for nom, contenu, type_mime in message.attachments
            if isinstance(contenu, str)  # les pieces binaires restent hors file
        ],
    }


def reconstruire(charge: dict) -> EmailMessage:
    """Refabrique le message a partir de sa forme transportable."""
    message = EmailMultiAlternatives(
        subject=charge.get("subject", ""),
        body=charge.get("body", ""),
        from_email=charge.get("from_email") or None,
        to=charge.get("to") or [],
        cc=charge.get("cc") or [],
        bcc=charge.get("bcc") or [],
        reply_to=charge.get("reply_to") or [],
    )
    for contenu, type_mime in charge.get("alternatives") or []:
        message.attach_alternative(contenu, type_mime)
    for nom, contenu, type_mime in charge.get("attachments") or []:
        message.attach(nom, contenu, type_mime)
    return message


def envoyer_maintenant(charges: list[dict]) -> int:
    """Envoie pour de bon, via le backend reel."""
    messages = [reconstruire(charge) for charge in charges]
    if not messages:
        return 0
    return connexion_reelle().send_messages(messages) or 0


class CeleryEmailBackend(BaseEmailBackend):
    """
    Backend e-mail qui confie l'envoi a Celery.

    Il ne parle jamais au serveur SMTP lui-meme : il met le message en file et
    rend la main tout de suite. La tache, elle, utilise le backend reel.
    """

    def send_messages(self, email_messages):
        if not email_messages:
            return 0

        charges = [serialiser(message) for message in email_messages]

        # Import tardif : apps.common.tasks importe Celery, qui importe les
        # reglages. Au niveau module, cela creerait un cycle au demarrage.
        from apps.common.tasks import envoyer_courriels

        try:
            envoyer_courriels.delay(charges)
        except Exception as erreur:  # noqa: BLE001 — voir ci-dessous
            # Largeur VOULUE : broker arrete, DNS casse, serialisation refusee,
            # Celery mal configure... peu importe la panne, la seule reponse
            # acceptable est d'envoyer tout de suite. Restreindre a quelques
            # types laisserait passer le cas qu'on n'a pas prevu, et un code de
            # connexion disparaitrait en silence.
            logger.warning(
                "File Celery injoignable pour %d e-mail(s) (%s) — envoi direct.",
                len(charges), erreur,
            )
            try:
                return envoyer_maintenant(charges)
            except Exception:  # dernier recours : on trace, puis on relaie
                logger.exception("Envoi direct de secours echoue.")
                if not self.fail_silently:
                    raise
                return 0

        return len(charges)
