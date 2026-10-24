# Saisie assistée (SAI-01 à 04) : contrôles, validation en vraies offres « en vérification », modification, accès
# Préparation (aucun montant, 403 owner_only) ; démonstration (dossier signé VD-2026-0913, fiches de l'agent) ; contrat.
import pytest
from rest_framework.test import APIClient

from apps.vendeur_core import demo as socle_demo
from apps.vendeur_core.anonymat import fuites
from apps.vendeur_core.models import Offre
from apps.vendeur_core.tests.outils import creer_boutique_vendeur, creer_fiche, creer_offre, preparation, proprietaire
from apps.vendeur_session import demo, ouverture
from apps.vendeur_session.models import DossierOuverture, FicheAgent, VisiteAgent

pytestmark = pytest.mark.django_db


def test_saisie_assistee_bout_en_bout():
    b = creer_boutique_vendeur()
    demo.charger(b)
    api = proprietaire(b)
    s = api.get("/api/vendors/assisted-entry").json()
    assert s["agent"]["prenom"] == "Aïssatou B." and s["gratuite"] and s["premieresBoutiques"] == 10 and s["prixSession"] == 5000
    assert s["seuilPrix"] == {"basPourCent": 50, "hautFois": 3} and len(s["fiches"]) == 3 and s["validees"] == []
    par_titre = {f["titre"]: f for f in s["fiches"]}
    assert par_titre["Chargeur rapide 18 W · USB-C"]["controles"]["prix"] == "echec"
    coque = par_titre["Coque ITEL AC52 · silicone"]
    assert coque["rattachee"] and coque["controles"]["doublon"] == "echec"
    ecouteurs = par_titre["Écouteurs filaires · jack 3,5 mm"]
    assert ecouteurs["controles"] == {"photo": "ok", "doublon": "ok", "prix": "ok", "description": "ok"} and ecouteurs["mediane"] == 3000

    # Modifier : refus, puis prix corrigé (le contrôle se recalcule).
    def put(i, **c):
        return api.put(f"/api/vendors/assisted-entry/{i}", c, format="json")

    chargeur = par_titre["Chargeur rapide 18 W · USB-C"]["id"]
    assert put(chargeur, prix=10, stock=1).json() == {"ok": False, "raison": "prix"}
    assert put(chargeur, prix=3500, stock=-1).json() == {"ok": False, "raison": "stock"}
    assert put("999", prix=3500, stock=1).status_code == 404
    r = put(chargeur, prix=3500, stock=8).json()
    assert r["ok"] and next(f for f in r["saisie"]["fiches"] if f["id"] == chargeur)["controles"]["prix"] == "ok"
    # Accès Préparation : aucune fiche (prix), aucun tarif ; valider et modifier : 403 owner_only.
    p = preparation(b)
    sp = p.get("/api/vendors/assisted-entry").json()
    assert sp["fiches"] == [] and sp["prixSession"] is None
    assert (
        p.post("/api/vendors/assisted-entry/approve", {"ids": [chargeur]}, format="json", HTTP_IDEMPOTENCY_KEY="prep-valider").status_code
        == 403
    )
    assert p.put(f"/api/vendors/assisted-entry/{chargeur}", {"prix": 1, "stock": 1}, format="json").json()["error"]["code"] == "owner_only"
    # Valider : de vraies offres en vérification.
    v = api.post(
        "/api/vendors/assisted-entry/approve", {"ids": [chargeur, coque["id"], "x"]}, format="json", HTTP_IDEMPOTENCY_KEY="valider-1"
    ).json()
    assert len(v["fiches"]) == 1 and {x["titre"] for x in v["validees"]} == {"Chargeur rapide 18 W · USB-C", "Coque ITEL AC52 · silicone"}
    assert all(x["enVerification"] for x in v["validees"])
    offres = Offre.objects.filter(boutique=b, etat=Offre.Etat.EN_VERIFICATION)
    assert offres.count() == 2 and offres.get(titre_demande="Chargeur rapide 18 W · USB-C").prix == 3500
    assert offres.get(fiche__titre="Coque ITEL AC52 · silicone").verification_avant is not None
    assert fuites(v) == []


