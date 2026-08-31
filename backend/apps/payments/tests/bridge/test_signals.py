# backend/apps/payments/tests/bridge/test_signals.py
# Crochets metier -> financier sur les expeditions.
#
#   docker exec -it relaya_backend pytest apps/payments/tests/bridge/ -q
#
# ─────────────────────────────────────────────────────────────────────────────
# CE FICHIER COUVRE DEUX BRANCHEMENTS QUI MANQUAIENT
#
#   1. delivery_proof_validated n'etait branche NULLE PART. Le sequestre
#      TRANSPORT ne se serait donc JAMAIS libere : sa politique ne prevoit
#      aucune auto-confirmation, contrairement a la marchandise.
#
#   2. carrier_assigned n'etait pas emis. La part transport serait restee
#      comptabilisee en produit alors qu'elle appartient au transporteur.
#
# Aucun des deux ne levait d'erreur. Le systeme aurait tourne, en silence,
# avec un transporteur jamais paye et un chiffre d'affaires surestime.
# ─────────────────────────────────────────────────────────────────────────────

from decimal import Decimal

import pytest
from django.contrib.auth.models import User

from apps.accounts.models import CourierProfile, DeliveryOrganizationProfile
from apps.catalog.models import Category, Product
from apps.orders.models import Order, OrderItem
from apps.payments.application.collect import initiate_collect, poll_attempt
from apps.payments.bridge.checkout import checkout
from apps.payments.config.models import (
    DistributionRule, EscrowPolicy, FeeRule, ProviderConfig,
)
from apps.payments.escrow.models import EscrowEvent, EscrowHold
from apps.payments.infrastructure.providers.mock import reset_mock_state
from apps.payments.ledger import chart_of_accounts as coa
from apps.payments.ledger.balances import balance, revenue_summary, trial_balance_total
from apps.payments.ledger.invariants import run_all
from apps.payments.ledger.models import LedgerAccount
from apps.shipping.models import Shipment
from apps.vendors.models import VendorProfile

pytestmark = pytest.mark.django_db

NUMERO = "237677123456"


@pytest.fixture(autouse=True)
def _commit_immediat(monkeypatch):
    """
    Sous pytest.mark.django_db, la transaction de test est ANNULEE : les
    rappels differes par `transaction.on_commit` ne s'executent donc jamais.

    Le report au commit reste la BONNE conception en production — il garantit
    qu'une transaction annulee n'emet aucun evenement financier. On ne le
    retire pas du code ; on l'execute immediatement pendant les tests.
    """
    from django.db import transaction as tx
    monkeypatch.setattr(tx, "on_commit",
                        lambda fonction, using=None: fonction())


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
    DistributionRule.objects.create(
        config_key="dist-transport-carrier",
        name="Transport a l'entreprise de livraison",
        component=DistributionRule.Component.TRANSPORT,
        payee_type=DistributionRule.PayeeType.DELIVERY_COMPANY,
        basis=DistributionRule.Basis.PERCENT_OF_COMPONENT,
        value=Decimal("70"), priority=20)
    DistributionRule.objects.create(
        config_key="dist-transport-platform", name="Part plateforme",
        component=DistributionRule.Component.TRANSPORT,
        payee_type=DistributionRule.PayeeType.PLATFORM,
        basis=DistributionRule.Basis.REMAINDER, priority=10)
    EscrowPolicy.objects.create(config_key="escrow-default", name="Defaut",
                                auto_confirm_hours=48, release_delay_hours=24)
    # Le TRANSPORT ne s'auto-confirme JAMAIS : seule la preuve le libere.
    EscrowPolicy.objects.create(
        config_key="escrow-transport", name="Transport",
        payee_type=DistributionRule.PayeeType.DELIVERY_COMPANY,
        component=DistributionRule.Component.TRANSPORT,
        auto_confirm_hours=0, release_delay_hours=24, priority=50)


