# Zones et adresses, spécification v2.1 (BV-DEV-04, A9) : apps/shipping/zones.py.

import pytest
from rest_framework.test import APIClient

from apps.regles import services as regles
from apps.regles.models import TableReglee
from apps.shipping import zones
from apps.shipping.models import DemandeAdresse, Zone

pytestmark = pytest.mark.django_db

PRECIS = 10  # m, sous r_epingle_precision_m


def carre(lat, lon, d=0.01):
    """Contour GeoJSON carré autour d'un point ([longitude, latitude])."""
    return {"type": "Polygon", "coordinates": [[[lon - d, lat - d], [lon + d, lat - d], [lon + d, lat + d], [lon - d, lat + d], [lon - d, lat - d]]]}


@pytest.fixture(autouse=True)
def _zones():
    regles.cache.delete(regles.CLE_CACHE)
    zones.synchroniser_zones()
    yield
    regles.cache.delete(regles.CLE_CACHE)


def test_les_12_zones_suivent_t_zones():
    codes = list(Zone.objects.filter(code__isnull=False).order_by("id").values_list("code", "tier"))
    assert [c for c, _ in codes] == [f"Z{i}" for i in range(1, 13)]
    assert dict(codes)["Z1"] == "STANDARD" and dict(codes)["Z2"] == "VAGUE_2" and dict(codes)["Z8"] == "VAGUE_3"
    assert "Bastos" in Zone.objects.get(code="Z1").districts


def test_une_zone_renommee_dans_les_reglages_est_reprise():
    t = TableReglee.objects.get(nom="t_zones")
    t.lignes = [{**z, "nom": "Bastos"} if z["zone"] == "Z1" else z for z in t.lignes]
    t.save()
    assert Zone.objects.get(code="Z1").name == "Z1 · Bastos"


@pytest.mark.parametrize("texte, attendus", [
    ("bastos", ["Bastos"]),
    ("BIYEM ASSI", ["Biyem-Assi"]),
    ("centre-ville", ["Centre commercial"]),       # appellation (alias)
    ("Ngoa Ekellé", ["Ngoa-Ekelé 1", "Ngoa-Ekelé 2"]),  # une appellation, deux quartiers : les deux
    ("Akwa", []),
])
def test_recherche_du_quartier(texte, attendus):
    assert [q["quartier"] for q in zones.chercher_quartiers(texte)] == attendus


def test_zone_match_du_checkout_passe_par_le_referentiel():
    assert Zone.match("Yaoundé", "melen").code == "Z6"
    assert Zone.match("Yaoundé", "Mvan").code == "Z11"  # Mvan-Nord et Mvan-Sud : même zone


def test_niveaux_sans_contours():
    assert zones.niveau(zones.quartier("Bastos")) == "centre"
    z8 = next(q for q in zones.quartiers() if q["zone"] == "Z8" and q["quartier"] not in regles.table("t_periurbains"))
    assert zones.niveau(z8) == "peripherie"                           # R06.1
    assert zones.niveau(zones.quartier("Nkolondom")) == "periurbain"  # R06.5 : contour pas encore tracé


def test_une_epingle_dans_un_contour_periurbain_fait_foi():
    t = TableReglee.objects.get(nom="t_quartiers")
    t.lignes = [{**q, "contour": carre(3.95, 11.50)} if q["quartier"] == "Nkolondom" else q for q in t.lignes]
    t.save()
    assert zones.niveau(zones.quartier("Bastos"), 3.95, 11.50) == "periurbain"   # R90.2
    # contour tracé et épingle dehors : la règle de la zone s'applique (Nkolondom est en Z12, périphérie)
    assert zones.niveau(zones.quartier("Nkolondom"), 3.80, 11.40) == "peripherie"


def test_adresse_valable_sans_contours():
    r = zones.resoudre_adresse("bastos", 3.8667, 11.5167, PRECIS)
    assert (r.refus, r.zone, r.niveau, r.exploitee) == ("", "Z1", "centre", True)


