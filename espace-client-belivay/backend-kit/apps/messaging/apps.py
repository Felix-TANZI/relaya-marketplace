# backend/apps/messaging/apps.py
from django.apps import AppConfig


class Config(AppConfig):
    name = "apps.messaging"
    label = "messaging"
    default_auto_field = "django.db.models.BigAutoField"
