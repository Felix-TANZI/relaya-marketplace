# backend/apps/client_core/chiffrement.py
# Numéros et adresses chiffrés au repos (CAP-21).
#
# Dans relaya-marketplace : le module existant apps.payments.payees.crypto (Fernet, clé PAYMENTS_ENCRYPTION_KEY,
# rotation par PAYMENTS_ENCRYPTION_KEY_OLD) est utilisé tel quel : même clé, même rotation que les numéros
# Mobile Money des partenaires. Ailleurs (projet d'essai) : la même construction (Fernet, clé dérivée en SHA-256).
#
#     champ_chiffre = chiffrer("677123441")      # bytes, pour un BinaryField
#     dechiffrer(champ_chiffre) → "677123441"
#     empreinte("677123441")                      # recherche d'égalité sans déchiffrer (« ce numéro a-t-il déjà un compte ? »)

import base64
import hashlib
import hmac

from django.conf import settings


def _fernet():
    from cryptography.fernet import Fernet

    cle = (getattr(settings, "PAYMENTS_ENCRYPTION_KEY", "") or settings.SECRET_KEY).strip()
    if not (len(cle) == 44 and cle.endswith("=")):
        cle = base64.urlsafe_b64encode(hashlib.sha256(cle.encode("utf-8")).digest()).decode()
    return Fernet(cle.encode())


def chiffrer(texte: str) -> bytes:
    try:
        from apps.payments.payees import crypto  # relaya-marketplace
    except ImportError:
        return _fernet().encrypt(str(texte).encode("utf-8"))
    return crypto.encrypt(texte)


def dechiffrer(jeton: bytes | memoryview | None) -> str:
    if not jeton:
        return ""
    jeton = bytes(jeton)
    try:
        from apps.payments.payees import crypto  # relaya-marketplace
    except ImportError:
        return _fernet().decrypt(jeton).decode("utf-8")
    return crypto.decrypt(jeton)


def empreinte(texte: str) -> str:
    """HMAC-SHA256 (sel : PAYMENTS_FINGERPRINT_SALT de relaya, sinon SECRET_KEY)."""
    sel = getattr(settings, "PAYMENTS_FINGERPRINT_SALT", "") or settings.SECRET_KEY
    return hmac.new(sel.encode(), str(texte).encode("utf-8"), hashlib.sha256).hexdigest()
