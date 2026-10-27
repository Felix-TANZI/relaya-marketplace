# Paiement par Mobile Money au comptoir du relais — feuille de route D14 ; spec v2.1, R42, R39.3, R40.4.

from datetime import timedelta

import pytest
from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework.test import APIClient, APIRequestFactory

from apps.accounts.models import UserNotification
from apps.orders import comptoir
from apps.orders.models import Order, SmsCommande
from apps.payments.application.collect import initiate_collect, poll_attempt
from apps.payments.bridge import vendredi
from apps.payments.bridge.checkout_v2 import CheckoutError, prepare_payment, prepare_payment_comptoir
from apps.payments.config.models import DistributionRule
from apps.payments.escrow.models import EscrowHold
from apps.payments.tests.bridge.test_checkout import _mock, configuration, plan_comptable  # noqa: F401  (fixtures)
from apps.regles import services as regles
from apps.shipping import zones
from apps.shipping.models import RelayParcel, Shipment
from tests.test_frais_v21 import boutique, offre, relais_biyem_assi

pytestmark = pytest.mark.django_db
NUMERO = "237677123456"


@pytest.fixture(autouse=True)
def _referentiel():
    from apps.accounts.models import DeliveryOrganizationProfile

    regles.cache.delete(regles.CLE_CACHE)
    zones.synchroniser_zones()
    DeliveryOrganizationProfile.objects.create(
        user=User.objects.create_user(username="wink", password="p"), company_name="Wink", phone="1",
        city="YAOUNDE", zones=["Yaoundé"], status=DeliveryOrganizationProfile.Status.APPROVED, is_active=True)
    DistributionRule.objects.create(
        config_key="dist-payment-fee-platform", name="Frais Mobile Money",
        component=DistributionRule.Component.PAYMENT_FEE, payee_type=DistributionRule.PayeeType.PLATFORM,
        basis=DistributionRule.Basis.REMAINDER, priority=10)
    yield
    regles.cache.delete(regles.CLE_CACHE)


def _client(nom="cli_cpt", livrees=0):
    client = User.objects.create_user(username=nom, password="p")
    for _ in range(livrees):
        Order.objects.create(user=client, customer_phone="1", city="YAOUNDE", address="x",
                             fulfillment_status=Order.FulfillmentStatus.DELIVERED)
    return client


def _commander(client, prix, relais=True, moyen="comptoir"):
    from apps.orders.serializers import OrderCreateSerializer

    requete = APIRequestFactory().post("/api/orders/")
    requete.user = client
    donnees = {"cart_items": [{"product_id": offre(boutique(f"b{User.objects.count()}"), prix).pk, "qty": 1}],
               "city": "YAOUNDE", "customer_phone": "+237699000001", "moyen": moyen}
    if relais:
        donnees.update(delivery_mode="PICKUP", relay_point_id=relais_biyem_assi().pk)
    else:
        donnees.update(delivery_mode="DELIVERY", district="Bastos", address="portail vert",
                       delivery_latitude=3.8935, delivery_longitude=11.5100)
    from rest_framework.exceptions import ValidationError

    s = OrderCreateSerializer(data=donnees, context={"request": requete})
    assert s.is_valid(), s.errors
    try:
        return s.save(), ""
    except ValidationError as exc:  # le devis est refusé à la création (R42.8)
        return None, str(exc.detail)


def _payer(intent):
    issue = initiate_collect(intent)
    poll_attempt(issue.attempt)
    poll_attempt(issue.attempt)


def test_l_avance_et_le_reste_sont_ceux_du_moteur():
    o, erreurs = _commander(_client(), 14000)
    assert o, erreurs
    c = o.frais_detail["comptoir"]
    assert o.paiement_comptoir and o.couverture_xaf == 0
    assert o.avance_xaf == c["avance"] == o.delivery_fee_xaf                          # R42.3, sans couverture
    assert o.reste_comptoir_xaf == c["au_comptoir"] == 14000                          # R42.4
    assert o.total_a_payer_xaf == c["avance"] + c["frais_momo_avance"]
    assert c["frais_momo_comptoir"] == regles.moteur().frais_momo(14000)              # R02.6


def test_les_refus_de_r42_8():
    o, erreurs = _commander(_client("c_dom"), 14000, relais=False)
    assert o is None and "comptoir_mode" in erreurs                                   # R42.1
    o, erreurs = _commander(_client("c_neuf"), regles.reglage("r_cpt_nouveau") + 1000)
    assert o is None and "comptoir_plafond" in erreurs                                # R42.2, nouveau client
    refuseur = _client("c_refus", livrees=1)
    for _ in range(regles.reglage("r_cpt_refus_max")):
        Order.objects.create(user=refuseur, customer_phone="1", city="YAOUNDE", address="x",
                             comptoir_refuse_le=timezone.now())
    o, erreurs = _commander(refuseur, 14000)
    assert o is None and "comptoir_refus" in erreurs                                  # R42.6
    o, erreurs = _commander(refuseur, 14000, moyen="momo")
    assert o, erreurs                                                                  # tout d'avance reste possible


