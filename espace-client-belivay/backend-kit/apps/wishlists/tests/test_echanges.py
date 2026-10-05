# backend/apps/wishlists/tests/test_echanges.py
# Échanges entre clients (DP-54) : proches trouvés par leur numéro, envois, rappels, colis refusé, panier payé pour
# un proche (site/tests/echanges.spec.ts).
import uuid

import pytest

from apps.client_core.tests.outils import client_connecte, creer_boutique, creer_client, creer_produit, creer_relais
from apps.wishlists.models import ColisEchange

pytestmark = pytest.mark.django_db


@pytest.fixture(autouse=True)
def _classe(settings):
    settings.BELIVAY_CLASSE_PAR_DEFAUT = "S"


@pytest.fixture
def monde():
    from apps.client_accounts.services import enregistrer_numero, profil

    relais = creer_relais()
    carine, paul = creer_client("Carine"), creer_client("Paul")
    enregistrer_numero(carine, "677112241")
    enregistrer_numero(paul, "678904455")
    for u in (carine, paul):
        p = profil(u)
        p.relais_habituel_id = relais.pk
        p.save()
    b = creer_boutique()
    return {
        "relais": relais,
        "carine": carine,
        "paul": paul,
        "api": client_connecte(carine),
        "api_paul": client_connecte(paul),
        "sandales": creer_produit(b, titre="Sandales cuir femme", prix=14_900),
        "savon": creer_produit(b, titre="Savon", prix=1000),
    }


def test_chercher_proche(monde):
    api = monde["api"]
    r = api.post("/api/me/contacts/lookup", {"numero": "678 90 44 55"}, format="json").json()
    assert r["ok"] is True
    assert r["proche"] == {
        "id": str(monde["paul"].pk),
        "prenom": "Paul",
        "numeroMasque": "6 78 ·· ·· 55",
        "quartier": "Mvog-Ada",
        "lie": False,
        "anniversaire": None,
        "liste": None,
    }
    assert api.post("/api/me/contacts/lookup", {"numero": "677112241"}, format="json").json() == {"ok": False, "raison": "moi"}
    assert api.post("/api/me/contacts/lookup", {"numero": "699000000"}, format="json").json() == {"ok": False, "raison": "inconnu"}
    assert api.post("/api/me/contacts/lookup", {"numero": "12"}, format="json").json() == {"ok": False, "raison": "numero"}
    assert api.get("/api/me/exchanges").json()["proches"][0]["prenom"] == "Paul"


def test_chercher_proche_vingt_par_jour(monde):
    api = monde["api"]
    for _ in range(20):
        assert api.post("/api/me/contacts/lookup", {"numero": "699000000"}, format="json").status_code == 200
    r = api.post("/api/me/contacts/lookup", {"numero": "678904455"}, format="json")
    assert r.status_code == 429


def test_envoyer_aux_proches_et_rappeler(monde):
    api = monde["api"]
    api.post("/api/me/contacts/lookup", {"numero": "678904455"}, format="json")
    id_ = api.post("/api/me/wishlists", {"nom": "Anniversaire", "mode": "fil", "remiseLe": None, "surprise": False}, format="json").json()[
        "id"
    ]
    assert api.post(f"/api/me/wishlists/{id_}/remind").json() == {"ok": False, "raison": "personne"}
    corps = {"type": "liste", "id": id_, "proches": [str(monde["paul"].pk), "999999"]}
    assert api.post("/api/me/exchanges/send", corps, format="json").json() == {"envoyes": 1}
    assert api.post("/api/me/exchanges/send", corps, format="json").json() == {"envoyes": 0}  # une fois par objet
    assert api.post(f"/api/me/wishlists/{id_}/remind").json() == {"ok": True, "n": 1}
    r = api.post(f"/api/me/wishlists/{id_}/remind")
    assert r.status_code == 429 and r.json()["error"]["code"] == "too_early" and r.json()["error"]["data"]["prochain"] > 0
    envois = api.get("/api/me/exchanges").json()["envois"]
    assert envois[0]["prenom"] == "Paul" and envois[0]["rappeleLe"] is not None


