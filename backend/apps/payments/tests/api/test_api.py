# backend/apps/payments/tests/api/test_api.py
# Tests de l'API financiere.
#
#   docker exec -it relaya_backend pytest apps/payments/tests/api/ -q
#
# Deux familles de tests portent l'essentiel :
#   TestAnonymat   — un acheteur n'apprend JAMAIS qui est le vendeur
#   TestIsolation  — personne ne voit le compte d'un autre

from decimal import Decimal

import pytest
from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework.test import APIClient

from apps.catalog.models import Category, Product
from apps.orders.models import Order, OrderItem
from apps.payments.application.collect import initiate_collect, poll_attempt
from apps.payments.bridge import events_in
from apps.payments.bridge.checkout import checkout
from apps.payments.config.models import (
    DistributionRule, EscrowPolicy, FeeRule, PayoutPolicy, ProviderConfig,
)
from apps.payments.escrow.models import EscrowHold
from apps.payments.escrow.services import release_hold
from apps.payments.infrastructure.providers.mock import reset_mock_state
from apps.payments.ledger import chart_of_accounts as coa
from apps.payments.ledger.models import LedgerAccount
from apps.payments.settlements.services import (
    approve_adjustment, build_batch, confirm_batch, create_adjustment,
)
from apps.payments.settlements.models import Adjustment
from apps.vendors.models import VendorProfile

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
    DistributionRule.objects.create(
        config_key="dist-transport", name="Transport",
        component=DistributionRule.Component.TRANSPORT,
        payee_type=DistributionRule.PayeeType.PLATFORM,
        basis=DistributionRule.Basis.REMAINDER, priority=10)
    EscrowPolicy.objects.create(config_key="escrow-default", name="Defaut",
                                auto_confirm_hours=48, release_delay_hours=24)
    PayoutPolicy.objects.create(config_key="payout-default", name="Defaut",
                                min_payout_xaf=100, max_payout_xaf=5_000_000,
                                momo_change_cooling_hours=72)


_N = {"i": 0}


def categorie():
    return Category.objects.get_or_create(
        slug="tests-api", defaults={"name": "Tests API"})[0]


@pytest.fixture
def acheteur():
    return User.objects.create_user("acheteur", "a@b.cm", "x")


@pytest.fixture
def vendeur_user():
    utilisateur = User.objects.create_user("vendeur-secret", "v@b.cm", "x")
    VendorProfile.objects.create(
        user=utilisateur, business_name="Boutique Ultra Secrete")
    return utilisateur


def produit(vendeur, prix=20000, titre="Article"):
    _N["i"] += 1
    return Product.objects.create(
        title=f"{titre} {_N['i']}", price_xaf=prix, vendor=vendeur,
        category=categorie())


def payer(acheteur, vendeur, montant=20000, frais=2000):
    """Cree une commande, l'eclate, cree l'intention et encaisse."""
    article = produit(vendeur, montant)
    cmd = Order.objects.create(
        user=acheteur, customer_phone="237600000000", city="Douala",
        address="Akwa", subtotal_xaf=montant, delivery_fee_xaf=frais,
        total_xaf=montant + frais, commission_rate_snapshot=Decimal("15.00"))
    OrderItem.objects.create(
        order=cmd, product=article, title_snapshot=article.title,
        price_xaf_snapshot=article.price_xaf, qty=1, line_total_xaf=montant)

    commandes, intent = checkout(cmd, payer_msisdn=NUMERO,
                                 payer_operator="MTN")
    issue = initiate_collect(intent)
    poll_attempt(issue.attempt)
    poll_attempt(issue.attempt)
    intent.refresh_from_db()
    return commandes, intent


@pytest.fixture
def client_acheteur(acheteur):
    client = APIClient()
    client.force_authenticate(user=acheteur)
    return client


@pytest.fixture
def client_vendeur(vendeur_user):
    client = APIClient()
    client.force_authenticate(user=vendeur_user)
    return client


# ═══════════════════════════════════════════════════════════════════════════
# ANONYMAT — la regle absolue de BelivaY
# ═══════════════════════════════════════════════════════════════════════════

