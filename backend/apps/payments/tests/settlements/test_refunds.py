# backend/apps/payments/tests/settlements/test_refunds.py
# Remboursements.
#
#   docker exec -it relaya_backend pytest apps/payments/tests/settlements/ -q
#
# ─────────────────────────────────────────────────────────────────────────────
# CE FICHIER COMBLE LE DERNIER TROU FONCTIONNEL DU BACKEND
#
# Le modele Refund existait depuis le Lot 8, sans aucune logique pour
# l'executer. Un acheteur qui gagnait son litige ne recuperait RIEN : le
# sequestre restait gele indefiniment, ni verse au vendeur, ni rendu.
# ─────────────────────────────────────────────────────────────────────────────

from decimal import Decimal

import pytest
from django.contrib.auth.models import User
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
from apps.payments.escrow.models import EscrowEvent, EscrowHold
from apps.payments.infrastructure.providers.mock import reset_mock_state
from apps.payments.ledger import chart_of_accounts as coa
from apps.payments.ledger.balances import balance, trial_balance_total
from apps.payments.ledger.invariants import run_all
from apps.payments.ledger.models import LedgerAccount
from apps.payments.payees.models import MomoOperator, PayeeType
from apps.payments.payees.services import create_payee
from apps.payments.settlements.models import PayoutRequest, Refund
from apps.payments.settlements.services import (
    SettlementError, approve_refund, create_refund, execute_approved_refunds,
    execute_refund,
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
    EscrowPolicy.objects.create(config_key="escrow-default", name="Defaut",
                                auto_confirm_hours=48, release_delay_hours=24)
    PayoutPolicy.objects.create(config_key="payout-default", name="Defaut",
                                min_payout_xaf=100, max_payout_xaf=5_000_000,
                                momo_change_cooling_hours=72)


@pytest.fixture
def acheteur():
    return User.objects.create_user("acheteur", "a@b.cm", "x")


@pytest.fixture
def operateur():
    return User.objects.create_user("operateur", "op@b.cm", "x")


@pytest.fixture
def approbateur():
    return User.objects.create_user("approbateur", "ap@b.cm", "x")


@pytest.fixture
def vendeur():
    return create_payee(
        payee_type=PayeeType.VENDOR, display_label="Boutique",
        momo_operator=MomoOperator.MTN, momo_number=NUMERO)


def encaisser(acheteur, vendeur, montant=45000, cle="c1", order_id=1,
              msisdn=NUMERO):
    intent = create_payment_intent(
        buyer=acheteur, idempotency_key=cle,
        components=[ComponentInput(EconomicComponent.GOODS, Money(montant),
                                   order_id=order_id,
                                   commission_rate=Decimal("15"))],
        payee_codes={DomainPayeeType.VENDOR: vendeur.payee_code},
        payee_types={vendeur.payee_code: DomainPayeeType.VENDOR},
        payer_msisdn=msisdn, payer_operator="MTN")
    issue = initiate_collect(intent)
    poll_attempt(issue.attempt)
    poll_attempt(issue.attempt)
    intent.refresh_from_db()
    return intent


# ═══════════════════════════════════════════════════════════════════════════
# CREATION
# ═══════════════════════════════════════════════════════════════════════════

class TestCreation:

    def test_un_remboursement_est_cree_en_attente(
        self, acheteur, vendeur, operateur,
    ):
        intent = encaisser(acheteur, vendeur)
        remboursement = create_refund(
            intent, amount_xaf=10000, reason=Refund.Reason.DISPUTE,
            requested_by=operateur)

        assert remboursement.status == Refund.Status.PENDING_APPROVAL
        assert remboursement.reference.startswith("BLV-RFD-")

    def test_on_ne_rembourse_pas_plus_que_l_encaisse(
        self, acheteur, vendeur, operateur,
    ):
        intent = encaisser(acheteur, vendeur)
        with pytest.raises(SettlementError, match="impossible"):
            create_refund(intent, amount_xaf=999_999,
                          reason=Refund.Reason.DISPUTE,
                          requested_by=operateur)

    def test_les_remboursements_cumules_sont_plafonnes(
        self, acheteur, vendeur, operateur, approbateur,
    ):
        """
        Trois remboursements partiels ne doivent pas depasser l'encaisse.
        """
        intent = encaisser(acheteur, vendeur)
        premier = create_refund(intent, amount_xaf=30000,
                                reason=Refund.Reason.DISPUTE,
                                requested_by=operateur)
        approve_refund(premier, approved_by=approbateur)

        with pytest.raises(SettlementError, match="deja ete rembourses"):
            create_refund(intent, amount_xaf=20000,
                          reason=Refund.Reason.DISPUTE,
                          requested_by=operateur)

    def test_on_ne_rembourse_pas_un_paiement_non_encaisse(
        self, acheteur, vendeur, operateur,
    ):
        intent = create_payment_intent(
            buyer=acheteur, idempotency_key="jamais-paye",
            components=[ComponentInput(EconomicComponent.GOODS, Money(10000),
                                       order_id=9,
                                       commission_rate=Decimal("15"))],
            payee_codes={DomainPayeeType.VENDOR: vendeur.payee_code},
            payee_types={vendeur.payee_code: DomainPayeeType.VENDOR},
            payer_msisdn=NUMERO, payer_operator="MTN")

        with pytest.raises(SettlementError, match="pas encaisse"):
            create_refund(intent, amount_xaf=1000,
                          reason=Refund.Reason.DISPUTE,
                          requested_by=operateur)


# ═══════════════════════════════════════════════════════════════════════════
# APPROBATION
# ═══════════════════════════════════════════════════════════════════════════

class TestApprobation:

    def test_le_demandeur_ne_peut_pas_approuver(
        self, acheteur, vendeur, operateur,
    ):
        """
        Une sortie de fonds vers un acheteur merite la meme separation des
        roles qu'un versement partenaire : c'est le meme argent.
        """
        intent = encaisser(acheteur, vendeur)
        remboursement = create_refund(
            intent, amount_xaf=10000, reason=Refund.Reason.DISPUTE,
            requested_by=operateur)

        with pytest.raises(SettlementError, match="ne peut pas approuver"):
            approve_refund(remboursement, approved_by=operateur)

    def test_execution_sans_approbation_refusee(
        self, acheteur, vendeur, operateur,
    ):
        intent = encaisser(acheteur, vendeur)
        remboursement = create_refund(
            intent, amount_xaf=10000, reason=Refund.Reason.DISPUTE,
            requested_by=operateur)

        with pytest.raises(SettlementError, match="approuvee"):
            execute_refund(remboursement)


# ═══════════════════════════════════════════════════════════════════════════
# EXECUTION
# ═══════════════════════════════════════════════════════════════════════════

class TestExecution:

    def _approuve(self, acheteur, vendeur, operateur, approbateur,
                  montant=38250):
        intent = encaisser(acheteur, vendeur)
        remboursement = create_refund(
            intent, amount_xaf=montant, reason=Refund.Reason.DISPUTE,
            requested_by=operateur)
        return approve_refund(remboursement, approved_by=approbateur)

    def test_le_remboursement_sort_du_sequestre(
        self, acheteur, vendeur, operateur, approbateur,
    ):
        """
        L'argent quitte le sequestre pour retourner a l'acheteur : il n'ira
        jamais au vendeur.
        """
        remboursement = self._approuve(acheteur, vendeur, operateur,
                                       approbateur)
        sequestre_avant = balance(coa.ESCROW_LIABILITY)

        remboursement = execute_refund(remboursement)

        assert remboursement.status == Refund.Status.PAID
        assert balance(coa.ESCROW_LIABILITY) == sequestre_avant - 38250
        assert trial_balance_total() == 0

    def test_le_retour_se_fait_vers_le_payeur(
        self, acheteur, vendeur, operateur, approbateur,
    ):
        """
        JAMAIS vers un autre numero. Rembourser ailleurs cree un transfert
        de valeur non consenti — un schema classique de blanchiment.
        """
        remboursement = self._approuve(acheteur, vendeur, operateur,
                                       approbateur)
        remboursement = execute_refund(remboursement)

        versement = remboursement.payout
        assert versement is not None
        assert versement.payee_msisdn_masked == \
            remboursement.intent.payer_msisdn_masked

    def test_le_sequestre_passe_en_rembourse(
        self, acheteur, vendeur, operateur, approbateur,
    ):
        remboursement = self._approuve(acheteur, vendeur, operateur,
                                       approbateur)
        execute_refund(remboursement)

        hold = EscrowHold.objects.get(intent=remboursement.intent)
        assert hold.status == EscrowHold.Status.REFUNDED
        assert hold.refunded_amount_xaf == 38250

    def test_un_remboursement_partiel_laisse_le_reste(
        self, acheteur, vendeur, operateur, approbateur,
    ):
        """
        Un geste commercial sur une commande conservee : l'acheteur garde
        le produit, une partie lui est rendue.
        """
        remboursement = self._approuve(acheteur, vendeur, operateur,
                                       approbateur, montant=10000)
        execute_refund(remboursement)

        hold = EscrowHold.objects.get(intent=remboursement.intent)
        assert hold.status == EscrowHold.Status.PARTIALLY_REFUNDED
        assert hold.refunded_amount_xaf == 10000
        assert hold.payable_amount_xaf == 28250

    def test_execution_idempotente(
        self, acheteur, vendeur, operateur, approbateur,
    ):
        from apps.payments.ledger.models import LedgerTransaction

        remboursement = self._approuve(acheteur, vendeur, operateur,
                                       approbateur)
        execute_refund(remboursement)
        ecritures = LedgerTransaction.objects.count()

        execute_refund(remboursement)
        execute_refund(remboursement)
        assert LedgerTransaction.objects.count() == ecritures

    def test_timeout_donne_un_etat_inconnu(
        self, acheteur, vendeur, operateur, approbateur,
    ):
        """
        Meme regle que pour un versement : conclure a l'echec exposerait a
        un double remboursement au reessai.
        """
        # On encaisse avec un numero NORMAL — sinon le paiement lui-meme
        # echouerait — puis on bascule sur le numero qui provoque un
        # timeout au moment du remboursement.
        intent = encaisser(acheteur, vendeur)
        intent.set_payer(NUMERO_TIMEOUT, "MTN")
        intent.save(update_fields=[
            "payer_msisdn_enc", "payer_msisdn_masked",
            "payer_msisdn_fingerprint", "payer_operator", "updated_at",
        ])

        remboursement = create_refund(
            intent, amount_xaf=10000, reason=Refund.Reason.DISPUTE,
            requested_by=operateur)
        approve_refund(remboursement, approved_by=approbateur)

        remboursement = execute_refund(remboursement)

        assert remboursement.status == Refund.Status.UNKNOWN
        assert balance(coa.PSP_IN_TRANSIT) == 10000
        assert trial_balance_total() == 0

    def test_la_comptabilite_reste_coherente(
        self, acheteur, vendeur, operateur, approbateur,
    ):
        remboursement = self._approuve(acheteur, vendeur, operateur,
                                       approbateur)
        execute_refund(remboursement)

        assert trial_balance_total() == 0
        rapport = run_all()
        hors_solvabilite = [v for v in rapport["violations"] if v.code != "I4"]
        assert not hors_solvabilite, [
            (v.code, v.detail) for v in hors_solvabilite
        ]


# ═══════════════════════════════════════════════════════════════════════════
# LE LITIGE QUI DECLENCHE
# ═══════════════════════════════════════════════════════════════════════════

class TestLitige:

    def test_un_litige_rembourse_cree_la_demande(
        self, acheteur, vendeur, operateur,
    ):
        """
        LE trou que ce lot comble. Avant, l'evenement se contentait de
        journaliser « l'execution releve du Lot 8 » et l'acheteur ne
        recuperait rien.
        """
        intent = encaisser(acheteur, vendeur)
        events_in.dispute_opened(order_id=1, reason="Non recu",
                                 event_id="lit-1")
        evenement = events_in.dispute_resolved(
            order_id=1, resolution="REFUND", event_id="res-1")

        assert evenement.outcome == EscrowEvent.Outcome.APPLIED
        remboursement = Refund.objects.get(intent=intent)
        assert remboursement.amount_xaf == 38250
        assert remboursement.status == Refund.Status.PENDING_APPROVAL

    def test_l_argent_ne_sort_pas_automatiquement(
        self, acheteur, vendeur, operateur,
    ):
        """
        LE garde-fou contre la fraude par litige.

        Un litige tranche automatiquement suivi d'un virement automatique
        permettrait d'ouvrir un litige, le faire trancher, et encaisser.
        Une approbation par un TIERS reste obligatoire.
        """
        intent = encaisser(acheteur, vendeur)
        events_in.dispute_opened(order_id=1, reason="Non recu",
                                 event_id="lit-2")
        events_in.dispute_resolved(order_id=1, resolution="REFUND",
                                   event_id="res-2")

        assert balance(coa.ESCROW_LIABILITY) == 38250
        assert not PayoutRequest.objects.exists()

    def test_un_remboursement_partiel_exige_un_montant(
        self, acheteur, vendeur,
    ):
        intent = encaisser(acheteur, vendeur)
        events_in.dispute_opened(order_id=1, reason="Defectueux",
                                 event_id="lit-3")
        evenement = events_in.dispute_resolved(
            order_id=1, resolution="PARTIAL", refund_amount_xaf=0,
            event_id="res-3")

        assert evenement.outcome == EscrowEvent.Outcome.REJECTED
        assert not Refund.objects.exists()

    def test_un_partiel_superieur_au_sequestre_est_refuse(
        self, acheteur, vendeur,
    ):
        intent = encaisser(acheteur, vendeur)
        events_in.dispute_opened(order_id=1, reason="Defectueux",
                                 event_id="lit-4")
        evenement = events_in.dispute_resolved(
            order_id=1, resolution="PARTIAL", refund_amount_xaf=999_999,
            event_id="res-4")

        assert evenement.outcome == EscrowEvent.Outcome.REJECTED

    def test_un_partiel_valide_cree_la_demande(self, acheteur, vendeur):
        intent = encaisser(acheteur, vendeur)
        events_in.dispute_opened(order_id=1, reason="Defectueux",
                                 event_id="lit-5")
        events_in.dispute_resolved(
            order_id=1, resolution="PARTIAL", refund_amount_xaf=8000,
            event_id="res-5")

        remboursement = Refund.objects.get(intent=intent)
        assert remboursement.amount_xaf == 8000


# ═══════════════════════════════════════════════════════════════════════════
# ORDONNANCEUR
# ═══════════════════════════════════════════════════════════════════════════

class TestOrdonnanceur:

    def test_le_lot_execute_les_approuves(
        self, acheteur, vendeur, operateur, approbateur,
    ):
        intent = encaisser(acheteur, vendeur)
        remboursement = create_refund(
            intent, amount_xaf=10000, reason=Refund.Reason.DISPUTE,
            requested_by=operateur)
        approve_refund(remboursement, approved_by=approbateur)

        resultats = execute_approved_refunds()
        assert resultats["rembourses"] == 1
        assert resultats["montant_xaf"] == 10000

    def test_les_non_approuves_sont_ignores(
        self, acheteur, vendeur, operateur,
    ):
        intent = encaisser(acheteur, vendeur)
        create_refund(intent, amount_xaf=10000,
                      reason=Refund.Reason.DISPUTE, requested_by=operateur)

        assert execute_approved_refunds()["examines"] == 0


# ═══════════════════════════════════════════════════════════════════════════
# SCENARIO COMPLET
# ═══════════════════════════════════════════════════════════════════════════

class TestScenarioComplet:

    def test_du_litige_au_remboursement_effectif(
        self, acheteur, vendeur, operateur, approbateur,
    ):
        intent = encaisser(acheteur, vendeur)
        assert balance(coa.ESCROW_LIABILITY) == 38250

        events_in.dispute_opened(order_id=1, reason="Produit jamais recu",
                                 event_id="s-lit")
        events_in.dispute_resolved(order_id=1, resolution="REFUND",
                                   event_id="s-res")

        remboursement = Refund.objects.get(intent=intent)
        approve_refund(remboursement, approved_by=approbateur)
        remboursement = execute_refund(remboursement)

        assert remboursement.status == Refund.Status.PAID
        assert balance(coa.ESCROW_LIABILITY) == 0
        assert balance(coa.PAYABLE_VENDOR,
                       payee_code=vendeur.payee_code) == 0

        hold = EscrowHold.objects.get(intent=intent)
        assert hold.status == EscrowHold.Status.REFUNDED

        assert trial_balance_total() == 0