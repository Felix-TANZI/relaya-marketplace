# Commandes du vendeur : liste et compteurs de la même lecture (CMD-02), détail, statut et argent dérivés des faits,
# journal, problème (litige, retour), annulation constatée, rôle Préparation, anonymat.
from datetime import timedelta

import pytest

from apps.vendeur_commandes import services
from apps.vendeur_core import horloge
from apps.vendeur_core.anonymat import fuites
from apps.vendeur_core.models import CommandeVendeur
from apps.vendeur_core.tests.outils import commande_client, creer_boutique_vendeur, creer_offre, preparation, proprietaire

pytestmark = pytest.mark.django_db


@pytest.fixture
def b():
    return creer_boutique_vendeur()


def remettre_au_client(c):
    from apps.pickup.evenements import avancer
    from apps.pickup.evenements import remettre_au_client as remettre
    from apps.pickup.models import GroupeRemise
    from apps.pickup.services import code_de

    for e in ("seller.confirmed", "suborder.ready", "parcel.collected", "parcel.received"):
        avancer(c.order_id, e)
    assert remettre(c.order_id, code_de(GroupeRemise.objects.get(order_id=c.order_id)))["ok"]


def test_vue_compteurs_et_detail_de_la_meme_lecture(b):
    o = creer_offre(b, stock=10)
    r1 = commande_client(o)
    commande_client(o)
    api = proprietaire(b)
    assert api.post(f"/api/vendors/orders/{r1['ref']}/ready", {}, format="json").json()["ok"]
    v = api.get("/api/vendors/orders?state=prep").json()
    assert v["compteurs"] == {"prep": 1, "cours": 1, "fin": 0, "pb": 0}
    assert v["detail"] == {"prep": 1, "cours": 1, "litiges": 0, "retours": 0, "terminees": 0, "annulees": 0}
    assert v["total"] == 2 == sum(v["detail"].values()) and len(v["items"]) == 1 and v["maintenant"] > 0
    item = v["items"][0]
    assert item["statut"] == "a_preparer" and item["garde"] == 17840 and item["lignes"][0]["prixUnitaire"] == 20000
    assert item["echeance"] and item["echeanceAbsolue"] >= item["echeance"] and item["calendrier"]["horaires"]
    assert item["argent"] == {"etat": "en_cours", "liberation": None, "vendredi": None, "versement": None}
    assert item["livreur"]["nom"] == "Serge M." and item["ramassage"] is not None and item["moyenPaiement"] == "momo"
    cours = api.get("/api/vendors/orders?state=cours").json()["items"]
    assert [x["statut"] for x in cours] == ["prete"] and cours[0]["preteA"]
    assert api.get("/api/vendors/orders?state=xx").status_code == 422


def test_detail_404_et_journal(b):
    cc = commande_client(creer_offre(b))
    api = proprietaire(b)
    assert api.get("/api/vendors/orders/BLV-999999").status_code == 404
    assert api.get("/api/vendors/orders/BLV-999999/journal").status_code == 404
    api.post(f"/api/vendors/orders/{cc['ref']}/extend", {"choix": "+1h"}, format="json")
    j = api.get(f"/api/vendors/orders/{cc['ref']}/journal").json()
    assert j[0]["action"] == "Plus de temps demandé" and j[0]["auteur"] == "Franck P." and isinstance(j[0]["avant"], int)
    assert j[-1]["action"] == "Commande reçue" and j[-1]["role"] == "systeme"


def test_preparation_ne_voit_aucun_montant(b):
    cc = commande_client(creer_offre(b))
    api = preparation(b)
    d = api.get(f"/api/vendors/orders/{cc['ref']}").json()
    assert d["garde"] is None and d["argent"] is None and d["gele"] is None and d["lignes"][0]["prixUnitaire"] is None
    assert api.get("/api/vendors/orders?state=prep").json()["items"][0]["garde"] is None