class TestAnonymat:

    def test_le_detail_d_un_paiement_ne_revele_aucun_vendeur(
        self, acheteur, vendeur_user, client_acheteur,
    ):
        """
        LE test qui protege l'anonymat.

        Le plan de repartition contient des codes beneficiaires et des
        commissions. Aucun ne doit sortir cote acheteur : le code
        PAY-VND-000341 est un identifiant STABLE, le correler entre deux
        commandes revelerait qu'elles viennent du meme vendeur.
        """
        _, intent = payer(acheteur, vendeur_user)
        reponse = client_acheteur.get(
            f"/api/payments/v2/me/payments/{intent.reference}/")
        assert reponse.status_code == 200

        brut = str(reponse.json())
        assert "PAY-VND" not in brut
        assert "Boutique Ultra Secrete" not in brut
        assert "vendeur-secret" not in brut
        assert "payee_code" not in brut
        assert "commission" not in brut.lower()

    def test_l_acheteur_voit_la_repartition_par_composant(
        self, acheteur, vendeur_user, client_acheteur,
    ):
        """
        Il a le droit de savoir combien va au transport — pas a QUI.
        """
        _, intent = payer(acheteur, vendeur_user)
        donnees = client_acheteur.get(
            f"/api/payments/v2/me/payments/{intent.reference}/").json()

        repartition = donnees["breakdown"]
        assert repartition["by_component_xaf"]["GOODS"] == 20000
        # Le transport revient entierement a la plateforme : aucun sequestre
        # ne le porte. Il apparait dans le reliquat, jamais passe sous silence.
        assert repartition["delivery_and_services_xaf"] == 2000
        assert repartition["total_xaf"] == 22000
        assert repartition["is_complete"] is True

        somme = (sum(repartition["by_component_xaf"].values())
                 + repartition["delivery_and_services_xaf"])
        assert somme == repartition["total_xaf"]

    def test_la_protection_ne_revele_aucun_vendeur(
        self, acheteur, vendeur_user, client_acheteur,
    ):
        commandes, _ = payer(acheteur, vendeur_user)
        reponse = client_acheteur.get(
            f"/api/payments/v2/me/orders/{commandes[0].pk}/protection/")
        assert reponse.status_code == 200

        brut = str(reponse.json())
        assert "PAY-VND" not in brut
        assert "net_amount" not in brut       # le net du vendeur est prive
        assert "commission" not in brut.lower()

    def test_le_numero_payeur_est_masque(
        self, acheteur, vendeur_user, client_acheteur,
    ):
        _, intent = payer(acheteur, vendeur_user)
        donnees = client_acheteur.get(
            f"/api/payments/v2/me/payments/{intent.reference}/").json()
        assert donnees["payer_msisdn_masked"] == "237·····456"
        assert NUMERO not in str(donnees)


# ═══════════════════════════════════════════════════════════════════════════
# ISOLATION — chacun ne voit que ce qui le concerne
# ═══════════════════════════════════════════════════════════════════════════

class TestIsolation:

    def test_le_paiement_d_un_autre_est_introuvable(
        self, acheteur, vendeur_user, client_acheteur,
    ):
        """
        Filtrage au QUERYSET : le paiement d'un autre n'est jamais charge.
        La reponse est 404, pas 403 — on ne confirme meme pas son existence.
        """
        autre = User.objects.create_user("autre", "o@b.cm", "x")
        _, intent = payer(autre, vendeur_user)

        reponse = client_acheteur.get(
            f"/api/payments/v2/me/payments/{intent.reference}/")
        assert reponse.status_code == 404

    def test_la_liste_ne_contient_que_ses_paiements(
        self, acheteur, vendeur_user, client_acheteur,
    ):
        autre = User.objects.create_user("autre2", "o2@b.cm", "x")
        payer(autre, vendeur_user)
        _, mien = payer(acheteur, vendeur_user)

        donnees = client_acheteur.get("/api/payments/v2/me/payments/").json()
        references = [p["reference"] for p in donnees]
        assert mien.reference in references
        assert len(references) == 1

    def test_la_protection_d_une_commande_tierce_est_vide(
        self, acheteur, vendeur_user, client_acheteur,
    ):
        autre = User.objects.create_user("autre3", "o3@b.cm", "x")
        commandes, _ = payer(autre, vendeur_user)

        donnees = client_acheteur.get(
            f"/api/payments/v2/me/orders/{commandes[0].pk}/protection/").json()
        assert donnees == []

    def test_un_acheteur_n_accede_pas_a_l_espace_partenaire(
        self, client_acheteur,
    ):
        for chemin in ("due", "escrow", "settlements", "adjustments", "payouts"):
            reponse = client_acheteur.get(f"/api/payments/v2/partner/{chemin}/")
            assert reponse.status_code == 403, chemin

    def test_l_anonyme_est_refuse(self):
        client = APIClient()
        assert client.get("/api/payments/v2/me/payments/").status_code in (401, 403)
        assert client.get("/api/payments/v2/partner/due/").status_code in (401, 403)


