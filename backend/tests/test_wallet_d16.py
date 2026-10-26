# Le Wallet du client — feuille de route D16 ; spec v2.1, R03.

import math

import pytest
from django.contrib.auth.models import User
from rest_framework.test import APIClient

from apps.orders.models import Order
from apps.payments.application.collect import initiate_collect, poll_attempt
from apps.payments.bridge.checkout_v2 import prepare_payment
from apps.payments.ledger import chart_of_accounts as coa
from apps.payments.ledger.balances import balance
from apps.payments.settlements.models import Refund
from apps.payments.settlements.services import approve_refund, create_refund, execute_refund
from apps.payments.tests.bridge.test_checkout import (  # noqa: F401  (fixtures)
    NUMERO, _mock, acheteur, commande, configuration, plan_comptable, produit, vendeur,
)
from apps.payments.wallet import services as wallet
from apps.payments.wallet.models import GestePortefeuille, MouvementPortefeuille
from apps.regles import services as regles

pytestmark = pytest.mark.django_db


@pytest.fixture
def ouvert(monkeypatch):
    """R03.1 : on simule l'ouverture du Wallet (r_wallet_ouvert = 1), les autres réglages restent ceux de la spec.
    R25.1 : chaque geste de ces tests porte sur une commande dont la commission (simulée) le couvre."""
    from apps.payments.bridge import gestes

    vrai = regles.reglage
    monkeypatch.setattr(regles, "reglage", lambda nom: 1 if nom == "r_wallet_ouvert" else vrai(nom))
    monkeypatch.setattr(gestes, "commission_de_la_commande", lambda order_id: 100000)
    monkeypatch.setattr(gestes, "commande_du_client", lambda order_id, user: True)


def _client(user):
    c = APIClient()
    c.force_authenticate(user)
    return c


def _recharger(user, montant):
    intent = wallet.preparer_recharge(user, montant=montant, msisdn=NUMERO, operator="MTN")
    issue = initiate_collect(intent)
    poll_attempt(issue.attempt)
    poll_attempt(issue.attempt)
    return intent


def test_ferme_au_lancement(acheteur):
    c = _client(acheteur)
    assert regles.reglage("r_wallet_ouvert") == 0                                          # R03.1
    for url, data in [("/api/payments/v2/me/wallet/topups/", {"montant_xaf": 5000, "payer_msisdn": NUMERO}),
                      ("/api/payments/v2/me/wallet/withdrawals/", {"montant_xaf": 2000})]:
        r = c.post(url, data, format="json")
        assert r.status_code == 403 and r.json()["code"] == "wallet_ferme"                   # R03.2
    assert c.get("/api/payments/v2/me/wallet/").json()["ouvert"] is False


def test_recharge_gratuite_et_au_grand_livre(acheteur, ouvert):
    _recharger(acheteur, 10000)
    p = wallet.portefeuille_de(acheteur)
    assert (p.solde_retirable_xaf, p.solde_geste_xaf) == (10000, 0)                         # R03.3 : rien retenu
    assert balance(coa.WALLET_LIABILITY) == 10000
    assert balance(coa.EXPENSE_PSP_COLLECT) > 0                                             # les frais pour BelivaY
    assert wallet.suivi()["ecart_xaf"] == 0


def test_le_solde_ne_depasse_jamais_le_plafond(acheteur, ouvert):
    with pytest.raises(wallet.WalletError) as e:
        wallet.preparer_recharge(acheteur, montant=regles.reglage("r_wallet_plafond") + 1, msisdn=NUMERO,
                                 operator="MTN")
    assert e.value.code == "wallet_plafond"                                                 # R03.5


