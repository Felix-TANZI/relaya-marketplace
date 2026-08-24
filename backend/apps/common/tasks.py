# backend/apps/common/tasks.py
# Taches Celery generiques, reutilisables par n'importe quelle app
# (envoi d'email simple hors du cycle requete/reponse).

import logging

from celery import shared_task
from django.core.mail import send_mail

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def send_plain_email(self, subject, message, from_email, recipient_list, fail_silently=False):
    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=from_email,
            recipient_list=recipient_list,
            fail_silently=fail_silently,
        )
    except Exception as exc:
        logger.warning("Echec envoi email a %s : %s", recipient_list, exc)
        raise self.retry(exc=exc)
