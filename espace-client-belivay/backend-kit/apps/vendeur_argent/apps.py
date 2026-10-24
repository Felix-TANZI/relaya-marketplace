# backend/apps/vendeur_argent/apps.py
from django.apps import AppConfig


class Config(AppConfig):
    name = "apps.vendeur_argent"
    label = "vendeur_argent"
    verbose_name = "Espace vendeur · argent"
    default_auto_field = "django.db.models.BigAutoField"
