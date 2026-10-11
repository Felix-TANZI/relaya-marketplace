# Stock et inventaire, Livraison et colis (AJ-A, DP-58) : gestes signés, droit produits.stock, aucun prix pour un
# employé, seuil et réglages au propriétaire, défauts appliqués à toute offre créée, classe calculée par les mesures.
import itertools

import pytest

from apps.vendeur_core.models import Offre
from apps.vendeur_core.tests.outils import (
    ajouter_preparation,
    commande_client,
    creer_boutique_vendeur,
    creer_fiche,
    creer_offre,
    preparation,
    proprietaire,
)

pytestmark = pytest.mark.django_db
V = "/api/vendors"
_n = itertools.count(1)


def cle() -> dict:
    return {"HTTP_IDEMPOTENCY_KEY": f"essai-stock-{next(_n):06d}"}


def test_inventaire_mouvements_ajuster_exporter():
    b = creer_boutique_vendeur()
    o = creer_offre(b, stock=3, seuil_alerte=5)
    creer_offre(b, fiche=creer_fiche("iPhone 15", variantes=("256 Go",)), variante="256 Go", stock=0)
    ajouter_preparation(b)
    api, prep = proprietaire(b), preparation(b)
    commande_client(o)
    inv = api.get(f"{V}/stock").json()
    assert [x["alerte"] for x in inv["lignes"]] == ["rupture", "sous_seuil"] and inv["compteurs"]["ruptures"] == 1
    ligne = inv["lignes"][1]
    assert ligne["reserve"] == 1 and ligne["ventes30j"] == 1 and ligne["conseilReappro"] > 0 and inv["valeur"] > 0
    pinv = prep.get(f"{V}/stock").json()
    assert pinv["valeur"] is None and all(x["prix"] is None for x in pinv["lignes"])
    ajuster = lambda api_, **c: api_.post(f"{V}/stock/{o.pk}/adjust", c, format="json", **cle()).json()  # noqa: E731
    assert ajuster(api, nouveau=1, type="reappro")["raison"] == "stock"
    assert ajuster(api, nouveau=4, type="correction", note="x" * 121)["raison"] == "note"
    r = ajuster(prep, nouveau=12, type="reappro", note="Carton reçu")
    assert r["ok"] and r["mouvement"]["auteur"] == "Aïcha N." and (r["mouvement"]["avant"], r["mouvement"]["apres"]) == (2, 12)
    mv = api.get(f"{V}/stock/movements", {"offer": o.pk}).json()
    assert [m["type"] for m in mv] == ["reappro", "vente"] and mv[1]["apres"] == 2
    assert prep.put(f"{V}/stock/{o.pk}/threshold", {"seuil": 3}, format="json").json()["raison"] == "reserve"
    assert api.put(f"{V}/stock/{o.pk}/threshold", {"seuil": 3}, format="json").json()["ligne"]["seuil"] == 3
    assert "prix" not in prep.get(f"{V}/stock/export").content.decode().splitlines()[0]
    assert api.get(f"{V}/stock/export").content.decode().splitlines()[0].endswith(";prix")


def test_livraison_defauts_produit_creneaux_relais():
    from apps.client_core.tests.outils import creer_relais

    b = creer_boutique_vendeur()
    r1, r2, r3, r4 = (creer_relais(f"Relais {i}", "Melen") for i in range(4))
    o = creer_offre(b)
    ajouter_preparation(b)
    api, prep = proprietaire(b), preparation(b)
    g = prep.get(f"{V}/delivery-settings").json()
    assert g["peutRegler"] is False and g["defauts"]["colis"] == "S" and g["defauts"]["paiementAuRetrait"] is True
    assert prep.put(f"{V}/delivery-settings", {"colis": "M"}, format="json").json()["raison"] == "reserve"
    assert api.put(f"{V}/delivery-settings", {"delaiH": 5}, format="json").json()["raison"] == "delai"
    d = api.put(f"{V}/delivery-settings", {"colis": "M", "paiementAuRetrait": False}, format="json").json()["reglages"]["defauts"]
    assert d["colis"] == "M" and d["paiementAuRetrait"] is False
    nouveau = api.post(f"{V}/offers", {"ficheId": str(creer_fiche("Coque").pk)}, format="json", **cle()).json()
    n = Offre.objects.get(pk=nouveau["brouillonId"])
    assert (n.colis, n.paiement_au_retrait) == ("M", False)  # défauts de la boutique
    assert api.put(f"{V}/offers/{o.pk}/delivery", {"poidsKg": 3}, format="json").json()["raison"] == "mesures"
    p = api.put(f"{V}/offers/{o.pk}/delivery", {"poidsKg": 12, "dimensionsCm": [60, 40, 40]}, format="json").json()["produit"]
    assert p["colis"] not in ("S", "M") and p["poidsKg"] == 12
    assert api.put(f"{V}/offers/{o.pk}/delivery", {"colis": "S"}, format="json").json()["produit"]["poidsKg"] is None
    assert api.put(f"{V}/delivery-settings/slots/lv-14", {"prefere": False}, format="json").json()["ok"]
    assert api.put(f"{V}/delivery-settings/slots/sa-11", {"prefere": False}, format="json").json()["raison"] == "dernier"
    for r in (r1, r2, r3):
        assert api.put(f"{V}/delivery-settings/relays/r-{r.pk}", {"prefere": True}, format="json").json()["ok"]
    assert api.put(f"{V}/delivery-settings/relays/r-{r4.pk}", {"prefere": True}, format="json").json()["raison"] == "max"
    rel = api.get(f"{V}/delivery-settings").json()["relais"]
    assert [x["prefere"] for x in rel] == [True, True, True, False]
