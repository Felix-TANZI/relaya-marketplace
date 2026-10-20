"""Portefeuille BelivaY (CWL-01 à CWL-12 ; décisions DP-06, DP-16, DP-17, DP-23) : développé, fermé au lancement
par FF-WALLET, ouvert à la main par le porteur après validation juridique (CWL-12).

- Un portefeuille par compte, en francs entiers, plafonné à WALLET-PLAFOND (CWL-01, DP-06).
- Recharge par Mobile Money, au moins WALLET-RECHARGE-MIN, jamais au-delà du plafond, sans frais (CWL-02) ;
  créditée seulement au webhook signé (CWL-03) : ce moteur ne reçoit que des recharges confirmées.
- Le solde paie tout ou partie d'une commande, le reste en Mobile Money (CWL-04).
- Remboursements (CWL-05, CWL-06, DP-17) : FF-WALLET fermé → vers le moyen d'origine ; ouvert → au portefeuille,
  sauf une carte, remboursée sur la même carte ; l'excédent au-delà du plafond repart vers le moyen d'origine.
- Retrait (CWL-07, CWL-08) vers le numéro vérifié : au moins WALLET-RETRAIT-MIN, au plus WALLET-RETRAIT-JOUR
  par jour, versé sous WALLET-RETRAIT-H. L'argent venu d'un remboursement se retire toujours sans frais ; pour
  l'argent rechargé, WALLET-RETRAIT-GRATUIT retrait par mois civil est gratuit, les suivants coûtent
  WALLET-RETRAIT-FRAIS. Une recharge qui n'a servi à aucune commande attend WALLET-RECHARGE-ATTENTE ; après un
  changement de numéro, les retraits attendent WALLET-NUMERO-ATTENTE.
- Biométrie pour payer ou retirer à partir de CODE-BIO (CWL-10) ; suppression du compte refusée tant que le
  solde n'est pas nul (CWL-11).

Ordres décidés par le porteur (DP-48) : un paiement par le solde
prend d'abord l'argent rechargé (le plus ancien d'abord), puis l'argent remboursé ; un retrait prend d'abord
l'argent remboursé (sans frais), puis l'argent rechargé. Ces deux ordres sont les plus favorables au client.
"""

from __future__ import annotations

from dataclasses import dataclass, replace
from datetime import date, datetime, timedelta
from enum import Enum
from zoneinfo import ZoneInfo

from .argent import pourcentage_de
from .registre import ParametresPaiement, ParametresPortefeuille

YAOUNDE = ZoneInfo("Africa/Douala")


def _jour(d: datetime) -> date:
    """Le jour et le mois civil se comptent à l'heure de Yaoundé ; une heure sans fuseau est refusée."""
    if d.tzinfo is None:
        raise ValueError("heure sans fuseau : le portefeuille compte à l'heure de Yaoundé (Africa/Douala)")
    return d.astimezone(YAOUNDE).date()


def _positif(montant: int) -> None:
    if isinstance(montant, bool) or not isinstance(montant, int) or montant <= 0:
        raise ValueError(f"montant invalide : {montant!r} (francs entiers positifs)")


@dataclass(frozen=True)
class Recharge:
    le: datetime
    restant: int
    a_servi: bool = False  # a payé (en partie) une commande : retirable sans attendre


@dataclass(frozen=True)
class RetraitFait:
    le: datetime
    montant: int
    part_rechargee: int  # part prise sur l'argent rechargé (compte pour le retrait gratuit du mois)


@dataclass(frozen=True)
class Portefeuille:
    recharges: tuple[Recharge, ...] = ()
    rembourse: int = 0  # argent venu de remboursements, toujours retirable sans frais
    retraits: tuple[RetraitFait, ...] = ()
    numero_change_le: datetime | None = None

    @property
    def solde(self) -> int:
        return self.rembourse + sum(r.restant for r in self.recharges)


class Refus(str, Enum):
    MINIMUM = "en dessous du minimum"
    PLAFOND = "au-delà du plafond du portefeuille"
    PLAFOND_DU_JOUR = "au-delà du plafond de retrait du jour"
    SOLDE = "solde insuffisant"
    ATTENTE_RECHARGE = "recharge pas encore retirable"
    ATTENTE_NUMERO = "numéro changé récemment"


@dataclass(frozen=True)
class Resultat:
    accepte: bool
    portefeuille: Portefeuille
    refus: Refus | None = None
    encore_possible: int = 0  # recharge : ce qui reste possible sous le plafond (CWL-06)


def recharger(pf: Portefeuille, montant: int, le: datetime, p: ParametresPortefeuille) -> Resultat:
    _positif(montant)
    _jour(le)
    possible = max(p.plafond - pf.solde, 0)
    if montant < p.recharge_min:
        return Resultat(False, pf, Refus.MINIMUM, possible)
    if montant > possible:
        return Resultat(False, pf, Refus.PLAFOND, possible)
    return Resultat(True, replace(pf, recharges=(*pf.recharges, Recharge(le, montant))), None, possible - montant)


