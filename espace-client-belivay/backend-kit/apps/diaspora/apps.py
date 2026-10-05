# backend/apps/diaspora/apps.py
from django.apps import AppConfig


class Config(AppConfig):
    name = "apps.diaspora"
    label = "diaspora"
    default_auto_field = "django.db.models.BigAutoField"
