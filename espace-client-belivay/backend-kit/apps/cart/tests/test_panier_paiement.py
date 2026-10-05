# backend/apps/cart/tests/test_panier_paiement.py
# Panier recalculé, changements de prix, paiement, comptoir, carte, panier partagé. Montants attendus : moteur de
# frais (moteurs/README.md) avec le registre livré (R = 500 F, R′ = 380 F, remise relais 400 F, seuil 30 000 F).
import pytest

from apps.cart import paiement
from apps.cart import services as cart_services
from apps.cart.models import FicheLogistique, LignePanier
from apps.client_core import pont
from apps.client_core.tests.outils import client_connecte, creer_boutique, creer_client, creer_produit, creer_relais
from apps.pickup.models import MontantsCommande, SousCommande
from apps.wallet.prestataires import CarteConsole, MobileMoneyConsole

pytestmark = pytest.mark.django_db


class _Carte:
    jeton = "tok_visa_4242"


@pytest.fixture(autouse=True)
def isoler(monkeypatch):
    """Le panier ne dépend pas des autres applications du kit dans ces tests : numéro vérifié, carte par défaut."""
    vrai = cart_services.appeler

    def faux(module, fonction, *args, defaut=None, **kw):
        if fonction == "numero_verifie":
            return "677123441"
        if fonction == "carte_par_defaut":
            return _Carte()
        if fonction in ("profil", "remise_livraison", "ifa_negatif", "adresse_principale", "adresse"):
            return defaut
        return vrai(module, fonction, *args, defaut=defaut, **kw)

    monkeypatch.setattr(cart_services, "appeler", faux)
    MobileMoneyConsole.DEMANDES.clear()
    CarteConsole.PAIEMENTS.clear()


@pytest.fixture
def monde():
    user = creer_client()
    relais = creer_relais()
    a, b = creer_boutique("Boutique A", zone="Bastos"), creer_boutique("Boutique B", zone="Bastos")
    pa, pb = creer_produit(a, "Robe pagne", prix=12_000), creer_produit(b, "Sandales", prix=8_000)
    for p in (pa, pb):
        FicheLogistique.objects.create(product_id=p.pk, classe="S")
    panier = cart_services.panier_de(user)
    panier.relay_id = relais.pk
    panier.save()
    return {"user": user, "c": client_connecte(user), "relais": relais, "a": a, "b": b, "pa": pa, "pb": pb}


def ajouter(c, produit, qte=1):
    r = c.post("/api/cart/lines", {"produit": str(produit.pk), "qte": qte}, format="json")
    assert r.status_code == 200, r.content
    return r.json()["id"]


def test_panier_vide(monde):
    r = monde["c"].get("/api/cart").json()
    assert r["lignes"] == [] and r["frais"] is None and r["comptoir"] is None and r["mode"] == "relais"


def test_frais_deux_boutiques_meme_zone(monde):
    ajouter(monde["c"], monde["pa"])
    ajouter(monde["c"], monde["pb"])
    r = monde["c"].get("/api/cart").json()
    f = r["frais"]
    # S = 20 000 ; Ram = 500 + 380 ; Rem = 400 + 400 ; sous le seuil de 30 000 F : pas de livraison offerte.
    assert (f["sous_total"], f["ramassages"], f["remises"], f["offert"], f["total"]) == (20_000, 880, 800, 0, 21_680)
    assert f["manque_pour_seuil"] == 10_000 and f["progression_pour_cent"] == 67
    assert set(r["boutiques"]) == {"Boutique A", "Boutique B"} and r["relais"] == "Relais Mvog-Ada"
    assert r["comptoir"]["propose"] is False and r["comptoir"]["plafond"] == 15_000  # nouveau compte, S > 15 000 F
    assert r["lignes"][0]["classe"] == "S" and r["version_parametres"]


def test_livraison_offerte_des_le_seuil(monde):
    ajouter(monde["c"], monde["pa"], qte=3)  # 36 000 F, une boutique
    f = monde["c"].get("/api/cart").json()["frais"]
    assert (f["total"], f["offert"]) == (36_000, 900)  # Off = R + remise d'un colis S


def test_changements_de_prix_et_paiement_bloque(monde):
    ajouter(monde["c"], monde["pa"])
    pont.modele("produit").objects.filter(pk=monde["pa"].pk).update(price_xaf=13_000)
    chg = monde["c"].get("/api/cart").json()["changements"]
    assert chg[0]["type"] == "hausse" and (chg[0]["avant"], chg[0]["apres"]) == (12_000, 13_000)
    corps = {"mode": "relais", "moyen": "mtn", "comptoir": False, "numero": None, "livraison": 900, "frais": 0}
    r = monde["c"].post("/api/checkout", corps, format="json", HTTP_IDEMPOTENCY_KEY="commande-essai-1")
    assert r.status_code == 409 and r.json()["error"]["code"] == "price_changed"
    assert monde["c"].post("/api/checkout/confirm").status_code == 204
    assert monde["c"].get("/api/cart").json()["changements"] == []


