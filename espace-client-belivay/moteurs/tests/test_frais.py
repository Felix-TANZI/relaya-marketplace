"""Moteur de frais du panier, sur le jeu d'essai de CL-02 (panier de référence 7.3 et ses variantes).

Les montants de la spécification datent d'avant les décisions du porteur ; ils sont recalculés ici :
- DP-18 : remise au relais par colis (400 F), plus une fois par commande ;
- DP-25 : 600 F pour un colis L ; la livraison offerte couvre toujours la remise d'un colis S ;
- DP-07 : aucun supplément M ou L ; XL à domicile 1 500 / 2 000 / 3 000 F selon la distance.
Chaque test donne le montant de la spécification et l'écart qui l'explique.
"""

from decimal import Decimal

import pytest

from belivay_moteurs.erreurs import PanierInvalide
from belivay_moteurs.frais import (
    Article,
    Classe,
    DecisionPaiement,
    Mode,
    Panier,
    SousCommande,
    calculer,
    gain_conseil,
    verifier_au_paiement,
)
from belivay_moteurs.registre import charger_registre, lire_livraison

P = lire_livraison(charger_registre())

# Produits du jeu d'essai (CL-02, « Les 30 produits de la base »), prix et classes.
CAMON30 = Article("Tecno Camon 30 · 256 Go", 150_699, 1, Classe.S)
ENSEMBLE = Article("Ensemble wax 3 pièces · M", 32_000, 1, Classe.S)
SAC = Article("Sac cuir artisanal · Marron", 52_000, 1, Classe.S)
MIXEUR = Article("Mixeur-blender 2 L · 600 W", 37_000, 1, Classe.S)
PAGNE = Article("Pagne wax 6 yards", 18_500, 1, Classe.S)
ROBE = Article("Robe wax longue · M", 24_000, 1, Classe.S)
TV43 = Article("Téléviseur LED 43″", 189_000, 1, Classe.XL)
VENTILO = Article("Ventilateur sur pied 16″", 24_500, 1, Classe.L)
RIZ = Article("Riz parfumé 25 kg", 18_500, 1, Classe.L)


def a(*articles):
    return SousCommande("Boutique A", "Mvog-Ada", articles)


def b(*articles):
    return SousCommande("Boutique B", "Mvog-Ada", articles)


def c(*articles):
    return SousCommande("Boutique C", "Mvan", articles)


def relais(*sous_commandes):
    return Panier(Mode.RELAIS, sous_commandes)


REFERENCE = relais(a(CAMON30), b(ENSEMBLE, SAC), c(MIXEUR))


def test_parametres_du_registre():
    assert (P.ramassage, P.ramassage_suivant, P.degressivite_pour_cent) == (500, 380, Decimal(24))
    assert P.remise_relais == {"S": 400, "M": 400, "L": 600}
    assert P.remise_domicile == 1_000
    assert (P.seuil_relais, P.seuil_domicile, P.classe_offerte) == (30_000, 50_000, "S")
    assert P.supplement_m_l == 0
    assert [(t.borne_km, t.borne_comprise, t.montant) for t in P.supplement_xl] == [
        (Decimal(5), False, 1_500),
        (Decimal(10), True, 2_000),
        (None, False, 3_000),
    ]
    assert P.xl_interdit_en_relais


def test_panier_de_reference():
    # Spécification 7.3 : 272 579 F avec une seule remise ; DP-18 : 3 colis × 400 F = 1 200 F → + 800 F.
    f = calculer(REFERENCE, P)
    assert (f.sous_total, f.ramassages, f.remises, f.supplements, f.offert) == (271_699, 1_380, 1_200, 0, 900)
    assert f.total == 273_379
    assert f.colis == 3
    assert f.economie == 900  # « tu économises 900 F de livraison »
    assert f.reste_ramassages == 880  # « Il te reste 880 F de ramassages »
    assert f.manque_pour_seuil == 0 and f.progression_pour_cent == 100


def test_trace_explique_chaque_montant():
    trace = "\n".join(calculer(REFERENCE, P).trace)
    assert "Mvog-Ada : 500\u00a0F + 380\u00a0F ; Mvan : 500\u00a0F = 1\u00a0380\u00a0F" in trace
    assert "= 1\u00a0200\u00a0F (3 colis" in trace
    assert (
        "Total = 271\u00a0699\u00a0F + 1\u00a0380\u00a0F + 1\u00a0200\u00a0F + 0\u00a0F − 900\u00a0F = 273\u00a0379\u00a0F"
        in trace
    )


