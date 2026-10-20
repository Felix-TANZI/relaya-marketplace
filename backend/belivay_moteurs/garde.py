"""Garde au relais et série de rappels S0 à S5 (CL-10 ; CAL-19 à CAL-23 ; CGA-13, CGA-17, CGA-24 à CGA-28 ;
décisions DP-08, DP-24, DP-29).

- La garde s'applique par groupe de remise, c'est-à-dire par code (CGA-13).
- J0 est le jour du premier accusé fort du message d'arrivée (CAL-20) : rang 1. Sans accusé fort, rien n'est
  facturé ; la relance part par le canal de repli GARDE-NONVU-H heures après l'arrivée.
- Tarif du rang r (1 à 7) : GARDE-GRILLE[r] ; gros colis (cartons C1, C2) : + GARDE-GROS-AJOUT chaque jour dès
  le rang 1 (DP-08). Un jour de fermeture compte dans le rang et n'est jamais facturé ; aucun jour n'est
  facturé pendant un litige, un groupage ou un transfert (CAL-21). Jour entier (DP-29).
- Garde plafonnée à la valeur des colis du groupe (CAL-19).
- Renvoi au vendeur le premier jour ouvert après le rang 7 : retenue = garde + GARDE-RENVOI, jamais plus que ce
  qui a été payé (DP-24) ; le solde est remboursé vers le moyen d'origine avec S5 (CAL-22, CGA-17).
- Gain du relais : RELAIS-GAIN-GARDE (ou -GROS) par jour facturé (CAL-21).

L'abonnement (jours gratuits en plus, F_client = 1 + bonus) vient après le lancement (FF-ABONNEMENT fermé) :
il n'est pas pris en charge ici.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, time, timedelta
from enum import Enum
from zoneinfo import ZoneInfo

from .argent import ecrire
from .registre import ParametresGarde

DERNIER_RANG = 7
RANGS_DES_RAPPELS = (2, 3, 5, 6, 7)  # S0, S1, S2, S3, S4 (CGA-24)
YAOUNDE = ZoneInfo("Africa/Douala")


def j0_de(accuse_fort: datetime) -> date:
    """Jour J0 à Yaoundé : un accusé reçu à 23 h 30 UTC tombe le lendemain à Douala (CAL-19, fuseau Africa/Douala)."""
    if accuse_fort.tzinfo is None:
        raise ValueError("accusé fort sans fuseau : impossible de savoir quel jour il tombe à Yaoundé")
    return accuse_fort.astimezone(YAOUNDE).date()


@dataclass(frozen=True)
class HorairesRelais:
    ouverture: time
    fermeture: time
    jours_fermes_semaine: frozenset[int] = frozenset()  # 0 = lundi … 6 = dimanche
    fermetures: frozenset[date] = frozenset()  # fermetures exceptionnelles

    def __post_init__(self) -> None:
        if set(range(7)) <= set(self.jours_fermes_semaine):
            raise ValueError("un relais fermé tous les jours de la semaine ne peut pas garder de colis")

    def ouvert(self, jour: date) -> bool:
        return jour.weekday() not in self.jours_fermes_semaine and jour not in self.fermetures


@dataclass(frozen=True)
class GroupeEnGarde:
    """Un groupe de remise (un code) arrivé au relais."""

    reference: str
    j0: date | None  # jour du premier accusé fort ; None tant qu'il n'y en a pas
    valeur: int  # valeur des colis du groupe : plafond de la garde
    montant_paye: int  # ce que le client a payé : retenue au plus (DP-24)
    gros: bool  # au moins un carton C1 ou C2
    horaires: HorairesRelais
    jours_suspendus: frozenset[date] = frozenset()  # litige, groupage, transfert (CAL-21)
    # Jours où un rappel de garde n'a pas été délivré : la garde de la période est annulée (CSM-30).
    rappels_non_delivres: frozenset[date] = frozenset()

    def jours_sans_frais(self) -> frozenset[date]:
        """CSM-30 : du jour du rappel non délivré jusqu'au rappel suivant (non compris), aucun frais (DP-48)."""
        if not self.rappels_non_delivres or self.j0 is None:
            return frozenset()
        jours_des_rappels = sorted(self.jour_du_rang(r) for r in RANGS_DES_RAPPELS)
        libres: set[date] = set()
        for nd in self.rappels_non_delivres:
            suivants = [j for j in jours_des_rappels if j > nd and j not in self.rappels_non_delivres]
            fin = suivants[0] if suivants else self.jour_du_rang(DERNIER_RANG + 1)
            libres.update(nd + timedelta(days=k) for k in range((fin - nd).days))
        return frozenset(libres)

    def rang(self, jour: date) -> int | None:
        if self.j0 is None or jour < self.j0:
            return None
        return (jour - self.j0).days + 1

    def jour_du_rang(self, rang: int) -> date:
        if self.j0 is None:
            raise ValueError(f"{self.reference} : pas d'accusé fort, aucun rang")
        return self.j0 + timedelta(days=rang - 1)

    def retirable_ce_jour(self, jour: date) -> bool:
        """Relais ouvert et garde non suspendue (litige, groupage, transfert)."""
        return self.horaires.ouvert(jour) and jour not in self.jours_suspendus


