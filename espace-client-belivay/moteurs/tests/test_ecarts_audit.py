"""Écarts moteurs ↔ registre de l'audit vendeur (logique-metier/vendeur/AUDIT-EXHAUSTIVITE.md, partie 2), corrigés
selon DP-55, DP-56 et DP-57 (option 1 recommandée pour A-2 à A-8 et L-1 à L-4). Un bloc par écart : C3 à C9, V1 à
V3, P1 à P4, D1, L1, L2."""

from datetime import date, datetime, timedelta
from decimal import Decimal
from fractions import Fraction
from zoneinfo import ZoneInfo

import pytest

from belivay_moteurs.argent import francs
from belivay_moteurs.argent_vendeur import EtatArgent, date_de_versement, etat_de_l_argent, resume
from belivay_moteurs.commission import (
    Facturation,
    Famille,
    LigneVendue,
    PlanVendeur,
    VenteDuMois,
    calculer_commission,
    commission_article,
    message_commission_minimale,
    plages_commission_minimale,
    prix_minimum_publiable,
    remise_de_plan,
    restitution_de_remise,
    seuil_commission_minimale,
    simuler_plans,
    verifier_publication,
)
from belivay_moteurs.demarrage import (
    Incident,
    livrees_sans_incident,
    plafond_de_demarrage,
    quantite_attribuable,
    verifier_prix_demarrage,
)
from belivay_moteurs.erreurs import OffreRefusee, ParametreIllisible, VenteInvalide
from belivay_moteurs.etats import VERSEMENT, TransitionRefusee
from belivay_moteurs.frais import Article, Classe, Mode, Panier, SousCommande, calculer
from belivay_moteurs.litiges import (
    PartieEnTort,
    du_du_vendeur,
    fin_du_gel,
    liberation,
    rembourser_retour,
)
from belivay_moteurs.paliers import (
    Alerte,
    EtatDuJour,
    Palier,
    alerte_a_envoyer,
    alerte_de_seuil,
    evolution,
    palier_atteint,
)
from belivay_moteurs.plans import (
    fin_de_grace,
    fin_essai,
    plafond_de_remise,
    plan_apres_echec,
    plan_apres_essai,
    prix_annuel,
    prix_du_mois,
    rappel_essai,
    tva_du_plan,
)
from belivay_moteurs.registre import (
    charger_registre,
    lire_commission,
    lire_litiges,
    lire_livraison,
    lire_paliers,
    lire_sanctions,
    lire_versements,
)
from belivay_moteurs.sanctions import (
    Niveau,
    controle_renforce,
    fin_suspension_au_plus_tard,
    fin_visibilite_reduite,
    frequence_de_controle,
    probation_finie,
    suspension_proposee,
    validation_humaine,
)
from belivay_moteurs.versements import (
    EtatReprise,
    Gain,
    MotifGel,
    appliquer_reprise,
    date_de_liberation,
    echeance_motif_antifraude,
    liberation_apres_litige,
    montant_du,
    motif_antifraude_en_retard,
    reference_de_versement,
    suivi_reprise,
    vendredi_de_versement,
)

REGISTRE = charger_registre()
PC = lire_commission(REGISTRE)
PV = lire_versements(REGISTRE)
PP = lire_paliers(REGISTRE)
PS = lire_sanctions(REGISTRE)
PLT = lire_litiges(REGISTRE)
PL = lire_livraison(REGISTRE)
A, B, C, D, E = Famille
Y = ZoneInfo("Africa/Douala")


def t(mois, jour, heure=0, minute=0):
    return datetime(2026, mois, jour, heure, minute, tzinfo=Y)


def avec(**modifs):
    r = dict(REGISTRE)
    r.update(modifs)
    return r


def itel(decouverte=True, palier=Palier.BRONZE):
    return calculer_commission((LigneVendue(A, 20_000),), palier, decouverte, PC)


# ── Paramètres créés par DP-57 ──────────────────────────────────────────────────────────────────────────


