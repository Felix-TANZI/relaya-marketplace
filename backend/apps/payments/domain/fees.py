# backend/apps/payments/domain/fees.py
# Moteur de resolution des frais — pur, sans I/O, sans ORM.
#
# Les regles arrivent sous forme de DONNEES (FeeRuleSpec), jamais d'objets
# Django. La couche config/ traduit ses modeles en specs et appelle ce moteur.
#
# Toute resolution produit une TRACE explicative : quelle regle a gagne,
# pourquoi les autres ont ete ecartees, comment le montant a ete calcule.
# Sans cette trace, impossible de justifier une commission a un partenaire
# qui la conteste, ni de deboguer une regle mal configuree.

from __future__ import annotations

from dataclasses import dataclass, field
from decimal import Decimal
from typing import Any, Optional, Sequence

from .enums import FeeBasis, FeeBearer, FeeScope, Rounding
from .exceptions import InvalidFeeRule, NoApplicableRule
from .money import Money, to_decimal

#: Bornes absolues d'un taux. Ce sont les SEULES valeurs en dur du moteur,
#: parce qu'elles relevent de la coherence mathematique et non du commerce.
ABSOLUTE_MIN_RATE = Decimal("0")
ABSOLUTE_MAX_RATE = Decimal("100")


@dataclass(frozen=True)
class FeeTier:
    """Palier : de `up_to` inclus, applique `value` selon la base."""
    up_to: Optional[int]  # None = palier terminal
    value: Decimal


@dataclass(frozen=True)
class FeeRuleSpec:
    """
    Representation immuable d'une regle de frais.

    `rule_version_id` reference une version FIGEE : les regles ne sont jamais
    modifiees, seulement versionnees. Un snapshot pointant vers une version
    pointe toujours vers le contenu reellement applique.
    """

    rule_version_id: int
    name: str
    scope: FeeScope
    basis: FeeBasis
    value: Decimal = Decimal("0")
    tiers: tuple[FeeTier, ...] = ()
    min_fee: Optional[int] = None
    max_fee: Optional[int] = None
    bearer: FeeBearer = FeeBearer.PLATFORM
    split_config: Optional[dict] = None
    rounding: Rounding = Rounding.HALF_UP
    priority: int = 0
    # Filtres : None = ne filtre pas
    filter_provider: Optional[str] = None
    filter_operator: Optional[str] = None
    filter_payee_type: Optional[str] = None
    filter_category: Optional[str] = None
    filter_certification_tier: Optional[str] = None
    filter_city: Optional[str] = None

    def validate(self) -> None:
        """Coherence structurelle. Appele a la configuration, pas a l'execution."""
        if self.basis == FeeBasis.PERCENT:
            rate = to_decimal(self.value)
            if rate < ABSOLUTE_MIN_RATE or rate > ABSOLUTE_MAX_RATE:
                raise InvalidFeeRule(
                    f"Regle '{self.name}' : taux {rate} hors bornes absolues "
                    f"[{ABSOLUTE_MIN_RATE}, {ABSOLUTE_MAX_RATE}]."
                )
        if self.basis == FeeBasis.TIERED and not self.tiers:
            raise InvalidFeeRule(f"Regle '{self.name}' : base TIERED sans paliers.")
        if self.min_fee is not None and self.max_fee is not None:
            if self.min_fee > self.max_fee:
                raise InvalidFeeRule(
                    f"Regle '{self.name}' : plancher {self.min_fee} "
                    f"superieur au plafond {self.max_fee}."
                )
        if self.bearer == FeeBearer.SPLIT and not self.split_config:
            raise InvalidFeeRule(f"Regle '{self.name}' : bearer SPLIT sans split_config.")


@dataclass(frozen=True)
class FeeContext:
    """Contexte d'evaluation. Chaque champ peut etre confronte a un filtre."""
    scope: FeeScope
    provider: Optional[str] = None
    operator: Optional[str] = None
    payee_type: Optional[str] = None
    category: Optional[str] = None
    certification_tier: Optional[str] = None
    city: Optional[str] = None


@dataclass(frozen=True)
class RuleEvaluation:
    """Trace d'evaluation d'une regle unique."""
    rule_version_id: int
    name: str
    priority: int
    matched: bool
    failed_on: Optional[str] = None
    matched_on: tuple[str, ...] = ()


@dataclass(frozen=True)
class FeeResolution:
    """Resultat complet d'une resolution, trace comprise."""
    fee: Money
    bearer: FeeBearer
    rule_version_id: int
    rule_name: str
    base: Money
    computed: dict = field(default_factory=dict)
    trace: tuple[RuleEvaluation, ...] = ()

    def explain(self) -> str:
        """Restitution lisible, utilisable en mediation de litige."""
        lines = [
            f"Frais applique : {self.fee.format()} (porte par {self.bearer})",
            f"Regle retenue : '{self.rule_name}' (version {self.rule_version_id})",
            f"Base de calcul : {self.base.format()}",
        ]
        if self.computed:
            details = ", ".join(f"{k}={v}" for k, v in self.computed.items())
            lines.append(f"Calcul : {details}")
        lines.append("Regles evaluees :")
        for ev in self.trace:
            if ev.matched:
                lines.append(f"  [RETENUE] '{ev.name}' (p{ev.priority}) — {', '.join(ev.matched_on)}")
            else:
                lines.append(f"  [ECARTEE] '{ev.name}' (p{ev.priority}) — {ev.failed_on}")
        return "\n".join(lines)


