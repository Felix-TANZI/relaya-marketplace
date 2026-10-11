"""Libération et versements du vendeur (VD-02 p7, VD-09 ; DP-55 : Q-11 à Q-13, Q-15, Q-19 ; Q-58 à Q-60, Q-65), sur
le jeu d'essai du paquet « Espace vendeur » (lundi 21 septembre 2026, 09 h 48, boutique Tonton PG)."""

from datetime import UTC, date, datetime, timedelta
from zoneinfo import ZoneInfo

import pytest

from belivay_moteurs.litiges import Palier
from belivay_moteurs.registre import charger_registre, lire_versements
from belivay_moteurs.versements import (
    Gain,
    appliquer_reprise,
    date_de_liberation,
    essais_apres_refus,
    fermeture_du_retour,
    fin_de_revue,
    heure_limite,
    liberation_apres_litige,
    montant_du,
    premier_versement_apres_correction,
    progression_pour_cent,
    suspendu,
    vendredi_de_versement,
)

P = lire_versements(charger_registre())
Y = ZoneInfo("Africa/Douala")


def t(mois, jour, heure=0, minute=0, seconde=0):
    return datetime(2026, mois, jour, heure, minute, seconde, tzinfo=Y)


def test_parametres():
    assert (P.fenetre_retour_jours, P.lib_standard_jours, P.lib_or_jours, P.lib_carte_jours) == (7, 3, 1, 14)
    assert (P.jour_versement, P.heure_versement.hour, P.jour_arrete) == (4, 12, 3)
    assert (P.heure_arrete.hour, P.heure_arrete.minute) == (23, 59)
    assert (P.essais, P.intervalle_essais_heures, P.revue_numero_jours, P.reprise_demande_jours) == (3, 24, 7, 30)


def test_fermeture_du_retour():
    """Q-58 : min(« Tout est en ordre » ; retrait + 7 j) ; sans confirmation, le retrait + 7 j."""
    assert fermeture_du_retour(t(9, 17, 10), t(9, 18, 18), P) == t(9, 18, 18)
    assert fermeture_du_retour(t(9, 17, 10), None, P) == t(9, 24, 10)
    assert fermeture_du_retour(t(9, 10, 10), t(9, 18, 18), P) == t(9, 17, 10)


@pytest.mark.parametrize(
    "palier, carte, liberee",
    [
        (Palier.BRONZE, False, t(9, 21, 18)),  # BLV-00007 : confirmée ven. 18 à 18 h, libérée lun. 21 à 18 h
        (Palier.ARGENT, False, t(9, 21, 18)),
        (Palier.OR, False, t(9, 19, 18)),
        (Palier.PLATINE, False, t(9, 19, 18)),
        (Palier.PLATINE, True, t(10, 2, 18)),  # carte : 14 jours quel que soit le palier (DP-23)
        (Palier.BRONZE, True, t(10, 2, 18)),
    ],
)
def test_date_de_liberation(palier, carte, liberee):
    assert date_de_liberation(t(9, 18, 18), palier, carte, P) == liberee


def test_progression_de_blv_00007():
    """63 h 48 écoulées sur 72 h : 89 % ; 0 % avant la fermeture, 100 % après la libération."""
    assert progression_pour_cent(t(9, 18, 18), t(9, 21, 18), t(9, 21, 9, 48)) == 89
    assert progression_pour_cent(t(9, 18, 18), t(9, 21, 18), t(9, 18, 12)) == 0
    assert progression_pour_cent(t(9, 18, 18), t(9, 21, 18), t(9, 22, 9)) == 100


def test_liberation_apres_un_litige_gagne():
    """Q-60 : max(date prévue ; fin du litige)."""
    assert liberation_apres_litige(t(9, 21, 18), t(9, 24, 10)) == t(9, 24, 10)  # date passée : aussitôt
    assert liberation_apres_litige(t(9, 28, 18), t(9, 24, 10)) == t(9, 28, 18)  # sinon la date prévue


@pytest.mark.parametrize(
    "liberation, vendredi",
    [
        (t(9, 21, 18), date(2026, 9, 25)),  # lundi : vendredi de la même semaine
        (t(9, 24, 23, 59, 59), date(2026, 9, 25)),  # jeudi 23 h 59 : la minute est comprise
        (t(9, 25, 0, 0), date(2026, 10, 2)),  # vendredi 0 h : après l'arrêté
        (t(9, 25, 10), date(2026, 10, 2)),  # Q-59 : libéré vendredi 25 à 10 h ⇒ versé vendredi 2 oct.
        (t(9, 26, 9), date(2026, 10, 2)),  # samedi
        (t(9, 27, 9), date(2026, 10, 2)),  # dimanche
        # Q-65 : heure de Yaoundé ; jeudi 23 h 30 UTC = vendredi 0 h 30 à Douala.
        (datetime(2026, 9, 24, 23, 30, tzinfo=UTC), date(2026, 10, 2)),
        (datetime(2026, 9, 24, 22, 30, tzinfo=UTC), date(2026, 9, 25)),
    ],
)
def test_vendredi_de_versement(liberation, vendredi):
    assert vendredi_de_versement(liberation, P) == vendredi


