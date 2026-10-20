# backend/apps/recus/tests/test_recus.py
# Boîte « Reçus » (DP-54 ; site/tests/recus.spec.ts) : envoyer par numéro ou e-mail, lire des deux côtés, payer,
# offrir, refuser, remercier ; refus typés (409 traite, 410 expire, 422 …).
import uuid

import pytest

from apps.client_core.tests.outils import client_connecte, creer_boutique, creer_client, creer_produit, creer_relais

pytestmark = pytest.mark.django_db


@pytest.fixture(autouse=True)
def _classe(settings):
    settings.BELIVAY_CLASSE_PAR_DEFAUT = "S"


@pytest.fixture
def monde():
    from apps.client_accounts.services import enregistrer_numero, profil

    relais = creer_relais()
    carine = creer_client("Carine")
    odile = creer_client("Odile", email="odile@exemple.cm")
    enregistrer_numero(odile, "699112233")
    for u in (carine, odile):
        p = profil(u)
        p.relais_habituel_id = relais.pk
        p.save()
    b = creer_boutique()
    return {
        "carine": carine,
        "odile": odile,
        "api_c": client_connecte(carine),
        "api_o": client_connecte(odile),
        "riz": creer_produit(b, titre="Riz 25 kg", prix=17_500),
        "huile": creer_produit(b, titre="Huile 5 L", prix=6_000),
    }


def _cle():
    return {"HTTP_IDEMPOTENCY_KEY": str(uuid.uuid4())}


def _envoyer(m, **extra):
    corps = {"type": "panier", "a": "+237 6 99 11 22 33", "prenom": "Odile", "titre": "Mon panier", **extra}
    return m["api_c"].post("/api/me/outbox", corps, format="json")


def test_envoi_par_numero_dans_la_boite_du_proche(monde):
    lignes = [{"p": str(monde["riz"].pk), "titre": "x", "dessin": "riz", "qte": 1, "prix": 1, "livraison": 0, "offertPar": None}]
    r = _envoyer(monde, lignes=lignes, frais=900, mot="Merci maman")
    assert r.status_code == 200, r.content
    envoi = r.json()["envoi"]
    assert envoi["dansLApplication"] is True and envoi["pour"] == "Odile" and envoi["etat"] == "a_traiter"
    assert envoi["lignes"][0]["prix"] == 17_500 and envoi["lignes"][0]["titre"] == "Riz 25 kg"  # prix du catalogue
    assert envoi["jusqua"] is not None and "699112233" not in str(envoi)
    b = monde["api_o"].get("/api/me/inbox").json()
    assert b["aTraiter"] == 1 and b["recus"][0]["id"] == envoi["id"] and b["envoyes"] == []
    assert monde["api_c"].get("/api/me/inbox").json()["envoyes"][0]["id"] == envoi["id"]
    d = monde["api_o"].get(f"/api/me/inbox/{envoi['id']}").json()
    assert d["sens"] == "recu" and d["moyens"]["diaspora"] is False and d["moyens"]["relais"] == "Relais Mvog-Ada"
    assert creer_client_api().get(f"/api/me/inbox/{envoi['id']}").status_code == 404


def creer_client_api():
    return client_connecte(creer_client("Autre"))


def test_refus_a_l_envoi(monde):
    for extra, raison in (({"a": "12"}, "numero"), ({"a": "pas@mail"}, "numero"), ({}, "vide")):
        r = _envoyer(monde, **extra)
        assert r.status_code == 422 and r.json()["error"]["code"] == raison
    monde["carine"].email = "carine@exemple.cm"
    monde["carine"].save()
    r = _envoyer(monde, type="partage", a="carine@exemple.cm")
    assert r.status_code == 422 and r.json()["error"]["code"] == "moi"
    # Sans compte : seul le lien public.
    r = _envoyer(monde, type="partage", a="inconnu@exemple.cm")
    assert r.json()["envoi"]["dansLApplication"] is False and r.json()["envoi"]["lien"].startswith("/recus/")


