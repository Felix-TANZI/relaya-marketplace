# backend/apps/publicite/apps.py
from django.apps import AppConfig


class Config(AppConfig):
    name = "apps.publicite"
    label = "publicite"
    verbose_name = "Publicité (DP-59)"
    default_auto_field = "django.db.models.BigAutoField"
