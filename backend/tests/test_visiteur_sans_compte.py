# backend/tests/test_visiteur_sans_compte.py
# Tache D3 — acces visiteur sans compte.
#
# Le catalogue, les categories, les fiches, la recherche et les avis etaient
# deja ouverts (permission DRF par defaut IsAuthenticatedOrReadOnly). Seuls
# les points relais exigeaient un compte. Ces tests figent les deux cotes :
# ce qui doit s'ouvrir, et ce qui ne doit SURTOUT pas sortir au passage.

import secrets

import pytest

from apps.accounts.models import RelayPointProfile

pytestmark = pytest.mark.django_db

RELAIS_URL = "/api/shipping/relay-points/nearby/"
# Mot de passe de fixture : jamais relu, juste exige par create_user().
TEST_PASSWORD = secrets.token_urlsafe(16)


def _cree_relais(django_user_model, suffixe, **surcharges):
    gerant = django_user_model.objects.create_user(
        username=f"gerant_{suffixe}",
        email=f"gerant.{suffixe}@example.com",
        password=TEST_PASSWORD,
    )
    valeurs = {
        "name": f"Relais {suffixe}",
        "phone": "+237650000001",
        "manager_name": "Awa Gerante",
        "city": "YAOUNDE",
        "address": "Carrefour Mvan",
        "opening_hours": "08h - 18h",
        "storage_capacity": 20,
        "status": RelayPointProfile.Status.APPROVED,
        "is_active": True,
    }
    valeurs.update(surcharges)
    return RelayPointProfile.objects.create(user=gerant, **valeurs)


@pytest.fixture
def relais(django_user_model):
    return _cree_relais(django_user_model, "mvan")


@pytest.fixture
def visiteur(django_user_model):
    return django_user_model.objects.create_user(
        username="client_connecte",
        email="client.connecte@example.com",
        password=TEST_PASSWORD,
    )


# ── Ce qui s'ouvre ───────────────────────────────────────────────────────────

def test_un_visiteur_sans_compte_voit_les_points_relais(api_client, relais):
    resp = api_client.get(RELAIS_URL)

    assert resp.status_code == 200
    assert [r["name"] for r in resp.data] == ["Relais mvan"]


def test_les_six_acces_exiges_par_D3_sont_ouverts(api_client, django_user_model, relais):
    """
    D3 enumere exactement six choses : « le catalogue, les categories, les
    fiches, la recherche, les avis et les relais ». Une assertion par item,
    pour qu'une fermeture accidentelle de l'un d'eux soit vue tout de suite.
    """
    from apps.catalog.models import Category, ModerationStatus, Product

    categorie = Category.objects.create(name="Telephones", slug="telephones")
    vendeur = django_user_model.objects.create_user(
        username="vendeur_d3", email="vendeur.d3@example.com", password=TEST_PASSWORD,
    )
    fiche = Product.objects.create(
        title="Telephone", category=categorie, vendor=vendeur, price_xaf=100_000,
        moderation_status=ModerationStatus.APPROVED,
    )

    acces = {
        "le catalogue": "/api/catalog/products/",
        "les categories": "/api/catalog/categories/",
        "la fiche": f"/api/catalog/products/{fiche.id}/",
        "la recherche": "/api/catalog/products/?search=telephone",
        "les avis": f"/api/catalog/products/{fiche.id}/reviews/",
        "les relais": RELAIS_URL,
    }

    refuses = {
        nom: api_client.get(url).status_code
        for nom, url in acces.items()
        if api_client.get(url).status_code != 200
    }

    assert refuses == {}, f"acces fermes a un visiteur sans compte : {refuses}"


# ── Ce qui ne doit pas sortir ────────────────────────────────────────────────

def test_le_visiteur_ne_voit_ni_la_capacite_ni_l_occupation(api_client, relais):
    fiche = api_client.get(RELAIS_URL).data[0]

    # Il a besoin de savoir s'il reste de la place...
    assert fiche["has_space"] is True
    # ...mais pas du volume d'activite du relais.
    assert "storage_capacity" not in fiche
    assert "occupancy" not in fiche


def test_aucune_donnee_du_gerant_n_est_exposee(api_client, relais):
    fiche = api_client.get(RELAIS_URL).data[0]

    assert "phone" not in fiche
    assert "manager_name" not in fiche
    assert "user" not in fiche


def test_un_relais_non_approuve_reste_invisible(api_client, django_user_model):
    _cree_relais(django_user_model, "attente",
                 status=RelayPointProfile.Status.PENDING)

    assert api_client.get(RELAIS_URL).data == []


def test_un_relais_inactif_reste_invisible(api_client, django_user_model):
    _cree_relais(django_user_model, "ferme", is_active=False)

    assert api_client.get(RELAIS_URL).data == []


# ── Ce qui ne change pas pour les comptes connectes ──────────────────────────

def test_un_compte_connecte_recoit_la_reponse_complete(api_client, relais, visiteur):
    api_client.force_authenticate(visiteur)

    fiche = api_client.get(RELAIS_URL).data[0]

    # Comportement d'avant D3, inchange.
    assert fiche["storage_capacity"] == 20
    assert fiche["occupancy"] == 0
    assert fiche["has_space"] is True
