# Plans (Free, Boost, Pro), essai, souscription par demande Mobile Money (confirmée, refusée), arrêt, simulateur,
# récompenses au mérite et vente flash, services, chiffres, demande de la zone ; accès Préparation : 403 owner_only.
from datetime import timedelta
from decimal import Decimal

import pytest

from apps.vendeur_core import horloge
from apps.vendeur_core.anonymat import fuites
from apps.vendeur_core.models import CommandeVendeur
from apps.vendeur_core.tests.outils import commande_client, creer_boutique_vendeur, creer_fiche, creer_offre, preparation, proprietaire
from apps.vendeur_croissance import demo, services
from apps.vendeur_croissance.models import DemandePaiement, EtatAbonnement, FreinReleve, MeriteVisibilite, RechercheZone, VuesOffre

pytestmark = pytest.mark.django_db
_k = iter(range(10_000))


def cle():
    return {"HTTP_IDEMPOTENCY_KEY": f"cle-plans-essai-{next(_k)}"}


def post(api, route, corps=None):
    return api.post(f"/api/vendors/{route}", corps or {}, format="json", **cle())


def test_preparation_refusee_sur_toutes_les_routes_d_argent():
    b = creer_boutique_vendeur()
    p = preparation(b)
    for route in ("plans", "plans/state", "plans/simulate", "payments/1", "visibility", "services", "stats?period=30d"):
        r = p.get(f"/api/vendors/{route}")
        assert r.status_code == 403 and r.json()["error"]["code"] == "owner_only", route
    for route, corps in (
        ("plans/subscribe", {"plan": "Boost"}),
        ("plans/stop", {"arret": True}),
        ("rewards/REC-VITRINE/use", {}),
        ("flash-sales", {"id": "REC-FLASH", "remisePourCent": 20}),
        ("services/request", {"service": "agent_photos"}),
    ):
        assert post(p, route, corps).status_code == 403, route
    assert p.delete("/api/vendors/payments/1").status_code == 403
    assert p.get("/api/vendors/demand").status_code == 200


def test_offres_et_etat_free():
    b = creer_boutique_vendeur()
    api = proprietaire(b)
    offres = api.get("/api/vendors/plans").json()
    assert [(o["plan"], o["prixMensuel"], o["prixAnnuel"], o["remisePourCent"], o["actuel"], o["essaiPossible"]) for o in offres] == [
        ("Free", 0, None, 0, True, False),
        ("Boost", 2500, 25000, 5, False, True),
        ("Pro", 7500, 75000, 10, False, True),
    ]
    e = api.get("/api/vendors/plans/state").json()
    assert (e["plan"], e["facturation"], e["finPeriode"], e["prochainPaiement"], e["arretDemande"]) == ("Free", None, None, None, False)
    assert e["numero"] == {"operateur": "MTN", "masque": "···· 4217"} and e["surMesureDes"] == 1_000_000
    assert e["decouverte"]["active"] is True and e["decouverte"]["gain"] == {"titre": "ITEL AC52", "prix": 20000, "gain": 540}


def test_essai_un_par_plan_et_fin_sans_paiement():
    b = creer_boutique_vendeur()
    api = proprietaire(b)
    r = post(api, "plans/subscribe", {"plan": "Boost", "trial": True}).json()
    j = horloge.aujourd_hui()
    assert r["ok"] is True and r["rappelLe"] < r["finEssai"]
    b.refresh_from_db()
    assert b.plan == "Boost"
    e = api.get("/api/vendors/plans/state").json()
    assert e["facturation"] == "essai" and e["finEssai"] == r["finEssai"] and e["prochainPaiement"]["montant"] == 2500
    assert post(api, "plans/subscribe", {"plan": "Boost", "trial": True}).json() == {"ok": False, "raison": "deja_actif"}
    # Essai fini sans premier paiement confirmé : retour à Free sans rien perdre (PLN-05) ; un seul essai par plan.
    EtatAbonnement.objects.filter(boutique=b).update(depuis=j - timedelta(days=40))
    assert api.get("/api/vendors/plans/state").json()["plan"] == "Free"
    assert post(api, "plans/subscribe", {"plan": "Boost", "trial": True}).json() == {"ok": False, "raison": "deja_essaye"}
    assert [o["essaiPossible"] for o in api.get("/api/vendors/plans").json()] == [False, False, True]


