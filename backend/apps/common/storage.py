import functools
import logging

from django.conf import settings
from django.core.files.storage import FileSystemStorage, Storage
from django.core.files.uploadhandler import MemoryFileUploadHandler, StopUpload
from django.http import JsonResponse
from django.utils.deconstruct import deconstructible
from storages.backends.s3 import S3Storage


logger = logging.getLogger(__name__)


@deconstructible
class R2FallbackStorage(Storage):
    """Use Cloudflare R2 first and transparently fall back to local media."""

    def __init__(self):
        self.local = FileSystemStorage(
            location=settings.MEDIA_ROOT,
            base_url=settings.MEDIA_URL,
        )
        self.remote = S3Storage() if settings.R2_STORAGE_ENABLED else None

    def _remote_call(self, method, *args, **kwargs):
        if self.remote is None:
            raise RuntimeError("R2 storage is disabled")
        return getattr(self.remote, method)(*args, **kwargs)

    def _save(self, name, content):
        local_name = self.local.save(name, content)
        if self.remote is not None:
            try:
                with self.local.open(local_name, "rb") as local_copy:
                    remote_name = self._remote_call("save", local_name, local_copy)
                if remote_name != local_name:
                    logger.warning(
                        "R2 changed media name from %s to %s; local fallback remains available",
                        local_name,
                        remote_name,
                    )
                    return remote_name
            except Exception:
                logger.exception("R2 upload failed for %s; using local storage", local_name)
        return local_name

    def _open(self, name, mode="rb"):
        if self.remote is not None:
            try:
                return self._remote_call("open", name, mode)
            except Exception:
                logger.warning("R2 read failed for %s; trying local storage", name, exc_info=True)
        return self.local.open(name, mode)

    def exists(self, name):
        if self.remote is not None:
            try:
                if self._remote_call("exists", name):
                    return True
            except Exception:
                logger.warning("R2 existence check failed for %s", name, exc_info=True)
        return self.local.exists(name)

    def delete(self, name):
        if self.remote is not None:
            try:
                self._remote_call("delete", name)
            except Exception:
                logger.warning("R2 deletion failed for %s", name, exc_info=True)
        if self.local.exists(name):
            self.local.delete(name)

    def size(self, name):
        if self.remote is not None:
            try:
                return self._remote_call("size", name)
            except Exception:
                logger.warning("R2 size lookup failed for %s; trying local storage", name, exc_info=True)
        return self.local.size(name)

    def url(self, name):
        if self.remote is not None:
            try:
                if self._remote_call("exists", name):
                    return self._remote_call("url", name)
            except Exception:
                logger.warning("R2 URL lookup failed for %s; using local URL", name, exc_info=True)
        return self.local.url(name)

    def get_modified_time(self, name):
        if self.remote is not None:
            try:
                return self._remote_call("get_modified_time", name)
            except Exception:
                logger.warning("R2 metadata lookup failed for %s; trying local storage", name, exc_info=True)
        return self.local.get_modified_time(name)


# ─── PIÈCES CONFIDENTIELLES (DEV-SRV-01, règle R8) ──────────────────────────────────────────────────────────────────
# « Pièces d'identité et documents sur Cloudflare R2, jamais sur un disque de serveur » (T06-4). R2FallbackStorage
# ci-dessus écrit toujours une copie locale, puis la garde : il reste celui des images du catalogue, et les pièces
# (CNI, selfie, documents de boutique) passent par ce stockage-ci, sans copie ni repli sur le disque.


class StockageIndisponible(Exception):
    """La pièce n'a pas pu être enregistrée sur R2 : rien n'a été écrit ailleurs."""


