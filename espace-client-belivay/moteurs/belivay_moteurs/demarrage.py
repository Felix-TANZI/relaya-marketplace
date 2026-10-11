"""Plafond de démarrage d'un nouveau vendeur (paquet « Espace vendeur » : KYC-09, PRX-09, VD-02 p10 ; décision DP-55 :
Q-14 ; Q-63 ; DP-57 : A-7).

- Jusqu'à 10 commandes livrées sans incident, une sous-commande attribuée à ce vendeur ne dépasse pas 500 000 F
  (prix × quantité, tous ses articles de la commande) : le plafond ferme le contournement par la quantité.
- Au-delà, la quantité en trop n'est pas attribuée à ce vendeur : elle va à un autre vendeur, ou la quantité est
  limitée dans le panier (catalogue). « Ne pas attribuer de commande > 500 000 F » : 500 000 F tout juste passe.
- Incident = litige perdu, rupture, non-préparation, retour validé pour défaut (fautes déjà comptées par le Trust
  Score).
- Compteur (A-7, DP-57) : les commandes livrées sans incident, au total ; un incident ne remet pas le compteur à zéro
  (les fautes graves sont punies par les sanctions, Q-31).
- À la publication (PRX-09) : un prix unitaire au-dessus du plafond, avant 10 commandes livrées sans incident, ne se
  publie pas ; le brouillon est gardé et le champ prix le dit en une ligne (start_cap{amount, delivered_ok,
  needed}).
- Ce plafond est distinct du plafond du paiement au comptoir côté client (PAN-10) : les deux s'appliquent (Q-63).
"""

from __future__ import annotations

from collections.abc import Iterable
from dataclasses import dataclass
from enum import Enum

from .argent import ecrire
from .erreurs import OffreRefusee, VenteInvalide
from .registre import ParametresPaliers


class Incident(str, Enum):
    LITIGE_PERDU = "litige perdu"
    RUPTURE = "rupture"
    NON_PREPARATION = "non-préparation"
    RETOUR_DEFAUT = "retour validé pour défaut"


def livrees_sans_incident(commandes_livrees: Iterable[Iterable[Incident]]) -> int:
    """Nombre de commandes livrées sans aucun incident, au total (A-7) ; chaque élément = incidents d'une commande
    livrée. 9 commandes propres, un incident, puis 1 propre : 10, le plafond est levé."""
    return sum(1 for incidents in commandes_livrees if not tuple(incidents))


def plafond_actif(sans_incident: int, p: ParametresPaliers) -> bool:
    return sans_incident < p.demarrage_commandes


def quantite_attribuable(
    prix_unitaire: int, quantite: int, sans_incident: int, p: ParametresPaliers, *, deja_attribue: int = 0
) -> int:
    """Unités d'une ligne attribuables à ce vendeur dans la sous-commande, `deja_attribue` francs étant déjà pris
    par ses autres lignes. 3 téléphones à 200 000 F pour un nouveau vendeur : 2 (400 000 F), le 3e ailleurs."""
    if prix_unitaire < 1 or quantite < 1 or deja_attribue < 0:
        raise VenteInvalide("prix et quantité au moins 1, déjà attribué positif ou nul")
    if not plafond_actif(sans_incident, p):
        return quantite
    return min(quantite, max(p.plafond_demarrage - deja_attribue, 0) // prix_unitaire)


@dataclass(frozen=True)
class PlafondDeDemarrage:
    """start_cap de l'appel de calcul (PRX-09) : {amount, delivered_ok, needed}."""

    amount: int
    delivered_ok: int
    needed: int

    @property
    def actif(self) -> bool:
        return self.delivered_ok < self.needed


def plafond_de_demarrage(sans_incident: int, p: ParametresPaliers) -> PlafondDeDemarrage:
    if sans_incident < 0:
        raise VenteInvalide("compteur sans incident négatif")
    return PlafondDeDemarrage(p.plafond_demarrage, sans_incident, p.demarrage_commandes)


def verifier_prix_demarrage(prix_unitaire: int, sans_incident: int, p: ParametresPaliers) -> None:
    """PRX-09 : delivered_ok < 10 ∧ prix unitaire > 500 000 F ⇒ publication refusée, brouillon gardé (OffreRefusee
    avec la ligne du champ prix). 500 000 F tout juste se publie."""
    cap = plafond_de_demarrage(sans_incident, p)
    if cap.actif and prix_unitaire > cap.amount:
        raise OffreRefusee(
            f"prix {ecrire(prix_unitaire)} : au-dessus du plafond de démarrage de {ecrire(cap.amount)} tant que "
            f"{cap.needed} commandes ne sont pas livrées sans incident ({cap.delivered_ok} sur {cap.needed}) ; "
            "brouillon gardé (PRX-09, VD-PLAFOND-DEMARRAGE)"
        )
