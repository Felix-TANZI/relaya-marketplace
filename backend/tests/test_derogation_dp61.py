# DP-61, décision du porteur du 2026-10-31 (suite de A1) : sans opérateur d'appel masqué, la production ne démarre
# que sous une dérogation écrite, signalée par check --deploy et par payments_preflight. Sans elle, elle ne démarre pas.

import pytest
from django.core.management import call_command
from django.core.management.base import SystemCheckError

from apps.payments.tests.reporting.test_preflight import executer

pytestmark = pytest.mark.django_db


def test_sans_derogation_le_serveur_ne_demarre_pas(settings):
    settings.BELIVAY_APPELS_DEROGATION = ""
    with pytest.raises(SystemCheckError, match="shipping.E061"):
        call_command("check", deploy=True, fail_level="ERROR")


def test_la_derogation_laisse_demarrer_et_reste_signalee(settings, capsys):
    settings.BELIVAY_APPELS_DEROGATION = "2026-10-31 contrat operateur en cours"
    call_command("check", deploy=True, fail_level="ERROR")                     # plus d'erreur : le serveur démarre
    sortie = capsys.readouterr()
    assert "shipping.W061" in sortie.out + sortie.err and "2026-10-31" in sortie.out + sortie.err


def test_le_preflight_bloque_sans_derogation_et_alerte_avec():
    sortie, _ = executer(BELIVAY_APPELS_DEROGATION="")
    assert "[BLOQUANT] Aucun operateur d'appel masque" in sortie
    sortie, _ = executer(BELIVAY_APPELS_DEROGATION="2026-10-31 contrat operateur en cours")
    assert "[ALERTE] Aucun operateur d'appel masque" in sortie and "2026-10-31" in sortie
