# Publicité (DP-59) : solde prépayé, campagnes au clic (enchère, budget, anti-fraude), emplacements de la semaine
# (tarif fixe au prorata, enchère attribuée au second prix), Boost et heures rendues, sélection flash et commission
# majorée figée à l'entrée de la commande, statistiques, facture ; routes client (annonces, accueil, clic).
from datetime import timedelta
from decimal import Decimal

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from apps.client_core.tests.outils import creer_client
from apps.publicite import services
from apps.publicite.models import Campagne, Clic, Mouvement
from apps.vendeur_core import horloge
from apps.vendeur_core.models import CommandeVendeur
from apps.vendeur_core.tests.outils import commande_client, creer_boutique_vendeur, creer_fiche, creer_offre, preparation, proprietaire

pytestmark = pytest.mark.django_db
_k = iter(range(100_000))


def post(api, route, corps=None):
    return api.post(f"/api/vendors/ads{route}", corps or {}, format="json", HTTP_IDEMPOTENCY_KEY=f"cle-publicite-{next(_k)}")


def remplir(b, montant=50_000):
    mv = services.recharger(b, montant)
    services.confirmer_recharge(int(mv["id"]), True)


@pytest.fixture
def boutique():
    b = creer_boutique_vendeur(trust="72.0")
    return b, creer_offre(b, prix=20_000, stock=5), proprietaire(b)


@pytest.fixture
def temps(monkeypatch):
    """Horloge réglable : temps.t = …"""

    class H:
        t = timezone.now()

    monkeypatch.setattr(horloge, "maintenant", lambda: H.t)
    return H


def test_preparation_refusee_et_apercu(boutique):
    b, o, api = boutique
    p = preparation(b)
    for route in ("", "/slots", "/campaigns/1", "/invoices/2026-10"):
        r = p.get(f"/api/vendors/ads{route}")
        assert r.status_code == 403 and r.json()["error"]["code"] == "owner_only", route
    assert post(p, "/top-up", {"montant": 5_000}).status_code == 403
    a = api.get("/api/vendors/ads").json()
    assert a["solde"] == 0 and a["tarifs"]["clicPlancher"] == 25 and a["tarifs"]["flashDureeMaxH"] == 48
    assert a["offres"] == [{"id": str(o.pk), "titre": "ITEL AC52", "prix": 20_000, "stock": 5, "motifs": []}]


def test_recharge_confirmee_par_le_webhook(boutique):
    b, _, api = boutique
    r = post(api, "/top-up", {"montant": 999})
    assert r.status_code == 422 and r.json()["error"]["code"] == "annonce_refusee"
    mv = post(api, "/top-up", {"montant": 10_000}).json()
    assert mv["statut"] == "en_attente" and api.get("/api/vendors/ads").json()["rechargesEnAttente"][0]["id"] == mv["id"]
    services.confirmer_recharge(int(mv["id"]), True)
    services.confirmer_recharge(int(mv["id"]), True)  # rejouée : rien ne change
    assert services.compte(b).solde == 10_000
    refusee = post(api, "/top-up", {"montant": 5_000}).json()
    assert services.confirmer_recharge(int(refusee["id"]), False)["statut"] == "refuse"
    assert services.compte(b).solde == 10_000


def test_eligibilite(boutique):
    b, o, api = boutique
    for champs, motif in (({"stock": 0}, "stock épuisé"), ({"etat": "en_pause", "stock": 5}, "offre hors ligne")):
        type(o).objects.filter(pk=o.pk).update(**champs)
        r = post(api, "/campaigns", {"offre": o.pk, "enchere": 30, "budgetQuotidien": 500})
        assert r.status_code == 422 and motif in r.json()["error"]["data"]["motifs"]
    type(o).objects.filter(pk=o.pk).update(etat="en_vente", stock=5)
    b.trust_score = Decimal("59.9")
    b.save()
    assert (
        "Trust Score sous 60"
        in post(api, "/campaigns", {"offre": o.pk, "enchere": 30, "budgetQuotidien": 500}).json()["error"]["data"]["motifs"]
    )
    assert post(api, "/campaigns", {"offre": "x", "enchere": 30, "budgetQuotidien": 500}).status_code == 404
    assert services.litiges_en_cours(b) == 0


