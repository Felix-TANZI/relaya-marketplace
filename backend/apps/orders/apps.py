from django.apps import AppConfig


class OrdersConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.orders"

    def ready(self):
        from . import flash  # noqa: F401  (D9 : rend le stock flash d'une commande annulée)
