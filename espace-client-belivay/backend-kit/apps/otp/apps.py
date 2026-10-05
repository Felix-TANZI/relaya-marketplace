# backend/apps/otp/apps.py
from django.apps import AppConfig


class Config(AppConfig):
    name = "apps.otp"
    label = "otp"
    default_auto_field = "django.db.models.BigAutoField"
