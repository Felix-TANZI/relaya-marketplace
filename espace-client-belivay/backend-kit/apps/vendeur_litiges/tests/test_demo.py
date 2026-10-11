# Démo : les deux litiges et le retour du jeu d'essai, ouverts par aftersales sur les commandes de démo du socle.
import pytest

from apps.aftersales.models import Litige
from apps.client_core.tests.outils import creer_relais
from apps.vendeur_core import demo as socle_demo
from apps.vendeur_core.tests.outils import proprietaire
from apps.vendeur_litiges import demo

pytestmark = pytest.mark.django_db


def test_demo_idempotente():
    creer_relais()
    b = socle_demo.charger()
    demo.charger(b)
    demo.charger(b)
    assert Litige.objects.count() == 3
    api = proprietaire(b)
    litiges = api.get("/api/vendors/disputes").json()
    assert [x["ref"] for x in litiges] == ["BLV-260905", "BLV-260906"]
    assert litiges[0]["motif"] == "Ce n’est pas le bon produit" and [p["photo"] for p in litiges[0]["photosClient"]] == ["counter", "box"]
    assert [p["quoi"] for p in litiges[0]["preuves"]] == ["ramassage", "scelle"]
    [r] = api.get("/api/vendors/returns").json()
    assert r["ref"] == "BLV-260904" and r["etat"] == "en_route" and r["signalement"] == {"heures": 30, "limiteH": 48, "recevable": True}
    assert r["arrivee"] is not None