def test_avance_puis_reste_au_comptoir_avec_la_livraison_offerte():
    o = _commander(_client("c_fidele", livrees=1), regles.reglage("r_seuil_relais"))[0]
    assert o.couverture_xaf > 0
    acompte = o.avance_xaf - o.delivery_fee_xaf
    assert acompte == regles.reglage("r_relais")                                      # R42.3

    avance = prepare_payment(o, payer_msisdn=NUMERO, payer_operator="MTN")
    assert avance.amount_xaf == o.total_a_payer_xaf
    with pytest.raises(CheckoutError):
        prepare_payment_comptoir(o, payer_msisdn=NUMERO, payer_operator="MTN")      # pas avant l'avance
    _payer(avance)
    o.refresh_from_db()
    assert o.payment_status == Order.PaymentStatus.VALIDATED and o.is_paid           # le vendeur prépare

    reste = prepare_payment_comptoir(o, payer_msisdn=NUMERO, payer_operator="MTN")
    assert reste.amount_xaf == o.reste_comptoir_xaf + o.frais_momo_comptoir_xaf
    _payer(reste)
    o.refresh_from_db()
    assert o.payment_status == Order.PaymentStatus.PAID and o.comptoir_paye_le
    marchandise = sum(h.gross_amount_xaf for h in EscrowHold.objects.filter(order_id=o.pk, component="GOODS"))
    assert marchandise == o.subtotal_xaf                                               # tout l'article au vendeur


def _au_relais(o):
    parcel = RelayParcel.objects.get(shipment=Shipment.objects.get(order=o))
    RelayParcel.objects.filter(pk=parcel.pk).update(status=RelayParcel.Status.STORED, **RelayParcel.champs_du_code("482913"),
                                                   received_at=timezone.now())
    parcel.refresh_from_db()
    return parcel


def _valide(nom="c_val"):
    o = _commander(_client(nom), 14000)[0]
    _payer(prepare_payment(o, payer_msisdn=NUMERO, payer_operator="MTN"))
    o.refresh_from_db()
    assert o.payment_status == Order.PaymentStatus.VALIDATED
    return o


def _gerant(parcel):
    c = APIClient()
    c.force_authenticate(parcel.relay_point.user)
    return c


def test_le_code_reste_invisible_jusqu_au_paiement_au_comptoir():
    o = _valide()
    parcel = _au_relais(o)
    assert comptoir.annoncer_retrait(o, parcel.pickup_code, parcel.relay_point.name) is False
    note = UserNotification.objects.filter(user=o.user).latest("id")
    assert "482913" not in note.message and "à payer au comptoir" in note.title       # R42.4
    assert not SmsCommande.objects.filter(order=o, sorte="code_retrait").exists()

    r = _gerant(parcel).post("/api/shipping/relay-point/pickup/", {"parcel_id": parcel.pk, "pickup_code": "482913"},
                             format="json")
    assert r.status_code == 400 and "comptoir" in r.json()                            # pas de remise avant paiement
    r = _gerant(parcel).get("/api/shipping/relay-point/parcels/")
    lignes = r.json()["results"] if isinstance(r.json(), dict) else r.json()
    ligne = next(p for p in lignes if p["id"] == parcel.pk)
    assert ligne["a_payer_comptoir_xaf"] == o.reste_comptoir_xaf + o.frais_momo_comptoir_xaf
    assert ligne["pickup_ready"] is False

    r = _gerant(parcel).post("/api/shipping/relay-point/comptoir/encaisser/", {"parcel_id": parcel.pk,
                                                                                "payer_msisdn": NUMERO,
                                                                                "payer_operator": "MTN"}, format="json")
    assert r.status_code == 200, r.json()
    from apps.payments.intents.models import PaymentIntent

    intent = PaymentIntent.objects.get(reference=r.json()["reference"])
    poll_attempt(intent.attempts.latest("id"))
    poll_attempt(intent.attempts.latest("id"))
    o.refresh_from_db()
    assert o.payment_status == Order.PaymentStatus.PAID
    assert "482913" in UserNotification.objects.filter(user=o.user).latest("id").message   # code révélé


def test_refus_au_comptoir_l_avance_est_gardee():
    o = _valide("c_ref")
    parcel = _au_relais(o)
    r = _gerant(parcel).post("/api/shipping/relay-point/comptoir/refus/", {"parcel_id": parcel.pk}, format="json")
    assert r.status_code == 200
    o.refresh_from_db()
    parcel.refresh_from_db()
    assert o.comptoir_refuse_le and parcel.status == RelayParcel.Status.RETURNED_TO_VENDOR   # R42.5
    assert comptoir.compte(o.user)["nb_refus"] == 1
    from apps.payments.settlements.models import Refund

    assert not Refund.objects.exists()                                                 # avance gardée
    r = _gerant(parcel).post("/api/shipping/relay-point/comptoir/refus/", {"parcel_id": parcel.pk}, format="json")
    assert r.status_code == 404                                                        # le colis est reparti


def test_colis_a_payer_non_retire_compte_comme_un_refus():
    from apps.shipping.management.commands.process_relay_garde import Command

    o = _valide("c_garde")
    parcel = _au_relais(o)
    Command()._renvoyer(o, [parcel], timezone.now())
    o.refresh_from_db()
    parcel.refresh_from_db()
    assert o.comptoir_refuse_le and parcel.non_retrait_processed_at                    # R39.3
    assert parcel.status == RelayParcel.Status.RETURNED_TO_VENDOR


def test_le_relais_touche_le_bonus_des_colis_payes_au_comptoir():
    o = _valide("c_bonus")
    parcel = _au_relais(o)
    debut = timezone.now() - timedelta(days=1)
    RelayParcel.objects.filter(pk=parcel.pk).update(status=RelayParcel.Status.PICKED_UP, picked_up_at=timezone.now())
    sans, _ = vendredi.montant_relais(parcel.relay_point, debut, timezone.now() + timedelta(hours=1))
    Order.objects.filter(pk=o.pk).update(comptoir_paye_le=timezone.now())
    avec, detail = vendredi.montant_relais(parcel.relay_point, debut, timezone.now() + timedelta(hours=1))
    assert avec - sans == regles.reglage("r_relais_comptoir_bonus")                   # R40.4
    assert "1 payé(s) au comptoir" in detail
