# Spec v2.1, R02.2 et R02.3 : le client paie les frais Mobile Money en plus de base_paiement. L'intention de
# paiement vaut total_a_payer ; la part des frais va entièrement à la plateforme, sans séquestre.

import pytest

from apps.payments.bridge.checkout_v2 import prepare_payment
from apps.payments.config.models import DistributionRule
from apps.payments.domain.exceptions import IncompleteDistribution
from apps.payments.tests.bridge.test_checkout import (  # noqa: F401  (fixtures)
    NUMERO, _mock, acheteur, commande, configuration, plan_comptable, produit, vendeur,
)

pytestmark = pytest.mark.django_db


def _commande_avec_frais_momo(acheteur):
    cmd = commande(acheteur, [(produit(vendeur("v1"), prix=14000), 1)], frais=900)
    cmd.frais_momo_xaf, cmd.total_a_payer_xaf = 305, 15205          # test L01 de BV-DEV-07
    cmd.save(update_fields=["frais_momo_xaf", "total_a_payer_xaf"])
    return cmd


def test_l_intention_vaut_le_total_a_payer(acheteur):
    DistributionRule.objects.create(
        config_key="dist-payment-fee-platform", name="Frais Mobile Money",
        component=DistributionRule.Component.PAYMENT_FEE, payee_type=DistributionRule.PayeeType.PLATFORM,
        basis=DistributionRule.Basis.REMAINDER, priority=10)
    cmd = _commande_avec_frais_momo(acheteur)
    intent = prepare_payment(cmd, payer_msisdn=NUMERO, payer_operator="MTN")
    assert intent.amount_xaf == 15205 == cmd.total_a_payer_xaf
    composants_sequestres = {h["component"] for h in intent.distribution_plan["holds"]}
    assert "PAYMENT_FEE" not in composants_sequestres                 # aucune attente : produit de la plateforme


def test_sans_regle_de_repartition_le_paiement_est_refuse(acheteur):
    cmd = _commande_avec_frais_momo(acheteur)
    with pytest.raises(IncompleteDistribution):
        prepare_payment(cmd, payer_msisdn=NUMERO, payer_operator="MTN")
