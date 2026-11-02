# Promotions, Flash Deals et accueil personnalisé — feuille de route D9 ; spec v2.1, R27.2.

from datetime import timedelta

import pytest
from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework.test import APIClient

from apps.catalog.models import Category, ModerationStatus, Product, PromotionCampaign
from apps.catalog.offers import annotate_effective_price
from apps.catalog.serializers import OfferSerializer, ProductSerializer
from apps.orders.models import Order, ReservationFlash
from tests.test_comptoir_d14 import _referentiel  # noqa: F401  (fixture)
from tests.test_frais_v21 import boutique, offre
from apps.payments.tests.bridge.test_checkout import _mock, configuration, plan_comptable  # noqa: F401,E402

pytestmark = pytest.mark.django_db


def _campagne(produit, prix, type_=PromotionCampaign.CampaignType.FLASH, stock=5, **extra):
    maintenant = timezone.now()
    return PromotionCampaign.objects.create(
        product=produit, campaign_type=type_, status=PromotionCampaign.Status.APPROVED, title="Vente",
        starts_at=maintenant - timedelta(hours=1), ends_at=maintenant + timedelta(hours=5),
        reference_price_xaf=produit.price_xaf, promo_price_xaf=prix, stock_reserved=stock, **extra)


def test_un_seul_prix_flash_pour_la_liste_la_fiche_l_offre_et_la_commande():
    p = offre(boutique("bf"), 20000)
    _campagne(p, 17000, PromotionCampaign.CampaignType.REGULAR)
    _campagne(p, 15000)                                                                    # R27.2 : flash d'abord
    p = Product.objects.prefetch_related("promotion_campaigns").get(pk=p.pk)
    sql = annotate_effective_price(Product.objects.filter(pk=p.pk)).get().effective_price
    assert ProductSerializer(p).data["price_final"] == OfferSerializer(p).data["price_final"] == sql == 15000
    assert "server_now" in ProductSerializer(p).data["active_campaign"]                  # D9 : heure du serveur


def test_le_stock_flash_baisse_a_la_commande_et_revient_si_annulee():
    p = offre(boutique("bs"), 20000)
    c = _campagne(p, 15000, stock=1)
    from apps.orders.serializers import OrderCreateSerializer
    from rest_framework.test import APIRequestFactory
    from tests.test_frais_v21 import relais_biyem_assi

    def commander(nom):
        requete = APIRequestFactory().post("/api/orders/")
        requete.user = User.objects.create_user(username=nom, password="p")
        s = OrderCreateSerializer(data={"cart_items": [{"product_id": p.pk, "qty": 1}], "city": "YAOUNDE",
                                        "customer_phone": "+237699000001", "delivery_mode": "PICKUP",
                                        "relay_point_id": relais_biyem_assi().pk}, context={"request": requete})
        assert s.is_valid(), s.errors
        return s.save()

    o = commander("cs1")
    c.refresh_from_db()
    assert c.stock_claimed == 1 and o.items.get().price_xaf_snapshot == 15000
    assert ReservationFlash.objects.filter(order=o, rendue_le__isnull=True).count() == 1
    # Stock épuisé : la campagne n'est plus active, la commande suivante paie le prix normal (R27.2).
    o2 = commander("cs2")
    assert o2.items.get().price_xaf_snapshot == 20000
    o.cancel()
    c.refresh_from_db()
    assert c.stock_claimed == 0                                                            # rendu à la vente

    o3 = commander("cs3")
    Order.objects.filter(pk=o3.pk).update(created_at=timezone.now() - timedelta(hours=2))
    from apps.orders.flash import rendre_les_impayees

    assert rendre_les_impayees() == 1                                                      # impayée : rendu
    c.refresh_from_db()
    assert c.stock_claimed == 0


