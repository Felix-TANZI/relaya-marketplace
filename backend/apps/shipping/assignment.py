import unicodedata

from django.db.models import Count, Q

from apps.accounts.models import CourierProfile, DeliveryOrganizationProfile
from apps.orders.models import Order
from .models import Shipment, ShipmentEvent


ACTIVE_STATUSES = [
    Shipment.Status.ASSIGNED,
    Shipment.Status.PICKED_UP,
    Shipment.Status.IN_TRANSIT,
    Shipment.Status.OUT_FOR_DELIVERY,
]


def city_variants(value):
    raw = (value or "").strip()
    if not raw:
        return []
    normalized = unicodedata.normalize("NFKD", raw)
    ascii_city = "".join(ch for ch in normalized if not unicodedata.combining(ch))
    compact = ascii_city.replace(" ", "").replace("-", "").replace("_", "").upper()
    variants = {raw, ascii_city, raw.upper(), ascii_city.upper(), compact}
    aliases = {
        "YAOUNDE": {"YAOUNDE", "Yaounde", "Yaoundé", "yaounde", "yaoundé"},
        "DOUALA": {"DOUALA", "Douala", "douala"},
    }
    variants.update(aliases.get(compact, set()))
    return [variant for variant in variants if variant]


def coverage_q(city):
    query = Q()
    for variant in city_variants(city):
        query |= Q(city__iexact=variant) | Q(zones__icontains=variant)
    return query


def organization_covers(city):
    query = coverage_q(city)
    if not query:
        return DeliveryOrganizationProfile.objects.none()
    return DeliveryOrganizationProfile.objects.filter(
        is_active=True,
        status=DeliveryOrganizationProfile.Status.APPROVED,
    ).filter(query)


def choose_courier_for_order(order: Order, required_vehicle_type=""):
    city = (order.city or "").strip()
    covered_orgs = organization_covers(city)
    if not covered_orgs.exists():
        return None, "ZONE_UNCOVERED", "Aucune organisation de livraison approuvee ne couvre cette zone."

    required_vehicle = (required_vehicle_type or "").strip().upper()
    org_ids = []
    for org in covered_orgs.annotate(
        active_shipments_count=Count(
            "couriers__shipments",
            filter=Q(couriers__shipments__status__in=ACTIVE_STATUSES),
        )
    ):
        allowed = [str(item).upper() for item in (org.allowed_vehicle_types or []) if item]
        if required_vehicle and allowed and required_vehicle not in allowed:
            continue
        if org.max_active_shipments and org.active_shipments_count >= org.max_active_shipments:
            continue
        org_ids.append(org.id)

    if not org_ids:
        return None, "CAPACITY_BLOCKED", "Les organisations couvrant cette zone sont indisponibles, pleines ou incompatibles."

    courier_q = coverage_q(city)
    couriers = (
        CourierProfile.objects.filter(
            is_active=True,
            is_approved=True,
            is_online=True,
            delivery_organization_id__in=org_ids,
        )
        .filter(courier_q)
        .exclude(user=order.user)
        .annotate(active_shipments_count=Count("shipments", filter=Q(shipments__status__in=ACTIVE_STATUSES)))
        .select_related("user", "delivery_organization")
    )
    if required_vehicle:
        couriers = couriers.filter(vehicle_type=required_vehicle)
    if not couriers.exists() and required_vehicle:
        return None, "VEHICLE_INCOMPATIBLE", "Aucun livreur disponible avec le moyen de transport requis."

    available = [
        courier
        for courier in couriers
        if not courier.max_active_shipments or courier.active_shipments_count < courier.max_active_shipments
    ]
    if not available:
        return None, "CAPACITY_BLOCKED", "Tous les livreurs couvrant cette zone ont atteint leur capacite active."

    available.sort(key=lambda item: (item.active_shipments_count, item.updated_at))
    return available[0], "", ""


def assign_shipment_or_mark_blocked(shipment: Shipment, required_vehicle_type=""):
    order = shipment.order
    courier, issue_code, issue_message = choose_courier_for_order(order, required_vehicle_type=required_vehicle_type)
    if courier:
        shipment.courier = courier
        shipment.courier_name = courier.user.get_full_name().strip() or courier.user.username
        shipment.courier_phone = courier.phone
        shipment.required_vehicle_type = required_vehicle_type or shipment.required_vehicle_type
        shipment.status = Shipment.Status.ASSIGNED
        shipment.assignment_issue_code = ""
        shipment.assignment_issue_message = ""
        shipment.save(
            update_fields=[
                "courier",
                "courier_name",
                "courier_phone",
                "required_vehicle_type",
                "status",
                "assignment_issue_code",
                "assignment_issue_message",
                "updated_at",
            ]
        )
        order.assign_driver()
        ShipmentEvent.objects.create(
            shipment=shipment,
            status=Shipment.Status.ASSIGNED,
            message="Livraison assignee automatiquement au livreur partenaire disponible",
            location=order.city,
        )
        return shipment

    status_by_issue = {
        "ZONE_UNCOVERED": Shipment.Status.ZONE_UNCOVERED,
        "CAPACITY_BLOCKED": Shipment.Status.CAPACITY_BLOCKED,
        "VEHICLE_INCOMPATIBLE": Shipment.Status.VEHICLE_INCOMPATIBLE,
    }
    shipment.status = status_by_issue.get(issue_code, Shipment.Status.WAITING_MANUAL_ASSIGNMENT)
    shipment.assignment_issue_code = issue_code or "WAITING_MANUAL_ASSIGNMENT"
    shipment.assignment_issue_message = issue_message or "Commande en attente d'affectation manuelle."
    shipment.required_vehicle_type = required_vehicle_type or shipment.required_vehicle_type
    shipment.save(
        update_fields=[
            "status",
            "assignment_issue_code",
            "assignment_issue_message",
            "required_vehicle_type",
            "updated_at",
        ]
    )
    ShipmentEvent.objects.create(
        shipment=shipment,
        status=shipment.status,
        message=shipment.assignment_issue_message,
        location=order.city,
    )
    return shipment
