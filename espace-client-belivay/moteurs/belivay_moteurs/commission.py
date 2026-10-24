"""Commission du vendeur et montant gardé (paquet « Espace vendeur » : VD-02 p5-6, familles M01, VD-10 PLN-01, PRX-03,
PRX-09, REFVD-R54, VD12-R36 ; décisions DP-55 et DP-56 : Q-01 à Q-09, Q-54 à Q-57, Q-62 ; DP-57 : A-2 à A-4).

    com_article = Σ tranches (taux + points) × part du prix unitaire dans la tranche            VD-BAREME-A … E
                  points : +3 si le prix unitaire est sous 5 000 F, −2 si Made in Cameroon,   VD-COM-POINTS (Q-05)
                  ajoutés au taux de chaque tranche, jamais sous 0 % ; tranche sans taux :
                  taux de la tranche précédente (Q-06) ; [M06, rééquilibrage : en attente]
    barème      = Σ lignes com_article × quantité
    réduite     = barème × multiplicateur de palier × 0,80 si découverte                     VD-COM-PALIER, VD-DECOUV-MULT
    plancher    = MAX(700 F ; 2 % du prix des articles ; [marge minimale M05 : en attente])  par sous-commande (Q-07)
    commission  = MAX(réduite ; plancher), arrondie une seule fois, à la fin, au franc,      DP-55, Q-54
                  moitié vers le haut
    TVA         = τ × commission, en plus (0 % au lancement)                                  VD-TVA (Q-09)
    gardé       = prix des articles − commission − TVA

« BelivaY ne perd jamais » (DP-55) : aucune réduction (palier, découverte, plan) ne passe sous le plancher ; la
remise du plan ne dépasse ni la commission au-dessus des planchers, ni le prix du plan (à l'année : prix annuel ÷ 12,
A-3) ; elle se recalcule sur la commission après remboursement et l'excédent déjà rendu est restitué (REFVD-R54) ;
la remise rend aussi la TVA de sa part (audit C5) ; une vente ou une offre où le vendeur garderait moins de 0 F est
refusée (OffreRefusee), comme un prix unitaire au-dessus du plafond de démarrage (PRX-09, brouillon gardé).

Les 3 points « sous 5 000 F » sont gardés (DP-57, A-4) : un article juste sous 5 000 F peut payer plus qu'à 5 000 F ;
le serveur écrit donc la plage exacte où la commission minimale s'applique (plages_commission_minimale), jamais
« sous X F » quand ce n'est pas vrai.

Une sous-commande = les articles d'une boutique dans une commande (« par commande et par vendeur »). Les montants
sont figés au paiement avec le palier, la catégorie, le plan et l'offre (D5) : ce module calcule, le serveur fige.
M05 (marge minimale) et M06 (rééquilibrage des produits chers) sont attendus du porteur (Q-02) : leurs
emplacements sont `_marge_minimale_m05` et `_reequilibrage_m06`, neutres tant que le registre dit « en attente ».
"""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass, field
from datetime import date
from decimal import ROUND_CEILING, Decimal
from enum import Enum

from .argent import decimal, ecrire, francs
from .delais import ajouter_mois
from .demarrage import verifier_prix_demarrage
from .erreurs import OffreRefusee, VenteInvalide
from .paliers import Palier
from .plans import Facturation, PlanVendeur, plafond_de_remise, prix_du_mois, tva_du_plan
from .registre import ParametresCommission, ParametresPaliers

CENT = Decimal(100)


class Famille(str, Enum):
    """Familles de marge M01 (VD-02 p5)."""

    A = "A"  # gros tickets : électronique, électroménager
    B = "B"  # marges larges : mode, beauté
    C = "C"  # fréquence : supermarché, frais
    D = "D"  # marges moyennes : maison, sport, bébé, animaux
    E = "E"  # petits prix : livres, médias


def famille_de(categorie: str, p: ParametresCommission) -> Famille:
    """« Électronique » → Famille.A, lu dans le registre (VD-BAREME-A … E)."""
    if categorie not in p.familles:
        raise VenteInvalide(f"catégorie inconnue du barème : « {categorie} »")
    return Famille(p.familles[categorie])


