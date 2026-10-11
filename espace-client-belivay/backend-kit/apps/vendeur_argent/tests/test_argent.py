# L'argent d'une vraie commande, du paiement au versement du vendredi crédité (horloge d'essai) ; gel par un litige ;
# reprise après un litige perdu ; refus de l'opérateur ; documents ; accès Préparation ; anonymat.
import re
from datetime import timedelta

import pytest
from django.core.cache import cache
from django.test import override_settings

from apps.client_core.erreurs import ErreurClient
from apps.client_core.temps import YAOUNDE, ms
from apps.otp.prestataires import SmsConsole
from apps.vendeur_argent import services
from apps.vendeur_argent.models import Reprise, Versement
from apps.vendeur_core import horloge
from apps.vendeur_core.anonymat import fuites
from apps.vendeur_core.horloge import CLE
from apps.vendeur_core.tests.outils import preparation, proprietaire

from .outils import aller, boutique_et_commande, cle, litige, lundi_prochain, retirer

pytestmark = [pytest.mark.django_db, pytest.mark.usefixtures("horloge_propre")]


@pytest.fixture
def horloge_propre():
    cache.delete(CLE)
    SmsConsole.ENVOYES.clear()
    with override_settings(BELIVAY_ESSAI_ROUTES=True):
        yield
    cache.delete(CLE)


def interdits(cc):
    from apps.client_core import pont

    c = cc["client"]
    return (c.first_name, c.email, pont.modele("relais").objects.first().name)


# ── Le parcours de l'argent d'une vente ────────────────────────────────────────────────────────────────


