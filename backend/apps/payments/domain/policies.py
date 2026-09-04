# backend/apps/payments/domain/policies.py
# Resolution des politiques de sequestre — pur, sans I/O.
#
# Determine, pour un sequestre donne, les delais applicables :
# auto-confirmation, liberation, fenetre de litige.
#
# Le resultat est FIGE (snapshot) a la creation du sequestre. Modifier une
# politique en admin n'affecte jamais un sequestre en cours (principe P3).

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Optional, Sequence

from .enums import EconomicComponent, PayeeType, ReleaseTrigger, DEFAULT_TRIGGER
from .exceptions import NoApplicablePolicy


@dataclass(frozen=True)
class EscrowPolicySpec:
    """Politique de sequestre. Aucun delai n'est code en dur (principe P2)."""

    policy_version_id: int
    name: str
    payee_type: Optional[PayeeType] = None
    component: Optional[EconomicComponent] = None
    auto_confirm_hours: int = 96
    release_delay_hours: int = 72
    dispute_window_days: int = 4
    vendor_reply_hours: int = 72
    release_trigger: Optional[ReleaseTrigger] = None
    priority: int = 0
    filter_category: Optional[str] = None
    filter_delivery_mode: Optional[str] = None
    filter_city: Optional[str] = None
    filter_certification_tier: Optional[str] = None


@dataclass(frozen=True)
class PolicyContext:
    payee_type: PayeeType
    component: EconomicComponent
    category: Optional[str] = None
    delivery_mode: Optional[str] = None
    city: Optional[str] = None
    certification_tier: Optional[str] = None


@dataclass(frozen=True)
class ResolvedPolicy:
    """Politique resolue, prete a etre figee."""

    policy_version_id: int
    policy_name: str
    auto_confirm_hours: int
    release_delay_hours: int
    dispute_window_days: int
    vendor_reply_hours: int
    release_trigger: ReleaseTrigger
    matched_on: tuple[str, ...] = ()

    def auto_confirm_at(self, delivered_at: datetime) -> datetime:
        return delivered_at + timedelta(hours=self.auto_confirm_hours)

    def release_at(self, confirmed_at: datetime) -> datetime:
        return confirmed_at + timedelta(hours=self.release_delay_hours)

    def dispute_window_ends_at(self, delivered_at: datetime) -> datetime:
        return delivered_at + timedelta(days=self.dispute_window_days)

    def vendor_reply_deadline(self, opened_at: datetime) -> datetime:
        return opened_at + timedelta(hours=self.vendor_reply_hours)

    def as_snapshot(self) -> dict:
        return {
            "policy_version_id": self.policy_version_id,
            "policy_name": self.policy_name,
            "auto_confirm_hours": self.auto_confirm_hours,
            "release_delay_hours": self.release_delay_hours,
            "dispute_window_days": self.dispute_window_days,
            "vendor_reply_hours": self.vendor_reply_hours,
            "release_trigger": str(self.release_trigger),
            "matched_on": list(self.matched_on),
        }


_FILTERS = (
    ("filter_category", "category"),
    ("filter_delivery_mode", "delivery_mode"),
    ("filter_city", "city"),
    ("filter_certification_tier", "certification_tier"),
)


def _match(policy: EscrowPolicySpec, ctx: PolicyContext) -> tuple[bool, tuple[str, ...]]:
    matched = []

    if policy.payee_type is not None:
        if policy.payee_type != ctx.payee_type:
            return False, ()
        matched.append(f"payee_type={ctx.payee_type}")

    if policy.component is not None:
        if policy.component != ctx.component:
            return False, ()
        matched.append(f"component={ctx.component}")

    for policy_attr, ctx_attr in _FILTERS:
        expected = getattr(policy, policy_attr)
        if expected is None:
            continue
        actual = getattr(ctx, ctx_attr)
        if expected != actual:
            return False, ()
        matched.append(f"{ctx_attr}={actual}")

    return True, tuple(matched) or ("generique",)


def resolve_policy(
    context: PolicyContext,
    policies: Sequence[EscrowPolicySpec],
) -> ResolvedPolicy:
    """
    Resout la politique applicable.

    Evaluation par priorite decroissante ; la premiere correspondance gagne.
    Une politique sans filtre est generique et sert de repli.

    Leve NoApplicablePolicy si aucune ne correspond. Pas de valeur par defaut
    silencieuse : un sequestre sans politique resolue signale une configuration
    incomplete, et laisser un delai implicite reviendrait a coder en dur ce que
    le principe P2 interdit.
    """
    ordered = sorted(policies, key=lambda p: (-p.priority, p.policy_version_id))

    for policy in ordered:
        ok, matched_on = _match(policy, context)
        if not ok:
            continue

        trigger = policy.release_trigger or DEFAULT_TRIGGER[context.component]

        return ResolvedPolicy(
            policy_version_id=policy.policy_version_id,
            policy_name=policy.name,
            auto_confirm_hours=policy.auto_confirm_hours,
            release_delay_hours=policy.release_delay_hours,
            dispute_window_days=policy.dispute_window_days,
            vendor_reply_hours=policy.vendor_reply_hours,
            release_trigger=trigger,
            matched_on=matched_on,
        )

    raise NoApplicablePolicy(
        f"Aucune politique d'escrow pour payee_type={context.payee_type}, "
        f"component={context.component}, category={context.category}. "
        f"{len(policies)} politique(s) evaluee(s). Configuration incomplete."
    )