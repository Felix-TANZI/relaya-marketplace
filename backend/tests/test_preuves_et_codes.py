# Feuille de route D11, D15 : codes de chaque changement de main et chaîne de garde (spec v2.1, R60, R66).
#
#   R66.1  codes de remise, de dépôt et de retrait ; r_code_essais essais faux bloquent le code r_code_blocage_h
#   D11    à domicile, la remise au client se fait avec le code que le client lit dans son suivi
#   D15    photo à chaque changement de main ; la responsabilité revient à l'acteur dont la preuve manque

from types import SimpleNamespace

import pytest
from django.contrib.auth.models import User
from rest_framework import serializers
from rest_framework.test import APIRequestFactory

from apps.accounts.models import CourierProfile, DeliveryOrganizationProfile
from apps.regles import services as regles
from apps.shipping import zones
from apps.shipping.models import RelayParcel, Shipment, ShipmentEvidence
from apps.shipping.preuves import chaine_de_garde
from apps.shipping.serializers import (
    CourierShipmentActionSerializer,
    RelayParcelReceiveSerializer,
    ShipmentSerializer,
)
from tests.test_commission_v21 import commander
from tests.test_frais_v21 import boutique, offre

pytestmark = pytest.mark.django_db


@pytest.fixture(autouse=True)
def _referentiel():
    regles.cache.delete(regles.CLE_CACHE)
    zones.synchroniser_zones()
    DeliveryOrganizationProfile.objects.create(
        user=User.objects.create_user(username="wink", password="p"), company_name="Wink", phone="1",
        city="YAOUNDE", zones=["Yaoundé"], status=DeliveryOrganizationProfile.Status.APPROVED, is_active=True)
    yield
    regles.cache.delete(regles.CLE_CACHE)


def _colis(relais, statut):
    o = commander([(offre(boutique(f"b{Shipment.objects.count()}"), 14000), 1)], relais=relais)
    colis = Shipment.objects.select_related("order").get(order=o)
    livreur = User.objects.create_user(username=f"livreur{colis.id}", password="p")
    colis.courier = CourierProfile.objects.create(user=livreur, phone="+237690000222", city="YAOUNDE",
                                                  id_card=f"CNI-{colis.id}", is_active=True, is_approved=True)
    colis.status = statut
    colis.save(update_fields=["courier", "status"])
    return colis


def _agir(colis, action, **codes):
    s = CourierShipmentActionSerializer(data={"action": action, **codes},
                                        context={"shipment": colis, "request": SimpleNamespace(user=colis.courier.user)})
    s.is_valid(raise_exception=True)
    return s.save()


def test_a_domicile_le_livreur_saisit_le_code_du_client():
    colis = _colis(False, Shipment.Status.OUT_FOR_DELIVERY)
    with pytest.raises(serializers.ValidationError, match="Code de livraison incorrect"):
        _agir(colis, "DELIVERED", delivery_code="")                                       # D11
    assert _agir(colis, "DELIVERED", delivery_code=colis.ensure_delivery_code()).status == Shipment.Status.DELIVERED


def test_trois_essais_faux_bloquent_le_code():
    colis = _colis(False, Shipment.Status.OUT_FOR_DELIVERY)
    bon = colis.ensure_delivery_code()
    faux = "000000" if bon != "000000" else "111111"
    for _ in range(regles.reglage("r_code_essais")):
        with pytest.raises(serializers.ValidationError):
            _agir(colis, "DELIVERED", delivery_code=faux)
    with pytest.raises(serializers.ValidationError, match="bloqué"):
        _agir(colis, "DELIVERED", delivery_code=bon)                                      # R66.1


def test_le_relais_receptionne_avec_le_code_de_depot():
    colis = _colis(True, Shipment.Status.PICKED_UP)
    relais = colis.order.relay_point
    sans_code = RelayParcelReceiveSerializer(data={"shipment_id": colis.id}, context={"relay_point": relais})
    sans_code.is_valid(raise_exception=True)
    with pytest.raises(serializers.ValidationError, match="Code de dépôt incorrect"):
        sans_code.save()                                                                  # R66.1
    avec_code = RelayParcelReceiveSerializer(data={"shipment_id": colis.id, "depot_code": colis.ensure_depot_code()},
                                             context={"relay_point": relais})
    avec_code.is_valid(raise_exception=True)
    assert avec_code.save().status == RelayParcel.Status.STORED


def test_un_colis_pour_un_relais_n_est_pas_livre_par_le_livreur():
    colis = _colis(True, Shipment.Status.OUT_FOR_DELIVERY)
    with pytest.raises(serializers.ValidationError, match="réceptionné par le gérant"):
        _agir(colis, "DELIVERED")


def test_chaque_code_n_est_vu_que_par_son_destinataire():
    domicile = _colis(False, Shipment.Status.OUT_FOR_DELIVERY)
    relais = _colis(True, Shipment.Status.PICKED_UP)
    requete = APIRequestFactory().get("/")

    requete.user = domicile.order.user
    assert ShipmentSerializer(domicile, context={"request": requete}).data["delivery_code"]          # D11
    requete.user = domicile.courier.user
    assert ShipmentSerializer(domicile, context={"request": requete}).data["delivery_code"] is None

    requete.user = relais.courier.user
    assert ShipmentSerializer(relais, context={"request": requete}).data["depot_code"]               # R66.2
    requete.user = relais.order.user
    assert ShipmentSerializer(relais, context={"request": requete}).data["depot_code"] is None


def test_la_preuve_manquante_designe_le_responsable():
    colis = _colis(False, Shipment.Status.OUT_FOR_DELIVERY)
    ShipmentEvidence.objects.create(shipment=colis, stage=ShipmentEvidence.Stage.COURIER_PICKUP_VENDOR,
                                    uploaded_by=colis.courier.user, actor_role="COURIER")
    _agir(colis, "DELIVERED", delivery_code=colis.ensure_delivery_code())
    chaine = chaine_de_garde(colis)
    assert chaine["responsable"] == "livreur"                                            # D15, R66.3
    assert chaine["etape_sans_preuve"] == "CUSTOMER_DELIVERY"
