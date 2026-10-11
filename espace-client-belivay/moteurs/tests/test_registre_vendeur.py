"""Paramètres de l'espace vendeur (DP-55, DP-56) : une valeur de forme inattendue arrête la lecture."""

from datetime import date, datetime
from zoneinfo import ZoneInfo

import pytest

from belivay_moteurs.erreurs import ParametreIllisible
from belivay_moteurs.registre import charger_registre, lire_commission, lire_paliers, lire_versements
from belivay_moteurs.versements import vendredi_de_versement

REGISTRE = charger_registre()


def avec(**modifs):
    r = dict(REGISTRE)
    r.update(modifs)
    return r


def test_registre_reel_lisible():
    lire_commission(REGISTRE)
    lire_versements(REGISTRE)
    lire_paliers(REGISTRE)


@pytest.mark.parametrize(
    "code, valeur, motif",
    [
        ("VD-COM-MODELE", "R4", "VD-02"),
        ("VD-BAREME-SANS-TAUX", "0 %", "tranche précédente"),
        ("VD-BAREME-A", "Électronique : 13,5 % jusqu’à 20 000 F · 2 % au delà", "illisible"),
        ("VD-BAREME-A", "Électronique : 13,5 % au-delà · 2 % au-delà", "dernière tranche"),
        ("VD-BAREME-A", "Électronique : 13,5 % jusqu’à 20 000 F · 2 % jusqu’à 50 000 F", "dernière tranche"),
        ("VD-BAREME-A", "Électronique : 13,5 % jusqu’à 20 000 F · 5 % jusqu’à 10 000 F · 2 % au-delà", "croître"),
        ("VD-BAREME-A", "Électronique : sans taux jusqu’à 20 000 F · 2 % au-delà", "première tranche"),
        ("VD-BAREME-B", "Électronique : 23,5 % au-delà", "déjà dans la famille A"),
        ("VD-COM-PALIER", "Bronze × 1 · Argent × 1,15 · Or × 0,70 · Platine × 0,60", "entre 0"),
        ("VD-COM-PALIER", "Bronze × 1 · Argent × 0 · Or × 0,70 · Platine × 0,60", "entre 0"),
        ("VD-DECOUV-MULT", "× 1,20 sur la commission", "entre 0"),
        ("VD-COM-M05", "200 F ou 0,5 % du panier", "M05 fournie"),
        ("VD-COM-M06", "× 0,9 au-delà de 300 000 F", "M06 fournie"),
        ("VD-PLAN-REMISE-PLAFOND", "aucun", "DP-55"),
        ("VD-COM-MIN", "700 F par commande", "VD-COM-MIN"),
    ],
)
def test_commission_illisible(code, valeur, motif):
    with pytest.raises(ParametreIllisible, match=motif):
        lire_commission(avec(**{code: valeur}))


@pytest.mark.parametrize(
    "code, valeur, motif",
    [
        ("VD-VER-JOUR", "fredi, avant 12 h, sans frais ni minimum", "jour inconnu"),
        ("VD-VER-ARRETE", "mercredi 23 h 59", "veille"),
        ("VD-VER-FERIE", "versement la veille", "maintenu"),
        ("VD-LIB-CARTE", "14 jours après le retrait", "VD-LIB-CARTE"),
    ],
)
def test_versements_illisible(code, valeur, motif):
    with pytest.raises(ParametreIllisible, match=motif):
        lire_versements(avec(**{code: valeur}))


@pytest.mark.parametrize(
    "code, valeur, motif",
    [
        ("VD-PAL-OR", "50 commandes livrées ; Trust Score 80", "en premier"),
        ("VD-PAL-OR", "Trust Score 80 ; parrainage", "inconnue"),
        ("VD-PAL-PLATINE", "Trust Score 75 ; audit trimestriel", "croître"),
        ("VD-PLAFOND-DEMARRAGE", "500 000 F par commande", "VD-PLAFOND-DEMARRAGE"),
    ],
)
def test_paliers_illisible(code, valeur, motif):
    with pytest.raises(ParametreIllisible, match=motif):
        lire_paliers(avec(**{code: valeur}))


def test_un_changement_du_registre_change_le_calcul():
    p = lire_commission(
        avec(**{"VD-BAREME-E": "Livres & Médias : 12,5 % jusqu’à 10 000 F · 9 % jusqu’à 50 000 F · 7 % au-delà"})
    )
    assert p.bareme["E"][-1].taux_pour_cent == 7
    v = lire_versements(avec(**{"VD-NUM-REVUE": "3 jours, versements reportés"}))
    assert v.revue_numero_jours == 3
    # Arrêté avancé au jeudi 18 h : libéré jeudi 24 à 19 h, versé le vendredi 2 oct.
    v = lire_versements(avec(**{"VD-VER-ARRETE": "jeudi 18 h 00"}))
    y = ZoneInfo("Africa/Douala")
    assert vendredi_de_versement(datetime(2026, 9, 24, 19, tzinfo=y), v) == date(2026, 10, 2)
    assert vendredi_de_versement(datetime(2026, 9, 24, 17, tzinfo=y), v) == date(2026, 9, 25)
