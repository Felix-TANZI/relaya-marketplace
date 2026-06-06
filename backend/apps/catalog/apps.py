from django.apps import AppConfig


class CatalogConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.catalog"

    def ready(self):
        # Active l'audit OHADA sur les modèles du catalogue
        from apps.common.audit import register_audit
        from .models import Category, Product
        register_audit(Category, Product)