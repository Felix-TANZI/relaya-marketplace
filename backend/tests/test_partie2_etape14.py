# Partie 2 du rapport final, étape 14 : plus de données de démonstration pour main 2 ; Wallet (DP-17).

import pytest
from django.contrib.auth.models import User
from django.test import override_settings
from rest_framework.exceptions import ValidationError
from rest_framework.test import APIClient, APIRequestFactory

from apps.catalog.models import Product
from apps.regles import services as regles

pytestmark = pytest.mark.django_db


@override_settings(DONNEES_DEMO_AUTORISEES=False)
def test_un_article_demo_ne_devient_plus_un_produit():
    from apps.orders.serializers import OrderCreateSerializer

    requete = APIRequestFactory().post("/api/orders/")
    requete.user = User.objects.create_user(username="client_demo", password="p")
    s = OrderCreateSerializer(data={"cart_items": [{"product_id": 999999, "qty": 1, "title": "Robe démo",
                                                    "price_xaf": 15000, "is_demo": True}],
                                    "city": "YAOUNDE", "customer_phone": "+237699000001", "delivery_mode": "PICKUP"},
                              context={"request": requete})
    with pytest.raises(ValidationError):
        s.is_valid(raise_exception=True)
        s.save()
    assert not Product.objects.filter(category__slug="produits-demo").exists()


def test_le_wallet_ferme_dit_seulement_ferme():
    """DP-17 : l'écran du client ne reçoit qu'« ouvert : faux » ; il n'affiche alors aucune mention du Wallet."""
    c = APIClient()
    c.force_authenticate(User.objects.create_user(username="client_wallet", password="p"))
    assert regles.reglage("r_wallet_ouvert") == 0
    assert c.get("/api/payments/v2/me/wallet/").json()["ouvert"] is False
