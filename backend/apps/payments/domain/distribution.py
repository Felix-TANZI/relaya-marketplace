# backend/apps/payments/domain/distribution.py
# Repartition d'un encaissement entre beneficiaires — pur, sans I/O.
#
# Produit un PLAN DE REPARTITION : la liste des sequestres a creer, le revenu
# plateforme, et la charge PSP. Le plan est fige (snapshot) a la creation de
# l'intention de paiement et n'est jamais recalcule ensuite.
#
# INVARIANT ABSOLU :
#   somme(sequestres bruts) + revenu plateforme = montant reparti
# Verifie a chaque construction. Une violation fait echouer la transaction
# plutot que de deplacer un montant errone.

from __future__ import annotations

from dataclasses import dataclass, field
from decimal import Decimal
from typing import Optional, Sequence

from .enums import (
    DistributionBasis,
    EconomicComponent,
    PayeeType,
    ReleaseTrigger,
    DEFAULT_TRIGGER,
    ORDER_LEVEL_COMPONENTS,
    PHASE1_PAYEE_TYPES,
)
from .exceptions import (
    ConservationViolation,
    DistributionError,
    IncompleteDistribution,
)
from .money import Money, assert_conservation, money_sum, to_decimal


@dataclass(frozen=True)
class DistributionRuleSpec:
    """Regle de repartition d'un composant economique."""
    rule_version_id: int
    name: str
    component: EconomicComponent
    payee_type: PayeeType
    basis: DistributionBasis
    value: Decimal = Decimal("0")
    priority: int = 0
    filter_delivery_mode: Optional[str] = None
    filter_city: Optional[str] = None


@dataclass(frozen=True)
class ComponentInput:
    """
    Un montant a repartir, avec son contexte.

    `order_id` est OBLIGATOIRE pour les composants de niveau commande
    (GOODS, RELAY_HANDLING) et INTERDIT pour TRANSPORT, qui est de niveau
    paiement — les frais de livraison sont mutualises sur le panier entier.
    """
    component: EconomicComponent
    amount: Money
    order_id: Optional[int] = None
    payee_code: Optional[str] = None       # beneficiaire principal identifie
    commission_rate: Decimal = Decimal("0")
    delivery_mode: Optional[str] = None
    city: Optional[str] = None

    def __post_init__(self):
        is_order_level = self.component in ORDER_LEVEL_COMPONENTS
        if is_order_level and self.order_id is None:
            raise DistributionError(
                f"Composant {self.component} est de niveau commande : "
                "order_id est obligatoire."
            )
        if not is_order_level and self.order_id is not None:
            raise DistributionError(
                f"Composant {self.component} est de niveau paiement : "
                "order_id doit rester nul (les frais sont mutualises sur le panier)."
            )
        self.amount.require_non_negative(f"montant du composant {self.component}")


@dataclass(frozen=True)
class HoldPlan:
    """Un sequestre a creer. Cle : (paiement x commande? x beneficiaire x composant)."""
    order_id: Optional[int]
    payee_code: str
    payee_type: PayeeType
    component: EconomicComponent
    gross: Money
    commission: Money
    net: Money
    release_trigger: ReleaseTrigger

    @property
    def key(self) -> tuple:
        return (self.order_id, self.payee_code, self.component)


