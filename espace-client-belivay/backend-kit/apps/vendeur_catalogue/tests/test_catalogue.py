# Catalogue du vendeur (VD-08) : parcours complet (fiche → brouillon → photos → prix → publication → modération →
# Product de relaya commandé par un client), refus (prix minimum, plafond de démarrage, photos), accès Préparation
# (stock oui, prix null, publication refusée), anonymat, liste triée, demande de fiche, photos réelles.
import base64
import io
import itertools
from datetime import timedelta

import pytest
from django.utils import timezone

from apps.client_core import pont
from apps.vendeur_catalogue import services
from apps.vendeur_catalogue.models import DemandeFiche, PhotoOffre, PublicationOffre
from apps.vendeur_core.anonymat import fuites
from apps.vendeur_core.models import NotificationVendeur, Offre
from apps.vendeur_core.tests.outils import (
    commande_client,
    creer_boutique_vendeur,
    creer_fiche,
    creer_offre,
    preparation,
    proprietaire,
)

pytestmark = pytest.mark.django_db
_cle = itertools.count(1)


@pytest.fixture(autouse=True)
def _media(settings, tmp_path):
    settings.MEDIA_ROOT = str(tmp_path)


def en_etat(o, etat):
    Offre.objects.filter(pk=o.pk).update(etat=etat)
    o.refresh_from_db()
    return o


def cle():
    return {"HTTP_IDEMPOTENCY_KEY": f"essai-catalogue-{next(_cle):06d}"}


def image(cote=1000, fmt="JPEG") -> str:
    from PIL import Image

    t = io.BytesIO()
    Image.new("RGB", (cote, cote), (200, 30, 30)).save(t, fmt)
    return f"data:image/{fmt.lower()};base64," + base64.b64encode(t.getvalue()).decode()


def photo(cote=1000, **kw):
    return {
        "image": image(cote),
        "prise": 1_790_000_000_000,
        "largeur": cote,
        "hauteur": cote,
        "octetsAvant": 6_300_000,
        "octetsApres": 540_000,
        "position": {"lat": 3.853, "lon": 11.518},
        **kw,
    }


def ajouter_photos(api, cible, n=3):
    for _ in range(n):
        r = api.post(f"/api/vendors/offers/{cible}/photos", photo(), format="json", **cle())
        assert r.status_code == 200 and r.json()["ok"], r.content
    return r.json()


def nouvelle_offre(b, api, fiche, prix=21000, stock=4):
    r = api.post("/api/vendors/offers", {"ficheId": str(fiche.pk)}, format="json", **cle())
    oid = r.json()["brouillonId"]
    ajouter_photos(api, oid)
    assert api.patch(f"/api/vendors/offers/{oid}", {"stock": stock, "prix": prix}, format="json").json()["ok"]
    return oid


# ── Parcours complet ──────────────────────────────────────────────────────────────────────────────────


def test_parcours_creation_photos_prix_publication_moderation_commande():
    b = creer_boutique_vendeur()
    fiche = creer_fiche("TECNO Spark 20", variantes=("noir", "gris"), codes_barres=["6941812725999"])
    api = proprietaire(b)

    cfg = api.get("/api/vendors/config").json()
    assert cfg["photosMin"] == 3 and cfg["prixMin"] == 500 and cfg["versement"]["masque"] == "···· 4217"
    assert cfg["plafond"] == {"montant": 500000, "livrees": 0, "requises": 10}
    assert {"categorie": "Électronique", "rayon": "Électronique"} in cfg["categories"]

    rech = api.get("/api/vendors/catalog/search", {"q": "tecno spark"}).json()
    assert [f["titre"] for f in rech["exacts"]] == ["TECNO Spark 20"] and rech["cherche"] == 0
    assert rech["exacts"][0]["part"]["prixRef"] == 21000

    r = api.post("/api/vendors/offers", {"ficheId": str(fiche.pk), "variante": "gris"}, format="json", **cle())
    oid = r.json()["brouillonId"]
    assert r.json()["ok"]
    # Même fiche, même variante : le même brouillon.
    assert (
        api.post("/api/vendors/offers", {"ficheId": str(fiche.pk), "variante": "gris"}, format="json", **cle()).json()["brouillonId"] == oid
    )
    d = api.get("/api/vendors/offers/draft").json()
    assert d["id"] == oid and d["variante"] == "gris" and d["etapeBrouillon"] == 2

    p = ajouter_photos(api, oid)
    assert p["nombre"] == 3 and p["photo"]["lieu"] == "Mvog-Ada" and "srcset" in p["photo"] and "640w" in p["photo"]["srcset"]
    assert api.get("/api/vendors/offers/draft", {"id": oid}).json()["etapeBrouillon"] == 3

    r = api.patch(
        f"/api/vendors/offers/{oid}",
        {"stock": 4, "prix": 21000, "poidsKg": 0.4, "dimensionsCm": [20, 12, 6], "etatArticle": "Neuf", "delaiPreparationH": 8},
        format="json",
    )
    assert r.json()["ok"] and r.json()["produit"]["colis"] == "S" and r.json()["produit"]["etapeBrouillon"] == 4
    assert r.json()["produit"]["delaiPreparationH"] == 8

    a = api.get("/api/vendors/offers/quote", {"offre": oid, "prix": 21000}).json()
    assert a["garde"] == services.garde_ou_none(b, "Électronique", 21000) and a["refus"] is None
    assert a["partPourCent"] == round(a["garde"] / 21000 * 1000) / 10 and a["plagesMinimale"] and a["messageMinimale"]
    c = api.get(f"/api/vendors/offers/{oid}/price-advice", {"prix": 21000}).json()
    assert c["conseille"] == 21000 and c["dejaLeMoinsCher"] and len(c["zones"]) == 4

    pub = api.post(f"/api/vendors/offers/{oid}/publish", {"rester": False, "horsLigne": False}, format="json", **cle()).json()
    assert pub["ok"] and pub["reponseAvant"] - pub["reponseAvant"] % 1000 > 0 and pub["meilleurPrix"] and pub["avantages"][0] == "badge"
    o = Offre.objects.get(pk=oid)
    assert o.etat == "en_verification" and o.product_id is None
    assert api.get(f"/api/vendors/offers/{oid}/publication").json()["offreId"] == oid
    assert api.get("/api/vendors/offers/publication").json()["offreId"] == oid
    # Republier une offre en vérification : refusé.
    assert api.post(f"/api/vendors/offers/{oid}/publish", {}, format="json", **cle()).json()["raison"] == "etat"

    m = services.moderer(int(oid), True)
    assert m["etat"] == "en_vente" and m["productId"]
    produit = pont.modele("produit").objects.get(pk=m["productId"])
    assert produit.is_active and produit.price_xaf == 21000 and pont.modele("stock").objects.get(product=produit).quantity == 4
    assert NotificationVendeur.objects.filter(boutique=b, type="offre", titre="Offre vérifiée").exists()

    o.refresh_from_db()
    cmd = commande_client(o)
    assert cmd["ref"]
    o.refresh_from_db()
    assert o.stock == 3


