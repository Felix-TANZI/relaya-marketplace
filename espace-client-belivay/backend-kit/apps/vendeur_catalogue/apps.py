# backend/apps/vendeur_catalogue/apps.py
from django.apps import AppConfig


class Config(AppConfig):
    name = "apps.vendeur_catalogue"
    label = "vendeur_catalogue"
    verbose_name = "Espace vendeur · catalogue"
    default_auto_field = "django.db.models.BigAutoField"
