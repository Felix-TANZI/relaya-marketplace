from django.apps import AppConfig


class ShippingConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.shipping"
    verbose_name = "Shipping"

    def ready(self):
        from django.db.models.signals import post_save

        from apps.regles.models import TableReglee

        def _zones_suivent_les_tables(sender, instance, **kwargs):
            # shipping.Zone suit t_zones et t_quartiers (apps/shipping/zones.py)
            if instance.nom in ("t_zones", "t_quartiers"):
                from apps.regles import services as regles
                from apps.shipping.zones import synchroniser_zones

                regles.cache.delete(regles.CLE_CACHE)  # ce signal peut passer avant celui qui vide le cache
                synchroniser_zones()

        post_save.connect(_zones_suivent_les_tables, sender=TableReglee, weak=False, dispatch_uid="shipping_zones_v21")

        from django.db.models.signals import post_migrate

        def _zones_apres_migrate(sender, **kwargs):
            # D34 : pas de migration de données dans « shipping » ; les 12 zones (R73.1) sont créées après `migrate`.
            if sender.name != self.name:
                return
            from apps.regles import services as regles
            from apps.shipping.zones import synchroniser_zones

            regles.cache.delete(regles.CLE_CACHE)
            synchroniser_zones()

        post_migrate.connect(_zones_apres_migrate, weak=False, dispatch_uid="shipping_zones_post_migrate")

        from . import appels  # noqa: F401  (DP-61 : enregistre le contrôle de déploiement de l'opérateur d'appel)
