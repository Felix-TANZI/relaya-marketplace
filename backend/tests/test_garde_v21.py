# Garde au relais et colis non retiré (BV-DEV-01, A4) : apps/shipping/garde.py et process_relay_garde.

from datetime import timedelta
from unittest import mock

import pytest
from django.core.management import call_command
from django.utils import timezone
from rest_framework import serializers as drf

from apps.common.models import AuditLog
from apps.otp.prestataires import SmsConsole
from apps.regles import services as regles
from apps.shipping import garde, zones
from apps.shipping.models import RelayParcel
from apps.shipping.serializers import RelayParcelPickupSerializer
from tests.test_commission_v21 import commander
from tests.test_frais_v21 import boutique, offre

pytestmark = pytest.mark.django_db


@pytest.fixture(autouse=True)
def _referentiel():
    regles.cache.delete(regles.CLE_CACHE)
    zones.synchroniser_zones()
    SmsConsole.ENVOYES.clear()
    yield
    regles.cache.delete(regles.CLE_CACHE)


def commande_au_relais(heures_depuis_arrivee, prix=14000):
    o = commander([(offre(boutique(), prix), 1)])
    parcel = RelayParcel.objects.get(shipment__order=o)
    parcel.status = RelayParcel.Status.STORED
    parcel.received_at = timezone.now() - timedelta(hours=heures_depuis_arrivee)
    parcel.pickup_code = "ABC123"
    parcel.save()
    return o, parcel


def test_jour_et_garde_de_la_commande():
    o, parcel = commande_au_relais(50)                     # j = ⌊50 ÷ 24⌋ + 1 = 3
    g = garde.garde_commande(o)
    assert g["j"] == 3 and g["total"] == 200 == parcel.garde_fee_due()   # 0 + 100 + 100 (t_garde)
    assert garde.part_garde(3) == 300                      # R38.1 : jour 1 payé par BelivaY


def test_pas_de_garde_tant_qu_un_colis_est_attendu():
    o, parcel = commande_au_relais(50)
    RelayParcel.objects.filter(pk=parcel.pk).update(status=RelayParcel.Status.EXPECTED)
    assert garde.jour(o) is None


def _remettre(parcel, **donnees):
    s = RelayParcelPickupSerializer(data={"pickup_code": "ABC123", **donnees},
                                    context={"relay_point": parcel.relay_point, "user": parcel.relay_point.user})
    assert s.is_valid(), s.errors
    return s.save()


def test_la_remise_attend_l_encaissement_de_la_garde():
    o, parcel = commande_au_relais(50)
    with pytest.raises(drf.ValidationError):
        _remettre(parcel)                                  # R36.3 : bloquée sans confirmation
    _remettre(parcel, garde_encaissee_xaf=200)
    parcel.refresh_from_db()
    assert parcel.status == RelayParcel.Status.PICKED_UP and parcel.garde_encaissee_xaf == 200
    assert AuditLog.objects.filter(object_id=str(parcel.pk), changes__regle="R36.3").exists()


def test_rappel_du_jour_3_par_sms():
    o, parcel = commande_au_relais(50)
    call_command("process_relay_garde")
    assert len(SmsConsole.ENVOYES) == 1 and "200 F" in SmsConsole.ENVOYES[0]["texte"]
    call_command("process_relay_garde")                    # une seule fois
    assert len(SmsConsole.ENVOYES) == 1


def test_renvoi_apres_le_jour_7_et_remboursement_r39_2():
    o, parcel = commande_au_relais(7 * 24 + 1)             # j = 8
    with mock.patch("apps.payments.bridge.events_in.return_completed") as rembourser, \
            mock.patch("apps.payments.bridge.events_in.return_initiated"):
        call_command("process_relay_garde")
    parcel.refresh_from_db()
    assert parcel.status == RelayParcel.Status.RETURNED_TO_VENDOR
    # produits 14 000 − part de la couverture 0 − garde des 7 jours 2 000 (R39.2)
    assert rembourser.call_args.kwargs["refund_amount_xaf"] == 12000


def test_relais_sature_a_90_pour_cent_des_places():
    o, parcel = commande_au_relais(1)
    relais = parcel.relay_point
    relais.storage_capacity = 1
    relais.save()
    assert garde.places_occupees(relais) == 1 and garde.relais_sature(relais)          # R41.3
    relais.storage_capacity = 2
    relais.save()
    assert not garde.relais_sature(relais)
