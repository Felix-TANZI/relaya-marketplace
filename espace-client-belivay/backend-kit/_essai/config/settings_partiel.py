# Réglages d'essai réduits : seulement les applications nommées dans BELIVAY_APPS (séparées par des virgules) en plus
# du socle et des bouchons. Sert à générer les migrations d'une application pendant que d'autres sont en chantier :
#   BELIVAY_APPS=cart,pickup .venv/bin/python manage.py makemigrations cart --settings=config.settings_partiel
import os

from .settings import *  # noqa: F401,F403
from .settings import INSTALLED_APPS

_garde = {f"apps.{a.strip()}" for a in os.environ.get("BELIVAY_APPS", "").split(",") if a.strip()} | {"apps.client_core"}
_kit = {
    "apps.otp",
    "apps.client_accounts",
    "apps.notifications_client",
    "apps.cart",
    "apps.pickup",
    "apps.aftersales",
    "apps.messaging",
    "apps.wallet",
    "apps.subscriptions",
    "apps.wishlists",
    "apps.diaspora",
    "apps.extras",
    "apps.recus",
    "apps.contenus",
}
INSTALLED_APPS = [a for a in INSTALLED_APPS if a not in _kit or a in _garde]
