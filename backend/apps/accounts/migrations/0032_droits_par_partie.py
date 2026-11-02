# Securite avant main 2 : droits par partie sur les ecrans de gestion (apps.common.droits). Les groupes sont crees
# ici ; on y rattache les personnes dans l'admin Django.

from django.db import migrations

GROUPES = ("gestion-support", "gestion-fraude", "gestion-logistique", "gestion-conformite", "gestion-litiges")


def creer(apps, schema_editor):
    Group = apps.get_model("auth", "Group")
    for nom in GROUPES:
        Group.objects.get_or_create(name=nom)


class Migration(migrations.Migration):
    dependencies = [("accounts", "0031_codes_un_seul_systeme"), ("auth", "0012_alter_user_first_name_max_length")]

    operations = [migrations.RunPython(creer, migrations.RunPython.noop)]