def test_parametres_dp_57():
    assert (PC.annuel_mois_payes, PC.essai_mois, PC.essai_rappel_jours, PC.grace_jours) == (10, 1, 3, 7)
    assert (PV.gel_motif_heures, PV.recouvrement_jours) == (48, 90)
    assert (PP.alerte_ecart_points, PP.alerte_frequence_jours) == (3, 7)
    assert (PS.visibilite_jours, PS.suspension_sous_score, PS.non_preparations, PS.non_preparations_jours) == (
        14,
        40,
        3,
        30,
    )
    assert (PS.suspension_max_jours, PS.probatoire_commandes, PS.renforce_sous_score, PS.renforce_baisse_points) == (
        30,
        20,
        60,
        8,
    )
    assert (PS.controle_premieres, PS.controle_sous_seuil, PS.controle_seuil_score, PS.controle_ensuite) == (
        5,
        20,
        70,
        100,
    )


@pytest.mark.parametrize(
    "lecture, code, valeur, motif",
    [
        (lire_commission, "VD-PLAN-ANNUEL", "12 mois payés", "VD-PLAN-ANNUEL"),
        (lire_commission, "VD-PLAN-ESSAI", "14 jours offerts", "VD-PLAN-ESSAI"),
        (lire_commission, "VD-PLAN-GRACE", "aucune", "VD-PLAN-GRACE"),
        (lire_commission, "VD-PLAN-TVA", "prix du plan toutes taxes comprises", "audit C5"),
        (lire_versements, "VD-GEL-ANTIFRAUDE", "motif écrit sous 2 jours", "VD-GEL-ANTIFRAUDE"),
        (lire_versements, "VD-REPRISE-IMPAYEE", "BelivaY absorbe la perte", "VD-REPRISE-IMPAYEE"),
        (lire_paliers, "VD-ALERTE-SEUIL", "à 3 points du seuil moins 5", "VD-ALERTE-SEUIL"),
        (lire_sanctions, "VD-SAN-VISIBILITE", "deux semaines", "VD-SAN-VISIBILITE"),
        (lire_sanctions, "VD-SAN-SUSPENSION", "au cas par cas", "VD-SAN-SUSPENSION"),
        (lire_sanctions, "VD-PROBATOIRE", "un mois", "VD-PROBATOIRE"),
        (lire_sanctions, "VD-CTRL-RENFORCE", "jamais", "VD-CTRL-RENFORCE"),
        (lire_sanctions, "CTRL-RAMASSAGE", "1 sur 10", "CTRL-RAMASSAGE"),
    ],
)
def test_parametres_dp_57_illisibles(lecture, code, valeur, motif):
    with pytest.raises(ParametreIllisible, match=motif):
        lecture(avec(**{code: valeur}))


# ── C3 · A-4 : les 3 points « sous 5 000 F » gardés, le message dit la plage exacte ─────────────────────


def _plages_par_balayage(famille, palier, decouverte, jusqu_a):
    """Contrôle indépendant : chaque prix publiable, un par un, avec le calcul complet de la sous-commande."""
    plages = []
    for prix in range(prix_minimum_publiable(famille, False, PC), jusqu_a):
        if calculer_commission((LigneVendue(famille, prix),), palier, decouverte, PC).plancher_applique:
            if plages and plages[-1][1] == prix - 1:
                plages[-1] = (plages[-1][0], prix)
            else:
                plages.append((prix, prix))
    return tuple(plages)


@pytest.mark.parametrize(
    "famille, palier, decouverte, plages",
    [
        (A, Palier.BRONZE, False, ((700, 4_239), (5_000, 5_181))),  # 4 240 × 16,5 % = 699,60 → 700 F
        (A, Palier.ARGENT, False, ((700, 4_987), (5_000, 6_095))),
        (A, Palier.BRONZE, True, ((700, 6_476),)),  # contiguës : une seule plage
        (B, Palier.BRONZE, False, ((700, 2_639),)),  # mode : 2 640 F (Q-55)
        (B, Palier.OR, True, ((700, 4_713), (5_000, 5_315))),
        (D, Palier.ARGENT, False, ((700, 4_571), (5_000, 5_486))),
        (E, Palier.BRONZE, False, ((700, 4_512), (5_000, 5_595))),
    ],
)
def test_plages_de_la_commission_minimale(famille, palier, decouverte, plages):
    assert plages_commission_minimale(famille, palier, decouverte, False, PC) == plages
    assert _plages_par_balayage(famille, palier, decouverte, plages[-1][1] + 50) == plages
    assert seuil_commission_minimale(famille, palier, decouverte, False, PC) == plages[-1][1] + 1


