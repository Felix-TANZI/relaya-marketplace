# Partie 2 du rapport final, étape 12 : client absent (R51) et refus à la porte (R85).

from datetime import timedelta
from types import SimpleNamespace

import pytest
from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.accounts.models import RelayPointProfile, UserNotification
from apps.orders.absence import MESSAGE_R51_3, dus_au_relais, montant_refus_porte
from apps.regles import services as regles
from apps.shipping.appels import appeler
from apps.shipping.models import AppelMasque, RelayParcel, Shipment, ShipmentEvidence
from apps.shipping.serializers import CourierShipmentActionSerializer
from tests.test_apple_appel_d33 import OperateurDeTest  # noqa: F401  (opérateur d'appel de test)
from tests.test_preuves_et_codes import _colis, _referentiel  # noqa: F401  (fixture)

pytestmark = pytest.mark.django_db
OPERATEUR = "tests.test_apple_appel_d33.OperateurDeTest"


def _agir(colis, action, **donnees):
    s = CourierShipmentActionSerializer(data={"action": action, **donnees},
                                        context={"shipment": colis, "request": SimpleNamespace(user=colis.courier.user)})
    s.is_valid(raise_exception=True)
    return s.save()


def _relais_bastos():
    gerant = User.objects.create_user(username="gerant_bastos", password="p")
    return RelayPointProfile.objects.create(user=gerant, name="Relais Bastos", phone="1", manager_name="g",
                                            city="YAOUNDE", address="Bastos", zones=["Bastos"], opening_hours="8-18",
                                            status=RelayPointProfile.Status.APPROVED, is_active=True)


def _preuves(colis, appels=2, il_y_a_min=15):
    with override_settings(BELIVAY_APPELS=OPERATEUR):
        for _ in range(appels):
            appeler(colis, colis.courier.user)
    AppelMasque.objects.filter(shipment=colis).update(le=timezone.now() - timedelta(minutes=il_y_a_min))
    ShipmentEvidence.objects.create(shipment=colis, stage="CUSTOMER_ABSENT", uploaded_by=colis.courier.user,
                                    actor_role="COURIER",
                                    file=SimpleUploadedFile("porte.png", b"\x89PNG-porte", content_type="image/png"))


def test_absence_refusee_sans_les_preuves_de_r51_1():
    colis = _colis(False, Shipment.Status.OUT_FOR_DELIVERY)
    appeler(colis, colis.courier.user)                                                     # mode console
    appeler(colis, colis.courier.user)
    with pytest.raises(ValidationError) as e:
        _agir(colis, "ABSENT", latitude="3.88", longitude="11.51")
    assert "appels" in e.value.detail                                                      # console : pas une preuve
    _preuves(colis, il_y_a_min=3)
    with pytest.raises(ValidationError) as e:
        _agir(colis, "ABSENT", latitude="3.88", longitude="11.51")
    assert "attente" in e.value.detail                                                     # r_client_attente_min


def test_client_absent_colis_au_relais_de_sa_zone_et_frais_avant_retrait():
    relais = _relais_bastos()
    colis = _colis(False, Shipment.Status.OUT_FOR_DELIVERY)
    _preuves(colis)
    _agir(colis, "ABSENT", latitude="3.889", longitude="11.516")
    o = colis.order
    o.refresh_from_db()
    attendu = int(regles.moteur().frais_absence(["P"]))
    assert o.relay_point == relais and o.frais_absence_xaf == attendu                     # R51.2, R51.4
    assert RelayParcel.objects.get(shipment=colis).status == RelayParcel.Status.EXPECTED
    assert UserNotification.objects.filter(user=o.user, message=MESSAGE_R51_3.format(
        nom="Relais Bastos", frais_absence=attendu)).exists()                              # R51.3 mot pour mot
    assert dus_au_relais(o)["absence"] == attendu + o.frais_momo_absence_xaf               # R51.5 : avant le retrait


def test_sans_relais_disponible_le_colis_attend_a_l_agence():
    colis = _colis(False, Shipment.Status.OUT_FOR_DELIVERY)
    RelayPointProfile.objects.update(is_active=False)
    _preuves(colis)
    _agir(colis, "ABSENT", latitude="3.889", longitude="11.516")
    colis.refresh_from_db()
    colis.order.refresh_from_db()
    assert colis.status == Shipment.Status.INCIDENT                                        # R51.6
    assert colis.order.frais_absence_xaf == regles.reglage("r_absence_sup")


def test_refus_a_la_porte_rembourse_selon_r85_2():
    colis = _colis(False, Shipment.Status.OUT_FOR_DELIVERY)
    o = colis.order
    produits = sum(i.line_total_xaf for i in o.items.all())
    attendu = max(0, produits - (o.couverture_xaf * produits // o.subtotal_xaf if o.subtotal_xaf else 0)
                  - regles.reglage("r_refus_sup"))
    assert montant_refus_porte(colis) == attendu
    _agir(colis, "REFUS_PORTE", message="Le client ne veut plus du produit")
    colis.refresh_from_db()
    assert colis.status == Shipment.Status.FAILED
    assert UserNotification.objects.filter(user=o.user, title__startswith="Colis refusé").exists()


def test_deplacement_inutile_facture_au_vendeur():
    from apps.payments.settlements.models import Adjustment

    colis = _colis(False, Shipment.Status.ASSIGNED)
    _agir(colis, "DEPLACEMENT_INUTILE", message="Boutique fermée")
    a = Adjustment.objects.get(source_event=f"R85.3:colis-{colis.pk}")
    assert a.amount_xaf == regles.reglage("r_deplacement_inutile") and a.status == "PENDING_APPROVAL"
