"""Lecture du registre : une valeur de forme inattendue arrête la lecture (jamais un montant deviné)."""

from decimal import Decimal

import pytest

from belivay_moteurs.argent import decimal, ecrire, pour_cent_affiche, pourcentage_de
from belivay_moteurs.erreurs import ParametreAbsent, ParametreIllisible, ValeurInterdite
from belivay_moteurs.registre import charger_registre, lire_livraison

REGISTRE = charger_registre()


def avec(code, valeur):
    r = dict(REGISTRE)
    r[code] = valeur
    return r


def test_registre_reel_lisible():
    lire_livraison(REGISTRE)


@pytest.mark.parametrize(
    "code, valeur",
    [
        ("LIV-R", "500 euros"),
        ("LIV-REM-RELAIS", "400 F par colis"),
        ("LIV-SEUIL-RELAIS", "à partir de 30 000 F"),
        ("LIV-SUPPL-XL", "1 500 F"),
        ("LIV-DELTA", "24 % (R′ = 390 F)"),  # R′ incohérent avec R et δ
    ],
)
def test_valeur_de_forme_inattendue(code, valeur):
    with pytest.raises(ParametreIllisible, match=code.split()[0]):
        lire_livraison(avec(code, valeur))


def test_parametre_absent():
    r = dict(REGISTRE)
    del r["LIV-REM-DOM"]
    with pytest.raises(ParametreAbsent):
        lire_livraison(r)


def test_un_changement_du_registre_change_le_calcul():
    r = avec("LIV-REM-RELAIS", "450 F par colis S ou M, 650 F par colis L")
    with pytest.raises(ParametreIllisible, match="LIV-RELAIS-BASE"):
        lire_livraison(r)  # la livraison de base doit suivre : 500 + 450 = 950 F
    r["LIV-RELAIS-BASE"] = "950 F"
    p = lire_livraison(r)
    assert p.remise_relais == {"S": 450, "M": 450, "L": 650}
    with pytest.raises(TypeError):
        p.remise_relais["S"] = 0  # paramètres non modifiables après lecture


def test_arrondis():
    assert pourcentage_de(272_579, Decimal(2)) == 5_452  # 5 451,58 → 5 452 F
    assert pourcentage_de(19_400, Decimal(2)) == 388
    assert pourcentage_de(11_900, Decimal(2)) == 238
    assert pour_cent_affiche(18_500, 30_000) == 62
    assert ecrire(-900) == "−900\u00a0F"
    with pytest.raises(ValeurInterdite):
        decimal(0.1)
    with pytest.raises(ValeurInterdite):
        decimal(True)


def test_paliers_xl_qui_ne_se_suivent_pas():
    v = "1 500 F (moins de 5 km) · 2 000 F (6 à 10 km) · 3 000 F (plus de 10 km), distance de la livraison à domicile"
    with pytest.raises(ParametreIllisible, match="paliers"):
        lire_livraison(avec("LIV-SUPPL-XL", v))


def test_gardes_des_montants():
    with pytest.raises(ValeurInterdite):
        decimal([1])
    with pytest.raises(ValueError):
        pour_cent_affiche(1, 0)


def test_registre_paiement_gardes():
    from belivay_moteurs.registre import lire_paiement

    r = dict(REGISTRE)
    r["PAY-CPT-FID#sens"] = "Comptoir : plafond des clients fidèles"
    with pytest.raises(ParametreIllisible, match="PAY-CPT-FID"):
        lire_paiement(r)
    with pytest.raises(ParametreIllisible, match="PAY-CARTE-ARRONDI"):
        lire_paiement(avec("PAY-CARTE-ARRONDI", "franc le plus proche"))
