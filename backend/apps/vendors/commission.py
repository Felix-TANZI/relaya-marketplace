# backend/apps/vendors/commission.py
#
# Barème officiel de commission M01 — source : espace_vendeur_synthese_detail/
# batch3_R3_VD02.md, section "VD-02 — Données, argent, calculs, droits et API".
# Les chiffres (tranches, taux, multiplicateurs, plancher) sont recopiés à
# l'identique du document ; voir les notes ci-dessous pour les deux zones
# d'ambiguïté que le document signale lui-même comme non résolues (VD-D03.A01,
# VD-D03.Q05).
#
# Statut des règles (tel que documenté) :
#   - Tranches + planchers (700 F / 2 % / marge minimale)       -> Décidé (D)
#   - Multiplicateurs de palier (Bronze/Argent/Or/Platine)      -> Décidé (D)
#   - Offre de découverte (×0,80)                               -> Proposé/Recommandé (R)
#   - Barème de taux par famille lui-même                       -> Proposé (P) en console
#
# Toutes les valeurs "Proposées" sont implémentées telles quelles pour
# l'instant (consigne de la mission), modifiables plus tard depuis la console.

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional

# ── Familles et tranches (document VD-02) ───────────────────────────────────
#
# "Tranches familles A, B, D : 0-20 000 / 20 000-100 000 / 100 000-500 000 /
#  au-delà. Tranches familles C, E : 0-10 000 / 10 000-50 000 / au-delà. Sans
#  plafond."
#
# Taux par tranche, palier Bronze (taux "de référence", les autres paliers
# appliquent un multiplicateur global, voir TIER_MULTIPLIERS) :
#   Famille A (Gros tickets : Électronique, Électroménager) : 13,5 % / 5 % / 2,5 % / 2 %
#   Famille B (Marges larges : Mode, Beauté)                : 23,5 % / 18,5 % / 13,5 %
#   Famille C (Fréquence : Supermarché, Frais & Premium)    : 7,5 % / 6 % / 5 %
#   Famille D (Marges moyennes : Maison, Sport, Bébé, Animaux) : 15 % / 11,5 % / 8,5 %
#   Famille E (Petits prix : Livres & Médias)                : 12,5 % / 9 %
#
# NOTE (limite documentée, non inventée) : le document ne donne que 3 taux
# pour B et D (qui ont 4 tranches) et 2 taux pour E (qui a 3 tranches). Comme
# le barème est explicitement "sans plafond", on applique ici le dernier taux
# documenté à toute(s) tranche(s) suivante(s) non chiffrée(s) — c'est
# l'interprétation la plus proche du texte, mais ce n'est pas écrit noir sur
# blanc dans le document source. Famille A et C, elles, sont intégralement
# chiffrées (4 et 3 taux respectivement) et ne souffrent d'aucune ambiguïté.

FAMILY_TRANCHES: dict[str, list[tuple[int, Optional[int], float]]] = {
    # (borne_basse, borne_haute_exclue_ou_None, taux_bronze)
    "A": [(0, 20_000, 0.135), (20_000, 100_000, 0.05), (100_000, 500_000, 0.025), (500_000, None, 0.02)],
    "B": [(0, 20_000, 0.235), (20_000, 100_000, 0.185), (100_000, 500_000, 0.135), (500_000, None, 0.135)],
    "C": [(0, 10_000, 0.075), (10_000, 50_000, 0.06), (50_000, None, 0.05)],
    "D": [(0, 20_000, 0.15), (20_000, 100_000, 0.115), (100_000, 500_000, 0.085), (500_000, None, 0.085)],
    "E": [(0, 10_000, 0.125), (10_000, 50_000, 0.09), (50_000, None, 0.09)],
}

# Multiplicateurs de palier (Décidé) — VD-02 §"Commission".
TIER_MULTIPLIERS: dict[str, float] = {
    "bronze": 1.0,
    "argent": 0.85,
    "or": 0.70,
    "platine": 0.60,
}

# Offre de découverte (Recommandé) : ×0,80 pendant min(3 mois ; 50 commandes
# encaissées et non remboursées) — la fenêtre elle-même est gérée par
# l'appelant (le vendeur y est éligible ou non) ; cette fonction ne fait
# qu'appliquer le multiplicateur quand on lui dit que l'offre s'applique.
DISCOVERY_MULTIPLIER = 0.80