def test_payer_un_panier_recu_puis_deja_traite(monde):
    lignes = [
        {"p": str(monde["huile"].pk), "titre": "Huile", "dessin": "huile", "qte": 2, "prix": 6_000, "livraison": 0, "offertPar": None}
    ]
    id_ = _envoyer(monde, lignes=lignes, frais=900).json()["envoi"]["id"]
    api = monde["api_o"]
    r = api.post(f"/api/me/inbox/{id_}/actions", {"action": "payer", "moyen": "momo:+237677112241"}, format="json", **_cle())
    assert r.status_code == 200, r.content
    d = r.json()
    assert d["ok"] is True and d["paye"] == 12_900 and d["envoi"]["etat"] == "fait" and d["envoi"]["actions"][0]["quoi"] == "paye"
    r = api.post(f"/api/me/inbox/{id_}/actions", {"action": "payer", "moyen": "momo:+237677112241"}, format="json", **_cle())
    assert r.status_code == 409 and r.json()["error"]["code"] == "traite"
    # Le portefeuille vide : refus « solde » ; moyen inconnu : « moyen ».
    id2 = _envoyer(monde, lignes=lignes, frais=900).json()["envoi"]["id"]
    for moyen, raison in (("wallet", "solde"), ("carte:c999", "moyen"), ("cheque", "moyen")):
        r = api.post(f"/api/me/inbox/{id2}/actions", {"action": "payer", "moyen": moyen}, format="json", **_cle())
        assert r.status_code == 422 and r.json()["error"]["code"] == raison
    # Merci de qui a envoyé, après le paiement.
    assert monde["api_c"].post(f"/api/me/inbox/{id_}/thanks", {"texte": "Merci !"}, format="json").json() == {"ok": True}
    assert monde["api_c"].post(f"/api/me/inbox/{id2}/thanks", {"texte": "Merci !"}, format="json").json() == {"ok": False}


def test_offrir_un_article_d_une_liste_recue(monde):
    lignes = [{"p": str(monde["riz"].pk), "titre": "Riz", "dessin": "riz", "qte": 1, "prix": 17_500, "livraison": 900, "offertPar": None}]
    id_ = _envoyer(monde, type="liste", titre="Mon anniversaire", lignes=lignes, code="ABC123").json()["envoi"]["id"]
    api = monde["api_o"]
    corps = {"action": "offrir", "p": str(monde["riz"].pk), "moyen": "momo:+237677112241", "qui": "payeur", "mot": "Joyeux anniversaire"}
    r = api.post(f"/api/me/inbox/{id_}/actions", corps, format="json", **_cle())
    assert r.status_code == 200, r.content
    assert r.json()["envoi"]["lignes"][0]["offertPar"] == "Odile" and r.json()["paye"] == 18_400


def test_refuser_un_colis_et_expire(monde):
    from django.utils import timezone

    from apps.recus.models import EnvoiRecu

    lignes = [{"p": None, "titre": "Colis", "dessin": "colis", "qte": 1, "prix": 10_000, "livraison": 0, "offertPar": None}]
    id_ = _envoyer(monde, type="colis", lignes=lignes, frais=900, qui="payeur").json()["envoi"]["id"]
    r = monde["api_o"].post(f"/api/me/inbox/{id_}/actions", {"action": "refuser", "mot": "Non merci"}, format="json", **_cle())
    assert r.json()["envoi"]["etat"] == "refuse" and r.json()["envoi"]["actions"][0]["montant"] == 10_900
    id2 = _envoyer(monde, lignes=lignes, frais=900).json()["envoi"]["id"]
    EnvoiRecu.objects.filter(pk=id2).update(jusqua=timezone.now() - timezone.timedelta(days=1))
    r = monde["api_o"].post(f"/api/me/inbox/{id2}/actions", {"action": "payer", "moyen": "wallet"}, format="json", **_cle())
    assert r.status_code == 410 and r.json()["error"]["code"] == "expire"
    assert monde["api_o"].get("/api/me/inbox").json()["aTraiter"] == 0
