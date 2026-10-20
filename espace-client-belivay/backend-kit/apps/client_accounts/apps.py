# backend/apps/client_accounts/apps.py
from django.apps import AppConfig


class Config(AppConfig):
    name = "apps.client_accounts"
    label = "client_accounts"
    default_auto_field = "django.db.models.BigAutoField"