def test_suivre_la_liste_d_un_proche(monde):
    id_ = (
        monde["api_paul"]
        .post("/api/me/wishlists", {"nom": "Naissance", "mode": "fil", "remiseLe": None, "surprise": False}, format="json")
        .json()["id"]
    )
    code = monde["api_paul"].post(f"/api/me/wishlists/{id_}/share").json()["partage"]["code"]
    api = monde["api"]
    assert api.put(f"/api/me/followed-wishlists/{code}", {"suivre": True, "rappel": 3}, format="json").status_code == 204
    assert api.get("/api/me/exchanges").json()["suivies"][0]["rappel"] == 3
    assert api.put(f"/api/me/followed-wishlists/{code}", {"suivre": True, "rappel": 5}, format="json").status_code == 422
    assert api.put(f"/api/me/followed-wishlists/{code}", {"suivre": False, "rappel": None}, format="json").status_code == 204
    assert api.get("/api/me/exchanges").json()["suivies"] == []


def _ajouter_au_panier(user, produit):
    from apps.cart.services import ajouter

    ajouter(user, produit.pk, 1)


def test_panier_paye_pour_un_proche_puis_refuse_sans_frais(monde):
    api = monde["api"]
    api.post("/api/me/contacts/lookup", {"numero": "678904455"}, format="json")
    _ajouter_au_panier(monde["carine"], monde["sandales"])
    corps = {
        "prenom": "Paul",
        "proche": str(monde["paul"].pk),
        "relais": "Relais Mvog-Ada",
        "qui_paie_livraison": "destinataire",
        "moyen": "677112241",
        "mot": "Pour toi",
    }
    r = api.post("/api/cart/send-to", corps, format="json", HTTP_IDEMPOTENCY_KEY=str(uuid.uuid4()))
    assert r.status_code == 200, r.content
    assert r.json()["ok"] is True
    c = ColisEchange.objects.get()
    assert (c.origine, c.articles, c.frais, c.total, c.etat) == ("panier", 14900, 900, 14900, "a_accepter")
    from apps.cart.models import LignePanier

    assert not LignePanier.objects.filter(panier__client=monde["carine"]).exists()
    # Vu de Paul : à accepter ; il refuse avant l'expédition, sans frais : Carine récupère 14 900 F.
    colis = monde["api_paul"].get("/api/me/exchanges").json()["colis"]
    assert colis[0]["sens"] == "recu" and colis[0]["etat"] == "a_accepter" and colis[0]["mot"] == "Pour toi"
    r = monde["api_paul"].post(f"/api/me/incoming-parcels/{c.pk}/answer", {"accepte": False}, format="json").json()
    assert (r["etat"], r["retenue"], r["rembourse"]) == ("refuse", 0, 14900)
    assert monde["api_paul"].post(f"/api/me/incoming-parcels/{c.pk}/answer", {"accepte": True}, format="json").status_code == 409
    assert api.post(f"/api/me/incoming-parcels/{c.pk}/answer", {"accepte": True}, format="json").status_code == 404  # pas le destinataire


def test_panier_pour_un_proche_refus_garantie_et_vide(monde):
    api = monde["api"]
    corps = {"prenom": "Paul", "relais": "Relais Mvog-Ada", "qui_paie_livraison": "destinataire", "moyen": "677112241", "mot": ""}
    assert api.post("/api/cart/send-to", corps, format="json", HTTP_IDEMPOTENCY_KEY=str(uuid.uuid4())).json() == {
        "ok": False,
        "raison": "vide",
    }
    _ajouter_au_panier(monde["carine"], monde["savon"])
    assert api.post("/api/cart/send-to", corps, format="json", HTTP_IDEMPOTENCY_KEY=str(uuid.uuid4())).json() == {
        "ok": False,
        "raison": "garantie",
    }
    assert api.post(
        "/api/cart/send-to", {**corps, "relais": "Relais inconnu"}, format="json", HTTP_IDEMPOTENCY_KEY=str(uuid.uuid4())
    ).json() == {"ok": False, "raison": "relais"}
    assert api.post("/api/cart/send-to", corps, format="json").status_code == 400  # Idempotency-Key exigée


def test_remercier_un_cadeau_inconnu(monde):
    assert monde["api"].post("/api/me/thanks", {"ref": "BLV-999", "texte": "Merci"}, format="json").status_code == 404
