# Préparation : « C'est prêt » (hors connexion compris), rupture avec et sans vendeur suivant, plus de temps, bon de
# préparation (quatre cases, sans code ni client), vérification de la référence.
from datetime import datetime, timedelta

import pytest

from apps.client_core.chiffrement import dechiffrer
from apps.client_core.temps import YAOUNDE, ms
from apps.vendeur_commandes import services
from apps.vendeur_commandes.models import BasculeColis, CommandeCedee
from apps.vendeur_core import horloge
from apps.vendeur_core.anonymat import fuites
from apps.vendeur_core.models import CommandeVendeur, Offre
from apps.vendeur_core.tests.outils import (
    HORAIRES_DEMO,
    PASSAGES_DEMO,
    commande_client,
    creer_boutique_vendeur,
    creer_fiche,
    creer_offre,
    preparation,
    proprietaire,
)

pytestmark = pytest.mark.django_db


@pytest.fixture
def b():
    return creer_boutique_vendeur()


def url(ref, quoi=""):
    return f"/api/vendors/orders/{ref}{quoi}"


# ── « C'est prêt » ────────────────────────────────────────────────────────────────────────────────────


def test_cest_pret_avance_le_colis_et_genere_le_code(b):
    from apps.pickup.models import SousCommande

    cc = commande_client(creer_offre(b))
    api = preparation(b)
    r = api.post(url(cc["ref"], "/ready"), {}, format="json", HTTP_IDEMPOTENCY_KEY="pret-0001").json()
    assert r["ok"] and r["preteA"]
    c = CommandeVendeur.objects.get(ref=cc["ref"])
    assert len(dechiffrer(c.code_chiffre)) == 6 and dechiffrer(c.code_chiffre).isdigit() and c.confirmee_a is not None
    assert SousCommande.objects.get(order_id=c.order_id).etat == "prete"
    assert c.journal.first().action == "« C’est prêt »" and c.journal.first().auteur == "Aïcha N."
    assert api.post(url(cc["ref"], "/ready"), {}, format="json").json() == {"ok": False, "raison": "deja_prete"}
    assert api.post(url("BLV-999999", "/ready"), {}, format="json").json() == {"ok": False, "raison": "introuvable"}


def test_cest_pret_hors_connexion_garde_l_heure_d_origine(b):
    cc = commande_client(creer_offre(b))
    c = CommandeVendeur.objects.get(ref=cc["ref"])
    origine = ms(horloge.maintenant() - timedelta(minutes=30))
    origine = max(origine, ms(c.payee_a))
    r = proprietaire(b).post(url(cc["ref"], "/ready"), {"a": origine}, format="json").json()
    assert r == {"ok": True, "preteA": origine}
    assert CommandeVendeur.objects.get(pk=c.pk).journal.first().detail == "Envoyé au retour du réseau"


def test_cest_pret_hors_connexion_trop_vieux_est_refuse(b):
    cc = commande_client(creer_offre(b))
    r = proprietaire(b).post(url(cc["ref"], "/ready"), {"a": ms(horloge.maintenant() - timedelta(hours=73))}, format="json")
    assert r.status_code == 422 and r.json()["error"]["code"] == "action_expiree"


def test_cest_pret_sur_une_commande_annulee(b):
    cc = commande_client(creer_offre(b))
    CommandeVendeur.objects.filter(ref=cc["ref"]).update(annulee_a=horloge.maintenant(), motif_annulation="belivay")
    assert proprietaire(b).post(url(cc["ref"], "/ready"), {}, format="json").json()["raison"] == "annulee"


# ── Rupture ────────────────────────────────────────────────────────────────────────────────────────────


