# backend/apps/wallet/apps.py
from django.apps import AppConfig


class Config(AppConfig):
    name = "apps.wallet"
    label = "wallet"
    default_auto_field = "django.db.models.BigAutoField"
