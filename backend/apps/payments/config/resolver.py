# backend/apps/payments/config/resolver.py
# Pont entre la configuration Django et le domaine pur.
#
# Le domaine ne connait PAS l'ORM : il travaille sur des specs immuables.
# Ce module traduit les lignes de configuration en specs, puis delegue le
# calcul au domaine. Aucune logique metier ici — uniquement de la traduction.
#
# Toute resolution retourne une TRACE explicative, exploitable en mediation
# de litige comme en debogage d'une regle mal configuree.

from decimal import Decimal

from django.core.cache import cache

from apps.payments.domain import (
    ComponentInput,
    DistributionRuleSpec,
    EscrowPolicySpec,
    FeeContext,
    FeeRuleSpec,
    FeeScope,
    FeeTier,
    PolicyContext,
    build_distribution_plan,
    resolve_fee,
    resolve_policy,
    validate_rules_coverage,
)
from apps.payments.domain.enums import (
    DistributionBasis,
    EconomicComponent,
    FeeBasis,
    FeeBearer,
    PayeeType,
    Rounding,
)

from .models import DistributionRule, EscrowPolicy, FeeRule, ProviderConfig

CACHE_PREFIX = "belivay:payments:config"
CACHE_TTL = 300  # 5 minutes — une regle vient d'etre versionnee, pas modifiee


def invalidate_cache():
    """Appele apres toute application de changement de configuration."""
    for suffixe in ("fee_rules", "distribution_rules", "escrow_policies", "providers"):
        cache.delete(f"{CACHE_PREFIX}:{suffixe}")


def _opt(valeur):
    """Chaine vide -> None. Un filtre vide ne filtre pas."""
    return valeur or None


# ─────────────────────────────────────────────────────────────────────────────
# TRADUCTION MODELE -> SPEC
# ─────────────────────────────────────────────────────────────────────────────

def fee_rule_to_spec(regle: FeeRule) -> FeeRuleSpec:
    paliers = tuple(
        FeeTier(
            up_to=palier.get("up_to"),
            value=Decimal(str(palier.get("value", "0"))),
        )
        for palier in (regle.tiers or [])
    )
    return FeeRuleSpec(
        rule_version_id=regle.id,
        name=f"{regle.name} (v{regle.version})",
        scope=FeeScope(regle.scope),
        basis=FeeBasis(regle.basis),
        value=Decimal(str(regle.value)),
        tiers=paliers,
        min_fee=regle.min_fee_xaf,
        max_fee=regle.max_fee_xaf,
        bearer=FeeBearer(regle.bearer),
        split_config=regle.split_config or None,
        rounding=Rounding(regle.rounding),
        priority=regle.priority,
        filter_provider=_opt(regle.filter_provider),
        filter_operator=_opt(regle.filter_operator),
        filter_payee_type=_opt(regle.filter_payee_type),
        filter_category=_opt(regle.filter_category),
        filter_certification_tier=_opt(regle.filter_certification_tier),
        filter_city=_opt(regle.filter_city),
    )


def distribution_rule_to_spec(regle: DistributionRule) -> DistributionRuleSpec:
    return DistributionRuleSpec(
        rule_version_id=regle.id,
        name=f"{regle.name} (v{regle.version})",
        component=EconomicComponent(regle.component),
        payee_type=PayeeType(regle.payee_type),
        basis=DistributionBasis(regle.basis),
        value=Decimal(str(regle.value)),
        priority=regle.priority,
        filter_delivery_mode=_opt(regle.filter_delivery_mode),
        filter_city=_opt(regle.filter_city),
    )


def escrow_policy_to_spec(politique: EscrowPolicy) -> EscrowPolicySpec:
    return EscrowPolicySpec(
        policy_version_id=politique.id,
        name=f"{politique.name} (v{politique.version})",
        payee_type=PayeeType(politique.payee_type) if politique.payee_type else None,
        component=(
            EconomicComponent(politique.component) if politique.component else None
        ),
        auto_confirm_hours=politique.auto_confirm_hours,
        release_delay_hours=politique.release_delay_hours,
        dispute_window_days=politique.dispute_window_days,
        vendor_reply_hours=politique.vendor_reply_hours,
        priority=politique.priority,
        filter_category=_opt(politique.filter_category),
        filter_delivery_mode=_opt(politique.filter_delivery_mode),
        filter_city=_opt(politique.filter_city),
        filter_certification_tier=_opt(politique.filter_certification_tier),
    )


