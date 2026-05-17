# backend/apps/orders/views.py
# Vues pour la gestion des commandes.

from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db.models import Q

from .models import Order, Dispute, DisputeMessage, OrderHistory
from .serializers import (
    OrderCreateSerializer,
    OrderDetailSerializer,
    DisputeSerializer,
    DisputeCreateSerializer,
    DisputeMessageSerializer,
    DisputeMessageCreateSerializer,
)
from apps.shipping.models import Shipment, ShipmentEvent
from apps.shipping.serializers import ShipmentSerializer
from apps.accounts.models import UserNotification


def _phone_variants(phone):
    raw = (phone or "").strip()
    digits = "".join(ch for ch in raw if ch.isdigit())
    variants = {raw, digits}
    if digits:
        variants.add(f"+{digits}")
        if digits.startswith("237"):
            variants.add(digits[3:])
            variants.add(f"+237{digits[3:]}")
        elif len(digits) == 9:
            variants.add(f"237{digits}")
            variants.add(f"+237{digits}")
    return {variant for variant in variants if variant}


def _user_phone_values(user):
    phones = []
    profile = getattr(user, "profile", None)
    if profile and profile.phone:
        phones.append(profile.phone)
    courier_profile = getattr(user, "courier_profile", None)
    if courier_profile and courier_profile.phone:
        phones.append(courier_profile.phone)
    return phones


def user_order_visibility_q(user):
    query = Q(user=user)
    phone_variants = set()
    for phone in _user_phone_values(user):
        phone_variants.update(_phone_variants(phone))
    if phone_variants:
        query |= Q(customer_phone__in=phone_variants)
    email = (getattr(user, "email", "") or "").strip()
    if email:
        query |= Q(customer_email__iexact=email)
    return query


def get_user_order_or_404(request, id):
    return get_object_or_404(
        Order.objects.filter(user_order_visibility_q(request.user)).prefetch_related("items"),
        id=id,
    )


@extend_schema(
    tags=["Orders"],
    summary="Créer une commande (checkout)",
    request=OrderCreateSerializer,
    responses={201: OrderDetailSerializer},
)
class OrderCreateView(generics.CreateAPIView):
    serializer_class = OrderCreateSerializer
    permission_classes = [IsAuthenticated]  # Exiger authentification

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)

        order = serializer.save()

        if request.user.is_authenticated:
            UserNotification.objects.create(
                user=request.user,
                title=f"Commande #{order.id} creee",
                message="Votre commande a bien ete enregistree et attend le paiement.",
                notification_type=UserNotification.NotificationType.ORDER,
                action_url=f"/orders/{order.id}",
            )

        out = OrderDetailSerializer(order)
        return Response(out.data, status=status.HTTP_201_CREATED)


@extend_schema(tags=["Orders"], summary="Détails commande")
class OrderDetailView(generics.RetrieveAPIView):
    serializer_class = OrderDetailSerializer
    lookup_field = "id"
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Order.objects.filter(user_order_visibility_q(self.request.user)).prefetch_related("items").distinct()


@extend_schema(tags=["Orders"], summary="Suivi de livraison d'une commande")
class OrderTrackingView(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = OrderDetailSerializer

    def get(self, request, id):
        order = get_user_order_or_404(request, id)
        shipment = getattr(order, 'shipment', None)
        if not shipment:
            return Response({"detail": "No shipment found for this order"}, status=status.HTTP_404_NOT_FOUND)
        return Response(ShipmentSerializer(shipment).data)


@extend_schema(
    tags=["Orders"],
    summary="Mes commandes",
    description="Liste des commandes de l'utilisateur connecté"
)
class MyOrdersView(generics.ListAPIView):
    serializer_class = OrderDetailSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            Order.objects.filter(user_order_visibility_q(self.request.user))
            .prefetch_related("items")
            .distinct()
            .order_by("-created_at")
        )


