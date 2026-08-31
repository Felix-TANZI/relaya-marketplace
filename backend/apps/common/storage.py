import logging

from django.conf import settings
from django.core.files.storage import FileSystemStorage, Storage
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
