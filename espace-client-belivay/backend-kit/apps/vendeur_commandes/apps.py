# backend/apps/vendeur_commandes/apps.py
from django.apps import AppConfig


class Config(AppConfig):
    name = "apps.vendeur_commandes"
    label = "vendeur_commandes"
    verbose_name = "Espace vendeur · commandes"
    default_auto_field = "django.db.models.BigAutoField"
