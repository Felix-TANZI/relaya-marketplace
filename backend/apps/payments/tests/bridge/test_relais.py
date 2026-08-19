# backend/apps/payments/tests/bridge/test_relais.py
# Points relais : reallocation de la part et liberation a la remise.
#
#   docker exec -it relaya_backend pytest apps/payments/tests/bridge/ -q
#
# ─────────────────────────────────────────────────────────────────────────────
# DEUX MANQUES, DECOUVERTS EN VERIFIANT LE DEPOT
#
#   1. relay_handover_scanned n'etait branche NULLE PART. Le sequestre
#      RELAY_HANDLING ne se serait jamais libere : comme le transport, il
#      n'a pas d'auto-confirmation.
#
#   2. Le point relais est designe APRES le checkout — a la reception du
#      colis. Sa part restait donc comptabilisee en produit plateforme.
#
# C'est exactement le meme couple de defauts que pour la livraison, et
# aucun des deux ne levait d'erreur.
# ─────────────────────────────────────────────────────────────────────────────

from decimal import Decimal

import pytest
from django.contrib.auth.models import User

from apps.accounts.models import RelayPointProfile
from apps.catalog.models import Category, Product
from apps.orders.models import Order, OrderItem
from apps.payments.application.collect import (
    create_payment_intent, initiate_collect, poll_attempt,
)
from apps.payments.bridge.actors import payee_for_relay_point
from apps.payments.bridge.checkout import checkout
from apps.payments.config.models import (
    DistributionRule, EscrowPolicy, FeeRule, ProviderConfig,
)
from apps.payments.domain.distribution import ComponentInput
from apps.payments.domain.enums import EconomicComponent, PayeeType as DomainPayeeType
from apps.payments.domain.money import Money
from apps.payments.escrow.models import EscrowEvent, EscrowHold
from apps.payments.infrastructure.providers.mock import reset_mock_state
from apps.payments.ledger import chart_of_accounts as coa
from apps.payments.ledger.balances import balance, revenue_summary, trial_balance_total
from apps.payments.ledger.invariants import run_all
from apps.payments.ledger.models import LedgerAccount
from apps.payments.payees.models import MomoOperator, PayeeType
from apps.payments.payees.services import create_payee
from apps.shipping.models import RelayParcel, Shipment
from apps.vendors.models import VendorProfile

pytestmark = pytest.mark.django_db

NUMERO = "237677123456"


@pytest.fixture(autouse=True)
def _commit_immediat(monkeypatch):
    """Sous pytest.mark.django_db, les rappels differes ne s'executent pas."""
    from django.db import transaction as tx
    monkeypatch.setattr(tx, "on_commit",
                        lambda fonction, using=None: fonction())


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
    """Configuration REELLE : remise en relais facturee au RELAY_POINT."""
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
        config_key="dist-relay", name="Remise en relais",
        component=DistributionRule.Component.RELAY_HANDLING,
        payee_type=DistributionRule.PayeeType.RELAY_POINT,
        basis=DistributionRule.Basis.PERCENT_OF_COMPONENT,
        value=Decimal("80"), priority=20)
    DistributionRule.objects.create(
        config_key="dist-relay-platform", name="Part plateforme relais",
        component=DistributionRule.Component.RELAY_HANDLING,
        payee_type=DistributionRule.PayeeType.PLATFORM,
        basis=DistributionRule.Basis.REMAINDER, priority=10)
    EscrowPolicy.objects.create(config_key="escrow-default", name="Defaut",
                                auto_confirm_hours=48, release_delay_hours=24)
    # La remise ne s'auto-confirme JAMAIS : seul le scan la libere.
    EscrowPolicy.objects.create(
        config_key="escrow-relay", name="Remise en relais",
        payee_type=DistributionRule.PayeeType.RELAY_POINT,
        component=DistributionRule.Component.RELAY_HANDLING,
        auto_confirm_hours=0, release_delay_hours=24, priority=50)


@pytest.fixture
def acheteur():
    return User.objects.create_user("acheteur", "a@b.cm", "x")


@pytest.fixture
def vendeur():
    return create_payee(
        payee_type=PayeeType.VENDOR, display_label="Boutique",
        momo_operator=MomoOperator.MTN, momo_number=NUMERO)


