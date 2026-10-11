# Litiges vus par la boutique : ouverts par le client (aftersales), réponse du propriétaire, preuves (Préparation
# aussi), brouillon, décision de la médiation, recours du vendeur, anonymat, montants masqués pour la Préparation.
import pytest

from apps.aftersales import services as apres_vente
from apps.aftersales.models import Litige, Retour
from apps.vendeur_core.anonymat import fuites
from apps.vendeur_core.models import EntreeJournal, NotificationVendeur
from apps.vendeur_core.tests.outils import preparation, proprietaire
from apps.vendeur_litiges import services
from apps.vendeur_litiges.tests.outils import PHOTO, Horloge, boutique_et_offre, commande_retiree, ouvrir_litige

pytestmark = pytest.mark.django_db

CLE = iter(range(1, 10_000))


def post(api, chemin, corps=None):
    return api.post(chemin, corps or {}, format="json", HTTP_IDEMPOTENCY_KEY=f"cle-litige-{next(CLE)}")


@pytest.fixture
def dossier(django_capture_on_commit_callbacks):
    b, o = boutique_et_offre()
    cmd = commande_retiree(o)
    with django_capture_on_commit_callbacks(execute=True):
        lit = ouvrir_litige(cmd)
    return {"b": b, "o": o, "cmd": cmd, "lit": lit, "ref": cmd["vendeur"].ref}


def test_litige_ouvert_par_le_client_vu_par_la_boutique(dossier):
    api = proprietaire(dossier["b"])
    r = api.get("/api/vendors/disputes")
    assert r.status_code == 200
    [lit] = r.json()
    assert lit["ref"] == dossier["ref"] and lit["etat"] == "a_repondre" and lit["issue"] == "attente"
    assert lit["motif"] == "Ce n’est pas le bon produit" and lit["attente"] == "remboursement"
    assert lit["ceQueDitLeClient"].startswith("J’ai commandé")
    assert lit["article"]["titre"] == "iPhone 15 Pro Max" and lit["article"]["variante"] == "256 Go"
    assert len(lit["photosClient"]) == 1 and lit["photosClient"][0]["quoi"] == "client"
    assert lit["gele"] == dossier["cmd"]["vendeur"].garde and lit["trajetRetour"] == 500
    assert lit["echeance"] - lit["ouvertA"] == 48 * 3600 * 1000
    assert lit["decisionAvant"] - lit["echeance"] == 24 * 3600 * 1000
    assert [e["code"] for e in lit["journal"]] == ["ouvert", "photos_client", "preuves_versees"]
    assert api.get("/api/vendors/disputes?state=clos").json() == []
    assert api.get(f"/api/vendors/disputes/{dossier['ref']}").json()["ref"] == dossier["ref"]
    assert api.get("/api/vendors/disputes/BLV-999999").status_code == 404
    n = api.get("/api/vendors/disputes/counts").json()
    assert n == {"a_repondre": 1, "en_mediation": 0, "clos": 0, "gele": lit["gele"]}
    # La boutique a été prévenue (litige_ouvert), sans le client.
    notif = NotificationVendeur.objects.get(boutique=dossier["b"], type="litige")
    assert notif.urgent and dossier["ref"] in notif.texte


def test_anonymat_strict(dossier):
    client = dossier["cmd"]["client"]
    relais = dossier["cmd"]["api"]  # noqa: F841
    from apps.client_core import pont

    nom_relais = pont.modele("relais").objects.first().name
    for api in (proprietaire(dossier["b"]), preparation(dossier["b"])):
        corps = api.get(f"/api/vendors/disputes/{dossier['ref']}").json()
        assert fuites(corps, valeurs_interdites=(client.first_name, client.email, nom_relais)) == []
        assert "palier" not in str(corps).lower() and "ifa" not in corps


def test_regles_lues_au_registre(dossier):
    r = preparation(dossier["b"]).get("/api/vendors/disputes/rules").json()
    assert r == {
        "reponseH": 48,
        "decisionH": 24,
        "recoursH": 48,
        "arrangementMin": 40,
        "arrangementReponseJ": 5,
        "brouillonH": 24,
        "seuilStandard": 3000,
        "seuilEleve": 10000,
        "trajet": 500,
        "remplacementH": 72,
        "viceJ": 100,
        "defautH": 48,
        "fenetreJ": 7,
        "inspectionH": 48,
    }


