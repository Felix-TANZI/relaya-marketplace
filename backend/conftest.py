# backend/conftest.py
import pytest
from rest_framework.test import APIClient


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture(autouse=True)
def _clear_cache():
    """Repart d'un cache propre à chaque test : évite que le compteur de
    throttling d'un test ne déborde sur le suivant."""
    from django.core.cache import cache
    cache.clear()
    yield
    cache.clear()