# Fixtures communes du projet d'essai (comme backend/conftest.py de relaya-marketplace), chargées par -p essai_fixtures.
import pytest


@pytest.fixture
def api_client():
    from rest_framework.test import APIClient

    return APIClient()


@pytest.fixture(autouse=True)
def _clear_cache():
    """Repart d'un cache propre à chaque test (registre des paramètres, interrupteurs, limites de débit)."""
    from django.core.cache import cache

    cache.clear()
    yield
    cache.clear()
