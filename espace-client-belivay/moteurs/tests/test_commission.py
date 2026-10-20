"""Commission du vendeur (VD-02 p5-6, familles M01 ; DP-55, DP-56 : Q-01 à Q-09, Q-54 à Q-57, Q-62), sur le jeu
d'essai du paquet « Espace vendeur » (VD-02 p6, VD-10 p28, R-C1 à R-C4) et les exemples de l'analyse vendeur."""

from datetime import date
from decimal import Decimal

import pytest

from belivay_moteurs.commission import (
    Famille,
    LigneVendue,
    PlanVendeur,
    apres_remboursement,
    calculer_commission,
    commission_article,
    compteur_decouverte,
    decouverte_active,
    famille_de,
    fin_decouverte,
    prix_minimum_publiable,
    remise_de_plan,
    seuil_commission_minimale,
    simuler_plans,
    verifier_publication,
)
from belivay_moteurs.erreurs import OffreRefusee, VenteInvalide
from belivay_moteurs.litiges import Palier
from belivay_moteurs.registre import charger_registre, lire_commission

REGISTRE = charger_registre()
P = lire_commission(REGISTRE)
A, B, C, D, E = Famille


def avec(**modifs):
    r = dict(REGISTRE)
    r.update(modifs)
    return lire_commission(r)


def une(famille, prix, quantite=1, mic=False):
    return (LigneVendue(famille, prix, quantite, mic),)


def vente(famille, prix, palier=Palier.BRONZE, decouverte=False, quantite=1, mic=False, p=P):
    return calculer_commission(une(famille, prix, quantite, mic), palier, decouverte, p)


# ── Paramètres ──────────────────────────────────────────────────────────────────────────────────────────


def test_parametres_du_registre():
    assert [(t.borne, t.taux_pour_cent) for t in P.bareme["A"]] == [
        (20_000, Decimal("13.5")),
        (100_000, Decimal(5)),
        (500_000, Decimal("2.5")),
        (None, Decimal(2)),
    ]
    # Q-06 : la tranche sans taux prend le taux de la tranche précédente (B, D, E).
    assert P.bareme["B"][-1].taux_pour_cent == P.bareme["B"][-2].taux_pour_cent == Decimal("13.5")
    assert P.bareme["D"][-1].taux_pour_cent == Decimal("8.5")
    assert P.bareme["E"][-1].taux_pour_cent == Decimal(9)
    assert dict(P.multiplicateurs) == {
        "Bronze": Decimal(1),
        "Argent": Decimal("0.85"),
        "Or": Decimal("0.70"),
        "Platine": Decimal("0.60"),
    }
    assert (P.decouverte_mult, P.decouverte_mois, P.decouverte_commandes) == (Decimal("0.80"), 3, 50)
    assert (P.plancher_commande, P.plancher_taux_pour_cent, P.tva_pour_cent, P.prix_min) == (700, 2, 0, 500)
    assert (P.points_petit_prix, P.seuil_petit_prix, P.points_made_in_cameroon) == (3, 5_000, 2)
    assert (P.plans["Boost"].prix_mensuel, P.plans["Boost"].remise_pour_cent) == (2_500, 5)
    assert (P.plans["Pro"].prix_mensuel, P.plans["Pro"].remise_pour_cent) == (7_500, 10)


def test_famille_de_la_categorie():
    assert famille_de("Électronique", P) is A
    assert famille_de("Beauté & Cosmétique", P) is B
    assert famille_de("Frais & Premium", P) is C
    assert famille_de("Animaux", P) is D
    assert famille_de("Livres & Médias", P) is E
    with pytest.raises(VenteInvalide, match="catégorie inconnue"):
        famille_de("Armes", P)


# ── Jeu d'essai VD-02 p6 ────────────────────────────────────────────────────────────────────────────────


