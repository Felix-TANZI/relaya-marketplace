# backend/apps/vendeur_session/apps.py
from django.apps import AppConfig


class Config(AppConfig):
    name = "apps.vendeur_session"
    label = "vendeur_session"
    verbose_name = "Espace vendeur · session"
    default_auto_field = "django.db.models.BigAutoField"