# ── Appariement ──────────────────────────────────────────────────────────────

_FILTERS = (
    ("filter_provider", "provider"),
    ("filter_operator", "operator"),
    ("filter_payee_type", "payee_type"),
    ("filter_category", "category"),
    ("filter_certification_tier", "certification_tier"),
    ("filter_city", "city"),
)


def _match(rule: FeeRuleSpec, ctx: FeeContext) -> tuple[bool, Optional[str], tuple[str, ...]]:
    """Retourne (correspond, motif_echec, criteres_valides)."""
    if rule.scope != ctx.scope:
        return False, f"scope : attendu {rule.scope}, contexte {ctx.scope}", ()

    matched_on = [f"scope={rule.scope}"]
    for rule_attr, ctx_attr in _FILTERS:
        expected = getattr(rule, rule_attr)
        if expected is None:
            continue  # filtre non pose : la regle est generique sur ce critere
        actual = getattr(ctx, ctx_attr)
        if expected != actual:
            return False, f"{rule_attr} : attendu {expected}, recu {actual}", ()
        matched_on.append(f"{ctx_attr}={actual}")

    return True, None, tuple(matched_on)


# ── Calcul ───────────────────────────────────────────────────────────────────

def _compute_raw(rule: FeeRuleSpec, base: Money) -> tuple[Money, dict]:
    if rule.basis == FeeBasis.FIXED:
        fee = Money(int(to_decimal(rule.value)), base.currency)
        return fee, {"basis": "FIXED", "value": str(rule.value)}

    if rule.basis == FeeBasis.PERCENT:
        fee = base.percent(rule.value, rule.rounding)
        return fee, {
            "basis": "PERCENT",
            "rate": str(rule.value),
            "rounding": str(rule.rounding),
        }

    if rule.basis == FeeBasis.TIERED:
        for tier in rule.tiers:
            if tier.up_to is None or base.amount <= tier.up_to:
                fee = base.percent(tier.value, rule.rounding)
                return fee, {
                    "basis": "TIERED",
                    "tier_up_to": str(tier.up_to),
                    "rate": str(tier.value),
                }
        raise InvalidFeeRule(
            f"Regle '{rule.name}' : aucun palier ne couvre {base.amount}. "
            "Le dernier palier doit avoir up_to=None."
        )

    raise InvalidFeeRule(f"Base de calcul inconnue : {rule.basis}")


def resolve_fee(
    base: Money,
    context: FeeContext,
    rules: Sequence[FeeRuleSpec],
) -> FeeResolution:
    """
    Resout le frais applicable a `base` dans `context`.

    Les regles sont evaluees par priorite DECROISSANTE ; la premiere qui
    correspond a tous ses filtres l'emporte. Une regle sans filtre est
    generique et sert de repli.

    Leve NoApplicableRule si aucune ne correspond — jamais de frais nul
    silencieux : l'absence de regle signale une configuration incomplete.
    """
    base.require_non_negative("base de calcul des frais")

    ordered = sorted(rules, key=lambda r: (-r.priority, r.rule_version_id))
    trace: list[RuleEvaluation] = []

    for rule in ordered:
        ok, reason, matched_on = _match(rule, context)
        if not ok:
            trace.append(RuleEvaluation(
                rule_version_id=rule.rule_version_id,
                name=rule.name,
                priority=rule.priority,
                matched=False,
                failed_on=reason,
            ))
            continue

        rule.validate()
        raw_fee, computed = _compute_raw(rule, base)

        floor = Money(rule.min_fee, base.currency) if rule.min_fee is not None else None
        ceiling = Money(rule.max_fee, base.currency) if rule.max_fee is not None else None
        fee = raw_fee.clamp(floor, ceiling)

        if fee.amount != raw_fee.amount:
            computed["raw"] = raw_fee.amount
            computed["clamped_to"] = fee.amount
        computed["fee"] = fee.amount
        computed["bearer"] = str(rule.bearer)

        trace.append(RuleEvaluation(
            rule_version_id=rule.rule_version_id,
            name=rule.name,
            priority=rule.priority,
            matched=True,
            matched_on=matched_on,
        ))

        return FeeResolution(
            fee=fee,
            bearer=rule.bearer,
            rule_version_id=rule.rule_version_id,
            rule_name=rule.name,
            base=base,
            computed=computed,
            trace=tuple(trace),
        )

    raise NoApplicableRule(
        f"Aucune regle de frais pour scope={context.scope}, "
        f"provider={context.provider}, operator={context.operator}, "
        f"payee_type={context.payee_type}. "
        f"{len(rules)} regle(s) evaluee(s), aucune correspondance. "
        "Configuration incomplete."
    )


def split_fee(resolution: FeeResolution) -> dict[str, Money]:
    """
    Ventile un frais porte par plusieurs parties (bearer=SPLIT).

    split_config : {"PLATFORM": 50, "VENDOR": 50} — poids relatifs.
    La conservation est garantie par Money.allocate.
    """
    if resolution.bearer != FeeBearer.SPLIT:
        return {str(resolution.bearer): resolution.fee}

    config = resolution.computed.get("split_config") or {}
    if not config:
        raise InvalidFeeRule(
            f"Regle '{resolution.rule_name}' : bearer SPLIT sans split_config exploitable."
        )
    keys = list(config.keys())
    parts = resolution.fee.allocate([config[k] for k in keys])
    return dict(zip(keys, parts))