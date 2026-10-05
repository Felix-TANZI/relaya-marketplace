"""Garde et rappels S0 à S5, sur l'exemple daté BLV-52018 (spécification 10.4, jeu d'essai de CL-02).

Recalculs dus aux décisions du porteur :
- DP-08, grille 0, 100, 100, 100, 200, 500, 1 000 F : le 4e jour coûte 100 F (200 F avant), le 6e 500 F (400 F) ;
  la garde au renvoi reste 1 000 F ; aujourd'hui (jeu. 24, 4e jour) : 300 F dus, 500 F demain (400 et 600 avant) ;
- DP-18, remise par colis : BLV-52018 (2 colis) a coûté 34 180 F (33 780 F avant), donc 32 680 F remboursés au
  renvoi (32 280 F avant), toujours 1 500 F retenus.
"""

from datetime import UTC, date, datetime, time
from zoneinfo import ZoneInfo

import pytest

from belivay_moteurs.frais import Article, Classe, Mode, Panier, SousCommande, calculer
from belivay_moteurs.garde import (
    Canal,
    GroupeEnGarde,
    HorairesRelais,
    dernier_jour_de_retrait,
    etat,
    rappels,
    relance_non_vu,
    renvoi,
    tarif_du_jour,
)
from belivay_moteurs.registre import ParametreIllisible, charger_registre, lire_garde, lire_livraison

REGISTRE = charger_registre()
P = lire_garde(REGISTRE)

# Relais Mvog-Ada : 8 h – 19 h, fermé le dimanche (jeu d'essai).
MVOG_ADA = HorairesRelais(time(8), time(19), frozenset({6}))
LUN_21, MAR_22, MER_23, JEU_24, VEN_25, SAM_26, DIM_27, LUN_28 = (date(2026, 9, d) for d in range(21, 29))

PAYE_52018 = calculer(
    Panier(
        Mode.RELAIS,
        (
            SousCommande("Pagne", "Mvog-Ada", (Article("Pagne wax 6 yards", 18_500, 1, Classe.S),)),
            SousCommande("Sandales", "Mvog-Ada", (Article("Sandales cuir femme · 39", 14_900, 1, Classe.S),)),
        ),
    ),
    lire_livraison(REGISTRE),
).total

BLV_52018 = GroupeEnGarde("BLV-52018", LUN_21, valeur=33_400, montant_paye=PAYE_52018, gros=False, horaires=MVOG_ADA)


def test_parametres():
    assert P.grille == (0, 100, 100, 100, 200, 500, 1_000)
    assert (P.ajout_gros, P.renvoi, P.gain_relais_jour, P.gain_relais_jour_gros) == (300, 500, 100, 300)
    assert (P.heure_rappel, P.non_vu_heures, P.seuil_sms_eco) == (time(18), 48, 10_000)


def test_montant_paye_de_blv_52018_avec_dp_18():
    assert PAYE_52018 == 34_180  # 33 400 + 880 + 2 × 400 − 900


@pytest.mark.parametrize(
    "jour, rang, tarif, du",
    [
        (LUN_21, 1, 0, 0),
        (MAR_22, 2, 100, 100),
        (MER_23, 3, 100, 200),
        (JEU_24, 4, 100, 300),
        (VEN_25, 5, 200, 500),
        (SAM_26, 6, 500, 1_000),
        (DIM_27, 7, 0, 1_000),  # fermé : compte dans le rang, jamais facturé
    ],
)
def test_grille_jour_par_jour(jour, rang, tarif, du):
    e = etat(BLV_52018, jour, P)
    assert (e.rang, e.tarif_du_jour, e.du) == (rang, tarif, du)


def test_aujourd_hui_jeudi_24():
    # « Montant dû : 300 F · 500 F demain » (spécification : 400 F et 600 F avec l'ancienne grille).
    e = etat(BLV_52018, JEU_24, P)
    assert (e.du, e.du_demain, e.jours_factures, e.gain_relais) == (300, 500, 3, 300)


def test_renvoi_lundi_28():
    r = renvoi(BLV_52018, P)
    assert (r.jour, r.garde, r.retenue, r.rembourse) == (LUN_28, 1_000, 1_500, 32_680)
    assert any("DP-08" in ligne for ligne in r.trace)


def test_gain_du_relais():
    # 5 jours facturés (rangs 2 à 6) × 100 F, versés le vendredi.
    assert etat(BLV_52018, DIM_27, P).gain_relais == 500


