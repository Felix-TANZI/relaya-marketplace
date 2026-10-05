# backend/apps/subscriptions/apps.py
from django.apps import AppConfig


class Config(AppConfig):
    name = "apps.subscriptions"
    label = "subscriptions"
    default_auto_field = "django.db.models.BigAutoField"
