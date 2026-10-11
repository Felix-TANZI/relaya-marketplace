# Ramassages (AJ-B : passages d'une période) et colis pas prêt au passage du livreur (INTERFACES.md, P-6).
import pytest

from apps.vendeur_core import horloge
from apps.vendeur_core.models import CommandeVendeur
from apps.vendeur_core.tests.outils import (
    ajouter_preparation,
    commande_client,
    creer_boutique_vendeur,
    creer_offre,
    preparation,
    proprietaire,
)

pytestmark = pytest.mark.django_db
V = "/api/vendors"
J = 86_400_000


def test_ramassages_et_colis_non_pret():
    b = creer_boutique_vendeur()
    o = creer_offre(b)
    r = commande_client(o)
    c = CommandeVendeur.objects.get(order_id=r["order_id"])
    ajouter_preparation(b)
    api = proprietaire(b)
    t = horloge.maintenant_ms()
    assert [x["ref"] for x in api.get(f"{V}/pickups", {"from": t - J, "to": t + 7 * J}).json()] == [c.ref]
    assert api.get(f"{V}/pickups", {"from": t + 30 * J, "to": t + 31 * J}).json() == []
    assert api.post(f"{V}/orders/{c.ref}/not-ready", {"raison": "autre"}, format="json").status_code == 400
    n = preparation(b).post(f"{V}/orders/{c.ref}/not-ready", {"raison": "en_cours"}, format="json").json()
    assert n["ok"] and n["remise"]["ref"] == c.ref
    ev = api.get(f"{V}/events").json()["evenements"]
    assert ev[-1]["type"] == "colis_non_pret" and ev[-1]["vers"] == "livreur"
    assert api.get(f"{V}/orders/{c.ref}/journal").json()[0]["action"].startswith("Colis pas prêt")
