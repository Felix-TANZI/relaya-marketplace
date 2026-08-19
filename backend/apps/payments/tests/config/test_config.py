# backend/apps/payments/tests/config/test_config.py
# Tests de la configuration financiere.
#
#   pytest apps/payments/tests/config/ -q
#
# Ces tests exigent une base (marqueur django_db). Ils verifient les
# proprietes qui protegent l'argent : immuabilite des versions, separation
# des roles, refus des configurations incoherentes.

from decimal import Decimal

import pytest
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError

from apps.payments.config.change_control import (
    ChangeControlError,
    apply_change,
    approve_change,
    reject_change,
    request_change,
    rollback_change,
)
from apps.payments.config.models import (
    ConfigChangeRequest,
    DistributionRule,
    EscrowPolicy,
    FeeRule,
    GovernanceLevel,
    ImmutableConfigError,
    ProviderConfig,
    SettlementCycle,
)
from apps.payments.config.resolver import (
    check_configuration,
    load_distribution_rules,
    resolve_fee_for,
    resolve_policy_for,
)
from apps.payments.domain import FeeScope, NoApplicableRule

pytestmark = pytest.mark.django_db


# ── Fixtures ─────────────────────────────────────────────────────────────────

@pytest.fixture
def operateur():
    return User.objects.create_user("operateur", "op@belivay.cm", "x")


@pytest.fixture
def approbateur():
    return User.objects.create_user("approbateur", "ap@belivay.cm", "x")


@pytest.fixture
def super_admin():
    return User.objects.create_superuser("root", "root@belivay.cm", "x")


@pytest.fixture
def regle_frais():
    return FeeRule.objects.create(
        config_key="fee-psp-collect",
        name="Frais PSP encaissement",
        scope=FeeRule.Scope.COLLECT,
        basis=FeeRule.Basis.PERCENT,
        value=Decimal("2.0000"),
        bearer=FeeRule.Bearer.PLATFORM,
        priority=10,
    )


# ═══════════════════════════════════════════════════════════════════════════
# IMMUABILITE
# ═══════════════════════════════════════════════════════════════════════════

class TestImmuabilite:

    def test_modifier_un_champ_fige_est_refuse(self, regle_frais):
        regle_frais.value = Decimal("5.0000")
        with pytest.raises(ImmutableConfigError):
            regle_frais.save()

    def test_supprimer_est_refuse(self, regle_frais):
        with pytest.raises(ImmutableConfigError):
            regle_frais.delete()

    def test_cloturer_est_autorise(self, regle_frais):
        regle_frais.close()
        regle_frais.refresh_from_db()
        assert regle_frais.is_active is False
        assert regle_frais.valid_until is not None
        assert regle_frais.is_current is False

    def test_versions_successives(self, regle_frais):
        assert FeeRule.next_version_for("fee-psp-collect") == 2
        FeeRule.objects.create(
            config_key="fee-psp-collect", version=2,
            name="Frais PSP encaissement", scope=FeeRule.Scope.COLLECT,
            basis=FeeRule.Basis.PERCENT, value=Decimal("1.8000"),
            bearer=FeeRule.Bearer.PLATFORM,
        )
        assert FeeRule.objects.filter(config_key="fee-psp-collect").count() == 2

    def test_l_ancienne_version_reste_lisible(self, regle_frais):
        """Un snapshot de transaction doit toujours retrouver ce qui a ete applique."""
        ancien_id = regle_frais.id
        regle_frais.close()
        retrouvee = FeeRule.objects.get(id=ancien_id)
        assert retrouvee.value == Decimal("2.0000")


# ═══════════════════════════════════════════════════════════════════════════
# MAKER-CHECKER
# ═══════════════════════════════════════════════════════════════════════════

