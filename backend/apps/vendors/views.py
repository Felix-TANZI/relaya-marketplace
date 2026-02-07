# backend/apps/vendors/views.py
# Vues pour l'espace vendeur

from rest_framework import status, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiParameter
from django.db import models
from django.db.models import Sum, Count, Q, Avg, F
from django.contrib.auth.models import User
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from django.utils import timezone
from datetime import timedelta

from .models import VendorProfile
from .serializers import (
    VendorProfileSerializer, 
    VendorApplicationSerializer,
    VendorStatsSerializer,
    VendorOrderSerializer,
    UpdateFulfillmentStatusSerializer,
    UpdatePaymentStatusSerializer,
    AdminProductUpdateSerializer,
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


#  ADMINISTRATION - DASHBOARD GLOBAL 

@extend_schema(
    tags=["Admin"],
    summary="Get admin dashboard statistics",
    description="Statistiques globales de la plateforme (réservé admin)",
    responses={200: 'AdminDashboardStatsSerializer'}
)
@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_dashboard_stats(request):
    """
    Dashboard admin : statistiques globales de la plateforme
    Réservé aux administrateurs (is_staff=True)
    """
    from apps.vendors.serializers import AdminDashboardStatsSerializer
    
    # Calcul des dates
    now = timezone.now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = now - timedelta(days=7)
    month_start = now - timedelta(days=30)
    
    #  UTILISATEURS 
    total_users = User.objects.count()
    new_users_today = User.objects.filter(date_joined__gte=today_start).count()
    new_users_week = User.objects.filter(date_joined__gte=week_start).count()
    new_users_month = User.objects.filter(date_joined__gte=month_start).count()
    
    #  VENDEURS 
    total_vendors = VendorProfile.objects.count()
    pending_vendors = VendorProfile.objects.filter(status='PENDING').count()
    approved_vendors = VendorProfile.objects.filter(status='APPROVED').count()
    rejected_vendors = VendorProfile.objects.filter(status='REJECTED').count()
    suspended_vendors = VendorProfile.objects.filter(status='SUSPENDED').count()
    
    #  PRODUITS 
    total_products = Product.objects.count()
    active_products = Product.objects.filter(is_active=True).count()
    inactive_products = Product.objects.filter(is_active=False).count()
    
    #  COMMANDES 
    total_orders = Order.objects.count()
    pending_orders = Order.objects.filter(fulfillment_status='PENDING').count()
    processing_orders = Order.objects.filter(fulfillment_status='PROCESSING').count()
    shipped_orders = Order.objects.filter(fulfillment_status='SHIPPED').count()
    delivered_orders = Order.objects.filter(fulfillment_status='DELIVERED').count()
    cancelled_orders = Order.objects.filter(fulfillment_status='CANCELLED').count()
    
    #  REVENUS 
    revenue_total = Order.objects.filter(payment_status='PAID').aggregate(
        total=Sum('total_xaf')
    )['total'] or 0
    
    revenue_today = Order.objects.filter(
        payment_status='PAID',
        created_at__gte=today_start
    ).aggregate(total=Sum('total_xaf'))['total'] or 0
    
    revenue_week = Order.objects.filter(
        payment_status='PAID',
        created_at__gte=week_start
    ).aggregate(total=Sum('total_xaf'))['total'] or 0
    
    revenue_month = Order.objects.filter(
        payment_status='PAID',
        created_at__gte=month_start
    ).aggregate(total=Sum('total_xaf'))['total'] or 0
    
    #  PAIEMENTS 
    paid_orders = Order.objects.filter(payment_status='PAID').count()
    unpaid_orders = Order.objects.filter(payment_status='PENDING').count()
    failed_payments = Order.objects.filter(payment_status='FAILED').count()
    
    #  CONSTRUCTION RÉPONSE 
    stats = {
        # Utilisateurs
        'total_users': total_users,
        'new_users_today': new_users_today,
        'new_users_week': new_users_week,
        'new_users_month': new_users_month,
        
        # Vendeurs
        'total_vendors': total_vendors,
        'pending_vendors': pending_vendors,
        'approved_vendors': approved_vendors,
        'rejected_vendors': rejected_vendors,
        'suspended_vendors': suspended_vendors,
        
        # Produits
        'total_products': total_products,
        'active_products': active_products,
        'inactive_products': inactive_products,
        
        # Commandes
        'total_orders': total_orders,
        'pending_orders': pending_orders,
        'processing_orders': processing_orders,
        'shipped_orders': shipped_orders,
        'delivered_orders': delivered_orders,
        'cancelled_orders': cancelled_orders,
        
        # Revenus
        'revenue_total': revenue_total,
        'revenue_today': revenue_today,
        'revenue_week': revenue_week,
        'revenue_month': revenue_month,
        
        # Paiements
        'paid_orders': paid_orders,
        'unpaid_orders': unpaid_orders,
        'failed_payments': failed_payments,
    }
    
    serializer = AdminDashboardStatsSerializer(stats)
    return Response(serializer.data)


@extend_schema(
    tags=["Admin"],
    summary="Get admin analytics data",
    description="Données analytiques pour graphiques dashboard (réservé admin)",
    responses={200: 'AdminAnalyticsSerializer'}
)
@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_analytics(request):
    """
    Analytics admin : données pour graphiques et tableaux
    - Revenus des 30 derniers jours
    - Top 5 produits
    - Top 5 vendeurs
    - Activité récente
    - Métriques avancées
    """
    from apps.vendors.serializers import AdminAnalyticsSerializer
    from django.db.models import F, Q
    
    # Calcul des dates
    now = timezone.now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    month_ago = now - timedelta(days=30)
    two_months_ago = now - timedelta(days=60)
    
    #  REVENUS PAR JOUR (30 derniers jours) 
    revenue_chart = []
    for i in range(30):
        day = today_start - timedelta(days=29-i)
        day_end = day + timedelta(days=1)
        
        daily_revenue = Order.objects.filter(
            payment_status='PAID',
            created_at__gte=day,
            created_at__lt=day_end
        ).aggregate(total=Sum('total_xaf'))['total'] or 0
        
        revenue_chart.append({
            'date': day.date(),
            'revenue': daily_revenue
        })
    
    #  TOP 5 PRODUITS 
    top_products_data = OrderItem.objects.filter(
        order__payment_status='PAID'
    ).values(
        'product_id',
        'product__title'
    ).annotate(
        total_quantity=Sum('qty'),
        total_revenue=Sum('line_total_xaf')
    ).order_by('-total_revenue')[:5]
    
    top_products = [
        {
            'product_id': item['product_id'],
            'product_title': item['product__title'],
            'total_quantity': item['total_quantity'],
            'total_revenue': item['total_revenue']
        }
        for item in top_products_data
    ]
    
    #  TOP 5 VENDEURS 
    top_vendors_data = OrderItem.objects.filter(
        order__payment_status='PAID',
        product__vendor__isnull=False
    ).values(
        'product__vendor__id',
        'product__vendor__username',
        'product__vendor__vendor_profile__business_name'
    ).annotate(
        total_revenue=Sum('line_total_xaf'),
        total_orders=Count('order_id', distinct=True)
    ).order_by('-total_revenue')[:5]
    
    top_vendors = [
        {
            'vendor_id': item['product__vendor__id'],
            'vendor_name': item['product__vendor__username'],
            'business_name': item['product__vendor__vendor_profile__business_name'] or 'N/A',
            'total_revenue': item['total_revenue'],
            'total_orders': item['total_orders']
        }
        for item in top_vendors_data
    ]
    
    #  ACTIVITÉ RÉCENTE 
    recent_activity = []
    
    # Dernières commandes (5)
    recent_orders = Order.objects.select_related('user').order_by('-created_at')[:5]
    for order in recent_orders:
        recent_activity.append({
            'type': 'order',
            'description': f'Nouvelle commande #{order.id}',
            'timestamp': order.created_at,
            'user': order.user.username if order.user else order.customer_email or 'Invité',
            'amount': order.total_xaf
        })
    
    # Nouveaux vendeurs (5)
    recent_vendors = VendorProfile.objects.select_related('user').filter(
        status='APPROVED'
    ).order_by('-approved_at')[:5]
    for vendor in recent_vendors:
        recent_activity.append({
            'type': 'vendor',
            'description': f'Nouveau vendeur approuvé : {vendor.business_name}',
            'timestamp': vendor.approved_at or vendor.created_at,
            'user': vendor.user.username
        })
    
    # Nouveaux produits (5)
    recent_products = Product.objects.select_related('vendor').filter(
        vendor__isnull=False
    ).order_by('-created_at')[:5]
    for product in recent_products:
        recent_activity.append({
            'type': 'product',
            'description': f'Nouveau produit : {product.title}',
            'timestamp': product.created_at,
            'user': product.vendor.username if product.vendor else 'N/A'
        })
    
    # Trier par date décroissante
    recent_activity.sort(key=lambda x: x['timestamp'], reverse=True)
    recent_activity = recent_activity[:15]  # Garder les 15 plus récentes
    
    #  MÉTRIQUES AVANCÉES 
    
    # Panier moyen
    total_orders_paid = Order.objects.filter(payment_status='PAID').count()
    total_revenue_paid = Order.objects.filter(payment_status='PAID').aggregate(
        total=Sum('total_xaf')
    )['total'] or 0
    
    average_order_value = int(total_revenue_paid / total_orders_paid) if total_orders_paid > 0 else 0
    
    # Taux de conversion (commandes payées / total commandes)
    total_orders = Order.objects.count()
    conversion_rate = (total_orders_paid / total_orders * 100) if total_orders > 0 else 0
    
    # Croissance revenus (mois en cours vs mois précédent)
    revenue_current_month = Order.objects.filter(
        payment_status='PAID',
        created_at__gte=month_ago
    ).aggregate(total=Sum('total_xaf'))['total'] or 0
    
    revenue_previous_month = Order.objects.filter(
        payment_status='PAID',
        created_at__gte=two_months_ago,
        created_at__lt=month_ago
    ).aggregate(total=Sum('total_xaf'))['total'] or 0
    
    if revenue_previous_month > 0:
        total_revenue_growth = ((revenue_current_month - revenue_previous_month) / revenue_previous_month) * 100
    else:
        total_revenue_growth = 100.0 if revenue_current_month > 0 else 0.0
    
    #  CONSTRUCTION RÉPONSE 
    analytics = {
        'revenue_chart': revenue_chart,
        'top_products': top_products,
        'top_vendors': top_vendors,
        'recent_activity': recent_activity,
        'average_order_value': average_order_value,
        'conversion_rate': round(conversion_rate, 2),
        'total_revenue_growth': round(total_revenue_growth, 2)
    }
    
    serializer = AdminAnalyticsSerializer(analytics)
    return Response(serializer.data)


#  ADMINISTRATION - GESTION PRODUITS 

@extend_schema(
    tags=["Admin"],
    summary="List all products (admin)",
    description="Liste tous les produits avec filtres (réservé admin)",
    parameters=[
        OpenApiParameter(name='vendor', description='Filtrer par vendor ID', required=False, type=int),
        OpenApiParameter(name='category', description='Filtrer par category ID', required=False, type=int),
        OpenApiParameter(name='is_active', description='Filtrer par statut actif', required=False, type=bool),
        OpenApiParameter(name='search', description='Recherche par titre', required=False, type=str),
    ],
    responses={200: 'AdminProductListSerializer(many=True)'}
)
@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_list_products(request):
    """
    Liste admin de tous les produits avec filtres
    """
    from apps.vendors.serializers import AdminProductListSerializer
    
    products = Product.objects.select_related(
        'vendor', 
        'vendor__vendor_profile', 
        'category'
    ).prefetch_related('images', 'inventory')
    
    # Filtres
    vendor_id = request.query_params.get('vendor')
    if vendor_id:
        products = products.filter(vendor_id=vendor_id)
    
    category_id = request.query_params.get('category')
    if category_id:
        products = products.filter(category_id=category_id)
    
    is_active = request.query_params.get('is_active')
    if is_active is not None:
        products = products.filter(is_active=is_active.lower() == 'true')
    
    search = request.query_params.get('search')
    if search:
        products = products.filter(
            Q(title__icontains=search) | Q(description__icontains=search)
        )
    
    products = products.order_by('-created_at')
    
    serializer = AdminProductListSerializer(products, many=True, context={'request': request})
    return Response(serializer.data)


@extend_schema(
    tags=["Admin"],
    summary="Get product detail (admin)",
    description="Détail d'un produit (réservé admin)",
    responses={200: ProductSerializer}
)
@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_product_detail(request, product_id):
    """Détail d'un produit pour admin"""
    try:
        product = Product.objects.select_related('vendor', 'category').prefetch_related('images').get(id=product_id)
        serializer = ProductSerializer(product, context={'request': request})
        return Response(serializer.data)
    except Product.DoesNotExist:
        return Response(
            {'detail': 'Produit introuvable.'},
            status=status.HTTP_404_NOT_FOUND
        )


@extend_schema(
    tags=["Admin"],
    summary="Update product (admin)",
    description="Modifier un produit (réservé admin)",
    request=AdminProductUpdateSerializer,
    responses={200: ProductSerializer}
)
@api_view(['PATCH'])
@permission_classes([IsAdminUser])
def admin_update_product(request, product_id):
    """Modifier un produit (admin force)"""
    try:
        product = Product.objects.get(id=product_id)
    except Product.DoesNotExist:
        return Response(
            {'detail': 'Produit introuvable.'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    from apps.vendors.serializers import AdminProductUpdateSerializer
    serializer = AdminProductUpdateSerializer(product, data=request.data, partial=True)
    
    if serializer.is_valid():
        serializer.save()
        result_serializer = ProductSerializer(product, context={'request': request})
        return Response(result_serializer.data)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(
    tags=["Admin"],
    summary="Delete product (admin)",
    description="Supprimer définitivement un produit (réservé admin)",
    responses={204: None}
)
@api_view(['DELETE'])
@permission_classes([IsAdminUser])
def admin_delete_product(request, product_id):
    """Supprimer un produit"""
    try:
        product = Product.objects.get(id=product_id)
        product.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    except Product.DoesNotExist:
        return Response(
            {'detail': 'Produit introuvable.'},
            status=status.HTTP_404_NOT_FOUND
        )


@extend_schema(
    tags=["Admin"],
    summary="Toggle product active status (admin)",
    description="Activer/désactiver un produit (bannir) (réservé admin)",
    responses={200: ProductSerializer}
)
@api_view(['POST'])
@permission_classes([IsAdminUser])
def admin_toggle_product_status(request, product_id):
    """Activer/désactiver un produit (bannir)"""
    try:
        product = Product.objects.get(id=product_id)
        product.is_active = not product.is_active
        product.save()
        
        serializer = ProductSerializer(product, context={'request': request})
        return Response(serializer.data)
    except Product.DoesNotExist:
        return Response(
            {'detail': 'Produit introuvable.'},
            status=status.HTTP_404_NOT_FOUND
        )
    

#  ADMINISTRATION - GESTION COMMANDES 

@extend_schema(
    tags=["Admin"],
    summary="List all orders (admin)",
    description="Liste toutes les commandes avec filtres avancés",
    parameters=[
        OpenApiParameter(name='payment_status', description='Filtrer par statut paiement', required=False, type=str),
        OpenApiParameter(name='fulfillment_status', description='Filtrer par statut livraison', required=False, type=str),
        OpenApiParameter(name='vendor', description='Filtrer par vendor ID', required=False, type=int),
        OpenApiParameter(name='date_from', description='Date début (YYYY-MM-DD)', required=False, type=str),
        OpenApiParameter(name='date_to', description='Date fin (YYYY-MM-DD)', required=False, type=str),
        OpenApiParameter(name='min_amount', description='Montant minimum', required=False, type=int),
        OpenApiParameter(name='max_amount', description='Montant maximum', required=False, type=int),
        OpenApiParameter(name='search', description='Recherche (ID, email, phone, transaction)', required=False, type=str),
    ],
    responses={200: 'AdminOrderListSerializer(many=True)'}
)
@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_list_orders(request):
    """
    Liste admin de toutes les commandes avec filtres avancés
    """
    from apps.vendors.serializers import AdminOrderListSerializer
    
    orders = Order.objects.select_related('user').prefetch_related('items', 'items__product__vendor')
    
    # Filtres statuts
    payment_status = request.query_params.get('payment_status')
    if payment_status:
        orders = orders.filter(payment_status=payment_status)
    
    fulfillment_status = request.query_params.get('fulfillment_status')
    if fulfillment_status:
        orders = orders.filter(fulfillment_status=fulfillment_status)
    
    # Filtre vendeur
    vendor_id = request.query_params.get('vendor')
    if vendor_id:
        orders = orders.filter(items__product__vendor_id=vendor_id).distinct()
    
    # Filtre dates
    date_from = request.query_params.get('date_from')
    if date_from:
        orders = orders.filter(created_at__date__gte=date_from)
    
    date_to = request.query_params.get('date_to')
    if date_to:
        orders = orders.filter(created_at__date__lte=date_to)
    
    # Filtre montant
    min_amount = request.query_params.get('min_amount')
    if min_amount:
        orders = orders.filter(total_xaf__gte=int(min_amount))
    
    max_amount = request.query_params.get('max_amount')
    if max_amount:
        orders = orders.filter(total_xaf__lte=int(max_amount))
    
    # Recherche multi-critères
    search = request.query_params.get('search')
    if search:
        from apps.payments.models import PaymentTransaction
        
        # Recherche par ID commande
        if search.isdigit():
            orders = orders.filter(id=int(search))
        else:
            # Recherche par email, phone ou transaction
            orders = orders.filter(
                Q(customer_email__icontains=search) |
                Q(customer_phone__icontains=search) |
                Q(user__username__icontains=search) |
                Q(user__email__icontains=search) |
                Q(payments__external_ref__icontains=search)
            ).distinct()
    
    orders = orders.order_by('-created_at')
    
    serializer = AdminOrderListSerializer(orders, many=True, context={'request': request})
    return Response(serializer.data)


@extend_schema(
    tags=["Admin"],
    summary="Get order detail (admin)",
    description="Détail complet d'une commande avec historique",
    responses={200: 'AdminOrderDetailSerializer'}
)
@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_order_detail(request, order_id):
    """Détail complet d'une commande"""
    try:
        order = Order.objects.select_related('user').prefetch_related(
            'items',
            'items__product',
            'items__product__vendor',
            'items__product__images',
            'history',
            'payments'
        ).get(id=order_id)
        
        from apps.vendors.serializers import AdminOrderDetailSerializer
        serializer = AdminOrderDetailSerializer(order, context={'request': request})
        return Response(serializer.data)
    except Order.DoesNotExist:
        return Response(
            {'detail': 'Commande introuvable.'},
            status=status.HTTP_404_NOT_FOUND
        )


@extend_schema(
    tags=["Admin"],
    summary="Update order (admin)",
    description="Modifier une commande (statuts, note)",
    request='AdminOrderUpdateSerializer',
    responses={200: 'AdminOrderDetailSerializer'}
)
@api_view(['PATCH'])
@permission_classes([IsAdminUser])
def admin_update_order(request, order_id):
    """Modifier une commande (admin)"""
    try:
        order = Order.objects.get(id=order_id)
    except Order.DoesNotExist:
        return Response(
            {'detail': 'Commande introuvable.'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    from apps.vendors.serializers import AdminOrderUpdateSerializer, AdminOrderDetailSerializer
    from apps.orders.models import OrderHistory
    
    serializer = AdminOrderUpdateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    # Enregistrer les modifications dans l'audit log
    for field, new_value in serializer.validated_data.items():
        old_value = getattr(order, field)
        if str(old_value) != str(new_value):
            OrderHistory.objects.create(
                order=order,
                user=request.user,
                action=f"Modification {field}",
                field_name=field,
                old_value=str(old_value),
                new_value=str(new_value),
                ip_address=request.META.get('REMOTE_ADDR')
            )
            setattr(order, field, new_value)
    
    order.save()
    
    result_serializer = AdminOrderDetailSerializer(order, context={'request': request})
    return Response(result_serializer.data)


@extend_schema(
    tags=["Admin"],
    summary="Cancel order (admin)",
    description="Annuler une commande",
    responses={200: 'AdminOrderDetailSerializer'}
)
@api_view(['POST'])
@permission_classes([IsAdminUser])
def admin_cancel_order(request, order_id):
    """Annuler une commande"""
    try:
        order = Order.objects.get(id=order_id)
    except Order.DoesNotExist:
        return Response(
            {'detail': 'Commande introuvable.'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    from apps.orders.models import OrderHistory
    from apps.vendors.serializers import AdminOrderDetailSerializer
    
    # Enregistrer dans l'audit log
    OrderHistory.objects.create(
        order=order,
        user=request.user,
        action="Commande annulée par admin",
        field_name="fulfillment_status",
        old_value=order.fulfillment_status,
        new_value="CANCELLED",
        ip_address=request.META.get('REMOTE_ADDR')
    )
    
    order.fulfillment_status = 'CANCELLED'
    order.save()
    
    serializer = AdminOrderDetailSerializer(order, context={'request': request})
    return Response(serializer.data)


@extend_schema(
    tags=["Admin"],
    summary="Export orders to CSV",
    description="Exporter les commandes en CSV",
    responses={200: 'CSV file'}
)
@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_export_orders_csv(request):
    """Export CSV des commandes"""
    import csv
    from django.http import HttpResponse
    
    orders = Order.objects.select_related('user').prefetch_related('items').order_by('-created_at')
    
    # Appliquer les mêmes filtres que list
    payment_status = request.query_params.get('payment_status')
    if payment_status:
        orders = orders.filter(payment_status=payment_status)
    
    fulfillment_status = request.query_params.get('fulfillment_status')
    if fulfillment_status:
        orders = orders.filter(fulfillment_status=fulfillment_status)
    
    response = HttpResponse(content_type='text/csv; charset=utf-8')
    response['Content-Disposition'] = f'attachment; filename="commandes_{timezone.now().strftime("%Y%m%d_%H%M%S")}.csv"'
    
    # BOM UTF-8 pour Excel
    response.write('\ufeff')
    
    writer = csv.writer(response)
    writer.writerow([
        'ID Commande', 'Date', 'Client', 'Email', 'Téléphone',
        'Ville', 'Adresse', 'Statut Paiement', 'Statut Livraison',
        'Sous-total', 'Livraison', 'Total', 'Nb Articles'
    ])
    
    for order in orders:
        customer_name = "Invité"
        if order.user:
            customer_name = f"{order.user.first_name} {order.user.last_name}".strip() or order.user.username
        
        writer.writerow([
            order.id,
            order.created_at.strftime('%Y-%m-%d %H:%M'),
            customer_name,
            order.customer_email or '',
            order.customer_phone,
            order.city,
            order.address,
            order.get_payment_status_display(),
            order.get_fulfillment_status_display(),
            order.subtotal_xaf,
            order.delivery_fee_xaf,
            order.total_xaf,
            order.items.count()
        ])
    
    return response    


#  ADMINISTRATION - GESTION UTILISATEURS 

@extend_schema(
    tags=["Admin"],
    summary="List all users (admin)",
    description="Liste tous les utilisateurs avec filtres",
    parameters=[
        OpenApiParameter(name='role', description='Filtrer par rôle (vendor/admin/customer)', required=False, type=str),
        OpenApiParameter(name='is_banned', description='Filtrer par statut ban', required=False, type=bool),
        OpenApiParameter(name='is_active', description='Filtrer par statut actif', required=False, type=bool),
        OpenApiParameter(name='date_from', description='Date inscription début', required=False, type=str),
        OpenApiParameter(name='date_to', description='Date inscription fin', required=False, type=str),
        OpenApiParameter(name='search', description='Recherche (username, email, nom)', required=False, type=str),
    ],
    responses={200: 'AdminUserListSerializer(many=True)'}
)
@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_list_users(request):
    """Liste admin de tous les utilisateurs"""
    from apps.vendors.serializers import AdminUserListSerializer
    from apps.accounts.models import UserProfile
    
    users = User.objects.select_related('vendor_profile').prefetch_related('orders')
    
    # Filtre par rôle
    role = request.query_params.get('role')
    if role == 'vendor':
        users = users.filter(vendor_profile__isnull=False)
    elif role == 'admin':
        users = users.filter(is_staff=True)
    elif role == 'customer':
        users = users.filter(vendor_profile__isnull=True, is_staff=False)
    
    # Filtre actif/inactif
    is_active = request.query_params.get('is_active')
    if is_active is not None:
        users = users.filter(is_active=is_active.lower() == 'true')
    
    # Filtre banni
    is_banned = request.query_params.get('is_banned')
    if is_banned is not None:
        # Créer les profils manquants si nécessaire
        for user in users:
            UserProfile.objects.get_or_create(user=user)
        
        if is_banned.lower() == 'true':
            users = users.filter(profile__is_banned=True)
        else:
            users = users.filter(Q(profile__is_banned=False) | Q(profile__isnull=True))
    
    # Filtre dates
    date_from = request.query_params.get('date_from')
    if date_from:
        users = users.filter(date_joined__date__gte=date_from)
    
    date_to = request.query_params.get('date_to')
    if date_to:
        users = users.filter(date_joined__date__lte=date_to)
    
    # Recherche
    search = request.query_params.get('search')
    if search:
        users = users.filter(
            Q(username__icontains=search) |
            Q(email__icontains=search) |
            Q(first_name__icontains=search) |
            Q(last_name__icontains=search)
        )
    
    users = users.order_by('-date_joined')
    
    serializer = AdminUserListSerializer(users, many=True)
    return Response(serializer.data)


@extend_schema(
    tags=["Admin"],
    summary="Get user detail (admin)",
    description="Détail complet d'un utilisateur",
    responses={200: 'AdminUserDetailSerializer'}
)
@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_user_detail(request, user_id):
    """Détail complet d'un utilisateur"""
    try:
        user = User.objects.prefetch_related(
            'vendor_profile',
            'profile',
            'activity_logs',
            'orders'
        ).get(id=user_id)
        
        from apps.vendors.serializers import AdminUserDetailSerializer
        serializer = AdminUserDetailSerializer(user)
        return Response(serializer.data)
    except User.DoesNotExist:
        return Response(
            {'detail': 'Utilisateur introuvable.'},
            status=status.HTTP_404_NOT_FOUND
        )


@extend_schema(
    tags=["Admin"],
    summary="Update user (admin)",
    description="Modifier un utilisateur",
    request='AdminUserUpdateSerializer',
    responses={200: 'AdminUserDetailSerializer'}
)
@api_view(['PATCH'])
@permission_classes([IsAdminUser])
def admin_update_user(request, user_id):
    """Modifier un utilisateur"""
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response(
            {'detail': 'Utilisateur introuvable.'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    from apps.vendors.serializers import AdminUserUpdateSerializer, AdminUserDetailSerializer
    from apps.accounts.models import UserActivityLog
    
    serializer = AdminUserUpdateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    # Enregistrer les modifications
    for field, new_value in serializer.validated_data.items():
        old_value = getattr(user, field)
        if old_value != new_value:
            UserActivityLog.objects.create(
                user=user,
                action=f"Modification {field}",
                description=f"Changé de '{old_value}' à '{new_value}'",
                performed_by=request.user,
                ip_address=request.META.get('REMOTE_ADDR')
            )
            setattr(user, field, new_value)
    
    user.save()
    
    result_serializer = AdminUserDetailSerializer(user)
    return Response(result_serializer.data)


@extend_schema(
    tags=["Admin"],
    summary="Ban user (admin)",
    description="Bannir un utilisateur",
    responses={200: 'AdminUserDetailSerializer'}
)
@api_view(['POST'])
@permission_classes([IsAdminUser])
def admin_ban_user(request, user_id):
    """Bannir un utilisateur"""
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response(
            {'detail': 'Utilisateur introuvable.'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    from apps.accounts.models import UserProfile, UserActivityLog
    from apps.vendors.serializers import AdminUserDetailSerializer
    
    reason = request.data.get('reason', 'Aucune raison spécifiée')
    
    # Créer ou mettre à jour le profil
    profile, _ = UserProfile.objects.get_or_create(user=user)
    profile.is_banned = True
    profile.ban_reason = reason
    profile.banned_at = timezone.now()
    profile.banned_by = request.user
    profile.save()
    
    # Désactiver le compte
    user.is_active = False
    user.save()
    
    # Log
    UserActivityLog.objects.create(
        user=user,
        action="Compte banni",
        description=f"Raison: {reason}",
        performed_by=request.user,
        ip_address=request.META.get('REMOTE_ADDR')
    )
    
    serializer = AdminUserDetailSerializer(user)
    return Response(serializer.data)


@extend_schema(
    tags=["Admin"],
    summary="Unban user (admin)",
    description="Débannir un utilisateur",
    responses={200: 'AdminUserDetailSerializer'}
)
@api_view(['POST'])
@permission_classes([IsAdminUser])
def admin_unban_user(request, user_id):
    """Débannir un utilisateur"""
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response(
            {'detail': 'Utilisateur introuvable.'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    from apps.accounts.models import UserProfile, UserActivityLog
    from apps.vendors.serializers import AdminUserDetailSerializer
    
    if hasattr(user, 'profile'):
        user.profile.is_banned = False
        user.profile.ban_reason = None
        user.profile.banned_at = None
        user.profile.banned_by = None
        user.profile.save()
    
    # Réactiver le compte
    user.is_active = True
    user.save()
    
    # Log
    UserActivityLog.objects.create(
        user=user,
        action="Compte débanni",
        description="Accès restauré",
        performed_by=request.user,
        ip_address=request.META.get('REMOTE_ADDR')
    )
    
    serializer = AdminUserDetailSerializer(user)
    return Response(serializer.data)


@extend_schema(
    tags=["Admin"],
    summary="Delete user (admin)",
    description="Supprimer définitivement un utilisateur",
    responses={204: None}
)
@api_view(['DELETE'])
@permission_classes([IsAdminUser])
def admin_delete_user(request, user_id):
    """Supprimer un utilisateur"""
    try:
        user = User.objects.get(id=user_id)
        
        # Empêcher de se supprimer soi-même
        if user.id == request.user.id:
            return Response(
                {'detail': 'Vous ne pouvez pas supprimer votre propre compte.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    except User.DoesNotExist:
        return Response(
            {'detail': 'Utilisateur introuvable.'},
            status=status.HTTP_404_NOT_FOUND
        )


@extend_schema(
    tags=["Admin"],
    summary="Export users to CSV",
    description="Exporter les utilisateurs en CSV",
    responses={200: 'CSV file'}
)
@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_export_users_csv(request):
    """Export CSV des utilisateurs"""
    import csv
    from django.http import HttpResponse
    
    users = User.objects.select_related('vendor_profile', 'profile').order_by('-date_joined')
    
    # Appliquer filtres
    role = request.query_params.get('role')
    if role == 'vendor':
        users = users.filter(vendor_profile__isnull=False)
    elif role == 'admin':
        users = users.filter(is_staff=True)
    
    response = HttpResponse(content_type='text/csv; charset=utf-8')
    response['Content-Disposition'] = f'attachment; filename="utilisateurs_{timezone.now().strftime("%Y%m%d_%H%M%S")}.csv"'
    
    response.write('\ufeff')
    
    writer = csv.writer(response)
    writer.writerow([
        'ID', 'Username', 'Email', 'Prénom', 'Nom',
        'Rôle', 'Actif', 'Banni', 'Date Inscription', 'Dernière Connexion'
    ])
    
    for user in users:
        role_display = "Admin" if user.is_staff else ("Vendeur" if hasattr(user, 'vendor_profile') else "Client")
        is_banned = user.profile.is_banned if hasattr(user, 'profile') else False
        
        writer.writerow([
            user.id,
            user.username,
            user.email,
            user.first_name,
            user.last_name,
            role_display,
            "Oui" if user.is_active else "Non",
            "Oui" if is_banned else "Non",
            user.date_joined.strftime('%Y-%m-%d %H:%M'),
            user.last_login.strftime('%Y-%m-%d %H:%M') if user.last_login else 'Jamais',
        ])
    
    return response


#  ADMINISTRATION - GESTION LITIGES 

@extend_schema(
    tags=["Admin"],
    summary="List all disputes (admin)",
    description="Liste tous les litiges avec filtres",
    parameters=[
        OpenApiParameter(name='status', description='Filtrer par statut', required=False, type=str),
        OpenApiParameter(name='reason', description='Filtrer par motif', required=False, type=str),
        OpenApiParameter(name='order', description='Filtrer par order ID', required=False, type=int),
        OpenApiParameter(name='search', description='Recherche (order ID, email)', required=False, type=str),
    ],
    responses={200: 'AdminDisputeListSerializer(many=True)'}
)
@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_list_disputes(request):
    """Liste admin de tous les litiges"""
    from apps.orders.models import Dispute
    from apps.vendors.serializers import AdminDisputeListSerializer
    
    disputes = Dispute.objects.select_related(
        'order', 
        'order__user', 
        'opened_by'
    ).prefetch_related('messages')
    
    # Filtres
    status = request.query_params.get('status')
    if status:
        disputes = disputes.filter(status=status)
    
    reason = request.query_params.get('reason')
    if reason:
        disputes = disputes.filter(reason=reason)
    
    order_id = request.query_params.get('order')
    if order_id:
        disputes = disputes.filter(order_id=order_id)
    
    # Recherche
    search = request.query_params.get('search')
    if search:
        if search.isdigit():
            disputes = disputes.filter(Q(id=int(search)) | Q(order_id=int(search)))
        else:
            disputes = disputes.filter(
                Q(order__customer_email__icontains=search) |
                Q(opened_by__username__icontains=search)
            )
    
    disputes = disputes.order_by('-created_at')
    
    serializer = AdminDisputeListSerializer(disputes, many=True)
    return Response(serializer.data)


@extend_schema(
    tags=["Admin"],
    summary="Get dispute detail (admin)",
    description="Détail complet d'un litige",
    responses={200: 'AdminDisputeDetailSerializer'}
)
@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_dispute_detail(request, dispute_id):
    """Détail complet d'un litige"""
    try:
        from apps.orders.models import Dispute
        from apps.vendors.serializers import AdminDisputeDetailSerializer
        
        dispute = Dispute.objects.select_related(
            'order',
            'order__user',
            'opened_by',
            'resolved_by'
        ).prefetch_related(
            'messages',
            'messages__sender',
            'evidences',
            'evidences__uploaded_by'
        ).get(id=dispute_id)
        
        serializer = AdminDisputeDetailSerializer(dispute, context={'request': request})
        return Response(serializer.data)
    except Dispute.DoesNotExist:
        return Response(
            {'detail': 'Litige introuvable.'},
            status=status.HTTP_404_NOT_FOUND
        )


@extend_schema(
    tags=["Admin"],
    summary="Update dispute (admin)",
    description="Modifier un litige",
    request='AdminDisputeUpdateSerializer',
    responses={200: 'AdminDisputeDetailSerializer'}
)
@api_view(['PATCH'])
@permission_classes([IsAdminUser])
def admin_update_dispute(request, dispute_id):
    """Modifier un litige"""
    try:
        from apps.orders.models import Dispute, DisputeMessage
        from apps.vendors.serializers import AdminDisputeUpdateSerializer, AdminDisputeDetailSerializer
        
        dispute = Dispute.objects.get(id=dispute_id)
    except Dispute.DoesNotExist:
        return Response(
            {'detail': 'Litige introuvable.'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    serializer = AdminDisputeUpdateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    # Enregistrer les modifications
    changed_fields = []
    for field, new_value in serializer.validated_data.items():
        old_value = getattr(dispute, field)
        if old_value != new_value:
            changed_fields.append(f"{field}: {old_value} → {new_value}")
            setattr(dispute, field, new_value)
    
    # Si résolu, enregistrer qui et quand
    if 'status' in serializer.validated_data and serializer.validated_data['status'] in ['RESOLVED', 'CLOSED']:
        if not dispute.resolved_at:
            dispute.resolved_by = request.user
            dispute.resolved_at = timezone.now()
    
    dispute.save()
    
    # Ajouter message interne
    if changed_fields:
        DisputeMessage.objects.create(
            dispute=dispute,
            sender=request.user,
            message=f"Admin a modifié le litige : {', '.join(changed_fields)}",
            is_internal=True
        )
    
    result_serializer = AdminDisputeDetailSerializer(dispute, context={'request': request})
    return Response(result_serializer.data)


@extend_schema(
    tags=["Admin"],
    summary="Add message to dispute (admin)",
    description="Ajouter un message au litige",
    request='DisputeMessageCreateSerializer',
    responses={200: 'AdminDisputeDetailSerializer'}
)
@api_view(['POST'])
@permission_classes([IsAdminUser])
def admin_add_dispute_message(request, dispute_id):
    """Ajouter un message au litige"""
    try:
        from apps.orders.models import Dispute, DisputeMessage
        from apps.vendors.serializers import DisputeMessageCreateSerializer, AdminDisputeDetailSerializer
        
        dispute = Dispute.objects.get(id=dispute_id)
    except Dispute.DoesNotExist:
        return Response(
            {'detail': 'Litige introuvable.'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    serializer = DisputeMessageCreateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    DisputeMessage.objects.create(
        dispute=dispute,
        sender=request.user,
        message=serializer.validated_data['message'],
        is_internal=serializer.validated_data.get('is_internal', False)
    )
    
    result_serializer = AdminDisputeDetailSerializer(dispute, context={'request': request})
    return Response(result_serializer.data)


@extend_schema(
    tags=["Admin"],
    summary="Resolve dispute (admin)",
    description="Résoudre un litige avec décision",
    responses={200: 'AdminDisputeDetailSerializer'}
)
@api_view(['POST'])
@permission_classes([IsAdminUser])
def admin_resolve_dispute(request, dispute_id):
    """Résoudre un litige"""
    try:
        from apps.orders.models import Dispute, DisputeMessage
        from apps.vendors.serializers import AdminDisputeDetailSerializer
        
        dispute = Dispute.objects.get(id=dispute_id)
    except Dispute.DoesNotExist:
        return Response(
            {'detail': 'Litige introuvable.'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    resolution = request.data.get('resolution')
    resolution_note = request.data.get('resolution_note', '')
    refund_amount = request.data.get('refund_amount_xaf')
    
    if not resolution:
        return Response(
            {'detail': 'La résolution est requise.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    dispute.status = 'RESOLVED'
    dispute.resolution = resolution
    dispute.resolution_note = resolution_note
    dispute.refund_amount_xaf = refund_amount
    dispute.resolved_by = request.user
    dispute.resolved_at = timezone.now()
    dispute.save()
    
    # Message de résolution
    DisputeMessage.objects.create(
        dispute=dispute,
        sender=request.user,
        message=f"Litige résolu : {dispute.get_resolution_display()}. {resolution_note}",
        is_internal=False
    )
    
    serializer = AdminDisputeDetailSerializer(dispute, context={'request': request})
    return Response(serializer.data)


@extend_schema(
    tags=["Admin"],
    summary="Get dispute stats (admin)",
    description="Statistiques des litiges",
    responses={200: 'object'}
)
@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_dispute_stats(request):
    """Statistiques des litiges"""
    from apps.orders.models import Dispute
    from django.db.models import Count, Avg
    
    total_disputes = Dispute.objects.count()
    
    stats_by_status = Dispute.objects.values('status').annotate(count=Count('id'))
    stats_by_reason = Dispute.objects.values('reason').annotate(count=Count('id'))
    stats_by_resolution = Dispute.objects.filter(
        resolution__isnull=False
    ).values('resolution').annotate(count=Count('id'))
    
    # Délai moyen de résolution
    avg_resolution_time = Dispute.objects.filter(
        resolved_at__isnull=False
    ).annotate(
        resolution_time=models.F('resolved_at') - models.F('created_at')
    ).aggregate(avg_time=Avg('resolution_time'))
    
    stats = {
        'total_disputes': total_disputes,
        'open_disputes': Dispute.objects.filter(status='OPEN').count(),
        'in_progress_disputes': Dispute.objects.filter(status='IN_PROGRESS').count(),
        'resolved_disputes': Dispute.objects.filter(status='RESOLVED').count(),
        'stats_by_status': list(stats_by_status),
        'stats_by_reason': list(stats_by_reason),
        'stats_by_resolution': list(stats_by_resolution),
        'avg_resolution_days': avg_resolution_time['avg_time'].days if avg_resolution_time['avg_time'] else 0,
    }
    
    return Response(stats)