def test_moderation_refus_et_erreurs():
    b = creer_boutique_vendeur()
    o = en_etat(creer_offre(b, publier=False), "en_verification")
    r = services.moderer(o.pk, False, "Photo floue")
    assert r == {"offreId": str(o.pk), "etat": "refusee", "productId": None, "motif": "Photo floue"}
    with pytest.raises(ValueError):
        services.moderer(o.pk, True)
    with pytest.raises(LookupError):
        services.moderer(999999, True)
    api = proprietaire(b)
    p = api.get(f"/api/vendors/offers/{o.pk}").json()
    assert p["motifRefus"] == "Photo floue" and p["etat"] == "refusee"


# ── Refus de publication ──────────────────────────────────────────────────────────────────────────────


def test_refus_photos_stock_prix_minimum_plafond():
    b = creer_boutique_vendeur()
    fiche = creer_fiche("Coque silicone", variantes=("noir",))
    api = proprietaire(b)
    oid = api.post("/api/vendors/offers", {"ficheId": str(fiche.pk)}, format="json", **cle()).json()["brouillonId"]
    ajouter_photos(api, oid, 2)

    def publier():
        return api.post(f"/api/vendors/offers/{oid}/publish", {"rester": True}, format="json", **cle()).json()

    assert publier() == {"ok": False, "raison": "photos", "detail": "1"}
    ajouter_photos(api, oid, 1)
    assert publier()["raison"] == "stock"
    api.patch(f"/api/vendors/offers/{oid}", {"stock": 2}, format="json")
    assert publier()["raison"] == "prix"
    api.patch(f"/api/vendors/offers/{oid}", {"prix": 300}, format="json")
    r = publier()
    assert r["raison"] == "prix_minimum" and int(r["detail"]) >= 500
    assert api.get("/api/vendors/offers/quote", {"offre": oid, "prix": 300}).json()["refus"] == "minimum"
    api.patch(f"/api/vendors/offers/{oid}", {"prix": 600000}, format="json")
    assert publier() == {"ok": False, "raison": "plafond", "detail": "500000"}
    assert api.get("/api/vendors/offers/quote", {"offre": oid, "prix": 600000}).json()["refus"] == "plafond"
    api.patch(f"/api/vendors/offers/{oid}", {"prix": 2500}, format="json")
    r = publier()
    assert r["ok"] and Offre.objects.get(pk=oid).rester_jusqua is not None


def test_publication_sans_fiche_et_introuvable():
    b = creer_boutique_vendeur()
    api = proprietaire(b)
    o = Offre.objects.create(boutique=b, titre_demande="Objet inconnu", etat="brouillon")
    assert api.post(f"/api/vendors/offers/{o.pk}/publish", {}, format="json", **cle()).json()["raison"] == "fiche"
    assert api.post("/api/vendors/offers/999999/publish", {}, format="json", **cle()).status_code == 404
    assert api.get("/api/vendors/offers/999999/publication").status_code == 404
    assert api.get("/api/vendors/offers/publication").status_code == 404
    assert api.get("/api/vendors/offers/999999").status_code == 404
    assert api.get("/api/vendors/offers/draft").status_code == 404


