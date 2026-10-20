# backend/apps/notifications_client/apps.py
from django.apps import AppConfig


class Config(AppConfig):
    name = "apps.notifications_client"
    label = "notifications_client"
    default_auto_field = "django.db.models.BigAutoField"
