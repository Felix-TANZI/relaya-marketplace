"""Portefeuille BelivaY (CWL-01 à CWL-12 ; DP-06, DP-16, DP-17, DP-23), fermé au lancement par FF-WALLET."""

from datetime import UTC, datetime, timedelta
from zoneinfo import ZoneInfo

import pytest

from belivay_moteurs.portefeuille import (
    Portefeuille,
    Recharge,
    Refus,
    crediter_remboursement,
    payer,
    recharger,
    retirable,
    retirer,
    suppression_du_compte_possible,
)
from belivay_moteurs.registre import charger_registre, lire_paiement, lire_portefeuille

REGISTRE = charger_registre()
P = lire_portefeuille(REGISTRE)
PP = lire_paiement(REGISTRE)
Y = ZoneInfo("Africa/Douala")


def t(jour, heure=10, mois=9):
    return datetime(2026, mois, jour, heure, tzinfo=Y)


def test_parametres():
    assert (P.plafond, P.recharge_min, P.retrait_min, P.retrait_jour, P.retrait_heures) == (
        2_500_000,
        500,
        1_000,
        500_000,
        1,
    )
    assert (P.retraits_gratuits_par_mois, P.retrait_frais_min, P.recharge_attente_heures, P.numero_attente_heures) == (
        1,
        100,
        72,
        48,
    )


def test_recharge_minimum_et_plafond():
    vide = Portefeuille()
    assert recharger(vide, 499, t(1), P).refus is Refus.MINIMUM
    r = recharger(vide, 10_000, t(1), P)
    assert (r.accepte, r.portefeuille.solde, r.encore_possible) == (True, 10_000, 2_490_000)
    plein = Portefeuille(rembourse=2_499_800)
    r = recharger(plein, 500, t(1), P)
    assert (r.accepte, r.refus, r.encore_possible) == (False, Refus.PLAFOND, 200)
    assert recharger(Portefeuille(rembourse=2_600_000), 500, t(1), P).encore_possible == 0


def test_remboursement_selon_ff_wallet_et_le_moyen():
    pf = Portefeuille(rembourse=2_490_000)
    assert crediter_remboursement(pf, 5_000, False, False, P).vers_le_moyen_d_origine == 5_000  # FF-WALLET fermé
    assert crediter_remboursement(pf, 5_000, True, True, P).au_portefeuille == 0  # carte : même carte (DP-17)
    c = crediter_remboursement(pf, 15_000, True, False, P)
    assert (c.au_portefeuille, c.vers_le_moyen_d_origine, c.portefeuille.solde) == (10_000, 5_000, 2_500_000)


def test_payer_avec_le_solde_puis_mobile_money():
    pf = Portefeuille((Recharge(t(2), 20_000), Recharge(t(1), 10_000)), rembourse=5_000)
    r = payer(pf, 33_000, PP)
    # D'abord l'argent rechargé, le plus ancien d'abord (DP-48), puis l'argent remboursé.
    assert (r.par_le_solde, r.complement_mobile_money, r.biometrie) == (33_000, 0, False)
    assert (r.portefeuille.recharges, r.portefeuille.rembourse) == ((), 2_000)
    r = payer(pf, 60_000, PP)
    assert (r.par_le_solde, r.complement_mobile_money, r.biometrie) == (35_000, 25_000, False)
    r = payer(pf, 12_000, PP)
    assert r.portefeuille.recharges == (Recharge(t(2), 18_000, True),)  # la recharge entamée a servi
    assert payer(pf, 12_000, PP, utiliser_le_solde=False).complement_mobile_money == 12_000
    assert payer(Portefeuille(rembourse=60_000), 50_000, PP).biometrie  # CODE-BIO (CWL-10)


