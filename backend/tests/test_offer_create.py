# backend/tests/test_offer_create.py
import pytest
from apps.catalog.models import Category, Product, MasterProduct, ProductCondition
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