@pytest.mark.parametrize(
    "famille, prix, palier, decouverte, commission, garde",
    [
        (A, 20_000, Palier.BRONZE, True, 2_160, 17_840),  # ITEL AC52 : 2 700 × 0,80 (Q-57 : découverte comprise)
        (A, 21_000, Palier.BRONZE, True, 2_200, 18_800),  # (2 700 + 1 000 × 5 %) × 0,80
        (A, 18_900, Palier.BRONZE, True, 2_041, 16_859),  # 2 041,2 → 2 041 (R-C4)
        (A, 20_000, Palier.ARGENT, True, 1_836, 18_164),  # 2 700 × 0,85 × 0,80 (+324 F, R-C2)
        (A, 20_000, Palier.OR, True, 1_512, 18_488),  # VD-10 PAL : +648 F
        (A, 20_000, Palier.PLATINE, True, 1_296, 18_704),  # VD-10 PAL : +864 F
        (A, 150_000, Palier.BRONZE, False, 7_950, 142_050),  # 2 700 + 4 000 + 1 250
        (A, 5_000, Palier.BRONZE, False, 700, 4_300),  # 675 F → plancher 700 F (5 000 F n'a pas les 3 points)
        (A, 20_000, Palier.OR, False, 1_890, 18_110),  # Q-10 : palier de lancement Or, hors découverte
        (A, 20_000, Palier.BRONZE, False, 2_700, 17_300),
    ],
)
def test_jeu_d_essai(famille, prix, palier, decouverte, commission, garde):
    r = vente(famille, prix, palier, decouverte)
    assert (r.commission, r.garde, r.tva) == (commission, garde, 0)
    assert r.commission + r.garde == prix


def test_trace_de_l_itel():
    r = vente(A, 20_000, decouverte=True)
    assert r.trace[0].startswith("20 000 F × 1, famille A : barème 2700 F")
    assert "× 0.80 (découverte) = 2160 F" in r.trace[1]
    assert r.trace[-1] == "Commission = 2 160 F, arrondie une fois (DP-55) ; TVA 0 % = 0 F ; gardé = 17 840 F"
    assert r.version_parametres == REGISTRE["#version"]


# Q-02 : ces trois références dépendent de M05 et M06, absents du paquet ; le barème seul donne 339 640 F, 67 460 F
# et 28 050 F gardés. Ces tests passeront quand les deux règles seront codées (strict : un passage est signalé).
@pytest.mark.xfail(reason="en attente de M05/M06", strict=True)
def test_iphone_350_000_reference_m06():
    assert vente(A, 350_000, decouverte=True).garde == 335_324


@pytest.mark.xfail(reason="en attente de M05/M06", strict=True)
def test_pagne_84_000_reference_m01():
    assert vente(B, 84_000).garde == 67_600


@pytest.mark.xfail(reason="en attente de M05/M06", strict=True)
def test_panier_supermarche_30_000_marge_minimale_m05():
    assert vente(C, 30_000).garde == 27_989


def test_bareme_seul_des_trois_references():
    """Ce que le moteur donne en attendant M05 et M06 (Q-02, option 3)."""
    assert (vente(A, 350_000, decouverte=True).commission, vente(A, 350_000, decouverte=True).garde) == (
        10_360,
        339_640,
    )
    assert vente(B, 84_000).garde == 67_460
    assert vente(C, 30_000).garde == 28_050


# ── Règles de DP-55 ─────────────────────────────────────────────────────────────────────────────────────


def test_points_ajoutes_au_taux_de_chaque_tranche_puis_palier_puis_arrondi_unique():
    """Q-05 : chargeur à 4 900 F, Argent : (13,5 + 3) % × 4 900 = 808,5 × 0,85 = 687,2 → plancher 700 F."""
    r = vente(A, 4_900, Palier.ARGENT)
    assert (r.bareme, r.reduite, r.commission, r.garde, r.plancher_applique) == (
        Decimal("808.5"),
        Decimal("687.225"),
        700,
        4_200,
        True,
    )
    assert "+3 points" in r.trace[0]