def test_la_regle_des_3_points_est_gardee():
    """A-4 : 4 999 F paient plus que 5 000 F (électronique, Bronze) ; aucune vente sous le plancher."""
    assert calculer_commission((LigneVendue(A, 4_999),), Palier.BRONZE, False, PC).commission == 825
    assert calculer_commission((LigneVendue(A, 5_000),), Palier.BRONZE, False, PC).commission == 700
    assert francs(commission_article(LigneVendue(A, 4_240), PC)) == 700


def test_message_de_la_commission_minimale():
    assert message_commission_minimale(A, Palier.BRONZE, False, False, PC) == (
        "De 700 F à 4 239 F et de 5 000 F à 5 181 F, la commission minimale de 700 F s’applique."
    )
    assert message_commission_minimale(B, Palier.BRONZE, False, False, PC) == (
        "Sous 2 640 F, la commission minimale de 700 F s’applique."
    )
    # Plancher de 1 F : il ne s'applique à aucun prix publiable, rien n'est écrit.
    p = lire_commission(avec(**{"VD-COM-MIN": "1 F par sous-commande"}))
    assert plages_commission_minimale(A, Palier.BRONZE, False, False, p) == ()
    assert message_commission_minimale(A, Palier.BRONZE, False, False, p) is None


# ── C4 · restitution de la remise de plan sur remboursement ─────────────────────────────────────────────


def test_remise_recalculee_apres_remboursement_total():
    """PLN-01, REFVD-R54 : Pro, 3 ITEL en découverte, 648 F rendus ; une ITEL remboursée en totalité : la remise
    tombe à 432 F, 216 F sont restitués."""
    ventes = [itel(), itel(), itel()]
    assert remise_de_plan(PlanVendeur.PRO, ventes, PC).remise == 648
    apres = [VenteDuMois(ventes[0], 20_000), ventes[1], ventes[2]]
    r = remise_de_plan(PlanVendeur.PRO, apres, PC)
    assert (r.commission_du_mois, r.remise) == (4_320, 432)
    assert restitution_de_remise(648, PlanVendeur.PRO, apres, PC) == 216
    assert restitution_de_remise(400, PlanVendeur.PRO, apres, PC) == 0  # jamais négative
    assert restitution_de_remise(0, PlanVendeur.FREE, apres, PC) == 0
    with pytest.raises(VenteInvalide):
        restitution_de_remise(-1, PlanVendeur.PRO, apres, PC)


def test_remise_apres_remboursement_partiel():
    """Remboursement partiel : commission au prorata sans plancher (VD-COM-MIN-REMB) ; la part au-dessus des
    planchers suit le prorata, arrondie à l'inférieur : la remise ne dépasse jamais la commission perçue."""
    deux = calculer_commission((LigneVendue(A, 20_000, 2),), Palier.BRONZE, True, PC)  # 4 320 F, marge 3 620 F
    r = remise_de_plan(PlanVendeur.PRO, [VenteDuMois(deux, 20_000)], PC)
    assert (r.commission_du_mois, r.remise) == (2_160, 216)
    petite = calculer_commission((LigneVendue(B, 1_000, 2),), Palier.BRONZE, False, PC)  # plancher : marge 0 F
    assert (petite.commission, petite.marge_sur_plancher) == (700, 0)
    r = remise_de_plan(PlanVendeur.PRO, [VenteDuMois(petite, 1_000)], PC)
    assert (r.commission_du_mois, r.remise) == (350, 0)


# ── C5 · TVA et remise de plan ──────────────────────────────────────────────────────────────────────────


def test_tva_du_plan_et_tva_rendue():
    """VD-PLAN-TVA (à valider par le comptable) : 0 % au lancement, aucun effet ; à 19,25 %, la remise rend sa TVA
    et le prix du plan porte la sienne."""
    ventes = [itel(), itel(), itel()]
    r = remise_de_plan(PlanVendeur.BOOST, ventes, PC)
    assert (r.tva_rendue, r.tva_du_plan) == (0, 0)
    p = lire_commission(avec(**{"VD-TVA": "19,25 % de la commission ; nouveau taux annoncé 30 jours avant"}))
    v = [calculer_commission((LigneVendue(A, 20_000),), Palier.BRONZE, True, p) for _ in range(3)]
    assert v[0].tva == 416  # 2 160 × 19,25 % = 415,8
    r = remise_de_plan(PlanVendeur.BOOST, v, p)
    assert (r.remise, r.tva_rendue, r.prix_du_plan, r.tva_du_plan) == (324, 62, 2_500, 481)
    assert tva_du_plan(7_500, p) == 1_444
    s = simuler_plans(v, p)
    garde_free = sum(x.garde for x in v)
    assert s.gardes[PlanVendeur.BOOST] == garde_free + 324 + 62 - 2_500 - 481


