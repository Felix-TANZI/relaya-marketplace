# backend/apps/common/apps.py
from django.apps import AppConfig


class CommonConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.common"

    def ready(self):
        # Connecte les signals d'audit (inactifs tant qu'aucun modèle n'est enregistré)
        from . import audit  # noqa: F401
        from . import checks  # noqa: F401  (DEV-SRV-01, R8 : pièces sur R2)