def test_made_in_cameroon_retire_deux_points_jamais_sous_zero():
    # 20 000 × 11,5 % + 30 000 × 3 % = 3 200 F
    assert commission_article(LigneVendue(A, 50_000, made_in_cameroon=True), P) == Decimal(3_200)
    # Dernière tranche de A : 2 % − 2 points = 0 % ; rien au-delà de 500 000 F.
    assert commission_article(LigneVendue(A, 600_000, made_in_cameroon=True), P) == commission_article(
        LigneVendue(A, 500_000, made_in_cameroon=True), P
    )
    avec_moins_cinq = avec(
        **{"VD-COM-POINTS": "+3 points si le prix unitaire est sous 5 000 F · −5 points si Made in Cameroon"}
    )
    # 13,5 − 5 = 8,5 % ; 5 − 5 = 0 % (jamais négatif) : 20 000 × 8,5 % = 1 700 F.
    assert commission_article(LigneVendue(A, 100_000, made_in_cameroon=True), avec_moins_cinq) == Decimal(1_700)
    # Sous 5 000 F et Made in Cameroon : +3 − 2 = +1 point.
    assert commission_article(LigneVendue(B, 4_000, made_in_cameroon=True), P) == Decimal(980)


def test_tranches_sans_taux_le_dernier_taux_continue():
    """Q-06 : sac de mode à 600 000 F : 4 700 + 14 800 + 54 000 + 100 000 × 13,5 % = 87 000 F."""
    assert vente(B, 600_000).commission == 87_000
    assert commission_article(LigneVendue(D, 600_000), P) == Decimal(3_000 + 9_200 + 34_000 + 8_500)
    assert commission_article(LigneVendue(E, 60_000), P) == Decimal(1_250 + 3_600 + 900)


def test_plancher_de_2_pour_cent_meme_platine():
    """Q-07 : téléviseur à 1 000 000 F, Platine : 26 700 × 0,60 = 16 020 F, relevé à 2 % = 20 000 F."""
    r = vente(A, 1_000_000, Palier.PLATINE)
    assert (r.reduite, r.plancher, r.commission, r.garde, r.marge_sur_plancher) == (
        Decimal("16020.00"),
        Decimal(20_000),
        20_000,
        980_000,
        0,
    )


def test_planchers_par_sous_commande():
    """Q-07, Q-08 : 3 articles à 500 F dans la même sous-commande : 700 F pris, 800 F gardés."""
    r = calculer_commission(une(B, 500, 3), Palier.BRONZE, False, P)
    assert (r.prix_articles, r.commission, r.garde) == (1_500, 700, 800)
    deux = calculer_commission(
        (LigneVendue(A, 20_000), LigneVendue(B, 3_000, 2)), Palier.BRONZE, True, P
    )  # (2 700 + 2 × 795) × 0,80 = 3 432 F
    assert (deux.prix_articles, deux.commission) == (26_000, 3_432)


def test_plancher_de_2_pour_cent_non_entier_arrondi_une_fois():
    # 2 % × 1 000 025 = 20 000,5 → 20 001 F ; barème réduit (Platine, découverte) : 26 700,5 × 0,48 = 12 816,24 F.
    r = vente(A, 1_000_025, Palier.PLATINE, True)
    assert (r.plancher, r.commission, r.marge_sur_plancher) == (Decimal("20000.5"), 20_001, 0)


def test_belivay_ne_perd_jamais_vente_refusee():
    """Q-08, DP-55 : un article seul à 500 F laisserait −200 F : vente refusée."""
    with pytest.raises(OffreRefusee, match="−200"):
        vente(B, 500)
    assert vente(B, 700).garde == 0  # 0 F gardé : permis (DP-55 refuse « moins de 0 F »)


