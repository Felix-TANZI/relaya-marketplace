"""Distances et relais proches (CAL-04, CDA-05, CLS-12, CPR-04, CPR-13, CRL-03, CCO-11 ; DP-09, DP-46, DP-49).

- Distance géodésique sur l'ellipsoïde WGS 84 (celui d'OpenStreetMap, du GPS et de PostGIS) : méthode inverse
  de Vincenty, exacte au millimètre pour deux points du Cameroun ; même résultat que ST_Distance(geography) de
  PostGIS, à l'intégration si le serveur l'adopte.
- Distance d'une carte produit = boutique de l'offre attribuée → relais sélectionné, en km arrondis à 0,1 ;
  distance d'un relais = depuis la position ou l'adresse du client (CDA-05, CAL-04) ; une boutique a une seule
  position, toutes ses offres affichent la même distance.
- Supplément XL (DP-46) : distance boutique → domicile, la même que celle que voit le client (arrondie à 0,1 km).
- Relais proposés (CRL-03, CPR-13) : par distance croissante ; un relais saturé ou fermé aujourd'hui n'est pas
  proposé et une ligne le dit ; le plus proche des relais proposés est mis en avant.
- Zones (CCO-11, CPR-24, DP-09) : une adresse dans un quartier hors des zones exploitées est refusée
  (422 zone_non_servie) ; le retrait au relais continue.
- Le temps de trajet (« 350 m · 6 min à pied ») vient d'un calcul d'itinéraire sur les données OpenStreetMap
  (OSRM, DP-49), hors de ce module : un moteur pur ne fait pas d'appel réseau.

Les coordonnées arrivent en Decimal ou en texte (« 3.856 »), jamais en float, comme les montants ; la
trigonométrie se fait en virgule flottante à l'intérieur, et le résultat sort en Decimal, au millimètre.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from decimal import ROUND_HALF_UP, Decimal

from .argent import decimal
from .catalogue import distance_affichee
from .registre import ParametresGeo, Zone

# Ellipsoïde WGS 84 : constantes de définition du système géodésique, pas des valeurs commerciales du registre.
WGS84_A = 6_378_137.0  # demi-grand axe, en mètres
WGS84_F = 1 / 298.257223563  # aplatissement
WGS84_B = WGS84_A * (1 - WGS84_F)


class ConvergenceImpossible(ValueError):
    """Points presque antipodaux : jamais pour deux points du Cameroun."""


@dataclass(frozen=True)
class Position:
    latitude: Decimal
    longitude: Decimal

    def __post_init__(self) -> None:
        lat, lon = decimal(self.latitude), decimal(self.longitude)
        if not lat.is_finite() or not lon.is_finite() or not (-90 <= lat <= 90) or not (-180 <= lon <= 180):
            raise ValueError(f"position invalide : {self.latitude!r}, {self.longitude!r}")
        object.__setattr__(self, "latitude", lat)
        object.__setattr__(self, "longitude", lon)


def distance_m(a: Position, b: Position) -> Decimal:
    """Distance géodésique en mètres, au millimètre (Vincenty, 1975)."""
    phi1, phi2 = math.radians(a.latitude), math.radians(b.latitude)
    lam = ecart = math.radians(b.longitude - a.longitude)
    u1 = math.atan((1 - WGS84_F) * math.tan(phi1))
    u2 = math.atan((1 - WGS84_F) * math.tan(phi2))
    sin_u1, cos_u1, sin_u2, cos_u2 = math.sin(u1), math.cos(u1), math.sin(u2), math.cos(u2)
    for _ in range(200):
        sin_lam, cos_lam = math.sin(lam), math.cos(lam)
        sin_sigma = math.hypot(cos_u2 * sin_lam, cos_u1 * sin_u2 - sin_u1 * cos_u2 * cos_lam)
        if sin_sigma == 0:
            return Decimal("0.000")  # même point
        cos_sigma = sin_u1 * sin_u2 + cos_u1 * cos_u2 * cos_lam
        sigma = math.atan2(sin_sigma, cos_sigma)
        sin_alpha = cos_u1 * cos_u2 * sin_lam / sin_sigma
        cos2_alpha = 1 - sin_alpha**2
        cos_2sm = cos_sigma - 2 * sin_u1 * sin_u2 / cos2_alpha if cos2_alpha else 0.0  # ligne équatoriale
        c = WGS84_F / 16 * cos2_alpha * (4 + WGS84_F * (4 - 3 * cos2_alpha))
        precedent = lam
        lam = ecart + (1 - c) * WGS84_F * sin_alpha * (
            sigma + c * sin_sigma * (cos_2sm + c * cos_sigma * (-1 + 2 * cos_2sm**2))
        )
        if abs(lam - precedent) < 1e-12:
            break
    else:
        raise ConvergenceImpossible("points presque antipodaux")
    u_carre = cos2_alpha * (WGS84_A**2 - WGS84_B**2) / WGS84_B**2
    grand_a = 1 + u_carre / 16384 * (4096 + u_carre * (-768 + u_carre * (320 - 175 * u_carre)))
    grand_b = u_carre / 1024 * (256 + u_carre * (-128 + u_carre * (74 - 47 * u_carre)))
    delta_sigma = (
        grand_b
        * sin_sigma
        * (
            cos_2sm
            + grand_b
            / 4
            * (
                cos_sigma * (-1 + 2 * cos_2sm**2)
                - grand_b / 6 * cos_2sm * (-3 + 4 * sin_sigma**2) * (-3 + 4 * cos_2sm**2)
            )
        )
    )
    metres = WGS84_B * grand_a * (sigma - delta_sigma)
    return Decimal(repr(metres)).quantize(Decimal("0.001"), rounding=ROUND_HALF_UP)


def distance_km(a: Position, b: Position) -> Decimal:
    """Distance affichée, en km à 0,1 près (CAL-04) : carte produit, relais, supplément XL (DP-46)."""
    return distance_affichee(distance_m(a, b))


# ── Relais proposés (CRL-03, CPR-13) ────────────────────────────────────────────────────────────────────


@dataclass(frozen=True)
class Relais:
    id: str
    zone: str  # code de zone (« Z1 »)
    position: Position
    ouvert_aujourd_hui: bool
    sature: bool


@dataclass(frozen=True)
class RelaisProche:
    relais: Relais
    distance_km: Decimal
    propose: bool
    raison: str | None  # « fermé aujourd'hui », « saturé » : la ligne qui le dit (CRL-03)
    le_plus_proche: bool  # le premier relais proposé, en vert


def relais_proches(origine: Position, relais: tuple[Relais, ...]) -> tuple[RelaisProche, ...]:
    """Tous les relais par distance croissante (puis identifiant), chacun proposé ou non, avec sa raison."""
    ranges = sorted(((distance_m(origine, r.position), r) for r in relais), key=lambda x: (x[0], x[1].id))
    sortie, premier = [], True
    for metres, r in ranges:
        raison = "fermé aujourd'hui" if not r.ouvert_aujourd_hui else "saturé" if r.sature else None
        propose = raison is None
        sortie.append(RelaisProche(r, distance_affichee(metres), propose, raison, propose and premier))
        premier = premier and not propose
    return tuple(sortie)


# ── Zones (CCO-11, CPR-24, DP-09) ───────────────────────────────────────────────────────────────────────


def zone_exploitee(code_zone: str, p: ParametresGeo) -> Zone | None:
    """La zone si elle est exploitée ; None : « BelivaY ne livre pas encore à … » (422 zone_non_servie)."""
    return next((z for z in p.zones if z.code == code_zone), None)


def relais_par_zone_respecte(relais: tuple[Relais, ...], p: ParametresGeo) -> bool:
    """Au lancement, un seul relais par zone (RELAIS-PAR-ZONE) : contrôle de la configuration."""
    compte: dict[str, int] = {}
    for r in relais:
        compte[r.zone] = compte.get(r.zone, 0) + 1
    return all(n <= p.relais_par_zone for n in compte.values())
