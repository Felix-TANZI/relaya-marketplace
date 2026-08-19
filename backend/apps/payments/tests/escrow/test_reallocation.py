# backend/apps/payments/tests/escrow/test_reallocation.py
# Reallocation de la part transport a l'assignation du transporteur.
#
#   docker exec -it relaya_backend pytest apps/payments/tests/escrow/ -q
#
# ─────────────────────────────────────────────────────────────────────────────
# CE FICHIER COMPLETE LE CORRECTIF DE REPARTITION
#
# Ecarter la regle transporteur au checkout debloquait le paiement, mais
# laissait 3 500 FCFA comptabilises en PRODUIT alors qu'ils appartiennent a
# un transporteur pas encore designe.
#
# Le chiffre d'affaires etait donc surestime et la dette envers le
# transporteur absente. Ces tests verifient que l'assignation remet les
# choses en place.
# ─────────────────────────────────────────────────────────────────────────────

from decimal import Decimal

import pytest
from django.contrib.auth.models import User
from django.utils import timezone

from apps.payments.application.collect import (
    create_payment_intent, initiate_collect, poll_attempt,
)
from apps.payments.bridge import events_in
from apps.payments.bridge.actors import payee_for_delivery_company
from apps.payments.config.models import (
    DistributionRule, EscrowPolicy, FeeRule, ProviderConfig,
)
from apps.payments.domain.distribution import ComponentInput
from apps.payments.domain.enums import EconomicComponent, PayeeType as DomainPayeeType
from apps.payments.domain.money import Money
from apps.payments.escrow.models import EscrowEvent, EscrowHold
from apps.payments.escrow.services import reallocate_unresolved
from apps.payments.infrastructure.providers.mock import reset_mock_state
from apps.payments.ledger import chart_of_accounts as coa
from apps.payments.ledger.balances import balance, revenue_summary, trial_balance_total
from apps.payments.ledger.invariants import check_escrow_equation, run_all
from apps.payments.ledger.models import LedgerAccount
from apps.payments.payees.models import MomoOperator, PayeeType
from apps.payments.payees.services import create_payee

pytestmark = pytest.mark.django_db

NUMERO = "237677123456"


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
    """Configuration REELLE : la regle transporteur 70 % existe."""
    ProviderConfig.objects.create(
        config_key="provider-mock", provider_code="MOCK",
        mode=ProviderConfig.Mode.SANDBOX, is_enabled=True, priority=10,
        supported_operators=["MTN", "ORANGE"],
        min_amount_xaf=100, max_amount_xaf=10_000_000)
    FeeRule.objects.create(
        config_key="fee-collect", name="Frais", scope=FeeRule.Scope.COLLECT,
        basis=FeeRule.Basis.PERCENT, value=Decimal("2"),
        bearer=FeeRule.Bearer.PLATFORM, priority=10)
    DistributionRule.objects.create(
        config_key="dist-goods", name="Marchandise",
        component=DistributionRule.Component.GOODS,
        payee_type=DistributionRule.PayeeType.VENDOR,
        basis=DistributionRule.Basis.REMAINDER, priority=10)
    DistributionRule.objects.create(
        config_key="dist-transport-carrier",
        name="Transport a l'entreprise de livraison",
        component=DistributionRule.Component.TRANSPORT,
        payee_type=DistributionRule.PayeeType.DELIVERY_COMPANY,
        basis=DistributionRule.Basis.PERCENT_OF_COMPONENT,
        value=Decimal("70"), priority=20)
    DistributionRule.objects.create(
        config_key="dist-transport-platform", name="Part plateforme",
        component=DistributionRule.Component.TRANSPORT,
        payee_type=DistributionRule.PayeeType.PLATFORM,
        basis=DistributionRule.Basis.REMAINDER, priority=10)
    EscrowPolicy.objects.create(config_key="escrow-default", name="Defaut",
                                auto_confirm_hours=48, release_delay_hours=24)


@pytest.fixture
def acheteur():
    return User.objects.create_user("acheteur", "a@b.cm", "x")


@pytest.fixture
def vendeur():
    return create_payee(
        payee_type=PayeeType.VENDOR, display_label="Boutique",
        momo_operator=MomoOperator.MTN, momo_number=NUMERO)


@pytest.fixture
def organisation():
    """
    DeliveryOrganizationProfile exige un `user` (OneToOne) et un `phone`.
    Le construire sans eux echoue en base — c'est ce qui s'est produit.
    """
    from apps.accounts.models import DeliveryOrganizationProfile

    gestionnaire = User.objects.create_user(
        "gestionnaire-express", "g@b.cm", "x")
    return DeliveryOrganizationProfile.objects.create(
        user=gestionnaire, company_name="Express Douala",
        phone="237699000111", city="Douala")


