# Securite avant main 2 : droits par partie etendus a tous les ecrans de gestion (apps.common.droits). Groupes crees
# ici ; on y rattache les personnes dans l'admin Django. « finance » existe deja pour le module paiements.

from django.db import migrations

GROUPES = ("gestion-catalogue", "gestion-vendeurs", "gestion-clients", "gestion-commandes", "gestion-pilotage",
           "finance")


def creer(apps, schema_editor):
    Group = apps.get_model("auth", "Group")
    for nom in GROUPES:
        Group.objects.get_or_create(name=nom)


class Migration(migrations.Migration):
    dependencies = [("accounts", "0032_droits_par_partie")]

    operations = [migrations.RunPython(creer, migrations.RunPython.noop)]
