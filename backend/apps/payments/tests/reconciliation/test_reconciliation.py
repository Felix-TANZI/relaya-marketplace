# backend/apps/payments/tests/reconciliation/test_reconciliation.py
# Tests des trois niveaux de reconciliation.
#
#   docker exec -it relaya_backend pytest apps/payments/tests/reconciliation/ -q
#
# Le test central du lot est test_versement_inconnu_confirme_par_l_historique :
# il repond a « l'argent est-il parti ? » sans jamais renvoyer la demande.

from datetime import timedelta
from decimal import Decimal

import pytest
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.utils import timezone

from apps.payments.application.collect import (
    create_payment_intent, initiate_collect, poll_attempt,
)
from apps.payments.bridge import events_in
from apps.payments.config.models import (
    DistributionRule, EscrowPolicy, FeeRule, PayoutPolicy, ProviderConfig,
)
from apps.payments.domain.distribution import ComponentInput
from apps.payments.domain.enums import EconomicComponent, PayeeType as DomainPayeeType
from apps.payments.domain.money import Money
from apps.payments.escrow.models import EscrowHold
from apps.payments.escrow.services import release_hold
from apps.payments.infrastructure.providers.campay import mapper
from apps.payments.infrastructure.providers.mock import reset_mock_state
from apps.payments.ledger import chart_of_accounts as coa
from apps.payments.ledger.balances import balance, trial_balance_total
from apps.payments.ledger.invariants import check_escrow_equation, run_all
from apps.payments.ledger.models import LedgerAccount
from apps.payments.ledger.posting import credit, debit, post
from apps.payments.payees.models import MomoOperator, PayeeType
from apps.payments.payees.services import create_payee
from apps.payments.reconciliation.models import Discrepancy, ReconciliationRun
from apps.payments.reconciliation.services import (
    open_discrepancies_summary, reconcile_escrow, reconcile_solvency,
    reconcile_transactions, resolve_unknown_payouts,
)
from apps.payments.settlements.models import PayoutRequest
from apps.payments.settlements.services import (
    approve_payout, build_batch, confirm_batch, execute_payout, request_payout,
)

pytestmark = pytest.mark.django_db

NUMERO = "237677123456"
NUMERO_TIMEOUT = "237677123459"


@pytest.fixture(autouse=True)
def _mock():
    reset_mock_state()
    yield
    reset_mock_state()


@pytest.fixture(autouse=True)
def plan_comptable():
    for entree in coa.CHART:
        LedgerAccount.objects.get_or_create(code=entree["code"], defaults=entree)


@pytest.fixture(autouse=True)
def configuration():
    ProviderConfig.objects.create(
        config_key="provider-mock", provider_code="MOCK",
        mode=ProviderConfig.Mode.SANDBOX, is_enabled=True,
        is_payout_enabled=True, priority=10,
        supported_operators=["MTN", "ORANGE"],
        min_amount_xaf=100, max_amount_xaf=10_000_000,
    )
    FeeRule.objects.create(
        config_key="fee-collect", name="Frais",
        scope=FeeRule.Scope.COLLECT, basis=FeeRule.Basis.PERCENT,
        value=Decimal("2"), bearer=FeeRule.Bearer.PLATFORM, priority=10)
    DistributionRule.objects.create(
        config_key="dist-goods", name="Marchandise",
        component=DistributionRule.Component.GOODS,
        payee_type=DistributionRule.PayeeType.VENDOR,
        basis=DistributionRule.Basis.REMAINDER, priority=10)
    EscrowPolicy.objects.create(
        config_key="escrow-default", name="Defaut",
        auto_confirm_hours=48, release_delay_hours=24, priority=0)
    PayoutPolicy.objects.create(
        config_key="payout-default", name="Defaut", min_payout_xaf=100,
        max_payout_xaf=5_000_000, required_approvals=1,
        dual_approval_threshold_xaf=1_000_000,
        momo_change_cooling_hours=72, priority=0)


@pytest.fixture
def acheteur():
    return User.objects.create_user("a", "a@b.cm", "x")


@pytest.fixture
def operateur():
    return User.objects.create_user("op", "op@b.cm", "x")


@pytest.fixture
def approbateur():
    return User.objects.create_user("ap", "ap@b.cm", "x")


