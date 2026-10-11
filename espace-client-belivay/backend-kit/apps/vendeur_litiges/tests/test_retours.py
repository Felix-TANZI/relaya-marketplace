# Retours vus par la boutique : retour accepté par BelivaY sur un dossier du client, dépôt au relais, collecte du
# livreur, réception (heure réelle, Q-72), photos et brouillon d'inspection, verdict, remplacement ou remboursement,
# médiation d'un retour non conforme, retards, Préparation (photos oui, choix non, montants null), anonymat.
import pytest

from apps.aftersales.models import Litige, Remplacement, Retour
from apps.client_core import pont
from apps.vendeur_core.anonymat import fuites
from apps.vendeur_core.models import Offre
from apps.vendeur_core.tests.outils import preparation, proprietaire
from apps.vendeur_litiges import services
from apps.vendeur_litiges.models import Dossier
from apps.vendeur_litiges.tests.outils import PHOTO, Horloge, boutique_et_offre, commande_retiree, ouvrir_litige

pytestmark = pytest.mark.django_db

CLE = iter(range(1, 10_000))


def post(api, chemin, corps=None):
    return api.post(chemin, corps or {}, format="json", HTTP_IDEMPOTENCY_KEY=f"cle-retour-{next(CLE)}")


@pytest.fixture
def retour():
    b, o = boutique_et_offre(stock=3)  # la commande en prend un
    cmd = commande_retiree(o)
    lit = ouvrir_litige(cmd, pb="autre", description="L’écran reste noir après une journée", souhait="remplace")
    ref = cmd["vendeur"].ref
    v = services.accepter_retour(ref)
    return {"b": b, "o": o, "cmd": cmd, "lit": lit, "ref": ref, "vue": v, "url": f"/api/vendors/returns/{ref}"}


def recu(retour):
    services.avancer_retour(retour["ref"], "return.deposited")
    services.avancer_retour(retour["ref"], "return.collected")
    api = proprietaire(retour["b"])
    return api, post(api, retour["url"] + "/receive").json()


def inspecte(retour, verdict="conforme"):
    api, _ = recu(retour)
    for _ in range(2):
        post(api, retour["url"] + "/photos", {"photo": PHOTO})
    assert post(api, retour["url"] + "/inspection", {"verdict": verdict, "controles": {"scelle": True, "serie": True}}).json() == {
        "ok": True
    }
    return api


def test_retour_accepte_quitte_les_litiges(retour):
    api = proprietaire(retour["b"])
    assert api.get("/api/vendors/disputes").json() == []
    [r] = api.get("/api/vendors/returns").json()
    assert r["ref"] == retour["ref"] and r["etat"] == "en_route" and r["suite"] == {"type": "en_route"}
    assert r["categorie"] == "defaut_cache" and r["motif"] == "défaut caché" and r["phraseClient"].startswith("L’écran")
    assert r["volumineux"] is False and r["arrivee"] is None and r["recuA"] is None and r["inspecterAvant"] is None
    assert r["signalement"]["limiteH"] == 48 and r["signalement"]["recevable"] is True
    from apps.pickup.models import MontantsCommande

    m = MontantsCommande.objects.get(order_id=retour["cmd"]["order_id"])
    livraison = m.ramassages + m.remises + m.supplements - m.offert
    assert (
        r["couts"] == {"trajet": 500, "garde": retour["cmd"]["vendeur"].garde, "livraisonRetour": livraison}
        and r["gele"] == retour["cmd"]["vendeur"].garde
    )
    assert r["brouillon"] == {"controles": {"scelle": False, "serie": False}, "photos": [], "verdict": None}
    assert r["remplacement"]["stock"] == 2 and r["remplacement"]["titre"] == "iPhone 15 Pro Max"
    assert api.get("/api/vendors/returns/counts").json() == {"a_decider": 0, "en_route": 1, "clos": 0}
    assert api.get("/api/vendors/returns?state=clos").json() == []
    assert api.get("/api/vendors/returns/BLV-999999").status_code == 404
    assert Retour.objects.get(litige=retour["lit"]).etat == "accepte"
    assert services.en_cours(retour["b"])["retours"][0]["ref"] == retour["ref"]
    with pytest.raises(Exception, match="n'attend plus"):
        services.accepter_retour(retour["ref"])


