# Promotions (AJ-A) = ventes flash à remise vérifiée, une seule notion avec la vente offerte au mérite (VD-10) :
# prix de référence le plus bas sur 30 jours, refus du registre, « Vous gardez » par le moteur, prix payé pendant la
# fenêtre (Product de relaya), commission de la commande sur le prix payé (F9), propriétaire seulement.
import itertools
from datetime import timedelta

import pytest

from apps.client_core import pont
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
from apps.vendeur_croissance import promotions

pytestmark = pytest.mark.django_db
V = "/api/vendors"
_n = itertools.count(1)
H = 3_600_000


def cle() -> dict:
    return {"HTTP_IDEMPOTENCY_KEY": f"essai-promo-{next(_n):06d}"}


def test_vente_flash_programmee_en_cours_arretee():
    b = creer_boutique_vendeur()
    o = creer_offre(b, prix=20000, stock=4)
    ajouter_preparation(b)
    api = proprietaire(b)
    assert preparation(b).get(f"{V}/promotions").json()["error"]["code"] == "owner_only"
    assert api.get(f"{V}/promotions/rules").json()["remiseMin"] == 10
    t = horloge.maintenant_ms()
    projet = {"offreId": str(o.pk), "type": "pourcent", "valeur": 15, "debut": t + H, "fin": t + 25 * H}
    a = api.post(f"{V}/promotions/quote", projet, format="json").json()
    assert a["refus"] is None and a["prixPromo"] == 17000 and a["gardePromo"] < a["gardeAvant"] and a["commissionPromo"] > 0
    for champs, refus in (
        ({"valeur": 5}, "remise_min"),
        ({"fin": t + 60 * H}, "duree"),
        ({"debut": t + 40 * 24 * H, "fin": t + 40 * 24 * H + H}, "trop_loin"),
        ({"type": "autre"}, "valeur"),
    ):
        assert api.post(f"{V}/promotions", {**projet, **champs}, format="json", **cle()).json()["raison"] == refus
    p = api.post(f"{V}/promotions", projet, format="json", **cle()).json()["promotion"]
    assert p["etat"] == "programmee" and p["origine"] == "vendeur" and p["remisePourCent"] == 15.0
    assert api.post(f"{V}/promotions", projet, format="json", **cle()).json()["raison"] == "chevauche"
    assert next(x for x in api.get(f"{V}/promotions/offers").json() if x["offreId"] == str(o.pk))["bloque"] == "promotion"
    assert api.post(f"{V}/promotions/{p['id']}/stop").json()["promotion"]["etat"] == "arretee"
    # Pendant la fenêtre : prix payé remisé, prix barré = référence ; la commande garde sur le prix payé (F9).
    p = api.post(f"{V}/promotions", {**projet, "debut": horloge.maintenant_ms()}, format="json", **cle()).json()["promotion"]
    assert p["etat"] == "en_cours" and promotions.appliquer_toutes() >= 1
    assert pont.produit(o.product_id).prix == 17000
    vue = api.get(f"{V}/offers/{o.pk}").json()
    assert (vue["prix"], vue["prixBarre"]) == (17000, 20000)
    r = commande_client(o)
    assert CommandeVendeur.objects.get(order_id=r["order_id"]).prix == 17000
    assert next(x for x in api.get(f"{V}/promotions").json() if x["id"] == p["id"])["vendues"] == 1
    s = api.post(f"{V}/promotions/{p['id']}/stop", format="json").json()
    assert s["promotion"]["etat"] == "arretee" and pont.produit(o.product_id).prix == 20000
    assert api.post(f"{V}/promotions/{p['id']}/stop").json()["raison"] == "etat"
    assert api.post(f"{V}/promotions/999999/stop").status_code == 404


def test_reference_le_plus_bas_sur_30_jours_et_garde_negatif():
    b = creer_boutique_vendeur()
    o = creer_offre(b, prix=20000)
    o.historique = [
        {"a": horloge.maintenant_ms() - 3 * 24 * H, "quoi": "Prix changé : {de} F → {a} F", "valeurs": {"de": 18000, "a": 20000}}
    ]
    o.save()
    assert promotions.prix_reference(o) == 18000
    t = horloge.maintenant_ms()
    a = promotions.apercu(b, {"offreId": str(o.pk), "type": "montant", "valeur": 17900, "debut": t, "fin": t + H})
    assert a["refus"] in ("prix_min", "remise_max", "garde_negatif")


def test_vente_flash_au_merite_dans_la_meme_liste():
    b = creer_boutique_vendeur()
    o = creer_offre(b)
    v = promotions.creer_au_merite(b, o, 20)
    assert v is not None and v.origine == "merite" and v.debut > horloge.maintenant()
    liste = proprietaire(b).get(f"{V}/promotions").json()
    assert liste[0]["origine"] == "merite" and liste[0]["etat"] == "programmee"
    assert v.fin - v.debut == timedelta(hours=48)
