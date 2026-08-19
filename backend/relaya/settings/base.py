# backend/relaya/settings/base.py
# Paramètres de base pour le projet backend Relaya.
# Configure les applications, middleware, base de données, internationalisation, etc.

from pathlib import Path
import os
from urllib.parse import parse_qs, unquote, urlparse

BASE_DIR = Path(__file__).resolve().parent.parent.parent

SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "unsafe-key")
DEBUG = False
ALLOWED_HOSTS = ["*"]
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "").strip()

INSTALLED_APPS = [
    # Django
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Enregistre les lookups `__unaccent` et `__trigram_*` utilisés par la
    # recherche tolérante du catalogue (apps/catalog/search.py).
    "django.contrib.postgres",

    # Third-party
    "rest_framework",
    "drf_spectacular",
    "corsheaders",
    "django_filters", 

    # Local apps
    "apps.common",
    "apps.accounts",
    "apps.catalog",
    "apps.orders",
    "apps.payments",
    "apps.shipping",
    'apps.vendors',
    "apps.contact",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    'apps.accounts.middleware.SessionTrackingMiddleware',
    'apps.core.middleware.UserActivityMiddleware',
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "relaya.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "relaya.wsgi.application"

def build_database_config():
    database_url = os.getenv("DATABASE_URL")

    if database_url:
        parsed = urlparse(database_url)
        query = parse_qs(parsed.query)
        sslmode = query.get("sslmode", [os.getenv("POSTGRES_SSLMODE", "require")])[0]

        return {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": unquote(parsed.path.lstrip("/")),
            "USER": unquote(parsed.username or ""),
            "PASSWORD": unquote(parsed.password or ""),
            "HOST": parsed.hostname or "",
            "PORT": str(parsed.port or 5432),
            "OPTIONS": {
                "sslmode": sslmode,
                "connect_timeout": int(os.getenv("POSTGRES_CONNECT_TIMEOUT", "10")),
            },
        }

    return {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.getenv("POSTGRES_DB"),
        "USER": os.getenv("POSTGRES_USER"),
        "PASSWORD": os.getenv("POSTGRES_PASSWORD"),
        "HOST": os.getenv("POSTGRES_HOST"),
        "PORT": os.getenv("POSTGRES_PORT"),
        "OPTIONS": {
            "sslmode": os.getenv("POSTGRES_SSLMODE", "prefer"),
            "connect_timeout": int(os.getenv("POSTGRES_CONNECT_TIMEOUT", "10")),
        },
    }


DATABASES = {
    "default": build_database_config(),
}

REDIS_HOST = os.getenv("REDIS_HOST", "redis").strip()
REDIS_PORT = os.getenv("REDIS_PORT", "6379").strip()
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",
        "LOCATION": f"redis://{REDIS_HOST}:{REDIS_PORT}/1",
    },
}

LANGUAGE_CODE = "fr"
TIME_ZONE = "Africa/Douala"
USE_I18N = True
USE_TZ = True

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "/media/"
MEDIA_ROOT = os.getenv('MEDIA_ROOT', str(BASE_DIR / 'mediafiles'))

R2_STORAGE_ENABLED = os.getenv("USE_R2_STORAGE", "0").strip().lower() in {
    "1", "true", "yes", "on",
}
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID", "").strip()
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY", "").strip()
AWS_STORAGE_BUCKET_NAME = os.getenv("AWS_STORAGE_BUCKET_NAME", "").strip()
AWS_S3_ENDPOINT_URL = os.getenv("AWS_S3_ENDPOINT_URL", "").strip().rstrip("/")
AWS_S3_REGION_NAME = os.getenv("AWS_S3_REGION_NAME", "auto").strip()
AWS_S3_ADDRESSING_STYLE = os.getenv("AWS_S3_ADDRESSING_STYLE", "path").strip()
AWS_DEFAULT_ACL = None
AWS_QUERYSTRING_AUTH = True
AWS_QUERYSTRING_EXPIRE = int(os.getenv("AWS_QUERYSTRING_EXPIRE", "3600"))
AWS_S3_FILE_OVERWRITE = False
AWS_S3_SIGNATURE_VERSION = "s3v4"