@dataclass(frozen=True)
class DistributionPlan:
    """Plan complet, fige au moment de la creation de l'intention."""
    total_distributed: Money
    holds: tuple[HoldPlan, ...]
    platform_revenue: Money
    psp_cost: Money = field(default=None)  # type: ignore[assignment]
    trace: tuple[str, ...] = ()
    #: Regles ecartees faute de beneficiaire connu au moment du calcul.
    #: Leur part a ete absorbee par le reliquat. A REALLOUER quand le
    #: beneficiaire devient connu — voir `needs_reallocation`.
    unresolved_rules: tuple[dict, ...] = ()

    def total_gross(self) -> Money:
        return money_sum([h.gross for h in self.holds], self.total_distributed.currency)

    def total_net(self) -> Money:
        return money_sum([h.net for h in self.holds], self.total_distributed.currency)

    def holds_for(self, payee_code: str) -> tuple[HoldPlan, ...]:
        return tuple(h for h in self.holds if h.payee_code == payee_code)

    @property
    def needs_reallocation(self) -> bool:
        """
        Une part a-t-elle ete attribuee par defaut, faute de beneficiaire ?

        C'est le cas du transport au checkout : le transporteur n'est pas
        encore assigne, sa part revient provisoirement a la plateforme.
        Quand il sera connu, un ajustement devra lui transferer sa part.

        Ce drapeau existe pour que ce report soit VISIBLE plutot que
        silencieux.
        """
        return bool(self.unresolved_rules)

    def as_snapshot(self) -> dict:
        """Serialisation pour figer le plan en base (principe P3)."""
        return {
            "total_distributed": self.total_distributed.amount,
            "currency": str(self.total_distributed.currency),
            "platform_revenue": self.platform_revenue.amount,
            "unresolved_rules": list(self.unresolved_rules),
            "needs_reallocation": bool(self.unresolved_rules),
            "psp_cost": self.psp_cost.amount if self.psp_cost else 0,
            "holds": [
                {
                    "order_id": h.order_id,
                    "payee_code": h.payee_code,
                    "payee_type": str(h.payee_type),
                    "component": str(h.component),
                    "gross": h.gross.amount,
                    "commission": h.commission.amount,
                    "net": h.net.amount,
                    "release_trigger": str(h.release_trigger),
                }
                for h in self.holds
            ],
            "trace": list(self.trace),
        }


# ── Validation de configuration ──────────────────────────────────────────────

def validate_rules_coverage(
    component: EconomicComponent,
    rules: Sequence[DistributionRuleSpec],
) -> None:
    """
    Verifie que les regles couvrent EXACTEMENT 100 % du composant.

    Appele a l'ENREGISTREMENT de la configuration, pas a l'execution.
    On ne decouvre pas un trou de repartition en production : on refuse
    d'enregistrer une configuration incoherente.
    """
    applicable = [r for r in rules if r.component == component]
    if not applicable:
        raise IncompleteDistribution(
            f"Aucune regle de repartition pour le composant {component}."
        )

    has_remainder = any(r.basis == DistributionBasis.REMAINDER for r in applicable)
    percent_total = sum(
        to_decimal(r.value)
        for r in applicable
        if r.basis == DistributionBasis.PERCENT_OF_COMPONENT
    )

    if has_remainder:
        remainder_count = sum(
            1 for r in applicable if r.basis == DistributionBasis.REMAINDER
        )
        if remainder_count > 1:
            raise IncompleteDistribution(
                f"Composant {component} : {remainder_count} regles REMAINDER. "
                "Une seule est autorisee, sinon la repartition est ambigue."
            )
        if percent_total > Decimal("100"):
            raise IncompleteDistribution(
                f"Composant {component} : les pourcentages totalisent "
                f"{percent_total} %, il ne reste rien pour la regle REMAINDER."
            )
        return

    if percent_total != Decimal("100"):
        raise IncompleteDistribution(
            f"Composant {component} : les regles totalisent {percent_total} %, "
            "attendu exactement 100 %. Ajouter une regle REMAINDER ou corriger "
            "les pourcentages."
        )


# ── Construction du plan ─────────────────────────────────────────────────────

def _select_rules(
    component_input: ComponentInput,
    rules: Sequence[DistributionRuleSpec],
) -> list[DistributionRuleSpec]:
    """Regles applicables a ce composant, filtres appliques, triees."""
    selected = []
    for rule in rules:
        if rule.component != component_input.component:
            continue
        if rule.filter_delivery_mode is not None:
            if rule.filter_delivery_mode != component_input.delivery_mode:
                continue
        if rule.filter_city is not None:
            if rule.filter_city != component_input.city:
                continue
        selected.append(rule)
    return sorted(selected, key=lambda r: (-r.priority, r.rule_version_id))


def _is_resolvable(rule: DistributionRuleSpec, payee_codes: dict) -> bool:
    """
    Le beneficiaire de cette regle est-il connu pour cette transaction ?

    ─────────────────────────────────────────────────────────────────────────
    POURQUOI CETTE QUESTION SE POSE

    Au moment du CHECKOUT, aucun transporteur n'est encore assigne. Une
    regle « 70 % du transport a l'entreprise de livraison » n'a donc aucun
    beneficiaire a designer.

    Faire echouer tout le plan reviendrait a rendre IMPOSSIBLE tout paiement
    comportant des frais de livraison — ce qui est le cas nominal.
    ─────────────────────────────────────────────────────────────────────────
    """
    if rule.payee_type == PayeeType.PLATFORM:
        return True
    return payee_codes.get(rule.payee_type) is not None


