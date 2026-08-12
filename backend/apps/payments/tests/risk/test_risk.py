# backend/apps/payments/tests/risk/test_risk.py
# Tests de la detection du risque et du Trust Score.
#
#   docker exec -it relaya_backend pytest apps/payments/tests/risk/ -q
#
# Deux tests portent l'essentiel de la philosophie du lot :
#   test_le_payeur_tiers_ne_declenche_pas_de_revue
#   test_un_score_eleve_ne_bloque_pas_par_defaut

from datetime import timedelta
from decimal import Decimal

import pytest
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.utils import timezone

from apps.payments.application.collect import (
    create_payment_intent, initiate_collect, poll_attempt,
)
from apps.payments.config.models import (
    DistributionRule, EscrowPolicy, FeeRule, PayoutPolicy, ProviderConfig,
    RiskPolicy,
)
from apps.payments.domain.distribution import ComponentInput
from apps.payments.domain.enums import EconomicComponent, PayeeType as DomainPayeeType
from apps.payments.domain.money import Money
from apps.payments.escrow.models import EscrowHold
from apps.payments.infrastructure.providers.mock import reset_mock_state
from apps.payments.intents.models import PaymentIntent
from apps.payments.ledger import chart_of_accounts as coa
from apps.payments.ledger.models import LedgerAccount
from apps.payments.payees.models import MomoOperator, PayeeType
from apps.payments.payees.services import change_momo_number, create_payee
from apps.payments.risk.models import RiskAssessment, RiskSignal, TrustScore
from apps.payments.risk.services import (
    assess_intent, assess_payout, compute_trust_score,
    recompute_all_trust_scores, trust_adjustment_needs_review,
)

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
    ProviderConfig.objects.create(
        config_key="provider-mock", provider_code="MOCK",
        mode=ProviderConfig.Mode.SANDBOX, is_enabled=True, priority=10,
        supported_operators=["MTN", "ORANGE"],
        min_amount_xaf=100, max_amount_xaf=100_000_000)
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
    RiskPolicy.objects.create(
        config_key="risk-default", name="Politique par defaut",
        shared_msisdn_payee_threshold=2, shared_msisdn_buyer_threshold=5,
        shared_msisdn_window_days=30, velocity_intents_per_hour=10,
        velocity_failed_attempts=5,
        amount_anomaly_multiplier=Decimal("5.00"),
        amount_review_threshold_xaf=500_000, momo_change_lookback_days=7,
        weight_shared_msisdn=40, weight_velocity=20, weight_amount=15,
        weight_new_payer=5, weight_momo_change=50, weight_failed_burst=10,
        review_score_threshold=50, block_score_threshold=90,
        auto_block_enabled=False, trust_initial_score=70,
        trust_dispute_penalty=10, trust_late_penalty=5,
        trust_success_bonus=1, trust_window_days=90,
        trust_adjustment_review_xaf=50_000, priority=0)


@pytest.fixture
def acheteur():
    return User.objects.create_user("acheteur", "a@b.cm", "x")


@pytest.fixture
def vendeur():
    compte = create_payee(payee_type=PayeeType.VENDOR, display_label="V",
                          momo_operator=MomoOperator.MTN, momo_number=NUMERO)
    compte.kyc_status = "VERIFIED"
    compte.momo_changed_at = timezone.now() - timedelta(days=60)
    compte.save()
    return compte


def creer_intention(acheteur, vendeur, *, montant=20000, msisdn=NUMERO,
                    cle="c1", order_id=1):
    return create_payment_intent(
        buyer=acheteur, idempotency_key=cle,
        components=[ComponentInput(EconomicComponent.GOODS, Money(montant),
                                   order_id=order_id,
                                   commission_rate=Decimal("15"))],
        payee_codes={DomainPayeeType.VENDOR: vendeur.payee_code},
        payee_types={vendeur.payee_code: DomainPayeeType.VENDOR},
        payer_msisdn=msisdn, payer_operator="MTN")


# ═══════════════════════════════════════════════════════════════════════════
# LA PHILOSOPHIE DU LOT
# ═══════════════════════════════════════════════════════════════════════════

