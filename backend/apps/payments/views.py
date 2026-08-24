from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.conf import settings
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema, OpenApiParameter

from apps.orders.models import Order
from .serializers import PaymentInitSerializer, PaymentTransactionSerializer
from .models import PaymentTransaction


def _sync_order_payment_status(tx):
    """Reporte le statut d'une transaction sur la commande (source de vérité côté client)."""
    order = tx.order
    if tx.status == PaymentTransaction.Status.SUCCESS:
        new_status = Order.PaymentStatus.PAID
    elif tx.status in (PaymentTransaction.Status.FAILED, PaymentTransaction.Status.CANCELLED):
        new_status = Order.PaymentStatus.FAILED
    else:
        return
    if order.payment_status != new_status:
        order.payment_status = new_status
        order.save(update_fields=["payment_status", "updated_at"])


@extend_schema(
    tags=["Payments"],
    summary="Initier un paiement (mock v1)",
    request=PaymentInitSerializer,
    responses={201: PaymentTransactionSerializer},
)
class PaymentInitView(generics.CreateAPIView):
    serializer_class = PaymentInitSerializer
    permission_classes = [IsAuthenticated]

    def create(self, request, *args, **kwargs):
        s = self.get_serializer(data=request.data, context={"request": request})
        s.is_valid(raise_exception=True)
        tx = s.save()
        return Response(PaymentTransactionSerializer(tx).data, status=status.HTTP_201_CREATED)


@extend_schema(tags=["Payments"], summary="Détails transaction")
class PaymentDetailView(generics.RetrieveAPIView):
    serializer_class = PaymentTransactionSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = "id"

    def get_queryset(self):
        qs = PaymentTransaction.objects.select_related("order")
        if self.request.user.is_staff:
            return qs
        return qs.filter(order__user=self.request.user)


@extend_schema(
    tags=["Payments"],
    summary="Lister les transactions d'une commande",
    parameters=[OpenApiParameter(name="order_id", required=True, type=int, location=OpenApiParameter.QUERY)],
)
class PaymentListByOrderView(generics.ListAPIView):
    serializer_class = PaymentTransactionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        order_id = self.request.query_params.get("order_id")
        if not order_id:
            return PaymentTransaction.objects.none()
        qs = PaymentTransaction.objects.select_related("order").filter(order_id=order_id)
        if not self.request.user.is_staff:
            qs = qs.filter(order__user=self.request.user)
        return qs.order_by("-created_at")


@extend_schema(
    tags=["Payments"],
    summary="Historique des paiements du client connecté",
    parameters=[
        OpenApiParameter(name="status", required=False, type=str, location=OpenApiParameter.QUERY,
                         description="Filtre : INITIATED, PENDING, SUCCESS, FAILED, CANCELLED"),
    ],
)
class MyPaymentsView(generics.ListAPIView):
    """Toutes les transactions du client, toutes commandes confondues."""
    serializer_class = PaymentTransactionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = PaymentTransaction.objects.select_related("order").filter(order__user=self.request.user)
        wanted = self.request.query_params.get("status")
        if wanted:
            qs = qs.filter(status=wanted.upper())
        return qs.order_by("-created_at")


@extend_schema(
    tags=["Payments"],
    summary="(DEV) Simuler un paiement réussi",
    responses={200: PaymentTransactionSerializer},
)
class PaymentSimulateSuccessView(APIView):
    """
    DEV ONLY — en prod ce rôle est joué par le webhook opérateur.
    Met à jour la transaction ET la commande.
    """
    permission_classes = [AllowAny] if settings.DEBUG else [IsAuthenticated]

    def post(self, request, id):
        tx = get_object_or_404(PaymentTransaction.objects.select_related("order"), id=id)

        if tx.status != PaymentTransaction.Status.SUCCESS:
            tx.status = PaymentTransaction.Status.SUCCESS
            tx.raw_payload = {**(tx.raw_payload or {}), "dev_simulated": True}
            tx.save(update_fields=["status", "raw_payload", "updated_at"])

        _sync_order_payment_status(tx)
        return Response(PaymentTransactionSerializer(tx).data, status=status.HTTP_200_OK)


@extend_schema(
    tags=["Payments"],
    summary="(DEV) Simuler un paiement échoué",
    responses={200: PaymentTransactionSerializer},
)
class PaymentSimulateFailureView(APIView):
    permission_classes = [AllowAny] if settings.DEBUG else [IsAuthenticated]

    def post(self, request, id):
        tx = get_object_or_404(PaymentTransaction.objects.select_related("order"), id=id)
        tx.status = PaymentTransaction.Status.FAILED
        tx.raw_payload = {
            **(tx.raw_payload or {}),
            "dev_simulated": True,
            "failure_code": request.data.get("code", "4001"),
            "failure_reason": request.data.get("reason", "Solde insuffisant"),
        }
        tx.save(update_fields=["status", "raw_payload", "updated_at"])
        _sync_order_payment_status(tx)
        return Response(PaymentTransactionSerializer(tx).data, status=status.HTTP_200_OK)
