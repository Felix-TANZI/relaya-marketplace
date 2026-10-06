"""Litiges, retours, remplacement et libération du vendeur (CL-09, CL-11 ; CAL-27 à CAL-29 ; CLT-24, CCY-23,
CIF-17 ; décisions DP-01, DP-10, DP-27, DP-28, DP-35).

- Remboursement automatique sous le seuil du palier du client (LIT-AUTO-STD 3 000 F, LIT-AUTO-ELEVE 10 000 F) ;
  jamais aux paliers « À instruire » et « Plafonné » (CLT-24) ; payé par BelivaY, le vendeur est payé et son
  Trust Score n'est pas touché (CCY-23). La sortie de l'automatisme (N_auto, CIF-17) est calibrée après 3 mois :
  aucune décision automatique d'ici là (DP-35).
- Le vendeur répond sous LIT-VENDEUR-H ; BelivaY décide au plus tard LIT-DECISION-H après cette échéance ; le
  client a un recours, une fois, sous 48 h après la décision ; un arrangement attend sa réponse 5 jours (DP-35).
- Retour : avec un motif (non conforme, abîmé, contrefaçon, défaut caché signalé sous RET-DEFAUT-H), dans
  RET-FENETRE après le retrait, tant que « Tout est en ordre » n'est pas touché (le client seul le touche, DP-28) ;
  un défaut caché découvert ensuite, jusqu'à 7 jours, est un litige normal (DP-35) ; le vice caché reste couvert
  RET-VICE après le retrait, même après « Tout est en ordre » (DP-27) ; pas de retour sans motif au lancement.
- Toujours un dépôt au relais : aucun remboursement sans retour (DP-10, RET-SANS-RETOUR).
- Trajet retour RET-TRAJET (500 F) à la charge de la partie en tort : retenu sur le remboursement si c'est le
  client ; si c'est le vendeur ou le transporteur, la livraison du colis est remboursée aussi, à sa charge (DP-35).
  Part de livraison d'un colis = F(commande) − F(commande sans ce colis), Off conservé, comme une annulation.
- Remboursement à la réception du retour et après inspection (RET-INSPECT-H) ; sans réponse du vendeur à la fin
  de l'inspection, il part automatiquement.
- Remplacement non expédié dans RET-REMPL-DELAI (heures ouvrées, dimanche non compté) : remboursement.
- Rupture de stock : voir catalogue.vendeur_suivant (DP-01).
- Libération du vendeur = fermeture du retour + LIB-STD (Bronze, Argent) ou LIB-OR (Or, Platine) ; carte :
  LIB-CARTE ; un litige suspend ; versement le vendredi suivant (CAL-29).
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timedelta
from enum import Enum

from .annulation import frais_de_livraison
from .frais import Panier
from .registre import ParametresLitiges, ParametresLivraison

# ── Remboursement automatique ───────────────────────────────────────────────────────────────────────────


class PalierIFA(str, Enum):
    ELEVE = "Élevé"
    STANDARD = "Standard"
    A_INSTRUIRE = "À instruire"
    PLAFONNE = "Plafonné"


def seuil_automatique(palier: PalierIFA, p: ParametresLitiges) -> int:
    return {PalierIFA.ELEVE: p.auto_eleve, PalierIFA.STANDARD: p.auto_standard}.get(palier, 0)


def remboursement_automatique(montant: int, palier: PalierIFA, p: ParametresLitiges) -> bool:
    """Sous le seuil du palier : remboursé tout de suite par BelivaY, sans dossier (CAL-27, CCY-23, CLT-24)."""
    return 0 < montant <= seuil_automatique(palier, p)


# ── Échéances d'un litige ───────────────────────────────────────────────────────────────────────────────


@dataclass(frozen=True)
class Echeances:
    reponse_vendeur: datetime
    decision_au_plus_tard: datetime


def echeances(ouverture: datetime, p: ParametresLitiges) -> Echeances:
    """LIT-3042 ouvert mer. 23 à 17 h 15 : vendeur jusqu'au ven. 25 à 17 h 15, décision au plus tard sam. 26 à 17 h 15."""
    vendeur = ouverture + timedelta(hours=p.vendeur_heures)
    return Echeances(vendeur, vendeur + timedelta(hours=p.decision_heures))


def recours_possible(decision: datetime, maintenant: datetime, recours_deja_fait: bool, p: ParametresLitiges) -> bool:
    return not recours_deja_fait and maintenant <= decision + timedelta(hours=p.recours_heures)


def fin_reponse_arrangement(proposition: datetime, p: ParametresLitiges) -> datetime:
    """Sans réponse du client à cette date, le dossier revient en examen (DP-35)."""
    return proposition + timedelta(days=p.arrangement_jours)


# ── Retour ──────────────────────────────────────────────────────────────────────────────────────────────


class Motif(str, Enum):
    NON_CONFORME = "non conforme"
    ABIME = "abîmé"
    CONTREFACON = "contrefaçon"
    DEFAUT_CACHE = "défaut caché"
    VICE_CACHE = "vice caché"


class Voie(str, Enum):
    RETOUR = "retour"  # dans la fenêtre de retour
    LITIGE = "litige normal"  # défaut caché découvert entre RET-DEFAUT-H et la fin de la fenêtre (DP-35)
    VICE_CACHE = "vice caché"  # jusqu'à RET-VICE, hors escrow, même après « Tout est en ordre » (DP-27)
    AUCUNE = "aucune"


