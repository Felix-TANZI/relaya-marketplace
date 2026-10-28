# Entreprises de livraison (BV-DEV-05) : publication sans affectation (R52), plafonds (R56), couverture (R74, R59.3),
# codes de retrait (R66.1).

import pytest
from django.contrib.auth.models import User
from django.core.management import call_command

from apps.accounts.models import DeliveryOrganizationProfile, TrustScoreProfile, UserNotification
from apps.regles import services as regles
from apps.shipping import entreprises, zones
from apps.shipping.assignment import assign_shipment_or_mark_blocked
from apps.shipping.models import RelayPickupAttempt, Shipment
from apps.shipping.serializers import nouveau_code_de_retrait
from tests.test_commission_v21 import commander
from tests.test_frais_v21 import boutique, offre

pytestmark = pytest.mark.django_db


@pytest.fixture(autouse=True)
def _referentiel():
    regles.cache.delete(regles.CLE_CACHE)
    zones.synchroniser_zones()
    yield
    regles.cache.delete(regles.CLE_CACHE)


def entreprise(nom="wink", zones_=("Yaoundé",), assurance=False):
    return DeliveryOrganizationProfile.objects.create(
        user=User.objects.create_user(username=nom, password="p"), company_name=nom, phone="1", city="YAOUNDE",
        zones=list(zones_), transport_insurance_verified=assurance,
        status=DeliveryOrganizationProfile.Status.APPROVED, is_active=True)


def test_plafonds_des_paliers():
    assert entreprises.plafond_palier("NEW") == 75000 and entreprises.plafond_palier("CONFIRMED") == 250000   # R56.1
    assert entreprises.plafond_palier("GOLD") is None
    assert entreprises.plafond_effectif("GOLD", False) == 250000                                             # R56.2
    assert entreprises.plafond_effectif("GOLD", True) is None
    t = TrustScoreProfile(tier="CONFIRMED")
    assert t.parcel_value_cap_xaf == 250000


def test_zones_declarees_et_couverture():
    a = entreprise("a", ("Z1", "Biyem-Assi"))
    assert entreprises.zones_de(a) == {"Z1", "Z7"}
    entreprise("b", ("Yaoundé",))
    assert len(entreprises.zones_couvertes()) == 12


def test_belivay_publie_sans_affecter():
    entreprise()
    o = commander([(offre(boutique(), 14000), 1)])
    colis = Shipment.objects.get(order=o)
    assign_shipment_or_mark_blocked(colis)
    colis.refresh_from_db()
    assert colis.courier_id is None                                                                          # R52.2


def test_alerte_quand_une_zone_exploitee_manque_d_entreprises():
    entreprise("seule", ("Z1",))
    admin = User.objects.create_user(username="logistique", password="p", is_staff=True)
    call_command("couverture_zones")
    n = UserNotification.objects.get(user=admin)
    assert "Z3" in n.message and "Z1 (1)" in n.message                                                      # R59.3


def test_code_de_retrait_a_six_chiffres_et_blocage():
    code = nouveau_code_de_retrait()
    assert len(code) == 6 and code.isdigit()                                                                 # R66.1
    assert RelayPickupAttempt.max_essais() == 3 and RelayPickupAttempt.heures_blocage() == 24