@dataclass(frozen=True)
class LigneVendue:
    """Un article d'une sous-commande : le barème s'applique au prix unitaire, puis à la quantité."""

    famille: Famille
    prix_unitaire: int
    quantite: int = 1
    made_in_cameroon: bool = False

    def __post_init__(self) -> None:
        try:
            object.__setattr__(self, "famille", Famille(self.famille))
        except ValueError:
            raise VenteInvalide(f"famille inconnue {self.famille!r}") from None
        for nom, v, mini in (("prix", self.prix_unitaire, 1), ("quantité", self.quantite, 1)):
            if isinstance(v, bool) or not isinstance(v, int) or v < mini:
                raise VenteInvalide(f"{nom} invalide {v!r}")


# ── Barème ──────────────────────────────────────────────────────────────────────────────────────────────


def _points(prix_unitaire: int, made_in_cameroon: bool, p: ParametresCommission) -> Decimal:
    points = Decimal(0)
    if prix_unitaire < p.seuil_petit_prix:  # « sous 5 000 F » : 5 000 F n'a pas les 3 points
        points += p.points_petit_prix
    if made_in_cameroon:
        points -= p.points_made_in_cameroon
    return points


def _reequilibrage_m06(bareme_unitaire: Decimal, ligne: LigneVendue, p: ParametresCommission) -> Decimal:
    """Emplacement de M06 (rééquilibrage des produits chers, Q-02). Le registre dit « en attente de M06 » (sinon
    lire_commission s'arrête) : le barème passe tel quel."""
    return bareme_unitaire


def _marge_minimale_m05(prix_articles: int, p: ParametresCommission) -> Decimal:
    """Emplacement de M05 (marge minimale de BelivaY, « 200 F ou 0,5 % du panier, livraison offerte », Q-02 et
    Q-07). Le registre dit « en attente de M05 » (sinon lire_commission s'arrête) : 0 F, sans effet sur le MAX."""
    return Decimal(0)


def commission_article(ligne: LigneVendue, p: ParametresCommission) -> Decimal:
    """Barème d'une unité, non arrondi : Σ tranches (taux + points) × part du prix (VD-02 p5, Q-05, Q-06).
    ITEL à 21 000 F, famille A : 20 000 × 13,5 % + 1 000 × 5 % = 2 750 F."""
    points = _points(ligne.prix_unitaire, ligne.made_in_cameroon, p)
    total = Decimal(0)
    bas = 0
    for t in p.bareme[ligne.famille.value]:
        haut = ligne.prix_unitaire if t.borne is None else min(ligne.prix_unitaire, t.borne)
        if haut > bas:
            total += (haut - bas) * max(t.taux_pour_cent + points, Decimal(0)) / CENT
        bas = haut
    return _reequilibrage_m06(total, ligne, p)


def _reduction(palier: Palier, decouverte: bool, p: ParametresCommission) -> Decimal:
    return p.multiplicateurs[palier.value] * (p.decouverte_mult if decouverte else 1)


# ── Commission d'une sous-commande ──────────────────────────────────────────────────────────────────────


@dataclass(frozen=True)
class ResultatCommission:
    prix_articles: int  # Σ prix unitaire × quantité
    bareme: Decimal  # avant palier et découverte, non arrondi
    reduite: Decimal  # après palier et découverte, non arrondie
    plancher: Decimal  # MAX(700 F ; 2 % ; M05)
    plancher_applique: bool
    commission: int  # le seul montant arrondi (DP-55)
    tva: int
    garde: int  # « Vous gardez X F » (GEN-02)
    marge_sur_plancher: int  # commission au-dessus du plancher : ce qu'une remise de plan peut rendre (DP-55)
    trace: tuple[str, ...] = field(default=())
    version_parametres: str = "non versionné"