def _campagne(api, o, enchere, budget=500):
    r = post(api, "/campaigns", {"offre": o.pk, "enchere": enchere, "budgetQuotidien": budget})
    assert r.status_code == 200, r.json()
    return r.json()


def test_enchere_au_clic_annonce_et_clic_facture_une_fois(boutique):
    b, o, api = boutique
    remplir(b)
    assert post(api, "/campaigns", {"offre": o.pk, "enchere": 24, "budgetQuotidien": 500}).status_code == 422
    c1 = _campagne(api, o, 60)
    b2 = creer_boutique_vendeur(nom="Concurrent", trust="80.0")
    o2 = creer_offre(b2, fiche=creer_fiche(titre="ITEL A70"), prix=21_000)
    remplir(b2)
    _campagne(proprietaire(b2), o2, 40)
    client = APIClient()
    pl = client.get("/api/sponsored/placements?ou=recherche&q=itel").json()
    assert [a["campagne"] for a in pl["annonces"]] == [c1["id"], str(Campagne.objects.get(offre=o2).pk)]
    assert pl["regles"] == {"partMaxPourCent": 20.0, "maxParFenetre": 2, "fenetre": 10, "boostMultiplicateur": 1.5}
    assert pl["annonces"][0]["p"] == str(o.product_id)
    assert client.get("/api/sponsored/placements?ou=categorie&q=samsung").json()["annonces"] == []
    assert client.get("/api/sponsored/placements?ou=autre").status_code == 400
    # Impression : comptée quand le site montre l'annonce, une fois par client, emplacement et visite.
    jeton = pl["annonces"][0]["id"]
    vu = {"annonce": jeton, "emplacement": "recherche", "visite": "v1"}
    for _ in range(2):
        assert client.post("/api/sponsored/impressions", vu, format="json").status_code == 204
    assert Campagne.objects.get(pk=c1["id"]).impressions == 1
    client.post("/api/sponsored/impressions", {**vu, "emplacement": "categorie"}, format="json")
    client.post("/api/sponsored/impressions", {**vu, "visite": "v2"}, format="json")
    assert Campagne.objects.get(pk=c1["id"]).impressions == 3
    assert client.post("/api/sponsored/impressions", {**vu, "emplacement": "ailleurs"}, format="json").status_code == 400
    Campagne.objects.filter(pk=c1["id"]).update(impressions=1)
    # Signaler : un signalement par client et par campagne.
    for _ in range(2):
        assert client.post("/api/sponsored/reports", {"annonce": jeton, "motif": "trompeuse"}, format="json").status_code == 204
    assert Campagne.objects.get(pk=c1["id"]).signalements.count() == 1
    assert client.post("/api/sponsored/reports", {"annonce": jeton, "motif": "x"}, format="json").status_code == 400
    # Clic : coût = 40 + 1 = 41 F, une fois par client et par jour.
    for _ in range(3):
        assert client.post("/api/sponsored/clicks", {"annonce": jeton}, format="json").status_code == 204
    assert services.compte(b).solde == 50_000 - 41
    clic = Clic.objects.get(campagne_id=c1["id"])
    assert (clic.cout, clic.repetitions) == (41, 2)
    connecte = APIClient()
    connecte.force_authenticate(creer_client("Bertrand"))
    connecte.post("/api/sponsored/clicks", {"annonce": jeton}, format="json")
    st = api.get(f"/api/vendors/ads/campaigns/{c1['id']}").json()["stats"]
    assert st == {"impressions": 1, "clics": 2, "clicsFactures": 2, "ventes": 0, "depense": 82, "tauxClicPourCent": 200.0}
    assert client.post("/api/sponsored/clicks", {"annonce": "faux"}, format="json").status_code == 422
    from django.core import signing

    disparue = signing.dumps({"c": 999_999, "k": 41}, salt=services.SEL, compress=True)
    assert client.post("/api/sponsored/clicks", {"annonce": disparue}, format="json").status_code == 404


