# backend/apps/extras/tests/test_modules.py
# Modules CL-15 (DP-54) : cotisations, mises de côté, ventes flash, rentrée, panier famille, reprise, WhatsApp.
import uuid
from datetime import timedelta

import pytest
from django.utils import timezone

from apps.client_core.models import Interrupteur
from apps.client_core.tests.outils import client_connecte, creer_boutique, creer_client, creer_produit, creer_relais
from apps.extras import services
from apps.extras.models import (
    ArticleFamille,
    ArticleRentree,
    Cotisation,
    Ecole,
    ListeRentree,
    MiseDeCote,
    ModeleReprise,
    OffreFlash,
    Participation,
    SaisonRentree,
    Troc,
    Versement,
)
from apps.wishlists.models import ColisEchange

pytestmark = pytest.mark.django_db


@pytest.fixture(autouse=True)
def _classe(settings):
    settings.BELIVAY_CLASSE_PAR_DEFAUT = "S"


@pytest.fixture
def monde():
    from apps.client_accounts.services import profil

    relais = creer_relais()
    carine = creer_client("Carine")
    carine.last_name = "Ngo"
    carine.save()
    p = profil(carine)
    p.relais_habituel_id = relais.pk
    p.save()
    b = creer_boutique()
    return {
        "relais": relais,
        "carine": carine,
        "api": client_connecte(carine),
        "b": b,
        "cafe": creer_produit(b, titre="Café arabica", prix=5500),
        "robe": creer_produit(b, titre="Robe", prix=25000),
    }


def _cle():
    return {"HTTP_IDEMPOTENCY_KEY": str(uuid.uuid4())}


def _jusqua(jours=10):
    return int((timezone.now() + timedelta(days=jours)).timestamp() * 1000)


# ── Cotisations ────────────────────────────────────────────────────────────────────────────────────────


def _cotisation(m, qui="destinataire", produit=None):
    corps = {
        "nom": "Anniversaire de Nadège",
        "occasion": "Anniversaire",
        "p": str((produit or m["cafe"]).pk),
        "beneficiaire": "Nadège",
        "relais": "Relais Mvog-Ada",
        "jusqua": _jusqua(),
        "qui": qui,
    }
    r = m["api"].post("/api/me/pools", corps, format="json")
    assert r.status_code == 201, r.content
    return r.json()


def test_creer_cotisation_objectif(monde):
    # site/tests/echanges.spec.ts : 6 528 F (participants) ; 5 610 F (Nadège paie la livraison).
    assert _cotisation(monde, qui="payeur")["objectif"] == 6528
    c = _cotisation(monde)
    assert (c["objectif"], c["prixLivre"], c["frais"], c["qui"], c["organisateur"], c["etat"]) == (
        5610,
        6400,
        900,
        "destinataire",
        "Carine N.",
        "ouverte",
    )
    assert monde["api"].get("/api/me/pools").json()["liste"][0]["code"] == c["code"]


def test_participer_jusqu_a_l_objectif(monde, api_client):
    c = _cotisation(monde)
    url = f"/api/pools/{c['code']}/contributions"
    r = api_client.post(
        url, {"prenom": "Paul", "montant": 6000, "moyen": "677112241", "discret": False, "mot": ""}, format="json", **_cle()
    )
    assert r.json() == {"ok": False, "raison": "montant"}
    r = api_client.post(
        url, {"prenom": "Paul", "montant": 3000, "moyen": "677112241", "discret": True, "mot": "Bises"}, format="json", **_cle()
    )
    assert r.json()["ok"] is True
    pa = Participation.objects.get()
    assert pa.etat_paiement == "attente"
    assert services.confirmer_paiement(pa.reference)
    publique = api_client.get(f"/api/pools/{c['code']}").json()
    assert publique["participations"][0]["prenom"] == "" and publique["participations"][0]["mot"] == ""
    assert monde["api"].get("/api/me/pools").json()["liste"][0]["participations"][0]["prenom"] == "Paul"
    r = api_client.post(url, {"prenom": "Joël", "montant": 500, "moyen": "678904455", "discret": False, "mot": ""}, format="json", **_cle())
    assert r.json()["raison"] == "montant"  # 1 000 F au moins (il manque 2 610 F)
    api_client.post(url, {"prenom": "Joël", "montant": 2610, "moyen": "678904455", "discret": False, "mot": ""}, format="json", **_cle())
    services.confirmer_paiement(Participation.objects.get(prenom="Joël").reference)
    c2 = Cotisation.objects.get()
    assert c2.etat == "atteinte" and c2.order_id
    colis = ColisEchange.objects.get()
    assert (colis.origine, colis.articles, colis.qui) == ("cotisation", 5500, "destinataire")
    assert api_client.post(url, {"prenom": "X", "montant": 1000, "moyen": "678904455"}, format="json", **_cle()).json() == {
        "ok": False,
        "raison": "fermee",
    }


