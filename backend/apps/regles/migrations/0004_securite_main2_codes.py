# Securite avant main 2. Ces reglages ne sont pas dans BV-DEV-07 (fichier verrouille par son empreinte) : ils sont
# crees ici et se changent dans l'admin sans toucher au code. Ne cree que s'ils manquent.
#   - le code a 4 chiffres du Wallet (R03.5) se bloque apres quelques erreurs (exemple du porteur : 3 essais, 24 h) ;
#   - le code de retrait se compte par colis (R66.1) et, en plus, par relais sur une periode : valeur de depart
#     proposee 10 codes faux en 1 h, a ajuster par le porteur.

from django.db import migrations

REGLAGES = {
    "r_wallet_code_essais": {"valeur": 3, "unite": "essais",
                             "libelle": "Code du Wallet : codes faux avant blocage"},
    "r_wallet_code_blocage_h": {"valeur": 24, "unite": "h",
                                "libelle": "Code du Wallet : durée du blocage après trop de codes faux"},
    "r_code_relais_echecs": {"valeur": 10, "unite": "codes",
                             "libelle": "Retrait au relais : codes faux sur la période qui bloquent les remises du relais"},
    "r_code_relais_fenetre_h": {"valeur": 1, "unite": "h",
                                "libelle": "Retrait au relais : période de comptage des codes faux du relais"},
}


def creer(apps, schema_editor):
    Reglage = apps.get_model("regles", "Reglage")
    for nom, valeurs in REGLAGES.items():
        Reglage.objects.get_or_create(nom=nom, defaults={**valeurs, "exact": "", "regles": "R03.5, R66.1, sécurité main 2"})


def retirer(apps, schema_editor):
    apps.get_model("regles", "Reglage").objects.filter(nom__in=REGLAGES).delete()


class Migration(migrations.Migration):
    dependencies = [("regles", "0003_plafond_mensuel_remboursement_auto")]

    operations = [migrations.RunPython(creer, retirer)]