def test_changer_prix_d_une_offre_en_vente():
    b = creer_boutique_vendeur()
    o = creer_offre(b, prix=20000, prix_auto=True, plancher_prive=19500)
    api = proprietaire(b)
    r = api.put(f"/api/vendors/offers/{o.pk}/price", {"prix": 19000, "rester": True}, format="json").json()
    assert r["ok"] and r["produit"]["prix"] == 19000 and r["produit"]["plancherPrive"] == 19000
    assert pont.modele("produit").objects.get(pk=o.product_id).price_xaf == 19000
    assert api.put(f"/api/vendors/offers/{o.pk}/price", {"prix": 100, "rester": False}, format="json").json()["raison"] == "prix_minimum"
    assert api.put(f"/api/vendors/offers/{o.pk}/price", {"prix": 900000, "rester": False}, format="json").json()["raison"] == "plafond"
    assert api.put(f"/api/vendors/offers/{o.pk}/price", {"prix": "x", "rester": False}, format="json").json()["raison"] == "prix"
    # Une offre publiée ne passe pas sous le minimum par « Modifier ».
    assert api.patch(f"/api/vendors/offers/{o.pk}", {"prix": 100}, format="json").json()["raison"] == "prix"
    r = api.patch(f"/api/vendors/offers/{o.pk}", {"prix": 18500, "stock": 9}, format="json").json()
    assert r["ok"] and [h["quoi"] for h in r["produit"]["historique"][:3]] == [
        "Prix changé : {de} F → {a} F",
        "Stock changé : {de} → {a}",
        "Prix changé : {de} F → {a} F",
    ]


# ── Accès Préparation ─────────────────────────────────────────────────────────────────────────────────


def test_preparation_stock_oui_prix_null_publication_refusee():
    b = creer_boutique_vendeur()
    o = creer_offre(b, stock=5)
    brouillon = creer_offre(b, fiche=o.fiche, variante="bleu", publier=False)
    prep = preparation(b)

    liste = prep.get("/api/vendors/offers").json()
    for p in liste["produits"]:
        assert p["prix"] is None and p["garde"] is None and p["gardeCeMois"] is None and p["concurrent"] is None
    r = prep.put(f"/api/vendors/offers/{o.pk}/stock", {"stock": 2}, format="json").json()
    assert r["ok"] and r["produit"]["stock"] == 2 and r["produit"]["prix"] is None
    assert pont.modele("stock").objects.get(product_id=o.product_id).quantity == 2
    assert prep.patch(f"/api/vendors/offers/{brouillon.pk}", {"prix": 20000}, format="json").json()["raison"] == "prix"
    assert prep.patch(f"/api/vendors/offers/{brouillon.pk}", {"stock": 3}, format="json").json()["ok"]
    assert prep.put(f"/api/vendors/offers/{o.pk}", {"seuilAlerte": 2}, format="json").json() == {"ok": False, "raison": "reserve"}
    assert prep.post("/api/vendors/offers", {"ficheId": str(o.fiche_id)}, format="json", **cle()).json() == {
        "ok": False,
        "raison": "reserve",
    }
    for methode, chemin, corps in (
        ("post", f"/api/vendors/offers/{brouillon.pk}/publish", {}),
        ("put", f"/api/vendors/offers/{o.pk}/price", {"prix": 19000}),
        ("get", "/api/vendors/offers/quote", {"prix": 19000}),
        ("get", f"/api/vendors/offers/{o.pk}/price-advice", {"prix": 19000}),
        ("post", f"/api/vendors/offers/{o.pk}/pause", {"enPause": True}),
        ("post", f"/api/vendors/offers/{o.pk}/duplicate", {"variante": "or"}),
        ("post", f"/api/vendors/offers/{brouillon.pk}/attach", {"ficheId": o.fiche_id}),
        ("post", f"/api/vendors/offers/{o.pk}/description-proposal", {"texte": "x" * 30}),
    ):
        r = getattr(prep, methode)(chemin, corps, **({} if methode == "get" else {"format": "json", **cle()}))
        assert r.status_code == 403 and r.json()["error"]["code"] == "owner_only", chemin
    cfg = prep.get("/api/vendors/config").json()
    assert cfg["fichePrioPrix"] is None and cfg["versement"] is None
    assert "prix" in prep.get("/api/vendors/offers/export").content.decode().splitlines()[0]
    assert prep.get("/api/vendors/catalog/search", {"q": "itel"}).json()["exacts"][0]["part"] is None


# ── Liste, attention, compteurs ───────────────────────────────────────────────────────────────────────


