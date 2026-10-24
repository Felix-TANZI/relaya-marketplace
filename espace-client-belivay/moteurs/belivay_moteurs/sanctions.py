"""Sanctions et contrôle au ramassage du vendeur : ce qui dépend du Trust Score sans le calculer (paquet « Espace
vendeur » : SAN-01 à SAN-06, SUS-01 à SUS-03, VD04-R15, VD10-R23, REFVD-R219, CTRL-RAMASSAGE, C8 ; décisions DP-56 :
Q-31 ; DP-57 : L-1).

- Le Trust Score vient du service Scores de relaya (Q-37) : ce module lit sa valeur exacte (62,7, pas 63), il ne
  la calcule ni ne la protège (baisse de 8 points au plus par nuit, veto à 39 : relaya, VD10-R18).
- Niveaux (SAN-06) : 1 avertissement (automatique) ; 2 visibilité réduite, 14 jours ; 3 suspension ; 4 exclusion
  (fraude, contrefaçon, faux document ; liste noire). Les niveaux 2 à 4 sont proposés par le système et validés
  par une personne avec un motif écrit, contestables une fois (SAN-01, Q-31).
- Suspension proposée quand le score passe sous 40, ou après 3 non-préparations en 30 jours glissants (Q-31) ;
  elle dure jusqu'à la décision humaine, 30 jours au plus (L-1), puis période probatoire : 20 commandes contrôlées
  à 100 % au ramassage (L-1, VD04-R15).
- Contrôle au ramassage (CTRL-RAMASSAGE) : 100 % des 5 premières commandes, puis 1 sur 20 sous un Trust Score de
  70, puis 1 sur 100 ; 100 % pendant la période probatoire, et si le score passe sous 60 ou perd 8 points en une
  semaine (contrôle renforcé, L-1).
- Durées et seuils : valeurs de départ réglables en console (VD-SAN-*, VD-PROBATOIRE, VD-CTRL-RENFORCE).
"""

from __future__ import annotations

from collections.abc import Sequence
from datetime import datetime, timedelta
from decimal import Decimal
from enum import IntEnum
from fractions import Fraction

from .registre import ParametresSanctions


class Niveau(IntEnum):
    AVERTISSEMENT = 1
    VISIBILITE_REDUITE = 2
    SUSPENSION = 3
    EXCLUSION = 4


def validation_humaine(niveau: Niveau) -> bool:
    """SAN-01 : seul l'avertissement est automatique ; les niveaux 2 à 4 attendent une personne et un motif écrit."""
    return Niveau(niveau) >= Niveau.VISIBILITE_REDUITE


def fin_visibilite_reduite(debut: datetime, p: ParametresSanctions) -> datetime:
    """Niveau 2 (L-1) : « Vos offres passent après celles des autres vendeurs » pendant 14 jours."""
    return debut + timedelta(days=p.visibilite_jours)


def fin_suspension_au_plus_tard(debut: datetime, p: ParametresSanctions) -> datetime:
    """Niveau 3 (L-1) : jusqu'à la décision humaine, 30 jours au plus ; la période probatoire suit."""
    return debut + timedelta(days=p.suspension_max_jours)


def suspension_proposee(
    trust_score: Decimal, non_preparations: Sequence[datetime], maintenant: datetime, p: ParametresSanctions
) -> bool:
    """Q-31 : score sous 40, ou 3 non-préparations dans les 30 jours glissants qui finissent maintenant. Proposée
    seulement : une personne la valide (SAN-01)."""
    if Decimal(trust_score) < p.suspension_sous_score:
        return True
    debut = maintenant - timedelta(days=p.non_preparations_jours)
    return sum(1 for n in non_preparations if debut < n <= maintenant) >= p.non_preparations


def probation_finie(commandes_controlees: int, p: ParametresSanctions) -> bool:
    """Période probatoire après une suspension (L-1) : finie après 20 commandes contrôlées à 100 %."""
    return commandes_controlees >= p.probatoire_commandes


def controle_renforce(trust_score: Decimal, score_il_y_a_une_semaine: Decimal | None, p: ParametresSanctions) -> bool:
    """L-1 : contrôle à 100 % si le score passe sous 60, ou s'il a perdu 8 points ou plus en 7 jours."""
    score = Decimal(trust_score)
    if score < p.renforce_sous_score:
        return True
    return score_il_y_a_une_semaine is not None and Decimal(score_il_y_a_une_semaine) - score >= (
        p.renforce_baisse_points
    )


def frequence_de_controle(
    commandes_ramassees: int,
    trust_score: Decimal,
    p: ParametresSanctions,
    *,
    en_probation: bool = False,
    renforce: bool = False,
) -> Fraction:
    """Part des commandes contrôlées au ramassage (CTRL-RAMASSAGE, SAN-03, L-1) : 1 (100 %) pour les 5 premières,
    en période probatoire ou en contrôle renforcé ; 1/20 sous un Trust Score de 70 ; 1/100 sinon. Tonton PG (62,7,
    7 commandes) : 1 sur 20 ; à 70 : 1 sur 100 (« À partir de 70 de Trust Score »)."""
    if commandes_ramassees < 0:
        raise ValueError("nombre de commandes négatif")
    if en_probation or renforce or commandes_ramassees < p.controle_premieres:
        return Fraction(1)
    if Decimal(trust_score) < p.controle_seuil_score:
        return Fraction(1, p.controle_sous_seuil)
    return Fraction(1, p.controle_ensuite)
