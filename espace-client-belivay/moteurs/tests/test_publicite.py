"""Revenus publicitaires (DP-59) : éligibilité, enchère au clic, anti-fraude, budget, densité, À la une et carrousel,
vente flash à commission majorée, Boost, solde prépayé, facture."""

from decimal import Decimal

import pytest

from belivay_moteurs.commission import Famille, LigneVendue
from belivay_moteurs.erreurs import AnnonceRefusee, OffreRefusee, ParametreIllisible, VenteInvalide
from belivay_moteurs.paliers import Palier
from belivay_moteurs.publicite import (
    DureeBoost,
    Emplacement,
    Enchere,
    LigneFacture,
    Mode,
    Resultat,
    attribuer_emplacements,
    classer,
    clic_facture,
    commission_vente_flash,
    debiter,
    diffusable,
    encheres_au_clic,
    facture_publicitaire,
    motifs_ineligibilite,
    placer_annonces,
    prix_boost,
    recharger,
    remboursement_non_diffuse,
    score_classement,
    verifier_eligibilite,
    verifier_enchere_clic,
    verifier_remise_flash,
)
from belivay_moteurs.registre import charger_registre, lire_commission, lire_publicite

REGISTRE = charger_registre()
P = lire_publicite(REGISTRE)
PC = lire_commission(REGISTRE)


def avec(**modifs):
    r = dict(REGISTRE)
    r.update(modifs)
    return lire_publicite(r)


def test_parametres_du_registre():
    assert (P.trust_min, P.clic_plancher, P.pas_enchere, P.budget_min) == (60, 25, 1, 500)
    assert (P.part_max_pour_cent, P.max_par_fenetre, P.fenetre) == (Decimal(20), 2, 10)
    assert (P.a_la_une.places, P.a_la_une.tarif_semaine, P.a_la_une.enchere_min) == (4, 15_000, 10_000)
    assert (P.carrousel.places, P.carrousel.tarif_semaine, P.carrousel.enchere_min) == (3, 25_000, 20_000)
    assert (P.flash_points, P.flash_remise_min_pour_cent) == (Decimal(3), Decimal(10))
    assert (P.boost_24h, P.boost_7j, P.boost_plafond, P.recharge_min) == (1_000, 5_000, Decimal("1.5"), 1_000)
    assert P.version != "non versionné"


@pytest.mark.parametrize(
    "code, valeur",
    [
        ("VD-PUB-CLIC", "25 F le clic"),
        ("VD-PUB-BOOST", "24 h : 1 000 F · 7 jours : 5 000 F ; classement × 0,9 au plus"),
        (
            "VD-PUB-DENSITE",
            "20 % des positions au plus ; 11 annonces au plus sur 10 résultats ; jamais au-dessus d'une offre moins chère et mieux notée du même produit",
        ),
        (
            "VD-PUB-DENSITE",
            "20 % des positions au plus ; 0 annonces au plus sur 10 résultats ; jamais au-dessus d'une offre moins chère et mieux notée du même produit",
        ),
        ("VD-PUB-A-LA-UNE", "4 places"),
    ],
)
def test_parametres_illisibles(code, valeur):
    with pytest.raises(ParametreIllisible):
        avec(**{code: valeur})


def test_eligibilite():
    assert motifs_ineligibilite(3, 60, 0, P) == ()
    verifier_eligibilite(1, Decimal("72.5"), 0, P)
    assert motifs_ineligibilite(0, 59, 1, P) == ("stock épuisé", "Trust Score sous 60", "litige en cours")
    with pytest.raises(AnnonceRefusee, match="litige en cours"):
        verifier_eligibilite(5, 80, 1, P)


def test_enchere_au_clic_second_prix_plus_un_franc():
    g = encheres_au_clic([Enchere("a", 60), Enchere("b", 40), Enchere("c", 30), Enchere("d", 20)], 2, P)
    assert [(x.campagne, x.cout) for x in g] == [("a", 41), ("b", 31)]
    # Seule au-dessus du plancher : elle paie le plancher ; à égalité : la plus ancienne d'abord, coût = son enchère.
    assert encheres_au_clic([Enchere("a", 80), Enchere("x", 10)], 3, P)[0].cout == 25
    g = encheres_au_clic([Enchere("n", 50, ordre=2), Enchere("v", 50, ordre=1)], 2, P)
    assert [(x.campagne, x.cout) for x in g] == [("v", 50), ("n", 25)]
    # Le coût n'est jamais au-dessus de l'enchère, même quand la suivante est au plancher.
    assert encheres_au_clic([Enchere("a", 25), Enchere("b", 25)], 1, P)[0].cout == 25
    with pytest.raises(AnnonceRefusee):
        encheres_au_clic([Enchere("a", True)], 1, P)


