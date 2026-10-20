"""Moteur de frais du panier (CL-07 ; CAL-06 à CAL-11 ; décisions DP-07, DP-18, DP-19, DP-25).

    S     = Σ P(v) × q                                    sous-total produits, base de tous les seuils
    Ram   = Σ_zones [R + (n_z − 1) × R′]                  une boutique au plein tarif par zone
    Rem   = Σ_colis remise(mode, classe du colis)         par colis (DP-18, DP-19) ; L : 600 F (DP-25)
    Off   = R + remise(mode, colis S)  si S ≥ Seuil(mode)  la livraison offerte couvre le tarif d'un colis S
    Suppl = Σ_colis supplément(classe)                    M, L : 0 F ; XL : selon la distance (DP-07)
    Total = S + Ram + Rem + Suppl − Off

Une sous-commande par boutique, qui devient un colis (CCY-15). Classe du colis : la plus grande classe
de ses articles (S < M < L < XL < hors gabarit), DP-46. Distance du supplément XL : de la boutique au
domicile du client (DP-46).
"""

from __future__ import annotations

from collections import OrderedDict
from dataclasses import dataclass, field
from decimal import Decimal
from enum import Enum

from .argent import ecrire, pour_cent_affiche
from .erreurs import PanierInvalide
from .registre import ParametresLivraison


class Mode(str, Enum):
    RELAIS = "relais"
    DOMICILE = "domicile"


class Classe(str, Enum):
    """Classes de colis du client ; l'ordre de déclaration est l'ordre de taille."""

    S = "S"
    M = "M"
    L = "L"
    XL = "XL"
    HG = "HG"  # hors gabarit

    @property
    def rang(self) -> int:
        return list(Classe).index(self)


def _enum(type_, valeur, quoi: str):
    try:
        return type_(valeur)
    except ValueError:
        raise PanierInvalide(f"{quoi} : {type_.__name__.lower()} inconnu(e) {valeur!r}") from None


@dataclass(frozen=True)
class Article:
    produit: str
    prix: int  # prix actuel de l'offre attribuée, francs entiers
    quantite: int
    classe: Classe

    def __post_init__(self) -> None:
        # Les données arrivent souvent en texte (JSON, Django) : « S » devient Classe.S, le reste est refusé.
        object.__setattr__(self, "classe", _enum(Classe, self.classe, self.produit))
        if isinstance(self.prix, bool) or not isinstance(self.prix, int) or self.prix < 0:
            raise PanierInvalide(f"{self.produit} : prix invalide {self.prix!r}")
        if isinstance(self.quantite, bool) or not isinstance(self.quantite, int) or self.quantite < 1:
            raise PanierInvalide(f"{self.produit} : quantité invalide {self.quantite!r}")


@dataclass(frozen=True)
class SousCommande:
    """Une boutique du panier : elle devient un colis (CCY-15)."""

    boutique: str
    zone: str  # zone de ramassage de la boutique
    articles: tuple[Article, ...]
    # Distance de la livraison à domicile, en km (LIV-SUPPL-XL) ; nécessaire seulement pour un colis XL.
    distance_domicile_km: Decimal | None = None

    def __post_init__(self) -> None:
        if not self.articles:
            raise PanierInvalide(f"{self.boutique} : sous-commande sans article")
        d = self.distance_domicile_km
        if d is not None and (not isinstance(d, Decimal) or not d.is_finite() or d < 0):
            raise PanierInvalide(f"{self.boutique} : distance invalide {d!r} (Decimal positif ou nul attendu)")

    @property
    def classe_colis(self) -> Classe:
        return max((a.classe for a in self.articles), key=lambda c: c.rang)

    @property
    def sous_total(self) -> int:
        return sum(a.prix * a.quantite for a in self.articles)


