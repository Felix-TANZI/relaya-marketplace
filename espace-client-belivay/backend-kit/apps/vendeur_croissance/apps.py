# backend/apps/vendeur_croissance/apps.py
from django.apps import AppConfig


class Config(AppConfig):
    name = "apps.vendeur_croissance"
    label = "vendeur_croissance"
    verbose_name = "Espace vendeur · croissance"
    default_auto_field = "django.db.models.BigAutoField"