def test_mediane_des_offres_en_vente_du_rayon():
    b = creer_boutique_vendeur()
    f = creer_fiche("Écouteurs X", rayon="Écouteurs")
    for prix in (3000, 4000, 5000):
        creer_offre(b, f, prix=prix)
    visite = VisiteAgent.objects.create(boutique=b, agent="A.", zone="Z4", le="2026-09-20")
    fa = FicheAgent.objects.create(
        visite=visite, titre="Écouteurs Y", categorie="Électronique", rayon="Écouteurs", prix=1000, photos=1, mediane_relevee=900
    )
    s = proprietaire(b).get("/api/vendors/assisted-entry").json()
    f0 = s["fiches"][0]
    assert (
        f0["mediane"] == 4000
        and f0["controles"]["prix"] == "echec"
        and f0["controles"]["photo"] == "echec"
        and f0["controles"]["description"] == "echec"
    )
    from apps.vendeur_session import saisie

    saisie.rattacher(fa)
    assert fa.fiche is None


def test_saisie_sans_visite():
    b = creer_boutique_vendeur()
    s = proprietaire(b).get("/api/vendors/assisted-entry").json()
    assert s["fiches"] == [] and s["agent"]["zone"] == "Z4"
    assert APIClient().get("/api/vendors/assisted-entry").status_code == 401


def test_validation_compte_les_brouillons_d_une_ouverture_en_cours():
    b = creer_boutique_vendeur()
    demo.charger(b)
    d = DossierOuverture.objects.get(ref=demo.REF)
    d.etape = DossierOuverture.Etape.CONTRAT
    d.brouillons = 0
    d.save()
    ids = [str(f.pk) for f in FicheAgent.objects.filter(visite__boutique=b)[:2]]
    proprietaire(b).post("/api/vendors/assisted-entry/approve", {"ids": ids}, format="json", HTTP_IDEMPOTENCY_KEY="brouillons-1")
    d.refresh_from_db()
    assert d.brouillons == 2


def test_demo_dossier_signe_et_idempotente():
    b = socle_demo.charger()
    demo.charger(b)
    demo.charger(b)
    assert DossierOuverture.objects.count() == 1 and VisiteAgent.objects.count() == 1 and FicheAgent.objects.count() == 3
    d = proprietaire(b).get("/api/vendors/shops/current").json()
    assert d["ref"] == "VD-2026-0913" and d["etape"] == "signee" and d["contrat"]["signeA"] and d["versement"]["masque"] == "···· 4217"
    assert d["boutique"]["zone"]["code"] == "Z4" and d["enLigne"] == 3
    # L'accès Préparation n'a pas de dossier d'ouverture.
    assert preparation(b).get("/api/vendors/shops/current").status_code == 404
    # Les comptes de démonstration se connectent (e-mail, identifiant, numéro).
    api = APIClient()
    for ident in (socle_demo.EMAIL_PROPRIETAIRE, "@Penga12", "+237 6 77 12 42 17", socle_demo.EMAIL_PREPARATION):
        r = api.post(
            "/api/vendors/auth/login", {"identifiant": ident, "motDePasse": socle_demo.MOT_DE_PASSE, "appareil": "demo"}, format="json"
        ).json()
        assert r["ok"], ident


def test_contrat_lu_dans_les_parametres():
    c = ouverture.contrat_en_vigueur()
    assert c["gardeMinPourCent"] == "76,5" and c["gardeMaxPourCent"] == "98"
    assert c["decouverte"]["mois"] > 0 and c["lancement"]["argent"] > 0
    assert c["exemple"]["garde"] < 20000
