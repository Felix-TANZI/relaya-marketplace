# backend/apps/whatsapp_assistant/providers/__init__.py

from django.core.exceptions import ImproperlyConfigured

from apps.whatsapp_assistant.conf import WhatsAppConfig, get_config

from .base import Button, IncomingMessage, ListRow, ListSection, ProviderError, WhatsAppProvider
from .meta_cloud import MetaCloudProvider

PROVIDERS = {
    MetaCloudProvider.name: MetaCloudProvider,
}


def get_provider(config: WhatsAppConfig | None = None) -> WhatsAppProvider:
    """Fournisseur choisi par WHATSAPP_PROVIDER (défaut : meta)."""
    config = config or get_config()
    try:
        return PROVIDERS[config.provider](config)
    except KeyError as error:
        raise ImproperlyConfigured(
            f"WHATSAPP_PROVIDER « {config.provider} » inconnu ({', '.join(PROVIDERS)})."
        ) from error


__all__ = [
    "Button", "IncomingMessage", "ListRow", "ListSection",
    "ProviderError", "WhatsAppProvider", "get_provider",
]
