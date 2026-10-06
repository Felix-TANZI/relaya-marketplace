# backend/apps/wishlists/apps.py
from django.apps import AppConfig


class Config(AppConfig):
    name = "apps.wishlists"
    label = "wishlists"
    default_auto_field = "django.db.models.BigAutoField"
