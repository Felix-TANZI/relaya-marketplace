# backend/apps/payments/tests/intents/test_collect.py
# Tests du parcours d'encaissement de bout en bout.
#
#   docker exec -it relaya_backend pytest apps/payments/tests/intents/ -q
#
# C'est le premier jeu de tests ou les quatre briques travaillent ensemble :
# configuration, domaine, beneficiaires et registre comptable.

from decimal import Decimal

import pytest
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.utils import timezone

from apps.payments.application.collect import (
    CollectError,
    cancel_intent,
    confirm_payment,
    create_payment_intent,
    expire_stale_intents,
    initiate_collect,
    poll_attempt,
    poll_pending_attempts,
)
from apps.payments.config.models import (
    DistributionRule,
    EscrowPolicy,
    FeeRule,
    ProviderConfig,
)
from apps.payments.domain.distribution import ComponentInput
from apps.payments.domain.enums import EconomicComponent, PayeeType as DomainPayeeType
from apps.payments.domain.exceptions import IllegalTransition
from apps.payments.domain.money import Money
from apps.payments.infrastructure.providers.mock import reset_mock_state
from apps.payments.intents.models import PaymentAttempt, PaymentIntent
from apps.payments.ledger import chart_of_accounts as coa
from apps.payments.ledger.balances import (
    balance,
    revenue_summary,
    third_party_liabilities,
    trial_balance_total,
)
from apps.payments.ledger.invariants import run_all
from apps.payments.ledger.models import LedgerAccount, LedgerTransaction
from apps.payments.payees.models import MomoOperator, PayeeType
from apps.payments.payees.services import create_payee

pytestmark = pytest.mark.django_db

# Numeros deterministes du prestataire factice
OK_NUMBER = "237677123456"       # succes apres 2 interrogations
FAIL_BALANCE = "237677123450"    # ER301 solde insuffisant
FAIL_NUMBER = "237677123451"     # ER101 numero invalide
STAYS_PENDING = "237677123458"   # reste en attente indefiniment
TIMEOUT_NUMBER = "237677123459"  # incident technique


@pytest.fixture(autouse=True)
def _reset_mock():
    reset_mock_state()
    yield
    reset_mock_state()


@pytest.fixture(autouse=True)
def plan_comptable():
    for entree in coa.CHART:
        LedgerAccount.objects.get_or_create(code=entree["code"], defaults=entree)


@pytest.fixture(autouse=True)
def configuration():
    """Configuration minimale : prestataire factice, frais 2 %, repartition."""
    ProviderConfig.objects.create(
        config_key="provider-mock", provider_code="MOCK",
        mode=ProviderConfig.Mode.SANDBOX, is_enabled=True,
        is_payout_enabled=True, priority=10,
        supported_operators=["MTN", "ORANGE"],
        min_amount_xaf=100, max_amount_xaf=1_000_000,
    )
    FeeRule.objects.create(
        config_key="fee-psp-collect", name="Frais PSP encaissement",
        scope=FeeRule.Scope.COLLECT, basis=FeeRule.Basis.PERCENT,
        value=Decimal("2.0000"), bearer=FeeRule.Bearer.PLATFORM, priority=10,
    )
    DistributionRule.objects.create(
        config_key="dist-goods-vendor", name="Marchandise au vendeur",
        component=DistributionRule.Component.GOODS,
        payee_type=DistributionRule.PayeeType.VENDOR,
        basis=DistributionRule.Basis.REMAINDER, priority=10,
    )
    DistributionRule.objects.create(
        config_key="dist-transport-carrier", name="Transport au transporteur",
        component=DistributionRule.Component.TRANSPORT,
        payee_type=DistributionRule.PayeeType.DELIVERY_COMPANY,
        basis=DistributionRule.Basis.PERCENT_OF_COMPONENT,
        value=Decimal("70"), priority=20,
    )
    DistributionRule.objects.create(
        config_key="dist-transport-platform", name="Part plateforme transport",
        component=DistributionRule.Component.TRANSPORT,
        payee_type=DistributionRule.PayeeType.PLATFORM,
        basis=DistributionRule.Basis.REMAINDER, priority=10,
    )
    EscrowPolicy.objects.create(
        config_key="escrow-default", name="Defaut", priority=0,
    )


@pytest.fixture
def acheteur():
    return User.objects.create_user("acheteur", "a@belivay.cm", "x")


