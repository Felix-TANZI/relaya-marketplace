# Accueil : à faire (préparer, litiges, retours), alerte avant un seuil, stock bas, « Rien à faire », premier jour,
# suspension, file hors connexion ; l'accès Préparation ne voit aucun montant ; anonymat.
import sys
import types
from datetime import timedelta

import pytest
from django.core.cache import cache
from django.test import override_settings

from apps.client_core.temps import ms
from apps.vendeur_argent import accueil
from apps.vendeur_argent.models import ActionEnFile
from apps.vendeur_core import horloge
from apps.vendeur_core.anonymat import fuites
from apps.vendeur_core.horloge import CLE
from apps.vendeur_core.models import CommandeVendeur, Offre
from apps.vendeur_core.tests.outils import commande_client, creer_boutique_vendeur, creer_offre, preparation, proprietaire

from .outils import aller, boutique_et_commande, cle, litige, lundi_prochain, retirer

pytestmark = [pytest.mark.django_db, pytest.mark.usefixtures("propre")]


@pytest.fixture
def propre():
    cache.delete(CLE)
    with override_settings(BELIVAY_ESSAI_ROUTES=True):
        yield
    cache.delete(CLE)


def interdits(cc):
    from apps.client_core import pont

    return (cc["client"].first_name, cc["client"].email, pont.modele("relais").objects.first().name)


def test_aujourdhui_preparer_litige_retour_et_compteurs(monkeypatch):
    # Litiges créés directement dans aftersales : lus par la lecture de repli (vendeur_litiges a ses propres dossiers).
    monkeypatch.setattr(accueil, "litiges_retours", accueil._litiges_retours_kit)
    b, o, cc, c = boutique_et_commande()
    cc2 = commande_client(o, client=cc["client"])
    c2 = CommandeVendeur.objects.get(ref=cc2["ref"])
    cc3 = commande_client(o, client=cc["client"])
    c3 = CommandeVendeur.objects.get(ref=cc3["ref"])
    lundi = lundi_prochain()
    retirer(c2, lundi)
    retirer(c3, lundi)
    litige(c2, cc["client"], lundi + timedelta(hours=1))
    lit3 = litige(c3, cc["client"], lundi + timedelta(hours=2))
    from apps.aftersales.models import Retour

    Retour.objects.create(litige=lit3, deposer_avant=lundi + timedelta(days=3))
    aller(lundi + timedelta(hours=3))
    r = proprietaire(b).get("/api/vendors/seller/today").json()
    assert r["compteurs"] == {"preparer": 1, "litiges": 1, "retours": 1, "total": 3}
    assert [x["type"] for x in r["aFaire"]] == ["preparer", "litige", "retour"]
    p = r["aFaire"][0]
    assert p["ref"] == c.ref and p["garde"] == c.garde and p["livreur"]["societe"] == "Wink Express" and p["quantite"] == 1
    assert r["aFaire"][1]["gele"] == c2.garde and r["aFaire"][2]["arrivee"]["creneau"]
    assert r["alerteScore"]["seuil"] == 65 and r["alerteScore"]["palier"] == "Argent" and r["alerteScore"]["masquee"] is False
    assert r["alerteScore"]["gainParVente"] > 0 and r["alerteScore"]["livreesCible"] == 10
    assert fuites(r, valeurs_interdites=interdits(cc)) == []
    # Accès Préparation : aucun montant, pas d'alerte.
    rp = preparation(b).get("/api/vendors/seller/today").json()
    assert rp["aFaire"][0]["garde"] is None and rp["aFaire"][1]["gele"] is None and rp["alerteScore"] is None
    # « Masquer » : rangée pour la semaine, revient après 7 jours.
    assert proprietaire(b).post("/api/vendors/seller/today/hide-alert").status_code == 204
    assert proprietaire(b).get("/api/vendors/seller/today").json()["alerteScore"]["masquee"] is True
    aller(lundi + timedelta(days=8))
    assert proprietaire(b).get("/api/vendors/seller/today").json()["alerteScore"]["masquee"] is False


