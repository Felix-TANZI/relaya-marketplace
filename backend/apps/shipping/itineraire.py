# backend/apps/shipping/itineraire.py
# Distances et détours des frais de livraison (BV-DEV-01, R83).
#
#   R83.2  km_b = distance par la route de la boutique b à l'épingle du client, donnée par le service de cartes.
#   R83.3  calculés une seule fois, au paiement, et figés ; service de cartes en panne : vol d'oiseau × r_vol_oiseau.
#   R83.4  trajet de plusieurs boutiques : départ de b_base, passage par les autres dans l'ordre le plus court, arrivée
#          chez le client ; detour_b = trajet complet − même trajet sans b ; detour_b de b_base = 0.
#
# Le service de cartes se branche par settings.BELIVAY_ITINERAIRE : chemin pointé d'une fonction
# (lat1, lon1, lat2, lon2) -> km par la route, qui lève une exception quand le service ne répond pas. Sans
# service branché, la distance est celle de R83.3. Les kilomètres sont rendus sans arrondi : le moteur les compte
# par km_compte (R83.1).

import itertools
import logging
import math
from fractions import Fraction

from django.conf import settings
from django.utils.module_loading import import_string

from apps.regles import services as regles

logger = logging.getLogger(__name__)

RAYON_TERRE_KM = 6371.0088  # rayon moyen (UGGI)


def vol_d_oiseau_km(lat1, lon1, lat2, lon2) -> float:
    p1, p2 = math.radians(float(lat1)), math.radians(float(lat2))
    dp, dl = p2 - p1, math.radians(float(lon2) - float(lon1))
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * RAYON_TERRE_KM * math.asin(math.sqrt(a))


def _service():
    chemin = getattr(settings, "BELIVAY_ITINERAIRE", "")
    return import_string(chemin) if chemin else None


def distance_route_km(a: tuple, b: tuple) -> tuple[Fraction, str]:
    """(km, source) de a à b, points (lat, lon) ; source « cartes » ou « vol_oiseau » (R83.3)."""
    service = _service()
    if service is not None:
        # Une même paire de points (au mètre près) n'est demandée au service qu'une fois par jour : le devis du panier
        # se recalcule à chaque changement (R84.3), le service de cartes est payant.
        from django.core.cache import cache

        cle = "itineraire:" + ":".join(f"{float(x):.5f}" for x in (*a, *b))
        km = cache.get(cle)
        if km is not None:
            return Fraction(km), "cartes"
        try:
            km = str(service(a[0], a[1], b[0], b[1]))
            cache.set(cle, km, timeout=24 * 3600)
            return Fraction(km), "cartes"
        except Exception:  # panne du service : R83.3
            logger.warning("Service de cartes indisponible : distance à vol d'oiseau (R83.3).", exc_info=True)
    km = Fraction(str(round(vol_d_oiseau_km(a[0], a[1], b[0], b[1]), 6)))
    return km * Fraction(str(regles.reglage("r_vol_oiseau"))), "vol_oiseau"


def _trajet_km(points: list[tuple], dist) -> Fraction:
    return sum((dist(points[i], points[i + 1]) for i in range(len(points) - 1)), Fraction(0))


def _plus_court(depart: tuple, etapes: list[tuple], arrivee: tuple, dist) -> Fraction:
    """Longueur du trajet le plus court qui part de `depart`, passe par toutes les `etapes`, finit à `arrivee`."""
    if not etapes:
        return dist(depart, arrivee)
    return min(_trajet_km([depart, *ordre, arrivee], dist) for ordre in itertools.permutations(etapes))


def detours_km(boutiques: list[tuple], client: tuple, b_base: int) -> list[Fraction]:
    """detour_b de chaque boutique (R83.4) ; `boutiques` : positions (lat, lon), `b_base` : son indice."""
    cache = {}

    def dist(a, b):
        if (a, b) not in cache:
            cache[(a, b)] = distance_route_km(a, b)[0]
        return cache[(a, b)]

    depart = boutiques[b_base]
    autres = [i for i in range(len(boutiques)) if i != b_base]
    complet = _plus_court(depart, [boutiques[i] for i in autres], client, dist)
    detours = []
    for i in range(len(boutiques)):
        if i == b_base:
            detours.append(Fraction(0))
            continue
        sans = _plus_court(depart, [boutiques[j] for j in autres if j != i], client, dist)
        detours.append(complet - sans)
    return detours