R2_STORAGE_ENABLED = R2_STORAGE_ENABLED and all(
    [
        AWS_ACCESS_KEY_ID,
        AWS_SECRET_ACCESS_KEY,
        AWS_STORAGE_BUCKET_NAME,
        AWS_S3_ENDPOINT_URL,
    ]
)

STORAGES = {
    "default": {
        "BACKEND": "apps.common.storage.R2FallbackStorage",
    },
    "staticfiles": {
        "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage",
    },
}
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# CORS
frontend_url = os.getenv("FRONTEND_URL")
CORS_ALLOWED_ORIGINS = [
    origin
    for origin in [
        frontend_url,
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:5175",
        "http://127.0.0.1:5175",
        "http://localhost:5176",
        "http://127.0.0.1:5176",
        "http://localhost:5177",
        "http://127.0.0.1:5177",
        "http://localhost:5178",
        "http://127.0.0.1:5178",
        "http://localhost:5179",
        "http://127.0.0.1:5179",
    ]
    if origin
]
CORS_ALLOW_CREDENTIALS = True

# DRF Settings
REST_FRAMEWORK = {
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticatedOrReadOnly",
    ),
    "DEFAULT_FILTER_BACKENDS": (
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ),
    "DEFAULT_THROTTLE_CLASSES": (
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
        "apps.common.throttling.LoginRateThrottle",
    ),
    "DEFAULT_THROTTLE_RATES": {
        "anon": "300/min",    # généreux : ne gêne pas la navigation
        "user": "2000/min",   # généreux pour les utilisateurs connectés
        "login": "5/min",     # strict : anti-brute-force sur /auth/login
        "payments_webhook": "120/min", # strict : anti-spam sur les webhooks de paiement
    },
}

# DRF Spectacular settings
SPECTACULAR_SETTINGS = {
    "TITLE": "Relaya API",
    "DESCRIPTION": "API privée de la marketplace Relaya",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "TAGS": [
        {"name": "Auth", "description": "Authentification, comptes, rôles, KYC vendeurs"},
        {"name": "Catalog", "description": "Produits, catégories, médias, stock"},
        {"name": "Orders", "description": "Panier, commandes, retours, litiges"},
        {"name": "Payments", "description": "Paiements MTN/Orange Money, transactions, remboursements"},
        {"name": "Shipping", "description": "Livraison, tracking GPS/statuts, points relais"},
        {"name": "Admin", "description": "Modération, contrôles, actions admin"},
        {"name": "CMS", "description": "Pages statiques, bannières, contenu"},
        {"name": "Support", "description": "Tickets, réclamations, décisions"},
        {"name": "Analytics", "description": "KPI, dashboards, exports"},
        {"name": "AI", "description": "Fonctionnalités IA et alertes"},
    ],
}

# JWT Settings
from datetime import timedelta

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=1),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": False,
    "ALGORITHM": "HS256",
    "SIGNING_KEY": SECRET_KEY,
    "AUTH_HEADER_TYPES": ("Bearer",),
    "UPDATE_LAST_LOGIN": True,
}


# ── Sécurité HTTP ───────────────────────────────────────────────────────────
# Sûrs en dev comme en prod (HTTP ou HTTPS) :
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = "same-origin"
X_FRAME_OPTIONS = "DENY"

# Renforcements HTTPS — activés UNIQUEMENT en production (derrière Nginx/HTTPS).
# En dev, SECURE_SSL n'est pas défini → on reste en HTTP sans rien casser.
SECURE_SSL = os.getenv("SECURE_SSL", "0") == "1"
if SECURE_SSL:
    SECURE_SSL_REDIRECT = True
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True


LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'database': {
            'level': 'WARNING',
            'class': 'apps.vendors.log_handler.DatabaseLogHandler',
        },
        'console': {
            'level': 'DEBUG',
            'class': 'logging.StreamHandler',
        },
    },
    'root': {
        'handlers': ['console', 'database'],
        'level': 'WARNING',
    },
    'loggers': {
        'django': { 'handlers': ['console', 'database'], 'level': 'WARNING', 'propagate': False },
        'apps':   { 'handlers': ['console', 'database'], 'level': 'INFO',    'propagate': False },
    },
}


# EMAIL CONFIGURATION 

EMAIL_BACKEND = os.getenv(
    "EMAIL_BACKEND", 
    "django.core.mail.backends.console.EmailBackend"  # Console par défaut
)
EMAIL_HOST = os.getenv("EMAIL_HOST", "smtp.gmail.com")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", 587))
EMAIL_USE_TLS = os.getenv("EMAIL_USE_TLS", "True") == "True"
EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER") or os.getenv("SMTP_GMAIL_EMAIL", "")
EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD") or os.getenv("SMTP_GMAIL_APP_PASSWORD", "")
DEFAULT_FROM_EMAIL = os.getenv(
    "DEFAULT_FROM_EMAIL",
    f"BelivaY <{EMAIL_HOST_USER}>" if EMAIL_HOST_USER else "BelivaY <noreply@belivay.com>",
)

# Email pour le support (depuis PlatformSettings par défaut)
SUPPORT_EMAIL = "support@belivay.com"

# AI / OpenRouter
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "").strip()
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "google/gemma-4-26b-a4b-it:free").strip()
OPENROUTER_SITE_URL = os.getenv("OPENROUTER_SITE_URL", "http://localhost:5174")
OPENROUTER_APP_NAME = os.getenv("OPENROUTER_APP_NAME", "Belivay Catalog Assistant")
OPENROUTER_MAX_TOKENS = int(os.getenv("OPENROUTER_MAX_TOKENS", 700))
OPENROUTER_TEMPERATURE = float(os.getenv("OPENROUTER_TEMPERATURE", 0.25))
OPENROUTER_TIMEOUT_SECONDS = int(os.getenv("OPENROUTER_TIMEOUT_SECONDS", 30))

SUPPORT_EMAIL = "support@belivay.com"

# ── PAIEMENTS — chiffrement des donnees sensibles ────────────────────────────
# La cle vit UNIQUEMENT en variable d'environnement. Jamais en base,
# jamais lisible depuis l'administration.
PAYMENTS_ENCRYPTION_KEY = os.getenv("PAYMENTS_ENCRYPTION_KEY", "")
# Deuxieme cle acceptee en lecture pendant une rotation.
PAYMENTS_ENCRYPTION_KEY_OLD = os.getenv("PAYMENTS_ENCRYPTION_KEY_OLD", "")
PAYMENTS_FINGERPRINT_SALT = os.getenv("PAYMENTS_FINGERPRINT_SALT", "belivay-momo")

# ── CAMPAY — secrets en environnement UNIQUEMENT ─────────────────────────────
# Jamais en base, jamais lisibles depuis l'administration.
CAMPAY_TOKEN = os.getenv("CAMPAY_TOKEN", "")
CAMPAY_TOKEN_SANDBOX = os.getenv("CAMPAY_TOKEN_SANDBOX", "")
CAMPAY_TOKEN_LIVE = os.getenv("CAMPAY_TOKEN_LIVE", "")
CAMPAY_WEBHOOK_KEY = os.getenv("CAMPAY_WEBHOOK_KEY", "")


# ========================================
# PRODUCTION HTTPS & CSRF CONFIGURATION
# ========================================

# CSRF Configuration pour HTTPS
CSRF_TRUSTED_ORIGINS = [
    'https://belivay.com',
    'https://www.belivay.com',
]

# Sécurité HTTPS en production
if not DEBUG:
    CSRF_COOKIE_SECURE = True
    SESSION_COOKIE_SECURE = True
    SECURE_SSL_REDIRECT = False  # Géré par nginx
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# CORS pour production
CORS_ALLOWED_ORIGINS += [
    'https://belivay.com',
    'https://www.belivay.com',
]
