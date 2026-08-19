# backend/apps/payments/tests/tasks/test_tasks.py
# Tests des taches planifiees.
#
#   docker exec -it relaya_backend pytest apps/payments/tests/tasks/ -q
#
# Deux proprietes portent l'essentiel :
#   - une tache en echec n'interrompt jamais les suivantes
#   - une tache critique muette est detectee

from datetime import timedelta
from decimal import Decimal

import pytest
from django.contrib.auth.models import User
from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.utils import timezone

from apps.payments.application.collect import (
    create_payment_intent, initiate_collect,
)
from apps.payments.config.models import (
    DistributionRule, EscrowPolicy, FeeRule, ProviderConfig,
)
from apps.payments.domain.distribution import ComponentInput
from apps.payments.domain.enums import EconomicComponent, PayeeType as DomainPayeeType
from apps.payments.domain.money import Money
from apps.payments.escrow.models import EscrowHold
from apps.payments.infrastructure.providers.mock import reset_mock_state
from apps.payments.ledger import chart_of_accounts as coa
from apps.payments.ledger.models import LedgerAccount
from apps.payments.payees.models import MomoOperator, PayeeType
from apps.payments.payees.services import create_payee
from apps.payments.tasks.base import (
    REGISTRY, DistributedLock, TaskLocked, list_tasks, payments_task, run_task,
)
from apps.payments.tasks.jobs import GROUPS, SCHEDULE
from apps.payments.tasks.models import TaskRun

pytestmark = pytest.mark.django_db

NUMERO = "237677123456"


@pytest.fixture(autouse=True)
def _propre():
    cache.clear()
    reset_mock_state()
    yield
    cache.clear()
    reset_mock_state()


@pytest.fixture(autouse=True)
def plan_comptable():
    for entree in coa.CHART:
        LedgerAccount.objects.get_or_create(code=entree["code"], defaults=entree)


@pytest.fixture
def configuration():
    ProviderConfig.objects.create(
        config_key="provider-mock", provider_code="MOCK",
        mode=ProviderConfig.Mode.SANDBOX, is_enabled=True, priority=10,
        supported_operators=["MTN", "ORANGE"],
        min_amount_xaf=100, max_amount_xaf=10_000_000,
    )
    FeeRule.objects.create(
        config_key="fee-psp-collect", name="Frais",
        scope=FeeRule.Scope.COLLECT, basis=FeeRule.Basis.PERCENT,
        value=Decimal("2"), bearer=FeeRule.Bearer.PLATFORM, priority=10,
    )
    DistributionRule.objects.create(
        config_key="dist-goods", name="Marchandise",
        component=DistributionRule.Component.GOODS,
        payee_type=DistributionRule.PayeeType.VENDOR,
        basis=DistributionRule.Basis.REMAINDER, priority=10,
    )
    EscrowPolicy.objects.create(
        config_key="escrow-default", name="Defaut",
        auto_confirm_hours=48, release_delay_hours=24, priority=0,
    )


# ═══════════════════════════════════════════════════════════════════════════
# VERROU DISTRIBUE
# ═══════════════════════════════════════════════════════════════════════════

class TestVerrou:

    def test_un_seul_detenteur(self):
        premier = DistributedLock("essai")
        second = DistributedLock("essai")
        assert premier.acquire() is True
        assert second.acquire() is False
        premier.release()
        assert second.acquire() is True
        second.release()

    def test_liberation_par_le_proprietaire_uniquement(self):
        """
        Un verrou expire puis repris par une autre execution ne doit pas
        etre supprime par la precedente.
        """
        premier = DistributedLock("essai2")
        premier.acquire()
        usurpateur = DistributedLock("essai2")
        usurpateur.acquired = True          # pretend detenir le verrou
        usurpateur.release()
        assert cache.get(premier.key) == premier.owner
        premier.release()

    def test_contexte(self):
        with DistributedLock("essai3"):
            with pytest.raises(TaskLocked):
                with DistributedLock("essai3"):
                    pass


# ═══════════════════════════════════════════════════════════════════════════
# JOURNALISATION
# ═══════════════════════════════════════════════════════════════════════════

