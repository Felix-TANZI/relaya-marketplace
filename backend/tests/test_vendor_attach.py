# backend/tests/test_vendor_attach.py
import pytest
from apps.catalog.models import Category, Product, MasterProduct
from apps.catalog.serializers import ProductCreateUpdateSerializer

pytestmark = pytest.mark.django_db


def _cat():
    return Category.objects.create(name="Tel", slug="tel")


def test_cree_une_fiche_si_master_absent():
    cat = _cat()
    s = ProductCreateUpdateSerializer(data={
        'title': 'Nouveau produit', 'price_xaf': 100000, 'category': cat.id,
    })
    s.is_valid(raise_exception=True)
    product = s.save(vendor=None)
    assert product.master is not None
    assert product.master.moderation_status == 'PENDING'   # nouvelle fiche en attente
    assert product.moderation_status == 'PENDING'           # offre en attente


def test_rattache_a_une_fiche_existante():
    cat = _cat()
    master = MasterProduct.objects.create(title="iPhone 15", category=cat,
                                          moderation_status="APPROVED")
    s = ProductCreateUpdateSerializer(data={
        'title': 'Mon offre', 'price_xaf': 100000, 'category': cat.id, 'master': master.id,
    })
    s.is_valid(raise_exception=True)
    product = s.save(vendor=None)
    assert product.master_id == master.id
    assert product.moderation_status == 'PENDING'           # l'offre attend la validation


def test_master_search(api_client, django_user_model):
    user = django_user_model.objects.create_user(username="u", password="p")
    cat = _cat()
    MasterProduct.objects.create(title="iPhone 15 Pro", category=cat, moderation_status="APPROVED")
    MasterProduct.objects.create(title="Samsung S24", category=cat, moderation_status="APPROVED")
    MasterProduct.objects.create(title="iPhone caché", category=cat, moderation_status="PENDING")
    api_client.force_authenticate(user=user)
    resp = api_client.get("/api/vendors/products/master-search/?search=iphone")
    assert resp.status_code == 200
    titles = [m["title"] for m in resp.json()]
    assert "iPhone 15 Pro" in titles
    assert "Samsung S24" not in titles
    assert "iPhone caché" not in titles    # fiche PENDING exclue de la recherche