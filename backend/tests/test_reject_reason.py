# backend/tests/test_reject_reason.py
import pytest
from apps.catalog.models import Category, Product, MasterProduct
from apps.accounts.models import UserNotification

pytestmark = pytest.mark.django_db


def _setup(django_user_model, status="PENDING"):
    vendor = django_user_model.objects.create_user("vendeurx", password="p")
    cat = Category.objects.create(name="Tel", slug="tel")
    master = MasterProduct.objects.create(title="iPhone", category=cat, moderation_status="APPROVED")
    product = Product.objects.create(title="A", category=cat, price_xaf=1, master=master,
                                     vendor=vendor, is_active=True, moderation_status=status)
    return vendor, product


def test_reject_avec_motif_stocke_et_notifie(api_client, django_user_model):
    admin = django_user_model.objects.create_superuser("adm1", "a1@a.co", "p")
    vendor, product = _setup(django_user_model)
    api_client.force_authenticate(user=admin)
    resp = api_client.post(f"/api/vendors/admin/products/{product.id}/reject/",
                           {"reason": "Photos floues"}, format="json")
    assert resp.status_code == 200
    product.refresh_from_db()
    assert product.moderation_status == "REJECTED"
    assert "Photos floues" in product.moderation_reason
    notif = UserNotification.objects.filter(user=vendor).first()
    assert notif is not None
    assert "Photos floues" in notif.message


def test_reject_sans_motif_notifie_quand_meme(api_client, django_user_model):
    admin = django_user_model.objects.create_superuser("adm2", "a2@a.co", "p")
    vendor, product = _setup(django_user_model)
    api_client.force_authenticate(user=admin)
    resp = api_client.post(f"/api/vendors/admin/products/{product.id}/reject/")
    assert resp.status_code == 200
    assert UserNotification.objects.filter(user=vendor).exists()


def test_approve_efface_motif(api_client, django_user_model):
    admin = django_user_model.objects.create_superuser("adm3", "a3@a.co", "p")
    vendor, product = _setup(django_user_model, status="REJECTED")
    product.moderation_reason = "ancien motif"
    product.save(update_fields=["moderation_reason"])
    api_client.force_authenticate(user=admin)
    resp = api_client.post(f"/api/vendors/admin/products/{product.id}/approve/")
    assert resp.status_code == 200
    product.refresh_from_db()
    assert product.moderation_status == "APPROVED"
    assert product.moderation_reason == ""