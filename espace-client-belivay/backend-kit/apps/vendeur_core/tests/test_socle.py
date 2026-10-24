# Socle vendeur : calendrier d'ouverture, entrée d'une commande payée (montant gardé du moteur, figé), accès et rôle,
# horloge d'essai, anonymat.
from datetime import datetime, timedelta

import pytest
from django.test import override_settings
from rest_framework import status

from apps.client_core.temps import YAOUNDE
from apps.vendeur_core import calendrier, horloge, services
from apps.vendeur_core.acces import VueProprietaire, VueVendeur, membre_de, proprietaire_seulement
from apps.vendeur_core.anonymat import fuites
from apps.vendeur_core.models import CommandeVendeur, FermetureBoutique
from apps.vendeur_core.tests.outils import (
    HORAIRES_DEMO,
    PASSAGES_DEMO,
    ajouter_preparation,
    commande_client,
    creer_boutique_vendeur,
    creer_offre,
)

pytestmark = pytest.mark.django_db


def y(*a):
    return datetime(*a, tzinfo=YAOUNDE)


CAL = {"horaires": HORAIRES_DEMO, "fermeeLe": None, "fermetures": [], "passages": PASSAGES_DEMO}


# ── Calendrier : même arithmétique que le site (preparation.ts) ──────────────────────────────────────────


def test_quatre_heures_ouvertes_le_lundi_matin():
    # BLV-00008 payée lundi 21 sept. à 8 h 42 : prête avant 12 h 42 (jeu d'essai du paquet).
    assert calendrier.ajouter_ouvertes(y(2026, 9, 21, 8, 42), timedelta(hours=4), CAL) == y(2026, 9, 21, 12, 42)


def test_payee_boutique_fermee_le_delai_part_a_l_ouverture():
    # Payée dimanche : le délai commence lundi 8 h (E10).
    assert calendrier.ouverture_suivante(y(2026, 9, 20, 15), CAL) == y(2026, 9, 21, 8)
    assert calendrier.ajouter_ouvertes(y(2026, 9, 19, 13), timedelta(hours=4), CAL) == y(2026, 9, 21, 11)  # samedi 13 h → lundi 11 h


def test_fermer_aujourdhui_et_fermetures_programmees():
    c = {**CAL, "fermeeLe": "2026-09-21"}
    assert calendrier.plage_du_jour(y(2026, 9, 21).date(), c) is None
    assert calendrier.ouverture_suivante(y(2026, 9, 21, 9), c) == y(2026, 9, 22, 8)
    c2 = {**CAL, "fermetures": [{"du": "2026-09-22", "au": "2026-09-23"}]}
    assert calendrier.ouverture_du_jour_suivant(y(2026, 9, 21, 9), c2) == y(2026, 9, 24, 8)
    assert not calendrier.ouverte_a(y(2026, 9, 22, 10), c2) and calendrier.ouverte_a(y(2026, 9, 21, 10), c2)


def test_heures_ouvertes_entre_deux_instants():
    assert calendrier.heures_ouvertes(y(2026, 9, 19, 12), y(2026, 9, 21, 9), CAL) == timedelta(hours=3)
    assert calendrier.heures_ouvertes(y(2026, 9, 21, 9), y(2026, 9, 21, 8), CAL) == timedelta(0)


def test_passage_du_livreur_et_options_de_delai():
    assert calendrier.passage_suivant(y(2026, 9, 21, 12, 42), CAL) == (y(2026, 9, 21, 14), y(2026, 9, 21, 16))
    assert calendrier.passage_suivant(y(2026, 9, 26, 13, 30), CAL) == (y(2026, 9, 28, 14), y(2026, 9, 28, 16))  # samedi après le passage
    prevu, options = calendrier.options_de_delai(y(2026, 9, 21, 12, 42), y(2026, 9, 22, 12, 42), CAL)
    assert prevu == (y(2026, 9, 21, 14), y(2026, 9, 21, 16))
    assert [(o["choix"], o["effet"], o["possible"]) for o in options] == [
        ("+1h", "inchange", True),
        ("+2h", "attend", True),
        ("demain", "suivant", True),
    ]
    assert options[2]["echeance"] == y(2026, 9, 22, 8) and options[2]["ramassage"] == (y(2026, 9, 22, 14), y(2026, 9, 22, 16))
    _, tard = calendrier.options_de_delai(y(2026, 9, 21, 12, 42), y(2026, 9, 21, 13, 0), CAL)
    assert [o["possible"] for o in tard] == [False, False, False]