def test_cotisation_echue_remboursee(monde, api_client):
    c = _cotisation(monde)
    api_client.post(
        f"/api/pools/{c['code']}/contributions", {"prenom": "Paul", "montant": 2000, "moyen": "677112241"}, format="json", **_cle()
    )
    services.confirmer_paiement(Participation.objects.get().reference)
    Cotisation.objects.update(jusqua=timezone.now() - timedelta(minutes=1))
    assert api_client.get(f"/api/pools/{c['code']}").json()["etat"] == "echue"
    assert Participation.objects.get().etat_paiement == "rembourse"


def test_hausse_de_prix(monde, api_client):
    c = _cotisation(monde, qui="payeur")
    monde["cafe"].price_xaf = 7000
    monde["cafe"].save()
    api_client.post(
        f"/api/pools/{c['code']}/contributions", {"prenom": "Paul", "montant": 6528, "moyen": "677112241"}, format="json", **_cle()
    )
    services.confirmer_paiement(Participation.objects.get().reference)
    d = monde["api"].get("/api/me/pools").json()["liste"][0]
    assert d["etat"] == "hausse" and d["hausse"] == {"prix": 7900, "ecart": 1500}
    r = monde["api"].post(f"/api/me/pools/{c['id']}/price-rise", {"choix": "rembourser"}, format="json").json()
    assert r["etat"] == "remboursee"
    assert (
        monde["api"].post(f"/api/me/pools/{c['id']}/price-rise", {"choix": "completer", "moyen": "677112241"}, format="json").status_code
        == 409
    )


def test_cotiser_un_article_de_liste(monde, api_client):
    api = monde["api"]
    id_ = api.post(
        "/api/me/wishlists", {"nom": "Mon anniversaire", "mode": "fil", "remiseLe": None, "surprise": False}, format="json"
    ).json()["id"]
    api.post(f"/api/me/wishlists/{id_}/items", {"produit": str(monde["robe"].pk)}, format="json")
    code = api.post(f"/api/me/wishlists/{id_}/share").json()["partage"]["code"]
    r = api_client.post(f"/api/wishlists/{code}/items/{monde['robe'].pk}/pool").json()
    assert r["ok"] is True
    assert api_client.post(f"/api/wishlists/{code}/items/{monde['robe'].pk}/pool").json() == r
    article = api_client.get(f"/api/wishlists/{code}").json()["articles"][0]
    assert article["cotisation"]["code"] == r["code"] and article["cotisation"]["objectif"] == 26418
    # En cotisation ouverte, l'article ne s'offre plus seul.
    corps = {"produit": str(monde["robe"].pk), "prenom": "X", "email": "x@exemple.cm", "moyen": "677112241", "prix_vu": 25000}
    assert api_client.post(f"/api/wishlists/{code}/gifts", corps, format="json", **_cle()).json() == {"ok": False, "raison": "offert"}


# ── Mises de côté ──────────────────────────────────────────────────────────────────────────────────────


