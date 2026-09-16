# backend/apps/whatsapp_assistant/bridge/deliveries.py
# Pont vers les livraisons de Belivay : SEUL fichier du module qui lit les
# colis, commandes, boutiques, points relais et livreurs, et qui accepte une
# mission. Confidentialité :
#   - le téléphone du client n'est jamais lu ici ;
#   - les numéros qu'un client aurait tapés dans son adresse ou sa note sont masqués ;
#   - les codes de remise et de réception ne sortent pas (le vendeur les donne en main propre).

import logging
import re
from dataclasses import dataclass
from types import SimpleNamespace

from django.db import transaction
from django.db.models.signals import post_save, pre_save

logger = logging.getLogger("apps.whatsapp_assistant")

ACTIVE_STATUSES = ("ASSIGNED", "PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY")
# Suite de 8 chiffres ou plus, espaces/points/tirets tolérés : un numéro de téléphone.
PHONE_PATTERN = re.compile(r"\+?\d(?:[\s.\-]?\d){7,}")
PHONE_MASK = "[n° masqué]"


@dataclass(frozen=True)
class Place:
    name: str = ""              # boutique / point relais ; vide pour un domicile
    area: str = ""              # « Bastos, Yaoundé » : résumé d'une ligne
    address: str = ""
    landmarks: str = ""         # repères
    hint: str = ""              # indications d'accès
    note: str = ""              # note du client
    hours: str = ""             # horaires du point relais
    phone: str = ""             # boutique ou point relais — jamais le client
    latitude: float | None = None
    longitude: float | None = None

    @property
    def has_pin(self) -> bool:
        return self.latitude is not None and self.longitude is not None

    @property
    def summary(self) -> str:
        return " · ".join(filter(None, [self.name, self.area])) or self.address


@dataclass(frozen=True)
class Mission:
    id: int
    reference: str              # BVY-<commande>-<colis>, comme dans l'application
    status: str                 # ASSIGNED, PICKED_UP…
    accepted: bool
    courier_id: int | None
    tournee_id: int | None
    stop_order: int
    items_count: int
    to_relay: bool
    pickup: Place
    delivery: Place


@dataclass(frozen=True)
class Tour:
    id: int
    zone: str
    slot_date: str              # 16/09
    period: str                 # MORNING / AFTERNOON


@dataclass(frozen=True)
class Courier:
    id: int
    name: str
    wa_id: str                  # 2376XXXXXXXX, vide si son numéro n'est pas valide
    language: str               # fr / en
    can_work: bool              # approuvé et actif


# ── Lecture ────────────────────────────────────────────────────────────────

def _shipments():
    from apps.shipping.models import Shipment
    return Shipment.objects.select_related(
        "order", "order__relay_point", "vendor__vendor_profile", "courier",
    )


def get_mission(shipment_id: int) -> Mission | None:
    shipment = _shipments().filter(pk=shipment_id).first()
    return _to_mission(shipment) if shipment else None


def missions_of_tour(tournee_id: int, courier_ids) -> list[Mission]:
    shipments = _shipments().filter(tournee_id=tournee_id, courier_id__in=list(courier_ids)).order_by("stop_order", "id")
    return [_to_mission(s) for s in shipments]


def active_missions(courier_ids) -> list[Mission]:
    shipments = (
        _shipments().filter(courier_id__in=list(courier_ids), status__in=ACTIVE_STATUSES)
        .order_by("tournee_id", "stop_order", "id")
    )
    return [_to_mission(s) for s in shipments]


def is_last_stop(shipment_id: int) -> bool:
    """Vrai si ce colis est le dernier arrêt de sa tournée pour son livreur."""
    from apps.shipping.models import Shipment
    shipment = Shipment.objects.filter(pk=shipment_id).only("tournee_id", "courier_id", "stop_order").first()
    if not shipment or not shipment.tournee_id:
        return False
    return not Shipment.objects.filter(
        tournee_id=shipment.tournee_id, courier_id=shipment.courier_id, stop_order__gt=shipment.stop_order,
    ).exists()


def get_tour(tournee_id: int) -> Tour | None:
    from apps.shipping.models import Tournee
    tour = Tournee.objects.select_related("zone").filter(pk=tournee_id).first()
    if not tour:
        return None
    return Tour(id=tour.id, zone=tour.zone.name, slot_date=tour.slot_date.strftime("%d/%m"), period=tour.period)


def get_courier(courier_id: int) -> Courier | None:
    from apps.accounts.models import CourierProfile
    courier = CourierProfile.objects.select_related("user").filter(pk=courier_id).first()
    if not courier:
        return None
    return Courier(
        id=courier.id,
        name=courier.user.get_full_name().strip() or courier.user.username,
        wa_id=to_wa_id(courier.phone),
        language="en" if (courier.preferred_language or "").lower().startswith("en") else "fr",
        can_work=courier.is_active and courier.is_approved,
    )


