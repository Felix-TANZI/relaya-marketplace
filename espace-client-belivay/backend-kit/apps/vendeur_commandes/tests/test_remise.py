# Remise au livreur : lecture sans le code, code au toucher (journalisé), codes faux et blocage 24 h, nouveau code,
# remise par l'application du livreur jusqu'au colis « collectee » du client, livreur absent, annulation du client,
# plafond de valeur, reçu (propriétaire seulement), anonymat.
from datetime import timedelta

import pytest

from apps.client_core.chiffrement import dechiffrer
from apps.vendeur_commandes import demo, services
from apps.vendeur_core import horloge
from apps.vendeur_core.anonymat import fuites
from apps.vendeur_core.models import CommandeVendeur, Livreur
from apps.vendeur_core.tests.outils import commande_client, creer_boutique_vendeur, creer_fiche, creer_offre, preparation, proprietaire

pytestmark = pytest.mark.django_db


@pytest.fixture
def b():
    return creer_boutique_vendeur()


def prete(b, **kw):
    cc = commande_client(creer_offre(b, **kw))
    assert proprietaire(b).post(f"/api/vendors/orders/{cc['ref']}/ready", {}, format="json").json()["ok"]
    return cc


def code(ref):
    return dechiffrer(CommandeVendeur.objects.get(ref=ref).code_chiffre)


def test_remise_sans_le_code_puis_code_au_toucher(b):
    cc = prete(b)
    api = preparation(b)
    r = api.get(f"/api/vendors/orders/{cc['ref']}/handover").json()
    assert r["etape"] == "prete" and r["livreur"]["nom"] == "Serge M." and r["livreur"]["niveau"] == "Confirme"
    assert (
        r["essaisMax"] == 3
        and r["blocageHeures"] == 24
        and r["fileHeures"] == 72
        and r["plafonds"] == {"nouveau": 75000, "confirme": 250000}
    )
    assert r["valeurColis"] is None and r["garde"] is None and r["suite"] is None and r["erreur"] is None
    assert code(cc["ref"]) not in str(r)
    x = api.get(f"/api/vendors/orders/{cc['ref']}/handover-code").json()
    assert x == {"ok": True, "code": code(cc["ref"])}
    c = CommandeVendeur.objects.get(ref=cc["ref"])
    assert c.code_vu[0]["par"] == "Aïcha N." and c.journal.first().action == "Code de remise affiché"
    p = proprietaire(b).get(f"/api/vendors/orders/{cc['ref']}/handover").json()
    assert (
        p["valeurColis"] == 20000
        and p["garde"] == 17840
        and p["suite"] == {"palier": "Bronze", "liberationJours": 3, "confirmationJours": 7, "numero": "MTN ···· 4217"}
    )
    assert proprietaire(b).get("/api/vendors/orders/BLV-999999/handover").status_code == 404


def test_code_refuse_selon_l_etape(b):
    api = proprietaire(b)
    cc = commande_client(creer_offre(b, stock=9))
    assert api.get(f"/api/vendors/orders/{cc['ref']}/handover-code").json()["raison"] == "pas_prete"
    assert api.get("/api/vendors/orders/BLV-999999/handover-code").json()["raison"] == "introuvable"
    CommandeVendeur.objects.filter(ref=cc["ref"]).update(annulee_a=horloge.maintenant(), motif_annulation="belivay")
    assert api.get(f"/api/vendors/orders/{cc['ref']}/handover-code").json()["raison"] == "annulee"
    cc2 = prete(b)
    services.saisie_livreur(cc2["ref"], code(cc2["ref"]))
    assert api.get(f"/api/vendors/orders/{cc2['ref']}/handover-code").json()["raison"] == "remise"


