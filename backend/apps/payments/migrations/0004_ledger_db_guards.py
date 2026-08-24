# Declencheurs PostgreSQL du registre comptable — defense en profondeur.
#
# Genere manuellement : une migration RunPython n'est pas produite par
# makemigrations. Elle ne modifie aucun schema, elle installe des
# declencheurs et des fonctions.

from django.db import migrations

from apps.payments.ledger.db_guards import install_guards, remove_guards


class Migration(migrations.Migration):

    dependencies = [
        ("payments", "0003_ledger"),
    ]

    operations = [
        migrations.RunPython(install_guards, remove_guards),
    ]