def test_baisse_appliquee_tout_de_suite(monde):
    ajouter(monde["c"], monde["pa"])
    pont.modele("produit").objects.filter(pk=monde["pa"].pk).update(price_xaf=11_000)
    assert monde["c"].get("/api/cart").json()["changements"][0]["type"] == "baisse"
    assert LignePanier.objects.get().prix_vu == 11_000


def test_paiement_mobile_money_puis_confirmation(monde):
    ajouter(monde["c"], monde["pa"])
    ajouter(monde["c"], monde["pb"])
    corps = {"mode": "relais", "moyen": "mtn", "comptoir": False, "numero": "677123441", "livraison": 1680, "frais": 0}
    h = {"HTTP_IDEMPOTENCY_KEY": "commande-essai-2"}
    r = monde["c"].post("/api/checkout", corps, format="json", **h)
    assert r.status_code == 200, r.content
    cp = r.json()
    assert (cp["etat"], cp["sousTotal"], cp["livraison"], cp["montant"], cp["colis"], cp["articles"]) == (
        "attente",
        20_000,
        1_680,
        21_680,
        2,
        2,
    )
    assert cp["numero"] == "6 77 ·· ·· 41"
    assert MobileMoneyConsole.DEMANDES[-1]["montant_xaf"] == 21_680
    # Rejeu (double clic) : même réponse, aucune seconde commande.
    assert monde["c"].post("/api/checkout", corps, format="json", **h).json() == cp
    assert MontantsCommande.objects.count() == 1 and SousCommande.objects.count() == 2
    assert monde["c"].get("/api/cart").json()["lignes"] == []  # lignes réservées pendant le paiement
    assert [x["ref"] for x in monde["c"].get("/api/me/pending-payments").json()] == [cp["ref"]]  # paiementsEnAttente
    order_id = pont.id_commande(cp["ref"])
    paiement.confirmer_paiement(order_id)
    assert monde["c"].get(f"/api/orders/{order_id}/receipt").json()["etat"] == "payee"
    assert monde["c"].get("/api/me/pending-payments").json() == []
    assert pont.modele("commande").objects.get(pk=order_id).payment_status == "PAID"
    assert not LignePanier.objects.exists()


def test_abandon_rend_les_articles_au_panier(monde):
    ajouter(monde["c"], monde["pa"])
    corps = {"mode": "relais", "moyen": "orange", "comptoir": False, "numero": "699000000", "livraison": 900, "frais": 0}
    cp = monde["c"].post("/api/checkout", corps, format="json", HTTP_IDEMPOTENCY_KEY="commande-essai-3").json()
    assert monde["c"].post(f"/api/payments/{cp['ref']}/abandon").status_code == 204
    assert len(monde["c"].get("/api/cart").json()["lignes"]) == 1
    assert monde["c"].get(f"/api/orders/{cp['ref']}/receipt").json()["etat"] == "echec"


def test_livraison_affichee_trop_basse_409(monde):
    ajouter(monde["c"], monde["pa"])
    corps = {"mode": "relais", "moyen": "mtn", "comptoir": False, "numero": None, "livraison": 500, "frais": 0}
    r = monde["c"].post("/api/checkout", corps, format="json", HTTP_IDEMPOTENCY_KEY="commande-essai-4")
    assert r.status_code == 409 and r.json()["error"]["data"]["livraison"] == 900


def test_carte_frais_de_service_et_plafond(monde):
    ajouter(monde["c"], monde["pa"])  # 12 000 + 900 = 12 900 ; 2 % = 258 F
    corps = {"mode": "relais", "moyen": "carte", "comptoir": False, "numero": None, "livraison": 900, "frais": 258}
    cp = monde["c"].post("/api/checkout", corps, format="json", HTTP_IDEMPOTENCY_KEY="commande-essai-5").json()
    assert (cp["frais"], cp["montant"], cp["etat"]) == (258, 13_158, "payee")
    assert CarteConsole.PAIEMENTS[-1]["montant_xaf"] == 13_158
    cher = creer_produit(monde["a"], "Téléviseur", prix=200_000)
    FicheLogistique.objects.create(product_id=cher.pk, classe="M")
    ajouter(monde["c"], cher)
    corps["frais"] = 9_999
    r = monde["c"].post("/api/checkout", corps, format="json", HTTP_IDEMPOTENCY_KEY="commande-essai-6")
    assert r.status_code == 422 and r.json()["error"]["code"] == "over_cap"