def _calculer(
    lignes: Sequence[LigneVendue], palier: Palier, decouverte: bool, p: ParametresCommission
) -> ResultatCommission:
    if not lignes:
        raise VenteInvalide("sous-commande sans article")
    palier = Palier(palier)
    trace: list[str] = []
    prix = sum(lg.prix_unitaire * lg.quantite for lg in lignes)
    bareme = Decimal(0)
    for lg in lignes:
        unitaire = commission_article(lg, p)
        bareme += unitaire * lg.quantite
        points = _points(lg.prix_unitaire, lg.made_in_cameroon, p)
        trace.append(
            f"{ecrire(lg.prix_unitaire)} × {lg.quantite}, famille {lg.famille.value}"
            + (f", {points:+} points" if points else "")
            + f" : barème {unitaire.normalize():f} F par unité (VD-BAREME-{lg.famille.value}, VD-COM-POINTS)"
        )
    reduction = _reduction(palier, decouverte, p)
    reduite = bareme * reduction
    trace.append(
        f"Réduite = {bareme.normalize():f} × {p.multiplicateurs[palier.value]} ({palier.value})"
        + (f" × {p.decouverte_mult} (découverte)" if decouverte else "")
        + f" = {reduite.normalize():f} F (VD-COM-PALIER, VD-DECOUV-MULT)"
    )
    plancher = max(
        Decimal(p.plancher_commande),
        decimal(prix) * p.plancher_taux_pour_cent / CENT,
        _marge_minimale_m05(prix, p),
    )
    trace.append(
        f"Plancher = MAX({ecrire(p.plancher_commande)} ; {p.plancher_taux_pour_cent} % × {ecrire(prix)}) "
        f"= {plancher.normalize():f} F par sous-commande (VD-COM-MIN, VD-COM-MIN-TAUX ; M05 en attente)"
    )
    commission = francs(max(reduite, plancher))
    plancher_applique = commission > francs(reduite)  # le plancher change le montant arrondi
    tva = francs(commission * p.tva_pour_cent / CENT)
    garde = prix - commission - tva
    trace.append(
        f"Commission = {ecrire(commission)}"
        + (" (plancher)" if plancher_applique else "")
        + f", arrondie une fois (DP-55) ; TVA {p.tva_pour_cent} % = {ecrire(tva)} ; gardé = {ecrire(garde)}"
    )
    # Plancher relevé au franc supérieur : une remise de plan ne fait jamais passer BelivaY sous lui.
    plancher_entier = int(plancher.to_integral_value(rounding=ROUND_CEILING))
    return ResultatCommission(
        prix_articles=prix,
        bareme=bareme,
        reduite=reduite,
        plancher=plancher,
        plancher_applique=plancher_applique,
        commission=commission,
        tva=tva,
        garde=garde,
        marge_sur_plancher=max(commission - plancher_entier, 0),
        trace=tuple(trace),
        version_parametres=p.version,
    )


def calculer_commission(
    lignes: Sequence[LigneVendue], palier: Palier, decouverte: bool, p: ParametresCommission
) -> ResultatCommission:
    """Commission, TVA et montant gardé d'une sous-commande (DP-55). ITEL à 20 000 F, Bronze, découverte :
    2 700 × 0,80 = 2 160 F pris, 17 840 F gardés. Une vente où le vendeur garderait moins de 0 F est refusée."""
    r = _calculer(lignes, palier, decouverte, p)
    if r.garde < 0:
        raise OffreRefusee(
            f"le vendeur garderait {ecrire(r.garde)} sur {ecrire(r.prix_articles)} : vente refusée (DP-55, Q-08)"
        )
    return r


@dataclass(frozen=True)
class ApresRemboursement:
    commission: int
    tva: int
    garde: int


def apres_remboursement(r: ResultatCommission, rembourse: int, p: ParametresCommission) -> ApresRemboursement:
    """Commission annulée si le remboursement est total ; au prorata s'il est partiel, sans plancher de 700 F
    (VD-02 D4, VD-COM-MIN-REMB)."""
    if not 0 <= rembourse <= r.prix_articles:
        raise VenteInvalide(f"remboursement {ecrire(rembourse)} hors de 0 F … {ecrire(r.prix_articles)}")
    reste = r.prix_articles - rembourse
    commission = francs(decimal(r.commission) * reste / r.prix_articles)
    tva = francs(commission * p.tva_pour_cent / CENT)
    return ApresRemboursement(commission, tva, reste - commission - tva)


# ── Publication d'une offre ─────────────────────────────────────────────────────────────────────────────


def prix_minimum_publiable(famille: Famille, made_in_cameroon: bool, p: ParametresCommission) -> int:
    """Plus petit prix publiable : au moins VD-PRIX-MIN, et le vendeur garde au moins 0 F sur une unité vendue
    seule (DP-55, Q-08). Calculé au palier Bronze sans découverte, la commission la plus haute possible, pour que le
    prix reste publiable quand le palier ou la découverte changent. Avec une TVA de 0 % : 700 F partout."""
    prix = p.prix_min
    while _calculer((LigneVendue(famille, prix, 1, made_in_cameroon),), Palier.BRONZE, False, p).garde < 0:
        prix += 1
    return prix