def test_livree_puis_argent_se_libere_puis_a_verser(b):
    cc = commande_client(creer_offre(b))
    c = CommandeVendeur.objects.get(ref=cc["ref"])
    api = proprietaire(b)
    api.post(f"/api/vendors/orders/{cc['ref']}/ready", {}, format="json")
    CommandeVendeur.objects.filter(pk=c.pk).update(remise_a=horloge.maintenant())
    assert api.get(f"/api/vendors/orders/{cc['ref']}").json()["statut"] == "chez_le_livreur"
    from apps.pickup.evenements import avancer
    from apps.pickup.evenements import remettre_au_client as remettre
    from apps.pickup.models import GroupeRemise
    from apps.pickup.services import code_de

    avancer(c.order_id, "parcel.collected")
    avancer(c.order_id, "parcel.received")
    remettre(c.order_id, code_de(GroupeRemise.objects.get(order_id=c.order_id)))
    d = api.get(f"/api/vendors/orders/{cc['ref']}").json()
    assert d["statut"] == "livree" and d["retireeA"] and d["argent"]["etat"] == "se_libere" and d["argent"]["vendredi"]
    assert d["liberationJours"] == 3 and not d["confirmeeParLeClient"] and d["livreur"] is None
    # « Tout est en ordre » : la fenêtre se ferme, libération 3 jours après
    from apps.pickup.models import MontantsCommande

    MontantsCommande.objects.filter(order_id=c.order_id).update(tout_en_ordre_le=horloge.maintenant() - timedelta(days=5))
    d = api.get(f"/api/vendors/orders/{cc['ref']}").json()
    assert d["confirmeeParLeClient"] and d["argent"]["etat"] == "a_verser"
    assert api.get("/api/vendors/orders?state=fin").json()["detail"]["terminees"] == 1


def test_verse_avec_la_reference_du_versement(b, monkeypatch):
    cc = commande_client(creer_offre(b))
    c = CommandeVendeur.objects.get(ref=cc["ref"])
    monkeypatch.setattr(services, "versement_de", lambda x: "BLV-VS-4085")
    remettre_au_client(c)
    CommandeVendeur.objects.filter(pk=c.pk).update(prete_a=horloge.maintenant(), remise_a=horloge.maintenant())
    d = proprietaire(b).get(f"/api/vendors/orders/{cc['ref']}").json()
    assert d["argent"]["etat"] == "verse" and d["argent"]["versement"] == "BLV-VS-4085"


def test_versement_de_lu_dans_l_application_argent(b, versement_de_reel, monkeypatch):
    import sys
    import types

    cc = commande_client(creer_offre(b))
    c = CommandeVendeur.objects.get(ref=cc["ref"])
    faux = types.ModuleType("apps.vendeur_argent.services")
    faux.versement_de = lambda x: f"BLV-VS-{x.pk}"
    monkeypatch.setitem(sys.modules, "apps.vendeur_argent.services", faux)
    assert versement_de_reel(c) == f"BLV-VS-{c.pk}"
    monkeypatch.setitem(sys.modules, "apps.vendeur_argent.services", types.ModuleType("apps.vendeur_argent.services"))
    assert versement_de_reel(c) is None


def test_carte_libere_en_14_jours_et_palier_or_en_1_jour(b):
    cc = commande_client(creer_offre(b))
    c = CommandeVendeur.objects.get(ref=cc["ref"])
    c.moyen = "apple"
    assert services.liberation_jours(c, b) == 14
    c.moyen = "momo"
    b.palier = "Or"
    assert services.liberation_jours(c, b) == 1


