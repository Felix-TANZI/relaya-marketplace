# Mon palier (GET /tiers, VD10-R08) : conditions et ce qui manque, projection, montée en 14 jours, descente proposée,
# alerte à 3 points, gardé par palier sur l'article de référence (moteur de commission), accès Préparation sans montant.
from datetime import timedelta
from decimal import Decimal

import pytest

from apps.vendeur_core import horloge
from apps.vendeur_core import services as socle
from apps.vendeur_core.anonymat import fuites
from apps.vendeur_core.tests.outils import commande_client, creer_boutique_vendeur, creer_fiche, creer_offre, preparation, proprietaire
from apps.vendeur_croissance import services
from apps.vendeur_croissance.models import ProjectionScore, ReleveScore

pytestmark = pytest.mark.django_db


def test_bronze_vers_argent_avec_ce_qui_manque():
    b = creer_boutique_vendeur()
    r = proprietaire(b).get("/api/vendors/tiers").json()
    assert (r["palier"], r["score"], r["suivant"], r["seuilSuivant"], r["seuilActuel"]) == ("Bronze", 62.7, "Argent", 65, None)
    assert r["conditions"] == [
        {"cle": "score", "libelle": "Trust Score 65 au moins", "valeur": "63", "tenue": False, "manque": "+ 2"},
        {"cle": "livrees", "libelle": "10 commandes livrées", "valeur": "7", "tenue": False, "manque": "+ 3"},
        {"cle": "note", "libelle": "Note moyenne 4,0 au moins", "valeur": "4,0", "tenue": True, "manque": None},
    ]
    assert r["alerte"] == {"sens": "montee", "seuil": 65, "points": 2}
    assert r["commandesAFaire"] == 3 and r["projection"] is None and r["montee"] is None and r["descente"] is None
    # Article de référence par défaut (aucune vente) : ITEL AC52 20 000 F ; découverte pas commencée : 17 840 F gardés.
    assert r["reference"] == {
        "titre": "ITEL AC52",
        "prix": 20000,
        "actuel": 17840,
        "suivant": socle.garde_par_vente(b, "Électronique", 20000, palier="Argent"),
    }
    assert r["exemple"] is None
    lignes = {x["palier"]: x for x in r["paliers"]}
    assert (
        lignes["Bronze"]["vous"]
        and lignes["Bronze"]["gainSurActuel"] == 0
        and lignes["Bronze"]["conditions"] == "Pièce d’identité et selfie validés"
    )
    assert lignes["Argent"]["manque"] == "Il vous manque 2 points et 3 commandes livrées"
    assert lignes["Argent"]["gainSurActuel"] == lignes["Argent"]["garde"] - 17840
    assert lignes["Or"]["conditions"] == "Trust Score 80, 50 commandes livrées, note 4,3, visite de la boutique"
    assert (
        lignes["Platine"]["responsableDeCompte"] and lignes["Platine"]["liberationJours"] == 1 and lignes["Bronze"]["liberationJours"] == 3
    )
    assert r["liberationJours"] == {"actuel": 3, "suivant": 3}
    assert (r["montee14"], r["descente14"], r["remplacementMin"], r["supportHeures"]) == (14, 14, 75, 2)
    assert r["decouverte"] is None  # pas encore commencée (aucune commande payée)


