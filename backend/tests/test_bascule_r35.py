# Feuille de route D8 : « Basculer automatiquement vers le vendeur suivant en cas de rupture, de lenteur ou de refus. »
# Spec v2.1, R35 : déclencheurs (R35.1), le client paie toujours le prix payé (R35.3), remboursement intégral sans
# remplaçante (R35.4), commission de la remplaçante sur son propre prix (R35.5).

import pytest
from django.contrib.auth.models import User
from rest_framework.test import APIClient

from apps.accounts.models import UserNotification
from apps.orders.models import CommissionSousCommande, Order, OrderHistory
from apps.shipping.models import Shipment
from tests.test_meilleure_offre_v21 import _commande, _referentiel, fiche, offre  # noqa: F401  (fixtures)

pytestmark = pytest.mark.django_db


def _vendeur(produit):
    c = APIClient()
    c.force_authenticate(produit.vendor)
    return c


def _commande_payee(produit):
    o = _commande(produit).save()
    o.confirm_payment()
    return o


def test_rupture_bascule_vers_une_autre_offre(fiche):
    defaillante = offre(fiche, "r1", 12000)
    o = _commande_payee(defaillante)
    fiable = offre(fiche, "r2", 11950, trust=90)
    r = _vendeur(defaillante).post(f"/api/vendors/orders/{o.pk}/stockout").json()
    assert r["ok"] and r["remplaces"] == 1                                                      # R35.1
    item = o.items.get()
    assert item.product == fiable and item.price_xaf_snapshot == 12000                          # R35.3 : prix payé
    nouveau = Shipment.objects.get(order=o, vendor=fiable.vendor)
    assert nouveau.echeance_vendeur is not None                                                 # A3 pour la remplaçante
    assert not Shipment.objects.filter(order=o, vendor=defaillante.vendor).exclude(status="CANCELLED").exists()
    c = CommissionSousCommande.objects.get(order=o, vendor=fiable.vendor)
    assert c.st_b == 11950                                                                      # R35.5
    assert not CommissionSousCommande.objects.filter(order=o, vendor=defaillante.vendor).exists()
    o.refresh_from_db()
    assert o.fulfillment_status != Order.FulfillmentStatus.CANCELLED


def test_refus_sans_remplacante_rembourse_le_client(fiche):
    seule = offre(fiche, "r3", 12000)
    o = _commande_payee(seule)
    r = _vendeur(seule).post(f"/api/vendors/orders/{o.pk}/refuse").json()
    assert r["ok"] and r["rembourses"] == 1                                                     # R35.1 : refus
    o.refresh_from_db()
    assert o.fulfillment_status == Order.FulfillmentStatus.CANCELLED                            # R35.4
    assert OrderHistory.objects.filter(order=o, action__icontains="à rembourser (R35.4)").exists()
    assert UserNotification.objects.filter(user=o.user, title__icontains="Article indisponible").exists()


def test_une_commande_prete_ne_bascule_plus(fiche):
    produit = offre(fiche, "r4", 12000)
    o = _commande_payee(produit)
    Order.objects.filter(pk=o.pk).update(fulfillment_status=Order.FulfillmentStatus.READY_FOR_PICKUP)
    assert _vendeur(produit).post(f"/api/vendors/orders/{o.pk}/refuse").json() == {"ok": False, "raison": "deja_prete"}


def test_annuler_une_commande_payee_vaut_refus(fiche):
    defaillante = offre(fiche, "r5", 12000)
    o = _commande_payee(defaillante)
    fiable = offre(fiche, "r6", 11950, trust=90)
    r = _vendeur(defaillante).patch(f"/api/vendors/orders/{o.pk}/fulfillment-status/",
                                    {"fulfillment_status": "CANCELLED"}, format="json")
    assert r.status_code == 200
    assert o.items.get().product == fiable                                                      # R35.1 : refus -> bascule