def test_reception_lance_l_inspection(retour, monkeypatch):
    h = Horloge(monkeypatch)
    api = proprietaire(retour["b"])
    assert post(api, retour["url"] + "/receive").json() == {"ok": False, "raison": "introuvable"}  # pas encore déposé
    services.avancer_retour(retour["ref"], "return.deposited")
    v = api.get(retour["url"]).json()
    assert v["arrivee"]["creneau"] == ["00:00", "23:59"] and v["inspecterAvant"]
    h.avancer(hours=3)
    r = post(api, retour["url"] + "/receive").json()  # remise sans scan de collecte : la remise la vaut
    assert r["ok"]
    v = api.get(retour["url"]).json()
    assert (
        v["etat"] == "a_decider"
        and v["suite"] == {"type": "a_inspecter"}
        and v["recuA"]
        and r["inspecterAvant"] - v["recuA"] == 48 * 3600 * 1000
    )
    assert [e["code"] for e in v["journal"]][:4] == ["retire", "signale", "depose", "recu"]
    assert post(api, retour["url"] + "/receive").json() == {"ok": False, "raison": "deja_recu"}
    assert Retour.objects.get(litige=retour["lit"]).etat == "recu"
    assert post(api, "/api/vendors/returns/BLV-999999/receive").json()["raison"] == "introuvable"


def test_inspection_refus_puis_conforme_et_remplacement(retour):
    api = proprietaire(retour["b"])
    insp = {"verdict": "conforme", "controles": {"scelle": True, "serie": True}}
    assert post(api, retour["url"] + "/inspection", insp).json()["raison"] == "pas_recu"
    recu(retour)
    prep = preparation(retour["b"])
    p1 = post(prep, retour["url"] + "/photos", {"photo": PHOTO}).json()
    assert p1["ok"] and p1["piece"]["ajouteePar"] == "Aïcha N."
    assert post(api, retour["url"] + "/inspection", insp).json()["raison"] == "photos"
    assert prep.delete(f"{retour['url']}/photos/{p1['piece']['id']}").status_code == 204
    assert prep.delete(f"{retour['url']}/photos/zzz").status_code == 204
    post(prep, retour["url"] + "/photos", {"photo": PHOTO})
    post(prep, retour["url"] + "/photos", {"photo": PHOTO})
    assert (
        prep.put(
            retour["url"] + "/draft", {"controles": {"scelle": True, "serie": False}, "verdict": "conforme"}, format="json"
        ).status_code
        == 204
    )
    b = api.get(retour["url"]).json()["brouillon"]
    assert b["controles"] == {"scelle": True, "serie": False} and b["verdict"] == "conforme" and len(b["photos"]) == 2
    assert (
        post(api, retour["url"] + "/inspection", {"verdict": "conforme", "controles": {"scelle": True, "serie": False}}).json()["raison"]
        == "controles"
    )
    assert (
        post(api, retour["url"] + "/inspection", {"verdict": "peut-etre", "controles": {"scelle": True, "serie": True}}).json()["raison"]
        == "verdict"
    )
    assert post(prep, retour["url"] + "/inspection", insp).json() == {"ok": True}  # la Préparation inspecte
    assert post(api, retour["url"] + "/inspection", insp).json()["raison"] == "deja_inspecte"
    assert post(api, retour["url"] + "/photos", {"photo": PHOTO}).json()["raison"] == "deja_inspecte"
    v = api.get(retour["url"]).json()
    assert v["suite"] == {"type": "a_choisir"} and v["inspection"]["verdict"] == "conforme" and len(v["inspection"]["photos"]) == 2
    assert v["brouillon"] is None
    assert Retour.objects.get(litige=retour["lit"]).etat == "retour_inspecte"
    # Choix : propriétaire seulement.
    assert post(prep, retour["url"] + "/replacement", {"choix": "remplacer"}).json() == {"ok": False, "raison": "reserve_proprietaire"}
    assert post(api, retour["url"] + "/replacement/ready").json()["raison"] == "introuvable"
    r = post(api, retour["url"] + "/replacement", {"choix": "remplacer"}).json()
    assert r["ok"] and r["expedierAvant"]
    assert post(api, retour["url"] + "/replacement", {"choix": "rembourser"}).json()["raison"] == "deja_choisi"
    o = Offre.objects.get(pk=retour["o"].pk)
    assert o.stock == 1 and pont.modele("stock").objects.get(product_id=o.product_id).quantity == 1
    lit = Litige.objects.get(pk=retour["lit"].pk)
    assert lit.etat == "decide" and lit.issue == "remplace" and lit.reponse_vendeur == "accepte"
    assert Remplacement.objects.get(litige=lit).etat == "attente"
    k = Retour.objects.get(litige=lit)
    assert k.etat == "clos" and k.rembourse == 0
    # La sous-commande de remplacement entre chez le vendeur, sans argent (REFCL-R080).
    ref_r = retour["url"].rsplit("/", 1)[-1] + "-R"
    cr = api.get(f"/api/vendors/orders/{ref_r}").json()
    assert cr["remplacementDe"] == ref_r[:-2] and cr["garde"] is None and cr["argent"] is None and cr["statut"] in ("payee", "a_preparer")
    assert ref_r in [x["ref"] for x in api.get("/api/vendors/orders", {"state": "prep"}).json()["items"]]
    v = api.get(retour["url"]).json()
    assert v["suite"]["type"] == "remplacement" and v["suite"]["pretA"] is None and v["etat"] == "a_decider"
    assert post(api, retour["url"] + "/replacement/ready").json() == {"ok": True}
    v = api.get(retour["url"]).json()
    assert v["etat"] == "clos" and v["suite"]["pretA"] and v["gele"] is None
    assert services.avancer_remplacement(retour["ref"], "replacement.collected")["etat"] == "expedie"


