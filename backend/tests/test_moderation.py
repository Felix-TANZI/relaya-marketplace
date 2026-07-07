# backend/tests/test_moderation.py
import pytest
from apps.catalog.models import Category, Product, MasterProduct

pytestmark = pytest.mark.django_db


def _cat():
    return Category.objects.create(name="Tel", slug="tel")


def test_offre_pending_invisible_acheteur(api_client):
    cat = _cat()
    master = MasterProduct.objects.create(title="iPhone", category=cat,
                                          moderation_status="APPROVED")
    Product.objects.create(title="A", category=cat, price_xaf=450000, master=master,
                           is_active=True, moderation_status="APPROVED")
    Product.objects.create(title="B", category=cat, price_xaf=400000, master=master,
                           is_active=True, moderation_status="PENDING")  # en attente
    resp = api_client.get(f"/api/catalog/master-products/{master.id}/")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["offers"]) == 1                  # seule l'approuvée
    assert data["buy_box"]["price_xaf"] == 450000    # pas la pending (400000)


def test_fiche_pending_absente_de_la_liste(api_client):
    cat = _cat()
    MasterProduct.objects.create(title="Fiche en attente", category=cat,
                                 moderation_status="PENDING")
    resp = api_client.get("/api/catalog/master-products/")
    assert resp.status_code == 200
    assert resp.json()["results"] == []              # invisible tant que non validée