def test_budget_du_jour_et_pause(boutique):
    b, o, api = boutique
    remplir(b, 1_000)
    c = _campagne(api, o, 500, 500)  # seule : paie le plancher, 25 F
    clients = [APIClient() for _ in range(3)]
    for i, cl in enumerate(clients):
        cl.force_authenticate(creer_client(f"C{i}"))
    jeton = APIClient().get("/api/sponsored/placements?q=itel").json()["annonces"][0]["id"]
    for cl in clients:
        cl.post("/api/sponsored/clicks", {"annonce": jeton}, format="json")
    assert services.compte(b).solde == 1_000 - 75
    Campagne.objects.filter(pk=c["id"]).update(budget_quotidien=60)  # budget du jour atteint : plus montrée
    assert APIClient().get("/api/sponsored/placements?q=itel").json()["annonces"] == []
    assert post(api, f"/campaigns/{c['id']}/pause", {"pause": True}).json()["statut"] == "pause"
    assert post(api, f"/campaigns/{c['id']}/pause", {"pause": False}).json()["statut"] == "active"
    # Une annonce en pause n'est jamais facturée.
    post(api, f"/campaigns/{c['id']}/pause", {"pause": True})
    nouveau = APIClient()
    nouveau.force_authenticate(creer_client("D"))
    nouveau.post("/api/sponsored/clicks", {"annonce": jeton}, format="json")
    assert services.compte(b).solde == 925
    assert post(api, f"/campaigns/{c['id']}/stop").json()["statut"] == "terminee"
    assert post(api, f"/campaigns/{c['id']}/stop").status_code == 422
    assert post(api, f"/campaigns/{c['id']}/pause", {"pause": False}).status_code == 422
    assert api.get("/api/vendors/ads/campaigns/999").status_code == 404


def test_emplacement_fixe_au_prorata_et_complet(boutique, temps):
    b, o, api = boutique
    remplir(b, 150_000)
    lundi = timezone.localdate() - timedelta(days=timezone.localdate().weekday())
    debut = services._debut_semaine(lundi)
    temps.t = debut + timedelta(hours=24, minutes=10)  # 24 h écoulées : 144 h sur 168 à payer
    r = post(api, "/slots/book", {"emplacement": "a_la_une", "offre": o.pk, "mode": "fixe", "semaine": str(lundi)})
    assert r.status_code == 200 and r.json()["prix"] == 15_000 * 144 // 168
    assert api.get(f"/api/vendors/ads/slots?emplacement=a_la_une&semaine={lundi}").json()["restantes"] == 3
    assert api.get("/api/vendors/ads/slots?emplacement=autre").status_code == 400
    assert api.get("/api/vendors/ads/slots").json()["places"] == 4
    assert (
        post(api, "/slots/book", {"emplacement": "carrousel", "offre": o.pk, "mode": "fixe", "semaine": str(lundi)}).status_code == 422
    )  # sans titre
    caro = post(
        api, "/slots/book", {"emplacement": "carrousel", "offre": o.pk, "mode": "fixe", "semaine": str(lundi), "titre": "ITEL à prix doux"}
    )
    assert caro.status_code == 200
    for _ in range(2):
        post(api, "/slots/book", {"emplacement": "carrousel", "offre": o.pk, "mode": "fixe", "semaine": str(lundi), "titre": "x"})
    complet = post(api, "/slots/book", {"emplacement": "carrousel", "offre": o.pk, "mode": "fixe", "semaine": str(lundi), "titre": "x"})
    assert complet.json()["error"]["code"] == "complet"
    passee = post(api, "/slots/book", {"emplacement": "a_la_une", "offre": o.pk, "mode": "fixe", "semaine": str(lundi - timedelta(days=7))})
    assert passee.json()["error"]["code"] == "semaine_passee"
    # Accueil : emplacements de la semaine, étiquetés par le site.
    acc = APIClient().get("/api/sponsored/home").json()
    assert len(acc["aLaUne"]) == 1 and len(acc["carrousel"]) == 3 and acc["flash"] == []
    assert sorted(d["titre"] for d in acc["carrousel"]) == ["ITEL à prix doux", "x", "x"]  # rotation : toutes montrées
    # Clic sur un emplacement : compté, jamais facturé (forfait).
    solde = services.compte(b).solde
    APIClient().post("/api/sponsored/clicks", {"annonce": acc["aLaUne"][0]["id"]}, format="json")
    assert services.compte(b).solde == solde
    # Arrêt à 48 h 30 : 25 heures commencées dues sur les 144 payées, 119 rendues ; la place se revend.
    temps.t = debut + timedelta(hours=48, minutes=30)
    une = Campagne.objects.get(type="a_la_une")
    arret = post(api, f"/campaigns/{une.pk}/stop").json()
    assert (
        arret["rembourse"] == 12_857 * 119 // 144
    )  # payées : 144 h dès la 25e ; dues : 25 and services.compte(b).solde == solde + arret["rembourse"]
    assert Mouvement.objects.filter(type="remboursement").count() == 1
    assert api.get(f"/api/vendors/ads/slots?emplacement=a_la_une&semaine={lundi}").json()["restantes"] == 4


