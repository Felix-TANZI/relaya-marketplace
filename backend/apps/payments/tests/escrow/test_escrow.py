# backend/apps/payments/tests/escrow/test_escrow.py
# Tests des sequestres multi-acteurs.
#
#   docker exec -it relaya_backend pytest apps/payments/tests/escrow/ -q
#
# Le test central du lot est test_geler_un_colis_ne_gele_pas_l_autre : c'est
# lui qui prouve que la granularite a quatre dimensions resout la
# contradiction §9.5 / §11 du referentiel.

from datetime import timedelta
from decimal import Decimal

import pytest
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.utils import timezone

from apps.payments.application.collect import (
    create_payment_intent,
    initiate_collect,
    poll_attempt,
)
from apps.payments.bridge import events_in
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
from apps.payments.escrow.models import EscrowEvent, EscrowHold
from apps.payments.escrow.services import (
    EscrowError,
    auto_confirm_due_holds,
    freeze_hold,
    materialize_holds,
    payee_escrow_summary,
    release_due_holds,
    release_hold,
    trigger_release,
    unfreeze_hold,
)
from apps.payments.infrastructure.providers.mock import reset_mock_state
from apps.payments.intents.models import PaymentIntent
from apps.payments.ledger import chart_of_accounts as coa
from apps.payments.ledger.balances import balance, trial_balance_total
from apps.payments.ledger.invariants import run_all
from apps.payments.ledger.models import LedgerAccount, LedgerTransaction
from apps.payments.payees.models import MomoOperator, PayeeType
from apps.payments.payees.services import create_payee

pytestmark = pytest.mark.django_db

NUMERO_OK = "237677123456"


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
        mode=ProviderConfig.Mode.SANDBOX, is_enabled=True, priority=10,
        supported_operators=["MTN", "ORANGE"],
        min_amount_xaf=100, max_amount_xaf=10_000_000,
    )
    FeeRule.objects.create(
        config_key="fee-psp-collect", name="Frais PSP",
        scope=FeeRule.Scope.COLLECT, basis=FeeRule.Basis.PERCENT,
        value=Decimal("2"), bearer=FeeRule.Bearer.PLATFORM, priority=10,
    )
    DistributionRule.objects.create(
        config_key="dist-goods", name="Marchandise",
        component=DistributionRule.Component.GOODS,
        payee_type=DistributionRule.PayeeType.VENDOR,
        basis=DistributionRule.Basis.REMAINDER, priority=10,
    )
    DistributionRule.objects.create(
        config_key="dist-transport-carrier", name="Transporteur",
        component=DistributionRule.Component.TRANSPORT,
        payee_type=DistributionRule.PayeeType.DELIVERY_COMPANY,
        basis=DistributionRule.Basis.PERCENT_OF_COMPONENT,
        value=Decimal("70"), priority=20,
    )
    DistributionRule.objects.create(
        config_key="dist-transport-platform", name="Plateforme",
        component=DistributionRule.Component.TRANSPORT,
        payee_type=DistributionRule.PayeeType.PLATFORM,
        basis=DistributionRule.Basis.REMAINDER, priority=10,
    )
    # Politique par defaut : 48 h d'auto-confirmation, 24 h de liberation
    EscrowPolicy.objects.create(
        config_key="escrow-default", name="Defaut",
        auto_confirm_hours=48, release_delay_hours=24,
        dispute_window_days=7, priority=0,
    )
    # Transport : aucune auto-confirmation, la preuve de livraison declenche
    EscrowPolicy.objects.create(
        config_key="escrow-transport", name="Transport",
        payee_type=DistributionRule.PayeeType.DELIVERY_COMPANY,
        component=DistributionRule.Component.TRANSPORT,
        auto_confirm_hours=0, release_delay_hours=24,
        dispute_window_days=7, priority=50,
    )


@pytest.fixture
def acheteur():
    return User.objects.create_user("acheteur", "a@belivay.cm", "x")


