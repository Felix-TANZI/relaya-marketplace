# backend/apps/wishlists/tests/test_listes.py
# Listes d'envies, liens publics et cadeaux (CL-14 ; DP-54) : site/tests/echanges.spec.ts, listes-statut.spec.ts.
import re
import uuid

import pytest
from django.core import mail

from apps.client_core.models import Interrupteur
from apps.client_core.tests.outils import client_connecte, creer_boutique, creer_client, creer_produit, creer_relais
from apps.wishlists.models import ColisEchange, ListeEnvies

pytestmark = pytest.mark.django_db


@pytest.fixture(autouse=True)
def _classe(settings):
    settings.BELIVAY_CLASSE_PAR_DEFAUT = "S"


@pytest.fixture
def monde():
    from apps.client_accounts.services import profil

    relais = creer_relais()
    mireille = creer_client("Mireille")
    p = profil(mireille)
    p.relais_habituel_id = relais.pk
    p.save()
    b = creer_boutique()
    return {
        "relais": relais,
        "mireille": mireille,
        "api": client_connecte(mireille),
        "cafe": creer_produit(b, titre="Café arabica de l'Ouest 500 g", prix=5500),
        "montre": creer_produit(b, titre="Montre acier", prix=200_000),
        "pagne": creer_produit(b, titre="Pagne wax", prix=18_000),
    }


def _cle():
    return {"HTTP_IDEMPOTENCY_KEY": str(uuid.uuid4())}


def _liste_partagee(m, *produits, **reglages):
    api = m["api"]
    r = api.post("/api/me/wishlists", {"nom": "Mon anniversaire", "mode": "fil", "remiseLe": None, "surprise": False}, format="json")
    assert r.status_code == 201, r.content
    id_ = r.json()["id"]
    for p in produits:
        assert api.post(f"/api/me/wishlists/{id_}/items", {"produit": str(p.pk)}, format="json").status_code == 204
    if reglages:
        assert api.patch(f"/api/me/wishlists/{id_}", reglages, format="json").status_code == 204
    r = api.post(f"/api/me/wishlists/{id_}/share")
    return id_, r.json()["partage"]["code"]


def _offrir(api_client, code, produit, **extra):
    corps = {
        "produit": str(produit.pk),
        "prenom": "Carine",
        "email": "carine@exemple.cm",
        "moyen": "677112241",
        "prix_vu": produit.price_xaf,
        "qui": "payeur",
        "livraison": "relais",
        **extra,
    }
    return api_client.post(f"/api/wishlists/{code}/gifts", corps, format="json", **_cle())


def test_mes_listes_et_articles(monde):
    api = monde["api"]
    id_, _ = _liste_partagee(monde, monde["cafe"])
    d = api.get("/api/me/wishlists").json()
    assert d["listes"][0]["id"] == "favoris" and d["listes"][0]["favoris"] is True
    assert d["relais"] == "Relais Mvog-Ada"
    liste = next(x for x in d["listes"] if x["id"] == id_)
    a = liste["articles"][0]
    assert (a["p"], a["prix"], a["livraison"], a["prixPartage"], a["offert"]) == (str(monde["cafe"].pk), 5500, 900, 5500, None)
    assert liste["relais"] == "Relais Mvog-Ada" and liste["partage"]["jusqua"] > liste["partage"]["le"]


def test_partage_code_base32_et_liste_publique_sans_adresse(monde, api_client):
    _, code = _liste_partagee(monde, monde["cafe"])
    assert re.fullmatch(r"[A-Z2-7]{8}", code)
    d = api_client.get(f"/api/wishlists/{code}").json()
    assert d["prenom"] == "Mireille" and d["quartier"] == "Mvog-Ada" and d["domicile"] is None
    assert d["articles"][0]["offert"] is False
    assert "adresse" not in str(d).lower()
    assert api_client.get("/api/wishlists/AAAAAAAA").status_code == 404


