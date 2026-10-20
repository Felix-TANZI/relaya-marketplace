# backend/apps/accounts/apple.py
# Échanges serveur-à-serveur avec Apple pour "Sign in with Apple" :
#   - échange du code d'autorisation contre un refresh_token (à la connexion),
#   - révocation de ce jeton lors de la suppression du compte
#     (App Store Review Guideline 5.1.1(v)).
#
# Les deux appels exigent un client_secret : un JWT ES256 signé avec la clé
# privée .p8 générée dans le compte Apple Developer (Keys > Sign in with Apple).
# Configuration (variables d'environnement) : APPLE_TEAM_ID, APPLE_KEY_ID et
# APPLE_PRIVATE_KEY (contenu du .p8, les "\n" échappés sont acceptés) ou
# APPLE_PRIVATE_KEY_PATH (chemin vers le fichier .p8).
#
# Le refresh_token est chiffré au repos (Fernet, clé dérivée de SECRET_KEY).

import base64
import hashlib
import logging
import time

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

APPLE_TOKEN_URL = "https://appleid.apple.com/auth/token"
APPLE_REVOKE_URL = "https://appleid.apple.com/auth/revoke"
APPLE_AUDIENCE = "https://appleid.apple.com"
REQUEST_TIMEOUT = 10


class AppleNotConfigured(Exception):
    """La clé serveur Sign in with Apple (.p8) n'est pas configurée."""


def _private_key():
    key = (getattr(settings, "APPLE_PRIVATE_KEY", "") or "").strip()
    if not key:
        path = (getattr(settings, "APPLE_PRIVATE_KEY_PATH", "") or "").strip()
        if path:
            with open(path, "r", encoding="utf-8") as handle:
                key = handle.read().strip()
    return key.replace("\\n", "\n")


def is_configured():
    return bool(
        getattr(settings, "APPLE_TEAM_ID", "")
        and getattr(settings, "APPLE_KEY_ID", "")
        and (getattr(settings, "APPLE_PRIVATE_KEY", "") or getattr(settings, "APPLE_PRIVATE_KEY_PATH", ""))
    )


def build_client_secret(client_id):
    """JWT ES256 exigé par Apple comme client_secret (valable 5 minutes)."""
    import jwt

    if not is_configured():
        raise AppleNotConfigured("APPLE_TEAM_ID / APPLE_KEY_ID / APPLE_PRIVATE_KEY manquants.")
    now = int(time.time())
    return jwt.encode(
        {
            "iss": settings.APPLE_TEAM_ID,
            "iat": now,
            "exp": now + 300,
            "aud": APPLE_AUDIENCE,
            "sub": client_id,
        },
        _private_key(),
        algorithm="ES256",
        headers={"kid": settings.APPLE_KEY_ID},
    )


def exchange_authorization_code(code, client_id):
    """Échange le code d'autorisation (usage unique, valable 5 min) contre les
    jetons Apple. Retourne le refresh_token, ou une chaîne vide si Apple n'en
    renvoie pas. Lève une exception en cas d'échec réseau ou de refus."""
    response = requests.post(
        APPLE_TOKEN_URL,
        data={
            "client_id": client_id,
            "client_secret": build_client_secret(client_id),
            "code": code,
            "grant_type": "authorization_code",
        },
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        timeout=REQUEST_TIMEOUT,
    )
    if response.status_code != 200:
        raise ValueError(f"Apple /auth/token a répondu {response.status_code}: {response.text[:200]}")
    return str(response.json().get("refresh_token") or "")


def revoke_token(token, client_id, token_type_hint="refresh_token"):
    """Révoque un jeton Apple. Apple répond 200 y compris si le jeton est
    déjà invalide. Lève une exception en cas d'échec."""
    response = requests.post(
        APPLE_REVOKE_URL,
        data={
            "client_id": client_id,
            "client_secret": build_client_secret(client_id),
            "token": token,
            "token_type_hint": token_type_hint,
        },
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        timeout=REQUEST_TIMEOUT,
    )
    if response.status_code != 200:
        raise ValueError(f"Apple /auth/revoke a répondu {response.status_code}: {response.text[:200]}")


# ── Chiffrement du refresh_token au repos ─────────────────────────────────────

def _fernet():
    from cryptography.fernet import Fernet

    digest = hashlib.sha256(f"apple-refresh-token:{settings.SECRET_KEY}".encode("utf-8")).digest()
    return Fernet(base64.urlsafe_b64encode(digest))


def encrypt_token(token):
    return _fernet().encrypt(token.encode("utf-8")).decode("ascii") if token else ""


def decrypt_token(value):
    if not value:
        return ""
    try:
        return _fernet().decrypt(value.encode("ascii")).decode("utf-8")
    except Exception:
        logger.warning("Impossible de déchiffrer le refresh_token Apple (SECRET_KEY modifiée ?)")
        return ""
