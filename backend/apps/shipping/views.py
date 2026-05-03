from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from drf_spectacular.utils import extend_schema, OpenApiParameter
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db.models import Count
from datetime import timedelta
import unicodedata

from .serializers import (
    CourierDisputeSerializer,
    CourierDashboardSerializer,
    CourierNetworkSerializer,
    CourierSettingsSerializer,
    CourierSOSAlertSerializer,
    CourierSOSCreateSerializer,
    CourierShipmentScanSerializer,
    CourierShipmentActionSerializer,
    ShipmentMessageCreateSerializer,
    ShipmentMessageSerializer,
    ShipmentSerializer,
    ShipmentCreateSerializer,
    ShipmentEventSerializer,
    ShipmentEventCreateSerializer,
)
from .models import CourierSOSAlert, Shipment, ShipmentEvent, ShipmentMessage
from apps.accounts.models import CourierProfile
from apps.accounts.models import UserNotification
from apps.vendors.models import VendorLocation, VendorProfile
from apps.orders.models import Dispute, Order


def _city_variants(value):
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


@extend_schema(
    tags=["Shipping"],
    summary="Créer/assigner un shipment à une commande (V1)",
    request=ShipmentCreateSerializer,
    responses={201: ShipmentSerializer},
)
class ShipmentCreateView(generics.CreateAPIView):
    serializer_class = ShipmentCreateSerializer
    permission_classes = [IsAuthenticated]

    def create(self, request, *args, **kwargs):
        s = self.get_serializer(data=request.data)
        s.is_valid(raise_exception=True)
        shipment = s.save()
        return Response(ShipmentSerializer(shipment).data, status=status.HTTP_201_CREATED)


@extend_schema(
    tags=["Shipping"],
    summary="Ajouter un event de tracking à une commande (V1)",
    request=ShipmentEventCreateSerializer,
    responses={201: ShipmentEventSerializer},
)
class ShipmentEventCreateView(generics.CreateAPIView):
    serializer_class = ShipmentEventCreateSerializer
    permission_classes = [IsAuthenticated]

    def create(self, request, *args, **kwargs):
        s = self.get_serializer(data=request.data)
        s.is_valid(raise_exception=True)
        event = s.save()
        return Response(ShipmentEventSerializer(event).data, status=status.HTTP_201_CREATED)


