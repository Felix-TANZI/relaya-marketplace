"""Paliers du vendeur : Bronze, Argent, Or, Platine (paquet « Espace vendeur » : VD-10 PAL-01, PAL-02, C4, TRU-07,
ACC-15, ACC-25, SAN-02 ; décisions DP-21, DP-55 : Q-10 ; DP-57 : A-5, A-6).

- Conditions (VD-PAL-ARGENT, OR, PLATINE) : Trust Score, commandes livrées et non remboursées (Q-10), note moyenne,
  visite physique (Or), audit trimestriel (Platine). Bronze : KYC validé (hors de ce module). Un palier demande
  aussi les conditions des paliers inférieurs (Platine = Or + Trust Score 90 + audit) : décidé par DP-57 (A-6).
- Montée (C4, VD-PAL-MONTEE) : conditions tenues 14 jours de suite.
- Descente (DP-21, VD-PAL-DESCENTE, DP-57 A-5) : Trust Score sous le seuil du palier (pas « seuil − 5 » de VD-10)
  14 jours de suite ; le serveur la propose, une personne la valide avec un motif (TRU-07, SAN-01). « Platine tenu
  6 mois » est remplacé par les 14 jours (DP-21).
- Alerte avant un seuil (ACC-25, SAN-02, VD-ALERTE-SEUIL ; A-5) : à 3 points ou moins du seuil du palier suivant
  (montée) ou du seuil du palier actuel (descente, et non plus « seuil − 5 ») ; une fois par seuil et par semaine ;
  les points affichés se comptent sur le score arrondi, comme dans Mon palier.
- Palier de lancement (ACC-15, Q-10) : pendant 2 mois après la signature, selon les produits actifs (en ligne,
  stock > 0) : Argent dès 15, Or dès 40, Platine dès 80. Il ne donne que le multiplicateur de commission (le
  meilleur des deux paliers) ; la libération de l'argent suit le palier du Trust Score.
- Le Trust Score lui-même vient du service Scores (Q-37) : ce module ne le calcule pas, il le lit (valeur exacte à
  une décimale, 62,7 et non 63).
"""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass
from datetime import date, timedelta
from decimal import ROUND_HALF_UP, Decimal
from enum import Enum
from itertools import pairwise

from .delais import ajouter_mois
from .registre import ParametresPaliers


class Palier(str, Enum):
    """Paliers du vendeur (PAL-01 ; Diamant supprimé, DP-56 Q-52). Aussi lu par litiges.py, commission.py et
    versements.py (une seule définition)."""

    BRONZE = "Bronze"
    ARGENT = "Argent"
    OR = "Or"
    PLATINE = "Platine"


ORDRE = tuple(Palier)  # Bronze < Argent < Or < Platine


def _rang(palier: Palier) -> int:
    return ORDRE.index(Palier(palier))


@dataclass(frozen=True)
class EtatDuJour:
    """Relevé quotidien du vendeur (recalcul de la nuit)."""

    jour: date
    trust_score: Decimal  # valeur exacte du service Scores
    commandes_livrees: int  # livrées et non remboursées (Q-10)
    note: Decimal  # note moyenne des avis
    visite: bool = False  # visite physique de la boutique faite et réussie (Or)
    audit: bool = False  # audit trimestriel à jour et réussi (Platine)


def palier_atteint(e: EtatDuJour, p: ParametresPaliers) -> Palier:
    """Palier le plus haut dont toutes les conditions, et celles des paliers inférieurs, sont tenues ce jour-là."""
    atteint = Palier.BRONZE
    for palier in ORDRE[1:]:
        c = p.conditions[palier.value]
        if not (
            e.trust_score >= c.trust_score
            and e.commandes_livrees >= c.commandes_livrees
            and e.note >= c.note
            and (e.visite or not c.visite)
            and (e.audit or not c.audit)
        ):
            break
        atteint = palier
    return atteint


@dataclass(frozen=True)
class Evolution:
    montee: Palier | None  # palier gagné : conditions tenues 14 jours de suite (C4)
    descente_proposee: Palier | None  # à valider par une personne (TRU-07) ; DP-21


