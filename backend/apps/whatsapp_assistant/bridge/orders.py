# backend/apps/whatsapp_assistant/bridge/orders.py
# Pont vers les commandes de BelivaY : SEUL fichier du module qui lit les
# commandes d'un client. Il ne lit que les commandes du numero qui ecrit —
# c'est WhatsApp qui garantit ce numero, on ne peut pas se faire passer pour
# un autre.
#
# Confidentialite : aucun numero de telephone ne ressort d'ici, ni celui du
# livreur ni celui de la boutique, et surtout aucun code de remise ou de
# reception — ces codes se donnent en main propre, jamais par message.

from dataclasses import dataclass, field
from datetime import timedelta

from django.utils import timezone

# Au-dela, une commande n'est plus « en cours de suivi ».
TRACKING_WINDOW_DAYS = 120
MAX_ORDERS = 10

FINISHED_STATUSES = ("DELIVERED", "BUYER_CONFIRMED", "AUTO_CONFIRMED", "RELEASED_TO_VENDOR",
                     "CANCELLED", "REFUNDED")


@dataclass(frozen=True)
class Parcel:
    reference: str              # BVY-<commande>-<colis>, comme dans l'application
    status: str
    shop: str
    items_count: int
    eta: str = ""               # « mardi 17/09 vers 14 h », vide si aucune promesse tenable


@dataclass(frozen=True)
class CustomerOrder:
    id: int
    reference: str              # BVY-<commande>
    status: str                 # fulfillment_status
    paid: bool
    placed_on: str              # 16/09
    total_xaf: int
    delivery_fee_xaf: int
    to_relay: bool
    destination: str            # adresse du client, ou nom du point relais
    items: list = field(default_factory=list)       # [(titre, quantite)]
    parcels: list = field(default_factory=list)

    @property
    def finished(self) -> bool:
        return self.status in FINISHED_STATUSES


def orders_of_phone(wa_id: str) -> list[CustomerOrder]:
    """
    Commandes recentes passees avec ce numero. Les numeros sont saisis a la
    main au checkout, sous des formes variees (« +237 6 90 ... », « 690... ») :
    la base filtre quand elle le peut, sinon on normalise en Python sur une
    fenetre bornee dans le temps.
    """
    from apps.orders.models import Order

    if len(wa_id) < 9:
        return []
    national = wa_id[-9:]
    recent = Order.objects.filter(created_at__gte=timezone.now() - timedelta(days=TRACKING_WINDOW_DAYS))

    found = list(recent.filter(customer_phone__endswith=national).order_by("-created_at")[:MAX_ORDERS])
    if not found:
        found = [
            order for order in recent.exclude(customer_phone="").order_by("-created_at")[:500]
            if _same_number(order.customer_phone, wa_id)
        ][:MAX_ORDERS]

    ids = [order.pk for order in found]
    detailed = (
        Order.objects.filter(pk__in=ids)
        .select_related("relay_point")
        .prefetch_related("items__product", "shipments__vendor__vendor_profile")
        .order_by("-created_at")
    )
    return [_to_order(order) for order in detailed]


def get_order(order_id: int, wa_id: str) -> CustomerOrder | None:
    """Une commande, et seulement si elle appartient bien a ce numero."""
    return next((order for order in orders_of_phone(wa_id) if order.id == order_id), None)


def _same_number(stored: str, wa_id: str) -> bool:
    from apps.whatsapp_assistant.bridge.deliveries import to_wa_id

    return bool(stored) and to_wa_id(stored) == wa_id


def _to_order(order) -> CustomerOrder:
    return CustomerOrder(
        id=order.id,
        reference=f"BVY-{order.id}",
        status=order.fulfillment_status,
        paid=order.is_paid,
        placed_on=timezone.localtime(order.created_at).strftime("%d/%m"),
        total_xaf=order.total_xaf,
        delivery_fee_xaf=order.delivery_fee_xaf,
        to_relay=bool(order.relay_point_id),
        destination=_destination(order),
        items=[(item.title_snapshot or (item.product.title if item.product else "—"), item.qty)
               for item in order.items.all()],
        parcels=[_to_parcel(shipment) for shipment in order.shipments.all()],
    )


def _destination(order) -> str:
    if order.relay_point_id:
        relay = order.relay_point
        return " · ".join(filter(None, [relay.name, relay.city or order.city]))
    return " · ".join(filter(None, [order.district, order.city])) or order.address


def _to_parcel(shipment) -> Parcel:
    profile = getattr(shipment.vendor, "vendor_profile", None) if shipment.vendor_id else None
    return Parcel(
        reference=f"BVY-{shipment.order_id}-{shipment.id}",
        status=shipment.status,
        shop=profile.business_name if profile else "",
        items_count=sum(shipment.order_items.values_list("qty", flat=True)),
        eta=_eta(shipment),
    )


def _eta(shipment) -> str:
    """Le creneau promis a l'acheteur, ou rien du tout — jamais une promesse inventee."""
    if shipment.status in ("DELIVERED", "CANCELLED", "FAILED"):
        return ""
    try:
        moment = shipment.estimated_availability_at()
    except Exception:                                       # noqa: BLE001
        return ""
    if not moment:
        return ""
    return timezone.localtime(moment).strftime("%d/%m vers %Hh")
