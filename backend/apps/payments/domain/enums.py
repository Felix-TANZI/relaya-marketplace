# backend/apps/payments/domain/enums.py
# Enumerations du domaine financier.
#
# Ce sont des enums PYTHON, pas des TextChoices Django : le domaine doit
# rester importable sans Django. La couche models/ les reutilisera pour
# construire ses choices.

from enum import Enum


class StrEnum(str, Enum):
    """Enum dont les membres sont aussi des chaines (comparaison directe)."""

    def __str__(self) -> str:
        return self.value


# ── Devise ───────────────────────────────────────────────────────────────────

class Currency(StrEnum):
    """
    Phase 1 : XAF uniquement.

    Le franc CFA n'a PAS de subdivision : 1 XAF est l'unite mineure.
    Les autres devises sont declarees pour que le domaine soit pret,
    mais aucune n'est activee en Phase 1.
    """
    XAF = "XAF"


# Nombre de decimales par devise. XAF = 0.
CURRENCY_EXPONENT = {
    Currency.XAF: 0,
}


# ── Acteurs ──────────────────────────────────────────────────────────────────

class PayeeType(StrEnum):
    VENDOR = "VENDOR"
    DELIVERY_COMPANY = "DELIVERY_COMPANY"
    RELAY_POINT = "RELAY_POINT"
    PLATFORM = "PLATFORM"
    BUYER = "BUYER"
    # Reserve Phase 2 — livreur independant.
    # Declare pour que le domaine soit complet, JAMAIS instancie en Phase 1.
    COURIER = "COURIER"


#: Types autorises a exister en Phase 1.
PHASE1_PAYEE_TYPES = frozenset({
    PayeeType.VENDOR,
    PayeeType.DELIVERY_COMPANY,
    PayeeType.RELAY_POINT,
    PayeeType.PLATFORM,
    PayeeType.BUYER,
})


class KycStatus(StrEnum):
    PENDING = "PENDING"
    VERIFIED = "VERIFIED"
    REJECTED = "REJECTED"
    SUSPENDED = "SUSPENDED"


# ── Composants economiques ───────────────────────────────────────────────────

class EconomicComponent(StrEnum):
    """
    Nature economique d'un montant sequestre.

    Le declencheur de liberation depend du COMPOSANT, pas du beneficiaire.
    C'est ce qui permet a un meme partenaire (un Grand Centre a la fois
    micro-hub et point de retrait) d'avoir deux sequestres aux cycles
    independants sur un meme paiement.
    """
    GOODS = "GOODS"                    # niveau commande — vendeur
    TRANSPORT = "TRANSPORT"            # niveau paiement — entreprise de livraison
    RELAY_HANDLING = "RELAY_HANDLING"  # niveau commande — point relais


#: Composants rattaches a une commande. TRANSPORT est de niveau paiement
#: (les frais de livraison sont mutualises sur le panier), donc order_id nul.
ORDER_LEVEL_COMPONENTS = frozenset({
    EconomicComponent.GOODS,
    EconomicComponent.RELAY_HANDLING,
})

PAYMENT_LEVEL_COMPONENTS = frozenset({
    EconomicComponent.TRANSPORT,
})


class ReleaseTrigger(StrEnum):
    """Evenement metier qui autorise la liberation d'un sequestre."""
    BUYER_RECEIPT_CONFIRMED = "BUYER_RECEIPT_CONFIRMED"
    AUTO_CONFIRMED = "AUTO_CONFIRMED"
    DELIVERY_PROOF_VALIDATED = "DELIVERY_PROOF_VALIDATED"
    RELAY_HANDOVER_SCANNED = "RELAY_HANDOVER_SCANNED"


#: Declencheur par defaut de chaque composant.
DEFAULT_TRIGGER = {
    EconomicComponent.GOODS: ReleaseTrigger.BUYER_RECEIPT_CONFIRMED,
    EconomicComponent.TRANSPORT: ReleaseTrigger.DELIVERY_PROOF_VALIDATED,
    EconomicComponent.RELAY_HANDLING: ReleaseTrigger.RELAY_HANDOVER_SCANNED,
}