def couriers_with_phone(wa_id: str) -> list[int]:
    """
    Livreurs dont le numéro enregistré est ce numéro WhatsApp.
    Les numéros sont saisis à la main (« +237 6 99 95 53 24 ») : c'est le numéro
    normalisé qui fait foi, jamais la chaîne telle qu'elle est stockée.
    """
    from apps.accounts.models import CourierProfile
    if len(wa_id) < 9:
        return []
    def matching(rows):
        return [courier_id for courier_id, phone in rows if to_wa_id(phone) == wa_id]

    # Cas courant : le numéro est enregistré sans séparateur, la base filtre seule.
    found = matching(CourierProfile.objects.filter(phone__endswith=wa_id[-9:]).values_list("id", "phone"))
    if found:
        return found
    # Sinon il contient des espaces, des points ou des tirets : on normalise en Python.
    return matching(CourierProfile.objects.filter(is_active=True).values_list("id", "phone"))


def to_wa_id(phone: str) -> str:
    """« +237 6 99 95 53 24 » → « 237699955324 » (format WhatsApp), vide si invalide."""
    from apps.common.phone import normalize_cameroon_phone
    normalized = normalize_cameroon_phone(phone or "")
    return normalized["e164"].lstrip("+") if normalized.get("is_valid") else ""


def _to_mission(shipment) -> Mission:
    order = shipment.order
    to_relay = bool(order.relay_point_id or shipment.relay_point)
    return Mission(
        id=shipment.id,
        reference=f"BVY-{shipment.order_id}-{shipment.id}",
        status=shipment.status,
        accepted=shipment.accepted_at is not None,
        courier_id=shipment.courier_id,
        tournee_id=shipment.tournee_id,
        stop_order=shipment.stop_order,
        items_count=sum(shipment.order_items.values_list("qty", flat=True)),
        to_relay=to_relay,
        pickup=_pickup_place(shipment),
        delivery=_relay_place(shipment) if to_relay else _home_place(order),
    )


def _pickup_place(shipment) -> Place:
    vendor_user = shipment.vendor
    if vendor_user is None:                        # anciens colis : le vendeur du premier article
        item = shipment.order_items.select_related("product__vendor").first()
        vendor_user = item.product.vendor if item and item.product else None
    profile = getattr(vendor_user, "vendor_profile", None) if vendor_user else None
    if profile is None:
        return Place(name="—")
    location = profile.locations.filter(is_active=True).order_by("-is_main", "name").first()
    if location is None:
        return Place(name=profile.business_name, area=profile.city, address=profile.address, phone=profile.phone)
    return Place(
        name=f"{profile.business_name} — {location.name}" if location.name else profile.business_name,
        area=profile.city,
        address=location.address,
        landmarks=location.description,
        phone=location.representative_phone or location.phone or profile.phone,
        latitude=_float(location.latitude),
        longitude=_float(location.longitude),
    )


def _relay_place(shipment) -> Place:
    relay = shipment.order.relay_point
    if relay is None:                               # point relais noté en texte seulement
        return Place(name=shipment.relay_point, area=shipment.order.city)
    return Place(
        name=relay.name,
        area=relay.city or shipment.order.city,
        address=relay.address,
        hours=relay.opening_hours,
        phone=relay.phone,
        latitude=_float(relay.latitude),
        longitude=_float(relay.longitude),
    )


def _home_place(order) -> Place:
    precision = order.address_precision if isinstance(order.address_precision, dict) else {}
    landmarks = precision.get("landmarks") or []
    hint = str(precision.get("driverHint") or "").strip()
    if order.address and order.address in hint:     # l'indication par défaut répète l'adresse
        hint = ""
    return Place(
        area=", ".join(filter(None, [order.district, order.city])),
        address=_mask_phones(order.address),
        landmarks=_mask_phones(", ".join(str(item) for item in landmarks if item)),
        hint=_mask_phones(hint),
        note=_mask_phones(order.note or ""),
        latitude=_float(order.delivery_latitude),
        longitude=_float(order.delivery_longitude),
    )


def _mask_phones(text: str) -> str:
    return PHONE_PATTERN.sub(PHONE_MASK, text or "").strip()


def _float(value) -> float | None:
    return float(value) if value is not None else None


# ── Action : accepter une mission ───────────────────────────────────────────

class AcceptResult:
    ACCEPTED = "accepted"
    ALREADY = "already"             # déjà acceptée (depuis l'application ou WhatsApp)
    NOT_YOURS = "not_yours"         # plus attribuée à ce livreur
    UNAVAILABLE = "unavailable"     # plus en attente d'acceptation (ramassée, annulée…)
    INACTIVE = "inactive"           # compte livreur suspendu ou non approuvé


