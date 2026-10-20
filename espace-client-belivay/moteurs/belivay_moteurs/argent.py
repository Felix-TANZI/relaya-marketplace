"""Montants et arrondis (CAL « Arrondis », CL-01) : francs entiers ; un pourcentage d'un montant
s'arrondit au franc, moitié vers le haut ; euros au centime le plus proche ; pourcentages affichés à
l'unité. Le float est interdit, comme dans le domaine financier de relaya-marketplace."""

from __future__ import annotations

from decimal import ROUND_HALF_UP, Decimal

from .erreurs import ValeurInterdite


def decimal(valeur: int | str | Decimal) -> Decimal:
    """Convertit sans perte ; refuse float et booléen."""
    if isinstance(valeur, (bool, float)):
        raise ValeurInterdite(f"float ou booléen interdit dans un calcul d'argent : {valeur!r}")
    if isinstance(valeur, (int, str, Decimal)):
        return Decimal(valeur)
    raise ValeurInterdite(f"type non pris en charge : {type(valeur).__name__}")


def francs(valeur: Decimal) -> int:
    """Arrondit au franc, moitié vers le haut."""
    return int(decimal(valeur).quantize(Decimal(1), rounding=ROUND_HALF_UP))


def pourcentage_de(montant: int, taux_pour_cent: Decimal) -> int:
    """« 2 % × 272 579 = 5 451,58 → 5 452 F » (CL-02, calcul « frais_service », CL-08, CL-12)."""
    return francs(decimal(montant) * taux_pour_cent / 100)


def pour_cent_affiche(partie: int, total: int) -> int:
    """Pourcentage affiché à l'unité, moitié vers le haut (« barre 62 % »)."""
    if total <= 0:
        raise ValueError("total nul ou négatif")
    return francs(decimal(partie) * 100 / total)


def ecrire(montant: int) -> str:
    """Écriture d'un montant pour les traces, comme à l'écran (CCH-31) : espace insécable U+00A0 entre
    les milliers et avant « F », vrai signe moins : « 273 379 F », « −900 F »."""
    signe = "\u2212" if montant < 0 else ""
    return signe + f"{abs(montant):,}".replace(",", "\u00a0") + "\u00a0F"
