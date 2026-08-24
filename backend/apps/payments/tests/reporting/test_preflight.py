# backend/apps/payments/tests/reporting/test_preflight.py
# Controle avant production.
#
#   docker exec -it relaya_backend pytest apps/payments/tests/reporting/ -q
#
# ─────────────────────────────────────────────────────────────────────────────
# CE QUI EST VERIFIE ICI
#
# Pas l'affichage, mais deux proprietes :
#   - un defaut de production est bien DETECTE et classe BLOQUANT
#   - chaque constat porte une CORRECTION, sinon il sera ignore
#
# Ces defauts ne font echouer aucun test fonctionnel. C'est precisement
# pourquoi ils ont besoin d'un controle dedie.
# ─────────────────────────────────────────────────────────────────────────────

from decimal import Decimal
from io import StringIO

import pytest
from django.core.management import call_command
from django.test import override_settings

from apps.payments.config.models import (
    DistributionRule, EscrowPolicy, PayoutPolicy, ProviderConfig,
)
from apps.payments.ledger import chart_of_accounts as coa
from apps.payments.ledger.models import LedgerAccount

pytestmark = pytest.mark.django_db

CLE_VALIDE = "Zm9vYmFyYmF6cXV4MTIzNDU2Nzg5MGFiY2RlZmdoaQ="
SEL_VALIDE = "un-sel-suffisamment-long-pour-passer-le-controle"


def executer(**reglages):
    """Lance le controle et retourne (sortie, code)."""
    defauts = {
        "DEBUG": False,
        "ALLOWED_HOSTS": ["belivay.com"],
        "SECRET_KEY": "cle-de-production-aleatoire-et-longue-1234567890",
        "PAYMENTS_ENCRYPTION_KEY": CLE_VALIDE,
        "PAYMENTS_FINGERPRINT_SALT": SEL_VALIDE,
        "CAMPAY_WEBHOOK_KEY": "cle-webhook",
        "CAMPAY_TOKEN_LIVE": "jeton-live",
    }
    defauts.update(reglages)

    tampon = StringIO()
    code = 0
    with override_settings(**defauts):
        try:
            call_command("payments_preflight", stdout=tampon)
        except SystemExit as sortie:
            code = sortie.code
    return tampon.getvalue(), code


@pytest.fixture
def configuration_saine():
    for entree in coa.CHART:
        LedgerAccount.objects.get_or_create(code=entree["code"], defaults=entree)
    ProviderConfig.objects.create(
        config_key="provider-campay", provider_code="CAMPAY",
        mode="LIVE", is_enabled=True, is_payout_enabled=False, priority=100,
        supported_operators=["MTN", "ORANGE"],
        min_amount_xaf=100, max_amount_xaf=1_000_000)
    DistributionRule.objects.create(
        config_key="dist-goods-vendor", name="Marchandise",
        component="GOODS", payee_type="VENDOR",
        basis="PERCENT_OF_COMPONENT", value=Decimal("85"), priority=20)
    DistributionRule.objects.create(
        config_key="dist-goods-platform", name="Repli marchandise",
        component="GOODS", payee_type="PLATFORM",
        basis="REMAINDER", priority=10)
    DistributionRule.objects.create(
        config_key="dist-transport-platform", name="Repli transport",
        component="TRANSPORT", payee_type="PLATFORM",
        basis="REMAINDER", priority=10)
    EscrowPolicy.objects.create(config_key="escrow-default", name="Defaut",
                                auto_confirm_hours=48, release_delay_hours=24)
    PayoutPolicy.objects.create(config_key="payout-default", name="Defaut",
                                min_payout_xaf=1000, max_payout_xaf=5_000_000,
                                momo_change_cooling_hours=72)


# ═══════════════════════════════════════════════════════════════════════════
# LES DEFAUTS BLOQUANTS
# ═══════════════════════════════════════════════════════════════════════════

