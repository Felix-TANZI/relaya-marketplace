# Projet d'essai du kit de reprise : PAS pour la production.
# Reprend les réglages de relaya-marketplace utiles au kit (backend/relaya/settings/base.py, commit 9546ffe) et
# ajoute exactement ce que REPRISE-BACKEND.md demande d'ajouter chez eux (bloc « AJOUTS DU KIT »).
import os
from datetime import timedelta
from pathlib import Path

ESSAI = Path(__file__).resolve().parent.parent
KIT = ESSAI.parent
DEPOT = KIT.parent

# Clé du projet d'essai uniquement (tests locaux) ; la production fournit DJANGO_SECRET_KEY.
SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "essai-local-non-secret")
DEBUG = False
ALLOWED_HOSTS = ["*"]
USE_TZ = True
TIME_ZONE = "Africa/Douala"
LANGUAGE_CODE = "fr"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
ROOT_URLCONF = "config.urls"
PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"

DATABASES = {"default": {"ENGINE": "django.db.backends.sqlite3", "NAME": ESSAI / "essai.sqlite3"}}
CACHES = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache", "LOCATION": "kit-essai"}}

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "drf_spectacular",
    "corsheaders",
    "django_filters",
    # Bouchons des applications de relaya-marketplace (stubs/apps) : mêmes étiquettes, champs lus par le kit.
    "apps.shipping",
    "apps.vendors",
    "apps.catalog",
    "apps.accounts",
    "apps.orders",
    # ── AJOUTS DU KIT ────────────────────────────────────────────────────────
    "rest_framework_simplejwt.token_blacklist",  # logout_view appelle blacklist() : absent chez relaya
    "apps.client_core",
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
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
]

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ]
        },
    }
]
STATIC_URL = "/static/"
# Photos téléversées (apps.contenus) : relaya a déjà MEDIA_URL / MEDIA_ROOT (ou un stockage S3).
MEDIA_URL = "/media/"
MEDIA_ROOT = ESSAI / "mediafiles"

# Comme relaya-marketplace.
REST_FRAMEWORK = {
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_AUTHENTICATION_CLASSES": ("rest_framework_simplejwt.authentication.JWTAuthentication",),
    "DEFAULT_PERMISSION_CLASSES": ("rest_framework.permissions.IsAuthenticatedOrReadOnly",),
    "DEFAULT_THROTTLE_RATES": {"anon": "300/min", "user": "2000/min", "login": "5/min", "otp": "10/min"},
}
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=1),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,  # possible maintenant que token_blacklist est installée
    "ALGORITHM": "HS256",
    "SIGNING_KEY": SECRET_KEY,
    "AUTH_HEADER_TYPES": ("Bearer",),
}

# ── AJOUTS DU KIT : CORS ─────────────────────────────────────────────────────
from corsheaders.defaults import default_headers  # noqa: E402

CORS_ALLOWED_ORIGINS = ["https://espace-client-exemple.vercel.app", "http://localhost:5173"]
CORS_ALLOW_HEADERS = (*default_headers, "idempotency-key", "x-device-id")
CORS_EXPOSE_HEADERS = ["Retry-After", "Idempotent-Replayed"]
CORS_ALLOW_CREDENTIALS = True

# ── AJOUTS DU KIT : BelivaY ──────────────────────────────────────────────────
# Registre des paramètres (CCH-15) quand la table ParametreMetier est vide : copie livrée avec le kit.
BELIVAY_PARAMETRES_JSON = KIT / "apps" / "client_core" / "donnees" / "parametres-en-vigueur.json"
BELIVAY_INTERRUPTEURS_JSON = KIT / "apps" / "client_core" / "donnees" / "interrupteurs.json"
# Pont vers les modèles de relaya-marketplace (apps.client_core.pont) : étiquette.Modèle.
BELIVAY_MODELES = {
    "produit": "catalog.Product",
    "stock": "catalog.Inventory",
    "vendeur": "vendors.VendorProfile",
    "relais": "accounts.RelayPointProfile",
    "commande": "orders.Order",
    "ligne_commande": "orders.OrderItem",
    "favori": "accounts.UserFavorite",
}
# Classe de colis d'un produit sans fiche logistique (relaya n'a pas de classe : voir REPRISE, décision D3).
BELIVAY_CLASSE_PAR_DEFAUT = None
# Prestataires : « console » écrit dans le journal (développement, essais) ; voir REPRISE, « Prestataires ».
BELIVAY_SMS = "apps.otp.prestataires.SmsConsole"
BELIVAY_PUSH = "apps.notifications_client.prestataires.PushConsole"
BELIVAY_CARTE = "apps.wallet.prestataires.CarteConsole"

# ── AJOUT DU KIT : schéma drf-spectacular sans les routes du kit (contrat : backend-kit/openapi.yaml) ─────
SPECTACULAR_SETTINGS = {"TITLE": "Relaya API (essai)", "PREPROCESSING_HOOKS": ["apps.client_core.schema.sans_routes_du_kit"]}