def encaisser(acheteur, vendeur, cle="c1"):
    """Panier 45 000 marchandise + 5 000 transport, SANS transporteur."""
    intent = create_payment_intent(
        buyer=acheteur, idempotency_key=cle,
        components=[
            ComponentInput(EconomicComponent.GOODS, Money(45000), order_id=1,
                           commission_rate=Decimal("15")),
            ComponentInput(EconomicComponent.TRANSPORT, Money(5000)),
        ],
        payee_codes={DomainPayeeType.VENDOR: vendeur.payee_code},
        payee_types={vendeur.payee_code: DomainPayeeType.VENDOR},
        payer_msisdn=NUMERO, payer_operator="MTN")
    issue = initiate_collect(intent)
    poll_attempt(issue.attempt)
    poll_attempt(issue.attempt)
    intent.refresh_from_db()
    return intent


# ═══════════════════════════════════════════════════════════════════════════
# L'ETAT AVANT REALLOCATION
# ═══════════════════════════════════════════════════════════════════════════

class TestAvantReallocation:

    def test_le_produit_est_provisoirement_surestime(self, acheteur, vendeur):
        """
        LE constat qui justifie ce lot.

        Sans transporteur, les 3 500 FCFA qui lui reviendraient sont
        comptabilises en PRODUIT. Le chiffre d'affaires est surestime.
        """
        intent = encaisser(acheteur, vendeur)
        # 6 750 commission + 5 000 transport entier
        assert revenue_summary()["revenue_total"] == 11750
        assert intent.distribution_plan["needs_reallocation"] is True

    def test_le_montant_a_reallouer_est_fige(self, acheteur, vendeur):
        """
        Principe P3 : modifier la regle demain ne doit pas changer ce qui
        est du sur une transaction deja encaissee.
        """
        intent = encaisser(acheteur, vendeur)
        ecarte = intent.distribution_plan["unresolved_rules"][0]
        assert ecarte["amount_xaf"] == 3500      # 70 % de 5 000
        assert ecarte["payee_type"] == "DELIVERY_COMPANY"

        DistributionRule.objects.filter(
            config_key="dist-transport-carrier").update(is_active=False)
        intent.refresh_from_db()
        assert intent.distribution_plan["unresolved_rules"][0]["amount_xaf"] == 3500


# ═══════════════════════════════════════════════════════════════════════════
# LA REALLOCATION
# ═══════════════════════════════════════════════════════════════════════════

class TestReallocation:

    def test_le_produit_est_repris_et_devient_une_dette(
        self, acheteur, vendeur, organisation,
    ):
        """
        LE test central : le revenu n'etait pas acquis, il redevient une
        dette envers le transporteur.
        """
        intent = encaisser(acheteur, vendeur)
        produit_avant = revenue_summary()["revenue_total"]
        sequestre_avant = balance(coa.ESCROW_LIABILITY)

        compte = payee_for_delivery_company(organisation, create=True)
        hold = reallocate_unresolved(intent, payee=compte)

        assert hold is not None
        assert hold.net_amount_xaf == 3500
        assert revenue_summary()["revenue_total"] == produit_avant - 3500
        assert balance(coa.ESCROW_LIABILITY) == sequestre_avant + 3500

    def test_la_comptabilite_reste_equilibree(
        self, acheteur, vendeur, organisation,
    ):
        intent = encaisser(acheteur, vendeur)
        compte = payee_for_delivery_company(organisation, create=True)
        reallocate_unresolved(intent, payee=compte)

        assert trial_balance_total() == 0
        assert check_escrow_equation().status == "OK"

    def test_le_sequestre_est_liberable_sur_preuve(
        self, acheteur, vendeur, organisation,
    ):
        """Le transport se libere sur PREUVE DE LIVRAISON, pas autrement."""
        intent = encaisser(acheteur, vendeur)
        compte = payee_for_delivery_company(organisation, create=True)
        hold = reallocate_unresolved(intent, payee=compte)

        assert hold.status == EscrowHold.Status.HELD
        assert hold.component == EscrowHold.Component.TRANSPORT
        assert hold.order_id is None        # niveau paiement
        assert hold.release_trigger == EscrowHold.Trigger.DELIVERY_PROOF_VALIDATED

    def test_le_plan_garde_la_trace(self, acheteur, vendeur, organisation):
        intent = encaisser(acheteur, vendeur)
        compte = payee_for_delivery_company(organisation, create=True)
        reallocate_unresolved(intent, payee=compte)

        intent.refresh_from_db()
        plan = intent.distribution_plan
        assert plan["needs_reallocation"] is False
        assert plan["unresolved_rules"] == []
        assert plan["reallocations"][0]["amount_xaf"] == 3500
        assert plan["reallocations"][0]["payee_code"] == compte.payee_code

    def test_reallocation_idempotente(self, acheteur, vendeur, organisation):
        from apps.payments.ledger.models import LedgerTransaction

        intent = encaisser(acheteur, vendeur)
        compte = payee_for_delivery_company(organisation, create=True)

        premier = reallocate_unresolved(intent, payee=compte)
        ecritures = LedgerTransaction.objects.count()
        second = reallocate_unresolved(intent, payee=compte)

        assert second.pk == premier.pk
        assert LedgerTransaction.objects.count() == ecritures
        assert EscrowHold.objects.filter(
            intent=intent, component="TRANSPORT").count() == 1

    def test_sans_part_a_reallouer_rien_ne_se_passe(
        self, acheteur, vendeur, organisation,
    ):
        """Le transporteur etait connu au checkout : rien a reallouer."""
        transporteur = create_payee(
            payee_type=PayeeType.DELIVERY_COMPANY, display_label="Express",
            momo_operator=MomoOperator.MTN, momo_number="237699000111")
        intent = create_payment_intent(
            buyer=acheteur, idempotency_key="connu",
            components=[
                ComponentInput(EconomicComponent.GOODS, Money(45000),
                               order_id=2, commission_rate=Decimal("15")),
                ComponentInput(EconomicComponent.TRANSPORT, Money(5000)),
            ],
            payee_codes={
                DomainPayeeType.VENDOR: vendeur.payee_code,
                DomainPayeeType.DELIVERY_COMPANY: transporteur.payee_code,
            },
            payee_types={
                vendeur.payee_code: DomainPayeeType.VENDOR,
                transporteur.payee_code: DomainPayeeType.DELIVERY_COMPANY,
            },
            payer_msisdn=NUMERO, payer_operator="MTN")
        issue = initiate_collect(intent)
        poll_attempt(issue.attempt)
        poll_attempt(issue.attempt)
        intent.refresh_from_db()

        assert intent.distribution_plan["needs_reallocation"] is False
        compte = payee_for_delivery_company(organisation, create=True)
        assert reallocate_unresolved(intent, payee=compte) is None


