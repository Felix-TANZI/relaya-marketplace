# Commission d'une sous-commande et contrôle de rentabilité (BV-DEV-03, A7 et A8) : apps/orders/commission.py.

from datetime import timedelta
from fractions import Fraction

import pytest
from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework.test import APIRequestFactory

from apps.accounts.models import TrustScoreProfile
from apps.orders import commission
from apps.orders.models import CommissionSousCommande, Order
from apps.regles import services as regles
from apps.shipping import zones
from tests.test_frais_v21 import BASTOS, boutique, offre, relais_biyem_assi

pytestmark = pytest.mark.django_db


@pytest.fixture(autouse=True)
def _referentiel():
    regles.cache.delete(regles.CLE_CACHE)
    zones.synchroniser_zones()
    yield
    regles.cache.delete(regles.CLE_CACHE)


def commander(lignes, relais=True):
    from apps.orders.serializers import OrderCreateSerializer

    client = User.objects.create_user(username=f"cli{User.objects.count()}", password="p")
    requete = APIRequestFactory().post("/api/orders/")
    requete.user = client
    donnees = {"cart_items": [{"product_id": p.pk, "qty": q} for p, q in lignes], "city": "YAOUNDE",
               "customer_phone": "+237699000001"}
    if relais:
        donnees.update(delivery_mode="PICKUP", relay_point_id=relais_biyem_assi().pk)
    else:
        donnees.update(delivery_mode="DELIVERY", district="Bastos", address="portail vert",
                       delivery_latitude=BASTOS[0], delivery_longitude=BASTOS[1])
    s = OrderCreateSerializer(data=donnees, context={"request": requete})
    assert s.is_valid(), s.errors
    return s.save()


def test_la_commande_fige_la_commission_de_chaque_boutique():
    p = offre(boutique(), 14000)                       # TEL (famille A), Bronze, offre de découverte
    o = commander([(p, 1)])
    c = CommissionSousCommande.objects.get(order=o)
    attendu = regles.moteur().commission([dict(prix_i=14000, q_i=1, univers_i="TEL", mic_i=False)], "Bronze", True, 0)
    assert (c.commission_b, c.tva_b, c.net_b, c.plancher_retenu) == (
        attendu["commission_b"], attendu["tva_b"], attendu["net_b"], attendu["plancher_retenu"])
    assert (c.palier, c.decouverte, c.st_b, c.couv_b) == ("Bronze", True, 14000, "0")
    assert c.articles == [{"prix_i": 14000, "q_i": 1, "univers_i": "TEL", "mic_i": False}]


def test_la_couverture_se_partage_au_prorata_des_boutiques():
    a, b = offre(boutique("b1"), 20000), offre(boutique("b2"), 10000)
    o = commander([(a, 1), (b, 1)])                    # st = 30 000 : relais offert, couverture 900
    parts = {c.st_b: Fraction(c.couv_b) for c in o.commissions.all()}
    assert parts == {20000: Fraction(600), 10000: Fraction(300)}               # R14.3
    assert sum(parts.values()) == o.couverture_xaf


def test_le_palier_vient_du_trust_score():
    v = boutique()
    TrustScoreProfile.objects.create(user=v, role=TrustScoreProfile.Role.VENDOR, tier=TrustScoreProfile.Tier.GOLD)
    assert commission.palier_vendeur(v) == "Or"


def test_l_offre_de_decouverte_s_arrete_apres_trois_mois():
    v = boutique()
    p = offre(v, 14000)
    o = commander([(p, 1)])
    Order.objects.filter(pk=o.pk).update(payment_status=Order.PaymentStatus.PAID,
                                         created_at=timezone.now() - timedelta(days=95))
    assert commission.decouverte(v) is False                                   # R17.3
    Order.objects.filter(pk=o.pk).update(created_at=timezone.now() - timedelta(days=10))
    assert commission.decouverte(v) is True


@pytest.mark.parametrize("relais", [True, False])
def test_la_rentabilite_suit_le_moteur(relais):
    p = offre(boutique(), 14000)
    o = commander([(p, 1)], relais=relais)
    c = o.commissions.get()
    m = regles.moteur()
    attendu = m.rentabilite("relais" if relais else "domicile", "P", 1, 14000, 1, "TEL", c.palier, c.decouverte, False,
                            o.frais_detail["frais_bruts"], Fraction(c.couv_b), True)
    assert (Fraction(c.reste_b), Fraction(c.couts_b), c.exigence) == (attendu["reste_b"], attendu["couts_b"], attendu["exigence"])


def test_remboursement_partiel():
    c = CommissionSousCommande(commission_b=700, st_b=2000)
    assert commission.commission_apres_remboursement(c, 1000) == 350          # exemple de R20.2
    assert commission.commission_apres_remboursement(c, 0) == 0               # R13.3


def test_le_paiement_preleve_la_commission_exacte():
    from apps.payments.domain.distribution import ComponentInput as CI, DistributionRuleSpec, build_distribution_plan
    from apps.payments.domain.enums import DistributionBasis, EconomicComponent, PayeeType
    from apps.payments.domain.money import Money

    regle = DistributionRuleSpec(rule_version_id=1, name="g", component=EconomicComponent.GOODS,
                                 payee_type=PayeeType.VENDOR, basis=DistributionBasis.REMAINDER, priority=10)
    plan = build_distribution_plan(
        components=[CI(EconomicComponent.GOODS, Money(14000), order_id=1, payee_code="V1",
                       commission_amount=Money(1652))],
        rules=[regle], payee_codes={PayeeType.VENDOR: "V1"}, payee_types={"V1": PayeeType.VENDOR})
    assert plan.holds[0].commission == Money(1652) and plan.holds[0].net == Money(12348)


def test_rapport_hebdomadaire_alerte_la_finance():
    from django.core.management import call_command

    from apps.accounts.models import UserNotification

    p = offre(boutique(), 14000)
    o = commander([(p, 1)])
    CommissionSousCommande.objects.filter(order=o).update(reste_b="-150", exigence=False, objectif=False)
    admin = User.objects.create_user(username="finance", password="p", is_staff=True)
    call_command("rentabilite_hebdomadaire")
    n = UserNotification.objects.get(user=admin)
    assert "à perte" in n.title and f"#{o.pk}" in n.message                 # R92.5
