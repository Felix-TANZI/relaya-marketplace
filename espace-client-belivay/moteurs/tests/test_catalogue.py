"""Catalogue : prix livré, attribution, prix d'une carte, distance, retirable aujourd'hui, visibilité
(CAL-01 à CAL-05, CRE-24, CRE-26, CRE-27, CTV-31 ; DP-07, DP-25 ; prototype du 29 sept. « devenir vendeur »)."""

from datetime import datetime, timedelta
from decimal import Decimal
from zoneinfo import ZoneInfo

import pytest

from belivay_moteurs.catalogue import (
    EtatProduit,
    Offre,
    OffreAttribuee,
    PrixCarte,
    Visibilite,
    attribuer,
    distance_affichee,
    prix_de_carte,
    prix_livre,
    retirable_aujourd_hui,
    vendeur_suivant,
    visibilite,
)
from belivay_moteurs.erreurs import PanierInvalide, ValeurInterdite
from belivay_moteurs.frais import Article, Classe, Mode, Panier, SousCommande, calculer
from belivay_moteurs.registre import charger_registre, lire_bascule, lire_livraison

P = lire_livraison(charger_registre())


@pytest.mark.parametrize(
    "prix, classe, mode, livraison, part_offerte, offert, supplement, domicile_seulement",
    [
        (20_000, Classe.S, Mode.RELAIS, 900, 0, False, 0, False),  # itel AC52 : « + 900 F de retrait » (CAL-01)
        (150_699, Classe.S, Mode.RELAIS, 0, 900, True, 0, False),  # Camon 30 : « Retrait offert »
        (9_800, Classe.M, Mode.RELAIS, 900, 0, False, 0, False),  # M : aucun supplément (DP-07)
        (24_500, Classe.L, Mode.RELAIS, 1_100, 0, False, 0, False),  # L : remise 600 F (DP-25)
        (98_000, Classe.L, Mode.RELAIS, 200, 900, False, 0, False),  # L : 200 F restent dus, pas « offert »
        (20_000, Classe.S, Mode.DOMICILE, 1_500, 0, False, 0, False),
        (60_000, Classe.S, Mode.DOMICILE, 0, 1_500, True, 0, False),
        (189_000, Classe.XL, Mode.RELAIS, None, 0, False, None, True),  # « Livraison à domicile » (CRE-27)
        (189_000, "HG", "relais", None, 0, False, None, True),  # texte accepté (JSON, Django)
    ],
)
def test_prix_livre(prix, classe, mode, livraison, part_offerte, offert, supplement, domicile_seulement):
    v = prix_livre(prix, classe, mode, P)
    assert (v.livraison, v.part_offerte, v.offert, v.supplement, v.domicile_seulement) == (
        livraison,
        part_offerte,
        offert,
        supplement,
        domicile_seulement,
    )
    if livraison is None:
        assert v.total is None


def test_prix_livre_xl_a_domicile():
    v = prix_livre(189_000, Classe.XL, Mode.DOMICILE, P, Decimal("5.2"))
    assert (v.livraison, v.offert, v.supplement, v.total) == (0, True, 2_000, 191_000)


def test_prix_livre_xl_a_domicile_sans_distance():
    # Le supplément dépend de la distance boutique → domicile (DP-46) : sans elle, pas de montant.
    v = prix_livre(189_000, Classe.XL, Mode.DOMICILE, P)
    assert (v.livraison, v.offert, v.supplement, v.total, v.domicile_seulement) == (0, True, None, None, True)


def test_prix_livre_egal_au_panier_d_un_article():
    # La carte, la fiche et le panier disent la même chose (CRE-24).
    for prix, classe in ((20_000, Classe.S), (24_500, Classe.L), (98_000, Classe.L), (150_699, Classe.S)):
        panier = Panier(Mode.RELAIS, (SousCommande("x", "z", (Article("x", prix, 1, classe),)),))
        assert prix_livre(prix, classe, Mode.RELAIS, P).total == calculer(panier, P).total