@pytest.fixture
def vendeur():
    compte = create_payee(
        payee_type=PayeeType.VENDOR, display_label="Boutique A",
        momo_operator=MomoOperator.MTN, momo_number=NUMERO)
    compte.kyc_status = "VERIFIED"
    compte.momo_changed_at = timezone.now() - timedelta(days=30)
    compte.save()
    return compte


def encaisser(acheteur, vendeur, montant=20000, order_id=1, cle="c1"):
    intent = create_payment_intent(
        buyer=acheteur, idempotency_key=cle,
        components=[ComponentInput(EconomicComponent.GOODS, Money(montant),
                                   order_id=order_id,
                                   commission_rate=Decimal("15"))],
        payee_codes={DomainPayeeType.VENDOR: vendeur.payee_code},
        payee_types={vendeur.payee_code: DomainPayeeType.VENDOR},
        payer_msisdn=NUMERO, payer_operator="MTN")
    issue = initiate_collect(intent)
    poll_attempt(issue.attempt)
    poll_attempt(issue.attempt)
    intent.refresh_from_db()
    return intent


# ═══════════════════════════════════════════════════════════════════════════
# ANALYSE DE L'HISTORIQUE
# ═══════════════════════════════════════════════════════════════════════════

class TestAnalyseHistorique:

    LIGNE_REELLE = {
        "datetime": "2021-01-29T09:52:34.876707Z",
        "code": "CP210129D0001P",
        "operator_tx_code": "MP210129.1052.A35072",
        "operator": "Orange", "phone_number": "237696546822",
        "description": "Test", "external_user": "",
        "amount": 5, "charge_amount": 0.05, "debit": 0, "credit": 4.95,
        "status": "SUCCESSFUL",
        "reference_uuid": "25c63c72-8485-4059-85ad-fdb4bfb26c21",
    }

    def test_ligne_documentee(self):
        ligne = mapper.parse_history_row(self.LIGNE_REELLE)
        assert ligne["provider_reference"] == "25c63c72-8485-4059-85ad-fdb4bfb26c21"
        assert ligne["status"] == "SUCCESSFUL"
        assert ligne["amount_xaf"] == 5
        assert ligne["operator"] == "ORANGE"
        assert ligne["endpoint"] == "collect"        # debit = 0

    def test_les_frais_decimaux_sont_toleres(self):
        """
        charge_amount vaut 0.05 chez CamPay. Un montant de transaction avec
        decimales leverait ; une CHARGE est arrondie a l'inferieur.
        """
        ligne = mapper.parse_history_row({**self.LIGNE_REELLE,
                                          "charge_amount": 12.75})
        assert ligne["fee_xaf"] == 12

    def test_debit_positif_signale_un_versement(self):
        ligne = mapper.parse_history_row({**self.LIGNE_REELLE,
                                          "debit": 5, "credit": 0})
        assert ligne["endpoint"] == "withdraw"

    def test_reponse_complete(self):
        lignes = mapper.parse_history({"data": [self.LIGNE_REELLE,
                                                self.LIGNE_REELLE]})
        assert len(lignes) == 2

    def test_reponse_vide(self):
        assert mapper.parse_history({"data": []}) == []
        assert mapper.parse_history(None) == []

    def test_external_reference_absent_de_l_historique(self):
        """
        LIMITE STRUCTURELLE : /history/ ne renvoie PAS external_reference.
        C'est pourquoi le rapprochement s'appuie sur `description`.
        """
        assert "external_reference" not in self.LIGNE_REELLE
        ligne = mapper.parse_history_row(self.LIGNE_REELLE)
        assert "description" in ligne


# ═══════════════════════════════════════════════════════════════════════════
# NIVEAU 1 — SOLVABILITE
# ═══════════════════════════════════════════════════════════════════════════

class TestSolvabilite:

    def test_execution_tracee(self, acheteur, vendeur):
        run = reconcile_solvency()
        assert run.level == ReconciliationRun.Level.SOLVENCY
        assert run.finished_at is not None
        assert run.reference.startswith("BLV-REC-")

    def test_insolvabilite_detectee(self, acheteur, vendeur):
        """
        Le prestataire factice renvoie un solde nul. Des qu'une dette
        existe, l'insolvabilite doit etre constatee.
        """
        encaisser(acheteur, vendeur)
        run = reconcile_solvency()
        assert run.status == ReconciliationRun.Status.DISCREPANCIES
        graves = run.discrepancies.filter(kind=Discrepancy.Kind.INSOLVENCY)
        assert graves.exists()
        assert graves.first().severity == Discrepancy.Severity.CRITICAL

    def test_l_action_suggeree_est_renseignee(self, acheteur, vendeur):
        encaisser(acheteur, vendeur)
        run = reconcile_solvency()
        for ecart in run.discrepancies.all():
            assert ecart.suggested_action, ecart.kind

    def test_execution_non_supprimable(self):
        run = reconcile_solvency()
        with pytest.raises(ValidationError):
            run.delete()


