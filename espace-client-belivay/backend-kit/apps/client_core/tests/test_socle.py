# backend/apps/client_core/tests/test_socle.py
import pytest
from django.test import RequestFactory, override_settings
from django.urls import path
from rest_framework.response import Response

from apps.client_core import interrupteurs, parametres
from apps.client_core.erreurs import ErreurClient, conflit
from apps.client_core.idempotence import idempotent
from apps.client_core.masquage import masquer_email, masquer_numero, nettoyer_message, operateur
from apps.client_core.models import CleIdempotence, Interrupteur, ParametreMetier
from apps.client_core.pagination import page
from apps.client_core.vues import VueClient, VuePublique, a_finir

from .outils import client_connecte, creer_client

pytestmark = pytest.mark.django_db


# ── Vues de test, montées seulement ici ─────────────────────────────────────────────────────────────────
APPELS = {"n": 0}


class Payer(VueClient):
    @idempotent()
    def post(self, request):
        APPELS["n"] += 1
        if request.data.get("refuser"):
            raise conflit("price_changed", "Le prix a changé.", {"total": 12})
        return Response({"n": APPELS["n"], "montant": request.data.get("montant")}, status=201)


class Module(VuePublique):
    permission_classes = [interrupteurs.module("FF-TEST")]

    def get(self, request):
        return Response({"ok": True})


class Moteur(VueClient):
    def get(self, request):
        from belivay_moteurs.etats import COMMANDE

        COMMANDE.appliquer("payee", "checkout")


class Liste(VueClient):
    def get(self, request):
        elements, suivant = page(request, CleIdempotence.objects.all(), taille=2)
        return Response({"ids": [e.pk for e in elements], "next_cursor": suivant})


urlpatterns = [
    path("t/payer", Payer.as_view()),
    path("t/module", Module.as_view()),
    path("t/moteur", Moteur.as_view()),
    path("t/liste", Liste.as_view()),
    path("t/a-finir", a_finir("methodeDuSite", manque="prestataire")),
]


@pytest.fixture
def client():
    return client_connecte(creer_client())


# ── Format d'erreur (CAP-04) ────────────────────────────────────────────────────────────────────────────
@override_settings(ROOT_URLCONF=__name__)
def test_non_authentifie_au_format_cap04(api_client):
    r = api_client.post("/t/payer", {}, format="json")
    assert r.status_code == 401
    assert r.json()["error"]["code"] == "not_authenticated"


@override_settings(ROOT_URLCONF=__name__)
def test_transition_refusee_du_moteur_devient_409_state_changed(client):
    r = client.get("/t/moteur")
    assert r.status_code == 409
    assert r.json()["error"]["code"] == "state_changed"


@override_settings(ROOT_URLCONF=__name__)
def test_a_finir_repond_501_avec_la_methode_du_site(client):
    r = client.post("/t/a-finir", {}, format="json")
    assert r.status_code == 501
    e = r.json()["error"]
    assert e["code"] == "a_finir" and e["data"]["sources"] == ["methodeDuSite"] and e["data"]["manque"] == "prestataire"


# ── Idempotence (CAP-03) ────────────────────────────────────────────────────────────────────────────────
@override_settings(ROOT_URLCONF=__name__)
def test_idempotence_rejoue_la_meme_reponse_sans_refaire_l_action(client):
    APPELS["n"] = 0
    h = {"HTTP_IDEMPOTENCY_KEY": "commande-52018-1"}
    r1 = client.post("/t/payer", {"montant": 900}, format="json", **h)
    r2 = client.post("/t/payer", {"montant": 900}, format="json", **h)
    assert r1.status_code == r2.status_code == 201
    assert r1.json() == r2.json() == {"n": 1, "montant": 900}
    assert r2["Idempotent-Replayed"] == "true"
    assert APPELS["n"] == 1


@override_settings(ROOT_URLCONF=__name__)
def test_idempotence_cle_obligatoire_et_corps_different(client):
    assert client.post("/t/payer", {}, format="json").json()["error"]["code"] == "idempotency_key_required"
    h = {"HTTP_IDEMPOTENCY_KEY": "cle-assez-longue"}
    client.post("/t/payer", {"montant": 1}, format="json", **h)
    r = client.post("/t/payer", {"montant": 2}, format="json", **h)
    assert r.status_code == 422 and r.json()["error"]["code"] == "idempotency_mismatch"


@override_settings(ROOT_URLCONF=__name__)
def test_idempotence_un_refus_n_est_pas_garde(client):
    h = {"HTTP_IDEMPOTENCY_KEY": "cle-refusee-001"}
    r = client.post("/t/payer", {"refuser": True}, format="json", **h)
    assert r.status_code == 409 and r.json()["error"] == {"code": "price_changed", "message": "Le prix a changé.", "data": {"total": 12}}
    assert not CleIdempotence.objects.filter(cle="cle-refusee-001").exists()


