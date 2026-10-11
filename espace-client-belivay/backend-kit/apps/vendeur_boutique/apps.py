# backend/apps/vendeur_boutique/apps.py
from django.apps import AppConfig


class Config(AppConfig):
    name = "apps.vendeur_boutique"
    label = "vendeur_boutique"
    verbose_name = "Espace vendeur · boutique"
    default_auto_field = "django.db.models.BigAutoField"
