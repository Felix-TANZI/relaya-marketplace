# Étape argent de la feuille de route (D11, D13, D17, D18, D20) ; spec v2.1, R22, R23, R40, R43, R69.

from datetime import datetime, timedelta

# `/dev/null` n'existe pas sous Windows, ou les postes de l'equipe
# tournent : `StringIO` fait la meme chose partout, et ne laisse pas un
# fichier ouvert derriere lui.
from io import StringIO

import pytest
from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework.test import APIClient

from apps.payments.bridge import vendredi
from apps.payments.bridge.actors import payee_for_relay_point, payee_for_vendor
from apps.payments.settlements.models import Adjustment, PayoutRequest
from apps.payments.settlements.services import remunerer_semaine, versements_du_vendredi
from apps.regles import services as regles
from apps.shipping import zones
from apps.shipping.models import RelayParcel, Shipment
from tests.test_commission_v21 import commander
from tests.test_frais_v21 import boutique, offre

pytestmark = pytest.mark.django_db


@pytest.fixture(autouse=True)
def _referentiel():
    from apps.accounts.models import DeliveryOrganizationProfile

    regles.cache.delete(regles.CLE_CACHE)
    zones.synchroniser_zones()
    DeliveryOrganizationProfile.objects.create(
        user=User.objects.create_user(username="wink", password="p"), company_name="Wink", phone="1",
        city="YAOUNDE", zones=["Yaoundé"], status=DeliveryOrganizationProfile.Status.APPROVED, is_active=True)
    yield
    regles.cache.delete(regles.CLE_CACHE)


def _a(jour, heure):
    """Un instant de la semaine du 19/10/2026 (lundi), heure de Yaoundé."""
    return timezone.make_aware(datetime(2026, 10, 19 + jour, heure, 0))


def test_rien_n_est_verse_hors_du_vendredi_matin():
    assert versements_du_vendredi(_a(2, 9)) == {"skipped": True}                               # mercredi
    assert versements_du_vendredi(_a(4, regles.reglage("r_versement_heure"))) == {"skipped": True}  # vendredi midi
    assert vendredi.executer(_a(3, 9)) == {"skipped": True}                                    # jeudi


def _colis_retire(prix=14000, jours_au_relais=3):
    o = commander([(offre(boutique(f"b{User.objects.count()}"), prix), 1)])
    parcel = RelayParcel.objects.get(shipment=Shipment.objects.get(order=o))
    arrivee = _a(4, 9) - timedelta(days=jours_au_relais)
    RelayParcel.objects.filter(pk=parcel.pk).update(status=RelayParcel.Status.PICKED_UP, received_at=arrivee,
                                                   picked_up_at=_a(4, 8) - timedelta(days=1), garde_encaissee_xaf=200)
    parcel.refresh_from_db()
    return parcel


def test_versement_du_relais_selon_r40_4():
    parcel = _colis_retire()
    montant, _detail = vendredi.montant_relais(parcel.relay_point, _a(4, 0) - timedelta(days=7), _a(4, 0))
    from apps.shipping import garde

    jours = int(garde.jour(parcel.shipment.order, parcel.picked_up_at) or 0)
    attendu = regles.moteur().versement_relais(vendredi._formats(parcel), [jours], 0, 200)["montant"]
    assert montant == attendu                                                                   # R40.4


def test_la_semaine_du_relais_entre_au_lot_et_un_solde_negatif_devient_une_creance():
    from django.core.management import call_command

    call_command("seed_chart_of_accounts", stdout=StringIO())
    parcel = _colis_retire()
    payee = payee_for_relay_point(parcel.relay_point, create=True)
    du = remunerer_semaine(payee, montant=800, semaine="2026-10-23", detail="test")
    assert du.direction == Adjustment.Direction.DEBIT and du.status == Adjustment.Status.APPROVED
    assert remunerer_semaine(payee, montant=800, semaine="2026-10-23", detail="test") == du          # idempotent
    negatif = remunerer_semaine(payee, montant=-300, semaine="2026-10-30", detail="test")
    assert negatif.direction == Adjustment.Direction.CREDIT and negatif.remaining_xaf == 300          # R40.5


def test_le_vendeur_n_a_plus_a_demander_son_retrait():
    vendeur = User.objects.create_user(username="vend_retrait", password="p")
    from apps.vendors.models import VendorProfile

    VendorProfile.objects.create(user=vendeur, business_name="Boutique retrait", phone="690112200", city="Yaoundé",
                                 status=VendorProfile.Status.APPROVED)
    c = APIClient()
    c.force_authenticate(vendeur)
    r = c.post("/api/vendors/withdrawals/create/", {"amount_xaf": 5000}, format="json")
    assert r.status_code == 409 and r.json()["code"] == "versement_du_vendredi"                 # D20, R22.2
    assert not PayoutRequest.objects.exists()


def test_la_course_de_retour_devient_une_creance_sur_le_vendeur():
    from apps.orders.models import Return
    from apps.orders.retours import attribuer_frais_de_retour

    o = commander([(offre(boutique("b_retour"), 14000), 1)])
    item = o.items.get()
    ret = Return.objects.create(order=o, order_item=item, requested_by=o.user, vendor=item.product.vendor,
                                reason="DAMAGED", inspection_passed=True)
    attribuer_frais_de_retour(ret)
    creance = Adjustment.objects.get(source_event=f"R69.1:retour-{ret.pk}")
    assert creance.direction == Adjustment.Direction.CREDIT and creance.amount_xaf == regles.reglage("r_retour")
    assert creance.status == Adjustment.Status.PENDING_APPROVAL                                  # approuvée par un tiers
    assert creance.payee == payee_for_vendor(item.product.vendor.vendor_profile)