def test_enchere_et_budget_verifies():
    verifier_enchere_clic(30, 500, P)
    with pytest.raises(AnnonceRefusee, match="au moins 25"):
        verifier_enchere_clic(24, 500, P)
    with pytest.raises(AnnonceRefusee, match="VD-PUB-BUDGET"):
        verifier_enchere_clic(30, 499, P)
    with pytest.raises(AnnonceRefusee, match="VD-PUB-BUDGET"):
        verifier_enchere_clic(800, 600, P)


def test_clic_facture_une_fois_par_jour_et_dans_le_budget():
    assert clic_facture(41, False, 0, 500, 1_000) == 41
    assert clic_facture(41, True, 0, 500, 1_000) == 0  # même client, même annonce, même jour
    assert clic_facture(41, False, 470, 500, 1_000) == 0  # budget du jour atteint
    assert clic_facture(41, False, 0, 500, 40) == 0  # solde insuffisant
    assert diffusable(41, 459, 500, 41) and not diffusable(41, 460, 500, 41)
    with pytest.raises(AnnonceRefusee):
        clic_facture(-1, False, 0, 500, 1_000)


def r(cle, prix=10_000, note="4", produit=None):
    return Resultat(cle, produit or cle, prix, Decimal(note))


def test_densite_deux_sur_dix_et_vingt_pour_cent():
    organiques = [r(f"o{i}") for i in range(12)]
    pos = placer_annonces(organiques, [r("a1"), r("a2"), r("a3"), r("a4")], P)
    sponsors = [i for i, x in enumerate(pos) if x.sponsorise]
    assert sponsors == [0, 5, 10] and len(pos) == 15  # 3 sur 15 = 20 %
    # Liste courte : 4 résultats → une annonce (1 sur 5) ; 3 résultats → aucune.
    assert sum(x.sponsorise for x in placer_annonces(organiques[:4], [r("a1"), r("a2")], P)) == 1
    assert not any(x.sponsorise for x in placer_annonces(organiques[:3], [r("a1")], P))


def test_jamais_au_dessus_d_une_offre_moins_chere_et_mieux_notee():
    organiques = [r("o0"), r("o1"), r("tel-B", 9_000, "4.6", "tel"), *[r(f"o{i}") for i in range(3, 12)]]
    pos = placer_annonces(organiques, [r("tel-A", 10_000, "4.2", "tel")], P)
    i = next(i for i, x in enumerate(pos) if x.sponsorise)
    assert i == 5 and [x.resultat.cle for x in pos].index("tel-B") < i
    # Moins chère mais moins bien notée : ne bloque pas.
    organiques[2] = r("tel-B", 9_000, "4.0", "tel")
    assert placer_annonces(organiques, [r("tel-A", 10_000, "4.2", "tel")], P)[0].sponsorise
    # Bloquée jusqu'au bout de la liste : l'annonce n'est pas montrée.
    court = [r(f"o{i}") for i in range(5)] + [r("tel-B", 9_000, "4.6", "tel")]
    assert not any(x.sponsorise for x in placer_annonces(court, [r("tel-A", 10_000, "4.2", "tel")], P))


def test_annonce_deja_dans_les_resultats():
    organiques = [r(f"o{i}") for i in range(12)]
    # Déjà en tête : l'annonce est inutile ; plus bas : sa copie est retirée (une seule fois à l'écran).
    assert not any(x.sponsorise for x in placer_annonces(organiques, [r("o0")], P))
    pos = placer_annonces(organiques, [r("o7")], P)
    assert pos[0].sponsorise and [x.resultat.cle for x in pos].count("o7") == 1 and len(pos) == 12


def test_emplacements_fixe_et_enchere():
    demandes = [Enchere(f"c{i}", 0, ordre=9 - i) for i in range(6)]
    g = attribuer_emplacements(Emplacement.A_LA_UNE, Mode.FIXE, demandes, P)
    assert [x.campagne for x in g] == ["c5", "c4", "c3", "c2"] and {x.cout for x in g} == {15_000}
    bids = [
        Enchere("a", 30_000),
        Enchere("b", 26_000),
        Enchere("c", 22_000),
        Enchere("d", 21_000),
        Enchere("e", 19_000),
    ]
    g = attribuer_emplacements(Emplacement.CARROUSEL, Mode.ENCHERE, bids, P)
    assert [(x.campagne, x.cout) for x in g] == [("a", 26_001), ("b", 22_001), ("c", 21_001)]
    # Places restantes (des places fixes déjà vendues) : la suivante perdante fixe le prix.
    g = attribuer_emplacements(Emplacement.CARROUSEL, Mode.ENCHERE, bids, P, places=1)
    assert [(x.campagne, x.cout) for x in g] == [("a", 26_001)]
    assert attribuer_emplacements(Emplacement.A_LA_UNE, Mode.FIXE, demandes, P, places=-2) == ()


