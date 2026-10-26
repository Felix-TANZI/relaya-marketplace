# Partie 2 du rapport final, étape 11 : la bascule côté argent — spec v2.1, R35.3, R35.4, R35.5, R25.2, R72.1.
# Commandes réellement payées (prestataire de test) : les séquestres existent, et l'équation I8 doit tenir.

import pytest

from apps.orders.bascule import RUPTURE, declencher
from apps.orders.models import Order
from apps.payments.application.collect import initiate_collect, poll_attempt
from apps.payments.bridge.checkout_v2 import prepare_payment
from apps.payments.config.models import DistributionRule
from apps.payments.escrow.models import EscrowHold
from apps.payments.ledger.invariants import check_escrow_equation
from apps.payments.settlements.models import Adjustment, Refund
from apps.payments.tests.bridge.test_checkout import _mock, configuration, plan_comptable  # noqa: F401  (fixtures)
from tests.test_meilleure_offre_v21 import _commande, _referentiel, fiche, offre  # noqa: F401  (fixtures)

pytestmark = pytest.mark.django_db
NUMERO = "237677123456"


@pytest.fixture(autouse=True)
def _frais_momo():
    DistributionRule.objects.create(
        config_key="dist-payment-fee-platform", name="Frais Mobile Money",
        component=DistributionRule.Component.PAYMENT_FEE, payee_type=DistributionRule.PayeeType.PLATFORM,
        basis=DistributionRule.Basis.REMAINDER, priority=10)


def _payee(produit):
    o = _commande(produit).save()
    intent = prepare_payment(o, payer_msisdn=NUMERO, payer_operator="MTN")
    issue = initiate_collect(intent)
    poll_attempt(issue.attempt)
    poll_attempt(issue.attempt)
    o.refresh_from_db()
    assert o.payment_status == Order.PaymentStatus.PAID
    assert EscrowHold.objects.filter(order_id=o.pk, component="GOODS").exists()
    return o


def _sequestre(o, vendeur_user):
    from apps.payments.bridge.actors import payee_for_vendor

    return EscrowHold.objects.get(order_id=o.pk, component="GOODS", payee=payee_for_vendor(vendeur_user.vendor_profile))


def test_remplacant_moins_cher_sequestre_reattribue_et_difference_au_client(fiche):
    defaillante = offre(fiche, "m1", 12000)
    o = _payee(defaillante)
    ancien = _sequestre(o, defaillante.vendor)
    fiable = offre(fiche, "m2", 11950, trust=90)
    assert declencher(o, defaillante.vendor, RUPTURE)["remplaces"] == 1
    ancien.refresh_from_db()
    assert ancien.status == "REFUNDED" and ancien.payable_amount_xaf == 0                 # plus rien au défaillant
    nouveau = _sequestre(o, fiable.vendor)
    assert nouveau.status == "HELD" and nouveau.gross_amount_xaf == 11950                  # R35.5 : versé normalement
    remboursement = Refund.objects.get(intent=nouveau.intent)
    assert remboursement.amount_xaf == 50 and remboursement.status == "PENDING_APPROVAL"   # R35.3, approuvé par un tiers
    assert check_escrow_equation().status == "OK"                                          # I8


def test_remplacant_plus_cher_belivay_avance_et_reprend_sur_le_defaillant(fiche):
    defaillante = offre(fiche, "p1", 12000)
    o = _payee(defaillante)
    fiable = offre(fiche, "p2", 12050, trust=90)
    assert declencher(o, defaillante.vendor, RUPTURE)["remplaces"] == 1
    assert _sequestre(o, fiable.vendor).gross_amount_xaf == 12050
    creance = Adjustment.objects.get(category="REBILLING")
    assert creance.amount_xaf == 50 and creance.direction == Adjustment.Direction.CREDIT   # R25.2
    from apps.payments.bridge.actors import payee_for_vendor

    assert creance.payee == payee_for_vendor(defaillante.vendor.vendor_profile)
    assert not Refund.objects.exists()                                                     # le client paie son prix
    assert check_escrow_equation().status == "OK"


def test_hors_chemin_sur_le_garde_fou_reste(fiche):
    """Commande non passée par le module financier : rien à réattribuer, le séquestre éventuel est gelé et l'équipe
    alertée, comme avant."""
    from apps.accounts.models import UserNotification

    defaillante = offre(fiche, "h1", 12000)
    o = _commande(defaillante).save()
    o.confirm_payment()
    offre(fiche, "h2", 11950, trust=90)
    from django.contrib.auth.models import User

    User.objects.create_user(username="admin_r35", password="p", is_staff=True)
    declencher(o, defaillante.vendor, RUPTURE)
    assert UserNotification.objects.filter(title__startswith="Bascule à régler à la main").exists()
