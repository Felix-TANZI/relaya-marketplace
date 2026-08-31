# backend/apps/payments/payees/crypto.py
# Chiffrement des numeros Mobile Money au repos.
#
# POURQUOI CHIFFRER
#   Un numero MoMo est une donnee personnelle ET le point d'arrivee de
#   l'argent. Une fuite de la base exposerait a la fois la vie privee des
#   partenaires et la cible d'une attaque par substitution.
#
# POURQUOI REVERSIBLE
#   Un hachage ne suffit pas : il faut restituer le numero en clair pour
#   emettre le versement chez le prestataire. On chiffre donc, on ne hache pas.
#
# LA CLE
#   PAYMENTS_ENCRYPTION_KEY, variable d'environnement uniquement.
#   Jamais en base, jamais lisible depuis l'administration.
#
# ROTATION
#   PAYMENTS_ENCRYPTION_KEY_OLD permet de dechiffrer avec l'ancienne cle
#   pendant la fenetre de rotation. Les nouvelles ecritures utilisent
#   toujours la cle courante.

from __future__ import annotations

import base64
import hashlib

from django.conf import settings


class EncryptionNotConfigured(Exception):
    """La cle de chiffrement n'est pas definie dans l'environnement."""


class DecryptionFailed(Exception):
    """Le dechiffrement a echoue — cle incorrecte ou donnee corrompue."""


def _fernet_class():
    try:
        from cryptography.fernet import Fernet, InvalidToken  # noqa: F401
        return Fernet
    except ImportError as exc:  # pragma: no cover
        raise EncryptionNotConfigured(
            "Le paquet 'cryptography' est requis pour chiffrer les numeros "
            "Mobile Money. Ajouter cryptography a requirements.txt."
        ) from exc


def _normalise_key(raw: str) -> bytes:
    """
    Accepte une cle Fernet (44 caracteres base64) ou une phrase secrete.

    Une phrase secrete est derivee en SHA-256 puis encodee — pratique en
    developpement, mais une vraie cle Fernet est attendue en production.
    """
    raw = (raw or "").strip()
    if not raw:
        raise EncryptionNotConfigured(
            "PAYMENTS_ENCRYPTION_KEY absente. Generer une cle avec :\n"
            "  python -c \"from cryptography.fernet import Fernet; "
            "print(Fernet.generate_key().decode())\""
        )
    if len(raw) == 44 and raw.endswith("="):
        return raw.encode()
    derivee = hashlib.sha256(raw.encode("utf-8")).digest()
    return base64.urlsafe_b64encode(derivee)


def _current_key() -> bytes:
    return _normalise_key(getattr(settings, "PAYMENTS_ENCRYPTION_KEY", ""))


def _previous_key() -> bytes | None:
    ancienne = getattr(settings, "PAYMENTS_ENCRYPTION_KEY_OLD", "")
    if not ancienne:
        return None
    return _normalise_key(ancienne)


def is_configured() -> bool:
    """Permet de degrader proprement plutot que de planter au demarrage."""
    return bool(getattr(settings, "PAYMENTS_ENCRYPTION_KEY", ""))


def encrypt(plaintext: str) -> bytes:
    """Chiffre avec la cle COURANTE."""
    if plaintext is None:
        raise ValueError("Rien a chiffrer.")
    Fernet = _fernet_class()
    return Fernet(_current_key()).encrypt(str(plaintext).encode("utf-8"))


def decrypt(token: bytes) -> str:
    """
    Dechiffre avec la cle courante, puis l'ancienne si la rotation est en cours.

    L'ordre compte : la cle courante d'abord, pour que la rotation soit
    transparente sans penaliser le cas nominal.
    """
    if not token:
        return ""
    Fernet = _fernet_class()
    from cryptography.fernet import InvalidToken

    if isinstance(token, memoryview):
        token = token.tobytes()
    if isinstance(token, str):
        token = token.encode()

    try:
        return Fernet(_current_key()).decrypt(token).decode("utf-8")
    except InvalidToken:
        pass

    ancienne = _previous_key()
    if ancienne is not None:
        try:
            return Fernet(ancienne).decrypt(token).decode("utf-8")
        except InvalidToken:
            pass

    raise DecryptionFailed(
        "Dechiffrement impossible : cle incorrecte ou donnee alteree. "
        "Verifier PAYMENTS_ENCRYPTION_KEY et PAYMENTS_ENCRYPTION_KEY_OLD."
    )


def mask(msisdn: str) -> str:
    """
    Representation affichable, jamais le numero complet.

    237677123456 -> 237·····456
    """
    numero = (msisdn or "").strip().replace(" ", "")
    if len(numero) <= 6:
        return "·" * len(numero)
    return f"{numero[:3]}·····{numero[-3:]}"


def fingerprint(msisdn: str) -> str:
    """
    Empreinte non reversible d'un numero.

    Sert a DETECTER qu'un meme numero est utilise par plusieurs beneficiaires
    — signal de mule financiere — sans jamais stocker le numero en clair
    dans un index cherchable.
    """
    numero = (msisdn or "").strip().replace(" ", "")
    sel = getattr(settings, "PAYMENTS_FINGERPRINT_SALT", "belivay-momo")
    return hashlib.sha256(f"{sel}:{numero}".encode("utf-8")).hexdigest()