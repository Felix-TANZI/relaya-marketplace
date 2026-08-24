# backend/apps/payments/tests/api/test_admin_api.py
# API d'administration financiere.
#
#   docker exec -it relaya_backend pytest apps/payments/tests/api/ -q
#
# ─────────────────────────────────────────────────────────────────────────────
# CE QUI EST VERIFIE EN PRIORITE
#
#   1. is_staff NE SUFFIT PAS — c'est toute la raison d'etre de cette couche
#   2. Les actions passent par les SERVICES, donc heritent de leurs garde-fous
#   3. Une interface ne peut pas contourner la separation des roles
#
# Le troisieme point est le plus important. Une API d'administration mal
# concue permettrait, par un simple appel HTTP, ce que l'interface interdit
# visuellement.
# ─────────────────────────────────────────────────────────────────────────────

from decimal import Decimal

import pytest
from django.contrib.auth.models import Group, User
from rest_framework.test import APIClient

from apps.payments.api.admin.permissions import FINANCE_GROUP
from apps.payments.application.collect import (
    create_payment_intent, initiate_collect, poll_attempt,
)
from apps.payments.config.models import (
    DistributionRule, EscrowPolicy, FeeRule, PayoutPolicy, ProviderConfig,
    SettlementCycle,
)
from apps.payments.domain.distribution import ComponentInput
from apps.payments.domain.enums import EconomicComponent, PayeeType as DomainPayeeType
from apps.payments.domain.money import Money
from apps.payments.escrow.models import EscrowHold
from apps.payments.infrastructure.providers.mock import reset_mock_state
from apps.payments.ledger import chart_of_accounts as coa
from apps.payments.ledger.models import LedgerAccount
from apps.payments.payees.models import MomoOperator, PayeeType
from apps.payments.payees.services import create_payee
from apps.payments.settlements.models import PayoutRequest, Refund

pytestmark = pytest.mark.django_db

BASE = "/api/payments/v2/admin"
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
        mode=ProviderConfig.Mode.SANDBOX, is_enabled=True,
        is_payout_enabled=True, priority=10,
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
    PayoutPolicy.objects.create(config_key="payout-default", name="Defaut",
                                min_payout_xaf=100, max_payout_xaf=5_000_000,
                                momo_change_cooling_hours=72)
    SettlementCycle.objects.create(config_key="cycle-weekly", name="Hebdo",
                                   frequency=SettlementCycle.Frequency.WEEKLY,
                                   anchor_day=5, minimum_amount_xaf=1000)


def utilisateur(nom, **options):
    return User.objects.create_user(nom, f"{nom}@b.cm", "x", **options)


@pytest.fixture
def anonyme():
    return APIClient()


@pytest.fixture
def simple():
    client = APIClient()
    client.force_authenticate(user=utilisateur("simple"))
    return client


@pytest.fixture
def personnel():
    """is_staff, mais PAS habilite finance."""
    client = APIClient()
    client.force_authenticate(user=utilisateur("personnel", is_staff=True))
    return client


@pytest.fixture
def finance():
    membre = utilisateur("finance-1", is_staff=True)
    groupe, _ = Group.objects.get_or_create(name=FINANCE_GROUP)
    membre.groups.add(groupe)
    client = APIClient()
    client.force_authenticate(user=membre)
    client.membre = membre
    return client


@pytest.fixture
def finance2():
    membre = utilisateur("finance-2", is_staff=True)
    groupe, _ = Group.objects.get_or_create(name=FINANCE_GROUP)
    membre.groups.add(groupe)
    client = APIClient()
    client.force_authenticate(user=membre)
    client.membre = membre
    return client


@pytest.fixture
def patron():
    client = APIClient()
    client.force_authenticate(
        user=User.objects.create_superuser("patron", "p@b.cm", "x"))
    return client


@pytest.fixture
def vendeur():
    """
    Vendeur PRET a etre paye.

    Deux garde-fous du Lot 4 doivent etre leves explicitement, sinon aucun
    versement n'est possible :
      - le KYC doit etre verifie
      - le refroidissement de 72 h apres saisie du numero doit etre passe

    Les lever ici rend le test lisible ; les oublier ferait echouer des
    tests qui portent sur autre chose.
    """
    from datetime import timedelta

    from django.utils import timezone

    from apps.payments.payees.models import KycStatus, PayeeAccount

    compte = create_payee(
        payee_type=PayeeType.VENDOR, display_label="Boutique",
        momo_operator=MomoOperator.MTN, momo_number=NUMERO)
    PayeeAccount.objects.filter(pk=compte.pk).update(
        kyc_status=KycStatus.VERIFIED,
        momo_changed_at=timezone.now() - timedelta(days=10))
    compte.refresh_from_db()
    return compte


