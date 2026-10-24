# Fiche maître et spécification v2.1 : univers (R16.1), poids et dimensions (R63.1), format de colis (R62),
# prix minimum publiable (R19.1).

from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.catalog.models import Category, MasterProduct, ModerationStatus
from apps.catalog.regles_catalogue import (
    PrixNonPubliable,
    colis_fiche,
    famille,
    manques_fiche,
    verifier_prix_publiable,
)
from apps.catalog.serializers import ProductCreateUpdateSerializer
from apps.regles import services as regles
from apps.regles.models import Reglage
from apps.regles.reference import donnees_reference

pytestmark = pytest.mark.django_db  # les règles sont lues dans les réglages de l'admin (base)


def _fiche(**kw):
    valeurs = dict(title="Fiche", univers="TEL", poids_kg=Decimal("0.3"),
                   dim_l1_cm=Decimal("15"), dim_l2_cm=Decimal("8"), dim_l3_cm=Decimal("2"))
    valeurs.update(kw)
    return MasterProduct(**valeurs)


@pytest.fixture(autouse=True)
def _cache_vide():
    regles.cache.delete(regles.CLE_CACHE)
    yield
    regles.cache.delete(regles.CLE_CACHE)


def test_fiche_complete_publiable():
    assert manques_fiche(_fiche()) == []


def test_fiche_sans_univers_ni_mesures():
    assert manques_fiche(_fiche(univers="", poids_kg=None, dim_l2_cm=None)) == [
        "univers (R16.1)", "poids (R63.1)", "dimensions (R63.1)",
    ]


def test_univers_inconnu():
    assert manques_fiche(_fiche(univers="XXX")) == ["univers « XXX » inconnu de t_univers (R16.1)"]


def test_famille_lue_dans_t_univers():
    assert famille("TEL") == "A"
    assert famille("LIV") == "E"


@pytest.mark.parametrize("cas", donnees_reference()["tests"]["format_article"], ids=lambda c: c["id"])
def test_format_de_la_fiche_suit_les_tests_de_la_spec(cas):
    l1, l2, l3 = cas["dimensions_cm"]
    fiche = _fiche(poids_kg=Decimal(str(cas["poids_i"])), dim_l1_cm=Decimal(str(l1)), dim_l2_cm=Decimal(str(l2)),
                   dim_l3_cm=Decimal(str(l3)), carton=cas["carton_i"])
    c = colis_fiche(fiche)
    assert c["format"] == cas["attendu"]["format_i"]
    assert c["pf_kg"] == pytest.approx(cas["attendu"]["pf_i"], abs=5e-7)


def test_pas_de_format_sans_mesures():
    assert colis_fiche(_fiche(poids_kg=None)) is None


def test_prix_minimum_publiable():
    minimum = donnees_reference()["reglages"]["r_prix_min_publiable"]["valeur"]
    verifier_prix_publiable(minimum)
    with pytest.raises(PrixNonPubliable):
        verifier_prix_publiable(minimum - 1)
    with pytest.raises(Exception):
        ProductCreateUpdateSerializer().validate_price_xaf(minimum - 1)


@pytest.mark.django_db
def test_prix_minimum_suit_le_reglage_de_l_admin():
    ref = donnees_reference()["reglages"]["r_prix_min_publiable"]
    r, _ = Reglage.objects.get_or_create(nom="r_prix_min_publiable", defaults={"valeur": ref["valeur"], "unite": ref["unite"], "libelle": ref["libelle"]})
    r.valeur = 1500
    r.save()
    with pytest.raises(PrixNonPubliable):
        verifier_prix_publiable(1200)


@pytest.fixture
def admin_client(db):
    admin = get_user_model().objects.create_user(username="admin-cat", email="admin-cat@example.com", password="x", is_staff=True)
    client = APIClient()
    client.force_authenticate(admin)
    return client


@pytest.fixture
def fiche_en_attente(db):
    cat = Category.objects.create(name="Téléphones", slug="telephones-v21")
    return MasterProduct.objects.create(title="Téléphone X", category=cat)


def test_validation_refusee_tant_que_la_fiche_est_incomplete(admin_client, fiche_en_attente):
    r = admin_client.post(f"/api/vendors/admin/masters/{fiche_en_attente.id}/approve/")
    assert r.status_code == 409
    assert "univers (R16.1)" in r.data["detail"]
    fiche_en_attente.refresh_from_db()
    assert fiche_en_attente.moderation_status == ModerationStatus.PENDING


def test_l_equipe_catalogue_complete_puis_valide(admin_client, fiche_en_attente):
    r = admin_client.patch(
        f"/api/vendors/admin/masters/{fiche_en_attente.id}/update/",
        {"univers": "tel", "poids_kg": "0.3", "dim_l1_cm": "2", "dim_l2_cm": "15", "dim_l3_cm": "8", "carton": False},
        format="json",
    )
    assert r.status_code == 200, r.data
    assert r.data["univers"] == "TEL"
    assert r.data["manques_publication"] == []
    assert r.data["colis"]["format"] == "P"

    r = admin_client.post(f"/api/vendors/admin/masters/{fiche_en_attente.id}/approve/")
    assert r.status_code == 200


def test_univers_inconnu_refuse_a_l_enregistrement(admin_client, fiche_en_attente):
    r = admin_client.patch(f"/api/vendors/admin/masters/{fiche_en_attente.id}/update/", {"univers": "ZZZ"}, format="json")
    assert r.status_code == 400
    assert "R16.1" in r.data["detail"]
