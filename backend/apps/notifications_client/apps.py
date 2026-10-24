# backend/apps/notifications_client/apps.py
from django.apps import AppConfig


class Config(AppConfig):
    name = "apps.notifications_client"
    label = "notifications_client"
    default_auto_field = "django.db.models.BigAutoField"

    def ready(self):
        # Feuille de route D21 : « Envoyer une notification à chaque étape de commande. » Chaque notification de
        # commande inscrite au centre (accounts.UserNotification, type ORDER) part aussi en push.
        from django.db.models.signals import post_save

        from apps.accounts.models import UserNotification

        def _etape_de_commande(sender, instance, created, **kwargs):
            if not created or instance.notification_type != UserNotification.NotificationType.ORDER:
                return
            from .services import pousser_etape

            try:
                pousser_etape(instance.user, instance.title, instance.message, instance.action_url or "")
            except Exception:  # une notification ne bloque jamais l'étape de commande
                import logging

                logging.getLogger("apps.notifications_client").exception("Push d'étape non envoyé")

        post_save.connect(_etape_de_commande, sender=UserNotification, weak=False,
                          dispatch_uid="notifications_client_etapes_commande")
