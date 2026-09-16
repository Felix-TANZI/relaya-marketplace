# backend/apps/whatsapp_assistant/bridge/vendor_orders.py
# Pont vers les commandes cote VENDEUR : SEUL fichier du module qui lit ce
# qu'un vendeur doit preparer, et qui fait avancer une commande pour lui.
#
# Confidentialite : BelivaY masque deja l'identite de l'acheteur a ses
# vendeurs (« Acheteur #4821 », telephone « Confidentiel »). Ce fichier
# applique la meme regle — aucun nom, aucun numero de client n'en sort.
# Le code de remise ne sort pas non plus : le vendeur le lit dans son
# application et le donne au livreur en main propre.

import hashlib
import logging
from dataclasses import dataclass, field
from datetime import timedelta

from django.db import transaction
from django.db.models.signals import post_save, pre_save
from django.utils import timezone

logger = logging.getLogger("apps.whatsapp_assistant")

# Etats dans lesquels une commande attend encore un geste du vendeur.
TO_PREPARE_STATUSES = ("PAID_IN_ESCROW", "VENDOR_ACKNOWLEDGED", "PREPARING")
PAID_STATUS = "PAID_IN_ESCROW"
WINDOW_DAYS = 60
MAX_ORDERS = 10


@dataclass(frozen=True)
class Vendor:
    id: int                     # VendorProfile
    user_id: int
    shop: str
    wa_id: str                  # 2376XXXXXXXX, vide si aucun numero valide
    language: str               # le vendeur n'a pas de langue enregistree : fr par defaut
    can_sell: bool              # boutique approuvee


@dataclass(frozen=True)
class VendorOrder:
    id: int
    reference: str              # BVY-<commande>
    status: str
    placed_on: str              # 16/09
    buyer: str                  # « Acheteur #4821 » — jamais le vrai nom
    city: str
    to_relay: bool
    total_xaf: int              # uniquement la part de CE vendeur
    deadline: str               # « 17/09 vers 14h », vide si pas encore lancee
    late: bool
    items: list = field(default_factory=list)       # [(titre, quantite)]

    @property
    def waiting(self) -> bool:
        return self.status in TO_PREPARE_STATUSES


# ── Qui nous ecrit ─────────────────────────────────────────────────────────

def vendors_with_phone(wa_id: str) -> list[int]:
    """
    Vendeurs dont le numero est ce numero WhatsApp. On regarde le telephone de
    la boutique ET son numero WhatsApp declare, les deux etant saisis a la main.
    """
    from django.db.models import Q

    from apps.vendors.models import VendorProfile

    if len(wa_id) < 9:
        return []
    national = wa_id[-9:]

    def matching(rows):
        return [vendor_id for vendor_id, phone, whatsapp in rows
                if to_wa_id(phone) == wa_id or to_wa_id(whatsapp) == wa_id]

    champs = ("id", "phone", "whatsapp_phone")
    found = matching(VendorProfile.objects.filter(
        Q(phone__endswith=national) | Q(whatsapp_phone__endswith=national)
    ).values_list(*champs))
    if found:
        return found
    # Numeros ecrits avec des espaces ou des tirets : on normalise en Python.
    return matching(VendorProfile.objects.filter(status="APPROVED").values_list(*champs))


def get_vendor(vendor_id: int) -> Vendor | None:
    from apps.vendors.models import VendorProfile

    profile = VendorProfile.objects.select_related("user").filter(pk=vendor_id).first()
    if profile is None:
        return None
    return Vendor(
        id=profile.id,
        user_id=profile.user_id,
        shop=profile.business_name,
        wa_id=to_wa_id(profile.whatsapp_phone) or to_wa_id(profile.phone),
        language="fr",
        can_sell=profile.is_active_vendor,
    )


def vendor_of_user(user_id: int) -> Vendor | None:
    from apps.vendors.models import VendorProfile

    profile = VendorProfile.objects.filter(user_id=user_id).only("id").first()
    return get_vendor(profile.id) if profile else None