# ═══════════════════════════════════════════════════════════════════════════
# NIVEAU 2 — COHERENCE DU SEQUESTRE
# ═══════════════════════════════════════════════════════════════════════════

class TestCoherenceSequestre:

    def test_coherent_apres_encaissement(self, acheteur, vendeur):
        encaisser(acheteur, vendeur)
        run = reconcile_escrow()
        assert run.status == ReconciliationRun.Status.CLEAN
        assert run.summary["gap_xaf"] == 0

    def test_coherent_apres_liberation(self, acheteur, vendeur):
        intent = encaisser(acheteur, vendeur)
        events_in.buyer_confirmed_receipt(order_id=1, event_id="r1")
        release_hold(EscrowHold.objects.get(intent=intent), force=True,
                     reason="Test")
        assert reconcile_escrow().status == ReconciliationRun.Status.CLEAN

    def test_ecart_detecte(self, acheteur, vendeur):
        """
        On introduit un desequilibre volontaire au registre, sans toucher
        aux sequestres. Le controle doit le voir.
        """
        encaisser(acheteur, vendeur)
        post(kind="ADJUSTMENT",
             lines=[debit(coa.ESCROW_LIABILITY, 5000),
                    credit(coa.PSP_AVAILABLE, 5000)],
             description="Desequilibre volontaire")

        run = reconcile_escrow()
        assert run.status == ReconciliationRun.Status.DISCREPANCIES
        ecart = run.discrepancies.get(kind=Discrepancy.Kind.ESCROW_MISMATCH)
        assert ecart.severity == Discrepancy.Severity.CRITICAL
        # gap = observe - attendu : le registre est INFERIEUR aux sequestres
        assert ecart.gap_xaf == -5000
        assert ecart.observed_xaf < ecart.expected_xaf
        assert "BUG DE CODE" in ecart.suggested_action

    def test_invariant_i8_active(self, acheteur, vendeur):
        """L'invariant declare au Lot 3 est desormais operationnel."""
        encaisser(acheteur, vendeur)
        resultat = check_escrow_equation()
        assert resultat.status == "OK"
        assert resultat.data["holds"] == resultat.data["ledger"]

    def test_invariant_i8_detecte_l_ecart(self, acheteur, vendeur):
        encaisser(acheteur, vendeur)
        post(kind="ADJUSTMENT",
             lines=[debit(coa.ESCROW_LIABILITY, 3000),
                    credit(coa.PSP_AVAILABLE, 3000)],
             description="Desequilibre")
        assert check_escrow_equation().status == "VIOLATED"
        assert run_all()["ok"] is False


# ═══════════════════════════════════════════════════════════════════════════
# NIVEAU 3 — RAPPROCHEMENT TRANSACTIONNEL
# ═══════════════════════════════════════════════════════════════════════════

class TestRapprochement:

    def test_transactions_appariees(self, acheteur, vendeur):
        encaisser(acheteur, vendeur)
        run = reconcile_transactions(days=1)
        assert run.status in (ReconciliationRun.Status.CLEAN,
                              ReconciliationRun.Status.DISCREPANCIES)
        assert run.checked_count >= 1

    def test_transaction_fantome_detectee(self, acheteur, vendeur):
        """
        Une transaction chez le prestataire sans contrepartie chez nous,
        c'est de l'argent qui a circule sans trace comptable.
        """
        from apps.payments.infrastructure.providers import mock

        encaisser(acheteur, vendeur)
        mock._TRANSACTIONS["fantome-xyz"] = {
            "provider_reference": "fantome-xyz",
            "external_reference": "", "amount_xaf": 99000,
            "operator": "MTN", "msisdn": NUMERO, "msisdn_last": "6",
            "description": "Transaction inconnue", "endpoint": "collect",
            "occurred_at": timezone.now(), "status": "SUCCESSFUL",
            "raw_status": "SUCCESSFUL", "polls": 0,
        }
        run = reconcile_transactions(days=1)
        fantomes = run.discrepancies.filter(
            kind=Discrepancy.Kind.MISSING_LOCALLY)
        assert fantomes.exists()
        assert fantomes.first().severity == Discrepancy.Severity.HIGH