@dataclass(frozen=True)
class Panier:
    mode: Mode
    sous_commandes: tuple[SousCommande, ...]

    def __post_init__(self) -> None:
        object.__setattr__(self, "mode", _enum(Mode, self.mode, "panier"))
        if not self.sous_commandes:
            raise PanierInvalide("panier vide")
        boutiques = [sc.boutique for sc in self.sous_commandes]
        if len(set(boutiques)) != len(boutiques):
            raise PanierInvalide("une boutique apparaît deux fois : une seule sous-commande par boutique (CCY-15)")


@dataclass(frozen=True)
class FraisPanier:
    sous_total: int  # S
    ramassages: int  # Ram
    remises: int  # Rem
    supplements: int  # Σ suppl
    offert: int  # Off
    total: int  # montant affiché et envoyé à l'agrégateur
    seuil: int
    colis: int
    economie: int  # = Off (CAL-07)
    reste_ramassages: int  # Ram − R si la livraison est offerte (CAL-07)
    manque_pour_seuil: int  # « Ajoute 11 500 F »
    progression_pour_cent: int  # barre, à l'unité
    trace: tuple[str, ...] = field(default=())
    version_parametres: str = "non versionné"  # la commande garde la version de ses paramètres (CCH-15)


def remise(p: ParametresLivraison, mode: Mode, classe: Classe) -> int:
    if mode is Mode.DOMICILE:
        return p.remise_domicile
    if classe in (Classe.XL, Classe.HG):
        if p.xl_interdit_en_relais:
            raise PanierInvalide(
                f"colis {classe.value} interdit en relais (LIV-XL-RELAIS) : livraison à domicile seulement"
            )
        raise PanierInvalide(f"remise relais non définie pour un colis {classe.value}")
    return p.remise_relais[classe.value]


def supplement(p: ParametresLivraison, sc: SousCommande) -> int:
    classe = sc.classe_colis
    if classe is Classe.S:
        return 0
    if classe in (Classe.M, Classe.L):
        return p.supplement_m_l
    if sc.distance_domicile_km is None:
        raise PanierInvalide(
            f"{sc.boutique} : colis {classe.value} sans distance de livraison à domicile (LIV-SUPPL-XL)"
        )
    d = sc.distance_domicile_km
    for palier in p.supplement_xl:
        if palier.borne_km is None or d < palier.borne_km or (palier.borne_comprise and d == palier.borne_km):
            return palier.montant
    raise AssertionError("paliers XL sans dernier palier")  # pragma: no cover