def test_arreter_partage_ferme_le_lien(monde, api_client):
    id_, code = _liste_partagee(monde, monde["cafe"])
    assert monde["api"].delete(f"/api/me/wishlists/{id_}/share").status_code == 204
    assert api_client.get(f"/api/wishlists/{code}").status_code == 404
    assert _offrir(api_client, code, monde["cafe"]).json() == {"ok": False, "raison": "ferme"}


def test_offrir_mobile_money_livraison_au_destinataire(monde, api_client):
    id_, code = _liste_partagee(monde, monde["cafe"])
    r = _offrir(api_client, code, monde["cafe"], qui="destinataire")
    assert r.status_code == 200, r.content
    ref = r.json()["ref"]
    assert r.json()["ok"] is True and ref.startswith("BLV-")
    c = ColisEchange.objects.get()
    assert (c.total, c.frais, c.qui, c.etat, c.etat_paiement) == (5500, 900, "destinataire", "a_accepter", "attente")
    # Déjà offert : on ne l'offre plus, et il ne se retire plus de la liste.
    assert _offrir(api_client, code, monde["cafe"]).json() == {"ok": False, "raison": "offert"}
    assert monde["api"].delete(f"/api/me/wishlists/{id_}/items/{monde['cafe'].pk}").json() == {"ok": False}
    article = next(x for x in monde["api"].get("/api/me/wishlists").json()["listes"] if x["id"] == id_)["articles"][0]
    assert article["offert"]["par"] == "Carine" and article["offert"]["ref"] == ref


def test_offrir_garantie_insuffisante(monde, api_client):
    b = creer_boutique()
    savon = creer_produit(b, titre="Savon", prix=2000)
    _, code = _liste_partagee(monde, savon)
    assert _offrir(api_client, code, savon, qui="destinataire").json() == {"ok": False, "raison": "garantie"}


def test_offrir_prix_en_hausse_409(monde, api_client):
    _, code = _liste_partagee(monde, monde["cafe"])
    r = _offrir(api_client, code, monde["cafe"], prix_vu=5000)
    assert r.status_code == 409
    assert r.json()["error"]["code"] == "price_changed" and r.json()["error"]["data"] == {"prix": 5500}
    assert not ColisEchange.objects.exists()


def test_offrir_domicile_refuse_si_non_accepte(monde, api_client):
    _, code = _liste_partagee(monde, monde["cafe"])
    r = _offrir(api_client, code, monde["cafe"], livraison="domicile")
    assert r.status_code == 422 and r.json()["error"]["code"] == "domicile"


def _carte(pays_carte="France", pays="France", code_email=""):
    return {"bin": "", "pays_carte": pays_carte, "pays": pays, "code_email": code_email}


def test_offrir_par_carte_acceptee(monde, api_client):
    _, code = _liste_partagee(monde, monde["cafe"])
    r = _offrir(api_client, code, monde["cafe"], moyen="Visa •••• 4242", jeton="tok_ok", devise="EUR", carte=_carte())
    assert r.status_code == 200 and r.json()["ok"] is True, r.content
    c = ColisEchange.objects.get()
    assert (c.moyen, c.frais_service, c.total, c.etat_paiement, c.devise) == ("carte", 128, 6528, "paye", "EUR")
    assert str(c.montant_devise) == "9.95"


def test_offrir_par_carte_camerounaise_refusee(monde, api_client):
    _, code = _liste_partagee(monde, monde["cafe"])
    r = _offrir(api_client, code, monde["cafe"], moyen="Visa", jeton="tok_ok", carte=_carte(pays_carte="Cameroun"))
    assert r.status_code == 422
    assert r.json()["error"]["code"] == "coherence"
    assert r.json()["error"]["data"]["controle"] == {"decision": "refuse", "paysCarte": "Cameroun", "signaux": [], "motif": "cameroun"}
    assert not ColisEchange.objects.exists()


