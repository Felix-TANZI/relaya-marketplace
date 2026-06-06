# backend/tests/test_masterproduct_api.py
import pytest
from apps.catalog.models import Category, Product, MasterProduct

pytestmark = pytest.mark.django_db


def _setup():
    cat = Category.objects.create(name="Téléphones", slug="telephones")
    master = MasterProduct.objects.create(title="iPhone 15", category=cat,
                                          moderation_status="APPROVED")
    Product.objects.create(title="A", category=cat, price_xaf=450000, master=master,
                           is_active=True, moderation_status="APPROVED")
    Product.objects.create(title="B", category=cat, price_xaf=460000, master=master,
                           is_active=True, moderation_status="APPROVED")
    return master


def test_api_master_list(api_client):
    _setup()
    resp = api_client.get("/api/catalog/master-products/")
    assert resp.status_code == 200
    results = resp.json()["results"]
    assert len(results) == 1
    assert results[0]["offers_count"] == 2
    assert results[0]["buy_box"]["price_xaf"] == 450000   # la moins chère


def test_api_master_detail(api_client):
    master = _setup()
    resp = api_client.get(f"/api/catalog/master-products/{master.id}/")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["offers"]) == 2
    assert data["offers"][0]["price_xaf"] == 450000        # offres triées par prix