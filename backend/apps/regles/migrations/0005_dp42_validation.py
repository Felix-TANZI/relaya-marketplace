# DP-42 (double validation des versements, avant main 2). Reglages hors BV-DEV-07 (fichier verrouille par son
# empreinte), crees ici, modifiables dans l'admin sans toucher au code ; ne cree que s'ils manquent. Valeurs de depart
# proposees, a confirmer par le porteur :
#   - r_secours_jours_max : un acces de valideur de secours dure au plus 7 jours ;
#   - r_rappel_valideurs_h1 / _h2 : rappels du vendredi a 7 h puis a 10 h, avant r_versement_heure (12 h, R22.2).

from django.db import migrations

REGLAGES = {
    "r_secours_jours_max": {"valeur": 7, "unite": "jours",
                            "libelle": "DP-42 : durée maximale d'un accès de valideur de secours"},
    "r_rappel_valideurs_h1": {"valeur": 7, "unite": "h",
                              "libelle": "DP-42 : heure du premier rappel aux valideurs, le vendredi"},
    "r_rappel_valideurs_h2": {"valeur": 10, "unite": "h",
                              "libelle": "DP-42 : heure du second rappel aux valideurs, le vendredi"},
}


def creer(apps, schema_editor):
    Reglage = apps.get_model("regles", "Reglage")
    for nom, valeurs in REGLAGES.items():
        Reglage.objects.get_or_create(nom=nom, defaults={**valeurs, "exact": "", "regles": "DP-42, R22.2"})


def retirer(apps, schema_editor):
    apps.get_model("regles", "Reglage").objects.filter(nom__in=REGLAGES).delete()


class Migration(migrations.Migration):
    dependencies = [("regles", "0004_securite_main2_codes")]

    operations = [migrations.RunPython(creer, retirer)]