# ─────────────────────────────────────────────────────────────────────────────
# CHARGEMENT
# ─────────────────────────────────────────────────────────────────────────────

def load_fee_rules() -> list[FeeRuleSpec]:
    return [fee_rule_to_spec(r) for r in FeeRule.current()]


def load_distribution_rules() -> list[DistributionRuleSpec]:
    return [distribution_rule_to_spec(r) for r in DistributionRule.current()]


def load_escrow_policies() -> list[EscrowPolicySpec]:
    return [escrow_policy_to_spec(p) for p in EscrowPolicy.current()]


def active_provider() -> ProviderConfig | None:
    """Prestataire actif de plus haute priorite."""
    return ProviderConfig.current().filter(is_enabled=True).order_by("-priority").first()


# ─────────────────────────────────────────────────────────────────────────────
# API DE RESOLUTION
# ─────────────────────────────────────────────────────────────────────────────

def resolve_fee_for(base, *, scope, provider=None, operator=None,
                    payee_type=None, category=None,
                    certification_tier=None, city=None):
    """
    Resout le frais applicable. Leve NoApplicableRule si rien ne correspond —
    jamais de frais nul silencieux.
    """
    contexte = FeeContext(
        scope=FeeScope(scope),
        provider=provider,
        operator=operator,
        payee_type=payee_type,
        category=category,
        certification_tier=certification_tier,
        city=city,
    )
    return resolve_fee(base, contexte, load_fee_rules())


def resolve_policy_for(*, payee_type, component, category=None,
                       delivery_mode=None, city=None, certification_tier=None):
    """Resout les delais de sequestre applicables."""
    contexte = PolicyContext(
        payee_type=PayeeType(payee_type),
        component=EconomicComponent(component),
        category=category,
        delivery_mode=delivery_mode,
        city=city,
        certification_tier=certification_tier,
    )
    return resolve_policy(contexte, load_escrow_policies())


def build_plan_for(components: list[ComponentInput], payee_codes: dict,
                   payee_types: dict):
    """Construit le plan de repartition d'un encaissement."""
    return build_distribution_plan(
        components=components,
        rules=load_distribution_rules(),
        payee_codes=payee_codes,
        payee_types=payee_types,
    )


# ─────────────────────────────────────────────────────────────────────────────
# CONTROLE DE COHERENCE
# ─────────────────────────────────────────────────────────────────────────────

def check_configuration() -> dict:
    """
    Verifie que la configuration active est exploitable.

    Appele par le seed, par l'admin et par une commande de diagnostic.
    Mieux vaut decouvrir un trou de repartition ici qu'en production.
    """
    problemes = []
    avertissements = []

    regles = load_distribution_rules()
    for composant in EconomicComponent:
        applicables = [r for r in regles if r.component == composant]
        if not applicables:
            avertissements.append(
                f"Aucune regle de repartition pour le composant {composant}."
            )
            continue
        try:
            validate_rules_coverage(composant, applicables)
        except Exception as exc:
            problemes.append(f"Composant {composant} : {exc}")

    if not FeeRule.current().filter(scope=FeeRule.Scope.COLLECT).exists():
        problemes.append("Aucune regle de frais d'encaissement active.")

    if not EscrowPolicy.current().exists():
        problemes.append("Aucune politique de sequestre active.")

    prestataire = active_provider()
    if prestataire is None:
        avertissements.append("Aucun prestataire de paiement actif.")
    elif prestataire.mode == ProviderConfig.Mode.LIVE:
        if not prestataire.webhook_ip_allowlist:
            problemes.append(
                f"{prestataire.provider_code} est en LIVE sans liste blanche d'IP."
            )
        if not prestataire.exposes_balance_per_operator:
            avertissements.append(
                f"{prestataire.provider_code} n'expose pas de solde par operateur : "
                "le mode degrade du plan comptable s'applique (voir Jalon A)."
            )

    return {
        "ok": not problemes,
        "problemes": problemes,
        "avertissements": avertissements,
    }