"""Catalogue : prix livré, attribution de l'offre, vendeur suivant, prix d'une carte, distance, « Retirable
aujourd'hui » et visibilité d'un produit (CL-04, CL-05, CL-06 ; CAL-01 à CAL-05 ; CCY-06, CPY-15, CPY-16, CAN-24,
CAN-25, CRE-24, CRE-26, CRE-27, CTV-31 ; DP-01, DP-07, DP-25, DP-46, DP-47 « devenir vendeur »).

- Prix livré (CAL-01) : celui du moteur de frais pour un panier d'un seul article, pour que la carte, la fiche et
  le panier disent toujours la même chose (CRE-24). « Offert » seulement si plus rien n'est dû pour la livraison :
  un colis L garde 200 F de remise (DP-25). Un colis XL ou hors gabarit ne va jamais en relais : « Livraison à
  domicile », sans montant (CRE-27) ; à domicile, son supplément dépend de la distance boutique → domicile
  (DP-46) : sans distance connue, pas de montant.
- Attribution (CAL-02, CPY-15) : l'offre au coût total livré le plus bas pour ce client (prix + ce qu'elle ajoute à
  la livraison de son panier, dans son mode de livraison), Trust Score en départage ; une boutique fermée
  aujourd'hui, sans stock disponible, ou dont l'offre ne peut pas être livrée dans ce mode est écartée.
- Vendeur suivant (CCY-06, CPY-16, CAN-24, DP-01) : rupture, lenteur ou refus du vendeur → l'offre suivante d'un
  vendeur au Trust Score ≥ REMPL-TRUST-MIN, au coût livré au plus REMPL-ECART au-dessus de l'offre payée ; le
  client garde son prix, BelivaY paie l'écart ; au plus RUPTURE-TENTATIVES fois, sinon remboursement intégral le
  jour même (CAN-25).
- Prix d'une carte (CAL-03) : le plus bas des prix livrés des variantes actives, « à partir de » s'ils diffèrent.
- Distance (CAL-04) : calculée par la base de données (géodésique) ; ici, l'arrondi à 0,1 km.
- Retirable aujourd'hui (CAL-05) : fin de préparation + tournée ≤ fermeture du relais aujourd'hui, classe ≤ L.
- Visibilité : un vendeur dont la pièce n'est pas validée n'a aucun produit visible (prototype, 29 sept.) ; un
  produit de la liste interdite n'existe pas pour le client (CTV-31) ; un produit épuisé chez tous les vendeurs
  reste visible, « Épuisé », en fin de liste (CRE-26).
"""

from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass
from datetime import datetime, timedelta
from decimal import ROUND_HALF_UP, Decimal
from enum import Enum

from .argent import decimal
from .erreurs import PanierInvalide
from .frais import Article, Classe, Mode, Panier, SousCommande, calculer
from .registre import ParametresBascule, ParametresLivraison

GROS = (Classe.XL, Classe.HG)

# ── Prix livré (CAL-01) ─────────────────────────────────────────────────────────────────────────────────


@dataclass(frozen=True)
class PrixLivre:
    prix: int
    livraison: int | None  # ce qui reste dû pour la livraison ; None si le colis ne peut pas aller en relais
    part_offerte: int  # montant « offert » (au tarif d'un colis S)
    supplement: int | None  # supplément XL, jamais offert (CAL-09) ; None si la distance n'est pas connue
    domicile_seulement: bool  # XL et hors gabarit : « Livraison à domicile » (CRE-27)

    @property
    def offert(self) -> bool:
        """« Retrait offert » / « Livraison offerte » seulement si plus rien n'est dû pour la livraison (DP-25) ;
        le supplément de classe à part, jamais offert (CAL-09)."""
        return self.livraison == 0 and self.part_offerte > 0

    @property
    def total(self) -> int | None:
        if self.livraison is None or self.supplement is None:
            return None
        return self.prix + self.livraison + self.supplement


