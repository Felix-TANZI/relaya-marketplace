"""Plans du vendeur : Free, Boost, Pro ; prix, essai, année, paiement échoué, TVA (paquet « Espace vendeur » : PLN-01,
PLN-02, PLN-05, VD02-P04, VD02-P22, VD10-R32, REFVD-R271 ; décisions DP-55 : Q-04 ; DP-57 : A-2, A-3 ; audit C5).

- Prix : Boost 2 500 F, Pro 7 500 F par mois (VD-PLAN-BOOST, VD-PLAN-PRO) ; à l'année, 10 mois payés pour 12
  (25 000 F, 75 000 F, VD-PLAN-ANNUEL).
- Plafond de la remise du mois (VD-PLAN-REMISE-PLAFOND, A-3) : le prix du mois payé ; à l'année, prix annuel ÷ 12,
  arrondi à l'inférieur (2 083 F Boost, 6 250 F Pro) : le vendeur ne gagne jamais plus que ce qu'il paie vraiment
  chaque mois. Pendant l'essai, le prix mensuel du plan (la remise ne dépasse jamais la commission perçue ni le prix
  du plan : BelivaY ne perd rien, A-2).
- Essai (A-2, VD-PLAN-ESSAI) : un mois offert ; rappel 3 jours avant la fin, par notification ; sans premier
  paiement confirmé à la fin, retour à Free sans rien perdre.
- Paiement échoué (PLN-02, VD-PLAN-GRACE) : 7 jours de grâce, puis Free sans rien perdre.
- TVA (VD-PLAN-TVA, audit C5, à valider par le comptable) : au taux de VD-TVA, en plus du prix du plan ; la remise
  rend aussi la TVA de sa part de commission. 0 % au lancement : aucun effet sur les montants.
- La remise elle-même (5 % / 10 % de la commission du mois, restituée si une commande est remboursée) est dans
  commission.py (remise_de_plan, restitution_de_remise).
"""

from __future__ import annotations

from datetime import date, timedelta
from decimal import ROUND_FLOOR, Decimal
from enum import Enum

from .argent import francs
from .delais import ajouter_mois
from .registre import ParametresCommission

DOUZE_MOIS = 12


class PlanVendeur(str, Enum):
    FREE = "Free"
    BOOST = "Boost"
    PRO = "Pro"


class Facturation(str, Enum):
    MENSUELLE = "mensuelle"
    ANNUELLE = "annuelle"  # 10 mois payés pour 12
    ESSAI = "essai"  # un mois offert


def prix_mensuel(plan: PlanVendeur, p: ParametresCommission) -> int:
    plan = PlanVendeur(plan)
    return 0 if plan is PlanVendeur.FREE else p.plans[plan.value].prix_mensuel


def prix_annuel(plan: PlanVendeur, p: ParametresCommission) -> int:
    """« À l'année, 10 mois payés pour 12 » : Boost 25 000 F, Pro 75 000 F (VD10-R32, REFVD-R271)."""
    return prix_mensuel(plan, p) * p.annuel_mois_payes


def prix_du_mois(plan: PlanVendeur, facturation: Facturation, p: ParametresCommission) -> int:
    """Ce que le plan coûte ce mois-ci : le prix mensuel ; à l'année, prix annuel ÷ 12 (2 083 F, 6 250 F) ; 0 F
    pendant l'essai."""
    facturation = Facturation(facturation)
    if facturation is Facturation.ESSAI:
        return 0
    if facturation is Facturation.ANNUELLE:
        return francs(Decimal(prix_annuel(plan, p)) / DOUZE_MOIS)
    return prix_mensuel(plan, p)


def plafond_de_remise(plan: PlanVendeur, facturation: Facturation, p: ParametresCommission) -> int:
    """Plafond de la remise du mois (VD-PLAN-REMISE-PLAFOND ; DP-57 A-2, A-3) : prix mensuel (aussi pendant
    l'essai) ; à l'année, prix annuel ÷ 12 arrondi à l'inférieur, pour ne jamais rendre plus que le payé."""
    if Facturation(facturation) is Facturation.ANNUELLE:
        return int((Decimal(prix_annuel(plan, p)) / DOUZE_MOIS).to_integral_value(rounding=ROUND_FLOOR))
    return prix_mensuel(plan, p)


def tva_du_plan(prix: int, p: ParametresCommission) -> int:
    """TVA en plus du prix du plan, au taux de VD-TVA (VD-PLAN-TVA, audit C5) ; 0 F au lancement."""
    return francs(Decimal(prix) * p.tva_pour_cent / 100)


# ── Essai et paiement échoué ────────────────────────────────────────────────────────────────────────────


def fin_essai(debut: date, p: ParametresCommission) -> date:
    """Essai d'un mois offert (A-2) : commencé le 6 oct., fini le 6 nov. ; le 31 janv., fini le 28 févr."""
    return ajouter_mois(debut, p.essai_mois)


def rappel_essai(debut: date, p: ParametresCommission) -> date:
    """Rappel par notification 3 jours avant la fin de l'essai (PLN-05, Q-48 : pas de SMS)."""
    return fin_essai(debut, p) - timedelta(days=p.essai_rappel_jours)


def plan_apres_essai(
    plan: PlanVendeur, debut: date, jour: date, premier_paiement_confirme: bool, p: ParametresCommission
) -> PlanVendeur:
    """Pendant l'essai : le plan essayé. Après : le plan si le premier paiement est confirmé, sinon Free, sans rien
    perdre (PLN-05)."""
    if jour < fin_essai(debut, p) or premier_paiement_confirme:
        return PlanVendeur(plan)
    return PlanVendeur.FREE


def fin_de_grace(echec: date, p: ParametresCommission) -> date:
    """Paiement échoué le 6 oct. : grâce jusqu'au 13 oct. (PLN-02)."""
    return echec + timedelta(days=p.grace_jours)


def plan_apres_echec(
    plan: PlanVendeur, echec: date, jour: date, regle_depuis: bool, p: ParametresCommission
) -> PlanVendeur:
    """7 jours de grâce, puis Free sans rien perdre, sauf si le paiement a été réglé entre-temps (PLN-02)."""
    if regle_depuis or jour <= fin_de_grace(echec, p):
        return PlanVendeur(plan)
    return PlanVendeur.FREE
