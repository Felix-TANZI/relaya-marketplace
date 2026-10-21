# Meilleure offre (BV-DEV-02, A6) et sélection du panier (A12) sur de vraies offres : apps/catalog/meilleure_offre.py.

from decimal import Decimal

import pytest
from django.contrib.auth.models import User

from apps.accounts.models import TrustScoreProfile
from apps.catalog.meilleure_offre import mesurer, meilleure_offre, mois_depuis_ouverture
from apps.catalog.models import Category, Inventory, MasterProduct, Product
from apps.orders import frais
from apps.regles import services as regles
from apps.regles.models import Reglage
from apps.shipping import zones
from apps.vendors.models import VendorLocation, VendorProfile
from tests.test_category_management import _identite_vendeur_verifiee
from tests.test_frais_v21 import BIYEM_ASSI, relais_biyem_assi

pytestmark = pytest.mark.django_db


@pytest.fixture(autouse=True)
def _referentiel():
    regles.cache.delete(regles.CLE_CACHE)
    zones.synchroniser_zones()
    yield
    regles.cache.delete(regles.CLE_CACHE)


@pytest.fixture
def fiche():
    cat = Category.objects.create(name="Tel", slug="tel-mo")
    return MasterProduct.objects.create(title="Coque", category=cat, univers="TEL", poids_kg=Decimal("0.3"),
                                        dim_l1_cm=15, dim_l2_cm=8, dim_l3_cm=2, moderation_status="APPROVED")


def offre(fiche, nom, prix, trust=80, stock=5, verifie=True):
    u = User.objects.create_user(username=nom, password="p")
    profil = VendorProfile.objects.create(user=u, business_name=nom, phone="1", address="x", city="Yaoundé",
                                          status=VendorProfile.Status.APPROVED)
    VendorLocation.objects.create(vendor=profil, name=nom, address="x", phone="1", representative_name="r",
                                  representative_phone="1", latitude=Decimal(str(BIYEM_ASSI[0])),
                                  longitude=Decimal(str(BIYEM_ASSI[1])), quartier="Biyem-Assi", is_main=True)
    TrustScoreProfile.objects.create(user=u, role=TrustScoreProfile.Role.VENDOR, score=trust)
    if verifie:
        _identite_vendeur_verifiee(u)
    p = Product.objects.create(title=f"Coque {nom}", category=fiche.category, price_xaf=prix, master=fiche, vendor=u,
                               is_active=True, moderation_status="APPROVED")
    Inventory.objects.create(product=p, quantity=stock)
    return p


def test_les_offres_mesurees_pour_le_moteur(fiche):
    a = offre(fiche, "va", 12000)
    m = mesurer([a], frais.destination_relais(relais_biyem_assi()))[0]
    assert (m["prix"], m["zone_b"], m["format"], m["stock"], m["trust"], m["nouveau"]) == (12000, "Z7", "P", 5, 80.0, True)
    assert (m["part_reelle"], m["dernier_service"], m["note"], m["delai_h"]) == (0.0, None, None, 4)


def test_une_offre_non_eligible_est_ecartee(fiche):
    sans_identite = offre(fiche, "vb", 11000, verifie=False)                 # R32.1 : pièce non vérifiée
    peu_fiable = offre(fiche, "vc", 11500, trust=30)                          # R32.1 : trust < r_trust_min
    bonne = offre(fiche, "vd", 12500)
    r = meilleure_offre([sans_identite, peu_fiable, bonne], frais.destination_relais(relais_biyem_assi()))
    assert r["retenue"] == bonne.pk and [o["id"] for o in r["en_course"]] == [bonne.pk]


def test_produit_indisponible_sans_offre_eligible(fiche):
    vide = offre(fiche, "ve", 12000, stock=0)
    assert meilleure_offre([vide], frais.destination_relais(relais_biyem_assi())) is None          # R32.4


def test_les_offres_proches_se_partagent_les_commandes(fiche):
    a, b, c = offre(fiche, "v1", 12000), offre(fiche, "v2", 12100), offre(fiche, "v3", 15000)
    r = meilleure_offre([a, b, c], frais.destination_relais(relais_biyem_assi()))
    # Démarrage : tol = min(⌊ctl_min × 8 %⌋ ; 1 000 F) ; ctl = prix + 900 F de relais
    assert r["phase"] == "Démarrage" and r["ctl_min"] == 12900 and r["tol"] == 1000
    assert {o["id"] for o in r["en_course"]} == {a.pk, b.pk}                  # c est trop loin (R29.5)
    assert abs(sum(o["part_cible"] for o in r["en_course"]) - 1) < 1e-9       # R31.3


def test_mois_depuis_l_ouverture_des_achats():
    assert mois_depuis_ouverture() == 1                                       # achats pas encore ouverts
    r = Reglage.objects.get(nom="r_date_ouverture_achats") if Reglage.objects.filter(nom="r_date_ouverture_achats").exists() else None
    if r is None:
        pytest.skip("base sans réglages")
    r.valeur = "2026-01-15"
    r.save()
    from datetime import datetime
    from django.utils import timezone
    assert mois_depuis_ouverture(timezone.make_aware(datetime(2026, 5, 20))) == 5        # Régime (R29.2)


def _commande(produit, total_attendu=None):
    from rest_framework.test import APIRequestFactory

    from apps.orders.serializers import OrderCreateSerializer

    client = User.objects.create_user(username=f"cl{User.objects.count()}", password="p")
    requete = APIRequestFactory().post("/api/orders/")
    requete.user = client
    s = OrderCreateSerializer(data={"delivery_mode": "PICKUP", "cart_items": [{"product_id": produit.pk, "qty": 1}],
                                    "city": "YAOUNDE", "customer_phone": "+237699000001",
                                    "relay_point_id": relais_biyem_assi().pk, "total_attendu": total_attendu},
                              context={"request": requete})
    assert s.is_valid(), s.errors
    return s


def test_le_panier_va_a_l_offre_retenue_et_la_selection_est_journalisee(fiche):
    from apps.catalog.models import SelectionOffre

    chere = offre(fiche, "w1", 12500, trust=40)
    retenue = offre(fiche, "w2", 12400, trust=95)
    o = _commande(chere).save()                                              # le client a mis l'offre chère
    assert o.items.get().product_id == retenue.pk                           # R93.2 : refait pour le panier
    j = SelectionOffre.objects.get(order=o)
    assert (j.raison, j.retenue_id, j.phase) == ("panier", retenue.pk, "Démarrage") and len(j.en_course) == 2   # R27.7


def test_un_prix_a_change(fiche):
    p = offre(fiche, "w3", 12000)
    s = _commande(p, total_attendu=1)
    with pytest.raises(Exception) as e:
        s.save()
    assert "Un prix a changé" in str(e.value.detail["prix_change"])         # R93.6


def test_bascule_vers_une_offre_en_course_fiable(fiche):
    from apps.orders.reassignment import find_reassignment_candidate

    defaillante = offre(fiche, "w4", 12000)
    o = _commande(defaillante).save()
    peu_fiable = offre(fiche, "w5", 11900, trust=60)                         # trust < r_trust_rempl (75)
    fiable = offre(fiche, "w6", 11950, trust=90)
    plus_chere = offre(fiche, "w7", 12300, trust=99)                         # avance BelivaY (R35.3) : hors périmètre
    item = o.items.get()
    item.product = defaillante
    item.save()
    assert find_reassignment_candidate(item) == fiable                       # R35.2