@pytest.fixture
def beneficiaires():
    vendeur = create_payee(
        payee_type=PayeeType.VENDOR, display_label="Boutique A",
        momo_operator=MomoOperator.MTN, momo_number=OK_NUMBER,
    )
    transporteur = create_payee(
        payee_type=PayeeType.DELIVERY_COMPANY, display_label="Express Douala",
        momo_operator=MomoOperator.MTN, momo_number="237699000111",
    )
    return {
        "codes": {
            DomainPayeeType.VENDOR: vendeur.payee_code,
            DomainPayeeType.DELIVERY_COMPANY: transporteur.payee_code,
        },
        "types": {
            vendeur.payee_code: DomainPayeeType.VENDOR,
            transporteur.payee_code: DomainPayeeType.DELIVERY_COMPANY,
        },
        "vendeur": vendeur,
        "transporteur": transporteur,
    }


def panier_standard():
    """Panier du referentiel : 45 000 marchandise + 5 000 transport."""
    return [
        ComponentInput(EconomicComponent.GOODS, Money(45000),
                       order_id=1, commission_rate=Decimal("15")),
        ComponentInput(EconomicComponent.TRANSPORT, Money(5000)),
    ]


def creer_intention(acheteur, beneficiaires, *, msisdn=OK_NUMBER,
                    cle="cart-001", composants=None):
    return create_payment_intent(
        buyer=acheteur,
        idempotency_key=cle,
        components=composants or panier_standard(),
        payee_codes=beneficiaires["codes"],
        payee_types=beneficiaires["types"],
        payer_msisdn=msisdn,
        payer_operator="MTN",
    )


# ═══════════════════════════════════════════════════════════════════════════
# CREATION DE L'INTENTION
# ═══════════════════════════════════════════════════════════════════════════

class TestCreateIntent:

    def test_intention_creee_avec_plan_fige(self, acheteur, beneficiaires):
        intent = creer_intention(acheteur, beneficiaires)

        assert intent.amount_xaf == 50000
        assert intent.status == PaymentIntent.Status.DRAFT
        assert intent.reference.startswith("BLV-PAY-")

        plan = intent.distribution_plan
        assert plan["total_distributed"] == 50000
        assert plan["platform_revenue"] == 8250      # 6750 commission + 1500 transport
        assert len(plan["holds"]) == 2

        vendeur = [h for h in plan["holds"] if h["component"] == "GOODS"][0]
        assert vendeur["gross"] == 45000
        assert vendeur["commission"] == 6750
        assert vendeur["net"] == 38250

    def test_idempotence_a_la_creation(self, acheteur, beneficiaires):
        """Un double clic ne cree jamais deux intentions."""
        a = creer_intention(acheteur, beneficiaires, cle="cart-xyz")
        b = creer_intention(acheteur, beneficiaires, cle="cart-xyz")
        assert a.pk == b.pk
        assert PaymentIntent.objects.count() == 1

    def test_cle_idempotence_obligatoire(self, acheteur, beneficiaires):
        with pytest.raises(CollectError):
            creer_intention(acheteur, beneficiaires, cle="   ")

    def test_numero_payeur_chiffre(self, acheteur, beneficiaires):
        intent = creer_intention(acheteur, beneficiaires)
        intent.refresh_from_db()
        assert intent.payer_msisdn_masked == "237·····456"
        assert OK_NUMBER.encode() not in bytes(intent.payer_msisdn_enc)
        assert intent.payer_msisdn == OK_NUMBER

    def test_frais_figes_a_la_creation(self, acheteur, beneficiaires):
        intent = creer_intention(acheteur, beneficiaires)
        frais = intent.config_snapshot["collect_fee"]
        assert frais["amount_xaf"] == 1000       # 2 % de 50 000
        assert frais["bearer"] == "PLATFORM"

    def test_modifier_la_regle_apres_coup_ne_change_rien(self, acheteur, beneficiaires):
        """
        Principe P3 : une intention en cours est immunisee contre une
        modification de configuration.
        """
        intent = creer_intention(acheteur, beneficiaires)
        avant = dict(intent.distribution_plan)

        FeeRule.objects.filter(config_key="fee-psp-collect").update(is_active=False)
        FeeRule.objects.create(
            config_key="fee-psp-collect", version=2, name="Nouveau taux",
            scope=FeeRule.Scope.COLLECT, basis=FeeRule.Basis.PERCENT,
            value=Decimal("10"), bearer=FeeRule.Bearer.PLATFORM, priority=10,
        )

        intent.refresh_from_db()
        assert intent.distribution_plan == avant
        assert intent.config_snapshot["collect_fee"]["amount_xaf"] == 1000

    def test_intention_non_supprimable(self, acheteur, beneficiaires):
        intent = creer_intention(acheteur, beneficiaires)
        with pytest.raises(ValidationError):
            intent.delete()


