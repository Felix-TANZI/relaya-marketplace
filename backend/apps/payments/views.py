from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from drf_spectacular.utils import extend_schema, OpenApiParameter

from .serializers import PaymentInitSerializer, PaymentTransactionSerializer
from .models import PaymentTransaction


@extend_schema(
    tags=["Payments"],
    summary="Initier un paiement (mock v1)",
    request=PaymentInitSerializer,
    responses={201: PaymentTransactionSerializer},
)
class PaymentInitView(generics.CreateAPIView):
    serializer_class = PaymentInitSerializer

    def create(self, request, *args, **kwargs):
        """
        V1 (mock) :
        - Crée une transaction INITIATED
        - Plus tard : intégration provider réelle (MTN/Orange) + webhook (callback) pour MAJ status
        """
        s = self.get_serializer(data=request.data)
        s.is_valid(raise_exception=True)
        tx = s.save()
        return Response(PaymentTransactionSerializer(tx).data, status=status.HTTP_201_CREATED)


@extend_schema(tags=["Payments"], summary="Détails transaction")
class PaymentDetailView(generics.RetrieveAPIView):
    queryset = PaymentTransaction.objects.all()
    serializer_class = PaymentTransactionSerializer
    lookup_field = "id"


@extend_schema(
    tags=["Payments"],
    summary="Lister les transactions d'une commande",
    parameters=[OpenApiParameter(name="order_id", required=True, type=int, location=OpenApiParameter.QUERY)],
)
class PaymentListByOrderView(generics.ListAPIView):
    serializer_class = PaymentTransactionSerializer

    def get_queryset(self):
        """
        Retourne toutes les transactions associées à une commande.
        """
        order_id = self.request.query_params.get("order_id")
        return PaymentTransaction.objects.filter(order_id=order_id).order_by("-created_at")


@extend_schema(
    tags=["Payments"],
    summary="(DEV) Simuler un paiement réussi",
    responses={200: PaymentTransactionSerializer},
)
class PaymentSimulateSuccessView(APIView):
    """
    DEV ONLY:
    - Permet de tester le workflow "PAID" sans provider réel.
    - En prod, ce rôle sera joué par le webhook provider (callback).
    """

    permission_classes = [AllowAny]

    def post(self, request, id):
        tx = PaymentTransaction.objects.get(id=id)

        # Si déjà SUCCESS, on renvoie juste l'état actuel (idempotent)
        if tx.status == PaymentTransaction.Status.SUCCESS:
            return Response(PaymentTransactionSerializer(tx).data, status=status.HTTP_200_OK)

        tx.status = PaymentTransaction.Status.SUCCESS
        tx.raw_payload = {**(tx.raw_payload or {}), "dev_simulated": True}
        tx.save(update_fields=["status", "raw_payload", "updated_at"])

        return Response(PaymentTransactionSerializer(tx).data, status=status.HTTP_200_OK)
