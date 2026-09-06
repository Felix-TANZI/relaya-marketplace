from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from drf_spectacular.utils import extend_schema, OpenApiParameter
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db.models import Count, Sum
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
    RelayParcelPickupSerializer,
    RelayParcelReceiveSerializer,
    RelayParcelReturnSerializer,
    RelayParcelSerializer,
    RelayPointReviewSerializer,
    ShipmentMessageCreateSerializer,
    ShipmentMessageSerializer,
    ShipmentSerializer,
    ShipmentCreateSerializer,
    ShipmentEventSerializer,
    ShipmentEventCreateSerializer,
    ShipmentLocationCreateSerializer,
    ShipmentLocationSerializer,
    ShipmentEvidenceSerializer,
)
from .models import (
    CourierSOSAlert,
    RelayParcel,
    RelayPointReview,
    Shipment,
    ShipmentEvent,
    ShipmentLocation,
    ShipmentMessage,
    Tournee,
)
from apps.accounts.models import CourierProfile
from apps.accounts.models import UserNotification
from apps.accounts.models import TrustScoreProfile
from apps.accounts.models import RelayPointProfile
from apps.accounts.trust_score import calculate_trust_score, get_trust_score_profile, trust_score_payload
from apps.vendors.models import VendorLocation, VendorProfile
from apps.orders.models import Dispute, DisputeMessage, Order, Return
from apps.orders.serializers import ReturnSerializer
from .evidence import create_shipment_evidence
from .models import ShipmentEvidence


def _get_active_relay_point(user):
    relay_point = getattr(user, "relay_point_profile", None)
    if not relay_point or not relay_point.is_active or relay_point.status != relay_point.Status.APPROVED:
        raise PermissionDenied("Relay point account is not active or approved")
    return relay_point


def _haversine_km(lat1, lng1, lat2, lng2):
    from math import radians, sin, cos, sqrt, atan2
    r = 6371.0
    phi1, phi2 = radians(float(lat1)), radians(float(lat2))
    dphi = radians(float(lat2) - float(lat1))
    dlambda = radians(float(lng2) - float(lng1))
    a = sin(dphi / 2) ** 2 + cos(phi1) * cos(phi2) * sin(dlambda / 2) ** 2
    return 2 * r * atan2(sqrt(a), sqrt(1 - a))


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