def test_liste_triee_attention_et_ventes_du_mois():
    from apps.aftersales.models import Litige
    from apps.pickup.models import SousCommande

    b = creer_boutique_vendeur()
    fiche = creer_fiche()
    calme = creer_offre(b, fiche=fiche, variante="noir", stock=50, seuil_alerte=5, prix=20000)
    bas = creer_offre(b, fiche=creer_fiche("Chargeur 18 W", variantes=("blanc",)), variante="blanc", stock=2, seuil_alerte=5, prix=4000)
    verif = en_etat(creer_offre(b, fiche=fiche, variante="bleu", publier=False, stock=5), "en_verification")
    creer_offre(b, fiche=fiche, variante="or", publier=False)
    autre = creer_boutique_vendeur(nom="Boutique B")
    creer_offre(autre, fiche=fiche, variante="noir", prix=19000)

    # Deux ventes ce mois : l'une remise au client, l'autre en litige.
    v1 = commande_client(calme)
    SousCommande.objects.filter(order_id=v1["order_id"]).update(remise_le=timezone.now())
    v2 = commande_client(calme)
    SousCommande.objects.filter(order_id=v2["order_id"]).update(remise_le=timezone.now())
    t = timezone.now()
    Litige.objects.create(
        client=v2["client"],
        order_id=v2["order_id"],
        colis=1,
        produit="ITEL",
        pb=Litige.Probleme.values[0],
        probleme="Abîmé",
        souhait=Litige.Souhait.values[0],
        montant=20000,
        echeance_vendeur=t + timedelta(days=2),
        decision_au_plus_tard=t + timedelta(days=4),
    )
    api = proprietaire(b)
    lst = api.get("/api/vendors/offers").json()
    assert lst["compteurs"] == {"total": 4, "en_vente": 2, "en_verification": 1, "en_pause": 0, "refusee": 0, "brouillon": 1}
    ids = [p["id"] for p in lst["produits"]]
    assert ids[0] == str(calme.pk) and ids[1] == str(bas.pk) and ids[2] == str(verif.pk)
    p = lst["produits"][0]
    assert p["attention"] == ["concurrent_moins_cher", "litiges"]
    assert p["concurrent"] == {"prix": 19000, "conseille": 19000}
    assert p["ventesCeMois"] == 1 and p["litigesCeMois"] == 1 and p["gardeCeMois"] > 0 and p["geleCeMois"] > 0
    assert lst["produits"][1]["attention"] == ["stock_bas"]
    assert services.stock_bas(b) == [{"offreId": str(bas.pk), "titre": "Chargeur 18 W", "dessin": "itel", "stock": 2, "seuil": 5}]

    # « Rester à 20 000 F » : plus de relance du concurrent.
    api.put(f"/api/vendors/offers/{calme.pk}/price", {"prix": 20000, "rester": True}, format="json")
    assert "concurrent_moins_cher" not in api.get(f"/api/vendors/offers/{calme.pk}").json()["attention"]

    c = api.get(f"/api/vendors/offers/{calme.pk}/price-advice", {"prix": 20000}).json()
    assert c["conseille"] == 19000 and c["marche"] == {"nombre": 1, "min": 19000, "max": 19000} and c["clientsSemaine"] >= 2
    assert c["zones"][0]["premier"] is False and c["dejaLeMoinsCher"] is False
    assert api.get(f"/api/vendors/offers/{verif.pk}/price-advice", {"prix": 0}).status_code == 404


def test_anonymat_du_client():
    b = creer_boutique_vendeur()
    o = creer_offre(b)
    cmd = commande_client(o)
    client = cmd["client"]
    api = proprietaire(b)
    interdits = (client.first_name, client.last_name, client.email, client.username)
    for chemin in (
        "/api/vendors/offers",
        f"/api/vendors/offers/{o.pk}",
        "/api/vendors/config",
        f"/api/vendors/offers/{o.pk}/price-advice?prix=20000",
    ):
        assert fuites(api.get(chemin).json(), valeurs_interdites=tuple(x for x in interdits if x)) == [], chemin


# ── Gestes sur mes produits ───────────────────────────────────────────────────────────────────────────


def test_stock_pause_regler():
    b = creer_boutique_vendeur()
    o = creer_offre(b, stock=5)
    api = proprietaire(b)
    assert api.put(f"/api/vendors/offers/{o.pk}/stock", {"stock": -1}, format="json").json() == {"ok": False, "raison": "stock"}
    assert api.put("/api/vendors/offers/999999/stock", {"stock": 1}, format="json").json()["raison"] == "stock"
    p = api.post(f"/api/vendors/offers/{o.pk}/pause", {"enPause": True}, format="json").json()
    assert p["etat"] == "en_pause" and not pont.modele("produit").objects.get(pk=o.product_id).is_active
    assert api.post(f"/api/vendors/offers/{o.pk}/pause", {"enPause": False}, format="json").json()["etat"] == "en_vente"
    assert api.post("/api/vendors/offers/999999/pause", {"enPause": True}, format="json").status_code == 404

    def regler(**c):
        return api.put(f"/api/vendors/offers/{o.pk}", c, format="json").json()

    assert regler(seuilAlerte=-2)["raison"] == "seuil"
    assert regler(prixAuto=True) == {"ok": False, "raison": "plancher", "detail": "20000"}
    assert regler(prixAuto=True, plancherPrive=25000)["raison"] == "plancher"
    r = regler(prixAuto=True, plancherPrive=18000, seuilAlerte=2, paiementAuRetrait=False)
    assert r["ok"] and r["produit"]["plancherPrive"] == 18000 and r["produit"]["seuilAlerte"] == 2 and not r["produit"]["paiementAuRetrait"]
    assert regler(prixAuto=False)["produit"]["historique"][0]["quoi"] == "Prix automatique coupé"
    assert api.put("/api/vendors/offers/999999", {"seuilAlerte": 1}, format="json").json()["raison"] == "seuil"