@dataclass(frozen=True)
class Credit:
    portefeuille: Portefeuille
    au_portefeuille: int
    vers_le_moyen_d_origine: int


def crediter_remboursement(
    pf: Portefeuille, montant: int, portefeuille_ouvert: bool, paye_par_carte: bool, p: ParametresPortefeuille
) -> Credit:
    """Destination d'un remboursement (REMB-DESTINATION, DP-06, DP-17, CWL-05, CWL-06)."""
    _positif(montant)
    if not portefeuille_ouvert or paye_par_carte:
        return Credit(pf, 0, montant)
    place = max(p.plafond - pf.solde, 0)
    credit = min(montant, place)
    return Credit(replace(pf, rembourse=pf.rembourse + credit), credit, montant - credit)


@dataclass(frozen=True)
class PaiementParSolde:
    portefeuille: Portefeuille
    par_le_solde: int
    complement_mobile_money: int
    biometrie: bool


def payer(pf: Portefeuille, montant: int, pp: ParametresPaiement, utiliser_le_solde: bool = True) -> PaiementParSolde:
    """Le solde paie ce qu'il peut, le reste en Mobile Money (CWL-04) ; biométrie dès CODE-BIO (CWL-10)."""
    _positif(montant)
    part = min(pf.solde, montant) if utiliser_le_solde else 0
    reste = part
    recharges = []
    for r in sorted(pf.recharges, key=lambda x: x.le):
        prise = min(r.restant, reste)
        reste -= prise
        recharges.append(replace(r, restant=r.restant - prise, a_servi=r.a_servi or prise > 0))
    nouveau = Portefeuille(
        tuple(x for x in recharges if x.restant > 0), pf.rembourse - reste, pf.retraits, pf.numero_change_le
    )
    return PaiementParSolde(nouveau, part, montant - part, part >= pp.code_bio)


@dataclass(frozen=True)
class Retrait:
    accepte: bool
    portefeuille: Portefeuille
    refus: Refus | None
    frais: int
    verse_au_plus_tard: datetime | None
    biometrie: bool
    retirable: int  # ce qui peut être retiré maintenant


def retirable(pf: Portefeuille, le: datetime, p: ParametresPortefeuille) -> int:
    """Remboursé + recharges ayant servi ou passées WALLET-RECHARGE-ATTENTE ; rien pendant l'attente du numéro."""
    _jour(le)
    if pf.numero_change_le and le < pf.numero_change_le + timedelta(hours=p.numero_attente_heures):
        return 0
    attente = timedelta(hours=p.recharge_attente_heures)
    return pf.rembourse + sum(r.restant for r in pf.recharges if r.a_servi or le >= r.le + attente)


def retirer(pf: Portefeuille, montant: int, le: datetime, p: ParametresPortefeuille, pp: ParametresPaiement) -> Retrait:
    _positif(montant)
    dispo = retirable(pf, le, p)

    def non(refus: Refus) -> Retrait:
        return Retrait(False, pf, refus, 0, None, False, dispo)

    if montant < p.retrait_min:
        return non(Refus.MINIMUM)
    if montant > pf.solde:
        return non(Refus.SOLDE)
    if pf.numero_change_le and le < pf.numero_change_le + timedelta(hours=p.numero_attente_heures):
        return non(Refus.ATTENTE_NUMERO)
    if montant > dispo:
        return non(Refus.ATTENTE_RECHARGE)
    du_jour = sum(r.montant for r in pf.retraits if _jour(r.le) == _jour(le))
    if du_jour + montant > p.retrait_jour:
        return non(Refus.PLAFOND_DU_JOUR)

    # D'abord l'argent remboursé (sans frais), puis les recharges retirables, les plus anciennes d'abord.
    part_rembourse = min(pf.rembourse, montant)
    reste = montant - part_rembourse
    attente = timedelta(hours=p.recharge_attente_heures)
    recharges = []
    for r in sorted(pf.recharges, key=lambda x: x.le):
        prise = min(r.restant, reste) if (r.a_servi or le >= r.le + attente) else 0
        reste -= prise
        recharges.append(replace(r, restant=r.restant - prise))
    part_rechargee = montant - part_rembourse
    mois = _jour(le).replace(day=1)
    deja = sum(1 for r in pf.retraits if r.part_rechargee > 0 and _jour(r.le).replace(day=1) == mois)
    frais = 0
    if part_rechargee > 0 and deja >= p.retraits_gratuits_par_mois:
        frais = max(pourcentage_de(part_rechargee, p.retrait_frais_pour_cent), p.retrait_frais_min)
    nouveau = Portefeuille(
        tuple(x for x in recharges if x.restant > 0),
        pf.rembourse - part_rembourse,
        (*pf.retraits, RetraitFait(le, montant, part_rechargee)),
        pf.numero_change_le,
    )
    return Retrait(True, nouveau, None, frais, le + timedelta(hours=p.retrait_heures), montant >= pp.code_bio, dispo)


def suppression_du_compte_possible(pf: Portefeuille) -> bool:
    """Refusée tant que le solde n'est pas nul : 409 solde_non_nul (CWL-11)."""
    return pf.solde == 0
