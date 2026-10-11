"""Calendrier d'ouverture de la boutique du vendeur (VD05-R02, VD11-R13, REFVD-R134 ; DP-56 : Q-38, Q-53 ; P-6).

Portage de ``espace-vendeur/src/calculs/ouverture.ts`` (mêmes exemples dans ``tests/test_ouverture.py``) :

- la préparation se compte en heures d'ouverture de la boutique : ses horaires, « Fermer aujourd'hui » (jusqu'à la
  prochaine ouverture réelle, Q-39), la pause et les fermetures programmées (jours entiers) ;
- échéance d'une commande = ouverture suivant le paiement + 4 h ouvertes ; échéance absolue = + 24 h ouvertes (Q-38) ;
- « Plus de temps » : + 1 h, + 2 h (heures ouvertes) ou demain à l'ouverture, jamais au-delà de l'échéance absolue
  (DEL-03) ; effet sur le passage du livreur : inchangé, il attend, ou créneau suivant (P-6).

Heures à l'heure de Yaoundé (Africa/Douala, UTC+1 toute l'année) ; une heure sans fuseau est refusée.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime, time, timedelta
from typing import Literal
from zoneinfo import ZoneInfo

YAOUNDE = ZoneInfo("Africa/Douala")


@dataclass(frozen=True)
class Horaire:
    jour: int  # lundi = 0
    ouvert: bool
    de: str  # « 08:00 »
    a: str  # « 18:00 »


@dataclass(frozen=True)
class Passage:
    jours: tuple[int, ...]  # lundi = 0
    de: str
    a: str


@dataclass(frozen=True)
class Calendrier:
    horaires: tuple[Horaire, ...]
    passages: tuple[Passage, ...]
    fermee_le: date | None = None  # « Fermer aujourd'hui »
    fermetures: tuple[tuple[date, date], ...] = field(default_factory=tuple)  # du, au (jours entiers)


def _local(t: datetime) -> datetime:
    if t.tzinfo is None:
        raise ValueError("heure sans fuseau : la préparation se compte à l'heure de Yaoundé (Africa/Douala)")
    return t.astimezone(YAOUNDE)


def _a_heure(j: date, hm: str) -> datetime:
    h, m = hm.split(":")
    return datetime.combine(j, time(int(h), int(m)), YAOUNDE)


def plage_du_jour(j: date, c: Calendrier) -> tuple[datetime, datetime] | None:
    """Plage d'ouverture d'un jour civil, ou None (jour fermé, « Fermer aujourd'hui », fermeture programmée)."""
    h = next((x for x in c.horaires if x.jour == j.weekday()), None)
    if h is None or not h.ouvert or c.fermee_le == j or any(du <= j <= au for du, au in c.fermetures):
        return None
    return _a_heure(j, h.de), _a_heure(j, h.a)


def heures_ouvertes(de: datetime, a: datetime, c: Calendrier) -> timedelta:
    """Durée d'ouverture entre deux instants (temps restant, progression : PRE-04, REFVD-R134)."""
    de, a = _local(de), _local(a)
    total = timedelta(0)
    j = de.date()
    for _ in range(400):
        if datetime.combine(j, time(0), YAOUNDE) >= a:
            break
        p = plage_du_jour(j, c)
        if p:
            total += max(timedelta(0), min(a, p[1]) - max(de, p[0]))
        j += timedelta(days=1)
    return total


def ajouter_ouvertes(de: datetime, duree: timedelta, c: Calendrier) -> datetime:
    """Instant atteint après ``duree`` d'ouverture depuis ``de`` (échéance = début + 4 h ouvrées ; + 1 h ; absolue)."""
    de = _local(de)
    reste = duree
    j = de.date()
    for _ in range(400):
        p = plage_du_jour(j, c)
        if p:
            debut = max(de, p[0])
            if debut < p[1]:
                if reste <= p[1] - debut:
                    return debut + reste
                reste -= p[1] - debut
        j += timedelta(days=1)
    raise ValueError("aucune ouverture sur 400 jours : horaires de la boutique à vérifier")


def ouverture_suivante(t: datetime, c: Calendrier) -> datetime:
    """Ouverture qui suit (ou l'instant même pendant l'ouverture) : début du délai d'une commande (E10)."""
    return ajouter_ouvertes(t, timedelta(0), c)


def ouverte_a(t: datetime, c: Calendrier) -> bool:
    t = _local(t)
    p = plage_du_jour(t.date(), c)
    return p is not None and p[0] <= t < p[1]


def ouverture_du_jour_suivant(t: datetime, c: Calendrier) -> datetime:
    """Ouverture du jour d'ouverture qui suit le jour de ``t`` (« Demain à l'ouverture »)."""
    j = _local(t).date() + timedelta(days=1)
    for _ in range(60):
        p = plage_du_jour(j, c)
        if p:
            return p[0]
        j += timedelta(days=1)
    raise ValueError("aucune ouverture sur 60 jours : horaires de la boutique à vérifier")


def passage_suivant(t: datetime, c: Calendrier) -> tuple[datetime, datetime]:
    """Premier passage du livreur dont la fin n'est pas passée à ``t``, un jour où la boutique est ouverte."""
    t = _local(t)
    j = t.date()
    for _ in range(60):
        if plage_du_jour(j, c):
            for p in c.passages:
                if j.weekday() in p.jours:
                    s = (_a_heure(j, p.de), _a_heure(j, p.a))
                    if s[1] > t:
                        return s
        j += timedelta(days=1)
    raise ValueError("aucun passage du livreur sur 60 jours : créneaux à vérifier")


ChoixDelai = Literal["+1h", "+2h", "demain"]
Effet = Literal["inchange", "attend", "suivant"]


@dataclass(frozen=True)
class OptionDelai:
    choix: ChoixDelai
    echeance: datetime
    possible: bool  # au-delà de l'échéance absolue : grisée et refusée (DEL-03)
    ramassage: tuple[datetime, datetime]
    effet: Effet  # le livreur passe toujours · attendra la fin · créneau suivant


def options_de_delai(
    echeance: datetime, absolue: datetime, c: Calendrier
) -> tuple[tuple[datetime, datetime], list[OptionDelai]]:
    """Trois choix : + 1 h, + 2 h (heures d'ouverture), demain à l'ouverture ; effet sur le ramassage (P-6)."""
    prevu = passage_suivant(echeance, c)

    def option(choix: ChoixDelai, e: datetime) -> OptionDelai:
        effet: Effet = "inchange" if e <= prevu[0] else "attend" if e < prevu[1] else "suivant"
        return OptionDelai(choix, e, e <= absolue, passage_suivant(e, c) if effet == "suivant" else prevu, effet)

    une = timedelta(hours=1)
    return prevu, [
        option("+1h", ajouter_ouvertes(echeance, une, c)),
        option("+2h", ajouter_ouvertes(echeance, 2 * une, c)),
        option("demain", ouverture_du_jour_suivant(echeance, c)),
    ]
