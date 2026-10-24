# Remboursement automatique sans retour du colis — feuille de route D32 ; spec v2.1, R71, R72.1.

import hashlib

import pytest
from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import UserNotification
from apps.orders.models import Order, RemboursementAuto
from apps.payments.bridge.checkout_v2 import prepare_payment
from apps.payments.escrow.models import EscrowHold
from apps.payments.ledger import chart_of_accounts as coa
from apps.payments.ledger.balances import balance
from apps.regles import services as regles
from apps.shipping.models import RelayParcel, Shipment, ShipmentEvidence
from tests.test_comptoir_d14 import NUMERO, _commander, _payer, _referentiel  # noqa: F401  (fixture)
from apps.payments.tests.bridge.test_checkout import _mock, configuration, plan_comptable  # noqa: F401,E402

pytestmark = pytest.mark.django_db
PHOTO_REMISE = b"\x89PNG\r\n\x1a\n-remise-au-comptoir"
PLAFOND = 100000


@pytest.fixture
def ouvert(monkeypatch):
    vrai = regles.reglage
    reglages = {"r_auto_rmb_plafond_mois": PLAFOND}
    monkeypatch.setattr(regles, "reglage", lambda nom: reglages.get(nom, vrai(nom)) if nom in reglages else vrai(nom))
    return reglages


def _client(nom, livrees=None):
    user = User.objects.create_user(username=nom, password="p")
    for _ in range(regles.reglage("r_auto_rmb_cmd") if livrees is None else livrees):
        Order.objects.create(user=user, customer_phone="1", city="YAOUNDE", address="x",
                             fulfillment_status=Order.FulfillmentStatus.DELIVERED)
    return user


def _commande_retiree(user, prix=None):
    """Une commande au relais, payée par Mobile Money, retirée à l'instant, avec la photo de la remise (D15).
    Par défaut l'article vaut r_auto_rmb_max : le plus cher qui reste éligible (R71.1), au-dessus du panier minimum."""
    o, erreurs = _commander(user, prix or regles.reglage("r_auto_rmb_max"), moyen="momo")
    assert o, erreurs
    _payer(prepare_payment(o, payer_msisdn=NUMERO, payer_operator="MTN"))
    colis = Shipment.objects.get(order=o)
    RelayParcel.objects.filter(shipment=colis).update(status=RelayParcel.Status.PICKED_UP, picked_up_at=timezone.now())
    ShipmentEvidence.objects.create(
        shipment=colis, stage="RELAY_RELEASED", uploaded_by=colis.relay_parcel.relay_point.user,
        actor_role="RELAY_POINT", file=SimpleUploadedFile("remise.png", PHOTO_REMISE, content_type="image/png"),
        sha256=hashlib.sha256(PHOTO_REMISE).hexdigest())
    Order.objects.filter(pk=o.pk).update(fulfillment_status=Order.FulfillmentStatus.DELIVERED)
    o.refresh_from_db()
    return o


def _reclamer(user, o, photo=b"\x89PNG\r\n\x1a\n-article-casse"):
    c = APIClient()
    c.force_authenticate(user)
    fichiers = [SimpleUploadedFile(f"p{i}.png", photo + bytes([i]) if photo != PHOTO_REMISE else photo,
                                   content_type="image/png") for i in range(2)]
    r = c.post(f"/api/orders/{o.pk}/disputes/", {"reason": "DAMAGED", "description": "Écran fêlé",
                                                  "order_item": o.items.get().pk, "files": fichiers},
               format="multipart")
    assert r.status_code == 201, r.content
    return r.json()["remboursement_auto"]


def test_ferme_tant_que_le_plafond_mensuel_vaut_zero():
    user = _client("c_ferme")
    reponse = _reclamer(user, _commande_retiree(user))
    assert reponse["accorde"] is False and "pas ouvert" in reponse["raison"]
    assert RemboursementAuto.objects.get().statut == "REFUSE"                                  # journalisé


def test_accorde_paye_par_belivay_le_vendeur_paye_normalement(ouvert):
    user = _client("c_ok")
    o = _commande_retiree(user)
    reponse = _reclamer(user, o)
    assert reponse["accorde"] is True, reponse
    cas = RemboursementAuto.objects.get()
    item = o.items.get()
    frais = (o.frais_momo_xaf * item.line_total_xaf) // o.total_xaf
    assert (cas.article_xaf, cas.frais_momo_xaf, cas.statut) == (item.line_total_xaf, frais, "VERSE")  # R71.1, R72.1
    assert balance(coa.EXPENSE_AUTO_REFUND) == cas.total_xaf                                  # R71.3 : BelivaY paie
    o.refresh_from_db()
    assert o.fulfillment_status == Order.FulfillmentStatus.DELIVERED
    assert not EscrowHold.objects.filter(order_id=o.pk, status=EscrowHold.Status.FROZEN).exists()   # vendeur payé
    assert o.disputes.get().resolution == "REFUND"


def test_limites_par_personne_et_anciennete(ouvert):
    user = _client("c_limite")
    assert _reclamer(user, _commande_retiree(user))["accorde"] is True
    deuxieme = _reclamer(user, _commande_retiree(user))
    assert deuxieme["accorde"] is False and "30 jours" in deuxieme["raison"]                 # R71.2
    novice = _client("c_novice", livrees=regles.reglage("r_auto_rmb_cmd") - 1)
    assert "commandes livrées" in _reclamer(novice, _commande_retiree(novice))["raison"]


def test_montant_et_photo_de_la_remise(ouvert):
    user = _client("c_cher")
    trop = _reclamer(user, _commande_retiree(user, prix=regles.reglage("r_auto_rmb_max") + 500))
    assert trop["accorde"] is False and "montant" in trop["raison"]                           # R71.1
    malin = _client("c_malin")
    doute = _reclamer(malin, _commande_retiree(malin), photo=PHOTO_REMISE)
    assert doute["accorde"] is False and "remise" in doute["raison"]                          # D32 : doute


def test_plafond_mensuel_puis_alerte(ouvert):
    ouvert["r_auto_rmb_plafond_mois"] = 100
    User.objects.create_user(username="admin_d32", password="p", is_staff=True)
    user = _client("c_plafond")
    reponse = _reclamer(user, _commande_retiree(user))
    assert reponse["accorde"] is False and "Plafond mensuel" in reponse["raison"]
    assert UserNotification.objects.filter(user__username="admin_d32", title__startswith="Plafond mensuel").exists()


def test_droit_retire_apres_validation_humaine(ouvert):
    user = _client("c_abus")
    chef, adjoint = (User.objects.create_user(n, password="p", is_staff=True) for n in ("ad1", "ad2"))
    c1, c2 = APIClient(), APIClient()
    c1.force_authenticate(chef)
    c2.force_authenticate(adjoint)
    d = c1.post("/api/orders/admin/remboursements-auto/retraits/", {"client": "c_abus", "motif": "Abus"},
                format="json").json()
    assert c1.post(f"/api/orders/admin/remboursements-auto/retraits/{d['id']}/valider/").status_code == 403
    assert c2.post(f"/api/orders/admin/remboursements-auto/retraits/{d['id']}/valider/").status_code == 200
    reponse = _reclamer(user, _commande_retiree(user))
    assert reponse["accorde"] is False and "retiré" in reponse["raison"]
    suivi = c2.get("/api/orders/admin/remboursements-auto/").json()
    assert suivi["plafond_mois_xaf"] == PLAFOND and suivi["cas"][0]["raison"]
