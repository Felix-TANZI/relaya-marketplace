# Argent, étape 17 (avant main 2) :
#
#   - l'envoi au prestataire part hors de toute transaction : « en cours » d'abord validé en base, puis l'envoi, puis
#     la conclusion ; un envoi interrompu devient une issue inconnue (jamais renvoyé)
#   - plafonds sous verrou : un remboursement automatique « en cours » compte déjà (D32, limites par personne)
#   - plafond du Wallet (R03.5) : les recharges en attente comptent
#   - R69.1 : la course de retour du client en tort, payée par Mobile Money (R02.6)

from datetime import timedelta

import pytest
from django.contrib.auth.models import User
from django.db import connection
from django.utils import timezone

from apps.accounts.models import UserNotification
from apps.orders import retours
from apps.orders.models import RemboursementAuto
from apps.payments.infrastructure.providers.mock import MockProvider
from apps.payments.ledger import chart_of_accounts as coa
from apps.payments.ledger.balances import balance
from apps.payments.ledger.posting import debit
from apps.payments.settlements.models import PayoutRequest
from apps.payments.settlements.services import requalifier_envois_interrompus, verser_a_un_client
from apps.payments.tests.bridge.test_checkout import _mock, configuration, plan_comptable  # noqa: F401
from apps.regles import services as regles
from tests.test_comptoir_d14 import NUMERO, _payer
from tests.test_retours_d18 import _livree, _referentiel, _retour  # noqa: F401  (fixture)

pytestmark = pytest.mark.django_db


@pytest.fixture(autouse=True)
def _frais_mobile_money():
    """La règle de répartition des frais Mobile Money, comme dans les tests du comptoir (D14)."""
    from apps.payments.config.models import DistributionRule

    DistributionRule.objects.get_or_create(
        config_key="dist-payment-fee-platform", defaults={
            "name": "Frais Mobile Money", "component": DistributionRule.Component.PAYMENT_FEE,
            "payee_type": DistributionRule.PayeeType.PLATFORM, "basis": DistributionRule.Basis.REMAINDER,
            "priority": 10})


def _verser(user, montant=3000, reference="essai-1"):
    return verser_a_un_client(user=user, msisdn=NUMERO, operator="MTN", masque="67****001", montant=montant,
                              reference=reference, justification=f"Essai {reference}",
                              debits=[debit(coa.EXPENSE_AUTO_REFUND, montant, label="essai")])


@pytest.mark.django_db(transaction=True)
def test_l_argent_part_hors_transaction_apres_l_enregistrement(monkeypatch):
    vu = {}
    vrai = MockProvider.withdraw

    def withdraw(self, demande):
        vu["dans_une_transaction"] = connection.in_atomic_block
        vu["statut_en_base"] = PayoutRequest.objects.get(provider_external_reference=demande.external_reference).status
        return vrai(self, demande)

    monkeypatch.setattr(MockProvider, "withdraw", withdraw)
    versement, etat = _verser(User.objects.create_user("cli_ht", password="p"))
    assert vu == {"dans_une_transaction": False, "statut_en_base": PayoutRequest.Status.PROCESSING}
    assert etat == PayoutRequest.Status.PAID


@pytest.mark.django_db(transaction=True)
def test_un_envoi_interrompu_devient_une_issue_inconnue(monkeypatch):
    def tombe(self, demande):
        raise KeyboardInterrupt  # le processus s'arrête pendant l'appel au prestataire

    monkeypatch.setattr(MockProvider, "withdraw", tombe)
    with pytest.raises(KeyboardInterrupt):
        _verser(User.objects.create_user("cli_crash", password="p"), reference="crash")
    versement = PayoutRequest.objects.get(justification__startswith="Essai crash")
    assert versement.status == PayoutRequest.Status.PROCESSING              # la trace est restée
    assert requalifier_envois_interrompus(minutes=0) == {"requalifies": 1}
    versement.refresh_from_db()
    assert versement.status == PayoutRequest.Status.UNKNOWN                  # jamais renvoyé : réconciliation
    assert balance(coa.PSP_IN_TRANSIT) == 3000


def test_un_envoi_recent_reste_en_cours():
    versement = PayoutRequest.objects.create(
        payee=_verser(User.objects.create_user("cli_r", password="p"))[0].payee, amount_xaf=100,
        requested_by=User.objects.get(username="cli_r"), status=PayoutRequest.Status.PROCESSING,
        executed_at=timezone.now())
    assert requalifier_envois_interrompus(minutes=30) == {"requalifies": 0}
    versement.refresh_from_db()
    assert versement.status == PayoutRequest.Status.PROCESSING


def test_un_remboursement_automatique_en_cours_compte_deja(monkeypatch):
    """Les limites par personne et le plafond mensuel comptent la demande « en cours » (sous verrou)."""
    from tests import test_remboursement_auto_d32 as d32

    vrai = regles.reglage
    monkeypatch.setattr(regles, "reglage",
                        lambda nom: d32.PLAFOND if nom == "r_auto_rmb_plafond_mois" else vrai(nom))
    user = d32._client("c_en_cours")
    assert d32._reclamer(user, d32._commande_retiree(user))["accorde"] is True
    RemboursementAuto.objects.update(statut=RemboursementAuto.Statut.EN_COURS)   # l'envoi n'est pas conclu
    deuxieme = d32._reclamer(user, d32._commande_retiree(user))
    assert deuxieme["accorde"] is False and "30 jours" in deuxieme["raison"]


def test_le_plafond_du_wallet_compte_les_recharges_en_attente(monkeypatch):
    from apps.payments.wallet import services as wallet

    vrai = regles.reglage
    monkeypatch.setattr(regles, "reglage", lambda nom: 1 if nom == "r_wallet_ouvert" else vrai(nom))
    u = User.objects.create_user("cli_plafond", password="p")
    plafond = regles.reglage("r_wallet_plafond")
    wallet.preparer_recharge(u, montant=plafond - 1000, msisdn=NUMERO, operator="MTN")   # pas encore payée
    with pytest.raises(wallet.WalletError) as e:
        wallet.preparer_recharge(u, montant=2000, msisdn=NUMERO, operator="MTN")
    assert e.value.code == "wallet_plafond"
    assert wallet.recharges_en_attente(u) == plafond - 1000


def test_r69_1_le_client_en_tort_paie_la_course_de_retour():
    o = _livree(timedelta(days=1))
    ret = _retour(o, inspection_passed=False)
    retours.attribuer_frais_de_retour(ret)
    ret.refresh_from_db()
    frais = int(regles.moteur().frais_momo(regles.reglage("r_retour")))
    assert ret.frais_retour_partie == "client" and ret.frais_momo_retour_xaf == frais                # R02.6
    assert retours.course_de_retour_due(ret) == regles.reglage("r_retour") + frais
    assert UserNotification.objects.filter(user=o.user, title__startswith="Course de retour").exists()

    from apps.payments.bridge.checkout_v2 import prepare_payment_course_retour

    intent = prepare_payment_course_retour(ret, payer_msisdn=NUMERO, payer_operator="MTN")
    assert intent.amount_xaf == regles.reglage("r_retour") + frais
    _payer(intent)
    ret.refresh_from_db()
    assert ret.frais_retour_paye_le is not None and retours.course_de_retour_due(ret) == 0


def test_r69_1_gratuite_si_le_probleme_est_valide():
    o = _livree(timedelta(days=1))
    ret = _retour(o, inspection_passed=True)
    retours.attribuer_frais_de_retour(ret)
    ret.refresh_from_db()
    assert ret.frais_retour_partie != "client" and retours.course_de_retour_due(ret) == 0
