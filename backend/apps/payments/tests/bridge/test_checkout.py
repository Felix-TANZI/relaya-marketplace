# backend/apps/payments/tests/bridge/test_checkout.py
# Tests de l'eclatement du panier et du miroir metier.
#
#   docker exec -it relaya_backend pytest apps/payments/tests/bridge/ -q
#
# Deux tests portent l'essentiel :
#   test_panier_multi_vendeurs_eclate      — l'Option A, verifiee
#   test_le_sequestre_pilote_la_commande   — une seule verite sur l'argent

from datetime import timedelta
from decimal import Decimal

import pytest
from django.contrib.auth.models import User
from django.utils import timezone

from apps.catalog.models import Category, Product
from apps.orders.models import Order, OrderItem
from apps.payments.application.collect import initiate_collect, poll_attempt
from apps.payments.bridge import events_in
from apps.payments.bridge.checkout import (
    CheckoutError, build_intent_for_orders, checkout, is_multi_vendor,
    split_order_by_vendor, vendors_of,
)
from apps.payments.bridge.events_out import (
    compare_all, compare_states, mirror_hold,
)
from apps.payments.bridge.intent_orders import PaymentIntentOrder
from apps.payments.config.models import (
    DistributionRule, EscrowPolicy, FeeRule, ProviderConfig,
)
from apps.payments.escrow.models import EscrowHold
from apps.payments.escrow.services import freeze_hold, release_hold
from apps.payments.infrastructure.providers.mock import reset_mock_state
from apps.payments.intents.models import PaymentIntent
from apps.payments.ledger import chart_of_accounts as coa
from apps.payments.ledger.balances import balance, trial_balance_total
from apps.payments.ledger.invariants import run_all
from apps.payments.ledger.models import LedgerAccount
from apps.vendors.models import VendorProfile

pytestmark = pytest.mark.django_db

NUMERO = "237677123456"


@pytest.fixture(autouse=True)
def _mock():
    reset_mock_state()
    _CATEGORIE["objet"] = None      # la base est reinitialisee entre tests
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
        config_key="dist-transport", name="Transport plateforme",
        component=DistributionRule.Component.TRANSPORT,
        payee_type=DistributionRule.PayeeType.PLATFORM,
        basis=DistributionRule.Basis.REMAINDER, priority=10)
    EscrowPolicy.objects.create(config_key="escrow-default", name="Defaut",
                                auto_confirm_hours=48, release_delay_hours=24)


@pytest.fixture
def acheteur():
    return User.objects.create_user("acheteur", "a@b.cm", "x")


def vendeur(nom):
    utilisateur = User.objects.create_user(nom, f"{nom}@b.cm", "x")
    VendorProfile.objects.create(user=utilisateur, business_name=f"Boutique {nom}")
    return utilisateur


#: Product exige une categorie NON NULLE. On en cree une seule, partagee par
#: tous les produits de test : le Lot 12 ne s'interesse qu'au VENDEUR.
_CATEGORIE = {"objet": None}


def categorie_de_test():
    if _CATEGORIE["objet"] is None or not Category.objects.filter(
            pk=_CATEGORIE["objet"].pk).exists():
        _CATEGORIE["objet"], _ = Category.objects.get_or_create(
            slug="tests-lot12", defaults={"name": "Tests Lot 12"})
    return _CATEGORIE["objet"]


_COMPTEUR = {"n": 0}


def produit(vendeur_user, prix=10000, titre="Produit"):
    """
    Cree un produit conforme au modele REEL : categorie obligatoire, slug
    unique. Le slug est genere depuis `title` par Product.save() ; on
    differencie donc les titres pour eviter les collisions.
    """
    _COMPTEUR["n"] += 1
    return Product.objects.create(
        title=f"{titre} {_COMPTEUR['n']}",
        price_xaf=prix,
        vendor=vendeur_user,
        category=categorie_de_test(),
    )


