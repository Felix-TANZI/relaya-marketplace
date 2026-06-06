# backend/conftest.py
# Fixtures partagées par toute la suite de tests.

import pytest
from rest_framework.test import APIClient


@pytest.fixture
def api_client():
    """Client HTTP non authentifié pour appeler l'API DRF."""
    return APIClient()