# ═══════════════════════════════════════════════════════════════════════════
# RESOLUTION DES VERSEMENTS INCONNUS — le coeur du lot
# ═══════════════════════════════════════════════════════════════════════════

class TestVersementsInconnus:

    def _versement_inconnu(self, acheteur, vendeur, operateur, approbateur):
        intent = encaisser(acheteur, vendeur)
        events_in.buyer_confirmed_receipt(order_id=1, event_id="r-inc")
        release_hold(EscrowHold.objects.get(intent=intent), force=True,
                     reason="Test")
        lot = confirm_batch(build_batch(vendeur))
        demande = request_payout(lot, requested_by=operateur)
        demande = approve_payout(demande, approved_by=approbateur)

        vendeur.set_momo_number(NUMERO_TIMEOUT, MomoOperator.MTN)
        vendeur.momo_changed_at = timezone.now() - timedelta(days=30)
        vendeur.save()
        return execute_payout(demande)

    def test_versement_reste_inconnu(self, acheteur, vendeur, operateur,
                                     approbateur):
        demande = self._versement_inconnu(acheteur, vendeur, operateur,
                                          approbateur)
        assert demande.status == PayoutRequest.Status.UNKNOWN
        assert balance(coa.PSP_IN_TRANSIT) == demande.amount_xaf

    def test_sans_trace_l_argent_n_est_pas_parti(self, acheteur, vendeur,
                                                 operateur, approbateur):
        """
        Aucune trace dans l'historique : l'argent n'est probablement pas
        parti. On NE conclut PAS automatiquement, on constate.
        """
        demande = self._versement_inconnu(acheteur, vendeur, operateur,
                                          approbateur)
        run = resolve_unknown_payouts(days=7)

        assert run.summary["unknown_payouts"] == 1
        assert run.summary["no_trace"] == 1
        assert run.summary["resolved"] == 0

        demande.refresh_from_db()
        assert demande.status == PayoutRequest.Status.UNKNOWN

        ecart = run.discrepancies.first()
        assert "jamais en rejouant" in ecart.suggested_action

    def test_versement_inconnu_confirme_par_l_historique(
        self, acheteur, vendeur, operateur, approbateur,
    ):
        """
        LE TEST CENTRAL DU LOT.

        L'historique du prestataire prouve que le versement a REUSSI. Le
        transit est solde vers la dette, et l'etat passe a PAID — par
        LECTURE, sans jamais avoir renvoye la demande.
        """
        from apps.payments.infrastructure.providers import mock

        demande = self._versement_inconnu(acheteur, vendeur, operateur,
                                          approbateur)
        transit_avant = balance(coa.PSP_IN_TRANSIT)
        assert transit_avant == demande.amount_xaf

        # Le prestataire l'avait bien recu — notre reference est dans
        # la description, comme a l'emission.
        mock._TRANSACTIONS["retrouve"] = {
            "provider_reference": "retrouve",
            "external_reference": demande.provider_external_reference,
            "amount_xaf": demande.amount_xaf, "operator": "MTN",
            "msisdn": NUMERO_TIMEOUT, "msisdn_last": "9",
            "description": f"BelivaY {demande.reference}",
            "endpoint": "withdraw", "occurred_at": timezone.now(),
            "status": "SUCCESSFUL", "raw_status": "SUCCESSFUL", "polls": 0,
        }

        run = resolve_unknown_payouts(days=7)
        assert run.summary["resolved"] == 1

        demande.refresh_from_db()
        assert demande.status == PayoutRequest.Status.PAID
        assert balance(coa.PSP_IN_TRANSIT) == 0
        assert trial_balance_total() == 0

    def test_versement_inconnu_infirme_par_l_historique(
        self, acheteur, vendeur, operateur, approbateur,
    ):
        """
        L'historique prouve l'ECHEC : l'argent n'est pas parti, il revient
        en tresorerie et un nouveau versement devient possible.
        """
        from apps.payments.infrastructure.providers import mock

        demande = self._versement_inconnu(acheteur, vendeur, operateur,
                                          approbateur)
        mock._TRANSACTIONS["echoue"] = {
            "provider_reference": "echoue",
            "external_reference": "", "amount_xaf": demande.amount_xaf,
            "operator": "MTN", "msisdn": NUMERO_TIMEOUT, "msisdn_last": "9",
            "description": f"BelivaY {demande.reference}",
            "endpoint": "withdraw", "occurred_at": timezone.now(),
            "status": "FAILED", "raw_status": "FAILED", "polls": 0,
        }

        run = resolve_unknown_payouts(days=7)
        assert run.summary["resolved"] == 1

        demande.refresh_from_db()
        assert demande.status == PayoutRequest.Status.FAILED
        assert balance(coa.PSP_IN_TRANSIT) == 0
        assert trial_balance_total() == 0

    def test_appariement_non_deterministe_exige_un_humain(
        self, acheteur, vendeur, operateur, approbateur,
    ):
        """
        Meme montant, meme numero, meme fenetre — mais sans identifiant
        certain. On NE conclut PAS : arbitrage humain obligatoire.
        """
        from apps.payments.infrastructure.providers import mock

        demande = self._versement_inconnu(acheteur, vendeur, operateur,
                                          approbateur)
        mock._TRANSACTIONS["ambigu"] = {
            "provider_reference": "ambigu",
            "external_reference": "", "amount_xaf": demande.amount_xaf,
            "operator": "MTN", "msisdn": NUMERO_TIMEOUT, "msisdn_last": "9",
            "description": "Paiement",         # AUCUNE reference BelivaY
            "endpoint": "withdraw", "occurred_at": timezone.now(),
            "status": "SUCCESSFUL", "raw_status": "SUCCESSFUL", "polls": 0,
        }

        run = resolve_unknown_payouts(days=7)
        assert run.summary["candidates_needing_human"] == 1
        assert run.summary["resolved"] == 0

        demande.refresh_from_db()
        assert demande.status == PayoutRequest.Status.UNKNOWN

        ecart = run.discrepancies.first()
        assert ecart.severity == Discrepancy.Severity.CRITICAL
        assert "ARBITRAGE HUMAIN" in ecart.suggested_action

    def test_resolution_idempotente(self, acheteur, vendeur, operateur,
                                    approbateur):
        from apps.payments.infrastructure.providers import mock
        from apps.payments.ledger.models import LedgerTransaction

        demande = self._versement_inconnu(acheteur, vendeur, operateur,
                                          approbateur)
        mock._TRANSACTIONS["retrouve2"] = {
            "provider_reference": "retrouve2", "external_reference": "",
            "amount_xaf": demande.amount_xaf, "operator": "MTN",
            "msisdn": NUMERO_TIMEOUT, "msisdn_last": "9",
            "description": f"BelivaY {demande.reference}",
            "endpoint": "withdraw", "occurred_at": timezone.now(),
            "status": "SUCCESSFUL", "raw_status": "SUCCESSFUL", "polls": 0,
        }
        resolve_unknown_payouts(days=7)
        ecritures = LedgerTransaction.objects.count()
        resolve_unknown_payouts(days=7)
        assert LedgerTransaction.objects.count() == ecritures