def test_vendredi_ferie_maintenu_et_heure_limite():
    """Q-13 : Mobile Money fonctionne les jours fériés ; le moteur ne connaît pas de calendrier de fériés."""
    assert heure_limite(date(2026, 12, 25), P) == datetime(2026, 12, 25, 12, tzinfo=Y)  # Noël, un vendredi
    assert vendredi_de_versement(t(12, 21, 9), P) == date(2026, 12, 25)


def test_heure_sans_fuseau_refusee():
    with pytest.raises(ValueError, match="Yaoundé"):
        vendredi_de_versement(datetime(2026, 9, 24, 10), P)  # noqa: DTZ001


def test_montant_du_jeu_d_essai():
    """« Passe à » 35 680 F vendredi 25 (ARG-06) : BLV-00003 à verser et BLV-00007 qui se libère lundi à 18 h ;
    BLV-00008 en cours et les litiges gelés ne partent pas ; rien de versé deux fois ; sans minimum (Q-12)."""
    gains = [
        Gain("BLV-00001", 17_840, t(9, 10, 9), verse=True),
        Gain("BLV-00003", 17_840, t(9, 19, 11)),
        Gain("BLV-00007", 17_840, t(9, 21, 18)),
        Gain("BLV-00008", 17_840, None),  # en cours : pas encore retirée
        Gain("BLV-00005", 335_324, None),  # gelé : litige
        Gain("BLV-00010", 600, t(9, 24, 21)),  # 600 F libérés jeudi soir : partent vendredi
        Gain("BLV-00011", 17_840, t(9, 25, 10)),  # libérée vendredi : vendredi suivant
    ]
    assert montant_du(date(2026, 9, 25), gains, P) == 17_840 * 2 + 600
    assert montant_du(date(2026, 10, 2), gains, P) == 17_840 * 3 + 600  # cumul si le 25 n'est pas parti


def test_refus_et_suspension():
    """F7, Q-13 : refusé vendredi 25 ; essais samedi 26, dimanche 27, lundi 28 ; puis suspendu."""
    assert essais_apres_refus(t(9, 25, 10), P) == (t(9, 26, 10), t(9, 27, 10), t(9, 28, 10))
    assert not suspendu(3, P)
    assert suspendu(4, P)


def test_reprise_apres_correction_et_revue_du_numero():
    """Q-19 : numéro changé lundi 21 sept., revue jusqu'au lundi 28, versement vendredi 2 oct. (pas le 25).
    Q-13 : numéro corrigé mardi 29 sept., revue jusqu'au mardi 6 oct., tout part vendredi 9 oct."""
    assert fin_de_revue(t(9, 21, 9), P) == t(9, 28, 9)
    assert premier_versement_apres_correction(t(9, 21, 9), True, P) == date(2026, 10, 2)
    assert premier_versement_apres_correction(t(9, 29, 10), True, P) == date(2026, 10, 9)
    # Compte plein vidé par le vendeur, sans changement de numéro : vendredi suivant.
    assert premier_versement_apres_correction(t(9, 29, 10), False, P) == date(2026, 10, 2)


def test_reprise_d_un_montant_deja_libere():
    """Q-11 : reprise de 17 840 F, 10 000 F dus : 0 F versé, 7 840 F reportés ; au-delà de 30 jours, demande
    Mobile Money pour le reste."""
    n = appliquer_reprise(10_000, 17_840, date(2026, 9, 20), date(2026, 9, 25), P)
    assert (n.verse, n.repris, n.reprise_reportee, n.demande_mobile_money) == (0, 10_000, 7_840, False)
    n = appliquer_reprise(30_000, 7_840, date(2026, 9, 20), date(2026, 10, 2), P)
    assert (n.verse, n.repris, n.reprise_reportee, n.demande_mobile_money) == (22_160, 7_840, 0, False)
    assert appliquer_reprise(0, 7_840, date(2026, 9, 20), date(2026, 10, 23), P).demande_mobile_money
    assert not appliquer_reprise(0, 7_840, date(2026, 9, 20), date(2026, 10, 20), P).demande_mobile_money
    assert appliquer_reprise(5_000, 0, None, date(2026, 10, 2), P).verse == 5_000
    with pytest.raises(ValueError):
        appliquer_reprise(-1, 0, None, date(2026, 10, 2), P)


def test_cadeaux_groupes_commandes_normales():
    """Q-15 : deux cadeaux payés à 10 jours d'écart ; chacun se libère à sa propre date, sans attendre l'autre."""
    premier = date_de_liberation(fermeture_du_retour(t(9, 14, 10), None, P), Palier.BRONZE, False, P)
    second = date_de_liberation(
        fermeture_du_retour(t(9, 14, 10) + timedelta(days=10), None, P), Palier.BRONZE, False, P
    )
    assert (vendredi_de_versement(premier, P), vendredi_de_versement(second, P)) == (
        date(2026, 9, 25),
        date(2026, 10, 9),
    )
