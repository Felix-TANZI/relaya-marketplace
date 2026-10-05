# backend/apps/extras/regles.py
# Règles des modules CL-15, portées en Python pur depuis le site (DP-54) : mise de côté (site/src/donnees/cote.ts),
# reprise d'un ancien téléphone (troc.ts), panier famille (famille.ts). Sans Django ; testées seules
# (tests/test_regles.py) avec les exemples du site. Les valeurs viennent du registre (MDC-*, FAM-*, TRC-*), passées
# en paramètres ; celles qui n'y sont pas encore sont des constantes nommées en tête de apps/extras/services.py.

from __future__ import annotations

import math
from dataclasses import dataclass

JOUR_MS = 86_400_000


# ── Mise de côté (EX-03) ───────────────────────────────────────────────────────────────────────────────
# Réserver un article avec un acompte, puis payer en plusieurs fois, sans intérêts ni frais ; rien n'est remis avant
# le dernier versement. Dès MDC-PRIX-MIN de prix livré ; acompte MDC-ACOMPTE au moins (arrondi au franc supérieur) ;
# versements toutes les 2 semaines ou chaque mois, versement_min au moins chacun, fin dans MDC-DUREE au plus ; le
# dernier absorbe l'arrondi ; le total égale le prix livré. Annulation (ou grâce MDC-GRACE dépassée) : versements
# rendus moins un forfait (MDC-FORFAIT : 5 % du prix, 5 000 F au plus) qui revient au vendeur.


@dataclass(frozen=True)
class ReglesCote:
    minimum: int  # MDC-PRIX-MIN
    acompte_pour_cent: int  # MDC-ACOMPTE
    versement_min: int  # à ajouter au registre : MDC-VERSEMENT-MIN
    jours_max: int  # MDC-DUREE
    grace: int  # MDC-GRACE
    forfait_pour_cent: int  # MDC-FORFAIT
    forfait_max: int  # MDC-FORFAIT
    avant_rentree: int  # à ajouter au registre : MDC-AVANT-RENTREE-J


PAS_JOURS = {"2sem": 14, "mois": 30}


def plan_cote(prix_livre: int, rythme: str, debut: int, r: ReglesCote, jours: int | None = None) -> list[dict]:
    """[{du, le}] : l'acompte d'abord (le = debut), puis les versements."""
    acompte = -(-prix_livre * r.acompte_pour_cent // 100)  # arrondi au franc supérieur
    reste = prix_livre - acompte
    pas = PAS_JOURS[rythme]
    n_max = min(r.jours_max, r.jours_max if jours is None else jours) // pas
    n = max(1, min(n_max, reste // r.versement_min))
    part = -(-reste // n)
    v = [{"du": acompte, "le": debut}]
    for i in range(1, n + 1):
        v.append({"du": part if i < n else reste - part * (n - 1), "le": debut + i * pas * JOUR_MS})
    return v


def forfait_cote(prix_livre: int, r: ReglesCote) -> int:
    return min(r.forfait_max, (prix_livre * r.forfait_pour_cent * 2 + 100) // 200)  # Math.round, moitié vers le haut


def plan_cote_rentree(prix_livre: int, rythme: str, debut: int, rentree_le: int, r: ReglesCote) -> list[dict] | None:
    """Liste de rentrée entière (CRS-16) : un seul achat ; dernier versement avant_rentree jours avant la rentrée ;
    trop près pour un seul versement de ce rythme : None (payer en une fois)."""
    if prix_livre < r.minimum:
        return None
    jours = math.floor((rentree_le - r.avant_rentree * JOUR_MS - debut) / JOUR_MS)
    if jours < PAS_JOURS[rythme]:
        return None
    return plan_cote(prix_livre, rythme, debut, r, jours)


def annulation_cote(payes: int, prix_livre: int, r: ReglesCote) -> dict:
    """{rembourse, forfait} : le forfait ne dépasse jamais ce qui a été payé."""
    f = min(forfait_cote(prix_livre, r), payes)
    return {"rembourse": payes - f, "forfait": f}


# ── Reprise d'un ancien téléphone (EX-04) ──────────────────────────────────────────────────────────────
# Un reconditionneur partenaire estime et paie la reprise (BelivaY n'achète rien). Estimation : cote du modèle et
# état déclaré ; minimum = min_pour_cent du maximum ; arrondi à 500 F. Compte Google et code de verrouillage retirés,
# sinon pas de reprise.

COEFFICIENTS_ETAT = {"eteint": (2, 5), "rayures": (9, 10), "fissure": (7, 10), "batterie": (85, 100), "coque": (95, 100)}


def _arrondi(x_num: int, x_den: int, pas: int) -> int:
    """round(x / pas) × pas, moitié vers le haut, en entiers (x = x_num / x_den)."""
    return ((2 * x_num + pas * x_den) // (2 * pas * x_den)) * pas


def estimer(cote: int | None, declare: dict, min_pour_cent: int = 78, pas: int = 500) -> dict | None:
    if cote is None or not declare.get("compteRetire") or not declare.get("codeRetire"):
        return None
    num, den = cote, 1
    facteurs = []
    if not declare.get("allume", True):
        facteurs.append(COEFFICIENTS_ETAT["eteint"])
    if declare.get("ecran") == "rayures":
        facteurs.append(COEFFICIENTS_ETAT["rayures"])
    if declare.get("ecran") == "fissure":
        facteurs.append(COEFFICIENTS_ETAT["fissure"])
    if not declare.get("batterie", True):
        facteurs.append(COEFFICIENTS_ETAT["batterie"])
    if declare.get("coque") == "abimee":
        facteurs.append(COEFFICIENTS_ETAT["coque"])
    for a, b in facteurs:
        num, den = num * a, den * b
    maximum = _arrondi(num, den, pas)
    return {"min": _arrondi(maximum * min_pour_cent, 100, pas), "max": maximum}


# ── Panier famille (EX-05) ─────────────────────────────────────────────────────────────────────────────
# FAM-POIDS-MAX par article ; le colis prend la classe de son poids (S ≤ 5 kg, M ≤ 15 kg, L ≤ 30 kg) ; au-delà,
# jamais en XL : le panier se partage.


def classe_famille(poids_g: int, seuils_kg: tuple[int, int, int] = (5, 15, 30)) -> str | None:
    s, m, lmax = seuils_kg
    if poids_g <= s * 1000:
        return "S"
    if poids_g <= m * 1000:
        return "M"
    if poids_g <= lmax * 1000:
        return "L"
    return None  # trop lourd : jamais de colis XL
