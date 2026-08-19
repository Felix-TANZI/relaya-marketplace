# backend/tests/test_offer_create.py
import pytest
from apps.catalog.models import Category, Inventory, Product, MasterProduct, ProductCondition
from apps.catalog.serializers import ProductCreateUpdateSerializer

pytestmark = pytest.mark.django_db


def _cat():
    return Category.objects.create(name="Tel", slug="tel")


def test_offre_avec_etat_et_note():
    cat = _cat()
    cond, _ = ProductCondition.objects.get_or_create(name="Bon état")
    s = ProductCreateUpdateSerializer(data={
        'title': 'X', 'price_xaf': 100000, 'category': cat.id,
        'condition': cond.id, 'seller_note': 'Chargeur inclus',
    })
    s.is_valid(raise_exception=True)
    product = s.save(vendor=None)
    assert product.condition_id == cond.id
    assert product.seller_note == 'Chargeur inclus'


def test_upload_fiche_image_refuse_sans_offre(api_client, django_user_model):
    user = django_user_model.objects.create_user(username="u", password="p")
    cat = _cat()
    master = MasterProduct.objects.create(title="Fiche", category=cat)  # PENDING par défaut
    api_client.force_authenticate(user=user)
    resp = api_client.post(f"/api/vendors/masters/{master.id}/images/", {}, format="multipart")
    assert resp.status_code == 403   # aucune offre du vendeur sur cette fiche


def test_upload_fiche_image_exige_un_fichier(api_client, django_user_model):
    user = django_user_model.objects.create_user(username="v", password="p")
    cat = _cat()
    master = MasterProduct.objects.create(title="Fiche", category=cat)  # PENDING
    Product.objects.create(title="offre", category=cat, price_xaf=1000, master=master, vendor=user)
    api_client.force_authenticate(user=user)
    resp = api_client.post(f"/api/vendors/masters/{master.id}/images/", {}, format="multipart")
    assert resp.status_code == 400   # garde-fous OK (offre + fiche PENDING), mais pas de fichier


def test_modification_offre_conserve_stock_et_persiste_promotion(api_client, django_user_model):
    user = django_user_model.objects.create_user(username="seller-update", password="p")
    cat = _cat()
    product = Product.objects.create(
        title="Offre à modifier",
        description="Description initiale suffisamment longue",
        short_description="Description courte",
        category=cat,
        vendor=user,
        price_xaf=10000,
        stock_threshold=2,
    )
    Inventory.objects.create(product=product, quantity=7)
    api_client.force_authenticate(user=user)

    resp = api_client.patch(
        f"/api/vendors/products/{product.id}/",
        {
            "price_xaf": 9000,
            "compare_at_price": 12000,
            "promo_end_date": "2026-08-30",
            "stock_threshold": 3,
        },
        format="json",
    )

    assert resp.status_code == 200, resp.json()
    product.refresh_from_db()
    product.inventory.refresh_from_db()
    assert product.price_xaf == 9000
    assert product.compare_at_price == 12000
    assert str(product.promo_end_date) == "2026-08-30"
    assert product.stock_threshold == 3
    assert product.inventory.quantity == 7
    assert resp.json()["stock_threshold"] == 3