A_CAMON = SousCommande("or91", "Mvog-Ada", (Article("Camon 30", 150_699, 1, Classe.S),))
B_WAX = SousCommande(
    "ar78", "Mvog-Ada", (Article("Ensemble", 32_000, 1, Classe.S), Article("Sac", 52_000, 1, Classe.S))
)
PANIER = Panier(Mode.RELAIS, (A_CAMON, B_WAX))
MIXEUR_C = Offre("br64", "Mvan", 37_000, Classe.S, 64, 5)
MIXEUR_A = Offre("or91", "Mvog-Ada", 37_000, Classe.S, 91, 3)


def test_attribution_au_cout_total_livre():
    # Le mixeur par la boutique A (déjà au panier) n'ajoute ni ramassage ni colis : 37 000 F ;
    # par la boutique C (Mvan) : 37 000 + 500 + 400 = 37 900 F.
    a = attribuer((MIXEUR_C, MIXEUR_A), PANIER, 1, Mode.RELAIS, P)
    assert (a.offre.vendeur, a.cout_total_livre) == ("or91", 37_000)
    c = attribuer((MIXEUR_C,), PANIER, 1, Mode.RELAIS, P)
    assert c.cout_total_livre == 37_900


def test_attribution_trust_score_en_departage():
    o1 = Offre("v1", "Essos", 10_000, Classe.S, 70, 5)
    o2 = Offre("v2", "Essos", 10_000, Classe.S, 85, 5)
    assert attribuer((o1, o2), None, 1, Mode.RELAIS, P).offre.vendeur == "v2"


def test_attribution_ecarte_fermees_et_sans_stock():
    fermee = Offre("v1", "Essos", 9_000, Classe.S, 90, 5, fermee_aujourd_hui=True)
    vide = Offre("v2", "Essos", 9_500, Classe.S, 90, 0)
    ouverte = Offre("v3", "Essos", 12_000, Classe.S, 60, 2)
    assert attribuer((fermee, vide, ouverte), None, 1, Mode.RELAIS, P).offre.vendeur == "v3"
    assert attribuer((fermee, vide), None, 1, Mode.RELAIS, P) is None  # le produit passe « Épuisé » (CRE-26)
    assert attribuer((ouverte,), None, 3, Mode.RELAIS, P) is None  # quantité au-delà du stock disponible


def test_attribution_dans_le_mode_du_client():
    # Un client à domicile sans panier : la livraison à domicile compte, pas le retrait en relais.
    a = attribuer((Offre("v1", "Essos", 20_000, Classe.S, 80, 5),), None, 1, Mode.DOMICILE, P)
    assert a.cout_total_livre == 21_500
    with pytest.raises(PanierInvalide):
        attribuer((MIXEUR_A,), PANIER, 1, Mode.DOMICILE, P)  # le panier est en relais


def test_attribution_xl_ecarte_l_impossible_et_garde_la_distance():
    xl = Offre("v1", "Essos", 189_000, Classe.XL, 80, 5)
    s = Offre("v2", "Essos", 195_000, Classe.S, 80, 5)
    assert attribuer((xl, s), None, 1, Mode.RELAIS, P).offre.vendeur == "v2"  # XL jamais en relais
    assert attribuer((xl, s), None, 1, Mode.DOMICILE, P).offre.vendeur == "v2"  # XL sans distance : écartée
    a = attribuer((xl, s), None, 1, Mode.DOMICILE, P, {"v1": Decimal("5.2")})
    assert (a.offre.vendeur, a.cout_total_livre) == ("v1", 191_000)
    # Ajoutée à une sous-commande de la même boutique, l'offre XL prend la distance connue de cette boutique.
    panier = Panier(Mode.DOMICILE, (SousCommande("v1", "Essos", (Article("Câble", 2_000, 1, Classe.S),)),))
    avec = Panier(
        Mode.DOMICILE,
        (
            SousCommande(
                "v1",
                "Essos",
                (*panier.sous_commandes[0].articles, Article("v1", 189_000, 1, Classe.XL)),
                Decimal("5.2"),
            ),
        ),
    )
    attendu = calculer(avec, P).total - calculer(panier, P).total
    assert attribuer((xl,), panier, 1, Mode.DOMICILE, P, {"v1": Decimal("5.2")}).cout_total_livre == attendu