@pytest.fixture
def acteurs():
    vendeur = create_payee(
        payee_type=PayeeType.VENDOR, display_label="Boutique A",
        momo_operator=MomoOperator.MTN, momo_number=NUMERO_OK,
    )
    transporteur = create_payee(
        payee_type=PayeeType.DELIVERY_COMPANY, display_label="Express Douala",
        momo_operator=MomoOperator.MTN, momo_number="237699000111",
    )
    return {
        "vendeur": vendeur,
        "transporteur": transporteur,
        "codes": {
            DomainPayeeType.VENDOR: vendeur.payee_code,
            DomainPayeeType.DELIVERY_COMPANY: transporteur.payee_code,
        },
        "types": {
            vendeur.payee_code: DomainPayeeType.VENDOR,
            transporteur.payee_code: DomainPayeeType.DELIVERY_COMPANY,
        },
    }


def encaisser(acheteur, acteurs, *, composants=None, cle="cart-1"):
    """Cree une intention, l'encaisse, et materialise les sequestres."""
    intent = create_payment_intent(
        buyer=acheteur, idempotency_key=cle,
        components=composants or [
            ComponentInput(EconomicComponent.GOODS, Money(45000),
                           order_id=1, commission_rate=Decimal("15")),
            ComponentInput(EconomicComponent.TRANSPORT, Money(5000)),
        ],
        payee_codes=acteurs["codes"], payee_types=acteurs["types"],
        payer_msisdn=NUMERO_OK, payer_operator="MTN",
    )
    issue = initiate_collect(intent)
    poll_attempt(issue.attempt)
    poll_attempt(issue.attempt)
    intent.refresh_from_db()
    return intent


# ═══════════════════════════════════════════════════════════════════════════
# MATERIALISATION
# ═══════════════════════════════════════════════════════════════════════════

class TestMaterialisation:

    def test_sequestres_crees_a_la_confirmation(self, acheteur, acteurs):
        intent = encaisser(acheteur, acteurs)
        holds = EscrowHold.objects.filter(intent=intent)
        assert holds.count() == 2

        marchandise = holds.get(component=EscrowHold.Component.GOODS)
        assert marchandise.order_id == 1
        assert marchandise.gross_amount_xaf == 45000
        assert marchandise.commission_xaf == 6750
        assert marchandise.net_amount_xaf == 38250
        assert marchandise.status == EscrowHold.Status.HELD

        transport = holds.get(component=EscrowHold.Component.TRANSPORT)
        assert transport.order_id is None      # niveau paiement
        assert transport.net_amount_xaf == 3500

    def test_declencheurs_par_composant(self, acheteur, acteurs):
        """Le declencheur depend du COMPOSANT, pas du beneficiaire."""
        intent = encaisser(acheteur, acteurs)
        holds = {h.component: h for h in EscrowHold.objects.filter(intent=intent)}
        assert holds["GOODS"].release_trigger == EscrowHold.Trigger.BUYER_RECEIPT_CONFIRMED
        assert holds["TRANSPORT"].release_trigger == EscrowHold.Trigger.DELIVERY_PROOF_VALIDATED

    def test_politique_figee(self, acheteur, acteurs):
        intent = encaisser(acheteur, acteurs)
        marchandise = EscrowHold.objects.get(
            intent=intent, component=EscrowHold.Component.GOODS,
        )
        assert marchandise.policy_snapshot["auto_confirm_hours"] == 48
        assert marchandise.auto_confirm_at is not None

        transport = EscrowHold.objects.get(
            intent=intent, component=EscrowHold.Component.TRANSPORT,
        )
        assert transport.policy_snapshot["auto_confirm_hours"] == 0
        assert transport.auto_confirm_at is None   # jamais auto-confirme

    def test_modifier_la_politique_apres_coup_ne_change_rien(self, acheteur, acteurs):
        """Principe P3 : un sequestre en cours est immunise."""
        intent = encaisser(acheteur, acteurs)
        hold = EscrowHold.objects.get(intent=intent, component="GOODS")
        echeance = hold.auto_confirm_at

        EscrowPolicy.objects.filter(config_key="escrow-default").update(is_active=False)
        EscrowPolicy.objects.create(
            config_key="escrow-default", version=2, name="Nouveau",
            auto_confirm_hours=1, release_delay_hours=1, priority=0,
        )
        hold.refresh_from_db()
        assert hold.auto_confirm_at == echeance
        assert hold.policy_snapshot["auto_confirm_hours"] == 48

    def test_materialisation_idempotente(self, acheteur, acteurs):
        intent = encaisser(acheteur, acteurs)
        avant = EscrowHold.objects.count()
        materialize_holds(intent)
        materialize_holds(intent)
        assert EscrowHold.objects.count() == avant

    def test_cle_a_quatre_dimensions_unique(self, acheteur, acteurs):
        intent = encaisser(acheteur, acteurs)
        modele = EscrowHold.objects.get(intent=intent, component="GOODS")
        with pytest.raises(IntegrityError):
            with transaction.atomic():
                EscrowHold.objects.create(
                    intent=intent, order_id=modele.order_id,
                    payee=modele.payee, component=modele.component,
                    gross_amount_xaf=1, net_amount_xaf=1,
                    release_trigger=modele.release_trigger,
                )

    def test_transport_refuse_un_order_id(self, acheteur, acteurs):
        intent = encaisser(acheteur, acteurs)
        hold = EscrowHold(
            intent=intent, order_id=99, payee=acteurs["transporteur"],
            component=EscrowHold.Component.TRANSPORT,
            gross_amount_xaf=100, net_amount_xaf=100,
            release_trigger=EscrowHold.Trigger.DELIVERY_PROOF_VALIDATED,
        )
        with pytest.raises(ValidationError, match="niveau paiement"):
            hold.full_clean(exclude=["reference"])

    def test_sequestre_non_supprimable(self, acheteur, acteurs):
        intent = encaisser(acheteur, acteurs)
        with pytest.raises(ValidationError):
            EscrowHold.objects.filter(intent=intent).first().delete()