def test_preparation_preuves_oui_reponse_non_montants_null(dossier):
    api = preparation(dossier["b"])
    lit = api.get(f"/api/vendors/disputes/{dossier['ref']}").json()
    assert lit["gele"] is None and lit["trajetRetour"] is None and lit["livraisonRetour"] is None
    assert api.get("/api/vendors/disputes/counts").json()["gele"] is None
    r = post(api, f"/api/vendors/disputes/{dossier['ref']}/evidence", {"photo": PHOTO}).json()
    assert r["ok"] and r["piece"]["quoi"] == "vendeur" and r["piece"]["ajouteePar"] == "Aïcha N." and r["piece"]["retirable"]
    assert post(api, f"/api/vendors/disputes/{dossier['ref']}/answer", {"posture": "accepte"}).json() == {
        "ok": False,
        "raison": "reserve_proprietaire",
    }
    assert post(api, f"/api/vendors/disputes/{dossier['ref']}/appeal", {"texte": "x" * 50}).json() == {
        "ok": False,
        "raison": "reserve_proprietaire",
    }
    # La preuve est retirable tant que la réponse n'est pas envoyée.
    assert api.delete(f"/api/vendors/disputes/{dossier['ref']}/evidence/{r['piece']['id']}").json() == {"ok": True}
    assert api.delete(f"/api/vendors/disputes/{dossier['ref']}/evidence/{r['piece']['id']}").json() == {
        "ok": False,
        "raison": "introuvable",
    }
    assert api.delete(f"/api/vendors/disputes/{dossier['ref']}/evidence/xyz").json()["raison"] == "introuvable"
    assert api.delete("/api/vendors/disputes/BLV-999999/evidence/P1").json()["raison"] == "introuvable"
    assert post(api, "/api/vendors/disputes/BLV-999999/evidence", {"photo": PHOTO}).json()["raison"] == "introuvable"
    codes = [e["code"] for e in api.get(f"/api/vendors/disputes/{dossier['ref']}").json()["journal"]]
    assert codes[-2:] == ["preuve_ajoutee", "preuve_retiree"]
    assert post(api, f"/api/vendors/disputes/{dossier['ref']}/evidence", {"photo": "pas une photo"}).status_code == 400


def test_brouillon_garde_24_h(dossier, monkeypatch):
    h = Horloge(monkeypatch)
    api = proprietaire(dossier["b"])
    url = f"/api/vendors/disputes/{dossier['ref']}"
    corps = {"brouillon": {"posture": "conteste", "arrangement": "remplacement", "texte": "Le livreur a contrôlé"}}
    assert api.put(url + "/draft", corps, format="json").status_code == 204
    assert api.get(url).json()["brouillon"]["texte"] == "Le livreur a contrôlé"
    h.avancer(hours=25)
    assert api.get(url).json()["brouillon"] is None
    api.put(url + "/draft", corps, format="json")
    assert api.put(url + "/draft", {"brouillon": None}, format="json").status_code == 204
    assert api.get(url).json()["brouillon"] is None
    assert api.put("/api/vendors/disputes/BLV-999999/draft", corps, format="json").status_code == 404


def test_reponse_refus_et_contestation(dossier):
    api = proprietaire(dossier["b"])
    url = f"/api/vendors/disputes/{dossier['ref']}"
    post(api, url + "/evidence", {"photo": PHOTO})
    assert post(api, url + "/answer", {"posture": "conteste", "texte": "  "}).json()["raison"] == "constat_vide"
    assert (
        post(api, url + "/answer", {"posture": "arrangement", "texte": "trop court", "arrangement": "remise"}).json()["raison"]
        == "trop_court"
    )
    assert post(api, "/api/vendors/disputes/BLV-999999/answer", {"posture": "accepte"}).json()["raison"] == "introuvable"
    r = post(api, url + "/answer", {"posture": "conteste", "texte": "Le livreur a contrôlé le 256 Go devant moi."})
    assert r.json() == {"ok": True, "issue": "attente"}
    assert post(api, url + "/answer", {"posture": "accepte"}).json()["raison"] == "deja_repondu"
    lit = api.get(url).json()
    assert lit["etat"] == "en_mediation" and lit["reponse"]["posture"] == "conteste" and lit["reponse"]["par"] == "Franck P."
    assert all(not p["retirable"] for p in lit["preuves"])
    piece = [p for p in lit["preuves"] if p["quoi"] == "vendeur"][0]
    assert api.delete(f"{url}/evidence/{piece['id']}").json()["raison"] == "deja_repondu"
    assert Litige.objects.get(pk=dossier["lit"].pk).etat == "en_examen"
    assert EntreeJournal.objects.filter(commande=dossier["cmd"]["vendeur"], action="Réponse au litige envoyée").exists()


def test_arrangement_passe_en_mediation(dossier):
    api = proprietaire(dossier["b"])
    texte = "Je propose d’échanger contre le bon modèle 256 Go dès demain."
    r = post(
        api, f"/api/vendors/disputes/{dossier['ref']}/answer", {"posture": "arrangement", "texte": texte, "arrangement": "remplacement"}
    ).json()
    assert r["ok"]
    lit = Litige.objects.get(pk=dossier["lit"].pk)
    assert lit.etat == "en_examen" and lit.arrangement_texte == texte
    assert api.get(f"/api/vendors/disputes/{dossier['ref']}").json()["reponse"]["arrangement"] == "remplacement"


