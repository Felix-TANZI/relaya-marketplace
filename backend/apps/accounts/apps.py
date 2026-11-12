from django.apps import AppConfig


class AccountsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.accounts"

    def ready(self):
        from . import acces_provisoire  # noqa: F401  (DEV-SRV-01 : fin de l'accès provisoire au changement)