@pytest.fixture
def acheteur():
    return utilisateur("acheteur")


def encaisser(acheteur, vendeur, montant=45000, cle="c1", order_id=1):
    intent = create_payment_intent(
        buyer=acheteur, idempotency_key=cle,
        components=[ComponentInput(EconomicComponent.GOODS, Money(montant),
                                   order_id=order_id,
                                   commission_rate=Decimal("15"))],
        payee_codes={DomainPayeeType.VENDOR: vendeur.payee_code},
        payee_types={vendeur.payee_code: DomainPayeeType.VENDOR},
        payer_msisdn=NUMERO, payer_operator="MTN")
    issue = initiate_collect(intent)
    poll_attempt(issue.attempt)
    poll_attempt(issue.attempt)
    intent.refresh_from_db()
    return intent


# ═══════════════════════════════════════════════════════════════════════════
# HABILITATION
# ═══════════════════════════════════════════════════════════════════════════

class TestHabilitation:

    CHEMINS = [
        "/dashboard/", "/intents/", "/escrow/", "/settlements/",
        "/payouts/", "/refunds/", "/adjustments/", "/payees/",
        "/reconciliation/runs/", "/reconciliation/discrepancies/",
        "/risk/assessments/", "/risk/trust-scores/", "/tasks/health/",
    ]

    def test_l_anonyme_est_refuse(self, anonyme):
        for chemin in self.CHEMINS:
            assert anonyme.get(f"{BASE}{chemin}").status_code in (401, 403), chemin

    def test_un_utilisateur_simple_est_refuse(self, simple):
        for chemin in self.CHEMINS:
            assert simple.get(f"{BASE}{chemin}").status_code == 403, chemin

    def test_is_staff_NE_SUFFIT_PAS(self, personnel):
        """
        LE test qui justifie toute cette couche.

        Jusqu'ici, tout membre du personnel pouvait ouvrir l'administration
        Django et approuver un versement de 400 000 FCFA. Le seul obstacle
        etait l'inconfort de l'interface — ce n'est pas un controle d'acces.
        """
        for chemin in self.CHEMINS:
            assert personnel.get(f"{BASE}{chemin}").status_code == 403, chemin

    def test_le_groupe_finance_ouvre_l_acces(self, finance):
        for chemin in self.CHEMINS:
            assert finance.get(f"{BASE}{chemin}").status_code == 200, chemin

    def test_le_superutilisateur_passe_toujours(self, patron):
        """
        Sans cette porte, personne ne pourrait creer le groupe le jour du
        deploiement — on se retrouverait enferme dehors.
        """
        for chemin in self.CHEMINS:
            assert patron.get(f"{BASE}{chemin}").status_code == 200, chemin

    def test_aucun_repli_silencieux_sur_is_staff(self, personnel):
        """
        Un repli annulerait la protection tout en donnant l'illusion qu'elle
        existe.
        """
        Group.objects.filter(name=FINANCE_GROUP).delete()
        assert personnel.get(f"{BASE}/dashboard/").status_code == 403


# ═══════════════════════════════════════════════════════════════════════════
# LES ACTIONS HERITENT DES GARDE-FOUS DES SERVICES
# ═══════════════════════════════════════════════════════════════════════════