PB = lire_bascule(charger_registre())
PAYEE = OffreAttribuee(Offre("v1", "Essos", 100_000, Classe.S, 90, 0), 100_000)


def test_vendeur_suivant_dans_l_ecart_et_au_trust_score():
    # Offre payée 100 000 F livrés : au plus 105 000 F (REMPL-ECART 5 %), Trust Score ≥ 75 (REMPL-TRUST-MIN).
    trop_cher = Offre("v2", "Essos", 105_001, Classe.S, 95, 5)
    peu_fiable = Offre("v3", "Essos", 101_000, Classe.S, 74, 5)
    bonne = Offre("v4", "Essos", 104_000, Classe.S, 75, 5)
    b = vendeur_suivant((trop_cher, peu_fiable, bonne), PAYEE, frozenset({"v1"}), None, 1, Mode.RELAIS, P, PB)
    assert (b.offre.offre.vendeur, b.ecart_paye_par_belivay, b.tentative) == ("v4", 4_000, 1)
    moins_chere = Offre("v5", "Essos", 98_000, Classe.S, 80, 5)
    b = vendeur_suivant((moins_chere,), PAYEE, frozenset({"v1"}), None, 1, Mode.RELAIS, P, PB)
    assert b.ecart_paye_par_belivay == 0  # le client garde son prix, sans rien récupérer


def test_vendeur_suivant_au_plus_deux_tentatives_puis_remboursement():
    bonne = Offre("v4", "Essos", 104_000, Classe.S, 80, 5)
    b = vendeur_suivant((bonne,), PAYEE, frozenset({"v1", "v4"}), None, 1, Mode.RELAIS, P, PB)
    assert (b.offre, b.tentative) == (None, 2)  # v4 déjà sollicité : personne d'autre → remboursement intégral
    b = vendeur_suivant((bonne,), PAYEE, frozenset({"v1", "v2", "v3"}), None, 1, Mode.RELAIS, P, PB)
    assert (b.offre, b.tentative) == (None, 2)  # RUPTURE-TENTATIVES atteint (DP-01)


def test_prix_de_carte():
    camon = ((139_000, Classe.S), (150_699, Classe.S))
    assert prix_de_carte(camon, Mode.RELAIS, P) == prix_de_carte(camon[::-1], Mode.RELAIS, P)
    v = prix_de_carte(camon, Mode.RELAIS, P)
    assert (v.prix, v.a_partir_de, v.domicile_seulement) == (139_000, True, False)  # « dès 139 000 F »
    assert prix_de_carte(((20_000, Classe.S), (20_000, Classe.M)), Mode.RELAIS, P).a_partir_de is False
    # Sur les prix livrés : 20 000 + 900 = 20 900 F contre 24 500 + 1 100 = 25 600 F.
    v = prix_de_carte(((20_000, Classe.S), (24_500, Classe.L)), Mode.RELAIS, P)
    assert (v.prix, v.a_partir_de) == (20_900, True)
    with pytest.raises(ValueError):
        prix_de_carte((), Mode.RELAIS, P)


def test_prix_de_carte_xl():
    xl = ((189_000, Classe.XL),)
    # En relais : le prix de l'article, « Livraison à domicile » sans montant (CRE-27).
    assert prix_de_carte(xl, Mode.RELAIS, P) == PrixCarte(189_000, False, False, True)
    assert prix_de_carte(((189_000, Classe.XL), (199_000, Classe.HG)), Mode.RELAIS, P).a_partir_de
    assert prix_de_carte(xl, Mode.DOMICILE, P, Decimal("5.2")) == PrixCarte(191_000, True, False, True)
    # Une variante S livrable et une XL sans montant : « à partir de » le prix connu.
    v = prix_de_carte(((20_000, Classe.S), (189_000, Classe.XL)), Mode.RELAIS, P)
    assert v == PrixCarte(20_900, True, True, False)


