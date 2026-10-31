# Revue du 29 octobre 2026 — B5 : le verrou du plafond D32 ne disparaît jamais ; sans la ligne du réglage, la
# demande est refusée (traitement normal) et l'équipe est alertée.

import pytest

from tests.test_comptoir_d14 import _referentiel  # noqa: F401  (fixture)
from apps.payments.tests.bridge.test_checkout import _mock, configuration, plan_comptable  # noqa: F401,E402

pytestmark = pytest.mark.django_db


# ── B5 · le verrou du plafond D32 ne disparaît pas si le réglage manque ───────────────────────────────────

def test_b5_sans_la_ligne_du_reglage_la_demande_est_refusee(monkeypatch):
    from apps.orders.models import RemboursementAuto
    from apps.regles import services as regles
    from apps.regles.models import Reglage
    from tests import test_remboursement_auto_d32 as d32

    user = d32._client("c_b5")
    o = d32._commande_retiree(user)
    Reglage.objects.filter(nom="r_auto_rmb_plafond_mois").delete()
    vrai = regles.reglage                         # même si une valeur traînait en cache, la ligne manque
    monkeypatch.setattr(regles, "reglage", lambda nom: d32.PLAFOND if nom == "r_auto_rmb_plafond_mois" else vrai(nom))
    reponse = d32._reclamer(user, o)
    assert reponse["accorde"] is False
    assert RemboursementAuto.objects.get().statut == "REFUSE"