def test_souscription_confirmee_puis_arret():
    b = creer_boutique_vendeur()
    api = proprietaire(b)
    r = post(api, "plans/subscribe", {"plan": "Pro", "facturation": "annuelle"}).json()
    dem = r["demande"]
    assert r["ok"] is True and dem["montant"] == 75000 and dem["objet"] == "Pro · un an" and dem["statut"] == "en_attente"
    b.refresh_from_db()
    assert b.plan == "Free"  # rien n'est activé avant la confirmation (PLN-04)
    assert api.get(f"/api/vendors/payments/{dem['id']}").json()["statut"] == "en_attente"
    assert services.confirmer_paiement(int(dem["id"]), True)["statut"] == "confirme"
    assert services.confirmer_paiement(int(dem["id"]), False)["statut"] == "confirme"  # rejoué : rien ne change
    b.refresh_from_db()
    assert b.plan == "Pro"
    e = api.get("/api/vendors/plans/state").json()
    assert e["facturation"] == "annuelle" and e["prochainPaiement"]["montant"] == 75000
    assert post(api, "plans/subscribe", {"plan": "Pro", "facturation": "annuelle"}).json() == {"ok": False, "raison": "deja_actif"}
    assert services.factures(b)["abonnement"][0]["libelle"] == "Pro · un an" and services.factures(b)["visibilite"] == []
    # Arrêter : pas de prochain paiement ; reprendre l'annule ; période finie avec l'arrêt : Free.
    e = post(api, "plans/stop", {"arret": True}).json()
    assert e["arretDemande"] is True and e["prochainPaiement"] is None
    assert post(api, "plans/stop", {"arret": False}).json()["arretDemande"] is False
    post(api, "plans/stop", {"arret": True})
    EtatAbonnement.objects.filter(boutique=b).update(depuis=horloge.aujourd_hui() - timedelta(days=400))
    assert api.get("/api/vendors/plans/state").json()["plan"] == "Free"


def test_souscription_refusee_et_renouvellement_echoue():
    b = creer_boutique_vendeur()
    api = proprietaire(b)
    dem = post(api, "plans/subscribe", {"plan": "Boost"}).json()["demande"]
    services.confirmer_paiement(int(dem["id"]), False)
    b.refresh_from_db()
    assert b.plan == "Free" and api.get(f"/api/vendors/payments/{dem['id']}").json()["statut"] == "refuse"
    # Annuler une demande en attente.
    d2 = post(api, "plans/subscribe", {"plan": "Boost"}).json()["demande"]
    assert api.delete(f"/api/vendors/payments/{d2['id']}").status_code == 204
    assert DemandePaiement.objects.get(pk=d2["id"]).statut == "refuse"
    assert api.get("/api/vendors/payments/999999").status_code == 404 and api.get("/api/vendors/payments/abc").status_code == 404
    # Boost payé, renouvellement refusé : grâce de 7 jours, puis Free (PLN-02).
    d3 = post(api, "plans/subscribe", {"plan": "Boost"}).json()["demande"]
    services.confirmer_paiement(int(d3["id"]), True)
    d4 = services._demande(b, None, 2500, "Boost · un mois", quoi="plan", plan="Boost", facturation="mensuelle")
    services.confirmer_paiement(d4.pk, False)
    e = api.get("/api/vendors/plans/state").json()
    assert e["plan"] == "Boost" and e["paiementEchoue"]["graceJusqua"] == (horloge.aujourd_hui() + timedelta(days=7)).isoformat()
    EtatAbonnement.objects.filter(boutique=b).update(echec_le=horloge.aujourd_hui() - timedelta(days=8))
    assert api.get("/api/vendors/plans/state").json()["plan"] == "Free"


def test_simulateur():
    b = creer_boutique_vendeur()
    api = proprietaire(b)
    s = api.get("/api/vendors/plans/simulate", {"sales": 60000}).json()
    # 3 ITEL en découverte (60 000 F) : Free 53 520 F, Boost 51 344 F, Pro 46 668 F (moteur commission).
    assert s["gardes"] == {"Free": 53520, "Boost": 51344, "Pro": 46668} and s["meilleur"] == "Free" and s["unites"] == 3
    assert s["pas"] == 20000 and s["max"] == 1_000_000 and s["base"]["titre"] == "ITEL AC52"
    assert s["seuils"]["Boost"] is not None and s["seuils"]["Boost"] % 20000 == 0 and s["rembourse"] == {"Boost": False, "Pro": False}
    assert any(x["ventes"] == s["seuils"]["Boost"] for x in s["reperes"])
    a = api.get("/api/vendors/plans/simulate", {"sales": 60000, "billing": "annuelle"}).json()
    assert a["gardes"]["Boost"] == 51761 and a["facturation"] == "annuelle"
    assert api.get("/api/vendors/plans/simulate", {"billing": "essai"}).status_code == 400
    assert api.get("/api/vendors/plans/simulate", {"sales": "beaucoup"}).status_code == 400
    assert api.get("/api/vendors/plans/simulate").json()["ventesDuMois"] == 0