# ═══════════════════════════════════════════════════════════════════════════
# LE TEST CENTRAL — isolation des gels
# ═══════════════════════════════════════════════════════════════════════════

class TestIsolationDesGels:

    def test_geler_un_colis_ne_gele_pas_l_autre(self, acheteur, acteurs):
        """
        LE test qui justifie la granularite a quatre dimensions.

        Un MEME vendeur, DEUX commandes dans un MEME paiement. Un litige sur
        la premiere ne doit pas geler la seconde.

        Avec une cle (paiement x beneficiaire), les deux colis partageraient
        un seul enregistrement et le litige serait scope au VENDEUR, pas au
        COLIS — ce que le referentiel §11 interdit explicitement.
        """
        intent = encaisser(acheteur, acteurs, composants=[
            ComponentInput(EconomicComponent.GOODS, Money(30000),
                           order_id=1, commission_rate=Decimal("15")),
            ComponentInput(EconomicComponent.GOODS, Money(15000),
                           order_id=3, commission_rate=Decimal("15")),
        ])

        holds = EscrowHold.objects.filter(intent=intent, component="GOODS")
        assert holds.count() == 2, "Deux commandes = deux sequestres distincts"

        events_in.dispute_opened(
            order_id=1, reason="Produit defectueux", event_id="lit-1",
        )

        colis1 = holds.get(order_id=1)
        colis3 = holds.get(order_id=3)
        assert colis1.status == EscrowHold.Status.FROZEN
        assert colis3.status == EscrowHold.Status.HELD

    def test_un_litige_ne_gele_pas_le_transport(self, acheteur, acteurs):
        """
        Le transporteur a fait son travail : il ne doit pas etre penalise
        par un litige sur la marchandise.
        """
        intent = encaisser(acheteur, acteurs)
        events_in.dispute_opened(order_id=1, reason="Defectueux", event_id="lit-2")

        marchandise = EscrowHold.objects.get(intent=intent, component="GOODS")
        transport = EscrowHold.objects.get(intent=intent, component="TRANSPORT")
        assert marchandise.status == EscrowHold.Status.FROZEN
        assert transport.status == EscrowHold.Status.HELD

    def test_le_transporteur_est_paye_pendant_le_litige(self, acheteur, acteurs):
        """
        Demonstration complete : le transport est libere et credite alors que
        la marchandise reste gelee. C'est impossible avec un escrow mono-bloc.
        """
        intent = encaisser(acheteur, acteurs)
        events_in.dispute_opened(order_id=1, reason="Defectueux", event_id="lit-3")

        events_in.delivery_proof_validated(
            intent_reference=intent.reference, event_id="liv-1",
        )
        transport = EscrowHold.objects.get(intent=intent, component="TRANSPORT")
        assert transport.status == EscrowHold.Status.RELEASE_SCHEDULED

        release_hold(transport, force=True, reason="Test")

        assert balance(coa.PAYABLE_DELIVERY_COMPANY,
                       payee_code=acteurs["transporteur"].payee_code) == 3500
        assert balance(coa.PAYABLE_VENDOR,
                       payee_code=acteurs["vendeur"].payee_code) == 0
        assert run_all()["ok"]


