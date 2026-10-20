# Les 12 zones de Yaoundé (R73.1), créées depuis t_zones et t_quartiers des réglages (BV-DEV-07).

from django.db import migrations


def creer(apps, schema_editor):
    from apps.regles import services as regles
    from apps.shipping.zones import synchroniser_zones

    regles.cache.delete(regles.CLE_CACHE)
    synchroniser_zones(apps.get_model("shipping", "Zone"))


class Migration(migrations.Migration):
    dependencies = [
        ("shipping", "0023_zones_spec_v21"),
        ("regles", "0002_valeurs_de_lancement"),
    ]

    operations = [migrations.RunPython(creer, migrations.RunPython.noop)]