def test_dernier_jour_de_retrait():
    assert dernier_jour_de_retrait(BLV_52018) == SAM_26


def test_serie_de_rappels_blv_52018():
    serie = {r.code: r for r in rappels(BLV_52018, P, montant_panier=33_400)}
    s0, s1, s2, s3, s4, s5 = (serie[c] for c in ("S0", "S1", "S2", "S3", "S4", "S5"))
    assert (s0.jour, s0.heure, s0.canal, s0.du, s0.du_demain) == (MAR_22, time(18), Canal.PUSH, 100, 200)
    assert (s1.jour, s1.heure, s1.canal, s1.du, s1.du_demain) == (MER_23, time(18), Canal.SMS, 200, 300)
    assert (s2.jour, s2.heure, s2.canal, s2.du, s2.du_demain) == (VEN_25, time(18), Canal.SMS, 500, 1_000)
    # Le 7e jour est fermé : S3 devient « dernier jour », à l'ouverture du relais ; S4 ne part pas (CGA-25).
    assert (s3.jour, s3.heure, s3.dernier_jour_de_retrait, s3.du) == (SAM_26, time(8), True, 1_000)
    assert (s4.jour, s4.envoye, s4.motif) == (DIM_27, False, "relais fermé ce jour-là")
    assert (s5.jour, s5.envoye, s5.du) == (LUN_28, True, 1_500)
    assert all(r.dernier_jour == SAM_26 for r in (s0, s1, s2, s3))


def test_rappels_quand_le_7e_jour_est_ouvert():
    # J0 un mardi : le rang 7 tombe le lundi suivant, ouvert ; S3 à 18 h, S4 « dernier jour » à l'ouverture.
    g = GroupeEnGarde("X", date(2026, 9, 22), 33_400, 34_180, False, MVOG_ADA)
    serie = {r.code: r for r in rappels(g, P, 33_400)}
    # Le dimanche 27 (rang 6) est fermé : S3 ne part pas.
    assert (serie["S3"].jour, serie["S3"].envoye) == (date(2026, 9, 27), False)
    assert (serie["S4"].jour, serie["S4"].heure, serie["S4"].dernier_jour_de_retrait) == (
        date(2026, 9, 28),
        time(8),
        True,
    )
    g2 = GroupeEnGarde("Y", date(2026, 9, 14), 33_400, 34_180, False, HorairesRelais(time(8), time(19)))
    serie2 = {r.code: r for r in rappels(g2, P, 33_400)}
    assert (serie2["S3"].heure, serie2["S3"].dernier_jour_de_retrait) == (time(18), False)
    assert (serie2["S4"].heure, serie2["S4"].dernier_jour_de_retrait) == (time(8), True)


def test_mode_economique_des_sms():
    serie = {r.code: r for r in rappels(BLV_52018, P, montant_panier=9_000)}
    assert serie["S1"].canal is Canal.PUSH and serie["S2"].canal is Canal.PUSH


def test_colis_retire_avant_les_rappels():
    serie = {r.code: r for r in rappels(BLV_52018, P, 33_400, retire_le=JEU_24)}
    assert serie["S0"].envoye and serie["S1"].envoye
    assert not serie["S2"].envoye and serie["S2"].motif == "colis retiré"
    assert not serie["S5"].envoye


def test_litige_suspend_la_garde():
    g = GroupeEnGarde("L", LUN_21, 33_400, 34_180, False, MVOG_ADA, jours_suspendus=frozenset({MER_23, JEU_24}))
    assert etat(g, VEN_25, P).du == 100 + 200
    assert {r.code: r for r in rappels(g, P, 33_400)}["S1"].motif.startswith("garde suspendue")


def test_gros_colis():
    # DP-08 : 300, 400, 400, 400, 500, 800, 1 300 F ; plafond 4 100 F sur 7 jours ouverts.
    g = GroupeEnGarde("G", date(2026, 9, 14), 200_000, 200_900, True, HorairesRelais(time(8), time(19)))
    assert [tarif_du_jour(g, date(2026, 9, 14 + k), P) for k in range(7)] == [300, 400, 400, 400, 500, 800, 1_300]
    e = etat(g, date(2026, 9, 20), P)
    assert (e.du, e.jours_factures, e.gain_relais) == (4_100, 7, 2_100)
    assert renvoi(g, P).retenue == 4_600


