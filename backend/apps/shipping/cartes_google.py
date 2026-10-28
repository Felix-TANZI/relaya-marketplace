# backend/apps/shipping/cartes_google.py
# Service de cartes des frais de livraison (R83.2) : Google Maps, API Distance Matrix, trajet en voiture.
# Branché par settings.BELIVAY_ITINERAIRE (apps/shipping/itineraire.py). Toute erreur (clé absente, service coupé ou
# budget dépassé dans l'admin « Services externes », réseau, réponse sans trajet) lève ServiceCartesIndisponible :
# l'itinéraire passe alors à la distance à vol d'oiseau × r_vol_oiseau (R83.3).

import logging

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

URL = "https://maps.googleapis.com/maps/api/distancematrix/json"
SERVICE = "google-maps-distance"


class ServiceCartesIndisponible(Exception):
    pass


def _service():
    from apps.common.models import ExternalService

    service, _ = ExternalService.objects.get_or_create(
        key=SERVICE,
        defaults={"name": "Distances des frais de livraison (R83.2)", "provider": "Google Maps",
                  "service_type": ExternalService.ServiceType.ROUTING, "is_enabled": True},
    )
    return service


def distance_km(lat1, lon1, lat2, lon2) -> float:
    """Distance par la route en km, de (lat1, lon1) à (lat2, lon2)."""
    from apps.common.models import record_api_usage

    cle = getattr(settings, "GOOGLE_MAPS_API_KEY", "")
    if not cle:
        raise ServiceCartesIndisponible("GOOGLE_MAPS_API_KEY absente")
    if not _service().can_call():
        raise ServiceCartesIndisponible("service coupé ou budget dépassé")
    params = {"origins": f"{lat1},{lon1}", "destinations": f"{lat2},{lon2}", "mode": "driving", "key": cle}
    try:
        reponse = requests.get(URL, params=params, timeout=(3.0, 6.0))
    except requests.RequestException as exc:
        record_api_usage(SERVICE, endpoint="distancematrix", method="GET", success=False, meta={"erreur": str(exc)[:200]})
        raise ServiceCartesIndisponible(str(exc)) from exc
    try:
        donnees = reponse.json()
        element = donnees["rows"][0]["elements"][0]
        ok = reponse.status_code < 400 and donnees.get("status") == "OK" and element.get("status") == "OK"
    except (ValueError, KeyError, IndexError, TypeError):
        ok, element = False, {}
    record_api_usage(SERVICE, endpoint="distancematrix", method="GET", status_code=reponse.status_code, success=ok)
    if not ok:
        raise ServiceCartesIndisponible(f"réponse sans trajet (HTTP {reponse.status_code})")
    return element["distance"]["value"] / 1000
