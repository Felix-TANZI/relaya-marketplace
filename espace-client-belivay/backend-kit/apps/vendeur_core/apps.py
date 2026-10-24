# backend/apps/vendeur_core/apps.py
from django.apps import AppConfig


class Config(AppConfig):
    name = "apps.vendeur_core"
    label = "vendeur_core"
    verbose_name = "Espace vendeur · socle"
    default_auto_field = "django.db.models.BigAutoField"