def test_emplacement_a_l_enchere(boutique):
    b, o, api = boutique
    remplir(b, 30_000)
    prochain = timezone.localdate() + timedelta(days=7 - timezone.localdate().weekday())
    corps = {"emplacement": "carrousel", "offre": o.pk, "mode": "enchere", "semaine": str(prochain), "titre": "Promo"}
    assert post(api, "/slots/book", {**corps, "enchere": 19_999}).status_code == 422
    assert post(api, "/slots/book", {**corps, "enchere": 40_000}).json()["error"]["code"] == "solde_insuffisant"
    assert post(api, "/slots/book", {**corps, "semaine": str(timezone.localdate()), "enchere": 25_000}).json()["error"]["code"] in (
        "semaine_commencee",
        "semaine_passee",
    )
    a = post(api, "/slots/book", {**corps, "enchere": 26_000}).json()
    autres = []
    for i, montant in enumerate((22_000, 21_000, 20_500, 25_000)):
        bx = creer_boutique_vendeur(nom=f"B{i}", trust="70.0")
        ox = creer_offre(bx, fiche=creer_fiche(titre=f"Produit {i}"))
        remplir(bx, 30_000 if montant != 25_000 else 30_000)
        autres.append((bx, post(proprietaire(bx), "/slots/book", {**corps, "offre": ox.pk, "enchere": montant}).json()))
    # La dernière (25 000 F) vide son solde avant l'attribution.
    services._debiter(autres[3][0], 29_000, Mouvement.Type.BOOST, "dépense")
    # Une offre devenue inéligible ne gagne pas.
    bx2 = autres[2][0]
    bx2.trust_score = Decimal(10)
    bx2.save()
    res = {c["id"]: c for c in services.attribuer_semaine("carrousel", prochain)}
    # 3 places : a (26 000), B3 (25 000, sans solde : refusée, l'enchère est rejouée), B0 (22 000), puis B1 (21 000).
    assert res[autres[3][1]["id"]]["statut"] == "refusee" and res[autres[3][1]["id"]]["motif"] == "solde insuffisant à l’attribution"
    assert res[autres[2][1]["id"]]["motif"] == "offre non éligible"
    assert [(res[x]["statut"], res[x]["prix"]) for x in (a["id"], autres[0][1]["id"], autres[1][1]["id"])] == [
        ("active", 22_001),
        ("active", 21_001),
        ("active", 20_000),
    ]
    assert services.compte(b).solde == 30_000 - 22_001


