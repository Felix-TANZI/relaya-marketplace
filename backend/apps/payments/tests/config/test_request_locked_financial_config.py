# backend/apps/payments/tests/config/test_request_locked_financial_config.py
#
#   pytest apps/payments/tests/config/test_request_locked_financial_config.py -q
#
# Cette commande cree des ConfigChangeRequest (maker) pour EscrowPolicy et les
# DistributionRule GOODS/TRANSPORT/RELAY_HANDLING — aucune ligne n'existait en
# base avant elle. On verifie qu'elle cree bien 6 demandes PENDING, sans rien
# appliquer, et que la separation des roles reste en vigueur (le demandeur ne
# peut pas approuver lui-meme via le flux normal).

import pytest
from django.contrib.auth.models import User
from django.core.management import call_command

from apps.payments.config.change_control import ChangeControlError, approve_change
from apps.payments.config.models import ConfigChangeRequest, DistributionRule, EscrowPolicy

pytestmark = pytest.mark.django_db


@pytest.fixture
def demandeur():
    return User.objects.create_user("demandeur_finance", "demandeur@belivay.cm", "x")


@pytest.fixture
def approbateur():
    return User.objects.create_user("approbateur_finance", "approbateur@belivay.cm", "x")


def test_cree_six_demandes_pending_sans_rien_appliquer(demandeur):
    assert EscrowPolicy.objects.count() == 0
    assert DistributionRule.objects.count() == 0

    call_command("request_locked_financial_config", username=demandeur.username)

    demandes = ConfigChangeRequest.objects.filter(status=ConfigChangeRequest.Status.PENDING)
    # 1 EscrowPolicy + 5 DistributionRule (goods, transport-carrier, transport-platform, relay, payment-fee)
    assert demandes.count() == 5  # plus de part du transport a l entreprise (R53)
    # Aucune version reelle n'existe tant que personne n'a approuve.
    assert EscrowPolicy.objects.count() == 0
    assert DistributionRule.objects.count() == 0


def test_le_demandeur_ne_peut_pas_approuver_sa_propre_demande(demandeur):
    call_command("request_locked_financial_config", username=demandeur.username)
    demande = ConfigChangeRequest.objects.filter(target_key="escrow-default").get()

    with pytest.raises(ChangeControlError):
        approve_change(demande, approved_by=demandeur)


def test_un_second_compte_peut_approuver_et_les_valeurs_sont_correctes(demandeur, approbateur):
    call_command("request_locked_financial_config", username=demandeur.username)

    escrow_demande = ConfigChangeRequest.objects.get(target_key="escrow-default")
    approve_change(escrow_demande, approved_by=approbateur)

    policy = EscrowPolicy.objects.get(config_key="escrow-default", is_active=True)
    # Spec v2.1, R23 : auto-confirmation fixée au retrait (0 au paiement), libération + 3 j, fenêtre de 7 j.
    assert policy.auto_confirm_hours == 0
    assert policy.release_delay_hours == 72
    assert policy.dispute_window_days == 7

    # Spec v2.1, R53 (décision du 27/10/2026) : plus de part du transport à l'entreprise, payée selon sa grille ;
    # tout le transport va à la plateforme.
    assert not ConfigChangeRequest.objects.filter(target_key="dist-transport-carrier").exists()
    plateforme = ConfigChangeRequest.objects.get(target_key="dist-transport-platform")
    approve_change(plateforme, approved_by=approbateur)
    rule = DistributionRule.objects.get(config_key="dist-transport-platform", is_active=True)
    assert rule.payee_type == DistributionRule.PayeeType.PLATFORM


def test_relancer_la_commande_ne_duplique_pas_les_demandes_en_attente(demandeur):
    call_command("request_locked_financial_config", username=demandeur.username)
    call_command("request_locked_financial_config", username=demandeur.username)

    # La deuxieme execution ne doit pas empiler des doublons PENDING pour les
    # memes cles tant que la premiere n'a pas ete traitee.
    assert ConfigChangeRequest.objects.filter(
        target_key="escrow-default", status=ConfigChangeRequest.Status.PENDING
    ).count() == 1
