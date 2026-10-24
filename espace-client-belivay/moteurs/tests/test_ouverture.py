"""Calendrier d'ouverture de la boutique : mêmes exemples que espace-vendeur/src/calculs/ouverture.test.ts.
Boutique du jeu d'essai : lundi à vendredi 08 h – 18 h, samedi 08 h – 14 h, dimanche fermé ; livreur 14 h – 16 h en
semaine, 11 h – 13 h le samedi."""

from dataclasses import replace
from datetime import date, datetime, timedelta

import pytest

from belivay_moteurs.ouverture import (
    YAOUNDE,
    Calendrier,
    Horaire,
    Passage,
    ajouter_ouvertes,
    heures_ouvertes,
    options_de_delai,
    ouverte_a,
    ouverture_du_jour_suivant,
    ouverture_suivante,
    passage_suivant,
)

H = timedelta(hours=1)
CAL = Calendrier(
    horaires=tuple(Horaire(j, j < 6, "08:00", "14:00" if j == 5 else "18:00") for j in range(7)),
    passages=(Passage((0, 1, 2, 3, 4), "14:00", "16:00"), Passage((5,), "11:00", "13:00")),
)


def y(j: int, h: int = 0, m: int = 0) -> datetime:
    return datetime(2026, 9, j, h, m, tzinfo=YAOUNDE)


def test_blv_00008_quatre_heures_ouvertes():
    assert ajouter_ouvertes(y(21, 8, 42), 4 * H, CAL) == y(21, 12, 42)
    assert heures_ouvertes(y(21, 9, 48), y(21, 12, 42), CAL) == timedelta(hours=2, minutes=54)


def test_payee_samedi_apres_fermeture():
    debut = ouverture_suivante(y(26, 15), CAL)
    assert debut == y(28, 8)
    assert ajouter_ouvertes(debut, 4 * H, CAL) == y(28, 12)
    assert ajouter_ouvertes(debut, 24 * H, CAL) == y(30, 12)


def test_decompte_arrete_la_nuit_et_le_dimanche():
    assert heures_ouvertes(y(26, 13), y(28, 9), CAL) == 2 * H
    assert heures_ouvertes(y(28, 9), y(28, 9), CAL) == timedelta(0)


def test_fermer_aujourdhui_et_fermeture_programmee():
    assert ouverture_suivante(y(21, 9), replace(CAL, fermee_le=date(2026, 9, 21))) == y(22, 8)
    assert ouverture_suivante(y(21, 9), replace(CAL, fermetures=((date(2026, 9, 21), date(2026, 9, 22)),))) == y(23, 8)


def test_ouverte_a():
    assert ouverte_a(y(21, 9), CAL)
    assert not ouverte_a(y(21, 19), CAL)
    assert not ouverte_a(y(27, 10), CAL)


def test_plus_de_temps_blv_00008():
    ramassage, o = options_de_delai(y(21, 12, 42), y(23, 12, 42), CAL)
    assert ramassage == (y(21, 14), y(21, 16))
    assert [(x.choix, x.echeance, x.effet, x.possible) for x in o] == [
        ("+1h", y(21, 13, 42), "inchange", True),
        ("+2h", y(21, 14, 42), "attend", True),
        ("demain", y(22, 8), "suivant", True),
    ]
    assert o[2].ramassage == (y(22, 14), y(22, 16))


def test_p6_creneau_suivant():
    _, o = options_de_delai(y(21, 15, 30), y(23, 12), CAL)
    assert (o[1].echeance, o[1].effet, o[1].ramassage) == (y(21, 17, 30), "suivant", (y(22, 14), y(22, 16)))


def test_vendredi_soir_vers_samedi():
    _, o = options_de_delai(y(25, 17, 30), y(30, 12), CAL)
    assert o[0].echeance == y(26, 8, 30)
    assert o[2].echeance == y(26, 8)
    assert o[0].ramassage == (y(26, 11), y(26, 13))


def test_del_03_au_dela_de_l_absolue():
    _, o = options_de_delai(y(21, 12, 42), y(21, 14), CAL)
    assert [x.possible for x in o] == [True, False, False]


def test_passage_jamais_un_jour_ferme():
    assert passage_suivant(y(26, 13, 30), CAL) == (y(28, 14), y(28, 16))
    assert ouverture_du_jour_suivant(y(25, 10), CAL) == y(26, 8)


def test_refus():
    with pytest.raises(ValueError, match="sans fuseau"):
        ouverte_a(datetime(2026, 9, 21, 9), CAL)  # noqa: DTZ001 (heure sans fuseau, refusée)
    ferme = Calendrier(horaires=tuple(Horaire(j, False, "08:00", "18:00") for j in range(7)), passages=())
    with pytest.raises(ValueError, match="400 jours"):
        ouverture_suivante(y(21, 9), ferme)
    with pytest.raises(ValueError, match="60 jours"):
        ouverture_du_jour_suivant(y(21, 9), ferme)
    sans_passage = replace(CAL, passages=())
    with pytest.raises(ValueError, match="passage du livreur"):
        passage_suivant(y(21, 9), sans_passage)