# ═══════════════════════════════════════════════════════════════════════════
# L'EVENEMENT METIER
# ═══════════════════════════════════════════════════════════════════════════

class TestEvenementAssignation:

    def test_l_assignation_declenche_la_reallocation(
        self, acheteur, vendeur, organisation,
    ):
        intent = encaisser(acheteur, vendeur)
        evenement = events_in.carrier_assigned(
            intent_reference=intent.reference,
            delivery_organization=organisation,
            event_id="carrier-1", emitter="apps.shipping")

        assert evenement.outcome == EscrowEvent.Outcome.APPLIED
        assert evenement.affected_holds == 1
        assert EscrowHold.objects.filter(
            intent=intent, component="TRANSPORT").exists()

    def test_rejeu_sans_effet(self, acheteur, vendeur, organisation):
        intent = encaisser(acheteur, vendeur)
        events_in.carrier_assigned(
            intent_reference=intent.reference,
            delivery_organization=organisation, event_id="carrier-2")
        events_in.carrier_assigned(
            intent_reference=intent.reference,
            delivery_organization=organisation, event_id="carrier-2")

        assert EscrowHold.objects.filter(
            intent=intent, component="TRANSPORT").count() == 1
        assert EscrowEvent.objects.filter(event_id="carrier-2").count() == 1

    def test_sans_organisation_l_evenement_est_rejete(
        self, acheteur, vendeur,
    ):
        intent = encaisser(acheteur, vendeur)
        evenement = events_in.carrier_assigned(
            intent_reference=intent.reference,
            delivery_organization=None, event_id="carrier-3")
        assert evenement.outcome == EscrowEvent.Outcome.REJECTED


# ═══════════════════════════════════════════════════════════════════════════
# SCENARIO COMPLET
# ═══════════════════════════════════════════════════════════════════════════

class TestScenarioComplet:

    def test_du_checkout_au_paiement_du_transporteur(
        self, acheteur, vendeur, organisation,
    ):
        """
        Parcours reel : checkout sans transporteur, assignation, livraison
        prouvee, transporteur paye.
        """
        from apps.payments.escrow.services import release_hold

        intent = encaisser(acheteur, vendeur)
        assert revenue_summary()["revenue_total"] == 11750   # surestime

        events_in.carrier_assigned(
            intent_reference=intent.reference,
            delivery_organization=organisation, event_id="scenario-carrier")
        assert revenue_summary()["revenue_total"] == 8250    # corrige

        events_in.delivery_proof_validated(
            intent_reference=intent.reference, event_id="scenario-proof")
        transport = EscrowHold.objects.get(intent=intent, component="TRANSPORT")
        assert transport.status == EscrowHold.Status.RELEASE_SCHEDULED

        release_hold(transport, force=True, reason="Test")
        compte = payee_for_delivery_company(organisation)
        assert balance(coa.PAYABLE_DELIVERY_COMPANY,
                       payee_code=compte.payee_code) == 3500

        assert trial_balance_total() == 0
        rapport = run_all()
        assert rapport["ok"], [(r.code, r.detail) for r in rapport["violations"]]