def test_dupliquer_supprimer_restaurer_variantes():
    b = creer_boutique_vendeur()
    fiche = creer_fiche(variantes=("noir", "bleu", "vert"))
    o = creer_offre(b, fiche=fiche, variante="noir")
    api = proprietaire(b)
    ajouter_photos(api, f"copie:{o.pk}", 1)
    assert api.post(f"/api/vendors/offers/{o.pk}/duplicate", {"variante": "NOIR"}, format="json", **cle()).json()["raison"] == "existe"
    assert api.post(f"/api/vendors/offers/{o.pk}/duplicate", {"variante": "rose"}, format="json", **cle()).json()["raison"] == "fiche"
    assert api.post(f"/api/vendors/offers/{o.pk}/duplicate", {"variante": ""}, format="json", **cle()).json()["raison"] == "variante"
    r = api.post(f"/api/vendors/offers/{o.pk}/duplicate", {"variante": "Vert"}, format="json", **cle()).json()
    assert r["ok"] and r["rattache"]
    copie = Offre.objects.get(pk=r["brouillonId"])
    assert copie.variante == "vert" and copie.duplique_de == "noir" and PhotoOffre.objects.filter(offre=copie).count() == 1

    v = api.get(f"/api/vendors/sheets/{fiche.pk}/variants").json()
    assert v == [
        {"variante": "noir", "offreId": str(o.pk), "etat": "en_vente"},
        {"variante": "bleu", "offreId": None, "etat": None},
        {"variante": "vert", "offreId": str(copie.pk), "etat": "brouillon"},
    ]
    assert api.get("/api/vendors/sheets/999999/variants").json() == []

    assert api.delete(f"/api/vendors/offers/{o.pk}").json() == {"ok": False, "raison": "etat"}
    assert api.delete(f"/api/vendors/offers/{copie.pk}").json() == {"ok": True}
    assert api.get(f"/api/vendors/offers/{copie.pk}").status_code == 404
    assert api.post(f"/api/vendors/offers/{copie.pk}/restore").status_code == 204
    assert api.get(f"/api/vendors/offers/{copie.pk}").status_code == 200


def test_exporter_importer():
    b = creer_boutique_vendeur()
    o = creer_offre(b, fiche=creer_fiche("Pagne; wax"), stock=5)
    api = proprietaire(b)
    csv = api.get("/api/vendors/offers/export").content.decode()
    assert csv.splitlines()[0] == "identifiant;produit;variante;etat;prix;stock;seuil"
    assert csv.splitlines()[1] == f'{o.pk};"Pagne; wax";noir;en_vente;20000;5;5'
    assert api.post("/api/vendors/offers/import", {"csv": ""}, format="json").json() == {"ok": False, "raison": "vide"}
    assert api.post("/api/vendors/offers/import", {"csv": "a;b\n1;2"}, format="json").json() == {"ok": False, "raison": "format"}
    texte = f"identifiant;stock;seuil\n{o.pk};12;3\n999999;1;1\n{o.pk};x;1\n{o.pk};4;-1"
    assert api.post("/api/vendors/offers/import", {"csv": texte}, format="json").json() == {"ok": True, "lignes": 1, "ignorees": 3}
    o.refresh_from_db()
    assert (o.stock, o.seuil_alerte) == (12, 3) and pont.modele("stock").objects.get(product_id=o.product_id).quantity == 12


# ── Catalogue : recherche, code-barres, reconnaissance ────────────────────────────────────────────────


def test_recherche_code_barres_reconnaissance():
    b = creer_boutique_vendeur()
    voisine = creer_boutique_vendeur(nom="Voisine")
    fiche = creer_fiche("ITEL AC52", codes_barres=["6941812725203"])
    creer_offre(b, fiche=fiche)
    api, api2 = proprietaire(b), proprietaire(voisine)
    assert api.get("/api/vendors/catalog/search", {"q": "chargeur itel"}).json()["cherche"] == 0
    r = api2.get("/api/vendors/catalog/search", {"q": "Chargeur ITEL"}).json()
    assert r["exacts"] == [] and r["cherche"] == 1 and [f["titre"] for f in r["proches"]] == ["ITEL AC52"]
    assert api.get("/api/vendors/catalog/search", {"q": ""}).json() == {
        "q": "",
        "code": None,
        "exacts": [],
        "proches": [],
        "mesProduits": [],
        "cherche": 0,
    }
    f = api.get("/api/vendors/catalog/barcode/6941-8127-25203").json()
    assert f["titre"] == "ITEL AC52" and f["dejaVendues"] == ["noir"] and f["fourchette"] == [18000, 24000]
    assert api.get("/api/vendors/catalog/barcode/123").status_code == 404
    assert api.get("/api/vendors/catalog/barcode/abc").status_code == 404
    assert [x["titre"] for x in api.post("/api/vendors/catalog/recognize", photo(), format="json").json()] == ["ITEL AC52"]
    sans_prix = creer_fiche("Lampe solaire", prix_min=None, prix_max=None)
    assert services.fiche_json(sans_prix, services.Lecteur(b))["fourchette"] is None