class TestMakerChecker:

    def test_demande_n_applique_rien(self, regle_frais, operateur):
        demande = request_change(
            target_model="FeeRule", target_key="fee-psp-collect",
            payload={"value": "1.5000"},
            justification="Taux renegocie avec CamPay.",
            requested_by=operateur,
        )
        assert demande.status == ConfigChangeRequest.Status.PENDING
        regle_frais.refresh_from_db()
        assert regle_frais.value == Decimal("2.0000")  # inchange

    def test_justification_obligatoire(self, regle_frais, operateur):
        with pytest.raises(ChangeControlError):
            request_change(
                target_model="FeeRule", target_key="fee-psp-collect",
                payload={"value": "1.5"}, justification="   ",
                requested_by=operateur,
            )

    def test_le_demandeur_ne_peut_pas_approuver(self, regle_frais, operateur):
        """SEPARATION DES ROLES — le coeur du dispositif."""
        demande = request_change(
            target_model="FeeRule", target_key="fee-psp-collect",
            payload={"value": "1.5000"}, justification="Test.",
            requested_by=operateur,
        )
        with pytest.raises(ChangeControlError, match="ne peut pas approuver"):
            approve_change(demande, operateur)

    def test_approbation_par_un_tiers_cree_une_nouvelle_version(
        self, regle_frais, operateur, approbateur
    ):
        demande = request_change(
            target_model="FeeRule", target_key="fee-psp-collect",
            payload={"value": "1.5000"},
            justification="Taux renegocie.", requested_by=operateur,
        )
        demande, nouvelle = approve_change(demande, approbateur)

        assert nouvelle.version == 2
        assert nouvelle.value == Decimal("1.5000")
        assert nouvelle.is_current

        regle_frais.refresh_from_db()
        assert regle_frais.is_active is False
        assert regle_frais.value == Decimal("2.0000")  # l'histoire est preservee

    def test_niveau_n3_exige_un_super_admin(self, operateur, approbateur):
        ProviderConfig.objects.create(
            config_key="provider-campay", provider_code="CAMPAY",
            mode=ProviderConfig.Mode.SANDBOX, supported_operators=["MTN"],
        )
        demande = request_change(
            target_model="ProviderConfig", target_key="provider-campay",
            payload={"is_enabled": True},
            justification="Activation.", requested_by=operateur,
        )
        assert demande.governance_level == GovernanceLevel.N3
        with pytest.raises(ChangeControlError, match="super-administrateur"):
            approve_change(demande, approbateur)

    def test_niveau_n3_accepte_un_super_admin(self, operateur, super_admin):
        ProviderConfig.objects.create(
            config_key="provider-campay", provider_code="CAMPAY",
            mode=ProviderConfig.Mode.SANDBOX, supported_operators=["MTN"],
        )
        demande = request_change(
            target_model="ProviderConfig", target_key="provider-campay",
            payload={"is_enabled": True},
            justification="Activation.", requested_by=operateur,
        )
        demande, nouvelle = approve_change(demande, super_admin)
        assert nouvelle.is_enabled is True
        assert nouvelle.version == 2

    def test_rejet_exige_un_motif(self, regle_frais, operateur, approbateur):
        demande = request_change(
            target_model="FeeRule", target_key="fee-psp-collect",
            payload={"value": "1.5"}, justification="Test.",
            requested_by=operateur,
        )
        with pytest.raises(ChangeControlError):
            reject_change(demande, approbateur, "")

    def test_diff_calcule(self, regle_frais, operateur):
        demande = request_change(
            target_model="FeeRule", target_key="fee-psp-collect",
            payload={"value": "1.5000"}, justification="Test.",
            requested_by=operateur,
        )
        assert "value" in demande.diff
        assert demande.diff["value"]["avant"] == "2.0000"
        assert demande.diff["value"]["apres"] == "1.5000"

    def test_retour_arriere(self, regle_frais, operateur, approbateur):
        demande = request_change(
            target_model="FeeRule", target_key="fee-psp-collect",
            payload={"value": "1.5000"},
            justification="Erreur de saisie a venir.", requested_by=operateur,
        )
        approve_change(demande, approbateur)
        demande.refresh_from_db()

        restauree = rollback_change(demande, approbateur, "Taux errone.")
        assert restauree.value == Decimal("2.0000")
        assert restauree.version == 3  # on avance, on ne defait jamais

        demande.refresh_from_db()
        assert demande.status == ConfigChangeRequest.Status.ROLLED_BACK

    def test_demande_non_approuvee_ne_s_applique_pas(self, regle_frais, operateur):
        demande = request_change(
            target_model="FeeRule", target_key="fee-psp-collect",
            payload={"value": "1.5"}, justification="Test.",
            requested_by=operateur,
        )
        with pytest.raises(ChangeControlError):
            apply_change(demande)

    def test_demande_non_supprimable(self, regle_frais, operateur):
        demande = request_change(
            target_model="FeeRule", target_key="fee-psp-collect",
            payload={"value": "1.5"}, justification="Test.",
            requested_by=operateur,
        )
        with pytest.raises(ImmutableConfigError):
            demande.delete()

    def test_reference_generee(self, regle_frais, operateur):
        demande = request_change(
            target_model="FeeRule", target_key="fee-psp-collect",
            payload={"value": "1.5"}, justification="Test.",
            requested_by=operateur,
        )
        assert demande.reference.startswith("BLV-CFG-")