def test_payer_une_commande_sans_frais_les_gestes_d_abord(acheteur, ouvert):
    _recharger(acheteur, 30000)
    chef, adjoint = (User.objects.create_user(n, password="p") for n in ("fin1", "fin2"))
    geste = wallet.demander_geste(acheteur, montant=2000, motif="Retard", demande_par=chef, order_id=1)
    with pytest.raises(wallet.WalletError):
        wallet.decider_geste(geste, par=chef, accepte=True)                                # séparation des rôles
    wallet.decider_geste(geste, par=adjoint, accepte=True)

    cmd = commande(acheteur, [(produit(vendeur("vw"), 20000), 1)], frais=1000)
    intent = prepare_payment(cmd, payer_msisdn=NUMERO, payer_operator="MTN")
    assert intent.amount_xaf == 21000
    r = _client(acheteur).post(f"/api/payments/v2/me/payments/{intent.reference}/pay-with-wallet/", {}, format="json")
    assert r.status_code == 200, r.json()
    cmd.refresh_from_db()
    assert cmd.payment_status == Order.PaymentStatus.PAID
    p = wallet.portefeuille_de(acheteur)
    assert (p.solde_geste_xaf, p.solde_retirable_xaf) == (0, 30000 + 2000 - 21000)          # geste dépensé en premier
    assert balance(coa.WALLET_LIABILITY) == p.solde_xaf and wallet.suivi()["ecart_xaf"] == 0

    # R03.6 : remboursée sur le Wallet, dans la part d'où venait l'argent.
    remboursement = create_refund(intent, amount_xaf=21000, reason=Refund.Reason.DISPUTE, requested_by=chef)
    approve_refund(remboursement, approved_by=adjoint)
    execute_refund(remboursement)
    p.refresh_from_db()
    assert p.solde_geste_xaf == math.floor(21000 * 2000 / 21000) and p.solde_xaf == 32000
    assert wallet.suivi()["ecart_xaf"] == 0


def test_code_a_4_chiffres_au_dela_du_seuil(acheteur, ouvert):
    _recharger(acheteur, 80000)
    cmd = commande(acheteur, [(produit(vendeur("vc"), regles.reglage("r_wallet_code_des") + 1000), 1)], frais=1000)
    intent = prepare_payment(cmd, payer_msisdn=NUMERO, payer_operator="MTN")
    with pytest.raises(wallet.WalletError) as e:
        wallet.payer(intent, user=acheteur)
    assert e.value.code == "code_requis"                                                    # R03.5
    wallet.definir_code(acheteur, "4821")
    with pytest.raises(wallet.WalletError):
        wallet.payer(intent, user=acheteur, code="0000")
    assert wallet.payer(intent, user=acheteur, code="4821").status == "SUCCEEDED"


def test_retrait_frais_minimum_numero_et_gestes(acheteur, ouvert):
    _recharger(acheteur, 10000)
    chef, adjoint = (User.objects.create_user(n, password="p") for n in ("f1", "f2"))
    wallet.decider_geste(wallet.demander_geste(acheteur, montant=3000, motif="x", demande_par=chef, order_id=1),
                         par=adjoint, accepte=True)
    c = _client(acheteur)
    devis = c.get("/api/payments/v2/me/wallet/withdrawal-quote/", {"montant_xaf": 10000}).json()
    assert devis["frais"] == 300 and devis["recu"] == 9700                                  # R03.4 : 3 % de 10 000
    r = c.post("/api/payments/v2/me/wallet/withdrawals/", {"montant_xaf": regles.reglage("r_retrait_wallet_min") - 1},
               format="json")
    assert r.json()["code"] == "retrait_min"
    r = c.post("/api/payments/v2/me/wallet/withdrawals/", {"montant_xaf": 10001}, format="json")
    assert r.json()["code"] == "solde_insuffisant"                                          # R03.6 : pas les gestes
    r = c.post("/api/payments/v2/me/wallet/withdrawals/", {"montant_xaf": 10000}, format="json")
    assert r.status_code == 200, r.json()
    p = wallet.portefeuille_de(acheteur)
    assert (p.solde_retirable_xaf, p.solde_geste_xaf) == (0, 3000)
    assert balance(coa.REVENUE_WALLET_WITHDRAWAL_FEE) == 300
    assert wallet.suivi()["ecart_xaf"] == 0


def test_retrait_seulement_vers_un_numero_qui_a_recharge(ouvert):
    sans = User.objects.create_user("sans_recharge", password="p")
    wallet.decider_geste(wallet.demander_geste(sans, montant=5000, motif="x",
                                               demande_par=User.objects.create_user("g1", password="p"), order_id=1),
                         par=User.objects.create_user("g2", password="p"), accepte=True)
    with pytest.raises(wallet.WalletError) as e:
        wallet.retirer(sans, montant=2000)
    assert e.value.code == "numero"                                                         # R03.4
    assert not MouvementPortefeuille.objects.filter(sorte="RETRAIT").exists()
    assert GestePortefeuille.objects.get().statut == "CREDITE"
