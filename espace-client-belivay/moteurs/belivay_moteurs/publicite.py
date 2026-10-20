"""Revenus publicitaires du vendeur (décision DP-59, qui remplace DP-14 et Q-32 pour quatre produits payants).

    éligibilité  = stock > 0 ∧ Trust Score ≥ seuil ∧ aucun litige en cours                     VD-PUB-ELIGIBILITE
    clic         = enchère ≥ prix plancher ; coût = MIN(enchère ; MAX(plancher ; enchère suivante + 1 F))  VD-PUB-CLIC
                   un clic facturé une seule fois par client, par annonce et par jour (anti-fraude)
    diffusion    = tant que dépense du jour + coût ≤ budget quotidien et coût ≤ solde       VD-PUB-BUDGET
    densité      = 20 % des positions au plus, 2 annonces au plus sur 10 résultats ; une annonce n'est jamais
                   au-dessus d'une offre moins chère ET mieux notée du même produit           VD-PUB-DENSITE
    À la une, carrousel = places par semaine : tarif fixe (premiers arrivés) ou enchère      VD-PUB-A-LA-UNE,
                   hebdomadaire (même second prix + 1 F, jamais au-dessus de l'enchère)      VD-PUB-CARROUSEL
    vente flash  = remise ≥ FLASH-REMISE-MIN ; commission = MAX(réduite ; plancher) de commission.py
                   + majoration × prix des articles, un seul arrondi ; refusée si le vendeur
                   garderait moins de 0 F (BelivaY ne perd jamais, DP-55)                     VD-PUB-FLASH-MAJORATION
    Boost        = forfait 24 h ou 7 jours ; score de classement × multiplicateur plafonné   VD-PUB-BOOST
    solde        = prépayé par Mobile Money (recharge minimale), débité par les annonces,     VD-PUB-SOLDE
                   crédité des heures non diffusées ; jamais retenu sur les versements

« Le vendeur ne paie que les clics réels ou les heures réellement diffusées » : un clic en double vaut 0 F, et les
heures non diffusées d'un Boost ou d'un emplacement sont rendues au solde (arrondi au franc inférieur : BelivaY ne
perd jamais). Ce module calcule ; le serveur enregistre (clics, débits, factures).
"""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass, field
from decimal import ROUND_DOWN, Decimal
from enum import Enum

from .argent import decimal, ecrire, francs
from .commission import LigneVendue, calculer_commission
from .erreurs import AnnonceRefusee, OffreRefusee, VenteInvalide
from .paliers import Palier
from .registre import Emplacements, ParametresCommission, ParametresPublicite

CENT = Decimal(100)


def _montant(nom: str, v: int, mini: int = 0) -> None:
    if isinstance(v, bool) or not isinstance(v, int) or v < mini:
        raise AnnonceRefusee(f"{nom} invalide {v!r}")


# ── Éligibilité ─────────────────────────────────────────────────────────────────────────────────────────


def motifs_ineligibilite(
    stock: int, trust_score: int | Decimal, litiges_en_cours: int, p: ParametresPublicite
) -> tuple[str, ...]:
    """Seuil de qualité (DP-59) : les raisons écrites pour le vendeur ; vide = l'offre peut être annoncée."""
    motifs = []
    if stock <= 0:
        motifs.append("stock épuisé")
    if trust_score < p.trust_min:
        motifs.append(f"Trust Score sous {p.trust_min}")
    if litiges_en_cours > 0:
        motifs.append("litige en cours")
    return tuple(motifs)


def verifier_eligibilite(stock: int, trust_score: int | Decimal, litiges_en_cours: int, p: ParametresPublicite) -> None:
    motifs = motifs_ineligibilite(stock, trust_score, litiges_en_cours, p)
    if motifs:
        raise AnnonceRefusee("annonce refusée : " + ", ".join(motifs) + " (VD-PUB-ELIGIBILITE)")


# ── Enchères (clic et semaine) ──────────────────────────────────────────────────────────────────────────


@dataclass(frozen=True)
class Enchere:
    campagne: str
    montant: int  # F par clic, ou F la semaine
    ordre: int = 0  # départage à montant égal : la plus ancienne d'abord


@dataclass(frozen=True)
class Gagnant:
    campagne: str
    enchere: int
    cout: int  # ce que paie le vendeur (par clic, ou pour la semaine)


