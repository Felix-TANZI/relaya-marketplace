# Les 12 zones de Yaoundé (R73.1) ne sont plus créées ici : D34 interdit toute migration de données dans « shipping ».
# Elles sont créées après chaque `migrate` (signal post_migrate, apps/shipping/apps.py) et à chaque modification de
# t_zones ou t_quartiers, par apps.shipping.zones.synchroniser_zones. Migration gardée vide pour l'historique.

from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("shipping", "0023_zones_spec_v21"),
        ("regles", "0002_valeurs_de_lancement"),
    ]

    operations = []
