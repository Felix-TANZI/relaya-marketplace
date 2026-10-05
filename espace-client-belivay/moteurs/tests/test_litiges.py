"""Litiges, retours, remplacement, rupture et libération, sur le jeu d'essai de CL-02 (LIT-3042, BLV-51702,
BLV-51388, BLV-52107) et les décisions DP-01, DP-10, DP-27, DP-28, DP-35."""

from datetime import date, datetime
from zoneinfo import ZoneInfo

import pytest

from belivay_moteurs.frais import Article, Classe, Mode, Panier, SousCommande, calculer
from belivay_moteurs.litiges import (
    Motif,
    Palier,
    PalierIFA,
    PartieEnTort,
    Voie,
    echeance_remplacement,
    echeances,
    fermeture_du_retour,
    fin_inspection,
    fin_reponse_arrangement,
    liberation,
    recours_possible,
    remboursement_automatique,
    rembourser_retour,
    voie_de_retour,
)
from belivay_moteurs.registre import ParametreIllisible, charger_registre, lire_litiges, lire_livraison

REGISTRE = charger_registre()
P = lire_litiges(REGISTRE)
PL = lire_livraison(REGISTRE)
Y = ZoneInfo("Africa/Douala")


def t(mois, jour, heure=0, minute=0):
    return datetime(2026, mois, jour, heure, minute, tzinfo=Y)


def test_parametres():
    assert (P.auto_standard, P.auto_eleve, P.vendeur_heures, P.decision_heures, P.recours_heures) == (
        3_000,
        10_000,
        48,
        24,
        48,
    )
    assert (P.arrangement_jours, P.fenetre_retour_jours, P.defaut_cache_heures, P.vice_cache_jours) == (5, 7, 48, 100)
    assert (P.inspection_heures, P.trajet_retour, P.remplacement_heures_ouvrees) == (48, 500, 72)
    assert (P.lib_standard_jours, P.lib_or_jours, P.lib_carte_jours) == (3, 1, 14)


@pytest.mark.parametrize(
    "montant, palier, auto",
    [
        (3_000, PalierIFA.STANDARD, True),  # LIT-2987 : 3 000 F remboursés automatiquement (BLV-51206)
        (3_001, PalierIFA.STANDARD, False),
        (10_000, PalierIFA.ELEVE, True),
        (10_001, PalierIFA.ELEVE, False),
        (100, PalierIFA.A_INSTRUIRE, False),  # jamais aux paliers « À instruire » et « Plafonné » (CLT-24)
        (100, PalierIFA.PLAFONNE, False),
        (0, PalierIFA.ELEVE, False),
    ],
)
def test_remboursement_automatique(montant, palier, auto):
    assert remboursement_automatique(montant, palier, P) is auto


def test_echeances_de_lit_3042():
    e = echeances(t(9, 23, 17, 15), P)
    assert (e.reponse_vendeur, e.decision_au_plus_tard) == (t(9, 25, 17, 15), t(9, 26, 17, 15))


def test_recours_et_arrangement():
    decision = t(9, 26, 17, 15)
    assert recours_possible(decision, t(9, 28, 17, 15), False, P)
    assert not recours_possible(decision, t(9, 28, 17, 16), False, P)
    assert not recours_possible(decision, t(9, 27, 9), True, P)  # un seul recours
    assert fin_reponse_arrangement(t(9, 24, 10), P) == t(9, 29, 10)


RETRAIT_51702 = t(9, 19, 11, 32)  # sam. 19 sept. 11 h 32 : fenêtre de retour jusqu'au sam. 26 à 11 h 32


@pytest.mark.parametrize(
    "motif, signalement, tout_en_ordre, voie",
    [
        (Motif.ABIME, t(9, 25), False, Voie.RETOUR),
        (Motif.NON_CONFORME, t(9, 26, 11, 32), False, Voie.RETOUR),
        (Motif.NON_CONFORME, t(9, 26, 11, 33), False, Voie.AUCUNE),  # fenêtre fermée
        (Motif.CONTREFACON, t(9, 22), True, Voie.AUCUNE),  # « Tout est en ordre » touché (DP-28)
        (Motif.DEFAUT_CACHE, t(9, 21, 11, 32), False, Voie.RETOUR),  # sous 48 h
        (Motif.DEFAUT_CACHE, t(9, 22), False, Voie.LITIGE),  # entre 48 h et 7 jours : litige normal (DP-35)
        (None, t(9, 20), False, Voie.AUCUNE),  # pas de retour sans motif au lancement (DP-35)
    ],
)
def test_voie_de_retour(motif, signalement, tout_en_ordre, voie):
    assert voie_de_retour(motif, RETRAIT_51702, signalement, tout_en_ordre, P) is voie


