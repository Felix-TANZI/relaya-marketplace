# backend/apps/payments/tests/domain/test_domain.py
# Tests du domaine financier pur.
#
# AUCUN de ces tests ne touche la base de donnees ni Django.
# Ils s'executent en quelques millisecondes.
#
#   pytest apps/payments/tests/domain/ -q

import random
from decimal import Decimal

import pytest

from apps.payments.domain import (
    ComponentInput,
    ConservationViolation,
    Currency,
    DistributionBasis,
    DistributionRuleSpec,
    EconomicComponent,
    EscrowHoldStatus as EH,
    EscrowPolicySpec,
    FeeBasis,
    FeeBearer,
    FeeContext,
    FeeRuleSpec,
    FeeScope,
    FeeTier,
    FloatForbidden,
    IllegalTransition,
    IncompleteDistribution,
    Money,
    PayeeType,
    PaymentIntentStatus as PI,
    PayoutStatus as PO,
    PolicyContext,
    ReleaseTrigger,
    Rounding,
    NoApplicableRule,
    build_distribution_plan,
    money_sum,
    resolve_fee,
    resolve_policy,
    validate_rules_coverage,
)
from apps.payments.domain.state_machines import (
    ESCROW_HOLD, PAYMENT_INTENT, PAYOUT,
)


# ═══════════════════════════════════════════════════════════════════════════
# MONNAIE
# ═══════════════════════════════════════════════════════════════════════════

class TestMoney:

    def test_addition_soustraction(self):
        assert (Money(50000) + Money(1500)).amount == 51500
        assert (Money(50000) - Money(1500)).amount == 48500

    def test_pourcentage_exact(self):
        assert Money(45000).percent("12").amount == 5400
        assert Money(50000).percent("2.00").amount == 1000
        assert Money(45000).percent(Decimal("15.5")).amount == 6975

    def test_float_refuse_a_la_construction(self):
        with pytest.raises(FloatForbidden):
            Money(1000.0)

    def test_float_refuse_dans_un_taux(self):
        with pytest.raises(FloatForbidden):
            Money(45000).percent(12.0)

    def test_bool_refuse(self):
        with pytest.raises(FloatForbidden):
            Money(True)

    def test_immuabilite(self):
        m = Money(1000)
        with pytest.raises(Exception):
            m.amount = 2000

    def test_arrondi(self):
        # 33.33% de 100 = 33.33
        assert Money(100).percent("33.33", Rounding.HALF_UP).amount == 33
        assert Money(100).percent("33.33", Rounding.UP).amount == 34
        assert Money(100).percent("33.33", Rounding.DOWN).amount == 33

    def test_clamp(self):
        assert Money(50).clamp(minimum=Money(100)).amount == 100
        assert Money(500).clamp(maximum=Money(100)).amount == 100
        assert Money(50).clamp(Money(10), Money(100)).amount == 50

    def test_allocate_conserve_le_total(self):
        parts = Money(100).allocate([1, 1, 1])
        assert sum(p.amount for p in parts) == 100
        assert sorted(p.amount for p in parts) == [33, 33, 34]

    def test_allocate_ponderee(self):
        parts = Money(1000).allocate([70, 30])
        assert [p.amount for p in parts] == [700, 300]
        assert sum(p.amount for p in parts) == 1000

    def test_allocate_cas_difficile(self):
        # 1 franc entre 3 beneficiaires : personne ne doit recevoir -1
        parts = Money(1).allocate([1, 1, 1])
        assert sum(p.amount for p in parts) == 1
        assert all(p.amount >= 0 for p in parts)

    def test_format(self):
        assert Money(1234567).format() == "1 234 567 FCFA"
        assert Money(-500).format() == "-500 FCFA"

    def test_comparaisons(self):
        assert Money(100) < Money(200)
        assert Money(200) >= Money(200)
        assert Money(100) == Money(100)


