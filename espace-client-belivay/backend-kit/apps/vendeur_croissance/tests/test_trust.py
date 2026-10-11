# Trust Score, état du compte, décisions et contestation (VD-10 ; SAN-01 à SAN-06, CTRL-RAMASSAGE, CON-01).
from datetime import datetime, timedelta
from decimal import Decimal

import pytest

from apps.client_core.temps import YAOUNDE
from apps.vendeur_core import horloge
from apps.vendeur_core.models import CommandeVendeur
from apps.vendeur_core.tests.outils import commande_client, creer_boutique_vendeur, creer_offre, preparation, proprietaire
from apps.vendeur_croissance import services
from apps.vendeur_croissance.models import CritereScore, Decision, EvenementScore, JournalImmuable, ReleveScore

pytestmark = pytest.mark.django_db
CLE = {"HTTP_IDEMPOTENCY_KEY": "cle-essai-contester-1"}


def statut(b):
    """GET /account/status servi par la vue de vendeur_croissance (StatutCompte), appelée directement : la route est
    aussi déclarée par d'autres applications vendeur montées avant (conflit signalé au coordinateur)."""
    from rest_framework.test import APIRequestFactory, force_authenticate

    from apps.vendeur_croissance.views import StatutVue

    req = APIRequestFactory().get("/api/vendors/account/status")
    force_authenticate(req, user=b.proprietaire)
    r = StatutVue.as_view()(req)
    r.render()
    return r


def y(*a):
    return datetime(*a, tzinfo=YAOUNDE)


def test_score_criteres_journal_bareme_et_historique():
    b = creer_boutique_vendeur()
    services.enregistrer_releve(
        b, "62.7", criteres_={"ponctualite": (25, "69.6", "7 commandes prêtes dans le délai"), "documents": (10, 100, "CNI valide")}
    )
    ReleveScore.objects.create(boutique=b, jour=horloge.aujourd_hui() - timedelta(days=40), score=Decimal("50"))
    services.journaliser_evenement(
        b, "Prête dans le délai", "succes", critere="ponctualite", ref="BLV-1", a=horloge.maintenant() - timedelta(days=2)
    )
    services.journaliser_evenement(b, "Avis 3 ★", "neutre", critere="satisfaction", ref="BLV-2", a=horloge.maintenant() - timedelta(days=1))
    r = proprietaire(b).get("/api/vendors/score").json()
    assert r["total"] == 62.7
    assert r["criteres"][0] == {
        "cle": "ponctualite",
        "nom": "Ponctualité",
        "poids": 25,
        "note": 69.6,
        "points": 17.4,
        "detail": "7 commandes prêtes dans le délai",
    }
    assert r["criteres"][1]["cle"] == "documents" and r["criteres"][1]["points"] == 10.0
    assert [e["libelle"] for e in r["evenements"]] == ["Avis 3 ★", "Prête dans le délai"]
    assert r["evenements"][0]["ref"] == "BLV-2" and r["evenements"][0]["critere"] == "satisfaction"
    assert len(r["bareme"]) == 14 and {"evenement": "Document expiré", "effet": "documents_zero"} in r["bareme"]
    assert len(r["historique"]) == 30 and r["historique"][0]["score"] == 50.0 and r["historique"][-1]["score"] == 62.7
    assert r["sanction"] is None and r["controleAuRamassage"] == "100 %"
    assert r["gele"] is True  # aucune commande depuis la signature (août) : SCO-03
    # L'accès Préparation lit le score (aucun montant dedans).
    assert preparation(b).get("/api/vendors/score").status_code == 200


def test_historique_sans_releve_garde_le_score_du_jour():
    b = creer_boutique_vendeur(trust="70.0")
    assert {x["score"] for x in services.historique(b)} == {70.0}
    assert services.criteres(b) == []


def test_journal_du_score_immuable():
    b = creer_boutique_vendeur()
    e = services.journaliser_evenement(b, "Prête dans le délai", "succes")
    e.libelle = "autre"
    with pytest.raises(JournalImmuable):
        e.save()
    with pytest.raises(JournalImmuable):
        e.delete()
    assert EvenementScore.objects.get(pk=e.pk).libelle == "Prête dans le délai"
    assert CritereScore.objects.count() == 0


def test_heures_ouvrees_dimanche_non_compte():
    # Samedi 26 sept. 10 h + 72 h ouvrées : 14 h samedi, dimanche sauté, lundi, mardi, 10 h mercredi.
    assert services.apres_heures_ouvrees(y(2026, 9, 26, 10), 72) == y(2026, 9, 30, 10)
    assert services.apres_heures_ouvrees(y(2026, 9, 21, 9), 72) == y(2026, 9, 24, 9)