def commande(acheteur, lignes, *, frais=2000):
    """Cree une commande comme le fait OrderCreateSerializer aujourd'hui."""
    sous_total = sum(p.price_xaf * q for p, q in lignes)
    cmd = Order.objects.create(
        user=acheteur, customer_phone="237600000000", city="Douala",
        address="Akwa", subtotal_xaf=sous_total, delivery_fee_xaf=frais,
        total_xaf=sous_total + frais, commission_rate_snapshot=Decimal("15.00"))
    for produit_, quantite in lignes:
        OrderItem.objects.create(
            order=cmd, product=produit_, title_snapshot=produit_.title,
            price_xaf_snapshot=produit_.price_xaf, qty=quantite,
            line_total_xaf=produit_.price_xaf * quantite)
    return cmd


# ═══════════════════════════════════════════════════════════════════════════
# ECLATEMENT — l'Option A
# ═══════════════════════════════════════════════════════════════════════════

class TestEclatement:

    def test_panier_multi_vendeurs_eclate(self, acheteur):
        """
        LE test de l'Option A.

        Un panier contenant les produits de trois vendeurs devient trois
        commandes mono-vendeur. Sans cela, un litige sur le vendeur A
        gelerait la livraison du vendeur B.
        """
        a, b, c = vendeur("va"), vendeur("vb"), vendeur("vc")
        cmd = commande(acheteur, [
            (produit(a, 30000, "A1"), 1),
            (produit(b, 15000, "B1"), 2),
            (produit(c, 5000, "C1"), 1),
        ])
        assert is_multi_vendor(cmd) is True

        commandes = split_order_by_vendor(cmd)
        assert len(commandes) == 3
        for sous_commande in commandes:
            assert len(vendors_of(sous_commande)) == 1

    def test_les_montants_sont_conserves(self, acheteur):
        a, b = vendeur("ma"), vendeur("mb")
        cmd = commande(acheteur, [(produit(a, 30000), 1), (produit(b, 20000), 1)])
        total_avant = cmd.total_xaf

        commandes = split_order_by_vendor(cmd)
        assert sum(c.subtotal_xaf for c in commandes) == 50000
        assert sum(c.total_xaf for c in commandes) == total_avant

    def test_les_frais_restent_sur_la_commande_principale(self, acheteur):
        """
        Les frais de livraison sont MUTUALISES : une seule course, un seul
        trajet. Les repartir entre vendeurs serait arbitraire.
        """
        a, b = vendeur("fa"), vendeur("fb")
        cmd = commande(acheteur, [(produit(a), 1), (produit(b), 1)], frais=2000)
        principale, seconde = split_order_by_vendor(cmd)
        assert principale.delivery_fee_xaf == 2000
        assert seconde.delivery_fee_xaf == 0

    def test_la_commande_d_origine_est_conservee(self, acheteur):
        """
        Son identifiant reste valide : aucun lien casse, aucune notification
        deja emise invalidee.
        """
        a, b = vendeur("oa"), vendeur("ob")
        cmd = commande(acheteur, [(produit(a), 1), (produit(b), 1)])
        identifiant = cmd.pk
        commandes = split_order_by_vendor(cmd)
        assert commandes[0].pk == identifiant

    def test_panier_mono_vendeur_inchange(self, acheteur):
        a = vendeur("solo")
        cmd = commande(acheteur, [(produit(a, 10000), 1), (produit(a, 5000), 2)])
        assert split_order_by_vendor(cmd) == [cmd]
        assert Order.objects.count() == 1

    def test_eclatement_idempotent(self, acheteur):
        a, b = vendeur("ia"), vendeur("ib")
        cmd = commande(acheteur, [(produit(a), 1), (produit(b), 1)])
        split_order_by_vendor(cmd)
        total = Order.objects.count()
        split_order_by_vendor(cmd)
        assert Order.objects.count() == total

    def test_eclatement_refuse_apres_paiement(self, acheteur):
        """
        Eclater une commande deja payee casserait le rattachement entre
        l'intention de paiement et les commandes couvertes.

        On ecrit le champ DIRECTEMENT plutot que d'appeler une methode du
        modele : le test porte sur l'eclatement, pas sur le nom que le
        domaine metier donne a sa transition.
        """
        a, b = vendeur("pa"), vendeur("pb")
        cmd = commande(acheteur, [(produit(a), 1), (produit(b), 1)])
        Order.objects.filter(pk=cmd.pk).update(
            payment_status=Order.PaymentStatus.PAID)
        cmd.refresh_from_db()

        with pytest.raises(CheckoutError, match="avant paiement"):
            split_order_by_vendor(cmd)