# ═══════════════════════════════════════════════════════════════════════════
# MACHINES A ETATS
# ═══════════════════════════════════════════════════════════════════════════

class TestStateMachines:

    def test_transition_autorisee(self):
        ESCROW_HOLD.assert_transition(EH.HELD, EH.RELEASE_SCHEDULED)
        ESCROW_HOLD.assert_transition(EH.RELEASE_SCHEDULED, EH.RELEASED)

    def test_transition_interdite(self):
        with pytest.raises(IllegalTransition):
            ESCROW_HOLD.assert_transition(EH.PENDING, EH.RELEASED)

    def test_etat_terminal_bloque(self):
        with pytest.raises(Exception):
            ESCROW_HOLD.assert_transition(EH.RELEASED, EH.HELD)

    def test_litige_gele_puis_reprend(self):
        # Un litige rejete remet le sequestre dans son cycle normal
        ESCROW_HOLD.assert_transition(EH.HELD, EH.FROZEN)
        ESCROW_HOLD.assert_transition(EH.FROZEN, EH.HELD)

    def test_payout_unknown_ne_permet_pas_de_retenter(self):
        # POINT CRITIQUE : sur un timeout, on ne sait pas si l'argent est parti.
        # Retenter aveuglement peut doubler un versement.
        PAYOUT.assert_transition(PO.PROCESSING, PO.UNKNOWN)
        with pytest.raises(IllegalTransition):
            PAYOUT.assert_transition(PO.UNKNOWN, PO.PROCESSING)
        # Seule la reconciliation tranche
        PAYOUT.assert_transition(PO.UNKNOWN, PO.PAID)
        PAYOUT.assert_transition(PO.UNKNOWN, PO.FAILED)

    def test_paiement_reussi_ne_peut_pas_echouer(self):
        with pytest.raises(IllegalTransition):
            PAYMENT_INTENT.assert_transition(PI.SUCCEEDED, PI.FAILED)

    def test_message_erreur_liste_les_transitions_possibles(self):
        with pytest.raises(IllegalTransition) as exc:
            ESCROW_HOLD.assert_transition(EH.PENDING, EH.RELEASED)
        assert "HELD" in str(exc.value)


# ═══════════════════════════════════════════════════════════════════════════
# FRAIS
# ═══════════════════════════════════════════════════════════════════════════

def _campay_collect_rule(**kw):
    defaults = dict(
        rule_version_id=1,
        name="Frais CamPay collecte",
        scope=FeeScope.COLLECT,
        basis=FeeBasis.PERCENT,
        value=Decimal("2.00"),
        bearer=FeeBearer.PLATFORM,
        priority=10,
    )
    defaults.update(kw)
    return FeeRuleSpec(**defaults)


