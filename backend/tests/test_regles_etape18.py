# Règles pas encore tenues (étape 18, avant main 2) :
#
#   FF-FLASH  fermé, une vente flash ne fait plus le prix nulle part (liste, fiche, panier, commande), pas seulement la
#             vitrine des Flash Deals
#   R66.3     une photo à chaque changement de main, exigée par le serveur
#   DP-61     « jamais le vrai numéro » : la console d'appel ne garde que des numéros masqués ; sans opérateur branché,
#             `check --deploy` le signale
#   Droits    les écrans de gestion s'ouvrent par partie (support, fraude, logistique, conformité, litiges)

from types import SimpleNamespace

import pytest
from django.contrib.auth.models import Group, User
from rest_framework import serializers
from rest_framework.test import APIClient

from apps.catalog.models import Product, PromotionCampaign
from apps.catalog.offers import annotate_effective_price
from apps.catalog.serializers import ProductSerializer
from apps.client_core.models import Interrupteur
from apps.shipping.models import Shipment, ShipmentEvidence
from apps.shipping.serializers import CourierShipmentActionSerializer
from tests.aide_preuves import photo
from tests.test_flash_accueil_d9 import _campagne
from tests.test_frais_v21 import boutique, offre
from tests.test_preuves_et_codes import _colis, _referentiel  # noqa: F401  (fixture)

pytestmark = pytest.mark.django_db


# ── FF-FLASH ───────────────────────────────────────────────────────────────────────────────────────────────

def _prix(p):
    p = Product.objects.prefetch_related("promotion_campaigns").get(pk=p.pk)
    return ProductSerializer(p).data["price_final"], annotate_effective_price(Product.objects.filter(pk=p.pk)).get().effective_price


def test_flash_ferme_le_prix_flash_disparait_partout():
    p = offre(boutique("bf18"), 20000)
    _campagne(p, 17000, PromotionCampaign.CampaignType.REGULAR)
    _campagne(p, 15000)
    assert _prix(p) == (15000, 15000)                                                     # ouvert : flash d'abord
    Interrupteur.objects.create(code="FF-FLASH", ouvert=False)
    assert _prix(p) == (17000, 17000)                                                     # fermé : la promotion reste
    from apps.catalog.flash import flash_actives

    assert not flash_actives().exists()


# ── R66.3 ──────────────────────────────────────────────────────────────────────────────────────────────────

def _agir(colis, action, **codes):
    s = CourierShipmentActionSerializer(data={"action": action, **codes},
                                        context={"shipment": colis, "request": SimpleNamespace(user=colis.courier.user)})
    s.is_valid(raise_exception=True)
    return s.save()


def test_pas_de_ramassage_ni_de_livraison_sans_photo():
    colis = _colis(False, Shipment.Status.ASSIGNED)
    with pytest.raises(serializers.ValidationError, match="Photo obligatoire"):
        _agir(colis, "PICKED_UP", pickup_code=colis.ensure_pickup_confirmation_code())
    sans_fichier = ShipmentEvidence.objects.create(shipment=colis, stage=ShipmentEvidence.Stage.COURIER_PICKUP_VENDOR,
                                                   uploaded_by=colis.courier.user, actor_role="COURIER")
    with pytest.raises(serializers.ValidationError, match="Photo obligatoire"):          # une preuve vide ne compte pas
        _agir(colis, "PICKED_UP", pickup_code=colis.ensure_pickup_confirmation_code())
    sans_fichier.delete()
    photo(colis, ShipmentEvidence.Stage.COURIER_PICKUP_VENDOR, colis.courier.user)
    assert _agir(colis, "PICKED_UP", pickup_code=colis.ensure_pickup_confirmation_code()).status == "PICKED_UP"

    domicile = _colis(False, Shipment.Status.OUT_FOR_DELIVERY)
    with pytest.raises(serializers.ValidationError, match="Photo obligatoire"):
        _agir(domicile, "DELIVERED", delivery_code=domicile.ensure_delivery_code())
    essais = Shipment.objects.get(pk=domicile.pk).codes_essais
    assert not essais.get("livraison")                                                    # aucun essai de code consommé


def test_pas_de_reception_au_relais_sans_photo_mais_la_photo_peut_partir_avant():
    from apps.shipping.models import RelayParcel
    from apps.shipping.serializers import RelayParcelReceiveSerializer

    colis = _colis(True, Shipment.Status.PICKED_UP)
    relais = colis.order.relay_point
    relais.is_active, relais.status = True, relais.Status.APPROVED
    relais.save(update_fields=["is_active", "status"])
    s = RelayParcelReceiveSerializer(data={"shipment_id": colis.id, "depot_code": colis.ensure_depot_code()},
                                     context={"relay_point": relais})
    s.is_valid(raise_exception=True)
    with pytest.raises(serializers.ValidationError, match="Photo obligatoire"):
        s.save()
    c = APIClient()
    c.force_authenticate(relais.user)
    from django.core.files.uploadedfile import SimpleUploadedFile

    r = c.post("/api/shipping/relay-point/evidence/", {
        "shipment_id": colis.id, "stage": "RELAY_RECEIVED",
        "file": SimpleUploadedFile("r.png", b"\x89PNG\r\n\x1a\n-reception", content_type="image/png")},
        format="multipart")
    assert r.status_code == 201, r.content                                                # avant la réception
    s = RelayParcelReceiveSerializer(data={"shipment_id": colis.id, "depot_code": colis.ensure_depot_code()},
                                     context={"relay_point": relais})
    s.is_valid(raise_exception=True)
    assert s.save().status == RelayParcel.Status.STORED


# ── DP-61 ──────────────────────────────────────────────────────────────────────────────────────────────────

def test_la_console_ne_garde_jamais_le_vrai_numero(settings):
    from apps.shipping import appels

    appels.AppelConsole.APPELS.clear()
    appels.AppelConsole().relier("+237677123441", "+237699887766", "ref")
    assert "677123441" not in str(appels.AppelConsole.APPELS) and "699887766" not in str(appels.AppelConsole.APPELS)
    assert appels.operateur_d_appel_branche()[0].id == "shipping.E061"                   # signalé avant déploiement
    settings.BELIVAY_APPELS = "un.operateur.Branche"
    assert appels.operateur_d_appel_branche() == []


# ── Droits par partie ──────────────────────────────────────────────────────────────────────────────────────

def test_chaque_ecran_de_gestion_a_sa_partie():
    def client(*groupes):
        u = User.objects.create_user(f"g{User.objects.count()}", password="p", is_staff=True)
        for g in groupes:
            u.groups.add(Group.objects.get_or_create(name=g)[0])
        c = APIClient()
        c.force_authenticate(u)
        return c

    support, fraude = client("gestion-support"), client("gestion-fraude")
    assert support.get("/api/auth/admin/support/").status_code == 200
    assert support.get("/api/auth/admin/fraud/").status_code == 403
    assert fraude.get("/api/auth/admin/fraud/").status_code == 200
    assert fraude.get("/api/auth/admin/kyc/pieces/").status_code == 403
    assert client("gestion-conformite").get("/api/auth/admin/kyc/pieces/").status_code == 200
    assert client("gestion-logistique").get("/api/auth/admin/couriers/overview/").status_code == 200
    assert client().get("/api/orders/admin/remboursements-auto/").status_code == 403
    assert client("gestion-litiges").get("/api/orders/admin/remboursements-auto/").status_code == 200
    assert set(Group.objects.filter(name__startswith="gestion-").values_list("name", flat=True)) >= {
        "gestion-support", "gestion-fraude", "gestion-logistique", "gestion-conformite", "gestion-litiges"}