def voie_de_retour(
    motif: Motif | None, retrait: datetime, signalement: datetime, tout_en_ordre: bool, p: ParametresLitiges
) -> Voie:
    """Quelle voie s'ouvre pour un problème signalé après le retrait (CAL-28, DP-27, DP-35)."""
    if motif is None:
        return Voie.AUCUNE  # pas de retour sans motif au lancement (DP-35)
    depuis = signalement - retrait
    if motif is Motif.VICE_CACHE:
        return Voie.VICE_CACHE if depuis <= timedelta(days=p.vice_cache_jours) else Voie.AUCUNE
    if tout_en_ordre or depuis > timedelta(days=p.fenetre_retour_jours):
        return Voie.AUCUNE
    if motif is Motif.DEFAUT_CACHE and depuis > timedelta(hours=p.defaut_cache_heures):
        return Voie.LITIGE
    return Voie.RETOUR


class PartieEnTort(str, Enum):
    CLIENT = "client"
    VENDEUR = "vendeur"
    TRANSPORTEUR = "transporteur"


@dataclass(frozen=True)
class RemboursementRetour:
    articles: int
    livraison: int  # part de livraison du colis, remboursée si le vendeur ou le transporteur est en tort
    trajet_retenu: int  # trajet retour retenu si le client est en tort
    montant: int
    trajet_a_la_charge_de: PartieEnTort


def rembourser_retour(
    prix_des_articles: int,
    en_tort: PartieEnTort,
    p: ParametresLitiges,
    *,
    commande: Panier | None = None,
    boutique: str | None = None,
    pl: ParametresLivraison | None = None,
    offert: int = 0,
) -> RemboursementRetour:
    """Remboursement d'un retour accepté, après réception et inspection (CL-11, DP-10, DP-35).
    Client en tort : 23 000 − 500 = 22 500 F. Vendeur ou transporteur en tort : articles + livraison du colis."""
    if en_tort is PartieEnTort.CLIENT:
        retenu = min(p.trajet_retour, prix_des_articles)
        return RemboursementRetour(prix_des_articles, 0, retenu, prix_des_articles - retenu, en_tort)
    livraison = 0
    if commande is not None:
        if boutique is None or pl is None:
            raise ValueError("part de livraison : il faut la boutique et les paramètres de livraison")
        sans = tuple(s for s in commande.sous_commandes if s.boutique != boutique)
        if len(sans) == len(commande.sous_commandes):
            raise ValueError(f"{boutique} : pas dans cette commande")
        reste = Panier(commande.mode, sans) if sans else None
        livraison = max(0, frais_de_livraison(commande, pl, offert) - frais_de_livraison(reste, pl, offert))
    return RemboursementRetour(prix_des_articles, livraison, 0, prix_des_articles + livraison, en_tort)


def fin_inspection(reception: datetime, p: ParametresLitiges) -> datetime:
    """Sans réponse du vendeur à cette heure, le remboursement part automatiquement."""
    return reception + timedelta(hours=p.inspection_heures)


def echeance_remplacement(debut: datetime, p: ParametresLitiges) -> datetime:
    """RET-REMPL-DELAI heures ouvrées, le dimanche ne compte pas : au-delà, sans expédition, remboursement."""
    # Compté à la seconde : un début à moins d'une minute de minuit (ex. 23 h 59 min 30 s) ne bloque plus la boucle.
    reste = p.remplacement_heures_ouvrees * 3600
    t = debut
    while reste > 0:
        if t.weekday() == 6:  # dimanche : on saute au lundi 0 h
            t = (t + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
            continue
        minuit = (t + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
        dispo = (minuit - t).total_seconds()
        pas = min(dispo, reste)
        t += timedelta(seconds=pas)
        reste -= pas
    return t


# ── Libération du vendeur ───────────────────────────────────────────────────────────────────────────────


class Palier(str, Enum):
    BRONZE = "Bronze"
    ARGENT = "Argent"
    OR = "Or"
    PLATINE = "Platine"


def fermeture_du_retour(retrait: date, tout_en_ordre_le: date | None, p: ParametresLitiges) -> date:
    """Fermeture = 7 jours après le retrait, ou le jour où le client touche « Tout est en ordre » (CAL-29)."""
    fin = retrait + timedelta(days=p.fenetre_retour_jours)
    return min(fin, tout_en_ordre_le) if tout_en_ordre_le else fin


def liberation(
    fermeture: date, palier: Palier, payee_par_carte: bool, litige_en_cours: bool, p: ParametresLitiges
) -> tuple[date, date] | None:
    """(date de libération, vendredi du versement) ; None tant qu'un litige suspend (CAL-29).
    Carte : 14 jours ; Or et Platine : 1 jour ; sinon 3 jours."""
    if litige_en_cours:
        return None
    if payee_par_carte:
        jours = p.lib_carte_jours
    elif palier in (Palier.OR, Palier.PLATINE):
        jours = p.lib_or_jours
    else:
        jours = p.lib_standard_jours
    libre = fermeture + timedelta(days=jours)
    vendredi = libre + timedelta(days=(4 - libre.weekday()) % 7)
    return libre, vendredi
