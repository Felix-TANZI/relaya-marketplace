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
from .models import VendorProfile, VendorOrderNote, WithdrawalRequest, \
    SubscriptionPlan, VendorSubscription
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from django.utils import timezone
from datetime import timedelta, date
from rest_framework.decorators import action
from django.http import HttpResponse
from django.db import transaction

from .models import VendorProfile, VendorOrderNote
from .models import (
    WithdrawalRequest,
    SubscriptionPlan, VendorSubscription,
    RequiredDocumentType, ShopModificationRequest,
    ShopModificationDocument, VendorLocation,
)
from .serializers import (
    VendorLocationSerializer,
    ShopModificationRequestSerializer, ShopModificationDocumentSerializer,
    RequiredDocumentTypeSerializer, SubscriptionPlanSerializer,
)
from django.core.mail import send_mail
from django.conf import settings as django_settings
from .serializers import (
    VendorProfileSerializer, 
    VendorApplicationSerializer,
    VendorStatsSerializer,
    VendorOrderSerializer,
    UpdateFulfillmentStatusSerializer,
    UpdatePaymentStatusSerializer,
    AdminProductUpdateSerializer,
    PlatformSettingsSerializer,
    VendorPaymentSummarySerializer,
    WithdrawalRequestSerializer,
    WithdrawalRequestCreateSerializer,
    VendorDisputeListSerializer,
    VendorDisputeDetailSerializer,
    VendorDisputeReplySerializer,
    VendorDisputeMessageCreateSerializer,
    VendorDisputeEvidenceSerializer,
    VendorDisputeMessageSerializer,
)
from apps.catalog.models import Product, ProductImage
from apps.catalog.serializers import ProductImageSerializer, ProductSerializer, ProductCreateUpdateSerializer
from apps.orders.models import Order, OrderItem


# Constantes de validation upload — centralisées et réutilisables
ALLOWED_IMAGE_MIME = ('image/jpeg', 'image/png', 'image/webp')
MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024     # 5 MB
MAX_IMAGES_PER_PRODUCT = 6                  # Cohérent avec frontend (ProductFormPage)


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

    class _ProductActionsMixin:
        """Actions personnalisées pour les produits du vendeur"""
 
    @action(detail=True, methods=['post'], url_path='duplicate')
    def duplicate(self, request, pk=None):
        """
        Duplique un produit avec toutes ses images et attributs.
        Nouveau titre : "Copie de {titre original}"
        Nouveau SKU : auto-généré après création
        Stock initial : 0 (le vendeur doit le renseigner)
        """
        try:
            original = self.get_object()
            from apps.catalog.models import Inventory, ProductAttributeValue, ProductImage
            from django.utils.text import slugify
 
            # Créer le duplicata
            copy = original.__class__.objects.create(
                title             = f"Copie de {original.title}",
                slug              = '',  # auto-généré dans save()
                description       = original.description,
                short_description = original.short_description,
                price_xaf         = original.price_xaf,
                compare_at_price  = original.compare_at_price,
                promo_end_date    = None,  # On ne duplique pas la promo
                discount          = original.discount,
                stock_threshold   = original.stock_threshold,
                is_active         = False,  # Inactif jusqu'à validation vendeur
                category          = original.category,
                vendor            = request.user,
                sku               = '',  # auto-généré dans save()
            )
 
            # Stock initial à 0
            Inventory.objects.create(product=copy, quantity=0)
 
            # Dupliquer les valeurs d'attributs
            for attr_val in original.attribute_values.all():
                ProductAttributeValue.objects.create(
                    product         = copy,
                    attribute       = attr_val.attribute,
                    selected_values = attr_val.selected_values,
                )
 
            # Note : on ne duplique pas les images (fichiers physiques)
            # Le vendeur devra en rajouter manuellement
 
            from apps.catalog.serializers import ProductSerializer
            serializer = ProductSerializer(copy, context={'request': request})
            return Response(serializer.data, status=status.HTTP_201_CREATED)
 
        except Exception as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)
 
    @action(detail=True, methods=['patch'], url_path='stock')
    def update_stock(self, request, pk=None):
        """
        Met à jour le stock d'un produit directement depuis la liste.
        Body : { "quantity": 42 }
        Aussi accepte stock_threshold optionnel : { "quantity": 42, "stock_threshold": 3 }
        """
        try:
            product   = self.get_object()
            from apps.catalog.models import Inventory
 
            quantity = request.data.get('quantity')
            if quantity is None:
                return Response({'detail': 'Le champ "quantity" est requis.'}, status=400)
            try:
                quantity = int(quantity)
                if quantity < 0:
                    raise ValueError
            except (ValueError, TypeError):
                return Response({'detail': '"quantity" doit être un entier positif ou nul.'}, status=400)
 
            inventory, _ = Inventory.objects.get_or_create(product=product)
            inventory.quantity = quantity
            inventory.save(update_fields=['quantity', 'updated_at'])
 
            # Seuil alerte optionnel
            threshold = request.data.get('stock_threshold')
            if threshold is not None:
                try:
                    product.stock_threshold = int(threshold) if threshold != '' else None
                    product.save(update_fields=['stock_threshold', 'updated_at'])
                except (ValueError, TypeError):
                    pass
 
            from apps.catalog.serializers import ProductSerializer
            return Response(ProductSerializer(product, context={'request': request}).data)
 
        except Exception as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'], url_path='master-search')
    def master_search(self, request):
        """Recherche de fiches maîtres (validées) pour rattacher une offre."""
        from apps.catalog.models import MasterProduct, ModerationStatus
        from django.db.models import Q
        q = request.query_params.get('search', '').strip()
        qs = MasterProduct.objects.filter(moderation_status=ModerationStatus.APPROVED)
        if q:
            qs = qs.filter(Q(title__icontains=q) | Q(brand__icontains=q))
        qs = qs.select_related('category').order_by('title')[:20]
        data = [{
            'id': m.id, 'title': m.title, 'brand': m.brand,
            'category': m.category_id, 'category_name': m.category.name,
        } for m in qs]
        return Response(data)        