# ── Interrupteurs (CAP-13) ──────────────────────────────────────────────────────────────────────────────
@override_settings(ROOT_URLCONF=__name__)
def test_module_ferme_repond_404(api_client):
    assert api_client.get("/t/module").status_code == 404
    Interrupteur.objects.create(code="FF-TEST", ouvert=True)
    assert api_client.get("/t/module").json() == {"ok": True}


def test_config_flags_lit_les_defauts_du_site_puis_la_base(api_client):
    e = api_client.get("/api/config/flags").json()
    assert e["FF-WALLET"] is True and len(e) == 12
    Interrupteur.objects.create(code="FF-WALLET", ouvert=False)
    assert api_client.get("/api/config/flags").json()["FF-WALLET"] is False


# ── Pagination par curseur (CAP-05) ─────────────────────────────────────────────────────────────────────
@override_settings(ROOT_URLCONF=__name__)
def test_pagination_par_curseur(client):
    for i in range(5):
        CleIdempotence.objects.create(cle=f"cle-{i}", auteur="t", methode="POST", chemin="/", empreinte="x")
    vus, curseur = [], None
    while True:
        r = client.get("/t/liste", {"cursor": curseur} if curseur else {}).json()
        vus += r["ids"]
        curseur = r["next_cursor"]
        if not curseur:
            break
    assert len(vus) == 5 and vus == sorted(vus, reverse=True)
    assert client.get("/t/liste", {"cursor": "!!"}).json()["error"]["code"] == "invalid_cursor"


# ── Paramètres (CCH-15) ─────────────────────────────────────────────────────────────────────────────────
def test_registre_depuis_le_fichier_puis_depuis_la_base():
    assert parametres.livraison().ramassage == 500
    assert parametres.nombres("OTP-RENVOI") == [60, 3]
    v_fichier = parametres.version()
    ParametreMetier.objects.create(code="LIV-R", valeur="500 F", sens="Ramassage")
    # Une base remplie remplace le fichier en entier : un registre partiel arrête les lectures (rien n'est deviné).
    from belivay_moteurs.erreurs import ParametreAbsent

    with pytest.raises(ParametreAbsent):
        parametres.livraison()
    assert parametres.version().startswith("db-") and parametres.version() != v_fichier


def test_commande_charger_parametres_puis_lecture_identique():
    from django.core.management import call_command

    call_command("charger_parametres")
    assert ParametreMetier.objects.count() > 150
    assert parametres.livraison().seuil_relais == 30_000
    assert parametres.garde().grille == (0, 100, 100, 100, 200, 500, 1000)
    call_command("charger_parametres")  # idempotent


def test_parametre_mal_ecrit_devient_503(client):
    from apps.client_core.erreurs import gestionnaire_erreurs
    from belivay_moteurs.erreurs import ParametreIllisible

    r = gestionnaire_erreurs(ParametreIllisible("LIV-R"), {"request": RequestFactory().get("/")})
    assert r.status_code == 503 and r.data["error"]["code"] == "parametres_indisponibles"


# ── Masquage (CAP-21, CMS-04) ───────────────────────────────────────────────────────────────────────────
def test_masquage():
    assert masquer_numero("+237 677 12 34 41") == "6 77 ·· ·· 41"
    assert masquer_email("carine@gmail.com") == "c•••••@gmail.com"
    assert operateur("677123441") == "MTN" and operateur("699000000") == "Orange" and operateur("655000000") == "Orange"
    t, m = nettoyer_message("Appelle-moi au 6 77 12 34 41 ou carine@gmail.com, voir www.exemple.com")
    assert "{{numero}}" in t and "{{email}}" in t and "{{lien}}" in t
    assert m == ["email", "lien", "numero"]
    assert nettoyer_message("Le colis fait 2 kg")[1] == []


def test_erreur_client_porte_code_et_donnees():
    e = ErreurClient(422, "zone_non_servie", "Hors zone.", {"ville": "Douala"})
    assert (e.status_code, e.code, e.data) == (422, "zone_non_servie", {"ville": "Douala"})


def test_delai_des_refus_429():
    import time

    from apps.client_core.erreurs import secondes_a_attendre

    assert secondes_a_attendre({"renvoiSecondes": 41.2}) == 42
    assert secondes_a_attendre({"retry_after": 0}) == 1
    assert 58 <= secondes_a_attendre({"prochain": time.time() * 1000 + 60_000}) <= 60
    assert secondes_a_attendre(None, "trop_d_envois") == 3600
    assert secondes_a_attendre({}, "throttled") is None