# ═══════════════════════════════════════════════════════════════════════════
# DECLENCHEMENT ET LIBERATION
# ═══════════════════════════════════════════════════════════════════════════

class TestDeclenchement:

    def test_confirmation_acheteur_libere_la_marchandise(self, acheteur, acteurs):
        intent = encaisser(acheteur, acteurs)
        events_in.buyer_confirmed_receipt(order_id=1, event_id="rec-1")

        marchandise = EscrowHold.objects.get(intent=intent, component="GOODS")
        assert marchandise.status == EscrowHold.Status.RELEASE_SCHEDULED
        assert marchandise.release_at is not None

        transport = EscrowHold.objects.get(intent=intent, component="TRANSPORT")
        assert transport.status == EscrowHold.Status.HELD

    def test_preuve_de_livraison_libere_le_transport(self, acheteur, acteurs):
        intent = encaisser(acheteur, acteurs)
        events_in.delivery_proof_validated(
            intent_reference=intent.reference, event_id="liv-2",
        )
        transport = EscrowHold.objects.get(intent=intent, component="TRANSPORT")
        assert transport.status == EscrowHold.Status.RELEASE_SCHEDULED
        marchandise = EscrowHold.objects.get(intent=intent, component="GOODS")
        assert marchandise.status == EscrowHold.Status.HELD

    def test_declencheur_inadapte_refuse(self, acheteur, acteurs):
        """
        Une preuve de livraison ne libere pas la marchandise, et une
        confirmation de reception ne libere pas le transport.
        """
        intent = encaisser(acheteur, acteurs)
        marchandise = EscrowHold.objects.get(intent=intent, component="GOODS")
        with pytest.raises(EscrowError, match="Declencheur inadapte"):
            trigger_release(
                marchandise, trigger=EscrowHold.Trigger.DELIVERY_PROOF_VALIDATED,
            )

    def test_un_sequestre_gele_ne_se_declenche_pas(self, acheteur, acteurs):
        intent = encaisser(acheteur, acteurs)
        marchandise = EscrowHold.objects.get(intent=intent, component="GOODS")
        freeze_hold(marchandise, reason="Litige")
        with pytest.raises(EscrowError, match="gele"):
            trigger_release(
                marchandise, trigger=EscrowHold.Trigger.BUYER_RECEIPT_CONFIRMED,
            )

    def test_liberation_avant_echeance_refusee(self, acheteur, acteurs):
        intent = encaisser(acheteur, acteurs)
        events_in.buyer_confirmed_receipt(order_id=1, event_id="rec-2")
        marchandise = EscrowHold.objects.get(intent=intent, component="GOODS")
        with pytest.raises(EscrowError, match="liberable qu'a partir"):
            release_hold(marchandise)

    def test_forcage_exige_un_motif(self, acheteur, acteurs):
        intent = encaisser(acheteur, acteurs)
        events_in.buyer_confirmed_receipt(order_id=1, event_id="rec-3")
        marchandise = EscrowHold.objects.get(intent=intent, component="GOODS")
        with pytest.raises(EscrowError, match="motif"):
            release_hold(marchandise, force=True, reason="  ")

    def test_transition_illegale_refusee(self, acheteur, acteurs):
        intent = encaisser(acheteur, acteurs)
        marchandise = EscrowHold.objects.get(intent=intent, component="GOODS")
        with pytest.raises(IllegalTransition):
            marchandise.transition_to(EscrowHold.Status.RELEASED)


