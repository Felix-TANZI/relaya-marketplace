# backend/apps/whatsapp_assistant/tests/conftest.py

import pytest


@pytest.fixture(autouse=True)
def _catalogue_local_par_defaut(settings):
    """
    Les tests ne dépendent jamais du réseau : même si le .env du poste choisit
    le catalogue en ligne (remote), ils lisent la base de test. Les tests de la
    source remote la réactivent eux-mêmes, avec un site simulé.
    """
    settings.WHATSAPP_CATALOG_SOURCE = "local"
    settings.WHATSAPP_POSTER_COOLDOWN_MINUTES = "60"
