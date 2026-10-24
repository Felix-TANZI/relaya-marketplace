# Feuille de route D32 : « Fixer un plafond mensuel global dans la configuration, avec alerte à l'administration. »
# Ce réglage n'est pas dans BV-DEV-07 (fichier verrouillé par son empreinte) : il est créé ici, à 0. Tant qu'il vaut 0,
# le remboursement automatique sans retour reste fermé ; l'admin fixe le montant sans toucher au code.
# Ne crée que s'il manque : une valeur déjà changée dans l'admin n'est jamais écrasée.

from django.db import migrations

NOM = "r_auto_rmb_plafond_mois"


def creer(apps, schema_editor):
    Reglage = apps.get_model("regles", "Reglage")
    Reglage.objects.get_or_create(nom=NOM, defaults={
        "valeur": 0, "exact": "", "unite": "F",
        "libelle": "Remboursement automatique : plafond mensuel global (0 = fermé)",
        "regles": "R71, feuille de route D32",
    })


def retirer(apps, schema_editor):
    apps.get_model("regles", "Reglage").objects.filter(nom=NOM).delete()


class Migration(migrations.Migration):
    dependencies = [("regles", "0002_valeurs_de_lancement")]

    operations = [migrations.RunPython(creer, retirer)]
