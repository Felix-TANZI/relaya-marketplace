"""Délais affichés (CL-08, CL-09, CL-11 ; CAL-14 à CAL-17). Les heures sont celles de Yaoundé (Africa/Douala) ;
l'application les met en mots (CCH-32), ce module donne les valeurs.

- Compte à rebours du reçu : moins de 24 h → « X h YY » ; sinon une date ferme (CAL-14).
- « Retirable maintenant » quand tous les colis du groupe sont arrivés ; sinon « Prêt dans X h », X arrondi à
  l'heure la plus proche, au moins 1 h (jamais « Prêt dans 0 h ») ; 24 h ou plus après l'arrondi : date ferme
  (CAL-15). Les dates fermes sont rendues à l'heure de Yaoundé.
- Dissociation (DP-32, MSG-DISSOC) : quand un colis du groupe a 24 h de retard sur le premier colis arrivé, le
  groupe est dissocié ; les colis arrivés deviennent retirables sans l'attendre (nouveau code, message C4).
- Paiement interrompu : temps restant en mm:ss, jamais négatif (CAL-16).
- « Réponse sous X h » : ouverture du litige + délai du vendeur − maintenant, en heures entières arrondies à
  l'inférieur (CAL-17, LIT-VENDEUR-H).
"""

from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from .registre import ParametresGarde

UN_JOUR = timedelta(hours=24)
YAOUNDE = ZoneInfo("Africa/Douala")


def _verifier(*moments: datetime) -> None:
    if any(m.tzinfo is None for m in moments):
        raise ValueError("heure sans fuseau : les délais se calculent à l'heure de Yaoundé (Africa/Douala)")


@dataclass(frozen=True)
class Delai:
    date_ferme: datetime | None  # 24 h ou plus : on donne la date, pas une durée
    heures: int = 0
    minutes: int = 0


def compte_a_rebours(retrait_estime: datetime, maintenant: datetime) -> Delai:
    """BLV-52107 : 15 h 00 − 10 h 15 = « 4 h 45 » ; BLV-51940 validée mardi : « jeudi 24 sept. dès 9 h »."""
    _verifier(retrait_estime, maintenant)
    d = max(retrait_estime - maintenant, timedelta(0))
    if d >= UN_JOUR:
        return Delai(retrait_estime.astimezone(YAOUNDE))
    minutes = int(d.total_seconds() // 60)
    return Delai(None, minutes // 60, minutes % 60)


@dataclass(frozen=True)
class Disponibilite:
    retirable_maintenant: bool
    pret_dans_heures: int | None
    date_ferme: datetime | None


def pret_dans(estimes_non_arrives: tuple[datetime, ...], maintenant: datetime) -> Disponibilite:
    """Tous arrivés → « Retirable maintenant » ; sinon X = plus tardive − maintenant, à l'heure la plus proche."""
    if not estimes_non_arrives:
        return Disponibilite(True, None, None)
    _verifier(maintenant, *estimes_non_arrives)
    tard = max(estimes_non_arrives)
    d = max(tard - maintenant, timedelta(0))
    minutes = int(d.total_seconds() // 60)
    heures = minutes // 60 + (1 if minutes % 60 >= 30 else 0)  # moitié vers le haut : 4 h 45 → 5 h
    if heures >= 24:  # 23 h 30 s'arrondit à 24 h : date ferme, jamais « Prêt dans 24 h »
        return Disponibilite(False, None, tard.astimezone(YAOUNDE))
    return Disponibilite(False, max(heures, 1), None)  # un colis pas encore arrivé n'est jamais « dans 0 h »


def temps_restant(expiration: datetime, maintenant: datetime) -> tuple[int, int]:
    """(minutes, secondes) ; « 12:00 » à 10 h 15 pour une réservation jusqu'à 10 h 27 ; 0:00 ensuite."""
    _verifier(expiration, maintenant)
    s = max(int((expiration - maintenant).total_seconds()), 0)
    return s // 60, s % 60


def reponse_sous(ouverture: datetime, maintenant: datetime, delai_heures: int) -> int:
    """LIT-3042 ouvert mer. 17 h 15, délai 48 h, jeudi 10 h 15 → 31 h (heures entières, à l'inférieur)."""
    _verifier(ouverture, maintenant)
    reste = ouverture + timedelta(hours=delai_heures) - maintenant
    return max(int(reste.total_seconds() // 3600), 0)


@dataclass(frozen=True)
class Dissociation:
    dissocie: bool
    retirables: tuple[str, ...]  # colis arrivés, retirables sans attendre (nouveau code) si le groupe est dissocié
    attendus: tuple[str, ...]  # colis en retard
    le: datetime | None  # moment où le groupe est (ou sera) dissocié ; None si rien n'est arrivé ou tout l'est


def dissociation(arrivees: Mapping[str, datetime | None], maintenant: datetime, p: ParametresGarde) -> Dissociation:
    """`arrivees` : colis du groupe de remise → heure d'arrivée au relais, None s'il n'est pas arrivé (DP-32).
    Le groupe est dissocié MSG-DISSOC après l'arrivée du premier colis, si un autre manque encore : un colis
    retirable le reste, même si un autre arrive ensuite (les arrivés suivants deviennent retirables aussi)."""
    arrives = {c: h for c, h in arrivees.items() if h is not None}
    attendus = tuple(c for c, h in arrivees.items() if h is None)
    _verifier(maintenant, *arrives.values())
    if not arrives or not attendus:
        return Dissociation(False, (), attendus, None)
    le = min(arrives.values()) + timedelta(hours=p.dissociation_heures)
    dissocie = maintenant >= le
    return Dissociation(dissocie, tuple(arrives) if dissocie else (), attendus, le.astimezone(YAOUNDE))
