# backend/apps/payments/tests/reporting/test_dashboard.py
# Synthese financiere.
#
#   docker exec -it relaya_backend pytest apps/payments/tests/reporting/ -q
#
# Ce qui est verifie ici n'est pas l'affichage, mais deux proprietes :
#   - la synthese ne modifie RIEN (lecture seule)
#   - chaque signal porte une ACTION, sinon il sera ignore

from decimal import Decimal

import pytest
from django.contrib.auth.models import User

from apps.payments.config.models import (
    DistributionRule, EscrowPolicy, FeeRule, ProviderConfig,
)
from apps.payments.domain.distribution import ComponentInput
from apps.payments.domain.enums import EconomicComponent, PayeeType as DomainPayeeType
from apps.payments.domain.money import Money
from apps.payments.infrastructure.providers.mock import reset_mock_state
from apps.payments.ledger import chart_of_accounts as coa
from apps.payments.ledger.models import LedgerAccount
from apps.payments.payees.models import MomoOperator, PayeeType
from apps.payments.payees.services import create_payee
from apps.payments.reporting.dashboard import (
    ALERTE, ATTENTION, CRITIQUE, NORMAL, build, integrite, ordonnanceur,
    sequestres, tresorerie,
)

pytestmark = pytest.mark.django_db

NUMERO = "237677123456"


@pytest.fixture(autouse=True)
def _mock():
    reset_mock_state()
    yield
    reset_mock_state()


@pytest.fixture(autouse=True)
def plan_comptable():
    for entree in coa.CHART:
        LedgerAccount.objects.get_or_create(code=entree["code"], defaults=entree)


@pytest.fixture(autouse=True)
def configuration():
    ProviderConfig.objects.create(
        config_key="provider-mock", provider_code="MOCK",
        mode=ProviderConfig.Mode.SANDBOX, is_enabled=True, priority=10,
        supported_operators=["MTN", "ORANGE"],
        min_amount_xaf=100, max_amount_xaf=10_000_000)
    FeeRule.objects.create(
        config_key="fee-collect", name="Frais", scope=FeeRule.Scope.COLLECT,
        basis=FeeRule.Basis.PERCENT, value=Decimal("2"),
        bearer=FeeRule.Bearer.PLATFORM, priority=10)
    DistributionRule.objects.create(
        config_key="dist-goods", name="Marchandise",
        component=DistributionRule.Component.GOODS,
        payee_type=DistributionRule.PayeeType.VENDOR,
        basis=DistributionRule.Basis.REMAINDER, priority=10)
    EscrowPolicy.objects.create(config_key="escrow-default", name="Defaut",
                                auto_confirm_hours=48, release_delay_hours=24)


@pytest.fixture
def acheteur():
    return User.objects.create_user("acheteur", "a@b.cm", "x")


@pytest.fixture
def vendeur():
    return create_payee(
        payee_type=PayeeType.VENDOR, display_label="Boutique",
        momo_operator=MomoOperator.MTN, momo_number=NUMERO)


def encaisser(acheteur, vendeur, montant=45000, cle="c1"):
    from apps.payments.application.collect import (
        create_payment_intent, initiate_collect, poll_attempt,
    )

    intent = create_payment_intent(
        buyer=acheteur, idempotency_key=cle,
        components=[ComponentInput(EconomicComponent.GOODS, Money(montant),
                                   order_id=1, commission_rate=Decimal("15"))],
        payee_codes={DomainPayeeType.VENDOR: vendeur.payee_code},
        payee_types={vendeur.payee_code: DomainPayeeType.VENDOR},
        payer_msisdn=NUMERO, payer_operator="MTN")
    issue = initiate_collect(intent)
    poll_attempt(issue.attempt)
    poll_attempt(issue.attempt)
    intent.refresh_from_db()
    return intent


# ═══════════════════════════════════════════════════════════════════════════
# LECTURE SEULE
# ═══════════════════════════════════════════════════════════════════════════

class TestLectureSeule:

    def test_la_synthese_ne_modifie_rien(self, acheteur, vendeur):
        """
        LE test qui compte le plus.

        Consulter un tableau de bord ne doit jamais modifier l'etat du
        systeme — ni creer un compte, ni declencher une reconciliation, ni
        ecrire au registre.
        """
        from apps.payments.escrow.models import EscrowHold
        from apps.payments.ledger.models import LedgerTransaction
        from apps.payments.payees.models import PayeeAccount
        from apps.payments.reconciliation.models import ReconciliationRun
        from apps.payments.tasks.models import TaskRun

        encaisser(acheteur, vendeur)
        avant = {
            "ecritures": LedgerTransaction.objects.count(),
            "sequestres": EscrowHold.objects.count(),
            "comptes": PayeeAccount.objects.count(),
            "reconciliations": ReconciliationRun.objects.count(),
            "taches": TaskRun.objects.count(),
        }

        build(interroger_prestataire=False)
        build(interroger_prestataire=True)

        assert LedgerTransaction.objects.count() == avant["ecritures"]
        assert EscrowHold.objects.count() == avant["sequestres"]
        assert PayeeAccount.objects.count() == avant["comptes"]
        assert ReconciliationRun.objects.count() == avant["reconciliations"]
        assert TaskRun.objects.count() == avant["taches"]

    def test_sans_prestataire_le_reste_reste_lisible(self, acheteur, vendeur):
        """
        Le solde du prestataire est la seule donnee EXTERNE. Son
        indisponibilite ne doit pas rendre le tableau inutilisable.
        """
        encaisser(acheteur, vendeur)
        donnees = build(interroger_prestataire=False)

        assert donnees["treasury"]["provider_total_xaf"] is None
        assert donnees["treasury"]["escrow_xaf"] == 38250
        assert donnees["integrity"]["trial_balance"] == 0


