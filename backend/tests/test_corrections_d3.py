# Revue du 29 octobre 2026 — groupe D, D3 (R71 en mois de calendrier). Échoue avant la correction, passe après.

from datetime import timedelta

import pytest
from django.utils import timezone

from apps.orders import remboursement_auto as rmb
from apps.orders.models import Dispute, Order
from apps.regles import services as regles
from tests.test_comptoir_d14 import _referentiel  # noqa: F401  (fixture)
from tests.test_r71_definitions import _fidele
from apps.payments.tests.bridge.test_checkout import _mock, configuration, plan_comptable  # noqa: F401,E402

pytestmark = pytest.mark.django_db


def test_d3_un_litige_perdu_il_y_a_362_jours_compte_encore_dans_les_12_mois():
    assert regles.reglage("r_palier_eleve_litige_mois") == 12                  # F : aucun litige perdu en 12 mois
    user = _fidele("c_d3")
    Order.objects.create(user=user, customer_phone="1", city="YAOUNDE", address="x",   # une livrée de plus : le
                         fulfillment_status=Order.FulfillmentStatus.DELIVERED)         # seuil tient sans elle
    assert rmb.palier_client(user) == "Élevé"
    il_y_a = timezone.now() - timedelta(days=362)                              # plus que 12 × 30 jours, moins d'un an
    Dispute.objects.create(order=Order.objects.filter(user=user).first(), opened_by=user, reason="DAMAGED",
                           resolution="REJECTED", resolved_at=il_y_a)
    assert rmb.palier_client(user) == "Standard"