def test_offrir_par_carte_verification_renforcee_par_email(monde, api_client):
    _, code = _liste_partagee(monde, monde["cafe"])
    r = _offrir(api_client, code, monde["cafe"], moyen="Visa", jeton="tok_ok", carte=_carte(pays_carte="Belgique"))
    assert r.status_code == 422 and r.json()["error"]["code"] == "verification"
    assert r.json()["error"]["data"]["controle"]["signaux"] == ["pays"]
    envoi = api_client.post(f"/api/wishlists/{code}/gifts/otp", {"email": "carine@exemple.cm"}, format="json")
    assert envoi.status_code == 200 and envoi.json()["valideMinutes"] > 0
    code_mail = re.search(r"\b(\d{6})\b", mail.outbox[-1].body).group(1)
    r = _offrir(api_client, code, monde["cafe"], moyen="Visa", jeton="tok_ok", carte=_carte(pays_carte="Belgique", code_email=code_mail))
    assert r.status_code == 200 and r.json()["ok"] is True


def test_offrir_par_carte_plafond(monde, api_client):
    _, code = _liste_partagee(monde, monde["montre"])
    r = _offrir(api_client, code, monde["montre"], moyen="Visa", jeton="tok_ok", carte=_carte())
    assert r.status_code == 422 and r.json()["error"]["code"] == "plafond"


def test_offrir_carte_refusee_par_la_banque(monde, api_client):
    _, code = _liste_partagee(monde, monde["cafe"])
    r = _offrir(api_client, code, monde["cafe"], moyen="Visa", jeton="tok_refus", carte=_carte())
    assert r.status_code == 402 and r.json()["error"]["code"] == "paiement_refuse"
    assert _offrir(api_client, code, monde["cafe"]).json()["ok"] is True  # rien n'a été retenu


def test_offrir_idempotent(monde, api_client):
    _, code = _liste_partagee(monde, monde["cafe"])
    corps = {
        "produit": str(monde["cafe"].pk),
        "prenom": "Carine",
        "email": "c@exemple.cm",
        "moyen": "677112241",
        "prix_vu": 5500,
        "qui": "payeur",
        "livraison": "relais",
    }
    cle = _cle()
    r1 = api_client.post(f"/api/wishlists/{code}/gifts", corps, format="json", **cle)
    r2 = api_client.post(f"/api/wishlists/{code}/gifts", corps, format="json", **cle)
    assert r1.json() == r2.json() and r2.headers.get("Idempotent-Replayed") == "true"
    assert ColisEchange.objects.count() == 1


def test_suivi_cadeau_public_et_merci(monde, api_client):
    _, code = _liste_partagee(monde, monde["cafe"])
    ref = _offrir(api_client, code, monde["cafe"], moyen="Visa", jeton="tok_ok", carte=_carte()).json()["ref"]
    d = api_client.get(f"/api/wishlists/{code}/gifts/{ref}").json()
    assert (d["pour"], d["livraison"], d["lieu"], d["montant"], d["merci"]) == ("Mireille", "relais", "Mvog-Ada", 6528, None)
    assert monde["api"].post("/api/me/thanks", {"ref": ref, "texte": "Merci Carine !"}, format="json").status_code == 204
    assert mail.outbox[-1].to == ["carine@exemple.cm"]
    assert api_client.get(f"/api/wishlists/{code}/gifts/{ref}").json()["merci"]["texte"] == "Merci Carine !"
    assert api_client.get(f"/api/wishlists/AUTRE234/gifts/{ref}").status_code == 404


def test_regler_liste_fige_apres_un_cadeau(monde, api_client):
    id_, code = _liste_partagee(monde, monde["cafe"], domicile=True)
    _offrir(api_client, code, monde["cafe"])
    monde["api"].patch(f"/api/me/wishlists/{id_}", {"domicile": False, "surprise": True}, format="json")
    liste = ListeEnvies.objects.get(pk=id_)
    assert liste.domicile is True and liste.surprise is True


def test_mise_en_statut(monde):
    id_, code = _liste_partagee(monde, monde["cafe"])
    r = monde["api"].post(f"/api/me/wishlists/{id_}/status-shares", {"canal": "whatsapp"}, format="json")
    assert r.json()["code"] == code
    monde["api"].post(f"/api/me/wishlists/{id_}/status-shares", {"canal": "image"}, format="json")
    liste = next(x for x in monde["api"].get("/api/me/wishlists").json()["listes"] if x["id"] == id_)
    assert [s["canal"] for s in liste["statuts"]] == ["whatsapp", "image"]