# ═══════════════════════════════════════════════════════════════════════════
# ECARTS
# ═══════════════════════════════════════════════════════════════════════════

class TestEcarts:

    def test_resolution_exige_une_note(self, acheteur, vendeur, operateur):
        encaisser(acheteur, vendeur)
        run = reconcile_solvency()
        ecart = run.discrepancies.first()
        with pytest.raises(ValidationError):
            ecart.resolve(resolution=Discrepancy.Resolution.RESOLVED,
                          note="  ", user=operateur)

    def test_resolution_tracee(self, acheteur, vendeur, operateur):
        encaisser(acheteur, vendeur)
        ecart = reconcile_solvency().discrepancies.first()
        ecart.resolve(resolution=Discrepancy.Resolution.FALSE_POSITIVE,
                      note="Bac a sable : solde toujours nul.",
                      user=operateur)
        ecart.refresh_from_db()
        assert ecart.resolution == Discrepancy.Resolution.FALSE_POSITIVE
        assert ecart.resolved_by == operateur

    def test_ecart_non_supprimable(self, acheteur, vendeur):
        encaisser(acheteur, vendeur)
        ecart = reconcile_solvency().discrepancies.first()
        with pytest.raises(ValidationError):
            ecart.delete()

    def test_synthese_declenche_le_gel(self, acheteur, vendeur):
        encaisser(acheteur, vendeur)
        reconcile_solvency()
        resume = open_discrepancies_summary()
        assert resume["critical_open"] >= 1
        assert resume["must_freeze_payouts"] is True