def test_enchere_perdante_et_retiree(boutique):
    b, o, api = boutique
    remplir(b, 50_000)
    prochain = timezone.localdate() + timedelta(days=7 - timezone.localdate().weekday())
    corps = {"emplacement": "a_la_une", "offre": o.pk, "mode": "enchere", "semaine": str(prochain)}
    ids = [post(api, "/slots/book", {**corps, "enchere": 10_000 + i}).json()["id"] for i in range(6)]
    assert post(api, f"/campaigns/{ids[0]}/stop").json()["statut"] == "terminee"  # retirée avant l'attribution
    res = {c["id"]: c for c in services.attribuer_semaine("a_la_une", prochain)}
    assert res[ids[1]]["motif"] == "enchère dépassée"
    assert services.compte(b).solde == 50_000 - (10_005 + 10_004 + 10_003 + 10_002)  # 4 places, second prix + 1 F


def test_boost_et_classement(boutique, temps):
    b, o, api = boutique
    assert post(api, "/boost", {"offre": o.pk, "duree": "7j"}).json()["error"]["code"] == "solde_insuffisant"
    remplir(b, 6_000)
    c = post(api, "/boost", {"offre": o.pk, "duree": "7j"}).json()
    assert c["prix"] == 5_000 and post(api, "/boost", {"offre": o.pk, "duree": "24h"}).json()["error"]["code"] == "deja"
    pl = APIClient().get("/api/sponsored/placements?ou=categorie&cat=Électronique").json()
    assert pl["boosts"] == [str(o.product_id)] and list(pl["jetonsBoost"]) == [str(o.product_id)]
    # Le produit en Boost montré puis touché : impression et clic comptés (jamais facturés), pour ses statistiques.
    jeton = pl["jetonsBoost"][str(o.product_id)]
    APIClient().post("/api/sponsored/impressions", {"annonce": jeton, "emplacement": "boost", "visite": "v"}, format="json")
    APIClient().post("/api/sponsored/clicks", {"annonce": jeton}, format="json")
    st = api.get(f"/api/vendors/ads/campaigns/{c['id']}").json()["stats"]
    assert (st["impressions"], st["clics"], st["clicsFactures"]) == (1, 1, 0)
    temps.t += timedelta(hours=100)
    assert post(api, f"/campaigns/{c['id']}/stop").json()["rembourse"] == 5_000 * 68 // 168
    with pytest.raises(Exception):  # noqa: B017 - durée inconnue (le sérialiseur la refuse avant)
        services.booster(b, o.pk, "3j")


def test_vente_flash_sur_selection_et_commission_majoree(boutique):
    b, o, api = boutique
    t = horloge.maintenant()
    ms = lambda d: int(d.timestamp() * 1000)  # noqa: E731
    corps = {"offre": o.pk, "prixFlash": 18_000, "debut": ms(t + timedelta(minutes=1)), "fin": ms(t + timedelta(hours=24)), "stock": 3}
    assert post(api, "/flash", {**corps, "prixFlash": 18_500}).json()["error"]["code"] == "annonce_refusee"  # remise 7,5 %
    assert post(api, "/flash", {**corps, "fin": ms(t + timedelta(hours=60))}).status_code == 422
    assert post(api, "/flash", {**corps, "stock": 9}).json()["error"]["data"] == {"max": 5}
    r = post(api, "/flash", corps)
    assert r.status_code == 201 and r.json()["remisePourCent"] == 10 and r.json()["statut"] == "en_attente"
    refusee = post(api, "/flash", corps).json()
    assert services.selectionner_flash(int(refusee["id"]), False)["statut"] == "refusee"
    c = services.selectionner_flash(int(r.json()["id"]), True)
    assert c["statut"] == "active" and services.selectionner_flash(int(c["id"]), True)["statut"] == "active"
    # La vente commence : sélection sur l'accueil, commande au prix flash, commission majorée de 3 points.
    Campagne.objects.filter(pk=c["id"]).update(debut=t - timedelta(minutes=5))
    from apps.extras.models import OffreFlash

    OffreFlash.objects.filter(product_id=o.product_id).update(debut=t - timedelta(minutes=5))
    acc = APIClient().get("/api/sponsored/home").json()
    assert acc["flash"][0]["p"] == str(o.product_id) and acc["flash"][0]["selection"] is True and acc["flash"][0]["prix"] == 18_000
    assert services._lire_jeton(acc["flash"][0]["annonce"])["c"] == int(c["id"])
    o.prix = 18_000  # le produit est vendu au prix flash (le panier applique l'offre)
    o.save()
    from apps.client_core.pont import modele

    modele("produit").objects.filter(pk=o.product_id).update(price_xaf=18_000)
    commande_client(o)
    cv = CommandeVendeur.objects.get(boutique=b)
    # Première commande : découverte (× 0,80) sur le barème, majoration de 3 points en plus : 1 944 + 540.
    assert (cv.commission, cv.garde) == (2_484, 18_000 - 2_484)
    assert post(api, f"/campaigns/{c['id']}/stop").json()["statut"] == "terminee"
    assert not OffreFlash.objects.filter(product_id=o.product_id, fin__gt=horloge.maintenant()).exists()


