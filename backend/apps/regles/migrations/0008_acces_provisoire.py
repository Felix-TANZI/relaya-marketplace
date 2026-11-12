# DEV-SRV-01, T07-5 : durée de validité du mot de passe provisoire remis par l'agent au vendeur qu'il inscrit
# (apps.accounts.acces_provisoire). Valeur de départ proposée, à faire valider par le porteur.
# Hors BV-DEV-07 (fichier verrouillé par son empreinte) ; ne crée que s'il manque.

from django.db import migrations

REGLAGES = {
    "r_acces_provisoire_h": {"valeur": 72, "unite": "h",
                             "libelle": "Vendeur inscrit par un agent : validité du mot de passe provisoire"},
}


def creer(apps, schema_editor):
    Reglage = apps.get_model("regles", "Reglage")
    for nom, valeurs in REGLAGES.items():
        Reglage.objects.get_or_create(nom=nom, defaults={**valeurs, "exact": "", "regles": "DEV-SRV-01 (T07)"})


def retirer(apps, schema_editor):
    apps.get_model("regles", "Reglage").objects.filter(nom__in=REGLAGES).delete()


class Migration(migrations.Migration):
    dependencies = [("regles", "0007_c3_durees_en_reglages")]

    operations = [migrations.RunPython(creer, retirer)]