def test_rembourser_clot_le_retour(retour):
    api = inspecte(retour)
    assert post(api, retour["url"] + "/replacement", {"choix": "rembourser"}).json() == {"ok": True}
    v = api.get(retour["url"]).json()
    assert v["etat"] == "clos" and v["suite"]["type"] == "rembourse" and v["suite"]["auto"] is False
    k = Retour.objects.get(litige=retour["lit"])
    assert k.etat == "clos" and k.en_tort == "vendeur" and k.rembourse >= 350000
    assert Litige.objects.get(pk=retour["lit"].pk).issue == "rembourse"


def test_stock_epuise(retour):
    api = inspecte(retour)
    Offre.objects.filter(pk=retour["o"].pk).update(stock=0)
    assert post(api, retour["url"] + "/replacement", {"choix": "remplacer"}).json() == {"ok": False, "raison": "stock"}


def test_non_conforme_mediation_gagnee(retour):
    api = inspecte(retour, "non_conforme")
    v = api.get(retour["url"]).json()
    assert v["suite"]["type"] == "mediation" and v["etat"] == "a_decider"
    assert [e["code"] for e in v["journal"]][-2:] == ["inspecte", "mediation"]
    assert post(api, retour["url"] + "/replacement", {"choix": "remplacer"}).json()["raison"] == "pas_conforme"
    assert Litige.objects.get(pk=retour["lit"].pk).etat == "en_examen"
    v = services.decider(retour["ref"], "gagne", "Le numéro de série ne correspond pas à l’article vendu.")
    assert v["etat"] == "clos"
    k = Retour.objects.get(litige=retour["lit"])
    assert k.etat == "clos" and k.en_tort == "client" and k.rembourse == 0
    with pytest.raises(Exception, match="n'attend pas"):
        services.decider(retour["ref"], "perdu", "x")


