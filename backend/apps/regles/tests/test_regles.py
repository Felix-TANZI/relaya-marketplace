# Les 200 tests de BV-DEV-07 rejoués par le moteur BV-DEV-09 (LISEZMOI, consigne 7 : un changement n'est accepté que
# s'ils passent tous), avec les valeurs du fichier puis avec celles de la base, et la tenue des réglages dans l'admin.

import pytest
from django.contrib.contenttypes.models import ContentType
from django.core.exceptions import ValidationError

from apps.common.models import AuditLog
from apps.regles import services
from apps.regles.models import Reglage, TableReglee
from apps.regles.moteur_reference import rejouer
from apps.regles.reference import (
    EMPREINTE_DONNEES,
    EMPREINTE_MOTEUR,
    FICHIER_DONNEES,
    FICHIER_MOTEUR,
    donnees_reference,
    empreinte_fichier,
)


def _ecarts(donnees):
    resultats = rejouer({**donnees, "tests": donnees_reference()["tests"]})
    return len(resultats), [f"{tid} : {' ; '.join(e)}" for tid, e in resultats if e]


def test_fichiers_de_reference_intacts():
    assert empreinte_fichier(FICHIER_DONNEES) == EMPREINTE_DONNEES
    assert empreinte_fichier(FICHIER_MOTEUR) == EMPREINTE_MOTEUR


def test_les_200_tests_passent_avec_le_fichier():
    total, ecarts = _ecarts(donnees_reference())
    assert total == 200
    assert ecarts == []


@pytest.mark.django_db
def test_la_base_contient_tous_les_reglages_et_tables():
    ref = donnees_reference()
    if not Reglage.objects.exists():  # SQLite sans migrations : la migration 0002 n'a pas tourné
        pytest.skip("base sans migrations")
    assert set(Reglage.objects.values_list("nom", flat=True)) == set(ref["reglages"])
    assert set(TableReglee.objects.values_list("nom", flat=True)) == set(ref["tables"])
    assert Reglage.objects.get(nom="r_campay").exact == "1/50"


@pytest.mark.django_db
def test_les_200_tests_passent_avec_la_base():
    services.cache.delete(services.CLE_CACHE)
    total, ecarts = _ecarts(services.donnees())
    assert total == 200
    assert ecarts == []


@pytest.fixture
def base(db):
    """Base remplie des valeurs de lancement, même quand les migrations sont désactivées."""
    ref = donnees_reference()
    for nom, r in ref["reglages"].items():
        Reglage.objects.get_or_create(nom=nom, defaults={"valeur": r["valeur"], "unite": r["unite"], "libelle": r["libelle"]})
    for nom, lignes in ref["tables"].items():
        TableReglee.objects.get_or_create(nom=nom, defaults={"lignes": lignes})
    services.cache.delete(services.CLE_CACHE)


def test_un_changement_dans_l_admin_change_le_calcul_et_est_journalise(base, django_user_model):
    admin = django_user_model.objects.create_user(username="admin-regles", email="admin-regles@example.com", password="x")
    destination = {"zone_dest": "Z7", "niv_client": "centre", "quartier": None}
    boutiques = [{"b": 1, "zone_b": "Z7", "niv_b": "centre", "km_b": 0, "detour_b": 0, "colis_b": ["P"], "st_b": 14000}]
    assert services.moteur().paiement("relais", destination, boutiques)["frais_bruts"] == 900  # test L01

    r = Reglage.objects.get(nom="r_relais")
    r.valeur, r.modifie_par = 1000, admin
    r.save()

    assert services.reglage("r_relais") == 1000
    assert services.moteur().paiement("relais", destination, boutiques)["frais_bruts"] == 1000
    journal = AuditLog.objects.filter(content_type=ContentType.objects.get_for_model(Reglage), object_id=str(r.pk)).latest("created_at")
    assert journal.actor == admin
    assert journal.changes == {"nom": "r_relais", "avant": 900, "apres": 1000}


def test_un_taux_garde_sa_fraction_exacte(base):
    r = Reglage.objects.get(nom="r_campay")
    r.valeur = 0.025
    r.save()
    assert r.exact == "1/40"


@pytest.mark.parametrize(
    "nom, valeur",
    [
        ("r_relais", 900.5),  # montant en francs entiers
        ("r_relais", "900"),  # un nombre, pas un texte
        ("r_campay", 2),  # une part est entre 0 et 1
        ("r_wallet_ouvert", 2),  # oui/non : 0 ou 1
        ("r_heure_limite", 25),
        ("r_date_ouverture_achats", "20/10/2026"),
    ],
)
def test_une_valeur_mal_ecrite_est_refusee(base, nom, valeur):
    r = Reglage.objects.get(nom=nom)
    r.valeur = valeur
    with pytest.raises(ValidationError):
        r.save()


def test_une_date_d_ouverture_bien_ecrite_est_acceptee(base):
    r = Reglage.objects.get(nom="r_date_ouverture_achats")
    r.valeur = "2026-11-02"
    r.save()
    assert services.reglage("r_date_ouverture_achats") == "2026-11-02"


def test_une_table_garde_ses_colonnes(base):
    t = TableReglee.objects.get(nom="t_garde")
    t.lignes = [{**t.lignes[0], "colonne_inventee": 1}] + t.lignes[1:]
    with pytest.raises(ValidationError):
        t.save()

    t = TableReglee.objects.get(nom="t_poids_score")
    t.lignes = {**t.lignes, "nouveau_critere": 5}
    with pytest.raises(ValidationError):
        t.save()


def test_les_alias_de_quartier_peuvent_s_ajouter(base):
    t = TableReglee.objects.get(nom="t_alias")
    t.lignes = {**t.lignes, "Mvog-Ada": ["Mvog Ada"]}
    t.save()
    assert services.table("t_alias")["Mvog-Ada"] == ["Mvog Ada"]


def test_un_nom_inconnu_est_signale(base):
    with pytest.raises(services.ReglageAbsent):
        services.reglage("r_qui_n_existe_pas")
