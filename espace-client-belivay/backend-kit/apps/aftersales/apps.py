# backend/apps/aftersales/apps.py
from django.apps import AppConfig


class Config(AppConfig):
    name = "apps.aftersales"
    label = "aftersales"
    default_auto_field = "django.db.models.BigAutoField"
