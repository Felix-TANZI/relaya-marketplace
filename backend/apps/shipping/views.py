from rest_framework import generics, status
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiParameter

from .serializers import (
    ShipmentSerializer,
    ShipmentCreateSerializer,
    ShipmentEventSerializer,
    ShipmentEventCreateSerializer,
)
from .models import Shipment


@extend_schema(
    tags=["Shipping"],
    summary="Créer/assigner un shipment à une commande (V1)",
    request=ShipmentCreateSerializer,
    responses={201: ShipmentSerializer},
)
class ShipmentCreateView(generics.CreateAPIView):
    serializer_class = ShipmentCreateSerializer

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
    def get(self, request, *args, **kwargs):
        order_id = request.query_params.get("order_id")
        if not order_id:
            return Response({"detail": "order_id is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            shipment = Shipment.objects.get(order_id=order_id)
        except Shipment.DoesNotExist:
            return Response({"detail": "No shipment found for this order"}, status=status.HTTP_404_NOT_FOUND)

        return Response(ShipmentSerializer(shipment).data, status=status.HTTP_200_OK)