# ── C6 · PRX-09 : refus à la publication au-dessus du plafond de démarrage ─────────────────────────────


def test_prix_au_dessus_du_plafond_de_demarrage_refuse_brouillon_garde():
    with pytest.raises(OffreRefusee, match="brouillon gardé"):
        verifier_publication(500_001, A, False, PC, sans_incident=9, pp=PP)
    verifier_publication(500_000, A, False, PC, sans_incident=0, pp=PP)  # tout juste : publiable
    verifier_publication(900_000, A, False, PC, sans_incident=10, pp=PP)  # plafond levé
    verifier_publication(900_000, A, False, PC)  # sans compteur : seul le prix minimum est contrôlé
    with pytest.raises(ValueError, match="compteur"):
        verifier_publication(900_000, A, False, PC, sans_incident=3)
    cap = plafond_de_demarrage(4, PP)
    assert (cap.amount, cap.delivered_ok, cap.needed, cap.actif) == (500_000, 4, 10, True)
    assert not plafond_de_demarrage(10, PP).actif
    with pytest.raises(VenteInvalide):
        plafond_de_demarrage(-1, PP)
    with pytest.raises(OffreRefusee, match="4 sur 10"):
        verifier_prix_demarrage(650_000, 4, PP)


# ── C9 · A-2, A-3 : essai d'un mois, plan annuel, grâce ─────────────────────────────────────────────────


def test_plan_annuel_plafond_prix_annuel_divise_par_12():
    """A-3 : 10 mois payés pour 12 ; plafond mensuel 2 083 F (Boost), 6 250 F (Pro)."""
    assert (prix_annuel(PlanVendeur.BOOST, PC), prix_annuel(PlanVendeur.PRO, PC)) == (25_000, 75_000)
    assert plafond_de_remise(PlanVendeur.BOOST, Facturation.ANNUELLE, PC) == 2_083
    assert plafond_de_remise(PlanVendeur.PRO, Facturation.ANNUELLE, PC) == 6_250
    assert plafond_de_remise(PlanVendeur.BOOST, Facturation.MENSUELLE, PC) == 2_500
    assert plafond_de_remise(PlanVendeur.FREE, Facturation.MENSUELLE, PC) == 0
    assert prix_du_mois(PlanVendeur.BOOST, Facturation.ANNUELLE, PC) == 2_083
    # Pro à l'année, beaucoup de ventes : la remise s'arrête à 6 250 F, pas 7 500 F.
    grosses = [calculer_commission((LigneVendue(B, 60_000),), Palier.BRONZE, False, PC) for _ in range(10)]
    assert remise_de_plan(PlanVendeur.PRO, grosses, PC, Facturation.ANNUELLE).remise == 6_250
    assert remise_de_plan(PlanVendeur.PRO, grosses, PC).remise == 7_500
    s = simuler_plans([itel(), itel(), itel()], PC, Facturation.ANNUELLE)
    assert s.gardes == {PlanVendeur.FREE: 53_520, PlanVendeur.BOOST: 51_761, PlanVendeur.PRO: 47_918}


def test_essai_d_un_mois():
    """A-2 : un mois offert ; rappel 3 jours avant ; sans premier paiement confirmé, Free sans rien perdre ; la
    remise reste plafonnée au prix mensuel du plan, rien n'est payé."""
    assert fin_essai(date(2026, 10, 6), PC) == date(2026, 11, 6)
    assert fin_essai(date(2027, 1, 31), PC) == date(2027, 2, 28)
    assert rappel_essai(date(2026, 10, 6), PC) == date(2026, 11, 3)
    debut = date(2026, 10, 6)
    assert plan_apres_essai(PlanVendeur.PRO, debut, date(2026, 11, 5), False, PC) is PlanVendeur.PRO
    assert plan_apres_essai(PlanVendeur.PRO, debut, date(2026, 11, 6), False, PC) is PlanVendeur.FREE
    assert plan_apres_essai(PlanVendeur.PRO, debut, date(2026, 11, 6), True, PC) is PlanVendeur.PRO
    r = remise_de_plan(PlanVendeur.BOOST, [itel(), itel(), itel()], PC, Facturation.ESSAI)
    assert (r.remise, r.prix_du_plan, r.plafond) == (324, 0, 2_500)