class TestDefautsBloquants:

    def test_debug_actif_est_bloquant(self, configuration_saine):
        """
        DEBUG exposerait les traces, les requetes SQL et les variables
        d'environnement — dont les cles de chiffrement.
        """
        sortie, code = executer(DEBUG=True)
        assert "DEBUG est actif" in sortie
        assert code == 2

    def test_le_prestataire_factice_est_bloquant(self, configuration_saine):
        """
        LE defaut le plus dangereux : les paiements seraient SIMULES. Les
        acheteurs seraient debites de rien, et les commandes marquees payees.
        """
        ProviderConfig.objects.create(
            config_key="provider-mock", provider_code="MOCK",
            mode="SANDBOX", is_enabled=True, priority=10,
            supported_operators=["MTN"], min_amount_xaf=100,
            max_amount_xaf=100000)
        sortie, code = executer()
        assert "MOCK est ACTIF" in sortie
        assert code == 2

    def test_cle_de_chiffrement_absente_est_bloquante(self, configuration_saine):
        sortie, code = executer(PAYMENTS_ENCRYPTION_KEY="")
        assert "PAYMENTS_ENCRYPTION_KEY absente" in sortie
        assert code == 2

    def test_secret_key_de_developpement_est_bloquante(self, configuration_saine):
        sortie, code = executer(
            SECRET_KEY="django-insecure-abcdefghijklmnop")
        assert "SECRET_KEY de developpement" in sortie
        assert code == 2

    def test_transport_sans_repli_est_bloquant(self, configuration_saine):
        """
        C'est le defaut qui bloquait TOUS les checkouts avec frais de
        livraison, et qu'aucun test unitaire n'avait vu.

        Le transporteur est assigne APRES le checkout : sans repli, le plan
        echoue et tout le paiement est refuse.
        """
        DistributionRule.objects.filter(
            config_key="dist-transport-platform").update(is_active=False)
        DistributionRule.objects.create(
            config_key="dist-transport-carrier", name="Transporteur",
            component="TRANSPORT", payee_type="DELIVERY_COMPANY",
            basis="PERCENT_OF_COMPONENT", value=Decimal("70"), priority=20)

        sortie, code = executer()
        assert "TRANSPORT sans regle de repli" in sortie
        assert code == 2

    def test_la_marchandise_n_exige_aucun_repli(self):
        """
        LE test qui corrige un faux positif de ma premiere version.

        Un VENDEUR est toujours connu au checkout : un produit a un vendeur.
        Exiger un repli PLATFORM sur GOODS reviendrait a dire « si aucun
        vendeur, la plateforme garde l'argent de la marchandise » — un
        detournement silencieux.

        Une marchandise sans vendeur DOIT faire echouer le plan.
        """
        for entree in coa.CHART:
            LedgerAccount.objects.get_or_create(
                code=entree["code"], defaults=entree)
        ProviderConfig.objects.create(
            config_key="provider-campay", provider_code="CAMPAY",
            mode="LIVE", is_enabled=True, priority=100,
            supported_operators=["MTN"], min_amount_xaf=100,
            max_amount_xaf=1_000_000)
        # GOODS -> VENDOR en REMAINDER, sans aucun repli PLATFORM.
        DistributionRule.objects.create(
            config_key="dist-goods", name="Marchandise",
            component="GOODS", payee_type="VENDOR",
            basis="REMAINDER", priority=10)
        EscrowPolicy.objects.create(config_key="escrow-default", name="D",
                                    auto_confirm_hours=48,
                                    release_delay_hours=24)
        PayoutPolicy.objects.create(config_key="payout-default", name="D",
                                    min_payout_xaf=1000,
                                    max_payout_xaf=5_000_000,
                                    momo_change_cooling_hours=72)

        sortie, code = executer()
        # Les constats reussis ne s'affichent qu'avec --show-ok : on verifie
        # donc l'ABSENCE du faux positif. L'ordonnanceur reste bloquant dans
        # ce contexte de test, mais il ne concerne pas ce controle.
        assert "GOODS sans regle de repli" not in sortie
        assert "sans regle de repli" not in sortie

    def test_le_point_relais_exige_un_repli(self, configuration_saine):
        """
        Comme le transporteur, un point relais peut ne pas etre connu au
        checkout.
        """
        DistributionRule.objects.create(
            config_key="dist-relay", name="Remise en relais",
            component="RELAY_HANDLING", payee_type="RELAY_POINT",
            basis="FIXED", value=Decimal("500"), priority=20)

        sortie, code = executer()
        assert "RELAY_HANDLING sans regle de repli" in sortie
        assert code == 2

    def test_plan_comptable_vide_est_bloquant(self):
        ProviderConfig.objects.create(
            config_key="provider-campay", provider_code="CAMPAY",
            mode="LIVE", is_enabled=True, priority=100,
            supported_operators=["MTN"], min_amount_xaf=100,
            max_amount_xaf=100000)
        sortie, code = executer()
        assert "Plan comptable vide" in sortie
        assert code == 2

    def test_aucun_prestataire_est_bloquant(self):
        for entree in coa.CHART:
            LedgerAccount.objects.get_or_create(
                code=entree["code"], defaults=entree)
        sortie, code = executer()
        assert "Aucun prestataire actif" in sortie
        assert code == 2


