from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import Mock, patch

from django.core.files.base import ContentFile
from django.test import SimpleTestCase, override_settings

from .storage import R2FallbackStorage


class R2FallbackStorageTests(SimpleTestCase):
    def setUp(self):
        self.temp_dir = TemporaryDirectory()
        self.addCleanup(self.temp_dir.cleanup)

    def storage(self, remote=None):
        if remote is not None:
            remote.exists.return_value = False
        with override_settings(MEDIA_ROOT=self.temp_dir.name):
            with patch("apps.common.storage.settings.R2_STORAGE_ENABLED", bool(remote)):
                with patch("apps.common.storage.S3Storage", return_value=remote):
                    return R2FallbackStorage()

    def test_uses_local_storage_when_r2_is_disabled(self):
        storage = self.storage()
        name = storage.save("tests/local.txt", ContentFile(b"local"))

        self.assertEqual(Path(self.temp_dir.name, name).read_bytes(), b"local")

    def test_uses_r2_when_upload_succeeds(self):
        remote = Mock()
        remote.save.return_value = "tests/remote.txt"
        storage = self.storage(remote)

        name = storage.save("tests/remote.txt", ContentFile(b"remote"))

        self.assertEqual(name, "tests/remote.txt")
        remote.save.assert_called_once()
        self.assertEqual(Path(self.temp_dir.name, name).read_bytes(), b"remote")

    def test_falls_back_to_local_when_r2_upload_fails(self):
        remote = Mock()
        remote.save.side_effect = ConnectionError("R2 unavailable")
        storage = self.storage(remote)

        name = storage.save("tests/fallback.txt", ContentFile(b"fallback"))

        self.assertEqual(Path(self.temp_dir.name, name).read_bytes(), b"fallback")

    def test_reads_local_file_when_r2_is_unavailable(self):
        remote = Mock()
        remote.open.side_effect = ConnectionError("R2 unavailable")
        storage = self.storage(remote)
        storage.local.save("tests/read.txt", ContentFile(b"read locally"))

        with storage.open("tests/read.txt") as uploaded:
            self.assertEqual(uploaded.read(), b"read locally")