class TestPhilosophie:

    def test_le_payeur_tiers_ne_declenche_pas_de_revue(self, acheteur, vendeur):
        """
        LE TEST QUI PROTEGE LE SEGMENT DIASPORA.

        Payer pour un proche est le cas NOMINAL. Un premier paiement par un
        tiers ne doit jamais, a lui seul, declencher une revue manuelle.
        Bloquer ce comportement detruirait le segment le plus rentable pour
        prevenir une fraude marginale.
        """
        intent = creer_intention(acheteur, vendeur, msisdn="237655000111")
        assert intent.payer_relationship == PaymentIntent.Relationship.THIRD_PARTY

        evaluation = assess_intent(intent)
        assert evaluation.decision == RiskAssessment.Decision.ALLOW
        assert evaluation.score < 50

        signal = evaluation.signals.get(
            kind=RiskSignal.Kind.NEW_THIRD_PARTY_PAYER)
        assert signal.severity == RiskSignal.Severity.INFO
        assert signal.weight <= 10        # poids volontairement faible

    def test_un_score_eleve_ne_bloque_pas_par_defaut(self, acheteur, vendeur):
        """
        Le blocage automatique est DESACTIVE par defaut.

        Un faux positif coute un CLIENT ; le laisser passer coute une
        TRANSACTION. Les deux couts ne sont pas du meme ordre.
        """
        for i in range(7):
            autre = User.objects.create_user(f"ach{i}", f"a{i}@b.cm", "x")
            creer_intention(autre, vendeur, msisdn="237699888777",
                            cle=f"partage-{i}", order_id=100 + i)
        intent = creer_intention(acheteur, vendeur, msisdn="237699888777",
                                 montant=900_000, cle="gros")

        evaluation = assess_intent(intent)
        assert evaluation.score >= 50
        assert evaluation.decision != RiskAssessment.Decision.BLOCK

    def test_le_blocage_s_active_par_configuration(self, acheteur, vendeur):
        RiskPolicy.objects.filter(config_key="risk-default").update(
            auto_block_enabled=True, block_score_threshold=30)
        for i in range(7):
            autre = User.objects.create_user(f"b{i}", f"b{i}@b.cm", "x")
            creer_intention(autre, vendeur, msisdn="237699888777",
                            cle=f"bloc-{i}", order_id=200 + i)
        intent = creer_intention(acheteur, vendeur, msisdn="237699888777",
                                 cle="bloque")
        assert assess_intent(intent).decision == RiskAssessment.Decision.BLOCK

    def test_une_decision_humaine_prime(self, acheteur, vendeur):
        operateur = User.objects.create_user("op", "op@b.cm", "x")
        intent = creer_intention(acheteur, vendeur, montant=900_000)
        evaluation = assess_intent(intent)
        evaluation.override(
            decision=RiskAssessment.Decision.ALLOW,
            reason="Client connu, verifie par telephone.", user=operateur)
        evaluation.refresh_from_db()
        assert evaluation.decision == RiskAssessment.Decision.ALLOW
        assert evaluation.overridden_by == operateur

    def test_une_decision_humaine_exige_une_justification(self, acheteur, vendeur):
        operateur = User.objects.create_user("op2", "op2@b.cm", "x")
        evaluation = assess_intent(creer_intention(acheteur, vendeur))
        with pytest.raises(ValidationError):
            evaluation.override(decision=RiskAssessment.Decision.ALLOW,
                                reason="  ", user=operateur)


# ═══════════════════════════════════════════════════════════════════════════
# SIGNAUX
# ═══════════════════════════════════════════════════════════════════════════