def test_mise_de_cote_de_bout_en_bout(monde):
    api = monde["api"]
    r = api.post("/api/me/layaways", {"produit": str(monde["robe"].pk), "rythme": "mois", "moyen": "677112241"}, format="json", **_cle())
    assert r.status_code == 201, r.content
    m = r.json()
    assert (m["prixLivre"], [v["du"] for v in m["versements"]], m["etat"]) == (25900, [5180, 10360, 10360], "en_cours")
    services.confirmer_paiement(Versement.objects.get(n=1).reference)
    for n in (2, 3):
        api.post(f"/api/me/layaways/{m['id']}/installments", {"moyen": "677112241"}, format="json", **_cle())
        services.confirmer_paiement(Versement.objects.get(n=n).reference)
    d = api.get("/api/me/layaways").json()["liste"][0]
    assert d["etat"] == "payee" and d["ref"].startswith("BLV-")
    assert api.post(f"/api/me/layaways/{m['id']}/installments", {"moyen": "677112241"}, format="json", **_cle()).status_code == 409


def test_mise_de_cote_annulee_et_grace(monde):
    api = monde["api"]
    m = api.post(
        "/api/me/layaways", {"produit": str(monde["robe"].pk), "rythme": "mois", "moyen": "677112241"}, format="json", **_cle()
    ).json()
    services.confirmer_paiement(Versement.objects.get(n=1).reference)
    a = api.post(f"/api/me/layaways/{m['id']}/cancel").json()
    assert a["etat"] == "annulee" and a["annulee"]["rembourse"] == 5180 - 1295 and a["annulee"]["forfait"] == 1295
    m2 = api.post(
        "/api/me/layaways", {"produit": str(monde["robe"].pk), "rythme": "mois", "moyen": "677112241"}, format="json", **_cle()
    ).json()
    Versement.objects.filter(mise_id=m2["id"], n=2).update(le=timezone.now() - timedelta(days=8))
    assert next(x for x in api.get("/api/me/layaways").json()["liste"] if x["id"] == m2["id"])["etat"] == "annulee"


def test_mise_de_cote_trop_petite(monde):
    r = monde["api"].post(
        "/api/me/layaways", {"produit": str(monde["cafe"].pk), "rythme": "mois", "moyen": "677112241"}, format="json", **_cle()
    )
    assert r.status_code == 422 and r.json()["error"]["code"] == "prix_min"


# ── Ventes flash ───────────────────────────────────────────────────────────────────────────────────────


def test_ventes_flash(monde, api_client):
    maintenant = timezone.now()
    OffreFlash.objects.create(
        product_id=monde["robe"].pk,
        prix=20000,
        avant=25000,
        debut=maintenant - timedelta(hours=1),
        fin=maintenant + timedelta(hours=20),
        stock=3,
    )
    OffreFlash.objects.create(
        product_id=monde["cafe"].pk,
        prix=5400,
        avant=5500,
        debut=maintenant - timedelta(hours=1),
        fin=maintenant + timedelta(hours=2),
        stock=3,
    )  # 2 % : pas une vente flash
    d = api_client.get("/api/flash-deals").json()
    assert [o["p"] for o in d["offres"]] == [str(monde["robe"].pk)]
    assert (d["offres"][0]["stock"], d["offres"][0]["livraison"], d["alerte"], d["relais"]) == (3, 900, False, None)
    assert services.offre_flash_active(monde["robe"].pk) and not services.offre_flash_active(monde["cafe"].pk)
    assert services.vendre_flash(monde["robe"].pk, 3) and not services.vendre_flash(monde["robe"].pk, 1)
    assert not services.offre_flash_active(monde["robe"].pk)
    assert monde["api"].get("/api/flash-deals").json()["relais"] == "Relais Mvog-Ada"


# ── Rentrée ────────────────────────────────────────────────────────────────────────────────────────────