class TestLiberation:

    def test_ecritures_a_la_liberation(self, acheteur, acteurs):
        intent = encaisser(acheteur, acteurs)
        avant_sequestre = balance(coa.ESCROW_LIABILITY)

        events_in.buyer_confirmed_receipt(order_id=1, event_id="rec-4")
        marchandise = EscrowHold.objects.get(intent=intent, component="GOODS")
        release_hold(marchandise, force=True, reason="Test")

        assert balance(coa.ESCROW_LIABILITY) == avant_sequestre - 38250
        assert balance(coa.PAYABLE_VENDOR,
                       payee_code=acteurs["vendeur"].payee_code) == 38250
        assert trial_balance_total() == 0
        assert run_all()["ok"]

    def test_liberation_idempotente(self, acheteur, acteurs):
        intent = encaisser(acheteur, acteurs)
        events_in.buyer_confirmed_receipt(order_id=1, event_id="rec-5")
        marchandise = EscrowHold.objects.get(intent=intent, component="GOODS")

        release_hold(marchandise, force=True, reason="Test")
        ecritures = LedgerTransaction.objects.count()
        solde = balance(coa.PAYABLE_VENDOR, payee_code=acteurs["vendeur"].payee_code)

        release_hold(marchandise, force=True, reason="Test")
        release_hold(marchandise, force=True, reason="Test")

        assert LedgerTransaction.objects.count() == ecritures
        assert balance(coa.PAYABLE_VENDOR,
                       payee_code=acteurs["vendeur"].payee_code) == solde

    def test_compte_de_dette_par_type_d_acteur(self, acheteur, acteurs):
        intent = encaisser(acheteur, acteurs)
        events_in.buyer_confirmed_receipt(order_id=1, event_id="rec-6")
        events_in.delivery_proof_validated(
            intent_reference=intent.reference, event_id="liv-3",
        )
        for hold in EscrowHold.objects.filter(intent=intent):
            release_hold(hold, force=True, reason="Test")

        assert balance(coa.PAYABLE_VENDOR,
                       payee_code=acteurs["vendeur"].payee_code) == 38250
        assert balance(coa.PAYABLE_DELIVERY_COMPANY,
                       payee_code=acteurs["transporteur"].payee_code) == 3500
        assert balance(coa.ESCROW_LIABILITY) == 0


# ═══════════════════════════════════════════════════════════════════════════
# ECHEANCES AUTOMATIQUES
# ═══════════════════════════════════════════════════════════════════════════

class TestEcheances:

    def test_auto_confirmation_apres_delai(self, acheteur, acteurs):
        """
        NECESSAIRE : un acheteur peut ne jamais confirmer. Sans
        auto-confirmation, le vendeur ne serait jamais paye.
        """
        intent = encaisser(acheteur, acteurs)
        plus_tard = timezone.now() + timedelta(hours=49)

        resultats = auto_confirm_due_holds(now=plus_tard)
        assert resultats["programmes"] == 1     # la marchandise seule

        marchandise = EscrowHold.objects.get(intent=intent, component="GOODS")
        assert marchandise.status == EscrowHold.Status.RELEASE_SCHEDULED

        transport = EscrowHold.objects.get(intent=intent, component="TRANSPORT")
        assert transport.status == EscrowHold.Status.HELD

    def test_le_transport_ne_s_auto_confirme_jamais(self, acheteur, acteurs):
        """Sa politique fixe auto_confirm_hours a 0 : seule la preuve compte."""
        intent = encaisser(acheteur, acteurs)
        tres_tard = timezone.now() + timedelta(days=365)
        auto_confirm_due_holds(now=tres_tard)
        transport = EscrowHold.objects.get(intent=intent, component="TRANSPORT")
        assert transport.status == EscrowHold.Status.HELD

    def test_liberation_a_echeance(self, acheteur, acteurs):
        intent = encaisser(acheteur, acteurs)
        events_in.buyer_confirmed_receipt(order_id=1, event_id="rec-7")

        assert release_due_holds()["liberes"] == 0      # trop tot

        plus_tard = timezone.now() + timedelta(hours=25)
        resultats = release_due_holds(now=plus_tard)
        assert resultats["liberes"] == 1
        assert resultats["montant_xaf"] == 38250

    def test_un_sequestre_gele_n_est_pas_libere(self, acheteur, acteurs):
        intent = encaisser(acheteur, acteurs)
        events_in.buyer_confirmed_receipt(order_id=1, event_id="rec-8")
        marchandise = EscrowHold.objects.get(intent=intent, component="GOODS")
        freeze_hold(marchandise, reason="Litige tardif")

        plus_tard = timezone.now() + timedelta(hours=25)
        assert release_due_holds(now=plus_tard)["liberes"] == 0

    def test_cycle_complet_automatique(self, acheteur, acteurs):
        intent = encaisser(acheteur, acteurs)
        auto_confirm_due_holds(now=timezone.now() + timedelta(hours=49))
        release_due_holds(now=timezone.now() + timedelta(hours=74))

        marchandise = EscrowHold.objects.get(intent=intent, component="GOODS")
        assert marchandise.status == EscrowHold.Status.RELEASED
        assert balance(coa.PAYABLE_VENDOR,
                       payee_code=acteurs["vendeur"].payee_code) == 38250
        assert run_all()["ok"]


