# L'application argent (vendeur_argent) est écrite en parallèle : ses versements ne sont pas lus par ces tests, sauf
# dans le test qui vérifie l'appel paresseux (test_versement_de_lu_dans_l_application_argent).
import pytest

from apps.vendeur_commandes import services

_versement_de = services.versement_de


@pytest.fixture(autouse=True)
def sans_versements(monkeypatch):
    monkeypatch.setattr(services, "versement_de", lambda c: None)


@pytest.fixture
def versement_de_reel():
    return _versement_de