def test_non_conforme_mediation_perdue(retour):
    inspecte(retour, "non_conforme")
    services.decider(retour["ref"], "perdu", "L’écran est bien défectueux.")
    k = Retour.objects.get(litige=retour["lit"])
    assert k.etat == "clos" and k.en_tort == "vendeur" and k.rembourse > 0


def test_inspection_en_retard(retour, monkeypatch):
    h = Horloge(monkeypatch)
    api, _ = recu(retour)
    h.avancer(hours=49)
    v = api.get(retour["url"]).json()
    assert v["suite"]["type"] == "rembourse" and v["suite"]["auto"] is True and v["etat"] == "clos"
    for _ in range(2):
        post(api, retour["url"] + "/photos", {"photo": PHOTO})
    assert (
        post(api, retour["url"] + "/inspection", {"verdict": "conforme", "controles": {"scelle": True, "serie": True}}).json()["raison"]
        == "delai_depasse"
    )
    assert services.traiter_retards() == 1
    assert Retour.objects.get(litige=retour["lit"]).etat == "clos"
    assert services.traiter_retards() == 0


def test_remplacement_en_retard(retour, monkeypatch):
    h = Horloge(monkeypatch)
    api = inspecte(retour)
    post(api, retour["url"] + "/replacement", {"choix": "remplacer"})
    h.avancer(days=6)
    v = api.get(retour["url"]).json()
    assert v["suite"]["type"] == "rembourse" and v["suite"]["auto"] is True
    assert services.traiter_retards() == 1
    assert Remplacement.objects.get(litige=retour["lit"]).etat == "rembourse"


def test_preparation_montants_null_et_anonymat(retour):
    from apps.client_core import pont as p

    client = retour["cmd"]["client"]
    nom_relais = p.modele("relais").objects.first().name
    v = preparation(retour["b"]).get(retour["url"]).json()
    assert v["gele"] is None and v["couts"] is None
    for api in (proprietaire(retour["b"]), preparation(retour["b"])):
        assert fuites(api.get(retour["url"]).json(), valeurs_interdites=(client.first_name, client.email, nom_relais)) == []


def test_console_refus(retour):
    with pytest.raises(Exception, match="inconnu"):
        services.avancer_retour(retour["ref"], "return.lost")
    with pytest.raises(Exception, match="Aucun remplacement"):
        services.avancer_remplacement(retour["ref"], "replacement.collected")
    with pytest.raises(Exception, match="Commande inconnue"):
        services.avancer_retour("BLV-999999", "return.deposited")


def test_accepter_retour_refus(django_capture_on_commit_callbacks):
    b, o = boutique_et_offre()
    cmd = commande_retiree(o)
    ouvrir_litige(cmd, pb="abime", description="Écran fissuré.")
    ref = cmd["vendeur"].ref
    with pytest.raises(Exception, match="Catégorie"):
        services.accepter_retour(ref, "inconnue")
    with pytest.raises(Exception, match="pas un retour"):
        services.avancer_retour(ref, "return.deposited")
    services.accepter_retour(ref, "contrefacon")
    assert Dossier.objects.get(commande=cmd["vendeur"]).categorie == "contrefacon"
    with pytest.raises(Exception, match="Aucun dossier"):
        b2, o2 = boutique_et_offre()
        services.accepter_retour(commande_retiree(o2)["vendeur"].ref)


def test_defaut_cache_hors_delai_n_est_pas_un_retour(monkeypatch):
    from datetime import timedelta

    from apps.pickup.models import SousCommande

    b, o = boutique_et_offre()
    cmd = commande_retiree(o)
    ouvrir_litige(cmd, pb="autre", description="Ne s’allume plus.")
    SousCommande.objects.filter(order_id=cmd["order_id"]).update(remise_le=Litige.objects.get().ouvert_le - timedelta(hours=60))
    with pytest.raises(Exception, match="n'ouvre pas un retour"):
        services.accepter_retour(cmd["vendeur"].ref)