# ═══════════════════════════════════════════════════════════════════════════
# CONTRAT D'EVENEMENTS
# ═══════════════════════════════════════════════════════════════════════════

class TestContratEvenements:

    def test_evenement_journalise(self, acheteur, acteurs):
        encaisser(acheteur, acteurs)
        events_in.buyer_confirmed_receipt(
            order_id=1, event_id="rec-9", emitter="apps.orders.ConfirmReceiptView",
        )
        evenement = EscrowEvent.objects.get(event_id="rec-9")
        assert evenement.kind == EscrowEvent.Kind.BUYER_RECEIPT_CONFIRMED
        assert evenement.emitter == "apps.orders.ConfirmReceiptView"
        assert evenement.outcome == EscrowEvent.Outcome.APPLIED
        assert evenement.affected_holds == 1

    def test_rejeu_sans_effet(self, acheteur, acteurs):
        """Rejouer un evenement n'a AUCUN effet supplementaire."""
        intent = encaisser(acheteur, acteurs)
        events_in.buyer_confirmed_receipt(order_id=1, event_id="rec-10")
        marchandise = EscrowHold.objects.get(intent=intent, component="GOODS")
        echeance = marchandise.release_at

        events_in.buyer_confirmed_receipt(order_id=1, event_id="rec-10")
        events_in.buyer_confirmed_receipt(order_id=1, event_id="rec-10")

        marchandise.refresh_from_db()
        assert marchandise.release_at == echeance
        assert EscrowEvent.objects.filter(event_id="rec-10").count() == 1

    def test_evenement_hors_perimetre_ignore(self, acheteur, acteurs):
        encaisser(acheteur, acteurs)
        evenement = events_in.buyer_confirmed_receipt(
            order_id=99999, event_id="rec-inconnu",
        )
        assert evenement.outcome == EscrowEvent.Outcome.IGNORED

    def test_litige_rejete_degele(self, acheteur, acteurs):
        intent = encaisser(acheteur, acteurs)
        events_in.dispute_opened(order_id=1, reason="Defectueux", event_id="lit-4")
        events_in.dispute_resolved(
            order_id=1, resolution="REJECTED", event_id="res-1",
        )
        marchandise = EscrowHold.objects.get(intent=intent, component="GOODS")
        assert marchandise.status == EscrowHold.Status.HELD
        assert marchandise.frozen_reason == ""

    def test_litige_rembourse_cree_une_demande_sans_sortir_l_argent(
        self, acheteur, acteurs,
    ):
        """
        Ce test verifiait auparavant que RIEN ne se passait — le
        remboursement n'etait pas implemente.

        Desormais une demande est creee, mais l'argent NE SORT PAS : une
        approbation par un tiers reste obligatoire. Sans elle, ouvrir un
        litige, le faire trancher et encaisser suffirait a frauder.
        """
        from apps.payments.settlements.models import Refund

        intent = encaisser(acheteur, acteurs)
        events_in.dispute_opened(order_id=1, reason="Non recu", event_id="lit-5")
        evenement = events_in.dispute_resolved(
            order_id=1, resolution="REFUND", refund_amount_xaf=38250,
            event_id="res-2",
        )

        assert evenement.outcome == EscrowEvent.Outcome.APPLIED

        remboursement = Refund.objects.get(intent=intent)
        assert remboursement.status == Refund.Status.PENDING_APPROVAL
        assert remboursement.amount_xaf == 38250

        # Le sequestre reste gele tant que personne n'a approuve.
        marchandise = EscrowHold.objects.get(intent=intent, component="GOODS")
        assert marchandise.status == EscrowHold.Status.FROZEN

    def test_annulation_de_commande(self, acheteur, acteurs):
        intent = encaisser(acheteur, acteurs)
        events_in.order_cancelled(
            order_id=1, reason="Rupture de stock", event_id="ann-1",
        )
        marchandise = EscrowHold.objects.get(intent=intent, component="GOODS")
        assert marchandise.status == EscrowHold.Status.CANCELLED

    def test_journal_non_supprimable(self, acheteur, acteurs):
        encaisser(acheteur, acteurs)
        events_in.buyer_confirmed_receipt(order_id=1, event_id="rec-11")
        with pytest.raises(ValidationError):
            EscrowEvent.objects.get(event_id="rec-11").delete()


