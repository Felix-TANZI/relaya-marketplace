# Revue du 1er novembre 2026 — P1 : en production, la migration shipping 0032 (irréversible, DP-02) refuse de partir
# tant que BELIVAY_MIGRATION_0032_VALIDEE ne porte pas la date du compte rendu « OK » de l'essai sur une copie
# (« essai-copie » sur la copie elle-même). Échoue avant la correction, passe après.

import importlib

import pytest

from apps.shipping import garde_0032

MIGRATION = importlib.import_module("apps.shipping.migrations.0032_code_retrait_chiffre").Migration


def _premiere_operation():
    return MIGRATION.operations[0].code


def test_en_production_la_migration_refuse_sans_la_variable(settings):
    settings.BELIVAY_PRODUCTION = True
    settings.BELIVAY_MIGRATION_0032_VALIDEE = ""
    with pytest.raises(garde_0032.Migration0032NonValidee, match="PROCEDURE_MIGRATION_0032.md"):
        _premiere_operation()(None, None)                                     # 1re opération : rien n'est encore fait


@pytest.mark.parametrize("valeur", ["oui", "05/11/2026", "2026-13-40"])
def test_une_valeur_qui_n_est_pas_une_date_est_refusee(settings, valeur):
    settings.BELIVAY_PRODUCTION = True
    settings.BELIVAY_MIGRATION_0032_VALIDEE = valeur
    with pytest.raises(garde_0032.Migration0032NonValidee):
        _premiere_operation()(None, None)


def test_en_production_la_migration_passe_avec_la_date_du_compte_rendu(settings):
    settings.BELIVAY_PRODUCTION = True
    settings.BELIVAY_MIGRATION_0032_VALIDEE = "2026-11-05"
    _premiere_operation()(None, None)
    assert garde_0032.verifier() == "production"


def test_sur_la_copie_l_essai_passe_et_se_signale(settings, capsys):
    settings.BELIVAY_PRODUCTION = True
    settings.BELIVAY_MIGRATION_0032_VALIDEE = "essai-copie"
    assert garde_0032.verifier() == "essai"
    assert "ESSAI" in capsys.readouterr().out


def test_hors_production_rien_n_est_exige(settings):
    settings.BELIVAY_PRODUCTION = False
    settings.BELIVAY_MIGRATION_0032_VALIDEE = ""
    assert garde_0032.verifier() == "hors production"


def test_seuls_les_reglages_de_production_activent_le_garde_fou():
    from relaya.settings import base

    assert base.BELIVAY_PRODUCTION is False
    with open(base.BASE_DIR / "relaya" / "settings" / "prod.py", encoding="utf-8") as f:
        assert "BELIVAY_PRODUCTION = True" in f.read()
