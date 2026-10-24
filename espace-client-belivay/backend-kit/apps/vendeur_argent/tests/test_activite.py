# « Votre activité » (VD-04) : gardé par jour ou par mois sur les montants figés, carte jour × heure, objectif du mois ;
# propriétaire seulement.
import pytest

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


def test_activite_et_objectif():
    b = creer_boutique_vendeur()
    o = creer_offre(b)
    commande_client(o)
    ajouter_preparation(b)
    api = proprietaire(b)
    garde = CommandeVendeur.objects.get(boutique=b).garde
    a = api.get(f"{V}/seller/activity", {"period": "7d"}).json()
    assert len(a["serie"]) == 7 and a["total"] == garde and a["commandes"] == 1 and sum(map(sum, a["chaleur"])) == 1
    assert len(api.get(f"{V}/seller/activity", {"period": "12m"}).json()["serie"]) == 12
    assert api.put(f"{V}/seller/goal", {"amount": -1}, format="json").json()["raison"] == "montant"
    g = api.put(f"{V}/seller/goal", {"amount": 500000}, format="json").json()["objectif"]
    assert g["montant"] == 500000 and g["atteint"] == garde
    assert preparation(b).get(f"{V}/seller/activity").json()["error"]["code"] == "owner_only"
