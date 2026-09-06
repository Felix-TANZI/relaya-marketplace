# backend/apps/shipping/tournees.py
#
# Composeur de tournees — version minimale (Regles_Systeme_DEV v2.0 §5
# "RÈGLE FONDATRICE" + regle verrouillee n°10/n°11 ; Addendum §3 "Seuil de
# tournee : 4 colis (provisoire)", "Créneaux : définis par zone dès le
# début (2 créneaux/zone)").
#
# Principe : les colis a destination d'un point relais partent TOUJOURS en
# groupe, jamais un par un — sauf si c'est la seule commande de la zone
# apres epuisement de 2 creneaux d'attente (sortie forcee, journalisee).
#
# Volontairement sans optimisation d'itineraire, sans redecoupage de lot,
# sans panachage avec la bourse aux courses (toutes explicitement hors
# perimetre de la "version minimale" attendue avant le composeur complet).

from datetime import datetime, timedelta

from django.db import transaction
from django.db.models import Count, Q
from django.utils import timezone

from apps.accounts.models import CourierProfile, TrustScoreProfile
from apps.accounts.trust_score import get_trust_score_profile
from .assignment import ACTIVE_STATUSES, coverage_q, organization_covers
from .models import Shipment, ShipmentEvent, Tournee, Zone

TOURNEE_THRESHOLD = 4  # Addendum §3 : "4 colis (provisoire, à confirmer au test à blanc)"
MAX_SLOTS_WAITED = 2   # règle n°10 : sortie forcée après deux créneaux d'attente

# Cas 3 (gros colis) : "Jamais publié sur la bourse — négociation dirigée
# systématique." — exclus du groupage par tournée.
OVERSIZED_PARCEL_SIZES = {"LARGE", "BULKY"}


def eligible_shipments_for_zone(zone: Zone):
    return (
        Shipment.objects.filter(
            order__zone=zone,
            status=Shipment.Status.CREATED,
            tournee__isnull=True,
            courier__isnull=True,
        )
        .exclude(parcel_size__in=OVERSIZED_PARCEL_SIZES)
        .select_related("order", "order__zone", "vendor")
        .order_by("vendor_id", "created_at")
    )


def _slot_boundaries(zone: Zone, since: datetime, until: datetime):
    """Liste des instants de fin de créneau (matin/après-midi) de `zone` entre `since` et `until`."""
    boundaries = []
    day = timezone.localtime(since).date()
    last_day = timezone.localtime(until).date()
    tz = timezone.get_current_timezone()
    while day <= last_day:
        for _, end in (zone.morning_slot(), zone.afternoon_slot()):
            naive = datetime.combine(day, end)
            boundary = timezone.make_aware(naive, tz) if timezone.is_naive(naive) else naive
            if since < boundary <= until:
                boundaries.append(boundary)
        day += timedelta(days=1)
    return sorted(boundaries)


def slots_waited(zone: Zone, since: datetime, now=None) -> int:
    now = now or timezone.now()
    return len(_slot_boundaries(zone, since, now))


def current_slot(zone: Zone, now=None):
    """(date, Period) du créneau en cours ou du dernier créneau clos, pour dater une Tournée."""
    now = now or timezone.now()
    local = timezone.localtime(now)
    morning_start, morning_end = zone.morning_slot()
    afternoon_start, afternoon_end = zone.afternoon_slot()
    t = local.time()
    if t < morning_end:
        return local.date(), Tournee.Period.MORNING
    if t < afternoon_end:
        return local.date(), Tournee.Period.AFTERNOON
    return local.date(), Tournee.Period.AFTERNOON