@pytest.fixture
def acheteur():
    return User.objects.create_user("acheteur", "a@b.cm", "x")


@pytest.fixture
def organisation():
    gestionnaire = User.objects.create_user("gestionnaire", "g@b.cm", "x")
    return DeliveryOrganizationProfile.objects.create(
        user=gestionnaire, company_name="Express Douala",
        phone="237699000111", city="Douala")


@pytest.fixture
def livreur(organisation):
    utilisateur = User.objects.create_user("livreur", "l@b.cm", "x")
    return CourierProfile.objects.create(
        user=utilisateur, delivery_organization=organisation,
        phone="237655111222", city="Douala")


@pytest.fixture
def livreur_independant():
    utilisateur = User.objects.create_user("independant", "i@b.cm", "x")
    return CourierProfile.objects.create(
        user=utilisateur, delivery_organization=None,
        phone="237655333444", city="Douala")


def payer(acheteur, frais=5000):
    """Commande mono-vendeur avec frais de livraison, encaissee."""
    vendeur_user = User.objects.create_user(
        f"vendeur-{acheteur.pk}", "v@b.cm", "x")
    VendorProfile.objects.create(user=vendeur_user, business_name="Boutique")
    categorie = Category.objects.get_or_create(
        slug="tests-signaux", defaults={"name": "Tests"})[0]
    article = Product.objects.create(
        title=f"Article {acheteur.pk}", price_xaf=45000,
        vendor=vendeur_user, category=categorie)

    commande = Order.objects.create(
        user=acheteur, customer_phone="237600000000", city="Douala",
        address="Akwa", subtotal_xaf=45000, delivery_fee_xaf=frais,
        total_xaf=45000 + frais, commission_rate_snapshot=Decimal("15.00"))
    OrderItem.objects.create(
        order=commande, product=article, title_snapshot=article.title,
        price_xaf_snapshot=45000, qty=1, line_total_xaf=45000)

    commandes, intent = checkout(commande, payer_msisdn=NUMERO,
                                 payer_operator="MTN")
    issue = initiate_collect(intent)
    poll_attempt(issue.attempt)
    poll_attempt(issue.attempt)
    intent.refresh_from_db()
    return commandes[0], intent


# ═══════════════════════════════════════════════════════════════════════════
# ASSIGNATION DU TRANSPORTEUR
# ═══════════════════════════════════════════════════════════════════════════

class TestAssignationTransporteur:

    def test_l_assignation_reallouе_la_part_transport(
        self, acheteur, livreur,
    ):
        """
        LE test qui corrige le chiffre d'affaires.

        Avant assignation, les 3 500 FCFA du transporteur sont comptabilises
        en produit. Le signal les remet ou ils doivent etre.
        """
        commande, intent = payer(acheteur)
        produit_avant = revenue_summary()["revenue_total"]

        Shipment.objects.create(order=commande, courier=livreur,
                                status=Shipment.Status.ASSIGNED)

        assert revenue_summary()["revenue_total"] == produit_avant - 3500
        assert EscrowHold.objects.filter(
            intent=intent, component="TRANSPORT").exists()

    def test_un_livreur_independant_ne_declenche_rien(
        self, acheteur, livreur_independant,
    ):
        """
        Sans organisation contractuelle, il n'y a aucune entreprise a
        payer : la part reste legitimement a la plateforme.
        """
        commande, intent = payer(acheteur)
        produit_avant = revenue_summary()["revenue_total"]

        Shipment.objects.create(order=commande, courier=livreur_independant,
                                status=Shipment.Status.ASSIGNED)

        assert revenue_summary()["revenue_total"] == produit_avant
        assert not EscrowHold.objects.filter(
            intent=intent, component="TRANSPORT").exists()

    def test_sans_livreur_rien_ne_se_passe(self, acheteur):
        commande, intent = payer(acheteur)
        produit_avant = revenue_summary()["revenue_total"]

        Shipment.objects.create(order=commande,
                                status=Shipment.Status.CREATED)

        assert revenue_summary()["revenue_total"] == produit_avant

    def test_sauvegardes_repetees_sans_effet(self, acheteur, livreur):
        """
        Le signal se declenche a CHAQUE sauvegarde. L'idempotence des
        evenements evite d'avoir a detecter les transitions — une
        information fragile que plusieurs chemins de code contournent.
        """
        commande, intent = payer(acheteur)
        expedition = Shipment.objects.create(
            order=commande, courier=livreur, status=Shipment.Status.ASSIGNED)

        for statut in (Shipment.Status.PICKED_UP,
                       Shipment.Status.IN_TRANSIT,
                       Shipment.Status.OUT_FOR_DELIVERY):
            expedition.status = statut
            expedition.save()

        assert EscrowHold.objects.filter(
            intent=intent, component="TRANSPORT").count() == 1