def test_remise_flash():
    assert verifier_remise_flash(20_000, 18_000, P) == 10
    assert verifier_remise_flash(3_000, 2_650, P) == 11  # 11,67 % affiché 11 %
    with pytest.raises(AnnonceRefusee, match="FLASH-REMISE-MIN"):
        verifier_remise_flash(20_000, 18_001, P)
    with pytest.raises(AnnonceRefusee):
        verifier_remise_flash(0, 1, P)


def test_commission_vente_flash_majoree():
    itel = (LigneVendue(Famille.A, 18_000),)
    f = commission_vente_flash(itel, Palier.BRONZE, False, PC, P)
    assert (f.commission_normale, f.majoration, f.commission, f.garde) == (2_430, Decimal(540), 2_970, 15_030)
    assert "VD-PUB-FLASH-MAJORATION" in f.trace[-1]
    # La majoration n'est pas réduite par le palier : Platine 2 430 × 0,6 = 1 458 + 540.
    assert commission_vente_flash(itel, Palier.PLATINE, False, PC, P).commission == 1_998
    # Au plancher (700 F) : 700 + 3 % × 1 000 = 730 F.
    assert commission_vente_flash((LigneVendue(Famille.C, 1_000),), Palier.BRONZE, False, PC, P).commission == 730
    # Sous-commande mêlée : la majoration ne porte que sur la part vendue au prix flash.
    mele = (LigneVendue(Famille.A, 18_000), LigneVendue(Famille.A, 2_000))
    assert (
        commission_vente_flash(mele, Palier.BRONZE, False, PC, P, base_flash=18_000).commission == 2_430 + 330 + 540
    )  # 2 000 F : 16,5 % (sous 5 000 F)
    for base in (-1, 20_001, True):
        with pytest.raises(VenteInvalide):
            commission_vente_flash(mele, Palier.BRONZE, False, PC, P, base_flash=base)


def test_vente_flash_refusee_si_le_vendeur_perd():
    p = avec(**{"VD-PUB-FLASH-MAJORATION": "99 points de commission pendant la vente flash"})
    with pytest.raises(OffreRefusee):
        commission_vente_flash((LigneVendue(Famille.B, 10_000),), Palier.BRONZE, False, PC, p)


def test_boost():
    assert (prix_boost(DureeBoost.H24, P), prix_boost("7j", P)) == (1_000, 5_000)
    assert score_classement(10, True, P) == 15 and score_classement(10, False, P) == 10
    assert classer([("a", 12, False), ("b", 10, True), ("c", 12, False), ("d", 5, False)], P) == ("b", "a", "c", "d")


def test_remboursement_des_heures_non_diffusees():
    assert remboursement_non_diffuse(5_000, 168, 100) == 2_023  # 2 023,8 → au franc inférieur
    assert remboursement_non_diffuse(1_000, 24, 24) == 0
    for prevues, diffusees in ((0, 0), (24, 25), (24, -1)):
        with pytest.raises(AnnonceRefusee):
            remboursement_non_diffuse(1_000, prevues, diffusees)


def test_solde_prepaye():
    assert recharger(0, 1_000, P) == 1_000
    with pytest.raises(AnnonceRefusee, match="au moins 1"):
        recharger(0, 999, P)
    assert debiter(1_000, 41) == 959
    with pytest.raises(AnnonceRefusee, match="rechargez"):
        debiter(40, 41)


def test_facture():
    f = facture_publicitaire(
        [
            LigneFacture("Clics", 12, 41),
            LigneFacture("Boost 7 jours", 1, 5_000),
            LigneFacture("Heures rendues", 1, -2_023),
        ],
        Decimal("19.25"),
    )
    assert (f.hors_taxe, f.tva, f.total) == (3_469, 668, 4_137)
    for lignes in ([LigneFacture("x", -1, 1)], [LigneFacture("x", 1, "1")], [LigneFacture("x", 1, -1)]):
        with pytest.raises(VenteInvalide):
            facture_publicitaire(lignes, Decimal(0))
