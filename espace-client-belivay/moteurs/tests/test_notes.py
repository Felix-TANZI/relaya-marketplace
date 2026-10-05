"""Notes, avis et remise affichée (CAL-30, CAL-31 ; jeu d'essai de CL-02)."""

from datetime import datetime
from decimal import Decimal
from zoneinfo import ZoneInfo

import pytest

from belivay_moteurs.notes import (
    Issue,
    borne_wilson,
    fin_de_notation,
    issue_satisfaction,
    note_affichee,
    note_basse,
    remise_pour_cent,
    repartition,
)
from belivay_moteurs.registre import charger_registre, lire_avis

P = lire_avis(charger_registre())


def test_parametres():
    assert (P.note_basse_max, P.fenetre_jours) == (2, 7)


def test_note_affichee_du_camon_30():
    # Répartition du prototype (dist5) : 92, 27, 5, 3, 1 avis de 5 à 1 étoile ; 590 ÷ 128 = 4,61 → « 4,6 ».
    notes = (5,) * 92 + (4,) * 27 + (3,) * 5 + (2,) * 3 + (1,) * 1
    assert (len(notes), sum(notes)) == (128, 590)
    assert note_affichee(notes) == Decimal("4.6")
    assert repartition(notes) == {5: 72, 4: 21, 3: 4, 2: 2, 1: 1}
    assert note_affichee(()) is None


def test_repartition():
    assert repartition((5, 5, 4, 1)) == {5: 50, 4: 25, 3: 0, 2: 0, 1: 25}
    assert repartition((5, 4, 4)) == {5: 33, 4: 67, 3: 0, 2: 0, 1: 0}
    assert repartition(()) == {5: 0, 4: 0, 3: 0, 2: 0, 1: 0}


def test_wilson_trois_avis_ne_passent_pas_devant_deux_cents():
    peu = borne_wilson(3, 3)  # 3 avis à 5 étoiles
    beaucoup = borne_wilson(190, 200)  # 200 avis, 190 à 4 ou 5 étoiles (moyenne 4,7)
    assert peu < beaucoup
    assert Decimal("0.43") < peu < Decimal("0.45")
    assert borne_wilson(0, 0) == 0
    with pytest.raises(ValueError):
        borne_wilson(5, 3)


@pytest.mark.parametrize(
    "note, issue", [(5, Issue.SUCCES), (4, Issue.SUCCES), (3, Issue.NEUTRE), (2, Issue.ECHEC), (1, Issue.ECHEC)]
)
def test_issue_satisfaction(note, issue):
    assert issue_satisfaction(note) is issue


def test_note_basse_et_fenetre():
    assert note_basse(2, P) and note_basse(1, P) and not note_basse(3, P)
    y = ZoneInfo("Africa/Douala")
    assert fin_de_notation(datetime(2026, 9, 19, 11, 32, tzinfo=y), P) == datetime(2026, 9, 26, 11, 32, tzinfo=y)


@pytest.mark.parametrize(
    "barre, prix, remise",
    [
        (99_900, 89_900, 10),
        (29_900, 27_500, 8),
        (34_900, 29_900, 14),
        (20_000, 20_000, None),
        (None, 20_000, None),
        (19_000, 20_000, None),
    ],
)
def test_remise_pour_cent(barre, prix, remise):
    assert remise_pour_cent(barre, prix) == remise


@pytest.mark.parametrize("notes", [(0,), (6,), (True,), (4.5,)])
def test_notes_invalides(notes):
    with pytest.raises(ValueError):
        note_affichee(notes)