# ═══════════════════════════════════════════════════════════════════════════
# ESPACE ACHETEUR
# ═══════════════════════════════════════════════════════════════════════════

class TestEspaceAcheteur:

    def test_liste_des_paiements(self, acheteur, vendeur_user, client_acheteur):
        payer(acheteur, vendeur_user)
        reponse = client_acheteur.get("/api/payments/v2/me/payments/")
        assert reponse.status_code == 200
        assert len(reponse.json()) == 1

    def test_les_commandes_couvertes_sont_listees(
        self, acheteur, vendeur_user, client_acheteur,
    ):
        commandes, intent = payer(acheteur, vendeur_user)
        donnees = client_acheteur.get(
            f"/api/payments/v2/me/payments/{intent.reference}/").json()
        assert commandes[0].pk in donnees["orders"]

    def test_la_protection_est_lisible(
        self, acheteur, vendeur_user, client_acheteur,
    ):
        """La promesse BelivaY rendue visible a l'acheteur."""
        commandes, _ = payer(acheteur, vendeur_user)
        donnees = client_acheteur.get(
            f"/api/payments/v2/me/orders/{commandes[0].pk}/protection/").json()

        marchandise = [d for d in donnees if d["component"] == "GOODS"][0]
        assert marchandise["protection"]["funds_protected"] is True
        assert "confirmation" in marchandise["protection"]["message"]

    def test_la_protection_s_eteint_apres_liberation(
        self, acheteur, vendeur_user, client_acheteur,
    ):
        commandes, _ = payer(acheteur, vendeur_user)
        events_in.buyer_confirmed_receipt(order_id=commandes[0].pk,
                                          event_id="api-r")
        release_hold(EscrowHold.objects.get(order_id=commandes[0].pk),
                     force=True, reason="Test")

        donnees = client_acheteur.get(
            f"/api/payments/v2/me/orders/{commandes[0].pk}/protection/").json()
        marchandise = [d for d in donnees if d["component"] == "GOODS"][0]
        assert marchandise["protection"]["funds_protected"] is False

    def test_verification_aupres_du_prestataire(
        self, acheteur, vendeur_user, client_acheteur,
    ):
        """Le prestataire fait foi, jamais l'etat local (principe P6)."""
        _, intent = payer(acheteur, vendeur_user)
        reponse = client_acheteur.post(
            f"/api/payments/v2/me/payments/{intent.reference}/check/")
        assert reponse.status_code == 200
        assert "status" in reponse.json()

    def test_declencher_un_paiement_deja_encaisse(
        self, acheteur, vendeur_user, client_acheteur,
    ):
        _, intent = payer(acheteur, vendeur_user)
        reponse = client_acheteur.post(
            f"/api/payments/v2/me/payments/{intent.reference}/pay/", {})
        assert reponse.status_code == 200
        assert reponse.json()["status"] == "ALREADY_SUCCEEDED"


# ═══════════════════════════════════════════════════════════════════════════
# ESPACE PARTENAIRE
# ═══════════════════════════════════════════════════════════════════════════

