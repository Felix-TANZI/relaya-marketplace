# backend/tests/test_auth.py
# Premier test réel : prouve que le socle de tests fonctionne ET que
# le parcours d'authentification (login JWT + /me) répond correctement.

import pytest

from tests.factories import UserFactory, TEST_PASSWORD

pytestmark = pytest.mark.django_db


def test_login_returns_tokens_and_me_works(api_client):
    user = UserFactory()

    resp = api_client.post(
        "/api/auth/login/",
        {"username": user.username, "password": TEST_PASSWORD},
        format="json",
    )
    assert resp.status_code == 200, resp.content
    assert "access" in resp.data and "refresh" in resp.data

    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {resp.data['access']}")
    me = api_client.get("/api/auth/me/")
    assert me.status_code == 200
    assert me.data["username"] == user.username


def test_login_wrong_password_is_rejected(api_client):
    user = UserFactory()
    resp = api_client.post(
        "/api/auth/login/",
        {"username": user.username, "password": "mauvais-mot-de-passe"},
        format="json",
    )
    assert resp.status_code == 401