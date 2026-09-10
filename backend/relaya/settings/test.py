# backend/relaya/settings/test.py
# Réglages dédiés aux tests automatisés.
# Hérite de base, accélère le hachage, neutralise l'envoi d'e-mails et le
# handler de logs base de données. La base de test est créée/détruite
# automatiquement par pytest-django (préfixe test_) — la prod n'est JAMAIS touchée.

from .base import *  # noqa: F401,F403
import os

DEBUG = False
R2_STORAGE_ENABLED = False

if os.getenv("USE_SQLITE_FOR_TESTS", "").strip().lower() in {"1", "true", "yes", "on"}:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "test.sqlite3",
        }
    }

    class DisableMigrations(dict):
        def __contains__(self, item):
            return True

        def __getitem__(self, item):
            return None

    MIGRATION_MODULES = DisableMigrations()
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": "belivay-tests",
        }
    }

# Hachage rapide en test (sécurité non requise sur une base jetable)
PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]

# Pas d'envoi réel d'e-mail pendant les tests
EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
PAYMENTS_ENCRYPTION_KEY = "belivay-test-encryption-key"

# Logging minimal : on évite le handler base de données (apps.vendors.log_handler)
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {"console": {"class": "logging.StreamHandler"}},
    "root": {"handlers": ["console"], "level": "ERROR"},
}