def test_vice_cache_100_jours_meme_apres_tout_est_en_ordre():
    retrait = t(8, 28, 12)  # BLV-51388 : retirée ven. 28 août ; couvert jusqu'au dim. 6 déc. (DP-27)
    assert voie_de_retour(Motif.VICE_CACHE, retrait, t(12, 6, 12), True, P) is Voie.VICE_CACHE
    assert voie_de_retour(Motif.VICE_CACHE, retrait, t(12, 6, 12, 1), True, P) is Voie.AUCUNE


BLV_51702 = Panier(
    Mode.RELAIS,
    (
        SousCommande(
            "Or", "Mvog-Ada", (Article("Écouteurs", 16_500, 1, Classe.S), Article("Chargeur 33 W", 6_500, 1, Classe.S))
        ),
    ),
)


def test_retour_client_en_tort():
    # Trajet retour 500 F retenu : 23 000 − 500 = 22 500 F (CL-11).
    r = rembourser_retour(23_000, PartieEnTort.CLIENT, P)
    assert (r.trajet_retenu, r.montant, r.livraison) == (500, 22_500, 0)


def test_retour_vendeur_en_tort_rembourse_la_livraison_du_colis():
    # Commande d'un seul colis : tout ce qui a été payé revient (23 900 F) (DP-35).
    off = calculer(BLV_51702, PL).offert
    r = rembourser_retour(23_000, PartieEnTort.VENDEUR, P, commande=BLV_51702, boutique="Or", pl=PL, offert=off)
    assert (r.livraison, r.montant) == (900, 23_900) and r.montant == calculer(BLV_51702, PL).total


def test_retour_d_un_colis_d_une_commande_a_trois_boutiques():
    blv_52107 = Panier(
        Mode.RELAIS,
        (
            SousCommande("A", "Mvog-Ada", (Article("Galaxy A15", 89_900, 1, Classe.S),)),
            SousCommande("B", "Mvog-Ada", (Article("Chemise × 4", 21_000, 4, Classe.S),)),
            SousCommande("C", "Mvan", (Article("Marmite", 22_000, 1, Classe.S),)),
        ),
    )
    r = rembourser_retour(84_000, PartieEnTort.TRANSPORTEUR, P, commande=blv_52107, boutique="B", pl=PL, offert=900)
    assert (r.livraison, r.montant) == (780, 84_780)  # même part que l'annulation de B (CAL-24)
    with pytest.raises(ValueError):
        rembourser_retour(84_000, PartieEnTort.VENDEUR, P, commande=blv_52107)
    with pytest.raises(ValueError):
        rembourser_retour(84_000, PartieEnTort.VENDEUR, P, commande=blv_52107, boutique="Z", pl=PL)


def test_inspection_et_remplacement():
    assert fin_inspection(t(9, 24, 10), P) == t(9, 26, 10)
    # Vendredi 10 h + 72 h ouvrées, dimanche non compté : vendredi 14 h restantes + samedi 24 h + lundi 24 h +
    # mardi 10 h = 72 h → mardi 10 h.
    assert echeance_remplacement(t(9, 25, 10), P) == t(9, 29, 10)
    assert echeance_remplacement(t(9, 27, 15), P) == t(10, 1, 0)  # commencé un dimanche : compte dès lundi


def test_fermeture_du_retour():
    assert fermeture_du_retour(date(2026, 9, 19), None, P) == date(2026, 9, 26)
    assert fermeture_du_retour(date(2026, 9, 19), date(2026, 9, 21), P) == date(2026, 9, 21)


@pytest.mark.parametrize(
    "palier, carte, liberee, versement",
    [
        (Palier.BRONZE, False, date(2026, 9, 29), date(2026, 10, 2)),
        (Palier.ARGENT, False, date(2026, 9, 29), date(2026, 10, 2)),
        (Palier.OR, False, date(2026, 9, 27), date(2026, 10, 2)),
        (Palier.PLATINE, False, date(2026, 9, 27), date(2026, 10, 2)),
        (Palier.OR, True, date(2026, 10, 10), date(2026, 10, 16)),  # carte : 14 jours
    ],
)
def test_liberation(palier, carte, liberee, versement):
    assert liberation(date(2026, 9, 26), palier, carte, False, P) == (liberee, versement)


def test_liberation_un_vendredi_et_litige():
    assert liberation(date(2026, 9, 24), Palier.OR, False, False, P) == (date(2026, 9, 25), date(2026, 9, 25))
    assert liberation(date(2026, 9, 26), Palier.OR, False, True, P) is None


def test_registre_retour_sans_renvoi_refuse():
    r = dict(REGISTRE)
    r["RET-SANS-RETOUR"] = "5 000 F"
    with pytest.raises(ParametreIllisible, match="DP-10"):
        lire_litiges(r)


def test_echeance_remplacement_juste_avant_minuit():
    # Début à moins d'une minute de minuit : l'échéance se calcule (la boucle comptait à la minute et restait à 0).
    debut = t(9, 25, 23).replace(minute=59, second=30)
    fin = echeance_remplacement(debut, P)
    assert fin > debut
    assert (fin - debut).total_seconds() >= P.remplacement_heures_ouvrees * 3600