def test_changer_d_offre_mixeur_par_la_boutique_a():
    # Spécification : 272 079 F, gain 500 F. DP-18 : un colis de moins économise aussi 400 F de remise.
    simule = relais(a(CAMON30, MIXEUR), b(ENSEMBLE, SAC))
    f = calculer(simule, P)
    assert (f.ramassages, f.remises, f.colis, f.total) == (880, 800, 2, 272_479)
    assert gain_conseil(REFERENCE, simule, P) == 900


def test_boutique_a_retiree():
    # Spécification : 121 500 F ; DP-18 : 2 colis → + 400 F.
    f = calculer(relais(b(ENSEMBLE, SAC), c(MIXEUR)), P)
    assert (f.sous_total, f.ramassages, f.remises, f.offert, f.total) == (121_000, 1_000, 800, 900, 121_900)


def test_seuil_non_atteint():
    # Inchangé : 19 400 F, « Ajoute 11 500 F », barre 62 %.
    f = calculer(relais(a(PAGNE)), P)
    assert (f.total, f.offert, f.manque_pour_seuil, f.progression_pour_cent) == (19_400, 0, 11_500, 62)
    assert f.reste_ramassages == 500


def test_une_seule_boutique_livraison_offerte():
    # Inchangé : 84 000 F, ramassage et remise offerts.
    f = calculer(relais(b(ENSEMBLE, SAC)), P)
    assert (f.ramassages, f.remises, f.offert, f.total) == (500, 400, 900, 84_000)
    assert f.reste_ramassages == 0


def test_robe_paiement_au_comptoir_frais_de_livraison():
    # Inchangé : 24 900 F (900 F de livraison payés tout de suite, la robe au retrait : moteur du comptoir).
    f = calculer(relais(b(ROBE)), P)
    assert (f.total, f.total - f.sous_total) == (24_900, 900)


@pytest.mark.parametrize(
    "distance, supplement, total",
    [
        # Spécification : 190 500 F avec 1 500 F ; DP-07 : 5,2 km → 2 000 F.
        (Decimal("5.2"), 2_000, 191_000),
        (Decimal("4.9"), 1_500, 190_500),
        (Decimal(5), 2_000, 191_000),  # « 5 à 10 km » : 5 km compris
        (Decimal(10), 2_000, 191_000),  # 10 km compris
        (Decimal("10.1"), 3_000, 192_000),  # « plus de 10 km »
    ],
)
def test_colis_xl_a_domicile(distance, supplement, total):
    panier = Panier(Mode.DOMICILE, (SousCommande("Boutique A", "Mvog-Ada", (TV43,), distance),))
    f = calculer(panier, P)
    # 189 000 + 500 + 1 000 − (500 + 1 000) + supplément XL, jamais offert (CAL-09).
    assert (f.ramassages, f.remises, f.offert, f.supplements, f.total) == (500, 1_000, 1_500, supplement, total)


def test_colis_xl_interdit_en_relais():
    with pytest.raises(PanierInvalide, match="LIV-XL-RELAIS"):
        calculer(relais(a(TV43)), P)


def test_colis_xl_sans_distance():
    with pytest.raises(PanierInvalide, match="distance"):
        calculer(Panier(Mode.DOMICILE, (a(TV43),)), P)


def test_colis_l_au_relais():
    # DP-25 : 600 F de remise pour un colis L ; la livraison offerte ne couvre que la remise d'un colis S.
    seul = calculer(relais(b(VENTILO)), P)
    assert (seul.remises, seul.offert, seul.total) == (600, 0, 25_600)
    deux = calculer(relais(b(VENTILO), c(RIZ)), P)  # S = 43 000 F ≥ 30 000 F
    assert (deux.ramassages, deux.remises, deux.offert) == (1_000, 1_200, 900)
    assert deux.total == 43_000 + 1_000 + 1_200 - 900


def test_classe_du_colis_est_la_plus_grande():
    sc = b(ENSEMBLE, VENTILO)
    assert sc.classe_colis is Classe.L


