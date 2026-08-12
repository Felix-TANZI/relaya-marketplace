# backend/apps/payments/domain/state_machines.py
# Machines a etats du domaine financier.
#
# PRINCIPE : une transition NON DECLAREE est TOUJOURS refusee.
# Il n'existe aucun chemin implicite, aucun "on laisse passer si ca semble
# logique". Un etat financier qui glisse sans declaration est un bug qui
# deplace de l'argent reel.
#
# Ces tables sont la source de verite. La couche models/ les consomme,
# elle ne les redefinit jamais.

from __future__ import annotations

from dataclasses import dataclass
from typing import Mapping

from .enums import (
    EscrowHoldStatus as EH,
    PaymentIntentStatus as PI,
    PayoutStatus as PO,
    SettlementBatchStatus as SB,
)
from .exceptions import IllegalTransition, TerminalState


@dataclass(frozen=True)
class StateMachine:
    """Machine a etats immuable, definie par sa table de transitions."""

    name: str
    transitions: Mapping[str, frozenset]
    terminal: frozenset

    def allowed_from(self, current) -> frozenset:
        return self.transitions.get(current, frozenset())

    def can(self, current, target) -> bool:
        return target in self.allowed_from(current)

    def assert_transition(self, current, target) -> None:
        """Leve IllegalTransition si la transition n'est pas declaree."""
        if current in self.terminal:
            raise TerminalState(
                f"[{self.name}] {current} est un etat terminal : "
                f"aucune transition possible (tentative vers {target})."
            )
        if not self.can(current, target):
            raise IllegalTransition(
                self.name, str(current), str(target),
                sorted(str(s) for s in self.allowed_from(current)),
            )

    def is_terminal(self, state) -> bool:
        return state in self.terminal

    def all_states(self) -> frozenset:
        states = set(self.transitions.keys()) | set(self.terminal)
        for targets in self.transitions.values():
            states |= set(targets)
        return frozenset(states)


# ── Intention de paiement ────────────────────────────────────────────────────

PAYMENT_INTENT = StateMachine(
    name="PaymentIntent",
    transitions={
        PI.DRAFT: frozenset({PI.REQUIRES_ACTION, PI.CANCELLED, PI.EXPIRED}),
        PI.REQUIRES_ACTION: frozenset({PI.PROCESSING, PI.CANCELLED, PI.EXPIRED, PI.FAILED}),
        PI.PROCESSING: frozenset({PI.SUCCEEDED, PI.FAILED, PI.EXPIRED}),
        PI.SUCCEEDED: frozenset({PI.PARTIALLY_REFUNDED, PI.REFUNDED}),
        PI.PARTIALLY_REFUNDED: frozenset({PI.PARTIALLY_REFUNDED, PI.REFUNDED}),
    },
    terminal=frozenset({PI.FAILED, PI.EXPIRED, PI.CANCELLED, PI.REFUNDED}),
)


# ── Sequestre ────────────────────────────────────────────────────────────────
#
# Note : FROZEN peut revenir a HELD (litige rejete) — c'est volontaire.
# Un litige tranche en faveur du partenaire remet le sequestre dans son
# cycle normal, il ne le detruit pas.

ESCROW_HOLD = StateMachine(
    name="EscrowHold",
    transitions={
        EH.PENDING: frozenset({EH.HELD, EH.CANCELLED}),
        EH.HELD: frozenset({EH.RELEASE_SCHEDULED, EH.FROZEN, EH.CANCELLED}),
        EH.RELEASE_SCHEDULED: frozenset({EH.RELEASED, EH.FROZEN}),
        EH.FROZEN: frozenset({EH.HELD, EH.REFUNDED, EH.PARTIALLY_REFUNDED, EH.RELEASE_SCHEDULED}),
        EH.PARTIALLY_REFUNDED: frozenset({EH.RELEASE_SCHEDULED, EH.RELEASED, EH.FROZEN}),
    },
    terminal=frozenset({EH.RELEASED, EH.REFUNDED, EH.CANCELLED}),
)


# ── Versement ────────────────────────────────────────────────────────────────
#
# UNKNOWN est le coeur de la surete des sorties d'argent : sur un timeout
# reseau pendant /withdraw/, on NE SAIT PAS si l'argent est parti.
# Le seul comportement sur est de ne rien conclure et de geler.
# UNKNOWN ne mene qu'a PAID ou FAILED, et UNIQUEMENT apres reconciliation.
# Il n'existe aucun chemin UNKNOWN -> PROCESSING : retenter aveuglement
# un versement dont l'issue est inconnue peut doubler un paiement.

PAYOUT = StateMachine(
    name="PayoutRequest",
    transitions={
        PO.DRAFT: frozenset({PO.PENDING_APPROVAL, PO.CANCELLED}),
        PO.PENDING_APPROVAL: frozenset({PO.APPROVED, PO.REJECTED, PO.CANCELLED}),
        PO.APPROVED: frozenset({PO.PROCESSING, PO.CANCELLED}),
        PO.PROCESSING: frozenset({PO.PAID, PO.FAILED, PO.UNKNOWN}),
        PO.UNKNOWN: frozenset({PO.PAID, PO.FAILED}),
        PO.FAILED: frozenset({PO.PENDING_APPROVAL}),
        PO.PAID: frozenset({PO.REVERSED}),
    },
    terminal=frozenset({PO.REJECTED, PO.CANCELLED, PO.REVERSED}),
)


# ── Lot de reglement ─────────────────────────────────────────────────────────

SETTLEMENT_BATCH = StateMachine(
    name="SettlementBatch",
    transitions={
        SB.DRAFT: frozenset({SB.CONFIRMED}),
        SB.CONFIRMED: frozenset({SB.PENDING_APPROVAL, SB.DRAFT}),
        SB.PENDING_APPROVAL: frozenset({SB.APPROVED, SB.CONFIRMED}),
        SB.APPROVED: frozenset({SB.PROCESSING}),
        SB.PROCESSING: frozenset({SB.PAID, SB.FAILED, SB.PARTIAL}),
        SB.FAILED: frozenset({SB.PENDING_APPROVAL}),
        SB.PARTIAL: frozenset({SB.PENDING_APPROVAL, SB.PAID}),
    },
    terminal=frozenset({SB.PAID}),
)


#: Registre pour introspection et tests.
MACHINES = {
    m.name: m
    for m in (PAYMENT_INTENT, ESCROW_HOLD, PAYOUT, SETTLEMENT_BATCH)
}


def assert_transition(machine_name: str, current, target) -> None:
    """Raccourci : assert_transition('EscrowHold', EH.HELD, EH.RELEASED)."""
    MACHINES[machine_name].assert_transition(current, target)