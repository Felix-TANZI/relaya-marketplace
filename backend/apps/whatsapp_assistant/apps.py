# backend/apps/whatsapp_assistant/apps.py

from django.apps import AppConfig


def _relay_notifications_enabled() -> bool:
    """Relu a chaque ramassage : couper l'assistant ne demande pas de redemarrage."""
    from .conf import get_config

    config = get_config()
    return config.enabled and config.relay_notifications


def _vendor_notifications_enabled() -> bool:
    """Relu a chaque paiement : couper l'assistant ne demande pas de redemarrage."""
    from .conf import get_config

    config = get_config()
    return config.enabled and config.vendor_notifications


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
        from .bridge.relay import connect_pickup_signal
        from .bridge.vendor_orders import connect_payment_signal
        from .conversation.courier import notify_assignment
        from .conversation.relay import notify_parcel_on_the_way
        from .conversation.vendor import notify_paid_order

        connect_assignment_signal(notify_assignment, _courier_notifications_enabled)
        connect_payment_signal(notify_paid_order, _vendor_notifications_enabled)
        connect_pickup_signal(notify_parcel_on_the_way, _relay_notifications_enabled)
