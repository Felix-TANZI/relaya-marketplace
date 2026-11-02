# Feuille de route D10, D11, D12 : publication des colis et confidentialité du code de retrait (spec v2.1).
#
#   D10 / R52.1  à domicile, une course par client publiée tout de suite ; seuls les colis vers un relais attendent
#                le paquet (composeur de tournées)
#   D11 / R52.2  l'entreprise affecte son livreur ; un livreur ne se sert jamais lui-même
#   R52.1 / R74  l'entreprise ne voit que les colis des zones qu'elle déclare
#   D12 / R66.1  le relais ne voit jamais le code de retrait ; seul le client de la commande le voit

import pytest
from django.contrib.auth.models import User
from rest_framework.test import APIClient, APIRequestFactory

from apps.accounts.models import CourierProfile, DeliveryOrganizationProfile
from apps.regles import services as regles
from apps.shipping import entreprises, zones
from apps.shipping.models import RelayParcel, Shipment, Zone
from apps.shipping.serializers import RelayParcelSerializer, ShipmentSerializer
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


def test_a_domicile_la_course_est_publiee_tout_de_suite():
    o = commander([(offre(boutique(), 14000), 1)], relais=False)
    colis = Shipment.objects.get(order=o)
    assert colis.status != Shipment.Status.CREATED and colis.tournee_id is None   # D10 : jamais en attente d'un paquet
    assert colis.courier_id is None                                                # R52.2


def test_vers_un_relais_le_colis_attend_son_paquet():
    o = commander([(offre(boutique(), 14000), 1)])
    assert Shipment.objects.get(order=o).status == Shipment.Status.CREATED         # R52.1 : composeur de tournées


def _colis_au_relais(code="123456"):
    o = commander([(offre(boutique(), 14000), 1)])
    colis = Shipment.objects.get(order=o)
    parcel = RelayParcel.objects.get(shipment=colis)  # créé avec la commande, en attente au relais choisi
    parcel.pickup_code, parcel.status = code, RelayParcel.Status.RECEIVED
    parcel.save(update_fields=["pickup_code_chiffre", "pickup_code_empreinte", "status"])  # DP-02 : chiffré
    return parcel


def test_le_relais_ne_voit_jamais_le_code_de_retrait():
    parcel = _colis_au_relais()
    data = RelayParcelSerializer(parcel).data
    assert "pickup_code" not in data and data["pickup_ready"] is True              # R66.1


def test_seul_le_client_de_la_commande_voit_son_code():
    parcel = _colis_au_relais()
    requete = APIRequestFactory().get("/")
    requete.user = parcel.shipment.order.user
    assert ShipmentSerializer(parcel.shipment, context={"request": requete}).data["relay_parcel"]["pickup_code"] == "123456"
    requete.user = User.objects.create_user(username="autre", password="p")
    assert "pickup_code" not in ShipmentSerializer(parcel.shipment, context={"request": requete}).data["relay_parcel"]


def test_un_livreur_ne_se_sert_jamais_lui_meme():
    o = commander([(offre(boutique(), 14000), 1)], relais=False)
    colis = Shipment.objects.get(order=o)
    livreur = User.objects.create_user(username="livreur", password="p")
    CourierProfile.objects.create(user=livreur, phone="+237690000111", city="YAOUNDE", id_card="CNI-L",
                                  is_active=True, is_approved=True)
    client = APIClient()
    client.force_authenticate(livreur)
    disponibles = client.get("/api/shipping/available/").json()
    assert (disponibles if isinstance(disponibles, list) else disponibles["results"]) == []
    assert client.post(f"/api/shipping/available/{colis.id}/claim/").status_code == 403   # R52.2
    colis.refresh_from_db()
    assert colis.courier_id is None


def test_l_entreprise_ne_voit_que_les_zones_qu_elle_declare():
    o = commander([(offre(boutique(), 14000), 1)], relais=False)
    colis = Shipment.objects.select_related("order__zone").get(order=o)
    code = colis.order.zone.code
    autre = next(z.code for z in Zone.objects.exclude(code=code).exclude(code__isnull=True))
    seule_ici = DeliveryOrganizationProfile(company_name="ici", city="YAOUNDE", zones=[code])
    ailleurs = DeliveryOrganizationProfile(company_name="ailleurs", city="YAOUNDE", zones=[autre])
    assert entreprises.couvre(seule_ici, colis) and not entreprises.couvre(ailleurs, colis)   # R52.1, R74