# ═══════════════════════════════════════════════════════════════════════════
# UNE INTENTION POUR N COMMANDES
# ═══════════════════════════════════════════════════════════════════════════

class TestIntention:

    def test_une_seule_intention_couvre_tout(self, acheteur):
        """L'acheteur paie UNE fois, quel que soit le nombre de vendeurs."""
        a, b = vendeur("ua"), vendeur("ub")
        cmd = commande(acheteur, [(produit(a, 30000), 1), (produit(b, 20000), 1)])

        commandes, intent = checkout(cmd, payer_msisdn=NUMERO,
                                     payer_operator="MTN")
        assert len(commandes) == 2
        assert PaymentIntent.objects.count() == 1
        assert intent.amount_xaf == 52000        # 50 000 + 2 000 de livraison
        assert PaymentIntentOrder.objects.filter(intent=intent).count() == 2

    def test_un_composant_par_commande(self, acheteur):
        a, b = vendeur("ca"), vendeur("cb")
        cmd = commande(acheteur, [(produit(a, 30000), 1), (produit(b, 20000), 1)])
        _, intent = checkout(cmd, payer_msisdn=NUMERO, payer_operator="MTN")

        plan = intent.distribution_plan
        marchandises = [h for h in plan["holds"] if h["component"] == "GOODS"]
        assert len(marchandises) == 2
        assert all(h["order_id"] for h in marchandises)

    def test_le_transport_est_de_niveau_paiement(self, acheteur):
        """
        Les frais de livraison sont mutualises sur le panier : leur composant
        ne porte AUCUN order_id.
        """
        a, b = vendeur("ta"), vendeur("tb")
        cmd = commande(acheteur, [(produit(a), 1), (produit(b), 1)], frais=3000)
        _, intent = checkout(cmd, payer_msisdn=NUMERO, payer_operator="MTN")

        transports = [h for h in intent.distribution_plan["holds"]
                      if h["component"] == "TRANSPORT"]
        assert len(transports) <= 1
        for hold in transports:
            assert hold["order_id"] is None

    def test_intention_refusee_si_encore_multi_vendeurs(self, acheteur):
        a, b = vendeur("ra"), vendeur("rb")
        cmd = commande(acheteur, [(produit(a), 1), (produit(b), 1)])
        with pytest.raises(CheckoutError, match="Eclater avant"):
            build_intent_for_orders([cmd], buyer=acheteur, payer_msisdn=NUMERO,
                                    payer_operator="MTN")


# ═══════════════════════════════════════════════════════════════════════════
# MIROIR — une seule verite sur l'argent
# ═══════════════════════════════════════════════════════════════════════════