def verifier_publication(
    prix: int,
    famille: Famille,
    made_in_cameroon: bool,
    p: ParametresCommission,
    *,
    sans_incident: int | None = None,
    pp: ParametresPaliers | None = None,
) -> None:
    """Refuse la publication d'une offre sous le prix minimum publiable, avec le prix à atteindre (Q-08, Q-55) ; et,
    avec le compteur du vendeur (`sans_incident`, `pp`), un prix unitaire au-dessus du plafond de démarrage avant 10
    commandes livrées sans incident (PRX-09 : le brouillon est gardé)."""
    minimum = prix_minimum_publiable(famille, made_in_cameroon, p)
    if prix < minimum:
        raise OffreRefusee(f"prix {ecrire(prix)} : publiable dès {ecrire(minimum)} (VD-PRIX-MIN, DP-55)")
    if (sans_incident is None) != (pp is None):
        raise ValueError("plafond de démarrage : il faut le compteur sans incident et les paramètres des paliers")
    if pp is not None:
        verifier_prix_demarrage(prix, sans_incident, pp)  # type: ignore[arg-type]


def _seuils_700(
    famille: Famille, palier: Palier, decouverte: bool, made_in_cameroon: bool, p: ParametresCommission
) -> tuple[int | None, int]:
    """(premier prix sous 5 000 F dont le barème réduit atteint 700 F, ou None ; premier prix dès 5 000 F)."""
    reduction = _reduction(Palier(palier), decouverte, p)

    def atteint(prix: int) -> bool:
        return francs(commission_article(LigneVendue(famille, prix, 1, made_in_cameroon), p) * reduction) >= (
            p.plancher_commande
        )

    def premier(bas: int, haut: int) -> int:
        # Le barème croît avec le prix de part et d'autre de 5 000 F (les 3 points s'arrêtent à 5 000 F).
        while bas < haut:
            milieu = (bas + haut) // 2
            if atteint(milieu):
                haut = milieu
            else:
                bas = milieu + 1
        return bas

    avant = premier(1, p.seuil_petit_prix - 1) if atteint(p.seuil_petit_prix - 1) else None
    return avant, premier(p.seuil_petit_prix, 10**12)


def seuil_commission_minimale(
    famille: Famille, palier: Palier, decouverte: bool, made_in_cameroon: bool, p: ParametresCommission
) -> int:
    """« Sous X F, la commission minimale de 700 F s'applique » : calculé par le serveur pour la catégorie, le palier
    et l'offre (Q-55), jamais écrit en dur. X = plus petit prix unitaire dès lequel le barème réduit, arrondi au
    franc, atteint 700 F. Électronique, Bronze : 5 182 F (5 182 × 13,5 % = 699,57 → 700 F). Quand le minimum
    s'arrête avant 5 000 F puis reprend (3 points, A-4), la phrase juste vient de message_commission_minimale."""
    avant, apres = _seuils_700(famille, palier, decouverte, made_in_cameroon, p)
    if avant is not None and apres == p.seuil_petit_prix:
        # Juste sous 5 000 F, le taux a 3 points de plus : le seuil est alors sous 5 000 F.
        return avant
    return apres


def plages_commission_minimale(
    famille: Famille, palier: Palier, decouverte: bool, made_in_cameroon: bool, p: ParametresCommission
) -> tuple[tuple[int, int], ...]:
    """Prix unitaires publiables (bornes comprises) où la commission minimale de 700 F s'applique à un article vendu
    seul (DP-57, A-4). Électronique, Bronze : (700, 4 239) et (5 000, 5 181) : à 4 240 F, 16,5 % donnent 699,60 →
    700 F, et à 5 000 F les 3 points tombent (675 F). Mode, Bronze : (700, 2 639) seulement. Le plancher de 2 %
    (gros prix, Q-07) se lit sur calculer_commission (plancher_applique)."""
    avant, apres = _seuils_700(famille, palier, decouverte, made_in_cameroon, p)
    bas = prix_minimum_publiable(famille, made_in_cameroon, p)
    morceaux = [(bas, (p.seuil_petit_prix if avant is None else avant) - 1), (max(bas, p.seuil_petit_prix), apres - 1)]
    plages: list[tuple[int, int]] = []
    for debut, fin in morceaux:
        if debut > fin:
            continue
        if plages and plages[-1][1] + 1 == debut:
            plages[-1] = (plages[-1][0], fin)  # contiguës : une seule plage
        else:
            plages.append((debut, fin))
    return tuple(plages)