# ═══════════════════════════════════════════════════════════════════════════
# DEMANDE D'ENCAISSEMENT
# ═══════════════════════════════════════════════════════════════════════════

class TestInitiateCollect:

    def test_demande_acceptee(self, acheteur, beneficiaires):
        intent = creer_intention(acheteur, beneficiaires)
        issue = initiate_collect(intent)

        assert issue.status == "PENDING"
        assert issue.requires_action is True
        assert issue.attempt.status == PaymentAttempt.Status.PENDING
        assert issue.attempt.provider_reference
        issue.intent.refresh_from_db()
        assert issue.intent.status == PaymentIntent.Status.PROCESSING

    def test_pas_de_seconde_tentative_en_parallele(self, acheteur, beneficiaires):
        """Un double clic ne declenche pas deux demandes de paiement."""
        intent = creer_intention(acheteur, beneficiaires)
        a = initiate_collect(intent)
        b = initiate_collect(intent)

        assert b.status == "ATTEMPT_IN_PROGRESS"
        assert b.attempt.pk == a.attempt.pk
        assert PaymentAttempt.objects.filter(intent=intent).count() == 1

    def test_solde_insuffisant(self, acheteur, beneficiaires):
        intent = creer_intention(acheteur, beneficiaires, msisdn=FAIL_BALANCE)
        issue = initiate_collect(intent)

        assert issue.status == "FAILED"
        assert issue.attempt.error_code == "ER301"
        # L'intention reste ouverte : l'acheteur peut retenter
        issue.intent.refresh_from_db()
        assert issue.intent.status == PaymentIntent.Status.REQUIRES_ACTION

    def test_numero_invalide(self, acheteur, beneficiaires):
        intent = creer_intention(acheteur, beneficiaires, msisdn=FAIL_NUMBER)
        issue = initiate_collect(intent)
        assert issue.attempt.error_code == "ER101"

    def test_incident_technique_laisse_la_tentative_ouverte(self, acheteur, beneficiaires):
        """
        CAS CRITIQUE : sur un timeout, on NE SAIT PAS si l'argent est parti.
        Conclure a l'echec risquerait un double debit au reessai.
        """
        intent = creer_intention(acheteur, beneficiaires, msisdn=TIMEOUT_NUMBER)
        issue = initiate_collect(intent)

        assert issue.status == "UNKNOWN"
        assert issue.attempt.status == PaymentAttempt.Status.PENDING
        assert issue.attempt.status != PaymentAttempt.Status.FAILED

    def test_seconde_tentative_apres_echec(self, acheteur, beneficiaires):
        intent = creer_intention(acheteur, beneficiaires, msisdn=FAIL_BALANCE)
        initiate_collect(intent)

        intent.refresh_from_db()
        intent.set_payer(OK_NUMBER, "MTN")
        intent.save()

        issue = initiate_collect(intent)
        assert issue.status == "PENDING"
        assert PaymentAttempt.objects.filter(intent=intent).count() == 2

    def test_montant_hors_bornes_refuse(self, acheteur, beneficiaires):
        ProviderConfig.objects.filter(config_key="provider-mock").update(
            max_amount_xaf=10000,
        )
        intent = creer_intention(acheteur, beneficiaires)
        with pytest.raises(CollectError, match="superieur au maximum"):
            initiate_collect(intent)


# ═══════════════════════════════════════════════════════════════════════════
# CONFIRMATION ET ECRITURES
# ═══════════════════════════════════════════════════════════════════════════