class TestMiroir:

    def _payer(self, acheteur, cmd):
        commandes, intent = checkout(cmd, payer_msisdn=NUMERO,
                                     payer_operator="MTN")
        issue = initiate_collect(intent)
        poll_attempt(issue.attempt)
        poll_attempt(issue.attempt)
        return commandes, intent

    def test_la_confirmation_du_paiement_se_reflete(self, acheteur):
        a = vendeur("mp")
        cmd = commande(acheteur, [(produit(a, 20000), 1)])
        commandes, _ = self._payer(acheteur, cmd)

        commandes[0].refresh_from_db()
        assert commandes[0].payment_status == Order.PaymentStatus.PAID
        assert commandes[0].escrow_status == Order.EscrowStatus.BLOCKED

    def test_le_sequestre_pilote_la_commande(self, acheteur):
        """
        LE test qui resout le conflit des deux verites.

        EscrowHold DECIDE, Order.escrow_status REFLETE. Le frontend existant
        continue de fonctionner sans modification pendant que la decision
        migre vers le module financier.
        """
        a = vendeur("pil")
        cmd = commande(acheteur, [(produit(a, 20000), 1)])
        commandes, _ = self._payer(acheteur, cmd)
        principale = commandes[0]

        events_in.buyer_confirmed_receipt(order_id=principale.pk,
                                          event_id=f"r-{principale.pk}")
        principale.refresh_from_db()
        assert principale.escrow_status == Order.EscrowStatus.RELEASE_PENDING

        hold = EscrowHold.objects.get(order_id=principale.pk)
        release_hold(hold, force=True, reason="Test")
        principale.refresh_from_db()
        assert principale.escrow_status == Order.EscrowStatus.RELEASED
        assert principale.fulfillment_status == Order.FulfillmentStatus.RELEASED_TO_VENDOR

    def test_un_litige_se_reflete(self, acheteur):
        a = vendeur("lit")
        cmd = commande(acheteur, [(produit(a, 20000), 1)])
        commandes, _ = self._payer(acheteur, cmd)
        principale = commandes[0]

        events_in.dispute_opened(order_id=principale.pk, reason="Defectueux",
                                 event_id=f"d-{principale.pk}")
        principale.refresh_from_db()
        assert principale.fulfillment_status == Order.FulfillmentStatus.DISPUTED
        assert principale.escrow_status == Order.EscrowStatus.BLOCKED

    def test_le_transport_ne_touche_aucune_commande(self, acheteur):
        """Le transport est de niveau paiement : il n'a pas de commande."""
        a = vendeur("tr")
        cmd = commande(acheteur, [(produit(a, 20000), 1)], frais=3000)
        _, intent = self._payer(acheteur, cmd)
        transport = EscrowHold.objects.filter(
            intent=intent, component=EscrowHold.Component.TRANSPORT).first()
        if transport is not None:
            assert mirror_hold(transport) is False

    def test_un_etat_final_n_est_jamais_ecrase(self, acheteur):
        """
        Le domaine METIER reste maitre du statut logistique (principe P9).
        Une commande annulee ne redevient jamais active.
        """
        a = vendeur("fin")
        cmd = commande(acheteur, [(produit(a, 20000), 1)])
        commandes, _ = self._payer(acheteur, cmd)
        principale = commandes[0]

        Order.objects.filter(pk=principale.pk).update(
            fulfillment_status=Order.FulfillmentStatus.CANCELLED)

        hold = EscrowHold.objects.get(order_id=principale.pk)
        events_in.buyer_confirmed_receipt(order_id=principale.pk,
                                          event_id=f"rf-{principale.pk}")
        release_hold(EscrowHold.objects.get(pk=hold.pk), force=True,
                     reason="Test")

        principale.refresh_from_db()
        assert principale.fulfillment_status == Order.FulfillmentStatus.CANCELLED

    def test_un_miroir_en_echec_n_annule_pas_la_liberation(self, acheteur):
        """
        Un miroir en echec ne doit JAMAIS annuler une liberation de
        sequestre : l'argent prime sur l'affichage.
        """
        a = vendeur("rob")
        cmd = commande(acheteur, [(produit(a, 20000), 1)])
        commandes, _ = self._payer(acheteur, cmd)
        principale = commandes[0]

        events_in.buyer_confirmed_receipt(order_id=principale.pk,
                                          event_id=f"rr-{principale.pk}")
        hold = EscrowHold.objects.get(order_id=principale.pk)
        # Commande introuvable : le miroir echoue silencieusement.
        EscrowHold.objects.filter(pk=hold.pk).update(order_id=999999)
        hold.refresh_from_db()

        release_hold(hold, force=True, reason="Test")
        hold.refresh_from_db()
        assert hold.status == EscrowHold.Status.RELEASED
        assert balance(coa.PAYABLE_VENDOR) > 0


