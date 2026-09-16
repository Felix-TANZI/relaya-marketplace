# backend/apps/whatsapp_assistant/conf.py
# Configuration du module, lue à chaque appel : les réglages Django priment
# (tests), puis les variables d'environnement (.env). Rien n'est ajouté au
# settings.py du projet : le module reste détachable.

import os
from dataclasses import dataclass

from django.conf import settings

TRUE_VALUES = {"1", "true", "yes", "on"}


def _setting(name: str, default: str = "") -> str:
    """
    La valeur du reglage : celle de Django (tests), sinon l'environnement,
    sinon le defaut.

    Une valeur VIDE vaut absence. C'est indispensable en production : le
    deploiement genere le .env.prod depuis les variables GitHub, et une
    variable non renseignee y ecrit une ligne vide. Sans cette regle, elle
    ecraserait le defaut et l'assistant se retrouverait, par exemple, avec une
    adresse de site vide et plus aucun bouton.
    """
    value = getattr(settings, name, None)
    if value is None:
        value = os.getenv(name, "")
    value = str(value).strip()
    return value or default


@dataclass(frozen=True)
class WhatsAppConfig:
    enabled: bool
    provider: str
    verify_token: str
    app_secret: str
    access_token: str
    phone_number_id: str
    graph_api_version: str
    assistant_name: str
    support_phone: str
    support_email: str
    # Délai minimal entre deux affiches publicitaires pour un même client.
    poster_cooldown_minutes: int
    # Source du catalogue : « local » (base du serveur) ou « remote » (site en ligne).
    catalog_source: str = "local"
    catalog_api_url: str = "https://belivay.com"
    catalog_cache_seconds: int = 60
    # Site vers lequel pointent les liens envoyes au client (fiche commande,
    # page produit). Doit etre en HTTPS : WhatsApp refuse tout autre lien.
    site_url: str = "https://belivay.com"
    # Livreurs : compte WhatsApp Business (modèles de message), envoi à l'assignation.
    business_account_id: str = ""
    courier_notifications: bool = True
    # Développement : tous les messages livreurs partent vers ce numéro (vide en production).
    courier_notify_override: str = ""
    courier_app_url: str = "https://courier.belivay.com/courier"
    # Vendeurs : envoi au paiement d'une commande.
    vendor_notifications: bool = True
    vendor_notify_override: str = ""
    vendor_app_url: str = "https://seller.belivay.com/seller"
    # Points relais : envoi au ramassage du colis chez le vendeur.
    relay_notifications: bool = True
    relay_notify_override: str = ""
    relay_app_url: str = "https://relay-point.belivay.com/relay-point"
    # Heures pendant lesquelles l'assistant se tait apres avoir passe la
    # main a un conseiller, pour ne pas parler par-dessus lui.
    human_handover_hours: int = 6
    # Clients : envoi a chaque etape de la livraison.
    customer_notifications: bool = True
    customer_notify_override: str = ""


def get_config() -> WhatsAppConfig:
    return WhatsAppConfig(
        enabled=_setting("WHATSAPP_ASSISTANT_ENABLED", "0").lower() in TRUE_VALUES,
        provider=_setting("WHATSAPP_PROVIDER", "meta").lower(),
        verify_token=_setting("WHATSAPP_VERIFY_TOKEN"),
        app_secret=_setting("WHATSAPP_APP_SECRET"),
        access_token=_setting("WHATSAPP_ACCESS_TOKEN"),
        phone_number_id=_setting("WHATSAPP_PHONE_NUMBER_ID"),
        graph_api_version=_setting("WHATSAPP_GRAPH_API_VERSION", "v23.0"),
        assistant_name=_setting("WHATSAPP_ASSISTANT_NAME", "BelivaY"),
        support_phone=_setting("WHATSAPP_SUPPORT_PHONE", "+237 689 00 28 12"),
        support_email=_setting("WHATSAPP_SUPPORT_EMAIL", "contact@belivay.com"),
        poster_cooldown_minutes=_int_setting("WHATSAPP_POSTER_COOLDOWN_MINUTES", 60),
        catalog_source=_setting("WHATSAPP_CATALOG_SOURCE", "local").lower(),
        catalog_api_url=_setting("WHATSAPP_CATALOG_API_URL", "https://belivay.com").rstrip("/"),
        catalog_cache_seconds=_int_setting("WHATSAPP_CATALOG_CACHE_SECONDS", 60),
        # Par defaut, le site d'ou vient deja le catalogue.
        site_url=(_setting("WHATSAPP_SITE_URL") or _setting("WHATSAPP_CATALOG_API_URL", "https://belivay.com")).rstrip("/"),
        business_account_id=_setting("WHATSAPP_BUSINESS_ACCOUNT_ID"),
        courier_notifications=_setting("WHATSAPP_COURIER_NOTIFICATIONS", "1").lower() in TRUE_VALUES,
        courier_notify_override="".join(ch for ch in _setting("WHATSAPP_COURIER_NOTIFY_OVERRIDE") if ch.isdigit()),
        courier_app_url=_setting("WHATSAPP_COURIER_APP_URL", "https://courier.belivay.com/courier"),
        vendor_notifications=_setting("WHATSAPP_VENDOR_NOTIFICATIONS", "1").lower() in TRUE_VALUES,
        vendor_notify_override="".join(ch for ch in _setting("WHATSAPP_VENDOR_NOTIFY_OVERRIDE") if ch.isdigit()),
        vendor_app_url=_setting("WHATSAPP_VENDOR_APP_URL", "https://seller.belivay.com/seller"),
        relay_notifications=_setting("WHATSAPP_RELAY_NOTIFICATIONS", "1").lower() in TRUE_VALUES,
        relay_notify_override="".join(ch for ch in _setting("WHATSAPP_RELAY_NOTIFY_OVERRIDE") if ch.isdigit()),
        relay_app_url=_setting("WHATSAPP_RELAY_APP_URL", "https://relay-point.belivay.com/relay-point"),
        human_handover_hours=_int_setting("WHATSAPP_HUMAN_HANDOVER_HOURS", 6),
        customer_notifications=_setting("WHATSAPP_CUSTOMER_NOTIFICATIONS", "1").lower() in TRUE_VALUES,
        customer_notify_override="".join(ch for ch in _setting("WHATSAPP_CUSTOMER_NOTIFY_OVERRIDE") if ch.isdigit()),
    )


def _int_setting(name: str, default: int) -> int:
    value = _setting(name, str(default))
    return int(value) if value.isdigit() else default