class TestFees:

    def test_frais_pourcentage(self):
        res = resolve_fee(
            Money(50000),
            FeeContext(scope=FeeScope.COLLECT),
            [_campay_collect_rule()],
        )
        assert res.fee.amount == 1000
        assert res.bearer == FeeBearer.PLATFORM

    def test_priorite_la_plus_haute_gagne(self):
        generique = _campay_collect_rule(rule_version_id=1, value=Decimal("2"), priority=1)
        orange = _campay_collect_rule(
            rule_version_id=2, name="Orange negocie",
            value=Decimal("1.5"), priority=100, filter_operator="ORANGE",
        )
        res = resolve_fee(
            Money(50000),
            FeeContext(scope=FeeScope.COLLECT, operator="ORANGE"),
            [generique, orange],
        )
        assert res.rule_version_id == 2
        assert res.fee.amount == 750

    def test_filtre_non_satisfait_ecarte_la_regle(self):
        orange = _campay_collect_rule(
            rule_version_id=2, priority=100, filter_operator="ORANGE",
        )
        generique = _campay_collect_rule(rule_version_id=1, priority=1)
        res = resolve_fee(
            Money(50000),
            FeeContext(scope=FeeScope.COLLECT, operator="MTN"),
            [orange, generique],
        )
        assert res.rule_version_id == 1

    def test_aucune_regle_leve_une_erreur(self):
        # JAMAIS de frais nul silencieux
        with pytest.raises(NoApplicableRule):
            resolve_fee(Money(50000), FeeContext(scope=FeeScope.PAYOUT), [_campay_collect_rule()])

    def test_plancher_applique(self):
        rule = _campay_collect_rule(min_fee=100)
        res = resolve_fee(Money(1000), FeeContext(scope=FeeScope.COLLECT), [rule])
        assert res.fee.amount == 100  # 2% de 1000 = 20, releve a 100

    def test_plafond_applique(self):
        rule = _campay_collect_rule(max_fee=500)
        res = resolve_fee(Money(100000), FeeContext(scope=FeeScope.COLLECT), [rule])
        assert res.fee.amount == 500  # 2% de 100000 = 2000, plafonne a 500

    def test_paliers(self):
        rule = _campay_collect_rule(
            basis=FeeBasis.TIERED,
            tiers=(
                FeeTier(up_to=10000, value=Decimal("3")),
                FeeTier(up_to=None, value=Decimal("1.5")),
            ),
        )
        petit = resolve_fee(Money(5000), FeeContext(scope=FeeScope.COLLECT), [rule])
        gros = resolve_fee(Money(100000), FeeContext(scope=FeeScope.COLLECT), [rule])
        assert petit.fee.amount == 150
        assert gros.fee.amount == 1500

    def test_trace_explique_la_decision(self):
        orange = _campay_collect_rule(rule_version_id=2, priority=100, filter_operator="ORANGE")
        generique = _campay_collect_rule(rule_version_id=1, priority=1)
        res = resolve_fee(
            Money(50000),
            FeeContext(scope=FeeScope.COLLECT, operator="MTN"),
            [orange, generique],
        )
        texte = res.explain()
        assert "ECARTEE" in texte
        assert "RETENUE" in texte
        assert "ORANGE" in texte


# ═══════════════════════════════════════════════════════════════════════════
# REPARTITION
# ═══════════════════════════════════════════════════════════════════════════

VENDOR_CODE = "PAY-VND-000341"
CARRIER_CODE = "PAY-DLV-000012"

GOODS_RULE = DistributionRuleSpec(
    rule_version_id=1, name="Marchandise au vendeur",
    component=EconomicComponent.GOODS, payee_type=PayeeType.VENDOR,
    basis=DistributionBasis.REMAINDER, priority=10,
)
TRANSPORT_CARRIER = DistributionRuleSpec(
    rule_version_id=2, name="Transport au transporteur",
    component=EconomicComponent.TRANSPORT, payee_type=PayeeType.DELIVERY_COMPANY,
    basis=DistributionBasis.PERCENT_OF_COMPONENT, value=Decimal("70"), priority=20,
)
TRANSPORT_PLATFORM = DistributionRuleSpec(
    rule_version_id=3, name="Part plateforme sur transport",
    component=EconomicComponent.TRANSPORT, payee_type=PayeeType.PLATFORM,
    basis=DistributionBasis.REMAINDER, priority=10,
)

PAYEE_CODES = {
    PayeeType.VENDOR: VENDOR_CODE,
    PayeeType.DELIVERY_COMPANY: CARRIER_CODE,
}
PAYEE_TYPES = {
    VENDOR_CODE: PayeeType.VENDOR,
    CARRIER_CODE: PayeeType.DELIVERY_COMPANY,
}