class TestConfirmPayment:

    def _encaisser(self, acheteur, beneficiaires, **kw):
        intent = creer_intention(acheteur, beneficiaires, **kw)
        issue = initiate_collect(intent)
        poll_attempt(issue.attempt)      # 1er appel : toujours PENDING
        return poll_attempt(issue.attempt)  # 2e appel : SUCCESSFUL

    def test_parcours_complet(self, acheteur, beneficiaires):
        issue = self._encaisser(acheteur, beneficiaires)

        assert issue.status == "SUCCEEDED"
        issue.intent.refresh_from_db()
        assert issue.intent.status == PaymentIntent.Status.SUCCEEDED
        assert issue.intent.amount_captured_xaf == 50000
        assert issue.intent.confirmed_at is not None

    def test_ecritures_conformes_au_referentiel(self, acheteur, beneficiaires):
        self._encaisser(acheteur, beneficiaires)

        # 50 000 encaisses, 1 000 de frais PSP portes par la plateforme
        assert balance(coa.PSP_AVAILABLE) == 49000
        assert balance(coa.EXPENSE_PSP_COLLECT) == 1000
        # Sequestre = somme des nets dus aux tiers (38 250 + 3 500)
        assert balance(coa.ESCROW_LIABILITY) == 41750
        # Chiffre d'affaires = commission 6 750 + part transport 1 500
        assert balance(coa.REVENUE_COMMISSION) == 8250
        assert trial_balance_total() == 0

    def test_le_sequestre_n_est_pas_un_produit(self, acheteur, beneficiaires):
        """Principe P8 — les montants dus aux tiers ne sont jamais du revenu."""
        self._encaisser(acheteur, beneficiaires)
        assert revenue_summary()["revenue_total"] == 8250
        assert third_party_liabilities()["total"] == 41750

    def test_tous_les_invariants_respectes(self, acheteur, beneficiaires):
        self._encaisser(acheteur, beneficiaires)
        rapport = run_all()
        assert rapport["ok"], [(r.code, r.detail) for r in rapport["violations"]]

    def test_confirmation_idempotente(self, acheteur, beneficiaires):
        """
        LE test central : webhook et polling confirment le MEME paiement.
        Cela arrivera en production. Une seule ecriture doit en resulter.
        """
        issue = self._encaisser(acheteur, beneficiaires)
        ecritures_avant = LedgerTransaction.objects.count()
        solde_avant = balance(coa.ESCROW_LIABILITY)

        seconde = confirm_payment(issue.attempt)
        troisieme = poll_attempt(issue.attempt)

        assert seconde.status == "ALREADY_SUCCEEDED"
        assert troisieme.status == "ALREADY_SUCCEEDED"
        assert LedgerTransaction.objects.count() == ecritures_avant
        assert balance(coa.ESCROW_LIABILITY) == solde_avant

    def test_ecriture_rattachee_a_l_intention(self, acheteur, beneficiaires):
        issue = self._encaisser(acheteur, beneficiaires)
        tx = LedgerTransaction.objects.get(
            source_type="PaymentIntent", source_ref=issue.intent.reference,
        )
        assert tx.kind == LedgerTransaction.Kind.COLLECT
        assert tx.correlation_id == issue.intent.correlation_id
        assert tx.is_balanced

    def test_paiement_reste_en_attente(self, acheteur, beneficiaires):
        intent = creer_intention(acheteur, beneficiaires, msisdn=STAYS_PENDING)
        issue = initiate_collect(intent)
        for _ in range(5):
            issue = poll_attempt(issue.attempt)

        assert issue.status == "PENDING"
        assert LedgerTransaction.objects.count() == 0
        issue.intent.refresh_from_db()
        assert issue.intent.status == PaymentIntent.Status.PROCESSING

    def test_transition_illegale_refusee(self, acheteur, beneficiaires):
        issue = self._encaisser(acheteur, beneficiaires)
        issue.intent.refresh_from_db()
        with pytest.raises(IllegalTransition):
            issue.intent.transition_to(PaymentIntent.Status.FAILED)


# ═══════════════════════════════════════════════════════════════════════════
# CYCLE DE VIE
# ═══════════════════════════════════════════════════════════════════════════

