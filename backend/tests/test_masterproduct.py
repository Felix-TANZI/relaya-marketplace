# backend/tests/test_masterproduct.py
import pytest
from apps.catalog.models import Category, Product, MasterProduct

pytestmark = pytest.mark.django_db


def _category():
    return Category.objects.create(name="Téléphones", slug="telephones")


def test_master_slug_auto():
    m = MasterProduct.objects.create(title="iPhone 15 128 Go", category=_category())
    assert m.slug == "iphone-15-128-go"


def test_offers_relation_et_buybox():
    cat = _category()
    master = MasterProduct.objects.create(title="iPhone 15", category=cat)
    alice = Product.objects.create(title="iPhone 15 - Alice", category=cat,
                                   price_xaf=450000, master=master, is_active=True)
    Product.objects.create(title="iPhone 15 - Bruno", category=cat,
                           price_xaf=460000, master=master, is_active=True)
    assert master.offers.count() == 2            # related_name "offers"
    assert master.buy_box_offer == alice          # la moins chère active


def test_offre_soft_deleted_exclue():
    cat = _category()
    master = MasterProduct.objects.create(title="iPhone 15", category=cat)
    alice = Product.objects.create(title="A", category=cat, price_xaf=450000,
                                   master=master, is_active=True)
    bruno = Product.objects.create(title="B", category=cat, price_xaf=460000,
                                   master=master, is_active=True)
    alice.delete()  # suppression douce
    assert master.offers.count() == 1
    assert master.buy_box_offer == bruno