class TestEspacePartenaire:

    def test_montant_du_sans_solde_ni_retrait(
        self, acheteur, vendeur_user, client_vendeur,
    ):
        """
        IL N'EXISTE NI SOLDE, NI BOUTON DE RETRAIT (principe P10).
        Le partenaire voit un MONTANT DU et une date de reglement.
        """
        payer(acheteur, vendeur_user)
        donnees = client_vendeur.get("/api/payments/v2/partner/due/").json()

        assert "due_xaf" in donnees
        assert "next_settlement_cycle" in donnees
        assert "balance" not in donnees
        assert "withdraw" not in str(donnees).lower()

    def test_les_fonds_non_exigibles_sont_distingues(
        self, acheteur, vendeur_user, client_vendeur,
    ):
        """
        Un sequestre actif correspond a une commande VIVANTE : l'acheteur
        peut encore obtenir un remboursement integral.
        """
        payer(acheteur, vendeur_user)
        donnees = client_vendeur.get("/api/payments/v2/partner/due/").json()
        assert donnees["due_xaf"] == 0
        assert donnees["not_yet_due_xaf"] == 17000     # 20000 - 15 %

    def test_le_montant_devient_du_apres_liberation(
        self, acheteur, vendeur_user, client_vendeur,
    ):
        commandes, _ = payer(acheteur, vendeur_user)
        events_in.buyer_confirmed_receipt(order_id=commandes[0].pk,
                                          event_id="api-d")
        release_hold(EscrowHold.objects.get(order_id=commandes[0].pk),
                     force=True, reason="Test")

        donnees = client_vendeur.get("/api/payments/v2/partner/due/").json()
        assert donnees["due_xaf"] == 17000
        assert donnees["not_yet_due_xaf"] == 0

    def test_le_partenaire_voit_sa_commission(
        self, acheteur, vendeur_user, client_vendeur,
    ):
        """C'est SA commission : il a le droit de la voir."""
        payer(acheteur, vendeur_user)
        donnees = client_vendeur.get("/api/payments/v2/partner/escrow/").json()
        assert donnees[0]["commission_xaf"] == 3000
        assert donnees[0]["net_amount_xaf"] == 17000

    def test_releve_detaille_ligne_par_ligne(
        self, acheteur, vendeur_user, client_vendeur,
    ):
        """
        L'agregation est FINANCIERE, pas informationnelle : N sequestres
        deviennent UN versement, mais le releve reste detaille.
        """
        from apps.payments.bridge.actors import payee_for_vendor

        for i in range(3):
            commandes, _ = payer(acheteur, vendeur_user, montant=10000)
            events_in.buyer_confirmed_receipt(order_id=commandes[0].pk,
                                              event_id=f"api-s{i}")
            release_hold(EscrowHold.objects.get(order_id=commandes[0].pk),
                         force=True, reason="Test")

        profil = VendorProfile.objects.get(user=vendeur_user)
        confirm_batch(build_batch(payee_for_vendor(profil)))

        donnees = client_vendeur.get(
            "/api/payments/v2/partner/settlements/").json()
        assert len(donnees) == 1
        assert len(donnees[0]["lines"]) == 3
        assert donnees[0]["gross_amount_xaf"] == 3 * 8500

    def test_un_ajustement_expose_son_motif(
        self, acheteur, vendeur_user, client_vendeur,
    ):
        """
        Une retenue sans explication est contractuellement indefendable.
        """
        from apps.payments.bridge.actors import payee_for_vendor

        payer(acheteur, vendeur_user)
        operateur = User.objects.create_user("op", "op@b.cm", "x")
        approbateur = User.objects.create_user("ap", "ap@b.cm", "x")
        profil = VendorProfile.objects.get(user=vendeur_user)

        ajustement = create_adjustment(
            payee=payee_for_vendor(profil),
            direction=Adjustment.Direction.CREDIT,
            category=Adjustment.Category.PENALTY, amount_xaf=5000,
            reason="Retard de livraison du 12 mars", created_by=operateur)
        approve_adjustment(ajustement, approved_by=approbateur)

        donnees = client_vendeur.get(
            "/api/payments/v2/partner/adjustments/").json()
        assert donnees[0]["reason"] == "Retard de livraison du 12 mars"
        assert donnees[0]["direction_label"] == "Vous devez a BelivaY"

    def test_aucun_endpoint_de_retrait(self, client_vendeur):
        """
        Principe P10 : un partenaire qui peut reclamer son argent quand il
        veut fait de BelivaY un detenteur de monnaie electronique.
        """
        for chemin in ("withdraw", "payout", "cashout"):
            reponse = client_vendeur.post(f"/api/payments/v2/partner/{chemin}/")
            assert reponse.status_code == 404, chemin

    def test_les_versements_sont_consultables(
        self, acheteur, vendeur_user, client_vendeur,
    ):
        payer(acheteur, vendeur_user)
        reponse = client_vendeur.get("/api/payments/v2/partner/payouts/")
        assert reponse.status_code == 200
        assert isinstance(reponse.json(), list)

    def test_un_partenaire_sans_activite_voit_un_etat_vide(
        self, client_vendeur,
    ):
        """
        Un vendeur fraichement approuve n'a pas encore de compte financier.
        Lui repondre 403 reviendrait a lui dire « cet espace ne vous
        concerne pas » alors qu'il n'a simplement aucune activite.
        """
        reponse = client_vendeur.get("/api/payments/v2/partner/due/")
        assert reponse.status_code == 200
        assert reponse.json()["due_xaf"] == 0
        assert reponse.json()["next_settlement_cycle"] == "(aucune activite)"

        for chemin in ("escrow", "settlements", "adjustments", "payouts"):
            reponse = client_vendeur.get(f"/api/payments/v2/partner/{chemin}/")
            assert reponse.status_code == 200, chemin
            assert reponse.json() == [], chemin