# Serveur d'essai : le site (VITE_SOURCE=api) contre le kit, en local. PAS pour la production.
#   .venv/bin/python manage.py runserver 8010 --settings=config.settings_serveur --noreload
# Mêmes réglages que les tests du kit (config/settings.py), plus : base SQLite à part (essai-serveur.sqlite3), l'imitation
# des routes existantes de relaya que le site appelle (relaya_essai), CORS pour les serveurs Vite locaux, photos
# servies, et les routes réservées à l'essai (codes reçus, webhooks, livreurs et relais : relaya_essai/essai.py).
import os

from .settings import *  # noqa: F401,F403
from .settings import BELIVAY_MODELES, CORS_ALLOWED_ORIGINS, ESSAI, INSTALLED_APPS, REST_FRAMEWORK

DEBUG = True  # photos servies par Django (MEDIA_URL) ; jamais en production
DATABASES = {
    "default": {"ENGINE": "django.db.backends.sqlite3", "NAME": os.environ.get("BELIVAY_ESSAI_BASE", str(ESSAI / "essai-serveur.sqlite3"))}
}
ROOT_URLCONF = "config.urls_serveur"
INSTALLED_APPS = [*INSTALLED_APPS, "relaya_essai"]

# Ce que relaya a et que les bouchons n'ont pas : centre de notifications, sessions par appareil (relaya_essai.models).
BELIVAY_MODELES = {**BELIVAY_MODELES, "notification": "relaya_essai.UserNotification", "session": "relaya_essai.UserSession"}

# Site en local : serveur Vite (5173), aperçu du build (4173, 4174), serveur Vite du mode API (5180).
_locaux = [f"http://{h}:{p}" for p in (5173, 5180, 4173, 4174) for h in ("localhost", "127.0.0.1")]
CORS_ALLOWED_ORIGINS = [*CORS_ALLOWED_ORIGINS, *(o for o in _locaux if o not in CORS_ALLOWED_ORIGINS)]
CORS_ALLOWED_ORIGINS += [o for o in os.environ.get("CORS_EXTRA_ORIGINS", "").split(",") if o]

BELIVAY_SITE_URL = os.environ.get("BELIVAY_SITE_URL", "http://localhost:5180")
BELIVAY_ESSAI_ROUTES = True
# Mots de passe : les validateurs de Django, comme relaya (longueur, trop courant, numérique).
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]
REST_FRAMEWORK = {**REST_FRAMEWORK}
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {"console": {"class": "logging.StreamHandler"}},
    "loggers": {"apps": {"handlers": ["console"], "level": "INFO"}, "django.request": {"handlers": ["console"], "level": "WARNING"}},
}