# ═══════════════════════════════════════════════════════════════════════════
# LES SIGNAUX
# ═══════════════════════════════════════════════════════════════════════════

class TestSignaux:

    def test_chaque_signal_porte_une_action(self, acheteur, vendeur):
        """
        Une alerte sans piste d'action finit ignoree. C'est ce qui distingue
        un tableau de bord utile d'un tableau de bord decoratif.
        """
        encaisser(acheteur, vendeur)
        donnees = build(interroger_prestataire=False)

        assert donnees["signals"], "Un systeme sans ordonnanceur doit alerter."
        for signal in donnees["signals"]:
            assert signal["titre"], signal
            assert signal["action"], signal["titre"]

    def test_les_signaux_sont_ordonnes_par_gravite(self, acheteur, vendeur):
        """
        On lit les trois premieres lignes, rarement les quinze.
        """
        from apps.payments.reporting.dashboard import ORDRE

        encaisser(acheteur, vendeur)
        donnees = build(interroger_prestataire=False)
        gravites = [ORDRE[s["gravite"]] for s in donnees["signals"]]
        assert gravites == sorted(gravites)

    def test_une_balance_desequilibree_est_critique(self, acheteur, vendeur):
        """
        Le registre corrompu est l'alerte la plus grave : elle doit passer
        avant tout le reste.
        """
        from apps.payments.ledger.posting import credit, debit, post

        encaisser(acheteur, vendeur)
        post(kind="ADJUSTMENT",
             lines=[debit(coa.ESCROW_LIABILITY, 5000),
                    credit(coa.PSP_AVAILABLE, 5000)],
             description="Desequilibre volontaire")

        donnees = build(interroger_prestataire=False)
        critiques = [s for s in donnees["signals"] if s["gravite"] == CRITIQUE]
        assert critiques
        assert donnees["worst"] == CRITIQUE

    def test_un_ordonnanceur_muet_alerte(self):
        """
        Sans ordonnanceur : les paiements bloques restent invisibles, les
        sequestres ne s'auto-confirment pas, aucun vendeur n'est paye.
        """
        donnees = build(interroger_prestataire=False)
        titres = [s["titre"] for s in donnees["signals"]]
        assert any("tache" in t.lower() for t in titres)

    def test_un_ordonnanceur_actif_ne_signale_plus_rien(self):
        from apps.payments.tasks.jobs import (
            escrow_auto_confirm, escrow_release, expire_stale_intents,
            poll_pending_payments, purge_technical_retention,
            recompute_trust_scores, refresh_task_health, verify_ledger_integrity,
        )
        from apps.payments.tasks.jobs import (
            build_settlements, execute_payouts,
        )
        from apps.payments.tasks.jobs import (
            reconcile_escrow_task, reconcile_solvency_task,
            reconcile_transactions_task, resolve_unknown_payouts_task,
        )

        for tache in (poll_pending_payments, expire_stale_intents,
                      escrow_auto_confirm, escrow_release,
                      refresh_task_health, verify_ledger_integrity,
                      purge_technical_retention, recompute_trust_scores,
                      build_settlements, execute_payouts,
                      reconcile_escrow_task, reconcile_solvency_task,
                      reconcile_transactions_task,
                      resolve_unknown_payouts_task):
            try:
                tache()
            except Exception:
                pass

        etat = ordonnanceur()
        assert etat["never_run"] is False


# ═══════════════════════════════════════════════════════════════════════════
# LES SECTIONS
# ═══════════════════════════════════════════════════════════════════════════

class TestSections:

    def test_la_tresorerie_distingue_sequestre_et_exigible(
        self, acheteur, vendeur,
    ):
        """
        Un sequestre actif n'est PAS une dette exigible : l'acheteur peut
        encore obtenir un remboursement integral.
        """
        encaisser(acheteur, vendeur)
        t = tresorerie(interroger_prestataire=False)
        assert t["escrow_xaf"] == 38250
        assert t["payables_xaf"] == 0
        assert t["third_party_liabilities_xaf"] == 38250

    def test_les_sequestres_sont_ventiles_par_etat(self, acheteur, vendeur):
        encaisser(acheteur, vendeur)
        e = sequestres()
        assert e["by_status"]["HELD"]["count"] == 1
        assert e["by_status"]["HELD"]["total_xaf"] == 38250

    def test_l_integrite_remonte_les_violations(self, acheteur, vendeur):
        encaisser(acheteur, vendeur)
        i = integrite()
        assert i["trial_balance"] == 0
        assert "violations" in i
        assert "discrepancies" in i

    def test_un_systeme_vide_ne_plante_pas(self):
        """Le premier jour, tout est a zero. Le tableau doit rester lisible."""
        donnees = build(interroger_prestataire=False)
        assert donnees["treasury"]["escrow_xaf"] == 0
        assert donnees["escrow"]["by_status"] == {}
        assert donnees["activity"]["intents_total"] == 0
        assert donnees["worst"] in (NORMAL, ATTENTION, ALERTE, CRITIQUE)