def test_litiges_et_stock_bas_lus_dans_les_autres_applications(monkeypatch):
    b, o, cc, c = boutique_et_commande()
    lit = types.ModuleType("apps.vendeur_litiges.services")
    lit.en_cours = lambda boutique: {
        "litiges": [{"ref": c.ref, "echeance": horloge.maintenant(), "motif": "Abîmé", "gele": 9}],
        "retours": [{"ref": "R", "article": {}, "motif": "m", "arrivee": None, "gele": 9}],
    }
    cat = types.ModuleType("apps.vendeur_catalogue.services")
    cat.stock_bas = lambda boutique: [{"offreId": "1", "titre": "X", "dessin": "", "stock": 1, "seuil": 5}]
    monkeypatch.setitem(sys.modules, "apps.vendeur_litiges.services", lit)
    monkeypatch.setitem(sys.modules, "apps.vendeur_catalogue.services", cat)
    r = accueil.aujourdhui(b, False)
    assert (
        r["compteurs"]["litiges"] == 1
        and r["compteurs"]["retours"] == 1
        and r["aFaire"][1]["gele"] is None
        and r["stockBas"][0]["titre"] == "X"
    )
    o.stock = 1
    o.save()
    assert accueil._stock_bas_socle(b)[0]["offreId"] == str(o.pk)  # lecture de repli (vendeur_catalogue absente)


def test_stock_bas_et_alerte_de_descente():
    b = creer_boutique_vendeur(palier="Argent", trust="66.0")
    creer_offre(b, stock=2)
    r = accueil.aujourdhui(b, True)
    assert r["stockBas"][0]["stock"] == 2 and r["alerteScore"]["palier"] == "Argent" and r["alerteScore"]["gainParVente"] > 0
    loin = creer_boutique_vendeur(trust="50.0")
    assert accueil.alerte_score(loin) is None


def test_calme_chiffres_du_proprietaire_et_rien_pour_la_preparation(monkeypatch):
    b, o, cc, c = boutique_et_commande()
    cc2 = commande_client(o, client=cc["client"])
    c2 = CommandeVendeur.objects.get(ref=cc2["ref"])
    lundi = lundi_prochain()
    retirer(c, lundi, tout_en_ordre=lundi)
    retirer(c2, lundi + timedelta(hours=10), tout_en_ordre=lundi + timedelta(hours=10))
    aller(lundi + timedelta(days=3, hours=2))  # c libérée jeudi 10 h ; c2 se libère ce soir 20 h
    r = proprietaire(b).get("/api/vendors/seller/calm").json()
    a = r["argent"]
    assert a["gagne"] == c.garde and a["liberationDuJour"]["ref"] == c2.ref
    assert (
        a["prochainVersement"]["montant"] == c.garde + c2.garde
        and a["prochainVersement"]["deja"] == c.garde
        and a["prochainVersement"]["ceSoir"] == c2.garde
    )
    assert a["progres"]["palier"] == "Argent" and a["progres"]["points"] == 2 and a["progres"]["commandes"] == 3
    assert r["meilleurProduit"]["ventes"] == 1 and r["idee"] is None
    assert fuites(r, valeurs_interdites=interdits(cc)) == []
    rp = preparation(b).get("/api/vendors/seller/calm").json()
    assert rp["argent"] is None and rp["commandesDuMois"] == r["commandesDuMois"]
    mod = types.ModuleType("apps.vendeur_croissance.services")
    mod.idee_du_jour = lambda boutique: {"recherche": "chargeur itel", "fois": 14, "jours": 30}
    monkeypatch.setitem(sys.modules, "apps.vendeur_croissance.services", mod)
    assert accueil.calme(b, False)["idee"]["fois"] == 14


