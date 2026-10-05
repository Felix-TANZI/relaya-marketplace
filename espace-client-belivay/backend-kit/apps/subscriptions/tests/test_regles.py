# backend/apps/subscriptions/tests/test_regles.py
# Règles de l'abonnement : les valeurs du registre doivent redonner la table PALIERS de site/src/donnees/prime.ts, et
# remise_prime les mêmes résultats que remisePrime du site.

from decimal import Decimal

import pytest

from apps.subscriptions import regles
from apps.subscriptions.regles import Usage
from apps.subscriptions.services import regles_en_vigueur

pytestmark = pytest.mark.django_db

# site/src/donnees/prime.ts (PALIERS, PASS, ESSAI, GRACE, BASE_RELAIS, BASE_DOMICILE)
SITE = {
    "plus": dict(
        mois=2500,
        an=25000,
        relais_des=10000,
        relais_offerts=3,
        relais_reduction=1,
        domicile_offerts=0,
        domicile_des=0,
        domicile_ensuite=Decimal("0.3"),
        cagnotte=0,
        garde_bonus=2,
        comptes=1,
        parrainage=1,
        plafond=30,
    ),
    "prime": dict(
        mois=4000,
        an=40000,
        relais_des=10000,
        relais_offerts=None,
        relais_reduction=1,
        domicile_offerts=3,
        domicile_des=15000,
        domicile_ensuite=Decimal("0.5"),
        cagnotte=2,
        garde_bonus=4,
        comptes=1,
        parrainage=1,
        plafond=30,
    ),
    "duo": dict(
        mois=7000,
        an=70000,
        relais_des=10000,
        relais_offerts=None,
        relais_reduction=1,
        domicile_offerts=5,
        domicile_des=15000,
        domicile_ensuite=Decimal("0.5"),
        cagnotte=2,
        garde_bonus=4,
        comptes=2,
        parrainage=2,
        plafond=30,
    ),
    "business": dict(
        mois=15000,
        an=150000,
        relais_des=10000,
        relais_offerts=None,
        relais_reduction=Decimal("0.5"),
        domicile_offerts=6,
        domicile_des=15000,
        domicile_ensuite=Decimal("0.5"),
        cagnotte=2,
        garde_bonus=4,
        comptes=3,
        parrainage=3,
        plafond=70,
    ),
}


@pytest.fixture
def r():
    return regles_en_vigueur()


def test_registre_redonne_la_table_du_site(r):
    for pid, attendu in SITE.items():
        d = r.palier(pid)
        assert (d.mois, d.an, d.relais_des, d.relais_offerts, d.domicile_offerts, d.domicile_des) == (
            attendu["mois"],
            attendu["an"],
            attendu["relais_des"],
            attendu["relais_offerts"],
            attendu["domicile_offerts"],
            attendu["domicile_des"],
        ), pid
        assert d.relais_reduction == attendu["relais_reduction"] and d.domicile_ensuite == attendu["domicile_ensuite"]
        assert (d.cagnotte_pour_cent, d.garde_bonus, d.comptes, d.parrainage, d.plafond) == (
            attendu["cagnotte"],
            attendu["garde_bonus"],
            attendu["comptes"],
            attendu["parrainage"],
            attendu["plafond"],
        ), pid
    assert (r.pass_.prix, r.pass_.jours, r.pass_.relais_des, r.pass_.commandes) == (1500, 7, 10000, 4)
    assert (r.essai, r.grace_jours, r.cagnotte_jours, r.parrainages_par_mois) == (1500, 7, 90, 3)
    assert (r.base_relais, r.base_domicile) == (900, 1500)  # BASE_RELAIS = 500 + 400 ; BASE_DOMICILE = 500 + 1 000


@pytest.mark.parametrize(
    "palier, mode, sous_total, livraison, usage, attendu",
    [
        ("prime", "relais", 12_000, 900, Usage(), 900),
        ("prime", "relais", 9_000, 900, Usage(), 0),  # sous ABO-SEUIL-RELAIS
        ("prime", "relais", 30_000, 900, Usage(), 0),  # livraison déjà offerte à tous
        ("plus", "relais", 12_000, 900, Usage(relais=2, total=2), 900),
        ("plus", "relais", 12_000, 900, Usage(relais=3, total=3), 0),  # 3 relais par mois (ABO-QUOTA-PLUS)
        ("business", "relais", 12_000, 900, Usage(), 450),  # −50 %
        ("prime", "relais", 12_000, 600, Usage(), 600),  # jamais plus que la livraison
        ("prime", "domicile", 16_000, 1_500, Usage(), 1_500),
        ("prime", "domicile", 16_000, 2_500, Usage(domicile=3, total=3), 750),  # au-delà des 3 offertes : −50 %
        ("prime", "domicile", 12_000, 2_500, Usage(), 750),  # sous ABO-SEUIL-DOM : −50 %
        ("plus", "domicile", 16_000, 2_500, Usage(), 450),  # Plus : −30 %
        ("prime", "relais", 12_000, 900, Usage(total=30), 0),  # usage normal dépassé
        ("business", "relais", 12_000, 900, Usage(total=30), 450),  # Business : 70
        ("pass", "relais", 10_000, 900, Usage(relais=3), 900),
        ("pass", "relais", 10_000, 900, Usage(relais=4), 0),  # 4 commandes
        ("pass", "domicile", 20_000, 1_500, Usage(), 0),
        ("prime", "relais", 12_000, 0, Usage(), 0),
    ],
)
def test_remise_prime_comme_le_site(r, palier, mode, sous_total, livraison, usage, attendu):
    assert regles.remise_prime(r, palier, True, mode, sous_total, livraison, usage) == attendu


def test_inactif_aucune_remise(r):
    assert regles.remise_prime(r, "prime", False, "relais", 12_000, 900, Usage()) == 0
    assert regles.remise_prime(r, None, True, "relais", 12_000, 900, Usage()) == 0


def test_prix_cadeau_essai_et_grace(r):
    prime = r.palier("prime")
    assert [regles.prix_cadeau(prime, m) for m in (1, 3, 12)] == [4000, 12000, 40000]  # 1 an = tarif annuel
    with pytest.raises(ValueError):
        regles.prix_cadeau(prime, 6)
    assert regles.prix(r, "prime", "mois", essai_possible=True) == 1500
    assert regles.prix(r, "prime", "an", essai_possible=True) == 40000
    assert regles.prix(r, "plus", "mois", essai_possible=True) == 2500
    assert regles.prix(r, "pass", "pass") == 1500
    j = regles.JOUR_MS
    assert regles.fin_grace(r, 0) == 7 * j
    assert regles.actif(r, None, 0, 7 * j) and not regles.actif(r, None, 0, 7 * j + 1)
    assert regles.depart_apres_echec(r, 0, 6 * j) == 0 and regles.depart_apres_echec(r, 0, 8 * j) == 8 * j
    assert regles.montant_cagnotte(r, "prime", 11_800) == 236 and regles.montant_cagnotte(r, "plus", 11_800) == 0
    assert regles.frais_carte(r, 12_000) == 240