def test_garde_plafonnee_a_la_valeur_du_colis():
    g = GroupeEnGarde("P", date(2026, 9, 14), 600, 1_500, False, HorairesRelais(time(8), time(19)))
    assert etat(g, date(2026, 9, 20), P).du == 600


def test_retenue_jamais_au_dela_du_paye():
    # Commande validée, livraison seule payée d'avance (900 F), non retirée : retenue = 900 F, rien remboursé (DP-24).
    g = GroupeEnGarde("BLV-51940", date(2026, 9, 14), 24_000, 900, False, HorairesRelais(time(8), time(19)))
    r = renvoi(g, P)
    assert (r.retenue, r.rembourse) == (900, 0)
    assert any("DP-24" in ligne for ligne in r.trace)


def test_sans_accuse_fort_rien_n_est_facture():
    g = GroupeEnGarde("N", None, 33_400, 34_180, False, MVOG_ADA)
    assert etat(g, LUN_28, P).du == 0
    assert renvoi(g, P) is None and rappels(g, P, 33_400) == [] and dernier_jour_de_retrait(g) is None
    douala = ZoneInfo("Africa/Douala")  # fuseau de la spécification (CAL-19)
    assert relance_non_vu(datetime(2026, 9, 21, 17, 40, tzinfo=douala), P) == datetime(
        2026, 9, 23, 17, 40, tzinfo=douala
    )


def test_avant_j0():
    assert etat(BLV_52018, date(2026, 9, 20), P).du == 0


def test_relais_ferme_toute_la_semaine_refuse():
    with pytest.raises(ValueError, match="fermé tous les jours"):
        HorairesRelais(time(8), time(19), frozenset(range(7)))


def test_fermetures_exceptionnelles_sans_dernier_jour_ni_renvoi():
    fermetures = frozenset(date(2026, 9, d) for d in range(21, 31)) | frozenset(date(2026, 10, d) for d in range(1, 31))
    g = GroupeEnGarde("F", LUN_21, 1_000, 1_000, False, HorairesRelais(time(8), time(19), frozenset(), fermetures))
    assert dernier_jour_de_retrait(g) is None
    with pytest.raises(ValueError, match="aucun jour de renvoi"):
        renvoi(g, P)


def test_variante_fermeture_jeudi():
    # Relais fermé le jeudi 24 (variante du jeu d'essai) avec la grille de DP-08 : 200 F jeudi, 400 F vendredi,
    # 900 F samedi, 1 400 F retenus au renvoi (1 300 F avant DP-08).
    horaires = HorairesRelais(time(8), time(19), frozenset({6}), frozenset({JEU_24}))
    g = GroupeEnGarde("BLV-52018", LUN_21, 33_400, PAYE_52018, False, horaires)
    assert [etat(g, d, P).du for d in (JEU_24, VEN_25, SAM_26)] == [200, 400, 900]
    assert renvoi(g, P).retenue == 1_400


def test_gain_du_relais_jamais_au_dela_de_ce_qui_est_encaisse():
    # CGA-18 : valeur du colis 150 F, garde plafonnée à 150 F : le relais touche 150 F, pas 600 F.
    g = GroupeEnGarde("V", date(2026, 9, 14), 150, 1_050, False, HorairesRelais(time(8), time(19)))
    e = etat(g, date(2026, 9, 20), P)
    assert (e.du, e.gain_relais) == (150, 150)
    # DP-24 : gros colis payé 900 F au comptoir, non retiré : retenue 900 F, le renvoi d'abord, 400 F de garde.
    gros = GroupeEnGarde("G", date(2026, 9, 14), 200_000, 900, True, HorairesRelais(time(8), time(19)))
    r = renvoi(gros, P)
    assert (r.retenue, r.gain_relais) == (900, 400)


def test_ajout_du_jour_plafonne():
    g = GroupeEnGarde("P", date(2026, 9, 14), 600, 1_500, False, HorairesRelais(time(8), time(19)))
    e = etat(g, date(2026, 9, 19), P)  # rang 6 : tarif 500 F, mais seuls 100 F s'ajoutent sous le plafond de 600 F
    assert (e.tarif_du_jour, e.ajout_du_jour, e.du) == (500, 100, 600)