@extend_schema(
    tags=["Shipping"],
    summary="Tracking client (timeline) d'une commande",
    parameters=[OpenApiParameter(name="order_id", required=True, type=int, location=OpenApiParameter.QUERY)],
    responses={200: ShipmentSerializer},
)
class ShipmentTrackView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        order_id = request.query_params.get("order_id")
        if not order_id:
            return Response({"detail": "order_id is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            shipment = Shipment.objects.get(order_id=order_id)
        except Shipment.DoesNotExist:
            return Response({"detail": "No shipment found for this order"}, status=status.HTTP_404_NOT_FOUND)

        return Response(ShipmentSerializer(shipment).data, status=status.HTTP_200_OK)


@extend_schema(tags=["Shipping"], summary="Mes livraisons assignees (livreur)")
class CourierMyShipmentsView(generics.ListAPIView):
    serializer_class = ShipmentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        courier = getattr(self.request.user, "courier_profile", None)
        if not courier or not courier.is_approved or not courier.is_active:
            raise PermissionDenied("Courier account is not approved")
        return Shipment.objects.filter(courier=courier).select_related("order", "courier", "courier__user")


@extend_schema(tags=["Shipping"], summary="Detail d'une livraison assignee (livreur)")
class CourierShipmentDetailView(generics.RetrieveAPIView):
    serializer_class = ShipmentSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = "id"

    def get_queryset(self):
        courier = getattr(self.request.user, "courier_profile", None)
        if not courier or not courier.is_approved or not courier.is_active:
            raise PermissionDenied("Courier account is not approved")
        return Shipment.objects.filter(courier=courier).select_related("order", "courier", "courier__user")


@extend_schema(
    tags=["Shipping"],
    summary="Action livreur sur une livraison assignee",
    request=CourierShipmentActionSerializer,
    responses={200: ShipmentSerializer},
)
class CourierShipmentActionView(generics.GenericAPIView):
    serializer_class = CourierShipmentActionSerializer
    permission_classes = [IsAuthenticated]

    def post(self, request, id):
        courier = getattr(request.user, "courier_profile", None)
        if not courier or not courier.is_approved or not courier.is_active:
            raise PermissionDenied("Courier account is not approved")

        shipment = get_object_or_404(
            Shipment.objects.select_related("order", "courier", "courier__user"),
            id=id,
            courier=courier,
        )
        serializer = self.get_serializer(
            data=request.data,
            context={"shipment": shipment, "request": request},
        )
        serializer.is_valid(raise_exception=True)
        shipment = serializer.save()
        return Response(ShipmentSerializer(shipment).data, status=status.HTTP_200_OK)


def _get_active_courier(user):
    courier = getattr(user, "courier_profile", None)
    if not courier or not courier.is_approved or not courier.is_active:
        raise PermissionDenied("Courier account is not approved")
    if not courier.is_online:
        courier.is_online = True
        courier.save(update_fields=["is_online", "updated_at"])
    return courier


def _resolve_scan_target(code: str, courier) -> Shipment:
    raw = code.strip().upper()
    if not raw:
        raise PermissionDenied("Scan code is empty")

    shipment_qs = Shipment.objects.filter(courier=courier).select_related("order", "courier", "courier__user")

    try:
        if raw.startswith("SHIP-"):
            shipment_id = raw.replace("SHIP-", "", 1)
            return get_object_or_404(shipment_qs, id=int(shipment_id))

        if raw.startswith("BLV-"):
            order_id = raw.replace("BLV-", "", 1)
            return get_object_or_404(shipment_qs, order_id=int(order_id))

        if raw.isdigit():
            return shipment_qs.filter(id=int(raw)).first() or get_object_or_404(shipment_qs, order_id=int(raw))
    except ValueError as exc:
        raise PermissionDenied("Unsupported scan code format") from exc

    raise PermissionDenied("Unsupported scan code format")


def _courier_payout_xaf(shipment: Shipment) -> int:
    return round((shipment.order.total_xaf or 0) * 0.08)


def _estimate_shipment_distance_km(shipment: Shipment) -> float:
    order = shipment.order
    city = (order.city or "").upper()
    address_seed = f"{order.address or ''}|{shipment.relay_point or ''}|{order.id}"
    address_score = sum(ord(ch) for ch in address_seed) % 36
    city_base = 5.2 if "YAOUNDE" in city else 6.4 if "DOUALA" in city else 4.8
    status_extra = {
        Shipment.Status.CREATED: 0.0,
        Shipment.Status.ASSIGNED: 0.8,
        Shipment.Status.PICKED_UP: 1.8,
        Shipment.Status.OUT_FOR_DELIVERY: 3.0,
        Shipment.Status.DELIVERED: 0.0,
        Shipment.Status.FAILED: 0.0,
        Shipment.Status.CANCELLED: 0.0,
    }.get(shipment.status, 0.0)
    return round(city_base + (address_score / 10) + status_extra, 1)


def _shipment_delivery_minutes(shipment: Shipment) -> int:
    picked_up_event = next((event for event in shipment.events.all() if event.status == Shipment.Status.PICKED_UP), None)
    delivered_event = next((event for event in shipment.events.all() if event.status == Shipment.Status.DELIVERED), None)

    start_dt = picked_up_event.created_at if picked_up_event else shipment.created_at
    end_dt = delivered_event.created_at if delivered_event else shipment.updated_at
    return max(1, round((end_dt - start_dt).total_seconds() / 60))


def _traffic_label(now):
    hour = now.hour
    if 7 <= hour <= 9 or 16 <= hour <= 19:
        return "Dense"
    if 10 <= hour <= 15:
        return "Fluide"
    return "Modere"


def _weather_label(now):
    rainy_months = {3, 4, 5, 6, 7, 8, 9, 10}
    if now.month in rainy_months:
        return "26°C, pluie legere"
    return "29°C, sec"


def _leaderboard_tone(score: int) -> str:
    if score >= 97:
        return "text-emerald-300"
    if score >= 92:
        return "text-orange-300"
    return "text-sky-300"


def _leaderboard_badge(score: int) -> str:
    if score >= 97:
        return "Elite"
    if score >= 92:
        return "Top"
    return "Stable"


def _month_week_label(day: int) -> str:
    if day <= 7:
        return "S1"
    if day <= 14:
        return "S2"
    if day <= 21:
        return "S3"
    return "S4"


@extend_schema(tags=["Shipping"], summary="Dashboard livreur")
class CourierDashboardView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = CourierDashboardSerializer

    def get(self, request, *args, **kwargs):
        courier = _get_active_courier(request.user)

        now = timezone.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        shipments = list(
            Shipment.objects.filter(courier=courier)
            .select_related("order", "courier", "courier__user")
            .prefetch_related("events")
            .order_by("-updated_at")
        )

        active_shipments = [shipment for shipment in shipments if shipment.status in [Shipment.Status.ASSIGNED, Shipment.Status.PICKED_UP, Shipment.Status.OUT_FOR_DELIVERY]]
        delivered_shipments = [shipment for shipment in shipments if shipment.status == Shipment.Status.DELIVERED]
        failed_shipments = [shipment for shipment in shipments if shipment.status == Shipment.Status.FAILED]

        today_delivered = [shipment for shipment in delivered_shipments if shipment.updated_at >= today_start]
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        month_delivered = [shipment for shipment in delivered_shipments if shipment.updated_at >= month_start]
        today_earnings = sum(_courier_payout_xaf(shipment) for shipment in today_delivered)
        month_earnings = sum(_courier_payout_xaf(shipment) for shipment in month_delivered)
        average_payout = round(sum(_courier_payout_xaf(shipment) for shipment in delivered_shipments) / len(delivered_shipments)) if delivered_shipments else 0
        monthly_target = max(75000, average_payout * 25 if average_payout else 75000)
        monthly_goal_percent = min(100, round((month_earnings / monthly_target) * 100)) if monthly_target else 0

        if courier.is_online:
            anchor_dt = min((shipment.updated_at for shipment in active_shipments), default=now)
            online_minutes = max(1, round((now - anchor_dt).total_seconds() / 60))
        else:
            online_minutes = 0

        average_delivery_minutes = round(
            sum(_shipment_delivery_minutes(shipment) for shipment in delivered_shipments) / len(delivered_shipments)
        ) if delivered_shipments else 0

        completed_count = len(delivered_shipments) + len(failed_shipments)
        performance_percent = round((len(delivered_shipments) / completed_count) * 100) if completed_count else 100

        distance_km = round(
            sum(_estimate_shipment_distance_km(shipment) for shipment in [*today_delivered, *active_shipments]),
            1,
        )

        approved_couriers = CourierProfile.objects.filter(is_approved=True, is_active=True).select_related("user")
        leaderboard = []
        for profile in approved_couriers:
            courier_shipments = list(
                Shipment.objects.filter(courier=profile)
                .select_related("order", "courier", "courier__user")
            )
            courier_delivered = [shipment for shipment in courier_shipments if shipment.status == Shipment.Status.DELIVERED]
            courier_failed = [shipment for shipment in courier_shipments if shipment.status == Shipment.Status.FAILED]
            total_completed = len(courier_delivered) + len(courier_failed)
            score = round((len(courier_delivered) / total_completed) * 100) if total_completed else 0
            leaderboard.append(
                {
                    "name": profile.user.get_full_name().strip() or profile.user.username,
                    "score": f"{score}%",
                    "badge": _leaderboard_badge(score),
                    "tone": _leaderboard_tone(score),
                    "_sort_score": score,
                    "_sort_volume": len(courier_delivered),
                }
            )

        leaderboard = sorted(
            leaderboard,
            key=lambda item: (item["_sort_score"], item["_sort_volume"]),
            reverse=True,
        )[:3]
        for item in leaderboard:
            item.pop("_sort_score", None)
            item.pop("_sort_volume", None)

        zone_heatmap = []
        courier_zones = courier.zones or [courier.city]
        recent_shipments = [shipment for shipment in shipments if shipment.created_at >= now - timedelta(days=30)]
        zone_counts = []
        for zone in courier_zones:
            count = sum(
                1
                for shipment in recent_shipments
                if zone.lower() in (shipment.order.address or "").lower()
                or zone.lower() in (shipment.order.city or "").lower()
            )
            zone_counts.append((zone, count))

        max_count = max((count for _, count in zone_counts), default=0)
        for zone, count in zone_counts:
            percent = round((count / max_count) * 100) if max_count else 0
            zone_heatmap.append(
                {
                    "zone": zone,
                    "demand_percent": percent,
                    "hint": "Demande observee sur les 30 derniers jours",
                }
            )

        weekly_buckets = {
            "S1": {"label": "S1", "earnings_xaf": 0, "deliveries": 0, "percent": 0},
            "S2": {"label": "S2", "earnings_xaf": 0, "deliveries": 0, "percent": 0},
            "S3": {"label": "S3", "earnings_xaf": 0, "deliveries": 0, "percent": 0},
            "S4": {"label": "S4", "earnings_xaf": 0, "deliveries": 0, "percent": 0},
        }
        weekly_target = max(1, round(monthly_target / 4))
        for shipment in month_delivered:
            label = _month_week_label(shipment.updated_at.day)
            weekly_buckets[label]["earnings_xaf"] += _courier_payout_xaf(shipment)
            weekly_buckets[label]["deliveries"] += 1

        weekly_progress = []
        for label in ["S1", "S2", "S3", "S4"]:
            bucket = weekly_buckets[label]
            bucket["percent"] = min(100, round((bucket["earnings_xaf"] / weekly_target) * 100)) if weekly_target else 0
            weekly_progress.append(bucket)

        recommended_departure_dt = (now + timedelta(minutes=12)).replace(second=0, microsecond=0)
        data = {
            "active_shipments": len(active_shipments),
            "delivered_shipments": len(delivered_shipments),
            "today_earnings_xaf": today_earnings,
            "month_earnings_xaf": month_earnings,
            "monthly_target_xaf": monthly_target,
            "monthly_goal_percent": monthly_goal_percent,
            "average_payout_xaf": average_payout,
            "online_minutes": online_minutes,
            "status_label": "En ligne" if courier.is_online else "Hors ligne",
            "distance_km": distance_km,
            "average_delivery_minutes": average_delivery_minutes,
            "performance_percent": performance_percent,
            "recommended_departure": recommended_departure_dt.strftime("%H:%M"),
            "traffic_label": _traffic_label(now),
            "weather_label": _weather_label(now),
            "leaderboard": leaderboard,
            "zone_heatmap": zone_heatmap,
            "weekly_progress": weekly_progress,
        }
        return Response(CourierDashboardSerializer(data).data, status=status.HTTP_200_OK)


@extend_schema(tags=["Shipping"], summary="Reseau boutiques et points relais pour livreur")
class CourierNetworkView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = CourierNetworkSerializer

    def get(self, request, *args, **kwargs):
        _get_active_courier(request.user)

        approved_vendors = list(
            VendorProfile.objects.filter(status=VendorProfile.Status.APPROVED)
            .select_related("user")
            .order_by("business_name")
        )
        vendor_locations = list(
            VendorLocation.objects.filter(vendor__status=VendorProfile.Status.APPROVED, is_active=True)
            .select_related("vendor", "vendor__user")
            .order_by("vendor__business_name", "name")
        )

        shops = []
        vendors_with_locations = set()
        for location in vendor_locations:
            vendors_with_locations.add(location.vendor_id)
            shops.append(
                {
                    "vendor_id": location.vendor_id,
                    "vendor_name": location.vendor.business_name,
                    "shop_slug": location.vendor.shop_slug or "",
                    "city": location.vendor.city or "",
                    "address": location.address or "",
                    "phone": location.phone or location.vendor.phone or "",
                    "is_online": bool(location.vendor.is_online),
                    "location_name": location.name or "",
                    "representative_name": location.representative_name or "",
                    "representative_phone": location.representative_phone or "",
                    "latitude": float(location.latitude) if location.latitude is not None else None,
                    "longitude": float(location.longitude) if location.longitude is not None else None,
                }
            )

        for vendor in approved_vendors:
            if vendor.id in vendors_with_locations:
                continue
            shops.append(
                {
                    "vendor_id": vendor.id,
                    "vendor_name": vendor.business_name,
                    "shop_slug": vendor.shop_slug or "",
                    "city": vendor.city or "",
                    "address": vendor.address or "",
                    "phone": vendor.phone or "",
                    "is_online": bool(vendor.is_online),
                    "location_name": "",
                    "representative_name": "",
                    "representative_phone": "",
                    "latitude": None,
                    "longitude": None,
                }
            )

        relay_points = [
            {
                "name": item["relay_point"],
                "city": item["order__city"] or "",
                "address": item["relay_point"],
                "shipments_count": item["shipments_count"],
            }
            for item in Shipment.objects.exclude(relay_point="")
            .values("relay_point", "order__city")
            .annotate(shipments_count=Count("id"))
            .order_by("-shipments_count", "relay_point")
        ]

        data = {
            "shops": shops,
            "relay_points": relay_points,
        }
        return Response(CourierNetworkSerializer(data).data, status=status.HTTP_200_OK)


@extend_schema(tags=["Shipping"], summary="Litiges lies aux commandes du livreur")
class CourierDisputeListView(generics.ListAPIView):
    serializer_class = CourierDisputeSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        courier = _get_active_courier(self.request.user)
        return (
            Dispute.objects.filter(order__shipment__courier=courier)
            .select_related("order", "opened_by")
            .order_by("-updated_at")
            .distinct()
        )


@extend_schema(tags=["Shipping"], summary="Messages d'une livraison pour le livreur")
class CourierShipmentMessageListCreateView(generics.GenericAPIView):
    serializer_class = ShipmentMessageCreateSerializer
    permission_classes = [IsAuthenticated]

    def get_shipment(self):
        courier = _get_active_courier(self.request.user)
        return get_object_or_404(
            Shipment.objects.select_related("order", "courier", "courier__user"),
            id=self.kwargs["id"],
            courier=courier,
        )

    def get(self, request, id):
        shipment = self.get_shipment()
        channel = request.query_params.get("channel")
        messages = shipment.messages.all()
        if channel:
            messages = messages.filter(channel=channel.upper())
        return Response(ShipmentMessageSerializer(messages, many=True).data, status=status.HTTP_200_OK)

    def post(self, request, id):
        shipment = self.get_shipment()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        message = ShipmentMessage.objects.create(
            shipment=shipment,
            sender=request.user,
            channel=serializer.validated_data["channel"],
            sender_role=ShipmentMessage.SenderRole.COURIER,
            message=serializer.validated_data["message"],
        )
        ShipmentEvent.objects.create(
            shipment=shipment,
            status=shipment.status,
            message=f"Message {message.channel.lower()} envoye par le livreur",
            location=shipment.order.city,
        )
        return Response(ShipmentMessageSerializer(message).data, status=status.HTTP_201_CREATED)


@extend_schema(tags=["Shipping"], summary="Scanner QR de test pour une livraison")
class CourierShipmentScanView(generics.GenericAPIView):
    serializer_class = CourierShipmentScanSerializer
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        courier = _get_active_courier(request.user)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        shipment = _resolve_scan_target(serializer.validated_data["code"], courier)
        action = serializer.validated_data["action"]
        order = shipment.order

        if action == "PICKED_UP":
            shipment.status = Shipment.Status.PICKED_UP
            order.mark_picked_up()
            event_message = "Colis scanne et pris en charge"
        elif action == "OUT_FOR_DELIVERY":
            shipment.status = Shipment.Status.OUT_FOR_DELIVERY
            order.mark_out_for_delivery()
            event_message = "Colis scanne et mis en livraison"
        else:
            shipment.status = Shipment.Status.DELIVERED
            order.mark_delivered()
            event_message = "Colis scanne et livre"

        shipment.save(update_fields=["status", "updated_at"])
        ShipmentEvent.objects.create(
            shipment=shipment,
            status=shipment.status,
            message=event_message,
            location=order.city,
        )
        ShipmentMessage.objects.create(
            shipment=shipment,
            sender=request.user,
            channel=ShipmentMessage.Channel.SUPPORT,
            sender_role=ShipmentMessage.SenderRole.SYSTEM,
            message=f"Scan test effectue: {event_message}.",
        )
        return Response(ShipmentSerializer(shipment).data, status=status.HTTP_200_OK)


@extend_schema(tags=["Shipping"], summary="Parametres livreur")
class CourierSettingsView(generics.GenericAPIView):
    serializer_class = CourierSettingsSerializer
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        courier = _get_active_courier(request.user)
        return Response(CourierSettingsSerializer(courier).data, status=status.HTTP_200_OK)

    def patch(self, request, *args, **kwargs):
        courier = _get_active_courier(request.user)
        serializer = self.get_serializer(courier, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        courier = serializer.save()

        UserNotification.objects.create(
            user=request.user,
            title="Parametres livreur mis a jour",
            message="Tes reglages livreur ont ete synchronises avec le backend.",
            notification_type=UserNotification.NotificationType.SYSTEM,
            action_url="/courier",
        )
        return Response(CourierSettingsSerializer(courier).data, status=status.HTTP_200_OK)


@extend_schema(tags=["Shipping"], summary="Declencher une alerte SOS livreur")
class CourierSOSAlertView(generics.GenericAPIView):
    serializer_class = CourierSOSCreateSerializer
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        courier = _get_active_courier(request.user)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        alert = CourierSOSAlert.objects.create(
            courier=courier,
            message=serializer.validated_data.get("message", ""),
            location=serializer.validated_data.get("location", ""),
            latitude=serializer.validated_data.get("latitude"),
            longitude=serializer.validated_data.get("longitude"),
        )
        UserNotification.objects.create(
            user=request.user,
            title="Alerte SOS envoyee",
            message="Le support securite BelivaY a recu ton alerte SOS.",
            notification_type=UserNotification.NotificationType.SUPPORT,
            action_url="/courier",
        )
        return Response(CourierSOSAlertSerializer(alert).data, status=status.HTTP_201_CREATED)


@extend_schema(tags=["Shipping"], summary="Livraisons disponibles (non assignées, dans la zone du livreur)")
class CourierAvailableShipmentsView(generics.ListAPIView):
    serializer_class = ShipmentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        courier = _get_active_courier(self.request.user)
        city = (courier.city or "").strip()
        qs = Shipment.objects.filter(
            status=Shipment.Status.CREATED,
            courier=None,
            order__delivery_method=Order.DeliveryMethod.DELIVERY,
        ).select_related("order", "order__user")

        if city:
            from django.db.models import Q

            city_filter = Q()
            for variant in _city_variants(city):
                city_filter |= Q(order__city__iexact=variant)
            qs = qs.filter(city_filter)

        return qs.order_by("created_at")


@extend_schema(tags=["Shipping"], summary="Réclamer une livraison disponible (auto-assignement)")
class CourierClaimShipmentView(generics.GenericAPIView):
    serializer_class = ShipmentSerializer
    permission_classes = [IsAuthenticated]

    def post(self, request, id):
        courier = _get_active_courier(request.user)

        full_name = request.user.get_full_name().strip() or request.user.username
        updated_count = Shipment.objects.filter(
            id=id,
            status=Shipment.Status.CREATED,
            courier=None,
        ).update(
            courier=courier,
            courier_name=full_name,
            courier_phone=courier.phone or "",
            status=Shipment.Status.ASSIGNED,
        )

        if updated_count == 0:
            return Response(
                {"detail": "Livraison déjà prise en charge ou introuvable."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        shipment = Shipment.objects.select_related("order", "courier", "courier__user").get(id=id)

        ShipmentEvent.objects.create(
            shipment=shipment,
            status=Shipment.Status.ASSIGNED,
            message="Mission acceptée par le livreur",
            location=courier.city or "",
        )

        order = shipment.order
        order.assign_driver()

        UserNotification.objects.create(
            user=courier.user,
            title=f"Livraison #{order.id} prise en charge",
            message=f"Vous avez accepté la livraison vers {order.city} - {order.address}.",
            notification_type=UserNotification.NotificationType.ORDER,
            action_url="/courier",
        )

        return Response(ShipmentSerializer(shipment).data, status=status.HTTP_200_OK)
