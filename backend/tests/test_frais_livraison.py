# backend/tests/test_frais_livraison.py
# Tache D10 — plancher et gratuite des frais de livraison.
#
# Le document fixe trois montants que le bareme ne savait pas exprimer :
#   « Calculer les frais : 1 500 F minimum, selon la commande et la distance,
#     sans plafond. »
#   « Appliquer la livraison offerte des 50 000 F : elle couvre 1 500 F, le
#     client paie le surplus. »
#   « Facturer la livraison en relais 900 F, offerte des 30 000 F. » (D12)
#
# La part « selon la distance » n'est pas couverte ici : elle depend du
# document d'appui annonce par D10, qui n'a pas encore ete transmis.
#
# Le point auquel il faut faire attention est l'ORDRE. Le plancher dit ce que
# la livraison COUTE ; la prise en charge dit ce que BelivaY PAIE dessus.
# Inverses, une course deja offerte remonterait au plancher et l'acheteur
# paierait une livraison annoncee gratuite.

import pytest
from django.utils import timezone

from apps.payments.bridge.queries import delivery_fee_xaf
from apps.payments.config.delivery_pricing import DeliveryPricingRule

pytestmark = pytest.mark.django_db


def _bareme(mode="DELIVERY", **champs):
    valeurs = {
        "config_key": f"livraison-{mode.lower()}",
        "version": 1,
        "is_active": True,
        "valid_from": timezone.now() - timezone.timedelta(days=1),
        "name": f"Tarif {mode}",
        "delivery_mode": mode,
        "base_xaf": 1000,
        "extra_vendor_same_zone_xaf": 500,
        "extra_vendor_other_zone_xaf": 1000,
        "apply_zone_surcharge": False,
    }
    valeurs.update(champs)
    return DeliveryPricingRule.objects.create(**valeurs)


@pytest.fixture
def vendeur(django_user_model):
    return django_user_model.objects.create_user(
        username="vendeur_frais", email="vendeur.frais@example.com",
        password="Frais-2026",
    )


def _frais(vendeur, mode="DELIVERY", subtotal=0):
    return delivery_fee_xaf(
        delivery_mode=mode, vendors=[vendeur], subtotal_xaf=subtotal,
    )


# ── Le comportement d'avant ne bouge pas ─────────────────────────────────────

def test_sans_plancher_ni_seuil_le_calcul_est_celui_d_avant(vendeur):
    """Les trois champs valent 0 par defaut : un bareme existant est intact."""
    _bareme(base_xaf=1000)

    assert _frais(vendeur) == 1000


# ── Plancher (« 1 500 F minimum ») ───────────────────────────────────────────

def test_le_plancher_releve_un_calcul_trop_bas(vendeur):
    _bareme(base_xaf=1000, minimum_xaf=1500)

    assert _frais(vendeur) == 1500


def test_le_plancher_ne_rabaisse_jamais_un_calcul_plus_eleve(vendeur):
    # « sans plafond » : le plancher est un minimum, pas un forfait.
    _bareme(base_xaf=2500, minimum_xaf=1500)

    assert _frais(vendeur) == 2500


# ── Gratuite (« offerte des 50 000 F : elle couvre 1 500 F ») ────────────────

def test_sous_le_seuil_rien_n_est_pris_en_charge(vendeur):
    _bareme(base_xaf=1500, free_from_subtotal_xaf=50_000, free_covers_xaf=1500)

    assert _frais(vendeur, subtotal=49_999) == 1500


def test_au_seuil_la_prise_en_charge_s_applique(vendeur):
    _bareme(base_xaf=1500, free_from_subtotal_xaf=50_000, free_covers_xaf=1500)

    assert _frais(vendeur, subtotal=50_000) == 0


def test_le_client_paie_le_surplus_au_dela_de_la_prise_en_charge(vendeur):
    """
    Le coeur de la regle : « elle couvre 1 500 F, le client paie le surplus ».
    Une livraison a 2 500 F sur une commande de 60 000 F laisse 1 000 F a
    l'acheteur — et non la gratuite totale.
    """
    _bareme(base_xaf=2500, free_from_subtotal_xaf=50_000, free_covers_xaf=1500)

    assert _frais(vendeur, subtotal=60_000) == 1000


def test_la_prise_en_charge_ne_rend_jamais_un_montant_negatif(vendeur):
    _bareme(base_xaf=500, free_from_subtotal_xaf=50_000, free_covers_xaf=1500)

    assert _frais(vendeur, subtotal=80_000) == 0


# ── L'ordre plancher puis prise en charge ────────────────────────────────────

def test_le_plancher_s_applique_avant_la_prise_en_charge(vendeur):
    """
    Base 500, plancher 1 500, prise en charge 1 500, commande au-dessus du
    seuil. Dans le bon ordre : 500 -> 1 500 (plancher) -> 0 (prise en charge).
    Dans le mauvais : 500 -> 0 -> 1 500, et l'acheteur paierait une livraison
    annoncee offerte.
    """
    _bareme(base_xaf=500, minimum_xaf=1500,
            free_from_subtotal_xaf=50_000, free_covers_xaf=1500)

    assert _frais(vendeur, subtotal=50_000) == 0


# ── Retrait en relais : 900 F, offert des 30 000 F (D12) ─────────────────────

def test_le_relais_suit_son_propre_bareme(vendeur):
    _bareme(mode="PICKUP", base_xaf=900, minimum_xaf=900,
            free_from_subtotal_xaf=30_000, free_covers_xaf=900)

    assert _frais(vendeur, mode="PICKUP", subtotal=29_999) == 900
    assert _frais(vendeur, mode="PICKUP", subtotal=30_000) == 0