def test_dernier_jour_quand_les_rangs_6_et_7_sont_fermes():
    # Fermé samedi et dimanche : le dernier jour est le vendredi 25 (rang 5) ; S2 devient « dernier jour » à
    # l'ouverture, S3 et S4 ne partent pas.
    horaires = HorairesRelais(time(8), time(19), frozenset({5, 6}))
    g = GroupeEnGarde("W", LUN_21, 33_400, 34_180, False, horaires)
    serie = {r.code: r for r in rappels(g, P, 33_400)}
    assert (serie["S2"].jour, serie["S2"].heure, serie["S2"].dernier_jour_de_retrait) == (VEN_25, time(8), True)
    assert not serie["S3"].envoye and not serie["S4"].envoye


def test_dernier_jour_sans_rappel_prevu_ce_jour_la():
    # Fermé vendredi, samedi et dimanche : dernier jour jeudi 24 (rang 4), aucun rappel prévu ; S4 y est placé.
    horaires = HorairesRelais(time(8), time(19), frozenset({4, 5, 6}))
    g = GroupeEnGarde("X", LUN_21, 33_400, 34_180, False, horaires)
    s4 = {r.code: r for r in rappels(g, P, 33_400)}["S4"]
    assert (s4.jour, s4.heure, s4.dernier_jour_de_retrait, s4.envoye) == (JEU_24, time(8), True, True)


def test_pas_de_renvoi_pendant_un_litige():
    g = GroupeEnGarde(
        "L", LUN_21, 33_400, 34_180, False, MVOG_ADA, jours_suspendus=frozenset({DIM_27, LUN_28, date(2026, 9, 29)})
    )
    assert renvoi(g, P).jour == date(2026, 9, 30)


def test_s5_non_envoye_si_retire_le_jour_du_renvoi():
    assert not {r.code: r for r in rappels(BLV_52018, P, 33_400, retire_le=LUN_28)}["S5"].envoye


def test_message_non_delivre_annule_la_garde_de_la_periode():
    # CSM-30 : S1 (mer. 23) non délivré : pas de frais du mer. 23 au jeu. 24 (S2 le ven. 25).
    g = GroupeEnGarde("M", LUN_21, 33_400, 34_180, False, MVOG_ADA, rappels_non_delivres=frozenset({MER_23}))
    assert [tarif_du_jour(g, d, P) for d in (MAR_22, MER_23, JEU_24, VEN_25)] == [100, 0, 0, 200]


def test_j0_a_yaounde():

    from belivay_moteurs.garde import j0_de

    assert j0_de(datetime(2026, 9, 20, 23, 30, tzinfo=UTC)) == LUN_21  # 0 h 30 à Douala
    with pytest.raises(ValueError):
        j0_de(datetime(2026, 9, 20, 23, 30))  # noqa: DTZ001
    with pytest.raises(ValueError):
        GroupeEnGarde("N", None, 1, 1, False, MVOG_ADA).jour_du_rang(2)


@pytest.mark.parametrize(
    "code, valeur",
    [
        ("GARDE-J4-5", "200 F le jour 4, 200 F le jour 5"),  # ne dit plus la même chose que GARDE-GRILLE
        ("GARDE-PRORATA", "au prorata"),
        ("GARDE-FERME", "facturé"),
        ("GARDE-GRILLE", "0, 100, 100"),
    ],
)
def test_registre_garde_incoherent(code, valeur):
    r = dict(REGISTRE)
    r[code] = valeur
    with pytest.raises(ParametreIllisible):
        lire_garde(r)


def test_renvoi_reporte_si_le_relais_est_ferme_le_8e_jour():
    # Fermeture exceptionnelle le lundi 28 : renvoi le premier jour ouvert suivant, mardi 29.
    horaires = HorairesRelais(time(8), time(19), frozenset({6}), frozenset({LUN_28}))
    g = GroupeEnGarde("R", LUN_21, 33_400, 34_180, False, horaires)
    assert renvoi(g, P).jour == date(2026, 9, 29)


def test_aucun_jour_de_retrait_pendant_les_sept_rangs():
    # Litige ouvert du lun. 21 au dim. 27 : aucun jour de retrait, aucun rappel ne part, le renvoi attend.
    g = GroupeEnGarde(
        "Z", LUN_21, 33_400, 34_180, False, MVOG_ADA, jours_suspendus=frozenset(date(2026, 9, d) for d in range(21, 28))
    )
    assert dernier_jour_de_retrait(g) is None
    serie = {r.code: r for r in rappels(g, P, 33_400)}
    assert not any(serie[c].envoye for c in ("S0", "S1", "S2", "S3", "S4"))
    assert (serie["S4"].jour, serie["S4"].dernier_jour_de_retrait) == (DIM_27, False)
