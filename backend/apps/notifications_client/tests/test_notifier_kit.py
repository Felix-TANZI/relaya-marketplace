# backend/apps/notifications_client/tests/test_notifier_kit.py
import pytest

from apps.client_core.tests.outils import creer_client
from apps.notifications_client.services import notifier

pytestmark = pytest.mark.django_db


def test_notifier_refuse_un_code_a_six_chiffres():
    u = creer_client()
    assert notifier(u, "Ton code", "123456") is False


def test_notifier_suivi():
    u = creer_client()
    assert isinstance(notifier(u, "Colis refusé", "Awa a refusé le colis.", "/listes"), bool)
