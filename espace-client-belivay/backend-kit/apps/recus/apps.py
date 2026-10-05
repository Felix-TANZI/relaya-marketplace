# backend/apps/recus/apps.py
from django.apps import AppConfig


class Config(AppConfig):
    name = "apps.recus"
    label = "recus"
    default_auto_field = "django.db.models.BigAutoField"
    verbose_name = "Reçus (envois entre clients)"