# ═══════════════════════════════════════════════════════════════════════════
# LES ALERTES
# ═══════════════════════════════════════════════════════════════════════════

class TestAlertes:

    def test_montant_minimum_abaisse_alerte(self, configuration_saine):
        """
        Le reglage qui se glisse depuis un test de bac a sable, puis reste.
        Un encaissement de 1 FCFA couterait plus en frais qu'il ne rapporte.
        """
        ProviderConfig.objects.filter(
            config_key="provider-campay").update(min_amount_xaf=1)
        sortie, code = executer()
        assert "Montant minimum a 1 FCFA" in sortie
        assert "bac a sable" in sortie

    def test_mode_sandbox_alerte(self, configuration_saine):
        ProviderConfig.objects.filter(
            config_key="provider-campay").update(mode="SANDBOX")
        sortie, code = executer()
        assert "SANDBOX" in sortie

    def test_live_sans_jeton_est_bloquant(self, configuration_saine):
        sortie, code = executer(CAMPAY_TOKEN_LIVE="")
        assert "sans jeton LIVE" in sortie
        assert code == 2

    def test_hotes_ouverts_alerte(self, configuration_saine):
        sortie, code = executer(ALLOWED_HOSTS=["*"])
        assert "ALLOWED_HOSTS accepte tout" in sortie


# ═══════════════════════════════════════════════════════════════════════════
# LA FORME DU RAPPORT
# ═══════════════════════════════════════════════════════════════════════════

class TestRapport:

    def test_chaque_defaut_porte_une_correction(self, configuration_saine):
        """
        Un controle qui signale sans dire quoi faire fait perdre du temps.
        """
        sortie, code = executer(DEBUG=True, ALLOWED_HOSTS=["*"],
                                PAYMENTS_ENCRYPTION_KEY="")
        # Chaque bloc de defaut doit contenir une fleche de correction.
        blocs = [b for b in sortie.split("\n\n")
                 if "[BLOQUANT]" in b or "[ALERTE]" in b]
        assert blocs
        for bloc in blocs:
            assert "->" in bloc, bloc

    def test_le_bilan_est_toujours_affiche(self, configuration_saine):
        sortie, code = executer()
        assert "Bilan" in sortie
        assert "controle(s) reussi(s)" in sortie

    def test_les_bloquants_viennent_en_premier(self, configuration_saine):
        sortie, code = executer(DEBUG=True, ALLOWED_HOSTS=["*"])
        position_bloquant = sortie.find("[BLOQUANT]")
        position_alerte = sortie.find("[ALERTE]")
        assert position_bloquant != -1
        assert position_alerte == -1 or position_bloquant < position_alerte

    def test_le_controle_ne_modifie_rien(self, configuration_saine):
        """
        Un controle de production ne doit RIEN corriger : corriger
        automatiquement un reglage de production serait pire que le
        probleme.
        """
        from apps.payments.ledger.models import LedgerTransaction
        from apps.payments.tasks.models import TaskRun

        avant = (ProviderConfig.objects.count(),
                 DistributionRule.objects.count(),
                 LedgerTransaction.objects.count(),
                 TaskRun.objects.count())
        executer()
        executer(DEBUG=True)
        apres = (ProviderConfig.objects.count(),
                 DistributionRule.objects.count(),
                 LedgerTransaction.objects.count(),
                 TaskRun.objects.count())
        assert avant == apres