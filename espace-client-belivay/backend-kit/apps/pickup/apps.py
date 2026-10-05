# backend/apps/pickup/apps.py
from django.apps import AppConfig


class Config(AppConfig):
    name = "apps.pickup"
    label = "pickup"
    default_auto_field = "django.db.models.BigAutoField"