# ── Frais ────────────────────────────────────────────────────────────────────

class FeeScope(StrEnum):
    COLLECT = "COLLECT"        # encaissement acheteur
    PAYOUT = "PAYOUT"          # versement partenaire
    REFUND = "REFUND"          # remboursement
    SETTLEMENT = "SETTLEMENT"  # frais de service sur un lot de reglement


class FeeBasis(StrEnum):
    PERCENT = "PERCENT"
    FIXED = "FIXED"
    TIERED = "TIERED"


class FeeBearer(StrEnum):
    """
    Qui supporte le frais.

    Referentiel : les frais PSP sont portes par la PLATEFORME, et aucun
    frais de retrait n'est facture aux partenaires. Mais rien n'est fige
    dans le code : c'est une valeur de configuration (principe P2).
    """
    BUYER = "BUYER"
    VENDOR = "VENDOR"
    DELIVERY_COMPANY = "DELIVERY_COMPANY"
    RELAY_POINT = "RELAY_POINT"
    PLATFORM = "PLATFORM"
    SPLIT = "SPLIT"


class Rounding(StrEnum):
    UP = "UP"
    DOWN = "DOWN"
    HALF_UP = "HALF_UP"


class DistributionBasis(StrEnum):
    PERCENT_OF_COMPONENT = "PERCENT_OF_COMPONENT"
    FIXED = "FIXED"
    REMAINDER = "REMAINDER"


# ── Etats ────────────────────────────────────────────────────────────────────

class PaymentIntentStatus(StrEnum):
    DRAFT = "DRAFT"
    REQUIRES_ACTION = "REQUIRES_ACTION"
    PROCESSING = "PROCESSING"
    SUCCEEDED = "SUCCEEDED"
    FAILED = "FAILED"
    EXPIRED = "EXPIRED"
    CANCELLED = "CANCELLED"
    PARTIALLY_REFUNDED = "PARTIALLY_REFUNDED"
    REFUNDED = "REFUNDED"


class EscrowHoldStatus(StrEnum):
    PENDING = "PENDING"
    HELD = "HELD"
    RELEASE_SCHEDULED = "RELEASE_SCHEDULED"
    RELEASED = "RELEASED"
    FROZEN = "FROZEN"
    REFUNDED = "REFUNDED"
    PARTIALLY_REFUNDED = "PARTIALLY_REFUNDED"
    CANCELLED = "CANCELLED"


class PayoutStatus(StrEnum):
    DRAFT = "DRAFT"
    PENDING_APPROVAL = "PENDING_APPROVAL"
    APPROVED = "APPROVED"
    PROCESSING = "PROCESSING"
    PAID = "PAID"
    FAILED = "FAILED"
    UNKNOWN = "UNKNOWN"
    REJECTED = "REJECTED"
    CANCELLED = "CANCELLED"
    REVERSED = "REVERSED"


class SettlementBatchStatus(StrEnum):
    DRAFT = "DRAFT"
    CONFIRMED = "CONFIRMED"
    PENDING_APPROVAL = "PENDING_APPROVAL"
    APPROVED = "APPROVED"
    PROCESSING = "PROCESSING"
    PAID = "PAID"
    FAILED = "FAILED"
    PARTIAL = "PARTIAL"


class PayerRelationship(StrEnum):
    """
    L'acheteur n'est pas toujours le payeur.

    Au Cameroun, payer pour un proche est le cas NOMINAL du segment
    diaspora. Ce n'est pas un cas marginal a traiter comme suspect.
    """
    SELF = "SELF"
    THIRD_PARTY = "THIRD_PARTY"


class AdjustmentDirection(StrEnum):
    DEBIT = "DEBIT"    # BelivaY doit au partenaire
    CREDIT = "CREDIT"  # le partenaire doit a BelivaY


class AdjustmentCategory(StrEnum):
    PENALTY = "PENALTY"
    COMPENSATION = "COMPENSATION"
    CORRECTION = "CORRECTION"
    REBILLING = "REBILLING"
    GOODWILL = "GOODWILL"
    BONUS = "BONUS"
    TRUST_SCORE = "TRUST_SCORE"
    RETURN_COST = "RETURN_COST"