# ═══════════════════════════════════════════════════════════════════════════
# OUTIL DE COEXISTENCE
# ═══════════════════════════════════════════════════════════════════════════

class TestCoexistence:

    def test_comparaison_alignee(self, acheteur):
        a = vendeur("cmp")
        cmd = commande(acheteur, [(produit(a, 20000), 1)])
        commandes, intent = checkout(cmd, payer_msisdn=NUMERO,
                                     payer_operator="MTN")
        issue = initiate_collect(intent)
        poll_attempt(issue.attempt)
        poll_attempt(issue.attempt)

        resultat = compare_states(commandes[0].pk)
        assert resultat["aligned"] is True

    def test_divergence_detectee(self, acheteur):
        """
        Pendant la coexistence, une divergence doit se voir AVANT de couter
        de l'argent.
        """
        a = vendeur("div")
        cmd = commande(acheteur, [(produit(a, 20000), 1)])
        commandes, intent = checkout(cmd, payer_msisdn=NUMERO,
                                     payer_operator="MTN")
        issue = initiate_collect(intent)
        poll_attempt(issue.attempt)
        poll_attempt(issue.attempt)

        Order.objects.filter(pk=commandes[0].pk).update(
            escrow_status=Order.EscrowStatus.RELEASED)

        resultat = compare_states(commandes[0].pk)
        assert resultat["aligned"] is False
        assert "sequestre fait foi" in resultat["note"]

        rapport = compare_all()
        assert rapport["diverged"] >= 1

    def test_commande_anterieure_au_module(self, acheteur):
        a = vendeur("anc")
        cmd = commande(acheteur, [(produit(a, 20000), 1)])
        resultat = compare_states(cmd.pk)
        assert resultat["aligned"] is None
        assert "anterieure" in resultat["note"]


# ═══════════════════════════════════════════════════════════════════════════
# SCENARIO COMPLET
# ═══════════════════════════════════════════════════════════════════════════

class TestScenarioComplet:

    def test_panier_deux_vendeurs_avec_litige_sur_un_seul(self, acheteur):
        """
        Le scenario que l'Option A rend possible.

        Panier de deux vendeurs, litige sur le premier. Le second est paye
        normalement, le premier reste gele. Impossible avec une commande
        multi-vendeurs unique.
        """
        a, b = vendeur("sa"), vendeur("sb")
        cmd = commande(acheteur, [
            (produit(a, 30000, "A"), 1),
            (produit(b, 20000, "B"), 1),
        ], frais=2000)

        commandes, intent = checkout(cmd, payer_msisdn=NUMERO,
                                     payer_operator="MTN")
        issue = initiate_collect(intent)
        poll_attempt(issue.attempt)
        poll_attempt(issue.attempt)

        premiere, seconde = commandes
        events_in.dispute_opened(order_id=premiere.pk, reason="Defectueux",
                                 event_id="s-lit")
        events_in.buyer_confirmed_receipt(order_id=seconde.pk,
                                          event_id="s-rec")

        for hold in EscrowHold.objects.filter(
                intent=intent, status=EscrowHold.Status.RELEASE_SCHEDULED):
            release_hold(hold, force=True, reason="Test")

        premiere.refresh_from_db()
        seconde.refresh_from_db()
        assert premiere.fulfillment_status == Order.FulfillmentStatus.DISPUTED
        assert premiere.escrow_status == Order.EscrowStatus.BLOCKED
        assert seconde.escrow_status == Order.EscrowStatus.RELEASED

        assert trial_balance_total() == 0
        rapport = run_all()
        assert rapport["ok"], [(r.code, r.detail) for r in rapport["violations"]]