def calculer(panier: Panier, p: ParametresLivraison) -> FraisPanier:
    trace: list[str] = []
    mode = panier.mode
    if mode is Mode.RELAIS and p.xl_interdit_en_relais:
        for sc in panier.sous_commandes:
            if sc.classe_colis in (Classe.XL, Classe.HG):
                raise PanierInvalide(
                    f"{sc.boutique} : colis {sc.classe_colis.value} interdit en relais (LIV-XL-RELAIS)"
                )

    s = sum(sc.sous_total for sc in panier.sous_commandes)
    trace.append(f"S = {' + '.join(ecrire(sc.sous_total) for sc in panier.sous_commandes)} = {ecrire(s)} (CAL-06)")

    zones: OrderedDict[str, int] = OrderedDict()
    for sc in panier.sous_commandes:
        zones[sc.zone] = zones.get(sc.zone, 0) + 1
    ram = sum(p.ramassage + (n - 1) * p.ramassage_suivant for n in zones.values())
    detail = " ; ".join(
        f"{z} : " + " + ".join([ecrire(p.ramassage)] + [ecrire(p.ramassage_suivant)] * (n - 1))
        for z, n in zones.items()
    )
    trace.append(f"Ram = {detail} = {ecrire(ram)} (CAL-06, LIV-R, LIV-DELTA)")

    remises = [remise(p, mode, sc.classe_colis) for sc in panier.sous_commandes]
    rem = sum(remises)
    code_rem = "LIV-REM-RELAIS" if mode is Mode.RELAIS else "LIV-REM-DOM"
    trace.append(
        f"Rem = {' + '.join(f'{ecrire(r)} ({sc.classe_colis.value})' for r, sc in zip(remises, panier.sous_commandes))}"
        f" = {ecrire(rem)} ({len(remises)} colis ; CAL-06, {code_rem}, DP-18, DP-19, DP-25)"
    )

    # En relais, un colis XL ou hors gabarit a déjà été refusé : il ne reste que S, M et L.
    supp = sum(supplement(p, sc) for sc in panier.sous_commandes)
    if supp:
        trace.append(
            f"Suppléments de classe = {ecrire(supp)}, jamais offerts (CAL-09, LIV-SUPPL-M / L, LIV-SUPPL-XL, DP-07)"
        )

    seuil = p.seuil_relais if mode is Mode.RELAIS else p.seuil_domicile
    offert = 0
    if s >= seuil:
        # Jamais plus que les frais réels : la livraison offerte ne rend pas le total inférieur au prix des articles.
        offert = min(p.ramassage + remise(p, mode, Classe(p.classe_offerte)), ram + rem)
        trace.append(
            f"S ≥ {ecrire(seuil)} ⇒ Off = R + remise d’un colis {p.classe_offerte} = {ecrire(offert)} (CAL-06, LIV-OFFERT-CLASSE)"
        )
    else:
        trace.append(f"S < {ecrire(seuil)} ⇒ Off = 0 F (CAL-06)")

    total = s + ram + rem + supp - offert
    trace.append(
        f"Total = {ecrire(s)} + {ecrire(ram)} + {ecrire(rem)} + {ecrire(supp)} − {ecrire(offert)} = {ecrire(total)} (CAL-06)"
    )

    return FraisPanier(
        sous_total=s,
        ramassages=ram,
        remises=rem,
        supplements=supp,
        offert=offert,
        total=total,
        seuil=seuil,
        colis=len(panier.sous_commandes),
        economie=offert,
        reste_ramassages=ram - (p.ramassage if offert else 0),
        manque_pour_seuil=max(seuil - s, 0),
        # Sous le seuil, la barre n'affiche jamais 100 % (« Ajoute 150 F » à 99,5 %).
        progression_pour_cent=100 if s >= seuil else min(pour_cent_affiche(s, seuil), 99),
        trace=tuple(trace),
        version_parametres=p.version,
    )


def gain_conseil(actuel: Panier, simule: Panier, p: ParametresLivraison) -> int:
    """Gain d'un conseil (« Changer d'offre ») : recalcul complet ; le conseil ne s'affiche que si > 0 (CAL-08)."""
    return calculer(actuel, p).total - calculer(simule, p).total


class DecisionPaiement(str, Enum):
    CONTINUER = "continuer"  # Δ = 0
    APPLIQUER_BAISSE = "appliquer la baisse"  # Δ < 0 : « tu gagnes |Δ| F »
    BLOQUER_HAUSSE = "bloquer et confirmer"  # Δ > 0 : écart montré, confirmation explicite


def verifier_au_paiement(montant_affiche: int, montant_serveur: int) -> tuple[DecisionPaiement, int]:
    """Au clic sur « Payer », le serveur recalcule M ; Δ = M_serveur − M_affiché (CAL-11, CL-08)."""
    delta = montant_serveur - montant_affiche
    if delta == 0:
        return DecisionPaiement.CONTINUER, 0
    return (DecisionPaiement.APPLIQUER_BAISSE if delta < 0 else DecisionPaiement.BLOQUER_HAUSSE), delta


__all__ = [
    "Article",
    "Classe",
    "DecisionPaiement",
    "FraisPanier",
    "Mode",
    "Panier",
    "SousCommande",
    "calculer",
    "gain_conseil",
    "remise",
    "supplement",
    "verifier_au_paiement",
]
