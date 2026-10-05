# backend/apps/subscriptions/regles.py
# Règles de l'abonnement (CL-14 ; FF-ABONNEMENT ; CAB-43, CAB-44 ; DP-54), portées en Python pur depuis le site
# (site/src/donnees/prime.ts) : AUCUN import de Django ; les valeurs arrivent du registre (services.regles_en_vigueur).
#
# - L'abonnement offre la livraison de base (premier ramassage + remise d'un colis S en relais, ou + remise domicile) ;
#   jamais les ramassages supplémentaires, les autres remises ni le supplément XL ; même prix des produits pour tous.
# - Au-dessus du seuil de livraison offerte à tous (LIV-SEUIL-RELAIS, LIV-SEUIL-DOM), rien de plus.
# - « Illimité » : en usage normal, ABO-ILLIMITE commandes par mois (Business : la 2e valeur).
# - Prélèvement refusé : ABO-GRACE jours de grâce (l'abonnement reste actif), puis le palier Gratuit.
# - Abonnement offert : 1, 3 ou 12 mois ; 1 et 3 mois au tarif mensuel, 12 mois au tarif annuel (10 payés pour 12).
# - Cagnotte : ABO-CAGNOTTE % du sous-total produits (jamais la livraison), paliers qui l'ont seulement.
# Arrondis : au franc, moitié vers le haut (comme Math.round du site pour des montants positifs).

from dataclasses import dataclass
from decimal import ROUND_HALF_UP, Decimal

JOUR_MS = 86_400_000
DUREES_CADEAU = (1, 3, 12)
PALIERS = ("plus", "prime", "duo", "business")


def arrondi(valeur: Decimal) -> int:
    return int(Decimal(valeur).quantize(Decimal(1), rounding=ROUND_HALF_UP))


@dataclass(frozen=True)
class DefPalier:
    id: str
    nom: str
    mois: int
    an: int  # 10 mois payés pour 12
    relais_des: int
    relais_offerts: int | None  # par mois ; None : illimité en usage normal
    relais_reduction: Decimal  # 1 : livraison de base entière ; 0,5 : −50 % (Business)
    domicile_offerts: int
    domicile_des: int
    domicile_ensuite: Decimal  # réduction après les offerts (0,5 = −50 %)
    cagnotte_pour_cent: Decimal
    garde_bonus: int
    comptes: int
    parrainage: int  # mois offerts par proche
    plafond: int  # commandes par mois en usage normal


@dataclass(frozen=True)
class Pass:
    prix: int
    jours: int
    relais_des: int
    commandes: int
    delai_jours: int  # entre deux Pass (ABO-PASS7-DELAI)


@dataclass(frozen=True)
class ReglesPrime:
    paliers: dict  # id → DefPalier
    pass_: Pass
    essai: int  # premier mois de Prime (ABO-ESSAI)
    grace_jours: int
    cagnotte_jours: int  # la cagnotte non versée expire
    parrainages_par_mois: int
    base_relais: int  # premier ramassage + remise d'un colis S
    base_domicile: int  # premier ramassage + remise domicile
    seuil_relais: int
    seuil_domicile: int
    carte_frais_pour_cent: Decimal  # PAY-CARTE-FRAIS (abonnement offert payé par carte)

    def palier(self, id_: str) -> DefPalier | None:
        return self.paliers.get(id_)


@dataclass(frozen=True)
class Usage:
    relais: int = 0  # commandes servies par l'abonnement ce mois-ci
    domicile: int = 0
    total: int = 0  # commandes payées ce mois-ci


def remise_prime(r: ReglesPrime, palier: str | None, actif: bool, mode: str, sous_total: int, livraison: int, usage: Usage) -> int:
    """Remise de l'abonnement sur une commande : ce qui est retiré de la livraison calculée par le moteur de frais
    (remisePrime du site)."""
    if palier is None or not actif or livraison <= 0:
        return 0
    if sous_total >= (r.seuil_relais if mode == "relais" else r.seuil_domicile):
        return 0
    if palier == "pass":
        p = r.pass_
        if mode == "relais" and sous_total >= p.relais_des and usage.relais < p.commandes:
            return min(r.base_relais, livraison)
        return 0
    d = r.palier(palier)
    if d is None or usage.total >= d.plafond:
        return 0
    if mode == "relais":
        if sous_total < d.relais_des:
            return 0
        if d.relais_offerts is not None and usage.relais >= d.relais_offerts:
            return 0
        return min(arrondi(r.base_relais * d.relais_reduction), livraison)
    if d.domicile_offerts and sous_total >= d.domicile_des and usage.domicile < d.domicile_offerts:
        return min(r.base_domicile, livraison)
    return min(arrondi(r.base_domicile * d.domicile_ensuite), livraison)


def prix(r: ReglesPrime, palier: str, formule: str, essai_possible: bool = False) -> int:
    """Prix d'une souscription ; le premier mois de Prime au prix d'essai, une fois (ABO-ESSAI)."""
    if palier == "pass":
        return r.pass_.prix
    d = r.palier(palier)
    if d is None:
        raise ValueError(f"palier inconnu : {palier}")
    if formule == "an":
        return d.an
    return r.essai if (essai_possible and palier == "prime" and formule == "mois") else d.mois


def essai_applicable(palier: str, formule: str) -> bool:
    return palier == "prime" and formule == "mois"


def periode_jours(r: ReglesPrime, formule: str) -> int:
    return {"an": 365, "pass": r.pass_.jours}.get(formule, 30)


def prix_cadeau(d: DefPalier, mois: int) -> int:
    if mois not in DUREES_CADEAU:
        raise ValueError(f"durée de cadeau : {mois}")
    return d.an if mois == 12 else d.mois * mois


def jours_cadeau(mois: int) -> int:
    return 365 if mois == 12 else mois * 30


def fin_grace(r: ReglesPrime, echec_le_ms: int) -> int:
    return echec_le_ms + r.grace_jours * JOUR_MS


def actif(r: ReglesPrime, fin_ms: int | None, echec_le_ms: int | None, maintenant_ms: int) -> bool:
    """Période payée en cours (résilié : jusqu'à la fin ; Pass : ses jours) ; grâce finie sans paiement : Gratuit."""
    if echec_le_ms is not None and fin_grace(r, echec_le_ms) < maintenant_ms:
        return False
    return not (fin_ms is not None and fin_ms < maintenant_ms)


def depart_apres_echec(r: ReglesPrime, echec_le_ms: int | None, maintenant_ms: int) -> int:
    """Payer pendant la grâce : la période part du renouvellement refusé ; après : du jour du paiement."""
    if echec_le_ms is not None and fin_grace(r, echec_le_ms) >= maintenant_ms:
        return echec_le_ms
    return maintenant_ms


def montant_cagnotte(r: ReglesPrime, palier: str, base: int) -> int:
    d = r.palier(palier)
    if d is None or base <= 0:
        return 0
    return arrondi(Decimal(base) * d.cagnotte_pour_cent / 100)


def frais_carte(r: ReglesPrime, montant: int) -> int:
    return arrondi(Decimal(montant) * r.carte_frais_pour_cent / 100)
