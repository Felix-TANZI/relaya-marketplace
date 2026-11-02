# Revue du 29 octobre 2026, C3 : trois durees jusque-la ecrites dans le code ou l'environnement deviennent des
# reglages r_..., modifiables dans l'admin. Valeurs de depart validees par le porteur (section F de la revue).
# Hors BV-DEV-07 (fichier verrouille par son empreinte) ; ne cree que s'ils manquent.

from django.db import migrations

REGLAGES = {
    "r_envoi_interrompu_min": {"valeur": 30, "unite": "min",
                               "libelle": "Envoi d'argent resté « en cours » : délai avant issue inconnue"},
    "r_apple_nonce_s": {"valeur": 600, "unite": "s", "libelle": "Connexion Apple : durée de vie du nonce"},
    "r_apple_ticket_s": {"valeur": 120, "unite": "s",
                         "libelle": "Connexion Apple sur Android : durée de vie du ticket"},
}


def creer(apps, schema_editor):
    Reglage = apps.get_model("regles", "Reglage")
    for nom, valeurs in REGLAGES.items():
        Reglage.objects.get_or_create(nom=nom, defaults={**valeurs, "exact": "", "regles": "revue du 29/10 (C3)"})


def retirer(apps, schema_editor):
    apps.get_model("regles", "Reglage").objects.filter(nom__in=REGLAGES).delete()


class Migration(migrations.Migration):
    dependencies = [("regles", "0006_r71_palier_et_relais_habituel")]

    operations = [migrations.RunPython(creer, retirer)]
