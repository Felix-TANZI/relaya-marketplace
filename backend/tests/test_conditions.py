# backend/tests/test_conditions.py
import pytest
from apps.catalog.models import ProductCondition

pytestmark = pytest.mark.django_db


def test_seed_par_defaut_present():
    names = set(ProductCondition.objects.values_list('name', flat=True))
    assert {"Neuf", "Comme neuf", "Bon état", "Neuf en boîte"} <= names


def test_max_offers_defaut_7():
    from apps.orders.models import PlatformSettings
    assert PlatformSettings.get_settings().max_offers_displayed == 7


def test_admin_crud_condition(api_client, django_user_model):
    admin = django_user_model.objects.create_superuser("adm", "a@a.co", "p")
    api_client.force_authenticate(user=admin)

    r = api_client.post("/api/vendors/admin/conditions/create/", {"name": "Reconditionné"}, format="json")
    assert r.status_code == 201
    cid = r.json()["id"]

    r = api_client.patch(f"/api/vendors/admin/conditions/{cid}/update/", {"is_active": False}, format="json")
    assert r.status_code == 200 and r.json()["is_active"] is False

    r = api_client.get("/api/vendors/admin/conditions/")
    assert any(c["name"] == "Reconditionné" for c in r.json())

    r = api_client.delete(f"/api/vendors/admin/conditions/{cid}/delete/")
    assert r.status_code == 204

def test_endpoint_conditions_actives_seulement(api_client):
    ProductCondition.objects.filter(name="Neuf").update(is_active=False)
    resp = api_client.get("/api/catalog/conditions/")
    assert resp.status_code == 200
    names = [c["name"] for c in resp.json()]
    assert "Neuf" not in names         # désactivé → absent
    assert "Bon état" in names         # actif → présent    