class TestDistribution:

    def test_plan_complet(self):
        plan = build_distribution_plan(
            components=[
                ComponentInput(
                    component=EconomicComponent.GOODS,
                    amount=Money(45000), order_id=1,
                    commission_rate=Decimal("15"),
                ),
                ComponentInput(
                    component=EconomicComponent.TRANSPORT,
                    amount=Money(5000),
                ),
            ],
            rules=[GOODS_RULE, TRANSPORT_CARRIER, TRANSPORT_PLATFORM],
            payee_codes=PAYEE_CODES,
            payee_types=PAYEE_TYPES,
        )
        assert plan.total_distributed.amount == 50000

        vendeur = [h for h in plan.holds if h.payee_code == VENDOR_CODE][0]
        assert vendeur.gross.amount == 45000
        assert vendeur.commission.amount == 6750   # 15%
        assert vendeur.net.amount == 38250

        transporteur = [h for h in plan.holds if h.payee_code == CARRIER_CODE][0]
        assert transporteur.gross.amount == 3500   # 70% de 5000

        # Commission vendeur (6750) + part plateforme transport (1500)
        assert plan.platform_revenue.amount == 8250

    def test_conservation_globale(self):
        plan = build_distribution_plan(
            components=[
                ComponentInput(EconomicComponent.GOODS, Money(45000), order_id=1,
                               commission_rate=Decimal("15")),
                ComponentInput(EconomicComponent.TRANSPORT, Money(5000)),
            ],
            rules=[GOODS_RULE, TRANSPORT_CARRIER, TRANSPORT_PLATFORM],
            payee_codes=PAYEE_CODES, payee_types=PAYEE_TYPES,
        )
        commissions = money_sum([h.commission for h in plan.holds])
        brut = plan.total_gross()
        plateforme_hors_commission = plan.platform_revenue - commissions
        assert (brut + plateforme_hors_commission).amount == 50000

    def test_deux_commandes_meme_vendeur_donnent_deux_sequestres(self):
        # POINT CRITIQUE : c'est la contradiction que la granularite a 4
        # dimensions resout. Un litige sur le colis 1 ne doit pas geler le colis 2.
        plan = build_distribution_plan(
            components=[
                ComponentInput(EconomicComponent.GOODS, Money(30000), order_id=1,
                               commission_rate=Decimal("15")),
                ComponentInput(EconomicComponent.GOODS, Money(15000), order_id=3,
                               commission_rate=Decimal("15")),
            ],
            rules=[GOODS_RULE],
            payee_codes=PAYEE_CODES, payee_types=PAYEE_TYPES,
        )
        sequestres = plan.holds_for(VENDOR_CODE)
        assert len(sequestres) == 2
        assert {h.order_id for h in sequestres} == {1, 3}

    def test_transport_refuse_un_order_id(self):
        with pytest.raises(Exception):
            ComponentInput(EconomicComponent.TRANSPORT, Money(5000), order_id=1)

    def test_goods_exige_un_order_id(self):
        with pytest.raises(Exception):
            ComponentInput(EconomicComponent.GOODS, Money(45000))

    def test_declencheurs_par_composant(self):
        plan = build_distribution_plan(
            components=[
                ComponentInput(EconomicComponent.GOODS, Money(45000), order_id=1),
                ComponentInput(EconomicComponent.TRANSPORT, Money(5000)),
            ],
            rules=[GOODS_RULE, TRANSPORT_CARRIER, TRANSPORT_PLATFORM],
            payee_codes=PAYEE_CODES, payee_types=PAYEE_TYPES,
        )
        triggers = {h.component: h.release_trigger for h in plan.holds}
        assert triggers[EconomicComponent.GOODS] == ReleaseTrigger.BUYER_RECEIPT_CONFIRMED
        assert triggers[EconomicComponent.TRANSPORT] == ReleaseTrigger.DELIVERY_PROOF_VALIDATED

    def test_couverture_incomplete_refusee(self):
        partielle = DistributionRuleSpec(
            rule_version_id=9, name="Partielle",
            component=EconomicComponent.GOODS, payee_type=PayeeType.VENDOR,
            basis=DistributionBasis.PERCENT_OF_COMPONENT, value=Decimal("80"),
        )
        with pytest.raises(IncompleteDistribution):
            validate_rules_coverage(EconomicComponent.GOODS, [partielle])

    def test_couverture_exacte_acceptee(self):
        validate_rules_coverage(EconomicComponent.TRANSPORT,
                                [TRANSPORT_CARRIER, TRANSPORT_PLATFORM])
        validate_rules_coverage(EconomicComponent.GOODS, [GOODS_RULE])

    def test_deux_regles_remainder_refusees(self):
        a = DistributionRuleSpec(
            rule_version_id=1, name="A", component=EconomicComponent.GOODS,
            payee_type=PayeeType.VENDOR, basis=DistributionBasis.REMAINDER)
        b = DistributionRuleSpec(
            rule_version_id=2, name="B", component=EconomicComponent.GOODS,
            payee_type=PayeeType.PLATFORM, basis=DistributionBasis.REMAINDER)
        with pytest.raises(IncompleteDistribution):
            validate_rules_coverage(EconomicComponent.GOODS, [a, b])

    def test_courier_refuse_en_phase_1(self):
        regle_courier = DistributionRuleSpec(
            rule_version_id=99, name="Livreur independant",
            component=EconomicComponent.TRANSPORT, payee_type=PayeeType.COURIER,
            basis=DistributionBasis.REMAINDER,
        )
        with pytest.raises(Exception):
            build_distribution_plan(
                components=[ComponentInput(EconomicComponent.TRANSPORT, Money(5000))],
                rules=[regle_courier],
                payee_codes={PayeeType.COURIER: "PAY-CUR-000001"},
                payee_types={"PAY-CUR-000001": PayeeType.COURIER},
            )