def tarif_du_jour(g: GroupeEnGarde, jour: date, p: ParametresGarde) -> int:
    r = g.rang(jour)
    if r is None or r > DERNIER_RANG or not g.horaires.ouvert(jour) or jour in g.jours_suspendus:
        return 0
    if jour in g.jours_sans_frais():
        return 0
    return p.grille[r - 1] + (p.ajout_gros if g.gros else 0)


@dataclass(frozen=True)
class EtatGarde:
    jour: date
    rang: int | None
    du: int  # garde due ce jour-là, jour entamé compris, plafonnée à la valeur
    tarif_du_jour: int  # tarif de la grille pour ce jour (0 s'il n'est pas facturé)
    ajout_du_jour: int  # ce que ce jour ajoute vraiment au montant dû, plafond compris
    du_demain: int  # ce qui sera dû demain (« 500 F demain »)
    jours_factures: int
    gain_relais: int  # jamais plus que la garde due : BelivaY ne paie pas ce qu'elle n'encaisse pas (CGA-18)


def etat(g: GroupeEnGarde, jour: date, p: ParametresGarde) -> EtatGarde:
    """Garde due le jour donné, jour entamé compris (« Montant dû : 300 F · 500 F demain »)."""

    def cumul(jusqu_au: date) -> tuple[int, int]:
        if g.j0 is None or jusqu_au < g.j0:
            return 0, 0
        tarifs = [
            tarif_du_jour(g, g.j0 + timedelta(days=k), p) for k in range(min((jusqu_au - g.j0).days + 1, DERNIER_RANG))
        ]
        return min(sum(tarifs), g.valeur), sum(1 for t in tarifs if t > 0)

    du, factures = cumul(jour)
    veille, _ = cumul(jour - timedelta(days=1))
    du_demain, _ = cumul(jour + timedelta(days=1))
    gain = min(factures * (p.gain_relais_jour_gros if g.gros else p.gain_relais_jour), du)
    return EtatGarde(jour, g.rang(jour), du, tarif_du_jour(g, jour, p), du - veille, du_demain, factures, gain)


def dernier_jour_de_retrait(g: GroupeEnGarde) -> date | None:
    """Dernier jour ouvert et non suspendu jusqu'au rang 7 compris (« retrait avant le sam. 26 au soir »)."""
    if g.j0 is None:
        return None
    for r in range(DERNIER_RANG, 0, -1):
        if g.retirable_ce_jour(g.jour_du_rang(r)):
            return g.jour_du_rang(r)
    return None


@dataclass(frozen=True)
class Renvoi:
    jour: date
    garde: int
    retenue: int  # garde + renvoi, jamais plus que le payé (DP-24)
    rembourse: int  # Z, vers le moyen d'origine, avec S5
    gain_relais: int  # au plus la garde réellement retenue (CGA-18)
    trace: tuple[str, ...]


#: Au-delà, un relais qui ne rouvre pas est un incident d'exploitation, pas un calcul de garde.
JOURS_DE_RECHERCHE_DU_RENVOI = 31


