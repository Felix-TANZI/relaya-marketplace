"""Carte, Apple Pay et Google Pay (CL-08, CL-12 ; CAL-26 ; CET-16, CPN-48, CPY-48 ; prototype du 1er octobre).

- Frais de service = arrondi(2 % × (S + livraison)), affichés avant de payer.
- Euros = francs ÷ 655,957, au centime le plus proche (PAY-CARTE-ARRONDI).
- Dollars US (décision du porteur du 30 septembre, prototype) : francs ÷ taux du jour du prestataire, figé au
  moment du paiement, au centime le plus proche. Seules ces deux devises servent à payer depuis l'étranger ;
  le choix du payeur est gardé pour la session.
- Apple Pay et Google Pay (décision du porteur du 29 septembre, prototype) : des cartes enregistrées dans le
  téléphone, avec les mêmes règles que la carte (2 % de frais, 150 000 F au plus par paiement, argent bloqué
  jusqu'au retrait), proposées partout où la carte l'est et pour recharger le portefeuille.
- 150 000 F au plus par transaction, frais de service compris (CET-16). Au-delà, paiement en plusieurs
  commandes, chacune recalculée depuis zéro (ramassages, remises, livraison offerte), regroupées par boutique ;
  un article qui dépasse seul le plafond ne se paie pas par carte et reste dans le panier du client ; une ligne
  de plusieurs unités se découpe unité par unité.
- Frais de service à l'annulation (CET-24) : acquis si le bénéficiaire annule ; rendus si le vendeur ou BelivaY
  annule.

Découpage (choix d'implémentation, la spécification ne fixe pas l'algorithme) : on place les boutiques de la
plus chère à la moins chère dans la première commande où elles tiennent, chaque essai étant recalculé en
entier ; une boutique trop chère à elle seule est découpée article par article de la même façon. Le résultat
ne dépend que du panier : deux calculs du même panier donnent les mêmes commandes.
"""

from __future__ import annotations

from dataclasses import dataclass
from decimal import ROUND_HALF_UP, Decimal
from enum import Enum

from .argent import pourcentage_de
from .frais import Article, Classe, FraisPanier, Panier, SousCommande, calculer
from .registre import ParametresLivraison, ParametresPaiement

# Parité fixe et légale entre le franc CFA (XAF) et l'euro, depuis 1999 : ce n'est pas une valeur commerciale
# du registre. Les autres devises se paient au taux du prestataire, figé au moment du paiement (CAL-26).
PARITE_EURO = Decimal("655.957")


class MoyenCarte(str, Enum):
    """Moyens qui suivent les règles de la carte (prototype du 29 septembre)."""

    CARTE = "carte"
    APPLE_PAY = "Apple Pay"
    GOOGLE_PAY = "Google Pay"


class Devise(str, Enum):
    EUR = "EUR"
    USD = "USD"


def en_devise(francs: int, devise: Devise, taux_usd_du_jour: Decimal | None = None) -> Decimal:
    """Montant à payer dans la devise du payeur, au centime le plus proche.

    Euro : parité fixe (655,957 F). Dollar US : taux du jour du prestataire, figé au moment du paiement ; le
    taux vient du prestataire, jamais du code (prototype : 1 $ = 578,50 F, valeur de démonstration)."""
    if Devise(devise) is Devise.EUR:
        return en_euros(francs)
    if taux_usd_du_jour is None or taux_usd_du_jour <= 0:
        raise ValueError("dollar US : il faut le taux du jour du prestataire, figé au moment du paiement")
    return (Decimal(francs) / taux_usd_du_jour).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def frais_de_service(montant: int, p: ParametresPaiement) -> int:
    """11 900 → 238 F ; 19 400 → 388 F ; 272 579 → 5 451,58 → 5 452 F (moitié vers le haut)."""
    return pourcentage_de(montant, p.carte_frais_pour_cent)


def en_euros(francs: int) -> Decimal:
    """12 138 F → 18,50 € ; 19 788 F → 30,17 €."""
    return (Decimal(francs) / PARITE_EURO).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


@dataclass(frozen=True)
class TransactionCarte:
    commande: Panier
    frais: FraisPanier
    service: int
    total: int  # frais.total + service, au plus PAY-CARTE-MAX
    devise: Devise
    montant_devise: Decimal  # total dans la devise du payeur, au centime (CAL-26)

    @property
    def euros(self) -> Decimal:
        return en_euros(self.total)


@dataclass(frozen=True)
class PaiementCarte:
    transactions: tuple[TransactionCarte, ...]
    reste_au_panier: tuple[Article, ...]  # articles qui dépassent seuls le plafond

    @property
    def total(self) -> int:
        return sum(t.total for t in self.transactions)


