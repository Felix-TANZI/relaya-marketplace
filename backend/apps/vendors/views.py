# backend/apps/vendors/views.py
# Vues pour l'espace vendeur

from rest_framework import status, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiParameter
from django.db.models import Sum
from django.contrib.auth.models import User
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from django.utils import timezone

from .models import VendorProfile
from .serializers import (
    VendorProfileSerializer, 
    VendorApplicationSerializer,
    VendorStatsSerializer,
    VendorOrderSerializer,
    UpdateFulfillmentStatusSerializer,
    UpdatePaymentStatusSerializer,
)
from apps.catalog.models import Product, ProductImage
from apps.catalog.serializers import ProductImageSerializer, ProductSerializer, ProductCreateUpdateSerializer
from apps.orders.models import Order, OrderItem


#  PROFIL VENDEUR 

@extend_schema(
    tags=["Vendors"],
    summary="Apply to become a vendor",
    request=VendorApplicationSerializer,
    responses={201: VendorProfileSerializer}
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def apply_vendor(request):
    """Demande pour devenir vendeur"""
    serializer = VendorApplicationSerializer(data=request.data, context={'request': request})
    serializer.is_valid(raise_exception=True)
    vendor_profile = serializer.save()
    
    return Response(
        VendorProfileSerializer(vendor_profile).data,
        status=status.HTTP_201_CREATED
    )


@extend_schema(
    tags=["Vendors"],
    summary="Get current vendor profile",
    responses={200: VendorProfileSerializer}
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def vendor_profile(request):
    """Récupérer le profil vendeur de l'utilisateur connecté"""
    try:
        profile = VendorProfile.objects.get(user=request.user)
        return Response(VendorProfileSerializer(profile).data)
    except VendorProfile.DoesNotExist:
        return Response(
            {'detail': 'Profil vendeur introuvable.'},
            status=status.HTTP_404_NOT_FOUND
        )


@extend_schema(
    tags=["Vendors"],
    summary="Get vendor dashboard stats",
    responses={200: VendorStatsSerializer}
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def vendor_stats(request):
    """Statistiques du vendeur"""
    try:
        vendor_profile = VendorProfile.objects.get(user=request.user)
        
        if not vendor_profile.is_active_vendor:
            return Response(
                {'detail': 'Votre compte vendeur n\'est pas encore approuvé.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Compter les produits
        products = Product.objects.filter(vendor=request.user)
        total_products = products.count()
        active_products = products.filter(is_active=True).count()
        
        # Compter les commandes (items vendus)
        order_items = OrderItem.objects.filter(product__vendor=request.user)
        total_orders = order_items.values('order').distinct().count()
        
        # Calculer le revenu total
        total_revenue = order_items.aggregate(
            total=Sum('line_total_xaf')
        )['total'] or 0
        
        stats = {
            'total_products': total_products,
            'active_products': active_products,
            'total_orders': total_orders,
            'total_revenue': total_revenue
        }
        
        return Response(VendorStatsSerializer(stats).data)
        
    except VendorProfile.DoesNotExist:
        return Response(
            {'detail': 'Profil vendeur introuvable.'},
            status=status.HTTP_404_NOT_FOUND
        )


#  GESTION DES PRODUITS 

class VendorProductViewSet(viewsets.ModelViewSet):
    """ViewSet pour la gestion des produits par le vendeur"""
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Retourner uniquement les produits du vendeur connecté"""
        return Product.objects.filter(vendor=self.request.user).order_by('-created_at')
    
    def get_serializer_class(self):
        """Utiliser le bon serializer selon l'action"""
        if self.action in ['create', 'update', 'partial_update']:
            return ProductCreateUpdateSerializer
        return ProductSerializer
    
    def get_serializer_context(self):
        """Ajouter stock_quantity au contexte"""
        context = super().get_serializer_context()
        if self.action in ['create', 'update', 'partial_update']:
            stock_quantity = self.request.data.get('stock_quantity', 0)
            context['stock_quantity'] = int(stock_quantity) if stock_quantity else 0
        return context
    
    def perform_create(self, serializer):
        """Assigner le vendeur lors de la création"""
        try:
            vendor_profile = VendorProfile.objects.get(user=self.request.user)
            if not vendor_profile.is_active_vendor:
                raise PermissionError("Votre compte vendeur n'est pas encore approuvé.")
        except VendorProfile.DoesNotExist:
            raise PermissionError("Vous devez être vendeur pour créer des produits.")
        
        serializer.save(vendor=self.request.user)


@extend_schema(
    tags=["Vendors"],
    summary="Upload product image",
    responses={201: ProductImageSerializer}
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_product_image(request, product_id):
    """Télécharger une image pour un produit"""
    try:
        product = Product.objects.get(id=product_id, vendor=request.user)
    except Product.DoesNotExist:
        return Response(
            {'detail': 'Produit introuvable.'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    serializer = ProductImageSerializer(data=request.data, context={'product': product})
    serializer.is_valid(raise_exception=True)
    image = serializer.save()
    
    return Response(
        ProductImageSerializer(image).data,
        status=status.HTTP_201_CREATED
    )


@extend_schema(
    tags=["Vendors"],
    summary="Delete product image",
    responses={204: None}
)
@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_product_image(request, product_id, image_id):
    """Supprimer une image d'un produit"""
    try:
        image = ProductImage.objects.get(
            id=image_id,
            product_id=product_id,
            product__vendor=request.user
        )
    except ProductImage.DoesNotExist:
        return Response(
            {'detail': 'Image introuvable.'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    image.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema(
    tags=["Vendors"],
    summary="Set primary product image",
    responses={200: ProductImageSerializer}
)
@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def set_primary_image(request, product_id, image_id):
    """Définir une image comme principale"""
    try:
        product = Product.objects.get(id=product_id, vendor=request.user)
        image = ProductImage.objects.get(id=image_id, product=product)
    except (Product.DoesNotExist, ProductImage.DoesNotExist):
        return Response(
            {'detail': 'Image ou produit introuvable.'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Retirer is_primary des autres images
    ProductImage.objects.filter(product=product).update(is_primary=False)
    
    # Définir comme principale
    image.is_primary = True
    image.save()
    
    return Response(ProductImageSerializer(image).data)


#  GESTION DES COMMANDES 

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
def vendor_orders(request):
    """Liste des commandes contenant des produits du vendeur"""
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
            orders = orders.filter(payment_status=payment_status)
        
        # Filtrer par statut de livraison si demandé
        fulfillment_status = request.query_params.get('fulfillment_status')
        if fulfillment_status:
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
    description="Récupère le détail d'une commande spécifique",
    responses={200: VendorOrderSerializer}
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def vendor_order_detail(request, order_id):
    """Détail d'une commande spécifique"""
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
    summary="Update order status (legacy)",
    description="Ancien endpoint pour mettre à jour le statut d'une commande",
    responses={200: VendorOrderSerializer}
)
@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_order_status(request, order_id):
    """Ancien endpoint - conservé pour compatibilité"""
    try:
        vendor_profile = VendorProfile.objects.get(user=request.user)
        
        if not vendor_profile.is_active_vendor:
            return Response(
                {'detail': 'Votre compte vendeur n\'est pas encore approuvé.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        order = Order.objects.filter(
            id=order_id,
            items__product__vendor=request.user
        ).distinct().first()
        
        if not order:
            return Response(
                {'detail': 'Commande introuvable.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        new_status = request.data.get('status')
        if not new_status:
            return Response(
                {'detail': 'Le statut est requis.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Pour l'instant, on garde l'ancien système
        # TODO: migrer vers fulfillment_status
        
        serializer = VendorOrderSerializer(order, context={'request': request, 'vendor': request.user})
        return Response(serializer.data)
        
    except VendorProfile.DoesNotExist:
        return Response(
            {'detail': 'Profil vendeur introuvable.'},
            status=status.HTTP_404_NOT_FOUND
        )


#  NOUVEAUX ENDPOINTS (SÉPARATION PAIEMENT/LIVRAISON) 

@extend_schema(
    tags=["Vendors"],
    summary="Update order fulfillment status",
    description="Met à jour le statut de livraison d'une commande",
    request=UpdateFulfillmentStatusSerializer,
    responses={200: VendorOrderSerializer}
)
@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_fulfillment_status(request, order_id):
    """Met à jour le statut de livraison d'une commande"""
    try:
        vendor_profile = VendorProfile.objects.get(user=request.user)
        
        if not vendor_profile.is_active_vendor:
            return Response(
                {'detail': 'Votre compte vendeur n\'est pas encore approuvé.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
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
    description="Met à jour le statut de paiement d'une commande",
    request=UpdatePaymentStatusSerializer,
    responses={200: VendorOrderSerializer}
)
@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_payment_status(request, order_id):
    """Met à jour le statut de paiement d'une commande"""
    try:
        vendor_profile = VendorProfile.objects.get(user=request.user)
        
        if not vendor_profile.is_active_vendor:
            return Response(
                {'detail': 'Votre compte vendeur n\'est pas encore approuvé.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
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
    
#  ADMINISTRATION VENDEURS 

@extend_schema(
    tags=["Admin - Vendors"],
    summary="Liste tous les vendeurs (admin seulement)",
    parameters=[
        OpenApiParameter(
            name='status',
            description='Filtrer par statut : PENDING, APPROVED, REJECTED, SUSPENDED',
            required=False,
            type=str
        ),
    ],
    responses={200: VendorProfileSerializer(many=True)}
)
@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_list_vendors(request):
    """Liste tous les vendeurs avec filtre optionnel par statut"""
    vendors = VendorProfile.objects.all().select_related('user').order_by('-created_at')
    
    # Filtre optionnel par statut
    status = request.query_params.get('status')
    if status:
        vendors = vendors.filter(status=status)
    
    serializer = VendorProfileSerializer(vendors, many=True)
    return Response(serializer.data)


@extend_schema(
    tags=["Admin - Vendors"],
    summary="Approuver un vendeur",
    responses={200: VendorProfileSerializer}
)
@api_view(['POST'])
@permission_classes([IsAdminUser])
def admin_approve_vendor(request, vendor_id):
    """Approuver une demande vendeur"""
    try:
        vendor = VendorProfile.objects.get(id=vendor_id)
    except VendorProfile.DoesNotExist:
        return Response(
            {'detail': 'Vendeur introuvable.'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    vendor.status = VendorProfile.Status.APPROVED
    vendor.approved_at = timezone.now()
    vendor.save()
    
    return Response(VendorProfileSerializer(vendor).data)


@extend_schema(
    tags=["Admin - Vendors"],
    summary="Rejeter un vendeur",
    responses={200: VendorProfileSerializer}
)
@api_view(['POST'])
@permission_classes([IsAdminUser])
def admin_reject_vendor(request, vendor_id):
    """Rejeter une demande vendeur"""
    try:
        vendor = VendorProfile.objects.get(id=vendor_id)
    except VendorProfile.DoesNotExist:
        return Response(
            {'detail': 'Vendeur introuvable.'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    vendor.status = VendorProfile.Status.REJECTED
    vendor.save()
    
    return Response(VendorProfileSerializer(vendor).data)


@extend_schema(
    tags=["Admin - Vendors"],
    summary="Suspendre un vendeur",
    responses={200: VendorProfileSerializer}
)
@api_view(['POST'])
@permission_classes([IsAdminUser])
def admin_suspend_vendor(request, vendor_id):
    """Suspendre un vendeur"""
    try:
        vendor = VendorProfile.objects.get(id=vendor_id)
    except VendorProfile.DoesNotExist:
        return Response(
            {'detail': 'Vendeur introuvable.'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    vendor.status = VendorProfile.Status.SUSPENDED
    vendor.save()
    
    return Response(VendorProfileSerializer(vendor).data)


@extend_schema(
    tags=["Admin - Vendors"],
    summary="Détail d'un vendeur (admin)",
    responses={200: VendorProfileSerializer}
)
@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_vendor_detail(request, vendor_id):
    """Récupérer les détails d'un vendeur"""
    try:
        vendor = VendorProfile.objects.select_related('user').get(id=vendor_id)
    except VendorProfile.DoesNotExist:
        return Response(
            {'detail': 'Vendeur introuvable.'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    return Response(VendorProfileSerializer(vendor).data)    