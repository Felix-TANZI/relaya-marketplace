# backend/apps/vendeur_litiges/apps.py
from django.apps import AppConfig


class Config(AppConfig):
    name = "apps.vendeur_litiges"
    label = "vendeur_litiges"
    verbose_name = "Espace vendeur · litiges"
    default_auto_field = "django.db.models.BigAutoField"

    def ready(self):
        from . import signaux  # noqa: F401 - branche les signaux de l'après-vente (litige ouvert → notification)
