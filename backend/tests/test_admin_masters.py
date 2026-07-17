# backend/tests/test_admin_masters.py
import pytest
from apps.catalog.models import Category, Product, MasterProduct

pytestmark = pytest.mark.django_db


def _admin(api_client, django_user_model):
    admin = django_user_model.objects.create_superuser("adm", "a@a.co", "p")
    api_client.force_authenticate(user=admin)
    return admin


def test_liste_fiches_tous_statuts_et_filtre(api_client, django_user_model):
    _admin(api_client, django_user_model)
    cat = Category.objects.create(name="Tel", slug="tel")
    MasterProduct.objects.create(title="A", category=cat, moderation_status="APPROVED")
    MasterProduct.objects.create(title="B", category=cat, moderation_status="PENDING")
    r = api_client.get("/api/vendors/admin/masters/")
    assert r.status_code == 200 and len(r.json()) == 2
    r = api_client.get("/api/vendors/admin/masters/?moderation_status=PENDING")
    assert len(r.json()) == 1 and r.json()[0]["title"] == "B"


def test_approuver_fiche(api_client, django_user_model):
    _admin(api_client, django_user_model)
    cat = Category.objects.create(name="Tel", slug="tel")
    m = MasterProduct.objects.create(title="A", category=cat, moderation_status="PENDING")
    r = api_client.post(f"/api/vendors/admin/masters/{m.id}/approve/")
    assert r.status_code == 200 and r.json()["moderation_status"] == "APPROVED"


def test_detail_fiche_expose_variants_et_compteur(api_client, django_user_model):
    _admin(api_client, django_user_model)
    cat = Category.objects.create(name="Tel", slug="tel")
    vendor = django_user_model.objects.create_user(username="vend", password="p")
    m = MasterProduct.objects.create(title="iPhone", category=cat, moderation_status="APPROVED")
    Product.objects.create(title="off", category=cat, price_xaf=100000, master=m, vendor=vendor)
    r = api_client.get(f"/api/vendors/admin/masters/{m.id}/")
    assert r.status_code == 200
    body = r.json()
    assert body["id"] == m.id
    assert body["offers_count"] == 1     # l'offre rattachée est bien comptée
    assert "variants" in body            # la fiche expose ses variants 