def test_recompenses_au_merite_et_vente_flash():
    b = creer_boutique_vendeur()
    api = proprietaire(b)
    o = creer_offre(b, stock=3)
    v = api.get("/api/vendors/visibility").json()
    assert v["merite"]["gagne"] is False and v["recompenses"] == [] and v["bloque"] is None
    assert v["flash"] == {"ouvert": True, "remiseMin": 10, "relueAuDela": 50, "dureeMaxHeures": 48}
    assert post(api, "rewards/REC-VITRINE/use").json() == {"ok": False, "raison": "deja_utilisee"}
    MeriteVisibilite.objects.create(boutique=b, offre=o, gagne_le=horloge.aujourd_hui(), raison="du 8 au 14 sept.", jours_de_suite=7)
    v = api.get("/api/vendors/visibility").json()
    assert [r["id"] for r in v["recompenses"]] == ["REC-VITRINE", "REC-FLASH"] and v["stockOffre"] == 3
    # Score sous 50 : aucune visibilité (VIS-02).
    b.trust_score = Decimal("45")
    b.save()
    assert post(api, "rewards/REC-VITRINE/use").json() == {"ok": False, "raison": "score_trop_bas"}
    b.trust_score = Decimal("62.7")
    b.save()
    r = post(api, "rewards/REC-VITRINE/use").json()
    assert r["ok"] is True and r["jusqua"] > horloge.maintenant_ms() + 6 * 86400 * 1000
    assert post(api, "rewards/REC-VITRINE/use").json() == {"ok": False, "raison": "deja_utilisee"}
    assert api.get("/api/vendors/visibility").json()["recompenses"][0]["enCoursJusqua"] == r["jusqua"]
    # Vente flash : 10 % au moins ; au-delà de 50 %, relue ; une par mois.
    assert post(api, "flash-sales", {"id": "REC-VITRINE", "remisePourCent": 20}).json()["raison"] == "ferme"
    assert post(api, "flash-sales", {"id": "REC-FLASH", "remisePourCent": 5}).json()["raison"] == "remise_trop_basse"
    assert post(api, "flash-sales", {"id": "REC-FLASH", "remisePourCent": 12.5}).json()["raison"] == "remise_trop_basse"
    assert post(api, "flash-sales", {"id": "REC-FLASH", "remisePourCent": 95}).json()["raison"] == "remise_trop_haute"
    assert post(api, "flash-sales", {"id": "REC-FLASH", "remisePourCent": 60}).json() == {"ok": True, "etat": "en_verification"}
    assert post(api, "flash-sales", {"id": "REC-FLASH", "remisePourCent": 20}).json()["raison"] == "deja_utilisee"
    assert api.get("/api/vendors/visibility").json()["recompenses"][1]["venteFlash"] == {"remisePourCent": 60, "etat": "en_verification"}
    # Rupture de stock : bloqué.
    b2 = creer_boutique_vendeur()
    o2 = creer_offre(b2, stock=0)
    MeriteVisibilite.objects.create(boutique=b2, offre=o2, gagne_le=horloge.aujourd_hui(), raison="x")
    assert services.visibilite(b2)["bloque"] == "rupture"
    assert services.programmer_vente_flash(b2, "REC-FLASH", 20) == {"ok": False, "raison": "rupture"}
    assert services.programmer_vente_flash(b, "REC-FLASH", 20)["raison"] == "deja_utilisee"


def test_services_demande_confirmee_visite_et_remboursement():
    premiere = creer_boutique_vendeur()
    b = creer_boutique_vendeur()
    for x in (premiere, b):
        x.zone = "Z9"
        x.save()
    FreinReleve.objects.create(
        boutique=b, type="photo", titre="Une seule photo sur l’ITEL", texte="t", solution="Photos par un agent", route="services"
    )
    api = proprietaire(b)
    s = api.get("/api/vendors/services").json()
    assert s["liste"][0]["id"] == "agent_photos" and s["liste"][0]["frein"] == "Une seule photo sur l’ITEL"
    assert s["delaiVisiteHeures"] == 72 and s["zone"] == "Z9"
    assert services.saisie_gratuite(premiere) and services.saisie_gratuite(b)
    assert post(api, "services/request", {"service": "saisie_assistee"}).json() == {"ok": False, "raison": "gratuit_ailleurs"}
    r = post(api, "services/request", {"service": "agent_photos"}).json()
    assert r["ok"] and r["demande"]["montant"] == 3000
    assert post(api, "services/request", {"service": "agent_photos"}).json() == {"ok": False, "raison": "deja_demande"}
    assert api.get("/api/vendors/services").json()["liste"][0]["demande"]["statut"] == "en_attente"
    services.confirmer_paiement(int(r["demande"]["id"]), True)
    s = api.get("/api/vendors/services").json()
    photos = next(x for x in s["liste"] if x["id"] == "agent_photos")
    assert photos["demande"]["statut"] == "visite_prevue" and photos["frein"] is None
    DemandePaiement.objects.filter(pk=r["demande"]["id"]).update(visite_avant=horloge.maintenant() - timedelta(hours=1))
    photos = next(x for x in services.services_de(b)["liste"] if x["id"] == "agent_photos")
    assert photos["demande"]["statut"] == "rembourse"
    DemandePaiement.objects.filter(pk=r["demande"]["id"]).update(visite_faite_le=horloge.maintenant())
    assert next(x for x in services.services_de(b)["liste"] if x["id"] == "agent_photos")["demande"]["statut"] == "confirme"
    f = post(api, "services/request", {"service": "fiche_prioritaire"}).json()["demande"]
    services.confirmer_paiement(int(f["id"]), True)
    assert next(x for x in services.services_de(b)["liste"] if x["id"] == "fiche_prioritaire")["demande"]["visiteAvant"] is None


