# backend/apps/vendeur_session/stockage.py
# Pièces d'identité et selfies de l'ouverture (KYC-01 à 09) : fichiers PRIVÉS, jamais servis par une adresse publique.
# Ils vivent hors de MEDIA_ROOT (settings.BELIVAY_FICHIERS_PRIVES, sinon « fichiers-prives » à côté de MEDIA_ROOT) et
# n'ont pas d'URL : seul le prestataire de vérification (ou la console BelivaY) les lit, par le serveur.
# En production chez relaya : un compartiment S3 privé (stockage à brancher ici, même interface).
import os
from pathlib import Path

from django.conf import settings
from django.core.files.storage import FileSystemStorage
from django.utils.deconstruct import deconstructible


@deconstructible
class StockagePrive(FileSystemStorage):
    """Stockage disque sans adresse publique ; l'emplacement est relu dans les réglages à chaque accès (tests)."""

    @property
    def base_location(self):
        return str(getattr(settings, "BELIVAY_FICHIERS_PRIVES", None) or Path(settings.MEDIA_ROOT).parent / "fichiers-prives")

    @property
    def location(self):
        return os.path.abspath(self.base_location)

    @property
    def base_url(self):
        return None

    def url(self, name):
        raise ValueError("Fichier privé : aucune adresse publique.")


def chemin_piece(instance, nom: str) -> str:
    return f"kyc/{instance.ref}/{nom}"