def prix_livre(
    prix: int, classe: Classe, mode: Mode, p: ParametresLivraison, distance_domicile_km: Decimal | None = None
) -> PrixLivre:
    """Relais : « + 900 F de retrait » ou « Retrait offert » ; un colis L : « + 1 100 F », ou 200 F quand le reste
    est offert (DP-25) ; domicile : « + 1 500 F » ou offerte, plus le supplément XL selon la distance (DP-46)."""
    classe, mode = Classe(classe), Mode(mode)
    if classe in GROS and mode is Mode.RELAIS:
        return PrixLivre(prix, None, 0, None, True)
    distance_connue = classe not in GROS or distance_domicile_km is not None
    # Sans distance, le reste se calcule comme à 0 km ; le supplément est montré inconnu.
    distance = distance_domicile_km if distance_connue else Decimal(0)
    sc = SousCommande("_", "_", (Article("_", prix, 1, classe),), distance)
    f = calculer(Panier(mode, (sc,)), p)
    return PrixLivre(
        prix,
        f.ramassages + f.remises - f.offert,
        f.offert,
        f.supplements if distance_connue else None,
        classe in GROS,
    )


# ── Attribution (CAL-02, CPY-15) et vendeur suivant (CCY-06, CPY-16, DP-01) ─────────────────────────────


@dataclass(frozen=True)
class Offre:
    vendeur: str
    zone: str
    prix: int
    classe: Classe
    trust_score: int
    stock_disponible: int  # stock − réservations actives (CAL-12)
    fermee_aujourd_hui: bool = False


@dataclass(frozen=True)
class OffreAttribuee:
    offre: Offre
    cout_total_livre: int  # prix + ce que l'offre ajoute à la livraison du panier


def _possibles(
    offres: tuple[Offre, ...],
    panier: Panier | None,
    quantite: int,
    mode: Mode,
    p: ParametresLivraison,
    distances: Mapping[str, Decimal] | None,
) -> list[OffreAttribuee]:
    mode = Mode(mode)
    if panier is not None and panier.mode is not mode:
        raise PanierInvalide("le mode demandé n'est pas celui du panier")
    distances = distances or {}
    base = calculer(panier, p).total if panier else 0
    possibles = []
    for o in offres:
        if o.fermee_aujourd_hui or o.stock_disponible < quantite:
            continue
        article = Article(o.vendeur, o.prix, quantite, o.classe)
        sous = list(panier.sous_commandes) if panier else []
        i = next((k for k, sc in enumerate(sous) if sc.boutique == o.vendeur), None)
        if i is None:
            sous.append(SousCommande(o.vendeur, o.zone, (article,), distances.get(o.vendeur)))
        else:
            sc = sous[i]
            d = sc.distance_domicile_km if sc.distance_domicile_km is not None else distances.get(o.vendeur)
            sous[i] = SousCommande(sc.boutique, sc.zone, (*sc.articles, article), d)
        try:
            total = calculer(Panier(mode, tuple(sous)), p).total
        except PanierInvalide:
            continue  # XL en relais, ou distance boutique → domicile inconnue : offre impossible ici
        possibles.append(OffreAttribuee(o, total - base))
    return possibles


def _meilleure(possibles: list[OffreAttribuee]) -> OffreAttribuee | None:
    if not possibles:
        return None
    return min(possibles, key=lambda c: (c.cout_total_livre, -c.offre.trust_score, c.offre.vendeur))


def attribuer(
    offres: tuple[Offre, ...],
    panier: Panier | None,
    quantite: int,
    mode: Mode,
    p: ParametresLivraison,
    distances: Mapping[str, Decimal] | None = None,
) -> OffreAttribuee | None:
    """L'offre au coût total livré le plus bas pour ce client, Trust Score en départage ; None si aucune offre
    n'est possible (le produit passe « Épuisé », CRE-26). `distances` : boutique → domicile du client, en km."""
    return _meilleure(_possibles(offres, panier, quantite, mode, p, distances))


@dataclass(frozen=True)
class Bascule:
    offre: OffreAttribuee | None  # None : remboursement intégral le jour même (CAN-25)
    ecart_paye_par_belivay: int  # le client garde son prix (CAN-24)
    tentative: int  # numéro de cette bascule