# ═══════════════════════════════════════════════════════════════════════════
# POLITIQUES
# ═══════════════════════════════════════════════════════════════════════════

class TestPolicies:

    def test_politique_generique(self):
        generique = EscrowPolicySpec(policy_version_id=1, name="Defaut", priority=0)
        res = resolve_policy(
            PolicyContext(PayeeType.VENDOR, EconomicComponent.GOODS),
            [generique],
        )
        assert res.auto_confirm_hours == 96  # Addendum Decisions v1.0 §3.1 — verrouille a 4 jours (96h)
        assert res.release_trigger == ReleaseTrigger.BUYER_RECEIPT_CONFIRMED

    def test_surcharge_par_categorie(self):
        generique = EscrowPolicySpec(policy_version_id=1, name="Defaut", priority=0)
        frais = EscrowPolicySpec(
            policy_version_id=2, name="Produits frais",
            auto_confirm_hours=24, filter_category="alimentaire", priority=100,
        )
        res = resolve_policy(
            PolicyContext(PayeeType.VENDOR, EconomicComponent.GOODS,
                          category="alimentaire"),
            [generique, frais],
        )
        assert res.policy_version_id == 2
        assert res.auto_confirm_hours == 24

    def test_snapshot_serialisable(self):
        res = resolve_policy(
            PolicyContext(PayeeType.RELAY_POINT, EconomicComponent.RELAY_HANDLING),
            [EscrowPolicySpec(policy_version_id=1, name="Defaut")],
        )
        snap = res.as_snapshot()
        assert snap["policy_version_id"] == 1
        assert snap["release_trigger"] == "RELAY_HANDOVER_SCANNED"


# ═══════════════════════════════════════════════════════════════════════════
# INVARIANTS — tests de propriete sur cas generes
# ═══════════════════════════════════════════════════════════════════════════

