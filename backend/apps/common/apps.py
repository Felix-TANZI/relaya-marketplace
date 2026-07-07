# backend/apps/common/apps.py
from django.apps import AppConfig


class CommonConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.common"

    def ready(self):
        # Connecte les signals d'audit (inactifs tant qu'aucun modèle n'est enregistré)
        from . import audit  # noqa: F401