def _second_prix(encheres: Sequence[Enchere], places: int, plancher: int, pas: int) -> tuple[Gagnant, ...]:
    for e in encheres:
        _montant("enchère", e.montant)
    valides = sorted((e for e in encheres if e.montant >= plancher), key=lambda e: (-e.montant, e.ordre))
    gagnants = []
    for i, e in enumerate(valides[:places]):
        suivante = valides[i + 1].montant if i + 1 < len(valides) else None
        cout = plancher if suivante is None else max(plancher, suivante + pas)
        gagnants.append(Gagnant(e.campagne, e.montant, min(cout, e.montant)))
    return tuple(gagnants)


def encheres_au_clic(encheres: Sequence[Enchere], places: int, p: ParametresPublicite) -> tuple[Gagnant, ...]:
    """Annonces retenues pour `places` positions, rangées ; coût du clic = second prix + 1 F, au moins le plancher,
    jamais au-dessus de l'enchère. 60, 40 et 30 F pour 2 places : 41 F et 31 F."""
    return _second_prix(encheres, places, p.clic_plancher, p.pas_enchere)


def verifier_enchere_clic(enchere: int, budget_quotidien: int, p: ParametresPublicite) -> None:
    _montant("enchère", enchere)
    _montant("budget", budget_quotidien)
    if enchere < p.clic_plancher:
        raise AnnonceRefusee(f"enchère {ecrire(enchere)} : au moins {ecrire(p.clic_plancher)} le clic (VD-PUB-CLIC)")
    if budget_quotidien < max(p.budget_min, enchere):
        raise AnnonceRefusee(
            f"budget {ecrire(budget_quotidien)} : au moins {ecrire(max(p.budget_min, enchere))} par jour (VD-PUB-BUDGET)"
        )


def diffusable(cout: int, depense_du_jour: int, budget_quotidien: int, solde: int) -> bool:
    """L'annonce n'est montrée que si le prochain clic peut être payé par le budget du jour et par le solde."""
    return depense_du_jour + cout <= budget_quotidien and cout <= solde


def clic_facture(
    cout: int, deja_facture_aujourdhui: bool, depense_du_jour: int, budget_quotidien: int, solde: int
) -> int:
    """Montant facturé pour un clic : 0 F si ce client a déjà cliqué cette annonce aujourd'hui (anti-fraude) ou si le
    budget du jour ou le solde ne le couvrent pas (le vendeur ne paie jamais au-delà)."""
    _montant("coût", cout)
    if deja_facture_aujourdhui or not diffusable(cout, depense_du_jour, budget_quotidien, solde):
        return 0
    return cout


# ── Densité ─────────────────────────────────────────────────────────────────────────────────────────────


@dataclass(frozen=True)
class Resultat:
    """Une offre affichée : `cle` l'identifie (produit d'une boutique), `produit` la fiche commune."""

    cle: str
    produit: str
    prix: int
    note: Decimal = Decimal(0)


@dataclass(frozen=True)
class Position:
    resultat: Resultat
    sponsorise: bool


def _ecrase(annonce: Resultat, r: Resultat) -> bool:
    """Une offre du même produit, moins chère ET mieux notée : l'annonce ne passe jamais au-dessus."""
    return r.produit == annonce.produit and r.cle != annonce.cle and r.prix < annonce.prix and r.note > annonce.note