class TestJournalisation:

    def test_execution_reussie_tracee(self):
        @payments_task("essai_ok", description="Test")
        def tache():
            return {"traites": 3}

        resultat = tache()
        assert resultat == {"traites": 3}

        execution = TaskRun.objects.get(task_name="essai_ok")
        assert execution.status == TaskRun.Status.SUCCESS
        assert execution.result == {"traites": 3}
        assert execution.finished_at is not None

    def test_echec_trace_avec_la_pile(self):
        @payments_task("essai_ko")
        def tache():
            raise ValueError("panne simulee")

        with pytest.raises(ValueError):
            tache()

        execution = TaskRun.objects.get(task_name="essai_ko")
        assert execution.status == TaskRun.Status.ERROR
        assert "panne simulee" in execution.error
        assert "ValueError" in execution.traceback_text

    def test_execution_concurrente_ignoree(self):
        @payments_task("essai_verrou")
        def tache():
            return {"fait": True}

        verrou = DistributedLock("essai_verrou")
        verrou.acquire()
        try:
            resultat = tache()
            assert resultat["skipped"] is True
            execution = TaskRun.objects.filter(
                task_name="essai_verrou"
            ).order_by("-started_at").first()
            assert execution.status == TaskRun.Status.SKIPPED
        finally:
            verrou.release()

    def test_journal_non_supprimable(self):
        @payments_task("essai_suppr")
        def tache():
            return {}
        tache()
        with pytest.raises(ValidationError):
            TaskRun.objects.get(task_name="essai_suppr").delete()

    def test_run_task_n_explose_pas(self):
        """
        L'echec d'une tache ne doit JAMAIS interrompre les suivantes : une
        erreur sur les lots de reglement ne doit pas empecher la detection
        des paiements bloques.
        """
        @payments_task("essai_isole")
        def tache():
            raise RuntimeError("boum")

        resultat = run_task("essai_isole")
        assert "error" in resultat
        assert "boum" in resultat["error"]

    def test_tache_inconnue(self):
        with pytest.raises(KeyError):
            run_task("tache_qui_n_existe_pas")


# ═══════════════════════════════════════════════════════════════════════════
# SANTE
# ═══════════════════════════════════════════════════════════════════════════

class TestSante:

    def test_tache_jamais_executee_est_signalee(self):
        sante = {s["task_name"]: s for s in TaskRun.health()}
        assert sante["escrow_release"]["stale"] is True
        assert sante["escrow_release"]["alert"] is True   # critique

    def test_tache_recente_est_a_jour(self):
        from apps.payments.tasks.jobs import expire_stale_intents
        expire_stale_intents()
        sante = {s["task_name"]: s for s in TaskRun.health()}
        assert sante["expire_stale_intents"]["stale"] is False

    def test_une_tache_ancienne_redevient_en_retard(self):
        from apps.payments.tasks.jobs import expire_stale_intents
        expire_stale_intents()
        TaskRun.objects.filter(task_name="expire_stale_intents").update(
            started_at=timezone.now() - timedelta(hours=5),
        )
        sante = {s["task_name"]: s for s in TaskRun.health(max_age_minutes=60)}
        assert sante["expire_stale_intents"]["stale"] is True

    def test_seules_les_critiques_alertent(self):
        sante = {s["task_name"]: s for s in TaskRun.health()}
        assert sante["poll_pending_payments"]["critical"] is True
        assert sante["refresh_task_health"]["critical"] is False
        assert sante["refresh_task_health"]["alert"] is False


# ═══════════════════════════════════════════════════════════════════════════
# TACHES REELLES
# ═══════════════════════════════════════════════════════════════════════════

