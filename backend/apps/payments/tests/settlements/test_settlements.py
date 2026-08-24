# backend/apps/payments/tests/settlements/test_settlements.py
# Tests du cycle de reglement.
#
#   docker exec -it relaya_backend pytest apps/payments/tests/settlements/ -q
#
# Trois tests portent l'essentiel de la surete :
#   test_le_plafond_de_retenue_protege_le_partenaire
#   test_timeout_donne_un_etat_inconnu_jamais_un_echec
#   test_le_demandeur_ne_peut_pas_approuver

from datetime import timedelta
from decimal import Decimal

import pytest
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
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
from apps.payments.domain.exceptions import IllegalTransition
from apps.payments.domain.money import Money
from apps.payments.escrow.models import EscrowHold
from apps.payments.escrow.services import release_hold
from apps.payments.infrastructure.providers.mock import reset_mock_state
from apps.payments.ledger import chart_of_accounts as coa
from apps.payments.ledger.balances import balance, trial_balance_total
from apps.payments.ledger.invariants import run_all
from apps.payments.ledger.models import LedgerAccount
from apps.payments.payees.models import MomoOperator, PayeeType
from apps.payments.payees.services import create_payee, hold_payouts
from apps.payments.settlements.models import (
    Adjustment, PayoutApproval, PayoutRequest, SettlementBatch,
)
from apps.payments.settlements.services import (
    SettlementError, amount_due, approve_adjustment, approve_payout,
    build_batch, confirm_batch, create_adjustment, exceptional_share,
    execute_payout, reject_payout, request_payout,
)

pytestmark = pytest.mark.django_db

