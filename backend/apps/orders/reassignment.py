# backend/apps/orders/reassignment.py
#
# Spec v2.1, R35 (bascule vers un autre vendeur) — remplace les 4 conditions du cas 6.2 décrites ci-dessous pour le
# choix de la remplaçante (find_reassignment_candidate) ; le reste du mécanisme est inchangé.
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


def _destination(order):
    """Destination de la commande, comme au paiement (A1, A9)."""
    from apps.orders import frais

    if order.delivery_method == "PICKUP" and order.relay_point_id:
        return frais.destination_relais(order.relay_point)
    return frais.destination_domicile(order.district, order.delivery_latitude, order.delivery_longitude)


def find_reassignment_candidate(order_item):
    """Spec v2.1, R35.2 : parmi les autres offres en course pour la destination de la commande (A6), celles dont
    trust ≥ r_trust_rempl et dont prix − prix payé ≤ min(r_ecart_rempl × prix payé ; commission_b) ; la remplaçante
    est celle de plus grand retard, puis de plus grand score (moteur BV-DEV-09). Une remplaçante plus chère suppose
    l'avance de l'écart par BelivaY (R35.3), qui relève du module financier : elle n'est pas retenue ici. Même fiche
    maître, même état. None sans remplaçante (le reste est décidé par un humain)."""
    from apps.catalog.meilleure_offre import journaliser, meilleure_offre
    from apps.orders.frais import FraisImpossibles
    from apps.orders.models import CommissionSousCommande
    from apps.regles import services as regles

    product = order_item.product
    if not product.master_id:
        return None
    autres = Product.objects.filter(master_id=product.master_id, is_active=True, moderation_status="APPROVED",
                                    inventory__quantity__gt=0).exclude(vendor_id=product.vendor_id)
    if product.condition_id:
        autres = autres.filter(condition_id=product.condition_id)
    if product.variant_id:
        autres = autres.filter(variant_id=product.variant_id)
    try:
        destination = _destination(order_item.order)
    except FraisImpossibles:
        return None
    r = meilleure_offre(list(autres.select_related("vendor", "master", "inventory")), destination)
    if r is None:
        return None
    prix_paye = order_item.price_xaf_snapshot
    figee = CommissionSousCommande.objects.filter(order=order_item.order, vendor_id=product.vendor_id).first()
    commission_b = figee.commission_b if figee is not None else prix_paye
    candidates = [{"id": o["id"], "prix": o["prix"], "trust": o["trust"], "retard": o["retard"], "score": o["score"]}
                  for o in r["en_course"] if o["prix"] <= prix_paye]
    choix = regles.moteur().bascule(prix_paye, commission_b, candidates)
    if choix["remplacante"] is None:
        return None
    journaliser(product.master, destination, {**r, "retenue": choix["remplacante"]}, "bascule", order_item.order)  # R27.7
    return Product.objects.get(pk=choix["remplacante"])


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
        ShipmentEvent.record(
            shipment=old_shipment,
            status=Shipment.Status.CANCELLED,
            message=f"Réattribution automatique (cas 6.2) — article transféré à un autre vendeur. {reason}".strip(),
            location=order.city,
            actor_role=ShipmentEvent.ACTOR_ROLE_SYSTEM,
        )

    new_shipment = Shipment.objects.create(order=order, vendor=replacement.vendor, status=Shipment.Status.CREATED)
    ShipmentEvent.record(
        shipment=new_shipment,
        status=Shipment.Status.CREATED,
        message="Colis créé par réattribution automatique (cas 6.2) — vendeur d'origine en retard.",
        location=order.city,
        actor_role=ShipmentEvent.ACTOR_ROLE_SYSTEM,
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