class TestSeparationDesRoles:

    def _demande(self, acheteur, vendeur, finance):
        from apps.payments.bridge import events_in
        from apps.payments.settlements.services import (
            build_batch, confirm_batch, request_payout,
        )

        intent = encaisser(acheteur, vendeur)
        events_in.buyer_confirmed_receipt(order_id=1, event_id="rec-1")
        from apps.payments.escrow.services import release_hold
        release_hold(EscrowHold.objects.get(intent=intent), force=True,
                     reason="Test")
        lot = confirm_batch(build_batch(vendeur))
        return request_payout(lot, requested_by=finance.membre)

    def test_le_demandeur_ne_peut_pas_approuver_par_l_api(
        self, acheteur, vendeur, finance,
    ):
        """
        LE test le plus important de cette couche.

        Une API d'administration mal concue permettrait, par un simple appel
        HTTP, ce que l'interface interdit visuellement. Ici le service
        refuse, donc l'API refuse.
        """
        demande = self._demande(acheteur, vendeur, finance)
        reponse = finance.post(
            f"{BASE}/payouts/{demande.reference}/approve/", {}, format="json")

        assert reponse.status_code == 400
        assert "approuver" in reponse.json()["detail"].lower()

    def test_un_tiers_habilite_peut_approuver(
        self, acheteur, vendeur, finance, finance2,
    ):
        demande = self._demande(acheteur, vendeur, finance)
        reponse = finance2.post(
            f"{BASE}/payouts/{demande.reference}/approve/",
            {"comment": "Verifie"}, format="json")

        assert reponse.status_code == 200
        assert reponse.json()["approvals_count"] == 1

    def test_un_membre_du_personnel_ne_peut_pas_approuver(
        self, acheteur, vendeur, finance, personnel,
    ):
        demande = self._demande(acheteur, vendeur, finance)
        reponse = personnel.post(
            f"{BASE}/payouts/{demande.reference}/approve/", {}, format="json")
        assert reponse.status_code == 403

    def test_le_motif_est_obligatoire_pour_un_rejet(
        self, acheteur, vendeur, finance, finance2,
    ):
        demande = self._demande(acheteur, vendeur, finance)
        assert finance2.post(
            f"{BASE}/payouts/{demande.reference}/reject/",
            {"reason": "   "}, format="json").status_code == 400


class TestRemboursements:

    def test_le_demandeur_ne_peut_pas_approuver_son_remboursement(
        self, acheteur, vendeur, finance,
    ):
        intent = encaisser(acheteur, vendeur)
        creation = finance.post(
            f"{BASE}/refunds/create/",
            {"intent_reference": intent.reference, "amount_xaf": 10000,
             "reason": "DISPUTE"}, format="json")
        assert creation.status_code == 201

        reference = creation.json()["reference"]
        reponse = finance.post(f"{BASE}/refunds/{reference}/approve/", {},
                               format="json")
        assert reponse.status_code == 400

    def test_un_tiers_approuve_puis_execute(
        self, acheteur, vendeur, finance, finance2,
    ):
        intent = encaisser(acheteur, vendeur)
        reference = finance.post(
            f"{BASE}/refunds/create/",
            {"intent_reference": intent.reference, "amount_xaf": 10000,
             "reason": "DISPUTE"}, format="json").json()["reference"]

        assert finance2.post(f"{BASE}/refunds/{reference}/approve/", {},
                             format="json").status_code == 200
        reponse = finance2.post(f"{BASE}/refunds/{reference}/execute/", {},
                                format="json")
        assert reponse.status_code == 200
        assert reponse.json()["status"] == Refund.Status.PAID

    def test_on_ne_rembourse_pas_plus_que_l_encaisse(
        self, acheteur, vendeur, finance,
    ):
        intent = encaisser(acheteur, vendeur)
        reponse = finance.post(
            f"{BASE}/refunds/create/",
            {"intent_reference": intent.reference, "amount_xaf": 999999,
             "reason": "DISPUTE"}, format="json")
        assert reponse.status_code == 400


class TestSequestres:

    def test_geler_exige_un_motif(self, acheteur, vendeur, finance):
        intent = encaisser(acheteur, vendeur)
        hold = EscrowHold.objects.get(intent=intent)
        assert finance.post(f"{BASE}/escrow/{hold.reference}/freeze/",
                            {"reason": ""}, format="json").status_code == 400

    def test_le_gel_est_scope_a_un_seul_sequestre(
        self, acheteur, vendeur, finance,
    ):
        """
        Geler un colis ne gele pas les autres du meme paiement — c'est ce
        que la cle a quatre dimensions rend possible, et l'ecran doit le
        montrer.
        """
        intent = create_payment_intent(
            buyer=acheteur, idempotency_key="multi",
            components=[
                ComponentInput(EconomicComponent.GOODS, Money(30000),
                               order_id=1, commission_rate=Decimal("15")),
                ComponentInput(EconomicComponent.GOODS, Money(20000),
                               order_id=2, commission_rate=Decimal("15")),
            ],
            payee_codes={DomainPayeeType.VENDOR: vendeur.payee_code},
            payee_types={vendeur.payee_code: DomainPayeeType.VENDOR},
            payer_msisdn=NUMERO, payer_operator="MTN")
        issue = initiate_collect(intent)
        poll_attempt(issue.attempt)
        poll_attempt(issue.attempt)

        premier = EscrowHold.objects.filter(intent=intent, order_id=1).first()
        reponse = finance.post(f"{BASE}/escrow/{premier.reference}/freeze/",
                               {"reason": "Litige colis 1"}, format="json")
        assert reponse.status_code == 200

        second = EscrowHold.objects.filter(intent=intent, order_id=2).first()
        assert second.status == EscrowHold.Status.HELD

        # Le detail expose les freres, pour eviter qu'un operateur croie
        # avoir bloque tout le paiement.
        detail = finance.get(f"{BASE}/escrow/{premier.reference}/").json()
        assert len(detail["siblings"]) == 1