def test_j_accepte_clot_et_le_retour_part(dossier):
    api = proprietaire(dossier["b"])
    url = f"/api/vendors/disputes/{dossier['ref']}"
    assert post(api, url + "/answer", {"posture": "accepte"}).json() == {"ok": True, "issue": "accepte"}
    lit = api.get(url).json()
    assert lit["etat"] == "clos" and lit["issue"] == "accepte" and lit["gele"] is None and lit["decision"] is None
    assert lit["journal"][-1]["code"] == "clos"
    k = Litige.objects.get(pk=dossier["lit"].pk)
    assert k.etat == "decide" and k.issue == "rembourse" and Retour.objects.filter(litige=k).exists()
    assert post(api, url + "/evidence", {"photo": PHOTO}).json() == {"ok": False, "raison": "clos"}
    # Le retour d'un « J'accepte » ne passe pas par l'inspection (L-2) : pas dans les retours de la boutique.
    assert api.get("/api/vendors/returns").json() == []


def test_delai_depasse_puis_decision_gagnee(dossier, monkeypatch):
    h = Horloge(monkeypatch)
    api = proprietaire(dossier["b"])
    url = f"/api/vendors/disputes/{dossier['ref']}"
    with pytest.raises(Exception, match="encore le temps"):
        services.decider(dossier["ref"], "gagne", "Motif.")
    h.avancer(hours=49)
    assert post(api, url + "/answer", {"posture": "conteste", "texte": "Trop tard."}).json()["raison"] == "delai_depasse"
    lit = api.get(url).json()
    assert lit["etat"] == "en_mediation" and lit["journal"][-1]["code"] == "echeance"
    with pytest.raises(Exception, match="motif"):
        services.decider(dossier["ref"], "gagne", " ")
    with pytest.raises(Exception, match="Issue"):
        services.decider(dossier["ref"], "nul", "x")
    v = services.decider(dossier["ref"], "gagne", "Les photos du ramassage montrent le modèle commandé.")
    assert v["decision"]["issue"] == "gagne" and v["decision"]["effetScore"] == "aucun" and v["decision"]["par"] == "Médiation BelivaY"
    assert v["decision"]["liberation"] and v["decision"]["versement"] and v["decision"]["versementVers"] == "MTN ···· 4217"
    assert v["recours"]["possible"] is False and v["etat"] == "en_mediation"  # le client a encore 48 h de recours
    assert Litige.objects.get(pk=dossier["lit"].pk).issue == "refuse"
    prep = preparation(dossier["b"]).get(url).json()
    assert prep["decision"]["liberation"] is None and prep["decision"]["versementVers"] is None
    h.avancer(hours=49)
    assert api.get(url).json()["etat"] == "clos"
    assert post(api, url + "/appeal", {"texte": "x" * 50}).json()["raison"] == "non_contestable"
    assert NotificationVendeur.objects.filter(boutique=dossier["b"], titre="Décision de la médiation").exists()


def test_litige_perdu_recours_une_fois(dossier, monkeypatch):
    h = Horloge(monkeypatch)
    api = proprietaire(dossier["b"])
    url = f"/api/vendors/disputes/{dossier['ref']}"
    post(api, url + "/answer", {"posture": "conteste", "texte": "Le modèle remis était le bon."})
    assert post(api, url + "/appeal", {"texte": "x" * 50}).json()["raison"] == "non_contestable"
    v = services.decider(dossier["ref"], "perdu", "La photo du client montre un 128 Go.", grave=True)
    assert v["decision"]["issue"] == "perdu" and v["decision"]["effetScore"] == "g3" and v["decision"]["liberation"] is None
    assert v["recours"]["possible"] is True and v["recours"]["jusqua"] - v["decision"]["a"] == 48 * 3600 * 1000
    assert post(api, url + "/appeal", {"texte": "court"}).json()["raison"] == "trop_court"
    assert post(api, url + "/appeal", {"texte": "Les deux photos du ramassage montrent la mention 256 Go sur la boîte."}).json() == {
        "ok": True
    }
    assert post(api, url + "/appeal", {"texte": "x" * 50}).json()["raison"] == "deja_contestee"
    lit = api.get(url).json()
    assert lit["recours"]["deposeA"] and lit["recours"]["possible"] is False
    h.avancer(hours=60)
    assert api.get(url).json()["etat"] == "en_mediation"  # recours en attente de réponse
    v = services.decider(dossier["ref"], "gagne", "Recours examiné : les photos du ramassage montrent le 256 Go.")
    assert v["decision"]["issue"] == "gagne" and v["etat"] == "clos"
    assert [e["code"] for e in v["journal"]].count("decision") == 2