def test_premier_jour():
    b = creer_boutique_vendeur()
    aller(lundi_prochain())
    r = proprietaire(b).get("/api/vendors/seller/onboarding").json()
    assert r["termine"] is False and r["produitsEnLigne"] == 0 and [g["fait"] for g in r["gestes"]] == [False, True, True]
    assert r["decouverte"]["gainParVente"] is None and r["decouverte"]["commandes"] == 50 and r["saisieAssisteeGratuite"] is True
    creer_offre(b)
    r = proprietaire(b).get("/api/vendors/seller/onboarding").json()
    assert (
        r["termine"] is True
        and r["numero"] == "MTN ···· 4217"
        and r["decouverte"]["gainParVente"] > 0
        and r["decouverte"]["prixReference"] == 20000
    )
    rp = preparation(b).get("/api/vendors/seller/onboarding").json()
    assert rp["numero"] is None and rp["decouverte"]["gainParVente"] is None and rp["decouverte"]["prixReference"] is None


def test_palier_de_lancement_dans_les_deux_mois():
    from datetime import date

    b = creer_boutique_vendeur()
    b.signature_le = horloge.aujourd_hui() - timedelta(days=5)
    b.save()
    for i in range(15):
        creer_offre(b, fiche=None, variante=f"v{i}")
    r = accueil.premier_jour(b, True)
    assert (
        r["lancement"]["palier"] == "Argent"
        and r["lancement"]["seuils"]["Or"] == 40
        and date.fromisoformat(r["lancement"]["fin"]) > horloge.aujourd_hui()
    )


def test_suspension_exemple_et_reelle(monkeypatch):
    b = creer_boutique_vendeur()
    api = proprietaire(b)
    assert api.get("/api/vendors/seller/suspension").status_code == 404
    ex = api.get("/api/vendors/seller/suspension?example=1").json()
    assert ex["exemple"] is True and ex["scoreGeleSous"] == 40 and ex["controleProbatoire"] == 20 and "30 jours" in ex["motif"]
    b.suspendue_depuis = horloge.maintenant()
    b.save()
    s = api.get("/api/vendors/seller/suspension?example=1").json()
    assert s["exemple"] is False and s["depuis"] == ms(b.suspendue_depuis)
    mod = types.ModuleType("apps.vendeur_croissance.services")
    mod.suspension = lambda boutique: {"niveau": 3, "exemple": False}
    monkeypatch.setitem(sys.modules, "apps.vendeur_croissance.services", mod)
    assert accueil.suspension(b, False) == {"niveau": 3, "exemple": False}


