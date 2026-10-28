from django.apps import AppConfig


class ReglesConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.regles"
    verbose_name = "Règles BelivaY v2.1 (réglages et tables)"

    def ready(self):
        from . import services  # noqa: F401  (vide le cache à chaque modification)
