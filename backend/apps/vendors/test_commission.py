# backend/apps/vendors/test_commission.py
#
# Vérifie calculate_commission() contre les exemples chiffrés du document
# source (espace_vendeur_synthese_detail/batch3_R3_VD02.md, "Vérification
# chiffrée sur le jeu d'essai").
#
# IMPORTANT — limite connue et documentée par le document source lui-même
# (VD-D03.A01 / VD-D03.Q05, "point ouvert p6") : le barème seul ne reproduit
# PAS exactement 3 des valeurs de référence du jeu d'essai (iPhone 15 Pro Max,
# pagne, panier Supermarché) — le document donne à la fois la valeur "vraie"
# (14 676 F / 16 400 F / 2 011 F) ET la valeur que le barème seul recalcule
# (12 950 F ou 10 360 F / 16 540 F / 1 950 F), sans expliquer l'écart. Les
# tests ci-dessous vérifient donc que notre implémentation reproduit fidèlement
# le barème documenté (donc les valeurs "barème seul"), pas les valeurs de
# référence non reproductibles — inventer un correctif non documenté serait
# contraire à la consigne "reprends les chiffres EXACTS, ne les invente pas".

from django.test import SimpleTestCase

from apps.vendors.commission import calculate_commission


class CommissionM01Tests(SimpleTestCase):

    def test_itel_ac52_20000_bronze_no_discovery(self):
        """ITEL AC52 20 000 F, famille A (Électronique), Bronze, hors offre découverte.

        Sans offre de découverte : Σ com_article = 20 000 × 13,5 % = 2 700 F
        (tranche 0-20 000 en entier). C'est strictement supérieur au plancher
        (700 F / 2 % / marge minimale), donc la commission = 2 700 F.
        """
        result = calculate_commission(20_000, "A", "bronze", is_discovery_offer=False)
        self.assertEqual(result.commission_xaf, 2_700)
        self.assertEqual(result.kept_xaf, 17_300)
        self.assertFalse(result.floor_applied)

    def test_itel_ac52_20000_bronze_with_discovery_offer(self):
        """Même article, avec l'offre de découverte active (×0,80) — c'est la
        situation exacte du jeu d'essai documenté ("boutique Tonton PG",
        offre de découverte active) : 2 700 × 0,80 = 2 160 F, gardé 17 840 F —
        ces deux chiffres correspondent exactement au document.
        """
        result = calculate_commission(20_000, "A", "bronze", is_discovery_offer=True)
        self.assertEqual(result.commission_xaf, 2_160)
        self.assertEqual(result.kept_xaf, 17_840)

    def test_itel_ac52_20000_argent_with_discovery_offer(self):
        """Palier Argent (×0,85) cumulé à l'offre de découverte (×0,80) :
        2 700 × 0,80 × 0,85 = 1 836 F, gardé 18 164 F — conforme au document.
        """
        result = calculate_commission(20_000, "A", "argent", is_discovery_offer=True)
        self.assertEqual(result.commission_xaf, 1_836)
        self.assertEqual(result.kept_xaf, 18_164)

    def test_phone_150000_bronze_matches_document(self):
        """Téléphone 150 000 F, famille A, Bronze, hors offre : le document
        donne 7 950 F (5,3 %) -> gardé 142 050 F, et ce cas EST reproduit
        exactement par le barème (contrairement à l'iPhone 350 000 F ci-dessous).
        """
        result = calculate_commission(150_000, "A", "bronze", is_discovery_offer=False)
        self.assertEqual(result.commission_xaf, 7_950)
        self.assertEqual(result.kept_xaf, 142_050)

    def test_iphone_350000_bronze_barème_seul(self):
        """iPhone 15 Pro Max 350 000 F, famille A, Bronze, hors offre.

        Référence documentée du jeu d'essai : 14 676 F (4,2 %) -> gardé 335 324 F.
        Barème seul (notre implémentation, fidèle aux tranches/taux documentés) :
        20 000×13,5% + 80 000×5% + 250 000×2,5% = 2 700 + 4 000 + 6 250 = 12 950 F.
        Le document lui-même signale cet écart comme un point ouvert non résolu
        (VD-D03.A01) — voir le docstring du module.
        """
        result = calculate_commission(350_000, "A", "bronze", is_discovery_offer=False)
        self.assertEqual(result.commission_xaf, 12_950)
        self.assertEqual(result.kept_xaf, 337_050)

    def test_chargeur_5000_below_floor(self):
        """Article à 5 000 F (sous le plancher) : Σ com_article (famille E,
        12,5 % sur 5 000 F = 625 F) est inférieur au plancher de 700 F, donc
        la commission plancher s'applique -> 700 F (14 %), gardé 4 300 F —
        exactement l'exemple "chargeur 5 000 F -> plancher 700 F (14 %) -> 4 300 F"
        du document.
        """
        result = calculate_commission(5_000, "E", "bronze", is_discovery_offer=False)
        self.assertEqual(result.commission_xaf, 700)
        self.assertEqual(result.kept_xaf, 4_300)
        self.assertTrue(result.floor_applied)
        self.assertAlmostEqual(result.effective_rate, 0.14, places=4)

    def test_unknown_family_raises(self):
        with self.assertRaises(ValueError):
            calculate_commission(10_000, "Z", "bronze")

    def test_unknown_tier_raises(self):
        with self.assertRaises(ValueError):
            calculate_commission(10_000, "A", "diamant")