def test_argent_d_une_commande_jusqu_au_versement_du_vendredi():
    b, o, cc, c = boutique_et_commande()
    api = proprietaire(b)
    lundi = lundi_prochain()
    aller(lundi - timedelta(hours=1))
    r = api.get("/api/vendors/money/summary").json()
    assert (r["enCours"], r["seLibere"], r["aVerser"], r["gele"]) == (c.garde, 0, 0, 0)
    assert r["enCirculation"] == r["aVerser"] + r["seLibere"] + r["enCours"] + r["gele"]
    assert r["lignes"]["enCours"] == {"ref": c.ref, "autres": 0}
    assert r["mouvements"][0]["etat"] == "en_cours" and r["exemple"] == {
        "prix": 20000,
        "garde": services.socle.garde_par_vente(b, "Électronique", 20000),
    }
    assert r["numero"] == {"operateur": "MTN", "masque": "···· 4217", "enRevue": False}
    assert fuites(r, valeurs_interdites=interdits(cc)) == []
    assert api.get("/api/vendors/payouts/next").json()["error"]["code"] == "not_found"

    # Remise au client lundi 10 h : fermeture du retour lundi suivant 10 h, libération jeudi 10 h (Bronze, 3 jours).
    retirer(c, lundi)
    aller(lundi + timedelta(days=2))
    r = api.get("/api/vendors/money/summary").json()
    lib = lundi + timedelta(days=10)
    assert (r["enCours"], r["seLibere"]) == (0, c.garde)
    assert r["lignes"]["seLibere"] == {"ref": c.ref, "a": ms(lib), "autres": 0}
    assert r["passeA"] is None  # libérée après l'arrêté de ce jeudi : le vendredi suivant
    m = r["mouvements"][0]
    assert m["etat"] == "se_libere" and m["vendredi"] == (lib + timedelta(days=1)).date().isoformat() and 0 <= m["progression"] <= 100
    sl = api.get("/api/vendors/money/releasing").json()
    assert (
        sl["cartes"][0]["fermeture"] == ms(lundi + timedelta(days=7))
        and sl["cartes"][0]["carte"] is False
        and sl["delais"]["standard"] == 3
    )
    aller(lundi + timedelta(days=9))
    assert api.get("/api/vendors/money/summary").json()["passeA"] == {"montant": c.garde, "ref": c.ref, "a": ms(lib)}
    p = api.get("/api/vendors/payouts/next").json()
    assert p["statut"] == "prevu" and p["montant"] == c.garde and p["aVerser"] == 0 and p["reference"].startswith("BLV-VS-")
    assert p["commandes"][0]["ref"] == c.ref and p["numero"] == "MTN ···· 4217"

    # Jeudi 11 h : libérée, « À verser » ; part vendredi.
    aller(lib + timedelta(hours=1))
    r = api.get("/api/vendors/money/summary").json()
    assert r["aVerser"] == c.garde and r["prochainVersement"]["montant"] == c.garde
    assert r["gagneDepuisInscription"] == c.garde
    assert services.a_verser(b) == c.garde and services.versement_de(c) is None

    # Vendredi 0 h 30 : l'arrêté du jeudi 23 h 59 est passé : versement envoyé.
    vendredi = (lib + timedelta(days=1)).date()
    aller(lib + timedelta(hours=14, minutes=30))
    p = api.get("/api/vendors/payouts/next").json()
    v = Versement.objects.get(boutique=b)
    assert (p["statut"], p["reference"], p["montant"], v.vendredi) == ("envoye", v.reference, c.garde, vendredi)
    assert services.executer_versements(b) == []  # idempotent

    # Vendredi 12 h 30 : crédité ; l'historique le garde.
    aller(lib + timedelta(days=1, hours=2, minutes=30))
    h = api.get("/api/vendors/payouts?period=3").json()
    assert h["nombre"] == 1 and h["total"] == c.garde and h["versements"][0]["statut"] == "credite"
    assert h["versements"][0]["commandes"] == [{"ref": c.ref, "liberation": ms(lib), "garde": c.garde}]
    assert services.versement_de(c) == v.reference
    r = api.get("/api/vendors/money/summary").json()
    assert (r["aVerser"], r["enCirculation"], r["mouvements"][0]["etat"]) == (0, 0, "verse")
    g = api.get(f"/api/vendors/money/earnings?month={lib.astimezone(YAOUNDE).date().isoformat()[:7]}").json()
    assert g["dejaVerses"] == c.garde and g["gagne"] == c.garde and g["lignes"][0]["ref"] == c.ref and g["parProduit"][0]["quantite"] == 1
    assert fuites(h, valeurs_interdites=interdits(cc)) == [] and fuites(g, valeurs_interdites=interdits(cc)) == []

    # Versement non reçu : signalé une fois.
    r1 = api.post(f"/api/vendors/payouts/{v.reference}/incident", {}, format="json", HTTP_IDEMPOTENCY_KEY=cle()).json()
    assert r1["ok"] is True and r1["reponseAvant"] > ms(horloge.maintenant())
    assert api.post(f"/api/vendors/payouts/{v.reference}/incident", {}, format="json", HTTP_IDEMPOTENCY_KEY=cle()).json() == {
        "ok": False,
        "raison": "deja",
    }
    assert api.post("/api/vendors/payouts/BLV-VS-9999/incident", {}, format="json", HTTP_IDEMPOTENCY_KEY=cle()).json() == {
        "ok": False,
        "raison": "inconnu",
    }
    assert api.get("/api/vendors/payouts?period=tout").json()["versements"][0]["signale"] is True


def test_tout_est_en_ordre_et_carte_raccourcissent_ou_allongent():
    b, o, cc, c = boutique_et_commande()
    lundi = lundi_prochain()
    aller(lundi + timedelta(hours=3))
    retirer(c, lundi, tout_en_ordre=lundi + timedelta(hours=2))
    vs = services.ventes(b)
    assert vs[0].fermeture == lundi + timedelta(hours=2) and vs[0].liberation == lundi + timedelta(days=3, hours=2)
    c.moyen = "carte"
    c.save()
    assert services.ventes(b)[0].liberation == lundi + timedelta(days=14, hours=2)


