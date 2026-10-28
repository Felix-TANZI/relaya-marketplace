# backend/apps/common/tasks.py
# Taches Celery generiques, reutilisables par n'importe quelle app
# (envoi d'email simple hors du cycle requete/reponse).

import logging

from celery import shared_task
from django.core.mail import send_mail

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def envoyer_courriels(self, charges):
    """
    Envoie les messages mis en file par `apps.common.mail.CeleryEmailBackend`.

    Passe par le backend REEL : repasser par le backend Celery remettrait le
    message en file indefiniment.
    """
    from apps.common.mail import envoyer_maintenant

    try:
        return envoyer_maintenant(charges)
    except Exception as exc:  # noqa: BLE001 — toute panne doit mener a un reessai
        destinataires = [d for charge in charges for d in charge.get("to", [])]
        logger.warning("Echec envoi de %d e-mail(s) a %s : %s",
                       len(charges), destinataires, exc)
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def send_plain_email(self, subject, message, from_email, recipient_list, fail_silently=False):
    """
    Ancienne tache, conservee : plusieurs appelants l'utilisent deja
    (`apps/accounts`, `apps/vendors`).

    Depuis que `EMAIL_BACKEND` met les envois en file, `send_mail` appele ici
    repasserait par la file — une tache qui en programme une autre pour rien.
    On vise donc directement le backend reel.
    """
    from apps.common.mail import connexion_reelle

    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=from_email,
            recipient_list=recipient_list,
            fail_silently=fail_silently,
            connection=connexion_reelle(),
        )
    except Exception as exc:  # noqa: BLE001 — toute panne doit mener a un reessai
        logger.warning("Echec envoi email a %s : %s", recipient_list, exc)
        raise self.retry(exc=exc)