def test_vente_attribuee_au_clic_et_facture(boutique):
    b, o, api = boutique
    remplir(b)
    c = _campagne(api, o, 40)
    from apps.client_accounts.services import enregistrer_numero

    client = creer_client("Carine")
    enregistrer_numero(client, "690000017")
    cl = APIClient()
    cl.force_authenticate(client)
    jeton = cl.get("/api/sponsored/placements?q=itel").json()["annonces"][0]["id"]
    cl.post("/api/sponsored/clicks", {"annonce": jeton}, format="json")
    commande_client(o, client=client)
    assert Clic.objects.get(campagne_id=c["id"]).vente is True
    post(api, "/boost", {"offre": o.pk, "duree": "24h"})
    mois = horloge.maintenant().astimezone(services.YAOUNDE).strftime("%Y-%m")
    f = api.get(f"/api/vendors/ads/invoices/{mois}").json()
    assert f["lignes"] == [{"libelle": "Clics · ITEL AC52 (1)", "montant": 25}, {"libelle": "Boost 24h · ITEL AC52", "montant": 1_000}]
    assert (f["horsTaxe"], f["tva"], f["total"]) == (1_025, 0, 1_025) and f["reference"].startswith("BLV-PUB-")
    assert api.get("/api/vendors/ads/invoices/2026-13").status_code == 422
    assert api.get("/api/vendors/ads/invoices/2026-12").json()["total"] == 0


# ── Espace vendeur (AJ-P) : types de l'écran, refus en { ok: false, raison } ──────────────────────────


def test_espace_tableau_produits_et_sponsorise(boutique):
    b, o, api = boutique
    tb = api.get("/api/vendors/ads/dashboard").json()
    assert tb["solde"] == 0 and tb["regles"]["uneEnchereMin"] == 10_000 and tb["regles"]["carrouselEnchereMin"] == 20_000
    assert len(tb["selectionsFlash"]) == 2
    assert api.get("/api/vendors/ads/products").json()[0]["raisons"] == []
    d = {"emplacement": "categories", "offreId": str(o.pk), "enchere": 40, "budgetJour": 1_000}
    assert post(api, "/quote", {**d, "enchere": 10}).json()["refus"] == "sous_plancher"
    assert post(api, "/quote", d).json()["refus"] == "solde_insuffisant"
    remplir(b, 5_000)
    e = post(api, "/quote", d).json()
    assert e["refus"] is None and e["coutClic"] == 25 and e["clicsJourMax"] == 40  # seule : le prix plancher
    r = post(api, "/campaigns/new", d).json()
    c = r["campagne"]
    assert r["ok"] and c["emplacement"] == "categories" and c["etat"] == "en_cours" and c["coutClic"] == 25
    assert post(api, "/campaigns/new", d).json() == {"ok": False, "raison": "deja_active"}
    # La recherche ne la montre pas, les catégories oui.
    assert APIClient().get("/api/sponsored/placements?ou=recherche&q=itel").json()["annonces"] == []
    assert len(APIClient().get("/api/sponsored/placements?ou=categorie&cat=Électronique").json()["annonces"]) == 1
    assert post(api, f"/campaigns/{c['id']}/bid", {"enchere": 10, "budgetJour": 1_000}).json() == {"ok": False, "raison": "sous_plancher"}
    assert post(api, f"/campaigns/{c['id']}/bid", {"enchere": 50, "budgetJour": 2_000}).json() == {"ok": True}
    assert post(api, f"/campaigns/{c['id']}/resume").json() == {"ok": False, "raison": "etat"}
    post(api, f"/campaigns/{c['id']}/pause", {"pause": True})
    assert api.get("/api/vendors/ads/campaigns").json()[0]["etat"] == "en_pause"
    assert post(api, f"/campaigns/{c['id']}/resume").json() == {"ok": True}
    assert [m["type"] for m in api.get("/api/vendors/ads/ledger").json()] == ["recharge"]