def test_domicile_par_colis():
    # DP-19 : 1 000 F par colis ; offerte dès 50 000 F, elle couvre un ramassage et un colis.
    f = calculer(Panier(Mode.DOMICILE, REFERENCE.sous_commandes), P)
    assert (f.remises, f.offert, f.total) == (3_000, 1_500, 271_699 + 1_380 + 3_000 - 1_500)


@pytest.mark.parametrize(
    "panier, total_spec, total",
    [
        # Prix en hausse : Camon 30 150 699 → 152 699 (spec 274 579 F, + 800 F de DP-18).
        (relais(a(Article(CAMON30.produit, 152_699, 1, Classe.S)), b(ENSEMBLE, SAC), c(MIXEUR)), 274_579, 275_379),
        # Prix en baisse : ensemble 32 000 → 30 500 (spec 271 079 F).
        (relais(a(CAMON30), b(Article(ENSEMBLE.produit, 30_500, 1, Classe.S), SAC), c(MIXEUR)), 271_079, 271_879),
        # Mixeur retiré : 2 colis (spec 235 079 F, + 400 F).
        (relais(a(CAMON30), b(ENSEMBLE, SAC)), 235_079, 235_479),
        # Sac cuir pris, aucun autre vendeur : B garde l'ensemble (spec 220 579 F, + 800 F).
        (relais(a(CAMON30), b(ENSEMBLE), c(MIXEUR)), 220_579, 221_379),
    ],
)
def test_variantes_du_paiement(panier, total_spec, total):
    f = calculer(panier, P)
    assert f.total == total
    assert f.total - total_spec == 400 * (f.colis - 1)  # l'écart vient seulement de DP-18


def test_verification_au_paiement():
    assert verifier_au_paiement(273_379, 273_379) == (DecisionPaiement.CONTINUER, 0)
    assert verifier_au_paiement(273_379, 271_879) == (DecisionPaiement.APPLIQUER_BAISSE, -1_500)
    assert verifier_au_paiement(273_379, 275_379) == (DecisionPaiement.BLOQUER_HAUSSE, 2_000)


@pytest.mark.parametrize(
    "construire",
    [
        lambda: Article("x", 1_000, 0, Classe.S),
        lambda: Article("x", -1, 1, Classe.S),
        lambda: Article("x", 1_000.0, 1, Classe.S),  # float interdit
        lambda: SousCommande("A", "z", ()),
        lambda: Panier(Mode.RELAIS, ()),
        lambda: Panier(Mode.RELAIS, (a(PAGNE), a(ROBE))),  # une sous-commande par boutique
    ],
)
def test_paniers_invalides(construire):
    with pytest.raises(PanierInvalide):
        construire()


def test_remise_d_un_colis_xl_en_relais_refusee():
    from belivay_moteurs.frais import remise

    with pytest.raises(PanierInvalide, match="LIV-XL-RELAIS"):
        remise(P, Mode.RELAIS, Classe.XL)
    assert remise(P, Mode.DOMICILE, Classe.XL) == 1_000


def test_xl_en_relais_autorise_sans_tarif():
    # Si le registre autorisait un jour l'XL en relais, sa remise n'existe pas : on refuse plutôt que deviner.
    from dataclasses import replace

    from belivay_moteurs.frais import remise

    with pytest.raises(PanierInvalide, match="non définie"):
        remise(replace(P, xl_interdit_en_relais=False), Mode.RELAIS, Classe.XL)


def test_donnees_en_texte_et_valeurs_refusees():
    # Les données arrivent souvent en texte (JSON, Django) : « S », « relais » sont acceptés, le reste refusé.
    assert Panier("relais", (SousCommande("A", "z", (Article("x", 1_000, 1, "S"),)),)).mode is Mode.RELAIS
    with pytest.raises(PanierInvalide, match="inconnu"):
        Article("x", 1_000, 1, "XXL")
    with pytest.raises(PanierInvalide, match="inconnu"):
        Panier("drone", (SousCommande("A", "z", (Article("x", 1_000, 1, Classe.S),)),))
    for distance in (Decimal(-1), Decimal("NaN"), Decimal("Infinity"), 3):
        with pytest.raises(PanierInvalide, match="distance invalide"):
            SousCommande("A", "z", (Article("x", 1_000, 1, Classe.S),), distance)