def test_remise_par_le_livreur_jusqu_au_colis_collecte(b):
    from apps.pickup.models import SousCommande

    cc = prete(b)
    r = services.saisie_livreur(cc["ref"], code(cc["ref"]))
    assert r == {"ok": True, "essaisRestants": 3, "bloqueJusqua": None}
    c = CommandeVendeur.objects.get(ref=cc["ref"])
    assert c.remise_a and [p["type"] for p in c.photos_remise] == ["decouvert", "scelle"]
    sc = SousCommande.objects.get(order_id=c.order_id)
    assert sc.etat == "collectee" and sc.collectee_le is not None
    assert c.journal.first().action.startswith("Remis à Serge M.")
    d = proprietaire(b).get(f"/api/vendors/orders/{cc['ref']}").json()
    assert d["statut"] == "chez_le_livreur" and d["remiseA"]
    h = proprietaire(b).get(f"/api/vendors/orders/{cc['ref']}/handover").json()
    assert h["etape"] == "remise" and len(h["photos"]) == 2 and h["livreur"]["debut"] == h["remiseA"]
    assert services.saisie_livreur(cc["ref"], code(cc["ref"])) == {"ok": False, "essaisRestants": 0, "bloqueJusqua": None}
    assert services.saisie_livreur("BLV-999999", "000000")["ok"] is False


def test_trois_codes_faux_bloquent_24_h_puis_nouveau_code(b):
    cc = prete(b)
    bon = code(cc["ref"])
    faux = "000000" if bon != "000000" else "111111"
    assert services.saisie_livreur(cc["ref"], faux)["essaisRestants"] == 2
    assert services.saisie_livreur(cc["ref"], faux)["essaisRestants"] == 1
    r = services.saisie_livreur(cc["ref"], faux)
    assert r["essaisRestants"] == 0 and r["bloqueJusqua"] is not None
    assert services.saisie_livreur(cc["ref"], bon)["ok"] is False  # bloquée, même avec le bon code
    api = proprietaire(b)
    h = api.get(f"/api/vendors/orders/{cc['ref']}/handover").json()
    assert h["erreur"] == "bloque" and h["essaisFaux"] == 3 and h["bloqueJusqua"] == r["bloqueJusqua"] and not h["nouveauCodeDemande"]
    assert h["livreur"]["fin"] > r["bloqueJusqua"]  # premier passage après le déblocage (DP-57, P-7)
    assert api.get(f"/api/vendors/orders/{cc['ref']}/handover-code").json()["raison"] == "bloquee"
    n = api.post(f"/api/vendors/orders/{cc['ref']}/handover-code/renew").json()
    assert n == {"ok": True, "marcheA": r["bloqueJusqua"]}
    nouveau = code(cc["ref"])
    assert api.get(f"/api/vendors/orders/{cc['ref']}/handover").json()["nouveauCodeDemande"]
    # Après le déblocage : les essais repartent de zéro, seul le nouveau code marche.
    CommandeVendeur.objects.filter(ref=cc["ref"]).update(bloque_jusqua=horloge.maintenant() - timedelta(minutes=1))
    assert api.post(f"/api/vendors/orders/{cc['ref']}/handover-code/renew").json() == {"ok": False, "raison": "pas_bloquee"}
    assert api.get(f"/api/vendors/orders/{cc['ref']}/handover").json()["essaisFaux"] == 0
    assert services.saisie_livreur(cc["ref"], nouveau)["ok"]
    assert api.post("/api/vendors/orders/BLV-999999/handover-code/renew").json()["raison"] == "introuvable"
    assert b.notifications.filter(titre="Remise bloquée 24 h").exists()


def test_livreur_absent(b):
    cc = prete(b)
    avant = CommandeVendeur.objects.get(ref=cc["ref"]).ramassage_fin
    services.livreur_absent(cc["ref"])
    c = CommandeVendeur.objects.get(ref=cc["ref"])
    assert c.creneau_manque and c.ramassage_fin > avant
    h = proprietaire(b).get(f"/api/vendors/orders/{cc['ref']}/handover").json()
    assert h["erreur"] == "absent" and h["creneauManque"] == c.creneau_manque
    services.livreur_absent("BLV-999999")  # inconnue : rien


def test_creneau_passe_sans_remise_est_un_livreur_absent(b):
    cc = prete(b)
    t = horloge.maintenant()
    CommandeVendeur.objects.filter(ref=cc["ref"]).update(ramassage_debut=t - timedelta(hours=3), ramassage_fin=t - timedelta(hours=1))
    h = proprietaire(b).get(f"/api/vendors/orders/{cc['ref']}/handover").json()
    assert h["erreur"] == "absent" and h["creneauManque"]["fin"] < h["livreur"]["fin"]