def test_grace_de_7_jours():
    assert fin_de_grace(date(2026, 10, 6), PC) == date(2026, 10, 13)
    assert plan_apres_echec(PlanVendeur.BOOST, date(2026, 10, 6), date(2026, 10, 13), False, PC) is PlanVendeur.BOOST
    assert plan_apres_echec(PlanVendeur.BOOST, date(2026, 10, 6), date(2026, 10, 14), False, PC) is PlanVendeur.FREE
    assert plan_apres_echec(PlanVendeur.BOOST, date(2026, 10, 6), date(2026, 10, 14), True, PC) is PlanVendeur.BOOST


# ── V1 · les cinq états de l'argent, gel immédiat, gel anti-fraude ──────────────────────────────────────


MAINTENANT = t(9, 21, 9, 48)  # lundi 21 septembre, 09 h 48 (jeu d'essai VD-09)
GAINS = (
    Gain("BLV-00008", 17_840, None),  # en cours
    Gain("BLV-00007", 17_840, t(9, 21, 18)),  # se libère ce soir
    Gain("BLV-00005", 335_324, t(9, 20, 18), gel=MotifGel.LITIGE),  # date passée, mais gelée
    Gain("BLV-00006", 335_324, t(9, 23, 6), gel=MotifGel.RETOUR),  # gelée pendant le compte à rebours
    Gain("BLV-00004", 17_840, None, gel=MotifGel.VERIFICATION),
    Gain("BLV-00003", 17_840, t(9, 19, 11)),  # à verser
    Gain("BLV-00001", 35_680, t(9, 10, 9), verse=True),
)


def test_cinq_etats_et_en_circulation():
    """VD09-R04, ARG-01 : En cours 17 840 · Se libère 17 840 · Gelé 688 488 · À verser 17 840 · Versé 35 680 ;
    En circulation = somme des quatre = 742 008 F ; frozen.checks{17 840 F, 1} (Q-64)."""
    etats = [etat_de_l_argent(g, MAINTENANT) for g in GAINS]
    assert etats == [
        EtatArgent.EN_COURS,
        EtatArgent.SE_LIBERE,
        EtatArgent.GELE,
        EtatArgent.GELE,
        EtatArgent.GELE,
        EtatArgent.A_VERSER,
        EtatArgent.VERSE,
    ]
    r = resume(GAINS, MAINTENANT)
    assert (r.en_cours, r.se_libere, r.gele, r.a_verser, r.verse) == (17_840, 17_840, 688_488, 17_840, 35_680)
    assert r.en_circulation == 742_008
    assert (r.verifications.amount, r.verifications.count) == (17_840, 1)


def test_jamais_de_date_de_versement_sur_de_l_argent_gele():
    """GEL-01, LIB-02 : le gel prime sur le compte à rebours ; une somme gelée ne part pas le vendredi."""
    dates = [date_de_versement(g, MAINTENANT, PV) for g in GAINS]
    assert dates == [None, date(2026, 9, 25), None, None, None, date(2026, 9, 25), None]
    assert montant_du(date(2026, 9, 25), GAINS, PV) == 17_840 * 2
    with pytest.raises(ValueError, match="Yaoundé"):
        etat_de_l_argent(GAINS[0], datetime(2026, 9, 21, 9, 48))  # noqa: DTZ001


def test_gel_anti_fraude_motif_sous_48_h():
    """GEL-02, Q-64 : motif écrit au plus tard 48 h après le gel ; le gel lui-même n'a pas d'échéance."""
    assert echeance_motif_antifraude(t(9, 21, 10), PV) == t(9, 23, 10)
    assert not motif_antifraude_en_retard(t(9, 21, 10), t(9, 23, 10), t(9, 30), PV)
    assert motif_antifraude_en_retard(t(9, 21, 10), t(9, 23, 11), t(9, 30), PV)
    assert not motif_antifraude_en_retard(t(9, 21, 10), None, t(9, 22), PV)
    assert motif_antifraude_en_retard(t(9, 21, 10), None, t(9, 23, 10, 1), PV)


