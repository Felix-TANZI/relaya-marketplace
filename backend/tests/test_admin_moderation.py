# backend/tests/test_admin_moderation.py
import pytest
from apps.catalog.models import Category, Product, MasterProduct

pytestmark = pytest.mark.django_db


def _cat():
    return Category.objects.create(name="Tel", slug="tel")


def test_admin_approuve_produit_et_cascade_fiche(api_client, django_user_model):
    admin = django_user_model.objects.create_superuser("admin", "a@a.co", "p")
    cat = _cat()
    master = MasterProduct.objects.create(title="iPhone", category=cat, moderation_status="PENDING")
    product = Product.objects.create(title="A", category=cat, price_xaf=450000, master=master,
                                     is_active=True, moderation_status="PENDING")
    api_client.force_authenticate(user=admin)
    resp = api_client.post(f"/api/vendors/admin/products/{product.id}/approve/")
    assert resp.status_code == 200
    product.refresh_from_db(); master.refresh_from_db()
    assert product.moderation_status == "APPROVED"
    assert master.moderation_status == "APPROVED"      # cascade sur la fiche
    assert product.moderated_by_id == admin.id


def test_admin_rejette_produit(api_client, django_user_model):
    admin = django_user_model.objects.create_superuser("admin2", "b@b.co", "p")
    cat = _cat()
    master = MasterProduct.objects.create(title="iPhone", category=cat, moderation_status="APPROVED")
    product = Product.objects.create(title="A", category=cat, price_xaf=450000, master=master,
                                     is_active=True, moderation_status="PENDING")
    api_client.force_authenticate(user=admin)
    resp = api_client.post(f"/api/vendors/admin/products/{product.id}/reject/")
    assert resp.status_code == 200
    product.refresh_from_db()
    assert product.moderation_status == "REJECTED"


def test_admin_liste_pending(api_client, django_user_model):
    admin = django_user_model.objects.create_superuser("admin3", "c@c.co", "p")
    cat = _cat()
    master = MasterProduct.objects.create(title="iPhone", category=cat, moderation_status="APPROVED")
    Product.objects.create(title="EnAttente", category=cat, price_xaf=1, master=master,
                           is_active=True, moderation_status="PENDING")
    Product.objects.create(title="Validee", category=cat, price_xaf=1, master=master,
                           is_active=True, moderation_status="APPROVED")
    api_client.force_authenticate(user=admin)
    resp = api_client.get("/api/vendors/admin/products/?moderation_status=PENDING")
    assert resp.status_code == 200
    titles = [p["title"] for p in resp.json()]
    assert "EnAttente" in titles
    assert "Validee" not in titles