class TestSignaux:

    def test_numero_finançant_trop_d_acheteurs(self, acheteur, vendeur):
        """
        LE signal discriminant d'une mule financiere : pas « un tiers paie »,
        mais un MEME NUMERO servant un nombre anormal de comptes.
        """
        for i in range(7):
            autre = User.objects.create_user(f"m{i}", f"m{i}@b.cm", "x")
            creer_intention(autre, vendeur, msisdn="237699111222",
                            cle=f"mule-{i}", order_id=300 + i)
        intent = creer_intention(acheteur, vendeur, msisdn="237699111222",
                                 cle="mule-final")

        evaluation = assess_intent(intent)
        signal = evaluation.signals.get(
            kind=RiskSignal.Kind.SHARED_MSISDN_BUYER)
        assert signal.severity == RiskSignal.Severity.HIGH
        assert signal.evidence["distinct_buyers"] >= 7

    def test_un_numero_servant_peu_d_acheteurs_ne_signale_rien(
        self, acheteur, vendeur,
    ):
        """Un numero diaspora finance legitimement 2 ou 3 proches."""
        for i in range(2):
            autre = User.objects.create_user(f"f{i}", f"f{i}@b.cm", "x")
            creer_intention(autre, vendeur, msisdn="237699333444",
                            cle=f"famille-{i}", order_id=400 + i)
        intent = creer_intention(acheteur, vendeur, msisdn="237699333444",
                                 cle="famille-final")
        evaluation = assess_intent(intent)
        assert not evaluation.signals.filter(
            kind=RiskSignal.Kind.SHARED_MSISDN_BUYER).exists()

    def test_cadence_anormale(self, acheteur, vendeur):
        for i in range(12):
            creer_intention(acheteur, vendeur, cle=f"rapide-{i}",
                            order_id=500 + i)
        intent = creer_intention(acheteur, vendeur, cle="rapide-final")
        assert assess_intent(intent).signals.filter(
            kind=RiskSignal.Kind.VELOCITY).exists()

    def test_montant_eleve(self, acheteur, vendeur):
        intent = creer_intention(acheteur, vendeur, montant=800_000)
        assert assess_intent(intent).signals.filter(
            kind=RiskSignal.Kind.LARGE_AMOUNT).exists()

    def test_montant_anormal_par_rapport_a_l_historique(self, acheteur, vendeur):
        for i in range(3):
            intent = creer_intention(acheteur, vendeur, montant=10000,
                                     cle=f"petit-{i}", order_id=600 + i)
            issue = initiate_collect(intent)
            poll_attempt(issue.attempt)
            poll_attempt(issue.attempt)

        gros = creer_intention(acheteur, vendeur, montant=200_000, cle="anomalie")
        assert assess_intent(gros).signals.filter(
            kind=RiskSignal.Kind.AMOUNT_ANOMALY).exists()

    def test_intention_saine_sans_signal(self, acheteur, vendeur):
        intent = creer_intention(acheteur, vendeur, montant=20000)
        evaluation = assess_intent(intent)
        assert evaluation.decision == RiskAssessment.Decision.ALLOW
        assert evaluation.score < 20


# ═══════════════════════════════════════════════════════════════════════════
# VERSEMENTS
# ═══════════════════════════════════════════════════════════════════════════

class TestVersements:

    def _demande(self, vendeur, montant=20000):
        from apps.payments.settlements.models import PayoutRequest
        operateur = User.objects.create_user(
            f"req{vendeur.pk.hex[:6]}", "r@b.cm", "x")
        return PayoutRequest.objects.create(
            payee=vendeur, amount_xaf=montant,
            payee_msisdn_masked=vendeur.momo_number_masked,
            payee_operator=vendeur.momo_operator, requested_by=operateur)

    def test_numero_partage_entre_beneficiaires(self, vendeur):
        """
        Signal BIEN PLUS FORT que du cote acheteur : aucune raison legitime
        ne justifie que deux vendeurs soient payes sur le meme numero.
        """
        create_payee(payee_type=PayeeType.RELAY_POINT, display_label="Relais",
                     momo_operator=MomoOperator.MTN, momo_number=NUMERO)
        evaluation = assess_payout(self._demande(vendeur))
        signal = evaluation.signals.get(
            kind=RiskSignal.Kind.SHARED_MSISDN_PAYEE)
        assert signal.severity == RiskSignal.Severity.HIGH
        assert signal.evidence["shared_count"] >= 2

    def test_changement_recent_de_numero(self, vendeur):
        """
        Le scenario du compte compromis. Le refroidissement du Lot 4 bloque
        deja le versement ; ce signal le rend VISIBLE a l'approbateur.
        """
        change_momo_number(vendeur, msisdn="237699887766",
                           operator=MomoOperator.ORANGE, reason="Changement")
        evaluation = assess_payout(self._demande(vendeur))
        signal = evaluation.signals.get(
            kind=RiskSignal.Kind.RECENT_MOMO_CHANGE)
        assert signal.severity == RiskSignal.Severity.HIGH
        # Le poids atteint A LUI SEUL le seuil de revue : la fenetre qui
        # compte est celle ou le refroidissement a expire mais ou le
        # changement reste recent.
        assert evaluation.decision == RiskAssessment.Decision.REVIEW

    def test_kyc_incomplet(self):
        compte = create_payee(payee_type=PayeeType.VENDOR, display_label="X",
                              momo_operator=MomoOperator.MTN,
                              momo_number="237699000999")
        evaluation = assess_payout(self._demande(compte))
        assert evaluation.signals.filter(
            kind=RiskSignal.Kind.KYC_INCOMPLETE).exists()


