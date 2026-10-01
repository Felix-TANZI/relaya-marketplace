# backend/apps/whatsapp_assistant/media.py
# Images envoyées sur WhatsApp : Belivay stocke du WebP, WhatsApp n'accepte que
# JPEG / PNG. On convertit en JPEG, on dépose chez le fournisseur, et on garde
# l'identifiant (Meta conserve un média 30 jours). Aucune URL publique requise.

import hashlib
import logging
from datetime import timedelta
from io import BytesIO
from pathlib import PurePosixPath
from urllib.parse import urlparse

import requests
from django.core.files.storage import default_storage
from django.utils import timezone
from PIL import Image, ImageOps, UnidentifiedImageError

from .models import WhatsAppMedia
from .providers import ProviderError, WhatsAppProvider

logger = logging.getLogger("apps.whatsapp_assistant")

REUSE_FOR = timedelta(days=25)   # marge sous les 30 jours de Meta
MAX_SIDE = 1600
JPEG_QUALITY = 85
MAX_DOWNLOAD_BYTES = 10 * 1024 * 1024


def media_id_for(provider: WhatsAppProvider, image_ref: str | None) -> str | None:
    """
    Identifiant WhatsApp de l'image (déposée si besoin), ou None si impossible.
    `image_ref` : chemin dans le stockage Belivay, ou URL https (catalogue en ligne).
    """
    if not image_ref:
        return None
    key = image_ref if len(image_ref) <= 255 else hashlib.sha256(image_ref.encode()).hexdigest()
    cached = WhatsAppMedia.objects.filter(source_name=key).first()
    if cached and cached.uploaded_at > timezone.now() - REUSE_FOR:
        return cached.media_id

    try:
        content = _as_jpeg(BytesIO(_read(image_ref)))
        stem = PurePosixPath(urlparse(image_ref).path).stem or "image"
        media_id = provider.upload_media(content, "image/jpeg", f"{stem}.jpg")
    except (OSError, ValueError, UnidentifiedImageError, ProviderError, requests.RequestException) as error:
        logger.warning("Image %s non envoyable sur WhatsApp : %s", image_ref, error)
        return None

    WhatsAppMedia.objects.update_or_create(
        source_name=key, defaults={"media_id": media_id, "uploaded_at": timezone.now()},
    )
    return media_id


def _read(image_ref: str) -> bytes:
    if image_ref.startswith("https://"):
        response = requests.get(image_ref, timeout=15)
        response.raise_for_status()
        if len(response.content) > MAX_DOWNLOAD_BYTES:
            raise ValueError("image trop lourde")
        return response.content
    with default_storage.open(image_ref, "rb") as handle:
        return handle.read()


def _as_jpeg(handle) -> bytes:
    image = ImageOps.exif_transpose(Image.open(handle))
    if image.mode in ("RGBA", "LA", "P"):
        image = image.convert("RGBA")
        background = Image.new("RGB", image.size, (255, 255, 255))   # transparence → fond blanc
        background.paste(image, mask=image.split()[-1])
        image = background
    else:
        image = image.convert("RGB")
    image.thumbnail((MAX_SIDE, MAX_SIDE), Image.Resampling.LANCZOS)
    output = BytesIO()
    image.save(output, format="JPEG", quality=JPEG_QUALITY, optimize=True)
    return output.getvalue()
