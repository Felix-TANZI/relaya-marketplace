# Distance par la route des frais de livraison (R83.2) et repli à vol d'oiseau (R83.3) : apps/shipping/cartes_google.py.

from unittest import mock

import pytest
from django.test import override_settings

from apps.common.models import ApiUsageEvent, ExternalService
from apps.regles import services as regles
from apps.shipping import itineraire

pytestmark = pytest.mark.django_db

A, B = (3.84, 11.485), (3.889, 11.516)
GOOGLE = override_settings(GOOGLE_MAPS_API_KEY="cle-test", BELIVAY_ITINERAIRE="apps.shipping.cartes_google.distance_km")


def _reponse(statut_http=200, corps=None):
    r = mock.Mock(status_code=statut_http)
    r.json.return_value = corps
    return r


TRAJET = {"status": "OK", "rows": [{"elements": [{"status": "OK", "distance": {"value": 7350}}]}]}


@pytest.fixture(autouse=True)
def _cache_vide():
    regles.cache.delete(regles.CLE_CACHE)


@GOOGLE
def test_distance_par_la_route():
    with mock.patch("apps.shipping.cartes_google.requests.get", return_value=_reponse(corps=TRAJET)) as get:
        km, source = itineraire.distance_route_km(A, B)
    assert (float(km), source) == (7.35, "cartes")
    assert get.call_args.kwargs["params"]["mode"] == "driving"
    assert ApiUsageEvent.objects.filter(service__key="google-maps-distance", success=True).count() == 1


@GOOGLE
@pytest.mark.parametrize("reponse", [
    _reponse(500, {}),
    _reponse(200, {"status": "OK", "rows": [{"elements": [{"status": "ZERO_RESULTS"}]}]}),
])
def test_panne_du_service_vol_d_oiseau(reponse):
    with mock.patch("apps.shipping.cartes_google.requests.get", return_value=reponse):
        km, source = itineraire.distance_route_km(A, B)
    assert source == "vol_oiseau"
    assert float(km) == pytest.approx(itineraire.vol_d_oiseau_km(*A, *B) * 1.3, abs=1e-4)


@GOOGLE
def test_service_coupe_dans_l_admin():
    from apps.shipping.cartes_google import _service

    ExternalService.objects.filter(pk=_service().pk).update(is_enabled=False)
    with mock.patch("apps.shipping.cartes_google.requests.get") as get:
        _, source = itineraire.distance_route_km(A, B)
    assert source == "vol_oiseau" and not get.called


@override_settings(BELIVAY_ITINERAIRE="")
def test_sans_service_branche():
    assert itineraire.distance_route_km(A, B)[1] == "vol_oiseau"