class TestTachesReelles:

    def test_le_polling_detecte_un_paiement_bloque(self, configuration):
        """
        CamPay ne notifie QUE sur SUCCESSFUL ou FAILED. Une transaction
        restee en PENDING ne genere aucun webhook : le polling est le SEUL
        moyen de la detecter.
        """
        from apps.payments.tasks.jobs import poll_pending_payments

        acheteur = User.objects.create_user("a", "a@b.cm", "x")
        vendeur = create_payee(
            payee_type=PayeeType.VENDOR, display_label="V",
            momo_operator=MomoOperator.MTN, momo_number=NUMERO,
        )
        intent = create_payment_intent(
            buyer=acheteur, idempotency_key="t1",
            components=[ComponentInput(EconomicComponent.GOODS, Money(10000),
                                       order_id=1, commission_rate=Decimal("15"))],
            payee_codes={DomainPayeeType.VENDOR: vendeur.payee_code},
            payee_types={vendeur.payee_code: DomainPayeeType.VENDOR},
            payer_msisdn=NUMERO, payer_operator="MTN",
        )
        initiate_collect(intent)

        poll_pending_payments()                 # 1re passe : encore en attente
        resultat = poll_pending_payments()      # 2e passe : confirme

        assert resultat["succeeded"] == 1
        assert EscrowHold.objects.filter(intent=intent).count() == 1

    def test_auto_confirmation_puis_liberation(self, configuration):
        from apps.payments.application.collect import poll_attempt
        from apps.payments.escrow.services import (
            auto_confirm_due_holds, release_due_holds,
        )

        acheteur = User.objects.create_user("a2", "a2@b.cm", "x")
        vendeur = create_payee(
            payee_type=PayeeType.VENDOR, display_label="V2",
            momo_operator=MomoOperator.MTN, momo_number=NUMERO,
        )
        intent = create_payment_intent(
            buyer=acheteur, idempotency_key="t2",
            components=[ComponentInput(EconomicComponent.GOODS, Money(10000),
                                       order_id=2, commission_rate=Decimal("15"))],
            payee_codes={DomainPayeeType.VENDOR: vendeur.payee_code},
            payee_types={vendeur.payee_code: DomainPayeeType.VENDOR},
            payer_msisdn=NUMERO, payer_operator="MTN",
        )
        issue = initiate_collect(intent)
        poll_attempt(issue.attempt)
        poll_attempt(issue.attempt)

        auto_confirm_due_holds(now=timezone.now() + timedelta(hours=49))
        release_due_holds(now=timezone.now() + timedelta(hours=74))

        hold = EscrowHold.objects.get(intent=intent)
        assert hold.status == EscrowHold.Status.RELEASED

    def test_verification_d_integrite(self):
        from apps.payments.tasks.jobs import verify_ledger_integrity
        resultat = verify_ledger_integrity()
        assert resultat["ok"] is True
        assert resultat["must_freeze_payouts"] is False

    def test_purge_epargne_les_pieces_conservees(self):
        """
        RETENTION TECHNIQUE et CONSERVATION LEGALE sont deux regimes
        distincts. La purge ne doit JAMAIS toucher au registre ni aux
        pieces d'audit.
        """
        from apps.payments.ledger.models import LedgerTransaction
        from apps.payments.ledger.posting import credit, debit, post
        from apps.payments.tasks.jobs import purge_technical_retention

        post(
            kind=LedgerTransaction.Kind.COLLECT,
            lines=[debit(coa.PSP_AVAILABLE, 1000), credit(coa.ESCROW_LIABILITY, 1000)],
            description="Ecriture a conserver",
        )
        avant = LedgerTransaction.objects.count()

        purge_technical_retention(replay_days=0, body_days=0)

        assert LedgerTransaction.objects.count() == avant


# ═══════════════════════════════════════════════════════════════════════════
# CATALOGUE
# ═══════════════════════════════════════════════════════════════════════════

class TestCatalogue:

    def test_toutes_les_taches_planifiees_existent(self):
        for entree in SCHEDULE:
            assert entree["task"] in REGISTRY, entree["task"]

    def test_tous_les_groupes_sont_declares(self):
        for entree in SCHEDULE:
            assert entree["group"] in GROUPS, entree["group"]

    def test_les_taches_critiques_sont_identifiees(self):
        critiques = {t["name"] for t in list_tasks() if t["critical"]}
        # Sans elles : paiements invisibles, vendeurs jamais payes
        assert "poll_pending_payments" in critiques
        assert "escrow_auto_confirm" in critiques
        assert "escrow_release" in critiques
        assert "verify_ledger_integrity" in critiques

    def test_toutes_les_taches_planifiees_sont_decrites(self):
        """
        On ne verifie que les taches REELLEMENT planifiees : les taches
        d'essai declarees dans les autres tests polluent le registre global.
        """
        planifiees = {e["task"] for e in SCHEDULE}
        for tache in list_tasks():
            if tache["name"] not in planifiees:
                continue
            assert tache["description"], tache["name"]