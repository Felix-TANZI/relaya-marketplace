# backend/apps/payments/tests/reporting/test_analytics.py
# Series temporelles et pilotage.
#
#   docker exec -it relaya_backend pytest apps/payments/tests/reporting/ -q
#
# ─────────────────────────────────────────────────────────────────────────────
# CE QUI EST VERIFIE
#
#   1. la lecture ne modifie RIEN
#   2. les jours creux apparaissent — un graphique qui les saute ment
#   3. un systeme vide ne plante pas
#   4. les taux ne divisent jamais par zero
# ─────────────────────────────────────────────────────────────────────────────

from datetime import timedelta
from decimal import Decimal

import pytest
from django.contrib.auth.models import User
from django.utils import timezone

from apps.payments.application.collect import (
    create_payment_intent, initiate_collect, poll_attempt,
)
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
from apps.payments.reporting import analytics

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


def encaisser(acheteur, vendeur, montant=45000, cle="c1", order_id=1,
              operateur="MTN"):
    intent = create_payment_intent(
        buyer=acheteur, idempotency_key=cle,
        components=[ComponentInput(EconomicComponent.GOODS, Money(montant),
                                   order_id=order_id,
                                   commission_rate=Decimal("15"))],
        payee_codes={DomainPayeeType.VENDOR: vendeur.payee_code},
        payee_types={vendeur.payee_code: DomainPayeeType.VENDOR},
        payer_msisdn=NUMERO, payer_operator=operateur)
    issue = initiate_collect(intent)
    poll_attempt(issue.attempt)
    poll_attempt(issue.attempt)
    intent.refresh_from_db()
    return intent


# ═══════════════════════════════════════════════════════════════════════════
# LECTURE SEULE
# ═══════════════════════════════════════════════════════════════════════════

class TestLectureSeule:

    def test_le_pilotage_ne_modifie_rien(self, acheteur, vendeur):
        """
        Un ecran d'analyse consulte souvent — parfois toutes les minutes
        depuis une supervision. Il ne doit jamais rien ecrire.
        """
        from apps.payments.escrow.models import EscrowHold
        from apps.payments.intents.models import PaymentIntent
        from apps.payments.ledger.models import LedgerTransaction

        encaisser(acheteur, vendeur)
        avant = (LedgerTransaction.objects.count(),
                 EscrowHold.objects.count(),
                 PaymentIntent.objects.count())

        analytics.build(days=30)
        analytics.build(days=90)

        assert (LedgerTransaction.objects.count(),
                EscrowHold.objects.count(),
                PaymentIntent.objects.count()) == avant


# ═══════════════════════════════════════════════════════════════════════════
# SERIES
# ═══════════════════════════════════════════════════════════════════════════

class TestSeries:

    def test_les_jours_creux_apparaissent(self, acheteur, vendeur):
        """
        LE test qui protege la lecture d'un graphique.

        Une serie qui saute les jours sans activite ment sur la tendance :
        trois ventes lundi et trois vendredi ressembleraient a six jours
        d'activite continue.
        """
        encaisser(acheteur, vendeur)
        serie = analytics.collections_series(days=30)

        assert len(serie) == 30
        vides = [jour for jour in serie if jour["count"] == 0]
        assert len(vides) >= 28

    def test_la_serie_est_chronologique(self):
        serie = analytics.collections_series(days=14)
        dates = [jour["date"] for jour in serie]
        assert dates == sorted(dates)

    def test_les_remboursements_sont_sur_la_meme_echelle(
        self, acheteur, vendeur,
    ):
        """
        Un pic d'encaissement suivi d'un pic de remboursement n'est pas une
        bonne semaine. Les afficher separement le masquerait.
        """
        serie = analytics.collections_series(days=7)
        assert all("refunded_xaf" in jour for jour in serie)

    def test_un_systeme_vide_ne_plante_pas(self):
        """Le premier jour, tout est a zero."""
        donnees = analytics.build(days=30)
        assert donnees["summary"]["current"]["collected_xaf"] == 0
        assert donnees["funnel"]["total"] == 0
        assert donnees["operators"] == []
        assert len(donnees["collections"]) == 30


# ═══════════════════════════════════════════════════════════════════════════
# TAUX ET COMPARAISONS
# ═══════════════════════════════════════════════════════════════════════════