def test_rupture_sans_vendeur_suivant_annule_et_rembourse(b):
    from apps.pickup.models import MontantsCommande, SousCommande

    o = creer_offre(b, stock=5)
    cc = commande_client(o)
    api = preparation(b)
    assert api.post(url(cc["ref"], "/stockout"), {"stockAZero": True}, format="json").json() == {"ok": True}
    c = CommandeVendeur.objects.get(ref=cc["ref"])
    assert c.annulee_a and c.motif_annulation == "rupture" and c.ruptures == 1
    sc = SousCommande.objects.get(order_id=c.order_id)
    m = MontantsCommande.objects.get(order_id=c.order_id)
    # Seul colis de la commande : tout est rendu, livraison comprise (moteur annulation, CAN-25).
    assert sc.etat == "annulee" and sc.annulee_par == "vendeur" and sc.rembourse == m.total == m.rembourse > 20000
    o.refresh_from_db()
    assert o.stock == 0
    actions = [e.action for e in c.journal.all()]
    assert "Rupture signalée" in actions and "Stock de l’{p} mis à jour" in actions and "Annulée : rupture" in actions
    d = proprietaire(b).get(url(cc["ref"])).json()
    assert d["statut"] == "annulee" and d["annulation"]["motif"] == "rupture"
    assert api.post(url(cc["ref"], "/stockout"), {}, format="json").json() == {"ok": False, "raison": "deja_prete"}
    assert api.post(url("BLV-999999", "/stockout"), {}, format="json").json() == {"ok": False, "raison": "introuvable"}


def test_rupture_passe_au_vendeur_suivant(b):
    from apps.pickup.models import LigneSousCommande, SousCommande

    fiche = creer_fiche()
    o = creer_offre(b, fiche=fiche, prix=20000, stock=5)
    b2 = creer_boutique_vendeur(nom="Boutique Suivante", trust="80")
    o2 = creer_offre(b2, fiche=fiche, prix=19500, stock=3)
    creer_offre(creer_boutique_vendeur(nom="Trop basse", trust="60"), fiche=fiche, prix=19000, stock=3)  # Trust Score < 75
    cc = commande_client(o)
    assert proprietaire(b).post(url(cc["ref"], "/stockout"), {"stockAZero": False}, format="json").json() == {"ok": True}
    # Chez le premier vendeur : annulée pour rupture, toujours sous sa référence d'origine.
    v = proprietaire(b).get("/api/vendors/orders?state=fin").json()
    assert [(x["ref"], x["statut"], x["annulation"]["motif"]) for x in v["items"]] == [(cc["ref"], "annulee", "rupture")]
    assert proprietaire(b).get(url(cc["ref"])).json()["ref"] == cc["ref"]
    assert proprietaire(b).get(url(cc["ref"], "/journal")).status_code == 200
    assert fuites(v, valeurs_interdites=("Boutique Suivante",)) == []
    # Chez le suivant : la commande entre, délai qui repart de maintenant ; le colis du client a changé de boutique.
    c2 = CommandeVendeur.objects.get(boutique=b2)
    assert c2.ref == cc["ref"] and c2.annulee_a is None and c2.echeance > horloge.maintenant()
    sc = SousCommande.objects.get(order_id=c2.order_id)
    assert sc.vendor_id == b2.vendor_id and sc.boutique == "Boutique Suivante"
    assert LigneSousCommande.objects.get(sous_commande=sc).product_id == o2.product_id
    o2.refresh_from_db()
    assert o2.stock == 2
    assert BasculeColis.objects.get(order_id=c2.order_id).tentatives == 1 and CommandeCedee.objects.count() == 1
    assert proprietaire(b2).get("/api/vendors/orders?state=prep").json()["items"][0]["ref"] == cc["ref"]
    # Deuxième rupture chez le suivant : plus personne (le premier est déjà essayé) → remboursement.
    assert proprietaire(b2).post(url(cc["ref"], "/stockout"), {}, format="json").json() == {"ok": True}
    sc.refresh_from_db()
    assert sc.etat == "annulee" and sc.rembourse >= 20000


def test_rupture_au_plus_deux_tentatives(b):
    from apps.pickup.models import SousCommande

    fiche = creer_fiche()
    o = creer_offre(b, fiche=fiche, stock=5)
    for i in range(3):
        creer_offre(creer_boutique_vendeur(nom=f"Suivante {i}", trust="80"), fiche=fiche, prix=20000, stock=3)
    cc = commande_client(o)
    proprietaire(b).post(url(cc["ref"], "/stockout"), {}, format="json")
    for _ in range(2):
        c = CommandeVendeur.objects.get(ref=cc["ref"])
        proprietaire(c.boutique).post(url(cc["ref"], "/stockout"), {}, format="json")
    sc = SousCommande.objects.get(order_id=c.order_id)
    assert sc.etat == "annulee" and BasculeColis.objects.get(order_id=c.order_id).tentatives == 2
    assert CommandeCedee.objects.count() == 2