class TestInvariants:

    def test_allocate_conserve_toujours(self):
        rng = random.Random(20260808)
        for _ in range(2000):
            total = rng.randint(0, 5_000_000)
            n = rng.randint(1, 8)
            poids = [rng.randint(1, 100) for _ in range(n)]
            parts = Money(total).allocate(poids)
            assert sum(p.amount for p in parts) == total, (total, poids)

    def test_repartition_conserve_toujours(self):
        rng = random.Random(20260809)
        for _ in range(500):
            marchandise = rng.randint(1000, 500_000)
            transport = rng.randint(0, 20_000)
            taux = Decimal(rng.randint(13, 22))

            composants = [ComponentInput(
                EconomicComponent.GOODS, Money(marchandise),
                order_id=1, commission_rate=taux)]
            regles = [GOODS_RULE]
            if transport > 0:
                composants.append(
                    ComponentInput(EconomicComponent.TRANSPORT, Money(transport)))
                regles += [TRANSPORT_CARRIER, TRANSPORT_PLATFORM]

            plan = build_distribution_plan(
                composants, regles, PAYEE_CODES, PAYEE_TYPES)

            commissions = money_sum([h.commission for h in plan.holds])
            reparti = plan.total_gross() + (plan.platform_revenue - commissions)
            assert reparti.amount == marchandise + transport

    def test_aucun_net_negatif(self):
        rng = random.Random(20260810)
        for _ in range(500):
            montant = rng.randint(1, 1_000_000)
            taux = Decimal(rng.randint(0, 100))
            plan = build_distribution_plan(
                [ComponentInput(EconomicComponent.GOODS, Money(montant),
                                order_id=1, commission_rate=taux)],
                [GOODS_RULE], PAYEE_CODES, PAYEE_TYPES)
            for h in plan.holds:
                assert h.net.amount >= 0
                assert h.gross.amount == h.net.amount + h.commission.amount

    def test_toute_transition_non_declaree_est_refusee(self):
        from apps.payments.domain.state_machines import MACHINES
        for machine in MACHINES.values():
            etats = machine.all_states()
            for depart in etats:
                autorisees = machine.allowed_from(depart)
                for arrivee in etats:
                    if arrivee in autorisees:
                        continue
                    with pytest.raises(Exception):
                        machine.assert_transition(depart, arrivee)


# ═══════════════════════════════════════════════════════════════════════════
# ISOLATION — principe P1
# ═══════════════════════════════════════════════════════════════════════════

class TestIsolation:

    def test_domaine_n_importe_ni_django_ni_orm(self):
        """
        Le domaine doit rester importable sans Django et ne jamais dependre
        d'une autre application. Ce test echoue des qu'un import interdit
        est introduit — c'est le garde-fou du principe P1.
        """
        import ast
        import pathlib

        interdits = ("django", "rest_framework", "requests", "apps.orders",
                     "apps.vendors", "apps.shipping", "apps.catalog", "apps.accounts")

        racine = pathlib.Path(__file__).resolve().parents[2] / "domain"
        assert racine.is_dir(), f"Dossier domaine introuvable : {racine}"

        fautes = []
        for fichier in racine.glob("*.py"):
            arbre = ast.parse(fichier.read_text(encoding="utf-8"))
            for noeud in ast.walk(arbre):
                if isinstance(noeud, ast.Import):
                    noms = [a.name for a in noeud.names]
                elif isinstance(noeud, ast.ImportFrom):
                    noms = [noeud.module or ""]
                else:
                    continue
                for nom in noms:
                    if any(nom.startswith(i) for i in interdits):
                        fautes.append(f"{fichier.name}: {nom}")

        assert not fautes, "Imports interdits dans le domaine : " + ", ".join(fautes)

    def test_aucun_float_dans_le_domaine(self):
        import pathlib
        import re

        racine = pathlib.Path(__file__).resolve().parents[2] / "domain"
        motif = re.compile(r"\bfloat\s*\(")
        fautes = []
        for fichier in racine.glob("*.py"):
            for numero, ligne in enumerate(
                fichier.read_text(encoding="utf-8").splitlines(), 1
            ):
                if motif.search(ligne) and "isinstance" not in ligne:
                    fautes.append(f"{fichier.name}:{numero}")
        assert not fautes, "Appels a float() dans le domaine : " + ", ".join(fautes)