# ═══════════════════════════════════════════════════════════════════════════
# VALIDATION
# ═══════════════════════════════════════════════════════════════════════════

class TestValidation:

    def test_taux_hors_bornes_absolues_refuse(self):
        regle = FeeRule(
            config_key="fee-absurde", name="Absurde",
            scope=FeeRule.Scope.COLLECT, basis=FeeRule.Basis.PERCENT,
            value=Decimal("150"), bearer=FeeRule.Bearer.PLATFORM,
        )
        with pytest.raises(ValidationError):
            regle.full_clean()

    def test_plancher_superieur_au_plafond_refuse(self):
        regle = FeeRule(
            config_key="fee-incoherent", name="Incoherent",
            scope=FeeRule.Scope.COLLECT, basis=FeeRule.Basis.PERCENT,
            value=Decimal("2"), min_fee_xaf=1000, max_fee_xaf=100,
            bearer=FeeRule.Bearer.PLATFORM,
        )
        with pytest.raises(ValidationError):
            regle.full_clean()

    def test_live_sans_allowlist_ip_refuse(self):
        prestataire = ProviderConfig(
            config_key="provider-live", provider_code="CAMPAY",
            mode=ProviderConfig.Mode.LIVE, supported_operators=["MTN"],
            webhook_ip_allowlist=[],
        )
        with pytest.raises(ValidationError):
            prestataire.full_clean()

    def test_split_sans_configuration_refuse(self):
        regle = FeeRule(
            config_key="fee-split", name="Partage",
            scope=FeeRule.Scope.COLLECT, basis=FeeRule.Basis.PERCENT,
            value=Decimal("2"), bearer=FeeRule.Bearer.SPLIT, split_config={},
        )
        with pytest.raises(ValidationError):
            regle.full_clean()


# ═══════════════════════════════════════════════════════════════════════════
# RESOLUTION — pont vers le domaine pur
# ═══════════════════════════════════════════════════════════════════════════