@extend_schema(
    tags=["Vendors"],
    summary="Upload product image",
    description=(
        "Upload une image pour un produit du vendeur connecté. "
        "Formats : JPG, PNG, WEBP. Taille max : 5 Mo. "
        "Maximum 6 images par produit."
    ),
    responses={201: ProductImageSerializer},
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_product_image(request, product_id):
    """
    Télécharger une image pour un produit.
 
    Sécurité :
      - Le produit doit appartenir au vendeur connecté.
      - Validation type MIME (anti-upload arbitraire).
      - Validation taille (anti-DoS disque).
      - Limite du nombre d'images par produit.
      - Création atomique (transaction.atomic).
    """
    # 1. Vérifier que le produit existe ET appartient au vendeur connecté
    try:
        product = Product.objects.get(id=product_id, vendor=request.user)
    except Product.DoesNotExist:
        return Response(
            {'detail': 'Produit introuvable.'},
            status=status.HTTP_404_NOT_FOUND,
        )
 
    # 2. Vérifier la présence du fichier
    image_file = request.FILES.get('image')
    if not image_file:
        return Response(
            {'detail': 'Champ "image" requis.'},
            status=status.HTTP_400_BAD_REQUEST,
        )
 
    # 3. Validation MIME (Django lit le content_type envoyé par le client.
    #    On se fie ici au header — pour une validation profonde, ajouter python-magic)
    if image_file.content_type not in ALLOWED_IMAGE_MIME:
        return Response(
            {'detail': 'Format non supporté. Formats acceptés : JPG, PNG, WEBP.'},
            status=status.HTTP_400_BAD_REQUEST,
        )
 
    # 4. Validation taille
    if image_file.size > MAX_IMAGE_SIZE_BYTES:
        return Response(
            {'detail': 'Fichier trop volumineux. Maximum 5 Mo.'},
            status=status.HTTP_400_BAD_REQUEST,
        )
 
    # 5. Limite du nombre d'images par produit
    current_count = ProductImage.objects.filter(product=product).count()
    if current_count >= MAX_IMAGES_PER_PRODUCT:
        return Response(
            {'detail': f'Maximum {MAX_IMAGES_PER_PRODUCT} images par produit.'},
            status=status.HTTP_400_BAD_REQUEST,
        )
 
    # 6. Sérialiser, valider, sauvegarder ATOMIQUEMENT avec le produit attaché
    serializer = ProductImageSerializer(
        data=request.data,
        context={'request': request},
    )
    serializer.is_valid(raise_exception=True)
 
    with transaction.atomic():
        # ON PASSE LE PRODUIT EXPLICITEMENT — c'est le fix du bug 500.
        # validated_data sera étendu avec product=product avant la création.
        image = serializer.save(product=product)
 
    return Response(
        ProductImageSerializer(image, context={'request': request}).data,
        status=status.HTTP_201_CREATED,
    )


@extend_schema(
    tags=["Vendors"],
    summary="Delete product image",
    responses={204: None},
)
@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_product_image(request, product_id, image_id):
    """
    Supprimer une image d'un produit.
 
    Si l'image supprimée était `is_primary`, on promeut la plus ancienne
    image restante en image principale (sinon le produit n'a plus de
    photo principale, ce qui casse l'affichage côté boutique).
    """
    try:
        image = ProductImage.objects.select_related('product').get(
            id=image_id,
            product_id=product_id,
            product__vendor=request.user,
        )
    except ProductImage.DoesNotExist:
        return Response(
            {'detail': 'Image introuvable.'},
            status=status.HTTP_404_NOT_FOUND,
        )
 
    was_primary = image.is_primary
    product = image.product
 
    with transaction.atomic():
        # .delete() supprime aussi le fichier physique grâce au signal
        # post_delete (à vérifier — sinon, ajouter image.image.delete(save=False))
        image.image.delete(save=False)  # nettoyage explicite du fichier
        image.delete()
 
        # Promouvoir une autre image en principale si nécessaire
        if was_primary:
            next_primary = (
                ProductImage.objects
                .filter(product=product)
                .order_by('order', 'created_at')
                .first()
            )
            if next_primary:
                next_primary.is_primary = True
                next_primary.save(update_fields=['is_primary'])
 
    return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema(
    tags=["Vendors"],
    summary="Set primary product image",
    responses={200: ProductImageSerializer},
)
@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def set_primary_image(request, product_id, image_id):
    """
    Définir une image comme principale.
    Atomique pour éviter d'avoir 0 ou 2 images is_primary simultanément.
    """
    try:
        product = Product.objects.get(id=product_id, vendor=request.user)
        image = ProductImage.objects.get(id=image_id, product=product)
    except (Product.DoesNotExist, ProductImage.DoesNotExist):
        return Response(
            {'detail': 'Image ou produit introuvable.'},
            status=status.HTTP_404_NOT_FOUND,
        )
 
    with transaction.atomic():
        # Lock optimiste : on retire is_primary de TOUTES les images du produit
        # puis on l'attribue à la cible. Si deux requêtes arrivent en parallèle,
        # la transaction Postgres garantit la cohérence finale.
        ProductImage.objects.filter(product=product).update(is_primary=False)
        image.is_primary = True
        image.save(update_fields=['is_primary'])
 
    return Response(
        ProductImageSerializer(image, context={'request': request}).data
    )


#  GESTION DES COMMANDES 

@extend_schema(
    tags=["Vendors"],
    summary="Get vendor orders",
    description="Récupère toutes les commandes contenant au moins un produit du vendeur.",
    parameters=[
        OpenApiParameter(
            name='fulfillment_status',
            description=(
                'Filtrer par statut de livraison : '
                'CREATED, PAID_IN_ESCROW, VENDOR_ACKNOWLEDGED, PREPARING, '
                'READY_FOR_PICKUP, DRIVER_ASSIGNED, PICKED_UP, OUT_FOR_DELIVERY, '
                'DELIVERED, BUYER_CONFIRMED, AUTO_CONFIRMED, RELEASED_TO_VENDOR, '
                'DISPUTED, CANCELLED, REFUNDED'
            ),
            required=False,
            type=str,
        ),
        OpenApiParameter(
            name='payment_status',
            description='Filtrer par statut de paiement : PENDING, PAID, FAILED, REFUNDED',
            required=False,
            type=str,
        ),
        OpenApiParameter(
            name='escrow_status',
            description=(
                'Filtrer par statut escrow : '
                'PENDING, BLOCKED, RELEASE_PENDING, RELEASED, REFUNDED, PARTIAL_REFUNDED'
            ),
            required=False,
            type=str,
        ),
    ],
    responses={200: VendorOrderSerializer(many=True)},
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def vendor_orders(request):
    """Liste des commandes contenant des produits du vendeur."""
    try:
        vendor_profile = VendorProfile.objects.get(user=request.user)
 
        if not vendor_profile.is_active_vendor:
            return Response(
                {'detail': "Votre compte vendeur n'est pas encore approuvé."},
                status=status.HTTP_403_FORBIDDEN,
            )
 
        orders = (
            Order.objects.filter(items__product__vendor=request.user)
            .select_related('shipment')
            .prefetch_related('shipment__events')
            .distinct()
            .order_by('-created_at')
        )
 
        # Filtres optionnels
        fulfillment_status = request.query_params.get('fulfillment_status')
        if fulfillment_status:
            orders = orders.filter(fulfillment_status=fulfillment_status)
 
        payment_status_param = request.query_params.get('payment_status')
        if payment_status_param:
            orders = orders.filter(payment_status=payment_status_param)
 
        escrow_status = request.query_params.get('escrow_status')
        if escrow_status:
            orders = orders.filter(escrow_status=escrow_status)
 
        serializer = VendorOrderSerializer(
            orders,
            many=True,
            context={'request': request, 'vendor': request.user},
        )
        return Response(serializer.data)
 
    except VendorProfile.DoesNotExist:
        return Response(
            {'detail': 'Profil vendeur introuvable.'},
            status=status.HTTP_404_NOT_FOUND,
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
        ).select_related('shipment').prefetch_related('shipment__events').distinct().first()
        
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
    summary="Get or save vendor internal note on an order",
    description="GET → note existante. PATCH { content } → crée ou met à jour. content='' → efface.",
    responses={200: {'type': 'object', 'properties': {
        'order_id':   {'type': 'integer'},
        'content':    {'type': 'string'},
        'updated_at': {'type': 'string', 'format': 'date-time'},
    }}},
)
@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def vendor_order_note(request, order_id):
    try:
        vendor_profile = VendorProfile.objects.get(user=request.user)
        if not vendor_profile.is_active_vendor:
            return Response(
                {'detail': "Votre compte vendeur n'est pas encore approuvé."},
                status=status.HTTP_403_FORBIDDEN,
            )
        order = Order.objects.filter(
            id=order_id,
            items__product__vendor=request.user,
        ).distinct().first()
        if not order:
            return Response(
                {'detail': 'Commande introuvable ou ne contient pas vos produits.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if request.method == 'GET':
            note = VendorOrderNote.objects.filter(order=order, vendor=vendor_profile).first()  # ← request.user → vendor_profile
            return Response({
                'order_id':   order_id,
                'content':    note.content    if note else '',
                'updated_at': note.updated_at if note else None,
            })

        content = request.data.get('content', '').strip()
        if len(content) > 2000:
            return Response(
                {'detail': 'La note ne peut pas dépasser 2 000 caractères.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        note, _ = VendorOrderNote.objects.get_or_create(
            order=order, vendor=vendor_profile, defaults={'content': content},  # ← request.user → vendor_profile
        )
        if note.content != content:
            note.content = content
            note.save(update_fields=['content', 'updated_at'])
        return Response({
            'order_id':   order_id,
            'content':    note.content,
            'updated_at': note.updated_at,
        })

    except VendorProfile.DoesNotExist:
        return Response(
            {'detail': 'Profil vendeur introuvable.'},
            status=status.HTTP_404_NOT_FOUND,
        ) 


@extend_schema(
    tags=["Vendors"],
    summary="Vendor payment summary",
    description=(
        "Résumé financier du vendeur : KPIs escrow, solde libéré, "
        "commission (taux depuis PlatformSettings), projection 30 jours, "
        "graphique 30 jours et retrait en cours."
    ),
    responses={200: VendorPaymentSummarySerializer},
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def vendor_payment_summary(request):
    """
    Agrège les données financières du vendeur depuis ses commandes.
    Toutes les valeurs de configuration viennent de PlatformSettings.
    """
    try:
        vendor_profile = VendorProfile.objects.get(user=request.user)
        if not vendor_profile.is_active_vendor:
            return Response(
                {'detail': "Votre compte vendeur n'est pas encore approuvé."},
                status=status.HTTP_403_FORBIDDEN,
            )
 
        from apps.orders.models import Order, PlatformSettings
        from apps.vendors.models import WithdrawalRequest
 
        vendor      = request.user
        settings    = PlatformSettings.get_settings()
        now         = timezone.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
 
        # ── Commandes du vendeur (contient au moins un de ses articles) ─────
        qs = Order.objects.filter(items__product__vendor=vendor).distinct()
 
        def vendor_net(order_qs):
            """Somme des vendor_net_amount pour les commandes du queryset."""
            total = 0
            for o in order_qs.prefetch_related('items__product'):
                items = o.items.filter(product__vendor=vendor)
                subtotal = sum(i.line_total_xaf for i in items)
                rate     = float(o.commission_rate_snapshot)
                comm     = round(subtotal * rate / 100)
                total   += subtotal - comm
            return total
 
        def vendor_gross(order_qs):
            total = 0
            for o in order_qs.prefetch_related('items__product'):
                total += sum(i.line_total_xaf for i in o.items.filter(product__vendor=vendor))
            return total
 
        def vendor_commission(order_qs):
            total = 0
            for o in order_qs.prefetch_related('items__product'):
                items    = o.items.filter(product__vendor=vendor)
                subtotal = sum(i.line_total_xaf for i in items)
                rate     = float(o.commission_rate_snapshot)
                total   += round(subtotal * rate / 100)
            return total
 
        # ── KPIs principaux ────────────────────────────────────────────────
        released_qs = qs.filter(escrow_status='RELEASED')
        blocked_qs  = qs.filter(escrow_status='BLOCKED')
        pending_qs  = qs.filter(escrow_status='RELEASE_PENDING')
 
        total_released         = vendor_net(released_qs)
        total_blocked          = vendor_net(blocked_qs)
        total_release_pending  = vendor_net(pending_qs)
 
        total_gross      = vendor_gross(released_qs)
        total_commission = vendor_commission(released_qs)
 
        # ── Projection mensuelle (moyenne des 3 derniers mois) ─────────────
        three_months_ago  = now - timedelta(days=90)
        recent_released   = released_qs.filter(updated_at__gte=three_months_ago)
        recent_net        = vendor_net(recent_released)
        # Moyenne mensuelle = total 90j / 3 mois
        projection_monthly = round(recent_net / 3) if recent_net > 0 else 0
 
        # ── Graphique 30 jours ────────────────────────────────────────────
        chart_30_days = []
        for i in range(30):
            day       = today_start - timedelta(days=29 - i)
            day_end   = day + timedelta(days=1)
 
            day_released_qs = qs.filter(
                escrow_status='RELEASED',
                updated_at__gte=day,
                updated_at__lt=day_end,
            )
            day_blocked_qs = qs.filter(
                escrow_status='BLOCKED',
                created_at__gte=day,
                created_at__lt=day_end,
            )
 
            chart_30_days.append({
                'date':     day.date().isoformat(),
                'released': vendor_net(day_released_qs),
                'blocked':  vendor_net(day_blocked_qs),
            })
 
        # ── Retrait en cours ───────────────────────────────────────────────
        pending_withdrawal_obj = WithdrawalRequest.objects.filter(
            vendor=vendor_profile, status='PENDING'
        ).first()
 
        pending_withdrawal = None
        if pending_withdrawal_obj:
            pending_withdrawal = {
                'id':          pending_withdrawal_obj.id,
                'reference':   pending_withdrawal_obj.reference,
                'amount_xaf':  pending_withdrawal_obj.amount_xaf,
                'fee_xaf':     pending_withdrawal_obj.fee_amount_xaf,
                'net_xaf':     pending_withdrawal_obj.net_amount_xaf,
                'operator':    pending_withdrawal_obj.operator,
                'phone':       pending_withdrawal_obj.phone_number,
                'created_at':  pending_withdrawal_obj.created_at,
            }
 
        data = {
            'total_released_xaf':        total_released,
            'total_blocked_xaf':         total_blocked,
            'total_release_pending_xaf': total_release_pending,
            'total_gross_xaf':           total_gross,
            'total_commission_xaf':      total_commission,
            'released_orders_count':     released_qs.count(),
            'blocked_orders_count':      blocked_qs.count(),
            'commission_rate':           settings.platform_commission_percent,
            'withdrawal_fee_percent':    settings.withdrawal_fee_percent,
            'minimum_withdrawal_xaf':    settings.minimum_withdrawal_amount_xaf,
            'projection_monthly_xaf':    projection_monthly,
            'chart_30_days':             chart_30_days,
            'pending_withdrawal':        pending_withdrawal,
        }
 
        serializer = VendorPaymentSummarySerializer(data)
        return Response(serializer.data)
 
    except VendorProfile.DoesNotExist:
        return Response(
            {'detail': 'Profil vendeur introuvable.'},
            status=status.HTTP_404_NOT_FOUND,
        )
 
 
#  RETRAITS VENDEUR
 
@extend_schema(
    tags=["Vendors"],
    summary="List vendor withdrawal requests",
    description="Historique de toutes les demandes de retrait du vendeur.",
    responses={200: WithdrawalRequestSerializer(many=True)},
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def vendor_withdrawal_list(request):
    """Liste les demandes de retrait du vendeur connecté."""
    try:
        vendor_profile = VendorProfile.objects.get(user=request.user)
        if not vendor_profile.is_active_vendor:
            return Response(
                {'detail': "Votre compte vendeur n'est pas encore approuvé."},
                status=status.HTTP_403_FORBIDDEN,
            )
 
        from apps.vendors.models import WithdrawalRequest
        withdrawals = WithdrawalRequest.objects.filter(
            vendor=vendor_profile
        ).order_by('-created_at')
 
        serializer = WithdrawalRequestSerializer(withdrawals, many=True)
        return Response(serializer.data)
 
    except VendorProfile.DoesNotExist:
        return Response(
            {'detail': 'Profil vendeur introuvable.'},
            status=status.HTTP_404_NOT_FOUND,
        )
 
 
@extend_schema(
    tags=["Vendors"],
    summary="Create withdrawal request",
    description=(
        "Crée une demande de retrait Mobile Money. "
        "Les frais sont calculés depuis PlatformSettings (withdrawal_fee_percent). "
        "Un seul retrait PENDING autorisé à la fois par vendeur."
    ),
    request=WithdrawalRequestCreateSerializer,
    responses={201: WithdrawalRequestSerializer},
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def vendor_withdrawal_create(request):
    """
    Crée une demande de retrait.
 
    Règle : un seul retrait PENDING à la fois.
    Raison : gestion admin manuelle dans cette version (sans API MoMo automatique).
    Simplifie le traitement et évite les doublons / dépassements de solde.
    """
    try:
        vendor_profile = VendorProfile.objects.get(user=request.user)
        if not vendor_profile.is_active_vendor:
            return Response(
                {'detail': "Votre compte vendeur n'est pas encore approuvé."},
                status=status.HTTP_403_FORBIDDEN,
            )
 
        serializer = WithdrawalRequestCreateSerializer(
            data=request.data,
            context={'vendor': request.user},
        )
 
        if serializer.is_valid():
            withdrawal = serializer.save()
            result = WithdrawalRequestSerializer(withdrawal)
            return Response(result.data, status=status.HTTP_201_CREATED)
 
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
 
    except VendorProfile.DoesNotExist:
        return Response(
            {'detail': 'Profil vendeur introuvable.'},
            status=status.HTTP_404_NOT_FOUND,
        )
 
 
@extend_schema(
    tags=["Vendors"],
    summary="Cancel a withdrawal request",
    description="Annule une demande de retrait PENDING. Seule une demande PENDING peut être annulée.",
    responses={200: WithdrawalRequestSerializer},
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def vendor_withdrawal_cancel(request, withdrawal_id):
    """Annule une demande de retrait en attente."""
    try:
        vendor_profile = VendorProfile.objects.get(user=request.user)
        if not vendor_profile.is_active_vendor:
            return Response(
                {'detail': "Votre compte vendeur n'est pas encore approuvé."},
                status=status.HTTP_403_FORBIDDEN,
            )
 
        from apps.vendors.models import WithdrawalRequest
        try:
            withdrawal = WithdrawalRequest.objects.get(
                id=withdrawal_id, vendor=request.user,
            )
        except WithdrawalRequest.DoesNotExist:
            return Response(
                {'detail': 'Demande de retrait introuvable.'},
                status=status.HTTP_404_NOT_FOUND,
            )
 
        if withdrawal.status != WithdrawalRequest.Status.PENDING:
            return Response(
                {'detail': f"Impossible d'annuler une demande avec le statut '{withdrawal.get_status_display()}'."},
                status=status.HTTP_400_BAD_REQUEST,
            )
 
        withdrawal.status = WithdrawalRequest.Status.CANCELLED
        withdrawal.save(update_fields=['status', 'updated_at'])
 
        result = WithdrawalRequestSerializer(withdrawal)
        return Response(result.data)
 
    except VendorProfile.DoesNotExist:
        return Response(
            {'detail': 'Profil vendeur introuvable.'},
            status=status.HTTP_404_NOT_FOUND,
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
    summary="Update order fulfillment status (vendor)",
    description=(
        "Transitions autorisées pour le vendeur uniquement :\n"
        "  PAID_IN_ESCROW       → VENDOR_ACKNOWLEDGED | CANCELLED\n"
        "  VENDOR_ACKNOWLEDGED  → PREPARING           | CANCELLED\n"
        "  PREPARING            → READY_FOR_PICKUP\n"
        "Toute autre transition est refusée avec HTTP 400."
    ),
    request=UpdateFulfillmentStatusSerializer,
    responses={200: VendorOrderSerializer},
)
@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_fulfillment_status(request, order_id):
    """Transition de statut livraison — vendeur uniquement."""
    try:
        vendor_profile = VendorProfile.objects.get(user=request.user)
 
        if not vendor_profile.is_active_vendor:
            return Response(
                {'detail': "Votre compte vendeur n'est pas encore approuvé."},
                status=status.HTTP_403_FORBIDDEN,
            )
 
        order = Order.objects.filter(
            id=order_id,
            items__product__vendor=request.user,
        ).distinct().first()
 
        if not order:
            return Response(
                {'detail': 'Commande introuvable ou ne contient pas vos produits.'},
                status=status.HTTP_404_NOT_FOUND,
            )
 
        serializer = UpdateFulfillmentStatusSerializer(
            order,
            data=request.data,
            context={'order': order},
        )
 
        if serializer.is_valid():
            serializer.save()
            order.refresh_from_db()
            result = VendorOrderSerializer(
                order,
                context={'request': request, 'vendor': request.user},
            )
            return Response(result.data)
 
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
 
    except VendorProfile.DoesNotExist:
        return Response(
            {'detail': 'Profil vendeur introuvable.'},
            status=status.HTTP_404_NOT_FOUND,
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


# Vues standalone

@extend_schema(
    tags=["Vendors"],
    summary="Get product attributes for a category",
    description=(
        "Retourne les attributs définis par l'admin pour une catégorie donnée. "
        "Le vendeur choisit ses valeurs parmi celles définies ici. "
        "Endpoint : GET /api/vendors/products/attributes/?category={id}"
    ),
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def vendor_product_attributes(request):
    """
    Liste les attributs disponibles pour une catégorie (créés par l'admin).
    Utilisé dans le formulaire produit pour charger les attributs dynamiquement.
    """
    try:
        vendor_profile = VendorProfile.objects.get(user=request.user)
        if not vendor_profile.is_active_vendor:
            return Response({'detail': "Compte vendeur non approuvé."}, status=403)
 
        from apps.catalog.models import ProductAttribute
 
        category_id = request.query_params.get('category')
        if not category_id:
            return Response({'detail': 'Paramètre "category" requis.'}, status=400)
 
        attrs = ProductAttribute.objects.filter(
            category_id=category_id,
        ).order_by('display_order', 'name')
 
        data = [
            {
                'id':             a.id,
                'name':           a.name,
                'attribute_type': a.attribute_type,
                'values':         a.values,
                'is_required':    a.is_required,
                'display_order':  a.display_order,
            }
            for a in attrs
        ]
        return Response(data)
 
    except VendorProfile.DoesNotExist:
        return Response({'detail': 'Profil vendeur introuvable.'}, status=404)
 
 
@extend_schema(
    tags=["Vendors"],
    summary="Export vendor products as CSV",
    description="Télécharge la liste complète des produits du vendeur en CSV.",
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def vendor_export_products_csv(request):
    """Export CSV de tous les produits du vendeur."""
    try:
        vendor_profile = VendorProfile.objects.get(user=request.user)
        if not vendor_profile.is_active_vendor:
            return Response({'detail': "Compte vendeur non approuvé."}, status=403)
 
        from apps.catalog.models import Product
        import csv, io
 
        products = Product.objects.filter(
            vendor=request.user,
        ).select_related('category').prefetch_related('inventory', 'attribute_values__attribute')
 
        response = HttpResponse(content_type='text/csv; charset=utf-8')
        response['Content-Disposition'] = (
            f'attachment; filename="belivay_produits_{request.user.username}.csv"'
        )
        response.write('\uFEFF')  # BOM pour Excel
 
        writer = csv.writer(response)
        writer.writerow([
            'ID', 'SKU', 'Titre', 'Catégorie', 'Prix (FCFA)', 'Prix barré (FCFA)',
            'Remise (%)', 'Stock', 'Seuil alerte', 'Fin promo', 'Statut',
            'Note moyenne', 'Nombre avis', 'Description courte',
        ])
 
        from django.db.models import Avg
        from apps.catalog.models import ProductReview
 
        for p in products:
            stock = getattr(p.inventory, 'quantity', 0) if hasattr(p, 'inventory') else 0
            try:
                stock = p.inventory.quantity
            except Exception:
                stock = 0
 
            rating = ProductReview.objects.filter(
                product=p, is_approved=True
            ).aggregate(avg=Avg('rating'))['avg']
            reviews_count = ProductReview.objects.filter(product=p, is_approved=True).count()
 
            writer.writerow([
                p.id, p.sku, p.title, p.category.name,
                p.price_xaf, p.compare_at_price or '',
                p.discount_percent, stock,
                p.stock_threshold if p.stock_threshold is not None else '',
                p.promo_end_date or '',
                'Actif' if p.is_active else 'Inactif',
                round(rating, 1) if rating else '',
                reviews_count, p.short_description,
            ])
 
        return response
 
    except VendorProfile.DoesNotExist:
        return Response({'detail': 'Profil vendeur introuvable.'}, status=404)
 
 
@extend_schema(
    tags=["Vendors"],
    summary="Import products from CSV",
    description=(
        "Importe des produits depuis un fichier CSV. "
        "Colonnes requises : Titre, Catégorie (nom), Prix (FCFA), Stock. "
        "Colonnes optionnelles : Description, Description courte, Prix barré, SKU, Seuil alerte. "
        "Format attendu : UTF-8 avec BOM. Max 500 lignes."
    ),
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def vendor_import_products_csv(request):
    """Import CSV de produits pour le vendeur."""
    try:
        vendor_profile = VendorProfile.objects.get(user=request.user)
        if not vendor_profile.is_active_vendor:
            return Response({'detail': "Compte vendeur non approuvé."}, status=403)
 
        file = request.FILES.get('file')
        if not file:
            return Response({'detail': 'Fichier CSV requis. Champ attendu : "file".'}, status=400)
 
        if not file.name.endswith('.csv'):
            return Response({'detail': 'Seuls les fichiers .csv sont acceptés.'}, status=400)
 
        import csv, io
        from apps.catalog.models import Product, Category, Inventory
 
        content = file.read().decode('utf-8-sig')  # utf-8-sig gère le BOM Excel
        reader  = csv.DictReader(io.StringIO(content))
 
        created_count = 0
        errors        = []
 
        for i, row in enumerate(reader, start=2):  # Ligne 2 = première donnée
            if i > 502:  # Max 500 lignes
                errors.append({'ligne': i, 'erreur': 'Limite de 500 produits par import atteinte.'})
                break
 
            titre = (row.get('Titre') or '').strip()
            if not titre:
                errors.append({'ligne': i, 'erreur': 'Le titre est obligatoire.'})
                continue
 
            cat_name = (row.get('Catégorie') or '').strip()
            category = Category.objects.filter(name__iexact=cat_name, is_active=True).first()
            if not category:
                errors.append({'ligne': i, 'erreur': f'Catégorie introuvable : "{cat_name}".'})
                continue
 
            try:
                price = int(row.get('Prix (FCFA)', '0').replace(' ', '').replace('\u202f', '') or 0)
            except ValueError:
                errors.append({'ligne': i, 'erreur': 'Prix invalide.'})
                continue
 
            if price < 100:
                errors.append({'ligne': i, 'erreur': f'Prix trop faible : {price} FCFA.'})
                continue
 
            try:
                stock = int(row.get('Stock', '0') or 0)
            except ValueError:
                stock = 0
 
            compare_at = None
            if row.get('Prix barré (FCFA)'):
                try:
                    compare_at = int(row['Prix barré (FCFA)'].replace(' ', '') or 0)
                    if compare_at <= price:
                        compare_at = None
                except ValueError:
                    compare_at = None
 
            threshold = None
            if row.get('Seuil alerte'):
                try:
                    threshold = int(row['Seuil alerte'])
                except ValueError:
                    threshold = None
 
            product = Product.objects.create(
                title             = titre[:200],
                description       = (row.get('Description') or '').strip(),
                short_description = (row.get('Description courte') or '').strip()[:300],
                price_xaf         = price,
                compare_at_price  = compare_at,
                category          = category,
                vendor            = request.user,
                is_active         = False,  # Inactif par défaut — modération
                stock_threshold   = threshold,
                sku               = (row.get('SKU') or '').strip()[:60],
            )
            Inventory.objects.create(product=product, quantity=stock)
            created_count += 1
 
        return Response({
            'created': created_count,
            'errors':  errors[:50],  # Max 50 erreurs retournées
            'message': f'{created_count} produit(s) importé(s). {len(errors)} erreur(s).',
        }, status=status.HTTP_201_CREATED if created_count > 0 else status.HTTP_400_BAD_REQUEST)
 
    except VendorProfile.DoesNotExist:
        return Response({'detail': 'Profil vendeur introuvable.'}, status=404)
 
 
@extend_schema(
    tags=["Vendors"],
    summary="Download product PDF sheet",
    description=(
        "Génère un PDF de la fiche produit incluant : infos, prix, stock, attributs, "
        "note moyenne, nombre d'avis. Téléchargeable par le vendeur."
    ),
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def vendor_product_pdf(request, product_id):
    """
    Génère une fiche produit HTML (imprimable / téléchargeable).
    Retourne un fichier HTML si ?format=html, sinon JSON avec le contenu HTML.
    """
    try:
        vendor_profile = VendorProfile.objects.get(user=request.user)
        if not vendor_profile.is_active_vendor:
            return Response({'detail': "Compte vendeur non approuvé."}, status=403)
 
        from apps.catalog.models import Product, ProductReview
        from django.db.models import Avg
 
        try:
            product = Product.objects.select_related(
                'category', 'vendor__vendor_profile',
            ).prefetch_related(
                'images', 'attribute_values__attribute', 'inventory',
            ).get(id=product_id, vendor=request.user)
        except Product.DoesNotExist:
            return Response({'detail': 'Produit introuvable.'}, status=404)
 
        # Stats avis
        reviews = ProductReview.objects.filter(product=product, is_approved=True)
        rating  = reviews.aggregate(avg=Avg('rating'))['avg']
        rating  = round(rating, 1) if rating else None
 
        try:
            stock = product.inventory.quantity
        except Exception:
            stock = 0
 
        threshold = product.get_effective_stock_threshold()
        shop_name = vendor_profile.business_name
 
        # Attributs
        attrs_html = ''
        for av in product.attribute_values.all():
            vals = ', '.join(av.selected_values) if av.selected_values else '—'
            attrs_html += f'<tr><td>{av.attribute.name}</td><td><strong>{vals}</strong></td></tr>'
 
        # Image principale
        primary_img = product.images.filter(is_primary=True).first()
        img_url     = request.build_absolute_uri(primary_img.image.url) if primary_img else ''
        img_tag     = f'<img src="{img_url}" style="max-width:280px;border-radius:12px;object-fit:cover;">' if img_url else '<div style="width:280px;height:220px;background:#F5F0E8;border-radius:12px;display:flex;align-items:center;justify-content:center;color:#7C6E5A;font-size:13px;">Aucune image</div>'
 
        # Prix barré
        promo_html = ''
        if product.compare_at_price:
            pct = product.discount_percent
            promo_html = f'<span style="text-decoration:line-through;color:#7C6E5A;font-size:15px;">{product.compare_at_price:,} FCFA</span> <span style="background:#FFF3E8;color:#F47920;font-size:12px;font-weight:800;padding:2px 8px;border-radius:20px;">-{pct}%</span>'.replace(',', '\u202f')
 
        # Fin de promo
        promo_end_html = f'<p style="color:#D97706;font-size:12px;">Promotion jusqu\'au {product.promo_end_date.strftime("%d/%m/%Y")}</p>' if product.promo_end_date else ''
 
        # Étoiles
        stars_html = ''
        if rating:
            full  = int(rating)
            stars_html = '★' * full + '☆' * (5 - full) + f' {rating}/5 ({reviews.count()} avis)'
 
        html = f'''<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>Fiche produit — {product.title}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@700;800&display=swap');
  * {{ margin:0; padding:0; box-sizing:border-box; }}
  body {{ font-family: sans-serif; background:#F5F0E8; color:#1A1209; padding:32px; }}
  .card {{ background:#fff; border-radius:20px; padding:32px; max-width:780px; margin:0 auto; box-shadow:0 4px 24px rgba(28,18,9,0.10); }}
  .header {{ display:flex; justify-content:space-between; align-items:center; border-bottom:3px solid #F47920; padding-bottom:16px; margin-bottom:24px; }}
  .logo {{ font-family:Poppins,sans-serif; font-size:26px; font-weight:800; color:#F47920; }}
  .content {{ display:grid; grid-template-columns:280px 1fr; gap:24px; }}
  .info h1 {{ font-family:Poppins,sans-serif; font-size:22px; font-weight:800; margin-bottom:6px; }}
  .price {{ font-family:Poppins,sans-serif; font-size:28px; font-weight:800; color:#F47920; margin:12px 0; }}
  .badge {{ display:inline-block; padding:3px 10px; border-radius:20px; font-size:11px; font-weight:700; }}
  .badge-green {{ background:#DCFCE7; color:#16A34A; }}
  .badge-red {{ background:#FEE2E2; color:#DC2626; }}
  .badge-amber {{ background:#FEF3C7; color:#D97706; }}
  table {{ width:100%; border-collapse:collapse; margin-top:16px; }}
  th, td {{ padding:8px 12px; text-align:left; border-bottom:1px solid #E8E2D9; font-size:13px; }}
  th {{ background:#F5F0E8; font-weight:700; width:40%; }}
  .stars {{ color:#F47920; font-size:16px; margin:8px 0; }}
  .footer {{ margin-top:24px; padding-top:16px; border-top:1px solid #E8E2D9; font-size:10.5px; color:#7C6E5A; text-align:center; }}
  @media print {{ body {{ padding:0; }} .card {{ box-shadow:none; }} }}
</style>
</head>
<body>
<div class="card">
  <div class="header">
    <div>
      <div class="logo">BelivaY</div>
      <div style="font-size:12px;color:#7C6E5A;">Fiche produit vendeur</div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:11px;color:#7C6E5A;">SKU : <strong>{product.sku or "—"}</strong></div>
      <div style="font-size:11px;color:#7C6E5A;">Ref : <strong>BLV-{product.id:05d}</strong></div>
      <div style="font-size:11px;color:#7C6E5A;">Boutique : <strong>{shop_name}</strong></div>
    </div>
  </div>
  <div class="content">
    <div>{img_tag}</div>
    <div class="info">
      <div>
        <span class="badge" style="background:#FFF3E8;color:#F47920;">{product.category.name}</span>
        {'<span class="badge badge-green" style="margin-left:6px;">Actif</span>' if product.is_active else '<span class="badge badge-amber" style="margin-left:6px;">Inactif</span>'}
      </div>
      <h1 style="margin-top:8px;">{product.title}</h1>
      {f'<p style="color:#7C6E5A;font-size:13px;margin-top:4px;">{product.short_description}</p>' if product.short_description else ''}
      {f'<div class="stars">{stars_html}</div>' if stars_html else ''}
      <div class="price">{product.price_xaf:,} FCFA</div>
      {promo_html}
      {promo_end_html}
      <table>
        <tr><th>Stock disponible</th><td><strong>{'<span class="badge badge-red">Rupture</span>' if stock == 0 else f"{stock} unités"}</strong></td></tr>
        <tr><th>Seuil alerte</th><td>{threshold} unités</td></tr>
        <tr><th>Catégorie</th><td>{product.category.name}</td></tr>
        {attrs_html}
        <tr><th>Date création</th><td>{product.created_at.strftime("%d/%m/%Y")}</td></tr>
      </table>
    </div>
  </div>
  {f'<div style="margin-top:20px;"><h3 style="font-size:14px;font-weight:700;margin-bottom:8px;">Description</h3><p style="font-size:13px;line-height:1.7;color:#1A1209;">{product.description}</p></div>' if product.description else ''}
  <div class="footer">
    BelivaY &copy; {__import__("datetime").date.today().year} — Marketplace de confiance pour l'Afrique Centrale<br>
    Fiche générée le {__import__("datetime").date.today().strftime("%d/%m/%Y")}<br>
    Ce document est à usage interne vendeur — non destiné à la revente.
  </div>
</div>
<script>
  // Auto-print si ouvert directement
  if (window.location.search.includes('print=1')) window.print();
</script>
</body>
</html>'''
 
        output_format = request.query_params.get('format', 'html')
        if output_format == 'html':
            return HttpResponse(html, content_type='text/html; charset=utf-8')
 
        # JSON pour le frontend (overlay iframe)
        return Response({'html': html, 'filename': f'fiche_{product.sku or product.id}.html'})
 
    except VendorProfile.DoesNotExist:
        return Response({'detail': 'Profil vendeur introuvable.'}, status=404)

    
#  LITIGES VENDEUR
 
@extend_schema(
    tags=["Vendors"],
    summary="List vendor disputes",
    description=(
        "Liste les litiges ouverts par des acheteurs sur les commandes du vendeur. "
        "Seuls les litiges dont le statut n'est pas CLOSED et dont la commande "
        "contient au moins un produit du vendeur sont retournés. "
        "Le vendeur voit la description de la plainte (description de l'acheteur)."
    ),
    responses={200: VendorDisputeListSerializer(many=True)},
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def vendor_dispute_list(request):
    """
    Liste les litiges sur les commandes du vendeur.
    Filtres query params :
      - status : OPEN | IN_PROGRESS | RESOLVED | CLOSED
      - filter : urgent (réponse vendeur requise) | mediation | closed
    """
    try:
        vendor_profile = VendorProfile.objects.get(user=request.user)
        if not vendor_profile.is_active_vendor:
            return Response(
                {'detail': "Votre compte vendeur n'est pas encore approuvé."},
                status=status.HTTP_403_FORBIDDEN,
            )
 
        from apps.orders.models import Dispute
 
        # Litiges sur commandes contenant des produits du vendeur
        disputes = Dispute.objects.filter(
            order__items__product__vendor=request.user,
        ).distinct().select_related(
            'order', 'assigned_admin',
        ).prefetch_related(
            'messages', 'evidences',
        ).order_by('-created_at')
 
        # Filtre par statut Django
        status_filter = request.query_params.get('status')
        if status_filter:
            disputes = disputes.filter(status=status_filter)
 
        # Filtre sémantique (URL vendeur)
        semantic = request.query_params.get('filter')
        if semantic == 'urgent':
            # Litige actif sans réponse formelle du vendeur
            disputes = disputes.filter(status__in=['OPEN', 'IN_PROGRESS'], vendor_replied=False)
        elif semantic == 'mediation':
            # Vendeur a répondu, en attente décision BelivaY
            disputes = disputes.filter(status='IN_PROGRESS', vendor_replied=True)
        elif semantic == 'closed':
            disputes = disputes.filter(status__in=['RESOLVED', 'CLOSED'])
 
        serializer = VendorDisputeListSerializer(
            disputes, many=True,
            context={'request': request, 'vendor': request.user},
        )
        return Response(serializer.data)
 
    except VendorProfile.DoesNotExist:
        return Response(
            {'detail': 'Profil vendeur introuvable.'},
            status=status.HTTP_404_NOT_FOUND,
        )
 
 
@extend_schema(
    tags=["Vendors"],
    summary="Get vendor dispute detail",
    description=(
        "Détail complet d'un litige vendeur. "
        "Messages filtrés : is_internal=False et sender_role != SYSTEM. "
        "Les admins apparaissent comme 'Admin BelivaY'."
    ),
    responses={200: VendorDisputeDetailSerializer},
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def vendor_dispute_detail(request, dispute_id):
    """Détail d'un litige spécifique du vendeur."""
    try:
        vendor_profile = VendorProfile.objects.get(user=request.user)
        if not vendor_profile.is_active_vendor:
            return Response(
                {'detail': "Votre compte vendeur n'est pas encore approuvé."},
                status=status.HTTP_403_FORBIDDEN,
            )
 
        from apps.orders.models import Dispute
 
        try:
            dispute = Dispute.objects.filter(
                order__items__product__vendor=request.user,
            ).distinct().select_related(
                'order', 'assigned_admin',
            ).prefetch_related(
                'messages__sender', 'evidences',
            ).get(id=dispute_id)
        except Dispute.DoesNotExist:
            return Response(
                {'detail': 'Litige introuvable ou ne concerne pas vos produits.'},
                status=status.HTTP_404_NOT_FOUND,
            )
 
        serializer = VendorDisputeDetailSerializer(
            dispute,
            context={'request': request, 'vendor': request.user},
        )
        return Response(serializer.data)
 
    except VendorProfile.DoesNotExist:
        return Response(
            {'detail': 'Profil vendeur introuvable.'},
            status=status.HTTP_404_NOT_FOUND,
        )
 
 
@extend_schema(
    tags=["Vendors"],
    summary="Vendor formal reply to dispute",
    description=(
        "Enregistre la réponse formelle du vendeur (formulaire séparé du chat). "
        "Ne génère pas de message dans le fil de discussion. "
        "Disponible uniquement si l'admin a contacté le vendeur (vendor_contacted=True). "
        "Une seule réponse formelle par litige — écrasée si soumise à nouveau."
    ),
    request=VendorDisputeReplySerializer,
    responses={200: VendorDisputeDetailSerializer},
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def vendor_dispute_reply(request, dispute_id):
    """
    Position formelle du vendeur sur le litige.
    Conditions :
      - admin a contacté le vendeur (vendor_contacted = True)
      - litige encore actif (OPEN ou IN_PROGRESS)
    """
    try:
        vendor_profile = VendorProfile.objects.get(user=request.user)
        if not vendor_profile.is_active_vendor:
            return Response(
                {'detail': "Votre compte vendeur n'est pas encore approuvé."},
                status=status.HTTP_403_FORBIDDEN,
            )
 
        from apps.orders.models import Dispute
        from django.utils import timezone
 
        try:
            dispute = Dispute.objects.filter(
                order__items__product__vendor=request.user,
            ).distinct().get(id=dispute_id)
        except Dispute.DoesNotExist:
            return Response(
                {'detail': 'Litige introuvable.'},
                status=status.HTTP_404_NOT_FOUND,
            )
 
        # Vérifier que l'admin a bien initié le contact
        if not dispute.vendor_contacted:
            return Response(
                {'detail': "L'admin BelivaY n'a pas encore pris contact avec vous sur ce litige."},
                status=status.HTTP_400_BAD_REQUEST,
            )
 
        # Vérifier que le litige est encore actif
        if dispute.status in ['RESOLVED', 'CLOSED']:
            return Response(
                {'detail': 'Ce litige est déjà clôturé.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
 
        serializer = VendorDisputeReplySerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
 
        # Enregistrer la réponse formelle (pas de message dans le chat)
        dispute.vendor_replied         = True
        dispute.vendor_reply_type      = serializer.validated_data['reply_type']
        dispute.vendor_reply_text      = serializer.validated_data['reply_text']
        dispute.vendor_proposed_amount = serializer.validated_data.get('proposed_amount')
        dispute.vendor_replied_at      = timezone.now()
 
        # Si vendeur accepte → passer IN_PROGRESS pour que l'admin finalise
        if dispute.vendor_reply_type == 'ACCEPT' and dispute.status == 'OPEN':
            dispute.status = 'IN_PROGRESS'
 
        dispute.save(update_fields=[
            'vendor_replied', 'vendor_reply_type', 'vendor_reply_text',
            'vendor_proposed_amount', 'vendor_replied_at', 'status', 'updated_at',
        ])
 
        result = VendorDisputeDetailSerializer(
            dispute,
            context={'request': request, 'vendor': request.user},
        )
        return Response(result.data)
 
    except VendorProfile.DoesNotExist:
        return Response(
            {'detail': 'Profil vendeur introuvable.'},
            status=status.HTTP_404_NOT_FOUND,
        )
 
 
@extend_schema(
    tags=["Vendors"],
    summary="Vendor send message in dispute",
    description=(
        "Envoie un message dans le fil de discussion admin ↔ vendeur. "
        "Disponible uniquement si l'admin a contacté le vendeur (vendor_contacted=True)."
    ),
    request=VendorDisputeMessageCreateSerializer,
    responses={201: VendorDisputeMessageSerializer},
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def vendor_dispute_send_message(request, dispute_id):
    """Envoyer un message à l'admin dans le cadre d'un litige."""
    try:
        vendor_profile = VendorProfile.objects.get(user=request.user)
        if not vendor_profile.is_active_vendor:
            return Response(
                {'detail': "Votre compte vendeur n'est pas encore approuvé."},
                status=status.HTTP_403_FORBIDDEN,
            )
 
        from apps.orders.models import Dispute, DisputeMessage
 
        try:
            dispute = Dispute.objects.filter(
                order__items__product__vendor=request.user,
            ).distinct().get(id=dispute_id)
        except Dispute.DoesNotExist:
            return Response(
                {'detail': 'Litige introuvable.'},
                status=status.HTTP_404_NOT_FOUND,
            )
 
        if not dispute.vendor_contacted:
            return Response(
                {'detail': "L'admin BelivaY n'a pas encore initié la discussion."},
                status=status.HTTP_400_BAD_REQUEST,
            )
 
        if dispute.status in ['RESOLVED', 'CLOSED']:
            return Response(
                {'detail': 'Ce litige est clôturé. La messagerie est désactivée.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
 
        serializer = VendorDisputeMessageCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
 
        message = DisputeMessage.objects.create(
            dispute     = dispute,
            sender      = request.user,
            message     = serializer.validated_data['message'],
            is_internal = False,
            sender_role = DisputeMessage.SenderRole.VENDOR,
        )
 
        dispute.updated_at = timezone.now()
        dispute.save(update_fields=['updated_at'])
 
        result = VendorDisputeMessageSerializer(message, context={'request': request})
        return Response(result.data, status=status.HTTP_201_CREATED)
 
    except VendorProfile.DoesNotExist:
        return Response(
            {'detail': 'Profil vendeur introuvable.'},
            status=status.HTTP_404_NOT_FOUND,
        )
 
 
@extend_schema(
    tags=["Vendors"],
    summary="Vendor upload dispute evidence",
    description=(
        "Upload une pièce justificative (image, PDF, capture d'écran) "
        "pour un litige depuis le formulaire de réponse ou le chat. "
        "Formats acceptés : jpg, jpeg, png, gif, webp, pdf. Max 10 Mo."
    ),
    responses={201: VendorDisputeEvidenceSerializer},
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def vendor_dispute_upload_evidence(request, dispute_id):
    """Upload une pièce jointe pour un litige."""
    try:
        vendor_profile = VendorProfile.objects.get(user=request.user)
        if not vendor_profile.is_active_vendor:
            return Response(
                {'detail': "Votre compte vendeur n'est pas encore approuvé."},
                status=status.HTTP_403_FORBIDDEN,
            )
 
        from apps.orders.models import Dispute, DisputeEvidence
 
        try:
            dispute = Dispute.objects.filter(
                order__items__product__vendor=request.user,
            ).distinct().get(id=dispute_id)
        except Dispute.DoesNotExist:
            return Response(
                {'detail': 'Litige introuvable.'},
                status=status.HTTP_404_NOT_FOUND,
            )
 
        if dispute.status in ['RESOLVED', 'CLOSED']:
            return Response(
                {'detail': 'Ce litige est clôturé. Les pièces jointes ne sont plus acceptées.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
 
        file = request.FILES.get('file')
        if not file:
            return Response(
                {'detail': 'Aucun fichier fourni. Champ attendu : "file".'},
                status=status.HTTP_400_BAD_REQUEST,
            )
 
        # Validation type et taille
        allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
        if file.content_type not in allowed_types:
            return Response(
                {'detail': f"Type de fichier non autorisé ({file.content_type}). Formats acceptés : JPG, PNG, GIF, WEBP, PDF."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if file.size > 10 * 1024 * 1024:  # 10 Mo
            return Response(
                {'detail': 'Fichier trop volumineux. Taille maximum : 10 Mo.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
 
        description = request.data.get('description', '')[:255]
 
        evidence = DisputeEvidence.objects.create(
            dispute     = dispute,
            uploaded_by = request.user,
            file        = file,
            description = description,
        )
 
        result = VendorDisputeEvidenceSerializer(evidence, context={'request': request})
        return Response(result.data, status=status.HTTP_201_CREATED)
 
    except VendorProfile.DoesNotExist:
        return Response(
            {'detail': 'Profil vendeur introuvable.'},
            status=status.HTTP_404_NOT_FOUND,
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
    
    return Response(stats)


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
        
        daily_orders = Order.objects.filter(
            payment_status='PAID',
            created_at__gte=day,
            created_at__lt=day_end
        )
        daily_revenue = daily_orders.aggregate(total=Sum('total_xaf'))['total'] or 0
        
        revenue_chart.append({
            'date': day.date(),
            'revenue': daily_revenue,
            'orders': daily_orders.count(),
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


@extend_schema(
    tags=["Admin"],
    summary="Customer statistics for admin dashboard",
    description="KPIs clients + graphiques inscriptions, distribution rôles et plans.",
    responses={200: 'object'},
)
@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_customers_stats(request):
    """
    Statistiques clients pour la page admin Customers List.
    Retourne :
      - kpis        : compteurs globaux
      - registrations_chart : inscriptions jour par jour (30j)
      - role_distribution   : acheteurs / vendeurs / staff
      - plan_distribution   : répartition plans (parmi les vendeurs)
    """
    now         = timezone.now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_ago    = now - timedelta(days=7)
    month_ago   = now - timedelta(days=30)
 
    # ── KPIs ────────────────────────────────────────────────────────────────
    total           = User.objects.count()
    active_30d      = User.objects.filter(last_login__gte=month_ago).count()
    new_week        = User.objects.filter(date_joined__gte=week_ago).count()
    new_month       = User.objects.filter(date_joined__gte=month_ago).count()
    vendors_count   = VendorProfile.objects.count()
    pending_vendors = VendorProfile.objects.filter(status='PENDING').count()
 
    # Bannis via UserProfile (accès safe)
    try:
        from apps.accounts.models import UserProfile as UP
        banned = UP.objects.filter(is_banned=True).count()
    except Exception:
        banned = 0
 
    # ── Graphique inscriptions 30j ───────────────────────────────────────────
    registrations_chart = []
    for i in range(30):
        day     = today_start - timedelta(days=29 - i)
        day_end = day + timedelta(days=1)
        count   = User.objects.filter(
            date_joined__gte=day, date_joined__lt=day_end
        ).count()
        registrations_chart.append({
            'date':  day.date().isoformat(),
            'count': count,
        })
 
    # ── Distribution rôles ───────────────────────────────────────────────────
    staff_count  = User.objects.filter(is_staff=True).count()
    vendor_ids   = set(VendorProfile.objects.values_list('user_id', flat=True))
    buyer_only   = User.objects.filter(is_staff=False).exclude(id__in=vendor_ids).count()
    vendor_buyer = User.objects.filter(is_staff=False, id__in=vendor_ids).count()
 
    role_distribution = [
        {'role': 'Acheteurs',       'count': buyer_only},
        {'role': 'Vendeurs',        'count': vendor_buyer},
        {'role': 'Staff / Admin',   'count': staff_count},
    ]
 
    # ── Distribution plans vendeurs ──────────────────────────────────────────
    plan_counts = {}
    for vp in VendorProfile.objects.select_related('current_plan').all():
        code = vp.active_plan_code   # 'FREE' | 'STARTER' | 'PRO' | 'BUSINESS'
        plan_counts[code] = plan_counts.get(code, 0) + 1
 
    # Ordre d'affichage fixe
    plan_distribution = [
        {'plan': code, 'count': plan_counts.get(code, 0)}
        for code in ['FREE', 'STARTER', 'PRO', 'BUSINESS']
        if code in plan_counts
    ]
 
    return Response({
        'kpis': {
            'total':           total,
            'active_30d':      active_30d,
            'banned':          banned,
            'vendors':         vendors_count,
            'pending_vendors': pending_vendors,
            'new_this_week':   new_week,
            'new_this_month':  new_month,
        },
        'registrations_chart': registrations_chart,
        'role_distribution':   role_distribution,
        'plan_distribution':   plan_distribution,
    })



@extend_schema(tags=["Admin"], summary="Live connected users with GPS")
@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_live_users(request):
    import json
    from django.core.cache import cache
    from django.utils import timezone
 
    now = timezone.now()
    ACTIVE_USERS_KEY = 'belivay_active_users'
    USER_KEY_PREFIX  = 'belivay_user_'
 
    active_ids = cache.get(ACTIVE_USERS_KEY, [])
    if isinstance(active_ids, str):
        try:
            active_ids = json.loads(active_ids)
        except Exception:
            active_ids = []
 
    users_list = []
    valid_ids  = []
 
    for uid in active_ids:
        raw = cache.get(f'{USER_KEY_PREFIX}{uid}')
        if raw is None:
            continue
        valid_ids.append(uid)
        try:
            data = json.loads(raw) if isinstance(raw, str) else raw
        except Exception:
            continue
 
        session_min = 1
        last_seen_str = data.get('last_seen', '')
        if last_seen_str:
            try:
                from datetime import datetime, timezone as dt_tz
                last_seen = datetime.fromisoformat(last_seen_str)
                if last_seen.tzinfo is None:
                    last_seen = last_seen.replace(tzinfo=dt_tz.utc)
                now_utc = now.replace(tzinfo=dt_tz.utc) if now.tzinfo is None else now
                session_min = max(1, int((now_utc - last_seen).total_seconds() // 60))
            except Exception:
                pass
 
        users_list.append({
            'id':          data.get('user_id', uid),
            'username':    data.get('username', f'user_{uid}'),
            'full_name':   data.get('full_name', ''),
            'role':        data.get('role', 'buyer'),
            'city':        data.get('city'),
            # Localisation exacte
            'lat':         data.get('lat'),
            'lng':         data.get('lng'),
            'accuracy':    data.get('accuracy'),
            'has_gps':     data.get('has_gps', False),
            'page':        data.get('page', 'Application'),
            'device':      data.get('device', 'desktop'),
            'last_seen':   last_seen_str,
            'session_min': session_min,
        })
 
    if len(valid_ids) != len(active_ids):
        cache.set(ACTIVE_USERS_KEY, valid_ids, 360)
 
    users_list.sort(key=lambda x: x.get('last_seen', ''), reverse=True)
 
    buyers  = sum(1 for u in users_list if u['role'] == 'buyer')
    vendors = sum(1 for u in users_list if u['role'] == 'vendor')
    admins  = sum(1 for u in users_list if u['role'] == 'admin')
    gps_count = sum(1 for u in users_list if u.get('has_gps'))
 
    city_counts: dict = {}
    for u in users_list:
        c = u.get('city') or 'Inconnue'
        city_counts[c] = city_counts.get(c, 0) + 1
 
    by_city = sorted(
        [{'city': c, 'count': n} for c, n in city_counts.items()],
        key=lambda x: -x['count']
    )[:8]
 
    page_counts: dict = {}
    for u in users_list:
        p = u.get('page', 'Application')
        page_counts[p] = page_counts.get(p, 0) + 1
 
    by_page = sorted(
        [{'page': p, 'count': n} for p, n in page_counts.items()],
        key=lambda x: -x['count']
    )[:8]
 
    device_counts: dict = {}
    for u in users_list:
        d = u.get('device', 'desktop')
        device_counts[d] = device_counts.get(d, 0) + 1
 
    return Response({
        'total_online': len(users_list),
        'buyers':       buyers,
        'vendors':      vendors,
        'admins':       admins,
        'gps_count':    gps_count,
        'by_city':      by_city,
        'by_page':      by_page,
        'by_device':    [{'device': d, 'count': n} for d, n in device_counts.items()],
        'users':        users_list,
        'last_updated': now.isoformat(),
    })
 
 
@extend_schema(tags=["Admin"], summary="Vendors map — distribution by city")
@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_vendors_map(request):
    """
    Distribution géographique des vendeurs par ville.
    Retourne les données pour la visualisation SVG Cameroun.
    """
    from django.db.models import Sum, Count
 
    approved = VendorProfile.objects.filter(status='APPROVED').select_related('user')
    all_vp   = VendorProfile.objects.select_related('user')
 
    # Agréger par ville
    city_data: dict = {}
    for vp in all_vp:
        city = vp.city or 'Autre'
        if city not in city_data:
            city_data[city] = {'city': city, 'count': 0, 'approved': 0, 'pending': 0, 'gmv': 0, 'lat': 0, 'lng': 0}
        city_data[city]['count'] += 1
        if vp.status == 'APPROVED':
            city_data[city]['approved'] += 1
            city_data[city]['gmv'] += getattr(vp, 'total_revenue', 0) or 0
        if vp.status == 'PENDING':
            city_data[city]['pending'] += 1
 
    # Coordonnées approximatives des villes camerounaises (lat/lng)
    COORDS = {
        'Yaoundé':    {'lat': 3.848,  'lng': 11.502},
        'Douala':     {'lat': 4.050,  'lng': 9.768 },
        'Bafoussam':  {'lat': 5.478,  'lng': 10.417},
        'Bamenda':    {'lat': 5.959,  'lng': 10.146},
        'Garoua':     {'lat': 9.301,  'lng': 13.397},
        'Maroua':     {'lat': 10.595, 'lng': 14.316},
        'Ngaoundéré': {'lat': 7.323,  'lng': 13.584},
        'Bertoua':    {'lat': 4.578,  'lng': 13.686},
        'Ebolowa':    {'lat': 2.900,  'lng': 11.150},
        'Kribi':      {'lat': 2.939,  'lng': 9.909 },
        'Limbé':      {'lat': 4.024,  'lng': 9.204 },
    }
 
    cities_list = []
    for city, data in city_data.items():
        coords = COORDS.get(city, {'lat': 4.5, 'lng': 11.5})
        cities_list.append({**data, **coords})
 
    cities_list.sort(key=lambda x: -x['count'])
 
    # Liste des boutiques pour le panneau latéral
    vendors_list = []
    for vp in approved[:100]:
        vendors_list.append({
            'id':                vp.id,
            'business_name':     vp.business_name,
            'city':              vp.city or 'N/A',
            'status':            vp.status,
            'certification_tier':vp.certification_tier or 'BRONZE',
            'total_revenue':     getattr(vp, 'total_revenue', 0) or 0,
        })
 
    top_city = cities_list[0]['city'] if cities_list else 'N/A'
 
    return Response({
        'cities':        cities_list,
        'vendors':       vendors_list,
        'total_approved':approved.count(),
        'total_cities':  len([c for c in cities_list if c['approved'] > 0]),
        'top_city':      top_city,
    })  


    
def _get_target_customers(filters: dict):
    """
    Retourne un queryset d'utilisateurs selon les filtres :
      - audience : 'all' | 'city' | 'tier' | 'user'
      - city     : str (si audience == 'city')
      - tier     : str BRONZE|SILVER|GOLD|DIAMOND (si audience == 'tier')
      - user_id  : int (si audience == 'user')
    N'inclut que les acheteurs actifs non bannis.
    """
    audience = filters.get('audience', 'all')
 
    # Base : acheteurs actifs non bannis
    qs = User.objects.filter(is_active=True, is_staff=False)
 
    if audience == 'all':
        pass  # Tous les clients
 
    elif audience == 'city':
        city = filters.get('city', '')
        if city:
            # Cherche dans le profil vendeur ou le profil utilisateur
            from django.db.models import Q
            qs = qs.filter(
                Q(vendor_profile__city__iexact=city) |
                Q(profile__city__iexact=city)
            ).distinct()
 
    elif audience == 'tier':
        tier = filters.get('tier', 'BRONZE')
        # Le tier est dans VendorProfile pour les vendeurs
        # Pour les acheteurs, on utilise loyalty_tier dans UserProfile si disponible
        from django.db.models import Q
        qs = qs.filter(
            Q(vendor_profile__certification_tier=tier) |
            Q(profile__loyalty_tier=tier)
        ).distinct()
 
    elif audience == 'user':
        user_id = filters.get('user_id')
        if user_id:
            qs = qs.filter(id=user_id)
        else:
            qs = qs.none()
 
    # Exclure les utilisateurs bannis
    qs = qs.exclude(profile__is_banned=True)
 
    return qs
 
 
@extend_schema(tags=["Admin"], summary="Preview customer broadcast audience count")
@api_view(['POST'])
@permission_classes([IsAdminUser])
def admin_customers_broadcast_preview(request):
    """
    Retourne le nombre d'utilisateurs qui recevront le broadcast
    selon les filtres fournis — sans envoyer.
    """
    filters = {
        'audience': request.data.get('audience', 'all'),
        'city':     request.data.get('city', ''),
        'tier':     request.data.get('tier', ''),
        'user_id':  request.data.get('user_id'),
    }
    qs = _get_target_customers(filters)
    count = qs.count()
 
    # Exemple de destinataires (max 5) pour l'aperçu
    sample = list(qs.values('id', 'username', 'email')[:5])
 
    return Response({
        'count':  count,
        'sample': sample,
    })
 
 
@extend_schema(tags=["Admin"], summary="Broadcast notification to customers")
@api_view(['POST'])
@permission_classes([IsAdminUser])
def admin_customers_broadcast(request):
    """
    Envoie une notification à l'audience cible.
    Crée un UserNotification pour chaque destinataire.
    Stocke l'historique dans le cache Redis (max 50 entrées).
    """
    import json
    from django.core.cache import cache
    from apps.accounts.models import UserNotification
 
    title     = request.data.get('title', '').strip()
    message   = request.data.get('message', '').strip()
    notif_type= request.data.get('type', 'PROMOTION')  # PROMOTION | SYSTEM | ORDER
    action_url= request.data.get('action_url', '')
    filters   = {
        'audience': request.data.get('audience', 'all'),
        'city':     request.data.get('city', ''),
        'tier':     request.data.get('tier', ''),
        'user_id':  request.data.get('user_id'),
    }
 
    if not title or not message:
        return Response({'detail': 'Titre et message requis.'}, status=400)
 
    qs    = _get_target_customers(filters)
    users = list(qs)
    count = len(users)
 
    if count == 0:
        return Response({'detail': 'Aucun utilisateur ciblé avec ces filtres.'}, status=400)
 
    # Créer les notifications en bulk
    notifications = [
        UserNotification(
            user=u,
            title=title,
            message=message,
            notification_type=notif_type,
            action_url=action_url,
        )
        for u in users
    ]
    UserNotification.objects.bulk_create(notifications, batch_size=500)
 
    # Stocker dans l'historique cache (max 50)
    HISTORY_KEY = 'belivay_broadcast_history'
    history = cache.get(HISTORY_KEY, [])
    if isinstance(history, str):
        try:
            history = json.loads(history)
        except Exception:
            history = []
 
    history.insert(0, {
        'id':          timezone.now().timestamp(),
        'title':       title,
        'message':     message[:120] + ('…' if len(message) > 120 else ''),
        'audience':    filters['audience'],
        'city':        filters.get('city', ''),
        'tier':        filters.get('tier', ''),
        'type':        notif_type,
        'sent_to':     count,
        'sent_by':     request.user.username,
        'sent_at':     timezone.now().isoformat(),
    })
    cache.set(HISTORY_KEY, history[:50], 86400 * 30)  # 30 jours
 
    return Response({
        'detail': f'Notification envoyée à {count} utilisateur{"s" if count > 1 else ""}.',
        'sent_to': count,
    })
 
 
@extend_schema(tags=["Admin"], summary="History of customer broadcasts")
@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_customers_broadcast_history(request):
    """Retourne les 50 derniers broadcasts envoyés aux clients."""
    import json
    from django.core.cache import cache
 
    HISTORY_KEY = 'belivay_broadcast_history'
    history = cache.get(HISTORY_KEY, [])
    if isinstance(history, str):
        try:
            history = json.loads(history)
        except Exception:
            history = []
 
    return Response({'history': history})    



# Barème client (acheteurs) — cohérent avec accounts/serializers.py
CLIENT_TIER_THRESHOLDS = {
    'BRONZE':   (0,    499),
    'SILVER':   (500,  999),
    'GOLD':     (1000, 1999),
    'DIAMOND':  (2000, None),
}
 
 
def _client_tier_from_points(points: int) -> str:
    if points >= 2000: return 'DIAMOND'
    if points >= 1000: return 'GOLD'
    if points >= 500:  return 'SILVER'
    return 'BRONZE'
 
 
@extend_schema(tags=["Admin"], summary="Customer loyalty stats & top clients")
@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_customers_loyalty(request):
    """
    Stats fidélité clients acheteurs :
    - Distribution par tier
    - Top 20 clients par points
    - Récents montants en points
    Points = orders_count * 100 (formule actuelle dans accounts/serializers.py)
    """
    from django.db.models import Count, Sum, Q
    from django.contrib.auth.models import User
 
    # Acheteurs actifs (non staff, non bannis)
    buyers = User.objects.filter(
        is_active=True, is_staff=False
    ).prefetch_related('orders').exclude(
        Q(profile__is_banned=True)
    )
 
    # Calculer les points et tier pour chaque acheteur
    tier_counts = {'BRONZE': 0, 'SILVER': 0, 'GOLD': 0, 'DIAMOND': 0}
    top_clients_raw = []
    total_points_all = 0
 
    for user in buyers:
        orders_count = user.orders.filter(payment_status='PAID').count()
        points       = orders_count * 100
        tier         = _client_tier_from_points(points)
        tier_counts[tier] += 1
        total_points_all  += points
 
        top_clients_raw.append({
            'id':          user.id,
            'username':    user.username,
            'full_name':   f"{user.first_name} {user.last_name}".strip() or user.username,
            'email':       user.email,
            'points':      points,
            'tier':        tier,
            'orders_count':orders_count,
            'date_joined': user.date_joined.isoformat(),
        })
 
    # Trier par points décroissants et prendre les 20 premiers
    top_clients_raw.sort(key=lambda x: -x['points'])
    top_clients = top_clients_raw[:20]
 
    total_buyers = len(top_clients_raw)
    avg_points   = round(total_points_all / total_buyers, 1) if total_buyers > 0 else 0
 
    # Répartition en pourcentage
    distribution = []
    for tier_key, (low, high) in CLIENT_TIER_THRESHOLDS.items():
        count = tier_counts[tier_key]
        distribution.append({
            'tier':    tier_key,
            'label':   {'BRONZE': 'Bronze', 'SILVER': 'Argent', 'GOLD': 'Or', 'DIAMOND': 'Diamant'}[tier_key],
            'count':   count,
            'pct':     round(count / total_buyers * 100, 1) if total_buyers > 0 else 0,
            'min_pts': low,
            'max_pts': high,
        })
 
    return Response({
        'total_buyers':  total_buyers,
        'avg_points':    avg_points,
        'tier_counts':   tier_counts,
        'distribution':  distribution,
        'top_clients':   top_clients,
        'earning_rule':  '1 commande payée = 100 points',
        'thresholds': {
            'BRONZE':  0,
            'SILVER':  500,
            'GOLD':    1000,
            'DIAMOND': 2000,
        },
    }) 



@extend_schema(tags=["Admin"], summary="System logs with charts data")
@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_system_logs(request):
    from apps.vendors.models import SystemLog
    from django.utils import timezone
    from datetime import timedelta
    from django.db.models import Count
 
    level     = request.GET.get('level', '')
    service   = request.GET.get('service', '')
    search    = request.GET.get('search', '')
    date_from = request.GET.get('date_from', '')
    date_to   = request.GET.get('date_to', '')
    try:
        page      = max(1, int(request.GET.get('page', 1)))
        page_size = min(200, max(10, int(request.GET.get('page_size', 50))))
    except (ValueError, TypeError):
        page, page_size = 1, 50
 
    qs = SystemLog.objects.all()
 
    if level:
        qs = qs.filter(level=level.upper())
    if service:
        qs = qs.filter(service=service.lower())
    if search:
        from django.db.models import Q
        qs = qs.filter(Q(message__icontains=search) | Q(logger__icontains=search))
    if date_from:
        try:
            from django.utils.dateparse import parse_datetime, parse_date
            dt = parse_datetime(date_from) or parse_date(date_from)
            if dt:
                qs = qs.filter(created_at__gte=dt)
        except Exception:
            pass
    if date_to:
        try:
            from django.utils.dateparse import parse_datetime, parse_date
            dt = parse_datetime(date_to) or parse_date(date_to)
            if dt:
                qs = qs.filter(created_at__lte=dt)
        except Exception:
            pass
 
    total  = qs.count()
    offset = (page - 1) * page_size
    logs   = qs[offset:offset + page_size]
 
    logs_data = [
        {
            'id':         l.id,
            'level':      l.level,
            'service':    l.service,
            'message':    l.message,
            'logger':     l.logger,
            'pathname':   l.pathname,
            'lineno':     l.lineno,
            'exc_text':   l.exc_text,
            'ip_address': l.ip_address,
            'user_id':    l.user_id,
            'created_at': l.created_at.isoformat(),
        }
        for l in logs
    ]
 
    # ── KPIs 24h ─────────────────────────────────────────────────────────────
    last_24h = timezone.now() - timedelta(hours=24)
    kpis_qs  = SystemLog.objects.filter(created_at__gte=last_24h)
    kpis = {
        'total_24h':    kpis_qs.count(),
        'errors_24h':   kpis_qs.filter(level__in=['ERROR', 'CRITICAL']).count(),
        'warnings_24h': kpis_qs.filter(level='WARNING').count(),
        'info_24h':     kpis_qs.filter(level='INFO').count(),
    }
 
    # ── Santé par service (erreurs 24h) ───────────────────────────────────────
    by_service = list(
        SystemLog.objects.filter(
            created_at__gte=last_24h,
            level__in=['ERROR', 'CRITICAL'],
        )
        .values('service')
        .annotate(count=Count('id'))
        .order_by('-count')
    )
 
    # ── Activité par heure (24 dernières heures) ──────────────────────────────
    by_hour = []
    now     = timezone.now()
    for i in range(23, -1, -1):
        hour_start = now - timedelta(hours=i + 1)
        hour_end   = now - timedelta(hours=i)
        hour_qs    = SystemLog.objects.filter(created_at__gte=hour_start, created_at__lt=hour_end)
        by_hour.append({
            'hour':     hour_start.strftime('%Y-%m-%dT%H:%M'),
            'errors':   hour_qs.filter(level__in=['ERROR', 'CRITICAL']).count(),
            'warnings': hour_qs.filter(level='WARNING').count(),
            'info':     hour_qs.filter(level='INFO').count(),
        })
 
    return Response({
        'logs':        logs_data,
        'total':       total,
        'page':        page,
        'page_size':   page_size,
        'total_pages': max(1, -(-total // page_size)),
        'kpis':        kpis,
        'by_service':  by_service,
        'by_hour':     by_hour,
    })
 
 
@extend_schema(tags=["Admin"], summary="Delete old system logs")
@api_view(['DELETE'])
@permission_classes([IsAdminUser])
def admin_clear_logs(request):
    from apps.vendors.models import SystemLog
    from django.utils import timezone
    from datetime import timedelta
 
    try:
        days = max(7, int(request.GET.get('days', 30)))
    except (ValueError, TypeError):
        days = 30
 
    threshold    = timezone.now() - timedelta(days=days)
    deleted, _   = SystemLog.objects.filter(created_at__lt=threshold).delete()
 
    return Response({
        'deleted': deleted,
        'message': f'{deleted} log{"s" if deleted != 1 else ""} supprimé{"s" if deleted != 1 else ""} (antérieur{"s" if deleted != 1 else ""} à {days} jours).',
    })         


#  ADMINISTRATION - STATISTIQUES VENDEURS
@extend_schema(
    tags=["Admin"],
    summary="Vendor statistics for admin",
    description="KPIs vendeurs + graphique GMV 30j + distributions statuts/plans/certifications.",
    responses={200: 'object'},
)
@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_vendors_stats(request):
    from apps.catalog.models import Product
    from apps.orders.models import OrderItem
    from django.db.models import Sum
 
    now        = timezone.now()
    today_start= now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_ago   = now - timedelta(days=7)
    month_ago  = now - timedelta(days=30)
 
    # ── KPIs ────────────────────────────────────────────────────────────────
    total     = VendorProfile.objects.count()
    pending   = VendorProfile.objects.filter(status='PENDING').count()
    approved  = VendorProfile.objects.filter(status='APPROVED').count()
    rejected  = VendorProfile.objects.filter(status='REJECTED').count()
    suspended = VendorProfile.objects.filter(status='SUSPENDED').count()
    new_week  = VendorProfile.objects.filter(created_at__gte=week_ago).count()
    new_month = VendorProfile.objects.filter(created_at__gte=month_ago).count()
 
    # GMV total (revenus générés par tous les vendeurs)
    gmv_total = OrderItem.objects.aggregate(t=Sum('line_total_xaf'))['t'] or 0
    gmv_month = OrderItem.objects.filter(
        order__created_at__gte=month_ago
    ).aggregate(t=Sum('line_total_xaf'))['t'] or 0
 
    # ── Graphique GMV 30 jours ───────────────────────────────────────────────
    gmv_chart = []
    for i in range(30):
        day     = today_start - timedelta(days=29 - i)
        day_end = day + timedelta(days=1)
        revenue = OrderItem.objects.filter(
            order__created_at__gte=day,
            order__created_at__lt=day_end,
            order__payment_status='PAID',
        ).aggregate(t=Sum('line_total_xaf'))['t'] or 0
        gmv_chart.append({'date': day.date().isoformat(), 'revenue': revenue})
 
    # ── Distribution statuts ─────────────────────────────────────────────────
    status_distribution = [
        {'status': 'APPROVED',  'label': 'Approuvés',   'count': approved},
        {'status': 'PENDING',   'label': 'En attente',  'count': pending},
        {'status': 'SUSPENDED', 'label': 'Suspendus',   'count': suspended},
        {'status': 'REJECTED',  'label': 'Rejetés',     'count': rejected},
    ]
 
    # ── Distribution plans ───────────────────────────────────────────────────
    plan_counts = {}
    for vp in VendorProfile.objects.select_related('current_plan').all():
        code = vp.active_plan_code
        plan_counts[code] = plan_counts.get(code, 0) + 1
 
    plan_distribution = [
        {'plan': code, 'count': plan_counts.get(code, 0)}
        for code in ['FREE', 'STARTER', 'PRO', 'BUSINESS']
        if code in plan_counts
    ]
 
    # ── Distribution certifications ──────────────────────────────────────────
    cert_distribution = []
    for tier in ['BRONZE', 'SILVER', 'GOLD', 'DIAMOND']:
        count = VendorProfile.objects.filter(certification_tier=tier).count()
        if count > 0:
            cert_distribution.append({'tier': tier, 'count': count})
 
    return Response({
        'kpis': {
            'total':     total,
            'pending':   pending,
            'approved':  approved,
            'rejected':  rejected,
            'suspended': suspended,
            'new_week':  new_week,
            'new_month': new_month,
            'gmv_total': gmv_total,
            'gmv_month': gmv_month,
        },
        'gmv_chart':            gmv_chart,
        'status_distribution':  status_distribution,
        'plan_distribution':    plan_distribution,
        'cert_distribution':    cert_distribution,
    })    


#  ADMINISTRATION - STATISTIQUES FINANCIÈRES
@extend_schema(
    tags=["Admin"],
    summary="Financial statistics for admin",
    description="KPIs financiers + graphique commissions 30j + top vendeurs + retraits en attente.",
    responses={200: 'object'},
)
@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_finances_stats(request):
    """
    Statistiques financières globales pour l'admin BelivaY.
    Retourne :
      - kpis            : commissions, GMV, escrow en cours, retraits pendants
      - commissions_chart : commissions jour par jour (30j)
      - top_vendors       : top 10 contributeurs (commission)
      - pending_withdrawals : retraits vendeurs en attente
    """
    from apps.orders.models import Order, PlatformSettings
    from apps.vendors.models import WithdrawalRequest
    from django.db.models import Sum, F, ExpressionWrapper, DecimalField
 
    now         = timezone.now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    month_ago   = now - timedelta(days=30)
    week_ago    = now - timedelta(days=7)
 
    settings = PlatformSettings.get_settings()
 
    # ── Commandes payées ─────────────────────────────────────────────────────
    paid_orders = Order.objects.filter(payment_status='PAID')
 
    # Commission totale = SUM(subtotal_xaf * commission_rate_snapshot / 100)
    def commission_sum(qs):
        total = 0
        for o in qs.only('subtotal_xaf', 'commission_rate_snapshot'):
            total += round(o.subtotal_xaf * float(o.commission_rate_snapshot) / 100)
        return total
 
    total_commission  = commission_sum(paid_orders)
    month_commission  = commission_sum(paid_orders.filter(created_at__gte=month_ago))
    week_commission   = commission_sum(paid_orders.filter(created_at__gte=week_ago))
 
    # GMV total
    gmv_total = paid_orders.aggregate(t=Sum('subtotal_xaf'))['t'] or 0
    gmv_month = paid_orders.filter(created_at__gte=month_ago).aggregate(t=Sum('subtotal_xaf'))['t'] or 0
 
    # Escrow en cours (BLOCKED)
    escrow_blocked = Order.objects.filter(escrow_status='BLOCKED').aggregate(t=Sum('subtotal_xaf'))['t'] or 0
 
    # Retraits vendeurs pendants
    pending_withdrawals_qs = WithdrawalRequest.objects.filter(status='PENDING')
    pending_withdrawals_amount = pending_withdrawals_qs.aggregate(t=Sum('amount_xaf'))['t'] or 0
    pending_withdrawals_count  = pending_withdrawals_qs.count()
 
    # Retraits approuvés total (fonds versés aux vendeurs)
    approved_withdrawals_total = WithdrawalRequest.objects.filter(
        status='APPROVED'
    ).aggregate(t=Sum('net_amount_xaf'))['t'] or 0
 
    # ── Graphique commissions 30j ────────────────────────────────────────────
    commissions_chart = []
    for i in range(30):
        day     = today_start - timedelta(days=29 - i)
        day_end = day + timedelta(days=1)
        day_orders = paid_orders.filter(created_at__gte=day, created_at__lt=day_end)
        day_commission = commission_sum(day_orders)
        day_gmv = day_orders.aggregate(t=Sum('subtotal_xaf'))['t'] or 0
        commissions_chart.append({
            'date':       day.date().isoformat(),
            'commission': day_commission,
            'gmv':        day_gmv,
        })
 
    # ── Top vendeurs (par commission générée) ────────────────────────────────
    # On agrège par vendeur via les items de commandes payées
    from apps.orders.models import OrderItem
    from django.contrib.auth.models import User
 
    vendor_commissions = {}
    for item in OrderItem.objects.filter(
        order__payment_status='PAID'
    ).select_related('order', 'product__vendor', 'product__vendor__vendor_profile'):
        vendor = item.product.vendor
        commission = round(item.line_total_xaf * float(item.order.commission_rate_snapshot) / 100)
        key = vendor.id
        if key not in vendor_commissions:
            profile = getattr(vendor, 'vendor_profile', None)
            vendor_commissions[key] = {
                'vendor_id':      key,
                'vendor_name':    vendor.username,
                'business_name':  profile.business_name if profile else vendor.username,
                'total_gmv':      0,
                'total_commission': 0,
            }
        vendor_commissions[key]['total_gmv']        += item.line_total_xaf
        vendor_commissions[key]['total_commission'] += commission
 
    top_vendors = sorted(
        vendor_commissions.values(),
        key=lambda x: x['total_commission'],
        reverse=True
    )[:10]
 
    # ── Retraits en attente (liste) ──────────────────────────────────────────
    pending_list = []
    for wr in pending_withdrawals_qs.select_related('vendor__user').order_by('-created_at')[:10]:
        pending_list.append({
            'id':           wr.id,
            'reference':    wr.reference,
            'vendor_id':    wr.vendor.id,
            'business_name':wr.vendor.business_name,
            'amount_xaf':   wr.amount_xaf,
            'net_amount_xaf': wr.net_amount_xaf,
            'operator':     wr.operator,
            'phone':        wr.phone_number,
            'created_at':   wr.created_at.isoformat(),
        })
 
    return Response({
        'kpis': {
            'total_commission':          total_commission,
            'month_commission':          month_commission,
            'week_commission':           week_commission,
            'gmv_total':                 gmv_total,
            'gmv_month':                 gmv_month,
            'escrow_blocked':            escrow_blocked,
            'pending_withdrawals_amount':pending_withdrawals_amount,
            'pending_withdrawals_count': pending_withdrawals_count,
            'approved_withdrawals_total':approved_withdrawals_total,
            'commission_rate':           str(settings.platform_commission_percent),
        },
        'commissions_chart': commissions_chart,
        'top_vendors':        top_vendors,
        'pending_withdrawals':pending_list,
    })



@extend_schema(tags=["Admin"], summary="List all withdrawal requests (admin)")
@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_list_withdrawals(request):
    """Liste toutes les demandes de retrait avec filtre optionnel par statut."""
    from apps.vendors.models import WithdrawalRequest
 
    qs = WithdrawalRequest.objects.select_related(
        'vendor', 'vendor__user'
    ).order_by('-created_at')
 
    status_filter = request.query_params.get('status')
    if status_filter:
        qs = qs.filter(status=status_filter)
 
    result = []
    for wr in qs:
        result.append({
            'id':               wr.id,
            'reference':        wr.reference,
            'vendor_id':        wr.vendor.id,
            'business_name':    wr.vendor.business_name,
            'user_email':       wr.vendor.user.email,
            'amount_xaf':       wr.amount_xaf,
            'fee_amount_xaf':   wr.fee_amount_xaf,
            'net_amount_xaf':   wr.net_amount_xaf,
            'operator':         wr.operator,
            'phone_number':     wr.phone_number,
            'status':           wr.status,
            'admin_note':       wr.admin_note,
            'processed_at':     wr.processed_at.isoformat() if wr.processed_at else None,
            'created_at':       wr.created_at.isoformat(),
        })
 
    return Response(result)
 
 
@extend_schema(tags=["Admin"], summary="Approve a withdrawal request")
@api_view(['POST'])
@permission_classes([IsAdminUser])
def admin_approve_withdrawal(request, wd_id):
    """Approuve un retrait (statut → APPROVED). Admin confirme le virement MoMo effectué."""
    from apps.vendors.models import WithdrawalRequest
 
    try:
        wr = WithdrawalRequest.objects.get(id=wd_id)
    except WithdrawalRequest.DoesNotExist:
        return Response({'detail': 'Retrait introuvable.'}, status=404)
 
    if wr.status != 'PENDING':
        return Response({'detail': f"Impossible d'approuver un retrait en statut '{wr.status}'."}, status=400)
 
    wr.status       = 'APPROVED'
    wr.admin_note   = request.data.get('admin_note', '')
    wr.processed_at = timezone.now()
    wr.save()
 
    return Response({'id': wr.id, 'status': wr.status, 'processed_at': wr.processed_at.isoformat()})
 
 
@extend_schema(tags=["Admin"], summary="Reject a withdrawal request")
@api_view(['POST'])
@permission_classes([IsAdminUser])
def admin_reject_withdrawal(request, wd_id):
    """Rejette un retrait (statut → REJECTED) avec motif obligatoire."""
    from apps.vendors.models import WithdrawalRequest
 
    try:
        wr = WithdrawalRequest.objects.get(id=wd_id)
    except WithdrawalRequest.DoesNotExist:
        return Response({'detail': 'Retrait introuvable.'}, status=404)
 
    if wr.status != 'PENDING':
        return Response({'detail': f"Impossible de rejeter un retrait en statut '{wr.status}'."}, status=400)
 
    reason = request.data.get('reason', '').strip()
    if not reason:
        return Response({'detail': 'Le motif de rejet est requis.'}, status=400)
 
    wr.status       = 'REJECTED'
    wr.admin_note   = reason
    wr.processed_at = timezone.now()
    wr.save()
 
    return Response({'id': wr.id, 'status': wr.status, 'admin_note': wr.admin_note})
 
 
@extend_schema(tags=["Admin"], summary="KYC queue — pending vendors")
@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_kyc_queue(request):
    """
    File d'attente KYC : vendeurs en attente de validation.
    Retourne le profil complet + document d'identité pour chaque vendeur PENDING.
    """
    status_filter = request.query_params.get('status', 'PENDING')
 
    vendors = VendorProfile.objects.filter(
        status=status_filter
    ).select_related('user', 'current_plan').order_by('created_at')
 
    result = []
    for vp in vendors:
        days_waiting = (timezone.now() - vp.created_at).days
        result.append({
            'id':               vp.id,
            'user_id':          vp.user.id,
            'user_email':       vp.user.email,
            'user_full_name':   f"{vp.user.first_name} {vp.user.last_name}".strip() or vp.user.username,
            'business_name':    vp.business_name,
            'business_description': vp.business_description,
            'phone':            vp.phone,
            'city':             vp.city,
            'address':          vp.address,
            'id_document':      vp.id_document,
            'status':           vp.status,
            'days_waiting':     days_waiting,
            'created_at':       vp.created_at.isoformat(),
            'approved_at':      vp.approved_at.isoformat() if vp.approved_at else None,
        })
 
    kpis = {
        'pending':   VendorProfile.objects.filter(status='PENDING').count(),
        'approved':  VendorProfile.objects.filter(status='APPROVED').count(),
        'rejected':  VendorProfile.objects.filter(status='REJECTED').count(),
        'suspended': VendorProfile.objects.filter(status='SUSPENDED').count(),
    }
 
    return Response({'kpis': kpis, 'vendors': result})   


#  ADMINISTRATION - LISTE PLANS ABONNEMENT
@extend_schema(tags=["Admin"], summary="List all subscription plans with subscriber counts")
@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_list_plans(request):
    from apps.vendors.models import SubscriptionPlan, VendorProfile
 
    plans = SubscriptionPlan.objects.all().order_by('display_order')
    result = []
    for p in plans:
        count = VendorProfile.objects.filter(current_plan=p).count()
        result.append({
            'id':                p.id,
            'code':              p.code,
            'name':              p.name,
            'description':       p.description,
            'price_monthly_xaf': p.price_monthly_xaf,
            'price_annual_xaf':  p.price_annual_xaf,
            'commission_rate':   float(p.commission_rate),
            'max_products':      p.max_products,
            'max_boosts_month':  p.max_boosts_month,
            'trial_days':        p.trial_days,
            'plan_duration_days':p.plan_duration_days,
            'features':          p.features,
            'is_active':         p.is_active,
            'display_order':     p.display_order,
            'subscribers_count': count,
        })
    return Response(result)
 

#  ADMINISTRATION - MISE À JOUR PLAN ABONNEMENT 
@extend_schema(tags=["Admin"], summary="Update a subscription plan")
@api_view(['PATCH'])
@permission_classes([IsAdminUser])
def admin_update_plan(request, plan_id):
    from apps.vendors.models import SubscriptionPlan
 
    try:
        plan = SubscriptionPlan.objects.get(id=plan_id)
    except SubscriptionPlan.DoesNotExist:
        return Response({'detail': 'Plan introuvable.'}, status=404)
 
    ALLOWED = [
        'description', 'price_monthly_xaf', 'price_annual_xaf',
        'commission_rate', 'max_products', 'max_boosts_month',
        'trial_days', 'plan_duration_days', 'features',
        'is_active', 'display_order',
    ]
    for field in ALLOWED:
        if field in request.data:
            setattr(plan, field, request.data[field])
    plan.save()
 
    return Response({'id': plan.id, 'code': plan.code, 'updated': True})


#  ADMINISTRATION - GESTION AVIS
@extend_schema(tags=["Admin"], summary="List all product reviews")
@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_list_reviews(request):
    from apps.catalog.models import ProductReview
 
    qs = ProductReview.objects.select_related(
        'product', 'product__vendor', 'user'
    ).order_by('-created_at')
 
    is_approved = request.query_params.get('is_approved')
    if is_approved is not None:
        qs = qs.filter(is_approved=is_approved.lower() == 'true')
 
    rating = request.query_params.get('rating')
    if rating:
        qs = qs.filter(rating=int(rating))
 
    result = []
    for r in qs:
        result.append({
            'id':                   r.id,
            'product_id':           r.product.id,
            'product_title':        r.product.title,
            'product_slug':         r.product.slug,
            'vendor_name':          r.product.vendor.username,
            'user_id':              r.user.id,
            'user_name':            r.user.username,
            'rating':               r.rating,
            'title':                r.title,
            'comment':              r.comment,
            'is_approved':          r.is_approved,
            'is_verified_purchase': r.is_verified_purchase,
            'created_at':           r.created_at.isoformat(),
        })
 
    return Response(result)
 

#  ADMINISTRATION - STATISTIQUES AVIS 
@extend_schema(tags=["Admin"], summary="Review statistics")
@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_reviews_stats(request):
    from apps.catalog.models import ProductReview
    from django.db.models import Avg, Count
 
    qs     = ProductReview.objects.all()
    total  = qs.count()
    approved = qs.filter(is_approved=True).count()
    avg    = qs.aggregate(a=Avg('rating'))['a'] or 0
 
    by_rating = {}
    for r in range(1, 6):
        by_rating[str(r)] = qs.filter(rating=r).count()
 
    return Response({
        'total':      total,
        'approved':   approved,
        'pending':    total - approved,
        'avg_rating': round(avg, 1),
        'by_rating':  by_rating,
    })
 

#  ADMINISTRATION - GESTION AVIS 
@extend_schema(tags=["Admin"], summary="Toggle review approval")
@api_view(['POST'])
@permission_classes([IsAdminUser])
def admin_toggle_review(request, review_id):
    from apps.catalog.models import ProductReview
 
    try:
        r = ProductReview.objects.get(id=review_id)
    except ProductReview.DoesNotExist:
        return Response({'detail': 'Avis introuvable.'}, status=404)
 
    r.is_approved = not r.is_approved
    r.save(update_fields=['is_approved'])
    return Response({'id': r.id, 'is_approved': r.is_approved})
 
 
@extend_schema(tags=["Admin"], summary="Delete a review")
@api_view(['DELETE'])
@permission_classes([IsAdminUser])
def admin_delete_review(request, review_id):
    from apps.catalog.models import ProductReview
 
    try:
        r = ProductReview.objects.get(id=review_id)
    except ProductReview.DoesNotExist:
        return Response({'detail': 'Avis introuvable.'}, status=404)
 
    r.delete()
    return Response(status=204)


#  ADMINISTRATION - JOURNAL D'AUDIT
@extend_schema(tags=["Admin"], summary="Unified admin audit log")
@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_audit_log(request):
    """
    Journal d'audit unifié — agrège toutes les sources :
      - OrderHistory       → actions sur commandes
      - UserActivityLog    → bans, modifications utilisateurs
      - Actions vendeurs   → approbations, rejets, suspensions (depuis VendorProfile)
      - Modifications settings, retraits, abonnements
 
    Filtres :
      entity_type : order | user | vendor | product | review | settings | withdrawal | subscription
      admin_id    : ID de l'admin ayant effectué l'action
      search      : texte libre dans action/admin/entité
      date_from   : ISO datetime
      date_to     : ISO datetime
      page        : pagination
      page_size   : 20 | 50 | 100
 
    Retourne aussi :
      kpis        : today / week / month + admin le plus actif
      by_entity   : répartition par type d'entité
      by_hour     : activité 24h pour le graphique
      admins      : liste des admins pour le filtre dropdown
    """
    from apps.orders.models     import OrderHistory
    from apps.accounts.models   import UserActivityLog
    from django.contrib.auth.models import User
    from django.utils import timezone
    from datetime import timedelta
 
    # ── Paramètres ────────────────────────────────────────────────────────────
    entity_type = request.query_params.get('entity_type', '')
    admin_id    = request.query_params.get('admin_id', '')
    search      = request.query_params.get('search', '')
    date_from   = request.query_params.get('date_from', '')
    date_to     = request.query_params.get('date_to', '')
    try:
        page      = max(1, int(request.query_params.get('page', 1)))
        page_size = min(100, max(10, int(request.query_params.get('page_size', 20))))
    except (ValueError, TypeError):
        page, page_size = 1, 20
 
    now = timezone.now()
 
    # ── Collecte depuis OrderHistory ──────────────────────────────────────────
    order_entries = []
    if not entity_type or entity_type == 'order':
        oh_qs = OrderHistory.objects.select_related('user', 'order').order_by('-timestamp')
        if admin_id:
            oh_qs = oh_qs.filter(user__id=admin_id)
        if date_from:
            try:
                from django.utils.dateparse import parse_datetime
                dt = parse_datetime(date_from)
                if dt: oh_qs = oh_qs.filter(timestamp__gte=dt)
            except Exception: pass
        if date_to:
            try:
                from django.utils.dateparse import parse_datetime
                dt = parse_datetime(date_to)
                if dt: oh_qs = oh_qs.filter(timestamp__lte=dt)
            except Exception: pass
 
        for h in oh_qs[:500]:
            order_entries.append({
                'id':          f'order_{h.id}',
                'admin_id':    h.user.id   if h.user else None,
                'admin_name':  h.user.username if h.user else 'Système',
                'action':      h.action,
                'entity_type': 'order',
                'entity_id':   h.order_id,
                'entity_label':f'Commande #{h.order_id}',
                'old_value':   h.old_value or None,
                'new_value':   h.new_value or None,
                'ip_address':  h.ip_address,
                'created_at':  h.timestamp.isoformat(),
            })
 
    # ── Collecte depuis UserActivityLog ───────────────────────────────────────
    user_entries = []
    if not entity_type or entity_type == 'user':
        try:
            ual_qs = UserActivityLog.objects.select_related(
                'user', 'performed_by'
            ).order_by('-timestamp')
 
            if admin_id:
                ual_qs = ual_qs.filter(performed_by__id=admin_id)
            if date_from:
                try:
                    from django.utils.dateparse import parse_datetime
                    dt = parse_datetime(date_from)
                    if dt: ual_qs = ual_qs.filter(timestamp__gte=dt)
                except Exception: pass
            if date_to:
                try:
                    from django.utils.dateparse import parse_datetime
                    dt = parse_datetime(date_to)
                    if dt: ual_qs = ual_qs.filter(timestamp__lte=dt)
                except Exception: pass
 
            for h in ual_qs[:300]:
                user_entries.append({
                    'id':          f'user_{h.id}',
                    'admin_id':    h.performed_by.id       if h.performed_by else None,
                    'admin_name':  h.performed_by.username if h.performed_by else 'Système',
                    'action':      h.action,
                    'entity_type': 'user',
                    'entity_id':   h.user_id,
                    'entity_label':f'User #{h.user_id} (@{h.user.username if h.user else "?"})',
                    'old_value':   None,
                    'new_value':   h.description,
                    'ip_address':  h.ip_address,
                    'created_at':  h.timestamp.isoformat(),
                })
        except Exception:
            pass  # UserActivityLog peut ne pas exister
 
    # ── Collecte depuis VendorProfile history (via champs updated_at) ─────────
    # Utilise les annotations de VendorProfile pour retrouver les actions
    vendor_entries = []
    if not entity_type or entity_type == 'vendor':
        try:
            from apps.vendors.models import VendorProfile
            # On cherche les profils récemment modifiés avec des statuts clés
            vps = VendorProfile.objects.select_related('user').filter(
                approved_at__isnull=False
            ).order_by('-approved_at')[:100]
            for vp in vps:
                if vp.approved_at:
                    vendor_entries.append({
                        'id':          f'vendor_approve_{vp.id}',
                        'admin_id':    None,
                        'admin_name':  'Admin',
                        'action':      f'Boutique approuvée : {vp.business_name}',
                        'entity_type': 'vendor',
                        'entity_id':   vp.id,
                        'entity_label':f'Boutique #{vp.id} ({vp.business_name})',
                        'old_value':   'PENDING',
                        'new_value':   'APPROVED',
                        'ip_address':  None,
                        'created_at':  vp.approved_at.isoformat(),
                    })
        except Exception:
            pass
 
    # ── Fusion + tri ──────────────────────────────────────────────────────────
    all_entries = order_entries + user_entries + vendor_entries
    all_entries.sort(key=lambda x: x['created_at'], reverse=True)
 
    # Filtre search
    if search:
        q = search.lower()
        all_entries = [
            e for e in all_entries
            if any(
                q in str(v or '').lower()
                for v in [e['action'], e['admin_name'], e['entity_label'],
                          e['old_value'], e['new_value'], e['ip_address']]
            )
        ]
 
    # ── Pagination ────────────────────────────────────────────────────────────
    total       = len(all_entries)
    offset      = (page - 1) * page_size
    paginated   = all_entries[offset:offset + page_size]
 
    # ── KPIs ─────────────────────────────────────────────────────────────────
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start  = now - timedelta(days=7)
    month_start = now - timedelta(days=30)
 
    today_count = sum(1 for e in all_entries if e['created_at'] >= today_start.isoformat())
    week_count  = sum(1 for e in all_entries if e['created_at'] >= week_start.isoformat())
    month_count = sum(1 for e in all_entries if e['created_at'] >= month_start.isoformat())
 
    # Admin le plus actif
    admin_counts: dict = {}
    for e in all_entries:
        name = e['admin_name']
        if name and name != 'Système':
            admin_counts[name] = admin_counts.get(name, 0) + 1
    top_admin = max(admin_counts, key=lambda k: admin_counts[k]) if admin_counts else '—'
 
    # Répartition par entité
    entity_counts: dict = {}
    for e in all_entries:
        et = e['entity_type']
        entity_counts[et] = entity_counts.get(et, 0) + 1
    by_entity = [{'entity_type': k, 'count': v} for k, v in entity_counts.items()]
 
    # Activité par heure (24h)
    by_hour = []
    for i in range(23, -1, -1):
        h_start = (now - timedelta(hours=i + 1)).isoformat()
        h_end   = (now - timedelta(hours=i)).isoformat()
        count   = sum(1 for e in all_entries if h_start <= e['created_at'] < h_end)
        by_hour.append({
            'hour':  (now - timedelta(hours=i)).strftime('%Y-%m-%dT%H:00'),
            'count': count,
        })
 
    # Liste des admins pour le filtre dropdown
    admin_names = sorted(set(
        e['admin_name'] for e in all_entries
        if e['admin_name'] and e['admin_name'] != 'Système'
    ))
 
    return Response({
        'entries':     paginated,
        'total':       total,
        'page':        page,
        'page_size':   page_size,
        'total_pages': max(1, -(-total // page_size)),
        'kpis': {
            'today':     today_count,
            'week':      week_count,
            'month':     month_count,
            'top_admin': top_admin,
        },
        'by_entity': by_entity,
        'by_hour':   by_hour,
        'admins':    admin_names,
    })



@extend_schema(tags=["Admin"], summary="List all vendor subscriptions")
@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_list_subscriptions(request):
    from apps.vendors.models import VendorSubscription
 
    qs = VendorSubscription.objects.select_related(
        'vendor', 'vendor__user', 'plan', 'confirmed_by'
    ).order_by('-created_at')
 
    status_filter = request.query_params.get('status')
    if status_filter:
        qs = qs.filter(sub_status=status_filter)
 
    result = []
    for s in qs:
        result.append({
            'id':              s.id,
            'reference':       s.payment_reference,
            'vendor_id':       s.vendor.id,
            'business_name':   s.vendor.business_name,
            'user_email':      s.vendor.user.email,
            'plan_code':       s.plan.code,
            'plan_name':       s.plan.name,
            'billing_cycle':   s.billing_cycle,
            'is_trial':        s.is_trial,
            'amount_paid_xaf': s.amount_paid_xaf,
            'operator':        s.operator,
            'phone_number':    s.phone_number,
            'sub_status':      s.sub_status,
            'started_at':      s.started_at.isoformat() if s.started_at else None,
            'expires_at':      s.expires_at.isoformat() if s.expires_at else None,
            'confirmed_at':    s.confirmed_at.isoformat() if s.confirmed_at else None,
            'created_at':      s.created_at.isoformat(),
        })
 
    return Response(result)
 

#  ADMINISTRATION - APPROBATION ABONNEMENT VENDEUR 
@extend_schema(tags=["Admin"], summary="Approve and activate a vendor subscription")
@api_view(['POST'])
@permission_classes([IsAdminUser])
def admin_approve_subscription(request, sub_id):
    from apps.vendors.models import VendorSubscription
 
    try:
        sub = VendorSubscription.objects.select_related('plan', 'vendor').get(id=sub_id)
    except VendorSubscription.DoesNotExist:
        return Response({'detail': 'Abonnement introuvable.'}, status=404)
 
    if sub.sub_status != 'PENDING':
        return Response({'detail': f"Impossible d'approuver un abonnement en statut '{sub.sub_status}'."}, status=400)
 
    duration = sub.plan.plan_duration_days
    if sub.billing_cycle == 'ANNUAL':
        duration = sub.plan.plan_duration_days * 12
 
    now        = timezone.now()
    expires_at = now + timedelta(days=duration)
 
    sub.sub_status   = 'ACTIVE'
    sub.started_at   = now
    sub.expires_at   = expires_at
    sub.confirmed_by = request.user
    sub.confirmed_at = now
    sub.save()
 
    # Activer le plan sur le profil vendeur
    VendorProfile.objects.filter(pk=sub.vendor.pk).update(
        current_plan    = sub.plan,
        plan_expires_at = expires_at,
    )
 
    return Response({'id': sub.id, 'sub_status': 'ACTIVE', 'expires_at': expires_at.isoformat()})
 

#  ADMINISTRATION - REJET ABONNEMENT VENDEUR 
@extend_schema(tags=["Admin"], summary="Reject a vendor subscription")
@api_view(['POST'])
@permission_classes([IsAdminUser])
def admin_reject_subscription(request, sub_id):
    from apps.vendors.models import VendorSubscription
 
    try:
        sub = VendorSubscription.objects.get(id=sub_id)
    except VendorSubscription.DoesNotExist:
        return Response({'detail': 'Abonnement introuvable.'}, status=404)
 
    if sub.sub_status != 'PENDING':
        return Response({'detail': f"Impossible de rejeter un abonnement en statut '{sub.sub_status}'."}, status=400)
 
    sub.sub_status   = 'CANCELLED'
    sub.confirmed_by = request.user
    sub.confirmed_at = timezone.now()
    sub.save()
 
    return Response({'id': sub.id, 'sub_status': 'CANCELLED'})


#  ADMINISTRATION - ENVOI NOTIFICATIONS
@extend_schema(tags=["Admin"], summary="Send broadcast notification to users")
@api_view(['POST'])
@permission_classes([IsAdminUser])
def admin_broadcast_notification(request):
    """
    Envoie une notification à une audience.
    Body : { audience: 'all'|'customers'|'vendors'|'active_vendors', title, message }
    Stocke en BDD (modèle Notification si existant) ou envoie par email.
    """
    from django.contrib.auth.models import User
 
    audience = request.data.get('audience', 'all')
    title    = request.data.get('title', '').strip()
    message  = request.data.get('message', '').strip()
 
    if not title or not message:
        return Response({'detail': 'title et message sont requis.'}, status=400)
 
    # Sélection des destinataires
    users = User.objects.filter(is_active=True)
    if audience == 'customers':
        users = users.filter(is_staff=False).exclude(vendor_profile__isnull=False)
    elif audience == 'vendors':
        users = users.filter(vendor_profile__isnull=False)
    elif audience == 'active_vendors':
        users = users.filter(vendor_profile__status='APPROVED')
 
    count = users.count()
 
    # Ici : créer les notifications en BDD ou envoyer emails
    # Pour l'instant on retourne le décompte (intégration email/push à compléter)
 
    return Response({
        'success':    True,
        'recipients': count,
        'audience':   audience,
        'title':      title,
    })



@extend_schema(tags=["Admin"], summary="List all shop modification requests")
@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_list_modifications(request):
    """Liste toutes les demandes de modification de boutique."""
    from apps.vendors.models import ShopModificationRequest
 
    status_filter = request.query_params.get('status', 'PENDING')
 
    qs = ShopModificationRequest.objects.select_related(
        'vendor', 'vendor__user', 'approved_by'
    ).order_by('-created_at')
 
    if status_filter != 'all':
        qs = qs.filter(status=status_filter)
 
    kpis = {
        'pending':       ShopModificationRequest.objects.filter(status='PENDING').count(),
        'docs_required': ShopModificationRequest.objects.filter(status='DOCS_REQUIRED').count(),
        'docs_uploaded': ShopModificationRequest.objects.filter(status='DOCS_UPLOADED').count(),
        'approved':      ShopModificationRequest.objects.filter(status='APPROVED').count(),
        'rejected':      ShopModificationRequest.objects.filter(status='REJECTED').count(),
    }
 
    result = []
    for m in qs:
        # Valeurs actuelles des champs demandés
        current_values = {}
        for field in (m.fields_requested or {}).keys():
            current_values[field] = getattr(m.vendor, field, None)
 
        result.append({
            'id':              m.id,
            'vendor_id':       m.vendor.id,
            'business_name':   m.vendor.business_name,
            'user_email':      m.vendor.user.email,
            'fields_requested':m.fields_requested,
            'current_values':  current_values,
            'reason':          m.reason,
            'status':          m.status,
            'admin_note':      m.admin_note,
            'approved_by':     m.approved_by.username if m.approved_by else None,
            'approved_at':     m.approved_at.isoformat() if m.approved_at else None,
            'created_at':      m.created_at.isoformat(),
        })
 
    return Response({'kpis': kpis, 'modifications': result})
 
 
@extend_schema(tags=["Admin"], summary="Approve a shop modification request")
@api_view(['POST'])
@permission_classes([IsAdminUser])
def admin_approve_modification(request, mod_id):
    """Approuve une demande — applique les changements sur VendorProfile."""
    from apps.vendors.models import ShopModificationRequest
 
    try:
        mod = ShopModificationRequest.objects.select_related('vendor').get(id=mod_id)
    except ShopModificationRequest.DoesNotExist:
        return Response({'detail': 'Demande introuvable.'}, status=404)
 
    if mod.status not in ['PENDING', 'DOCS_REQUIRED', 'DOCS_UPLOADED']:
        return Response({'detail': f"Impossible d'approuver une demande en statut '{mod.status}'."}, status=400)
 
    mod.status      = 'APPROVED'
    mod.approved_by = request.user
    mod.approved_at = timezone.now()
    mod.admin_note  = request.data.get('admin_note', '')
    mod.save()
 
    # Appliquer les changements sur le profil
    mod.apply_approved_changes()
 
    return Response({'id': mod.id, 'status': 'APPROVED', 'fields_applied': list(mod.fields_requested.keys())})
 
 
@extend_schema(tags=["Admin"], summary="Reject a shop modification request")
@api_view(['POST'])
@permission_classes([IsAdminUser])
def admin_reject_modification(request, mod_id):
    """Rejette une demande avec un motif obligatoire."""
    from apps.vendors.models import ShopModificationRequest
 
    try:
        mod = ShopModificationRequest.objects.get(id=mod_id)
    except ShopModificationRequest.DoesNotExist:
        return Response({'detail': 'Demande introuvable.'}, status=404)
 
    if mod.status not in ['PENDING', 'DOCS_REQUIRED', 'DOCS_UPLOADED']:
        return Response({'detail': f"Impossible de rejeter une demande en statut '{mod.status}'."}, status=400)
 
    reason = request.data.get('reason', '').strip()
    if not reason:
        return Response({'detail': 'Le motif de rejet est requis.'}, status=400)
 
    mod.status     = 'REJECTED'
    mod.admin_note = reason
    mod.save()
 
    return Response({'id': mod.id, 'status': 'REJECTED', 'admin_note': mod.admin_note}) 


    
@extend_schema(tags=["Admin"], summary="Certifications stats & vendor ranking")
@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_certifications_stats(request):
    """
    Retourne :
      - stats : répartition par tier + total approuvés + moyenne points
      - vendors : liste de tous les vendeurs approuvés triée par points décroissants
    """
    approved = VendorProfile.objects.filter(status='APPROVED').select_related('user')
 
    by_tier = {'BRONZE': 0, 'SILVER': 0, 'GOLD': 0, 'DIAMOND': 0}
    total_points_sum = 0
    vendors_list = []
 
    for vp in approved:
        tier = vp.certification_tier or 'BRONZE'
        by_tier[tier] = by_tier.get(tier, 0) + 1
        pts = vp.total_points or 0
        total_points_sum += pts
        vendors_list.append({
            'id':                vp.id,
            'business_name':     vp.business_name,
            'user_username':     vp.user.username,
            'certification_tier':tier,
            'total_points':      pts,
            'city':              vp.city,
            'status':            vp.status,
        })
 
    # Trier par points décroissants
    vendors_list.sort(key=lambda x: x['total_points'], reverse=True)
 
    total = approved.count()
    avg   = round(total_points_sum / total, 1) if total > 0 else 0
 
    return Response({
        'stats': {
            'by_tier':       by_tier,
            'total_approved':total,
            'avg_points':    avg,
        },
        'vendors': vendors_list,
    })       



@extend_schema(tags=["Admin"], summary="Platform account & system health stats")
@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_account_stats(request):
    """
    Statistiques globales du compte plateforme BelivaY :
    - GMV, commissions, escrow, retraits
    - Santé système (DB, utilisateurs, litiges, dernière commande)
    """
    from apps.orders.models import Order, Dispute
    from apps.vendors.models import WithdrawalRequest
    from apps.orders.models import PlatformSettings
    from django.contrib.auth.models import User
    from django.db.models import Sum
 
    settings = PlatformSettings.get_settings()
 
    # ── Finances ──────────────────────────────────────────────────────────────
    paid_orders = Order.objects.filter(payment_status='PAID')
 
    gmv_total = paid_orders.aggregate(t=Sum('subtotal_xaf'))['t'] or 0
 
    # Commissions = SUM(subtotal_xaf * commission_rate_snapshot / 100)
    total_commissions = 0
    for o in paid_orders.only('subtotal_xaf', 'commission_rate_snapshot'):
        total_commissions += round(o.subtotal_xaf * float(o.commission_rate_snapshot) / 100)
 
    # Escrow
    escrow_blocked = Order.objects.filter(
        escrow_status='BLOCKED'
    ).aggregate(t=Sum('subtotal_xaf'))['t'] or 0
 
    escrow_release_pending = Order.objects.filter(
        escrow_status='RELEASE_PENDING'
    ).aggregate(t=Sum('subtotal_xaf'))['t'] or 0
 
    escrow_released = Order.objects.filter(
        escrow_status='RELEASED'
    ).aggregate(t=Sum('subtotal_xaf'))['t'] or 0
 
    # Retraits
    withdrawals_approved = WithdrawalRequest.objects.filter(
        status='APPROVED'
    ).aggregate(t=Sum('net_amount_xaf'))['t'] or 0
 
    pending_wd = WithdrawalRequest.objects.filter(status='PENDING')
    pending_wd_count  = pending_wd.count()
    pending_wd_amount = pending_wd.aggregate(t=Sum('amount_xaf'))['t'] or 0
 
    net_revenue = total_commissions - withdrawals_approved
 
    # ── Santé système ─────────────────────────────────────────────────────────
    total_users    = User.objects.filter(is_active=True).count()
    active_vendors = VendorProfile.objects.filter(status='APPROVED').count()
    total_orders   = Order.objects.count()
    paid_count     = paid_orders.count()
    pending_disputes = Dispute.objects.filter(
        status__in=['OPEN', 'IN_PROGRESS']
    ).count() if hasattr(Order, 'disputes') else 0
 
    last_order = Order.objects.order_by('-created_at').first()
 
    # Test DB basique
    try:
        from django.db import connection
        connection.cursor().execute("SELECT 1")
        db_status = 'ok'
    except Exception:
        db_status = 'error'
 
    return Response({
        # Finances
        'total_gmv':                    gmv_total,
        'total_commissions_earned':     total_commissions,
        'total_escrow_blocked':         escrow_blocked,
        'total_escrow_release_pending': escrow_release_pending,
        'total_escrow_released':        escrow_released,
        'total_withdrawals_approved':   withdrawals_approved,
        'net_platform_revenue':         net_revenue,
        'pending_withdrawals_count':    pending_wd_count,
        'pending_withdrawals_amount':   pending_wd_amount,
        'commission_rate':              str(settings.platform_commission_percent),
        # Système
        'total_users':      total_users,
        'active_vendors':   active_vendors,
        'total_orders':     total_orders,
        'paid_orders':      paid_count,
        'pending_disputes': pending_disputes,
        'maintenance_mode': settings.maintenance_mode,
        'db_status':        db_status,
        'last_order_at':    last_order.created_at.isoformat() if last_order else None,
    })    


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

    moderation_status = request.query_params.get('moderation_status')
    if moderation_status:
        products = products.filter(moderation_status=moderation_status)    
    
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
    
    orders = Order.objects.select_related(
        'user', 'shipment', 'shipment__courier', 'shipment__courier__user'
    ).prefetch_related('items', 'items__product__vendor')

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
        order = Order.objects.select_related(
            'user', 'shipment', 'shipment__courier', 'shipment__courier__user'
        ).prefetch_related(
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
    
    users = User.objects.select_related('vendor_profile', 'courier_profile', 'profile').prefetch_related('orders')
    
    # Filtre par rôle
    role = request.query_params.get('role')
    if role == 'vendor':
        users = users.filter(vendor_profile__isnull=False)
    elif role == 'courier':
        users = users.filter(courier_profile__isnull=False)
    elif role == 'customer':
        users = users.filter(is_staff=False, is_superuser=False)
    elif role in {'staff', 'admin'}:
        users = users.filter(Q(is_staff=True) | Q(is_superuser=True))
    
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


#  ADMINISTRATION - PARAMÈTRES SYSTÈME 

@extend_schema(
    tags=["Admin"],
    summary="Get platform settings (admin)",
    description="Récupérer les paramètres de la plateforme",
    responses={200: PlatformSettingsSerializer}
)
@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_get_settings(request):
    """Récupérer les paramètres plateforme"""
    from apps.orders.models import PlatformSettings
    from apps.vendors.serializers import PlatformSettingsSerializer
    
    settings = PlatformSettings.get_settings()
    serializer = PlatformSettingsSerializer(settings)
    return Response(serializer.data)


@extend_schema(
    tags=["Admin"],
    summary="Update platform settings (admin)",
    description="Modifier les paramètres de la plateforme",
    request=PlatformSettingsSerializer,
    responses={200: PlatformSettingsSerializer}
)
@api_view(['PATCH'])
@permission_classes([IsAdminUser])
def admin_update_settings(request):
    """Modifier les paramètres plateforme"""
    from apps.orders.models import PlatformSettings
    from apps.vendors.serializers import PlatformSettingsSerializer
    
    settings = PlatformSettings.get_settings()
    serializer = PlatformSettingsSerializer(settings, data=request.data, partial=True)
    
    if serializer.is_valid():
        serializer.save(updated_by=request.user)
        return Response(serializer.data)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)



# MA BOUTIQUE

 
@extend_schema(
    tags=["Vendors"],
    summary="Update shop info",
    description="Met a jour les informations de la boutique (nom, description, WhatsApp, ville, delai, retours).",
)
@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def vendor_update_shop(request):
    """Met a jour les informations modifiables de la boutique."""
    try:
        profile = VendorProfile.objects.get(user=request.user)
        if not profile.is_active_vendor:
            return Response({'detail': "Compte vendeur non approuve."}, status=403)
 
        ALLOWED_FIELDS = [
            'business_name', 'business_description', 'whatsapp_phone',
            'city', 'address', 'preparation_delay', 'return_policy', 'is_online',
        ]
        for field in ALLOWED_FIELDS:
            if field in request.data:
                setattr(profile, field, request.data[field])
 
        profile.save()
 
        from apps.vendors.serializers import VendorProfileSerializer
        return Response(VendorProfileSerializer(profile).data)
 
    except VendorProfile.DoesNotExist:
        return Response({'detail': 'Profil vendeur introuvable.'}, status=404)
 
 
@extend_schema(
    tags=["Vendors"],
    summary="Upload shop profile photo",
    description="Upload la photo de profil de la boutique. Champ : 'photo'. Max 5 Mo.",
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def vendor_upload_shop_photo(request):
    """Upload la photo de profil de la boutique."""
    try:
        profile = VendorProfile.objects.get(user=request.user)
        if not profile.is_active_vendor:
            return Response({'detail': "Compte vendeur non approuve."}, status=403)
 
        photo = request.FILES.get('photo')
        if not photo:
            return Response({'detail': 'Champ "photo" requis.'}, status=400)
 
        allowed = ['image/jpeg', 'image/png', 'image/webp']
        if photo.content_type not in allowed:
            return Response({'detail': 'Format non supporte. Utilisez JPG, PNG ou WEBP.'}, status=400)
        if photo.size > 5 * 1024 * 1024:
            return Response({'detail': 'Fichier trop volumineux. Maximum 5 Mo.'}, status=400)
 
        # Supprimer l'ancienne photo si elle existe
        if profile.profile_photo:
            try:
                profile.profile_photo.delete(save=False)
            except Exception:
                pass
 
        profile.profile_photo = photo
        profile.save(update_fields=['profile_photo', 'updated_at'])
 
        request_obj = request
        photo_url = request_obj.build_absolute_uri(profile.profile_photo.url) if profile.profile_photo else None
        return Response({'photo_url': photo_url}, status=201)
 
    except VendorProfile.DoesNotExist:
        return Response({'detail': 'Profil vendeur introuvable.'}, status=404)
 
 
@extend_schema(
    tags=["Vendors"],
    summary="Upload shop banner",
    description="Upload la banniere de la boutique. Champ : 'banner'. Max 8 Mo. 1200x300px recommande.",
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def vendor_upload_shop_banner(request):
    """Upload la banniere de la boutique."""
    try:
        profile = VendorProfile.objects.get(user=request.user)
        if not profile.is_active_vendor:
            return Response({'detail': "Compte vendeur non approuve."}, status=403)
 
        banner = request.FILES.get('banner')
        if not banner:
            return Response({'detail': 'Champ "banner" requis.'}, status=400)
 
        allowed = ['image/jpeg', 'image/png', 'image/webp']
        if banner.content_type not in allowed:
            return Response({'detail': 'Format non supporte. JPG, PNG ou WEBP uniquement.'}, status=400)
        if banner.size > 8 * 1024 * 1024:
            return Response({'detail': 'Fichier trop volumineux. Maximum 8 Mo.'}, status=400)
 
        if profile.banner_image:
            try:
                profile.banner_image.delete(save=False)
            except Exception:
                pass
 
        profile.banner_image = banner
        profile.save(update_fields=['banner_image', 'updated_at'])
 
        request_obj = request
        banner_url = request_obj.build_absolute_uri(profile.banner_image.url) if profile.banner_image else None
        return Response({'banner_url': banner_url}, status=201)
 
    except VendorProfile.DoesNotExist:
        return Response({'detail': 'Profil vendeur introuvable.'}, status=404)
 
 
@extend_schema(
    tags=["Vendors"],
    summary="Get shop QR data",
    description="Retourne l'URL publique et le slug de la boutique pour generer le QR code cote frontend.",
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def vendor_shop_qr(request):
    """Retourne les donnees pour le QR code de la boutique."""
    try:
        profile = VendorProfile.objects.get(user=request.user)
        return Response({
            'slug':       profile.shop_slug,
            'public_url': profile.public_url or f"https://belivay.com/boutique/{profile.shop_slug}",
            'shop_name':  profile.business_name,
        })
    except VendorProfile.DoesNotExist:
        return Response({'detail': 'Profil vendeur introuvable.'}, status=404)
 
 
@extend_schema(
    tags=["Public"],
    summary="Get public shop page",
    description="Page publique d'une boutique vendeur. Accessible sans authentification.",
)
@api_view(['GET'])
@permission_classes([])  # Public — pas d'auth requise
def public_shop(request, slug):
    """
    Page publique d'une boutique.
    Retourne : infos boutique + produits actifs + stats.
    """
    try:
        profile = VendorProfile.objects.select_related('user', 'current_plan').get(
            shop_slug=slug,
            status='APPROVED',
            is_online=True,
        )
    except VendorProfile.DoesNotExist:
        return Response({'detail': 'Boutique introuvable ou hors ligne.'}, status=404)
 
    from apps.catalog.models import Product
    from apps.catalog.serializers import ProductSerializer
    from apps.catalog.models import ProductReview
    from django.db.models import Avg, Count
 
    products = Product.objects.filter(
        vendor=profile.user, is_active=True,
    ).select_related('category').prefetch_related('images', 'inventory').order_by('-created_at')
 
    stats = products.aggregate(
        total    = Count('id'),
        avg_rating = Avg('reviews__rating'),
    )
    reviews_count = ProductReview.objects.filter(
        product__vendor=profile.user, is_approved=True,
    ).count()
 
    banner_url = request.build_absolute_uri(profile.banner_image.url) if profile.banner_image else None
    photo_url  = request.build_absolute_uri(profile.profile_photo.url) if profile.profile_photo else None
 
    data = {
        'slug':               profile.shop_slug,
        'business_name':      profile.business_name,
        'business_description': profile.business_description,
        'city':               profile.city,
        'whatsapp_phone':     profile.whatsapp_phone,
        'preparation_delay':  profile.preparation_delay,
        'return_policy':      profile.return_policy,
        'banner_url':         banner_url,
        'photo_url':          photo_url,
        'certification_tier': profile.certification_tier,
        'is_online':          profile.is_online,
        'member_since':       profile.approved_at.isoformat() if profile.approved_at else profile.created_at.isoformat(),
        'stats': {
            'total_products': stats['total'] or 0,
            'avg_rating':     round(stats['avg_rating'], 1) if stats['avg_rating'] else None,
            'reviews_count':  reviews_count,
        },
        'products': ProductSerializer(products[:20], many=True, context={'request': request}).data,
    }
    return Response(data)


# ══════════════════════════════════════════════════════════════════════════════
# BOUTIQUE — RÉCUPÉRATION PROFIL COMPLET
# ══════════════════════════════════════════════════════════════════════════════
 
@extend_schema(tags=["Vendors"], summary="Get full shop profile")
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def vendor_get_shop(request):
    """
    Retourne le profil complet de la boutique avec photo_url et banner_url.
    C'est cet endpoint (et non /api/vendors/profile/) qui doit être utilisé
    par la page Ma Boutique pour récupérer les URLs des images.
    """
    try:
        profile = VendorProfile.objects.select_related('current_plan').get(user=request.user)
        serializer = VendorProfileSerializer(profile, context={'request': request})
        return Response(serializer.data)
    except VendorProfile.DoesNotExist:
        return Response({'detail': 'Profil vendeur introuvable.'}, status=404)
 
 
@extend_schema(tags=["Vendors"], summary="Update shop editable fields")
@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def vendor_update_shop(request):
    """
    Met à jour uniquement les champs NON-SENSIBLES de la boutique :
    whatsapp_phone, is_online.
    Les champs sensibles (business_name, description, city, address)
    passent par ShopModificationRequest.
    """
    try:
        profile = VendorProfile.objects.get(user=request.user)
        if not profile.is_active_vendor:
            return Response({'detail': 'Compte vendeur non approuvé.'}, status=403)
 
        EDITABLE = ['whatsapp_phone', 'is_online']
        for field in EDITABLE:
            if field in request.data:
                setattr(profile, field, request.data[field])
        profile.save()
 
        return Response(VendorProfileSerializer(profile, context={'request': request}).data)
    except VendorProfile.DoesNotExist:
        return Response({'detail': 'Profil vendeur introuvable.'}, status=404)
 
 
@extend_schema(tags=["Vendors"], summary="Upload shop profile photo")
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def vendor_upload_shop_photo(request):
    try:
        profile = VendorProfile.objects.get(user=request.user)
        if not profile.is_active_vendor:
            return Response({'detail': 'Compte vendeur non approuvé.'}, status=403)
 
        photo = request.FILES.get('photo')
        if not photo:
            return Response({'detail': 'Champ "photo" requis.'}, status=400)
        if photo.content_type not in ['image/jpeg', 'image/png', 'image/webp']:
            return Response({'detail': 'Format non supporté. JPG, PNG ou WEBP.'}, status=400)
        if photo.size > 5 * 1024 * 1024:
            return Response({'detail': 'Fichier trop volumineux. Max 5 Mo.'}, status=400)
 
        if profile.profile_photo:
            try: profile.profile_photo.delete(save=False)
            except Exception: pass
 
        profile.profile_photo = photo
        profile.save(update_fields=['profile_photo', 'updated_at'])
 
        photo_url = request.build_absolute_uri(profile.profile_photo.url) if profile.profile_photo else None
        return Response({'photo_url': photo_url}, status=201)
    except VendorProfile.DoesNotExist:
        return Response({'detail': 'Profil vendeur introuvable.'}, status=404)
 
 
@extend_schema(tags=["Vendors"], summary="Upload shop banner")
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def vendor_upload_shop_banner(request):
    try:
        profile = VendorProfile.objects.get(user=request.user)
        if not profile.is_active_vendor:
            return Response({'detail': 'Compte vendeur non approuvé.'}, status=403)
 
        banner = request.FILES.get('banner')
        if not banner:
            return Response({'detail': 'Champ "banner" requis.'}, status=400)
        if banner.content_type not in ['image/jpeg', 'image/png', 'image/webp']:
            return Response({'detail': 'Format non supporté.'}, status=400)
        if banner.size > 8 * 1024 * 1024:
            return Response({'detail': 'Fichier trop volumineux. Max 8 Mo.'}, status=400)
 
        if profile.banner_image:
            try: profile.banner_image.delete(save=False)
            except Exception: pass
 
        profile.banner_image = banner
        profile.save(update_fields=['banner_image', 'updated_at'])
 
        banner_url = request.build_absolute_uri(profile.banner_image.url) if profile.banner_image else None
        return Response({'banner_url': banner_url}, status=201)
    except VendorProfile.DoesNotExist:
        return Response({'detail': 'Profil vendeur introuvable.'}, status=404)
 
 
@extend_schema(tags=["Vendors"], summary="Get shop QR data")
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def vendor_shop_qr(request):
    try:
        profile = VendorProfile.objects.get(user=request.user)
        qr_url = f"https://belivay.com?ref={profile.shop_slug}" if profile.shop_slug else "https://belivay.com"
        return Response({
            'slug':       profile.shop_slug,
            'public_url': qr_url,
            'shop_name':  profile.business_name,
        })
    except VendorProfile.DoesNotExist:
        return Response({'detail': 'Profil vendeur introuvable.'}, status=404)
 
 
# ══════════════════════════════════════════════════════════════════════════════
# EMPLACEMENTS PHYSIQUES
# ══════════════════════════════════════════════════════════════════════════════
 
@extend_schema(tags=["Vendors"], summary="List vendor locations")
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def vendor_locations_list(request):
    try:
        profile = VendorProfile.objects.get(user=request.user)
        locations = VendorLocation.objects.filter(vendor=profile)
        return Response(VendorLocationSerializer(locations, many=True).data)
    except VendorProfile.DoesNotExist:
        return Response({'detail': 'Profil vendeur introuvable.'}, status=404)
 
 
@extend_schema(tags=["Vendors"], summary="Create vendor location")
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def vendor_location_create(request):
    try:
        profile = VendorProfile.objects.get(user=request.user)
        if not profile.is_active_vendor:
            return Response({'detail': 'Compte vendeur non approuvé.'}, status=403)
 
        serializer = VendorLocationSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(vendor=profile)
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)
    except VendorProfile.DoesNotExist:
        return Response({'detail': 'Profil vendeur introuvable.'}, status=404)
 
 
@extend_schema(tags=["Vendors"], summary="Update vendor location")
@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def vendor_location_update(request, location_id):
    try:
        profile   = VendorProfile.objects.get(user=request.user)
        location  = VendorLocation.objects.get(id=location_id, vendor=profile)
        serializer = VendorLocationSerializer(location, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)
    except VendorProfile.DoesNotExist:
        return Response({'detail': 'Profil vendeur introuvable.'}, status=404)
    except VendorLocation.DoesNotExist:
        return Response({'detail': 'Emplacement introuvable.'}, status=404)
 
 
@extend_schema(tags=["Vendors"], summary="Delete vendor location")
@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def vendor_location_delete(request, location_id):
    try:
        profile  = VendorProfile.objects.get(user=request.user)
        location = VendorLocation.objects.get(id=location_id, vendor=profile)
        location.delete()
        return Response(status=204)
    except VendorProfile.DoesNotExist:
        return Response({'detail': 'Profil vendeur introuvable.'}, status=404)
    except VendorLocation.DoesNotExist:
        return Response({'detail': 'Emplacement introuvable.'}, status=404)
 
 
# ══════════════════════════════════════════════════════════════════════════════
# DEMANDES DE MODIFICATION DE CHAMPS SENSIBLES
# ══════════════════════════════════════════════════════════════════════════════
 
@extend_schema(tags=["Vendors"], summary="List modification requests")
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def vendor_mod_requests_list(request):
    try:
        profile  = VendorProfile.objects.get(user=request.user)
        requests = ShopModificationRequest.objects.filter(vendor=profile).prefetch_related(
            'documents', 'required_docs'
        )
        return Response(ShopModificationRequestSerializer(requests, many=True, context={'request': request}).data)
    except VendorProfile.DoesNotExist:
        return Response({'detail': 'Profil vendeur introuvable.'}, status=404)
 
 
@extend_schema(tags=["Vendors"], summary="Create modification request")
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def vendor_mod_request_create(request):
    """
    Crée une demande de modification de champs sensibles.
    Body : {
        fields_requested: {'business_name': 'Nouveau Nom', 'city': 'Douala'},
        reason: 'Changement de dénomination sociale',
    }
    Le vendeur peut aussi uploader des pièces jointes initiales via des fichiers multipart.
    """
    try:
        profile = VendorProfile.objects.get(user=request.user)
        if not profile.is_active_vendor:
            return Response({'detail': 'Compte vendeur non approuvé.'}, status=403)
 
        import json
 
        # Parser fields_requested depuis la requête (multipart ou JSON)
        fields_requested = request.data.get('fields_requested')
        if isinstance(fields_requested, str):
            try:
                fields_requested = json.loads(fields_requested)
            except json.JSONDecodeError:
                return Response({'detail': 'fields_requested doit être un objet JSON.'}, status=400)
 
        reason = request.data.get('reason', '').strip()
 
        if not fields_requested:
            return Response({'detail': '"fields_requested" est requis.'}, status=400)
        if not reason:
            return Response({'detail': '"reason" est requis.'}, status=400)
 
        # Vérifier que les champs sont bien sensibles
        allowed = ShopModificationRequest.SENSITIVE_FIELDS
        invalid = [f for f in fields_requested if f not in allowed]
        if invalid:
            return Response({
                'detail': f'Champs non autorisés : {invalid}. Champs sensibles : {allowed}'
            }, status=400)
 
        # Vérifier qu'il n'y a pas de demande PENDING ou DOCS_REQUIRED en cours
        pending = ShopModificationRequest.objects.filter(
            vendor=profile,
            status__in=['PENDING', 'DOCS_REQUIRED', 'DOCS_UPLOADED']
        ).first()
        if pending:
            return Response({
                'detail': f'Vous avez déjà une demande en cours (#{pending.id}, statut: {pending.status}). Attendez sa résolution.',
            }, status=400)
 
        mod_request = ShopModificationRequest.objects.create(
            vendor           = profile,
            fields_requested = fields_requested,
            reason           = reason,
            status           = 'PENDING',
        )
 
        # Upload pièces jointes initiales si présentes
        files = request.FILES.getlist('files')
        for f in files:
            ShopModificationDocument.objects.create(
                modification_request = mod_request,
                file                 = f,
                description          = f.name,
            )
 
        # Notification email au vendeur
        try:
            send_mail(
                subject=f'[BelivaY] Demande de modification #{mod_request.id} reçue',
                message=(
                    f'Bonjour {profile.business_name},\n\n'
                    f'Votre demande de modification (#{mod_request.id}) a bien été reçue.\n'
                    f'Champs demandés : {", ".join(fields_requested.keys())}\n\n'
                    f'Un administrateur BelivaY va l\'examiner sous 48h.\n\n'
                    f'Cordialement,\nL\'équipe BelivaY'
                ),
                from_email=getattr(django_settings, 'DEFAULT_FROM_EMAIL', 'noreply@belivay.com'),
                recipient_list=[profile.user.email],
                fail_silently=True,
            )
        except Exception:
            pass
 
        return Response(
            ShopModificationRequestSerializer(mod_request, context={'request': request}).data,
            status=201
        )
 
    except VendorProfile.DoesNotExist:
        return Response({'detail': 'Profil vendeur introuvable.'}, status=404)
 
 
@extend_schema(tags=["Vendors"], summary="Upload documents for modification request")
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def vendor_mod_request_upload_docs(request, request_id):
    """
    Le vendeur uploade des documents en réponse à une demande de docs de l'admin.
    Passe le statut à DOCS_UPLOADED.
    Body (multipart) : files[], doc_type_ids[] (optionnel)
    """
    try:
        profile     = VendorProfile.objects.get(user=request.user)
        mod_request = ShopModificationRequest.objects.get(id=request_id, vendor=profile)
 
        if mod_request.status not in ['DOCS_REQUIRED', 'PENDING']:
            return Response({'detail': f'Impossible d\'uploader des documents pour ce statut ({mod_request.status}).'}, status=400)
 
        files        = request.FILES.getlist('files')
        doc_type_ids = request.data.getlist('doc_type_ids')
 
        if not files:
            return Response({'detail': 'Au moins un fichier requis.'}, status=400)
 
        for i, f in enumerate(files):
            doc_type = None
            if i < len(doc_type_ids):
                try:
                    doc_type = RequiredDocumentType.objects.get(id=int(doc_type_ids[i]))
                except (RequiredDocumentType.DoesNotExist, ValueError):
                    pass
            ShopModificationDocument.objects.create(
                modification_request = mod_request,
                file                 = f,
                document_type        = doc_type,
                description          = f.name,
            )
 
        mod_request.status = 'DOCS_UPLOADED'
        mod_request.save()
 
        # Notification email
        try:
            send_mail(
                subject=f'[BelivaY] Documents ajoutés — Demande #{mod_request.id}',
                message=(
                    f'Bonjour {profile.business_name},\n\n'
                    f'Vos documents ont bien été reçus pour la demande #{mod_request.id}.\n'
                    f'Un administrateur va les examiner sous 48h.\n\n'
                    f'Cordialement,\nL\'équipe BelivaY'
                ),
                from_email=getattr(django_settings, 'DEFAULT_FROM_EMAIL', 'noreply@belivay.com'),
                recipient_list=[profile.user.email],
                fail_silently=True,
            )
        except Exception:
            pass
 
        return Response(
            ShopModificationRequestSerializer(mod_request, context={'request': request}).data
        )
    except VendorProfile.DoesNotExist:
        return Response({'detail': 'Profil vendeur introuvable.'}, status=404)
    except ShopModificationRequest.DoesNotExist:
        return Response({'detail': 'Demande introuvable.'}, status=404)
 
 
@extend_schema(tags=["Vendors"], summary="List predefined document types")
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def vendor_doc_types_list(request):
    """Liste les types de documents prédéfinis (pour les formulaires d'upload)."""
    doc_types = RequiredDocumentType.objects.filter(is_active=True)
    return Response(RequiredDocumentTypeSerializer(doc_types, many=True).data)

 

# CERTIFICATIONS

 
@extend_schema(
    tags=["Vendors"],
    summary="Get vendor certification data",
    description=(
        "Calcule dynamiquement les points de certification depuis les donnees reelles. "
        "Met a jour le cache total_points et certification_tier sur VendorProfile."
    ),
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def vendor_certifications(request):
    """
    Calcul dynamique des points de certification.
 
    Baremes :
      +5  par vente confirmee (commande DELIVERED/AUTO_CONFIRMED)
      +10 par avis 5 etoiles approuve
      +5  par avis 4 etoiles approuve
      +2  par mois d'anciennete (depuis approved_at)
      +50 bonus si 0 litige sur les 30 derniers jours
      +20 si taux de livraison >= 95% (30 derniers jours)
      +10 si taux de livraison >= 85%
 
    Tiers :
      Bronze  : 0 - 499 pts
      Argent  : 500 - 999 pts
      Or      : 1000 - 1999 pts
      Diamant : 2000+ pts
    """
    try:
        profile = VendorProfile.objects.get(user=request.user)
        if not profile.is_active_vendor:
            return Response({'detail': "Compte vendeur non approuve."}, status=403)
 
        from apps.orders.models import Order, OrderItem, Dispute
        from apps.catalog.models import ProductReview
        from django.utils import timezone
        from datetime import timedelta
 
        now         = timezone.now()
        last_30days = now - timedelta(days=30)
 
        # ── 1. Points ventes ─────────────────────────────────────────────────
        completed_statuses = [
            'DELIVERED', 'BUYER_CONFIRMED', 'AUTO_CONFIRMED', 'RELEASED_TO_VENDOR',
        ]
        orders_completed = OrderItem.objects.filter(
            product__vendor=request.user,
            order__fulfillment_status__in=completed_statuses,
        ).values('order').distinct().count()
        points_sales = orders_completed * 5
 
        # ── 2. Points avis ───────────────────────────────────────────────────
        reviews_5 = ProductReview.objects.filter(
            product__vendor=request.user, rating=5, is_approved=True,
        ).count()
        reviews_4 = ProductReview.objects.filter(
            product__vendor=request.user, rating=4, is_approved=True,
        ).count()
        points_reviews = reviews_5 * 10 + reviews_4 * 5
 
        # ── 3. Points anciennete ─────────────────────────────────────────────
        if profile.approved_at:
            months = max(0, (now - profile.approved_at).days // 30)
        else:
            months = max(0, (now - profile.created_at).days // 30)
        points_seniority = months * 2
 
        # ── 4. Bonus 0 litige sur 30 jours ──────────────────────────────────
        recent_disputes = Dispute.objects.filter(
            order__items__product__vendor=request.user,
            created_at__gte=last_30days,
        ).distinct().count()
        points_no_dispute = 50 if recent_disputes == 0 else 0
 
        # ── 5. Bonus taux de livraison ───────────────────────────────────────
        orders_30 = OrderItem.objects.filter(
            product__vendor=request.user,
            order__created_at__gte=last_30days,
        ).values('order').distinct().count()
 
        orders_delivered_30 = OrderItem.objects.filter(
            product__vendor=request.user,
            order__created_at__gte=last_30days,
            order__fulfillment_status__in=completed_statuses,
        ).values('order').distinct().count()
 
        delivery_rate = (
            round(orders_delivered_30 / orders_30 * 100, 1)
            if orders_30 > 0 else 100.0
        )
        if delivery_rate >= 95:
            points_delivery = 20
        elif delivery_rate >= 85:
            points_delivery = 10
        else:
            points_delivery = 0
 
        # ── Total ─────────────────────────────────────────────────────────────
        total = (
            points_sales + points_reviews + points_seniority
            + points_no_dispute + points_delivery
        )
        tier  = VendorProfile.tier_from_points(total)
        next_threshold = VendorProfile.next_tier_threshold(total)
 
        # Mettre a jour le cache
        VendorProfile.objects.filter(pk=profile.pk).update(
            total_points       = total,
            certification_tier = tier,
        )
 
        # ── Reponse detaillee ─────────────────────────────────────────────────
        TIER_LABELS   = {'BRONZE': 'Bronze', 'SILVER': 'Argent', 'GOLD': 'Or', 'DIAMOND': 'Diamant'}
        TIER_NEXT     = {'BRONZE': 'SILVER', 'SILVER': 'GOLD', 'GOLD': 'DIAMOND', 'DIAMOND': None}
        TIER_BENEFITS = {
            'BRONZE':  ['Vente sur BelivaY', 'QR Code boutique', 'Support standard', 'Commission standard'],
            'SILVER':  ['Badge Argent visible', 'Commission -1%', 'Support prioritaire', '2 boosts/mois offerts'],
            'GOLD':    ['Badge Or visible', 'Commission -2%', 'Support dedie', '5 boosts/mois offerts', 'Mise en avant catalogue'],
            'DIAMOND': ['Badge Diamant exclusif', 'Commission -3%', 'Support VIP 24/7', 'Boosts illimites', 'Page boutique Premium'],
        }
 
        tiers_info = []
        for t, label in TIER_LABELS.items():
            thresholds = {'BRONZE': 0, 'SILVER': 500, 'GOLD': 1000, 'DIAMOND': 2000}
            tiers_info.append({
                'code':        t,
                'label':       label,
                'threshold':   thresholds[t],
                'benefits':    TIER_BENEFITS[t],
                'is_current':  t == tier,
                'is_unlocked': total >= thresholds[t],
            })
 
        return Response({
            'total_points':     total,
            'current_tier':     tier,
            'current_tier_label': TIER_LABELS[tier],
            'next_tier':        TIER_NEXT[tier],
            'next_tier_label':  TIER_LABELS.get(TIER_NEXT[tier], None),
            'next_threshold':   next_threshold,
            'progress_pct':     min(100, round(total / next_threshold * 100)) if tier != 'DIAMOND' else 100,
            'points_remaining': max(0, next_threshold - total) if tier != 'DIAMOND' else 0,
            'breakdown': {
                'sales':       {'points': points_sales,      'detail': f"{orders_completed} ventes x 5 pts"},
                'reviews':     {'points': points_reviews,    'detail': f"{reviews_5} avis 5★ x 10 + {reviews_4} avis 4★ x 5"},
                'seniority':   {'points': points_seniority,  'detail': f"{months} mois d'anciennete x 2 pts"},
                'no_dispute':  {'points': points_no_dispute, 'detail': f"{'0 litige / 30j → +50' if recent_disputes == 0 else f'{recent_disputes} litige(s) / 30j'}"},
                'delivery':    {'points': points_delivery,   'detail': f"Taux livraison {delivery_rate}%"},
            },
            'tiers': tiers_info,
            'how_to_earn': [
                {'action': 'Vendre un produit',                'points': '+5 pts par vente'},
                {'action': 'Recevoir un avis 5 etoiles',      'points': '+10 pts'},
                {'action': 'Recevoir un avis 4 etoiles',      'points': '+5 pts'},
                {'action': 'Anciennete (chaque mois)',         'points': '+2 pts/mois'},
                {'action': '0 litige sur 30 jours',           'points': '+50 pts bonus'},
                {'action': 'Taux livraison >= 95% (30 jours)','points': '+20 pts bonus'},
                {'action': 'Taux livraison >= 85% (30 jours)','points': '+10 pts bonus'},
            ],
        })
 
    except VendorProfile.DoesNotExist:
        return Response({'detail': 'Profil vendeur introuvable.'}, status=404)
 
 
# PLANS & ABONNEMENTS

@extend_schema(
    tags=["Vendors"],
    summary="List subscription plans",
    description="Retourne les plans actifs et le plan courant du vendeur.",
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def vendor_list_plans(request):
    """Liste les plans disponibles + infos plan courant du vendeur."""
    try:
        profile = VendorProfile.objects.select_related('current_plan').get(user=request.user)
    except VendorProfile.DoesNotExist:
        return Response({'detail': 'Profil vendeur introuvable.'}, status=404)
 
    from apps.vendors.models import SubscriptionPlan
 
    plans = SubscriptionPlan.objects.filter(is_active=True).order_by('display_order')
 
    plans_data = []
    for p in plans:
        plans_data.append({
            'id':               p.id,
            'code':             p.code,
            'name':             p.name,
            'description':      p.description,
            'price_monthly_xaf': p.price_monthly_xaf,
            'price_annual_xaf': p.price_annual_xaf,
            'commission_rate':  float(p.commission_rate),
            'max_products':     p.max_products,
            'max_boosts_month': p.max_boosts_month,
            'features':         p.features,
            'is_current':       profile.current_plan_id == p.id,
            'is_popular':       p.code == 'PRO',
        })
 
    # Plan courant
    current_plan_data = None
    if profile.current_plan:
        current_plan_data = {
            'code':         profile.current_plan.code,
            'name':         profile.current_plan.name,
            'expires_at':   profile.plan_expires_at.isoformat() if profile.plan_expires_at else None,
        }
 
    return Response({
        'plans':        plans_data,
        'current_plan': current_plan_data or {'code': 'FREE', 'name': 'Gratuit', 'expires_at': None},
        'active_plan_code': profile.active_plan_code,
    })
 
 
@extend_schema(
    tags=["Vendors"],
    summary="Subscribe to a plan",
    description=(
        "Initie une souscription a un plan. "
        "Le vendeur declare son paiement MoMo. "
        "L'admin valide manuellement et active le plan. "
        "Body : { plan_code, billing_cycle, operator, phone_number }"
    ),
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def vendor_subscribe_plan(request):
    """
    Initie une souscription a un plan.
    Cree un VendorSubscription en statut PENDING.
    L'admin confirme et active le plan depuis son espace.
    """
    try:
        profile = VendorProfile.objects.get(user=request.user)
        if not profile.is_active_vendor:
            return Response({'detail': "Compte vendeur non approuve."}, status=403)
 
        from apps.vendors.models import SubscriptionPlan, VendorSubscription
 
        plan_code     = request.data.get('plan_code')
        billing_cycle = request.data.get('billing_cycle', 'MONTHLY')
        operator      = request.data.get('operator')
        phone_number  = request.data.get('phone_number', '')
 
        if not plan_code:
            return Response({'detail': '"plan_code" est requis.'}, status=400)
        if operator not in ['ORANGE_MONEY', 'MTN_MOMO']:
            return Response({'detail': '"operator" doit etre ORANGE_MONEY ou MTN_MOMO.'}, status=400)
        if billing_cycle not in ['MONTHLY', 'ANNUAL']:
            return Response({'detail': '"billing_cycle" doit etre MONTHLY ou ANNUAL.'}, status=400)
 
        try:
            plan = SubscriptionPlan.objects.get(code=plan_code, is_active=True)
        except SubscriptionPlan.DoesNotExist:
            return Response({'detail': f'Plan "{plan_code}" introuvable ou inactif.'}, status=404)
 
        if plan.code == 'FREE':
            return Response({'detail': 'Le plan gratuit ne necessite pas de souscription.'}, status=400)
 
        # Verifier qu'il n'y a pas deja un PENDING en attente
        pending = VendorSubscription.objects.filter(
            vendor=profile, sub_status='PENDING',
        ).first()
        if pending:
            return Response({
                'detail': f'Vous avez deja une souscription en attente ({pending.payment_reference}). Attendez la confirmation admin ou annulez-la.',
            }, status=400)
 
        amount = plan.price_annual_xaf if billing_cycle == 'ANNUAL' else plan.price_monthly_xaf
 
        sub = VendorSubscription.objects.create(
            vendor        = profile,
            plan          = plan,
            billing_cycle = billing_cycle,
            amount_paid_xaf = amount,
            operator      = operator,
            phone_number  = phone_number,
            sub_status    = 'PENDING',
        )
 
        return Response({
            'message':   'Souscription initiee. Un admin BelivaY va confirmer votre paiement sous 24h.',
            'reference': sub.payment_reference,
            'plan':      plan.name,
            'amount':    amount,
            'operator':  operator,
            'status':    'PENDING',
        }, status=201)
 
    except VendorProfile.DoesNotExist:
        return Response({'detail': 'Profil vendeur introuvable.'}, status=404)
 
 
@extend_schema(
    tags=["Vendors"],
    summary="Get subscription history",
    description="Historique des abonnements du vendeur.",
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def vendor_subscription_history(request):
    """Historique des abonnements du vendeur."""
    try:
        profile = VendorProfile.objects.get(user=request.user)
        from apps.vendors.models import VendorSubscription
 
        subs = VendorSubscription.objects.filter(vendor=profile).select_related('plan').order_by('-created_at')[:20]
 
        data = [{
            'id':               s.id,
            'reference':        s.payment_reference,
            'plan_name':        s.plan.name,
            'plan_code':        s.plan.code,
            'billing_cycle':    s.billing_cycle,
            'amount_paid_xaf':  s.amount_paid_xaf,
            'operator':         s.operator,
            'sub_status':       s.sub_status,
            'started_at':       s.started_at.isoformat() if s.started_at else None,
            'expires_at':       s.expires_at.isoformat() if s.expires_at else None,
            'created_at':       s.created_at.isoformat(),
        } for s in subs]
 
        return Response(data)
 
    except VendorProfile.DoesNotExist:
        return Response({'detail': 'Profil vendeur introuvable.'}, status=404)
    

# ══════════════════════════════════════════════════════════════════════════════
# PLANS — avec essai gratuit
# ══════════════════════════════════════════════════════════════════════════════
 
@extend_schema(tags=["Vendors"], summary="List subscription plans")
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def vendor_list_plans(request):
    """
    Retourne les plans disponibles avec :
    - is_current : le vendeur est sur ce plan
    - trial_available : l'essai est disponible pour ce plan (trial_days > 0 et pas déjà utilisé)
    - trial_used : le vendeur a déjà utilisé l'essai de ce plan
    """
    try:
        profile = VendorProfile.objects.select_related('current_plan').get(user=request.user)
    except VendorProfile.DoesNotExist:
        return Response({'detail': 'Profil vendeur introuvable.'}, status=404)
 
    plans = SubscriptionPlan.objects.filter(is_active=True).order_by('display_order')
 
    # Plans pour lesquels l'essai a déjà été utilisé
    used_trial_plan_ids = set(
        VendorSubscription.objects.filter(
            vendor=profile, is_trial=True
        ).values_list('plan_id', flat=True)
    )
 
    plans_data = []
    for p in plans:
        trial_used      = p.id in used_trial_plan_ids
        trial_available = p.trial_days > 0 and not trial_used and p.code != 'FREE'
        plans_data.append({
            'id':               p.id,
            'code':             p.code,
            'name':             p.name,
            'description':      p.description,
            'price_monthly_xaf': p.price_monthly_xaf,
            'price_annual_xaf': p.price_annual_xaf,
            'commission_rate':  float(p.commission_rate),
            'max_products':     p.max_products,
            'max_boosts_month': p.max_boosts_month,
            'features':         p.features,
            'trial_days':       p.trial_days,
            'plan_duration_days': p.plan_duration_days,
            'is_current':       profile.current_plan_id == p.id,
            'is_popular':       p.code == 'PRO',
            'trial_available':  trial_available,
            'trial_used':       trial_used,
        })
 
    current_plan_data = None
    if profile.current_plan:
        is_trial = VendorSubscription.objects.filter(
            vendor=profile, plan=profile.current_plan, is_trial=True, sub_status='ACTIVE'
        ).exists()
        current_plan_data = {
            'code':       profile.current_plan.code,
            'name':       profile.current_plan.name,
            'expires_at': profile.plan_expires_at.isoformat() if profile.plan_expires_at else None,
            'is_trial':   is_trial,
        }
 
    return Response({
        'plans':            plans_data,
        'current_plan':     current_plan_data or {'code': 'FREE', 'name': 'Gratuit', 'expires_at': None, 'is_trial': False},
        'active_plan_code': profile.active_plan_code,
    })
 
 
@extend_schema(tags=["Vendors"], summary="Activate free trial for a plan")
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def vendor_trial_activate(request):
    """
    Active l'essai gratuit d'un plan.
    Body : { plan_code: 'PRO' }
 
    Règles :
    - Le plan doit avoir trial_days > 0
    - Le vendeur n'a pas encore utilisé l'essai de ce plan
    - Un seul essai actif à la fois
    """
    try:
        profile   = VendorProfile.objects.get(user=request.user)
        plan_code = request.data.get('plan_code')
 
        if not plan_code:
            return Response({'detail': '"plan_code" requis.'}, status=400)
 
        try:
            plan = SubscriptionPlan.objects.get(code=plan_code, is_active=True)
        except SubscriptionPlan.DoesNotExist:
            return Response({'detail': f'Plan "{plan_code}" introuvable.'}, status=404)
 
        if plan.trial_days == 0:
            return Response({'detail': 'Ce plan n\'a pas d\'essai gratuit.'}, status=400)
 
        if plan.code == 'FREE':
            return Response({'detail': 'Le plan gratuit ne nécessite pas d\'essai.'}, status=400)
 
        # Vérifier que l'essai n'a pas déjà été utilisé
        already_tried = VendorSubscription.objects.filter(
            vendor=profile, plan=plan, is_trial=True
        ).exists()
        if already_tried:
            return Response({'detail': f'Vous avez déjà utilisé l\'essai du plan {plan.name}.'}, status=400)
 
        # Annuler tout essai actif sur un autre plan
        VendorSubscription.objects.filter(
            vendor=profile, is_trial=True, sub_status='ACTIVE'
        ).update(sub_status='CANCELLED')
 
        from django.utils import timezone
        from datetime import timedelta
 
        now        = timezone.now()
        expires_at = now + timedelta(days=plan.trial_days)
 
        sub = VendorSubscription.objects.create(
            vendor          = profile,
            plan            = plan,
            billing_cycle   = 'TRIAL',
            is_trial        = True,
            amount_paid_xaf = 0,
            sub_status      = 'ACTIVE',
            started_at      = now,
            expires_at      = expires_at,
        )
 
        # Activer le plan sur le profil
        profile.current_plan    = plan
        profile.plan_expires_at = expires_at
        profile.save(update_fields=['current_plan', 'plan_expires_at', 'updated_at'])
 
        # Notification email
        try:
            send_mail(
                subject=f'[BelivaY] Essai gratuit {plan.name} activé !',
                message=(
                    f'Bonjour {profile.business_name},\n\n'
                    f'Votre essai gratuit de {plan.trial_days} jours pour le plan {plan.name} est maintenant actif.\n'
                    f'Il expire le {expires_at.strftime("%d/%m/%Y")}.\n\n'
                    f'Profitez de toutes les fonctionnalités {plan.name} !\n\n'
                    f'Cordialement,\nL\'équipe BelivaY'
                ),
                from_email=getattr(django_settings, 'DEFAULT_FROM_EMAIL', 'noreply@belivay.com'),
                recipient_list=[profile.user.email],
                fail_silently=True,
            )
        except Exception:
            pass
 
        return Response({
            'message':    f'Essai gratuit {plan.trial_days} jours activé !',
            'plan':       plan.name,
            'expires_at': expires_at.isoformat(),
            'reference':  sub.payment_reference,
        }, status=201)
 
    except VendorProfile.DoesNotExist:
        return Response({'detail': 'Profil vendeur introuvable.'}, status=404)
 
 
@extend_schema(tags=["Vendors"], summary="Subscribe to a plan")
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def vendor_subscribe_plan(request):
    """
    Initie une souscription payante.
    Body : { plan_code, billing_cycle, operator, phone_number }
    """
    try:
        profile = VendorProfile.objects.get(user=request.user)
        if not profile.is_active_vendor:
            return Response({'detail': 'Compte vendeur non approuvé.'}, status=403)
 
        plan_code     = request.data.get('plan_code')
        billing_cycle = request.data.get('billing_cycle', 'MONTHLY')
        operator      = request.data.get('operator')
        phone_number  = request.data.get('phone_number', '')
 
        if not plan_code:
            return Response({'detail': '"plan_code" est requis.'}, status=400)
        if operator not in ['ORANGE_MONEY', 'MTN_MOMO']:
            return Response({'detail': '"operator" doit être ORANGE_MONEY ou MTN_MOMO.'}, status=400)
        if billing_cycle not in ['MONTHLY', 'ANNUAL']:
            return Response({'detail': '"billing_cycle" doit être MONTHLY ou ANNUAL.'}, status=400)
 
        try:
            plan = SubscriptionPlan.objects.get(code=plan_code, is_active=True)
        except SubscriptionPlan.DoesNotExist:
            return Response({'detail': f'Plan "{plan_code}" introuvable.'}, status=404)
 
        if plan.code == 'FREE':
            return Response({'detail': 'Le plan gratuit ne nécessite pas de souscription.'}, status=400)
 
        # Vérifier pas de PENDING en attente
        pending = VendorSubscription.objects.filter(
            vendor=profile, sub_status='PENDING', is_trial=False
        ).first()
        if pending:
            return Response({
                'detail': f'Souscription en attente : {pending.payment_reference}. Attendez la confirmation admin.',
            }, status=400)
 
        amount = plan.price_annual_xaf if billing_cycle == 'ANNUAL' else plan.price_monthly_xaf
 
        sub = VendorSubscription.objects.create(
            vendor          = profile,
            plan            = plan,
            billing_cycle   = billing_cycle,
            is_trial        = False,
            amount_paid_xaf = amount,
            operator        = operator,
            phone_number    = phone_number,
            sub_status      = 'PENDING',
        )
 
        return Response({
            'message':   'Souscription enregistrée. Un admin BelivaY va confirmer votre paiement sous 24h.',
            'reference': sub.payment_reference,
            'plan':      plan.name,
            'amount':    amount,
            'operator':  operator,
            'status':    'PENDING',
        }, status=201)
 
    except VendorProfile.DoesNotExist:
        return Response({'detail': 'Profil vendeur introuvable.'}, status=404)
 
 
@extend_schema(tags=["Vendors"], summary="Subscription history")
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def vendor_subscription_history(request):
    try:
        profile = VendorProfile.objects.get(user=request.user)
        subs    = VendorSubscription.objects.filter(vendor=profile).select_related('plan').order_by('-created_at')[:20]
        data = [{
            'id':             s.id,
            'reference':      s.payment_reference,
            'plan_name':      s.plan.name,
            'plan_code':      s.plan.code,
            'billing_cycle':  s.billing_cycle,
            'is_trial':       s.is_trial,
            'amount_paid_xaf': s.amount_paid_xaf,
            'operator':       s.operator,
            'sub_status':     s.sub_status,
            'started_at':     s.started_at.isoformat() if s.started_at else None,
            'expires_at':     s.expires_at.isoformat() if s.expires_at else None,
            'created_at':     s.created_at.isoformat(),
        } for s in subs]
        return Response(data)
    except VendorProfile.DoesNotExist:
        return Response({'detail': 'Profil vendeur introuvable.'}, status=404)
 
 
# ══════════════════════════════════════════════════════════════════════════════
# PAGE PUBLIQUE BOUTIQUE
# ══════════════════════════════════════════════════════════════════════════════
 
@api_view(['GET'])
@permission_classes([])
def public_shop(request, slug):
    """Page publique d'une boutique — accessible sans authentification."""
    try:
        profile = VendorProfile.objects.select_related('user', 'current_plan').get(
            shop_slug=slug, status='APPROVED', is_online=True,
        )
    except VendorProfile.DoesNotExist:
        return Response({'detail': 'Boutique introuvable ou hors ligne.'}, status=404)
 
    from apps.catalog.models import Product
    from apps.catalog.serializers import ProductSerializer
    from django.db.models import Avg, Count
 
    products = Product.objects.filter(vendor=profile.user, is_active=True).order_by('-created_at')
    stats    = products.aggregate(total=Count('id'), avg_rating=Avg('reviews__rating'))
 
    banner_url = request.build_absolute_uri(profile.banner_image.url) if profile.banner_image else None
    photo_url  = request.build_absolute_uri(profile.profile_photo.url) if profile.profile_photo else None
 
    locations = VendorLocation.objects.filter(vendor=profile, is_active=True)
    locations_data = VendorLocationSerializer(locations, many=True).data
 
    return Response({
        'slug':               profile.shop_slug,
        'business_name':      profile.business_name,
        'business_description': profile.business_description,
        'city':               profile.city,
        'whatsapp_phone':     profile.whatsapp_phone,
        'banner_url':         banner_url,
        'photo_url':          photo_url,
        'certification_tier': profile.certification_tier,
        'is_online':          profile.is_online,
        'member_since':       profile.approved_at.isoformat() if profile.approved_at else profile.created_at.isoformat(),
        'stats': {
            'total_products': stats['total'] or 0,
            'avg_rating':     round(stats['avg_rating'], 1) if stats['avg_rating'] else None,
        },
        'locations':  locations_data,
        'products':   ProductSerializer(products[:20], many=True, context={'request': request}).data,
    })    


@extend_schema(tags=["Vendors"], summary="Update vendor settings")
@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def vendor_update_settings(request):
    try:
        profile = VendorProfile.objects.get(user=request.user)
        ALLOWED = ['default_withdrawal_operator', 'default_withdrawal_phone']
        for field in ALLOWED:
            if field in request.data:
                setattr(profile, field, request.data[field])
        profile.save()
        return Response(VendorProfileSerializer(profile, context={'request': request}).data)
    except VendorProfile.DoesNotExist:
        return Response({'detail': 'Profil vendeur introuvable.'}, status=404)


# ─────────────────────────────────────────────────────────────────────────────
# ADMINISTRATION — TOGGLE RÉPONSE LITIGE (vendor_can_reply / courier_can_reply)
# ─────────────────────────────────────────────────────────────────────────────

@extend_schema(tags=["Admin"], summary="Toggle reply permission for vendor/courier in dispute")
@api_view(['POST'])
@permission_classes([IsAdminUser])
def admin_toggle_dispute_reply(request, dispute_id):
    """
    Accorde ou révoque la permission de répondre à un vendeur ou livreur dans un litige.
    Body : { "role": "vendor" | "courier", "allow": true | false }
    """
    from apps.orders.models import Dispute
    from apps.vendors.serializers import AdminDisputeDetailSerializer

    try:
        dispute = Dispute.objects.get(id=dispute_id)
    except Dispute.DoesNotExist:
        return Response({'detail': 'Litige introuvable.'}, status=404)

    role  = request.data.get('role')
    allow = request.data.get('allow', True)

    if role == 'vendor':
        dispute.vendor_can_reply = bool(allow)
        dispute.save(update_fields=['vendor_can_reply'])
    elif role == 'courier':
        dispute.courier_can_reply = bool(allow)
        dispute.save(update_fields=['courier_can_reply'])
    else:
        return Response({'detail': 'role doit être "vendor" ou "courier".'}, status=400)

    serializer = AdminDisputeDetailSerializer(dispute, context={'request': request})
    return Response(serializer.data)


# ─────────────────────────────────────────────────────────────────────────────
# ADMINISTRATION — LISTE DES LIVREURS (pour notifications ciblées)
# ─────────────────────────────────────────────────────────────────────────────

@extend_schema(tags=["Admin"], summary="List all couriers")
@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_list_couriers(request):
    """
    Retourne la liste des livreurs pour le ciblage de notifications.
    """
    from apps.accounts.models import CourierProfile

    couriers = CourierProfile.objects.select_related('user').filter(user__is_active=True)

    result = []
    for cp in couriers:
        u = cp.user
        full_name = f"{u.first_name} {u.last_name}".strip() or u.username
        result.append({
            'id':       cp.id,
            'user_id':  u.id,
            'name':     full_name,
            'phone':    cp.phone,
            'city':     cp.city,
            'username': u.username,
        })

    return Response(result)


# ─────────────────────────────────────────────────────────────────────────────
# ADMINISTRATION — BROADCAST ÉTENDU (livreurs + ciblage individuel)
# ─────────────────────────────────────────────────────────────────────────────

@extend_schema(tags=["Admin"], summary="Extended broadcast notification to all actor types")
@api_view(['POST'])
@permission_classes([IsAdminUser])
def admin_broadcast_extended(request):
    """
    Envoie une notification à une audience étendue.
    audience:
      'all_actors'       — clients + vendeurs + livreurs
      'couriers'         — tous les livreurs
      'specific_vendor'  — un vendeur précis (vendor_user_id requis)
      'specific_courier' — un livreur précis (courier_user_id requis)
      'all'              — tous les utilisateurs actifs (clients + vendeurs, sans livreurs)
      'customers'        — clients uniquement
      'vendors'          — tous les vendeurs
      'active_vendors'   — vendeurs approuvés
    """
    from django.contrib.auth.models import User
    from apps.accounts.models import UserNotification, CourierProfile

    audience         = request.data.get('audience', 'all')
    title            = request.data.get('title', '').strip()
    message          = request.data.get('message', '').strip()
    notif_type       = request.data.get('type', 'SYSTEM')
    action_url       = request.data.get('action_url', '')
    vendor_user_id   = request.data.get('vendor_user_id')
    courier_user_id  = request.data.get('courier_user_id')

    if not title or not message:
        return Response({'detail': 'Titre et message sont requis.'}, status=400)

    users = User.objects.none()

    if audience == 'all_actors':
        users = User.objects.filter(is_active=True, is_staff=False)

    elif audience == 'couriers':
        courier_user_ids = CourierProfile.objects.filter(
            user__is_active=True
        ).values_list('user_id', flat=True)
        users = User.objects.filter(id__in=courier_user_ids)

    elif audience == 'specific_courier':
        if not courier_user_id:
            return Response({'detail': 'courier_user_id requis pour ce ciblage.'}, status=400)
        users = User.objects.filter(id=courier_user_id, is_active=True)

    elif audience == 'specific_vendor':
        if not vendor_user_id:
            return Response({'detail': 'vendor_user_id requis pour ce ciblage.'}, status=400)
        users = User.objects.filter(id=vendor_user_id, is_active=True)

    elif audience == 'all':
        users = User.objects.filter(is_active=True, is_staff=False)

    elif audience == 'customers':
        users = User.objects.filter(
            is_active=True, is_staff=False,
            vendor_profile__isnull=True,
            courier_profile__isnull=True,
        )

    elif audience == 'vendors':
        users = User.objects.filter(is_active=True, vendor_profile__isnull=False)

    elif audience == 'active_vendors':
        users = User.objects.filter(is_active=True, vendor_profile__status='APPROVED')

    else:
        return Response({'detail': f'Audience inconnue : {audience}'}, status=400)

    user_list = list(users)
    count = len(user_list)

    if count == 0:
        return Response({'detail': 'Aucun utilisateur ciblé.'}, status=400)

    notifications = [
        UserNotification(
            user=u,
            title=title,
            message=message,
            notification_type=notif_type,
            action_url=action_url,
        )
        for u in user_list
    ]
    UserNotification.objects.bulk_create(notifications, batch_size=500)

    return Response({
        'success':    True,
        'recipients': count,
        'audience':   audience,
        'title':      title,
    })


@extend_schema(tags=["Admin"], summary="Approve product (moderation)")
@api_view(['POST'])
@permission_classes([IsAdminUser])
def admin_approve_product(request, product_id):
    from apps.catalog.models import Product, ModerationStatus
    from apps.catalog.serializers import ProductSerializer
    from django.utils import timezone
    try:
        product = Product.objects.get(id=product_id)
    except Product.DoesNotExist:
        return Response({'detail': 'Produit introuvable.'}, status=status.HTTP_404_NOT_FOUND)

    product.moderation_status = ModerationStatus.APPROVED
    product.moderated_at = timezone.now()
    product.moderated_by = request.user
    product.save(update_fields=['moderation_status', 'moderated_at', 'moderated_by'])

    # Cascade : valider la fiche si elle est encore en attente
    master = product.master
    if master and master.moderation_status != ModerationStatus.APPROVED:
        master.moderation_status = ModerationStatus.APPROVED
        master.moderated_at = timezone.now()
        master.moderated_by = request.user
        master.save(update_fields=['moderation_status', 'moderated_at', 'moderated_by'])

    return Response(ProductSerializer(product, context={'request': request}).data)


@extend_schema(tags=["Admin"], summary="Reject product (moderation)")
@api_view(['POST'])
@permission_classes([IsAdminUser])
def admin_reject_product(request, product_id):
    from apps.catalog.models import Product, ModerationStatus
    from apps.catalog.serializers import ProductSerializer
    from django.utils import timezone
    try:
        product = Product.objects.get(id=product_id)
    except Product.DoesNotExist:
        return Response({'detail': 'Produit introuvable.'}, status=status.HTTP_404_NOT_FOUND)

    product.moderation_status = ModerationStatus.REJECTED
    product.moderated_at = timezone.now()
    product.moderated_by = request.user
    product.save(update_fields=['moderation_status', 'moderated_at', 'moderated_by'])

    return Response(ProductSerializer(product, context={'request': request}).data)