# ── V2 · référence BLV-VS et machine du versement ───────────────────────────────────────────────────────


def test_reference_de_versement():
    assert reference_de_versement(4092) == "BLV-VS-4092"
    assert reference_de_versement(7) == "BLV-VS-0007"
    for mauvais in (0, True, "4092"):
        with pytest.raises(ValueError):
            reference_de_versement(mauvais)


def test_machine_du_versement_refus_essais_suspension():
    """VER-04 : refused → retry ×3 → suspended ; reprise après correction ; jamais pendant la revue du numéro."""
    e = VERSEMENT.appliquer("—", "payout.closing").vers
    assert VERSEMENT.appliquer(e, "payout.friday", {"revue_du_numero": True}).vers == "reporte"
    e = VERSEMENT.appliquer(e, "payout.friday").vers
    e = VERSEMENT.appliquer(e, "operator.refused").vers
    assert VERSEMENT.appliquer(e, "payout.retry").vers == "envoye"
    e = VERSEMENT.appliquer(e, "payout.retry", {"essais_epuises": True}).vers
    assert e == "suspendu"
    assert VERSEMENT.appliquer(e, "number.corrected").vers == "prevu"
    with pytest.raises(TransitionRefusee):
        VERSEMENT.appliquer("credite", "operator.refused")


# ── V3 · une seule source pour la libération ────────────────────────────────────────────────────────────


def test_une_seule_regle_de_liberation():
    """litiges.liberation appelle versements.date_de_liberation et vendredi_de_versement : mêmes résultats en
    jours civils et en heures."""
    for palier in Palier:
        for carte in (False, True):
            jour, vendredi = liberation(date(2026, 9, 18), palier, carte, False, PLT)
            heure = date_de_liberation(t(9, 18, 18), palier, carte, PV)
            assert (jour, vendredi) == (heure.date(), vendredi_de_versement(heure, PV))
            assert date_de_liberation(date(2026, 9, 18), palier, carte, PLT) == jour
    assert PLT.versements == PV


def test_codes_client_et_vendeur_doivent_concorder():
    with pytest.raises(ParametreIllisible, match="concorder"):
        lire_litiges(avec(**{"LIB-OR": "2 j"}))
    with pytest.raises(ParametreIllisible, match="concorder"):
        lire_litiges(avec(**{"VD-LIB-CARTE": "10 jours après la fermeture du retour"}))


# ── P1 · A-5 : descente sous le seuil, alerte corrigée ──────────────────────────────────────────────────


def _historique(jours, score, livrees=12, note="4.2"):
    fin = date(2026, 9, 21)
    return [
        EtatDuJour(fin - timedelta(days=jours - 1 - i), Decimal(score), livrees, Decimal(note)) for i in range(jours)
    ]


def test_descente_sous_le_seuil_et_non_sous_le_seuil_moins_5():
    """Argent à 62 pendant 14 jours : descente proposée vers Bronze (VD-10 « seuil − 5 » ne proposait rien)."""
    assert evolution(Palier.ARGENT, _historique(14, "62"), PP).descente_proposee is Palier.BRONZE
    assert evolution(Palier.ARGENT, _historique(14, "65"), PP).descente_proposee is None


@pytest.mark.parametrize(
    "actuel, score, alerte",
    [
        (Palier.BRONZE, "62.7", Alerte("montée", Palier.ARGENT, 65, 2)),  # ACC-25 : « Plus que 2 points » (65 − 63)
        (Palier.BRONZE, "62", Alerte("montée", Palier.ARGENT, 65, 3)),
        (Palier.BRONZE, "61.9", None),
        (Palier.BRONZE, "65", None),  # seuil atteint : plus d'alerte de montée
        (Palier.ARGENT, "66", Alerte("descente", Palier.ARGENT, 65, 1)),  # seuil du palier, pas 60
        (Palier.ARGENT, "65", Alerte("descente", Palier.ARGENT, 65, 0)),
        (Palier.ARGENT, "68", Alerte("descente", Palier.ARGENT, 65, 3)),
        (Palier.ARGENT, "68.1", None),
        (Palier.ARGENT, "64.9", None),  # déjà sous le seuil : c'est le compte des 14 jours
        (Palier.ARGENT, "61", None),  # l'ancien « seuil − 5 » (60) n'alerte plus
        (Palier.ARGENT, "78", Alerte("montée", Palier.OR, 80, 2)),
        (Palier.OR, "82.4", Alerte("descente", Palier.OR, 80, 2)),
        (Palier.PLATINE, "92", Alerte("descente", Palier.PLATINE, 90, 2)),
        (Palier.PLATINE, "99", None),
    ],
)
def test_alerte_de_seuil(actuel, score, alerte):
    assert alerte_de_seuil(actuel, Decimal(score), PP) == alerte