def test_versements_rattrapes_plusieurs_vendredis_et_reprise_d_un_litige_perdu():
    b, o, cc, c = boutique_et_commande()
    from apps.vendeur_core.tests.outils import commande_client

    cc2 = commande_client(o, client=cc["client"])
    c2 = services.CommandeVendeur.objects.get(ref=cc2["ref"])
    lundi = lundi_prochain()
    retirer(c, lundi, tout_en_ordre=lundi)
    retirer(c2, lundi + timedelta(days=7), tout_en_ordre=lundi + timedelta(days=7))
    aller(lundi + timedelta(days=30))
    crees = services.executer_versements()
    assert len(crees) == 2 and {v.statut for v in crees} == {"credite"} and crees[0].vendredi < crees[1].vendredi
    assert crees[1].numero == crees[0].numero + 1

    # Vice caché tranché contre le vendeur après le versement : le gardé est repris sur le versement suivant.
    lit = litige(c, cc["client"], horloge.maintenant())
    lit.decision_le = lit.clos_le = horloge.maintenant()
    lit.issue, lit.rembourse = "rembourse", c.prix
    lit.save()
    api = proprietaire(b)
    g = api.get(f"/api/vendors/money/earnings?month={horloge.maintenant().astimezone(YAOUNDE).date().isoformat()[:7]}").json()
    assert any(x["type"] == "reprise" and x["garde"] == -c.garde for x in g["lignes"])
    r = Reprise.objects.get(commande=c)
    assert r.reste == c.garde
    cc3 = commande_client(o, client=cc["client"])
    c3 = services.CommandeVendeur.objects.get(ref=cc3["ref"])
    retirer(c3, horloge.maintenant(), tout_en_ordre=horloge.maintenant())
    aller(horloge.maintenant() + timedelta(days=11))
    services.executer_versements(b)
    v3 = Versement.objects.filter(boutique=b).order_by("-numero").first()
    r.refresh_from_db()
    assert v3.repris == c.garde and v3.montant == c3.garde - c.garde and r.reste == 0


def test_gel_par_un_litige_puis_liberation_apres_le_delai_de_recours():
    b, o, cc, c = boutique_et_commande()
    api = proprietaire(b)
    lundi = lundi_prochain()
    retirer(c, lundi)
    lit = litige(c, cc["client"], lundi + timedelta(days=1))
    aller(lundi + timedelta(days=2))
    r = api.get("/api/vendors/money/summary").json()
    assert r["gele"] == c.garde and r["lignes"]["gele"]["litiges"] == 1 and r["prochainVersement"] is None
    f = api.get("/api/vendors/money/frozen").json()
    assert f["total"] == c.garde and f["cartes"][0]["type"] == "litige" and f["cartes"][0]["motif"] == "Abîmé"
    assert f["cartes"][0]["echeance"] == ms(lit.echeance_vendeur) and f["remboursementAuto"] == {"standard": 3000, "tresFiable": 10000}
    assert fuites(f, valeurs_interdites=interdits(cc)) == []
    # Un retour ouvert sur le litige : carte « retour », inspection après réception.
    from apps.aftersales.models import Retour

    rt = Retour.objects.create(litige=lit, deposer_avant=lundi + timedelta(days=5), recu_le=lundi + timedelta(days=2))
    f = api.get("/api/vendors/money/frozen").json()
    assert f["cartes"][0]["type"] == "retour" and f["cartes"][0]["arrivee"] == ms(rt.recu_le)
    rt.delete()
    # Le vendeur gagne le litige : gelé pendant le délai de recours, puis libéré (jamais avant la date prévue).
    lit.decision_le = lit.clos_le = lundi + timedelta(days=2)
    lit.issue = "refuse"
    lit.save()
    f = api.get("/api/vendors/money/frozen").json()
    assert f["cartes"][0]["echeance"] is not None
    aller(lundi + timedelta(days=11))
    r = api.get("/api/vendors/money/summary").json()
    assert r["gele"] == 0 and r["aVerser"] == c.garde


def test_refus_de_l_operateur_essais_puis_suspension_et_reprise_apres_nouveau_numero():
    b, o, cc, c = boutique_et_commande()
    api = proprietaire(b)
    lundi = lundi_prochain()
    retirer(c, lundi, tout_en_ordre=lundi)
    vendredi = lundi + timedelta(days=4)  # libérée jeudi 10 h, versée vendredi
    aller(vendredi - timedelta(hours=9))
    [v] = services.executer_versements(b)
    r = services.refuser_versement(v.reference, "tiers")
    assert r["statut"] == "refuse" and len(r["essais"]) == 3
    p = api.get("/api/vendors/payouts/next").json()
    assert p["statut"] == "refuse" and p["incident"]["motif"] == "tiers" and p["incident"]["suspendu"] is False
    # Le premier essai (+ 24 h) passe : crédité.
    aller(vendredi + timedelta(days=1, hours=1))
    services.executer_versements(b)
    v.refresh_from_db()
    assert v.statut == "credite" and v.essais_faits == 1