def message_commission_minimale(
    famille: Famille, palier: Palier, decouverte: bool, made_in_cameroon: bool, p: ParametresCommission
) -> str | None:
    """La phrase du champ prix (Q-55, A-4), toujours vraie : « Sous 2 640 F, la commission minimale de 700 F
    s’applique. » ; « De 700 F à 4 239 F et de 5 000 F à 5 181 F, la commission minimale de 700 F s’applique. » ;
    None si elle ne s'applique à aucun prix publiable."""
    plages = plages_commission_minimale(famille, palier, decouverte, made_in_cameroon, p)
    fin = f"la commission minimale de {ecrire(p.plancher_commande)} s’applique."
    if not plages:
        return None
    if len(plages) == 1 and plages[0][0] == prix_minimum_publiable(famille, made_in_cameroon, p):
        return f"Sous {ecrire(plages[0][1] + 1)}, {fin}"
    morceaux = [f"de {ecrire(a)} à {ecrire(b)}" for a, b in plages]
    texte = " et ".join(morceaux)
    return f"{texte[0].upper()}{texte[1:]}, {fin}"


# ── Offre de découverte ─────────────────────────────────────────────────────────────────────────────────


def compteur_decouverte(encaissees: int, remboursees_en_totalite: int) -> int:
    """Commandes comptées par l'offre de découverte : encaissées, moins celles remboursées en totalité (Q-62) ; une
    commande remboursée en partie reste comptée."""
    if not 0 <= remboursees_en_totalite <= encaissees:
        raise VenteInvalide("remboursées en totalité : entre 0 et le nombre de commandes encaissées")
    return encaissees - remboursees_en_totalite


def fin_decouverte(premiere_commande_payee: date, p: ParametresCommission) -> date:
    """Dernier jour de l'offre : 3 mois après la première commande payée (27 août → 27 nov.)."""
    return ajouter_mois(premiere_commande_payee, p.decouverte_mois)


def decouverte_active(
    premiere_commande_payee: date | None, jour: date, commandes_comptees: int, p: ParametresCommission
) -> bool:
    """Active ⇔ commandes < 50 ∧ jour ≤ fin (VD-10 PLN-07) : elle s'arrête à la première limite atteinte. Avant la
    première commande payée, elle n'a pas commencé : la première commande en profite."""
    if commandes_comptees >= p.decouverte_commandes:
        return False
    return premiere_commande_payee is None or jour <= fin_decouverte(premiere_commande_payee, p)


# ── Plans : remise du mois et simulateur ────────────────────────────────────────────────────────────────


@dataclass(frozen=True)
class VenteDuMois:
    """Une sous-commande payée du mois et ce qui en a été remboursé depuis (REFVD-R54, VD12-R36)."""

    resultat: ResultatCommission
    rembourse: int = 0


def _vente(v: ResultatCommission | VenteDuMois) -> VenteDuMois:
    return v if isinstance(v, VenteDuMois) else VenteDuMois(v)