@pytest.fixture
def rentree(monde):
    saison = SaisonRentree.objects.create(saison="2026-2027", rentree_le=timezone.now() + timedelta(days=70))
    ecole = Ecole.objects.create(nom="Collège Vogt", quartier="Mvolyé", verifiee=True)
    ecole.gestionnaires.add(monde["carine"])
    lr = ListeRentree.objects.create(ecole=ecole, saison=saison, classe="6e")
    cahier = creer_produit(monde["b"], titre="Cahier 100 pages", prix=5000)
    autre = creer_produit(monde["b"], titre="Cahier équivalent", prix=4000)
    a1 = ArticleRentree.objects.create(liste=lr, titre="Cahiers", qte=4, product_id=cahier.pk, equivalent_product_id=autre.pk)
    ArticleRentree.objects.create(liste=lr, titre="Robe d'uniforme", qte=1, product_id=monde["robe"].pk, exigee=True)
    return {"liste": lr, "a1": a1}


def test_rentree_publier_et_commander(monde, rentree, api_client):
    assert api_client.get("/api/school-lists").json()["listes"] == []
    autre = client_connecte(creer_client())
    lid = rentree["liste"].pk
    assert autre.post(f"/api/school-lists/{lid}/publish").status_code == 403
    assert monde["api"].post(f"/api/school-lists/{lid}/publish").status_code == 204
    d = api_client.get("/api/school-lists").json()
    assert (
        d["saison"] == "2026-2027"
        and d["listes"][0]["statut"] == "publiee"
        and d["listes"][0]["articles"][0]["equivalent"]["prixUnitaire"] == 4000
    )
    r = monde["api"].post(
        f"/api/school-lists/{lid}/order",
        {"exclus": [], "equivalents": [str(rentree["a1"].pk)], "moyen": "677112241"},
        format="json",
        **_cle(),
    )
    assert r.status_code == 200 and r.json().startswith("BLV-")


def test_rentree_mise_de_cote_de_la_liste(monde, rentree):
    rentree["liste"].statut = "publiee"
    rentree["liste"].save()
    r = monde["api"].post(
        "/api/me/layaways",
        {"liste": str(rentree["liste"].pk), "exclus": [], "equivalents": [], "rythme": "mois", "moyen": "677112241"},
        format="json",
        **_cle(),
    )
    assert r.status_code == 201, r.content
    m = r.json()
    assert (
        m["liste"]["classe"] == "6e" and m["prixLivre"] == 45000 and m["versements"][-1]["le"] <= m["liste"]["rentreeLe"] - 7 * 86_400_000
    )


# ── Panier famille ─────────────────────────────────────────────────────────────────────────────────────


def test_panier_famille(monde):
    api = monde["api"]
    riz = creer_produit(monde["b"], titre="Riz 5 kg", prix=4200)
    huile = creer_produit(monde["b"], titre="Huile 5 L", prix=9800)
    ArticleFamille.objects.create(product_id=riz.pk, poids_g=5000)
    ArticleFamille.objects.create(product_id=huile.pk, poids_g=4600)
    assert (
        api.post(
            "/api/me/family-baskets/recipient", {"prenom": "Maman", "numero": "699112233", "relais": "Relais Mvog-Ada"}, format="json"
        ).status_code
        == 204
    )
    d = api.get("/api/me/family-baskets").json()
    assert d["destinataires"][0]["numero"] == "6 99 ·· ·· 33" and len(d["articles"]) == 2
    p = api.post(
        "/api/me/family-baskets",
        {
            "nom": "Essentiels",
            "destinataire": {"prenom": "Maman", "relais": "Relais Mvog-Ada"},
            "articles": [{"id": str(riz.pk), "qte": 2}, {"id": str(huile.pk), "qte": 1}],
        },
        format="json",
    ).json()
    r = api.post(
        f"/api/me/family-baskets/{p['id']}/pay",
        {"carte": "tok_ok", "email": "carine@exemple.cm", "mensuel": True, "jour": 21},
        format="json",
        **_cle(),
    )
    assert r.status_code == 200, r.content
    h = r.json()["historique"][0]
    # 18 200 F d’articles, colis M (14,6 kg) : 500 + 400 F de livraison ; 2 % de frais sur 19 100 F : 19 482 F.
    assert h["montant"] == 19482 and r.json()["mensuel"] is True
    assert api.patch(f"/api/me/family-baskets/{p['id']}", {"suspendu": True}, format="json").status_code == 204
    api.put(f"/api/me/family-baskets/{p['id']}", {"articles": [{"id": str(riz.pk), "qte": 7}]}, format="json")
    r = api.post(
        f"/api/me/family-baskets/{p['id']}/pay",
        {"carte": "tok_ok", "email": "c@exemple.cm", "mensuel": False, "jour": 21},
        format="json",
        **_cle(),
    )
    assert r.status_code == 422 and r.json()["error"]["code"] == "trop_lourd"
    r = api.post("/api/me/family-baskets", {"articles": [{"id": "999999", "qte": 1}]}, format="json")
    assert r.status_code == 422