def vendeur_suivant(
    offres: tuple[Offre, ...],
    payee: OffreAttribuee,
    deja_essayes: frozenset[str],
    panier_sans_l_article: Panier | None,
    quantite: int,
    mode: Mode,
    pl: ParametresLivraison,
    pb: ParametresBascule,
    distances: Mapping[str, Decimal] | None = None,
) -> Bascule:
    """`deja_essayes` : les vendeurs déjà sollicités pour cet article, celui de l'offre payée compris ; le nombre
    de bascules faites est len(deja_essayes) − 1. `payee.cout_total_livre` doit avoir été calculé sur le même
    `panier_sans_l_article` : l'écart de REMPL-ECART compare deux coûts dans le même panier."""
    faites = len(deja_essayes | {payee.offre.vendeur}) - 1
    if faites >= pb.tentatives:
        return Bascule(None, 0, faites)
    plafond = Decimal(payee.cout_total_livre) * (100 + pb.ecart_max_pour_cent) / 100
    tenables = [
        c
        for c in _possibles(offres, panier_sans_l_article, quantite, mode, pl, distances)
        if c.offre.vendeur not in deja_essayes
        and c.offre.vendeur != payee.offre.vendeur
        and c.offre.trust_score >= pb.trust_min
        and c.cout_total_livre <= plafond
    ]
    choisie = _meilleure(tenables)
    if choisie is None:
        return Bascule(None, 0, faites + 1)
    return Bascule(choisie, max(choisie.cout_total_livre - payee.cout_total_livre, 0), faites + 1)


# ── Prix d'une carte, distance, retirable aujourd'hui ───────────────────────────────────────────────────


@dataclass(frozen=True)
class PrixCarte:
    prix: int  # prix livré le plus bas ; sans prix livré connu (XL en relais, distance inconnue), prix de l'article
    livraison_comprise: bool  # False : « Livraison à domicile », sans montant (CRE-27)
    a_partir_de: bool  # « à partir de » si les variantes actives n'ont pas toutes le même prix
    domicile_seulement: bool  # toutes les variantes sont XL ou hors gabarit


def prix_de_carte(
    variantes_actives: tuple[tuple[int, Classe], ...],
    mode: Mode,
    p: ParametresLivraison,
    distance_domicile_km: Decimal | None = None,
) -> PrixCarte:
    """Le plus bas des prix livrés des variantes actives (CAL-03) : Tecno Camon 30, « dès 139 000 F » (128 Go)
    quand le 256 Go est à 150 699 F, livraison comprise selon le mode du client."""
    if not variantes_actives:
        raise ValueError("aucune variante active : le produit n'a pas de carte")
    livres = [prix_livre(prix, classe, mode, p, distance_domicile_km) for prix, classe in variantes_actives]
    connus = [v.total for v in livres if v.total is not None]
    domicile = all(v.domicile_seulement for v in livres)
    if connus:
        return PrixCarte(min(connus), True, len(set(connus)) > 1 or len(connus) < len(livres), domicile)
    nus = [v.prix for v in livres]
    return PrixCarte(min(nus), False, len(set(nus)) > 1, domicile)


def distance_affichee(metres: Decimal | int | str) -> Decimal:
    """Distance géodésique (calculée par la base) affichée en km, à 0,1 km près (CAL-04) ; float refusé."""
    m = decimal(metres)
    if not m.is_finite() or m < 0:
        raise ValueError(f"distance invalide : {metres!r}")
    return (m.copy_abs() / 1000).quantize(Decimal("0.1"), rounding=ROUND_HALF_UP)


def retirable_aujourd_hui(
    maintenant: datetime, preparation: timedelta, tournee: timedelta, fermeture_relais: datetime | None, classe: Classe
) -> tuple[bool, datetime]:
    """(retirable aujourd'hui, heure « dès ») ; fermeture None : relais fermé aujourd'hui (CAL-05).
    Relais Mvog-Ada, fermeture 19 h : 10 h 15 + 4 h + 45 min = 15 h → « dès 15 h »."""
    if maintenant.tzinfo is None or (fermeture_relais is not None and fermeture_relais.tzinfo is None):
        raise ValueError("heure sans fuseau : les délais se comptent à l'heure de Yaoundé (Africa/Douala)")
    pret = maintenant + preparation + tournee
    if fermeture_relais is None or Classe(classe) in GROS:
        return False, pret
    return pret <= fermeture_relais, pret


# ── Visibilité ──────────────────────────────────────────────────────────────────────────────────────────


class Visibilite(str, Enum):
    VISIBLE = "visible"
    EPUISE = "épuisé"  # visible, en fin de liste, photo atténuée (CRE-26)
    INVISIBLE = "invisible"


@dataclass(frozen=True)
class EtatProduit:
    piece_du_vendeur_validee: bool
    categorie_interdite: bool
    stock_total_disponible: int  # tous vendeurs confondus


def visibilite(e: EtatProduit) -> Visibilite:
    if not e.piece_du_vendeur_validee or e.categorie_interdite:
        return Visibilite.INVISIBLE
    if e.stock_total_disponible <= 0:
        return Visibilite.EPUISE
    return Visibilite.VISIBLE