class TestLecture:

    def test_le_tableau_de_bord_porte_ses_signaux(self, finance):
        donnees = finance.get(f"{BASE}/dashboard/?offline=1").json()
        assert "signals" in donnees
        assert "treasury" in donnees
        for signal in donnees["signals"]:
            assert signal["action"], signal["titre"]

    def test_les_etats_portent_leur_explication(
        self, acheteur, vendeur, finance,
    ):
        """
        UNKNOWN n'est pas « erreur » : c'est « on ne sait pas si l'argent
        est parti, ne jamais retenter ». Le backend le dit, le frontend le
        reprend.
        """
        encaisser(acheteur, vendeur)
        donnees = finance.get(f"{BASE}/escrow/").json()
        assert donnees["results"][0]["guidance"]["meaning"]

    def test_la_liste_est_paginee_avec_son_total(
        self, acheteur, vendeur, finance,
    ):
        encaisser(acheteur, vendeur)
        donnees = finance.get(f"{BASE}/escrow/?page_size=1").json()
        assert "count" in donnees and "results" in donnees

    def test_le_detail_d_une_intention_est_complet(
        self, acheteur, vendeur, finance,
    ):
        intent = encaisser(acheteur, vendeur)
        donnees = finance.get(f"{BASE}/intents/{intent.reference}/").json()
        assert donnees["distribution_plan"]
        assert donnees["attempts"]
        assert donnees["escrow_holds"]

    def test_la_sante_des_taches_est_lisible(self, finance):
        donnees = finance.get(f"{BASE}/tasks/health/").json()
        assert "health" in donnees and "schedule" in donnees


# ═══════════════════════════════════════════════════════════════════════════
# COMPLEMENTS ACHETEUR ET PARTENAIRE
# ═══════════════════════════════════════════════════════════════════════════

class TestComplements:

    def test_l_acheteur_voit_ses_remboursements(
        self, acheteur, vendeur, finance, finance2,
    ):
        """
        Sans cet ecran, un acheteur verrait son argent revenir sans
        explication.
        """
        intent = encaisser(acheteur, vendeur)
        reference = finance.post(
            f"{BASE}/refunds/create/",
            {"intent_reference": intent.reference, "amount_xaf": 10000,
             "reason": "DISPUTE"}, format="json").json()["reference"]
        finance2.post(f"{BASE}/refunds/{reference}/approve/", {},
                      format="json")

        client = APIClient()
        client.force_authenticate(user=acheteur)
        donnees = client.get("/api/payments/v2/me/refunds/").json()

        assert len(donnees) == 1
        assert donnees[0]["amount_xaf"] == 10000
        assert donnees[0]["explanation"]

    def test_le_remboursement_d_un_autre_est_invisible(
        self, acheteur, vendeur, finance,
    ):
        intent = encaisser(acheteur, vendeur)
        finance.post(f"{BASE}/refunds/create/",
                     {"intent_reference": intent.reference,
                      "amount_xaf": 10000, "reason": "DISPUTE"},
                     format="json")

        autre = APIClient()
        autre.force_authenticate(user=utilisateur("curieux"))
        assert autre.get("/api/payments/v2/me/refunds/").json() == []

    def test_le_montant_du_expose_le_type_de_beneficiaire(self, vendeur):
        """
        Deduire un type d'un prefixe de chaine — PAY-VND- — serait fragile.
        """
        from apps.vendors.models import VendorProfile

        utilisateur_vendeur = utilisateur("vendeur-api")
        VendorProfile.objects.create(user=utilisateur_vendeur,
                                     business_name="Boutique")
        from apps.payments.bridge.actors import payee_for_vendor
        payee_for_vendor(
            VendorProfile.objects.get(user=utilisateur_vendeur), create=True)

        client = APIClient()
        client.force_authenticate(user=utilisateur_vendeur)
        donnees = client.get("/api/payments/v2/partner/due/").json()

        assert donnees["payee_type"] == "VENDOR"
        assert donnees["payee_type_label"]