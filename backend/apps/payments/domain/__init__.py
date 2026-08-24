# backend/apps/payments/domain/__init__.py
# Domaine financier BelivaY — coeur pur.
#
# GARANTIE D'ISOLATION (principe P1) :
#   ce paquet n'importe NI Django, NI DRF, NI requests, NI aucune autre
#   application du projet. Il est testable sans base de donnees et sans
#   configuration Django.
#
#   Un test d'integration continue verifie cette propriete
#   (voir tests/domain/test_isolation.py).

from .enums import (
    AdjustmentCategory,
    AdjustmentDirection,
    Currency,
    DistributionBasis,
    EconomicComponent,
    EscrowHoldStatus,
    FeeBasis,
    FeeBearer,
    FeeScope,
    KycStatus,
    PayeeType,
    PayerRelationship,
    PaymentIntentStatus,
    PayoutStatus,
    ReleaseTrigger,
    Rounding,
    SettlementBatchStatus,
    DEFAULT_TRIGGER,
    ORDER_LEVEL_COMPONENTS,
    PAYMENT_LEVEL_COMPONENTS,
    PHASE1_PAYEE_TYPES,
)
from .exceptions import (
    ConservationViolation,
    CurrencyMismatch,
    DistributionError,
    DomainError,
    FeeError,
    FloatForbidden,
    IllegalTransition,
    IncompleteDistribution,
    InvalidFeeRule,
    MoneyError,
    NegativeAmount,
    NoApplicablePolicy,
    NoApplicableRule,
    PolicyError,
    StateError,
    TerminalState,
)
from .money import Money, assert_conservation, money_sum, to_decimal
from .state_machines import (
    ESCROW_HOLD,
    MACHINES,
    PAYMENT_INTENT,
    PAYOUT,
    SETTLEMENT_BATCH,
    StateMachine,
    assert_transition,
)
from .fees import (
    FeeContext,
    FeeResolution,
    FeeRuleSpec,
    FeeTier,
    RuleEvaluation,
    resolve_fee,
    split_fee,
)
from .distribution import (
    ComponentInput,
    DistributionPlan,
    DistributionRuleSpec,
    HoldPlan,
    build_distribution_plan,
    validate_rules_coverage,
)
from .policies import (
    EscrowPolicySpec,
    PolicyContext,
    ResolvedPolicy,
    resolve_policy,
)

__all__ = [
    # Monnaie
    "Money", "money_sum", "assert_conservation", "to_decimal",
    # Enums
    "Currency", "PayeeType", "KycStatus", "EconomicComponent", "ReleaseTrigger",
    "FeeScope", "FeeBasis", "FeeBearer", "Rounding", "DistributionBasis",
    "PaymentIntentStatus", "EscrowHoldStatus", "PayoutStatus",
    "SettlementBatchStatus", "PayerRelationship",
    "AdjustmentDirection", "AdjustmentCategory",
    "DEFAULT_TRIGGER", "ORDER_LEVEL_COMPONENTS", "PAYMENT_LEVEL_COMPONENTS",
    "PHASE1_PAYEE_TYPES",
    # Etats
    "StateMachine", "MACHINES", "assert_transition",
    "PAYMENT_INTENT", "ESCROW_HOLD", "PAYOUT", "SETTLEMENT_BATCH",
    # Frais
    "FeeRuleSpec", "FeeTier", "FeeContext", "FeeResolution", "RuleEvaluation",
    "resolve_fee", "split_fee",
    # Repartition
    "ComponentInput", "DistributionRuleSpec", "HoldPlan", "DistributionPlan",
    "build_distribution_plan", "validate_rules_coverage",
    # Politiques
    "EscrowPolicySpec", "PolicyContext", "ResolvedPolicy", "resolve_policy",
    # Exceptions
    "DomainError", "MoneyError", "FloatForbidden", "CurrencyMismatch",
    "NegativeAmount", "StateError", "IllegalTransition", "TerminalState",
    "FeeError", "NoApplicableRule", "InvalidFeeRule",
    "DistributionError", "IncompleteDistribution", "ConservationViolation",
    "PolicyError", "NoApplicablePolicy",
]