def test_reference_la_plus_vendue_exemple_cher_projection_et_preparation():
    b = creer_boutique_vendeur()
    itel = creer_offre(b, prix=20000, stock=10)
    iphone = creer_offre(
        b,
        fiche=creer_fiche("iPhone 15 Pro Max", variantes=("256 Go",), prix_min=300000, prix_max=400000),
        variante="256 Go",
        prix=350000,
        stock=2,
    )
    commande_client(itel)
    commande_client(itel)
    commande_client(iphone)
    ProjectionScore.objects.create(
        boutique=b, commandes=3, score_apres=Decimal(66), si_gagnes=Decimal(64), si_perdus=Decimal(55), calculee_le=horloge.maintenant()
    )
    r = services.mon_palier(b, True)
    assert r["reference"]["titre"] == "ITEL AC52" and r["reference"]["actuel"] == socle.garde_par_vente(b, "Électronique", 20000)
    assert r["exemple"]["titre"] == "iPhone 15 Pro Max" and r["exemple"]["gain"] == socle.garde_par_vente(
        b, "Électronique", 350000, palier="Argent"
    ) - socle.garde_par_vente(b, "Électronique", 350000)
    assert r["projection"] == {"commandes": 3, "scoreApres": 66.0, "litigesEnCours": 0, "siGagnes": None, "siPerdus": None}
    assert r["decouverte"]["commandes"] == 3 and r["decouverte"]["max"] == 50
    # Accès Préparation : aucun montant (DP-55).
    p = preparation(b).get("/api/vendors/tiers").json()
    assert p["reference"] is None and p["exemple"] is None
    assert all(x["garde"] is None and x["gardeExemple"] is None and x["gainSurActuel"] is None for x in p["paliers"])
    assert p["conditions"] == r["conditions"]


def test_montee_en_attente_des_14_jours_et_descente_proposee():
    b = creer_boutique_vendeur(trust="66.0")
    b.commandes_livrees = 10
    b.save()
    j = horloge.aujourd_hui()
    for i in range(5):
        ReleveScore.objects.create(boutique=b, jour=j - timedelta(days=i), score=Decimal("66"), commandes_livrees=10, note=Decimal("4.0"))
    ReleveScore.objects.create(boutique=b, jour=j - timedelta(days=5), score=Decimal("60"), commandes_livrees=10, note=Decimal("4.0"))
    r = services.mon_palier(b, True)
    assert all(c["tenue"] for c in r["conditions"]) and r["montee"] == {"date": (j + timedelta(days=9)).isoformat()}
    assert r["paliers"][1]["manque"] is None
    # Argent à 66 : alerte de descente (3 points du seuil 65) et descente proposée en cours.
    b.palier = "Argent"
    b.save()
    d = services.decider(
        b,
        "descente",
        "Trust Score sous 65 pendant 14 jours de suite",
        validee_par="Qualité",
        palier_vise="Bronze",
        effet_a=horloge.maintenant() + timedelta(days=5),
    )
    r = services.mon_palier(b, True)
    assert r["seuilActuel"] == 65 and r["alerte"] == {"sens": "descente", "seuil": 65, "points": 1}
    assert r["descente"]["decisionId"] == d.ident and r["descente"]["vers"] == "Bronze" and r["descente"]["contestee"] is False
    assert services.statut_compte(b)["etat"] == "aucune" and services.statut_compte(b)["enCours"]["type"] == "descente"
    services.contester(b, None, d.ident, "Les deux litiges en cours expliquent la baisse, ils ne sont pas tranchés.", [])
    r = services.mon_palier(b, True)
    assert r["descente"]["contestee"] is True and r["descente"]["reponseAvant"] is not None
    assert r["conditions"][-1]["cle"] == "visite" and r["conditions"][-1]["valeur"] == "à prévoir"
    # Platine : plus de palier suivant.
    b.palier = "Platine"
    b.trust_score = Decimal("95")
    b.audit = True
    r = services.mon_palier(b, True)
    assert r["suivant"] is None and r["conditions"] == [] and r["commandesAFaire"] is None and r["exemple"] is None
    assert r["reference"]["suivant"] is None and r["liberationJours"] == {"actuel": 1, "suivant": None}


def test_palier_de_lancement_et_litiges_dans_la_projection():
    b = creer_boutique_vendeur()
    b.signature_le = horloge.aujourd_hui() - timedelta(days=10)
    b.save()
    for i in range(15):
        creer_offre(b, variante=f"v{i}", stock=3, publier=False)
    b.offres.update(etat="en_vente")
    r = services.mon_palier(b, True)
    assert r["lancement"]["palier"] == "Argent" and r["lancement"]["produitsActifs"] == 15


def test_anonymat_des_paliers():
    b = creer_boutique_vendeur()
    o = creer_offre(b)
    cc = commande_client(o)
    r = proprietaire(b).get("/api/vendors/tiers").json()
    assert fuites(r, valeurs_interdites=(cc["client"].first_name, cc["client"].email, "Relais Mvog-Ada")) == []
