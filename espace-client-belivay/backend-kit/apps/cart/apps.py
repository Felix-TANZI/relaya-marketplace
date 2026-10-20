# backend/apps/cart/apps.py
from django.apps import AppConfig


class Config(AppConfig):
    name = "apps.cart"
    label = "cart"
    default_auto_field = "django.db.models.BigAutoField"
