# backend/apps/contenus/apps.py
from django.apps import AppConfig


class Config(AppConfig):
    name = "apps.contenus"
    label = "contenus"
    verbose_name = "Contenus et photos du site client"
    default_auto_field = "django.db.models.BigAutoField"
