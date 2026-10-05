# backend/apps/extras/tests/test_regles.py
# Règles CL-15 (regles.py), exemples de site/src/donnees/cote.ts, troc.ts et famille.ts.
from apps.extras import regles

J = regles.JOUR_MS
R = regles.ReglesCote(
    minimum=20000, acompte_pour_cent=20, versement_min=10000, jours_max=60, grace=7, forfait_pour_cent=5, forfait_max=5000, avant_rentree=7
)


def test_plan_mensuel():
    assert regles.plan_cote(30000, "mois", 0, R) == [{"du": 6000, "le": 0}, {"du": 12000, "le": 30 * J}, {"du": 12000, "le": 60 * J}]


def test_plan_deux_semaines_et_arrondi():
    v = regles.plan_cote(50000, "2sem", 0, R)
    assert [x["du"] for x in v] == [10000, 10000, 10000, 10000, 10000] and v[-1]["le"] == 56 * J
    v = regles.plan_cote(33333, "mois", 0, R)
    assert [x["du"] for x in v] == [6667, 13333, 13333] and sum(x["du"] for x in v) == 33333
    v = regles.plan_cote(25900, "mois", 0, R)
    assert [x["du"] for x in v] == [5180, 10360, 10360]


def test_plan_petit_reste_un_seul_versement():
    v = regles.plan_cote(20000, "2sem", 0, R)
    assert [x["du"] for x in v] == [4000, 16000]


def test_forfait_et_annulation():
    assert regles.forfait_cote(25900, R) == 1295
    assert regles.forfait_cote(200000, R) == 5000
    assert regles.annulation_cote(15540, 25900, R) == {"rembourse": 14245, "forfait": 1295}
    assert regles.annulation_cote(500, 25900, R) == {"rembourse": 0, "forfait": 500}


def test_plan_rentree():
    rentree = 70 * J
    v = regles.plan_cote_rentree(40000, "mois", 0, rentree, R)
    assert v[-1]["le"] <= rentree - 7 * J and sum(x["du"] for x in v) == 40000
    assert regles.plan_cote_rentree(40000, "mois", 0, 30 * J, R) is None  # trop près
    assert regles.plan_cote_rentree(15000, "mois", 0, rentree, R) is None  # trop petit


def test_estimer_reprise():
    intact = {"allume": True, "ecran": "intact", "batterie": True, "coque": "bon", "compteRetire": True, "codeRetire": True}
    assert regles.estimer(41000, intact) == {"min": 32000, "max": 41000}
    assert regles.estimer(41000, {**intact, "ecran": "fissure"}) == {"min": 22000, "max": 28500}
    assert regles.estimer(24000, {**intact, "allume": False, "coque": "abimee"}) == {"min": 7000, "max": 9000}
    assert regles.estimer(41000, {**intact, "compteRetire": False}) is None
    assert regles.estimer(None, intact) is None


def test_classe_famille():
    assert regles.classe_famille(5000) == "S"
    assert regles.classe_famille(5001) == "M"
    assert regles.classe_famille(30000) == "L"
    assert regles.classe_famille(30001) is None