def test_file_hors_connexion_rejouee_dans_l_ordre():
    b, o, cc, c = boutique_et_commande()
    o2 = creer_offre(b, fiche=o.fiche, variante="bleu")
    api = preparation(b)
    t = horloge.maintenant()

    def mettre(**corps):
        r = api.post("/api/vendors/offline-queue", corps, format="json", HTTP_IDEMPOTENCY_KEY=cle())
        assert r.status_code == 201, r.content
        return r.json()

    assert api.put("/api/vendors/offline-queue/network", {"horsLigneDepuis": ms(t)}, format="json").status_code == 204
    vieille = mettre(type="stock", objet="ITEL", detail={"offreId": str(o.pk), "stock": 1}, origine=ms(t - timedelta(hours=73)))
    pret = mettre(type="pret", objet=c.ref)
    mettre(type="pret", objet="BLV-INCONNUE")
    mettre(type="stock", objet="ITEL", detail={"offreId": str(o.pk), "stock": 7})
    mettre(type="masquer", objet="ITEL bleu", detail={"offreId": str(o2.pk)})
    mettre(type="masquer", objet="alerte")
    mettre(type="fermer", objet="boutique")
    mettre(type="photo", objet="ITEL", origine=ms(t + timedelta(hours=1)))
    assert pret["auteur"] == "Aïcha" and pret["etat"] == "en_attente" and pret["lieu"] == "Mvog-Ada"
    f = api.get("/api/vendors/offline-queue").json()
    assert (
        f["heures"] == 72
        and f["horsLigneDepuis"] == ms(t)
        and next(a for a in f["actions"] if a["id"] == vieille["id"])["etat"] == "expiree"
    )
    assert api.get("/api/vendors/seller/today").json()["enAttenteEnvoi"] == 7

    bilan = api.post("/api/vendors/offline-queue/send", {}, format="json", HTTP_IDEMPOTENCY_KEY=cle()).json()
    assert (bilan["envoyees"], bilan["expirees"], bilan["refusees"]) == (6, 1, 1)
    c.refresh_from_db()
    o.refresh_from_db()
    o2.refresh_from_db()
    b.refresh_from_db()
    assert c.prete_a is not None and o.stock == 7 and o2.etat == Offre.Etat.EN_PAUSE and b.fermee_le == horloge.aujourd_hui()
    f = api.get("/api/vendors/offline-queue").json()
    assert (
        f["horsLigneDepuis"] is None and f["dernierEnvoi"]["envoyees"] == 6 and {a["etat"] for a in f["actions"]} == {"expiree", "refusee"}
    )
    refusee = next(a for a in f["actions"] if a["etat"] == "refusee")
    assert refusee["motif"] == "Commande introuvable."
    # Rejouer : déjà prête ; rouvrir ; retirer.
    mettre(type="pret", objet=c.ref)
    mettre(type="rouvrir", objet="boutique")
    mettre(type="stock", objet="?", detail={"offreId": "x"})
    mettre(type="masquer", objet="?", detail={"offreId": "99999"})
    bilan = api.post("/api/vendors/offline-queue/send", {}, format="json", HTTP_IDEMPOTENCY_KEY=cle()).json()
    assert bilan["refusees"] == 3 and bilan["envoyees"] == 1
    b.refresh_from_db()
    assert b.fermee_le is None
    for a in ActionEnFile.objects.filter(boutique=b):
        assert api.delete(f"/api/vendors/offline-queue/{a.pk}").status_code == 204
    assert api.delete("/api/vendors/offline-queue/abc").status_code == 404
    assert api.post("/api/vendors/offline-queue", {"type": "x", "objet": "y"}, format="json", HTTP_IDEMPOTENCY_KEY=cle()).status_code == 400
    assert (
        api.post(
            "/api/vendors/offline-queue", {"type": "pret", "objet": "y", "detail": [1]}, format="json", HTTP_IDEMPOTENCY_KEY=cle()
        ).status_code
        == 400
    )
    assert api.put("/api/vendors/offline-queue/network", {"horsLigneDepuis": None}, format="json").status_code == 204


def test_c_est_pret_par_vendeur_commandes_et_commande_annulee(monkeypatch):
    b, o, cc, c = boutique_et_commande()
    m = b.membres.get(role="proprietaire")
    CommandeVendeur.objects.filter(pk=c.pk).update(annulee_a=horloge.maintenant())
    a = ActionEnFile.objects.create(boutique=b, membre=m, auteur="Franck", type="pret", objet=c.ref, origine=horloge.maintenant())
    assert accueil._rejouer(b, m, a) == "annulee"
    # Lecture de repli (vendeur_commandes absente) : introuvable, annulée, prête, déjà prête.
    assert accueil._pret_socle(b, m, "BLV-0", a) == "introuvable" and accueil._pret_socle(b, m, c.ref, a) == "annulee"
    CommandeVendeur.objects.filter(pk=c.pk).update(annulee_a=None)
    assert accueil._pret_socle(b, m, c.ref, a) is None and accueil._pret_socle(b, m, c.ref, a) == "deja_prete"
    vieille = ActionEnFile.objects.create(
        boutique=b, membre=m, auteur="Franck", type="pret", objet=c.ref, origine=horloge.maintenant() - timedelta(hours=80)
    )
    CommandeVendeur.objects.filter(pk=c.pk).update(prete_a=None)
    assert accueil._rejouer(b, m, vieille) == "action_expiree"
    mod = types.ModuleType("apps.vendeur_commandes.services")
    mod.cest_pret = lambda boutique, membre, ref, origine_ms=None: {"ok": False, "raison": "deja_prete"}
    monkeypatch.setitem(sys.modules, "apps.vendeur_commandes.services", mod)
    assert accueil._rejouer(b, m, a) == "deja_prete"


def test_accueil_sans_boutique_refuse():
    from apps.client_core.tests.outils import client_connecte, creer_client

    assert client_connecte(creer_client()).get("/api/vendors/seller/today").status_code == 403