# ── Reprise ────────────────────────────────────────────────────────────────────────────────────────────

DECLARE = {"allume": True, "ecran": "intact", "batterie": True, "coque": "bon", "compteRetire": True, "codeRetire": True}


def test_reprise(monde):
    api = monde["api"]
    ModeleReprise.objects.create(code="camon20", nom="Tecno Camon 20 · 128 Go", cote=41000)
    neuf = creer_produit(monde["b"], titre="Téléphone neuf", prix=90000)
    t = api.post("/api/me/trades", {"produit": str(neuf.pk), "modele": "camon20", "declare": DECLARE}, format="json").json()
    assert (t["estimation"], t["etat"], t["relais"], len(t["codeDepot"])) == ({"min": 32000, "max": 41000}, "depot", "Relais Mvog-Ada", 6)
    assert (
        api.post(
            "/api/me/trades", {"produit": str(neuf.pk), "modele": "camon20", "declare": {**DECLARE, "codeRetire": False}}, format="json"
        ).status_code
        == 422
    )
    Troc.objects.filter(pk=t["id"]).update(
        etat="contre", contre_offre={"valeur": 30000, "ecarts": [{"titre": "Écran rayé", "sous": "−4 000 F"}]}
    )
    assert (
        api.post(f"/api/me/trades/{t['id']}/contest", {"texte": "Il était intact"}, format="json").json()["contestation"]["texte"]
        == "Il était intact"
    )
    t2 = api.post(f"/api/me/trades/{t['id']}/answer", {"accepte": True}, format="json").json()
    assert (t2["etat"], t2["valeur"], t2["contestation"]) == ("confirme", 30000, None)
    t3 = api.post(f"/api/me/trades/{t['id']}/pay", {"moyen": "677112241"}, format="json", **_cle()).json()
    assert t3["etat"] == "paye" and t3["ref"].startswith("BLV-")
    assert api.delete(f"/api/me/trades/{t['id']}").status_code == 409
    t4 = api.post("/api/me/trades", {"produit": str(neuf.pk), "modele": "camon20", "declare": DECLARE}, format="json").json()
    assert api.delete(f"/api/me/trades/{t4['id']}").status_code == 204


# ── WhatsApp, interrupteurs ────────────────────────────────────────────────────────────────────────────


def test_whatsapp_a_finir(monde):
    r = monde["api"].get("/api/whatsapp/conversation")
    assert r.status_code == 501 and r.json()["error"]["code"] == "a_finir"


def test_module_ferme(monde):
    Interrupteur.objects.create(code="FF-EX03", ouvert=False)
    assert monde["api"].get("/api/me/layaways").status_code == 404
    assert monde["api"].get("/api/me/pools").status_code == 200


def test_mise_de_cote_d_un_autre(monde):
    m = MiseDeCote.objects.create(client=creer_client(), titre="x", prix=1, livraison=0, prix_livre=1, rythme="mois", moyen="x")
    assert monde["api"].post(f"/api/me/layaways/{m.pk}/cancel").status_code == 404
