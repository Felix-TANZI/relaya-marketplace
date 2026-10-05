# backend/apps/cart/commande.py
# Création de la commande relaya (orders.Order + OrderItem) au paiement : le seul endroit où le kit ÉCRIT un modèle
# de relaya-marketplace.
#
# DÉCISION D8 (REPRISE-BACKEND.md) : chez relaya, une commande naît par OrderCreateSerializer (orders/serializers.py)
# puis l'intention de paiement par payments/bridge/checkout_v2.prepare_payment (séquestre, plan de répartition,
# idempotence). Le kit ne refait pas ce circuit : settings.BELIVAY_CREER_COMMANDE désigne la fonction à appeler.
#   - par défaut (projet d'essai) : creer_commande_simple ci-dessous, qui écrit Order et OrderItem directement ;
#   - chez relaya : écrire une fonction de même signature qui appelle leur création de commande et
#     prepare_payment, en leur passant les montants calculés ici par les moteurs (frais figés, CAL-06), au lieu de
#     _compute_delivery_price (CORRESPONDANCE § 6, frais.py).

from dataclasses import dataclass

from django.conf import settings
from django.utils.module_loading import import_string

from apps.client_core import pont


@dataclass(frozen=True)
class NouvelleCommande:
    user: object
    mode: str  # relais | domicile
    relay_id: int | None
    adresse: object | None  # client_accounts.Adresse (nom, quartier…), ou None
    telephone: str
    lignes: tuple  # (product_id, titre, prix, qte)
    sous_total: int
    livraison: int  # Ram + Rem + Suppl − Off − prime
    total: int  # payé ou dû, frais de service compris


def creer_commande_simple(c: NouvelleCommande) -> int:
    Order, Item = pont.modele("commande"), pont.modele("ligne_commande")
    quartier = getattr(c.adresse, "quartier", "") if c.adresse is not None else ""
    o = Order.objects.create(
        user=c.user,
        customer_phone=c.telephone or "",
        delivery_method="DELIVERY" if c.mode == "domicile" else "PICKUP",
        relay_point_id=c.relay_id,
        district=quartier or "",
        address=getattr(c.adresse, "nom", "") if c.adresse is not None else "",
        payment_status="PENDING",
        subtotal_xaf=c.sous_total,
        delivery_fee_xaf=c.livraison,
        total_xaf=c.total,
    )
    for product_id, titre, prix, qte in c.lignes:
        Item.objects.create(
            order=o, product_id=product_id, title_snapshot=titre[:200], price_xaf_snapshot=prix, qty=qte, line_total_xaf=prix * qte
        )
    return o.pk


def creer_commande(c: NouvelleCommande) -> int:
    chemin = getattr(settings, "BELIVAY_CREER_COMMANDE", "apps.cart.commande.creer_commande_simple")
    return import_string(chemin)(c)


def marquer_payee(order_id: int) -> None:
    """Reflète le paiement sur la commande relaya (chez relaya, leur webhook le fait déjà : sans effet en double)."""
    pont.modele("commande").objects.filter(pk=order_id).update(payment_status="PAID")