@pytest.fixture
def relais():
    gerant = User.objects.create_user("gerant", "g@b.cm", "x")
    return RelayPointProfile.objects.create(
        user=gerant, name="Relais Mokolo", city="Yaounde")


def encaisser(acheteur, vendeur, cle="c1", order_id=1):
    """45 000 de marchandise + 1 000 de remise en relais."""
    intent = create_payment_intent(
        buyer=acheteur, idempotency_key=cle,
        components=[
            ComponentInput(EconomicComponent.GOODS, Money(45000),
                           order_id=order_id, commission_rate=Decimal("15")),
            ComponentInput(EconomicComponent.RELAY_HANDLING, Money(1000),
                           order_id=order_id),
        ],
        payee_codes={DomainPayeeType.VENDOR: vendeur.payee_code},
        payee_types={vendeur.payee_code: DomainPayeeType.VENDOR},
        payer_msisdn=NUMERO, payer_operator="MTN")
    issue = initiate_collect(intent)
    poll_attempt(issue.attempt)
    poll_attempt(issue.attempt)
    intent.refresh_from_db()
    return intent


def commande_avec_colis(acheteur, relais, intent,
                        statut=RelayParcel.Status.STORED):
    """
    Cree une commande, son expedition et son colis relais, RATTACHES a
    l'intention.

    Le plan fige un order_id : la commande doit porter le MEME, sinon la
    reallocation ne trouve pas a quelle commande rattacher le sequestre.
    """
    from apps.payments.bridge.intent_orders import PaymentIntentOrder

    identifiant = intent.distribution_plan["holds"][0]["order_id"]
    commande = Order.objects.create(
        id=identifiant,
        user=acheteur, customer_phone="237600000000", city="Yaounde",
        address="Mokolo", subtotal_xaf=45000, total_xaf=46000)
    PaymentIntentOrder.objects.create(intent=intent, order_id=commande.pk)
    expedition = Shipment.objects.create(order=commande,
                                         status=Shipment.Status.IN_TRANSIT)
    colis = RelayParcel.objects.create(
        shipment=expedition, relay_point=relais, status=statut,
        pickup_code="A1B2C3")
    return commande, expedition, colis


# ═══════════════════════════════════════════════════════════════════════════
# LE POINT RELAIS EST DESIGNE APRES LE CHECKOUT
# ═══════════════════════════════════════════════════════════════════════════

class TestAssignationRelais:

    def test_au_checkout_la_part_revient_a_la_plateforme(
        self, acheteur, vendeur,
    ):
        """
        Aucun point relais n'est connu : sa part est provisoirement
        comptabilisee en PRODUIT.
        """
        intent = encaisser(acheteur, vendeur)
        plan = intent.distribution_plan
        assert plan["needs_reallocation"] is True

        ecarte = [r for r in plan["unresolved_rules"]
                  if r["payee_type"] == "RELAY_POINT"]
        assert ecarte
        assert ecarte[0]["amount_xaf"] == 800      # 80 % de 1 000

    def test_la_reception_du_colis_reallouе_la_part(
        self, acheteur, vendeur, relais,
    ):
        """
        LE test qui corrige le chiffre d'affaires du relais.
        """
        from apps.payments.bridge import events_in

        intent = encaisser(acheteur, vendeur)
        produit_avant = revenue_summary()["revenue_total"]

        events_in.relay_point_assigned(
            intent_reference=intent.reference, relay_profile=relais,
            event_id="relay-1")

        assert revenue_summary()["revenue_total"] == produit_avant - 800
        hold = EscrowHold.objects.get(intent=intent,
                                      component="RELAY_HANDLING")
        assert hold.net_amount_xaf == 800
        assert hold.status == EscrowHold.Status.HELD

    def test_la_comptabilite_reste_equilibree(self, acheteur, vendeur, relais):
        from apps.payments.bridge import events_in

        intent = encaisser(acheteur, vendeur)
        events_in.relay_point_assigned(
            intent_reference=intent.reference, relay_profile=relais,
            event_id="relay-2")

        assert trial_balance_total() == 0
        assert run_all()["ok"]

    def test_rejeu_sans_effet(self, acheteur, vendeur, relais):
        from apps.payments.bridge import events_in

        intent = encaisser(acheteur, vendeur)
        for _ in range(3):
            events_in.relay_point_assigned(
                intent_reference=intent.reference, relay_profile=relais,
                event_id="relay-3")

        assert EscrowHold.objects.filter(
            intent=intent, component="RELAY_HANDLING").count() == 1


