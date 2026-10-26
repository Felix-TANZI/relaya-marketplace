# Partie 2 du rapport final, étape 10 : R72.1, R25.1, R34.5 et palier affiché.

from datetime import timedelta

import pytest
from django.contrib.auth.models import User
from django.utils import timezone

from apps.payments.application.collect import initiate_collect, poll_attempt
from apps.payments.bridge.checkout_v2 import prepare_payment
from apps.payments.config.models import DistributionRule
from apps.payments.escrow.models import EscrowHold
from apps.payments.ledger import chart_of_accounts as coa
from apps.payments.ledger.balances import balance
from apps.payments.ledger.invariants import check_escrow_equation
from apps.payments.settlements.services import approve_refund, create_refund, execute_refund
from apps.payments.tests.bridge.test_checkout import (  # noqa: F401  (fixtures)
    NUMERO, _mock, acheteur, commande, configuration, plan_comptable, produit, vendeur,
)
from apps.regles import services as regles

pytestmark = pytest.mark.django_db


# ── R72.1 : les frais Mobile Money reviennent au client qui n'est pas en faute ────────────────────────────────

def test_part_des_frais_au_prorata_du_total_paye(acheteur):
    from apps.orders.frais import part_frais_momo

    cmd = commande(acheteur, [(produit(vendeur("v1"), 14000), 1)], frais=900)
    cmd.frais_momo_xaf = 305
    assert part_frais_momo(cmd, 14000) == 305 * 14000 // cmd.total_xaf
    assert part_frais_momo(cmd, cmd.total_xaf) == 305                                     # tout, jamais plus


def test_les_frais_rendus_sortent_du_produit_pas_du_sequestre(acheteur):
    DistributionRule.objects.create(
        config_key="dist-payment-fee-platform", name="Frais Mobile Money",
        component=DistributionRule.Component.PAYMENT_FEE, payee_type=DistributionRule.PayeeType.PLATFORM,
        basis=DistributionRule.Basis.REMAINDER, priority=10)
    cmd = commande(acheteur, [(produit(vendeur("v2"), 14000), 1)], frais=900)
    cmd.frais_momo_xaf = 305
    cmd.save(update_fields=["frais_momo_xaf"])
    intent = prepare_payment(cmd, payer_msisdn=NUMERO, payer_operator="MTN")
    issue = initiate_collect(intent)
    poll_attempt(issue.attempt)
    poll_attempt(issue.attempt)
    produit_avant = balance(coa.REVENUE_COMMISSION)
    biens = list(EscrowHold.objects.filter(order_id=cmd.pk, component="GOODS"))
    a_rendre = sum(h.payable_amount_xaf for h in biens)
    demandeur, approbateur = (User.objects.create_user(n, password="p") for n in ("dem", "app"))
    r = create_refund(intent, amount_xaf=a_rendre + 305, reason="DISPUTE", requested_by=demandeur, holds=biens,
                      frais_momo_xaf=305)
    approve_refund(r, approved_by=approbateur)
    execute_refund(r)
    assert produit_avant - balance(coa.REVENUE_COMMISSION) == 305                          # R72.1, hors séquestre
    assert check_escrow_equation().status == "OK"                                          # I8 tenu


# ── R25.1 : un geste ne dépasse jamais la commission de la commande ──────────────────────────────────────────

def test_geste_plafonne_a_la_commission_de_la_commande(acheteur, monkeypatch):
    from apps.payments.bridge import gestes
    from apps.payments.wallet import services as wallet

    vrai = regles.reglage
    monkeypatch.setattr(regles, "reglage", lambda nom: 1 if nom == "r_wallet_ouvert" else vrai(nom))
    monkeypatch.setattr(gestes, "commission_de_la_commande", lambda order_id: 1000)
    cmd = commande(acheteur, [(produit(vendeur("v3"), 14000), 1)])
    chef = User.objects.create_user("chef", password="p")
    wallet.demander_geste(acheteur, montant=800, motif="Retard", demande_par=chef, order_id=cmd.pk)
    with pytest.raises(wallet.WalletError) as e:
        wallet.demander_geste(acheteur, montant=300, motif="Encore", demande_par=chef, order_id=cmd.pk)
    assert e.value.code == "geste_plafond"
    autre = User.objects.create_user("autre", password="p")
    with pytest.raises(wallet.WalletError) as e:
        wallet.demander_geste(autre, montant=100, motif="x", demande_par=chef, order_id=cmd.pk)
    assert e.value.code == "geste_commande"                                               # pas sa commande


# ── R34.5 : une forte hausse de prix retire l'accès aux ventes flash ─────────────────────────────────────────

def _flash(p):
    from apps.catalog.models import PromotionCampaign

    maintenant = timezone.now()
    return PromotionCampaign.objects.create(
        product=p, campaign_type=PromotionCampaign.CampaignType.FLASH, status=PromotionCampaign.Status.APPROVED,
        title="Flash", starts_at=maintenant - timedelta(hours=1), ends_at=maintenant + timedelta(hours=5),
        reference_price_xaf=p.price_xaf, promo_price_xaf=p.price_xaf * 8 // 10, stock_reserved=5)


def test_hausse_de_prix_suspend_la_vente_flash():
    from apps.catalog.flash import hausse_recente

    p = produit(vendeur("v4"), 10000)
    c = _flash(p)
    p.price_xaf = 10500                                                                    # +5 % : rien
    p.save()
    c.refresh_from_db()
    assert c.status == "APPROVED" and not hausse_recente(p)
    p.price_xaf = 11500                                                                    # +15 % en 7 j
    p.save()
    c.refresh_from_db()
    assert c.status == "SUSPENDED" and hausse_recente(p)


def test_pas_de_demande_flash_apres_une_hausse(acheteur):
    from rest_framework.test import APIClient

    vendeur_user = vendeur("v5")
    p = produit(vendeur_user, 10000)
    p.moderation_status = "APPROVED"                                                       # visible en vitrine
    p.price_xaf = 12000
    p.save()
    c = APIClient()
    c.force_authenticate(vendeur_user)
    maintenant = timezone.now()
    r = c.post(f"/api/catalog/products/{p.pk}/promotion-request/", {
        "campaign_type": "FLASH", "title": "Flash", "starts_at": maintenant.isoformat(),
        "ends_at": (maintenant + timedelta(hours=5)).isoformat(), "reference_price_xaf": 12000,
        "promo_price_xaf": 9000, "stock_reserved": 5}, format="json")
    assert r.status_code == 400 and "R34.5" in str(r.json())


# ── Palier affiché dans l'espace client : réglages de la spec et vrais compteurs ─────────────────────────────

def test_palier_d_un_nouveau_client():
    from apps.client_accounts.services import palier

    p = palier(User.objects.create_user("nouveau", password="p"))
    assert p["comptoir"] == regles.reglage("r_cpt_nouveau")                                # R42.2
    assert p["prochain"] == regles.reglage("r_cpt_panier")
    assert p["suivant"] == {"comptoir": regles.reglage("r_cpt_confirme"), "commandes": regles.reglage("r_cpt_confirme_cmd")}
    assert p["remboursementImmediat"] == 0                                                 # D32 fermé
