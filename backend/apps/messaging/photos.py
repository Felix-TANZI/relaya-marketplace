# backend/apps/messaging/photos.py
# Photos reçues du site (messagerie, preuves d'un litige, avis) : un fichier envoyé en multipart, ou une chaîne
# « data:image/jpeg;base64,… » dans un corps JSON (le site sait faire les deux).
#
# Pillow n'est pas une dépendance du kit : on vérifie le type par les premiers octets du fichier (signature JPEG, PNG,
# WebP), jamais par le nom ni par le type annoncé par le navigateur, et la taille. Une adresse http(s) n'est jamais
# acceptée (le serveur ne va pas chercher de fichier ailleurs).
#
# Rendu : ContentFile nommé, à donner à un FileField (upload_to de chaque modèle).

import base64
import binascii
import re
import uuid

from django.core.files.base import ContentFile
from rest_framework import status

from apps.client_core.erreurs import ErreurClient

# PARAMÈTRE À AJOUTER AU REGISTRE : PHOTO-TAILLE-MAX (taille d'une photo envoyée par le client)
TAILLE_MAX_OCTETS = 8 * 1024 * 1024

TYPES = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}
_DATA_URL = re.compile(r"^data:(?P<type>[\w/+.-]+)?(?:;[\w=.-]+)*;base64,(?P<donnees>.*)$", re.DOTALL)


def type_reel(debut: bytes) -> str | None:
    """Type MIME d'après la signature du fichier ; None si ce n'est ni un JPEG, ni un PNG, ni un WebP."""
    if debut.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if debut.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if len(debut) >= 12 and debut[:4] == b"RIFF" and debut[8:12] == b"WEBP":
        return "image/webp"
    return None


def _refus(message: str) -> ErreurClient:
    return ErreurClient(
        status.HTTP_400_BAD_REQUEST,
        "photo_invalide",
        message,
        {"types": sorted(TYPES), "tailleMax": TAILLE_MAX_OCTETS},
    )


def lire_photo(valeur, prefixe: str = "photo") -> ContentFile:
    """Fichier envoyé (UploadedFile) ou data: URL → ContentFile validé ; 400 photo_invalide sinon."""
    if hasattr(valeur, "read"):
        if getattr(valeur, "size", 0) and valeur.size > TAILLE_MAX_OCTETS:
            raise _refus("Cette photo est trop lourde.")
        contenu = valeur.read(TAILLE_MAX_OCTETS + 1)
    elif isinstance(valeur, str):
        m = _DATA_URL.match(valeur.strip())
        if not m:
            raise _refus("Envoie la photo prise dans l'application.")
        # base64 : 4 caractères pour 3 octets ; on refuse avant de décoder un texte démesuré.
        if len(m.group("donnees")) > TAILLE_MAX_OCTETS * 4 // 3 + 8:
            raise _refus("Cette photo est trop lourde.")
        try:
            contenu = base64.b64decode(m.group("donnees"), validate=True)
        except (binascii.Error, ValueError):
            raise _refus("Cette photo est illisible.") from None
    else:
        raise _refus("Photo manquante.")
    if not contenu:
        raise _refus("Photo vide.")
    if len(contenu) > TAILLE_MAX_OCTETS:
        raise _refus("Cette photo est trop lourde.")
    mime = type_reel(contenu[:16])
    if mime is None:
        raise _refus("Seules les photos JPEG, PNG ou WebP sont acceptées.")
    return ContentFile(contenu, name=f"{prefixe}-{uuid.uuid4().hex[:12]}.{TYPES[mime]}")


def adresse(fichier) -> str | None:
    """Adresse publique d'un FileField rempli ; None s'il est vide."""
    if not fichier:
        return None
    try:
        return fichier.url
    except ValueError:
        return None