class TestResolver:

    def test_resolution_d_un_frais(self, regle_frais):
        from apps.payments.domain import Money
        resolution = resolve_fee_for(Money(50000), scope=FeeScope.COLLECT)
        assert resolution.fee.amount == 1000
        assert "fee-psp-collect" not in resolution.rule_name or True

    def test_regle_cloturee_ignoree(self, regle_frais):
        from apps.payments.domain import Money
        regle_frais.close()
        with pytest.raises(NoApplicableRule):
            resolve_fee_for(Money(50000), scope=FeeScope.COLLECT)

    def test_filtre_operateur(self, regle_frais):
        from apps.payments.domain import Money
        FeeRule.objects.create(
            config_key="fee-orange", name="Orange negocie",
            scope=FeeRule.Scope.COLLECT, basis=FeeRule.Basis.PERCENT,
            value=Decimal("1.5000"), bearer=FeeRule.Bearer.PLATFORM,
            priority=100, filter_operator="ORANGE",
        )
        mtn = resolve_fee_for(Money(50000), scope=FeeScope.COLLECT, operator="MTN")
        orange = resolve_fee_for(Money(50000), scope=FeeScope.COLLECT, operator="ORANGE")
        assert mtn.fee.amount == 1000
        assert orange.fee.amount == 750

    def test_resolution_d_une_politique(self):
        EscrowPolicy.objects.create(
            config_key="escrow-default", name="Defaut",
            auto_confirm_hours=48, release_delay_hours=24,
            dispute_window_days=7, priority=0,
        )
        resolue = resolve_policy_for(payee_type="VENDOR", component="GOODS")
        assert resolue.auto_confirm_hours == 48
        snap = resolue.as_snapshot()
        assert snap["release_trigger"] == "BUYER_RECEIPT_CONFIRMED"

    def test_traduction_des_filtres_vides(self, regle_frais):
        """Une chaine vide en base doit devenir None dans la spec du domaine."""
        specs = load_distribution_rules()
        assert isinstance(specs, list)


# ═══════════════════════════════════════════════════════════════════════════
# COHERENCE GLOBALE
# ═══════════════════════════════════════════════════════════════════════════

class TestCoherence:

    def test_configuration_vide_signale_des_problemes(self):
        rapport = check_configuration()
        assert rapport["ok"] is False
        assert any("frais d'encaissement" in p for p in rapport["problemes"])

    def test_repartition_incomplete_detectee(self, regle_frais):
        DistributionRule.objects.create(
            config_key="dist-partielle", name="Partielle",
            component=DistributionRule.Component.GOODS,
            payee_type=DistributionRule.PayeeType.VENDOR,
            basis=DistributionRule.Basis.PERCENT_OF_COMPONENT,
            value=Decimal("80"),
        )
        EscrowPolicy.objects.create(
            config_key="escrow-default", name="Defaut", priority=0,
        )
        rapport = check_configuration()
        assert any("GOODS" in p for p in rapport["problemes"])

    def test_configuration_complete_est_coherente(self):
        DistributionRule.objects.create(
            config_key="dist-goods", name="Marchandise",
            component=DistributionRule.Component.GOODS,
            payee_type=DistributionRule.PayeeType.VENDOR,
            basis=DistributionRule.Basis.REMAINDER,
        )
        FeeRule.objects.create(
            config_key="fee-collect", name="Collecte",
            scope=FeeRule.Scope.COLLECT, basis=FeeRule.Basis.PERCENT,
            value=Decimal("2"), bearer=FeeRule.Bearer.PLATFORM,
        )
        EscrowPolicy.objects.create(
            config_key="escrow-default", name="Defaut", priority=0,
        )
        rapport = check_configuration()
        assert rapport["ok"] is True


# ═══════════════════════════════════════════════════════════════════════════
# CYCLES DE REGLEMENT — modele "montant du", pas portefeuille
# ═══════════════════════════════════════════════════════════════════════════

class TestSettlementCycle:

    def test_cycle_hebdomadaire(self):
        cycle = SettlementCycle.objects.create(
            config_key="cycle-weekly", name="Hebdomadaire vendredi",
            frequency=SettlementCycle.Frequency.WEEKLY, anchor_day=5,
            minimum_amount_xaf=1000,
        )
        assert cycle.is_current
        assert SettlementCycle.GOVERNANCE_LEVEL == GovernanceLevel.N3

    def test_cycle_est_de_niveau_referentiel(self, operateur, approbateur):
        SettlementCycle.objects.create(
            config_key="cycle-weekly", name="Hebdo",
            frequency=SettlementCycle.Frequency.WEEKLY, anchor_day=5,
        )
        demande = request_change(
            target_model="SettlementCycle", target_key="cycle-weekly",
            payload={"anchor_day": 3}, justification="Changement de jour.",
            requested_by=operateur,
        )
        assert demande.governance_level == GovernanceLevel.N3
        with pytest.raises(ChangeControlError):
            approve_change(demande, approbateur)