# DEV-SRV-01 v1.8, C04 : nouvelle règle de paiement des vendeurs. « Tous les délais et seuils sont des réglages r_…,
# sans valeur écrite dans le code. » Valeurs données par la v1.8, sauf celles marquées « proposée » (à confirmer par le
# porteur, modifiables dans l'admin sans toucher au code).
# Hors BV-DEV-07 (fichier verrouillé par son empreinte) ; ne crée que s'il manque.

from django.db import migrations

REGLAGES = {
    "r_versement_vendeur_j": {"valeur": 1, "unite": "j",
                              "libelle": "Vendeur : versement après la confirmation du client, quel que soit le palier"},
    "r_nouveau_ventes": {"valeur": 5, "unite": "nb",
                         "libelle": "Nouveau compte vendeur : nombre de premières ventes (proposée)"},
    "r_nouveau_gel_article": {"valeur": 50000, "unite": "F",
                              "libelle": "Nouveau compte : article au-delà duquel la somme reste gelée plus longtemps"},
    "r_nouveau_gel_j": {"valeur": 3, "unite": "j",
                        "libelle": "Nouveau compte : gel d'un article au-delà du seuil, pendant ses premières ventes"},
    "r_fraude_delai_j": {"valeur": 3, "unite": "j",
                         "libelle": "Fraude confirmée par un opérateur : délai de versement"},
    "r_fraude_periode_j": {"valeur": 30, "unite": "j",
                           "libelle": "Fraude confirmée : durée sans incident avant le retour au délai normal"},
    "r_fraude_recidive_x": {"valeur": 2, "unite": "nb",
                            "libelle": "Deuxième fraude confirmée : la période est multipliée par (proposée)"},
    "r_montant_inhabituel_x": {"valeur": 3, "unite": "nb",
                               "libelle": "Montant inhabituel : multiple de la moyenne des versements sur 30 jours (proposée)"},
    "r_baisse_trust_points": {"valeur": 15, "unite": "pts",
                              "libelle": "Forte baisse du Trust Score depuis le dernier versement (proposée)"},
    "r_blocage_numero_j": {"valeur": 7, "unite": "j",
                           "libelle": "Changement de numéro de versement : versements bloqués"},
}


def creer(apps, schema_editor):
    Reglage = apps.get_model("regles", "Reglage")
    for nom, valeurs in REGLAGES.items():
        Reglage.objects.get_or_create(nom=nom, defaults={**valeurs, "exact": "", "regles": "DEV-SRV-01 v1.8 (C04)"})


def retirer(apps, schema_editor):
    apps.get_model("regles", "Reglage").objects.filter(nom__in=REGLAGES).delete()


class Migration(migrations.Migration):
    dependencies = [("regles", "0008_acces_provisoire")]

    operations = [migrations.RunPython(creer, retirer)]