def test_epingle_imprecise_ou_absente():
    assert zones.resoudre_adresse("bastos", 3.8667, 11.5167, 80).refus == "precision"  # R76.3
    assert zones.resoudre_adresse("bastos", None, None, None).refus == "epingle"       # R76.1


def test_epingle_hors_de_la_zone_du_quartier():
    Zone.objects.filter(code="Z1").update(contour=carre(3.88, 11.51))
    Zone.objects.filter(code="Z6").update(contour=carre(3.86, 11.49))
    assert zones.resoudre_adresse("bastos", 3.88, 11.51, PRECIS).zone == "Z1"
    r = zones.resoudre_adresse("bastos", 3.86, 11.49, PRECIS)                         # R76.4
    assert r.refus == "autre_zone" and r.zone == "Z6" and "Melen" in r.propositions


def test_hors_des_12_zones():
    for i, z in enumerate(Zone.objects.filter(code__isnull=False).order_by("id")):
        z.contour = carre(3.80 + i * 0.03, 11.50)
        z.save()
    r = zones.resoudre_adresse("bastos", 4.50, 12.00, PRECIS)                         # R76.5
    assert r.refus == "hors_zone" and r.message == "Cette adresse est hors de nos zones pour l'instant."


# ── Adresse du client (/api/me/adresses) ────────────────────────────────────────────────────────────────

def _client(django_user_model):
    c = APIClient()
    c.force_authenticate(django_user_model.objects.create_user(username="cli-zones", password="x"))
    return c


ADRESSE = {"nom": "Maison", "quartier": "bastos", "reperes": "portail vert", "position": True,
           "coords": {"lat": 3.8667, "lon": 11.5167, "precision": PRECIS}}


def test_adresse_enregistree_avec_zone_et_niveau(django_user_model):
    r = _client(django_user_model).post("/api/me/adresses", {"a": ADRESSE}, format="json")
    assert r.status_code == 200, r.json()
    a = r.json()["adresse"]
    assert (a["quartier"], a["zone"], a["niveau"], a["zoneServie"]) == ("Bastos", "Z1", "centre", True)


def test_zone_non_exploitee(django_user_model):
    r = _client(django_user_model).post("/api/me/adresses", {"a": {**ADRESSE, "quartier": "Tsinga"}}, format="json")
    assert r.status_code == 422
    assert r.json()["error"]["message"] == ("La livraison à domicile n'est pas encore disponible à cette adresse. "
                                            "Choisissez un relais proche.")  # R74.1


def test_hors_zone_garde_la_demande(django_user_model):
    for i, z in enumerate(Zone.objects.filter(code__isnull=False).order_by("id")):
        z.contour = carre(3.80 + i * 0.03, 11.50)
        z.save()
    c = _client(django_user_model)
    r = c.post("/api/me/adresses", {"a": {**ADRESSE, "coords": {"lat": 4.5, "lon": 12.0, "precision": PRECIS}}}, format="json")
    assert r.status_code == 422 and r.json()["error"]["code"] == "hors_zone"
    assert DemandeAdresse.objects.filter(type="HORS_ZONE").count() == 1


def test_autre_quartier_a_rattacher(django_user_model):
    c = _client(django_user_model)
    r = c.post("/api/me/adresses", {"a": {**ADRESSE, "quartier": "Carrefour Obili Chapelle", "autreQuartier": True}}, format="json")
    assert r.status_code == 200, r.json()
    assert r.json()["adresse"]["zoneServie"] is False
    assert DemandeAdresse.objects.get(type="AUTRE_QUARTIER").quartier_saisi == "Carrefour Obili Chapelle"


def test_api_quartiers_et_verification():
    c = APIClient()
    assert [q["quartier"] for q in c.get("/api/shipping/quartiers/?q=centre ville").json()["quartiers"]] == ["Centre commercial"]
    r = c.post("/api/shipping/adresse/verifier/", {"quartier": "Melen", "lat": 3.86, "lon": 11.49, "precision": 5}, format="json").json()
    assert r["ok"] and r["zone"] == "Z6" and r["niveau"] == "centre" and r["zoneExploitee"] is True
