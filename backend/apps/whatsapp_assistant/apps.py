# backend/apps/whatsapp_assistant/apps.py

from django.apps import AppConfig


def _courier_notifications_enabled() -> bool:
    """Relu à chaque assignation : couper l'assistant ne demande pas de redémarrage."""
    from .conf import get_config

    config = get_config()
    return config.enabled and config.courier_notifications


class WhatsAppAssistantConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.whatsapp_assistant"
    label = "whatsapp_assistant"
    verbose_name = "Assistant WhatsApp"

    def ready(self):
        # Écoute des assignations de colis. Le branchement se fait ici, dans le
        # module : retirer l'application de INSTALLED_APPS suffit à tout couper.
        from .bridge.deliveries import connect_assignment_signal
        from .conversation.courier import notify_assignment

        connect_assignment_signal(notify_assignment, _courier_notifications_enabled)