def test_comptoir_livraison_d_avance_reste_au_retrait(monde):
    p = creer_produit(monde["a"], "Pagne", prix=10_000)
    FicheLogistique.objects.create(product_id=p.pk, classe="S")
    ajouter(monde["c"], p)
    assert monde["c"].get("/api/cart").json()["comptoir"]["propose"] is True
    corps = {"mode": "relais", "moyen": "mtn", "comptoir": True, "numero": None, "livraison": 900, "frais": 0}
    cp = monde["c"].post("/api/checkout", corps, format="json", HTTP_IDEMPOTENCY_KEY="commande-essai-7").json()
    assert (cp["comptoir"], cp["montant"], cp["dueAuRetrait"]) == (True, 900, 10_000)


def test_xl_interdit_en_relais(monde):
    tv = creer_produit(monde["a"], "Téléviseur 43 pouces", prix=150_000)
    FicheLogistique.objects.create(product_id=tv.pk, classe="XL")
    ajouter(monde["c"], tv)
    r = monde["c"].get("/api/cart")
    assert r.status_code == 422 and r.json()["error"]["code"] == "panier_invalide"


def test_produit_sans_classe_refuse(monde):
    sans = creer_produit(monde["a"], "Sans fiche", prix=1_000)
    r = monde["c"].post("/api/cart/lines", {"produit": str(sans.pk)}, format="json")
    assert r.status_code == 422 and r.json()["error"]["code"] == "panier_invalide"


def test_retirer_puis_remettre_une_ligne(monde):
    i = ajouter(monde["c"], monde["pa"])
    assert monde["c"].delete(f"/api/cart/lines/{i}").status_code == 204
    assert monde["c"].get("/api/cart").json()["lignes"] == []
    assert monde["c"].post("/api/cart/lines", {"ligne": i, "position": 0}, format="json").json()["ok"] is True
    assert monde["c"].patch(f"/api/cart/lines/{i}", {"qte": 3}, format="json").status_code == 204
    assert monde["c"].get("/api/cart").json()["lignes"][0]["qte"] == 3
    r = monde["c"].patch(f"/api/cart/lines/{i}", {"qte": 50}, format="json")
    assert r.status_code == 422 and r.json()["error"]["code"] == "stock"


def test_ligne_d_un_autre_client_introuvable(monde):
    i = ajouter(monde["c"], monde["pa"])
    autre = client_connecte(creer_client())
    assert autre.delete(f"/api/cart/lines/{i}").status_code == 404


def test_mettre_en_favori(monde):
    i = ajouter(monde["c"], monde["pa"])
    assert monde["c"].post(f"/api/cart/lines/{i}/save").status_code == 204
    assert pont.modele("favori").objects.filter(user=monde["user"], product=monde["pa"]).exists()


def test_panier_partage_paye_par_carte(monde, api_client):
    ajouter(monde["c"], monde["pa"])
    pp = monde["c"].post("/api/carts/me/share", {}, format="json").json()
    assert (pp["sousTotal"], pp["livraison"], pp["frais"], pp["total"]) == (12_000, 900, 258, 13_158)
    vu = api_client.get(f"/api/gift-links/{pp['id']}").json()
    assert vu["relais"] == "Mvog-Ada" and vu["payeur"] is None  # le quartier seulement
    corps = {"token": pp["id"], "prenom": "Paul", "email": "paul@exemple.fr", "carte": "tok_refus", "devise": "EUR"}
    r = api_client.post("/api/gift-payments", corps, format="json", HTTP_IDEMPOTENCY_KEY="cadeau-essai-1")
    assert r.status_code == 402 and r.json()["error"]["code"] == "card_declined"
    corps["carte"] = "tok_visa"
    r = api_client.post("/api/gift-payments", corps, format="json", HTTP_IDEMPOTENCY_KEY="cadeau-essai-2")
    assert r.status_code == 200, r.content
    assert r.json()["ref"].startswith("BLV-") and r.json()["payeur"]["prenom"] == "Paul"
    assert str(CarteConsole.PAIEMENTS[-1]["montant_devise"]) == "20.06"  # 13 158 F / 655,957
    m = MontantsCommande.objects.get()
    assert (m.client, m.moyen, m.etat_paiement, m.devise) == (monde["user"], "carte", "payee", "EUR")
    assert monde["c"].get("/api/me/gift-links").json()[0]["ref"] == r.json()["ref"]


def test_changer_d_offre_refuse_sans_gain(monde):
    from apps.client_core.tests.outils import creer_boutique as cb

    master = pont.modele("produit")._meta.get_field("master").related_model.objects.create(title="Robe")
    pont.modele("produit").objects.filter(pk=monde["pa"].pk).update(master=master)
    autre = creer_produit(cb("Boutique C", zone="Mokolo"), "Robe pagne", prix=12_500, master=master)
    FicheLogistique.objects.create(product_id=autre.pk, classe="S")
    i = ajouter(monde["c"], monde["pa"])
    r = monde["c"].post(f"/api/cart/lines/{i}/swap-offer", {"boutique": "Boutique C"}, format="json")
    assert r.status_code == 409 and r.json()["error"]["code"] == "no_gain"
    assert LignePanier.objects.get().product_id == monde["pa"].pk