def test_tva_en_plus_de_la_commission():
    """Q-09 : TVA de 19,25 % sur 2 160 F = 415,8 → 416 F : 17 424 F gardés."""
    p = avec(**{"VD-TVA": "19,25 % de la commission ; nouveau taux annoncé 30 jours avant"})
    r = vente(A, 20_000, decouverte=True, p=p)
    assert (r.commission, r.tva, r.garde) == (2_160, 416, 17_424)


def test_lignes_invalides():
    with pytest.raises(VenteInvalide, match="sans article"):
        calculer_commission((), Palier.BRONZE, False, P)
    with pytest.raises(VenteInvalide, match="famille inconnue"):
        LigneVendue("Z", 1_000)
    with pytest.raises(VenteInvalide, match="prix invalide"):
        LigneVendue(A, 0)
    with pytest.raises(VenteInvalide, match="quantité invalide"):
        LigneVendue(A, 1_000, True)
    assert LigneVendue("A", 1_000).famille is A  # texte venu du JSON


def test_apres_remboursement():
    r = vente(A, 20_000, decouverte=True)
    assert apres_remboursement(r, 20_000, P).commission == 0  # total : commission annulée
    partiel = apres_remboursement(r, 15_000, P)  # 2 160 × 5 000 / 20 000 = 540 F, sans plancher de 700 F
    assert (partiel.commission, partiel.tva, partiel.garde) == (540, 0, 4_460)
    assert apres_remboursement(r, 0, P).commission == 2_160
    with pytest.raises(VenteInvalide):
        apres_remboursement(r, 20_001, P)


# ── Publication et seuil affiché ────────────────────────────────────────────────────────────────────────


def test_prix_minimum_publiable():
    for f in Famille:
        assert prix_minimum_publiable(f, False, P) == 700  # TVA 0 % : le prix rejoint le plancher
    p = avec(**{"VD-TVA": "19,25 % de la commission ; nouveau taux annoncé 30 jours avant"})
    assert prix_minimum_publiable(A, False, p) == 835  # 835 − 700 − 135 = 0
    verifier_publication(700, B, False, P)
    with pytest.raises(OffreRefusee, match="publiable dès 700"):
        verifier_publication(699, B, False, P)


def test_seuil_de_la_commission_minimale_calcule_jamais_ecrit_en_dur():
    """Q-55 : électronique Bronze 700 / 13,5 % (5 185 F avant arrondi : 5 182 F au franc près) ; mode Bronze,
    avec les 3 points sous 5 000 F : 700 / 26,5 % (2 640 F) ; jamais « 3 043 F » partout."""
    assert seuil_commission_minimale(A, Palier.BRONZE, False, False, P) == 5_182
    assert vente(A, 5_181).plancher_applique and not vente(A, 5_182).plancher_applique
    assert seuil_commission_minimale(B, Palier.BRONZE, False, False, P) == 2_640
    assert vente(B, 2_639).plancher_applique and not vente(B, 2_640).plancher_applique
    # Platine en découverte, supermarché : 7,5 % × 0,48 sur 10 000 F (360 F), puis 6 % × 0,48 = 2,88 % au-delà :
    # 360 + 2,88 % × (p − 10 000) ≥ 699,5 ⇒ p ≥ 21 789 F.
    s = seuil_commission_minimale(C, Palier.PLATINE, True, False, P)
    assert s == 21_789
    assert not vente(C, s, Palier.PLATINE, True).plancher_applique
    assert vente(C, s - 1, Palier.PLATINE, True).plancher_applique


# ── Offre de découverte ─────────────────────────────────────────────────────────────────────────────────


def test_decouverte():
    """Jeu d'essai : « jusqu'au 27 nov. ou 50 commandes (9) » ; active ⇔ commandes < 50 ∧ date ≤ 27 nov."""
    debut = date(2026, 8, 27)
    assert fin_decouverte(debut, P) == date(2026, 11, 27)
    assert fin_decouverte(date(2026, 11, 30), P) == date(2027, 2, 28)
    assert decouverte_active(debut, date(2026, 9, 21), 9, P)
    assert decouverte_active(debut, date(2026, 11, 27), 49, P)
    assert not decouverte_active(debut, date(2026, 11, 28), 9, P)
    assert not decouverte_active(debut, date(2026, 9, 21), 50, P)
    assert decouverte_active(None, date(2026, 9, 21), 0, P)  # la première commande payée en profite


