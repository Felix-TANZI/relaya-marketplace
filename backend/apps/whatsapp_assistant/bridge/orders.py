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


def order_url(order_id: int) -> str | None:
    """
    Fiche de la commande dans l'application client, ou None si le site n'est
    pas en HTTPS : WhatsApp refuse tout autre lien sur un bouton.
    """
    from apps.whatsapp_assistant.conf import get_config

    base = get_config().site_url
    if not base.startswith("https://"):
        return None
    return f"{base}/orders/{order_id}?utm_source=whatsapp&utm_medium=assistant&utm_campaign=suivi"


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


def _shop_name(shipment) -> str:
    """Le nom de la boutique ; les anciens colis n'ont pas de vendeur attache."""
    vendor = shipment.vendor if shipment.vendor_id else None
    if vendor is None:
        item = shipment.order_items.select_related("product__vendor").first()
        vendor = item.product.vendor if item and item.product else None
    profile = getattr(vendor, "vendor_profile", None) if vendor else None
    return profile.business_name if profile else ""


def _to_parcel(shipment) -> Parcel:
    return Parcel(
        reference=f"BVY-{shipment.order_id}-{shipment.id}",
        status=shipment.status,
        shop=_shop_name(shipment),
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

# ── Ecoute des etapes de la livraison ──────────────────────────────────────

_UNKNOWN = object()

# Les moments ou le client merite d'etre prevenu, et le statut de colis qui les
# declenche. IN_TRANSIT n'interesse le client que si son colis va en relais :
# c'est le serializer du point relais qui le pose, a la reception.
MOMENTS = {
    "PICKED_UP": "picked_up",
    "IN_TRANSIT": "at_relay",
    "OUT_FOR_DELIVERY": "out_for_delivery",
    "DELIVERED": "delivered",
}


def connect_shipment_signal(on_step, is_enabled) -> None:
    """
    Appelle on_step(shipment_id, moment) apres validation en base, a chaque
    etape franchie par un colis — quel que soit le chemin qui l'a franchie.
    """
    from django.db import transaction
    from django.db.models.signals import post_save, pre_save

    from apps.shipping.models import Shipment

    def remember_previous_status(sender, instance, raw=False, update_fields=None, **kwargs):
        if raw or not is_enabled():
            return
        if update_fields is not None and "status" not in set(update_fields):
            return
        instance._whatsapp_previous_client_status = (
            sender.objects.filter(pk=instance.pk).values_list("status", flat=True).first()
            if instance.pk else None
        )

    def notify_client(sender, instance, raw=False, **kwargs):
        previous = instance.__dict__.pop("_whatsapp_previous_client_status", _UNKNOWN)
        if raw or previous is _UNKNOWN or previous == instance.status:
            return
        moment = MOMENTS.get(instance.status)
        if not moment:
            return
        shipment_id = instance.pk
        transaction.on_commit(lambda: on_step(shipment_id, moment))

    pre_save.connect(remember_previous_status, sender=Shipment, weak=False,
                     dispatch_uid="whatsapp_assistant.client_remember_status")
    post_save.connect(notify_client, sender=Shipment, weak=False,
                      dispatch_uid="whatsapp_assistant.client_notify_step")


@dataclass(frozen=True)
class Step:
    order_id: int
    reference: str              # BVY-<commande>-<colis>
    wa_id: str                  # le numero du client, vide s'il n'est pas valide
    to_relay: bool
    place: str                  # point relais, ou quartier de livraison
    eta: str


def step_of(shipment_id: int) -> Step | None:
    """Ce qu'il faut dire au client sur ce colis, et a quel numero."""
    from apps.shipping.models import Shipment

    from .deliveries import to_wa_id

    shipment = (
        Shipment.objects.select_related("order", "order__relay_point")
        .filter(pk=shipment_id).first()
    )
    if shipment is None:
        return None
    order = shipment.order
    to_relay = bool(order.relay_point_id)
    return Step(
        order_id=order.id,
        reference=f"BVY-{order.id}-{shipment.id}",
        wa_id=to_wa_id(order.customer_phone or ""),
        to_relay=to_relay,
        place=_destination(order),
        eta=_eta(shipment),
    )


def has_relay_parcel(shipment_id: int) -> bool:
    from apps.shipping.models import RelayParcel

    return RelayParcel.objects.filter(shipment_id=shipment_id).exists()