def _resolve_payee_code(
    rule: DistributionRuleSpec,
    component_input: ComponentInput,
    payee_codes: dict,
) -> str:
    """
    Determine le beneficiaire concret d'une regle.

    `payee_codes` mappe un PayeeType vers un code concret pour cette
    transaction — ex. {PayeeType.VENDOR: "PAY-VND-000341"}.
    """
    if rule.payee_type == PayeeType.PLATFORM:
        return "PLATFORM"
    code = payee_codes.get(rule.payee_type)
    if code is None:
        raise DistributionError(
            f"Regle '{rule.name}' cible {rule.payee_type} mais aucun beneficiaire "
            f"de ce type n'est fourni pour le composant {component_input.component}."
        )
    return code


def build_distribution_plan(
    components: Sequence[ComponentInput],
    rules: Sequence[DistributionRuleSpec],
    payee_codes: dict,
    payee_types: dict,
) -> DistributionPlan:
    """
    Construit le plan de repartition complet.

    payee_codes : {PayeeType: "PAY-XXX-000000"} — beneficiaires concrets
    payee_types : {"PAY-XXX-000000": PayeeType} — type de chaque code

    La commission plateforme N'ENTRE JAMAIS en sequestre : elle est reconnue
    directement en produit. Le sequestre ne contient que le net partenaire.
    """
    if not components:
        raise DistributionError("Aucun composant a repartir.")

    currency = components[0].amount.currency
    holds: list[HoldPlan] = []
    unresolved: list[dict] = []
    platform_parts: list[Money] = []
    trace: list[str] = []

    for comp in components:
        if comp.amount.is_zero:
            trace.append(f"{comp.component}: montant nul, ignore")
            continue

        applicable = _select_rules(comp, rules)
        if not applicable:
            raise IncompleteDistribution(
                f"Aucune regle applicable au composant {comp.component} "
                f"(mode={comp.delivery_mode}, ville={comp.city})."
            )

        # ─────────────────────────────────────────────────────────────────
        # ECARTER LES REGLES SANS BENEFICIAIRE — avant tout calcul
        #
        # Une regle dont le beneficiaire n'est pas connu pour CETTE
        # transaction est retiree ici, et non au moment de la
        # materialisation : l'ecarter plus tard laisserait son montant
        # non attribue et casserait la conservation.
        #
        # La regle REMAINDER absorbe alors la part liberee, ce qui
        # garantit que 100 % du composant reste reparti.
        #
        # L'ecart est TRACE, jamais silencieux : un montant qui change de
        # destinataire doit rester explicable.
        # ─────────────────────────────────────────────────────────────────
        resolvables = [r for r in applicable if _is_resolvable(r, payee_codes)]
        for regle in applicable:
            if regle in resolvables:
                continue
            # Le MONTANT de la part ecartee est fige ICI, au moment du plan.
            # La reallocation utilisera ce chiffre, jamais un recalcul :
            # une modification de la regle ne doit pas changer ce qui est
            # du sur une transaction deja encaissee (principe P3).
            if regle.basis == DistributionBasis.PERCENT_OF_COMPONENT:
                part_ecartee = comp.amount.percent(regle.value).amount
            elif regle.basis == DistributionBasis.FIXED:
                part_ecartee = int(to_decimal(regle.value))
            else:
                part_ecartee = 0   # REMAINDER : la part depend du reste

            unresolved.append({
                "component": str(comp.component),
                "order_id": comp.order_id,
                "rule": regle.name,
                "payee_type": str(regle.payee_type),
                "amount_xaf": part_ecartee,
                "reason": (
                    f"Aucun beneficiaire de type {regle.payee_type} n'est "
                    "connu pour cette transaction."
                ),
            })
            trace.append(
                f"{comp.component}: regle '{regle.name}' ECARTEE — aucun "
                f"beneficiaire {regle.payee_type} connu. La part revient au "
                "reliquat."
            )

        if not resolvables:
            raise IncompleteDistribution(
                f"Composant {comp.component} : aucune regle ne designe un "
                "beneficiaire connu. Une regle REMAINDER vers PLATFORM est "
                "necessaire pour couvrir ce cas."
            )
        applicable = resolvables

        # Repartition brute selon les regles
        allocated: list[tuple[DistributionRuleSpec, Money]] = []
        running = Money.zero(currency)

        for rule in applicable:
            if rule.basis == DistributionBasis.PERCENT_OF_COMPONENT:
                part = comp.amount.percent(rule.value)
            elif rule.basis == DistributionBasis.FIXED:
                part = Money(int(to_decimal(rule.value)), currency)
            elif rule.basis == DistributionBasis.REMAINDER:
                part = None  # calcule apres
            else:
                raise DistributionError(f"Base de repartition inconnue : {rule.basis}")

            if part is not None:
                running = running + part
                allocated.append((rule, part))
            else:
                allocated.append((rule, None))  # type: ignore[arg-type]

        # La regle REMAINDER absorbe exactement le reste — garantit la conservation
        remainder = comp.amount - running
        if remainder.is_negative:
            raise ConservationViolation(
                f"Composant {comp.component} : les regles attribuent "
                f"{running.amount}, soit plus que le montant disponible "
                f"({comp.amount.amount})."
            )

        final: list[tuple[DistributionRuleSpec, Money]] = []
        remainder_used = False
        for rule, part in allocated:
            if part is None:
                final.append((rule, remainder))
                remainder_used = True
            else:
                final.append((rule, part))

        if not remainder_used and not remainder.is_zero:
            raise IncompleteDistribution(
                f"Composant {comp.component} : {remainder.amount} non attribue "
                "et aucune regle REMAINDER. Configuration incomplete."
            )

        # Materialisation
        for rule, part in final:
            if part.is_zero:
                continue

            if rule.payee_type == PayeeType.PLATFORM:
                platform_parts.append(part)
                trace.append(
                    f"{comp.component}: {part.amount} -> PLATEFORME "
                    f"(regle '{rule.name}')"
                )
                continue

            if rule.payee_type not in PHASE1_PAYEE_TYPES:
                raise DistributionError(
                    f"Le type {rule.payee_type} n'est pas actif en Phase 1. "
                    f"Regle '{rule.name}'."
                )

            code = _resolve_payee_code(rule, comp, payee_codes)
            commission = part.percent(comp.commission_rate)
            net = part - commission
            net.require_non_negative(f"net beneficiaire {code}")

            # La commission sort du sequestre et devient un produit plateforme
            if not commission.is_zero:
                platform_parts.append(commission)

            holds.append(HoldPlan(
                order_id=comp.order_id,
                payee_code=code,
                payee_type=payee_types.get(code, rule.payee_type),
                component=comp.component,
                gross=part,
                commission=commission,
                net=net,
                release_trigger=DEFAULT_TRIGGER[comp.component],
            ))
            trace.append(
                f"{comp.component}: {part.amount} -> {code} "
                f"(net {net.amount}, commission {commission.amount}, "
                f"regle '{rule.name}')"
            )

    total_distributed = money_sum([c.amount for c in components], currency)
    platform_revenue = money_sum(platform_parts, currency)

    # Fusion des sequestres de meme cle — un partenaire peut recevoir deux
    # parts du meme composant sur la meme commande via deux regles distinctes.
    merged: dict[tuple, HoldPlan] = {}
    for hold in holds:
        existing = merged.get(hold.key)
        if existing is None:
            merged[hold.key] = hold
        else:
            merged[hold.key] = HoldPlan(
                order_id=existing.order_id,
                payee_code=existing.payee_code,
                payee_type=existing.payee_type,
                component=existing.component,
                gross=existing.gross + hold.gross,
                commission=existing.commission + hold.commission,
                net=existing.net + hold.net,
                release_trigger=existing.release_trigger,
            )
    final_holds = tuple(merged.values())

    # INVARIANT : brut des sequestres + revenu plateforme = total reparti
    check_parts = [h.gross for h in final_holds]
    platform_only = platform_revenue - money_sum(
        [h.commission for h in final_holds], currency
    )
    check_parts.append(platform_only)
    assert_conservation(total_distributed, check_parts)

    return DistributionPlan(
        total_distributed=total_distributed,
        holds=final_holds,
        platform_revenue=platform_revenue,
        psp_cost=Money.zero(currency),
        trace=tuple(trace),
        unresolved_rules=tuple(unresolved),
    )