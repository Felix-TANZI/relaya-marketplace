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
