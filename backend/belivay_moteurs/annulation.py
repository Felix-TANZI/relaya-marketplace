"""Annulation par boutique et changement de relais (CL-12 ; CAL-10, CAL-24, CAL-25 ; CAN-09, CRL-07 à CRL-14 ;
décisions DP-18, DP-25, DP-37).

Annulation d'une sous-commande (tant qu'elle n'est pas collectée) :
    F      = Ram + Rem + Suppl − Off          frais de livraison de la commande
    F_après = F(commande sans la sous-commande), avec l'Off d'origine conservé
    Remb   = P_sc + max(0, F_avant − F_après)  le client récupère toujours au moins le prix de ses articles

Les suppléments de classe font partie des frais de livraison : un colis XL annulé n'est pas livré, son
supplément est rendu avec la différence de frais (DP-48, bien que CAN-11 écrive F = Ram + Rem − Off).

On ne rend jamais plus que ce qui a été payé : la somme des remboursements d'une commande est plafonnée par le
montant encaissé. Une commande « Validée · à payer au retrait » n'a encaissé que l'avance : on ne rend que la
différence de frais, dans la limite de l'avance (CAN-22 : une fois arrivée, plus d'annulation).

Changement de relais : gratuit pour ce qui n'est pas collecté (tout change ensemble) ; un colis en tournée
continue vers le relais d'origine (deux relais, deux codes), ou le client attend son arrivée pour un transfert
(CRL-07) ; un colis arrivé se transfère au prix de sa remise (400 F S ou M, 600 F L, DP-37), garde due comprise,
en une seule demande Mobile Money. Relais fermé plusieurs jours (DP-42) : le client choisit un autre relais
gratuitement ; sans réponse sous RELAIS-FERME-TRANSFERT-H, transfert automatique au relais ouvert le plus proche,
nouveau code, garde reprise au jour 1 (rien de la garde passée n'est dû).
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum

from .argent import ecrire
from .erreurs import ErreurMoteur
from .frais import Classe, Panier, SousCommande, calculer
from .registre import ParametresLivraison, ParametresPaiement


class AnnulationImpossible(ErreurMoteur):
    """Sous-commande collectée ou arrivée : « Annulation impossible » (CAN-09) ; au serveur, 409 state_changed."""


def frais_de_livraison(panier: Panier | None, p: ParametresLivraison, offert: int) -> int:
    """F = Ram + Rem + Suppl − Off, Off imposé (conservé depuis le paiement) ; 0 pour une commande vide."""
    if panier is None:
        return 0
    f = calculer(panier, p)
    return f.ramassages + f.remises + f.supplements - offert


@dataclass(frozen=True)
class Remboursement:
    boutique: str
    prix: int  # P_sc rendu (0 pour une commande au comptoir : les articles n'ont pas été payés)
    livraison: int  # max(0, F_avant − F_après)
    montant: int  # Remb, plafonné par ce qui reste encaissé
    reste: Panier | None  # commande après l'annulation
    trace: tuple[str, ...]


def annuler(
    commande: Panier,
    boutique: str,
    p: ParametresLivraison,
    offert: int,
    *,
    collectee: bool,
    encaisse: int | None = None,
    deja_rembourse: int = 0,
    au_comptoir: bool = False,
) -> Remboursement:
    """Rembourse une boutique d'une commande payée ou validée au comptoir (CAL-24, CAN-12, CAN-22).

    `offert` : Off accordé au paiement, conservé (CAL-10) ; `encaisse` : ce que la commande a réellement encaissé
    (par défaut, son total) ; `deja_rembourse` : ce que les annulations précédentes ont déjà rendu."""
    if collectee:
        raise AnnulationImpossible(f"{boutique} : déjà collectée, annulation impossible (CAN-09)")
    sc = next((s for s in commande.sous_commandes if s.boutique == boutique), None)
    if sc is None:
        raise AnnulationImpossible(f"{boutique} : pas dans cette commande")
    if encaisse is None:
        if deja_rembourse:
            raise ValueError("après une première annulation, il faut l'encaissé de la commande d'origine")
        encaisse = frais_de_livraison(commande, p, offert) + (0 if au_comptoir else commande_sous_total(commande))
    if not 0 <= deja_rembourse <= encaisse:
        raise ValueError(f"déjà remboursé {deja_rembourse} F hors de [0, {encaisse}] F encaissés")
    restantes = tuple(s for s in commande.sous_commandes if s.boutique != boutique)
    reste = Panier(commande.mode, restantes) if restantes else None
    f_avant = frais_de_livraison(commande, p, offert)
    f_apres = frais_de_livraison(reste, p, offert)
    livraison = max(0, f_avant - f_apres)
    prix = 0 if au_comptoir else sc.sous_total
    du = prix + livraison
    montant = min(du, encaisse - deja_rembourse)
    trace = [
        f"F avant = {ecrire(f_avant)} ; F après, Off conservé ({ecrire(offert)}) = {ecrire(f_apres)} (CAL-24, CAL-10)",
        f"Remb = {ecrire(prix)} + max(0, {ecrire(f_avant)} − {ecrire(f_apres)}) = {ecrire(du)}",
    ]
    if montant < du:
        trace.append(
            f"Plafonné à ce qui reste encaissé : {ecrire(encaisse)} − {ecrire(deja_rembourse)} = {ecrire(montant)}"
        )
    return Remboursement(boutique, prix, livraison, montant, reste, tuple(trace))


def commande_sous_total(commande: Panier) -> int:
    return sum(s.sous_total for s in commande.sous_commandes)


# ── Changement de relais ────────────────────────────────────────────────────────────────────────────────


class EtatColis(str, Enum):
    NON_COLLECTE = "non collecté"
    EN_TOURNEE = "en tournée"
    ARRIVE = "arrivé"


@dataclass(frozen=True)
class ColisDeCommande:
    sous_commande: SousCommande
    etat: EtatColis


@dataclass(frozen=True)
class ChangementRelais:
    changent_gratuitement: tuple[str, ...]  # boutiques non collectées : elles changent ensemble
    restent_au_relais_d_origine: tuple[str, ...]  # en tournée : « deux relais, deux codes » (CRL-07)
    transferes: tuple[str, ...]  # arrivés : transfert payant (gratuit si le relais est fermé, DP-42)
    transfert: int  # Σ prix de la remise de chaque colis transféré (DP-37)
    garde_due: int  # garde déjà comptée au premier relais (CRL-10)
    montant_du: int  # une seule demande Mobile Money
    deux_codes: bool
    trace: tuple[str, ...]
    attendre_possible: bool = False  # colis en tournée : « attendre l'arrivée pour un transfert » (CRL-07)
    transfert_si_attente: int = 0  # ce que coûterait ce transfert une fois les colis arrivés
    transfert_automatique_sous_heures: int | None = None  # relais fermé, sans réponse du client (DP-42)


def changer_de_relais(
    colis: tuple[ColisDeCommande, ...], p: ParametresPaiement, garde_due: int = 0, *, relais_ferme: bool = False
) -> ChangementRelais:
    """Ce que coûte et ce que fait un changement de relais (CAL-25, CRL-07, CRL-09, CRL-10, DP-42)."""
    # Relais fermé (DP-42) : les colis en tournée ne peuvent pas y être déposés, ils changent avec le reste.
    libres = tuple(
        c.sous_commande.boutique
        for c in colis
        if c.etat is EtatColis.NON_COLLECTE or (relais_ferme and c.etat is EtatColis.EN_TOURNEE)
    )
    tournee = () if relais_ferme else tuple(c.sous_commande.boutique for c in colis if c.etat is EtatColis.EN_TOURNEE)
    arrives = [c for c in colis if c.etat is EtatColis.ARRIVE]
    for c in arrives:
        if c.sous_commande.classe_colis in (Classe.XL, Classe.HG):
            raise ErreurMoteur(
                f"{c.sous_commande.boutique} : un colis {c.sous_commande.classe_colis.value} n'est jamais en relais"
            )
    for c in colis:
        if c.etat is EtatColis.EN_TOURNEE and c.sous_commande.classe_colis in (Classe.XL, Classe.HG):
            raise ErreurMoteur(f"{c.sous_commande.boutique} : un colis XL ou hors gabarit n'est jamais en relais")
    tarif = [p.transfert[c.sous_commande.classe_colis.value] for c in arrives]
    prix = [0] * len(arrives) if relais_ferme else tarif
    transfert = sum(prix)
    garde = 0 if relais_ferme or not arrives else garde_due
    du = transfert + garde
    trace = []
    if relais_ferme:
        trace.append(
            f"Relais fermé : changement gratuit, garde reprise au jour 1 ; sans réponse sous "
            f"{p.relais_ferme_transfert_heures} h, transfert automatique au relais ouvert le plus proche (DP-42)"
        )
    elif arrives:
        detail = " + ".join(f"{ecrire(x)} ({c.sous_commande.classe_colis.value})" for x, c in zip(prix, arrives))
        trace.append(f"Transfert = {detail} = {ecrire(transfert)} (CRL-09, TRANSFERT-RELAIS, DP-37)")
        trace.append(f"Montant dû = transfert + garde due {ecrire(garde_due)} = {ecrire(du)} (CRL-10)")
    if libres:
        trace.append("Sous-commandes non collectées : changement gratuit, toutes ensemble (CAL-25, CRL-01)")
    deux_codes = bool(tournee) and bool(libres or arrives)
    attente = sum(p.transfert[c.sous_commande.classe_colis.value] for c in colis if c.sous_commande.boutique in tournee)
    if tournee:
        trace.append(
            f"Colis en tournée : deux relais, deux codes, ou attendre l'arrivée et transférer ({ecrire(attente)}) (CRL-07)"
        )
    return ChangementRelais(
        libres,
        tournee,
        tuple(c.sous_commande.boutique for c in arrives),
        transfert,
        garde,
        du,
        deux_codes,
        tuple(trace),
        bool(tournee),
        attente,
        p.relais_ferme_transfert_heures if relais_ferme else None,
    )


__all__ = [
    "AnnulationImpossible",
    "ChangementRelais",
    "ColisDeCommande",
    "EtatColis",
    "Remboursement",
    "annuler",
    "changer_de_relais",
    "commande_sous_total",
    "frais_de_livraison",
]