def _apres(v: VenteDuMois, p: ParametresCommission) -> tuple[int, int, int]:
    """(commission, gardé, part au-dessus des planchers) après remboursement. Partiel : commission au prorata sans
    plancher (VD-COM-MIN-REMB) ; la part au-dessus des planchers suit le même prorata, arrondie à l'inférieur et
    jamais au-delà de la commission restante (BelivaY ne perd jamais) ; total : rien."""
    r = v.resultat
    if v.rembourse == 0:
        return r.commission, r.garde, r.marge_sur_plancher
    a = apres_remboursement(r, v.rembourse, p)
    reste = r.prix_articles - v.rembourse
    return a.commission, a.garde, min(r.marge_sur_plancher * reste // r.prix_articles, a.commission)


@dataclass(frozen=True)
class RemisePlan:
    plan: PlanVendeur
    commission_du_mois: int  # après les remboursements connus
    remise: int  # rendue au vendeur
    prix_du_plan: int  # payé ce mois-ci (0 F pendant l'essai ; prix annuel ÷ 12 à l'année)
    tva_rendue: int = 0  # TVA de la part de commission rendue (audit C5)
    tva_du_plan: int = 0  # TVA en plus du prix du plan (VD-PLAN-TVA)
    plafond: int = 0  # prix du plan, ou prix annuel ÷ 12 (A-3)
    facturation: Facturation = Facturation.MENSUELLE
    trace: tuple[str, ...] = field(default=())


def remise_de_plan(
    plan: PlanVendeur,
    ventes_du_mois: Sequence[ResultatCommission | VenteDuMois],
    p: ParametresCommission,
    facturation: Facturation = Facturation.MENSUELLE,
) -> RemisePlan:
    """Remise du mois (VD-12 arbitrage 14, D8, Q-04, DP-55) : Boost 5 %, Pro 10 % de la commission des commandes
    payées du mois, après remboursements (REFVD-R54), arrondie une fois ; jamais plus que le plafond du plan (prix
    mensuel, aussi pendant l'essai ; prix annuel ÷ 12 à l'année, A-3), ni que la commission au-dessus des planchers.
    3 ITEL en découverte (6 480 F) : Boost 324 F, Pro 648 F."""
    plan, facturation = PlanVendeur(plan), Facturation(facturation)
    ventes = [_apres(_vente(v), p) for v in ventes_du_mois]
    commission = sum(c for c, _, _ in ventes)
    if plan is PlanVendeur.FREE:
        return RemisePlan(plan, commission, 0, 0, trace=("Free : aucune remise",))
    regle = p.plans[plan.value]
    brute = francs(decimal(commission) * regle.remise_pour_cent / CENT)
    marge = sum(m for _, _, m in ventes)
    plafond = plafond_de_remise(plan, facturation, p)
    remise = min(brute, plafond, marge)
    prix = prix_du_mois(plan, facturation, p)
    tva_rendue = francs(remise * p.tva_pour_cent / CENT)
    trace = (
        (
            f"{plan.value} ({facturation.value}) : {regle.remise_pour_cent} % × {ecrire(commission)} = "
            f"{ecrire(brute)} ; plafonds : plan {ecrire(plafond)}, au-dessus des planchers {ecrire(marge)} ⇒ remise "
            f"{ecrire(remise)}, TVA rendue {ecrire(tva_rendue)} (VD-PLAN-REMISE-PLAFOND, VD-PLAN-ANNUEL, VD-PLAN-TVA)"
        ),
    )
    return RemisePlan(plan, commission, remise, prix, tva_rendue, tva_du_plan(prix, p), plafond, facturation, trace)


def restitution_de_remise(
    remise_deja_rendue: int,
    plan: PlanVendeur,
    ventes_du_mois: Sequence[ResultatCommission | VenteDuMois],
    p: ParametresCommission,
    facturation: Facturation = Facturation.MENSUELLE,
) -> int:
    """Remise à restituer quand une commande payée du mois est remboursée après le calcul (PLN-01, REFVD-R54,
    VD12-R36) : ce qui a été rendu moins la remise recalculée sur la commission finalement perçue, jamais négatif.
    Pro, 3 ITEL en découverte, 648 F rendus, une ITEL remboursée en totalité : 648 − 432 = 216 F repris."""
    if remise_deja_rendue < 0:
        raise VenteInvalide("remise déjà rendue négative")
    return max(remise_deja_rendue - remise_de_plan(plan, ventes_du_mois, p, facturation).remise, 0)


@dataclass(frozen=True)
class Simulation:
    gardes: dict[PlanVendeur, int]  # gardé du mois avec chaque plan, prix du plan payé
    meilleur: PlanVendeur  # à égalité, le moins cher (SIM-01 : le simulateur dit la vérité)


def simuler_plans(
    ventes_du_mois: Sequence[ResultatCommission | VenteDuMois],
    p: ParametresCommission,
    facturation: Facturation = Facturation.MENSUELLE,
) -> Simulation:
    """gardé(plan) = ventes − (commission − remise) − TVA nette − prix du plan − sa TVA, sur les ventes réelles du
    mois (VD-10 p28, pas sur un taux moyen ; audit C5). 3 ITEL en découverte (60 000 F) : Free 53 520 F, Boost
    51 344 F, Pro 46 668 F ; à l'année : Boost 51 761 F, Pro 47 918 F."""
    garde_free = sum(g for _, g, _ in (_apres(_vente(v), p) for v in ventes_du_mois))
    gardes = {}
    for plan in PlanVendeur:
        r = remise_de_plan(plan, ventes_du_mois, p, facturation)
        gardes[plan] = garde_free + r.remise + r.tva_rendue - r.prix_du_plan - r.tva_du_plan
    meilleur = max(PlanVendeur, key=lambda pl: (gardes[pl], -list(PlanVendeur).index(pl)))
    return Simulation(gardes, meilleur)