# Plancher (Décidé) : com_commande = MAX(700 F, 2% du prix, marge minimale, Σ com_article)
FLOOR_FLAT_XAF = 700
FLOOR_PERCENT = 0.02
MIN_MARGIN_FLAT_XAF = 200
MIN_MARGIN_PERCENT = 0.005


@dataclass(frozen=True)
class CommissionResult:
    """Résultat du calcul — tout est exprimé en francs CFA, arrondi à l'unité."""

    price_xaf: int
    family: str
    tier: str
    is_discovery_offer: bool
    base_rate_commission_xaf: int  # Σ com_article avant plancher, arrondi
    commission_xaf: int            # com_commande final (après plancher), arrondi
    kept_xaf: int                  # "vous gardez" = price - commission
    effective_rate: float          # commission_xaf / price_xaf (0 si price_xaf == 0)
    floor_applied: bool            # True si le plancher (700F/2%/marge) a été utilisé au lieu de Σ com_article


def _bronze_tranche_amount(price_xaf: int, family: str) -> float:
    """Σ tranches (taux × part du prix) au palier Bronze, avant tout multiplicateur."""
    tranches = FAMILY_TRANCHES[family]
    total = 0.0
    for low, high, rate in tranches:
        if price_xaf <= low:
            break
        upper = price_xaf if high is None else min(price_xaf, high)
        part = upper - low
        if part > 0:
            total += part * rate
    return total


def calculate_commission(
    price_xaf: int,
    family: str,
    tier: str,
    is_discovery_offer: bool = False,
) -> CommissionResult:
    """
    Calcule la commission officielle M01 pour un article au prix `price_xaf`.

    `family` : 'A' | 'B' | 'C' | 'D' | 'E' (voir FAMILY_TRANCHES).
    `tier`   : 'bronze' | 'argent' | 'or' | 'platine' (voir TIER_MULTIPLIERS).
    `is_discovery_offer` : True si le vendeur est encore dans sa fenêtre
        "offre de découverte" (min(3 mois, 50 commandes) depuis la 1ère
        commande payée) — le contrôle de la fenêtre elle-même est fait par
        l'appelant, pas par cette fonction pure.

    Retourne un CommissionResult. Ne lève pas pour un prix à 0 (renvoie une
    commission au plancher de 700 F, comme le barème l'impose).
    """
    family = family.upper()
    tier = tier.lower()
    if family not in FAMILY_TRANCHES:
        raise ValueError(f"Famille de commission inconnue: {family!r} (attendu: A, B, C, D, E)")
    if tier not in TIER_MULTIPLIERS:
        raise ValueError(f"Palier inconnu: {tier!r} (attendu: bronze, argent, or, platine)")
    if price_xaf < 0:
        raise ValueError("price_xaf doit être positif ou nul")

    base = _bronze_tranche_amount(price_xaf, family)
    multiplier = TIER_MULTIPLIERS[tier]
    if is_discovery_offer:
        multiplier *= DISCOVERY_MULTIPLIER

    sigma_com_article = base * multiplier

    floor_flat = FLOOR_FLAT_XAF
    floor_percent = price_xaf * FLOOR_PERCENT
    min_margin = max(MIN_MARGIN_FLAT_XAF, price_xaf * MIN_MARGIN_PERCENT)

    commission_raw = max(floor_flat, floor_percent, min_margin, sigma_com_article)
    commission_xaf = round(commission_raw)
    base_rate_commission_xaf = round(sigma_com_article)
    floor_applied = commission_xaf > base_rate_commission_xaf

    kept_xaf = price_xaf - commission_xaf
    effective_rate = (commission_xaf / price_xaf) if price_xaf else 0.0

    return CommissionResult(
        price_xaf=price_xaf,
        family=family,
        tier=tier,
        is_discovery_offer=is_discovery_offer,
        base_rate_commission_xaf=base_rate_commission_xaf,
        commission_xaf=commission_xaf,
        kept_xaf=kept_xaf,
        effective_rate=effective_rate,
        floor_applied=floor_applied,
    )