def accept_mission(shipment_id: int, courier_id: int) -> str:
    """
    Même règle que le bouton « Accepter » de l'application : on passe par le
    serializer de l'application, pour qu'un seul code décide.
    """
    from rest_framework.exceptions import PermissionDenied

    from apps.shipping.models import Shipment
    from apps.shipping.serializers import CourierShipmentActionSerializer

    with transaction.atomic():
        shipment = (
            Shipment.objects.select_for_update(of=("self",))
            .select_related("order", "courier__user").filter(pk=shipment_id).first()
        )
        if shipment is None or shipment.courier_id != courier_id:
            return AcceptResult.NOT_YOURS
        if shipment.accepted_at:
            return AcceptResult.ALREADY
        if shipment.status != Shipment.Status.ASSIGNED:
            return AcceptResult.UNAVAILABLE
        serializer = CourierShipmentActionSerializer(
            data={"action": "ACCEPT", "message": "Mission acceptée depuis WhatsApp"},
            context={"shipment": shipment, "request": SimpleNamespace(user=shipment.courier.user)},
        )
        serializer.is_valid(raise_exception=True)
        try:
            serializer.save()
        except PermissionDenied:
            return AcceptResult.INACTIVE
    return AcceptResult.ACCEPTED


# ── Écoute des assignations ────────────────────────────────────────────────

_UNKNOWN = object()


def connect_assignment_signal(on_assigned, is_enabled) -> None:
    """
    Appelle on_assigned(shipment_id, courier_id, assignment_ref) après la
    validation en base de chaque colis qui change de livreur — quel que soit
    le chemin (assignation automatique, tournée, entreprise, admin).
    """
    from apps.shipping.models import Shipment

    def remember_previous_courier(sender, instance, raw=False, update_fields=None, **kwargs):
        if raw or not is_enabled():
            return
        if update_fields is not None and not {"courier", "courier_id"} & set(update_fields):
            return                                      # le livreur ne peut pas changer
        instance._whatsapp_previous_courier = (
            sender.objects.filter(pk=instance.pk).values_list("courier_id", flat=True).first()
            if instance.pk else None
        )

    def notify_new_courier(sender, instance, raw=False, **kwargs):
        previous = instance.__dict__.pop("_whatsapp_previous_courier", _UNKNOWN)
        if raw or previous is _UNKNOWN or not instance.courier_id or instance.courier_id == previous:
            return
        args = (instance.pk, instance.courier_id, instance.updated_at.isoformat() if instance.updated_at else "")
        transaction.on_commit(lambda: on_assigned(*args))

    pre_save.connect(remember_previous_courier, sender=Shipment, weak=False,
                     dispatch_uid="whatsapp_assistant.remember_previous_courier")
    post_save.connect(notify_new_courier, sender=Shipment, weak=False,
                      dispatch_uid="whatsapp_assistant.notify_new_courier")


# ── Outils de test (commande whatsapp_courier_test) ──────────────────────────

def assign_for_test(shipment_id: int, courier_id: int, tournee_zone: str = "") -> None:
    """
    Assigne un colis exactement comme le portail des entreprises de livraison.
    Si le colis est déjà chez ce livreur, il est d'abord libéré : chaque essai
    produit une vraie nouvelle assignation.
    """
    from apps.accounts.models import CourierProfile
    from apps.shipping.models import Shipment

    courier = CourierProfile.objects.select_related("user").get(pk=courier_id)
    with transaction.atomic():
        shipment = Shipment.objects.get(pk=shipment_id)
        if shipment.courier_id == courier.id:
            shipment.courier = None
            shipment.accepted_at = None
            shipment.save(update_fields=["courier", "accepted_at", "updated_at"])
        shipment.courier = courier
        shipment.courier_name = courier.user.get_full_name().strip() or courier.user.username
        shipment.courier_phone = courier.phone
        shipment.status = Shipment.Status.ASSIGNED
        shipment.accepted_at = None
        shipment.save(update_fields=["courier", "courier_name", "courier_phone", "status", "accepted_at", "updated_at"])


def tour_for_test(shipment_ids: list[int], courier_id: int) -> int:
    """Compose une tournée de test avec ces colis, par la fonction de départ réelle."""
    from django.utils import timezone

    from apps.accounts.models import CourierProfile
    from apps.shipping.models import Shipment, Tournee, Zone
    from apps.shipping.tournees import _depart_tournee

    courier = CourierProfile.objects.select_related("user").get(pk=courier_id)
    with transaction.atomic():
        shipments = list(Shipment.objects.select_related("order").filter(pk__in=shipment_ids).order_by("id"))
        for shipment in shipments:                  # libère d'abord : vraie nouvelle assignation
            if shipment.courier_id == courier.id:
                shipment.courier = None
                shipment.accepted_at = None
                shipment.save(update_fields=["courier", "accepted_at", "updated_at"])
        zone = shipments[0].order.zone or Zone.objects.filter(is_active=True).first()
        if zone is None:
            zone = Zone.objects.create(name="Zone de test WhatsApp", city=shipments[0].order.city or "Yaoundé")
        tour = Tournee.objects.create(
            zone=zone, slot_date=timezone.localdate(), period=Tournee.Period.MORNING, courier=courier,
        )
        _depart_tournee(tour, shipments, courier)
    return tour.id