def test_stats_des_commandes_et_demande_de_la_zone():
    b = creer_boutique_vendeur()
    itel = creer_offre(b, prix=20000, stock=20)
    iphone = creer_offre(b, fiche=creer_fiche("iPhone 15 Pro Max", variantes=("256 Go",)), variante="256 Go", prix=350000, stock=2)
    clients = [commande_client(itel)["client"] for _ in range(2)] + [commande_client(iphone)["client"]]
    commande_client(creer_offre(b, variante="bleu", prix=10000, stock=5), comptoir=True)
    CommandeVendeur.objects.filter(boutique=b).update(remise_a=horloge.maintenant())
    VuesOffre.objects.create(offre=itel, jour=horloge.aujourd_hui(), vues=210)
    api = proprietaire(b)
    s = api.get("/api/vendors/stats", {"period": "30d"}).json()
    assert (s["jours"], s["ventes"], s["commandes"], s["encaissees"], s["vues"]) == (30, 390000, 4, 3, 210)
    assert s["panierMoyen"] == 130000 and s["conversionPourCent"] == 1.4 and s["retoursPourCent"] == 0
    assert s["parProduit"][0]["titre"] == "iPhone 15 Pro Max" and s["parProduit"][0]["partPourCent"] == 90
    assert s["dependance"] == {"titre": "iPhone 15 Pro Max", "partPourCent": 90} and s["historiqueVerrouille"] is True
    assert sum(x["ventes"] for x in s["parJour"]) == 390000 and len(s["meilleursJours"]) == 1
    assert api.get("/api/vendors/stats", {"period": "12m"}).status_code == 400
    assert fuites(s, valeurs_interdites=tuple(c.email for c in clients) + ("Carine", "Relais Mvog-Ada")) == []
    # Demande de la zone : Free montre les 3 premières.
    for mots, fois in (("chargeur itel", 14), ("coque iphone 15", 11), ("écouteurs", 8), ("batterie", 6)):
        RechercheZone.objects.create(zone="Z4", mots=mots, fois=fois)
    d = api.get("/api/vendors/demand").json()
    assert [r["verrouillee"] for r in d["recherches"]] == [False, False, False, True] and d["visiblesSansBoost"] == 3
    assert services.idee_du_jour(b) == {"recherche": "chargeur itel", "fois": 14, "jours": 30}
    b.plan = "Boost"
    b.save()
    assert not any(r["verrouillee"] for r in services.demande(b, True)["recherches"])
    assert services.stats(b)["historiqueVerrouille"] is False
    b.zone = "Z0"
    assert services.idee_du_jour(b) is None


def test_demo_idempotente_et_coherente():
    from apps.vendeur_core import demo as socle_demo

    b = socle_demo.charger()
    demo.charger(b)
    demo.charger(b)
    sc = services.score(b)
    assert sc["total"] == 62.7 and sum(c["points"] for c in sc["criteres"]) == pytest.approx(62.7, abs=0.1)
    assert len(sc["evenements"]) == 12 and sc["controleAuRamassage"] == "1 sur 20"
    assert [d["type"] for d in services.decisions(b)] == ["avertissement"] and services.statut_compte(b)["etat"] == "aucune"
    p = services.mon_palier(b, True)
    assert p["projection"]["scoreApres"] == 66.0 and p["projection"]["litigesEnCours"] >= 0
    assert services.visibilite(b)["merite"]["gagne"] is True
    d = services.demande(b, False)
    assert (
        d["recherches"][0]["mots"] == "chargeur itel"
        and "plus que chez un autre vendeur" in next(f for f in d["freins"] if f["type"] == "attribution")["texte"]
    )
    assert services.etat_plan(b)["plan"] == "Free" and services.suspension(b) is None
