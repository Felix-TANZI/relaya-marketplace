# backend/apps/pickup/tests/test_commande_retrait.py
# Après le paiement : annulation d'une boutique (CAL-24), changement de relais et transfert (CAL-25, DP-37), garde
# (DP-08), délégation, racheter, commande vue du client.
from datetime import timedelta

import pytest
from django.utils import timezone

from apps.cart import paiement
from apps.cart import services as cart_services
from apps.cart.models import FicheLogistique
from apps.client_core import pont
from apps.client_core.tests.outils import client_connecte, creer_boutique, creer_client, creer_produit, creer_relais
from apps.pickup import services
from apps.pickup.models import ChangementLieu, GroupeRemise, MontantsCommande, SousCommande

pytestmark = pytest.mark.django_db


@pytest.fixture(autouse=True)
def isoler(monkeypatch):
    vrai = cart_services.appeler

    def faux(module, fonction, *args, defaut=None, **kw):
        if fonction == "numero_verifie":
            return "677123441"
        if fonction in (
            "profil",
            "remise_livraison",
            "ifa_negatif",
            "adresse_principale",
            "adresse",
            "adresse_par_libelle",
            "carte_par_defaut",
            "crediter_remboursement",
            "jours_suspendus",
        ):
            return defaut
        return vrai(module, fonction, *args, defaut=defaut, **kw)

    monkeypatch.setattr(cart_services, "appeler", faux)
    monkeypatch.setattr(services, "_appeler", faux)


@pytest.fixture
def commande():
    """Boutique A 25 000 F + boutique B 10 000 F, même zone, au relais : S = 35 000 F ≥ 30 000 F.
    Ram 500 + 380, Rem 400 + 400, Off 900 : total 35 780 F, payé en Mobile Money."""
    user = creer_client()
    c = client_connecte(user)
    relais = creer_relais()
    pa = creer_produit(creer_boutique("Boutique A"), "Robe", prix=25_000)
    pb = creer_produit(creer_boutique("Boutique B"), "Sandales", prix=10_000)
    for p in (pa, pb):
        FicheLogistique.objects.create(product_id=p.pk, classe="S")
    panier = cart_services.panier_de(user)
    panier.relay_id = relais.pk
    panier.save()
    for p in (pa, pb):
        c.post("/api/cart/lines", {"produit": str(p.pk)}, format="json")
    corps = {"mode": "relais", "moyen": "mtn", "comptoir": False, "numero": None, "livraison": 780, "frais": 0}
    cp = c.post("/api/checkout", corps, format="json", HTTP_IDEMPOTENCY_KEY="commande-retrait-1").json()
    order_id = pont.id_commande(cp["ref"])
    paiement.confirmer_paiement(order_id)
    return {"user": user, "c": c, "order_id": order_id, "ref": cp["ref"], "relais": relais, "pa": pa, "pb": pb}


def test_montants_figes(commande):
    m = MontantsCommande.objects.get(order_id=commande["order_id"])
    assert (m.sous_total, m.ramassages, m.remises, m.offert, m.total, m.etat_paiement) == (35_000, 880, 800, 900, 35_780, "payee")
    assert m.version_parametres
    assert list(SousCommande.objects.filter(order_id=m.order_id).values_list("n", "boutique", "sous_total")) == [
        (1, "Boutique A", 25_000),
        (2, "Boutique B", 10_000),
    ]
    assert GroupeRemise.objects.filter(order_id=m.order_id).count() == 1


def test_apercu_puis_annulation_d_une_boutique(commande):
    c, oid = commande["c"], commande["order_id"]
    a = c.get(f"/api/orders/{commande['ref']}/manage", {"n": 2}).json()
    # F avant = 880 + 800 − 900 = 780 ; F après (Off conservé) = 500 + 400 − 900 = 0 ; Remb = 10 000 + 780 = 10 780.
    assert (a["article"], a["fraisAvant"]["total"], a["fraisApres"]["total"], a["rembourse"]) == (10_000, 780, 0, 10_780)
    assert [x["n"] for x in a["reste"]] == [1]
    r = c.post(f"/api/suborders/{oid}-2/cancel", {"motif": "Trop long"}, format="json", HTTP_IDEMPOTENCY_KEY=f"annulation-{oid}-2")
    assert r.status_code == 200 and r.json() == 10_780
    # La dernière boutique : jamais plus que ce qui reste encaissé (35 780 − 10 780 = 25 000).
    r = c.post(f"/api/suborders/{oid}-1/cancel", {"motif": ""}, format="json", HTTP_IDEMPOTENCY_KEY=f"annulation-{oid}-1")
    assert r.json() == 25_000
    assert MontantsCommande.objects.get(order_id=oid).rembourse == 35_780
    assert services.vue_commande_client(oid, commande["user"])["etat"] == "annulee"