@extend_schema(tags=["Orders"], summary="Annuler une commande client")
class CancelOrderView(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = OrderDetailSerializer

    def post(self, request, id):
        order = get_user_order_or_404(request, id)
        closed_statuses = [
            Order.FulfillmentStatus.DELIVERED,
            Order.FulfillmentStatus.BUYER_CONFIRMED,
            Order.FulfillmentStatus.AUTO_CONFIRMED,
            Order.FulfillmentStatus.RELEASED_TO_VENDOR,
            Order.FulfillmentStatus.CANCELLED,
            Order.FulfillmentStatus.REFUNDED,
        ]
        if order.fulfillment_status in closed_statuses:
            return Response(
                {"detail": "Cette commande ne peut plus etre annulee."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        old_status = order.fulfillment_status
        order.cancel()

        shipment = getattr(order, "shipment", None)
        if shipment:
            shipment.status = Shipment.Status.CANCELLED
            shipment.save(update_fields=["status", "updated_at"])
            ShipmentEvent.objects.create(
                shipment=shipment,
                status=Shipment.Status.CANCELLED,
                message="Commande annulee par le client",
                location=order.city,
            )

        OrderHistory.objects.create(
            order=order,
            user=request.user,
            action="Commande annulee par le client",
            field_name="fulfillment_status",
            old_value=old_status,
            new_value=Order.FulfillmentStatus.CANCELLED,
        )

        UserNotification.objects.create(
            user=request.user,
            title=f"Commande #{order.id} annulee",
            message="Votre commande a bien ete annulee et retiree de vos commandes en cours.",
            notification_type=UserNotification.NotificationType.ORDER,
            action_url="/orders",
        )

        return Response(OrderDetailSerializer(order).data)


@extend_schema(tags=["Orders"], summary="Confirmer la reception d'une commande")
class ConfirmReceiptView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, id):
        order = get_user_order_or_404(request, id)
        if order.fulfillment_status not in [
            Order.FulfillmentStatus.DELIVERED,
            Order.FulfillmentStatus.BUYER_CONFIRMED,
            Order.FulfillmentStatus.AUTO_CONFIRMED,
            Order.FulfillmentStatus.RELEASED_TO_VENDOR,
        ]:
            return Response(
                {"detail": "La commande doit d'abord etre marquee livree par le livreur."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        old_status = order.fulfillment_status
        if order.fulfillment_status == Order.FulfillmentStatus.DELIVERED:
            order.buyer_confirm()

        shipment, _ = Shipment.objects.get_or_create(order=order)
        shipment.status = Shipment.Status.DELIVERED
        shipment.save(update_fields=['status', 'updated_at'])
        ShipmentEvent.objects.create(
            shipment=shipment,
            status=Shipment.Status.DELIVERED,
            message="Reception confirmee par le client",
            location=order.city,
        )

        OrderHistory.objects.create(
            order=order,
            user=request.user,
            action="Reception confirmee",
            field_name="fulfillment_status",
            old_value=old_status,
            new_value=Order.FulfillmentStatus.BUYER_CONFIRMED,
        )

        UserNotification.objects.create(
            user=request.user,
            title=f"Commande #{order.id} livree",
            message="Merci d'avoir confirme la reception de votre commande.",
            notification_type=UserNotification.NotificationType.ORDER,
            action_url=f"/orders/{order.id}",
        )

        return Response(OrderDetailSerializer(order).data)


@extend_schema(tags=["Orders"], summary="Lister ou ouvrir un litige pour une commande")
class OrderDisputeListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]

    def get_order(self):
        return get_user_order_or_404(self.request, self.kwargs['id'])

    def get_queryset(self):
        return Dispute.objects.filter(order=self.get_order()).prefetch_related('messages')

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return DisputeCreateSerializer
        return DisputeSerializer

    def create(self, request, *args, **kwargs):
        order = self.get_order()
        dispute_window_hours = 24
        allowed_statuses = [
            Order.FulfillmentStatus.DELIVERED,
            Order.FulfillmentStatus.BUYER_CONFIRMED,
        ]
        if order.fulfillment_status not in allowed_statuses:
            return Response(
                {"detail": "Le litige s'ouvre seulement apres reception du colis."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        expires_at = order.updated_at + timezone.timedelta(hours=dispute_window_hours)
        if timezone.now() > expires_at:
            return Response(
                {"detail": "Le delai de 24h apres reception est depasse pour cette commande."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if Dispute.objects.filter(order=order, opened_by=request.user).exclude(status="CLOSED").exists():
            return Response(
                {"detail": "Un litige est deja ouvert pour cette commande."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        dispute = Dispute.objects.create(
            order=order,
            opened_by=request.user,
            **serializer.validated_data,
        )
        DisputeMessage.objects.create(
            dispute=dispute,
            sender=request.user,
            message=dispute.description,
            is_internal=False,
        )
        UserNotification.objects.create(
            user=request.user,
            title=f"Litige ouvert sur la commande #{order.id}",
            message="Votre demande a ete transmise au support Belivay.",
            notification_type=UserNotification.NotificationType.SUPPORT,
            action_url=f"/orders/{order.id}",
        )
        return Response(DisputeSerializer(dispute).data, status=status.HTTP_201_CREATED)


@extend_schema(tags=["Orders"], summary="Ajouter un message a un litige client")
class DisputeMessageCreateView(generics.CreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = DisputeMessageCreateSerializer

    def create(self, request, *args, **kwargs):
        dispute = get_object_or_404(
            Dispute.objects.select_related('order'),
            id=self.kwargs['dispute_id'],
            order__user=request.user,
        )
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        message = DisputeMessage.objects.create(
            dispute=dispute,
            sender=request.user,
            message=serializer.validated_data['message'],
            is_internal=False,
        )
        dispute.updated_at = timezone.now()
        dispute.save(update_fields=['updated_at'])
        return Response(DisputeMessageSerializer(message).data, status=status.HTTP_201_CREATED)