def test_distance_affichee():
    assert [distance_affichee(m) for m in (1_249, 1_250, 350, 4_800)] == [
        Decimal("1.2"),
        Decimal("1.3"),
        Decimal("0.4"),
        Decimal("4.8"),
    ]
    assert distance_affichee("1250") == Decimal("1.3")
    with pytest.raises(ValeurInterdite):
        distance_affichee(1249.0)
    assert str(distance_affichee("-0")) == "0.0"
    for invalide in (-1, "NaN", "Infinity"):
        with pytest.raises(ValueError):
            distance_affichee(invalide)


YAOUNDE = ZoneInfo("Africa/Douala")
DIX_H_15 = datetime(2026, 9, 24, 10, 15, tzinfo=YAOUNDE)
FERMETURE = datetime(2026, 9, 24, 19, tzinfo=YAOUNDE)
TOURNEE = timedelta(minutes=45)


def test_retirable_aujourd_hui():
    assert retirable_aujourd_hui(DIX_H_15, timedelta(hours=4), TOURNEE, FERMETURE, Classe.S) == (
        True,
        datetime(2026, 9, 24, 15, tzinfo=YAOUNDE),
    )  # « dès 15 h »
    assert retirable_aujourd_hui(DIX_H_15, timedelta(hours=6), TOURNEE, FERMETURE, Classe.S)[0]  # « dès 17 h »
    assert not retirable_aujourd_hui(DIX_H_15, timedelta(hours=24), TOURNEE, FERMETURE, Classe.S)[0]
    assert not retirable_aujourd_hui(DIX_H_15, timedelta(hours=1), TOURNEE, None, Classe.S)[0]  # fermé aujourd'hui
    assert not retirable_aujourd_hui(DIX_H_15, timedelta(hours=1), TOURNEE, FERMETURE, Classe.XL)[0]
    with pytest.raises(ValueError):
        retirable_aujourd_hui(DIX_H_15.replace(tzinfo=None), timedelta(hours=1), TOURNEE, FERMETURE, Classe.S)
    with pytest.raises(ValueError):
        retirable_aujourd_hui(DIX_H_15, timedelta(hours=1), TOURNEE, FERMETURE.replace(tzinfo=None), Classe.S)


@pytest.mark.parametrize(
    "piece, interdit, stock, attendu",
    [
        (False, False, 10, Visibilite.INVISIBLE),  # pièce du vendeur non validée (29 sept.)
        (True, True, 10, Visibilite.INVISIBLE),  # liste interdite (CTV-31)
        (True, False, 0, Visibilite.EPUISE),  # épuisé partout : visible en fin de liste (CRE-26)
        (True, False, 3, Visibilite.VISIBLE),
    ],
)
def test_visibilite(piece, interdit, stock, attendu):
    assert visibilite(EtatProduit(piece, interdit, stock)) is attendu


def test_vendeur_suivant_dans_le_panier_du_client():
    # Le vendeur suivant est cherché dans le panier sans l'article : une boutique déjà au panier n'ajoute rien.
    sans = Panier(Mode.RELAIS, (B_WAX,))
    payee = attribuer((MIXEUR_C,), sans, 1, Mode.RELAIS, P)  # 37 000 + 500 + 400 = 37 900 F
    deja_la = Offre("ar78", "Mvog-Ada", 38_500, Classe.S, 80, 2)
    b = vendeur_suivant((deja_la,), payee, frozenset({"br64"}), sans, 1, Mode.RELAIS, P, PB)
    assert (payee.cout_total_livre, b.offre.cout_total_livre, b.ecart_paye_par_belivay) == (37_900, 38_500, 600)