def to_wa_id(phone: str) -> str:
    from apps.whatsapp_assistant.bridge.deliveries import to_wa_id as normalise

    return normalise(phone)


# ── Ce que le vendeur doit preparer ────────────────────────────────────────

def _orders_of(vendor_user_ids):
    from apps.orders.models import Order

    return (
        Order.objects.filter(
            items__product__vendor_id__in=list(vendor_user_ids),
            created_at__gte=timezone.now() - timedelta(days=WINDOW_DAYS),
        )
        .distinct()
        .prefetch_related("items__product")
        .order_by("-created_at")
    )


def orders_to_prepare(vendor_user_ids) -> list[VendorOrder]:
    """Commandes payees qui attendent encore un geste du vendeur, la plus urgente d'abord."""
    orders = _orders_of(vendor_user_ids).filter(fulfillment_status__in=TO_PREPARE_STATUSES)[:MAX_ORDERS]
    return sorted(
        (_to_vendor_order(order, vendor_user_ids) for order in orders),
        key=lambda item: (not item.late, item.deadline or "~"),
    )


def get_order(order_id: int, vendor_user_ids) -> VendorOrder | None:
    """Une commande, et seulement si ce vendeur y a bien des articles."""
    order = _orders_of(vendor_user_ids).filter(pk=order_id).first()
    return _to_vendor_order(order, vendor_user_ids) if order else None


def _to_vendor_order(order, vendor_user_ids) -> VendorOrder:
    mine = [item for item in order.items.all()
            if item.product and item.product.vendor_id in set(vendor_user_ids)]
    deadline = getattr(order, "prep_deadline", None)
    return VendorOrder(
        id=order.id,
        reference=f"BVY-{order.id}",
        status=order.fulfillment_status,
        placed_on=timezone.localtime(order.created_at).strftime("%d/%m"),
        buyer=_buyer_label(order),
        city=" · ".join(filter(None, [order.district, order.city])),
        to_relay=bool(order.relay_point_id),
        total_xaf=sum(item.line_total_xaf for item in mine),
        deadline=timezone.localtime(deadline).strftime("%d/%m vers %Hh") if deadline else "",
        late=bool(deadline and deadline < timezone.now()),
        items=[(item.title_snapshot or (item.product.title if item.product else "—"), item.qty)
               for item in mine],
    )


def _buyer_label(order) -> str:
    """« Acheteur #4821 » — la meme regle que le portail vendeur, jamais le vrai nom."""
    empreinte = hashlib.sha256(f"belivay-buyer-{order.id}".encode()).hexdigest()
    return f"#{int(empreinte[:8], 16) % 10000:04d}"


# ── Actions : confirmer, colis pret ────────────────────────────────────────

class ActionResult:
    DONE = "done"
    ALREADY = "already"             # deja a cet etat, ou plus loin
    NOT_YOURS = "not_yours"         # aucun article de ce vendeur dans la commande
    REFUSED = "refused"             # transition interdite par le coeur
    INACTIVE = "inactive"           # boutique non approuvee


def acknowledge(order_id: int, vendor_user_id: int) -> str:
    """« Je confirme » : accuse reception puis passe en preparation, d'un seul geste."""
    return _advance(order_id, vendor_user_id, ["VENDOR_ACKNOWLEDGED", "PREPARING"])


def mark_ready(order_id: int, vendor_user_id: int) -> str:
    """« Colis pret » : la commande attend desormais un livreur."""
    return _advance(order_id, vendor_user_id, ["READY_FOR_PICKUP"])