def test_sans_passage_ni_ouverture():
    assert calendrier.passage_suivant(y(2026, 9, 21, 9), {**CAL, "passages": []}) == (y(2026, 9, 21, 9), y(2026, 9, 21, 9))
    ferme = {**CAL, "horaires": []}
    # Une boutique sans aucune ouverture : le moteur refuse (horaires à vérifier) plutôt que d'inventer une échéance.
    with pytest.raises(ValueError):
        calendrier.ajouter_ouvertes(y(2026, 9, 21, 9), timedelta(hours=1), ferme)


def test_calendrier_de_la_boutique():
    b = creer_boutique_vendeur(horaires=HORAIRES_DEMO, passages=PASSAGES_DEMO)
    FermetureBoutique.objects.create(boutique=b, du=y(2026, 12, 24).date(), au=y(2026, 12, 26).date(), annoncee_le=y(2026, 12, 1))
    b.pause_depuis, b.pause_jusqua = y(2027, 1, 2), y(2027, 1, 5)
    c = calendrier.calendrier(b)
    assert c["fermetures"] == [{"du": "2026-12-24", "au": "2026-12-26"}, {"du": "2027-01-02", "au": "2027-01-05"}]
    assert c["horaires"][5] == {"jour": 5, "ouvert": True, "de": "08:00", "a": "14:00"}


# ── Entrée d'une commande ─────────────────────────────────────────────────────────────────────────────


def test_commande_payee_entre_chez_le_vendeur_avec_le_garde_du_moteur():
    b = creer_boutique_vendeur()
    o = creer_offre(b, prix=20000, stock=5)
    cc = commande_client(o)
    c = CommandeVendeur.objects.get(boutique=b)
    # ITEL 20 000 F, Bronze, découverte (première commande) : 2 700 × 0,80 = 2 160 F pris, 17 840 F gardés (moteur).
    assert (c.prix, c.garde, c.commission, c.palier, c.decouverte) == (20000, 17840, 2160, "Bronze", True)
    assert c.ref == cc["ref"] and c.lignes[0]["offreId"] == str(o.pk) and c.lignes[0]["reference"] == "ITL-AC52-NR"
    assert c.version_parametres and c.echeance > c.debut and c.echeance_absolue >= c.echeance
    assert c.journal.first().action == "Commande reçue"
    o.refresh_from_db()
    assert o.stock == 4
    b.refresh_from_db()
    assert b.premiere_commande_payee is not None
    assert services.synchroniser(b) == 0  # idempotent


def test_une_commande_non_payee_n_entre_pas_et_une_boutique_sans_vendeur_ne_synchronise_rien():
    b = creer_boutique_vendeur()
    o = creer_offre(b)
    commande_client(o, payer=False)
    assert not CommandeVendeur.objects.exists()
    b.vendor_id = None
    assert services.synchroniser(b) == 0


def test_commande_au_comptoir_est_payable_au_retrait():
    b = creer_boutique_vendeur()
    o = creer_offre(b, prix=10000)
    commande_client(o, comptoir=True)
    c = CommandeVendeur.objects.get(boutique=b)
    assert (c.payable_au_retrait, c.moyen) == (True, "comptoir")


def test_avancer_le_colis_du_client():
    from apps.pickup.models import SousCommande

    b = creer_boutique_vendeur()
    c = CommandeVendeur.objects.get(ref=commande_client(creer_offre(b))["ref"])
    services.avancer_colis(c, "suborder.ready")  # passe par seller.confirmed
    assert SousCommande.objects.get(order_id=c.order_id).etat == "prete"
    services.avancer_colis(c, "seller.confirmed")  # jamais en arrière
    assert SousCommande.objects.get(order_id=c.order_id).etat == "prete"
    c.n = 9
    services.avancer_colis(c, "parcel.collected")  # colis inconnu : rien


def test_formes_de_sortie():
    b = creer_boutique_vendeur()
    assert services.numero_court(b) == {"operateur": "MTN", "masque": "···· 4217"}
    assert services.numero_en_mots(b) == "MTN ···· 4217"
    assert services.etat_boutique(b) == "ouverte" and services.ferme_a(b) == "23:59"
    b.fermee_le = horloge.aujourd_hui()
    assert services.etat_boutique(b) == "fermee_aujourdhui"
    b.pause_depuis, b.pause_jusqua = horloge.maintenant() - timedelta(days=1), horloge.maintenant() + timedelta(days=1)
    assert services.etat_boutique(b) == "en_pause"
    b.suspendue_depuis = horloge.maintenant()
    assert services.etat_boutique(b) == "suspendue"
    sans = creer_boutique_vendeur(numero=None, horaires=[])
    assert services.numero_court(sans) is None and services.numero_en_mots(sans) == "" and services.ferme_a(sans) == ""
    assert services.garde_par_vente(b, "Électronique", 20000, palier="Or", decouverte_active=False) == 20000 - 1890 - 0
    assert services.decouverte(b)["max"] == 50


