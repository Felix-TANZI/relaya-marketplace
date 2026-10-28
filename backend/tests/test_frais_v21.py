# Frais de livraison et total à payer d'un panier réel (BV-DEV-01, A1 et A2) : apps/orders/frais.py.

import math
from decimal import Decimal

import pytest
from django.contrib.auth.models import User
from rest_framework.test import APIClient, APIRequestFactory

from apps.accounts.models import RelayPointProfile
from apps.catalog.models import Category, MasterProduct, Product
from apps.orders import frais
from apps.regles import services as regles
from apps.shipping import zones
from apps.shipping.itineraire import vol_d_oiseau_km
from apps.vendors.models import VendorLocation, VendorProfile

pytestmark = pytest.mark.django_db

BIYEM_ASSI = (3.8400, 11.4850)   # boutique, Z7
BASTOS = (3.8890, 11.5160)       # client, Z1


@pytest.fixture(autouse=True)
def _referentiel():
    regles.cache.delete(regles.CLE_CACHE)
    zones.synchroniser_zones()
    yield
    regles.cache.delete(regles.CLE_CACHE)


def boutique(nom="b1", position=BIYEM_ASSI, quartier="Biyem-Assi"):
    user = User.objects.create_user(username=nom, password="p")
    profil = VendorProfile.objects.create(user=user, business_name=nom, phone="+237699000000", address="x", city="Yaoundé",
                                          status=VendorProfile.Status.APPROVED)
    VendorLocation.objects.create(vendor=profil, name=nom, address="x", phone="1", representative_name="r",
                                  representative_phone="1", latitude=Decimal(str(position[0])),
                                  longitude=Decimal(str(position[1])), quartier=quartier, is_main=True)
    return user


def offre(vendeur, prix, titre="Coque", poids="0.3", dims=("15", "8", "2"), carton=False):
    cat, _ = Category.objects.get_or_create(slug="tel-v21", defaults={"name": "Tel"})
    fiche = MasterProduct.objects.create(title=titre, category=cat, univers="TEL", poids_kg=Decimal(poids),
                                         dim_l1_cm=Decimal(dims[0]), dim_l2_cm=Decimal(dims[1]), dim_l3_cm=Decimal(dims[2]),
                                         carton=carton)
    return Product.objects.create(title=titre, category=cat, price_xaf=prix, master=fiche, vendor=vendeur)


def relais_biyem_assi():
    existant = RelayPointProfile.objects.filter(name="Relais Biyem-Assi").first()
    if existant:
        return existant
    gerant = User.objects.create_user(username="gerant", password="p")
    return RelayPointProfile.objects.create(user=gerant, name="Relais Biyem-Assi", phone="1", manager_name="g", city="YAOUNDE",
                                            address="Carrefour", zones=["Biyem-Assi"], opening_hours="8-18",
                                            status=RelayPointProfile.Status.APPROVED, is_active=True)


def test_relais_une_pochette_comme_le_test_L01():
    d = frais.calculer([(offre(boutique(), 14000), 1)], frais.destination_relais(relais_biyem_assi()))
    assert d.ok
    f = d.detail
    assert (f["frais_bruts"], f["couverture"], f["frais_client"]) == (900, 0, 900)
    assert (f["base_paiement"], f["frais_momo"], f["total_momo"], f["total_a_payer"]) == (14900, 305, 15205, 15205)
    assert f["boutiques"][0]["colis_b"] == ["P"] and f["manque_livraison_offerte"] == 16000  # R07.6
    assert f["libelle_livraison"] == ""


def test_relais_offert_au_seuil():
    d = frais.calculer([(offre(boutique(), 30000), 1)], frais.destination_relais(relais_biyem_assi()))
    assert (d.detail["couverture"], d.detail["frais_client"], d.detail["libelle_livraison"]) == (900, 0, "Livraison offerte")