def renvoi(g: GroupeEnGarde, p: ParametresGarde) -> Renvoi | None:
    """Renvoi au vendeur le premier jour ouvert après le rang 7, jamais pendant un litige, un groupage ou un
    transfert (CAL-22, CAL-21) ; None sans accusé fort."""
    if g.j0 is None:
        return None
    jour = g.jour_du_rang(DERNIER_RANG + 1)
    for _ in range(JOURS_DE_RECHERCHE_DU_RENVOI):
        if g.retirable_ce_jour(jour):
            break
        jour += timedelta(days=1)
    else:
        raise ValueError(f"{g.reference} : aucun jour de renvoi possible dans les {JOURS_DE_RECHERCHE_DU_RENVOI} jours")
    e = etat(g, g.jour_du_rang(DERNIER_RANG), p)
    garde = e.du
    brut = garde + p.renvoi
    retenue = min(brut, g.montant_paye)
    # Retenue plafonnée (DP-24) : le renvoi est couvert d'abord, la garde ensuite ; le relais ne touche que la garde
    # réellement retenue (CGA-18). Ordre décidé par DP-48.
    garde_retenue = max(retenue - p.renvoi, 0)
    gain = min(e.gain_relais, garde_retenue)
    trace = [f"Garde des rangs 1 à 7 : {ecrire(garde)} (CAL-19, GARDE-GRILLE, DP-08)"]
    trace.append(f"Retenue = {ecrire(garde)} + {ecrire(p.renvoi)} = {ecrire(brut)} (CAL-22, GARDE-RENVOI)")
    if retenue < brut:
        trace.append(f"Retenue ramenée au montant payé : {ecrire(retenue)} (DP-24)")
    trace.append(
        f"Remboursé = {ecrire(g.montant_paye)} − {ecrire(retenue)} = {ecrire(g.montant_paye - retenue)} (CGA-17)"
    )
    return Renvoi(jour, garde, retenue, g.montant_paye - retenue, gain, tuple(trace))


def relance_non_vu(arrivee: datetime, p: ParametresGarde) -> datetime:
    """Sans accusé fort, relance par le canal de repli et alerte « colis non vu » (CAL-20, GARDE-NONVU-H)."""
    return arrivee + timedelta(hours=p.non_vu_heures)


class Canal(str, Enum):
    PUSH = "push"
    SMS = "SMS"


@dataclass(frozen=True)
class Rappel:
    code: str  # S0 … S5
    jour: date
    heure: time | None  # None : au départ du colis (S5)
    canal: Canal
    envoye: bool
    motif: str  # pourquoi il part ou ne part pas
    du: int = 0
    du_demain: int = 0
    dernier_jour: date | None = None
    dernier_jour_de_retrait: bool = False  # rappel « dernier jour », à l'ouverture du relais (CGA-25, CGA-26)


def rappels(g: GroupeEnGarde, p: ParametresGarde, montant_panier: int, retire_le: date | None = None) -> list[Rappel]:
    """Série S0 à S5 (CAL-23, CGA-24 à CGA-28), revérifiée comme juste avant l'envoi : colis retiré, litige,
    jour fermé. Sous SMS-ECO, S1 et S2 partent en push (CSM-14). `montant_panier` : le sous-total S de la
    commande (DP-48)."""
    if g.j0 is None:
        return []
    limite = dernier_jour_de_retrait(g)
    sms = Canal.PUSH if montant_panier < p.seuil_sms_eco else Canal.SMS

    def rappel(code: str, jour: date, canal: Canal, dernier: bool) -> Rappel:
        heure = g.horaires.ouverture if dernier else p.heure_rappel
        e = etat(g, jour, p)
        motif, envoye = "à envoyer", True
        if retire_le is not None and retire_le <= jour:
            motif, envoye = "colis retiré", False
        elif not g.horaires.ouvert(jour):
            motif, envoye = "relais fermé ce jour-là", False
        elif jour in g.jours_suspendus:
            motif, envoye = "garde suspendue (litige, groupage ou transfert)", False
        return Rappel(code, jour, heure, canal, envoye, motif, e.du, e.du_demain, limite, dernier)

    # Le rappel qui tombe le dernier jour de retrait devient « dernier jour », à l'ouverture du relais (CGA-25,
    # CGA-26), quel que soit son rang ; s'il n'y en a pas, S4 est placé ce jour-là.
    serie = []
    for code, rang, canal in (("S0", 2, Canal.PUSH), ("S1", 3, sms), ("S2", 5, sms), ("S3", 6, Canal.PUSH)):
        jour = g.jour_du_rang(rang)
        serie.append(rappel(code, jour, canal, jour == limite))
    if limite is None or any(r.jour == limite for r in serie):
        # Le rang 7 n'est pas le dernier jour : il est fermé ou suspendu, S4 ne part pas.
        serie.append(rappel("S4", g.jour_du_rang(DERNIER_RANG), Canal.PUSH, False))
    else:
        serie.append(rappel("S4", limite, Canal.PUSH, True))
    r = renvoi(g, p)
    if r is None:  # pragma: no cover - j0 est connu ici
        return serie
    if retire_le is not None and retire_le <= r.jour:
        serie.append(Rappel("S5", r.jour, None, Canal.PUSH, False, "colis retiré"))
    else:
        serie.append(Rappel("S5", r.jour, None, Canal.PUSH, True, "renvoi au vendeur", r.retenue, 0, limite))
    return serie