def test_retirable_attentes():
    pf = Portefeuille((Recharge(t(1), 10_000), Recharge(t(3), 8_000, a_servi=True)), rembourse=2_000)
    assert retirable(pf, t(3), P) == 10_000  # la recharge du 1er attend 72 h, celle qui a servi non
    assert retirable(pf, t(4), P) == 20_000
    change = Portefeuille(pf.recharges, pf.rembourse, (), numero_change_le=t(4))
    assert retirable(change, t(5), P) == 0  # 48 h après un changement de numéro
    assert retirable(change, t(6), P) == 20_000


def test_retraits_refuses():
    pf = Portefeuille((Recharge(t(1), 10_000),), rembourse=2_000)
    assert retirer(pf, 999, t(5), P, PP).refus is Refus.MINIMUM
    assert retirer(pf, 12_001, t(5), P, PP).refus is Refus.SOLDE
    assert retirer(pf, 5_000, t(2), P, PP).refus is Refus.ATTENTE_RECHARGE
    change = Portefeuille(pf.recharges, pf.rembourse, (), numero_change_le=t(5))
    assert retirer(change, 1_000, t(6), P, PP).refus is Refus.ATTENTE_NUMERO
    gros = Portefeuille(rembourse=900_000)
    premier = retirer(gros, 400_000, t(5), P, PP)
    assert premier.accepte and premier.biometrie
    assert retirer(premier.portefeuille, 100_001, t(5, 18), P, PP).refus is Refus.PLAFOND_DU_JOUR
    assert retirer(premier.portefeuille, 100_001, t(6), P, PP).accepte  # nouveau jour


def test_retrait_remboursement_sans_frais_et_un_gratuit_par_mois():
    pf = Portefeuille((Recharge(t(1), 50_000),), rembourse=3_000)
    r = retirer(pf, 13_000, t(5), P, PP)
    assert (r.accepte, r.frais, r.verse_au_plus_tard) == (True, 0, t(5) + timedelta(hours=1))
    assert (r.portefeuille.rembourse, r.portefeuille.recharges[0].restant) == (0, 40_000)
    second = retirer(r.portefeuille, 5_000, t(6), P, PP)
    assert second.frais == 100  # 1 % de 5 000 = 50 F, au moins 100 F
    troisieme = retirer(second.portefeuille, 20_000, t(7), P, PP)
    assert troisieme.frais == 200
    octobre = retirer(troisieme.portefeuille, 5_000, t(1, mois=10), P, PP)
    assert octobre.frais == 0  # un retrait gratuit par mois civil
    # Un retrait fait seulement d'argent remboursé ne consomme pas le retrait gratuit.
    rembourse = retirer(Portefeuille((Recharge(t(1), 9_000),), rembourse=5_000), 5_000, t(5), P, PP)
    assert retirer(rembourse.portefeuille, 2_000, t(6), P, PP).frais == 0


def test_suppression_du_compte():
    assert suppression_du_compte_possible(Portefeuille())
    assert not suppression_du_compte_possible(Portefeuille(rembourse=1))


def test_montants_et_heures_refuses():
    pf = Portefeuille(rembourse=5_000)
    for montant in (0, -1_000, True, "1000"):
        with pytest.raises(ValueError):
            payer(pf, montant, PP)
    with pytest.raises(ValueError):
        crediter_remboursement(pf, -1, True, False, P)
    with pytest.raises(ValueError):
        recharger(pf, 1_000, datetime(2026, 9, 1, 10), P)  # noqa: DTZ001
    with pytest.raises(ValueError):
        retirer(pf, 1_000, datetime(2026, 9, 1, 10), P, PP)  # noqa: DTZ001


def test_jour_et_mois_a_l_heure_de_yaounde():
    # 31 oct. 23 h 30 UTC = 1er nov. 0 h 30 à Yaoundé : le retrait compte en novembre.
    pf = Portefeuille((Recharge(t(1, mois=10), 50_000),))
    octobre = retirer(pf, 5_000, t(31, 20, mois=10), P, PP)
    novembre = retirer(octobre.portefeuille, 5_000, datetime(2026, 10, 31, 23, 30, tzinfo=UTC), P, PP)
    assert (octobre.frais, novembre.frais) == (0, 0)
