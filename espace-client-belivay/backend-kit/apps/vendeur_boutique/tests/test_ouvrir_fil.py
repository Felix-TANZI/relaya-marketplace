# messages.ouvrirFil (REP-03) : la conversation d'une commande, créée au besoin, anonyme.
import pytest

from apps.vendeur_core.anonymat import fuites
from apps.vendeur_core.tests.outils import commande_client, creer_boutique_vendeur, creer_offre, preparation, proprietaire

pytestmark = pytest.mark.django_db


def test_ouvrir_le_fil_d_une_commande():
    b = creer_boutique_vendeur()
    cc = commande_client(creer_offre(b))
    api = proprietaire(b)
    r = api.post("/api/vendors/threads", {"order_id": cc["ref"]}, format="json")
    assert r.status_code == 200
    fil = r.json()["fil"]
    assert api.post("/api/vendors/threads", {"order_id": cc["ref"]}, format="json").json()["fil"] == fil  # le même fil
    lu = preparation(b).get(f"/api/vendors/threads/{fil}").json()
    assert lu["fil"]["ref"] == cc["ref"]
    assert fuites(lu, valeurs_interdites=(cc["client"].first_name,)) == []
    assert api.post("/api/vendors/threads", {"order_id": "BLV-999999"}, format="json").status_code == 404