# ═══════════════════════════════════════════════════════════════════════════
# TRUST SCORE
# ═══════════════════════════════════════════════════════════════════════════

class TestTrustScore:

    def test_score_initial(self, vendeur):
        score = compute_trust_score(vendeur)
        assert score.score == 70
        assert score.previous_score is None
        assert score.delta == 0

    def test_les_litiges_penalisent(self, acheteur, vendeur):
        from apps.payments.bridge import events_in

        for i in range(2):
            intent = creer_intention(acheteur, vendeur, cle=f"lit-{i}",
                                     order_id=700 + i)
            issue = initiate_collect(intent)
            poll_attempt(issue.attempt)
            poll_attempt(issue.attempt)
            events_in.dispute_opened(order_id=700 + i, reason="Defectueux",
                                     event_id=f"d{i}")

        score = compute_trust_score(vendeur)
        assert score.disputes_count == 2
        assert score.score < 70
        assert score.breakdown["disputes"] == -20

    def test_l_historique_est_conserve(self, vendeur):
        premier = compute_trust_score(vendeur)
        second = compute_trust_score(vendeur)
        assert TrustScore.objects.filter(payee=vendeur).count() == 2
        assert second.previous_score == premier.score

    def test_score_non_supprimable(self, vendeur):
        score = compute_trust_score(vendeur)
        with pytest.raises(ValidationError):
            score.delete()

    def test_le_retard_n_est_pas_calcule_ici(self, vendeur):
        """
        PRINCIPE P9 : le domaine financier ne juge pas les faits metier.
        Un retard de livraison est constate par le domaine LIVRAISON, selon
        ses propres regles — delai contractuel, jours ouvres, force majeure.
        """
        assert compute_trust_score(vendeur).late_count == 0

    def test_recalcul_global(self, vendeur):
        create_payee(payee_type=PayeeType.DELIVERY_COMPANY,
                     display_label="Express", momo_operator=MomoOperator.MTN,
                     momo_number="237699555666")
        resultats = recompute_all_trust_scores()
        assert resultats["computed"] >= 2

    def test_un_ajustement_important_exige_une_revue(self):
        """
        Un bug de calcul applique en masse viderait des partenaires avant
        qu'on le detecte.
        """
        assert trust_adjustment_needs_review(100_000) is True
        assert trust_adjustment_needs_review(1_000) is False


# ═══════════════════════════════════════════════════════════════════════════
# TRACABILITE
# ═══════════════════════════════════════════════════════════════════════════

class TestTracabilite:

    def test_la_politique_est_figee_dans_l_evaluation(self, acheteur, vendeur):
        """
        Une evaluation reste lisible meme si les seuils changent ensuite :
        on doit pouvoir expliquer une decision passee.
        """
        evaluation = assess_intent(creer_intention(acheteur, vendeur))
        assert evaluation.policy_key == "risk-default"
        assert evaluation.policy_snapshot["review_score_threshold"] == "50"

        RiskPolicy.objects.filter(config_key="risk-default").update(
            review_score_threshold=10)
        evaluation.refresh_from_db()
        assert evaluation.policy_snapshot["review_score_threshold"] == "50"

    def test_evaluation_non_supprimable(self, acheteur, vendeur):
        evaluation = assess_intent(creer_intention(acheteur, vendeur))
        with pytest.raises(ValidationError):
            evaluation.delete()

    def test_signal_non_supprimable(self, acheteur, vendeur):
        evaluation = assess_intent(creer_intention(acheteur, vendeur,
                                                   montant=900_000))
        with pytest.raises(ValidationError):
            evaluation.signals.first().delete()

    def test_chaque_signal_porte_un_constat(self, acheteur, vendeur):
        evaluation = assess_intent(creer_intention(acheteur, vendeur,
                                                   montant=900_000))
        for signal in evaluation.signals.all():
            assert signal.detail, signal.kind