def test_espace_enchere_hebdomadaire(boutique):
    b, o, api = boutique
    remplir(b, 15_000)
    d = {"emplacement": "une", "offreId": str(o.pk), "mode": "enchere", "enchere": 9_999}
    assert post(api, "/quote", d).json()["refus"] == "enchere_min"
    assert post(api, "/quote", {**d, "enchere": 16_000}).json()["refus"] == "solde_insuffisant"
    e = post(api, "/quote", {**d, "enchere": 12_000}).json()
    assert (e["refus"], e["aPayer"], e["enchereMax"], e["placesRestantes"]) == (None, 0, 12_000, 4)
    c = post(api, "/campaigns/new", {**d, "enchere": 12_000}).json()["campagne"]
    assert (c["etat"], c["mode"], c["forfait"], c["enchere"]) == ("candidature", "enchere", None, 12_000)
    assert services.compte(b).solde == 15_000  # rien n'est pris avant l'attribution
    lundi = timezone.localdate() + timedelta(days=7 - timezone.localdate().weekday())
    services.attribuer_semaine("a_la_une", lundi)
    c = api.get("/api/vendors/ads/campaigns").json()[0]
    assert (c["etat"], c["forfait"]) == ("programmee", 10_000)  # seule : le plancher de l'enchère
    assert services.compte(b).solde == 5_000


def test_espace_fixe_et_boost(boutique, temps):
    from datetime import datetime

    from apps.client_core.temps import YAOUNDE

    b, o, api = boutique
    j = timezone.localdate() + timedelta(days=7 - timezone.localdate().weekday())
    temps.t = datetime(j.year, j.month, j.day, 6, tzinfo=YAOUNDE)  # lundi 06 h : 162 h de la semaine restent
    remplir(b, 50_000)
    d = {"emplacement": "carrousel", "offreId": str(o.pk), "semaines": 2}
    e = post(api, "/quote", d).json()
    assert (
        e["refus"] is None
        and e["aPayer"] == 25_000 * 162 // 168 + 25_000
        and post(api, "/quote", {**d, "semaines": 5}).json()["refus"] == "semaines"
    )
    r = post(api, "/campaigns/new", d).json()
    assert r["ok"] and services.compte(b).solde == 50_000 - e["aPayer"] and Campagne.objects.filter(type="carrousel").count() == 2
    assert post(api, "/quote", {"emplacement": "boost_7j", "offreId": str(o.pk)}).json()["refus"] == "solde_insuffisant"
    assert post(api, "/campaigns/new", {"emplacement": "boost_24h", "offreId": "999"}).json() == {"ok": False, "raison": "pas_en_vente"}