def test_demarrer_et_liste_d_un_autre_client(monde):
    id_, _ = _liste_partagee(monde, monde["cafe"])
    assert monde["api"].post(f"/api/me/wishlists/{id_}/start").status_code == 204
    autre = client_connecte(creer_client("Paul"))
    assert autre.post(f"/api/me/wishlists/{id_}/start").status_code == 404


def test_cotiser_un_article_trop_petit(monde, api_client):
    _, code = _liste_partagee(monde, monde["cafe"])
    assert api_client.post(f"/api/wishlists/{code}/items/{monde['cafe'].pk}/pool").json() == {"ok": False, "raison": "petit"}


def test_module_ferme_404(monde, api_client):
    Interrupteur.objects.create(code="FF-LISTE-ENVIES", ouvert=False)
    assert monde["api"].get("/api/me/wishlists").status_code == 404
    assert api_client.get("/api/wishlists/ABCDEFGH").status_code == 404


# ── Occasions et cagnotte d'une liste (DP-54) ─────────────────────────────────────────────────────────


def test_liste_de_mariage_avec_cagnotte_et_participation_sans_compte(monde):
    from rest_framework.test import APIClient

    api = monde["api"]
    r = api.post(
        "/api/me/wishlists",
        {
            "nom": "Notre mariage",
            "mode": "groupe",
            "remiseLe": None,
            "surprise": False,
            "occasion": "mariage",
            "hotes": ["Mireille", "Paul"],
            "cagnotte": {"titre": "Voyage de noces", "objectif": 50_000},
        },
        format="json",
    )
    assert r.status_code == 201, r.content
    liste = r.json()
    assert (liste["occasion"], liste["hotes"], liste["cagnotte"]) == (
        "mariage",
        ["Mireille", "Paul"],
        {"titre": "Voyage de noces", "objectif": 50_000, "participations": []},
    )
    code = api.post(f"/api/me/wishlists/{liste['id']}/share").json()["partage"]["code"]
    anonyme = APIClient()
    pub = anonyme.get(f"/api/wishlists/{code}").json()
    assert pub["cagnotte"] == {"titre": "Voyage de noces", "objectif": 50_000, "reuni": 0, "participants": 0}
    corps = {"prenom": "Carine", "montant": 500, "moyen": "677112241", "mot": "Bon voyage", "discret": False}
    assert anonyme.post(f"/api/wishlists/{code}/fund", corps, format="json", **_cle()).json() == {"ok": False, "raison": "montant"}
    assert anonyme.post(f"/api/wishlists/{code}/fund", {**corps, "montant": 60_000}, format="json", **_cle()).json() == {
        "ok": False,
        "raison": "montant",
    }
    r = anonyme.post(f"/api/wishlists/{code}/fund", {**corps, "montant": 10_000}, format="json", **_cle())
    assert r.status_code == 200 and r.json()["ok"] is True, r.content
    # Mobile Money : payé à la validation (webhook) ; la participation compte alors dans la cagnotte.
    from apps.wishlists import services
    from apps.wishlists.models import ParticipationCagnotte

    part = ParticipationCagnotte.objects.get()
    services.confirmer_paiement(part.reference_paiement)
    assert anonyme.get(f"/api/wishlists/{code}").json()["cagnotte"]["reuni"] == 10_000
    assert api.get("/api/me/wishlists").json()["listes"][1]["cagnotte"]["participations"][0]["mot"] == "Bon voyage"


def test_cagnotte_absente_ou_lien_inconnu_ferme(monde):
    from rest_framework.test import APIClient

    _, code = _liste_partagee(monde, monde["cafe"])
    corps = {"prenom": "Carine", "montant": 5_000, "moyen": "677112241", "mot": "", "discret": False}
    for c in (code, "INCONNU"):
        assert APIClient().post(f"/api/wishlists/{c}/fund", corps, format="json", **_cle()).json() == {"ok": False, "raison": "ferme"}
