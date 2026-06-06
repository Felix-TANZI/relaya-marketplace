# backend/tests/test_security.py
import pytest

pytestmark = pytest.mark.django_db


def test_login_throttle_renvoie_429(api_client):
    url = "/api/auth/login/"
    # 5 tentatives autorisées (login: 5/min) → la 6e doit être bloquée
    for _ in range(5):
        api_client.post(url, {"username": "x", "password": "y"}, format="json")
    resp = api_client.post(url, {"username": "x", "password": "y"}, format="json")
    assert resp.status_code == 429


def test_entete_securite_present(api_client):
    resp = api_client.get("/api/catalog/categories/")
    assert resp.headers.get("X-Content-Type-Options") == "nosniff"