# ═══════════════════════════════════════════════════════════════════════════
# LE CROCHET SUR LE COLIS
# ═══════════════════════════════════════════════════════════════════════════

class TestCrochetColis:

    def test_le_stockage_declenche_la_reallocation(
        self, acheteur, vendeur, relais,
    ):
        """Sans aucun appel manuel : tout passe par le signal."""
        intent = encaisser(acheteur, vendeur, order_id=1)
        produit_avant = revenue_summary()["revenue_total"]

        commande, expedition, colis = commande_avec_colis(
            acheteur, relais, intent)

        assert revenue_summary()["revenue_total"] == produit_avant - 800

    def test_la_remise_libere_le_sequestre(self, acheteur, vendeur, relais):
        """
        LE test qui debloque le paiement du point relais.

        Sans cet evenement, le sequestre RELAY_HANDLING ne se libere jamais :
        sa politique fixe auto_confirm_hours a 0.
        """
        intent = encaisser(acheteur, vendeur, order_id=1)
        commande, expedition, colis = commande_avec_colis(
            acheteur, relais, intent)

        hold = EscrowHold.objects.get(intent=intent, component="RELAY_HANDLING")
        assert hold.status == EscrowHold.Status.HELD

        colis.status = RelayParcel.Status.PICKED_UP
        colis.save()

        hold.refresh_from_db()
        assert hold.status == EscrowHold.Status.RELEASE_SCHEDULED

    def test_un_colis_attendu_ne_declenche_rien(
        self, acheteur, vendeur, relais,
    ):
        """
        EXPECTED signifie que le colis n'est pas encore arrive : le point
        relais n'en a pas la garde, sa part ne lui revient pas encore.
        """
        intent = encaisser(acheteur, vendeur, order_id=1)
        produit_avant = revenue_summary()["revenue_total"]

        commande, expedition, colis = commande_avec_colis(
            acheteur, relais, intent, statut=RelayParcel.Status.EXPECTED)

        assert revenue_summary()["revenue_total"] == produit_avant

    def test_un_colis_sans_paiement_ne_casse_rien(self, acheteur, relais):
        """Une commande anterieure au module financier."""
        commande = Order.objects.create(
            user=acheteur, customer_phone="237600000000", city="Yaounde",
            address="Mokolo", subtotal_xaf=45000, total_xaf=46000)
        expedition = Shipment.objects.create(order=commande)
        colis = RelayParcel.objects.create(
            shipment=expedition, relay_point=relais,
            status=RelayParcel.Status.PICKED_UP, pickup_code="X1Y2Z3")
        assert colis.pk is not None


# ═══════════════════════════════════════════════════════════════════════════
# SCENARIO COMPLET
# ═══════════════════════════════════════════════════════════════════════════

class TestScenarioComplet:

    def test_du_checkout_au_paiement_du_relais(self, acheteur, vendeur, relais):
        from apps.payments.escrow.services import release_hold

        intent = encaisser(acheteur, vendeur, order_id=1)
        # 6 750 de commission + 1 000 de remise entiere
        assert revenue_summary()["revenue_total"] == 7750

        commande, expedition, colis = commande_avec_colis(
            acheteur, relais, intent)
        assert revenue_summary()["revenue_total"] == 6950   # 7 750 - 800

        colis.status = RelayParcel.Status.PICKED_UP
        colis.save()

        for hold in EscrowHold.objects.filter(
                intent=intent, status=EscrowHold.Status.RELEASE_SCHEDULED):
            release_hold(hold, force=True, reason="Test")

        compte = payee_for_relay_point(relais)
        assert balance(coa.PAYABLE_RELAY_POINT,
                       payee_code=compte.payee_code) == 800

        assert trial_balance_total() == 0
        rapport = run_all()
        assert rapport["ok"], [(r.code, r.detail) for r in rapport["violations"]]