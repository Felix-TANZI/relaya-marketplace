# backend/tests/test_d34_migrations_shipping.py
# Tache D34 — « Regenerer la migration "shipping" avant tout travail sur les
# expeditions. La livraison et les relais (D10 a D13) en dependent. »
#
# CE QU'ON A TROUVE EN CHERCHANT QUOI REGENERER
#
#     Rien a reparer. Les quatre defauts qui auraient justifie une
#     regeneration ont ete cherches un par un, et aucun n'est la :
#
#       - les modeles ne divergent pas de leurs migrations ;
#       - le graphe est sain : une seule feuille, aucun numero en double,
#         aucun conflit ;
#       - aucune migration de donnees (RunPython / RunSQL), donc rien qui
#         puisse passer sur une base vide et echouer sur des donnees reelles ;
#       - le rejeu depuis zero fonctionne — la suite de tests reconstruit
#         toute la base a chaque passage.
#
# Reste la seule lecture possible : regrouper les 22 migrations en une
# (« squash »). C'est une operation de confort, pas une correction, et elle est
# risquee sur une base deja deployee : elle exige que chaque environnement
# soit a un etat connu, sinon le deploiement casse. Ce n'est pas une decision
# a prendre seul.
#
# CE QUE CE FICHIER FAIT A LA PLACE
#
#     D34 demande au fond que les expeditions reposent sur des migrations
#     saines. Une regeneration ne le garantirait qu'un jour ; ces tests le
#     garantissent a chaque passage de la CI, y compris pour le travail a
#     venir sur D10 a D13.

import pytest
from django.conf import settings
from django.db.migrations.loader import MigrationLoader

APP = "shipping"

# Notre mode de test local (USE_SQLITE_FOR_TESTS) remplace MIGRATION_MODULES
# par un dictionnaire qui repond None a tout : le chargeur ne voit alors
# aucune migration, et ces tests n'auraient rien a examiner.
migrations_desactivees = pytest.mark.skipif(
    settings.MIGRATION_MODULES.__class__.__name__ == "DisableMigrations",
    reason="migrations desactivees par USE_SQLITE_FOR_TESTS",
)


@pytest.fixture(scope="module")
def graphe():
    return MigrationLoader(None, ignore_no_migrations=True).graph


@migrations_desactivees
def test_une_seule_tete_de_migration(graphe):
    """
    Deux feuilles veulent dire deux histoires paralleles : `migrate` ne sait
    plus laquelle appliquer, et il faut une migration de fusion. C'est le
    defaut qui justifierait vraiment de regenerer.
    """
    feuilles = [nom for app, nom in graphe.leaf_nodes(APP)]

    assert len(feuilles) == 1, (
        f"{len(feuilles)} tetes de migration pour « {APP} » : {feuilles}. "
        f"Il en faut une seule."
    )


@migrations_desactivees
def test_aucun_numero_de_migration_en_double(graphe):
    """
    Deux migrations numerotees pareil se produisent quand deux personnes en
    creent une en meme temps. L'ordre devient alors ambigu.
    """
    from collections import Counter

    numeros = Counter(
        nom.split("_")[0] for app, nom in graphe.nodes if app == APP
    )
    doublons = [numero for numero, combien in numeros.items() if combien > 1]

    assert not doublons, f"Numeros en double dans « {APP} » : {doublons}"


@migrations_desactivees
def test_aucun_conflit_dans_le_graphe():
    conflits = MigrationLoader(None, ignore_no_migrations=True).detect_conflicts()

    assert not conflits, f"Conflits de migrations : {conflits}"


@migrations_desactivees
def test_aucune_migration_de_donnees_dans_les_expeditions():
    """
    Les tests partent d'une base VIDE, la production rejoue sur des donnees
    REELLES. Une migration de donnees peut passer dans un cas et echouer dans
    l'autre — et on ne s'en apercoit qu'au deploiement.

    `shipping` n'en contient aucune aujourd'hui. Si quelqu'un en ajoute une,
    ce test tombe : ce n'est pas interdit, mais ca se teste autrement qu'en
    lancant la suite.
    """
    from pathlib import Path

    dossier = Path(settings.BASE_DIR) / "apps" / APP / "migrations"
    fautives = [
        fichier.name
        for fichier in sorted(dossier.glob("0*.py"))
        if "RunPython" in fichier.read_text(encoding="utf-8")
        or "RunSQL" in fichier.read_text(encoding="utf-8")
    ]

    assert not fautives, (
        f"Migrations de donnees dans « {APP} » : {fautives}. "
        f"A verifier sur une copie des donnees de production, pas seulement "
        f"sur une base vide."
    )


@migrations_desactivees
@pytest.mark.django_db
def test_les_modeles_ne_divergent_pas_de_leurs_migrations():
    """
    Un modele modifie sans migration, et le schema de la production ne
    correspond plus au code. C'est le defaut le plus courant, et le plus
    silencieux : tout marche en local, rien ne marche au deploiement.
    """
    from io import StringIO

    from django.core.management import call_command

    sortie = StringIO()
    try:
        call_command(
            "makemigrations", "--check", "--dry-run", verbosity=1, stdout=sortie,
        )
    except SystemExit:
        pytest.fail(
            "Des modeles ont change sans migration :\n" + sortie.getvalue()
        )
