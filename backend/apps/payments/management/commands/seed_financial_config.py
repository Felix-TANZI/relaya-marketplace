# backend/apps/payments/management/commands/seed_financial_config.py
# Seed de la configuration financiere initiale.
#
# IDEMPOTENT : relancer la commande ne cree aucun doublon.
# Toutes les valeurs viennent du referentiel BelivaY. Aucune n'est inventee.
#
#   python manage.py seed_financial_config --dry-run
#   python manage.py seed_financial_config
#   python manage.py seed_financial_config --only fee-campay-collect

from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.payments.config.models import (
    DistributionRule,
    EscrowPolicy,
    FeeRule,
    PayoutPolicy,
    ProviderConfig,
    SettlementCycle,
    VehicleClass,
)
from apps.payments.config.resolver import check_configuration, invalidate_cache

# ── Classes de vehicule — aligne sur CourierProfile.VehicleType ──────────────
VEHICLE_CLASSES = [
    {"code": "motorbike", "label": "Moto", "max_weight_kg": 30, "sort_order": 10},
    {"code": "tricycle", "label": "Tricycle", "max_weight_kg": 150, "sort_order": 20},
    {"code": "car", "label": "Voiture", "max_weight_kg": 300, "sort_order": 30},
    {"code": "van", "label": "Camionnette", "max_weight_kg": 1000, "sort_order": 40},
    {"code": "bike", "label": "Velo", "max_weight_kg": 15, "sort_order": 5},
]

# ── Prestataires ─────────────────────────────────────────────────────────────
PROVIDERS = [
    {
        "config_key": "provider-mock",
        "provider_code": "MOCK",
        "mode": ProviderConfig.Mode.SANDBOX,
        "is_enabled": True,
        "is_payout_enabled": True,
        "priority": 0,
        "supported_operators": ["MTN", "ORANGE"],
        "notes": "Prestataire factice — developpement et tests. Ne deplace aucun argent.",
    },
    {
        "config_key": "provider-campay",
        "provider_code": "CAMPAY",
        "mode": ProviderConfig.Mode.SANDBOX,
        "is_enabled": False,
        "is_payout_enabled": False,
        "priority": 100,
        "supported_operators": ["MTN", "ORANGE"],
        "min_amount_xaf": 100,
        "max_amount_xaf": 1_000_000,
        "collect_timeout_s": 30,
        "poll_interval_s": 5,
        "max_poll_duration_s": 300,
        "retry_policy": {"max_attempts": 3, "backoff_seconds": [1, 5, 15]},
        "circuit_breaker_threshold": 5,
        "exposes_balance_per_operator": True,
        "notes": (
            "Active au Lot 6. exposes_balance_per_operator = True : la "
            "documentation CamPay confirme que /balance/ retourne mtn_balance "
            "et orange_balance en plus de total_balance. Le MODE NOMINAL du "
            "plan comptable s'applique : les comptes 1011 et 1012 sont "
            "reconciliables et l'invariant I5 devient bloquant. "
            "A confirmer par un appel reel : python manage.py campay_selftest"
        ),
    },
]

# ── Frais ────────────────────────────────────────────────────────────────────
# Referentiel §7.4 : les frais PSP sont portes par la PLATEFORME.
# Referentiel §7.1 : aucun frais de retrait facture aux partenaires.
FEE_RULES = [
    {
        "config_key": "fee-psp-collect",
        "name": "Frais PSP sur encaissement",
        "scope": FeeRule.Scope.COLLECT,
        "basis": FeeRule.Basis.PERCENT,
        "value": Decimal("2.0000"),
        "bearer": FeeRule.Bearer.PLATFORM,
        "priority": 10,
        "notes": "Taux a confirmer par devis ecrit CamPay (Jalon A).",
    },
    {
        "config_key": "fee-psp-payout",
        "name": "Frais PSP sur versement",
        "scope": FeeRule.Scope.PAYOUT,
        "basis": FeeRule.Basis.PERCENT,
        "value": Decimal("1.0000"),
        "bearer": FeeRule.Bearer.PLATFORM,
        "priority": 10,
        "notes": (
            "Charge plateforme, JAMAIS une retenue partenaire. "
            "Le partenaire recoit l'integralite de son net (referentiel §7.1)."
        ),
    },
    {
        "config_key": "fee-psp-refund",
        "name": "Frais PSP sur remboursement",
        "scope": FeeRule.Scope.REFUND,
        "basis": FeeRule.Basis.PERCENT,
        "value": Decimal("1.0000"),
        "bearer": FeeRule.Bearer.PLATFORM,
        "priority": 10,
    },
]