@deconstructible
class PiecesConfidentiellesStorage(Storage):
    """R2 seul pour écrire. Le disque n'est lu que pour les pièces déposées avant R8 (à migrer par
    `migrer_pieces_vers_r2`), et n'est écrit qu'hors production quand R2 n'est pas configuré (poste de dev, tests)."""

    # Django construit le stockage d'un champ une seule fois, au chargement des modèles : les réglages sont relus à
    # chaque usage (MEDIA_ROOT par FileSystemStorage lui-même, R2 ci-dessous) au lieu d'être figés à ce moment-là.
    def __init__(self):
        self.local = FileSystemStorage()
        self._r2 = self._r2_classe = None

    @property
    def remote(self):
        if not settings.R2_STORAGE_ENABLED:
            return None
        if self._r2 is None or self._r2_classe is not S3Storage:
            self._r2, self._r2_classe = S3Storage(), S3Storage
        return self._r2

    def _save(self, name, content):
        if self.remote is None:
            if getattr(settings, "BELIVAY_PRODUCTION", False):
                logger.error("Pièce %s refusée : R2 n'est pas configuré (USE_R2_STORAGE, AWS_*), R8 interdit le disque.",
                             name)
                raise StockageIndisponible("R2 n'est pas configuré.")
            return self.local.save(name, content)
        try:
            return self.remote.save(name, content)
        except Exception as erreur:
            logger.exception("Envoi de la pièce %s vers R2 impossible ; rien n'est gardé sur le disque.", name)
            raise StockageIndisponible(str(erreur)) from erreur

    def _sur_r2(self, name):
        return self.remote is not None and self.remote.exists(name)

    def _open(self, name, mode="rb"):
        if self._sur_r2(name):
            return self.remote.open(name, mode)
        return self.local.open(name, mode)

    def exists(self, name):
        return self._sur_r2(name) or self.local.exists(name)

    def delete(self, name):
        if self.remote is not None:
            self.remote.delete(name)
        if self.local.exists(name):
            self.local.delete(name)

    def size(self, name):
        return self.remote.size(name) if self._sur_r2(name) else self.local.size(name)

    def url(self, name):
        return self.remote.url(name) if self._sur_r2(name) else self.local.url(name)

    def get_modified_time(self, name):
        return self.remote.get_modified_time(name) if self._sur_r2(name) else self.local.get_modified_time(name)


def pieces_confidentielles():
    """Appelable passé à `FileField(storage=...)` : le stockage suit les réglages du moment, la migration reste stable."""
    return PiecesConfidentiellesStorage()


#: Le plus gros fichier accepté (selfie vidéo, apps.accounts.compliance), plus la marge de l'enveloppe multipart.
TELEVERSEMENT_MAX_OCTETS = 51 * 1024 * 1024


class MemoireBorneeUploadHandler(MemoryFileUploadHandler):
    """Garde le fichier reçu en mémoire quelle que soit sa taille (au plus TELEVERSEMENT_MAX_OCTETS) : le gestionnaire
    par défaut de Django écrit tout fichier de plus de 2,5 Mo dans un fichier temporaire du serveur (R8)."""

    def handle_raw_input(self, input_data, META, content_length, boundary, encoding=None):
        self.activated = True

    def receive_data_chunk(self, raw_data, start):
        if start + len(raw_data) > TELEVERSEMENT_MAX_OCTETS:
            raise StopUpload(connection_reset=True)
        return super().receive_data_chunk(raw_data, start)


def televersement_en_memoire(vue):
    """Décorateur (au-dessus de @api_view, ou sur `dispatch`) des écrans qui reçoivent une pièce confidentielle."""

    @functools.wraps(vue)
    def envelopper(*args, **kwargs):
        request = next(a for a in args if hasattr(a, "upload_handlers"))
        try:
            taille = int(request.META.get("CONTENT_LENGTH") or 0)
        except ValueError:
            taille = 0
        if taille > TELEVERSEMENT_MAX_OCTETS:
            return JsonResponse({"detail": "Le fichier ne doit pas dépasser 50 Mo."}, status=413)
        request.upload_handlers = [MemoireBorneeUploadHandler(request)]
        return vue(*args, **kwargs)

    return envelopper