NUMERO = "237677123456"
NUMERO_TIMEOUT = "237677123459"   # le prestataire factice leve ProviderTimeout
NUMERO_SOLDE = "237677123450"     # ER301 solde insuffisant


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
        config_key="fee-psp-collect", name="Frais collecte",
        scope=FeeRule.Scope.COLLECT, basis=FeeRule.Basis.PERCENT,
        value=Decimal("2"), bearer=FeeRule.Bearer.PLATFORM, priority=10,
    )
    FeeRule.objects.create(
        config_key="fee-psp-payout", name="Frais versement",
        scope=FeeRule.Scope.PAYOUT, basis=FeeRule.Basis.PERCENT,
        value=Decimal("1"), bearer=FeeRule.Bearer.PLATFORM, priority=10,
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
    PayoutPolicy.objects.create(
        config_key="payout-default", name="Defaut",
        min_payout_xaf=100, max_payout_xaf=5_000_000,
        required_approvals=1, dual_approval_threshold_xaf=1_000_000,
        momo_change_cooling_hours=72, require_kyc_verified=True,
        max_offset_percent=Decimal("50.00"),
        allow_exceptional_settlement=False,
        exceptional_required_approvals=2,
        exceptional_max_amount_xaf=500_000,
        exceptional_max_per_month=1,
        exceptional_alert_share_percent=Decimal("10.00"),
        priority=0,
    )


@pytest.fixture
def operateur():
    return User.objects.create_user("operateur", "op@belivay.cm", "x")


@pytest.fixture
def approbateur():
    return User.objects.create_user("approbateur", "ap@belivay.cm", "x")


@pytest.fixture
def acheteur():
    return User.objects.create_user("acheteur", "a@belivay.cm", "x")


@pytest.fixture
def vendeur():
    compte = create_payee(
        payee_type=PayeeType.VENDOR, display_label="Boutique A",
        momo_operator=MomoOperator.MTN, momo_number=NUMERO,
        settlement_cycle_key="cycle-weekly-friday",
    )
    compte.kyc_status = "VERIFIED"
    compte.kyc_verified_at = timezone.now()
    compte.momo_changed_at = timezone.now() - timedelta(days=30)
    compte.save()
    return compte


def liberer(acheteur, vendeur, montant=45000, order_id=1, cle="cart-1"):
    """Encaisse, materialise, confirme et libere : le sequestre devient exigible."""
    intent = create_payment_intent(
        buyer=acheteur, idempotency_key=cle,
        components=[ComponentInput(EconomicComponent.GOODS, Money(montant),
                                   order_id=order_id, commission_rate=Decimal("15"))],
        payee_codes={DomainPayeeType.VENDOR: vendeur.payee_code},
        payee_types={vendeur.payee_code: DomainPayeeType.VENDOR},
        payer_msisdn=NUMERO, payer_operator="MTN",
    )
    issue = initiate_collect(intent)
    poll_attempt(issue.attempt)
    poll_attempt(issue.attempt)
    events_in.buyer_confirmed_receipt(order_id=order_id, event_id=f"rec-{cle}")
    hold = EscrowHold.objects.get(intent=intent, order_id=order_id)
    release_hold(hold, force=True, reason="Test")
    return intent, hold


# ═══════════════════════════════════════════════════════════════════════════
# AGREGATION
# ═══════════════════════════════════════════════════════════════════════════

class TestAgregation:

    def test_un_lot_agrege_plusieurs_sequestres(self, acheteur, vendeur):
        """Un vendeur avec 3 commandes liberees genere UN versement, pas 3."""
        for i in range(3):
            liberer(acheteur, vendeur, montant=10000, order_id=i + 1, cle=f"c{i}")

        lot = build_batch(vendeur)
        assert lot is not None
        assert lot.covered_holds.count() == 3
        assert lot.gross_amount_xaf == 3 * 8500     # 10000 - 15 %
        assert lot.net_amount_xaf == 25500

    def test_un_sequestre_n_est_regle_qu_une_fois(self, acheteur, vendeur):
        liberer(acheteur, vendeur)
        premier = build_batch(vendeur)
        second = build_batch(vendeur)
        assert premier is not None
        assert second is None

    def test_les_sequestres_actifs_ne_sont_pas_agreges(self, acheteur, vendeur):
        """
        §11.2 : un sequestre actif correspond a une commande VIVANTE.
        L'acheteur peut encore obtenir un remboursement integral.
        """
        intent = create_payment_intent(
            buyer=acheteur, idempotency_key="c-actif",
            components=[ComponentInput(EconomicComponent.GOODS, Money(20000),
                                       order_id=9, commission_rate=Decimal("15"))],
            payee_codes={DomainPayeeType.VENDOR: vendeur.payee_code},
            payee_types={vendeur.payee_code: DomainPayeeType.VENDOR},
            payer_msisdn=NUMERO, payer_operator="MTN",
        )
        issue = initiate_collect(intent)
        poll_attempt(issue.attempt); poll_attempt(issue.attempt)
        assert build_batch(vendeur) is None

    def test_lot_non_supprimable(self, acheteur, vendeur):
        liberer(acheteur, vendeur)
        lot = build_batch(vendeur)
        with pytest.raises(ValidationError):
            lot.delete()

    def test_reference_marquee_hors_cycle(self, acheteur, vendeur):
        liberer(acheteur, vendeur)
        lot = build_batch(vendeur, is_exceptional=True, exceptional_reason="Urgence")
        assert "-X" in lot.reference


# ═══════════════════════════════════════════════════════════════════════════
# COMPENSATION — le plafond de retenue
# ═══════════════════════════════════════════════════════════════════════════

class TestCompensation:

    def test_le_plafond_de_retenue_protege_le_partenaire(
        self, acheteur, vendeur, operateur, approbateur,
    ):
        """
        LE test central de la compensation.

        Le vendeur doit 30 000 FCFA. BelivaY lui doit 38 250. Sans plafond,
        il toucherait 8 250 et ne pourrait plus operer. Avec 50 %, il touche
        au moins la moitie, et le solde est recupere au cycle suivant.
        """
        liberer(acheteur, vendeur)   # 38 250 exigibles

        dette = create_adjustment(
            payee=vendeur, direction=Adjustment.Direction.CREDIT,
            category=Adjustment.Category.PENALTY, amount_xaf=30000,
            reason="Retard de livraison repete", created_by=operateur,
        )
        approve_adjustment(dette, approved_by=approbateur)

        lot = build_batch(vendeur)
        retenue_max = 38250 // 2      # 19 125

        assert lot.adjustments_xaf == -retenue_max
        assert lot.net_amount_xaf == 38250 - retenue_max
        assert lot.net_amount_xaf > 0

        dette.refresh_from_db()
        assert dette.remaining_xaf == 30000 - retenue_max
        assert dette.status == Adjustment.Status.APPROVED   # pas encore soldee

    def test_une_petite_creance_est_soldee_en_une_fois(
        self, acheteur, vendeur, operateur, approbateur,
    ):
        liberer(acheteur, vendeur)
        dette = create_adjustment(
            payee=vendeur, direction=Adjustment.Direction.CREDIT,
            category=Adjustment.Category.PENALTY, amount_xaf=3000,
            reason="Petit retard", created_by=operateur,
        )
        approve_adjustment(dette, approved_by=approbateur)

        lot = build_batch(vendeur)
        assert lot.net_amount_xaf == 38250 - 3000
        dette.refresh_from_db()
        assert dette.remaining_xaf == 0
        assert dette.status == Adjustment.Status.APPLIED

    def test_une_petite_creance_ne_gele_pas_les_reglements(
        self, acheteur, vendeur, operateur, approbateur,
    ):
        """
        Geler l'integralite des versements pour 3 000 FCFA serait
        disproportionne et contractuellement contestable. Le gel total reste
        reserve a la fraude, au KYC et au litige majeur.
        """
        liberer(acheteur, vendeur)
        dette = create_adjustment(
            payee=vendeur, direction=Adjustment.Direction.CREDIT,
            category=Adjustment.Category.PENALTY, amount_xaf=3000,
            reason="Petit retard", created_by=operateur,
        )
        approve_adjustment(dette, approved_by=approbateur)

        vendeur.refresh_from_db()
        assert vendeur.payout_hold is False
        lot = build_batch(vendeur)
        assert lot.net_amount_xaf > 0

    def test_un_bonus_augmente_le_reglement(
        self, acheteur, vendeur, operateur, approbateur,
    ):
        liberer(acheteur, vendeur)
        bonus = create_adjustment(
            payee=vendeur, direction=Adjustment.Direction.DEBIT,
            category=Adjustment.Category.COMPENSATION, amount_xaf=5000,
            reason="Geste commercial", created_by=operateur,
        )
        approve_adjustment(bonus, approved_by=approbateur)

        lot = build_batch(vendeur)
        assert lot.adjustments_xaf == 5000
        assert lot.net_amount_xaf == 38250 + 5000

    def test_createur_ne_peut_pas_approuver_un_ajustement(self, vendeur, operateur):
        ajustement = create_adjustment(
            payee=vendeur, direction=Adjustment.Direction.CREDIT,
            category=Adjustment.Category.PENALTY, amount_xaf=1000,
            reason="Test", created_by=operateur,
        )
        with pytest.raises(SettlementError, match="Separation des roles"):
            approve_adjustment(ajustement, approved_by=operateur)

    def test_contrainte_maker_checker_en_base(self, vendeur, operateur):
        ajustement = create_adjustment(
            payee=vendeur, direction=Adjustment.Direction.CREDIT,
            category=Adjustment.Category.PENALTY, amount_xaf=1000,
            reason="Test", created_by=operateur,
        )
        with pytest.raises(IntegrityError):
            with transaction.atomic():
                Adjustment.objects.filter(pk=ajustement.pk).update(
                    approved_by=operateur,
                )

    def test_motif_obligatoire(self, vendeur, operateur):
        with pytest.raises(SettlementError):
            create_adjustment(
                payee=vendeur, direction=Adjustment.Direction.CREDIT,
                category=Adjustment.Category.PENALTY, amount_xaf=1000,
                reason="   ", created_by=operateur,
            )

    def test_ecritures_d_un_ajustement(self, vendeur, operateur, approbateur):
        dette = create_adjustment(
            payee=vendeur, direction=Adjustment.Direction.CREDIT,
            category=Adjustment.Category.PENALTY, amount_xaf=5000,
            reason="Penalite", created_by=operateur,
        )
        approve_adjustment(dette, approved_by=approbateur)
        assert balance(coa.RECEIVABLE_PARTNER,
                       payee_code=vendeur.payee_code) == 5000
        assert trial_balance_total() == 0


# ═══════════════════════════════════════════════════════════════════════════
# APPROBATION
# ═══════════════════════════════════════════════════════════════════════════

class TestApprobation:

    def _lot_confirme(self, acheteur, vendeur):
        liberer(acheteur, vendeur)
        return confirm_batch(build_batch(vendeur))

    def test_le_demandeur_ne_peut_pas_approuver(
        self, acheteur, vendeur, operateur,
    ):
        """Separation des roles — controle en Python ET en base."""
        lot = self._lot_confirme(acheteur, vendeur)
        demande = request_payout(lot, requested_by=operateur)
        with pytest.raises(SettlementError, match="ne peut pas approuver"):
            approve_payout(demande, approved_by=operateur)

    def test_approbation_par_un_tiers(
        self, acheteur, vendeur, operateur, approbateur,
    ):
        lot = self._lot_confirme(acheteur, vendeur)
        demande = request_payout(lot, requested_by=operateur)
        demande = approve_payout(demande, approved_by=approbateur)
        assert demande.status == PayoutRequest.Status.APPROVED

    def test_double_approbation_au_dela_du_seuil(
        self, acheteur, vendeur, operateur, approbateur,
    ):
        liberer(acheteur, vendeur, montant=2_000_000, cle="gros")
        lot = confirm_batch(build_batch(vendeur))
        demande = request_payout(lot, requested_by=operateur)
        assert demande.required_approvals == 2

        demande = approve_payout(demande, approved_by=approbateur)
        assert demande.status == PayoutRequest.Status.PENDING_APPROVAL

        second = User.objects.create_user("approbateur2", "ap2@b.cm", "x")
        demande = approve_payout(demande, approved_by=second)
        assert demande.status == PayoutRequest.Status.APPROVED

    def test_un_approbateur_ne_compte_qu_une_fois(
        self, acheteur, vendeur, operateur, approbateur,
    ):
        liberer(acheteur, vendeur, montant=2_000_000, cle="gros2")
        lot = confirm_batch(build_batch(vendeur))
        demande = request_payout(lot, requested_by=operateur)
        approve_payout(demande, approved_by=approbateur)
        with pytest.raises(SettlementError, match="deja approuve"):
            approve_payout(demande, approved_by=approbateur)

    def test_rejet_exige_un_motif(
        self, acheteur, vendeur, operateur, approbateur,
    ):
        lot = self._lot_confirme(acheteur, vendeur)
        demande = request_payout(lot, requested_by=operateur)
        with pytest.raises(SettlementError):
            reject_payout(demande, rejected_by=approbateur, reason="")

    def test_versement_bloque_si_kyc_absent(self, acheteur, operateur):
        sans_kyc = create_payee(
            payee_type=PayeeType.VENDOR, display_label="Sans KYC",
            momo_operator=MomoOperator.MTN, momo_number=NUMERO,
        )
        liberer(acheteur, sans_kyc, cle="sk")
        lot = confirm_batch(build_batch(sans_kyc))
        with pytest.raises(SettlementError, match="KYC"):
            request_payout(lot, requested_by=operateur)

    def test_versement_bloque_si_gel(
        self, acheteur, vendeur, operateur, approbateur,
    ):
        liberer(acheteur, vendeur)
        lot = confirm_batch(build_batch(vendeur))
        hold_payouts(vendeur, held_by=approbateur, reason="Suspicion de fraude")
        with pytest.raises(SettlementError, match="geles"):
            request_payout(lot, requested_by=operateur)


# ═══════════════════════════════════════════════════════════════════════════
# EXECUTION
# ═══════════════════════════════════════════════════════════════════════════

class TestExecution:

    def _approuve(self, acheteur, vendeur, operateur, approbateur, **kw):
        liberer(acheteur, vendeur, **kw)
        lot = confirm_batch(build_batch(vendeur))
        demande = request_payout(lot, requested_by=operateur)
        return approve_payout(demande, approved_by=approbateur)

    def test_versement_execute(
        self, acheteur, vendeur, operateur, approbateur,
    ):
        demande = self._approuve(acheteur, vendeur, operateur, approbateur)
        demande = execute_payout(demande)

        assert demande.status == PayoutRequest.Status.PAID
        assert demande.provider_reference
        assert balance(coa.PAYABLE_VENDOR, payee_code=vendeur.payee_code) == 0
        assert trial_balance_total() == 0
        assert run_all()["ok"]

    def test_le_partenaire_recoit_l_integralite(
        self, acheteur, vendeur, operateur, approbateur,
    ):
        """
        Les frais PSP sont une CHARGE PLATEFORME, jamais une retenue :
        le partenaire recoit son net complet (referentiel §7.1).
        """
        demande = self._approuve(acheteur, vendeur, operateur, approbateur)
        montant = demande.amount_xaf
        demande = execute_payout(demande)

        assert demande.amount_xaf == montant          # inchange
        assert demande.psp_fee_xaf > 0                # frais preleves
        assert balance(coa.EXPENSE_PSP_PAYOUT) == demande.psp_fee_xaf

    def test_reference_uuid4_pour_campay(
        self, acheteur, vendeur, operateur, approbateur,
    ):
        """CamPay REJETTE toute external_reference qui n'est pas un UUID4."""
        import uuid as _uuid
        demande = self._approuve(acheteur, vendeur, operateur, approbateur)
        assert _uuid.UUID(demande.provider_external_reference).version == 4
        assert demande.reference.startswith("BLV-OUT-")

    def test_execution_idempotente(
        self, acheteur, vendeur, operateur, approbateur,
    ):
        from apps.payments.ledger.models import LedgerTransaction
        demande = self._approuve(acheteur, vendeur, operateur, approbateur)
        execute_payout(demande)
        ecritures = LedgerTransaction.objects.count()
        execute_payout(demande)
        execute_payout(demande)
        assert LedgerTransaction.objects.count() == ecritures

    def test_execution_sans_approbation_refusee(
        self, acheteur, vendeur, operateur,
    ):
        liberer(acheteur, vendeur)
        lot = confirm_batch(build_batch(vendeur))
        demande = request_payout(lot, requested_by=operateur)
        with pytest.raises(SettlementError, match="approuvee"):
            execute_payout(demande)

    def test_timeout_donne_un_etat_inconnu_jamais_un_echec(
        self, acheteur, vendeur, operateur, approbateur,
    ):
        """
        LE test le plus important du lot.

        Sur un timeout, on NE SAIT PAS si l'argent est parti. Conclure a
        l'echec exposerait a un double versement au reessai — irrecuperable.
        L'argent est porte en TRANSIT et la reconciliation tranche.
        """
        demande = self._approuve(acheteur, vendeur, operateur, approbateur)
        vendeur.set_momo_number(NUMERO_TIMEOUT, MomoOperator.MTN)
        vendeur.momo_changed_at = timezone.now() - timedelta(days=30)
        vendeur.save()

        demande = execute_payout(demande)

        assert demande.status == PayoutRequest.Status.UNKNOWN
        assert demande.status != PayoutRequest.Status.FAILED
        assert balance(coa.PSP_IN_TRANSIT) == demande.amount_xaf
        assert trial_balance_total() == 0

    def test_aucune_transition_de_inconnu_vers_en_cours(
        self, acheteur, vendeur, operateur, approbateur,
    ):
        """Retenter aveuglement un versement inconnu peut le doubler."""
        demande = self._approuve(acheteur, vendeur, operateur, approbateur)
        vendeur.set_momo_number(NUMERO_TIMEOUT, MomoOperator.MTN)
        vendeur.momo_changed_at = timezone.now() - timedelta(days=30)
        vendeur.save()
        demande = execute_payout(demande)

        with pytest.raises(IllegalTransition):
            demande.transition_to(PayoutRequest.Status.PROCESSING)

    def test_solde_marchand_insuffisant(
        self, acheteur, vendeur, operateur, approbateur,
    ):
        demande = self._approuve(acheteur, vendeur, operateur, approbateur)
        vendeur.set_momo_number(NUMERO_SOLDE, MomoOperator.MTN)
        vendeur.momo_changed_at = timezone.now() - timedelta(days=30)
        vendeur.save()

        demande = execute_payout(demande)
        assert demande.status == PayoutRequest.Status.FAILED
        assert demande.error_code == "ER301"

    def test_refroidissement_bloque_le_versement(
        self, acheteur, vendeur, operateur, approbateur,
    ):
        """
        Une urgence ne leve JAMAIS la protection contre le vecteur d'attaque
        principal : compromettre un compte, changer le numero, encaisser.
        """
        demande = self._approuve(acheteur, vendeur, operateur, approbateur)
        from apps.payments.payees.services import change_momo_number
        change_momo_number(vendeur, msisdn="237699887766",
                           operator=MomoOperator.ORANGE, reason="Changement")

        with pytest.raises(SettlementError, match="(?i)refroidissement"):
            execute_payout(demande)

    def test_versement_non_supprimable(
        self, acheteur, vendeur, operateur, approbateur,
    ):
        demande = self._approuve(acheteur, vendeur, operateur, approbateur)
        with pytest.raises(ValidationError):
            demande.delete()


# ═══════════════════════════════════════════════════════════════════════════
# REGLEMENT HORS CYCLE
# ═══════════════════════════════════════════════════════════════════════════

class TestReglementExceptionnel:

    def test_desactive_par_defaut(self, acheteur, vendeur, operateur):
        liberer(acheteur, vendeur)
        lot = confirm_batch(build_batch(
            vendeur, is_exceptional=True, exceptional_reason="Urgence",
        ))
        with pytest.raises(SettlementError, match="desactives"):
            request_payout(lot, requested_by=operateur)

    def test_justification_obligatoire(self, acheteur, vendeur, operateur):
        PayoutPolicy.objects.filter(config_key="payout-default").update(
            allow_exceptional_settlement=True,
        )
        liberer(acheteur, vendeur)
        lot = confirm_batch(build_batch(vendeur, is_exceptional=True))
        with pytest.raises(SettlementError, match="justification"):
            request_payout(lot, requested_by=operateur)

    def test_double_approbation_systematique(
        self, acheteur, vendeur, operateur, approbateur,
    ):
        """Quel que soit le montant, meme faible."""
        PayoutPolicy.objects.filter(config_key="payout-default").update(
            allow_exceptional_settlement=True,
        )
        liberer(acheteur, vendeur, montant=5000, cle="petit")
        lot = confirm_batch(build_batch(
            vendeur, is_exceptional=True, exceptional_reason="Urgence tresorerie",
        ))
        demande = request_payout(lot, requested_by=operateur)
        assert demande.required_approvals == 2

        demande = approve_payout(demande, approved_by=approbateur)
        assert demande.status == PayoutRequest.Status.PENDING_APPROVAL

    def test_plafond_respecte(self, acheteur, vendeur, operateur):
        PayoutPolicy.objects.filter(config_key="payout-default").update(
            allow_exceptional_settlement=True, exceptional_max_amount_xaf=10000,
        )
        liberer(acheteur, vendeur, montant=100000, cle="gros-exc")
        lot = confirm_batch(build_batch(
            vendeur, is_exceptional=True, exceptional_reason="Urgence",
        ))
        with pytest.raises(SettlementError, match="plafond"):
            request_payout(lot, requested_by=operateur)

    def test_quota_mensuel(
        self, acheteur, vendeur, operateur, approbateur,
    ):
        PayoutPolicy.objects.filter(config_key="payout-default").update(
            allow_exceptional_settlement=True, exceptional_max_per_month=1,
        )
        liberer(acheteur, vendeur, order_id=1, cle="e1")
        premier = confirm_batch(build_batch(
            vendeur, is_exceptional=True, exceptional_reason="Urgence 1",
        ))
        request_payout(premier, requested_by=operateur)

        liberer(acheteur, vendeur, order_id=2, cle="e2")
        second = confirm_batch(build_batch(
            vendeur, is_exceptional=True, exceptional_reason="Urgence 2",
        ))
        with pytest.raises(SettlementError, match="Quota mensuel"):
            request_payout(second, requested_by=operateur)

    def test_indicateur_de_part_exceptionnelle(self, acheteur, vendeur):
        """
        LE garde-fou reglementaire : le risque n'est pas UNE exception,
        c'est qu'elle devienne la norme.
        """
        liberer(acheteur, vendeur, order_id=1, cle="p1")
        build_batch(vendeur)
        liberer(acheteur, vendeur, order_id=2, cle="p2")
        build_batch(vendeur, is_exceptional=True, exceptional_reason="Urgence")

        part = exceptional_share()
        assert part["total_batches"] == 2
        assert part["exceptional_batches"] == 1
        assert part["share_by_count_percent"] == 50.0
        assert part["alert"] is True     # 50 % > seuil de 10 %


# ═══════════════════════════════════════════════════════════════════════════
# MONTANT DU — ce que le partenaire voit
# ═══════════════════════════════════════════════════════════════════════════

class TestMontantDu:

    def test_pas_de_solde_mais_un_montant_du(self, acheteur, vendeur):
        liberer(acheteur, vendeur)
        vue = amount_due(vendeur)
        assert vue["due_xaf"] == 38250
        assert vue["next_settlement_cycle"] == "cycle-weekly-friday"
        assert "blockers" in vue

    def test_les_fonds_non_exigibles_sont_distingues(self, acheteur, vendeur):
        """
        Un sequestre actif correspond a une commande vivante : ces fonds ne
        sont pas la propriete du partenaire et ne peuvent pas garantir une
        dette (§11.2).
        """
        intent = create_payment_intent(
            buyer=acheteur, idempotency_key="c-vivante",
            components=[ComponentInput(EconomicComponent.GOODS, Money(20000),
                                       order_id=7, commission_rate=Decimal("15"))],
            payee_codes={DomainPayeeType.VENDOR: vendeur.payee_code},
            payee_types={vendeur.payee_code: DomainPayeeType.VENDOR},
            payer_msisdn=NUMERO, payer_operator="MTN",
        )
        issue = initiate_collect(intent)
        poll_attempt(issue.attempt); poll_attempt(issue.attempt)

        vue = amount_due(vendeur)
        assert vue["due_xaf"] == 0
        assert vue["not_yet_due_xaf"] == 17000     # 20000 - 15 %

    def test_une_creance_reduit_le_montant_du(
        self, acheteur, vendeur, operateur, approbateur,
    ):
        liberer(acheteur, vendeur)
        dette = create_adjustment(
            payee=vendeur, direction=Adjustment.Direction.CREDIT,
            category=Adjustment.Category.PENALTY, amount_xaf=8000,
            reason="Penalite", created_by=operateur,
        )
        approve_adjustment(dette, approved_by=approbateur)

        vue = amount_due(vendeur)
        assert vue["outstanding_debt_xaf"] == 8000
        assert vue["due_xaf"] == 38250 - 8000


# ═══════════════════════════════════════════════════════════════════════════
# SCENARIO COMPLET
# ═══════════════════════════════════════════════════════════════════════════

class TestScenarioComplet:

    def test_de_l_encaissement_au_versement(
        self, acheteur, vendeur, operateur, approbateur,
    ):
        from apps.payments.ledger.balances import revenue_summary

        for i in range(3):
            liberer(acheteur, vendeur, montant=20000, order_id=i + 1, cle=f"s{i}")

        penalite = create_adjustment(
            payee=vendeur, direction=Adjustment.Direction.CREDIT,
            category=Adjustment.Category.PENALTY, amount_xaf=5000,
            reason="Retard", created_by=operateur,
        )
        approve_adjustment(penalite, approved_by=approbateur)

        lot = confirm_batch(build_batch(vendeur))
        assert lot.gross_amount_xaf == 3 * 17000     # 20000 - 15 %
        assert lot.adjustments_xaf == -5000
        assert lot.net_amount_xaf == 46000

        demande = request_payout(lot, requested_by=operateur)
        demande = approve_payout(demande, approved_by=approbateur)
        demande = execute_payout(demande)

        assert demande.status == PayoutRequest.Status.PAID
        assert balance(coa.PAYABLE_VENDOR, payee_code=vendeur.payee_code) == 0
        assert balance(coa.ESCROW_LIABILITY) == 0
        assert trial_balance_total() == 0

        rapport = run_all()
        assert rapport["ok"], [(r.code, r.detail) for r in rapport["violations"]]