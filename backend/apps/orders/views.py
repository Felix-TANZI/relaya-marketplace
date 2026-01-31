from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated  # ✅ DÉJÀ IMPORTÉ
from drf_spectacular.utils import extend_schema

from .models import Order
from .serializers import OrderCreateSerializer, OrderDetailSerializer


@extend_schema(
    tags=["Orders"],
    summary="Créer une commande (checkout)",
    request=OrderCreateSerializer,
    responses={201: OrderDetailSerializer},
)
class OrderCreateView(generics.CreateAPIView):
    serializer_class = OrderCreateSerializer
    permission_classes = [IsAuthenticated]  # ✅ AJOUTÉ : Exiger authentification

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)

        order = serializer.save()

        out = OrderDetailSerializer(order)
        return Response(out.data, status=status.HTTP_201_CREATED)


@extend_schema(tags=["Orders"], summary="Détails commande")
class OrderDetailView(generics.RetrieveAPIView):
    queryset = Order.objects.all().prefetch_related("items")
    serializer_class = OrderDetailSerializer
    lookup_field = "id"


@extend_schema(
    tags=["Orders"],
    summary="Mes commandes",
    description="Liste des commandes de l'utilisateur connecté"
)
class MyOrdersView(generics.ListAPIView):
    serializer_class = OrderDetailSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user).prefetch_related("items").order_by("-created_at")