def test_un_vendeur_plus_cher_n_est_pas_propose(b):
    fiche = creer_fiche()
    o = creer_offre(b, fiche=fiche, prix=20000)
    creer_offre(creer_boutique_vendeur(nom="Plus chère", trust="90"), fiche=fiche, prix=25000, stock=3)
    creer_offre(creer_boutique_vendeur(nom="Autre couleur", trust="90"), fiche=fiche, variante="bleu", prix=18000, stock=3)
    cc = commande_client(o)
    proprietaire(b).post(url(cc["ref"], "/stockout"), {}, format="json")
    assert CommandeVendeur.objects.filter(ref=cc["ref"]).count() == 1 and CommandeVendeur.objects.get(ref=cc["ref"]).annulee_a


# ── Plus de temps ──────────────────────────────────────────────────────────────────────────────────────


def test_plus_de_temps_une_fois(b):
    cc = commande_client(creer_offre(b))
    api = proprietaire(b)
    o = api.get(url(cc["ref"], "/extend")).json()
    assert [x["choix"] for x in o["options"]] == ["+1h", "+2h", "demain"] and o["aPreparer"] and not o["prolongee"]
    assert all(set(x) == {"choix", "echeance", "possible", "ramassage", "effet"} for x in o["options"])
    r = api.post(url(cc["ref"], "/extend"), {"choix": "+1h"}, format="json").json()
    assert r == {"ok": True, "echeance": o["options"][0]["echeance"]}
    assert api.post(url(cc["ref"], "/extend"), {"choix": "+2h"}, format="json").json()["raison"] == "deja_prolongee"
    assert api.get(url("BLV-999999", "/extend")).status_code == 404
    assert api.post(url("BLV-999999", "/extend"), {"choix": "+1h"}, format="json").json()["raison"] == "introuvable"
    assert api.post(url(cc["ref"], "/extend"), {"choix": "+9h"}, format="json").status_code == 400


def test_plus_de_temps_jamais_au_dela_de_l_echeance_absolue_et_pas_apres_pret(b):
    cc = commande_client(creer_offre(b))
    c = CommandeVendeur.objects.get(ref=cc["ref"])
    # Échéance fixe en milieu de journée (le test ne dépend pas de l'heure à laquelle il tourne).
    midi = datetime(2026, 9, 21, 12, 0, tzinfo=YAOUNDE)
    CommandeVendeur.objects.filter(pk=c.pk).update(echeance=midi, echeance_absolue=midi + timedelta(minutes=30))
    api = proprietaire(b)
    assert api.post(url(cc["ref"], "/extend"), {"choix": "demain"}, format="json").json()["raison"] == "au_dela_de_24h"
    api.post(url(cc["ref"], "/ready"), {}, format="json")
    assert api.post(url(cc["ref"], "/extend"), {"choix": "+1h"}, format="json").json()["raison"] == "deja_prete"
    assert not api.get(url(cc["ref"], "/extend")).json()["aPreparer"]


def test_plus_de_temps_deplace_le_ramassage_au_creneau_suivant():
    b = creer_boutique_vendeur(horaires=HORAIRES_DEMO, passages=PASSAGES_DEMO)
    cc = commande_client(creer_offre(b))
    c = CommandeVendeur.objects.get(ref=cc["ref"])
    lundi = datetime(2026, 9, 21, 12, 42, tzinfo=YAOUNDE)
    CommandeVendeur.objects.filter(pk=c.pk).update(echeance=lundi, echeance_absolue=lundi + timedelta(days=2), prete_a=None)
    r = proprietaire(b).post(url(cc["ref"], "/extend"), {"choix": "demain"}, format="json").json()
    assert r["ok"]
    c.refresh_from_db()
    assert c.ramassage_debut == datetime(2026, 9, 22, 14, tzinfo=YAOUNDE)
    assert c.journal.first().detail == "Ramassage au créneau suivant"


