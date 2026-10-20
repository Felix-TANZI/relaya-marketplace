# backend/apps/extras/apps.py
from django.apps import AppConfig


class Config(AppConfig):
    name = "apps.extras"
    label = "extras"
    default_auto_field = "django.db.models.BigAutoField"