def test_recours_hors_delai(dossier, monkeypatch):
    h = Horloge(monkeypatch)
    api = proprietaire(dossier["b"])
    url = f"/api/vendors/disputes/{dossier['ref']}"
    post(api, url + "/answer", {"posture": "conteste", "texte": "Le modèle remis était le bon."})
    services.decider(dossier["ref"], "perdu", "La photo du client montre un 128 Go.")
    h.avancer(hours=49)
    assert post(api, url + "/appeal", {"texte": "x" * 50}).json()["raison"] == "delai_depasse"
    assert post(api, "/api/vendors/disputes/BLV-999999/appeal", {"texte": "x" * 50}).json()["raison"] == "non_contestable"


def test_dossier_retire_par_le_client_et_auto_exclus(dossier):
    apres_vente.retirer(dossier["cmd"]["client"], dossier["lit"].ref)
    assert proprietaire(dossier["b"]).get("/api/vendors/disputes").json() == []
    assert proprietaire(dossier["b"]).get(f"/api/vendors/disputes/{dossier['ref']}").status_code == 404


def test_compte_client_sans_boutique(dossier):
    r = dossier["cmd"]["api"].get("/api/vendors/disputes")
    assert r.status_code == 403 and r.json()["error"]["code"] == "pas_vendeur"


def test_en_cours_pour_l_accueil(dossier):
    e = services.en_cours(dossier["b"])
    assert [x["ref"] for x in e["litiges"]] == [dossier["ref"]] and e["retours"] == []
    assert e["litiges"][0]["echeance"] == dossier["lit"].echeance_vendeur and e["litiges"][0]["gele"] > 0


def test_photos_de_remise_versees_d_office(dossier):
    c = dossier["cmd"]["vendeur"]
    c.photos_remise = [
        {"type": "decouvert", "image": "counter", "a": 1_790_000_000_000, "lieu": "boutique"},
        {"type": "scelle", "image": "box", "a": "2026-09-15T14:21:00+01:00"},
        "relay",
    ]
    c.save()
    lit = proprietaire(dossier["b"]).get(f"/api/vendors/disputes/{dossier['ref']}").json()
    assert [(p["quoi"], p["photo"]) for p in lit["preuves"]] == [("ramassage", "counter"), ("scelle", "box"), ("ramassage", "relay")]
    assert lit["journal"][2]["detail"] == "3"


def test_part_de_livraison_du_colis(django_capture_on_commit_callbacks):
    """livraisonRetour = F(commande) − F(commande sans ce colis), Off conservé (moteur annulation, comme l'annulation
    d'un colis) ; seul colis de la commande : toute la livraison payée (Ram + Rem + Suppl − Off)."""
    from apps.pickup.models import MontantsCommande
    from apps.vendeur_core.tests.outils import creer_boutique_vendeur, creer_fiche, creer_offre

    b = creer_boutique_vendeur()
    fiche = creer_fiche("ITEL AC52", variantes=("Noir",), dessin="phone", prix_min=15000, prix_max=25000)
    o = creer_offre(b, fiche, variante="Noir", prix=20000, stock=3, reference="ITL-AC52-N")
    cmd = commande_retiree(o)
    with django_capture_on_commit_callbacks(execute=True):
        lit = ouvrir_litige(cmd)
    m = MontantsCommande.objects.get(order_id=cmd["order_id"])
    attendu = m.ramassages + m.remises + m.supplements - m.offert
    assert attendu > 0
    ref = cmd["vendeur"].ref
    assert proprietaire(b).get(f"/api/vendors/disputes/{ref}").json()["livraisonRetour"] == attendu
    assert preparation(b).get(f"/api/vendors/disputes/{ref}").json()["livraisonRetour"] is None
    assert services.livraison_du_colis(lit) == attendu
    # Commande introuvable côté pickup : rien à rendre.
    MontantsCommande.objects.filter(pk=m.pk).update(order_id=m.order_id + 10_000_000)
    assert services.livraison_du_colis(Litige.objects.get(pk=lit.pk)) == 0


def test_livraison_offerte_rien_a_rendre(dossier):
    """Livraison entièrement offerte au paiement (Off conservé) : la part du colis est 0."""
    from apps.pickup.models import MontantsCommande

    m = MontantsCommande.objects.get(order_id=dossier["cmd"]["order_id"])
    assert m.ramassages + m.remises + m.supplements - m.offert == 0
    assert proprietaire(dossier["b"]).get(f"/api/vendors/disputes/{dossier['ref']}").json()["livraisonRetour"] == 0