def test_alerte_une_fois_par_seuil_et_par_semaine():
    a = alerte_de_seuil(Palier.BRONZE, Decimal("62.7"), PP)
    assert alerte_a_envoyer(a, None, date(2026, 9, 21), PP)
    assert not alerte_a_envoyer(a, date(2026, 9, 15), date(2026, 9, 21), PP)
    assert alerte_a_envoyer(a, date(2026, 9, 14), date(2026, 9, 21), PP)
    assert not alerte_a_envoyer(None, None, date(2026, 9, 21), PP)


# ── P2 · A-6 : Platine demande aussi les conditions d'Or ────────────────────────────────────────────────


def test_platine_demande_les_conditions_d_or():
    sans_or = EtatDuJour(date(2026, 9, 21), Decimal(91), 0, Decimal("4.8"), audit=True)
    assert palier_atteint(sans_or, PP) is Palier.BRONZE
    complet = EtatDuJour(date(2026, 9, 21), Decimal(91), 50, Decimal("4.3"), visite=True, audit=True)
    assert palier_atteint(complet, PP) is Palier.PLATINE


# ── P3, P4 · L-1 : sanctions, suspension, contrôle au ramassage ─────────────────────────────────────────


def test_niveaux_et_durees_l_1():
    assert not validation_humaine(Niveau.AVERTISSEMENT)
    assert all(validation_humaine(n) for n in (Niveau.VISIBILITE_REDUITE, Niveau.SUSPENSION, Niveau.EXCLUSION))
    assert fin_visibilite_reduite(t(9, 18, 10, 12), PS) == t(10, 2, 10, 12)
    assert fin_suspension_au_plus_tard(t(9, 18, 10, 12), PS) == t(10, 18, 10, 12)
    assert not probation_finie(19, PS) and probation_finie(20, PS)


def test_suspension_proposee():
    """Q-31 : sous 40, ou 3 non-préparations en 30 jours glissants."""
    assert suspension_proposee(Decimal("39.9"), [], t(9, 21), PS)
    assert not suspension_proposee(Decimal(40), [], t(9, 21), PS)
    trois = [t(8, 23, 10), t(9, 5), t(9, 20)]
    assert suspension_proposee(Decimal(70), trois, t(9, 21), PS)
    assert not suspension_proposee(Decimal(70), trois, t(9, 22, 11), PS)  # la première sort de la fenêtre


def test_controle_au_ramassage():
    """CTRL-RAMASSAGE, SAN-03, L-1 : Tonton PG (62,7 ; 7 commandes) : 1 sur 20 ; dès 70 : 1 sur 100."""
    assert frequence_de_controle(4, Decimal(95), PS) == 1
    assert frequence_de_controle(7, Decimal("62.7"), PS) == Fraction(1, 20)
    assert frequence_de_controle(7, Decimal(70), PS) == Fraction(1, 100)
    assert frequence_de_controle(300, Decimal(95), PS, en_probation=True) == 1
    assert frequence_de_controle(300, Decimal(95), PS, renforce=True) == 1
    with pytest.raises(ValueError):
        frequence_de_controle(-1, Decimal(95), PS)


def test_controle_renforce():
    assert controle_renforce(Decimal("59.9"), None, PS)
    assert not controle_renforce(Decimal(60), None, PS)
    assert controle_renforce(Decimal(72), Decimal(80), PS)  # 8 points perdus en une semaine
    assert not controle_renforce(Decimal("72.1"), Decimal(80), PS)


# ── D1 · A-7 : compteur du plafond de démarrage au total ────────────────────────────────────────────────


def test_un_incident_ne_remet_pas_le_compteur_a_zero():
    commandes = [()] * 9 + [(Incident.RUPTURE,)] + [()]
    assert livrees_sans_incident(commandes) == 10
    assert quantite_attribuable(300_000, 3, livrees_sans_incident(commandes), PP) == 3