def test_annulation_impossible_apres_collecte(commande):
    SousCommande.objects.filter(order_id=commande["order_id"], n=1).update(etat="collectee")
    r = commande["c"].post(
        f"/api/suborders/{commande['order_id']}-1/cancel", {}, format="json", HTTP_IDEMPOTENCY_KEY="annulation-collectee"
    )
    assert r.status_code == 409 and r.json()["error"]["code"] == "state_changed"


def test_colis_d_un_autre_client_introuvable(commande):
    autre = client_connecte(creer_client())
    r = autre.post(f"/api/suborders/{commande['order_id']}-1/cancel", {}, format="json", HTTP_IDEMPOTENCY_KEY="annulation-autre")
    assert r.status_code == 404


def test_changer_de_relais_gratuit_avant_collecte(commande):
    nouveau = creer_relais("Relais Bastos", "Bastos")
    r = commande["c"].put(f"/api/orders/{commande['ref']}/relais", {"lieu": str(nouveau.pk), "frais": 0}, format="json")
    assert r.status_code == 200 and r.json()["montantDu"] == 0
    assert set(SousCommande.objects.filter(order_id=commande["order_id"]).values_list("relay_id", flat=True)) == {nouveau.pk}


def test_transfert_d_un_colis_arrive(commande):
    oid = commande["order_id"]
    SousCommande.objects.filter(order_id=oid, n=2).update(etat="arrivee_relais", arrivee_le=timezone.now())
    GroupeRemise.objects.filter(order_id=oid).update(accuse_fort_le=timezone.now())
    nouveau = creer_relais("Relais Mokolo", "Mokolo")
    r = commande["c"].post(f"/api/parcels/{oid}-2/transfer", {"lieu": "Relais Mokolo", "frais": 0}, format="json")
    assert r.status_code == 409 and r.json()["error"]["data"]["montantDu"] == 400  # TRANSFERT-RELAIS colis S, garde J1 = 0
    r = commande["c"].post(f"/api/parcels/{oid}-2/transfer", {"lieu": "Relais Mokolo", "frais": 400}, format="json")
    assert r.json()["montantDu"] == 400
    assert SousCommande.objects.get(order_id=oid, n=2).relay_id == nouveau.pk
    assert ChangementLieu.objects.get().type == "transfert"


def test_garde_grille_dp08_quatrieme_jour(commande):
    oid = commande["order_id"]
    SousCommande.objects.filter(order_id=oid).update(etat="arrivee_relais", arrivee_le=timezone.now() - timedelta(days=3))
    GroupeRemise.objects.filter(order_id=oid).update(accuse_fort_le=timezone.now() - timedelta(days=3))
    v = services.vue_commande_client(oid, commande["user"])
    # BLV-52018 : le 4e jour, « 300 F · 500 F demain » (grille 0, 100, 100, 100, 200…).
    assert v["garde"] == {"du": 300, "demain": 500, "jour": 4}
    assert v["etat"] == "retirable" and len(v["code"]) == 6
    assert services.garde_due(oid) == 300


def test_code_faux_trois_fois_bloque(commande):
    g = GroupeRemise.objects.get(order_id=commande["order_id"])
    for _ in range(2):
        assert services.essayer_code(g, "000000")["bloque"] is False
    assert services.essayer_code(g, "000000")["bloque"] is True
    assert services.essayer_code(g, services.code_de(g)) == {"ok": False, "bloque": True}


def test_regenerer_les_codes(commande):
    g = GroupeRemise.objects.get(order_id=commande["order_id"])
    avant = services.code_de(g)
    assert services.regenerer_codes(commande["user"]) == [commande["ref"]]
    g.refresh_from_db()
    assert services.code_de(g) != avant


def test_deleguer_et_racheter(commande):
    c, oid = commande["c"], commande["order_id"]
    assert c.put(f"/api/orders/{oid}/delegation", {"prenom": "Awa", "numero": "655214708"}, format="json").status_code == 204
    o = pont.modele("commande").objects.get(pk=oid)
    assert (o.authorized_pickup_name, o.authorized_pickup_phone) == ("Awa", "655214708")
    assert c.put(f"/api/orders/{oid}/delegation", {"prenom": "Awa", "numero": "12"}, format="json").status_code == 422
    assert c.post(f"/api/orders/{commande['ref']}/rebuy").json() == 2
    assert len(c.get("/api/cart").json()["lignes"]) == 2