def test_statut_controle_au_ramassage():
    b = creer_boutique_vendeur()
    o = creer_offre(b, stock=20)
    for _ in range(6):
        commande_client(o)
    st = statut(b).data
    assert st["etat"] == "aucune" and st["enCours"] is None and st["finEffet"] is None
    assert st["controle"]["sur"] == 1 and st["controle"]["raison"] == "premieres" and st["controle"]["ramassees"] == 0
    assert st["regles"] == {
        "visibiliteJours": 14,
        "suspensionSous": 40,
        "nonPreparations": 3,
        "nonPreparationsJours": 30,
        "suspensionMaxJours": 30,
        "probatoireCommandes": 20,
    }
    CommandeVendeur.objects.filter(boutique=b).update(remise_a=horloge.maintenant() - timedelta(hours=1))
    c = services.controle(b)
    assert (c["sur"], c["raison"], c["seuilReduction"], c["surApres"]) == (20, "sous_seuil", 70, 100)
    assert services.score(b)["controleAuRamassage"] == "1 sur 20"
    assert services.score(b)["gele"] is False
    # Au-dessus de 70 : 1 sur 100.
    b.trust_score = Decimal("75")
    assert (services.controle(b)["sur"], services.controle(b)["raison"]) == (100, "au_dessus")
    # Baisse de 8 points en une semaine : contrôle renforcé (L-1).
    ReleveScore.objects.create(boutique=b, jour=horloge.aujourd_hui() - timedelta(days=7), score=Decimal("84"))
    c = services.controle(b)
    assert (c["sur"], c["raison"], c["seuilReduction"]) == (1, "renforce", 60)


def test_decisions_avertissement_et_contestation_unique():
    b = creer_boutique_vendeur()
    api = proprietaire(b)
    assert api.get("/api/vendors/account/decisions").json() == []
    d = services.decider(b, "avertissement", "Commande BLV-1 prête 40 minutes après l’échéance")
    assert d.niveau == 1 and d.validee_par == "" and d.ident.endswith("-A1")
    st = statut(b).data
    assert st["etat"] == "avertissement" and st["enCours"]["id"] == d.ident and st["enCours"]["valideePar"] is None
    assert api.get("/api/vendors/score").json()["sanction"]["niveau"] == 1
    assert api.get(f"/api/vendors/account/decisions/{d.ident}").json()["motif"].startswith("Commande BLV-1")
    assert api.get("/api/vendors/account/decisions/DEC-INCONNUE").status_code == 404
    assert b.notifications.filter(type="sanction", lien__contains=d.ident).exists()

    def contester(ident, texte, k):
        return api.post(
            "/api/vendors/score/appeal",
            {"decision": ident, "texte": texte, "preuves": ["photo-1"]},
            format="json",
            HTTP_IDEMPOTENCY_KEY=f"cle-contester-{k}",
        ).json()

    assert contester("DEC-X", "x" * 50, 1) == {"ok": False, "raison": "introuvable"}
    assert contester(d.ident, "trop court", 2) == {"ok": False, "raison": "trop_court"}
    assert contester(d.ident, "x" * 1001, 3) == {"ok": False, "raison": "trop_long"}
    r = contester(d.ident, "La commande était prête, le livreur est arrivé en retard au passage.", 4)
    assert r["ok"] is True and r["reponseAvant"] > horloge.maintenant_ms() + 71 * 3600 * 1000
    assert contester(d.ident, "Une seconde contestation de la même décision, refusée.", 5) == {"ok": False, "raison": "deja_contestee"}
    dj = api.get("/api/vendors/account/decisions").json()[0]
    assert dj["contestation"]["preuves"] == ["photo-1"] and dj["contestation"]["reponse"] is None
    # Réponse humaine : annulée, la décision cesse son effet.
    rep = services.repondre_contestation(d.ident, "annulee", "Retard du livreur confirmé.")
    assert rep["contestation"]["reponse"]["issue"] == "annulee"
    assert services.statut_compte(b)["etat"] == "aucune"
    # Avertissement passé (plus de 7 jours) : historique seulement.
    d2 = services.decider(b, "avertissement", "Autre retard", decidee_a=horloge.maintenant() - timedelta(days=10))
    assert not services.en_cours(d2) and services.statut_compte(b)["etat"] == "aucune"
    with pytest.raises(ValueError):
        services.repondre_contestation(d.ident, "peut-etre", "")