def choose_courier_for_zone(zone: Zone, shipments):
    """Un seul livreur pour toute la tournée — il enchaîne les arrêts (cas 4)."""
    city = (zone.city or "").strip()
    covered_orgs = organization_covers(city)
    if not covered_orgs.exists():
        return None

    max_value = max((s.order.total_xaf or 0) for s in shipments)

    org_ids = []
    for org in covered_orgs.annotate(
        active_shipments_count=Count(
            "couriers__shipments",
            filter=Q(couriers__shipments__status__in=ACTIVE_STATUSES),
        )
    ):
        if org.max_active_shipments and org.active_shipments_count >= org.max_active_shipments:
            continue
        org_ids.append(org.id)
    if not org_ids:
        return None

    couriers = (
        CourierProfile.objects.filter(
            is_active=True,
            is_approved=True,
            is_online=True,
            delivery_organization_id__in=org_ids,
        )
        .filter(coverage_q(city))
        .annotate(active_shipments_count=Count("shipments", filter=Q(shipments__status__in=ACTIVE_STATUSES)))
        .select_related("user", "delivery_organization")
    )

    available = [
        c for c in couriers
        if not c.max_active_shipments or c.active_shipments_count < c.max_active_shipments
    ]
    if not available:
        return None

    eligible = []
    throttled_ids = set()
    for courier in available:
        trust = get_trust_score_profile(courier.user, TrustScoreProfile.Role.COURIER)
        cap = trust.parcel_value_cap_xaf
        if cap is None and not courier.delivery_organization.transport_insurance_verified:
            cap = 250000
        if cap is None or max_value <= cap:
            eligible.append(courier)
        if trust.is_throttled:
            throttled_ids.add(courier.id)
    if not eligible:
        return None

    eligible.sort(key=lambda c: (c.id in throttled_ids, c.active_shipments_count, c.updated_at))
    return eligible[0]


def _depart_tournee(tournee: Tournee, shipments, courier):
    for index, shipment in enumerate(shipments):
        shipment.tournee = tournee
        shipment.stop_order = index
        shipment.courier = courier
        shipment.courier_name = courier.user.get_full_name().strip() or courier.user.username
        shipment.courier_phone = courier.phone
        shipment.status = Shipment.Status.ASSIGNED
        shipment.save(update_fields=[
            "tournee", "stop_order", "courier", "courier_name", "courier_phone", "status", "updated_at",
        ])
        shipment.order.assign_driver()
        ShipmentEvent.objects.create(
            shipment=shipment,
            status=Shipment.Status.ASSIGNED,
            message=(
                f"Groupé dans une tournée {tournee.zone.name} "
                f"({len(shipments)} colis, arrêt {index + 1}/{len(shipments)})."
            ),
            location=tournee.zone.city,
        )
    tournee.colis_count = len(shipments)
    tournee.status = Tournee.Status.DEPARTED
    tournee.departed_at = timezone.now()
    tournee.save(update_fields=[
        "colis_count", "status", "departed_at", "courier", "claimed_by_organization", "claimed_at",
    ])


def compose_tournees_for_zone(zone: Zone, now=None) -> Tournee | None:
    """
    Applique la règle fondatrice pour une zone : compose une tournée si le
    seuil est atteint, ou force la sortie après deux créneaux d'attente.
    Ne fait rien tant que ni l'un ni l'autre n'est vrai — les colis
    attendent le créneau suivant (§5.2).
    """
    now = now or timezone.now()
    shipments = list(eligible_shipments_for_zone(zone))
    if not shipments:
        return None

    max_wait = max(slots_waited(zone, s.created_at, now) for s in shipments)
    should_compose = len(shipments) >= TOURNEE_THRESHOLD
    forced_exit = not should_compose and max_wait >= MAX_SLOTS_WAITED
    if not should_compose and not forced_exit:
        return None

    courier = choose_courier_for_zone(zone, shipments)
    slot_date, period = current_slot(zone, now)
    tournee = Tournee.objects.create(
        zone=zone, slot_date=slot_date, period=period, courier=courier,
        is_forced_exit=forced_exit,
    )

    if courier is None:
        if forced_exit:
            # Sortie forcee : l'urgence prime sur la bourse, chaque colis
            # retombe immediatement sur l'affectation individuelle existante
            # plutôt que d'attendre qu'une entreprise vienne le reclamer.
            from .assignment import assign_shipment_or_mark_blocked

            tournee.status = Tournee.Status.COMPLETED
            tournee.colis_count = 0
            tournee.save(update_fields=["status", "colis_count"])
            for shipment in shipments:
                assign_shipment_or_mark_blocked(shipment)
            return tournee

        # Seuil atteint mais aucun livreur individuellement eligible
        # (couverture, capacite ou plafond Trust Score) : publiee sur la
        # bourse aux courses — "premier arrivé premier servi" entre les
        # entreprises de livraison couvrant la zone (V1.1).
        tournee.status = Tournee.Status.PUBLISHED
        tournee.colis_count = len(shipments)
        tournee.save(update_fields=["status", "colis_count"])
        for shipment in shipments:
            shipment.tournee = tournee
            shipment.save(update_fields=["tournee", "updated_at"])
        return tournee

    _depart_tournee(tournee, shipments, courier)
    return tournee


