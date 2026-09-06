# backend/apps/orders/reassignment.py
#
# Cas 6.2 (Regles_Systeme_DEV v2.0 §6.2) — réattribution automatique d'un
# article dont le vendeur ne prépare pas à temps. N'AGIT que si les 4
# conditions strictes sont réunies simultanément :
#   - même Master Produit
#   - même état (neuf, reconditionné, occasion)
#   - prix inférieur ou égal
#   - même zone que le vendeur remplacé
# "Si une seule condition manque, on propose au client, on n'impose pas."
# → cette fonction ne fait RIEN d'autre que chercher un remplaçant et
# basculer l'article quand les 4 conditions tiennent ; sinon elle retourne
# None sans rien modifier, laissant la décision à un humain.

from django.contrib.auth.models import User
from django.db import transaction

from apps.accounts.models import UserNotification
from apps.catalog.models import Product
from apps.shipping.models import Shipment, ShipmentEvent


def find_reassignment_candidate(order_item):
    """Cherche une offre alternative remplissant les 4 conditions du cas 6.2. None sinon."""
    from apps.vendors.models import VendorProfile

    product = order_item.product
    if not product.master_id or not product.condition_id:
        return None  # sans fiche maitre ou etat renseigne, pas de comparaison fiable

    original_zone_id = (
        VendorProfile.objects.filter(user_id=product.vendor_id)
        .values_list("zone_id", flat=True)
        .first()
    )
    if not original_zone_id:
        return None  # zone du vendeur d'origine inconnue : condition "meme zone" invérifiable

    return (
        Product.objects.filter(
            master_id=product.master_id,
            condition_id=product.condition_id,
            price_xaf__lte=product.price_xaf,
            is_active=True,
            moderation_status="APPROVED",
            vendor__vendor_profile__status="APPROVED",
            vendor__vendor_profile__zone_id=original_zone_id,
            inventory__quantity__gt=0,
        )
        .exclude(vendor_id=product.vendor_id)
        .exclude(pk=product.pk)
        .order_by("price_xaf")
        .first()
    )


@transaction.atomic
def attempt_automatic_reassignment(order_item, *, reason: str = ""):
    """
    Applique le remplacement si un candidat valide existe : bascule
    l'article sur le nouveau vendeur, annule le colis de l'ancien, en crée
    un nouveau (qui repart dans le circuit normal d'affectation/tournée).

    Retourne le Product de remplacement si effectué, None sinon (rien n'est
    modifié dans ce cas).
    """
    replacement = find_reassignment_candidate(order_item)
    if replacement is None:
        return None

    order = order_item.order
    old_product = order_item.product
    old_vendor = old_product.vendor
    old_price = order_item.price_xaf_snapshot
    price_diff = old_price - replacement.price_xaf

    old_shipment = Shipment.objects.filter(order=order, vendor=old_vendor).first()

    order_item.product = replacement
    order_item.title_snapshot = replacement.title
    order_item.price_xaf_snapshot = replacement.price_xaf
    order_item.line_total_xaf = replacement.price_xaf * order_item.qty
    order_item.save(update_fields=["product", "title_snapshot", "price_xaf_snapshot", "line_total_xaf"])

    order.subtotal_xaf = sum(item.line_total_xaf for item in order.items.all())
    order.total_xaf = order.subtotal_xaf + (order.delivery_fee_xaf or 0)
    order.save(update_fields=["subtotal_xaf", "total_xaf"])

    if old_shipment is not None:
        old_shipment.status = Shipment.Status.CANCELLED
        old_shipment.save(update_fields=["status", "updated_at"])
        ShipmentEvent.objects.create(
            shipment=old_shipment,
            status=Shipment.Status.CANCELLED,
            message=f"Réattribution automatique (cas 6.2) — article transféré à un autre vendeur. {reason}".strip(),
            location=order.city,
        )

    new_shipment = Shipment.objects.create(order=order, vendor=replacement.vendor, status=Shipment.Status.CREATED)
    ShipmentEvent.objects.create(
        shipment=new_shipment,
        status=Shipment.Status.CREATED,
        message="Colis créé par réattribution automatique (cas 6.2) — vendeur d'origine en retard.",
        location=order.city,
    )

    if order.user_id:
        UserNotification.objects.create(
            user=order.user,
            title=f"Article remplacé · commande #{order.id}",
            message=(
                f"Le vendeur initial de « {old_product.title} » n'a pas préparé l'article à temps. "
                "Il a été remplacé par un autre vendeur — même produit, même état, prix identique ou inférieur."
            ),
            notification_type=UserNotification.NotificationType.ORDER,
            action_url=f"/orders/{order.id}",
        )

    if price_diff > 0:
        from .models import OrderHistory

        OrderHistory.objects.create(
            order=order,
            action="Réattribution cas 6.2 : écart de prix à rembourser (validation humaine requise)",
            field_name="line_total_xaf",
            old_value=str(old_price),
            new_value=str(replacement.price_xaf),
        )
        for admin_user in User.objects.filter(is_staff=True):
            UserNotification.objects.create(
                user=admin_user,
                title=f"Écart de prix à rembourser · commande #{order.id}",
                message=(
                    f"Réattribution automatique cas 6.2 sur la commande #{order.id} : "
                    f"nouveau prix {replacement.price_xaf} F contre {old_price} F. "
                    f"Différence de {price_diff} F à rembourser à l'acheteur (validation manuelle requise)."
                ),
                notification_type=UserNotification.NotificationType.SYSTEM,
                action_url=f"/admin/operations/orders/{order.id}",
            )

    return replacement
