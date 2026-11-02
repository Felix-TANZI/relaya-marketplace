from django.apps import AppConfig


class CatalogConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.catalog"

    def ready(self):
        # Active l'audit OHADA sur les modèles du catalogue
        from apps.common.audit import register_audit
        from .models import Category, Product, MasterProduct
        register_audit(Category, Product, MasterProduct)

        # Spec v2.1, R34.5 : chaque changement de prix est relevé ; une forte hausse retire l'accès aux ventes flash.
        from django.db.models.signals import post_save

        from .flash import noter_prix

        post_save.connect(lambda sender, instance, **kw: noter_prix(instance), sender=Product,
                          dispatch_uid="catalog_r34_5_prix", weak=False)