class TestTaux:

    def test_aucune_division_par_zero(self):
        """Sans activite, tous les taux valent zero — jamais une erreur."""
        entonnoir = analytics.conversion_funnel(days=30)
        assert entonnoir["success_rate"] == 0.0
        assert entonnoir["failure_rate"] == 0.0
        assert entonnoir["abandon_rate"] == 0.0

        assert analytics.dispute_stats(days=30)["dispute_rate"] == 0.0

    def test_une_variation_depuis_zero_est_nulle(self, acheteur, vendeur):
        """
        Une hausse depuis zero n'a pas de sens : on retourne None plutot
        qu'un « +∞ » qui n'informe personne.
        """
        encaisser(acheteur, vendeur)
        resume = analytics.collections_summary(days=30)
        assert resume["change_percent"]["collected"] is None

    def test_l_abandon_est_distingue_de_l_echec(self, acheteur, vendeur):
        """
        Un abandon n'est pas un incident technique : l'acheteur n'a pas
        compose son code. Les confondre masquerait une vraie panne
        prestataire.
        """
        entonnoir = analytics.conversion_funnel(days=30)
        assert "abandon_rate" in entonnoir
        assert "failure_rate" in entonnoir

    def test_le_taux_de_reussite_est_calcule(self, acheteur, vendeur):
        encaisser(acheteur, vendeur)
        entonnoir = analytics.conversion_funnel(days=30)
        assert entonnoir["total"] == 1
        assert entonnoir["succeeded"] == 1
        assert entonnoir["success_rate"] == 100.0


# ═══════════════════════════════════════════════════════════════════════════
# SECTIONS
# ═══════════════════════════════════════════════════════════════════════════

class TestSections:

    def test_la_repartition_par_operateur(self, acheteur, vendeur):
        """
        Un desequilibre soudain revele souvent une panne d'operateur avant
        qu'elle ne soit annoncee.
        """
        encaisser(acheteur, vendeur, cle="mtn", operateur="MTN")
        operateurs = analytics.operator_split(days=30)

        assert len(operateurs) == 1
        assert operateurs[0]["operator"] == "MTN"
        assert operateurs[0]["success_rate"] == 100.0

    def test_les_frais_sont_lus_au_registre(self, acheteur, vendeur):
        """
        `PaymentAttempt` ne porte AUCUN champ de frais : ils vivent aux
        comptes 5010 et 5011. Le registre est la seule source qui les
        connaisse tous.
        """
        encaisser(acheteur, vendeur)
        revenus = analytics.revenue_breakdown(days=30)

        assert revenus["psp_fees_collect_xaf"] > 0
        assert revenus["net_margin_xaf"] == (
            revenus["revenue_total_xaf"] - revenus["psp_fees_total_xaf"]
        )

    def test_l_anciennete_des_sequestres(self, acheteur, vendeur):
        """
        Un sequestre vieux de plus de trente jours signale une commande
        oubliee : ni confirmee, ni contestee, ni auto-confirmee.
        """
        encaisser(acheteur, vendeur)
        tranches = analytics.escrow_aging()

        assert len(tranches) == 5
        assert tranches[0]["count"] == 1
        assert tranches[-1]["label"].startswith("plus de")

    def test_un_vieux_sequestre_tombe_dans_la_bonne_tranche(
        self, acheteur, vendeur,
    ):
        from apps.payments.escrow.models import EscrowHold

        intent = encaisser(acheteur, vendeur)
        EscrowHold.objects.filter(intent=intent).update(
            created_at=timezone.now() - timedelta(days=45))

        tranches = analytics.escrow_aging()
        assert tranches[-1]["count"] == 1
        assert tranches[0]["count"] == 0

    def test_les_partenaires_les_plus_regles(self, acheteur, vendeur):
        assert analytics.top_payees(days=30) == []

    def test_les_motifs_d_echec_sont_agreges(self):
        assert analytics.failure_reasons(days=30) == []


# ═══════════════════════════════════════════════════════════════════════════
# API
# ═══════════════════════════════════════════════════════════════════════════

class TestEndpoint:

    def test_l_habilitation_est_exigee(self):
        from rest_framework.test import APIClient

        client = APIClient()
        client.force_authenticate(
            user=User.objects.create_user("simple", "s@b.cm", "x", is_staff=True))
        reponse = client.get("/api/payments/v2/admin/analytics/")
        assert reponse.status_code == 403

    def test_la_periode_est_bornee(self):
        """
        Au-dela d'un an, la requete coute plus qu'elle n'apprend.
        """
        from django.contrib.auth.models import Group
        from rest_framework.test import APIClient

        from apps.payments.api.admin.permissions import FINANCE_GROUP

        membre = User.objects.create_user("fin", "f@b.cm", "x", is_staff=True)
        groupe, _ = Group.objects.get_or_create(name=FINANCE_GROUP)
        membre.groups.add(groupe)

        client = APIClient()
        client.force_authenticate(user=membre)

        assert client.get(
            "/api/payments/v2/admin/analytics/?days=9999",
        ).json()["period_days"] == 365
        assert client.get(
            "/api/payments/v2/admin/analytics/?days=1",
        ).json()["period_days"] == 7
        assert client.get(
            "/api/payments/v2/admin/analytics/?days=abc",
        ).json()["period_days"] == 30