def evolution(actuel: Palier, historique: Sequence[EtatDuJour], p: ParametresPaliers) -> Evolution:
    """Montée ou descente proposée, d'après les relevés quotidiens qui finissent aujourd'hui (jours consécutifs)."""
    actuel = Palier(actuel)
    for avant, apres in pairwise(historique):
        if apres.jour - avant.jour != timedelta(days=1):
            raise ValueError("relevés quotidiens : un jour manque ou se répète")
    montee = None
    fenetre = historique[-p.montee_jours :]
    if len(fenetre) == p.montee_jours:
        tenu = min((palier_atteint(e, p) for e in fenetre), key=_rang)
        if _rang(tenu) > _rang(actuel):
            montee = tenu
    descente = None
    fenetre = historique[-p.descente_jours :]
    if actuel is not Palier.BRONZE and len(fenetre) == p.descente_jours:
        seuil = p.conditions[actuel.value].trust_score
        if all(e.trust_score < seuil for e in fenetre):
            descente = palier_atteint(fenetre[-1], p)
    return Evolution(montee, descente)


def palier_de_lancement(signature: date, jour: date, produits_actifs: int, p: ParametresPaliers) -> Palier | None:
    """Palier selon les produits actifs, jusqu'à 2 mois après la signature (ACC-15) ; None ensuite."""
    if jour > ajouter_mois(signature, p.lancement_mois):
        return None
    lancement = Palier.BRONZE
    for palier in ORDRE[1:]:
        if produits_actifs >= p.lancement_produits[palier.value]:
            lancement = palier
    return lancement


@dataclass(frozen=True)
class PaliersEffectifs:
    commission: Palier  # multiplicateur de commission : le meilleur des deux (Q-10)
    liberation: Palier  # vitesse de libération : le palier du Trust Score seul (Q-10, DP-21)


def paliers_effectifs(
    palier_trust: Palier, signature: date, jour: date, produits_actifs: int, p: ParametresPaliers
) -> PaliersEffectifs:
    """Vendeur Bronze (Trust Score 62) avec 45 produits actifs, en lancement : commission au palier Or (ITEL hors
    découverte : 18 110 F gardés au lieu de 17 300 F), libération Bronze à 3 jours."""
    palier_trust = Palier(palier_trust)
    lancement = palier_de_lancement(signature, jour, produits_actifs, p)
    commission = palier_trust if lancement is None else max(palier_trust, lancement, key=_rang)
    return PaliersEffectifs(commission, palier_trust)


# ── Alerte avant un seuil ───────────────────────────────────────────────────────────────────────────────


@dataclass(frozen=True)
class Alerte:
    """Carte « près d'un seuil » de l'accueil (ACC-25) et événement score.threshold_near (SAN-02, sans bouton
    « Contester »)."""

    sens: str  # « montée » ou « descente »
    palier_vise: Palier  # palier suivant (montée) ; palier actuel à garder (descente)
    seuil: int
    points_affiches: int  # « Plus que 2 points » : seuil − score arrondi (moitié vers le haut), jamais sous 0


def _arrondi(score: Decimal) -> int:
    return int(Decimal(score).quantize(Decimal(1), rounding=ROUND_HALF_UP))


def alerte_de_seuil(actuel: Palier, trust_score: Decimal, p: ParametresPaliers) -> Alerte | None:
    """ACC-25 corrigé par DP-57 (A-5) : montée si 0 < seuil suivant − score ≤ 3 ; descente si 0 ≤ score − seuil du
    palier ≤ 3 (le seuil de descente est le seuil du palier, comme VD-PAL-DESCENTE). Bronze 62,7 : « Plus que 2
    points » pour Argent (65 − 63). Argent 66 : descente possible sous 65. La montée l'emporte si les deux se
    présentent (seuils écartés de moins de 6 points)."""
    actuel = Palier(actuel)
    score = Decimal(trust_score)
    rang = _rang(actuel)
    if rang + 1 < len(ORDRE):
        suivant = ORDRE[rang + 1]
        seuil = p.conditions[suivant.value].trust_score
        if 0 < seuil - score <= p.alerte_ecart_points:
            return Alerte("montée", suivant, seuil, max(seuil - _arrondi(score), 0))
    if actuel is not Palier.BRONZE:
        seuil = p.conditions[actuel.value].trust_score
        if 0 <= score - seuil <= p.alerte_ecart_points:
            return Alerte("descente", actuel, seuil, max(_arrondi(score) - seuil, 0))
    return None


def alerte_a_envoyer(
    alerte: Alerte | None, derniere_pour_ce_seuil: date | None, jour: date, p: ParametresPaliers
) -> bool:
    """Une fois par seuil et par semaine (SAN-02, VD-ALERTE-SEUIL) : rien si la même alerte (même seuil) est partie
    il y a moins de 7 jours."""
    if alerte is None:
        return False
    return derniere_pour_ce_seuil is None or jour - derniere_pour_ce_seuil >= timedelta(days=p.alerte_frequence_jours)