class TestLifecycle:

    def test_annulation(self, acheteur, beneficiaires):
        intent = creer_intention(acheteur, beneficiaires)
        issue = cancel_intent(intent, reason="Abandon panier.")
        assert issue.intent.status == PaymentIntent.Status.CANCELLED

    def test_intention_encaissee_non_annulable(self, acheteur, beneficiaires):
        intent = creer_intention(acheteur, beneficiaires)
        issue = initiate_collect(intent)
        poll_attempt(issue.attempt)
        poll_attempt(issue.attempt)

        intent.refresh_from_db()
        with pytest.raises(CollectError, match="rembourse"):
            cancel_intent(intent)

    def test_expiration(self, acheteur, beneficiaires):
        intent = creer_intention(acheteur, beneficiaires)
        PaymentIntent.objects.filter(pk=intent.pk).update(
            expires_at=timezone.now() - timezone.timedelta(minutes=1)
        )
        assert expire_stale_intents() == 1
        intent.refresh_from_db()
        assert intent.status == PaymentIntent.Status.EXPIRED

    def test_intention_encaissee_n_expire_pas(self, acheteur, beneficiaires):
        intent = creer_intention(acheteur, beneficiaires)
        issue = initiate_collect(intent)
        poll_attempt(issue.attempt)
        poll_attempt(issue.attempt)

        PaymentIntent.objects.filter(pk=intent.pk).update(
            expires_at=timezone.now() - timezone.timedelta(minutes=1)
        )
        expire_stale_intents()
        intent.refresh_from_db()
        assert intent.status == PaymentIntent.Status.SUCCEEDED

    def test_encaissement_impossible_apres_expiration(self, acheteur, beneficiaires):
        intent = creer_intention(acheteur, beneficiaires)
        PaymentIntent.objects.filter(pk=intent.pk).update(
            expires_at=timezone.now() - timezone.timedelta(minutes=1)
        )
        intent.refresh_from_db()
        issue = initiate_collect(intent)
        assert issue.status == "EXPIRED"


# ═══════════════════════════════════════════════════════════════════════════
# FILET DE SECURITE DU WEBHOOK
# ═══════════════════════════════════════════════════════════════════════════

class TestPollingSafetyNet:

    def test_le_polling_rattrape_un_webhook_manquant(self, acheteur, beneficiaires):
        """
        Si le webhook ne vient jamais — panne, mauvaise configuration,
        incident prestataire — le paiement est quand meme detecte.
        """
        intent = creer_intention(acheteur, beneficiaires)
        initiate_collect(intent)

        poll_pending_attempts()             # 1re passe : encore en attente
        resultats = poll_pending_attempts()  # 2e passe : confirme

        assert resultats["succeeded"] == 1
        intent.refresh_from_db()
        assert intent.status == PaymentIntent.Status.SUCCEEDED
        assert balance(coa.ESCROW_LIABILITY) == 41750

    def test_plusieurs_intentions_en_parallele(self, acheteur, beneficiaires):
        for i in range(3):
            intent = creer_intention(acheteur, beneficiaires, cle=f"cart-{i}")
            initiate_collect(intent)

        poll_pending_attempts()
        resultats = poll_pending_attempts()

        assert resultats["succeeded"] == 3
        assert balance(coa.ESCROW_LIABILITY) == 41750 * 3
        assert trial_balance_total() == 0
        assert run_all()["ok"]


# ═══════════════════════════════════════════════════════════════════════════
# ACHETEUR != PAYEUR
# ═══════════════════════════════════════════════════════════════════════════

class TestThirdPartyPayer:

    def test_payeur_tiers_detecte(self, acheteur, beneficiaires):
        """
        Detecte pour ADAPTER les seuils anti-fraude, jamais pour bloquer :
        le segment diaspora est le principal moteur de marge.
        """
        intent = creer_intention(acheteur, beneficiaires, msisdn="237655000111")
        assert intent.payer_relationship == PaymentIntent.Relationship.THIRD_PARTY

    def test_payeur_reconnu_apres_un_premier_paiement(self, acheteur, beneficiaires):
        premiere = creer_intention(acheteur, beneficiaires, cle="c1")
        issue = initiate_collect(premiere)
        poll_attempt(issue.attempt)
        poll_attempt(issue.attempt)

        seconde = creer_intention(acheteur, beneficiaires, cle="c2")
        assert seconde.payer_relationship == PaymentIntent.Relationship.SELF

    def test_remboursement_vers_la_source_par_defaut(self, acheteur, beneficiaires):
        intent = creer_intention(acheteur, beneficiaires, msisdn="237655000111")
        assert intent.refund_target == PaymentIntent.RefundTarget.ORIGINAL_SOURCE