def test_commencer_fiche_inconnue_et_variantes_prises():
    b = creer_boutique_vendeur()
    fiche = creer_fiche(variantes=("noir", "bleu"))
    creer_offre(b, fiche=fiche, variante="noir")
    api = proprietaire(b)
    assert api.post("/api/vendors/offers", {"ficheId": "999999"}, format="json", **cle()).json() == {"ok": False, "raison": "fiche"}
    r = api.post("/api/vendors/offers", {"ficheId": str(fiche.pk), "variante": "noir"}, format="json", **cle()).json()
    assert Offre.objects.get(pk=r["brouillonId"]).variante == "bleu"


def test_modifier_controles():
    b = creer_boutique_vendeur()
    fiche = creer_fiche(variantes=("noir", "bleu", "vert"))
    creer_offre(b, fiche=fiche, variante="bleu")
    o = creer_offre(b, fiche=fiche, variante="noir", publier=False)
    api = proprietaire(b)

    def modifier(**c):
        return api.patch(f"/api/vendors/offers/{o.pk}", c, format="json").json()

    assert modifier(stock=100000)["raison"] == "stock"
    assert modifier(seuilAlerte=10000)["raison"] == "seuil"
    assert modifier(prix=0)["raison"] == "prix"
    assert modifier(plancherPrive=100)["raison"] == "plancher"
    assert modifier(poidsKg=0)["raison"] == "colis"
    assert modifier(dimensionsCm=[10, 10])["raison"] == "colis"
    assert modifier(variante="bleu")["raison"] == "variante"
    assert modifier(variante="rose")["raison"] == "variante"
    r = modifier(variante="vert", poidsKg=12, dimensionsCm=None, etatArticle="Inconnu", madeInCameroon=True)
    assert r["ok"] and r["produit"]["colis"] == "L" and r["produit"]["etatArticle"] == "Neuf" and r["produit"]["variante"] == "vert"
    assert modifier(poidsKg=None, dimensionsCm=[130, 10, 10])["produit"]["colis"] == "XXL"
    assert api.patch("/api/vendors/offers/999999", {"stock": 1}, format="json").status_code == 404
    assert services.classe_colis(None, None, "M") == "M"


# ── Photos ────────────────────────────────────────────────────────────────────────────────────────────


def test_photos_refus_retrait_multipart():
    from django.core.files.uploadedfile import SimpleUploadedFile

    b = creer_boutique_vendeur()
    o = creer_offre(b, publier=False)
    api = proprietaire(b)
    chemin = f"/api/vendors/offers/{o.pk}/photos"
    r = api.post(chemin, photo(400), format="json", **cle()).json()
    assert r == {"ok": False, "raison": "petite", "detail": "800"}
    assert api.post(chemin, {"image": "pas une image", "largeur": 1000, "hauteur": 1000}, format="json", **cle()).status_code == 400
    assert (
        api.post(chemin, {"image": "data:text/plain;base64,AAAA", "largeur": 1000, "hauteur": 1000}, format="json", **cle()).status_code
        == 400
    )
    assert api.post("/api/vendors/offers/999999/photos", photo(), format="json", **cle()).status_code == 404
    assert api.post("/api/vendors/offers/copie:999999/photos", photo(), format="json", **cle()).status_code == 404
    assert api.get("/api/vendors/offers/inconnu/photos").status_code == 404
    # Adresse https déjà en ligne (CDN) : taille déclarée.
    r = api.post(
        chemin, {"image": "https://cdn.exemple.cm/p.jpg", "largeur": 1200, "hauteur": 900, "position": None}, format="json", **cle()
    ).json()
    assert r["ok"] and r["photo"]["image"] == "https://cdn.exemple.cm/p.jpg" and r["photo"]["lieu"] is None
    # Multipart (fichier), loin de la boutique : le lieu est la position.
    from PIL import Image

    t = io.BytesIO()
    Image.new("RGB", (900, 900)).save(t, "PNG")
    f = SimpleUploadedFile("p.png", t.getvalue(), content_type="image/png")
    r = api.post(
        chemin, {"fichier": f, "prise": "1790000000000", "lat": "4.05", "lon": "9.7", "octetsAvant": ""}, format="multipart", **cle()
    ).json()
    assert r["ok"] and r["photo"]["lieu"] == "4.050, 9.700" and r["photo"]["octetsApres"] > 0
    bad = SimpleUploadedFile("p.txt", b"x", content_type="text/plain")
    assert api.post(chemin, {"fichier": bad}, format="multipart", **cle()).status_code == 400
    ajouter_photos(api, o.pk, 6)
    assert api.post(chemin, photo(), format="json", **cle()).json()["raison"] == "max"
    photos = api.get(chemin).json()
    assert len(photos) == 8
    pid = photos[-1]["id"]
    assert api.delete(f"{chemin}/{pid}").status_code == 204
    assert api.delete(f"{chemin}/abc").status_code == 204
    assert api.delete("/api/vendors/offers/inconnu/photos/1").status_code == 404
    assert len(api.get(chemin).json()) == 7
    # Offre en vente : la photo ajoutée est notée dans l'historique.
    vente = creer_offre(b, fiche=o.fiche, variante="bleu")
    ajouter_photos(api, vente.pk, 1)
    assert api.get(f"/api/vendors/offers/{vente.pk}").json()["historique"][0]["quoi"] == "Photo réelle ajoutée"