def placer_annonces(
    resultats: Sequence[Resultat], annonces: Sequence[Resultat], p: ParametresPublicite
) -> tuple[Position, ...]:
    """Mêle les annonces (rangées par l'enchère) aux résultats : une place toutes les fenetre ÷ max positions
    (0, 5, 10… : 2 sur 10), 20 % des positions au plus, jamais au-dessus d'une offre moins chère et mieux notée du
    même produit. Une annonce déjà affichée au-dessus de sa place est inutile (rien n'est facturé) ; plus bas, sa
    copie est retirée (une offre n'apparaît qu'une fois)."""
    pas = -(-p.fenetre // p.max_par_fenetre)
    liste = [Position(r, False) for r in resultats]
    prochaine = 0
    placees = 0
    for a in annonces:
        bloquants = [i for i, x in enumerate(liste) if _ecrase(a, x.resultat)]
        debut = max(prochaine, bloquants[-1] + 1 if bloquants else 0)
        place = -(-debut // pas) * pas
        if place > len(liste):
            continue
        copie = next((i for i, x in enumerate(liste) if x.resultat.cle == a.cle), None)
        if copie is not None and copie <= place:
            continue
        total = len(liste) + (0 if copie is not None else 1)
        if (placees + 1) * CENT > p.part_max_pour_cent * total:
            continue
        if copie is not None:
            del liste[copie]
        liste.insert(place, Position(a, True))
        placees += 1
        prochaine = place + pas
    return tuple(liste)


# ── À la une et carrousel ───────────────────────────────────────────────────────────────────────────────


class Emplacement(str, Enum):
    A_LA_UNE = "a_la_une"
    CARROUSEL = "carrousel"


class Mode(str, Enum):
    FIXE = "fixe"
    ENCHERE = "enchere"


def regle_emplacement(emplacement: Emplacement, p: ParametresPublicite) -> Emplacements:
    return p.a_la_une if Emplacement(emplacement) is Emplacement.A_LA_UNE else p.carrousel


def attribuer_emplacements(
    emplacement: Emplacement, mode: Mode, demandes: Sequence[Enchere], p: ParametresPublicite, places: int | None = None
) -> tuple[Gagnant, ...]:
    """Places d'une semaine (`places` : celles qui restent, au plus le nombre du registre). Tarif fixe : les premières
    demandes (ordre), au tarif ; enchère : les plus hautes dès le plancher, chacune paie la meilleure enchère perdante
    + 1 F, au moins le plancher, jamais au-dessus de la sienne."""
    e = regle_emplacement(emplacement, p)
    n = e.places if places is None else max(min(places, e.places), 0)
    if Mode(mode) is Mode.FIXE:
        ordre = sorted(demandes, key=lambda d: d.ordre)[:n]
        return tuple(Gagnant(d.campagne, e.tarif_semaine, e.tarif_semaine) for d in ordre)
    return _second_prix(demandes, n, e.enchere_min, p.pas_enchere)


# ── Vente flash sur sélection ───────────────────────────────────────────────────────────────────────────


def verifier_remise_flash(prix_normal: int, prix_flash: int, p: ParametresPublicite) -> int:
    """Remise réelle, au moins FLASH-REMISE-MIN (OFR-05) ; renvoie le pourcentage affiché (à l'unité inférieure, pour
    ne jamais annoncer plus que la vérité)."""
    _montant("prix normal", prix_normal, 1)
    _montant("prix flash", prix_flash, 1)
    remise = (decimal(prix_normal) - prix_flash) * CENT / prix_normal
    if remise < p.flash_remise_min_pour_cent:
        raise AnnonceRefusee(
            f"remise flash de {remise:.1f} % : au moins {p.flash_remise_min_pour_cent} % (FLASH-REMISE-MIN)"
        )
    return int(remise.to_integral_value(rounding=ROUND_DOWN))


@dataclass(frozen=True)
class ResultatFlash:
    prix_articles: int
    commission_normale: int  # commission.py, sans majoration
    majoration: Decimal  # points × prix des articles, non arrondie
    commission: int  # un seul arrondi (DP-55)
    tva: int
    garde: int
    trace: tuple[str, ...] = field(default=())
    version_parametres: str = "non versionné"


def commission_vente_flash(
    lignes: Sequence[LigneVendue],
    palier: Palier,
    decouverte: bool,
    pc: ParametresCommission,
    p: ParametresPublicite,
    base_flash: int | None = None,
) -> ResultatFlash:
    """Commission d'une sous-commande vendue pendant la vente flash : celle de commission.py (barème, palier,
    découverte, plancher) plus la majoration, non réduite par le palier. ITEL à 18 000 F, Bronze : 2 430 + 540 =
    2 970 F. `base_flash` : prix des articles vendus au prix flash quand la sous-commande en mêle d'autres (défaut :
    tous). Refusée si le vendeur garderait moins de 0 F."""
    r = calculer_commission(lignes, palier, decouverte, pc)
    base = r.prix_articles if base_flash is None else base_flash
    if isinstance(base, bool) or not isinstance(base, int) or not 0 <= base <= r.prix_articles:
        raise VenteInvalide(f"part vendue en flash {base!r} hors de 0 F … {ecrire(r.prix_articles)}")
    majoration = decimal(base) * p.flash_points / CENT
    commission = francs(max(r.reduite, r.plancher) + majoration)
    tva = francs(commission * pc.tva_pour_cent / CENT)
    garde = r.prix_articles - commission - tva
    if garde < 0:
        raise OffreRefusee(f"vente flash : le vendeur garderait {ecrire(garde)} (DP-55, DP-59)")
    trace = (
        *r.trace,
        f"Vente flash : + {p.flash_points} points × {ecrire(base)} ⇒ commission {ecrire(commission)} (VD-PUB-FLASH-MAJORATION)",
    )
    return ResultatFlash(r.prix_articles, r.commission, majoration, commission, tva, garde, trace, r.version_parametres)


# ── Boost ───────────────────────────────────────────────────────────────────────────────────────────────


class DureeBoost(str, Enum):
    H24 = "24h"
    J7 = "7j"


HEURES_BOOST = {DureeBoost.H24: 24, DureeBoost.J7: 168}


def prix_boost(duree: DureeBoost, p: ParametresPublicite) -> int:
    return p.boost_24h if DureeBoost(duree) is DureeBoost.H24 else p.boost_7j


def score_classement(score: Decimal | int, booste: bool, p: ParametresPublicite) -> Decimal:
    """Score de pertinence × le multiplicateur plafonné pendant un Boost : il remonte, sans écraser le mérite."""
    return decimal(score) * (p.boost_plafond if booste else 1)


def classer(elements: Sequence[tuple[str, Decimal | int, bool]], p: ParametresPublicite) -> tuple[str, ...]:
    """(clé, score, boosté) → clés rangées par score de classement décroissant, ordre d'origine à égalité."""
    return tuple(c for c, _, _ in sorted(elements, key=lambda e: -score_classement(e[1], e[2], p)))


def remboursement_non_diffuse(prix: int, heures_prevues: int, heures_diffusees: int) -> int:
    """Part du forfait (Boost, emplacement) rendue au solde pour les heures non diffusées, au franc inférieur."""
    _montant("prix", prix)
    if heures_prevues <= 0 or not 0 <= heures_diffusees <= heures_prevues:
        raise AnnonceRefusee("heures diffusées hors de 0 … heures prévues")
    return int(
        (decimal(prix) * (heures_prevues - heures_diffusees) / heures_prevues).to_integral_value(rounding=ROUND_DOWN)
    )


# ── Solde publicitaire ──────────────────────────────────────────────────────────────────────────────────


def recharger(solde: int, montant: int, p: ParametresPublicite) -> int:
    """Recharge Mobile Money confirmée : au moins la recharge minimale."""
    _montant("solde", solde)
    _montant("recharge", montant)
    if montant < p.recharge_min:
        raise AnnonceRefusee(f"recharge {ecrire(montant)} : au moins {ecrire(p.recharge_min)} (VD-PUB-SOLDE)")
    return solde + montant


def debiter(solde: int, montant: int) -> int:
    """Débit d'un clic, d'un emplacement ou d'un Boost : jamais au-delà du solde (rien n'est pris sur les versements)."""
    _montant("solde", solde)
    _montant("débit", montant)
    if montant > solde:
        raise AnnonceRefusee(
            f"solde publicitaire {ecrire(solde)} : {ecrire(montant)} demandés, rechargez (VD-PUB-SOLDE)"
        )
    return solde - montant


# ── Facture ─────────────────────────────────────────────────────────────────────────────────────────────


@dataclass(frozen=True)
class LigneFacture:
    libelle: str
    quantite: int
    prix_unitaire: int

    @property
    def montant(self) -> int:
        return self.quantite * self.prix_unitaire


@dataclass(frozen=True)
class FacturePublicitaire:
    lignes: tuple[LigneFacture, ...]
    hors_taxe: int
    tva: int
    total: int


def facture_publicitaire(lignes: Sequence[LigneFacture], tva_pour_cent: Decimal) -> FacturePublicitaire:
    """Facture d'une période : clics facturés, emplacements, Boost, moins les heures rendues (lignes négatives)."""
    for lg in lignes:
        if isinstance(lg.quantite, bool) or not isinstance(lg.quantite, int) or lg.quantite < 0:
            raise VenteInvalide(f"quantité invalide {lg.quantite!r}")
        if isinstance(lg.prix_unitaire, bool) or not isinstance(lg.prix_unitaire, int):
            raise VenteInvalide(f"prix invalide {lg.prix_unitaire!r}")
    ht = sum(lg.montant for lg in lignes)
    if ht < 0:
        raise VenteInvalide("facture négative")
    tva = francs(decimal(ht) * tva_pour_cent / CENT)
    return FacturePublicitaire(tuple(lignes), ht, tva, ht + tva)