# ── Repartition ──────────────────────────────────────────────────────────────
DISTRIBUTION_RULES = [
    {
        "config_key": "dist-goods-vendor",
        "name": "Marchandise au vendeur",
        "component": DistributionRule.Component.GOODS,
        "payee_type": DistributionRule.PayeeType.VENDOR,
        "basis": DistributionRule.Basis.REMAINDER,
        "priority": 10,
        "notes": "La commission est prelevee au niveau du sequestre, pas ici.",
    },
    {
        "config_key": "dist-transport-carrier",
        "name": "Transport a l'entreprise de livraison",
        "component": DistributionRule.Component.TRANSPORT,
        "payee_type": DistributionRule.PayeeType.DELIVERY_COMPANY,
        "basis": DistributionRule.Basis.PERCENT_OF_COMPONENT,
        "value": Decimal("70.0000"),
        "priority": 20,
        "notes": "Part a arbitrer contractuellement.",
    },
    {
        "config_key": "dist-transport-platform",
        "name": "Part plateforme sur le transport",
        "component": DistributionRule.Component.TRANSPORT,
        "payee_type": DistributionRule.PayeeType.PLATFORM,
        "basis": DistributionRule.Basis.REMAINDER,
        "priority": 10,
    },
    {
        "config_key": "dist-relay-point",
        "name": "Remise au point relais",
        "component": DistributionRule.Component.RELAY_HANDLING,
        "payee_type": DistributionRule.PayeeType.RELAY_POINT,
        "basis": DistributionRule.Basis.REMAINDER,
        "priority": 10,
    },
]

# ── Politiques de sequestre — referentiel §9.5 ───────────────────────────────
ESCROW_POLICIES = [
    {
        "config_key": "escrow-default",
        "name": "Politique par defaut",
        "auto_confirm_hours": 48,
        "release_delay_hours": 24,
        "dispute_window_days": 7,
        "vendor_reply_hours": 72,
        "priority": 0,
    },
    {
        "config_key": "escrow-transport",
        "name": "Transport — liberation a la preuve de livraison",
        "payee_type": DistributionRule.PayeeType.DELIVERY_COMPANY,
        "component": DistributionRule.Component.TRANSPORT,
        "auto_confirm_hours": 0,
        "release_delay_hours": 24,
        "dispute_window_days": 7,
        "priority": 50,
        "notes": "Aucune auto-confirmation : la preuve de livraison est le declencheur.",
    },
    {
        "config_key": "escrow-relay",
        "name": "Point relais — liberation au scan de remise",
        "payee_type": DistributionRule.PayeeType.RELAY_POINT,
        "component": DistributionRule.Component.RELAY_HANDLING,
        "auto_confirm_hours": 0,
        "release_delay_hours": 24,
        "dispute_window_days": 7,
        "priority": 50,
    },
]

# ── Cycles de reglement — referentiel §10.2 ──────────────────────────────────
SETTLEMENT_CYCLES = [
    {
        "config_key": "cycle-weekly-friday",
        "name": "Hebdomadaire — vendredi",
        "frequency": SettlementCycle.Frequency.WEEKLY,
        "anchor_day": 5,
        "cutoff_hours": 24,
        "minimum_amount_xaf": 1000,
        "default_payee_type": DistributionRule.PayeeType.RELAY_POINT,
    },
    {
        "config_key": "cycle-biweekly",
        "name": "Bi-mensuel — 1er et 15",
        "frequency": SettlementCycle.Frequency.BIWEEKLY,
        "anchor_day": 1,
        "cutoff_hours": 24,
        "minimum_amount_xaf": 5000,
        "default_payee_type": DistributionRule.PayeeType.DELIVERY_COMPANY,
    },
    {
        "config_key": "cycle-vendor-weekly",
        "name": "Vendeur — hebdomadaire vendredi",
        "frequency": SettlementCycle.Frequency.WEEKLY,
        "anchor_day": 5,
        "cutoff_hours": 24,
        "minimum_amount_xaf": 1000,
        "default_payee_type": DistributionRule.PayeeType.VENDOR,
    },
]

