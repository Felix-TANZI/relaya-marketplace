from django.apps import AppConfig


class Config(AppConfig):
    name = "apps.orders"
    label = "orders"
    default_auto_field = "django.db.models.BigAutoField"
