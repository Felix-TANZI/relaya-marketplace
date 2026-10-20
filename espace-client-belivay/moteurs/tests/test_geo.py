"""Distances géodésiques, relais proches et zones (CAL-04, CDA-05, CRL-03, CCO-11 ; DP-09, DP-46, DP-49).

Les distances de référence viennent de GeographicLib (Karney), la bibliothèque qu'utilise PostGIS pour
ST_Distance(geography) ; les positions des quartiers sont celles de relaya-marketplace (OpenStreetMap)."""

from decimal import Decimal

import pytest

from belivay_moteurs.erreurs import ParametreIllisible, ValeurInterdite
from belivay_moteurs.frais import Article, Classe, Mode, Panier, SousCommande, calculer
from belivay_moteurs.geo import (
    ConvergenceImpossible,
    Position,
    Relais,
    distance_km,
    distance_m,
    relais_par_zone_respecte,
    relais_proches,
    zone_exploitee,
)
from belivay_moteurs.registre import Zone, charger_registre, lire_geo, lire_livraison

REGISTRE = charger_registre()
PG = lire_geo(REGISTRE)


def pos(lat, lon):
    return Position(Decimal(lat), Decimal(lon))


MVOG_ADA, ESSOS, BASTOS, MOKOLO = (
    pos("3.856", "11.516"),
    pos("3.866", "11.535"),
    pos("3.89", "11.505"),
    pos("3.872", "11.513"),
)
MELEN, BIYEM_ASSI, MVAN, SOA = (
    pos("3.858", "11.497"),
    pos("3.835", "11.482"),
    pos("3.818", "11.505"),
    pos("3.97", "11.59"),
)
YAOUNDE, DOUALA = pos("3.8667", "11.5167"), pos("4.0511", "9.7679")


@pytest.mark.parametrize(
    "a, b, geographiclib",
    [
        (MVOG_ADA, ESSOS, "2382.4677"),
        (BASTOS, BIYEM_ASSI, "6596.5812"),
        (YAOUNDE, DOUALA, "195281.4786"),
        (MOKOLO, MELEN, "2356.8385"),
        (MVOG_ADA, MVAN, "4376.0331"),
        (BASTOS, SOA, "12937.2602"),
        (pos(0, 0), pos(0, 1), "111319.4908"),  # le long de l'équateur
        (pos(0, 0), pos(1, 0), "110574.3886"),  # le long d'un méridien
        (pos("-33.9", "18.4"), pos("51.5", "-0.12"), "9632341.0165"),  # Le Cap → Londres
    ],
)
def test_distance_egale_a_geographiclib_au_millimetre(a, b, geographiclib):
    assert abs(distance_m(a, b) - Decimal(geographiclib)) <= Decimal("0.001")
    assert distance_m(a, b) == distance_m(b, a)


def test_meme_point_et_antipodes():
    assert distance_m(MVOG_ADA, MVOG_ADA) == 0
    with pytest.raises(ConvergenceImpossible):
        distance_m(pos("0.5", 0), pos("-0.5", "179.7"))


def test_distance_affichee_au_dixieme():
    assert (distance_km(MVOG_ADA, ESSOS), distance_km(BASTOS, BIYEM_ASSI)) == (Decimal("2.4"), Decimal("6.6"))


def test_positions_refusees():
    with pytest.raises(ValeurInterdite):
        Position(3.856, Decimal("11.516"))  # float refusé, comme pour les montants
    for lat, lon in (("91", "0"), ("0", "-180.1"), ("NaN", "0")):
        with pytest.raises(ValueError):
            pos(lat, lon)
    assert Position("3.856", "11.516") == MVOG_ADA  # texte accepté


def test_supplement_xl_sur_la_distance_boutique_domicile():
    # DP-46 : la distance boutique → domicile, telle que le client la voit, choisit le palier du supplément.
    pl = lire_livraison(REGISTRE)
    tv = Article("Téléviseur LED 43″", 189_000, 1, Classe.XL)

    def total(boutique, domicile):
        sc = SousCommande("A", "Z1", (tv,), distance_km(boutique, domicile))
        return calculer(Panier(Mode.DOMICILE, (sc,)), pl).supplements

    assert (total(MVOG_ADA, ESSOS), total(BASTOS, BIYEM_ASSI), total(BASTOS, SOA)) == (1_500, 2_000, 3_000)


R1 = Relais("mvog-ada", "Z5", MVOG_ADA, True, False)
R2 = Relais("essos", "Z8", ESSOS, True, True)
R3 = Relais("mokolo", "Z3", MOKOLO, False, False)
R4 = Relais("melen", "Z6", MELEN, True, False)


def test_relais_proches_crl_03():
    liste = relais_proches(pos("3.857", "11.515"), (R4, R2, R3, R1))
    assert [(x.relais.id, x.propose, x.raison, x.le_plus_proche) for x in liste] == [
        ("mvog-ada", True, None, True),
        ("mokolo", False, "fermé aujourd'hui", False),
        ("melen", True, None, False),
        ("essos", False, "saturé", False),
    ]
    assert [x.distance_km for x in liste] == [Decimal("0.2"), Decimal("1.7"), Decimal("2.0"), Decimal("2.4")]
    # Le plus proche est fermé : le premier relais proposé passe en vert.
    liste = relais_proches(MOKOLO, (R3, R4))
    assert [(x.relais.id, x.le_plus_proche) for x in liste] == [("mokolo", False), ("melen", True)]
    # À distance égale, l'identifiant départage : l'ordre ne dépend pas de l'entrée.
    jumeau = Relais("a-jumeau", "Z9", MVOG_ADA, True, False)
    assert [x.relais.id for x in relais_proches(ESSOS, (R1, jumeau))] == ["a-jumeau", "mvog-ada"]


def test_zones_exploitees_dp_09():
    assert PG.zones == (Zone("Z1", "Bastos"), Zone("Z3", "Mokolo"), Zone("Z6", "Melen"), Zone("Z7", "Biyem-Assi"))
    assert zone_exploitee("Z3", PG) == Zone("Z3", "Mokolo")
    assert zone_exploitee("Z5", PG) is None  # 422 zone_non_servie (CCO-11)
    assert PG.relais_par_zone == 1 and PG.fond_de_plan.startswith("OpenStreetMap")
    assert relais_par_zone_respecte((R1, R3, R4), PG)
    assert not relais_par_zone_respecte((R1, Relais("bis", "Z5", ESSOS, True, False)), PG)


def test_registre_geo_gardes():
    for code, valeur in (
        ("ZONES-EXPLOITEES", "Z1 Bastos, Z1 Mokolo"),
        ("ZONES-EXPLOITEES", "Bastos, Mokolo"),
        ("CARTE-FOND", "Google Maps (attribution visible)"),
        ("RELAIS-PAR-ZONE", "0"),
    ):
        r = dict(REGISTRE)
        r[code] = valeur
        with pytest.raises(ParametreIllisible):
            lire_geo(r)