def compose_all_tournees(now=None) -> list[Tournee]:
    now = now or timezone.now()
    results = []
    for zone in Zone.objects.filter(is_active=True):
        tournee = compose_tournees_for_zone(zone, now=now)
        if tournee is not None:
            results.append(tournee)
    return results


def bourse_tournees_for_organization(organization):
    """Paquets publiés que cette entreprise de livraison peut voir et revendiquer."""
    if not organization.is_active or organization.status != organization.Status.APPROVED:
        return Tournee.objects.none()
    return Tournee.objects.filter(
        status=Tournee.Status.PUBLISHED,
    ).filter(
        Q(zone__city__iexact=(organization.city or "").strip())
        | Q(zone__name__in=organization.zones or [])
    ).select_related("zone").distinct()


@transaction.atomic
def claim_tournee_for_organization(tournee_id: int, organization):
    """
    Bourse aux courses (V1.1) — "premier arrivé premier servi" : la première
    entreprise à revendiquer un paquet publié l'obtient ; toute tentative
    suivante échoue proprement (le paquet n'est plus PUBLISHED).

    Retourne (tournee, erreur) — tournee est None si erreur est renseignée.
    """
    tournee = (
        Tournee.objects.select_for_update()
        .filter(id=tournee_id, status=Tournee.Status.PUBLISHED)
        .select_related("zone")
        .first()
    )
    if tournee is None:
        return None, "Ce paquet n'est plus disponible sur la bourse."

    if not organization_covers(tournee.zone.city).filter(id=organization.id).exists():
        return None, "Votre entreprise ne couvre pas la zone de ce paquet."

    shipments = list(tournee.shipments.select_related("order").all())
    if not shipments:
        return None, "Ce paquet ne contient plus de colis à livrer."

    max_value = max((s.order.total_xaf or 0) for s in shipments)
    couriers = CourierProfile.objects.filter(
        delivery_organization=organization, is_active=True, is_approved=True, is_online=True,
    ).annotate(active_shipments_count=Count("shipments", filter=Q(shipments__status__in=ACTIVE_STATUSES)))

    eligible = []
    throttled_ids = set()
    for courier in couriers:
        if courier.max_active_shipments and courier.active_shipments_count >= courier.max_active_shipments:
            continue
        trust = get_trust_score_profile(courier.user, TrustScoreProfile.Role.COURIER)
        cap = trust.parcel_value_cap_xaf
        if cap is None and not organization.transport_insurance_verified:
            cap = 250000
        if cap is None or max_value <= cap:
            eligible.append(courier)
        if trust.is_throttled:
            throttled_ids.add(courier.id)
    if not eligible:
        return None, "Aucun livreur disponible dans votre entreprise pour couvrir ce paquet."

    eligible.sort(key=lambda c: (c.id in throttled_ids, c.active_shipments_count, c.updated_at))
    courier = eligible[0]
    tournee.courier = courier
    tournee.claimed_by_organization = organization
    tournee.claimed_at = timezone.now()
    _depart_tournee(tournee, shipments, courier)
    return tournee, None