def test_decider_demande_une_personne_et_un_motif():
    b = creer_boutique_vendeur()
    with pytest.raises(ValueError):
        services.decider(b, "suspension", "Trois non-préparations")
    with pytest.raises(ValueError):
        services.decider(b, "avertissement", "  ")
    with pytest.raises(ValueError):
        services.decider(b, "descente", "Sous 65", validee_par="Qualité")
    v = services.decider(b, "visibilite_reduite", "Non préparée", validee_par="une personne de l’équipe Qualité")
    st = services.statut_compte(b)
    assert st["etat"] == "visibilite_reduite" and st["finEffet"] == services.ms(v.effet_a + timedelta(days=14))
    v2 = services.decider(b, "visibilite_reduite", "Encore", validee_par="Qualité")
    assert v2.ident != v.ident  # identifiant unique le même jour
    x = services.decider(b, "exclusion", "Contrefaçon", validee_par="Qualité")
    assert services.statut_compte(b)["etat"] == "exclu" and services.decision_en_cours(b) == x


def test_suspension_accueil_gel_et_periode_probatoire():
    b = creer_boutique_vendeur()
    o = creer_offre(b, stock=10)
    commande_client(o)
    assert services.suspension(b) is None
    d = services.decider(b, "suspension", "Trois commandes non préparées en 30 jours", validee_par="Qualité")
    b.refresh_from_db()
    assert b.suspendue_depuis is not None
    s = services.suspension(b)
    assert s == {
        "niveau": 3,
        "depuis": services.ms(d.effet_a),
        "motif": d.motif,
        "decision": d.ident,
        "contestation": None,
        "reponseHeuresOuvrees": 72,
        "scoreGeleSous": 40,
        "controleProbatoire": 20,
        "preparerEnCours": 1,
        "exemple": False,
    }
    st = statut(b).data
    assert st["etat"] == "suspendu" and st["finEffet"] == services.ms(d.effet_a + timedelta(days=30))
    assert services.score(b)["gele"] is True
    services.contester(b, None, d.ident, "Je n’ai reçu aucune notification pour ces trois commandes, voici les preuves.", [])
    assert services.suspension(b)["contestation"]["envoyeeLe"] > 0
    # Levée : période probatoire, toutes les commandes contrôlées jusqu'à 20.
    services.lever_suspension(b)
    b.refresh_from_db()
    assert b.suspendue_depuis is None and services.suspension(b) is None
    CommandeVendeur.objects.filter(boutique=b).update(remise_a=horloge.maintenant())
    c = services.controle(b)
    assert c["raison"] in ("premieres", "probatoire") and c["probatoire"] == {"controlees": 1, "total": 20} and c["sur"] == 1
    # Suspension annulée par la contestation : la boutique n'est plus suspendue.
    d2 = services.decider(b, "suspension", "Autre", validee_par="Qualité")
    services.contester(b, None, d2.ident, "Contestation de la deuxième suspension avec explication assez longue.", [])
    services.repondre_contestation(d2.ident, "annulee", "Erreur")
    b.refresh_from_db()
    assert b.suspendue_depuis is None


def test_suspension_sans_decision_et_probation_au_dela_des_premieres():
    b = creer_boutique_vendeur()
    b.suspendue_depuis = horloge.maintenant()
    b.save()
    assert services.suspension(b)["motif"] == ""
    o = creer_offre(b, stock=20)
    for _ in range(6):
        commande_client(o)
    d = Decision.objects.create(
        boutique=b,
        ident="DEC-S",
        type="suspension",
        niveau=3,
        decidee_a=horloge.maintenant() - timedelta(days=5),
        effet_a=horloge.maintenant() - timedelta(days=5),
        motif="x",
        validee_par="Q",
        levee_a=horloge.maintenant() - timedelta(days=1),
    )
    CommandeVendeur.objects.filter(boutique=b).update(remise_a=horloge.maintenant())
    c = services.controle(b)
    assert (c["raison"], c["sur"], c["probatoire"]) == ("probatoire", 1, {"controlees": 6, "total": 20})
    assert not services.en_cours(d)


def test_anonymat_du_trust():
    from apps.vendeur_core.anonymat import fuites

    b = creer_boutique_vendeur()
    o = creer_offre(b)
    cc = commande_client(o)
    c = CommandeVendeur.objects.get(boutique=b)
    services.journaliser_evenement(b, "Prête dans le délai", "succes", ref=c.ref)
    api = proprietaire(b)
    interdits = (cc["client"].first_name, cc["client"].email, "Relais Mvog-Ada")
    for route in ("/api/vendors/score", "/api/vendors/account/decisions"):
        assert fuites(api.get(route).json(), valeurs_interdites=interdits) == []
    assert fuites(statut(b).data, valeurs_interdites=interdits) == []