def test_flash_deals_heure_du_serveur_et_ordre_des_preferences(monkeypatch):
    mode, _ = Category.objects.get_or_create(slug="mode-d9", defaults={"name": "Mode"})
    p_tel = offre(boutique("bt"), 20000)
    p_mode = Product.objects.create(title="Robe", category=mode, price_xaf=20000, vendor=p_tel.vendor)
    for p in (p_tel, p_mode):
        Product.objects.filter(pk=p.pk).update(moderation_status=ModerationStatus.APPROVED)
    c_tel, c_mode = _campagne(p_tel, 15000), _campagne(p_mode, 15000)
    PromotionCampaign.objects.filter(pk=c_tel.pk).update(ends_at=timezone.now() + timedelta(hours=1))

    anonyme = APIClient().get("/api/catalog/flash-deals/").json()
    assert anonyme["ouvert"] and anonyme["server_now"]
    assert [d["id"] for d in anonyme["deals"]] == [c_tel.pk, c_mode.pk]                  # sans choix : fin d'abord

    cliente = User.objects.create_user(username="cliente_mode", password="p")
    c = APIClient()
    c.force_authenticate(cliente)
    assert c.put("/api/me/interets", {"univers": ["mode-d9"]}, format="json").status_code == 204
    assert [d["id"] for d in c.get("/api/catalog/flash-deals/").json()["deals"]] == [c_mode.pk, c_tel.pk]
    assert c.get("/api/catalog/flash-deals/").json()["deals"][0]["product"]["price_final"] == 15000  # même prix

    from apps.client_core import interrupteurs

    monkeypatch.setattr(interrupteurs, "ouvert", lambda code: False if code == "FF-FLASH" else True)
    ferme = APIClient().get("/api/catalog/flash-deals/").json()
    assert ferme["ouvert"] is False and ferme["deals"] == []                               # FF-FLASH fermé


def test_accueil_general_puis_selon_les_choix_et_ce_que_le_client_regarde():
    mode, _ = Category.objects.get_or_create(slug="mode-d9", defaults={"name": "Mode", "display_order": 9})
    p_tel = offre(boutique("ba"), 20000)
    p_mode = Product.objects.create(title="Robe", category=mode, price_xaf=20000, vendor=p_tel.vendor)
    Product.objects.filter(pk__in=[p_tel.pk, p_mode.pk]).update(moderation_status=ModerationStatus.APPROVED)
    Category.objects.filter(pk=p_tel.category_id).update(display_order=1)

    general = APIClient().get("/api/catalog/home/").json()
    assert general["personnalise"] is False
    assert [r["univers"]["slug"] for r in general["rangees"]][:2] == [p_tel.category.slug, "mode-d9"]

    cliente = User.objects.create_user(username="cliente_accueil", password="p")
    c = APIClient()
    c.force_authenticate(cliente)
    c.get(f"/api/catalog/products/{p_mode.pk}/")                                           # elle regarde la robe
    from apps.client_accounts.models import ProduitVu

    assert ProduitVu.objects.filter(user=cliente, product_id=p_mode.pk).exists()
    accueil = c.get("/api/catalog/home/").json()
    assert accueil["personnalise"] is True and accueil["rangees"][0]["univers"]["slug"] == "mode-d9"
    c.put("/api/me/interets", {"univers": [p_tel.category.slug]}, format="json")           # un choix passe devant
    assert c.get("/api/catalog/home/").json()["rangees"][0]["univers"]["slug"] == p_tel.category.slug


def test_alerte_flash_selon_les_preferences():
    from apps.catalog.preferences import notifier_flash
    from apps.client_accounts.services import profil
    from apps.notifications_client.models import JournalNotification, ReglagesNotifications

    mode, _ = Category.objects.get_or_create(slug="mode-d9", defaults={"name": "Mode"})
    p_tel = offre(boutique("bn"), 20000)
    campagne = _campagne(p_tel, 15000)
    tel_fan, mode_fan, sans = (User.objects.create_user(username=n, password="p") for n in ("fan_tel", "fan_mode",
                                                                                              "sans_choix"))
    for u, choix in ((tel_fan, [p_tel.category.slug]), (mode_fan, ["mode-d9"]), (sans, [])):
        ReglagesNotifications.objects.update_or_create(user=u, defaults={"flash": True})
        pr = profil(u)
        pr.interets = choix
        pr.save()
    notifier_flash(campagne)
    alertes = set(JournalNotification.objects.filter(type="flash").values_list("user__username", flat=True))
    assert alertes == {"fan_tel", "sans_choix"}                                            # pas la fan de mode