def test_lieu_sans_position_de_boutique():
    b = creer_boutique_vendeur()
    b.lat = None
    assert services.lieu_de(b, 3.85, 11.5) == "3.850, 11.500"
    assert services.lieu_de(b, None, None) == ""


# ── Demande de fiche, description ─────────────────────────────────────────────────────────────────────


def test_produit_nouveau_apres_une_recherche():
    """DP-58 : produit nouveau seulement après une recherche ; nom, catégorie, marque proposés ; publication en
    vérification (fiche écrite par BelivaY), ou rattachement à une fiche existante (doublon, FCH-02)."""
    b = creer_boutique_vendeur()
    creer_fiche("ITEL AC52", variantes=("noir",))
    api = proprietaire(b)
    assert api.post("/api/vendors/offers/new", {"nom": "ch", "code": None}, format="json", **cle()).json()["raison"] == "recherche"
    sug = api.get("/api/vendors/catalog/suggest", {"q": "Chargeur ITEL 18 W"}).json()
    assert sug["categorie"] == "Électronique" and sug["description"].startswith("Chargeur ITEL 18 W.") and sug["doublon"] is None
    assert api.get("/api/vendors/catalog/suggest", {"q": "itel ac52"}).json()["doublon"]["titre"] == "ITEL AC52"
    r = api.post("/api/vendors/offers/new", {"nom": "Chargeur ITEL 18 W", "code": None}, format="json", **cle()).json()
    o = Offre.objects.get(pk=r["brouillonId"])
    p = api.get(f"/api/vendors/offers/{o.pk}").json()
    assert (
        p["ficheId"] is None
        and p["titre"] == "Chargeur ITEL 18 W"
        and "produit" not in p["manques"]
        and p["nouveau"]["prioritaire"] is False
    )

    def modifier(**c):
        return api.patch(f"/api/vendors/offers/{o.pk}", c, format="json").json()

    assert modifier(categorie="Inconnue")["raison"] == "categorie"
    assert modifier(description="Appelez-moi au 677 12 42 17 pour le prix")["raison"] == "description"
    assert modifier(noteVendeur="Écrivez à moi@exemple.cm")["raison"] == "note"
    assert modifier(
        description="Chargeur rapide d'origine, prise USB-C, 18 W.", prioritaire=True, stock=4, prix=6000, noteVendeur="Garanti 3 mois"
    )["ok"]
    ajouter_photos(api, str(o.pk), 3)

    def publier(offre):
        return api.post(f"/api/vendors/offers/{offre.pk}/publish", {}, format="json", **cle()).json()

    r = publier(o)
    assert r["ok"] and r["nouveau"] and not r["rattache"]
    o.refresh_from_db()
    assert o.etat == "en_verification" and o.fiche_demandee["prioritaire"] is True and o.note_vendeur == "Garanti 3 mois"
    assert DemandeFiche.objects.get(offre=o).statut == "envoyee"

    # Doublon : rattaché à la fiche existante à l'envoi.
    r = api.post("/api/vendors/offers/new", {"nom": "itel ac52", "code": None}, format="json", **cle()).json()
    d = Offre.objects.get(pk=r["brouillonId"])
    assert api.patch(
        f"/api/vendors/offers/{d.pk}",
        {"description": "Téléphone ITEL AC52 neuf, 32 Go, double SIM.", "stock": 2, "prix": 21000},
        format="json",
    ).json()["ok"]
    ajouter_photos(api, str(d.pk), 3)
    r = publier(d)
    assert r["ok"] and r["rattache"] and not r["nouveau"]
    d.refresh_from_db()
    assert d.fiche.titre == "ITEL AC52" and d.variante == "noir"

    # « C'est celui-là » après coup : rattacher un brouillon à une fiche.
    r = api.post("/api/vendors/offers/new", {"nom": "Téléphone itel", "code": None}, format="json", **cle()).json()
    assert api.post(f"/api/vendors/offers/{r['brouillonId']}/attach", {"ficheId": 999999}, format="json").json()["raison"] == "fiche"
    fiche = Offre.objects.get(pk=d.pk).fiche_id
    assert api.post(f"/api/vendors/offers/{r['brouillonId']}/attach", {"ficheId": fiche}, format="json").json() == {
        "ok": True,
        "brouillonId": r["brouillonId"],
    }
    assert Offre.objects.get(pk=r["brouillonId"]).fiche_id == fiche


def test_prix_barre_et_ordre_des_photos():
    b = creer_boutique_vendeur()
    fiche = creer_fiche("ITEL AC52", variantes=("noir",))
    api = proprietaire(b)
    oid = nouvelle_offre(b, api, fiche, prix=18000)
    assert api.patch(f"/api/vendors/offers/{oid}", {"prixBarre": 19000, "finPromo": 1}, format="json").json()["raison"] == "promo"
    fin = int((timezone.now() + timedelta(days=3)).timestamp() * 1000)
    assert api.patch(f"/api/vendors/offers/{oid}", {"prixBarre": 19000, "finPromo": fin}, format="json").json()["ok"]
    assert api.post(f"/api/vendors/offers/{oid}/publish", {}, format="json", **cle()).json()["raison"] == "promo"  # −5 % seulement
    assert api.patch(f"/api/vendors/offers/{oid}", {"prixBarre": 21000}, format="json").json()["ok"]
    assert api.post(f"/api/vendors/offers/{oid}/publish", {}, format="json", **cle()).json()["ok"]
    p = api.get(f"/api/vendors/offers/{oid}").json()
    assert p["prixBarre"] == 21000 and p["finPromo"] == fin and p["noteVendeur"] == ""
    ids = [x["id"] for x in p["photos"]]
    assert api.put(f"/api/vendors/offers/{oid}/photos", {"ids": list(reversed(ids))}, format="json").status_code == 204
    assert [x["id"] for x in api.get(f"/api/vendors/offers/{oid}").json()["photos"]] == list(reversed(ids))


