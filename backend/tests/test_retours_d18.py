# Feuille de route D18 : retours, litiges et remboursements (spec v2.1, R67 à R70).

from datetime import timedelta

# `/dev/null` n'existe pas sous Windows, ou les postes de l'equipe
# tournent : `StringIO` fait la meme chose partout, et ne laisse pas un
# fichier ouvert derriere lui.
from io import StringIO

import pytest
from django.contrib.auth.models import User
from django.core.management import call_command
from django.utils import timezone

from apps.orders import retours
from apps.orders.models import Dispute, DisputeEvidenceRequest, Return
from apps.regles import services as regles
from apps.shipping import zones
from apps.shipping.models import Shipment, ShipmentEvent
from apps.vendors import vd07_constants as C
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


def _livree(il_y_a):
    o = commander([(offre(boutique(f"b{User.objects.count()}"), 14000), 1)], relais=False)
    colis = Shipment.objects.get(order=o)
    ev = ShipmentEvent.record(shipment=colis, status=Shipment.Status.DELIVERED, message="remis", location="Yaounde",
                              actor_role="COURIER")
    ShipmentEvent.objects.filter(pk=ev.pk).update(created_at=timezone.now() - il_y_a)
    return o


def test_retour_sur_motif_dans_les_7_jours_apres_le_retrait():
    o = _livree(timedelta(days=2))
    assert retours.refus_de_retour(o, "DAMAGED") is None                                        # R67.1
    assert "sur motif seulement" in retours.refus_de_retour(o, "OTHER")
    tard = _livree(timedelta(days=regles.reglage("r_retour_j") + 1))
    assert "délai" in retours.refus_de_retour(tard, "DAMAGED")


def test_defaut_cache_dans_les_48_h():
    assert retours.refus_de_retour(_livree(timedelta(hours=20)), "HIDDEN_DEFECT") is None        # R67.2
    assert "48 h" in retours.refus_de_retour(_livree(timedelta(hours=49)), "HIDDEN_DEFECT")


def test_les_delais_viennent_des_reglages():
    assert C.RET_FENETRE_J == 7 and C.RET_INSPECTION_H == 48 and C.RET_TRAJET == 500 and C.LIT_VENDEUR_H == 48
    assert C.regles_litiges_payload()["fenetreJ"] == 7


def _retour(o, **champs):
    item = o.items.get()
    return Return.objects.create(order=o, order_item=item, requested_by=o.user, vendor=item.product.vendor,
                                 reason="DAMAGED", **champs)


def test_remboursement_d_office_sans_inspection():
    o = _livree(timedelta(days=1))
    ret = _retour(o, status=Return.Status.RECEIVED,
                  received_at=timezone.now() - timedelta(hours=regles.reglage("r_inspection_h") + 1))
    call_command("traiter_retours", stdout=StringIO())
    ret.refresh_from_db()
    assert ret.status == Return.Status.REFUNDED and ret.refund_amount_xaf == 14000              # R68.1


def test_course_de_retour_a_la_partie_en_tort():
    o = _livree(timedelta(days=1))
    ret = _retour(o, inspection_passed=False)
    retours.attribuer_frais_de_retour(ret)
    assert (ret.frais_retour_xaf, ret.frais_retour_partie) == (500, "client")                  # R69.1
    ret2 = _retour(o, inspection_passed=True)
    retours.attribuer_frais_de_retour(ret2)
    assert ret2.frais_retour_partie in ("vendeur", "transporteur", "relais")                    # gratuite pour le client


def test_silence_du_client_clot_le_litige():
    o = _livree(timedelta(days=1))
    item = o.items.get()
    d = Dispute.objects.create(order=o, order_item=item, opened_by=o.user, reason="DAMAGED", status="IN_PROGRESS")
    staff = User.objects.create_user(username="arbitre", password="p", is_staff=True)
    demande = DisputeEvidenceRequest.objects.create(dispute=d, recipient_role="CLIENT", requested_from=o.user,
                                                    requested_by=staff, instructions="Photo du colis")
    DisputeEvidenceRequest.objects.filter(pk=demande.pk).update(
        created_at=timezone.now() - timedelta(days=regles.reglage("r_litige_silence_j") + 1))
    call_command("check_dispute_silence", stdout=StringIO())
    d.refresh_from_db()
    assert d.status == "CLOSED"                                                                 # R70.2