# ═══════════════════════════════════════════════════════════════════════════
# COMPENSATION — les fonds actifs sont hors d'atteinte
# ═══════════════════════════════════════════════════════════════════════════

class TestCompensation:

    def test_les_fonds_actifs_ne_sont_pas_compensables(self, acheteur, acteurs):
        """
        §11.2 du document d'architecture : un sequestre actif correspond a une
        commande VIVANTE. L'acheteur peut encore obtenir un remboursement
        integral. Ces fonds ne sont donc pas la propriete du partenaire et ne
        peuvent pas garantir une dette nee d'une autre transaction.
        """
        intent = encaisser(acheteur, acteurs)
        resume = payee_escrow_summary(acteurs["vendeur"])
        assert resume["held_xaf"] == 38250
        assert resume["not_offsettable_xaf"] == 38250
        assert resume["released_xaf"] == 0

    def test_apres_liberation_les_fonds_deviennent_exigibles(self, acheteur, acteurs):
        intent = encaisser(acheteur, acteurs)
        events_in.buyer_confirmed_receipt(order_id=1, event_id="rec-12")
        marchandise = EscrowHold.objects.get(intent=intent, component="GOODS")
        release_hold(marchandise, force=True, reason="Test")

        resume = payee_escrow_summary(acteurs["vendeur"])
        assert resume["not_offsettable_xaf"] == 0
        assert resume["released_xaf"] == 38250


# ═══════════════════════════════════════════════════════════════════════════
# SCENARIO COMPLET
# ═══════════════════════════════════════════════════════════════════════════

class TestScenarioComplet:

    def test_panier_multi_commandes_avec_litige_partiel(self, acheteur, acteurs):
        """
        Panier de deux commandes du meme vendeur, plus le transport.
        Litige sur la premiere commande uniquement.

        Resultat attendu : la seconde commande et le transport sont payes
        normalement, seule la premiere reste gelee.
        """
        intent = encaisser(acheteur, acteurs, composants=[
            ComponentInput(EconomicComponent.GOODS, Money(30000),
                           order_id=1, commission_rate=Decimal("15")),
            ComponentInput(EconomicComponent.GOODS, Money(15000),
                           order_id=3, commission_rate=Decimal("15")),
            ComponentInput(EconomicComponent.TRANSPORT, Money(5000)),
        ])
        assert EscrowHold.objects.filter(intent=intent).count() == 3

        events_in.dispute_opened(order_id=1, reason="Defectueux", event_id="s-lit")
        events_in.buyer_confirmed_receipt(order_id=3, event_id="s-rec")
        events_in.delivery_proof_validated(
            intent_reference=intent.reference, event_id="s-liv",
        )

        for hold in EscrowHold.objects.filter(
            intent=intent, status=EscrowHold.Status.RELEASE_SCHEDULED,
        ):
            release_hold(hold, force=True, reason="Test")

        colis1 = EscrowHold.objects.get(intent=intent, order_id=1)
        assert colis1.status == EscrowHold.Status.FROZEN

        vendeur = acteurs["vendeur"].payee_code
        assert balance(coa.PAYABLE_VENDOR, payee_code=vendeur) == 12750  # 15000 - 15 %
        assert balance(coa.PAYABLE_DELIVERY_COMPANY,
                       payee_code=acteurs["transporteur"].payee_code) == 3500
        assert balance(coa.ESCROW_LIABILITY) == 25500                    # 30000 - 15 %

        assert trial_balance_total() == 0
        rapport = run_all()
        assert rapport["ok"], [(r.code, r.detail) for r in rapport["violations"]]