def test_compteur_de_decouverte():
    """Q-62 : une commande remboursée en totalité n'est pas comptée ; remboursée en partie, elle l'est."""
    assert compteur_decouverte(10, 1) == 9
    with pytest.raises(VenteInvalide):
        compteur_decouverte(3, 4)


# ── Plans ───────────────────────────────────────────────────────────────────────────────────────────────


def itels(n):
    return [vente(A, 20_000, decouverte=True) for _ in range(n)]


def test_remise_de_plan():
    """Q-04 : 3 ITEL en découverte, commission du mois 6 480 F : Boost 324 F, Pro 648 F ; Free : rien."""
    assert remise_de_plan(PlanVendeur.BOOST, itels(3), P).remise == 324
    assert remise_de_plan(PlanVendeur.PRO, itels(3), P).remise == 648
    free = remise_de_plan(PlanVendeur.FREE, itels(3), P)
    assert (free.remise, free.prix_du_plan, free.commission_du_mois) == (0, 0, 6_480)
    assert "⇒ remise 324" in remise_de_plan("Boost", itels(3), P).trace[0]


def test_remise_plafonnee_au_prix_du_plan():
    # 25 ITEL : 54 000 F de commission ; Boost 2 700 F → 2 500 F ; Pro 5 400 F.
    assert remise_de_plan(PlanVendeur.BOOST, itels(25), P).remise == 2_500
    assert remise_de_plan(PlanVendeur.PRO, itels(25), P).remise == 5_400


def test_remise_jamais_sous_les_planchers():
    """DP-55 : des ventes au plancher (700 F) ne laissent aucune remise ; BelivaY ne passe jamais sous le plancher."""
    au_plancher = [vente(A, 5_000) for _ in range(10)]
    assert remise_de_plan(PlanVendeur.PRO, au_plancher, P).remise == 0
    # Une vente au plancher, une au-dessus : la remise est limitée à ce qui dépasse le plancher.
    melange = [vente(A, 5_000), vente(A, 5_400)]  # 729 F, soit 29 F au-dessus de 700 F
    assert melange[1].marge_sur_plancher == 29
    assert remise_de_plan(PlanVendeur.PRO, melange, P).remise == 29  # et non 10 % × 1 429 F = 143 F


@pytest.mark.parametrize(
    "n, free, boost, pro, meilleur",
    [
        (3, 53_520, 51_344, 46_668, PlanVendeur.FREE),  # 60 000 F (R-C1)
        (25, 446_000, 446_000, 443_900, PlanVendeur.FREE),  # 500 000 F : égalité, le moins cher
        (35, 624_400, 624_400, 624_400, PlanVendeur.FREE),  # 700 000 F : les deux plafonds jouent
    ],
)
def test_simulateur_des_plans(n, free, boost, pro, meilleur):
    """VD-10 p28 : tableau de référence du simulateur, sur les ventes réelles du mois (ITEL en découverte)."""
    s = simuler_plans(itels(n), P)
    assert (s.gardes[PlanVendeur.FREE], s.gardes[PlanVendeur.BOOST], s.gardes[PlanVendeur.PRO]) == (free, boost, pro)
    assert s.meilleur is meilleur


def test_un_plan_ne_rapporte_jamais_plus_que_son_prix():
    """D8 : la remise ne dépasse pas le prix du plan ; le simulateur le dit (SIM-01), Free reste le mieux gardé."""
    s = simuler_plans([vente(A, 1_000_000) for _ in range(5)] + itels(60), P)
    assert s.gardes[PlanVendeur.FREE] == s.gardes[PlanVendeur.BOOST] == s.gardes[PlanVendeur.PRO]