def transaction(
    commande: Panier,
    pl: ParametresLivraison,
    pp: ParametresPaiement,
    devise: Devise = Devise.EUR,
    taux_usd_du_jour: Decimal | None = None,
) -> TransactionCarte:
    f = calculer(commande, pl)
    service = frais_de_service(f.total, pp)
    total = f.total + service
    return TransactionCarte(commande, f, service, total, Devise(devise), en_devise(total, devise, taux_usd_du_jour))


def _unites(a: Article) -> list[Article]:
    """Une ligne de plusieurs unités se découpe unité par unité : c'est l'unité qui dépasse ou non le plafond."""
    return [a] if a.quantite == 1 else [Article(a.produit, a.prix, 1, a.classe) for _ in range(a.quantite)]


def _regrouper(articles: list[Article]) -> tuple[Article, ...]:
    """Les unités d'un même produit placées dans la même commande redeviennent une ligne."""
    lignes: dict[tuple[str, int, Classe], int] = {}
    for a in articles:
        cle = (a.produit, a.prix, a.classe)
        lignes[cle] = lignes.get(cle, 0) + a.quantite
    return tuple(Article(p, prix, q, c) for (p, prix, c), q in lignes.items())


def payer_par_carte(
    panier: Panier,
    pl: ParametresLivraison,
    pp: ParametresPaiement,
    devise: Devise = Devise.EUR,
    taux_usd_du_jour: Decimal | None = None,
) -> PaiementCarte:
    """Le panier en une ou plusieurs commandes payables par carte (CET-16), dans la devise du payeur."""
    if Devise(devise) is Devise.USD:
        en_devise(0, devise, taux_usd_du_jour)  # taux absent : refusé avant tout calcul

    def tient(sous_commandes: tuple[SousCommande, ...]) -> bool:
        return transaction(Panier(panier.mode, sous_commandes), pl, pp).total <= pp.carte_max

    unites: list[SousCommande] = []
    reste: list[Article] = []
    for sc in panier.sous_commandes:
        if tient((sc,)):
            unites.append(sc)
            continue
        # La boutique dépasse seule : ses articles, unité par unité, sont répartis de la même façon ; une unité
        # trop chère à elle seule reste au panier.
        groupes: list[list[Article]] = []
        for a in sorted((u for x in sc.articles for u in _unites(x)), key=lambda x: -x.prix):
            seul = SousCommande(sc.boutique, sc.zone, (a,), sc.distance_domicile_km)
            if not tient((seul,)):
                reste.append(a)
                continue
            for g in groupes:
                essai = SousCommande(sc.boutique, sc.zone, _regrouper([*g, a]), sc.distance_domicile_km)
                if tient((essai,)):
                    g.append(a)
                    break
            else:
                groupes.append([a])
        unites += [SousCommande(sc.boutique, sc.zone, _regrouper(g), sc.distance_domicile_km) for g in groupes]

    commandes: list[list[SousCommande]] = []
    for u in sorted(unites, key=lambda x: -x.sous_total):
        for c in commandes:
            # Une commande ne porte qu'une sous-commande par boutique (CCY-15).
            if all(x.boutique != u.boutique for x in c) and tient((*c, u)):
                c.append(u)
                break
        else:
            commandes.append([u])

    return PaiementCarte(
        tuple(transaction(Panier(panier.mode, tuple(c)), pl, pp, devise, taux_usd_du_jour) for c in commandes),
        _regrouper(reste),
    )


# ── Frais de service à l'annulation (CET-24) ────────────────────────────────────────────────────────────


class AnnulePar(str, Enum):
    CLIENT = "client"  # le bénéficiaire
    VENDEUR = "vendeur"
    BELIVAY = "BelivaY"


@dataclass(frozen=True)
class PartDuService:
    rendue: int  # frais de service rendus sur la carte avec cette annulation
    acquise: int  # frais de service qui restent acquis (annulation par le bénéficiaire)


def part_du_service(
    service_debite: int,
    service_deja_reparti: int,
    montant_rembourse: int,
    derniere_boutique: bool,
    par: AnnulePar,
    pp: ParametresPaiement,
) -> PartDuService:
    """Part des frais de service d'une annulation (CET-24) : le bénéficiaire qui annule ne la récupère pas
    (BLV-52124 : 11 900 F rendus, les 238 F restent acquis) ; une annulation par le vendeur ou par BelivaY rend
    tout ce qui a été débité (12 138 F). `service_deja_reparti` : ce que les annulations précédentes ont déjà
    rendu ou laissé acquis.

    DP-48 : la part d'une boutique sur plusieurs est 2 % du montant
    remboursé ; la dernière boutique prend le reste, pour que parts rendues et acquises fassent exactement
    les frais débités."""
    restant = service_debite - service_deja_reparti
    if restant < 0 or service_deja_reparti < 0:
        raise ValueError("frais de service déjà répartis au-delà de ce qui a été débité")
    part = restant if derniere_boutique else min(restant, frais_de_service(montant_rembourse, pp))
    if AnnulePar(par) is AnnulePar.CLIENT:
        return PartDuService(0, part)
    return PartDuService(part, 0)