# ── Accès ──────────────────────────────────────────────────────────────────────────────────────────────


def test_membre_et_role(rf):
    from rest_framework.response import Response
    from rest_framework.test import force_authenticate

    from apps.client_core.tests.outils import creer_client

    b = creer_boutique_vendeur()
    prep = ajouter_preparation(b)
    assert membre_de(b.proprietaire).role == "proprietaire" and membre_de(prep.user).role == "preparation"

    class Lire(VueVendeur):
        def get(self, request):
            return Response({"montant": self.montant(100)})

        @proprietaire_seulement
        def post(self, request):
            return Response({})

    class Argent(VueProprietaire):
        def get(self, request):
            return Response({"ok": True})

    def appel(vue, user, methode="get"):
        r = getattr(rf, methode)("/")
        force_authenticate(r, user=user)
        return vue.as_view()(r)

    assert appel(Lire, b.proprietaire).data == {"montant": 100}
    assert appel(Lire, prep.user).data == {"montant": None}
    assert appel(Lire, prep.user, "post").status_code == status.HTTP_403_FORBIDDEN
    r = appel(Argent, prep.user)
    assert (r.status_code, r.data["error"]["code"]) == (403, "owner_only")
    assert appel(Argent, b.proprietaire).data == {"ok": True}
    r = appel(Lire, creer_client())
    assert (r.status_code, r.data["error"]["code"]) == (403, "pas_vendeur")


# ── Horloge d'essai ────────────────────────────────────────────────────────────────────────────────────


def test_horloge_ignoree_hors_essai():
    horloge.regler(86400)
    assert abs((horloge.maintenant() - datetime.now(tz=YAOUNDE)).total_seconds()) < 5


@override_settings(BELIVAY_ESSAI_ROUTES=True)
def test_horloge_avance_sur_le_serveur_d_essai():
    horloge.regler(0)
    horloge.avancer(3 * 86400)
    assert abs((horloge.maintenant() - datetime.now(tz=YAOUNDE)).total_seconds() - 3 * 86400) < 5
    assert horloge.maintenant_ms() > 0 and horloge.maintenant_yaounde().tzinfo is not None
    horloge.regler(0)


# ── Anonymat ───────────────────────────────────────────────────────────────────────────────────────────


def test_detection_des_fuites():
    assert fuites({"ref": "BLV-1", "lignes": [{"titre": "ITEL"}]}) == []
    assert fuites({"commande": {"client": "Carine"}}) == ["$.commande.client"]
    assert fuites({"a": ["Relais Mvog-Ada"]}, valeurs_interdites=("Mvog-Ada",)) == ["$.a[0] = « Relais Mvog-Ada » contient « Mvog-Ada »"]
    assert fuites({"relais": 1}, permis={"relais"}) == []


# ── Faits du client et de BelivaY ──────────────────────────────────────────────────────────────────────


def test_faits_retrait_litige_retour_et_recours():
    from apps.aftersales import services as apres_vente
    from apps.aftersales.models import Litige
    from apps.pickup.evenements import avancer, remettre_au_client
    from apps.pickup.models import GroupeRemise
    from apps.pickup.services import code_de
    from apps.vendeur_core.faits import faits

    b = creer_boutique_vendeur()
    cc = commande_client(creer_offre(b))
    c = CommandeVendeur.objects.get(boutique=b)
    f = faits(c)
    assert (f.retrait, f.gel, f.litige_id, f.perdu) == (None, None, None, False) and f.etat_colis == "payee"
    for e in ("seller.confirmed", "suborder.ready", "parcel.collected", "parcel.received"):
        avancer(c.order_id, e)
    assert remettre_au_client(c.order_id, code_de(GroupeRemise.objects.get(order_id=c.order_id)))["ok"]
    f = faits(c)
    assert f.retrait is not None and f.etat_colis == "remise"
    lit = apres_vente.ouvrir(cc["client"], cc["ref"], 1, "abime", "Écran fendu à l'ouverture du colis.", "rembourse", [])
    assert faits(c).gel == "litige"
    lit = apres_vente.reponse_du_vendeur(lit, "conteste", texte="L'article est parti intact, photos du scellé.")
    lit = apres_vente.decider(lit, "rembourse", "Photos du client probantes.")
    assert faits(c).gel == "retour"
    lit2 = Litige.objects.get(pk=lit.pk)
    Litige.objects.filter(pk=lit2.pk).update(clos_le=lit2.decision_le, issue="refuse")
    f = faits(c)
    assert f.gel == "recours" and f.fin_du_gel is not None and not f.perdu
    Litige.objects.filter(pk=lit2.pk).update(issue="rembourse", rembourse=20000)
    assert faits(c).perdu
