# backend/apps/vendors/views.py
# Vues pour l'interface vendeur avec gestion des statuts de paiement et livraison

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from drf_spectacular.utils import extend_schema, OpenApiParameter

from apps.orders.models import Order
from apps.vendors.models import VendorProfile
from .serializers import (
    VendorOrderSerializer,
    UpdateFulfillmentStatusSerializer,
    UpdatePaymentStatusSerializer
)


@extend_schema(
    tags=["Vendors"],
    summary="Get vendor orders",
    description="Récupère toutes les commandes contenant au moins un produit du vendeur",
    parameters=[
        OpenApiParameter(
            name='payment_status',
            description='Filtrer par statut de paiement : PENDING, PAID, FAILED, REFUNDED',
            required=False,
            type=str
        ),
        OpenApiParameter(
            name='fulfillment_status',
            description='Filtrer par statut de livraison : PENDING, PROCESSING, SHIPPED, DELIVERED, CANCELLED',
            required=False,
            type=str
        ),
    ],
    responses={200: VendorOrderSerializer(many=True)}
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_vendor_orders(request):
    """
    Récupère toutes les commandes contenant au moins un produit du vendeur
    avec possibilité de filtrer par statut de paiement et/ou de livraison
    """
    try:
        vendor_profile = VendorProfile.objects.get(user=request.user)
        
        if not vendor_profile.is_active_vendor:
            return Response(
                {'detail': 'Votre compte vendeur n\'est pas encore approuvé.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Récupérer toutes les commandes contenant au moins un produit du vendeur
        orders = Order.objects.filter(
            items__product__vendor=request.user
        ).distinct().order_by('-created_at')
        
        # Filtrer par statut de paiement si demandé
        payment_status = request.query_params.get('payment_status')
        if payment_status:
            if payment_status not in dict(Order.PaymentStatus.choices):
                return Response(
                    {'detail': f'Statut de paiement invalide. Valeurs possibles : {", ".join(dict(Order.PaymentStatus.choices).keys())}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            orders = orders.filter(payment_status=payment_status)
        
        # Filtrer par statut de livraison si demandé
        fulfillment_status = request.query_params.get('fulfillment_status')
        if fulfillment_status:
            if fulfillment_status not in dict(Order.FulfillmentStatus.choices):
                return Response(
                    {'detail': f'Statut de livraison invalide. Valeurs possibles : {", ".join(dict(Order.FulfillmentStatus.choices).keys())}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            orders = orders.filter(fulfillment_status=fulfillment_status)
        
        serializer = VendorOrderSerializer(
            orders,
            many=True,
            context={'request': request, 'vendor': request.user}
        )
        return Response(serializer.data)
        
    except VendorProfile.DoesNotExist:
        return Response(
            {'detail': 'Profil vendeur introuvable.'},
            status=status.HTTP_404_NOT_FOUND
        )


@extend_schema(
    tags=["Vendors"],
    summary="Get vendor order detail",
    description="Récupère le détail d'une commande spécifique contenant au moins un produit du vendeur",
    responses={200: VendorOrderSerializer}
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_vendor_order_detail(request, order_id):
    """Récupère le détail d'une commande spécifique"""
    try:
        vendor_profile = VendorProfile.objects.get(user=request.user)
        
        if not vendor_profile.is_active_vendor:
            return Response(
                {'detail': 'Votre compte vendeur n\'est pas encore approuvé.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Vérifier que la commande contient au moins un produit du vendeur
        order = Order.objects.filter(
            id=order_id,
            items__product__vendor=request.user
        ).distinct().first()
        
        if not order:
            return Response(
                {'detail': 'Commande introuvable ou ne contient pas vos produits.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = VendorOrderSerializer(
            order,
            context={'request': request, 'vendor': request.user}
        )
        return Response(serializer.data)
        
    except VendorProfile.DoesNotExist:
        return Response(
            {'detail': 'Profil vendeur introuvable.'},
            status=status.HTTP_404_NOT_FOUND
        )


@extend_schema(
    tags=["Vendors"],
    summary="Update order fulfillment status",
    description="Met à jour le statut de livraison d'une commande (PENDING, PROCESSING, SHIPPED, DELIVERED, CANCELLED)",
    request=UpdateFulfillmentStatusSerializer,
    responses={200: VendorOrderSerializer}
)
@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_fulfillment_status(request, order_id):
    """
    Met à jour le statut de livraison d'une commande
    Le vendeur ne peut modifier que le fulfillment_status, pas le payment_status
    """
    try:
        vendor_profile = VendorProfile.objects.get(user=request.user)
        
        if not vendor_profile.is_active_vendor:
            return Response(
                {'detail': 'Votre compte vendeur n\'est pas encore approuvé.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Vérifier que la commande contient au moins un produit du vendeur
        order = Order.objects.filter(
            id=order_id,
            items__product__vendor=request.user
        ).distinct().first()
        
        if not order:
            return Response(
                {'detail': 'Commande introuvable ou ne contient pas vos produits.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = UpdateFulfillmentStatusSerializer(
            order,
            data=request.data,
            context={'order': order}
        )
        
        if serializer.is_valid():
            serializer.save()
            
            # Retourner la commande mise à jour
            result_serializer = VendorOrderSerializer(
                order,
                context={'request': request, 'vendor': request.user}
            )
            return Response(result_serializer.data)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
    except VendorProfile.DoesNotExist:
        return Response(
            {'detail': 'Profil vendeur introuvable.'},
            status=status.HTTP_404_NOT_FOUND
        )


@extend_schema(
    tags=["Vendors"],
    summary="Update order payment status",
    description="Met à jour le statut de paiement d'une commande (PENDING, PAID, FAILED, REFUNDED). Utilisé principalement pour marquer manuellement une commande comme payée.",
    request=UpdatePaymentStatusSerializer,
    responses={200: VendorOrderSerializer}
)
@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_payment_status(request, order_id):
    """
    Met à jour le statut de paiement d'une commande
    Principalement utilisé pour marquer manuellement une commande comme payée
    """
    try:
        vendor_profile = VendorProfile.objects.get(user=request.user)
        
        if not vendor_profile.is_active_vendor:
            return Response(
                {'detail': 'Votre compte vendeur n\'est pas encore approuvé.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Vérifier que la commande contient au moins un produit du vendeur
        order = Order.objects.filter(
            id=order_id,
            items__product__vendor=request.user
        ).distinct().first()
        
        if not order:
            return Response(
                {'detail': 'Commande introuvable ou ne contient pas vos produits.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = UpdatePaymentStatusSerializer(
            order,
            data=request.data,
            context={'order': order}
        )
        
        if serializer.is_valid():
            serializer.save()
            
            # Retourner la commande mise à jour
            result_serializer = VendorOrderSerializer(
                order,
                context={'request': request, 'vendor': request.user}
            )
            return Response(result_serializer.data)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
    except VendorProfile.DoesNotExist:
        return Response(
            {'detail': 'Profil vendeur introuvable.'},
            status=status.HTTP_404_NOT_FOUND
        )