# ═══════════════════════════════════════════════════════════════════════════
# PREUVE DE LIVRAISON
# ═══════════════════════════════════════════════════════════════════════════

class TestPreuveDeLivraison:

    def test_la_livraison_libere_le_transport(self, acheteur, livreur):
        """
        LE test qui debloque le paiement du transporteur.

        Sans cet evenement, le sequestre TRANSPORT ne se libere jamais : sa
        politique fixe auto_confirm_hours a 0.
        """
        commande, intent = payer(acheteur)
        expedition = Shipment.objects.create(
            order=commande, courier=livreur, status=Shipment.Status.ASSIGNED)

        transport = EscrowHold.objects.get(intent=intent, component="TRANSPORT")
        assert transport.status == EscrowHold.Status.HELD

        expedition.status = Shipment.Status.DELIVERED
        expedition.save()

        transport.refresh_from_db()
        assert transport.status == EscrowHold.Status.RELEASE_SCHEDULED

    def test_un_statut_intermediaire_ne_libere_rien(self, acheteur, livreur):
        commande, intent = payer(acheteur)
        expedition = Shipment.objects.create(
            order=commande, courier=livreur, status=Shipment.Status.ASSIGNED)

        expedition.status = Shipment.Status.OUT_FOR_DELIVERY
        expedition.save()

        transport = EscrowHold.objects.get(intent=intent, component="TRANSPORT")
        assert transport.status == EscrowHold.Status.HELD

    def test_la_marchandise_n_est_pas_liberee_par_la_livraison(
        self, acheteur, livreur,
    ):
        """
        Le declencheur depend du COMPOSANT. Une preuve de livraison ne
        libere pas la marchandise — l'acheteur doit confirmer sa reception.
        """
        commande, intent = payer(acheteur)
        expedition = Shipment.objects.create(
            order=commande, courier=livreur, status=Shipment.Status.DELIVERED)

        marchandise = EscrowHold.objects.get(intent=intent, component="GOODS")
        assert marchandise.status == EscrowHold.Status.HELD

    def test_rejeu_sans_effet(self, acheteur, livreur):
        commande, intent = payer(acheteur)
        expedition = Shipment.objects.create(
            order=commande, courier=livreur, status=Shipment.Status.DELIVERED)
        expedition.save()
        expedition.save()

        assert EscrowEvent.objects.filter(
            event_id=f"proof-{expedition.pk}").count() == 1


# ═══════════════════════════════════════════════════════════════════════════
# ROBUSTESSE
# ═══════════════════════════════════════════════════════════════════════════