def _release_overdue_accepted_shipments():
    deadline = timezone.now() - timedelta(hours=1)
    overdue = (
        Shipment.objects.filter(
            status=Shipment.Status.ASSIGNED,
            courier__isnull=False,
            accepted_at__isnull=False,
            accepted_at__lte=deadline,
            penalty_notified_at__isnull=True,
        )
        .select_related("order", "courier", "courier__user")
    )

    for shipment in overdue:
        courier_user = shipment.courier.user
        order = shipment.order
        UserNotification.objects.create(
            user=courier_user,
            title=f"Penalite mission #{order.id}",
            message=(
                "Vous avez accepte cette mission mais le colis n'a pas ete marque pris en charge "
                "dans le delai d'une heure. Vos points ont ete reduits et la mission a ete liberee."
            ),
            notification_type=UserNotification.NotificationType.SYSTEM,
            action_url="/courier",
        )
        ShipmentEvent.objects.create(
            shipment=shipment,
            status=Shipment.Status.CREATED,
            message="Mission liberee automatiquement apres depassement du delai de prise en charge.",
            location=order.city,
        )
        shipment.status = Shipment.Status.CREATED
        shipment.courier = None
        shipment.courier_name = ""
        shipment.courier_phone = ""
        shipment.accepted_at = None
        shipment.penalty_notified_at = timezone.now()
        shipment.save(
            update_fields=[
                "status",
                "courier",
                "courier_name",
                "courier_phone",
                "accepted_at",
                "penalty_notified_at",
                "updated_at",
            ]
        )
        order.mark_ready_for_pickup()


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
        return Response(ShipmentSerializer(shipment, context={"request": request}).data, status=status.HTTP_201_CREATED)


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
    summary="Points relais proches avec de la place (routage acheteur)",
    description=(
        "Classe les points relais actifs par proximite. Regle verrouillee : "
        "l'acheteur est route vers le plus proche AVEC de la place ; si le plus "
        "proche est plein, on redescend la liste jusqu'a trouver de la place. "
        "Le frontend doit expliquer a l'acheteur quand ce n'est pas le 1er de "
        "la liste qui est retenu."
    ),
    parameters=[
        OpenApiParameter(name="city", required=False, type=str),
        OpenApiParameter(name="lat", required=False, type=float),
        OpenApiParameter(name="lng", required=False, type=float),
    ],
)
class RelayPointNearbyView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        city = (request.query_params.get("city") or "").strip()
        lat = request.query_params.get("lat")
        lng = request.query_params.get("lng")

        qs = RelayPointProfile.objects.filter(
            is_active=True, status=RelayPointProfile.Status.APPROVED,
        )
        if city:
            qs = qs.filter(city__in=_city_variants(city) or [city])

        occupancy_by_relay = dict(
            RelayParcel.objects.filter(
                relay_point__in=qs,
                status__in=[RelayParcel.Status.EXPECTED, RelayParcel.Status.RECEIVED, RelayParcel.Status.STORED],
            ).values("relay_point").annotate(count=Count("id")).values_list("relay_point", "count")
        )

        try:
            buyer_lat = float(lat) if lat is not None else None
            buyer_lng = float(lng) if lng is not None else None
        except (TypeError, ValueError):
            buyer_lat = buyer_lng = None

        results = []
        for relay in qs:
            occupancy = occupancy_by_relay.get(relay.id, 0)
            capacity = relay.storage_capacity or 0
            has_space = capacity == 0 or occupancy < capacity
            distance_km = None
            if buyer_lat is not None and buyer_lng is not None and relay.latitude is not None and relay.longitude is not None:
                distance_km = round(_haversine_km(buyer_lat, buyer_lng, relay.latitude, relay.longitude), 2)
            results.append({
                "id": relay.id,
                "name": relay.name,
                "address": relay.address,
                "city": relay.city,
                "opening_hours": relay.opening_hours,
                "storage_capacity": capacity,
                "occupancy": occupancy,
                "has_space": has_space,
                "distance_km": distance_km,
            })

        # Tri : par distance si on l'a, sinon par nom (ordre stable, arbitraire
        # mais deterministe) — la disponibilite n'entre PAS dans le tri : on
        # doit voir clairement que le plus proche est plein avant de
        # descendre a l'option suivante (transparence de la regle metier).
        if buyer_lat is not None and buyer_lng is not None:
            results.sort(key=lambda r: (r["distance_km"] is None, r["distance_km"] or 0))
        else:
            results.sort(key=lambda r: r["name"])

        return Response(results)


@extend_schema(tags=["Relay Point"], summary="Colis du point relais connecte")
class RelayPointParcelListView(generics.ListAPIView):
    serializer_class = RelayParcelSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        relay_point = _get_active_relay_point(self.request.user)
        status_filter = self.request.query_params.get("status")
        qs = RelayParcel.objects.filter(relay_point=relay_point).select_related("shipment", "shipment__order", "relay_point")
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs


@extend_schema(tags=["Relay Point"], summary="Receptionner et stocker un colis au point relais")
class RelayPointParcelReceiveView(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = RelayParcelReceiveSerializer

    def post(self, request):
        relay_point = _get_active_relay_point(request.user)
        serializer = RelayParcelReceiveSerializer(data=request.data, context={"relay_point": relay_point})
        serializer.is_valid(raise_exception=True)
        parcel = serializer.save()
        return Response(RelayParcelSerializer(parcel).data, status=status.HTTP_201_CREATED)


@extend_schema(
    tags=["Relay Point"],
    summary="Categorie suggeree pour un colis, avant reception",
)
class RelayParcelSizeSuggestionView(APIView):
    """
    Propose une categorie a partir du contenu de la commande.

    UNE SUGGESTION, PAS UNE DECISION. Le gerant a le colis en main : aucune
    estimation ne battra ce qu'il voit. Sa REMUNERATION en depend, donc la
    decision lui revient.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        from apps.shipping.parcel_sizing import suggest_for_shipment

        _get_active_relay_point(request.user)

        try:
            shipment_id = int(request.query_params.get("shipment_id") or 0)
        except (TypeError, ValueError):
            shipment_id = 0

        if not shipment_id:
            return Response(
                {"detail": "shipment_id est obligatoire."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            shipment = Shipment.objects.select_related("order").get(
                pk=shipment_id)
        except Shipment.DoesNotExist:
            return Response({"detail": "Expedition introuvable."},
                            status=status.HTTP_404_NOT_FOUND)

        suggestion = suggest_for_shipment(shipment)
        # La taille deja portee par l'expedition est renvoyee telle quelle :
        # si un transporteur l'a renseignee, elle vaut mieux qu'une
        # estimation.
        suggestion["current_parcel_size"] = shipment.parcel_size or ""
        return Response(suggestion)


@extend_schema(
    tags=["Relay Point"],
    summary="Refuser un colis au controle (scelle rompu, colis endommage...)",
    description=(
        "Reception par lot — controle du scelle : le point relais peut refuser un "
        "colis a l'arrivee du livreur au lieu de l'accepter en stock. Le refus est "
        "motive (raison + photo obligatoire), place le colis en incident et laisse "
        "la logistique BelivaY reprendre la main — Addendum Decisions v1.0 §9."
    ),
)
class RelayPointParcelRefuseView(APIView):
    permission_classes = [IsAuthenticated]

    REASON_CHOICES = {
        "SEAL_BROKEN": "Scellé rompu ou absent",
        "PACKAGE_DAMAGED": "Colis visiblement endommagé",
        "WRONG_PARCEL": "Colis ne correspondant pas à l'annonce",
        "OTHER": "Autre motif",
    }

    def post(self, request):
        relay_point = _get_active_relay_point(request.user)
        shipment_id = request.data.get("shipment_id")
        order_id = request.data.get("order_id")
        if not shipment_id and not order_id:
            return Response({"shipment_id": "shipment_id ou order_id est obligatoire."}, status=status.HTTP_400_BAD_REQUEST)

        shipment_qs = Shipment.objects.select_related("order")
        if shipment_id:
            shipment = get_object_or_404(shipment_qs, id=shipment_id)
        else:
            candidates = list(shipment_qs.filter(order_id=order_id))
            if not candidates:
                return Response({"shipment_id": "Colis introuvable."}, status=status.HTTP_404_NOT_FOUND)
            if len(candidates) > 1:
                return Response(
                    {"shipment_id": "Cette commande a plusieurs colis — precisez shipment_id."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            shipment = candidates[0]

        reason = request.data.get("reason")
        if reason not in self.REASON_CHOICES:
            return Response(
                {"reason": f"Choisissez parmi : {', '.join(self.REASON_CHOICES)}."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        upload = request.FILES.get("file")
        if not upload:
            return Response({"file": "Une photo du colis refusé est obligatoire."}, status=status.HTTP_400_BAD_REQUEST)

        note = request.data.get("note", "")
        reason_label = self.REASON_CHOICES[reason]

        existing_parcel = RelayParcel.objects.filter(shipment=shipment).first()
        if existing_parcel:
            existing_parcel.status = RelayParcel.Status.REFUSED
            existing_parcel.proof_note = f"{reason_label}. {note}".strip()
            existing_parcel.save(update_fields=["status", "proof_note", "updated_at"])
        else:
            RelayParcel.objects.create(
                shipment=shipment,
                relay_point=relay_point,
                status=RelayParcel.Status.REFUSED,
                proof_note=f"{reason_label}. {note}".strip(),
            )

        shipment.status = Shipment.Status.INCIDENT
        shipment.save(update_fields=["status", "updated_at"])
        incident_message = f"Refusé au contrôle du point relais {relay_point.name} — {reason_label}." + (f" {note}" if note else "")
        ShipmentEvent.objects.create(
            shipment=shipment,
            status=Shipment.Status.INCIDENT,
            message=incident_message,
            location=relay_point.name,
        )
        # État incident visible + notification immédiate (Reste à construire,
        # portail acheteur) — le livreur en a déjà une équivalente pour son
        # propre INCIDENT (CourierShipmentActionSerializer) ; ce chemin-ci
        # (refus au relais) ne doit pas laisser l'acheteur sans alerte.
        if shipment.order.user_id:
            UserNotification.objects.create(
                user=shipment.order.user,
                title=f"Incident signalé · commande #{shipment.order_id}",
                message=incident_message,
                notification_type=UserNotification.NotificationType.ORDER,
                action_url=f"/orders/{shipment.order_id}",
            )
        evidence = create_shipment_evidence(
            shipment=shipment,
            user=request.user,
            actor_role="RELAY_POINT",
            stage=ShipmentEvidence.Stage.RELAY_REFUSED,
            upload=upload,
            description=f"{reason_label}. {note}".strip(),
        )
        return Response(
            {
                "shipment_id": shipment.id,
                "status": shipment.status,
                "reason": reason,
                "evidence": ShipmentEvidenceSerializer(evidence, context={"request": request}).data,
            },
            status=status.HTTP_201_CREATED,
        )


@extend_schema(tags=["Relay Point"], summary="Confirmer le retrait client au point relais")
class RelayPointParcelPickupView(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = RelayParcelPickupSerializer

    def post(self, request):
        relay_point = _get_active_relay_point(request.user)
        serializer = RelayParcelPickupSerializer(data=request.data, context={"relay_point": relay_point})
        serializer.is_valid(raise_exception=True)
        parcel = serializer.save()
        return Response(RelayParcelSerializer(parcel).data, status=status.HTTP_200_OK)


@extend_schema(
    tags=["Relay Point"],
    summary="Point relais : deposer une preuve (reception colis / remise client)",
    description=(
        "Point de garde strict (regle verrouillee) : contrairement au livreur en "
        "terrain, le point relais est un lieu fixe presume toujours connecte — "
        "cet upload doit reussir avant de considerer l'etape terminee, pas de "
        "synchro differee tolerée ici."
    ),
)
class RelayPointParcelEvidenceUploadView(APIView):
    permission_classes = [IsAuthenticated]

    ALLOWED_STAGES = {
        ShipmentEvidence.Stage.RELAY_RECEIVED,
        ShipmentEvidence.Stage.RELAY_RELEASED,
        ShipmentEvidence.Stage.RELAY_RELEASED_SIGNATURE,
    }

    def post(self, request):
        relay_point = _get_active_relay_point(request.user)
        parcel_id = request.data.get("parcel_id")
        parcel = get_object_or_404(
            RelayParcel.objects.select_related("shipment"), id=parcel_id, relay_point=relay_point,
        )
        stage = request.data.get("stage")
        if stage not in self.ALLOWED_STAGES:
            return Response(
                {"stage": f"Choisissez parmi : {', '.join(self.ALLOWED_STAGES)}."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        upload = request.FILES.get("file")
        if not upload:
            return Response({"file": "Ce champ est requis."}, status=status.HTTP_400_BAD_REQUEST)

        evidence = create_shipment_evidence(
            shipment=parcel.shipment,
            user=request.user,
            actor_role="RELAY_POINT",
            stage=stage,
            upload=upload,
            description=request.data.get("description", ""),
        )
        return Response(
            ShipmentEvidenceSerializer(evidence, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


@extend_schema(tags=["Relay Point"], summary="Retourner un colis depuis le point relais")
class RelayPointParcelReturnView(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = RelayParcelReturnSerializer

    def post(self, request):
        relay_point = _get_active_relay_point(request.user)
        serializer = RelayParcelReturnSerializer(data=request.data, context={"relay_point": relay_point})
        serializer.is_valid(raise_exception=True)
        parcel = serializer.save()
        return Response(RelayParcelSerializer(parcel).data, status=status.HTTP_200_OK)


@extend_schema(
    tags=["Shipping"],
    summary="Constater le depot d'un retour acheteur au point relais",
    description=(
        "Depot en point relais = mode de transport par defaut pour un retour "
        "acheteur (voir apps.orders.models.Return). Le relais qui receptionne "
        "s'affecte au retour s'il n'etait pas deja fixe."
    ),
)
class RelayPointReturnReceiveView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        relay_point = _get_active_relay_point(request.user)
        return_id = request.data.get("return_id")
        order_id = request.data.get("order_id")
        if not return_id and not order_id:
            return Response({"return_id": "return_id ou order_id est requis."}, status=status.HTTP_400_BAD_REQUEST)

        lookup = {"id": return_id} if return_id else {"order_id": order_id}
        return_obj = get_object_or_404(
            Return.objects.filter(status__in=[Return.Status.APPROVED, Return.Status.AWAITING_DROPOFF]),
            **lookup,
        )
        if return_obj.transport_mode != Return.TransportMode.RELAY_DROPOFF:
            return Response(
                {"detail": "Ce retour n'est pas configure pour un depot en point relais."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return_obj.dropoff_relay_point = return_obj.dropoff_relay_point or relay_point
        return_obj.status = Return.Status.RECEIVED
        return_obj.received_at = timezone.now()
        return_obj.received_by = request.user
        return_obj.save(update_fields=[
            "dropoff_relay_point", "status", "received_at", "received_by", "updated_at",
        ])

        UserNotification.objects.create(
            user=return_obj.requested_by,
            title=f"Retour depose · commande #{return_obj.order_id}",
            message=f"Votre colis a ete recu au point relais {relay_point.name}. Il part vers inspection.",
            notification_type=UserNotification.NotificationType.ORDER,
            action_url=f"/orders/{return_obj.order_id}",
        )

        return Response(ReturnSerializer(return_obj, context={"request": request}).data, status=status.HTTP_200_OK)


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
            shipment = Shipment.objects.select_related(
                "order",
                "courier__user",
                "courier__delivery_organization__user",
            ).get(order_id=order_id)
        except Shipment.DoesNotExist:
            return Response({"detail": "No shipment found for this order"}, status=status.HTTP_404_NOT_FOUND)

        relay_parcel = getattr(shipment, "relay_parcel", None)
        allowed_user_ids = {
            shipment.order.user_id,
            getattr(getattr(shipment, "courier", None), "user_id", None),
            getattr(getattr(getattr(shipment, "courier", None), "delivery_organization", None), "user_id", None),
            getattr(getattr(relay_parcel, "relay_point", None), "user_id", None),
        }
        if not request.user.is_staff and request.user.id not in allowed_user_ids:
            raise PermissionDenied("Vous ne pouvez pas consulter le suivi de cette commande.")

        return Response(ShipmentSerializer(shipment, context={"request": request}).data, status=status.HTTP_200_OK)


@extend_schema(tags=["Shipping"], summary="Mes livraisons assignees (livreur)")
class CourierMyShipmentsView(generics.ListAPIView):
    serializer_class = ShipmentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        _release_overdue_accepted_shipments()
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
        return Response(ShipmentSerializer(shipment, context={"request": request}).data, status=status.HTTP_200_OK)


@extend_schema(
    tags=["Shipping"],
    summary="Livreur : deposer une preuve (enlevement vendeur / remise client)",
    description=(
        "Capture obligatoire, transmission best-effort (regle verrouillee) : le "
        "livreur peut prendre la photo hors-ligne et l'envoyer plus tard — cet "
        "endpoint accepte l'upload chaque fois qu'il arrive, il n'y a pas de "
        "fenetre de synchro cote serveur."
    ),
)
class CourierShipmentEvidenceUploadView(APIView):
    permission_classes = [IsAuthenticated]

    ALLOWED_STAGES = {
        ShipmentEvidence.Stage.COURIER_PICKUP_VENDOR,
        ShipmentEvidence.Stage.CUSTOMER_DELIVERY,
    }

    def post(self, request, id):
        courier = getattr(request.user, "courier_profile", None)
        if not courier or not courier.is_approved or not courier.is_active:
            raise PermissionDenied("Courier account is not approved")

        shipment = get_object_or_404(Shipment, id=id, courier=courier)
        stage = request.data.get("stage")
        if stage not in self.ALLOWED_STAGES:
            return Response(
                {"stage": f"Choisissez parmi : {', '.join(self.ALLOWED_STAGES)}."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        upload = request.FILES.get("file")
        if not upload:
            return Response({"file": "Ce champ est requis."}, status=status.HTTP_400_BAD_REQUEST)

        evidence = create_shipment_evidence(
            shipment=shipment,
            user=request.user,
            actor_role="COURIER",
            stage=stage,
            upload=upload,
            description=request.data.get("description", ""),
        )
        return Response(
            ShipmentEvidenceSerializer(evidence, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


@extend_schema(
    tags=["Shipping"],
    summary="Publier la position GPS du livreur pour une mission",
    request=ShipmentLocationCreateSerializer,
    responses={201: ShipmentLocationSerializer},
)
class CourierShipmentLocationView(generics.GenericAPIView):
    serializer_class = ShipmentLocationCreateSerializer
    permission_classes = [IsAuthenticated]

    active_statuses = {
        Shipment.Status.ASSIGNED,
        Shipment.Status.PICKED_UP,
        Shipment.Status.IN_TRANSIT,
        Shipment.Status.OUT_FOR_DELIVERY,
    }

    def post(self, request, id):
        courier = getattr(request.user, "courier_profile", None)
        if not courier or not courier.is_approved or not courier.is_active:
            raise PermissionDenied("Courier account is not approved")

        shipment = get_object_or_404(Shipment, id=id, courier=courier)
        if shipment.status not in self.active_statuses:
            return Response(
                {"detail": "Le tracking GPS est réservé aux missions actives."},
                status=status.HTTP_409_CONFLICT,
            )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        location = serializer.save(shipment=shipment, courier=courier)

        if not courier.gps_permission_granted:
            courier.gps_permission_granted = True
            courier.save(update_fields=["gps_permission_granted", "updated_at"])

        return Response(ShipmentLocationSerializer(location).data, status=status.HTTP_201_CREATED)


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
    """
    Part du livreur/entreprise de livraison sur CE colis — feres de transport
    de la commande divisees entre ses colis, puis part transporteur du
    composant TRANSPORT, lue depuis le module financier.

    Remplace l'ancien calcul "8% du total de la commande", qui n'avait aucun
    lien avec les frais de transport reels et grossissait avec la valeur des
    articles plutot qu'avec l'effort de livraison.
    """
    order = shipment.order
    colis_count = order.shipments.count() or 1
    transport_share = (order.delivery_fee_xaf or 0) / colis_count

    # ─────────────────────────────────────────────────────────────────────
    # LE TAUX VIENT DU MODULE FINANCIER
    #
    # Cette vue lisait elle-meme la DistributionRule, avec un repli a 70 %
    # en dur. Deux sources pour un meme taux finissent par diverger — et
    # l'ecart ne se verrait qu'au moment ou un transporteur compterait
    # son du.
    # ─────────────────────────────────────────────────────────────────────
    from apps.payments.bridge import queries

    return round(transport_share * float(queries.carrier_share_ratio()))


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
        courier_trust = calculate_trust_score(courier.user, TrustScoreProfile.Role.COURIER)

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
            trust = get_trust_score_profile(profile.user, TrustScoreProfile.Role.COURIER)
            score = round(float(trust.score))
            leaderboard.append(
                {
                    "name": profile.user.get_full_name().strip() or profile.user.username,
                    "score": f"{score}%",
                    "badge": trust.get_tier_display(),
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
            "trust_score": trust_score_payload(courier_trust),
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
        _release_overdue_accepted_shipments()
        courier = _get_active_courier(self.request.user)
        return (
            Dispute.objects.filter(order__shipments__courier=courier)
            .select_related("order", "opened_by")
            .order_by("-updated_at")
            .distinct()
        )


@extend_schema(tags=["Shipping"], summary="Demander l'autorisation de répondre à un litige livreur")
class CourierDisputeReplyPermissionRequestView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, dispute_id):
        courier = _get_active_courier(request.user)
        dispute = get_object_or_404(
            Dispute.objects.filter(order__shipments__courier=courier),
            id=dispute_id,
        )
        UserNotification.objects.create(
            user=request.user,
            title=f"Demande envoyée · litige #{dispute.id}",
            message="BelivaY a reçu votre demande de réponse. Un admin peut ouvrir le canal si votre précision est nécessaire.",
            notification_type=UserNotification.NotificationType.SUPPORT,
            action_url="/courier",
        )
        return Response({"detail": "Demande transmise au support BelivaY."}, status=status.HTTP_200_OK)


@extend_schema(tags=["Shipping"], summary="Répondre à un litige côté livreur")
class CourierDisputeMessageCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, dispute_id):
        courier = _get_active_courier(request.user)
        dispute = get_object_or_404(
            Dispute.objects.filter(order__shipments__courier=courier),
            id=dispute_id,
        )
        if dispute.status in ["RESOLVED", "CLOSED"]:
            return Response({"detail": "Ce litige est clôturé."}, status=status.HTTP_400_BAD_REQUEST)
        if not dispute.courier_can_reply:
            return Response({"detail": "Réponse livreur désactivée par BelivaY."}, status=status.HTTP_403_FORBIDDEN)
        message_text = (request.data.get("message") or "").strip()
        if not message_text:
            return Response({"detail": "Le message ne peut pas être vide."}, status=status.HTTP_400_BAD_REQUEST)
        DisputeMessage.objects.create(
            dispute=dispute,
            sender=request.user,
            message=message_text,
            sender_role=DisputeMessage.SenderRole.COURIER,
            is_internal=False,
        )
        dispute.updated_at = timezone.now()
        dispute.save(update_fields=["updated_at"])
        return Response({"detail": "Réponse envoyée à BelivaY."}, status=status.HTTP_201_CREATED)


@extend_schema(tags=["Shipping"], summary="Chat client ↔ livreur (accessible par les deux parties)")
class ClientOrderMessagesView(generics.GenericAPIView):
    """
    GET  /api/shipping/orders/{order_id}/messages/  → liste les messages du canal CLIENT
    POST /api/shipping/orders/{order_id}/messages/  → envoie un message (client ou livreur)

    Accès :
      - Le client propriétaire de la commande (sender_role=CLIENT)
      - Le livreur assigné au shipment de cette commande (sender_role=COURIER)
    Un UserNotification est créé pour l'autre partie à chaque message.
    """
    serializer_class = ShipmentMessageCreateSerializer
    permission_classes = [IsAuthenticated]

    def _resolve(self):
        """Retourne (shipment, sender_role) selon le rôle de l'appelant."""
        order_id = self.kwargs["order_id"]
        user = self.request.user

        # 1. Accès client : l'utilisateur est propriétaire de la commande.
        # Une commande peut avoir plusieurs colis (un par vendeur) : on
        # privilegie celui qui a deja un livreur assigne (le plus pertinent
        # pour "parler a mon livreur"), sinon le premier.
        order_qs = Order.objects.filter(id=order_id, user=user).prefetch_related("shipments__courier__user")
        order = order_qs.first()
        if order:
            shipments = list(order.shipments.all())
            shipment = next((s for s in shipments if s.courier_id), None) or (shipments[0] if shipments else None)
            if not shipment:
                from rest_framework.exceptions import NotFound
                raise NotFound("Aucune livraison pour cette commande.")
            return shipment, ShipmentMessage.SenderRole.CLIENT

        # 2. Accès livreur : l'utilisateur est le courier assigné au shipment de cette commande
        courier = getattr(user, "courier_profile", None)
        if courier and courier.is_approved:
            shipment = (
                Shipment.objects
                .filter(order_id=order_id, courier=courier)
                .select_related("order__user", "courier__user")
                .first()
            )
            if shipment:
                return shipment, ShipmentMessage.SenderRole.COURIER

        raise PermissionDenied("Vous n'avez pas accès à ces messages.")

    def get(self, request, order_id):
        shipment, _ = self._resolve()
        messages = shipment.messages.filter(channel=ShipmentMessage.Channel.CLIENT)
        return Response(ShipmentMessageSerializer(messages, many=True).data)

    def post(self, request, order_id):
        shipment, sender_role = self._resolve()
        message_text = (request.data.get("message") or "").strip()
        if not message_text:
            return Response({"detail": "Le message ne peut pas être vide."}, status=status.HTTP_400_BAD_REQUEST)

        msg = ShipmentMessage.objects.create(
            shipment=shipment,
            sender=request.user,
            channel=ShipmentMessage.Channel.CLIENT,
            sender_role=sender_role,
            message=message_text,
        )

        # Notification pour l'autre partie
        if sender_role == ShipmentMessage.SenderRole.CLIENT:
            # Client → notifier le livreur
            if shipment.courier:
                sender_display = request.user.get_full_name().strip() or request.user.username
                UserNotification.objects.create(
                    user=shipment.courier.user,
                    title=f"Message client — Commande #{order_id}",
                    message=f"{sender_display} : {message_text[:100]}",
                    notification_type=UserNotification.NotificationType.ORDER,
                    action_url="/courier",
                )
        else:
            # Livreur → notifier le client
            UserNotification.objects.create(
                user=shipment.order.user,
                title="Réponse de votre livreur",
                message=f"{request.user.get_full_name().strip() or 'Livreur'} : {message_text[:100]}",
                notification_type=UserNotification.NotificationType.ORDER,
                action_url=f"/orders/{order_id}",
            )

        return Response(ShipmentMessageSerializer(msg).data, status=status.HTTP_201_CREATED)


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
        return Response(ShipmentSerializer(shipment, context={"request": request}).data, status=status.HTTP_200_OK)


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
        ).exclude(order__user=self.request.user).select_related("order", "order__user")

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
        _release_overdue_accepted_shipments()
        courier = _get_active_courier(request.user)

        full_name = request.user.get_full_name().strip() or request.user.username
        updated_count = Shipment.objects.filter(
            id=id,
            status=Shipment.Status.CREATED,
            courier=None,
        ).exclude(order__user=request.user).update(
            courier=courier,
            courier_name=full_name,
            courier_phone=courier.phone or "",
            status=Shipment.Status.ASSIGNED,
        )

        if updated_count == 0:
            return Response(
                {"detail": "Livraison déjà prise en charge, introuvable ou liée à votre propre commande."},
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

        return Response(ShipmentSerializer(shipment, context={"request": request}).data, status=status.HTTP_200_OK)


@extend_schema(tags=["Relay Point"], summary="Avis acheteurs du point relais")
class RelayPointReviewListView(APIView):
    """Liste des avis + synthese (moyenne et repartition par nombre d'etoiles)."""

    permission_classes = [IsAuthenticated]
    serializer_class = RelayPointReviewSerializer

    def get(self, request):
        relay_point = _get_active_relay_point(request.user)
        reviews = (
            RelayPointReview.objects
            .filter(relay_point=relay_point)
            .select_related("author", "relay_parcel", "relay_parcel__shipment")
        )
        notes = list(reviews.values_list("rating", flat=True))
        total = len(notes)
        # La repartition est toujours renvoyee sur les 5 niveaux, meme a zero :
        # le graphique du portail n'a pas a combler les trous lui-meme.
        distribution = {str(niveau): notes.count(niveau) for niveau in range(1, 6)}
        average = round(sum(notes) / total, 1) if total else 0.0
        return Response({
            "summary": {
                "average": average,
                "count": total,
                "distribution": distribution,
            },
            "results": RelayPointReviewSerializer(reviews, many=True).data,
        })


@extend_schema(tags=["Relay Point"], summary="Remercier l'acheteur pour son avis")
class RelayPointReviewThankView(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = RelayPointReviewSerializer

    def post(self, request, pk):
        relay_point = _get_active_relay_point(request.user)
        review = get_object_or_404(
            RelayPointReview.objects.select_related("author", "relay_parcel", "relay_parcel__shipment"),
            pk=pk,
            relay_point=relay_point,
        )
        if review.thanked_at is None:
            review.thanked_at = timezone.now()
            review.save(update_fields=["thanked_at", "updated_at"])
        return Response(RelayPointReviewSerializer(review).data)


# Console de supervision admin — version minimale (proposition validée) :
# "deux listes suffisent — colis en retard, tournées non prises. Un tableau,
# pas un tableau de bord." + compteur de subvention par zone (sorties
# forcées, règle n°11 : toute sortie forcée est journalisée).
LATE_TRACKED_STATUSES = [
    Shipment.Status.CREATED,
    Shipment.Status.WAITING_MANUAL_ASSIGNMENT,
    Shipment.Status.ASSIGNED,
    Shipment.Status.PICKED_UP,
    Shipment.Status.IN_TRANSIT,
    Shipment.Status.OUT_FOR_DELIVERY,
]


@extend_schema(
    tags=["Admin"],
    summary="Console de supervision minimale : colis en retard, tournées non prises, subvention par zone",
)
class AdminSupervisionDashboardView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        now = timezone.now()

        shipments = (
            Shipment.objects.filter(status__in=LATE_TRACKED_STATUSES)
            .select_related("order", "order__zone")
        )
        late_shipments = []
        for shipment in shipments:
            eta = shipment.estimated_availability_at()
            if eta and eta < now:
                late_shipments.append({
                    "shipment_id": shipment.id,
                    "order_id": shipment.order_id,
                    "status": shipment.status,
                    "zone": shipment.order.zone.name if shipment.order.zone_id else None,
                    "city": shipment.order.city,
                    "estimated_availability_at": eta,
                    "hours_late": round((now - eta).total_seconds() / 3600, 1),
                })
        late_shipments.sort(key=lambda item: item["hours_late"], reverse=True)

        unclaimed_tournees = (
            Tournee.objects.filter(status=Tournee.Status.PUBLISHED)
            .select_related("zone")
            .order_by("composed_at")
        )
        unclaimed_payload = [
            {
                "id": t.id,
                "zone": t.zone.name,
                "city": t.zone.city,
                "colis_count": t.colis_count,
                "composed_at": t.composed_at,
                "waiting_hours": round((now - t.composed_at).total_seconds() / 3600, 1),
            }
            for t in unclaimed_tournees
        ]

        subsidy_by_zone = list(
            Tournee.objects.filter(is_forced_exit=True)
            .values("zone_id", "zone__name", "zone__city")
            .annotate(forced_exits=Count("id"), colis_perdus=Sum("colis_count"))
            .order_by("-forced_exits")
        )

        return Response({
            "late_shipments": late_shipments,
            "late_shipments_count": len(late_shipments),
            "unclaimed_tournees": unclaimed_payload,
            "unclaimed_tournees_count": len(unclaimed_payload),
            "subsidy_by_zone": subsidy_by_zone,
        })
