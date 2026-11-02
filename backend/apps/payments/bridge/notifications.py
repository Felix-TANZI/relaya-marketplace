# backend/apps/payments/bridge/notifications.py
# Prévenir une personne de l'équipe (DP-42 : rappels aux valideurs du vendredi). Le pont est le seul endroit du module
# financier autorisé à écrire dans les notifications des comptes (P1).

import logging

logger = logging.getLogger("apps.payments")


def prevenir(user, titre: str, message: str) -> None:
    """Notification dans l'espace de la personne, et e-mail si elle en a un. N'interrompt jamais l'appelant."""
    from django.conf import settings
    from django.core.mail import send_mail

    from apps.accounts.models import UserNotification

    UserNotification.objects.create(user=user, title=titre[:160], message=message,
                                    notification_type=UserNotification.NotificationType.PAYMENT)
    if user.email:
        try:
            send_mail(titre, message, getattr(settings, "DEFAULT_FROM_EMAIL", None), [user.email], fail_silently=True)
        except Exception:  # noqa: BLE001 — un e-mail manqué ne bloque pas le rappel dans l'espace
            logger.warning("Rappel DP-42 : e-mail non envoyé à %s.", user.pk)