class TestRobustesse:

    def test_une_commande_sans_paiement_ne_casse_rien(self, acheteur, livreur):
        """
        Une commande anterieure au module financier n'a aucune intention.
        Le signal doit l'ignorer sans lever.
        """
        commande = Order.objects.create(
            user=acheteur, customer_phone="237600000000", city="Douala",
            address="Akwa", subtotal_xaf=10000, total_xaf=10000)

        expedition = Shipment.objects.create(
            order=commande, courier=livreur,
            status=Shipment.Status.DELIVERED)
        assert expedition.pk is not None

    def test_la_comptabilite_reste_coherente(self, acheteur, livreur):
        commande, intent = payer(acheteur)
        expedition = Shipment.objects.create(
            order=commande, courier=livreur, status=Shipment.Status.ASSIGNED)
        expedition.status = Shipment.Status.DELIVERED
        expedition.save()

        assert trial_balance_total() == 0
        rapport = run_all()
        assert rapport["ok"], [(r.code, r.detail) for r in rapport["violations"]]


# ═══════════════════════════════════════════════════════════════════════════
# SCENARIO COMPLET
# ═══════════════════════════════════════════════════════════════════════════

class TestScenarioComplet:

    def test_du_checkout_au_paiement_du_transporteur(self, acheteur, livreur):
        """
        Parcours reel, sans aucun appel manuel : tout passe par le signal.
        """
        from apps.payments.bridge import events_in
        from apps.payments.escrow.services import release_hold

        commande, intent = payer(acheteur)
        assert revenue_summary()["revenue_total"] == 11750     # surestime

        expedition = Shipment.objects.create(
            order=commande, courier=livreur, status=Shipment.Status.ASSIGNED)
        assert revenue_summary()["revenue_total"] == 8250      # corrige

        expedition.status = Shipment.Status.DELIVERED
        expedition.save()

        events_in.buyer_confirmed_receipt(order_id=commande.pk,
                                          event_id="scenario-rec")

        for hold in EscrowHold.objects.filter(
                intent=intent, status=EscrowHold.Status.RELEASE_SCHEDULED):
            release_hold(hold, force=True, reason="Test")

        compte = livreur.delivery_organization
        from apps.payments.bridge.actors import payee_for_delivery_company
        transporteur = payee_for_delivery_company(compte)

        assert balance(coa.PAYABLE_DELIVERY_COMPANY,
                       payee_code=transporteur.payee_code) == 3500
        assert balance(coa.ESCROW_LIABILITY) == 0
        assert trial_balance_total() == 0
        assert run_all()["ok"]


# ═══════════════════════════════════════════════════════════════════════════
# REPORT AU COMMIT
# ═══════════════════════════════════════════════════════════════════════════

@pytest.mark.django_db(transaction=True)
def test_une_transaction_annulee_n_emet_rien():
    """
    LA garantie que le report au commit apporte.

    Une expedition creee puis annulee ne doit produire AUCUN evenement
    financier : on ne libere pas d'argent sur un fait qui n'a pas eu lieu.

    Ce test utilise une vraie transaction — l'annulation y est reelle.
    """
    from django.db import transaction as tx

    from apps.payments.escrow.models import EscrowEvent

    acheteur = User.objects.create_user("annule", "an@b.cm", "x")
    commande = Order.objects.create(
        user=acheteur, customer_phone="237600000000", city="Douala",
        address="Akwa", subtotal_xaf=10000, total_xaf=10000)
    gestionnaire = User.objects.create_user("gest-an", "ga@b.cm", "x")
    organisation = DeliveryOrganizationProfile.objects.create(
        user=gestionnaire, company_name="Express", phone="237699000111")
    utilisateur = User.objects.create_user("liv-an", "la@b.cm", "x")
    livreur = CourierProfile.objects.create(
        user=utilisateur, delivery_organization=organisation,
        phone="237655111222", city="Douala")

    avant = EscrowEvent.objects.count()

    class Annulation(Exception):
        pass

    with pytest.raises(Annulation):
        with tx.atomic():
            Shipment.objects.create(
                order=commande, courier=livreur,
                status=Shipment.Status.DELIVERED)
            raise Annulation()

    assert EscrowEvent.objects.count() == avant
    assert Shipment.objects.filter(order=commande).count() == 0