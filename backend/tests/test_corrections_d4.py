# Revue du 29 octobre 2026 — groupe D, D4 (R34.5, badge « Meilleur prix »). Échoue avant la correction, passe après.

import pytest

from apps.payments.tests.bridge.test_checkout import (  # noqa: F401  (fixtures)
    _mock, configuration, plan_comptable, produit, vendeur,
)

pytestmark = pytest.mark.django_db


def test_d4_une_hausse_recente_retire_le_badge_meilleur_prix():
    from apps.catalog.flash import badge_meilleur_prix

    p = produit(vendeur("v_d4"), 10000)
    assert badge_meilleur_prix(p, le_moins_cher=True)
    assert not badge_meilleur_prix(p, le_moins_cher=False)
    p.price_xaf = 11500                                                        # +15 % en 7 j (R34.5)
    p.save()
    assert not badge_meilleur_prix(p, le_moins_cher=True)                      # même règle que les ventes flash