def test_trois_essais_refuses_suspendent_les_versements():
    b, o, cc, c = boutique_et_commande()
    lundi = lundi_prochain()
    retirer(c, lundi, tout_en_ordre=lundi)
    aller(lundi + timedelta(days=4, hours=1) - timedelta(hours=10))
    [v] = services.executer_versements(b)
    for motif in ("plein", "plein", "plein"):
        assert services.refuser_versement(v.reference, motif)["statut"] == "refuse"
    r = services.refuser_versement(v.reference, "prefixe")
    v.refresh_from_db()
    assert r["statut"] == "suspendu" and v.statut == "suspendu" and services.incident(v)["suspendu"] is True
    # Suspendu : aucun nouveau versement.
    assert services._executer(b, horloge.maintenant() + timedelta(days=14)) == []
    with pytest.raises(ErreurClient):
        services.refuser_versement("BLV-VS-0000", "plein")
    with pytest.raises(ErreurClient):
        services.refuser_versement(v.reference, "autre")


def test_crediter_un_versement_refuse():
    b, o, cc, c = boutique_et_commande()
    lundi = lundi_prochain()
    retirer(c, lundi, tout_en_ordre=lundi)
    aller(lundi + timedelta(days=4) - timedelta(hours=9))
    [v] = services.executer_versements(b)
    services.refuser_versement(v.reference, "plein")
    assert services.crediter(v.reference)["statut"] == "credite"


# ── Documents ──────────────────────────────────────────────────────────────────────────────────────────


def test_documents_et_contenus():
    b, o, cc, c = boutique_et_commande()
    api = proprietaire(b)
    lundi = lundi_prochain()
    retirer(c, lundi, tout_en_ordre=lundi)
    aller(lundi + timedelta(days=10))
    d = api.get("/api/vendors/documents").json()
    assert d["releves"][0]["statut"] == "open" and d["recus"]["refs"] == [c.ref] and d["entreprise"] == {"rccm": False, "niu": False}
    assert d["factures"]["abonnement"] == [] and d["contrat"]["signeLe"] == "2026-08-20" and d["releves"][-1]["periode"] == "2026-08"
    mois = horloge.maintenant().astimezone(YAOUNDE).date().isoformat()[:7]
    moislib = (lundi + timedelta(days=3)).astimezone(YAOUNDE).date().isoformat()[:7]
    rel = api.get(f"/api/vendors/documents/content?type=releve&periode={moislib}").json()
    assert rel["lignes"][0][0] == c.ref and rel["totaux"][-1] == c.garde
    fac = api.get(f"/api/vendors/documents/content?type=facture&periode={moislib}").json()
    assert fac["lignes"][0][3] == c.commission and "commission" in fac["titre"].lower()
    con = api.get("/api/vendors/documents/content?type=contrat").json()
    assert con["totaux"] is None and con["lignes"][0][1].endswith("%")
    ver = api.get("/api/vendors/documents/content?type=versements&periode=tout").json()
    assert ver["lignes"][0][1].startswith("BLV-VS-")
    for mauvais in ("type=releve&periode=x", "type=versements&periode=5", "type=autre", ""):
        assert api.get(f"/api/vendors/documents/content?{mauvais}").status_code == 400
    assert api.get("/api/vendors/money/earnings?month=2026-13").status_code == 400
    assert api.get("/api/vendors/payouts?period=2").status_code == 400
    assert api.get(f"/api/vendors/money/earnings?month={mois}").status_code == 200
    assert api.get("/api/vendors/money/earnings").status_code == 200
    for x in (d, rel, fac, con, ver):
        assert fuites(x, valeurs_interdites=interdits(cc)) == []