# ── L1 · dû du vendeur en tort ──────────────────────────────────────────────────────────────────────────

BLV_51702 = Panier(
    Mode.RELAIS,
    (
        SousCommande(
            "Or", "Mvog-Ada", (Article("Écouteurs", 16_500, 1, Classe.S), Article("Chargeur 33 W", 6_500, 1, Classe.S))
        ),
    ),
)


def test_du_du_vendeur_en_tort():
    """RET-04, Q-27 : trajet 500 F + livraison 900 F = 1 400 F, sur la commande gelée, sinon reporté comme une
    reprise (Q-11)."""
    off = calculer(BLV_51702, PL).offert
    r = rembourser_retour(23_000, PartieEnTort.VENDEUR, PLT, commande=BLV_51702, boutique="Or", pl=PL, offert=off)
    d = du_du_vendeur(r, 0, PLT)
    assert (d.trajet, d.livraison, d.total, d.pris_sur_la_commande, d.reporte) == (500, 900, 1_400, 0, 1_400)
    net = appliquer_reprise(10_000, d.reporte, date(2026, 9, 24), date(2026, 9, 25), PV)
    assert (net.verse, net.repris) == (8_600, 1_400)  # déduit du vendredi suivant
    d = du_du_vendeur(r, 1_000, PLT)
    assert (d.pris_sur_la_commande, d.reporte) == (1_000, 400)
    assert du_du_vendeur(r, 5_000, PLT).reporte == 0
    client = rembourser_retour(23_000, PartieEnTort.CLIENT, PLT)
    assert du_du_vendeur(client, 0, PLT).total == 0
    transporteur = rembourser_retour(23_000, PartieEnTort.TRANSPORTEUR, PLT)
    assert du_du_vendeur(transporteur, 0, PLT).total == 0
    with pytest.raises(ValueError):
        du_du_vendeur(r, -1, PLT)


# ── L2 · gel pendant le recours ─────────────────────────────────────────────────────────────────────────


def test_gel_pendant_le_recours():
    """Q-26, L-4 : décision sam. 26 à 17 h 15 ; sans recours, gel jusqu'au lun. 28 à 17 h 15 ; recours déposé dans
    le délai : gelé jusqu'à la réponse ; recours hors délai : non reçu."""
    decision = t(9, 26, 17, 15)
    assert fin_du_gel(decision, None, None, PLT) == t(9, 28, 17, 15)
    assert fin_du_gel(decision, t(9, 27, 9), None, PLT) is None
    assert fin_du_gel(decision, t(9, 27, 9), t(9, 29, 11), PLT) == t(9, 29, 11)
    assert fin_du_gel(decision, t(9, 28, 17, 16), None, PLT) == t(9, 28, 17, 15)
    # Libération prévue lun. 21 : partie à la fin du gel, versée le vendredi 2 oct.
    libre = liberation_apres_litige(t(9, 21, 18), fin_du_gel(decision, None, None, PLT))
    assert vendredi_de_versement(libre, PV) == date(2026, 10, 2)


# ── A-8 · reprise jamais payée ──────────────────────────────────────────────────────────────────────────


@pytest.mark.parametrize(
    "jour, etat, bloquees, demande, humaine",
    [
        (date(2026, 10, 20), EtatReprise.DEDUITE, False, False, False),
        (date(2026, 10, 21), EtatReprise.VENTES_BLOQUEES, True, True, False),
        (date(2026, 12, 19), EtatReprise.VENTES_BLOQUEES, True, True, False),
        (date(2026, 12, 20), EtatReprise.RECOUVREMENT, True, True, True),
    ],
)
def test_reprise_jamais_payee(jour, etat, bloquees, demande, humaine):
    s = suivi_reprise(7_840, date(2026, 9, 20), jour, PV)
    assert (s.etat, s.ventes_bloquees, s.demande_mobile_money, s.decision_humaine) == (etat, bloquees, demande, humaine)


def test_reprise_soldee_leve_le_blocage():
    assert suivi_reprise(0, date(2026, 9, 20), date(2027, 1, 1), PV).etat is EtatReprise.SOLDEE
    with pytest.raises(ValueError):
        suivi_reprise(-1, date(2026, 9, 20), date(2026, 9, 21), PV)