# ── Bon de préparation ─────────────────────────────────────────────────────────────────────────────────


def test_bon_quatre_cases_sans_code_ni_client(b):
    cc = commande_client(creer_offre(b))
    api = preparation(b)
    bon = api.get(url(cc["ref"], "/slip")).json()
    assert [x["cle"] for x in bon["aVerifier"]] == ["modele", "etat", "accessoires", "boite"] and bon["garde"] is None
    assert bon["lignes"][0]["reference"] == "ITL-AC52-NR" and bon["aPreparer"] and bon["ramassage"]["livreur"] == "Serge M."
    assert proprietaire(b).get(url(cc["ref"], "/slip")).json()["garde"] == 17840
    proprietaire(b).post(url(cc["ref"], "/ready"), {}, format="json")
    bon = api.get(url(cc["ref"], "/slip")).json()
    code = dechiffrer(CommandeVendeur.objects.get(ref=cc["ref"]).code_chiffre)
    assert code not in str(bon) and fuites(bon, valeurs_interdites=(cc["client"].first_name,)) == []
    assert api.get(url("BLV-999999", "/slip")).status_code == 404


def test_bon_ouvert_une_fois_par_membre_et_par_jour(b):
    cc = commande_client(creer_offre(b))
    for api in (preparation(b), preparation(b), proprietaire(b)):
        assert api.post(url(cc["ref"], "/slip/open")).status_code == 204
    c = CommandeVendeur.objects.get(ref=cc["ref"])
    assert c.journal.filter(action="Bon de préparation ouvert").count() == 2
    assert proprietaire(b).post(url("BLV-999999", "/slip/open")).status_code == 404


def test_cocher_et_verifier_la_reference(b):
    cc = commande_client(creer_offre(b))
    api = preparation(b)
    bon = api.post(url(cc["ref"], "/slip/checks"), {"i": 2, "fait": True}, format="json").json()
    assert bon["aVerifier"][2] == {"cle": "accessoires", "fait": True, "par": "Aïcha N."}
    bon = api.post(url(cc["ref"], "/slip/checks"), {"i": 2, "fait": False}, format="json").json()
    assert bon["aVerifier"][2] == {"cle": "accessoires", "fait": False, "par": None}
    assert api.post(url(cc["ref"], "/slip/checks"), {"i": 9, "fait": True}, format="json").status_code == 200
    assert api.post(url("BLV-999999", "/slip/checks"), {"i": 0, "fait": True}, format="json").status_code == 404
    r = api.post(url(cc["ref"], "/slip/verify"), {"lu": "ITL-AC52-BL"}, format="json").json()
    assert r == {"ok": False, "raison": "autre_reference", "detail": "ITL-AC52-NR"}
    r = api.post(url(cc["ref"], "/slip/verify"), {"lu": "itl ac52 nr"}, format="json").json()
    assert r["ok"] and r["bon"]["aVerifier"][0]["fait"]
    assert CommandeVendeur.objects.get(ref=cc["ref"]).journal.first().action == "Référence vérifiée"
    assert api.post(url("BLV-999999", "/slip/verify"), {"lu": "x"}, format="json").json()["raison"] == "introuvable"


def test_parametres_de_repli():
    assert (
        services.plafonds()["confirme"] == 250000
        and services.niveau_requis(300000) == "Or"
        and services.niveau_requis(100000) == "Confirme"
    )
    assert services.niveau_requis(1000) == "Nouveau" and services.file_heures() == 72
    assert services._valeur_journal("Stock") == "Stock"


def test_offre_sans_fiche_n_a_pas_de_vendeur_suivant(b):
    o = creer_offre(b)
    cc = commande_client(o)
    Offre.objects.filter(pk=o.pk).update(fiche=None)
    proprietaire(b).post(url(cc["ref"], "/stockout"), {}, format="json")
    assert CommandeVendeur.objects.get(ref=cc["ref"]).motif_annulation == "rupture"