# ── Politiques de versement ──────────────────────────────────────────────────
PAYOUT_POLICIES = [
    {
        "config_key": "payout-default",
        "name": "Politique de versement par defaut",
        "min_payout_xaf": 1000,
        "max_payout_xaf": 5_000_000,
        "required_approvals": 1,
        "dual_approval_threshold_xaf": 100_000,
        "momo_change_cooling_hours": 72,
        "auto_execute_on_approval": False,
        "require_kyc_verified": True,
        "priority": 0,
        "notes": (
            "Phase 3 : validation humaine sur tous les versements. "
            "L'assouplissement automatique n'intervient qu'apres montee en production."
        ),
    },
]

REGISTRY = [
    ("vehicle-classes", VehicleClass, VEHICLE_CLASSES, "code"),
    ("providers", ProviderConfig, PROVIDERS, "config_key"),
    ("fees", FeeRule, FEE_RULES, "config_key"),
    ("distribution", DistributionRule, DISTRIBUTION_RULES, "config_key"),
    ("escrow", EscrowPolicy, ESCROW_POLICIES, "config_key"),
    ("cycles", SettlementCycle, SETTLEMENT_CYCLES, "config_key"),
    ("payout", PayoutPolicy, PAYOUT_POLICIES, "config_key"),
]


class Command(BaseCommand):
    help = "Seed idempotent de la configuration financiere BelivaY."

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true",
                            help="Simule sans rien ecrire.")
        parser.add_argument("--only", type=str, default=None,
                            help="Limite a un groupe ou a une cle precise.")

    def handle(self, *args, **options):
        simulation = options["dry_run"]
        filtre = options["only"]

        if simulation:
            self.stdout.write(self.style.WARNING("MODE SIMULATION — aucune ecriture\n"))

        crees, existants = 0, 0

        with transaction.atomic():
            for groupe, modele, entrees, cle_unique in REGISTRY:
                if filtre and filtre != groupe:
                    entrees = [e for e in entrees if e.get(cle_unique) == filtre]
                    if not entrees:
                        continue

                self.stdout.write(self.style.HTTP_INFO(f"\n── {groupe} ──"))

                for entree in entrees:
                    donnees = dict(entree)
                    valeur_cle = donnees[cle_unique]

                    if modele is VehicleClass:
                        existe = modele.objects.filter(code=valeur_cle).exists()
                    else:
                        existe = modele.objects.filter(config_key=valeur_cle).exists()

                    if existe:
                        existants += 1
                        self.stdout.write(f"  = {valeur_cle} (deja present)")
                        continue

                    if simulation:
                        crees += 1
                        self.stdout.write(self.style.SUCCESS(f"  + {valeur_cle} (serait cree)"))
                        continue

                    if modele is not VehicleClass:
                        donnees.setdefault("version", 1)
                        donnees.setdefault("is_active", True)

                    objet = modele(**donnees)
                    objet.full_clean(exclude=["created_by"])
                    objet.save()
                    crees += 1
                    self.stdout.write(self.style.SUCCESS(f"  + {valeur_cle}"))

            if simulation:
                transaction.set_rollback(True)

        if not simulation:
            invalidate_cache()

        self.stdout.write(
            f"\n{crees} element(s) cree(s), {existants} deja present(s).\n"
        )

        # ── Controle de coherence ────────────────────────────────────────────
        if not simulation:
            rapport = check_configuration()
            self.stdout.write(self.style.HTTP_INFO("── Controle de coherence ──"))
            for probleme in rapport["problemes"]:
                self.stdout.write(self.style.ERROR(f"  [PROBLEME] {probleme}"))
            for avertissement in rapport["avertissements"]:
                self.stdout.write(self.style.WARNING(f"  [ATTENTION] {avertissement}"))
            if rapport["ok"] and not rapport["avertissements"]:
                self.stdout.write(self.style.SUCCESS("  Configuration coherente."))
            elif rapport["ok"]:
                self.stdout.write(self.style.SUCCESS("  Aucun probleme bloquant."))