# backend/apps/client_core/apps.py
from django.apps import AppConfig


class ClientCoreConfig(AppConfig):
    name = "apps.client_core"
    label = "client_core"
    verbose_name = "Espace client · socle"
    default_auto_field = "django.db.models.BigAutoField"