def test_factures_de_croissance_lues_si_l_application_les_expose(monkeypatch):
    import sys
    import types

    b, o, cc, c = boutique_et_commande()
    mod = types.ModuleType("apps.vendeur_croissance.services")
    mod.factures = lambda boutique: {"abonnement": [{"periode": "2026-09", "emisLe": "2026-10-01", "libelle": "Boost"}]}
    monkeypatch.setitem(sys.modules, "apps.vendeur_croissance.services", mod)
    d = services.documents(b)
    assert d["factures"]["abonnement"][0]["libelle"] == "Boost" and d["factures"]["visibilite"] == []


# ── Accès Préparation : 403 owner_only sur toutes les routes d'argent et de versement ──────────────────


ROUTES_ARGENT = [
    ("get", "/api/vendors/money/summary"),
    ("get", "/api/vendors/money/releasing"),
    ("get", "/api/vendors/money/frozen"),
    ("get", "/api/vendors/money/earnings?month=2026-09"),
    ("get", "/api/vendors/documents"),
    ("get", "/api/vendors/documents/content?type=contrat"),
    ("get", "/api/vendors/payouts/next"),
    ("get", "/api/vendors/payouts"),
    ("post", "/api/vendors/payouts/BLV-VS-4071/incident"),
    ("get", "/api/vendors/payout-number"),
    ("put", "/api/vendors/payout-number"),
    ("post", "/api/vendors/payout-number/codes"),
    ("delete", "/api/vendors/payout-number/codes"),
    ("post", "/api/vendors/payout-number/codes/resend"),
]


@pytest.mark.parametrize("methode,route", ROUTES_ARGENT)
def test_preparation_n_a_pas_acces_a_l_argent(methode, route):
    b, o, cc, c = boutique_et_commande()
    r = getattr(preparation(b), methode)(route, {}, format="json", HTTP_IDEMPOTENCY_KEY=cle())
    assert r.status_code == 403 and r.json()["error"]["code"] == "owner_only"


def test_compte_client_sans_boutique():
    from apps.client_core.tests.outils import client_connecte, creer_client

    r = client_connecte(creer_client()).get("/api/vendors/money/summary")
    assert r.status_code == 403 and r.json()["error"]["code"] == "pas_vendeur"


# ── Démo ───────────────────────────────────────────────────────────────────────────────────────────────


def test_demo_versements_du_jeu_d_essai(monkeypatch):
    from apps.vendeur_argent import demo

    b, o, cc, c = boutique_et_commande()
    lundi = lundi_prochain()
    retirer(c, lundi, tout_en_ordre=lundi)
    aller(lundi + timedelta(days=3, hours=1))
    monkeypatch.setattr(demo, "VERSEMENTS", ((c.ref, 4071),))
    monkeypatch.setattr(demo.socle_demo, "commande", lambda ref: services.CommandeVendeur.objects.filter(ref=ref).first())
    demo.charger(b)
    demo.charger(b)  # idempotent
    v = Versement.objects.get(reference="BLV-VS-4071")
    assert v.statut == "credite" and v.commandes.count() == 1 and services.versement_de(c) == "BLV-VS-4071"
    assert re.fullmatch(r"BLV-VS-\d{4}", services.prochain(b)["reference"] if services.prochain(b) else "BLV-VS-4072")


def test_comptoir_rien_avant_le_retrait_et_litige_perdu_avant_versement_jamais_du():
    from apps.vendeur_core.tests.outils import commande_client, creer_boutique_vendeur, creer_offre

    b = creer_boutique_vendeur()
    o = creer_offre(b, prix=10000, stock=5)
    cc = commande_client(o, comptoir=True)
    c = services.CommandeVendeur.objects.get(ref=cc["ref"])
    lundi = lundi_prochain()
    aller(lundi)
    assert services.ventes(b) == []  # payable au retrait : rien n'est dû avant
    retirer(c, lundi)
    assert services.ventes(b)[0].etat == "Se libère"
    lit = litige(c, cc["client"], lundi + timedelta(hours=1))
    lit.decision_le = lit.clos_le = lundi + timedelta(hours=2)
    lit.issue, lit.rembourse = "rembourse", c.prix
    lit.save()
    assert services.ventes(b) == [] and not Reprise.objects.exists()  # BelivaY ne perd jamais