def test_domicile_distance_a_vol_d_oiseau_sans_service_de_cartes():
    d = frais.calculer([(offre(boutique(), 20000), 1)], frais.destination_domicile("Bastos", *BASTOS))
    assert d.ok and d.detail["distances"] == ["vol_oiseau"]                                   # R83.3
    km = vol_d_oiseau_km(*BIYEM_ASSI, *BASTOS) * 1.3
    assert d.detail["boutiques"][0]["km_b"] == pytest.approx(km, abs=1e-3)
    assert d.detail["niv_course"] == "centre" and d.detail["base"] == 1500
    assert d.detail["prix_km"] == 250 * max(0, math.floor(km + 0.5) - 5)                      # R05.2, R83.1


def test_minimums_du_panier_tous_les_messages():
    d = frais.calculer([(offre(boutique("b1"), 1500, "Savon"), 1), (offre(boutique("b2"), 1000, "Bougie"), 1)],
                       frais.destination_relais(relais_biyem_assi()))
    assert not d.ok and d.refus["refus"] == "panier_min"
    assert d.messages == [                                                                    # R84.2, mot pour mot
        "Encore 500 F pour commander",
        "Le colis de Savon doit atteindre 2 000 F : ajoute 500 F",
        "Le colis de Bougie doit atteindre 2 000 F : ajoute 1 000 F",
    ]


def test_wallet_ferme_au_lancement():
    d = frais.calculer([(offre(boutique(), 14000), 1)], frais.destination_relais(relais_biyem_assi()), moyen="wallet")
    assert not d.ok and d.refus["refus"] == "wallet_ferme"                                    # R01.1, R03.2


def test_xl_refuse_au_relais():
    tv = offre(boutique(), 250000, "Téléviseur", poids="18", dims=("125", "75", "15"), carton=True)
    d = frais.calculer([(tv, 1)], frais.destination_relais(relais_biyem_assi()))
    assert d.refus["refus"] == "relais_interdit" and d.messages == ["Ce colis se livre seulement à domicile"]  # R10.2


def test_fiche_incomplete_et_boutique_sans_position():
    p = offre(boutique(), 5000)
    MasterProduct.objects.filter(pk=p.master_id).update(poids_kg=None)
    p.refresh_from_db()
    with pytest.raises(frais.FraisImpossibles) as e:
        frais.calculer([(p, 1)], frais.destination_relais(relais_biyem_assi()))
    assert e.value.code == "fiche_incomplete"

    sans_gps = boutique("b3")
    VendorLocation.objects.filter(vendor__user=sans_gps).update(latitude=None, longitude=None)
    with pytest.raises(frais.FraisImpossibles) as e:
        frais.calculer([(offre(sans_gps, 5000), 1)], frais.destination_relais(relais_biyem_assi()))
    assert e.value.code == "boutique_sans_position"


def test_devis_du_panier_par_l_api():
    p = offre(boutique(), 14000)
    r = APIClient().post("/api/orders/frais/", {"cart_items": [{"product_id": p.pk, "qty": 1}], "delivery_mode": "PICKUP",
                                                 "relay_point_id": relais_biyem_assi().pk}, format="json").json()
    assert r["ok"] and r["frais"]["total_a_payer"] == 15205


def test_la_commande_fige_le_calcul():
    from apps.orders.serializers import OrderCreateSerializer

    client = User.objects.create_user(username="cli", password="p")
    p = offre(boutique(), 14000)
    requete = APIRequestFactory().post("/api/orders/")
    requete.user = client
    s = OrderCreateSerializer(data={"delivery_mode": "PICKUP", "cart_items": [{"product_id": p.pk, "qty": 1}],
                                    "city": "YAOUNDE", "customer_phone": "+237699000001",
                                    "relay_point_id": relais_biyem_assi().pk}, context={"request": requete})
    assert s.is_valid(), s.errors
    o = s.save()
    assert (o.subtotal_xaf, o.delivery_fee_xaf, o.total_xaf, o.frais_momo_xaf, o.total_a_payer_xaf) == (14000, 900, 14900, 305, 15205)
    assert o.zone.code == "Z7" and o.frais_detail["reglages"] == regles.empreinte()
