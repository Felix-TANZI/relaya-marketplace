# Connexion Apple et appel masqué — feuille de route D33.

import pytest
from django.contrib.auth.models import User
from django.test import override_settings
from rest_framework.test import APIClient

from apps.shipping.appels import AppelConsole, PrestataireAppel, Resultat
from apps.shipping.models import AppelMasque, Shipment
from tests.test_preuves_et_codes import _colis, _referentiel  # noqa: F401  (fixture)

pytestmark = pytest.mark.django_db


# ── Apple sur Android : page web d'Apple, retour au serveur, ticket à usage unique ──────────────────────────

@pytest.fixture
def jeton_apple(monkeypatch):
    from apps.accounts import views

    monkeypatch.setattr(views, "_verify_apple_identity_token", lambda jeton: {
        "sub": "apple-sub-1", "email": "awa@privaterelay.appleid.com", "email_verified": "true",
        "aud": "com.belivay.client.web"})


def test_le_retour_apple_donne_un_ticket_puis_une_session(jeton_apple):
    c = APIClient()
    r = c.post("/api/auth/apple/callback/", {"id_token": "jwt", "code": "c", "state": "s1",
                                              "user": '{"name": {"firstName": "Awa", "lastName": "N."}}'})
    assert r.status_code == 302
    assert r["Location"].startswith("https://localhost/auth/apple/retour?") and "state=s1" in r["Location"]
    assert "jwt" not in r["Location"]                                                     # aucun jeton dans l'adresse
    ticket = r["Location"].split("ticket=")[1].split("&")[0]
    session = c.post("/api/auth/apple/ticket/", {"ticket": ticket}, format="json")
    assert session.status_code == 200 and session.json()["access"]
    assert User.objects.get(email="awa@privaterelay.appleid.com").first_name == "Awa"
    assert c.post("/api/auth/apple/ticket/", {"ticket": ticket}, format="json").status_code == 400   # usage unique


def test_un_refus_apple_revient_sans_ticket():
    r = APIClient().post("/api/auth/apple/callback/", {"error": "user_cancelled_authorize", "state": "s2"})
    assert r.status_code == 302 and "ticket=" not in r["Location"] and "erreur=" in r["Location"]


# ── Appel client-livreur avec numéro masqué ─────────────────────────────────────────────────────────────────

def _client_de(colis):
    c = APIClient()
    c.force_authenticate(colis.order.user)
    return c


def test_le_client_et_le_livreur_s_appellent_par_le_serveur():
    colis = _colis(False, Shipment.Status.OUT_FOR_DELIVERY)
    AppelConsole.APPELS.clear()
    r = _client_de(colis).post(f"/api/shipping/shipments/{colis.pk}/appel/")
    assert r.status_code == 200 and r.json()["ok"] is True
    assert AppelConsole.APPELS[-1]["appele"] == colis.courier.phone
    livreur = APIClient()
    livreur.force_authenticate(colis.courier.user)
    r = livreur.post(f"/api/shipping/shipments/{colis.pk}/appel/")
    assert r.json()["appels_au_client"] == 1                                              # preuve R51.1
    assert list(AppelMasque.objects.values_list("sens", flat=True)) == ["LIVREUR_CLIENT", "CLIENT_LIVREUR"]

    inconnu = APIClient()
    inconnu.force_authenticate(User.objects.create_user(username="curieux", password="p"))
    assert inconnu.post(f"/api/shipping/shipments/{colis.pk}/appel/").status_code == 403


def test_pas_d_appel_avant_qu_un_livreur_soit_en_route():
    colis = _colis(False, Shipment.Status.DELIVERED)
    assert _client_de(colis).post(f"/api/shipping/shipments/{colis.pk}/appel/").status_code == 409


class OperateurDeTest(PrestataireAppel):
    nom = "test"

    def relier(self, appelant, appele, reference):
        return Resultat(True, f"op-{reference}")


def test_avec_un_operateur_branche_les_numeros_sont_masques():
    from apps.shipping.serializers import ShipmentSerializer

    colis = _colis(False, Shipment.Status.OUT_FOR_DELIVERY)
    requete = type("R", (), {"user": colis.order.user})()
    assert ShipmentSerializer(colis, context={"request": requete}).data["courier"]["phone"] == colis.courier.phone
    with override_settings(BELIVAY_APPELS="tests.test_apple_appel_d33.OperateurDeTest"):
        vu = ShipmentSerializer(colis, context={"request": requete}).data
        assert vu["courier"]["phone"] != colis.courier.phone and vu["appel_masque"] is True
        staff = type("R", (), {"user": User.objects.create_user(username="ops", password="p", is_staff=True)})()
        assert ShipmentSerializer(colis, context={"request": staff}).data["courier"]["phone"] == colis.courier.phone
        r = _client_de(colis).post(f"/api/shipping/shipments/{colis.pk}/appel/")
        assert r.status_code == 200 and AppelMasque.objects.get().prestataire == "test"