def _advance(order_id: int, vendor_user_id: int, targets: list[str]) -> str:
    """
    Fait avancer la commande par le serializer du portail vendeur : une seule
    table de transitions decide, celle du coeur (VENDOR_TRANSITIONS).
    """
    from rest_framework.exceptions import ValidationError

    from apps.orders.models import Order
    from apps.vendors.models import VendorProfile
    from apps.vendors.serializers import UpdateFulfillmentStatusSerializer

    profile = VendorProfile.objects.select_related("user").filter(user_id=vendor_user_id).first()
    if profile is None or not profile.is_active_vendor:
        return ActionResult.INACTIVE

    # PostgreSQL refuse FOR UPDATE avec DISTINCT : on verifie l'appartenance
    # d'abord (la jointure sur les articles impose le DISTINCT), puis on verrouille
    # la commande seule.
    if not Order.objects.filter(pk=order_id, items__product__vendor_id=vendor_user_id).exists():
        return ActionResult.NOT_YOURS

    with transaction.atomic():
        order = Order.objects.select_for_update().filter(pk=order_id).first()
        if order is None:
            return ActionResult.NOT_YOURS
        if order.fulfillment_status == targets[-1]:
            return ActionResult.ALREADY
        if order.fulfillment_status not in TO_PREPARE_STATUSES:
            return ActionResult.REFUSED

        for target in targets:
            if order.fulfillment_status == target:
                continue                            # deja franchie
            serializer = UpdateFulfillmentStatusSerializer(
                order, data={"fulfillment_status": target},
                context={"order": order, "vendor": profile.user},
            )
            try:
                serializer.is_valid(raise_exception=True)
                serializer.save()
            except ValidationError as error:
                logger.info("Commande %s : transition %s refusee (%s)", order_id, target, error.detail)
                return ActionResult.REFUSED
    return ActionResult.DONE


# ── Ecoute du paiement ─────────────────────────────────────────────────────

_UNKNOWN = object()


def connect_payment_signal(on_paid, is_enabled) -> None:
    """
    Appelle on_paid(order_id) apres validation en base, quand une commande
    vient d'etre payee — quel que soit le chemin qui l'a fait basculer.
    """
    from apps.orders.models import Order

    def remember_previous_status(sender, instance, raw=False, update_fields=None, **kwargs):
        if raw or not is_enabled():
            return
        if update_fields is not None and "fulfillment_status" not in set(update_fields):
            return
        instance._whatsapp_previous_status = (
            sender.objects.filter(pk=instance.pk).values_list("fulfillment_status", flat=True).first()
            if instance.pk else None
        )

    def notify_paid(sender, instance, raw=False, **kwargs):
        previous = instance.__dict__.pop("_whatsapp_previous_status", _UNKNOWN)
        if raw or previous is _UNKNOWN or previous == PAID_STATUS:
            return
        if instance.fulfillment_status != PAID_STATUS:
            return
        order_id = instance.pk
        transaction.on_commit(lambda: on_paid(order_id))

    pre_save.connect(remember_previous_status, sender=Order, weak=False,
                     dispatch_uid="whatsapp_assistant.remember_previous_status")
    post_save.connect(notify_paid, sender=Order, weak=False,
                      dispatch_uid="whatsapp_assistant.notify_paid")


def vendors_of_order(order_id: int) -> list[int]:
    """Identifiants des utilisateurs vendeurs ayant un article dans cette commande."""
    from apps.orders.models import OrderItem

    return sorted({
        vendor_id for vendor_id in OrderItem.objects
        .filter(order_id=order_id, product__vendor__isnull=False)
        .values_list("product__vendor_id", flat=True)
    })


def mark_paid_for_test(order_id: int) -> None:
    """Fait basculer une commande en « payee », comme le fait le paiement reel."""
    from apps.orders.models import Order

    with transaction.atomic():
        order = Order.objects.get(pk=order_id)
        order.payment_status = Order.PaymentStatus.PAID
        order.escrow_status = Order.EscrowStatus.BLOCKED
        order.fulfillment_status = Order.FulfillmentStatus.PAID_IN_ESCROW
        order.save(update_fields=["payment_status", "escrow_status", "fulfillment_status", "updated_at"])