def test_annulation_du_client_avant_le_ramassage(b):
    from apps.pickup.models import SousCommande

    o = creer_offre(b, stock=4)
    cc = commande_client(o)
    proprietaire(b).post(f"/api/vendors/orders/{cc['ref']}/ready", {}, format="json")
    services.annulation_client(cc["ref"])
    c = CommandeVendeur.objects.get(ref=cc["ref"])
    assert c.motif_annulation == "client_avant_ramassage" and SousCommande.objects.get(order_id=c.order_id).etat == "annulee"
    o.refresh_from_db()
    assert o.stock == 4
    h = proprietaire(b).get(f"/api/vendors/orders/{cc['ref']}/handover").json()
    assert h["etape"] == "annulee" and h["erreur"] == "annulee" and h["livreur"] is None
    services.annulation_client(cc["ref"])  # déjà annulée : rien
    assert c.journal.filter(action__startswith="Annulée par le client").count() == 1


def test_depasse_et_plafond(b):
    cc = commande_client(creer_offre(b))
    CommandeVendeur.objects.filter(ref=cc["ref"]).update(echeance=horloge.maintenant() - timedelta(minutes=5))
    assert proprietaire(b).get(f"/api/vendors/orders/{cc['ref']}/handover").json()["erreur"] == "depasse"
    cc2 = commande_client(creer_offre(b, fiche=creer_fiche("iPhone 15 Pro Max"), prix=350000, stock=2, reference="APL-15PM-256"))
    h = proprietaire(b).get(f"/api/vendors/orders/{cc2['ref']}/handover").json()
    assert h["niveauRequis"] == "Or" and h["erreur"] == "plafond"
    Livreur.objects.update(niveau="Or")
    assert proprietaire(b).get(f"/api/vendors/orders/{cc2['ref']}/handover").json()["erreur"] is None


def test_toutes_et_a_remettre(b):
    cc1 = prete(b)
    cc2 = prete(b)
    commande_client(creer_offre(b))
    api = preparation(b)
    a = api.get("/api/vendors/handovers?state=a_remettre").json()
    assert sorted(x["ref"] for x in a) == sorted([cc1["ref"], cc2["ref"]])
    assert a[0]["autresPourCeLivreur"] and a[0]["ref"] not in a[0]["autresPourCeLivreur"]
    assert len(api.get("/api/vendors/handovers").json()) == 3


def test_recu_reserve_au_proprietaire(b):
    cc = prete(b)
    r = preparation(b).get(f"/api/vendors/orders/{cc['ref']}/receipt")
    assert (r.status_code, r.json()["error"]["code"]) == (403, "owner_only")
    assert preparation(b).get("/api/vendors/receipts").status_code == 403
    api = proprietaire(b)
    recu = api.get(f"/api/vendors/orders/{cc['ref']}/receipt").json()
    assert recu["prix"] == 20000 and recu["garde"] == 17840 and recu["moyen"] == "momo" and not recu["fraisPayesParLeClient"]
    assert recu["encaisseA"] and recu["argent"]["etat"] == "en_cours"
    assert api.get("/api/vendors/receipts").json() == [
        {"ref": cc["ref"], "encaisseA": recu["encaisseA"], "titre": "ITEL AC52 · noir", "dessin": "itel", "prix": 20000, "garde": 17840}
    ]
    assert api.get("/api/vendors/orders/BLV-999999/receipt").status_code == 404


def test_recu_au_comptoir_pas_encore_encaisse(b):
    cc = commande_client(creer_offre(b, prix=10000), comptoir=True)
    api = proprietaire(b)
    assert api.get(f"/api/vendors/orders/{cc['ref']}/receipt").json()["encaisseA"] is None
    assert api.get("/api/vendors/receipts").json() == []


def test_anonymat_de_la_remise(b):
    cc = prete(b)
    interdits = (cc["client"].first_name, cc["client"].email)
    api = proprietaire(b)
    for u in (
        f"/api/vendors/orders/{cc['ref']}/handover",
        "/api/vendors/handovers",
        f"/api/vendors/orders/{cc['ref']}/receipt",
        "/api/vendors/receipts",
    ):
        assert fuites(api.get(u).json(), valeurs_interdites=interdits) == [], u


def test_demo_donne_un_code_aux_commandes_pretes(b):
    cc = prete(b)
    CommandeVendeur.objects.filter(ref=cc["ref"]).update(code_chiffre=None)
    demo.charger(b)
    demo.charger(b)
    assert len(code(cc["ref"])) == 6