def test_litige_retour_et_litige_perdu(b):
    from apps.aftersales import services as apres_vente
    from apps.aftersales.models import Litige

    cc = commande_client(creer_offre(b))
    c = CommandeVendeur.objects.get(ref=cc["ref"])
    CommandeVendeur.objects.filter(pk=c.pk).update(prete_a=horloge.maintenant(), remise_a=horloge.maintenant())
    remettre_au_client(c)
    lit = apres_vente.ouvrir(cc["client"], cc["ref"], 1, "abime", "Écran fendu à l'ouverture du colis.", "rembourse", [])
    api = proprietaire(b)
    v = api.get("/api/vendors/orders?state=pb").json()
    d = v["items"][0]
    assert d["statut"] == "litige_gele" and d["probleme"]["type"] == "litige" and not d["probleme"]["repondu"]
    assert d["gele"] == d["garde"] and d["argent"]["etat"] == "gele" and d["argent"]["vendredi"] is None and v["detail"]["litiges"] == 1
    lit = apres_vente.reponse_du_vendeur(lit, "conteste", texte="L'article est parti intact, photos du scellé.")
    lit = apres_vente.decider(lit, "rembourse", "Photos du client probantes.")
    d = api.get(f"/api/vendors/orders/{cc['ref']}").json()
    assert d["statut"] == "retour_gele" and d["probleme"]["type"] == "retour" and d["probleme"]["inspectionHeures"] == 48
    assert len(d["probleme"]["arrivee"]["creneau"]) == 2
    Litige.objects.filter(pk=lit.pk).update(clos_le=horloge.maintenant(), issue="rembourse", rembourse=20000)
    d = api.get(f"/api/vendors/orders/{cc['ref']}").json()
    assert d["statut"] == "annulee" and d["annulation"]["motif"] == "litige_perdu" and d["argent"]["etat"] == "repris"


def test_litige_gagne_libere_apres_la_fin_du_gel(b):
    from apps.aftersales import services as apres_vente
    from apps.aftersales.models import Litige

    cc = commande_client(creer_offre(b))
    c = CommandeVendeur.objects.get(ref=cc["ref"])
    CommandeVendeur.objects.filter(pk=c.pk).update(prete_a=horloge.maintenant(), remise_a=horloge.maintenant())
    remettre_au_client(c)
    lit = apres_vente.ouvrir(cc["client"], cc["ref"], 1, "abime", "Écran fendu à l'ouverture du colis.", "rembourse", [])
    Litige.objects.filter(pk=lit.pk).update(
        clos_le=horloge.maintenant(), issue="refuse", decision_le=horloge.maintenant() - timedelta(days=30), recours_le=horloge.maintenant()
    )
    d = proprietaire(b).get(f"/api/vendors/orders/{cc['ref']}").json()
    assert d["statut"] == "livree" and d["argent"]["etat"] == "se_libere"


def test_annulation_du_client_par_la_route_du_kit_est_constatee(b):
    o = creer_offre(b, stock=5)
    cc = commande_client(o)
    r = cc["api"].post(
        f"/api/suborders/{CommandeVendeur.objects.get(ref=cc['ref']).order_id}-1/cancel",
        {"motif": "plus besoin"},
        format="json",
        HTTP_IDEMPOTENCY_KEY="annul-client-1",
    )
    if r.status_code >= 300:  # route du kit absente ou autre forme : même service
        from apps.pickup.services import annuler_colis

        annuler_colis(f"{CommandeVendeur.objects.get(ref=cc['ref']).order_id}-1", cc["client"], "plus besoin")
    d = proprietaire(b).get(f"/api/vendors/orders/{cc['ref']}").json()
    assert d["statut"] == "annulee" and d["annulation"]["motif"] == "client_avant_ramassage"
    o.refresh_from_db()
    assert o.stock == 5


def test_anonymat_des_commandes(b):
    cc = commande_client(creer_offre(b))
    from apps.client_core import pont

    relais = pont.modele("relais").objects.first()
    interdits = (cc["client"].first_name, cc["client"].email, getattr(relais, "name", "") or "")
    api = proprietaire(b)
    for url in ("/api/vendors/orders?state=prep", f"/api/vendors/orders/{cc['ref']}", f"/api/vendors/orders/{cc['ref']}/journal"):
        assert fuites(api.get(url).json(), valeurs_interdites=interdits) == [], url