def test_espace_candidature_flash_rejoint_promotions(boutique, temps):
    from apps.vendeur_core.services import prix_paye
    from apps.vendeur_croissance import promotions
    from apps.vendeur_croissance.models import VenteFlash

    b, o, api = boutique
    sel = api.get("/api/vendors/ads/dashboard").json()["selectionsFlash"]
    d = {"emplacement": "flash", "offreId": str(o.pk), "remisePourCent": 5, "debut": sel[0]}
    assert post(api, "/quote", d).json()["refus"] == "remise_min"
    assert post(api, "/quote", {**d, "debut": sel[0] + 1}).json()["refus"] == "etat"
    e = post(api, "/quote", {**d, "remisePourCent": 15}).json()
    assert e["refus"] is None and e["flash"]["prixPromo"] == 17_000 and e["flash"]["majoration"] == 510
    c = post(api, "/campaigns/new", {**d, "remisePourCent": 15}).json()["campagne"]
    assert (c["etat"], c["prixPromo"], c["remisePourCent"]) == ("candidature", 17_000, 15)
    services.selectionner_flash(int(c["id"]), True)
    v = VenteFlash.objects.get(offre=o)
    assert (v.origine, v.prix_promo, v.prix_reference) == ("selection", 17_000, 20_000)
    assert api.get("/api/vendors/promotions").json()[0]["origine"] == "selection"
    temps.t = v.debut + timedelta(hours=1)
    assert promotions.en_cours(o) == v and prix_paye(o) == 17_000  # le client paie le prix flash
    post(api, f"/campaigns/{c['id']}/stop")
    v.refresh_from_db()
    assert v.arretee_le == temps.t and prix_paye(o) == 20_000


def test_flash_arretee_dans_promotions_finit_chez_le_client(boutique):
    from apps.extras.models import OffreFlash
    from apps.vendeur_croissance import promotions

    b, o, api = boutique
    t = horloge.maintenant()
    ms = lambda d: int(d.timestamp() * 1000)  # noqa: E731
    corps = {"offre": o.pk, "prixFlash": 18_000, "debut": ms(t + timedelta(minutes=1)), "fin": ms(t + timedelta(hours=24)), "stock": 3}
    r = post(api, "/flash", corps)
    c = services.selectionner_flash(int(r.json()["id"]), True)
    camp = Campagne.objects.get(pk=c["id"])
    assert promotions.arreter(b, camp.vente_flash_id)["ok"] is True
    camp.refresh_from_db()
    assert camp.statut == "terminee" and camp.motif == "arrêtée dans Promotions"
    assert not OffreFlash.objects.filter(pk=camp.offre_flash_id, fin__gt=horloge.maintenant()).exists()


def test_espace_recharge(boutique):
    b, o, api = boutique
    mv = post(api, "/top-up", {"montant": 5_000}).json()
    assert api.get(f"/api/vendors/ads/top-up/{mv['id']}").json() == {
        "id": mv["id"],
        "montant": 5_000,
        "envoyeeA": mv["a"],
        "statut": "en_attente",
    }
    assert api.delete(f"/api/vendors/ads/top-up/{mv['id']}").status_code == 204
    assert api.get(f"/api/vendors/ads/top-up/{mv['id']}").json()["statut"] == "refuse"
    assert api.get("/api/vendors/ads/top-up/999").status_code == 404
    assert preparation(b).get("/api/vendors/ads/dashboard").status_code == 403


def test_rotation_ponderee_par_le_montant_paye():
    import random

    class C:
        def __init__(self, n, prix):
            self.n, self.prix, self.rembourse = n, prix, 0

    a, b = C("a", 30_000), C("b", 10_000)
    tirage = random.Random(7)
    premiers = [services.rotation([a, b], tirage)[0].n for _ in range(4_000)]
    # Poids 3 contre 1 : « a » passe devant trois fois sur quatre ; les deux sont toujours montrés.
    assert 0.72 < premiers.count("a") / 4_000 < 0.78
    assert {x.n for x in services.rotation([a, b])} == {"a", "b"}


def test_limite_de_debit_des_routes_publiques(monkeypatch):
    monkeypatch.setitem(services.LIMITES, "signal", (2, 3600))
    cl = APIClient()
    codes = [cl.post("/api/sponsored/reports", {"annonce": "x", "motif": "autre"}, format="json").status_code for _ in range(3)]
    assert codes[:2] == [422, 422] and codes[2] == 429  # au-delà : refusé avant toute lecture
