import pytest

from apps.accounts.models import TrustScoreProfile
from apps.accounts.trust_score import calculate_trust_score
from apps.catalog.models import Category
from apps.vendors.models import VendorLocation, VendorProfile


pytestmark = pytest.mark.django_db


def _vendor(django_user_model, username="seller", status=VendorProfile.Status.PENDING):
    user = django_user_model.objects.create_user(username=username, password="p")
    profile = VendorProfile.objects.create(
        user=user,
        business_name="Boutique Test",
        business_description="Vendeur test",
        phone="+237699000000",
        address="Mokolo, Yaounde",
        city="Yaounde",
        status=status,
    )
    return user, profile


def test_pending_vendor_can_create_reachable_location_with_description(api_client, django_user_model):
    user, profile = _vendor(django_user_model)
    api_client.force_authenticate(user=user)

    resp = api_client.post(
        "/api/vendors/locations/create/",
        {
            "name": "Boutique principale",
            "address": "Marche Mokolo, Yaounde",
            "description": "Portail orange derriere la pharmacie principale.",
            "phone": "+237699000001",
            "representative_name": "Responsable boutique",
            "representative_phone": "+237699000002",
            "is_active": True,
            "is_main": True,
        },
        format="json",
    )

    assert resp.status_code == 201
    profile.refresh_from_db()
    assert profile.has_required_location is True


def test_location_requires_coordinates_or_access_description(api_client, django_user_model):
    user, _profile = _vendor(django_user_model)
    api_client.force_authenticate(user=user)

    resp = api_client.post(
        "/api/vendors/locations/create/",
        {
            "name": "Boutique principale",
            "address": "Marche Mokolo, Yaounde",
            "description": "",
            "phone": "+237699000001",
            "representative_name": "Responsable boutique",
            "representative_phone": "+237699000002",
            "is_active": True,
            "is_main": True,
        },
        format="json",
    )

    assert resp.status_code == 400
    assert "description" in resp.json()


def test_admin_cannot_approve_vendor_without_reachable_location(api_client, django_user_model):
    _user, profile = _vendor(django_user_model)
    admin = django_user_model.objects.create_superuser("admin", "admin@example.com", "p")
    api_client.force_authenticate(user=admin)

    resp = api_client.post(f"/api/vendors/admin/vendors/{profile.id}/approve/")

    assert resp.status_code == 400
    assert resp.json()["code"] == "VENDOR_LOCATION_REQUIRED"
    profile.refresh_from_db()
    assert profile.status == VendorProfile.Status.PENDING


def test_admin_can_approve_vendor_with_main_gps_location(api_client, django_user_model):
    _user, profile = _vendor(django_user_model)
    VendorLocation.objects.create(
        vendor=profile,
        name="Boutique principale",
        address="Marche Mokolo, Yaounde",
        phone="+237699000001",
        representative_name="Responsable boutique",
        representative_phone="+237699000002",
        latitude="3.872000",
        longitude="11.513000",
        is_active=True,
        is_main=True,
    )
    admin = django_user_model.objects.create_superuser("admin", "admin@example.com", "p")
    api_client.force_authenticate(user=admin)

    resp = api_client.post(f"/api/vendors/admin/vendors/{profile.id}/approve/")

    assert resp.status_code == 200
    profile.refresh_from_db()
    assert profile.status == VendorProfile.Status.APPROVED


def test_trust_score_documents_improve_only_after_reachable_location(django_user_model):
    user, profile = _vendor(django_user_model, username="trust-seller", status=VendorProfile.Status.APPROVED)

    score_without_location = calculate_trust_score(user, TrustScoreProfile.Role.VENDOR)

    VendorLocation.objects.create(
        vendor=profile,
        name="Boutique principale",
        address="Marche Mokolo, Yaounde",
        phone="+237699000001",
        representative_name="Responsable boutique",
        representative_phone="+237699000002",
        latitude="3.872000",
        longitude="11.513000",
        is_active=True,
        is_main=True,
    )

    score_with_location = calculate_trust_score(user, TrustScoreProfile.Role.VENDOR)

    assert score_with_location.breakdown["documents"]["score"] > score_without_location.breakdown["documents"]["score"]


def test_approved_vendor_without_reachable_location_cannot_create_product(api_client, django_user_model):
    user, _profile = _vendor(django_user_model, username="product-seller", status=VendorProfile.Status.APPROVED)
    category = Category.objects.create(name="Telephone", slug="telephone-location-required")
    api_client.force_authenticate(user=user)

    resp = api_client.post(
        "/api/vendors/products/",
        {
            "title": "Telephone test",
            "description": "Produit test avec description suffisante.",
            "short_description": "Produit test",
            "price_xaf": 100000,
            "category": category.id,
            "stock_quantity": 3,
        },
        format="json",
    )

    assert resp.status_code == 403
    assert "boutique principale localisable" in resp.json()["detail"]
