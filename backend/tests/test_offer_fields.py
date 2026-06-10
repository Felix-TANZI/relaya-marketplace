# backend/tests/test_offer_fields.py
import pytest
from apps.catalog.models import Category, Product, MasterProduct, ProductCondition
from apps.orders.models import PlatformSettings

pytestmark = pytest.mark.django_db


def _cat():
    return Category.objects.create(name="Tel", slug="tel")


def test_offre_expose_etat_et_note_anonyme(api_client):
    cat = _cat()
    cond, _ = ProductCondition.objects.get_or_create(name="Comme neuf")
    master = MasterProduct.objects.create(title="iPhone", category=cat, moderation_status="APPROVED")
    Product.objects.create(title="A", category=cat, price_xaf=450000, master=master,
                           is_active=True, moderation_status="APPROVED",
                           condition=cond, seller_note="Garantie 6 mois, chargeur inclus")
    resp = api_client.get(f"/api/catalog/master-products/{master.id}/")
    assert resp.status_code == 200
    offer = resp.json()["offers"][0]
    assert offer["condition"] == "Comme neuf"
    assert offer["seller_note"] == "Garantie 6 mois, chargeur inclus"
    assert "vendor" not in offer and "primary_image" not in offer   # anonyme, pas de photo d'offre


def test_offres_plafonnees_par_reglage(api_client):
    s = PlatformSettings.get_settings(); s.max_offers_displayed = 2; s.save()
    cat = _cat()
    master = MasterProduct.objects.create(title="iPhone", category=cat, moderation_status="APPROVED")
    for i in range(4):
        Product.objects.create(title=f"O{i}", category=cat, price_xaf=100000 + i, master=master,
                               is_active=True, moderation_status="APPROVED")
    resp = api_client.get(f"/api/catalog/master-products/{master.id}/")
    assert len(resp.json()["offers"]) == 2