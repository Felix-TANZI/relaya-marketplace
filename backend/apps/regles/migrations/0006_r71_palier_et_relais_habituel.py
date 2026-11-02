# R71 : definitions du palier « Eleve » (R71.1) et du « relais habituel » (R71.2), proposees puis validees par le
# porteur le 2026-10-28. Reglages hors BV-DEV-07 (fichier verrouille par son empreinte), modifiables dans l'admin ;
# ne cree que s'ils manquent.

from django.db import migrations

REGLAGES = {
    "r_palier_eleve_livrees": {"valeur": 20, "unite": "nb",
                               "libelle": "Palier Élevé : commandes livrées sans litige perdu, au moins"},
    "r_palier_eleve_litige_mois": {"valeur": 12, "unite": "mois",
                                   "libelle": "Palier Élevé : aucun litige perdu depuis (mois)"},
    "r_palier_eleve_anciennete_mois": {"valeur": 6, "unite": "mois",
                                       "libelle": "Palier Élevé : compte ouvert depuis au moins (mois)"},
    "r_relais_habituel_jours": {"valeur": 90, "unite": "j",
                                "libelle": "Relais habituel à défaut de choix : retraits des derniers jours"},
}


def creer(apps, schema_editor):
    Reglage = apps.get_model("regles", "Reglage")
    for nom, valeurs in REGLAGES.items():
        Reglage.objects.get_or_create(nom=nom, defaults={**valeurs, "exact": "", "regles": "R71"})


def retirer(apps, schema_editor):
    apps.get_model("regles", "Reglage").objects.filter(nom__in=REGLAGES).delete()


class Migration(migrations.Migration):
    dependencies = [("regles", "0005_dp42_validation")]

    operations = [migrations.RunPython(creer, retirer)]