def test_proposer_description():
    b = creer_boutique_vendeur()
    o = creer_offre(b)
    api = proprietaire(b)
    chemin = f"/api/vendors/offers/{o.pk}/description-proposal"
    assert api.post(chemin, {"texte": "court"}, format="json").json() == {"ok": False, "raison": "court"}
    assert api.post(chemin, {"texte": "x" * 2001}, format="json").json() == {"ok": False, "raison": "long"}
    assert api.post(chemin, {"texte": "Écrivez à vendeur@exemple.cm pour plus d'infos"}, format="json").json()["raison"] == "coordonnees"
    r = api.post(chemin, {"texte": "Batterie de 5 000 mAh, écran 6,6 pouces, double SIM."}, format="json").json()
    assert r["ok"] and api.get(f"/api/vendors/offers/{o.pk}").json()["descriptionProposee"]["reponseAvant"] == r["reponseAvant"]
    assert api.post("/api/vendors/offers/999999/description-proposal", {"texte": "x" * 30}, format="json").status_code == 404


def test_idempotence_et_publication_hors_ligne():
    b = creer_boutique_vendeur()
    fiche = creer_fiche(variantes=("noir",))
    api = proprietaire(b)
    oid = nouvelle_offre(b, api, fiche)
    k = cle()
    r1 = api.post(f"/api/vendors/offers/{oid}/publish", {"horsLigne": True}, format="json", **k)
    r2 = api.post(f"/api/vendors/offers/{oid}/publish", {"horsLigne": True}, format="json", **k)
    assert r1.json() == r2.json() and r2["Idempotent-Replayed"] == "true" and r1.json()["enFile"]
    assert PublicationOffre.objects.get(offre_id=oid).en_file


def test_apercu_sans_offre_et_prix_invalide():
    b = creer_boutique_vendeur()
    api = proprietaire(b)
    a = api.get("/api/vendors/offers/quote", {"prix": 4500, "mic": "true"}).json()
    assert a["petitPrix"] and a["points"] == 3.0 and a["commissionMinimale"] == 700 and a["seuilPetitPrix"] == 5000
    assert api.get("/api/vendors/offers/quote", {"prix": "abc"}).status_code == 400


# ── Démonstration ─────────────────────────────────────────────────────────────────────────────────────


def test_demo_idempotente():
    from apps.vendeur_catalogue import demo

    b = creer_boutique_vendeur()
    fiche = creer_fiche(variantes=("noir", "bleu"))
    noir = creer_offre(
        b,
        fiche=fiche,
        variante="noir",
        stock=3,
        seuil_alerte=5,
        envoyee_a=timezone.now() - timedelta(days=30),
        verifiee_a=timezone.now() - timedelta(days=29),
    )
    bleu = en_etat(creer_offre(b, fiche=fiche, variante="bleu", publier=False), "en_verification")
    demo.charger(b)
    demo.charger(b)
    assert PhotoOffre.objects.filter(offre=noir).count() == 3 and PhotoOffre.objects.filter(offre=bleu).count() == 3
    noir.refresh_from_db()
    bleu.refresh_from_db()
    assert [h["quoi"] for h in noir.historique] == ["Offre vérifiée par BelivaY : en vente", "Offre envoyée en vérification"]
    assert bleu.duplique_de == "noir" and (noir.stock, noir.seuil_alerte, noir.etat) == (3, 5, "en_vente")
    p = proprietaire(b).get("/api/vendors/offers").json()["produits"]
    assert all(len(x["photos"]) == 3 and x["photos"][0]["srcset"] for x in p)


def test_demo_sur_la_boutique_du_socle():
    from apps.vendeur_catalogue import demo
    from apps.vendeur_core import demo as socle

    b = socle.charger()
    demo.charger(b)
    api = proprietaire(b)
    lst = api.get("/api/vendors/offers").json()
    assert lst["compteurs"]["total"] == 3 and lst["compteurs"]["en_vente"] == 2 and lst["compteurs"]["en_verification"] == 1
    par = {(p["titre"], p["variante"]): p for p in lst["produits"]}
    noir, iphone = par[("ITEL AC52", "noir")], par[("iPhone 15 Pro Max", "256 Go")]
    assert (noir["stock"], noir["seuilAlerte"], iphone["stock"], iphone["seuilAlerte"]) == (3, 5, 2, 1)
    assert "stock_bas" in noir["attention"] and all(len(p["photos"]) == 3 for p in lst["produits"])
