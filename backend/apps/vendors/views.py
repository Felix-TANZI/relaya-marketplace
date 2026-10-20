# backend/apps/vendors/views.py
# Vues pour l'espace vendeur

from rest_framework import status, viewsets
from rest_framework.exceptions import PermissionDenied
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
from datetime import timedelta, date, datetime
from rest_framework.decorators import action
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
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
from apps.common.tasks import send_plain_email
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
from apps.orders.models import Order, OrderItem, DisputeEvidenceRequest, DisputeMessage, Return
from apps.orders.serializers import ReturnSerializer
from apps.orders.evidence import create_evidence, resolve_dispute_actor
from apps.accounts.models import UserNotification
from .models import ShopClosure, VendorNotificationSettings, MessageThread, ThreadMessage, VendorEvent
from django.http import StreamingHttpResponse
import re
import time
import json as _json


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
            if 'stock_quantity' in self.request.data:
                context['stock_quantity'] = int(self.request.data['stock_quantity'])
            elif self.action == 'create':
                context['stock_quantity'] = 0
        # Le vendeur voit TOUJOURS sa propre fiche telle qu'il l'a ecrite,
        # jamais une traduction automatique (voir translate_for_buyer dans
        # apps.catalog.serializers).
        context['translate_content'] = False
        return context
    
    def perform_create(self, serializer):
        """Assigner le vendeur lors de la création"""
        try:
            vendor_profile = VendorProfile.objects.get(user=self.request.user)
            if not vendor_profile.is_active_vendor:
                raise PermissionDenied("Votre compte vendeur n'est pas encore approuvé.")
            if not vendor_profile.has_required_location:
                raise PermissionDenied(
                    "Ajoutez une boutique principale localisable avant de créer des produits."
                )
        except VendorProfile.DoesNotExist:
            raise PermissionDenied("Vous devez être vendeur pour créer des produits.")
        
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
            serializer = ProductSerializer(copy, context={'request': request, 'translate_content': False})
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
            return Response(ProductSerializer(product, context={'request': request, 'translate_content': False}).data)
 
        except Exception as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'], url_path='master-search')
    def master_search(self, request):
        """Recherche de fiches maîtres (validées) pour rattacher une offre.

        `barcode` : correspondance exacte sur le SKU canonique ou le
        code-barres EAN/UPC d'un Variant (scanner caméra, NOF-01). Prioritaire
        sur `search` si les deux sont fournis.
        """
        from apps.catalog.models import MasterProduct, ModerationStatus, ProductVariant
        from django.db.models import Q
        barcode = request.query_params.get('barcode', '').strip()
        if barcode:
            master_ids = ProductVariant.objects.filter(
                Q(sku=barcode) | Q(barcode=barcode),
                is_active=True, moderation_status=ModerationStatus.APPROVED,
            ).values_list('master_id', flat=True)
            qs = MasterProduct.objects.filter(
                id__in=master_ids, moderation_status=ModerationStatus.APPROVED,
            )
        else:
            q = request.query_params.get('search', '').strip()
            qs = MasterProduct.objects.filter(moderation_status=ModerationStatus.APPROVED)
            if q:
                qs = qs.filter(Q(title__icontains=q) | Q(brand__icontains=q))
        qs = qs.select_related('category').order_by('title')[:20]
        data = [{
        'id': m.id, 'slug': m.slug, 'title': m.title, 'brand': m.brand,
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
    summary="Upload master (fiche) image",
    description=(
        "Upload une image PRO de fiche (vue acheteur), pour une fiche que le vendeur "
        "vient de créer et qui est encore en attente de validation. "
        "Formats : JPG, PNG, WEBP. Taille max : 5 Mo."
    ),
    responses={201: None},
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_master_image(request, master_id):
    """
    Sécurité :
      - Le vendeur doit posséder une offre sur cette fiche.
      - La fiche ne doit pas déjà être validée (on ne touche pas à une fiche partagée/approuvée).
    """
    from apps.catalog.models import MasterProduct, MasterProductImage, ModerationStatus

    try:
        master = MasterProduct.objects.get(id=master_id)
    except MasterProduct.DoesNotExist:
        return Response({'detail': 'Fiche introuvable.'}, status=status.HTTP_404_NOT_FOUND)

    if not Product.objects.filter(master=master, vendor=request.user).exists():
        return Response({'detail': "Vous n'avez pas d'offre sur cette fiche."}, status=status.HTTP_403_FORBIDDEN)

    if master.moderation_status == ModerationStatus.APPROVED:
        return Response({'detail': "Cette fiche est déjà validée et ne peut plus être modifiée."},
                        status=status.HTTP_403_FORBIDDEN)

    image_file = request.FILES.get('image')
    if not image_file:
        return Response({'detail': 'Champ "image" requis.'}, status=status.HTTP_400_BAD_REQUEST)
    if image_file.content_type not in ALLOWED_IMAGE_MIME:
        return Response({'detail': 'Format non supporté. Formats acceptés : JPG, PNG, WEBP.'},
                        status=status.HTTP_400_BAD_REQUEST)
    if image_file.size > MAX_IMAGE_SIZE_BYTES:
        return Response({'detail': 'Fichier trop volumineux. Maximum 5 Mo.'},
                        status=status.HTTP_400_BAD_REQUEST)

    current = MasterProductImage.objects.filter(master=master).count()
    if current >= MAX_IMAGES_PER_PRODUCT:
        return Response({'detail': f'Maximum {MAX_IMAGES_PER_PRODUCT} images par fiche.'},
                        status=status.HTTP_400_BAD_REQUEST)

    from apps.common.images import ImageOptimizationError, optimize_uploaded_image
    try:
        optimized_image = optimize_uploaded_image(
            image_file,
            max_input_bytes=MAX_IMAGE_SIZE_BYTES,
            max_dimension=1600,
            quality=80,
            filename_prefix="master",
        )
    except ImageOptimizationError as error:
        return Response({'detail': str(error)}, status=status.HTTP_400_BAD_REQUEST)

    with transaction.atomic():
        img = MasterProductImage.objects.create(
            master=master, image=optimized_image,
            is_primary=(current == 0), order=current,
        )

    return Response(
        {'id': img.id, 'image': request.build_absolute_uri(img.image.url), 'is_primary': img.is_primary},
        status=status.HTTP_201_CREATED,
    )


@extend_schema(tags=["Vendors"], summary="Delete master (fiche) image", responses={204: None})
@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_master_image(request, master_id, image_id):
    from apps.catalog.models import MasterProduct, MasterProductImage, ModerationStatus

    try:
        master = MasterProduct.objects.get(id=master_id)
    except MasterProduct.DoesNotExist:
        return Response({'detail': 'Fiche introuvable.'}, status=status.HTTP_404_NOT_FOUND)
    if not Product.objects.filter(master=master, vendor=request.user).exists():
        return Response({'detail': "Vous n'avez pas d'offre sur cette fiche."}, status=status.HTTP_403_FORBIDDEN)
    if master.moderation_status == ModerationStatus.APPROVED:
        return Response({'detail': "Fiche déjà validée."}, status=status.HTTP_403_FORBIDDEN)
    try:
        img = MasterProductImage.objects.get(id=image_id, master=master)
    except MasterProductImage.DoesNotExist:
        return Response({'detail': 'Image introuvable.'}, status=status.HTTP_404_NOT_FOUND)
    img.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)    


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
            .prefetch_related('shipments__events')
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
        ).prefetch_related('shipments__events').distinct().first()
        
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


def lignes_totaux_recu(*, paye_par_client, taux_commission, commission, net):
    """
    Les trois lignes du pied du recu vendeur — tache D20.

    « Afficher la ligne "Paye par le client" sur le recu. » Le recu montrait
    « Prix de vente » puis « Vous gardez », sans dire d'ou venait l'ecart : la
    commission etait invisible, le vendeur subissait une retenue qu'aucune
    ligne n'expliquait.

    « Paye par le client » porte sur SES articles, jamais sur le total de la
    commande : sur une commande multi-vendeurs ce total comprend les articles
    des autres et la livraison, et la regle de confidentialite dit que le
    vendeur ne voit jamais le total paye par le client.

    Rendu a part du PDF pour etre verifiable : le flux d'un PDF reportlab est
    compresse, on ne peut pas relire son texte depuis les octets produits.
    Sortie : [(libelle, montant, est_negatif), ...]
    """
    return [
        ("Paye par le client", paye_par_client, False),
        (f"Commission BelivaY ({taux_commission} %)", commission, True),
        ("Vous gardez", net, False),
    ]


@extend_schema(
    tags=["Vendors"],
    summary="Download order receipt PDF",
    description=(
        "Génère le reçu PDF d'une commande, limité aux articles du vendeur. "
        "L'identité de l'acheteur reste masquée (comme sur l'écran Reçu "
        "vendeur) : ce n'est pas une facture fiscale."
    ),
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def vendor_order_receipt_pdf(request, order_id):
    """Génère un reçu PDF pour une commande (articles du vendeur uniquement)."""
    import io
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    from reportlab.lib import colors
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.enums import TA_RIGHT
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle

    try:
        vendor_profile = VendorProfile.objects.get(user=request.user)
    except VendorProfile.DoesNotExist:
        return Response(
            {'detail': 'Profil vendeur introuvable.'},
            status=status.HTTP_404_NOT_FOUND,
        )

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

    items = list(order.items.filter(product__vendor=request.user))
    vendor_subtotal = sum(item.line_total_xaf for item in items)
    commission_amount = round(vendor_subtotal * float(order.commission_rate_snapshot) / 100)
    vendor_net_amount = vendor_subtotal - commission_amount
    order_ref = f"BLV-{order.id:05d}"

    def fmt_xaf(amount):
        return f"{round(amount):,} FCFA".replace(',', ' ')

    styles = getSampleStyleSheet()
    muted = colors.HexColor('#7C6E5A')
    orange = colors.HexColor('#F47920')
    dark = colors.HexColor('#1A1209')
    light = colors.HexColor('#F5F0E8')

    title_style = ParagraphStyle('Title', parent=styles['Title'], textColor=dark, fontSize=18, spaceAfter=2)
    muted_style = ParagraphStyle('Muted', parent=styles['Normal'], textColor=muted, fontSize=9.5)
    muted_right = ParagraphStyle('MutedRight', parent=muted_style, alignment=TA_RIGHT)
    label_style = ParagraphStyle('Label', parent=styles['Normal'], textColor=muted, fontSize=9)
    value_style = ParagraphStyle('Value', parent=styles['Normal'], textColor=dark, fontSize=11, fontName='Helvetica-Bold')

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        topMargin=22 * mm, bottomMargin=18 * mm, leftMargin=18 * mm, rightMargin=18 * mm,
    )

    elements = [
        Paragraph(vendor_profile.business_name, title_style),
        Paragraph('BelivaY Marketplace', muted_style),
        Spacer(1, 10 * mm),
        Paragraph(f"Reçu de commande {order_ref}", ParagraphStyle('Ref', parent=styles['Heading2'], textColor=orange)),
        Paragraph(f"Encaissé le {order.created_at.strftime('%d/%m/%Y à %H:%M')}", muted_style),
        Spacer(1, 6 * mm),
    ]

    info_table = Table(
        [
            [Paragraph('Client', label_style), Paragraph('Identité masquée', value_style)],
            [Paragraph('Encaissé par', label_style), Paragraph('BelivaY, pour votre compte', value_style)],
        ],
        colWidths=[40 * mm, 120 * mm],
    )
    info_table.setStyle(TableStyle([
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 8 * mm))

    rows = [['Produit', 'Qté', 'Prix unitaire', 'Total']]
    for item in items:
        rows.append([
            item.title_snapshot,
            str(item.qty),
            fmt_xaf(item.price_xaf_snapshot),
            fmt_xaf(item.line_total_xaf),
        ])

    items_table = Table(rows, colWidths=[80 * mm, 20 * mm, 35 * mm, 35 * mm])
    items_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), light),
        ('TEXTCOLOR', (0, 0), (-1, 0), muted),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9.5),
        ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
        ('ALIGN', (0, 0), (0, -1), 'LEFT'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('LINEBELOW', (0, 0), (-1, 0), 0.75, colors.HexColor('#E0D8CE')),
        ('LINEBELOW', (0, 1), (-1, -1), 0.5, colors.HexColor('#E0D8CE')),
    ]))
    elements.append(items_table)
    elements.append(Spacer(1, 8 * mm))

    totals_table = Table(
        [
            [libelle, (f'- {fmt_xaf(montant)}' if negatif else fmt_xaf(montant))]
            for libelle, montant, negatif in lignes_totaux_recu(
                paye_par_client=vendor_subtotal,
                taux_commission=order.commission_rate_snapshot,
                commission=commission_amount,
                net=vendor_net_amount,
            )
        ],
        colWidths=[135 * mm, 35 * mm],
    )
    totals_table.setStyle(TableStyle([
        ('FONTSIZE', (0, 0), (-1, -1), 11),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('TEXTCOLOR', (0, 0), (0, -1), muted),
        ('TEXTCOLOR', (1, 0), (1, 0), dark),
        ('TEXTCOLOR', (0, 1), (1, 1), colors.HexColor('#16A34A')),
        ('FONTNAME', (0, 1), (-1, 1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 1), (-1, 1), 14),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LINEABOVE', (0, 1), (-1, 1), 0.75, colors.HexColor('#E0D8CE')),
    ]))
    elements.append(totals_table)
    elements.append(Spacer(1, 10 * mm))
    elements.append(Paragraph("Ceci n'est pas une facture fiscale.", muted_right))
    elements.append(Paragraph('belivay.com · support@belivay.cm', muted_right))

    doc.build(elements)
    buffer.seek(0)

    response = HttpResponse(buffer.getvalue(), content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="recu_{order_ref}.pdf"'
    return response


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
    # ─────────────────────────────────────────────────────────────────────
    # LE RETRAIT PASSE PAR LE MODULE FINANCIER
    #
    # Decision produit confirmee : le vendeur retire quand il veut (PULL),
    # pas de versement automatique par cycle.
    #
    # A NOTER, pour qui relirait le cahier des charges : la feuille de route
    # « Reste a faire de l'equipe tech & produit » (V2 Elite, 16 octobre,
    # tache D20) demande encore « Verser chaque vendredi ». C'etait la regle
    # INITIALE ; elle a ete abandonnee au profit du retrait a la demande,
    # confirme le 12 octobre, et le document n'a pas suivi sur ce point.
    # Ne pas rouvrir ce chantier en le lisant : l'ecart est signale, il
    # attend une confirmation.
    #
    # Les versements du vendredi, eux, restent bien en vigueur pour les points
    # relais (D13) et les entreprises de livraison (D11) : ce sont des cycles
    # differents, que cette decision ne touche pas.
    #
    # Cette vue emprunte le meme
    # circuit comptable qu'un reglement par cycle (lot, confirmation,
    # approbation par un tiers, execution) mais le DECLENCHEUR reste le
    # vendeur, pas un calendrier — request_withdrawal() ne verse jamais
    # plus que le montant deja libere (`amount_due`), donc aucun risque de
    # payer ce qui n'est pas du.
    # ─────────────────────────────────────────────────────────────────────
    from apps.payments.bridge.actors import payee_for_vendor
    from apps.payments.settlements.services import (
        SettlementError, request_withdrawal,
    )

    try:
        profil = VendorProfile.objects.get(user=request.user)
    except VendorProfile.DoesNotExist:
        return Response({'detail': 'Profil vendeur introuvable.'},
                        status=status.HTTP_404_NOT_FOUND)

    if not profil.is_active_vendor:
        return Response(
            {'detail': "Votre compte vendeur n'est pas encore approuve."},
            status=status.HTTP_403_FORBIDDEN,
        )

    # ── Tache D19 ────────────────────────────────────────────────────────
    # « Exiger les documents complets avant le premier versement. »
    #
    # Le controle porte sur CHAQUE demande, pas seulement la premiere : si
    # une piece est rejetee ou expire apres un premier versement, verser a
    # nouveau reviendrait a payer un compte dont l'identite n'est plus
    # etablie. Un vendeur en regle ne voit jamais ce message.
    from apps.vendors.kyc import etat_verification, identite_verifiee
    if not identite_verifiee(request.user):
        return Response(
            {
                'detail': "Vos pieces d'identite doivent etre validees avant "
                          "tout versement.",
                'piece_identite': etat_verification(request.user),
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    compte = payee_for_vendor(profil, create=True)
    if compte is None:
        return Response(
            {'detail': "Aucun compte financier n'est rattache a votre "
                       "boutique. Contactez le support."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    montant = request.data.get('amount_xaf') or 0
    try:
        montant = int(montant)
    except (TypeError, ValueError):
        montant = 0

    try:
        demande = request_withdrawal(
            compte, requested_by=request.user, amount_xaf=montant,
            justification='Retrait demande depuis l\'espace vendeur',
        )
    except SettlementError as exc:
        # Le message du service, TEL QUEL : il explique ce qui manque et
        # comment y remedier.
        return Response({'detail': str(exc)},
                        status=status.HTTP_400_BAD_REQUEST)

    return Response(
        {
            'reference': demande.reference,
            'amount_xaf': demande.amount_xaf,
            'status': demande.status,
            'status_display': demande.get_status_display(),
            'detail': (
                "Demande enregistree. Elle sera validee par BelivaY puis "
                "versee sur votre numero Mobile Money."
            ),
        },
        status=status.HTTP_201_CREATED,
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
            context={'order': order, 'vendor': request.user},
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
    summary="Lister les avis laisses sur mes produits",
    description=(
        "Seuls les avis approuves sont renvoyes. L'identite de l'acheteur reste "
        "anonyme (meme convention que les commandes : 'Acheteur #XXXX', code non "
        "reversible base sur un hash de son identifiant) — le vendeur ne voit "
        "jamais le nom reel d'un client, y compris dans ses avis."
    ),
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def vendor_reviews(request):
    import hashlib

    from apps.catalog.models import ProductReview

    try:
        vendor_profile = VendorProfile.objects.get(user=request.user)
        if not vendor_profile.is_active_vendor:
            return Response(
                {'detail': "Votre compte vendeur n'est pas encore approuvé."},
                status=status.HTTP_403_FORBIDDEN,
            )

        reviews = (
            ProductReview.objects.filter(product__vendor=request.user, is_approved=True)
            .select_related('product')
            .order_by('-created_at')
        )

        def anonymous_buyer(user_id):
            code = hashlib.sha256(str(user_id).encode()).hexdigest()[:4].upper()
            return f"Acheteur #{code}"

        data = [
            {
                'id': r.id,
                'product_id': r.product_id,
                'product_name': r.product.title,
                'buyer_display': anonymous_buyer(r.user_id),
                'rating': r.rating,
                'title': r.title,
                'comment': r.comment,
                'is_verified_purchase': r.is_verified_purchase,
                'created_at': r.created_at,
            }
            for r in reviews
        ]
        average = reviews.aggregate(avg=Avg('rating'))['avg']
        return Response({
            'average_rating': round(average, 1) if average is not None else None,
            'count': len(data),
            'results': data,
        })
    except VendorProfile.DoesNotExist:
        return Response({'detail': 'Profil vendeur introuvable.'}, status=status.HTTP_404_NOT_FOUND)


@extend_schema(tags=["Vendors"], summary="Lister les retours concernant mes produits")
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def vendor_return_list(request):
    try:
        vendor_profile = VendorProfile.objects.get(user=request.user)
        if not vendor_profile.is_active_vendor:
            return Response(
                {'detail': "Votre compte vendeur n'est pas encore approuvé."},
                status=status.HTTP_403_FORBIDDEN,
            )
        returns = Return.objects.filter(vendor=request.user).select_related(
            'order', 'order_item', 'dropoff_relay_point',
        ).order_by('-created_at')
        status_filter = request.query_params.get('status')
        if status_filter:
            returns = returns.filter(status=status_filter)
        return Response(ReturnSerializer(returns, many=True, context={'request': request}).data)
    except VendorProfile.DoesNotExist:
        return Response({'detail': 'Profil vendeur introuvable.'}, status=status.HTTP_404_NOT_FOUND)


@extend_schema(
    tags=["Vendors"],
    summary="Approuver ou rejeter une demande de retour",
    description=(
        "Le vendeur reconnait (ou conteste) le motif du retour. L'approbation ne "
        "declenche PAS le remboursement — elle ouvre seulement l'etape logistique "
        "(depot/ramassage). Le remboursement n'intervient qu'apres reception "
        "physique et inspection (voir admin_finalize_return)."
    ),
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def vendor_return_review(request, return_id):
    try:
        vendor_profile = VendorProfile.objects.get(user=request.user)
        if not vendor_profile.is_active_vendor:
            return Response(
                {'detail': "Votre compte vendeur n'est pas encore approuvé."},
                status=status.HTTP_403_FORBIDDEN,
            )
        try:
            return_obj = Return.objects.get(id=return_id, vendor=request.user)
        except Return.DoesNotExist:
            return Response({'detail': 'Retour introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        if return_obj.status != Return.Status.REQUESTED:
            return Response(
                {'detail': 'Ce retour a deja ete traite.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        decision = (request.data.get('decision') or '').upper()
        if decision not in ('APPROVED', 'REJECTED'):
            return Response({'decision': "Choisissez 'APPROVED' ou 'REJECTED'."}, status=status.HTTP_400_BAD_REQUEST)

        return_obj.status = Return.Status.APPROVED if decision == 'APPROVED' else Return.Status.REJECTED
        return_obj.reviewed_by = request.user
        return_obj.reviewed_at = timezone.now()
        return_obj.review_note = request.data.get('note', '')
        return_obj.save(update_fields=['status', 'reviewed_by', 'reviewed_at', 'review_note', 'updated_at'])

        if decision == 'REJECTED':
            try:
                from apps.payments.bridge import events_in
                events_in.return_completed(
                    order_id=return_obj.order_id,
                    outcome='REJECTED',
                    event_id=f"return-{return_obj.id}-completed",
                    emitter="apps.vendors.vendor_return_review",
                )
            except Exception:
                import logging
                logging.getLogger("apps.vendors").exception(
                    "Evenement de retour (rejet vendeur) non transmis pour la commande #%s.",
                    return_obj.order_id,
                )

        UserNotification.objects.create(
            user=return_obj.requested_by,
            title=f"Retour {'approuve' if decision == 'APPROVED' else 'refuse'} · commande #{return_obj.order_id}",
            message=return_obj.review_note or (
                "Deposez le colis au point relais indique."
                if decision == 'APPROVED' else "Le vendeur conteste ce retour."
            ),
            notification_type=UserNotification.NotificationType.ORDER,
            action_url=f"/orders/{return_obj.order_id}",
        )

        return Response(ReturnSerializer(return_obj, context={'request': request}).data)
    except VendorProfile.DoesNotExist:
        return Response({'detail': 'Profil vendeur introuvable.'}, status=status.HTTP_404_NOT_FOUND)


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
 
        from apps.orders.models import Dispute
 
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
 
        evidence_request_id = request.data.get('request_id')
        evidence_request = DisputeEvidenceRequest.objects.filter(
            id=evidence_request_id,
            dispute=dispute,
            requested_from=request.user,
            recipient_role=DisputeEvidenceRequest.RecipientRole.VENDOR,
            status=DisputeEvidenceRequest.Status.PENDING,
        ).first()
        if not evidence_request:
            return Response(
                {'detail': "L'admin doit d'abord vous adresser une demande de preuve active."},
                status=status.HTTP_403_FORBIDDEN,
            )

        file = request.FILES.get('file')
        if not file:
            return Response(
                {'detail': 'Aucun fichier fourni. Champ attendu : "file".'},
                status=status.HTTP_400_BAD_REQUEST,
            )
 
        description = request.data.get('description', '')[:255]
        evidence = create_evidence(
            dispute=dispute,
            user=request.user,
            upload=file,
            uploader_role=DisputeEvidenceRequest.RecipientRole.VENDOR,
            description=description,
            evidence_request=evidence_request,
        )
        evidence_request.status = DisputeEvidenceRequest.Status.SUBMITTED
        evidence_request.responded_at = timezone.now()
        evidence_request.save(update_fields=['status', 'responded_at', 'updated_at'])
 
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

    if not vendor.has_required_location:
        return Response(
            {
                'detail': (
                    "Ajoutez une boutique principale active avec une adresse "
                    "et une position GPS ou une description d'accès avant "
                    "d'approuver ce vendeur."
                ),
                'code': 'VENDOR_LOCATION_REQUIRED',
            },
            status=status.HTTP_400_BAD_REQUEST,
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
    Distribution géographique des vendeurs par ville + emplacements physiques.
    La carte admin doit afficher les vrais points de boutique quand ils existent,
    puis signaler les vendeurs qui restent à géolocaliser.
    """
    from django.db.models import Prefetch
 
    approved = (
        VendorProfile.objects
        .filter(status='APPROVED')
        .select_related('user')
        .prefetch_related(
            Prefetch(
                'locations',
                queryset=VendorLocation.objects.filter(is_active=True).order_by('name'),
            )
        )
    )
    all_vp = (
        VendorProfile.objects
        .select_related('user')
        .prefetch_related(
            Prefetch(
                'locations',
                queryset=VendorLocation.objects.filter(is_active=True).order_by('name'),
            )
        )
    )
 
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

    # Emplacements physiques : un marqueur par point de boutique.
    # Si un vendeur n'a pas encore créé d'emplacement, on renvoie sa fiche
    # principale en "fallback" pour que l'admin voie ce qui reste à compléter.
    locations_list = []
    for vp in all_vp:
        active_locations = list(vp.locations.all())
        if active_locations:
            for loc in active_locations:
                locations_list.append({
                    'id': loc.id,
                    'vendor_id': vp.id,
                    'business_name': vp.business_name,
                    'location_name': loc.name,
                    'address': loc.address,
                    'city': vp.city or '',
                    'phone': loc.phone or vp.phone,
                    'representative_name': loc.representative_name,
                    'representative_phone': loc.representative_phone,
                    'status': vp.status,
                    'certification_tier': vp.certification_tier or 'BRONZE',
                    'latitude': float(loc.latitude) if loc.latitude is not None else None,
                    'longitude': float(loc.longitude) if loc.longitude is not None else None,
                    'is_geocoded': loc.latitude is not None and loc.longitude is not None,
                    'is_profile_fallback': False,
                })
        else:
            locations_list.append({
                'id': f'profile-{vp.id}',
                'vendor_id': vp.id,
                'business_name': vp.business_name,
                'location_name': 'Boutique principale',
                'address': vp.address,
                'city': vp.city or '',
                'phone': vp.phone,
                'representative_name': vp.user.get_full_name() or vp.user.username,
                'representative_phone': vp.phone,
                'status': vp.status,
                'certification_tier': vp.certification_tier or 'BRONZE',
                'latitude': None,
                'longitude': None,
                'is_geocoded': False,
                'is_profile_fallback': True,
            })
 
    top_city = cities_list[0]['city'] if cities_list else 'N/A'
 
    return Response({
        'cities':        cities_list,
        'vendors':       vendors_list,
        'locations':     locations_list,
        'total_approved':approved.count(),
        'total_cities':  len([c for c in cities_list if c['approved'] > 0]),
        'total_locations': len(locations_list),
        'geocoded_locations': len([loc for loc in locations_list if loc['is_geocoded']]),
        'pending_geo_locations': len([loc for loc in locations_list if not loc['is_geocoded']]),
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
        # `Product.vendor` est nullable (null=True) : un produit cree sans
        # vendeur — import, saisie admin — remonte ici avec vendor a None et
        # faisait tomber tout le rapport sur un AttributeError. Un article
        # sans vendeur n'a de toute facon aucune commission a attribuer.
        if vendor is None:
            continue
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
    # ── Bascule vers le module financier ─────────────────────────────────
    # Approuver ici passe le statut a APPROVED SANS AUCUNE ECRITURE
    # COMPTABLE. L'argent part manuellement par MoMo et le registre
    # l'ignore : la reconciliation N3 le verrait comme une transaction
    # fantome — de l'argent sorti sans contrepartie.
    #
    # Les versements passent desormais par PayoutRequest : double
    # approbation, appel prestataire reel, ecriture au registre.
    return Response(
        {
            'detail': (
                "L'approbation des retraits est desactivee. Les versements "
                "passent par le module financier : Demandes de versement "
                "dans l'administration."
            ),
            'code': 'WITHDRAWAL_DISABLED',
        },
        status=status.HTTP_409_CONFLICT,
    )
    # ── Fin de la bascule ────────────────────────────────────────────────

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
            # `Product.vendor` est nullable : sans ce garde-fou, un avis sur
            # un produit sans vendeur fait tomber toute la liste.
            'vendor_name':          r.product.vendor.username if r.product.vendor else '',
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
    
    orders = Order.objects.select_related('user').prefetch_related(
        'shipments',
        'shipments__courier',
        'shipments__courier__user',
        'items',
        'items__product__vendor',
    )

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
            'shipments',
            'shipments__courier',
            'shipments__courier__user',
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
    # Imports hors du `try` : la clause `except Dispute.DoesNotExist` ci-dessous
    # s'en sert. Importes dedans, un echec d'import laisserait `Dispute` non
    # defini et Python leverait `NameError` en evaluant le `except` — masquant
    # l'erreur reelle derriere un 500 incomprehensible.
    from apps.orders.models import Dispute
    from apps.vendors.serializers import AdminDisputeDetailSerializer

    try:
        dispute = Dispute.objects.select_related(
            'order',
            'order__user',
            'opened_by',
            'resolved_by'
        ).prefetch_related(
            'messages',
            'messages__sender',
            'evidences',
            'evidences__uploaded_by',
            'evidence_requests__requested_from',
            'evidence_requests__evidences',
        ).get(id=dispute_id)
        
        serializer = AdminDisputeDetailSerializer(dispute, context={'request': request})
        return Response(serializer.data)
    except Dispute.DoesNotExist:
        return Response(
            {'detail': 'Litige introuvable.'},
            status=status.HTTP_404_NOT_FOUND
        )


@extend_schema(tags=["Admin"], summary="Demander une preuve à une partie du litige")
@api_view(['POST'])
@permission_classes([IsAdminUser])
def admin_request_dispute_evidence(request, dispute_id):
    from apps.orders.models import Dispute
    from apps.vendors.serializers import AdminDisputeDetailSerializer

    dispute = get_object_or_404(
        Dispute.objects.select_related('opened_by', 'vendor').prefetch_related(
            'order__shipments__courier__delivery_organization',
        ),
        id=dispute_id,
    )
    role = str(request.data.get('recipient_role', '')).upper()
    valid_roles = {choice for choice, _ in DisputeEvidenceRequest.RecipientRole.choices}
    if role not in valid_roles:
        return Response({'recipient_role': 'Rôle destinataire invalide.'}, status=status.HTTP_400_BAD_REQUEST)
    recipient = resolve_dispute_actor(dispute, role)
    if not recipient:
        return Response(
            {'recipient_role': "Aucun compte correspondant n'est rattaché à ce colis."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    instructions = str(request.data.get('instructions', '')).strip()
    if not instructions:
        return Response({'instructions': 'Précisez la preuve attendue.'}, status=status.HTTP_400_BAD_REQUEST)
    due_at = request.data.get('due_at') or None
    if due_at:
        from django.utils.dateparse import parse_datetime
        due_at = parse_datetime(due_at)
        if not due_at:
            return Response({'due_at': 'Date limite invalide.'}, status=status.HTTP_400_BAD_REQUEST)

    evidence_request = DisputeEvidenceRequest.objects.create(
        dispute=dispute,
        requested_by=request.user,
        requested_from=recipient,
        recipient_role=role,
        evidence_types=request.data.get('evidence_types') or ['PHOTO'],
        instructions=instructions,
        due_at=due_at,
    )
    DisputeMessage.objects.create(
        dispute=dispute,
        sender=request.user,
        sender_role=DisputeMessage.SenderRole.ADMIN,
        message=f"Preuve demandée à {evidence_request.get_recipient_role_display()} : {instructions}",
        is_internal=True,
    )
    UserNotification.objects.create(
        user=recipient,
        title=f"Preuve demandée pour le litige #{dispute.id}",
        message=instructions,
        notification_type=UserNotification.NotificationType.SUPPORT,
        action_url='/orders' if role == 'CLIENT' else '/',
    )
    dispute.status = 'IN_PROGRESS'
    dispute.save(update_fields=['status', 'updated_at'])
    return Response(AdminDisputeDetailSerializer(dispute, context={'request': request}).data, status=status.HTTP_201_CREATED)


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
    # Imports hors du `try` : voir `admin_dispute_detail`.
    from apps.orders.models import Dispute, DisputeMessage
    from apps.vendors.serializers import AdminDisputeDetailSerializer, AdminDisputeUpdateSerializer

    try:
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
    # Imports hors du `try` : voir `admin_dispute_detail`.
    from apps.orders.models import Dispute, DisputeMessage
    from apps.vendors.serializers import AdminDisputeDetailSerializer, DisputeMessageCreateSerializer

    try:
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
    # Imports hors du `try` : voir `admin_dispute_detail`.
    from apps.orders.models import Dispute, DisputeMessage
    from apps.vendors.serializers import AdminDisputeDetailSerializer

    try:
        dispute = Dispute.objects.get(id=dispute_id)
    except Dispute.DoesNotExist:
        return Response(
            {'detail': 'Litige introuvable.'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    resolution = request.data.get('resolution')
    resolution_note = (request.data.get('resolution_note') or '').strip()
    refund_amount = request.data.get('refund_amount_xaf')

    if not resolution:
        return Response(
            {'detail': 'La résolution est requise.'},
            status=status.HTTP_400_BAD_REQUEST
    )

    # Arbitrage motivé : un motif trop court n'est pas un arbitrage, c'est un
    # clic. 40 caractères est le minimum pour forcer une vraie justification.
    MIN_RESOLUTION_NOTE_LENGTH = 40
    if len(resolution_note) < MIN_RESOLUTION_NOTE_LENGTH:
        return Response(
            {'resolution_note': f'La justification doit faire au moins {MIN_RESOLUTION_NOTE_LENGTH} caractères.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        refund_amount = int(refund_amount) if refund_amount not in (None, '') else None
    except (TypeError, ValueError):
        return Response(
            {'refund_amount_xaf': 'Le montant de remboursement doit être un nombre entier.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if resolution == 'PARTIAL_REFUND':
        if not refund_amount or refund_amount <= 0:
            return Response(
                {'refund_amount_xaf': 'Un remboursement partiel demande un montant positif.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if refund_amount >= dispute.order.total_xaf:
            return Response(
                {'refund_amount_xaf': 'Pour rembourser toute la commande, choisissez REFUND.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

    with transaction.atomic():
        dispute.status = 'RESOLVED'
        dispute.resolution = resolution
        dispute.resolution_note = resolution_note
        dispute.refund_amount_xaf = refund_amount
        dispute.resolved_by = request.user
        dispute.resolved_at = timezone.now()
        dispute.save()

        if resolution == 'REFUND':
            dispute.order.refund(partial=False)
        elif resolution == 'PARTIAL_REFUND':
            dispute.order.refund(partial=True)
        elif resolution == 'REJECTED':
            dispute.order.release_to_vendor()

        # Message de résolution
        DisputeMessage.objects.create(
            dispute=dispute,
            sender=request.user,
            message=f"Litige résolu : {dispute.get_resolution_display()}. {resolution_note}",
            is_internal=False
        )

        # Trust Score V5.5 — hard filter : une contrefaçon confirmée gèle le
        # vendeur (veto), quel que soit le reste de son historique.
        from apps.accounts.trust_score import apply_veto_for_catastrophic_dispute
        apply_veto_for_catastrophic_dispute(dispute)

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


@extend_schema(tags=["Admin"], summary="Lister tous les retours (admin)")
@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_list_returns(request):
    returns = Return.objects.select_related(
        'order', 'order_item', 'vendor', 'requested_by', 'dropoff_relay_point',
    ).order_by('-created_at')
    status_filter = request.query_params.get('status')
    if status_filter:
        returns = returns.filter(status=status_filter)
    return Response(ReturnSerializer(returns, many=True, context={'request': request}).data)


@extend_schema(
    tags=["Admin"],
    summary="Constater la reception physique d'un retour (admin)",
    description=(
        "Fallback admin pour le ramassage livreur (colis encombrants) — le depot "
        "en point relais passe normalement par l'action equivalente cote point "
        "relais (apps.shipping)."
    ),
)
@api_view(['POST'])
@permission_classes([IsAdminUser])
def admin_return_mark_received(request, return_id):
    try:
        return_obj = Return.objects.get(id=return_id)
    except Return.DoesNotExist:
        return Response({'detail': 'Retour introuvable.'}, status=status.HTTP_404_NOT_FOUND)

    if return_obj.status not in (Return.Status.APPROVED, Return.Status.AWAITING_DROPOFF):
        return Response(
            {'detail': 'Ce retour doit etre approuve avant de constater sa reception.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    return_obj.status = Return.Status.RECEIVED
    return_obj.received_at = timezone.now()
    return_obj.received_by = request.user
    return_obj.save(update_fields=['status', 'received_at', 'received_by', 'updated_at'])
    return Response(ReturnSerializer(return_obj, context={'request': request}).data)


@extend_schema(
    tags=["Admin"],
    summary="Finaliser un retour apres inspection (admin) — declenche le remboursement",
    description=(
        "Regle verrouillee : le remboursement ne se declenche JAMAIS avant "
        "reception physique + inspection du colis retourne. inspection_passed=True "
        "cree une demande de remboursement (en attente d'approbation tierce, "
        "meme circuit que pour un litige) ; False degele le sequestre sans "
        "remboursement."
    ),
)
@api_view(['POST'])
@permission_classes([IsAdminUser])
def admin_finalize_return(request, return_id):
    try:
        return_obj = Return.objects.get(id=return_id)
    except Return.DoesNotExist:
        return Response({'detail': 'Retour introuvable.'}, status=status.HTTP_404_NOT_FOUND)

    if return_obj.status != Return.Status.RECEIVED:
        return Response(
            {'detail': 'La reception physique du colis doit etre constatee avant de finaliser.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    inspection_passed = request.data.get('inspection_passed')
    if inspection_passed is None:
        return Response({'inspection_passed': 'Ce champ est requis.'}, status=status.HTTP_400_BAD_REQUEST)
    inspection_passed = bool(inspection_passed) if not isinstance(inspection_passed, str) else inspection_passed.lower() in ('true', '1', 'yes')

    refund_amount = request.data.get('refund_amount_xaf')
    try:
        refund_amount = int(refund_amount) if refund_amount not in (None, '') else None
    except (TypeError, ValueError):
        return Response({'refund_amount_xaf': 'Doit etre un nombre entier.'}, status=status.HTTP_400_BAD_REQUEST)

    with transaction.atomic():
        return_obj.inspection_passed = inspection_passed
        return_obj.inspection_note = request.data.get('note', '')
        return_obj.refund_amount_xaf = refund_amount
        return_obj.status = Return.Status.REFUNDED if inspection_passed else Return.Status.CLOSED_NO_REFUND
        return_obj.save(update_fields=[
            'inspection_passed', 'inspection_note', 'refund_amount_xaf', 'status', 'updated_at',
        ])

        try:
            from apps.payments.bridge import events_in
            events_in.return_completed(
                order_id=return_obj.order_id,
                outcome='PARTIAL' if (inspection_passed and refund_amount) else ('REFUND' if inspection_passed else 'REJECTED'),
                refund_amount_xaf=refund_amount or 0,
                event_id=f"return-{return_obj.id}-completed",
                emitter="apps.vendors.admin_finalize_return",
            )
        except Exception:
            import logging
            logging.getLogger("apps.vendors").exception(
                "Evenement de retour (finalisation) non transmis pour la commande #%s.",
                return_obj.order_id,
            )

    UserNotification.objects.create(
        user=return_obj.requested_by,
        title=f"Retour {'rembourse' if inspection_passed else 'cloture sans remboursement'} · commande #{return_obj.order_id}",
        message=return_obj.inspection_note or (
            "Votre remboursement est en cours de traitement." if inspection_passed
            else "L'inspection du colis retourne n'a pas confirme le motif du retour."
        ),
        notification_type=UserNotification.NotificationType.PAYMENT,
        action_url=f"/orders/{return_obj.order_id}",
    )

    return Response(ReturnSerializer(return_obj, context={'request': request}).data)


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
    previous_retention_days = settings.evidence_retention_days
    serializer = PlatformSettingsSerializer(settings, data=request.data, partial=True)

    if serializer.is_valid():
        serializer.save(updated_by=request.user)

        new_retention_days = serializer.instance.evidence_retention_days
        if 'evidence_retention_days' in request.data and new_retention_days != previous_retention_days:
            _reschedule_pending_shipment_evidence(new_retention_days)

        return Response(serializer.data)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


def _reschedule_pending_shipment_evidence(retention_days):
    """
    Recalcule retain_until = created_at + retention_days pour les preuves déjà
    créées mais pas encore purgées ni gelées par un litige. Une preuve en
    litigation_hold n'est jamais concernée : elle reste gelée tant que le
    litige n'est pas clos, quel que soit ce réglage.
    """
    from django.db.models import DateTimeField, ExpressionWrapper, F
    from apps.shipping.models import ShipmentEvidence

    ShipmentEvidence.objects.filter(
        purged_at__isnull=True,
        litigation_hold=False,
    ).update(
        retain_until=ExpressionWrapper(
            F('created_at') + timedelta(days=retention_days),
            output_field=DateTimeField(),
        )
    )



# MA BOUTIQUE

 
 
 
 
 
 
 
 
 


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

        from apps.common.images import ImageOptimizationError, optimize_uploaded_image
        try:
            optimized_photo = optimize_uploaded_image(
                photo, max_input_bytes=5 * 1024 * 1024, max_dimension=768,
                quality=80, filename_prefix='shop',
            )
        except ImageOptimizationError as error:
            return Response({'detail': str(error)}, status=400)
 
        if profile.profile_photo:
            try: profile.profile_photo.delete(save=False)
            except Exception: pass
 
        profile.profile_photo = optimized_photo
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

        from apps.common.images import ImageOptimizationError, optimize_uploaded_image
        try:
            optimized_banner = optimize_uploaded_image(
                banner, max_input_bytes=8 * 1024 * 1024, max_dimension=1920,
                quality=80, filename_prefix='banner',
            )
        except ImageOptimizationError as error:
            return Response({'detail': str(error)}, status=400)
 
        if profile.banner_image:
            try: profile.banner_image.delete(save=False)
            except Exception: pass
 
        profile.banner_image = optimized_banner
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
            send_plain_email.delay(
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
            send_plain_email.delay(
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
            send_plain_email.delay(
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
 
@extend_schema(
    tags=["Public"],
    summary="Get public shop page",
    description="Page publique d'une boutique vendeur. Accessible sans authentification.",
)
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

    # Tache D19 — seconde porte vers la publication. Verrouiller seulement le
    # bouton du vendeur ne suffirait pas : approuver ici rendrait l'offre
    # visible tout autant. Le moderateur est prevenu de ce qui manque plutot
    # que de se voir opposer un refus muet.
    from apps.vendors.kyc import etat_verification, identite_verifiee
    if product.vendor and not identite_verifiee(product.vendor):
        etat = etat_verification(product.vendor)
        return Response(
            {
                'detail': "Identite du vendeur non verifiee : publication impossible.",
                'piece_identite': etat,
            },
            status=status.HTTP_409_CONFLICT,
        )

    # Une offre est publiée avec sa fiche maître : univers, poids et dimensions (R16.1, R63.1),
    # et jamais sous le prix minimum publiable (R19.1).
    from apps.catalog.regles_catalogue import manques_fiche, prix_minimum
    manques = manques_fiche(product.master) if product.master else ['fiche maître (R16.1, R63.1)']
    if manques:
        return Response({'detail': 'Fiche incomplète, publication impossible : ' + ' ; '.join(manques) + '.',
                         'manques': manques}, status=status.HTTP_409_CONFLICT)
    if product.price_xaf < prix_minimum():
        return Response({'detail': f'Prix inférieur au prix minimum publiable ({prix_minimum()} F).',
                         'raison': 'prix_minimum'}, status=status.HTTP_409_CONFLICT)

    product.moderation_status = ModerationStatus.APPROVED
    product.moderation_reason = ''            # efface un éventuel motif de rejet précédent
    product.moderated_at = timezone.now()
    product.moderated_by = request.user
    product.save(update_fields=['moderation_status', 'moderation_reason', 'moderated_at', 'moderated_by'])

    master = product.master
    if master and master.moderation_status != ModerationStatus.APPROVED:
        master.moderation_status = ModerationStatus.APPROVED
        master.moderated_at = timezone.now()
        master.moderated_by = request.user
        master.save(update_fields=['moderation_status', 'moderated_at', 'moderated_by'])

    return Response(ProductSerializer(product, context={'request': request}).data)


@extend_schema(tags=["Admin"], summary="Reject product (moderation, optional reason)")
@api_view(['POST'])
@permission_classes([IsAdminUser])
def admin_reject_product(request, product_id):
    from apps.catalog.models import Product, ModerationStatus
    from apps.catalog.serializers import ProductSerializer
    from apps.accounts.models import UserNotification
    from django.utils import timezone
    try:
        product = Product.objects.get(id=product_id)
    except Product.DoesNotExist:
        return Response({'detail': 'Produit introuvable.'}, status=status.HTTP_404_NOT_FOUND)

    reason = (request.data.get('reason') or '').strip()

    product.moderation_status = ModerationStatus.REJECTED
    product.moderation_reason = reason
    product.moderated_at = timezone.now()
    product.moderated_by = request.user
    product.save(update_fields=['moderation_status', 'moderation_reason', 'moderated_at', 'moderated_by'])

    # On prévient toujours le vendeur du rejet ; le motif est optionnel.
    if product.vendor_id:
        message = f"Votre produit « {product.title} » a été rejeté."
        if reason:
            message += f"\nMotif : {reason}"
        UserNotification.objects.create(
            user=product.vendor,
            title="Produit rejeté",
            message=message,
            notification_type='SYSTEM',
            action_url='/seller/products',
        )

    return Response(ProductSerializer(product, context={'request': request}).data)


# CONDITIONS PRODUITS — CRUD ADMIN
@extend_schema(tags=["Admin"], summary="List product conditions")
@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_list_conditions(request):
    from apps.catalog.models import ProductCondition
    from apps.catalog.serializers import ProductConditionSerializer
    qs = ProductCondition.objects.all()
    return Response(ProductConditionSerializer(qs, many=True).data)


@extend_schema(tags=["Admin"], summary="Create product condition")
@api_view(['POST'])
@permission_classes([IsAdminUser])
def admin_create_condition(request):
    from apps.catalog.models import ProductCondition
    from apps.catalog.serializers import ProductConditionSerializer
    name = (request.data.get('name') or '').strip()
    if not name:
        return Response({'detail': 'Le nom est requis.'}, status=status.HTTP_400_BAD_REQUEST)
    if ProductCondition.objects.filter(name__iexact=name).exists():
        return Response({'detail': 'Cet état existe déjà.'}, status=status.HTTP_400_BAD_REQUEST)
    cond = ProductCondition.objects.create(name=name, display_order=request.data.get('display_order', 0))
    return Response(ProductConditionSerializer(cond).data, status=status.HTTP_201_CREATED)


@extend_schema(tags=["Admin"], summary="Update product condition")
@api_view(['PATCH'])
@permission_classes([IsAdminUser])
def admin_update_condition(request, cond_id):
    from apps.catalog.models import ProductCondition
    from apps.catalog.serializers import ProductConditionSerializer
    try:
        cond = ProductCondition.objects.get(id=cond_id)
    except ProductCondition.DoesNotExist:
        return Response({'detail': 'État introuvable.'}, status=status.HTTP_404_NOT_FOUND)
    for f in ['name', 'display_order', 'is_active']:
        if f in request.data:
            setattr(cond, f, request.data[f])
    cond.save()
    return Response(ProductConditionSerializer(cond).data)


@extend_schema(tags=["Admin"], summary="Delete product condition")
@api_view(['DELETE'])
@permission_classes([IsAdminUser])
def admin_delete_condition(request, cond_id):
    from apps.catalog.models import ProductCondition
    try:
        cond = ProductCondition.objects.get(id=cond_id)
    except ProductCondition.DoesNotExist:
        return Response({'detail': 'État introuvable.'}, status=status.HTTP_404_NOT_FOUND)
    cond.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)



@extend_schema(tags=["Admin"], summary="List master products")
@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_list_masters(request):
    from apps.catalog.models import MasterProduct
    from apps.vendors.serializers import AdminMasterListSerializer
    from django.db.models import Q
    qs = MasterProduct.objects.select_related('category').prefetch_related('images', 'offers')
    st = request.query_params.get('moderation_status')
    if st:
        qs = qs.filter(moderation_status=st)
    search = (request.query_params.get('search') or '').strip()
    if search:
        qs = qs.filter(Q(title__icontains=search) | Q(brand__icontains=search))
    qs = qs.order_by('-created_at')
    return Response(AdminMasterListSerializer(qs, many=True, context={'request': request}).data)


@extend_schema(tags=["Admin"], summary="Master product detail")
@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_master_detail(request, master_id):
    from apps.catalog.models import MasterProduct
    from apps.vendors.serializers import AdminMasterDetailSerializer
    try:
        master = MasterProduct.objects.select_related('category').prefetch_related(
            'images', 'offers', 'offers__inventory', 'offers__condition', 'offers__vendor'
        ).get(id=master_id)
    except MasterProduct.DoesNotExist:
        return Response({'detail': 'Fiche introuvable.'}, status=status.HTTP_404_NOT_FOUND)
    return Response(AdminMasterDetailSerializer(master, context={'request': request}).data)


@extend_schema(tags=["Admin"], summary="Update master product (enrichi)")
@api_view(["PATCH"])
@permission_classes([IsAdminUser])
def admin_update_master(request, master_id):
    """
    Met à jour une fiche maître.
 
    Champs acceptés :
    - title (str)
    - description (str)
    - brand (str, legacy — texte libre)
    - category (int, ID)
    - brand_fk (int|null, ID d'une Brand)
    - variant_axes (list[str], slugs d'attributs AXE)
    """
    from apps.catalog.models import (
        MasterProduct, Category, Brand, ProductAttribute,
    )
    from apps.vendors.serializers import AdminMasterDetailSerializer
 
    try:
        master = MasterProduct.objects.get(id=master_id)
    except MasterProduct.DoesNotExist:
        return Response(
            {"detail": "Fiche introuvable."},
            status=status.HTTP_404_NOT_FOUND,
        )
 
    # ── Champs texte simples ────────────────────────────────────────
    for f in ["title", "description", "brand"]:
        if f in request.data:
            setattr(master, f, request.data[f])
 
    # ── Category (FK) ──────────────────────────────────────────────
    if "category" in request.data:
        try:
            master.category = Category.objects.get(id=request.data["category"])
        except Category.DoesNotExist:
            return Response(
                {"detail": "Catégorie invalide."},
                status=status.HTTP_400_BAD_REQUEST,
            )
 
    # ── brand_fk (FK Brand, nullable) ──────────────────────────────
    if "brand_fk" in request.data:
        val = request.data["brand_fk"]
        if val in (None, "", "null"):
            master.brand_fk = None
        else:
            try:
                master.brand_fk = Brand.objects.get(id=int(val))
            except (Brand.DoesNotExist, ValueError, TypeError):
                return Response(
                    {"detail": "Marque (brand_fk) invalide."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
 
    # ── variant_axes (JSON list de slugs) ──────────────────────────
    if "variant_axes" in request.data:
        raw = request.data["variant_axes"]
        # Accepte list ou string JSON-encoded
        if isinstance(raw, str):
            import json
            try:
                raw = json.loads(raw)
            except json.JSONDecodeError:
                return Response(
                    {"detail": "variant_axes doit être une liste JSON valide."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
 
        if not isinstance(raw, list):
            return Response(
                {"detail": "variant_axes doit être une liste."},
                status=status.HTTP_400_BAD_REQUEST,
            )
 
        # Valider que chaque slug existe et a role=AXE
        # (autorise slug d'attributs universels ou spécifiques à la catégorie)
        if raw:
            existing = set(
                ProductAttribute.objects.filter(
                    slug__in=raw, role="AXE",
                ).values_list("slug", flat=True)
            )
            invalid = [s for s in raw if s not in existing]
            if invalid:
                return Response(
                    {"detail": (
                        f"Axes invalides : {', '.join(invalid)}. "
                        "Chaque axe doit correspondre à un attribut existant "
                        "avec role=AXE."
                    )},
                    status=status.HTTP_400_BAD_REQUEST,
                )
 
        # ATTENTION : si des variants existent déjà avec des axis_values
        # basés sur les axes actuels, changer variant_axes casse les liens.
        # On refuse le changement si des variants existent et que la liste
        # d'axes change (protection métier).
        old_axes = list(master.variant_axes or [])
        new_axes = list(raw)
        if set(old_axes) != set(new_axes):
            variants_count = master.variants.count()
            if variants_count > 0:
                return Response(
                    {"detail": (
                        f"Impossible de changer variant_axes : {variants_count} "
                        f"variant(s) existent déjà. Supprime-les d'abord ou "
                        f"garde la même liste d'axes."
                    )},
                    status=status.HTTP_400_BAD_REQUEST,
                )
 
        master.variant_axes = new_axes

    # ── Spécification v2.1 : univers, poids, dimensions, carton, Made in Cameroon (R16.1, R63.1, R87.1, R17.1)
    champs_v21 = ["univers", "poids_kg", "dim_l1_cm", "dim_l2_cm", "dim_l3_cm", "carton", "made_in_cameroon"]
    for f in champs_v21:
        if f in request.data:
            val = request.data[f]
            if f in ("carton", "made_in_cameroon"):
                val = val in (True, "true", "1", 1)
            elif f == "univers":
                val = (val or "").strip().upper()
            elif val in ("", None):
                val = None
            setattr(master, f, val)
    if any(f in request.data for f in champs_v21):
        from django.core.exceptions import ValidationError as DjangoValidationError
        try:
            master.clean_fields(exclude=[f.name for f in master._meta.fields if f.name not in champs_v21])
            master.clean()
        except DjangoValidationError as exc:
            return Response({"detail": " ".join(exc.messages), "erreurs": exc.message_dict if hasattr(exc, "error_dict") else exc.messages},
                            status=status.HTTP_400_BAD_REQUEST)

    master.save()
 
    return Response(
        AdminMasterDetailSerializer(master, context={"request": request}).data
    )


@extend_schema(tags=["Admin"], summary="Approve master product")
@api_view(['POST'])
@permission_classes([IsAdminUser])
def admin_approve_master(request, master_id):
    from apps.catalog.models import MasterProduct, ModerationStatus
    from django.utils import timezone
    from apps.catalog.regles_catalogue import manques_fiche
    try:
        master = MasterProduct.objects.get(id=master_id)
    except MasterProduct.DoesNotExist:
        return Response({'detail': 'Fiche introuvable.'}, status=status.HTTP_404_NOT_FOUND)
    # R16.1, R63.1 : une fiche sans univers, poids ou dimensions ne peut pas être publiée.
    manques = manques_fiche(master)
    if manques:
        return Response({'detail': 'Fiche incomplète, publication impossible : ' + ' ; '.join(manques) + '.',
                         'manques': manques}, status=status.HTTP_409_CONFLICT)
    master.moderation_status = ModerationStatus.APPROVED
    master.moderated_at = timezone.now()
    master.moderated_by = request.user
    master.save()
    return Response({'id': master.id, 'moderation_status': master.moderation_status})


@extend_schema(tags=["Admin"], summary="Reject master product")
@api_view(['POST'])
@permission_classes([IsAdminUser])
def admin_reject_master(request, master_id):
    from apps.catalog.models import MasterProduct, ModerationStatus
    from django.utils import timezone
    try:
        master = MasterProduct.objects.get(id=master_id)
    except MasterProduct.DoesNotExist:
        return Response({'detail': 'Fiche introuvable.'}, status=status.HTTP_404_NOT_FOUND)
    master.moderation_status = ModerationStatus.REJECTED
    master.moderated_at = timezone.now()
    master.moderated_by = request.user
    master.save()
    return Response({'id': master.id, 'moderation_status': master.moderation_status})


@extend_schema(tags=["Admin"], summary="Delete master product")
@api_view(['DELETE'])
@permission_classes([IsAdminUser])
def admin_delete_master(request, master_id):
    from apps.catalog.models import MasterProduct
    try:
        master = MasterProduct.objects.get(id=master_id)
    except MasterProduct.DoesNotExist:
        return Response({'detail': 'Fiche introuvable.'}, status=status.HTTP_404_NOT_FOUND)
    master.delete()  # soft delete (SoftDeleteModel)
    return Response(status=status.HTTP_204_NO_CONTENT)


# ══════════════════════════════════════════════════════════════════════════════
# ESPACE VENDEUR AUTONOME (espace-client-belivay/espace-vendeur) — vague
# d'intégration du 12 oct. Domaine de cet agent : boutique (pause, fermetures
# programmées, avis + réponse privée), messages (conversations), notifications
# (alias de UserNotification), aide, événements temps réel (§8).
#
# AVERTISSEMENT PRODUIT (à valider par le porteur) : la réponse privée à un
# avis (POST /reviews/{id}/private-reply) et la messagerie de commande
# (MessageThread/ThreadMessage) créent un canal de communication DIRECT
# vendeur → client. Jusqu'ici, deux règles documentées allaient dans le sens
# inverse : (1) `Product.faq` (apps.catalog.models) compense explicitement
# l'ABSENCE de messagerie directe acheteur-vendeur (Addendum Décisions v1.0) ;
# (2) les litiges passent par un admin médiateur, jamais vendeur→client direct
# (DisputeMessage.SenderRole). Construit quand même ici car demandé
# explicitement par la vague d'intégration (INTEGRATION-API.md §domaine
# "messages", §VD-11 §4) — anonymisation des deux côtés conservée (même
# convention que les commandes/avis : jamais le nom réel du client).
# ══════════════════════════════════════════════════════════════════════════════

MAX_PAUSE_DAYS = 30
REVIEW_REPLY_WINDOW_DAYS = 30
REVIEW_REPLY_MIN_LEN = 3

_EMAIL_RE = re.compile(r'[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}')
_LIEN_RE = re.compile(
    r'(?:https?://|www\.)\S+|\b[a-z0-9-]+\.(?:com|net|org|cm|fr|io|me|co|ly|app)(?:/\S*)?\b',
    re.IGNORECASE,
)
_NUMERO_RE = re.compile(r'(?:(?:\+|00)\d{1,3}[\s.\-]?)?(?:\d[\s.\-]?){7,}\d')


def _epoch_ms(dt):
    """Instant (communs.ts) = epoch millisecondes, pas une chaîne ISO."""
    if dt is None:
        return None
    return int(dt.timestamp() * 1000)


def _filtrer_coordonnees(texte):
    """Même règle que le filtre client (messages.ts filtrerCoordonnees) : e-mails, liens, numéros ≥ 8 chiffres."""
    propre = _EMAIL_RE.sub('•••', texte)
    propre = _LIEN_RE.sub('•••', propre)
    propre = _NUMERO_RE.sub('•••', propre)
    return propre, propre != texte


def _detecte_coordonnees(texte):
    return _filtrer_coordonnees(texte)[1]


def _vendor_emit_event(vendor_profile, event_type, payload=None):
    """Journal d'événements minimal pour GET /events et /events/stream (§8) — pas de pub/sub réel."""
    try:
        VendorEvent.objects.create(vendor=vendor_profile, event_type=event_type, payload=payload or {})
    except Exception:
        pass


def _get_active_vendor_or_404(user) -> tuple[VendorProfile, Response | None]:
    """
    Retourne (profile, None) ou (None, Response) — motif copié du reste du
    fichier (try/except VendorProfile.DoesNotExist).

    Sur le type de retour : le premier élément est annoncé non optionnel alors
    que la branche d'erreur renvoie None. C'est volontaire. Le contrat, que
    tous les appelants respectent, est « si l'erreur est vide, le profil est
    là », et il se lit toujours ainsi :

        profile, err = _get_active_vendor_or_404(request.user)
        if err:
            return err

    Un vérificateur de types ne sait pas relier deux variables issues d'un même
    tuple : il croyait donc `profile` optionnel dans tout le corps des 68 vues
    qui appellent ces trois assistants, et signalait une centaine de fausses
    erreurs. Les annoter ici corrige la cause en un seul endroit, sans toucher
    aux appelants. L'annotation ne change rien à l'exécution.
    """
    try:
        profile = VendorProfile.objects.get(user=user)
    except VendorProfile.DoesNotExist:
        return None, Response({'detail': 'Profil vendeur introuvable.'}, status=status.HTTP_404_NOT_FOUND)  # type: ignore[return-value]
    if not profile.is_active_vendor:
        return None, Response(  # type: ignore[return-value]
            {'detail': "Votre compte vendeur n'est pas encore approuvé."},
            status=status.HTTP_403_FORBIDDEN,
        )
    return profile, None


#  BOUTIQUE — PAUSE (30 jours au plus, Q-39)

@extend_schema(tags=["Vendors"], summary="Mettre la boutique en pause (jusqu'à 30 jours)")
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def vendor_shop_pause(request):
    profile, err = _get_active_vendor_or_404(request.user)
    if err:
        return err

    try:
        jours = int(request.data.get('jours'))
    except (TypeError, ValueError):
        return Response({'ok': False, 'raison': 'duree'})
    if jours < 1 or jours > MAX_PAUSE_DAYS:
        return Response({'ok': False, 'raison': 'duree'})

    now = timezone.now()
    profile.paused_since = now
    profile.paused_until = now + timedelta(days=jours)
    profile.save(update_fields=['paused_since', 'paused_until'])
    _vendor_emit_event(profile, 'shop.paused', {'jours': jours})
    return Response({
        'ok': True,
        # NOTE : objet "boutique" partiel — GET/PUT /shop (Boutique complet : horaires, lieux,
        # vitrine…) n'est pas construit par cet agent (hors scope, cf. rapport). Les écrans qui
        # lisent mettreEnPause().boutique devront être réconciliés avec le vrai GET /shop une
        # fois construit par l'agent qui le possède.
        'boutique': {'pause': {'depuis': _epoch_ms(profile.paused_since), 'jusqua': _epoch_ms(profile.paused_until)}},
    })


@extend_schema(tags=["Vendors"], summary="Lever la pause de la boutique (reprise anticipée)")
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def vendor_shop_resume(request):
    """Ajouté en plus de la liste stricte confiée à cet agent : une pause sans moyen de la lever
    avant son terme serait un endpoint inutilisable. Même réserve que ci-dessus sur l'objet
    "boutique" partiel."""
    profile, err = _get_active_vendor_or_404(request.user)
    if err:
        return err

    profile.paused_since = None
    profile.paused_until = None
    profile.save(update_fields=['paused_since', 'paused_until'])
    _vendor_emit_event(profile, 'shop.resumed')
    return Response({'pause': None})


#  BOUTIQUE — FERMETURES PROGRAMMÉES (48h de préavis, écourtables, Q-39)

def _serialize_closure(c):
    return {
        'id': str(c.id),
        'du': c.start_date.isoformat(),
        'au': c.end_date.isoformat(),
        'motif': c.reason,
        'annonceeLe': _epoch_ms(c.created_at),
    }


@extend_schema(tags=["Vendors"], summary="Lister / programmer une fermeture de la boutique")
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def vendor_shop_closures(request):
    """GET ajouté en plus de la liste stricte confiée à cet agent (nécessaire pour que PATCH/DELETE
    /shop/closures/{id}, demandés explicitement, aient quelque chose à lister/tester)."""
    profile, err = _get_active_vendor_or_404(request.user)
    if err:
        return err

    if request.method == 'GET':
        return Response([_serialize_closure(c) for c in profile.closures.all()])

    du = request.data.get('du')
    au = request.data.get('au')
    motif = (request.data.get('motif') or '').strip()
    try:
        start = date.fromisoformat(du)
        end = date.fromisoformat(au)
    except (TypeError, ValueError):
        return Response({'ok': False, 'raison': 'dates'})
    if end < start:
        return Response({'ok': False, 'raison': 'dates'})
    if start < (timezone.now().date() + timedelta(days=2)):
        return Response({'ok': False, 'raison': 'preavis_48h'})
    if profile.closures.filter(start_date__lte=end, end_date__gte=start).exists():
        return Response({'ok': False, 'raison': 'chevauche'})

    closure = ShopClosure.objects.create(vendor=profile, start_date=start, end_date=end, reason=motif)
    _vendor_emit_event(profile, 'shop.closure_scheduled', {'id': closure.id})
    return Response({'ok': True, 'boutique': {'fermetures': [_serialize_closure(c) for c in profile.closures.all()]}})


@extend_schema(tags=["Vendors"], summary="Écourter ou annuler une fermeture programmée")
@api_view(['PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def vendor_shop_closure_detail(request, closure_id):
    profile, err = _get_active_vendor_or_404(request.user)
    if err:
        return err

    try:
        closure = profile.closures.get(id=closure_id)
    except ShopClosure.DoesNotExist:
        return Response({'detail': 'Fermeture introuvable.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'DELETE':
        closure.delete()
        _vendor_emit_event(profile, 'shop.closure_cancelled', {'id': closure_id})
        return Response({'boutique': {'fermetures': [_serialize_closure(c) for c in profile.closures.all()]}})

    au = request.data.get('au')
    try:
        end = date.fromisoformat(au)
    except (TypeError, ValueError):
        return Response({'ok': False, 'raison': 'dates'})
    if end < closure.start_date or end > closure.end_date:
        return Response({'ok': False, 'raison': 'dates'})
    closure.end_date = end
    closure.save(update_fields=['end_date', 'updated_at'])
    _vendor_emit_event(profile, 'shop.closure_shortened', {'id': closure.id})
    return Response({'ok': True, 'boutique': {'fermetures': [_serialize_closure(c) for c in profile.closures.all()]}})


#  AVIS — RÉPONSE PRIVÉE (ex-WhatsApp → vraie messagerie privée, voir avertissement produit en tête de section)

@extend_schema(
    tags=["Vendors"],
    summary="Répondre en privé à un avis (ouvre/réutilise la conversation de la commande)",
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def vendor_review_private_reply(request, review_id):
    from apps.catalog.models import ProductReview

    profile, err = _get_active_vendor_or_404(request.user)
    if err:
        return err

    try:
        review = ProductReview.objects.select_related('order').get(id=review_id, product__vendor=request.user)
    except ProductReview.DoesNotExist:
        return Response({'detail': 'Avis introuvable.'}, status=status.HTTP_404_NOT_FOUND)

    texte = (request.data.get('texte') or '').strip()
    if len(texte) < REVIEW_REPLY_MIN_LEN:
        return Response({'ok': False, 'raison': 'trop_court'})
    if timezone.now() - review.created_at > timedelta(days=REVIEW_REPLY_WINDOW_DAYS):
        return Response({'ok': False, 'raison': 'delai_depasse'})
    if _detecte_coordonnees(texte):
        return Response({'ok': False, 'raison': 'coordonnees'})

    thread = MessageThread.objects.filter(review=review).first()
    if thread is None:
        if review.order_id:
            thread, created = MessageThread.objects.get_or_create(
                vendor=profile, order_id=review.order_id, kind=MessageThread.Kind.ORDER,
                defaults={'review': review},
            )
            if not created and thread.review_id is None:
                thread.review = review
                thread.save(update_fields=['review'])
        else:
            thread = MessageThread.objects.create(vendor=profile, kind=MessageThread.Kind.ORDER, review=review)

    if thread.messages.filter(sender=ThreadMessage.Sender.VENDOR).exists():
        return Response({'ok': False, 'raison': 'deja_repondu'})

    ThreadMessage.objects.create(thread=thread, sender=ThreadMessage.Sender.VENDOR, author=request.user, text=texte)
    thread.closed = False
    thread.save(update_fields=['closed', 'updated_at'])
    _vendor_emit_event(profile, 'review.private_reply', {'review_id': review.id, 'fil': str(thread.id)})
    return Response({'ok': True, 'fil': str(thread.id)})


#  MESSAGES — CONVERSATIONS (voir avertissement produit en tête de section)

_SENDER_TO_FRONT = {
    ThreadMessage.Sender.VENDOR: 'vendeur',
    ThreadMessage.Sender.CLIENT: 'client',
    ThreadMessage.Sender.SUPPORT: 'support',
}


def _serialize_thread_message(m):
    auteur = None
    if m.author_id:
        auteur = (m.author.first_name or m.author.username)
    return {
        'id': str(m.id),
        'de': _SENDER_TO_FRONT.get(m.sender, 'vendeur'),  # 'VENDOR'.lower() donnerait 'vendor' (EN), pas 'vendeur' (FR attendu)
        'auteur': auteur,
        'texte': m.text,
        'a': _epoch_ms(m.created_at),
        'filtre': m.was_filtered,
    }


def _serialize_thread(t):
    dernier = t.messages.order_by('-created_at').first()
    non_lus_qs = t.messages.exclude(sender=ThreadMessage.Sender.VENDOR)
    if t.vendor_last_read_at:
        non_lus_qs = non_lus_qs.filter(created_at__gt=t.vendor_last_read_at)
    ref = f"BLV-{t.order_id:05d}" if t.order_id else None
    sujet = "Support BelivaY" if t.kind == MessageThread.Kind.SUPPORT else (f"Client de {ref}" if ref else "Conversation")
    return {
        'id': str(t.id),
        'type': 'support' if t.kind == MessageThread.Kind.SUPPORT else 'commande',
        'ref': ref,
        'sujet': sujet,
        'nonLus': non_lus_qs.count(),
        'dernier': _serialize_thread_message(dernier) if dernier else None,
        'ferme': t.closed,
        # Carte de commande (article, étape, échéance) : assemblée par le domaine "commandes",
        # pas construite ici (hors scope de cet agent) — toujours null pour l'instant.
        'commande': None,
    }


@extend_schema(tags=["Vendors"], summary="Lister mes conversations / ouvrir la conversation d'une commande")
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def vendor_threads(request):
    """GET (liste) et POST .../{id}/messages ajoutés en plus de la liste stricte confiée à cet
    agent : sans eux, ouvrirFil/threads-support/read n'ont ni fil à lister ni message à lire."""
    profile, err = _get_active_vendor_or_404(request.user)
    if err:
        return err

    if request.method == 'GET':
        threads = profile.message_threads.all()
        return Response([_serialize_thread(t) for t in threads])

    order_id = request.data.get('order_id')
    if not order_id:
        return Response(None, status=status.HTTP_404_NOT_FOUND)
    order = Order.objects.filter(id=order_id, items__product__vendor=request.user).distinct().first()
    if order is None:
        return Response(None, status=status.HTTP_404_NOT_FOUND)

    thread, _created = MessageThread.objects.get_or_create(
        vendor=profile, order=order, kind=MessageThread.Kind.ORDER,
    )
    return Response({'id': str(thread.id)})


@extend_schema(tags=["Vendors"], summary="Détail d'une conversation et ses messages")
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def vendor_thread_detail(request, thread_id):
    profile, err = _get_active_vendor_or_404(request.user)
    if err:
        return err
    try:
        thread = profile.message_threads.get(id=thread_id)
    except MessageThread.DoesNotExist:
        return Response(None, status=status.HTTP_404_NOT_FOUND)
    return Response({
        'fil': _serialize_thread(thread),
        'messages': [_serialize_thread_message(m) for m in thread.messages.all()],
    })


@extend_schema(tags=["Vendors"], summary="Envoyer un message dans une conversation")
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def vendor_thread_send_message(request, thread_id):
    profile, err = _get_active_vendor_or_404(request.user)
    if err:
        return err
    try:
        thread = profile.message_threads.get(id=thread_id)
    except MessageThread.DoesNotExist:
        return Response({'error': {'code': 'introuvable', 'message': 'Conversation introuvable.'}}, status=404)

    if thread.closed:
        return Response({'error': {'code': 'ferme', 'message': 'Cette conversation est fermée.'}}, status=400)

    texte = (request.data.get('texte') or '').strip()
    if not texte:
        return Response({'error': {'code': 'vide', 'message': 'Message vide.'}}, status=400)

    propre, filtre = _filtrer_coordonnees(texte)
    msg = ThreadMessage.objects.create(
        thread=thread, sender=ThreadMessage.Sender.VENDOR, author=request.user, text=propre, was_filtered=filtre,
    )
    thread.save(update_fields=['updated_at'])
    _vendor_emit_event(profile, 'message.sent', {'fil': str(thread.id)})
    return Response(_serialize_thread_message(msg))


@extend_schema(tags=["Vendors"], summary="Marquer une conversation comme lue")
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def vendor_thread_mark_read(request, thread_id):
    profile, err = _get_active_vendor_or_404(request.user)
    if err:
        return err
    try:
        thread = profile.message_threads.get(id=thread_id)
    except MessageThread.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)
    thread.vendor_last_read_at = timezone.now()
    thread.save(update_fields=['vendor_last_read_at'])
    return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema(tags=["Vendors"], summary="Écrire au support BelivaY (conversation dédiée)")
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def vendor_thread_support(request):
    profile, err = _get_active_vendor_or_404(request.user)
    if err:
        return err

    texte = (request.data.get('texte') or '').strip()
    if not texte:
        return Response({'error': {'code': 'vide', 'message': 'Message vide.'}}, status=400)

    ref = request.data.get('ref')
    order = None
    if ref:
        import re as _re_mod
        m = _re_mod.search(r'(\d+)', str(ref))
        if m:
            order = Order.objects.filter(id=int(m.group(1)), items__product__vendor=request.user).distinct().first()

    thread, _created = MessageThread.objects.get_or_create(
        vendor=profile, kind=MessageThread.Kind.SUPPORT, order=order,
    )
    propre, filtre = _filtrer_coordonnees(texte)
    ThreadMessage.objects.create(
        thread=thread, sender=ThreadMessage.Sender.VENDOR, author=request.user, text=propre, was_filtered=filtre,
    )
    thread.save(update_fields=['updated_at'])
    _vendor_emit_event(profile, 'support.message', {'fil': str(thread.id)})
    return Response({'fil': str(thread.id)})


_QUICK_REPLIES = {
    'commande': [
        "Votre commande est en préparation, merci de votre patience.",
        "Votre colis est prêt, il sera récupéré au prochain passage.",
        "Désolé pour le délai, nous accélérons la préparation.",
    ],
    'litige': [
        "Nous examinons votre dossier et revenons vers vous rapidement.",
        "Voici les preuves demandées, merci de vérifier.",
    ],
    'support': [
        "Merci, nous revenons vers vous sous peu.",
        "Pouvez-vous préciser votre demande ?",
    ],
}


@extend_schema(tags=["Vendors"], summary="Réponses rapides par type de conversation")
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def vendor_quick_replies(request):
    type_fil = request.query_params.get('type') or 'commande'
    return Response(_QUICK_REPLIES.get(type_fil, _QUICK_REPLIES['commande']))


#  NOTIFICATIONS — ALIAS SOUS /api/vendors/ (réutilise UserNotification, accounts app)
#
# Ne duplique PAS le modèle UserNotification (générique, câblé la nuit du 11-12 oct. pour
# /api/auth/notifications/... et le portail v2 existant) : ces vues relisent/modifient les
# mêmes lignes, seule la mise en forme de la réponse change pour coller au contrat riche
# (TexteNotification, urgent/argent/contester) attendu par ce nouveau frontend. Le mapping
# type-interne → type-frontend est une approximation best-effort documentée ci-dessous : les
# déclencheurs fins (litige qui court, sanction avec "contester", rappels 24h/6h) dépendent de
# domaines non construits par cet agent (litiges, sécurité compte, palier) et restent à câbler.

_NOTIF_TYPE_TO_FRONT = {
    UserNotification.NotificationType.ORDER: 'preparer',
    UserNotification.NotificationType.PROMOTION: 'offre',
    UserNotification.NotificationType.PAYMENT: 'versement',
    UserNotification.NotificationType.SUPPORT: 'message',
    UserNotification.NotificationType.SYSTEM: 'conseil',
    UserNotification.NotificationType.SECURITY: 'securite',
}


def _serialize_vendor_notification(n):
    return {
        'id': str(n.id),
        'type': _NOTIF_TYPE_TO_FRONT.get(n.notification_type, 'conseil'),
        'canal': 'notification',
        'titre': {'modele': n.title},
        'texte': {'modele': n.message},
        'a': _epoch_ms(n.created_at),
        'lu': n.is_read,
        'urgent': n.notification_type == UserNotification.NotificationType.ORDER and not n.is_read,
        'argent': n.notification_type == UserNotification.NotificationType.PAYMENT,
        'lien': n.action_url or '',
        'contester': None,  # sanction/descente de palier : domaine "trust", pas construit ici
    }


@extend_schema(tags=["Vendors"], summary="Centre de notifications (alias de /api/auth/notifications/)")
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def vendor_notifications_list(request):
    qs = UserNotification.objects.filter(user=request.user)
    filtre = request.query_params.get('filter')
    if filtre == 'urgent':
        qs = qs.filter(notification_type=UserNotification.NotificationType.ORDER, is_read=False)
    elif filtre == 'argent':
        qs = qs.filter(notification_type=UserNotification.NotificationType.PAYMENT)
    return Response([_serialize_vendor_notification(n) for n in qs])


@extend_schema(tags=["Vendors"], summary="Compteurs du centre de notifications")
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def vendor_notifications_counts(request):
    qs = UserNotification.objects.filter(user=request.user)
    return Response({
        'tout': qs.count(),
        'urgent': qs.filter(notification_type=UserNotification.NotificationType.ORDER, is_read=False).count(),
        'argent': qs.filter(notification_type=UserNotification.NotificationType.PAYMENT).count(),
        'nonLues': qs.filter(is_read=False).count(),
    })


@extend_schema(tags=["Vendors"], summary="Nombre de notifications non lues")
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def vendor_notifications_unread_count(request):
    return Response({'nonLues': UserNotification.objects.filter(user=request.user, is_read=False).count()})


@extend_schema(tags=["Vendors"], summary="Marquer une notification comme lue")
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def vendor_notification_mark_read(request, notification_id):
    notification = get_object_or_404(UserNotification, id=notification_id, user=request.user)
    notification.is_read = bool(request.data.get('lue', True))
    notification.save(update_fields=['is_read', 'updated_at'])
    return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema(tags=["Vendors"], summary="Marquer toutes les notifications comme lues")
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def vendor_notifications_mark_all_read(request):
    UserNotification.objects.filter(user=request.user, is_read=False).update(is_read=True)
    return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema(tags=["Vendors"], summary="Lire / modifier mes réglages de notifications")
@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def vendor_notification_settings(request):
    profile, err = _get_active_vendor_or_404(request.user)
    if err:
        return err

    settings_obj, _created = VendorNotificationSettings.objects.get_or_create(vendor=profile)

    if request.method == 'PUT':
        mapping = (
            ('versements', 'payouts_enabled'), ('avis', 'reviews_enabled'),
            ('conseils', 'tips_enabled'), ('sonDistinct', 'distinct_sound'),
        )
        for champ, field in mapping:
            if champ in request.data:
                setattr(settings_obj, field, bool(request.data[champ]))
        settings_obj.save()

    return Response({
        'commandesEtLitiges': True,
        'versements': settings_obj.payouts_enabled,
        'avis': settings_obj.reviews_enabled,
        'conseils': settings_obj.tips_enabled,
        'sonDistinct': settings_obj.distinct_sound,
        'silence': [settings_obj.silence_start, settings_obj.silence_end],
    })


#  AIDE — FAQ, produits interdits, contacts, conseil
#
# Pas de CMS : contenu français statique côté serveur (modifiable ici au besoin) + coordonnées
# support déjà utilisées ailleurs (SUPPORT_WHATSAPP_NUMBER côté frontend v2, format.ts).
# GET /help/questions (et pas GET /help tel qu'écrit dans INTEGRATION-API.md) parce que c'est
# la route que `domaineAide.questions()` appelle réellement (src/api/domaines/aide.ts) — voir
# rapport pour ce léger écart entre le tableau de synthèse et le code déjà écrit.

_SUPPORT_WHATSAPP_NUMBER = '237689002812'

_HELP_QUESTIONS = [
    {'id': 'q1', 'theme': 'commandes', 'question': "Comment préparer une commande ?",
     'reponse': {'modele': "Ouvrez la commande dans « À préparer » et suivez le bon de préparation."},
     'ecran': 'commandes', 'lien': "Voir mes commandes"},
    {'id': 'q2', 'theme': 'argent', 'question': "Quand suis-je payé ?",
     'reponse': {'modele': "L'argent est libéré après confirmation de réception, puis versé selon votre calendrier."},
     'ecran': 'argent', 'lien': "Voir mes versements"},
    {'id': 'q3', 'theme': 'litiges', 'question': "Un client a ouvert un litige, que faire ?",
     'reponse': {'modele': "Répondez avec vos preuves avant l'échéance affichée sur le litige."},
     'ecran': 'litiges', 'lien': "Voir mes litiges"},
    {'id': 'q4', 'theme': 'retours', 'question': "Comment traiter un retour ?",
     'reponse': {'modele': "Inspectez le colis à son arrivée et confirmez l'état rapidement."},
     'ecran': 'retours', 'lien': "Voir mes retours"},
    {'id': 'q5', 'theme': 'palier', 'question': "Comment monter de palier ?",
     'reponse': {'modele': "Votre palier suit votre Trust Score : ventes, avis et ancienneté comptent."},
     'ecran': 'palier', 'lien': "Voir mon palier"},
    {'id': 'q6', 'theme': 'boutique', 'question': "Comment fermer ma boutique temporairement ?",
     'reponse': {'modele': "Utilisez « Fermer aujourd'hui » pour un jour, ou une pause pour plusieurs jours."},
     'ecran': 'boutique', 'lien': "Voir ma boutique"},
    {'id': 'q7', 'theme': 'produits', 'question': "Quels produits sont interdits à la vente ?",
     'reponse': {'modele': "Consultez la liste des produits interdits."}, 'ecran': None, 'lien': None},
]

_HELP_FORBIDDEN_PRODUCTS = [
    "Armes et munitions", "Stupéfiants et substances illicites", "Médicaments sur ordonnance",
    "Produits contrefaits", "Animaux vivants protégés", "Explosifs et produits inflammables non homologués",
    "Monnaie et instruments financiers falsifiés", "Contenus à caractère pornographique",
]


@extend_schema(tags=["Vendors"], summary="Questions fréquentes (aide)")
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def vendor_help_questions(request):
    q = (request.query_params.get('q') or '').strip().lower()
    questions = _HELP_QUESTIONS
    if q:
        questions = [x for x in questions if q in x['question'].lower()]
    return Response(questions)


@extend_schema(tags=["Vendors"], summary="Produits interdits à la vente")
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def vendor_help_forbidden_products(request):
    return Response(_HELP_FORBIDDEN_PRODUCTS)


@extend_schema(tags=["Vendors"], summary="Coordonnées officielles du support BelivaY")
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def vendor_help_contacts(request):
    return Response({
        'telephone': '+237 689 002 812',
        'telephoneLien': f'tel:+{_SUPPORT_WHATSAPP_NUMBER}',
        'email': 'support@belivay.com',
        'whatsapp': f'https://wa.me/{_SUPPORT_WHATSAPP_NUMBER}',
        'horaires': ['07:00', '21:00'],
        'delaiReponseH': 2,
        'responsablePlatine': False,
        'reseaux': [],
    })


@extend_schema(tags=["Vendors"], summary="Conseil de la semaine")
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def vendor_help_tip(request):
    return Response({
        'titre': "Répondez vite aux avis",
        'texte': "Les vendeurs qui répondent à leurs avis sous 48 h gardent un meilleur Trust Score.",
        'publieLe': timezone.now().date().isoformat(),
    })


#  ÉVÉNEMENTS TEMPS RÉEL (§8 INTEGRATION-API.md)

def _serialize_vendor_event(e):
    return {'id': e.id, 'type': e.event_type, 'payload': e.payload, 'a': _epoch_ms(e.created_at)}


@extend_schema(tags=["Vendors"], summary="Événements depuis un horodatage (polling)")
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def vendor_events_list(request):
    profile, err = _get_active_vendor_or_404(request.user)
    if err:
        return err

    depuis = request.query_params.get('depuis')
    qs = profile.events.all()
    if depuis:
        try:
            depuis_dt = datetime.fromtimestamp(int(depuis) / 1000, tz=timezone.utc)
            qs = qs.filter(created_at__gt=depuis_dt)
        except (TypeError, ValueError, OSError):
            pass
    return Response([_serialize_vendor_event(e) for e in qs[:200]])


def vendor_events_stream(request):
    """
    SSE minimal — vue Django classique (StreamingHttpResponse), PAS @api_view DRF : DRF ne gère
    pas le streaming nativement. LIMITE DOCUMENTÉE : pas de vraie infra pub/sub (Redis,
    Channels…) ; un seul passage par requête, qui interroge la base toutes les 2 s pendant 25 s
    au plus puis se termine — le client reconnecte (reprise par Last-Event-ID ou ?depuis=, comme
    demandé). Suffisant pour une v1, à remplacer si le volume d'événements justifie mieux.
    """
    # Vue Django classique : AuthenticationMiddleware ne lit que la session, jamais le jeton
    # JWT — il faut authentifier le Bearer nous-mêmes (DRF ne le fait que pour les @api_view).
    from rest_framework_simplejwt.authentication import JWTAuthentication
    from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

    try:
        auth_result = JWTAuthentication().authenticate(request)
    except (InvalidToken, TokenError):
        auth_result = None
    if auth_result is None:
        return HttpResponse(status=401)
    user, _validated_token = auth_result

    try:
        profile = VendorProfile.objects.get(user=user)
    except VendorProfile.DoesNotExist:
        return HttpResponse(status=404)

    raw_cursor = request.headers.get('Last-Event-ID') or request.GET.get('depuis')
    try:
        cursor = int(raw_cursor) if raw_cursor else None
    except (TypeError, ValueError):
        cursor = None

    def gen(start_cursor):
        cur = start_cursor
        deadline = time.monotonic() + 25
        # On produit des octets, pas du texte. Django encoderait lui-meme avec
        # le charset de la reponse ; l'ecrire ici donne exactement les memes
        # octets sans dependre de ce reglage, ce qui vaut mieux pour un flux.
        yield b': ok\n\n'
        while time.monotonic() < deadline:
            qs = profile.events.all()
            if cur:
                qs = qs.filter(id__gt=cur)
            for e in qs.order_by('id')[:50]:
                cur = e.id
                data = _json.dumps(_serialize_vendor_event(e))
                yield f"id: {e.id}\nevent: {e.event_type}\ndata: {data}\n\n".encode()
            time.sleep(2)

    response = StreamingHttpResponse(gen(cursor), content_type='text/event-stream')
    response['Cache-Control'] = 'no-cache'
    response['X-Accel-Buffering'] = 'no'
    return response


# ══════════════════════════════════════════════════════════════════════════════
# ESPACE VENDEUR AUTONOME — domaines commandes / préparation / remise / journal
# (espace-client-belivay/espace-vendeur, vague d'intégration du 12 oct.).
#
# PAS de slash final sur ces routes : src/api/outils.ts (ce nouveau frontend)
# n'en ajoute pas, et APPEND_SLASH convertirait un POST en GET au premier
# redirect. `ref` (ReferenceCommande) est simplifié ici en l'id Order brut
# (str) plutôt que le format cosmétique "BLV-00008" du TS d'origine.
#
# RÔLE : pas de modèle "employé / accès Préparation" côté serveur aujourd'hui
# (domaine "équipe" non câblé) — tout vendeur authentifié est `role:
# 'proprietaire'`, 403 owner_only/forbidden_right jamais renvoyés ici.
# ══════════════════════════════════════════════════════════════════════════════

from . import opening_hours as _oh


def _ev_active_vendor(request) -> tuple[VendorProfile, Response | None]:
    """
    (profile, None) si vendeur actif, sinon (None, Response 403/404).

    Premier élément annoncé non optionnel : voir l'explication détaillée sur
    `_get_active_vendor_or_404`.
    """
    try:
        profile = VendorProfile.objects.get(user=request.user)
    except VendorProfile.DoesNotExist:
        return None, Response({'detail': 'Profil vendeur introuvable.'}, status=status.HTTP_404_NOT_FOUND)  # type: ignore[return-value]
    if not profile.is_active_vendor:
        return None, Response(  # type: ignore[return-value]
            {'detail': "Votre compte vendeur n'est pas encore approuvé."},
            status=status.HTTP_403_FORBIDDEN,
        )
    return profile, None


def _ev_vendor_order(order_id, vendor_user):
    return Order.objects.filter(
        id=order_id, items__product__vendor=vendor_user,
    ).prefetch_related('shipments__events', 'items').distinct().first()


# ── Commandes ────────────────────────────────────────────────────────────────

@extend_schema(
    tags=["Vendors"],
    summary="(Espace vendeur) Commandes par filtre — compteurs, détail, total",
    description="GET /vendors/orders?state=prep|cours|fin|pb — VD05-R05, CMD-02 : jamais un chiffre faux (même requête que la liste).",
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def ev_orders_vue(request):
    profile, err = _ev_active_vendor(request)
    if err:
        return err
    state = request.query_params.get('state', 'prep')
    orders = (
        Order.objects.filter(items__product__vendor=request.user)
        .exclude(fulfillment_status=Order.FulfillmentStatus.CREATED)
        .prefetch_related('shipments__events', 'items')
        .distinct()
        .order_by('-created_at')
    )
    from .serializers import build_vue_commandes
    return Response(build_vue_commandes(orders, profile, state))


@extend_schema(tags=["Vendors"], summary="(Espace vendeur) Détail d'une commande")
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def ev_order_detail(request, order_id):
    profile, err = _ev_active_vendor(request)
    if err:
        return err
    order = _ev_vendor_order(order_id, request.user)
    if not order:
        return Response({'detail': 'Introuvable.'}, status=status.HTTP_404_NOT_FOUND)
    from .serializers import build_commande
    return Response(build_commande(order, profile))


@extend_schema(tags=["Vendors"], summary="(Espace vendeur) Journal signé d'une commande (JRN-02)")
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def ev_order_journal(request, order_id):
    profile, err = _ev_active_vendor(request)
    if err:
        return err
    order = _ev_vendor_order(order_id, request.user)
    if not order:
        return Response({'detail': 'Introuvable.'}, status=status.HTTP_404_NOT_FOUND)
    from .serializers import build_entree_journal
    return Response(build_entree_journal(order, profile))


# ── Préparation ──────────────────────────────────────────────────────────────

@extend_schema(tags=["Vendors"], summary="(Espace vendeur) « C'est prêt »")
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def ev_order_ready(request, order_id):
    profile, err = _ev_active_vendor(request)
    if err:
        return err
    order = _ev_vendor_order(order_id, request.user)
    if not order:
        return Response({'ok': False, 'raison': 'introuvable'})
    FS = Order.FulfillmentStatus
    if order.fulfillment_status == FS.READY_FOR_PICKUP:
        return Response({'ok': False, 'raison': 'deja_prete'})
    if order.fulfillment_status in (FS.CANCELLED, FS.REFUNDED):
        return Response({'ok': False, 'raison': 'annulee'})
    if order.fulfillment_status not in (FS.PAID_IN_ESCROW, FS.VENDOR_ACKNOWLEDGED, FS.PREPARING):
        return Response({'ok': False, 'raison': 'introuvable'})

    now = timezone.now()
    if not order.vendor_acknowledged_at:
        # Accusé de réception implicite : « C'est prêt » est la seule
        # confirmation attendue côté vendeur sur ce frontend (PRE-01).
        from .business_hours import add_business_hours
        order.vendor_acknowledged_at = now
        order.prep_deadline = add_business_hours(now, 4, profile.closed_days)
    order.fulfillment_status = FS.READY_FOR_PICKUP
    order.save()

    from apps.orders.models import OrderHistory
    OrderHistory.objects.create(
        order=order, user=request.user, action="« C'est prêt » (espace vendeur)",
        field_name='fulfillment_status', old_value='', new_value=FS.READY_FOR_PICKUP,
    )
    return Response({'ok': True, 'preteA': _oh.dt_to_ms(order.updated_at)})


@extend_schema(
    tags=["Vendors"],
    summary="(Espace vendeur) Rupture de stock — remplace l'annulation (DP-01)",
    description="Le stock lui-même (stockAZero) n'est pas modifié ici : domaine produits/stock, pas celui-ci.",
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def ev_order_stockout(request, order_id):
    profile, err = _ev_active_vendor(request)
    if err:
        return err
    order = _ev_vendor_order(order_id, request.user)
    if not order:
        return Response({'ok': False, 'raison': 'introuvable'})
    if order.fulfillment_status == Order.FulfillmentStatus.READY_FOR_PICKUP:
        return Response({'ok': False, 'raison': 'deja_prete'})

    order.fulfillment_status = Order.FulfillmentStatus.CANCELLED
    order.cancellation_reason = Order.CancellationReason.STOCKOUT
    order.cancelled_at = timezone.now()
    if order.is_paid:
        order.escrow_status = Order.EscrowStatus.REFUNDED
    order.save()

    from apps.orders.models import OrderHistory
    OrderHistory.objects.create(
        order=order, user=request.user, action='Rupture de stock signalée (espace vendeur)',
        field_name='fulfillment_status', old_value='', new_value='CANCELLED',
    )
    return Response({'ok': True})


@extend_schema(
    tags=["Vendors"],
    summary="(Espace vendeur) « Plus de temps » : GET options, POST demande (même chemin, DEL-01)",
    description=(
        "Une seule route /orders/{id}/extend pour les deux méthodes (Django ne "
        "retente pas un deuxième path() sur le même chemin si le premier répond "
        "405) : GET = options possibles, POST {choix} = applique le choix."
    ),
)
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def ev_order_extend(request, order_id):
    profile, err = _ev_active_vendor(request)
    if err:
        return err
    order = _ev_vendor_order(order_id, request.user)

    if request.method == 'GET':
        if not order or not order.vendor_acknowledged_at or not order.prep_deadline:
            return Response({'detail': 'Introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        from .serializers import _calendrier_boutique, _ref_commande
        cal = _calendrier_boutique(profile)
        debut = _oh.dt_to_ms(order.vendor_acknowledged_at)
        echeance = _oh.dt_to_ms(order.prep_deadline)
        absolue = _oh.ajouter_ouvertes(debut, 24 * _oh.H, cal)
        delai = _oh.options_de_delai(echeance, absolue, cal)
        return Response({
            'ref': _ref_commande(order),
            'echeance': echeance,
            'absolue': absolue,
            'prolongee': order.prep_extended,
            'aPreparer': order.fulfillment_status in (
                Order.FulfillmentStatus.VENDOR_ACKNOWLEDGED, Order.FulfillmentStatus.PREPARING,
            ),
            'ramassage': delai['ramassage'],
            'options': delai['options'],
        })

    # POST — applique le choix
    if not order:
        return Response({'ok': False, 'raison': 'introuvable'})
    if order.fulfillment_status == Order.FulfillmentStatus.READY_FOR_PICKUP:
        return Response({'ok': False, 'raison': 'deja_prete'})
    if order.prep_extended:
        return Response({'ok': False, 'raison': 'deja_prolongee'})
    if not order.vendor_acknowledged_at or not order.prep_deadline:
        return Response({'ok': False, 'raison': 'introuvable'})

    from .serializers import _calendrier_boutique
    cal = _calendrier_boutique(profile)
    debut = _oh.dt_to_ms(order.vendor_acknowledged_at)
    echeance = _oh.dt_to_ms(order.prep_deadline)
    absolue = _oh.ajouter_ouvertes(debut, 24 * _oh.H, cal)

    choix = request.data.get('choix')
    if choix == '+1h':
        nouvelle = _oh.ajouter_ouvertes(echeance, _oh.H, cal)
    elif choix == '+2h':
        nouvelle = _oh.ajouter_ouvertes(echeance, 2 * _oh.H, cal)
    elif choix == 'demain':
        nouvelle = _oh.ouverture_du_jour_suivant(echeance, cal)
    else:
        return Response({'ok': False, 'raison': 'introuvable'})

    if nouvelle > absolue:
        return Response({'ok': False, 'raison': 'au_dela_de_24h'})

    order.prep_deadline = _oh.ms_to_dt(nouvelle)
    order.prep_extended = True
    order.save(update_fields=['prep_deadline', 'prep_extended'])
    return Response({'ok': True, 'echeance': nouvelle})


@extend_schema(tags=["Vendors"], summary="(Espace vendeur) Bon de préparation")
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def ev_order_slip(request, order_id):
    profile, err = _ev_active_vendor(request)
    if err:
        return err
    order = _ev_vendor_order(order_id, request.user)
    if not order:
        return Response({'detail': 'Introuvable.'}, status=status.HTTP_404_NOT_FOUND)
    from .serializers import build_bon_preparation
    return Response(build_bon_preparation(order, profile))


@extend_schema(tags=["Vendors"], summary="(Espace vendeur) Ouvre le bon de préparation (une ligne au journal)")
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def ev_order_slip_open(request, order_id):
    profile, err = _ev_active_vendor(request)
    if err:
        return err
    order = _ev_vendor_order(order_id, request.user)
    if not order:
        return Response({'detail': 'Introuvable.'}, status=status.HTTP_404_NOT_FOUND)

    state = order.prep_slip_state or {}
    today = timezone.now().date().isoformat()
    already_today = (state.get('opened_at') or '')[:10] == today and state.get('opened_by') == request.user.username
    state['opened_at'] = timezone.now().isoformat()
    state['opened_by'] = request.user.username
    order.prep_slip_state = state
    order.save(update_fields=['prep_slip_state'])

    if not already_today:
        from apps.orders.models import OrderHistory
        OrderHistory.objects.create(
            order=order, user=request.user, action='Bon de préparation ouvert',
            field_name='prep_slip_state', old_value='', new_value=request.user.username,
        )
    return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema(tags=["Vendors"], summary="(Espace vendeur) Coche une vérification du bon")
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def ev_order_slip_check(request, order_id):
    profile, err = _ev_active_vendor(request)
    if err:
        return err
    order = _ev_vendor_order(order_id, request.user)
    if not order:
        return Response({'detail': 'Introuvable.'}, status=status.HTTP_404_NOT_FOUND)

    from .serializers import VERIFICATIONS
    try:
        cle = VERIFICATIONS[int(request.data.get('i'))]
    except (TypeError, ValueError, IndexError):
        return Response({'detail': 'Introuvable.'}, status=status.HTTP_404_NOT_FOUND)
    fait = bool(request.data.get('fait'))

    state = order.prep_slip_state or {}
    checks = state.get('checks', {})
    checks[cle] = {'fait': fait, 'par': request.user.username if fait else None}
    state['checks'] = checks
    order.prep_slip_state = state
    order.save(update_fields=['prep_slip_state'])

    from .serializers import build_bon_preparation
    return Response(build_bon_preparation(order, profile))


@extend_schema(tags=["Vendors"], summary="(Espace vendeur) Référence scannée ou tapée")
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def ev_order_slip_verify(request, order_id):
    profile, err = _ev_active_vendor(request)
    if err:
        return err
    order = _ev_vendor_order(order_id, request.user)
    if not order:
        return Response({'ok': False, 'raison': 'introuvable'})

    lu = (request.data.get('lu') or '').strip()
    items = list(order.items.filter(product__vendor=request.user))
    refs = {(i.product.sku if i.product and i.product.sku else f"BLV-{i.id:05d}") for i in items}
    if lu not in refs:
        return Response({'ok': False, 'raison': 'autre_reference'})

    state = order.prep_slip_state or {}
    checks = state.get('checks', {})
    checks['modele'] = {'fait': True, 'par': request.user.username}
    state['checks'] = checks
    state['reference_verified_at'] = timezone.now().isoformat()
    order.prep_slip_state = state
    order.save(update_fields=['prep_slip_state'])

    from .serializers import build_bon_preparation
    return Response({'ok': True, 'bon': build_bon_preparation(order, profile)})


# ── Remise (handover) ────────────────────────────────────────────────────────

@extend_schema(tags=["Vendors"], summary="(Espace vendeur) État de la remise d'une commande (sans le code)")
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def ev_order_handover(request, order_id):
    profile, err = _ev_active_vendor(request)
    if err:
        return err
    order = _ev_vendor_order(order_id, request.user)
    if not order:
        return Response({'detail': 'Introuvable.'}, status=status.HTTP_404_NOT_FOUND)
    from .serializers import build_remise
    return Response(build_remise(order, profile))


@extend_schema(tags=["Vendors"], summary="(Espace vendeur) Remises à faire ou toutes")
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def ev_handovers_list(request):
    profile, err = _ev_active_vendor(request)
    if err:
        return err
    orders_qs = (
        Order.objects.filter(items__product__vendor=request.user)
        .prefetch_related('shipments__events', 'items').distinct()
    )
    if request.query_params.get('state') == 'a_remettre':
        orders_qs = orders_qs.filter(fulfillment_status__in=[
            Order.FulfillmentStatus.READY_FOR_PICKUP, Order.FulfillmentStatus.DRIVER_ASSIGNED,
        ])
    orders_qs = orders_qs.order_by('-created_at')
    from .serializers import build_remise
    return Response([build_remise(o, profile) for o in orders_qs])


@extend_schema(
    tags=["Vendors"],
    summary="(Espace vendeur) Code de remise au toucher seulement (handover_code.viewed)",
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def ev_handover_code(request, order_id):
    profile, err = _ev_active_vendor(request)
    if err:
        return err
    order = _ev_vendor_order(order_id, request.user)
    if not order:
        return Response({'ok': False, 'raison': 'introuvable'})
    if order.fulfillment_status in (Order.FulfillmentStatus.CANCELLED, Order.FulfillmentStatus.REFUNDED):
        return Response({'ok': False, 'raison': 'annulee'})
    shipment = order.shipments.filter(vendor=request.user).first()
    if not shipment:
        return Response({'ok': False, 'raison': 'introuvable'})
    if shipment.buyer_confirmed_at:
        return Response({'ok': False, 'raison': 'remise'})
    if order.fulfillment_status not in (Order.FulfillmentStatus.READY_FOR_PICKUP, Order.FulfillmentStatus.DRIVER_ASSIGNED) or not shipment.courier_id:
        return Response({'ok': False, 'raison': 'pas_prete'})

    code = shipment.ensure_pickup_confirmation_code()
    from apps.orders.models import OrderHistory
    OrderHistory.objects.create(
        order=order, user=request.user, action='Code de remise consulté (handover_code.viewed)',
        field_name='pickup_confirmation_code',
    )
    return Response({'ok': True, 'code': code})


@extend_schema(
    tags=["Vendors"],
    summary="(Espace vendeur) Nouveau code de remise (DP-56, annule l'ancien)",
    description=(
        "Simplification signalée : la vérification du code par le livreur (3 essais, "
        "blocage 24h) n'est pas encore câblée côté serveur (aucune app livreur ne "
        "l'appelle ici) — ce renouvellement réussit donc toujours, jamais 'pas_bloquee'."
    ),
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def ev_handover_code_renew(request, order_id):
    profile, err = _ev_active_vendor(request)
    if err:
        return err
    order = _ev_vendor_order(order_id, request.user)
    if not order:
        return Response({'ok': False, 'raison': 'introuvable'})
    shipment = order.shipments.filter(vendor=request.user).first()
    if not shipment:
        return Response({'ok': False, 'raison': 'introuvable'})

    shipment.pickup_confirmation_code = ''
    shipment.ensure_pickup_confirmation_code()
    from apps.orders.models import OrderHistory
    OrderHistory.objects.create(
        order=order, user=request.user, action='Nouveau code de remise demandé (DP-56)',
        field_name='pickup_confirmation_code',
    )
    return Response({'ok': True, 'marcheA': _oh.now_ms()})


@extend_schema(tags=["Vendors"], summary="(Espace vendeur) Reçu vendeur d'une commande")
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def ev_order_receipt(request, order_id):
    profile, err = _ev_active_vendor(request)
    if err:
        return err
    order = _ev_vendor_order(order_id, request.user)
    if not order:
        return Response({'detail': 'Introuvable.'}, status=status.HTTP_404_NOT_FOUND)
    from .serializers import build_recu
    return Response(build_recu(order, profile))


@extend_schema(tags=["Vendors"], summary="(Espace vendeur) Tous les reçus, le plus récent d'abord")
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def ev_receipts(request):
    profile, err = _ev_active_vendor(request)
    if err:
        return err
    orders_qs = (
        Order.objects.filter(items__product__vendor=request.user, payment_status=Order.PaymentStatus.PAID)
        .prefetch_related('items', 'shipments').distinct().order_by('-created_at')
    )
    from .serializers import build_recu_resume
    return Response([build_recu_resume(o, profile) for o in orders_qs])


@extend_schema(
    tags=["Vendors"],
    summary="(Espace vendeur) Colis pas prêt au passage du livreur",
    description=(
        "Normalement déclenché par le livreur au passage (événement du domaine "
        "échanges, INTEGRATION-API.md §8) — exposé ici sous authentification "
        "vendeur car aucune app livreur n'existe encore dans ce backend pour "
        "porter cette action ; à déplacer quand elle existera. Le ramassage "
        "repasse au créneau suivant disponible (P-6) — aucun délai fixe n'est "
        "inventé ici, conformément à la consigne (pas de valeur numérique donnée)."
    ),
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def ev_order_not_ready(request, order_id):
    profile, err = _ev_active_vendor(request)
    if err:
        return err
    order = _ev_vendor_order(order_id, request.user)
    if not order:
        return Response({'detail': 'Introuvable.'}, status=status.HTTP_404_NOT_FOUND)

    order.not_ready_reason = (request.data.get('raison') or '').strip()
    order.not_ready_at = timezone.now()
    order.save(update_fields=['not_ready_reason', 'not_ready_at'])

    from apps.orders.models import OrderHistory
    OrderHistory.objects.create(
        order=order, user=request.user, action='Colis signalé pas prêt au passage du livreur',
        field_name='not_ready_reason', new_value=order.not_ready_reason,
    )

    from .serializers import _ramassage_for_shipment
    shipment = order.shipments.filter(vendor=request.user).first()
    return Response({'ok': True, 'ramassage': _ramassage_for_shipment(shipment) if shipment else None})


@extend_schema(
    tags=["Vendors"],
    summary="(Espace vendeur) Fermer/rouvrir la boutique aujourd'hui",
    description=(
        "POST ferme la boutique pour la date du jour (concept distinct de la "
        "fermeture hebdomadaire récurrente et de la pause boutique, VD-11) ; "
        "DELETE rouvre. Choix d'implémentation signalé : seul POST était "
        "demandé dans la consigne, DELETE ajouté pour le symétrique 'rouvrir' "
        "faute d'autre signal du côté frontend (domaine accueil, hors de ce lot)."
    ),
)
@api_view(['POST', 'DELETE'])
@permission_classes([IsAuthenticated])
def ev_shop_closed_today(request):
    profile, err = _ev_active_vendor(request)
    if err:
        return err
    if request.method == 'DELETE':
        profile.closed_today_date = None
        profile.save(update_fields=['closed_today_date'])
        return Response({'ok': True, 'ferme': False})
    profile.closed_today_date = timezone.localdate()
    profile.save(update_fields=['closed_today_date'])
    return Response({'ok': True, 'ferme': True})


#  ═══════════════════════════════════════════════════════════════════════
#  ESPACE VENDEUR AUTONOME — DOMAINE PRODUITS / OFFRES / CATALOGUE / STOCK /
#  VENTES FLASH / QUESTIONS CLIENTS (12 oct., vague d'intégration)
#
#  Connecte espace-client-belivay/espace-vendeur/src/api/domaines/produits.ts
#  et offres.ts au vrai backend (apps.catalog.Product/MasterProduct/
#  ProductVariant/PromotionCampaign), + construit stock/promotions/questions
#  (§7 de INTEGRATION-API.md) qui n'avaient pas encore de route serveur.
#
#  PAS de slash final sur les chemins (voir commentaire plus haut dans ce
#  fichier, agent boutique/messages : src/api/outils.ts n'ajoute jamais de
#  slash, et APPEND_SLASH convertirait un POST en GET au premier redirect).
#
#  Prix conseillé (Conseil) et reconnaissance d'image (catalog/recognize) :
#  AUCUNE donnée de demande de recherche ni de prix concurrents n'existe nulle
#  part dans le système (confirmé par l'audit du 12 oct.) — pas de moteur
#  inventé ici, voir les deux vues concernées pour l'état honnête rendu.
#
#  VD-PRIX-ANORMAL, VD-DOUBLON, VD-CONSEIL-PRIX, VD-PRIX-AUTO (§4 du doc) :
#  paramètres de modération de prix dont la valeur n'est donnée nulle part —
#  non appliqués ici (voir prixAutoPct=0 dans vd_config), à confirmer par la
#  gouvernance avant d'être câblés.
#  ═══════════════════════════════════════════════════════════════════════

def _vd_active_vendor(request) -> tuple[VendorProfile, Response | None]:
    """
    (vendor_profile, None) si vendeur actif, sinon (None, Response 403/404).

    Premier élément annoncé non optionnel : voir l'explication détaillée sur
    `_get_active_vendor_or_404`.
    """
    try:
        vp = VendorProfile.objects.get(user=request.user)
    except VendorProfile.DoesNotExist:
        return None, Response({'detail': 'Profil vendeur introuvable.'}, status=404)  # type: ignore[return-value]
    if not vp.is_active_vendor:
        return None, Response({'detail': "Compte vendeur non approuvé."}, status=403)  # type: ignore[return-value]
    return vp, None


def _vd_offer_or_404(request, offer_id) -> tuple[Product, Response | None]:
    """
    (offre, None) si elle appartient au vendeur, sinon (None, Response 404).

    Premier élément annoncé non optionnel : voir l'explication détaillée sur
    `_get_active_vendor_or_404`.
    """
    from apps.catalog.models import Product as _P
    try:
        return _P.objects.get(pk=offer_id, vendor=request.user), None
    except (_P.DoesNotExist, ValueError, TypeError):
        return None, Response(status=404)  # type: ignore[return-value]


def _vd_category_names(category):
    """(categorie, rayon) : categorie = famille racine du barème, rayon = catégorie affichée."""
    if not category:
        return '', ''
    rayon = category.name
    try:
        ancestors = category.get_ancestors()
    except Exception:
        ancestors = []
    categorie = ancestors[-1].name if ancestors else rayon
    return categorie, rayon


def _vd_commission_kept(vendor, price_xaf):
    """Montant gardé par le vendeur à price_xaf : réutilise LE calcul réellement appliqué aux
    commandes (apps.orders.serializers._commission_rate_for_product), jamais un barème recalculé
    séparément — cohérence garantie avec ce que le checkout facture vraiment."""
    from decimal import Decimal
    if not price_xaf:
        return 0, 0, 0.0
    try:
        from apps.orders.models import PlatformSettings
        from apps.orders.serializers import _commission_rate_for_product
        settings_ = PlatformSettings.get_settings()

        class _Probe:
            pass
        probe = _Probe()
        probe.price_xaf = price_xaf
        probe.vendor = vendor
        rate = _commission_rate_for_product(probe, settings_)
        commission = int((Decimal(price_xaf) * rate / Decimal('100')).to_integral_value())
        return price_xaf - commission, commission, float(rate)
    except Exception:
        return price_xaf, 0, 0.0


def _vd_offer_etat(product):
    if product is None:
        return None
    if product.is_deleted:
        return 'brouillon'
    if product.moderation_status == 'REJECTED':
        return 'refusee'
    if product.moderation_status == 'PENDING':
        return 'en_verification' if product.is_active or product.price_xaf else 'brouillon'
    if not product.is_active:
        return 'en_pause'
    return 'en_vente'


def _vd_offer_month_stats(product):
    """Ventes, gardé et litiges réels du mois en cours (OrderItem, Dispute) — gardeCeMois utilise
    order.commission_rate_snapshot, le taux réellement appliqué à chaque commande."""
    from django.utils import timezone
    now = timezone.now()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    ventes, garde, litiges = 0, None, 0
    try:
        from apps.orders.models import OrderItem
        items = OrderItem.objects.filter(
            product=product, order__created_at__gte=month_start,
        ).select_related('order')
        ventes = items.count()
        garde = 0
        for item in items:
            rate = float(item.order.commission_rate_snapshot or 0)
            garde += int(round(float(item.line_total_xaf) * (1 - rate / 100)))
    except Exception:
        ventes, garde = 0, None
    try:
        from apps.orders.models import Dispute
        litiges = Dispute.objects.filter(product=product, created_at__gte=month_start).count()
    except Exception:
        litiges = 0
    return ventes, garde, litiges


def _vd_serialize_photo(img, request):
    try:
        url = request.build_absolute_uri(img.image.url) if img.image else ''
    except Exception:
        url = ''
    return {
        'id': str(img.id),
        'image': url,
        'prise': img.created_at.isoformat() if img.created_at else None,
        # lieu/largeur/hauteur/octets* : non stockés par ProductImage (modèle existant, pas
        # construit pour ces métadonnées) — valeurs honnêtes plutôt qu'inventées.
        'lieu': None,
        'largeur': 0,
        'hauteur': 0,
        'octetsAvant': None,
        'octetsApres': None,
    }


def _vd_offer_dict(product, request):
    try:
        stock = product.inventory.quantity
    except Exception:
        stock = 0
    seuil = product.get_effective_stock_threshold()
    kept, _commission, _rate = _vd_commission_kept(product.vendor, product.price_xaf)
    categorie, rayon = _vd_category_names(product.category)
    images = list(product.images.all())
    primary = next((i for i in images if i.is_primary), images[0] if images else None)
    dessin = ''
    if primary and primary.image:
        try:
            dessin = request.build_absolute_uri(primary.image.url)
        except Exception:
            dessin = ''
    manques = []
    if not images:
        manques.append('photos')
    if not product.price_xaf:
        manques.append('prix')
    if stock <= 0:
        manques.append('stock')
    ventes, garde, litiges = _vd_offer_month_stats(product)
    attention = []
    if stock <= seuil:
        attention.append('stock_bas')
    if litiges:
        attention.append('litiges')
    return {
        'id': str(product.id),
        'ficheId': str(product.master_id) if product.master_id else None,
        'titre': product.title,
        'marque': (product.master.brand if product.master_id else '') or '',
        'variante': str(product.variant_id) if product.variant_id else '',
        'categorie': categorie,
        'rayon': rayon,
        'dessin': dessin,
        'etat': _vd_offer_etat(product),
        'etatArticle': product.condition.name if product.condition_id else '',
        'prix': product.price_xaf,
        'garde': kept,
        'stock': stock,
        'seuilAlerte': seuil,
        # Livraison/colis (délai de préparation, classe de colis, poids, dimensions, paiement au
        # retrait, Made in Cameroon) et prix automatique/plancher privé : hors du domaine confié à
        # cet agent (produits/offres/catalogue/stock/ventes flash/questions) — doc §7 "Livraison et
        # colis" couvert par un autre agent. Valeurs honnêtes (null/False), jamais inventées.
        'delaiPreparationH': None,
        'colis': None,
        'poidsKg': None,
        'dimensionsCm': None,
        'paiementAuRetrait': None,
        'madeInCameroon': False,
        'prixAuto': False,
        'plancherPrive': None,
        'photos': [_vd_serialize_photo(i, request) for i in images],
        'envoyeeA': product.created_at.isoformat() if product.created_at else None,
        'verificationAvant': None,
        'verifieeA': product.moderated_at.isoformat() if product.moderated_at else None,
        'motifRefus': product.moderation_reason or None,
        'ficheDemandee': None,
        'descriptionProposee': None,
        'dupliqueDe': None,
        'ventesCeMois': ventes,
        'gardeCeMois': garde,
        'litigesCeMois': litiges,
        'geleCeMois': None,
        'attention': attention,
        # Aucune donnée réelle de prix concurrent n'est collectée nulle part dans le système
        # (confirmé par l'audit du 12 oct.) : jamais de chiffre inventé ici.
        'concurrent': None,
        'manques': manques,
        'prixBarre': product.compare_at_price,
        'finPromo': product.promo_end_date.isoformat() if product.promo_end_date else None,
        'noteVendeur': product.seller_note or '',
        'nouveau': None,
        'historique': [],
        'majA': product.updated_at.isoformat() if product.updated_at else None,
    }


def _vd_parse_date(value):
    from datetime import datetime
    if not value:
        return None
    try:
        return datetime.fromisoformat(str(value).replace('Z', '+00:00')).date()
    except Exception:
        return None


def _vd_fallback_category():
    """Catégorie feuille active quelconque, pour amorcer un brouillon « produit nouveau » (DP-58)
    avant que le vendeur ne précise la vraie catégorie via PATCH /offers/{id} {categorie}. Trouvée
    dynamiquement (jamais un nom codé en dur) pour rester correct quel que soit le jeu de données."""
    from apps.catalog.models import Category as _Cat
    for c in _Cat.objects.filter(is_active=True, is_deprecated=False).order_by('id')[:300]:
        if not c.children.filter(deleted_at__isnull=True, is_active=True, is_deprecated=False).exists():
            return c
    return None


def _vd_fiche_dict(master, request):
    from apps.catalog.models import ModerationStatus as _MS
    variantes = list(master.variants.filter(is_active=True).values_list('id', flat=True))
    offers_qs = master.offers.filter(is_active=True, moderation_status=_MS.APPROVED)
    prices = list(offers_qs.values_list('price_xaf', flat=True))
    fourchette = [min(prices), max(prices)] if prices else None
    categorie, rayon = _vd_category_names(master.category)
    deja_vendues = list(
        Product.objects.filter(vendor=request.user, master=master).values_list('variant_id', flat=True)
    )
    part = None
    if prices:
        prix_ref = min(prices)
        kept, _c, _r = _vd_commission_kept(request.user, prix_ref)
        part = {'pourCent': round(kept / prix_ref * 100, 1) if prix_ref else 0, 'prixRef': prix_ref}
    try:
        img = master.images.filter(is_primary=True).first() or master.images.first()
        dessin = request.build_absolute_uri(img.image.url) if img and img.image else ''
    except Exception:
        dessin = ''
    return {
        'id': str(master.id),
        'titre': master.title,
        'marque': master.brand or '',
        'categorie': categorie,
        'rayon': rayon,
        'dessin': dessin,
        'variantes': [str(v) for v in variantes],
        'fourchette': fourchette,
        'vendeurs': offers_qs.values('vendor_id').distinct().count(),
        'part': part,
        'dejaVendues': [str(v) for v in deja_vendues if v],
    }


#  ── offres : réglages, catalogue, recherche, brouillon ───────────────────

@extend_schema(tags=["Vendors"], summary="Réglages de l'espace Offres (Reglages)")
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def vd_config(request):
    vp, err = _vd_active_vendor(request)
    if err:
        return err
    from apps.catalog.models import ProductCondition, Category
    from apps.orders.models import PlatformSettings
    settings_ = PlatformSettings.get_settings()
    etats = list(
        ProductCondition.objects.filter(is_active=True).order_by('display_order', 'name').values_list('name', flat=True)
    )
    categories = []
    for c in Category.objects.filter(is_active=True, is_deprecated=False).order_by('name')[:500]:
        categorie, rayon = _vd_category_names(c)
        categories.append({'categorie': categorie, 'rayon': rayon})
    return Response({
        'etats': etats,
        # delaisH/colis : domaine livraison/colis, pas construit par cet agent — placeholders
        # structurellement valides (jamais des seuils métier inventés).
        'delaisH': [24, 48, 72],
        'delaiDefautH': 24,
        'photosMin': 1,
        'photosMax': MAX_IMAGES_PER_PRODUCT,
        'photoMinPx': 0,
        'compression': {'cote': 1600, 'qualite': 80},
        'ficheDelaiH': 48,
        'fichePrioDelaiH': 24,
        'fichePrioPrix': None,
        'moderationH': 48,
        'colis': {'seuilKg': 0, 'seuilCm': 0, 'diviseur': 1, 'classes': []},
        'flash': True,
        'rappelJours': 7,
        # VD-PRIX-AUTO : valeur non confirmée par la gouvernance (§4 du doc) — 0 = désactivé,
        # jamais de pourcentage inventé.
        'prixAutoPct': 0,
        'prixMin': 500,
        'categories': categories,
        'nomMin': 3,
        'promoRemiseMin': 10,
        'promoJoursMax': 30,
        'noteMax': 2000,
        'rechercheMin': 3,
        'liberation': {
            'bronzeArgentJ': round((settings_.escrow_auto_confirm_h + settings_.escrow_release_h) / 24),
            'orPlatineJ': round((settings_.escrow_auto_confirm_h + settings_.escrow_release_h) / 24),
            'confirmationJ': round(settings_.escrow_auto_confirm_h / 24),
        },
        # versement/plafond : domaine argent, pas construit par cet agent — null, cohérent avec
        # le contrat (déjà null pour l'accès Préparation).
        'versement': None,
        'plafond': None,
    })


@extend_schema(tags=["Vendors"], summary="Catalogue — recherche (fiches + mes produits)")
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def vd_catalog_search(request):
    vp, err = _vd_active_vendor(request)
    if err:
        return err
    from apps.catalog.models import MasterProduct, ModerationStatus, ProductVariant
    from django.db.models import Q as _Q
    q = (request.query_params.get('q') or '').strip()
    code = (request.query_params.get('code') or '').strip()
    exacts, proches = [], []
    if code:
        master_ids = ProductVariant.objects.filter(
            _Q(sku=code) | _Q(barcode=code), is_active=True, moderation_status=ModerationStatus.APPROVED,
        ).values_list('master_id', flat=True)
        qs = MasterProduct.objects.filter(id__in=master_ids, moderation_status=ModerationStatus.APPROVED)
        exacts = [_vd_fiche_dict(m, request) for m in qs.select_related('category')[:20]]
    elif q:
        qs = MasterProduct.objects.filter(moderation_status=ModerationStatus.APPROVED).filter(
            _Q(title__icontains=q) | _Q(brand__icontains=q)
        ).select_related('category').order_by('title')
        fiches = [_vd_fiche_dict(m, request) for m in qs[:30]]
        ql = q.lower()
        exacts = [f for f in fiches if f['titre'].lower() == ql]
        proches = [f for f in fiches if f['titre'].lower() != ql]
    mes_produits = []
    if q:
        mes_qs = Product.objects.filter(vendor=request.user, title__icontains=q).select_related('category')[:10]
        mes_produits = [_vd_offer_dict(p, request) for p in mes_qs]
    # cherche : aucun compteur de recherche par zone n'est tracké nulle part — 0, honnête.
    return Response({'q': q, 'code': code or None, 'exacts': exacts, 'proches': proches, 'mesProduits': mes_produits, 'cherche': 0})


@extend_schema(tags=["Vendors"], summary="Catalogue — suggestion pour un produit nouveau")
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def vd_catalog_suggest(request):
    vp, err = _vd_active_vendor(request)
    if err:
        return err
    from apps.orders.models import PlatformSettings
    from apps.catalog.models import MasterProduct, ModerationStatus, Brand
    from apps.vendors.price_duplicate_checks import title_similarity_pct
    q = (request.query_params.get('q') or '').strip()
    if not q:
        return Response({'categorie': None, 'marque': None, 'description': '', 'doublon': None})
    # VD-DOUBLON (titre) : similarite reelle (normalisee), pas une simple
    # sous-chaine — a ce stade (saisie du nom) on n'a encore ni categorie ni
    # marque choisies, donc pas de filtre supplementaire possible.
    reglages = PlatformSettings.get_settings()
    seuil = float(reglages.duplicate_title_similarity_pct)
    doublon, meilleur_score = None, 0.0
    for candidat in MasterProduct.objects.filter(moderation_status=ModerationStatus.APPROVED).select_related('category')[:500]:
        score = title_similarity_pct(q, candidat.title)
        if score > meilleur_score:
            doublon, meilleur_score = candidat, score
    if meilleur_score < seuil:
        doublon = None
    brand = Brand.objects.filter(name__icontains=q).first()
    return Response({
        'categorie': doublon.category.name if doublon else None,
        'marque': brand.name if brand else None,
        # description : aucun service de génération automatique n'existe — texte vide, le
        # vendeur complète lui-même (relu par BelivaY, Q-34).
        'description': '',
        'doublon': _vd_fiche_dict(doublon, request) if doublon else None,
    })


@extend_schema(tags=["Vendors"], summary="Catalogue — fiche par code-barres")
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def vd_catalog_barcode(request, code):
    vp, err = _vd_active_vendor(request)
    if err:
        return err
    from apps.catalog.models import MasterProduct, ModerationStatus, ProductVariant
    from django.db.models import Q as _Q
    master_ids = ProductVariant.objects.filter(
        _Q(sku=code) | _Q(barcode=code), is_active=True, moderation_status=ModerationStatus.APPROVED,
    ).values_list('master_id', flat=True)
    master = MasterProduct.objects.filter(
        id__in=master_ids, moderation_status=ModerationStatus.APPROVED,
    ).select_related('category').first()
    if not master:
        return Response(status=404)
    return Response(_vd_fiche_dict(master, request))


@extend_schema(tags=["Vendors"], summary="Reconnaissance d'image (non disponible)")
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def vd_catalog_recognize(request):
    """Aucun service de reconnaissance visuelle n'existe dans le système. Liste vide (aucune
    fiche reconnue) plutôt que des résultats inventés — état honnête compatible avec le contrat
    FicheCatalogue[] sans rien casser côté écran."""
    vp, err = _vd_active_vendor(request)
    if err:
        return err
    return Response([])


@extend_schema(tags=["Vendors"], summary="Variantes d'une fiche catalogue")
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def vd_catalog_variants(request, master_id):
    vp, err = _vd_active_vendor(request)
    if err:
        return err
    from apps.catalog.models import MasterProduct
    try:
        master = MasterProduct.objects.get(pk=master_id)
    except (MasterProduct.DoesNotExist, ValueError, TypeError):
        return Response([])
    out = []
    for v in master.variants.filter(is_active=True):
        offer = Product.objects.filter(vendor=request.user, variant=v).first()
        out.append({
            'variante': str(v.id),
            'offreId': str(offer.id) if offer else None,
            'etat': _vd_offer_etat(offer) if offer else None,
        })
    return Response(out)


#  ── offres : liste, brouillon, nouveau produit, attach ───────────────────

@extend_schema(tags=["Vendors"], summary="Mes offres (liste) / commencer un brouillon depuis une fiche")
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def vd_offers_list(request):
    vp, err = _vd_active_vendor(request)
    if err:
        return err
    from django.utils import timezone

    if request.method == 'GET':
        qs = Product.objects.filter(vendor=request.user).select_related(
            'category', 'master', 'variant', 'condition',
        ).prefetch_related('images')
        produits = [_vd_offer_dict(p, request) for p in qs]
        compteurs = {'en_vente': 0, 'en_verification': 0, 'en_pause': 0, 'refusee': 0, 'brouillon': 0, 'total': 0}
        for p in produits:
            etat = p['etat']
            compteurs[etat] = compteurs.get(etat, 0) + 1
            compteurs['total'] += 1
        return Response({'compteurs': compteurs, 'produits': produits, 'luA': timezone.now().isoformat()})

    # POST — commencer() : brouillon rattaché à une fiche existante du catalogue
    from apps.catalog.models import MasterProduct, ProductVariant, ModerationStatus, Inventory
    fiche_id = request.data.get('ficheId')
    variante = request.data.get('variante')
    try:
        master = MasterProduct.objects.get(pk=fiche_id, moderation_status=ModerationStatus.APPROVED)
    except (MasterProduct.DoesNotExist, ValueError, TypeError):
        return Response({'ok': False, 'raison': 'fiche'}, status=200)
    variant_obj = None
    if variante:
        variant_obj = ProductVariant.objects.filter(pk=variante, master=master).first()
    elif master.is_mono_variant:
        variant_obj = master.get_default_variant()
    product = Product.objects.create(
        title=master.title, category=master.category, vendor=request.user,
        master=master, variant=variant_obj, price_xaf=0, is_active=False,
        moderation_status=ModerationStatus.PENDING,
    )
    Inventory.objects.create(product=product, quantity=0)
    return Response({'ok': True, 'brouillonId': str(product.id)})


@extend_schema(tags=["Vendors"], summary="Nouveau produit (absent du catalogue) — créer le brouillon")
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def vd_offers_new(request):
    vp, err = _vd_active_vendor(request)
    if err:
        return err
    nom = (request.data.get('nom') or '').strip()
    code = (request.data.get('code') or '').strip() if request.data.get('code') else ''
    if not nom:
        return Response({'ok': False, 'raison': 'recherche'}, status=200)
    from apps.catalog.models import Inventory, ModerationStatus
    category = _vd_fallback_category()
    if category is None:
        return Response({'ok': False, 'raison': 'recherche'}, status=200)
    product = Product.objects.create(
        title=nom[:200], category=category, vendor=request.user,
        price_xaf=0, is_active=False, moderation_status=ModerationStatus.PENDING,
    )
    Inventory.objects.create(product=product, quantity=0)
    if code:
        product.moderation_reason = f"[code-barres scanné : {code[:40]}]"
        product.save(update_fields=['moderation_reason'])
    return Response({'ok': True, 'brouillonId': str(product.id)})


@extend_schema(tags=["Vendors"], summary="Rattacher un brouillon à une fiche existante")
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def vd_offer_attach(request, offer_id):
    vp, err = _vd_active_vendor(request)
    if err:
        return err
    product, err2 = _vd_offer_or_404(request, offer_id)
    if err2:
        return err2
    from apps.catalog.models import MasterProduct, ModerationStatus
    try:
        master = MasterProduct.objects.get(pk=request.data.get('ficheId'), moderation_status=ModerationStatus.APPROVED)
    except (MasterProduct.DoesNotExist, ValueError, TypeError):
        return Response({'ok': False, 'raison': 'fiche'}, status=200)
    if product.moderation_status == ModerationStatus.APPROVED and product.is_active:
        return Response({'ok': False, 'raison': 'etat'}, status=200)
    product.master = master
    product.category = master.category
    product.save(update_fields=['master', 'category', 'updated_at'])
    return Response({'ok': True, 'brouillonId': str(product.id)})


@extend_schema(tags=["Vendors"], summary="Brouillon en cours (le plus récent, ou par id)")
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def vd_offers_draft(request):
    vp, err = _vd_active_vendor(request)
    if err:
        return err
    draft_id = request.query_params.get('id')
    qs = Product.objects.filter(vendor=request.user, moderation_status='PENDING', is_active=False)
    product = qs.filter(pk=draft_id).first() if draft_id else qs.order_by('-created_at').first()
    if not product:
        return Response(status=404)
    return Response(_vd_offer_dict(product, request))


@extend_schema(tags=["Vendors"], summary="Export CSV de mes offres")
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def vd_offers_export(request):
    vp, err = _vd_active_vendor(request)
    if err:
        return err
    import csv, io
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(['id', 'produit', 'variante', 'etat', 'prix', 'stock', 'seuil'])
    for p in Product.objects.filter(vendor=request.user).select_related('variant'):
        try:
            stock = p.inventory.quantity
        except Exception:
            stock = 0
        writer.writerow([p.id, p.title, p.variant_id or '', _vd_offer_etat(p), p.price_xaf, stock, p.get_effective_stock_threshold()])
    return HttpResponse(buf.getvalue(), content_type='text/csv; charset=utf-8')


@extend_schema(tags=["Vendors"], summary="Import CSV de mes offres (prix/stock)")
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def vd_offers_import(request):
    vp, err = _vd_active_vendor(request)
    if err:
        return err
    csv_text = request.data.get('csv')
    if not csv_text or not str(csv_text).strip():
        return Response({'ok': False, 'raison': 'vide'}, status=200)
    import csv, io
    from apps.catalog.models import Inventory
    try:
        reader = csv.DictReader(io.StringIO(csv_text))
        lignes, ignorees = 0, 0
        for row in reader:
            offer_id = row.get('id')
            product = Product.objects.filter(pk=offer_id, vendor=request.user).first() if offer_id else None
            if not product:
                ignorees += 1
                continue
            prix = row.get('prix')
            if prix:
                try:
                    prix = int(prix)
                except ValueError:
                    prix = None
                if prix is not None:
                    from apps.catalog.regles_catalogue import prix_minimum
                    if prix < prix_minimum():  # R19.1 : la ligne n'est pas appliquée
                        ignorees += 1
                        continue
                    product.price_xaf = prix
            product.save()
            stock = row.get('stock')
            if stock is not None and str(stock) != '':
                try:
                    inv, _created = Inventory.objects.get_or_create(product=product)
                    inv.quantity = int(stock)
                    inv.save()
                except ValueError:
                    pass
            lignes += 1
        return Response({'ok': True, 'lignes': lignes, 'ignorees': ignorees})
    except Exception:
        return Response({'ok': False, 'raison': 'format'}, status=200)


#  ── offres : détail, modification, suppression, actions ──────────────────

@extend_schema(tags=["Vendors"], summary="Offre — détail (GET), modification (PATCH), réglages (PUT), suppression (DELETE)")
@api_view(['GET', 'PATCH', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def vd_offer_detail(request, offer_id):
    vp, err = _vd_active_vendor(request)
    if err:
        return err
    try:
        product = Product.all_objects.get(pk=offer_id, vendor=request.user)
    except (Product.DoesNotExist, ValueError, TypeError):
        return Response(status=404)

    if request.method == 'GET':
        return Response(_vd_offer_dict(product, request))

    if request.method == 'DELETE':
        if product.is_active and product.moderation_status == 'APPROVED':
            return Response({'ok': False, 'raison': 'etat'}, status=200)
        product.delete()
        return Response({'ok': True})

    if request.method == 'PUT':
        # regler() : paiementAuRetrait/prixAuto/plancherPrive sont du domaine livraison/colis
        # (hors scope, acceptés sans effet) ; seuilAlerte est mon domaine (stock_threshold).
        data = request.data
        if 'seuilAlerte' in data:
            try:
                seuil = int(data['seuilAlerte'])
                if seuil < 0:
                    raise ValueError
                product.stock_threshold = seuil
                product.save(update_fields=['stock_threshold', 'updated_at'])
            except (TypeError, ValueError):
                return Response({'ok': False, 'raison': 'seuil'}, status=200)
        return Response({'ok': True, 'produit': _vd_offer_dict(product, request)})

    # PATCH — modifier() : ChampsBrouillon
    data = request.data
    if 'titre' in data:
        titre = (data['titre'] or '').strip()
        if not titre:
            return Response({'ok': False, 'raison': 'nom'}, status=200)
        product.title = titre[:200]
    if 'description' in data:
        product.description = data['description'] or ''
    if 'noteVendeur' in data:
        product.seller_note = (data['noteVendeur'] or '')[:2000]
    if 'prix' in data and data['prix'] is not None:
        try:
            prix = int(data['prix'])
            if prix < 0:
                raise ValueError
        except (TypeError, ValueError):
            return Response({'ok': False, 'raison': 'prix'}, status=200)
        from apps.catalog.regles_catalogue import prix_minimum
        if prix < prix_minimum():  # R19.1
            return Response({'ok': False, 'raison': 'prix_minimum'}, status=200)
        product.price_xaf = prix
    if 'prixBarre' in data:
        pb = data['prixBarre']
        if pb is not None:
            try:
                pb = int(pb)
            except (TypeError, ValueError):
                return Response({'ok': False, 'raison': 'promo'}, status=200)
            if pb <= product.price_xaf:
                return Response({'ok': False, 'raison': 'promo'}, status=200)
        product.compare_at_price = pb
    if 'finPromo' in data:
        product.promo_end_date = _vd_parse_date(data['finPromo']) if data['finPromo'] else None
    if 'seuilAlerte' in data and data['seuilAlerte'] is not None:
        try:
            product.stock_threshold = int(data['seuilAlerte'])
        except (TypeError, ValueError):
            return Response({'ok': False, 'raison': 'seuil'}, status=200)
    if 'stock' in data and data['stock'] is not None:
        try:
            qte = int(data['stock'])
            if qte < 0:
                raise ValueError
        except (TypeError, ValueError):
            return Response({'ok': False, 'raison': 'stock'}, status=200)
        from apps.catalog.models import Inventory
        inv, _created = Inventory.objects.get_or_create(product=product)
        inv.quantity = qte
        inv.save(update_fields=['quantity', 'updated_at'])
    if data.get('etatArticle'):
        from apps.catalog.models import ProductCondition
        cond = ProductCondition.objects.filter(name__iexact=data['etatArticle']).first()
        if cond is None:
            return Response({'ok': False, 'raison': 'categorie'}, status=200)
        product.condition = cond
    if data.get('categorie'):
        from apps.catalog.models import Category
        cat = Category.objects.filter(name__iexact=data['categorie'], is_active=True).first()
        if cat is None:
            return Response({'ok': False, 'raison': 'categorie'}, status=200)
        product.category = cat
    if data.get('marque') and product.master_id:
        product.master.brand = data['marque'][:120]
        product.master.save(update_fields=['brand'])
    try:
        product.save()
    except Exception:
        return Response({'ok': False, 'raison': 'description'}, status=200)
    return Response({'ok': True, 'produit': _vd_offer_dict(product, request)})


@extend_schema(tags=["Vendors"], summary="Annuler la suppression d'un brouillon")
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def vd_offer_restore(request, offer_id):
    vp, err = _vd_active_vendor(request)
    if err:
        return err
    try:
        product = Product.all_objects.get(pk=offer_id, vendor=request.user)
    except (Product.DoesNotExist, ValueError, TypeError):
        return Response(status=404)
    product.restore()
    return Response(status=204)


@extend_schema(tags=["Vendors"], summary="Mettre en pause / reprendre une offre")
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def vd_offer_pause(request, offer_id):
    vp, err = _vd_active_vendor(request)
    if err:
        return err
    product, err2 = _vd_offer_or_404(request, offer_id)
    if err2:
        return err2
    product.is_active = not bool(request.data.get('enPause'))
    product.save(update_fields=['is_active', 'updated_at'])
    return Response(_vd_offer_dict(product, request))


@extend_schema(tags=["Vendors"], summary="Stock rapide d'une offre")
@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def vd_offer_stock(request, offer_id):
    vp, err = _vd_active_vendor(request)
    if err:
        return err
    product, err2 = _vd_offer_or_404(request, offer_id)
    if err2:
        return err2
    try:
        qte = int(request.data.get('stock'))
        if qte < 0:
            raise ValueError
    except (TypeError, ValueError):
        return Response({'ok': False, 'raison': 'stock'}, status=200)
    from apps.catalog.models import Inventory
    inv, _created = Inventory.objects.get_or_create(product=product)
    inv.quantity = qte
    inv.save(update_fields=['quantity', 'updated_at'])
    return Response({'ok': True, 'produit': _vd_offer_dict(product, request)})


@extend_schema(tags=["Vendors"], summary="Dupliquer une offre pour une autre variante")
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def vd_offer_duplicate(request, offer_id):
    vp, err = _vd_active_vendor(request)
    if err:
        return err
    product, err2 = _vd_offer_or_404(request, offer_id)
    if err2:
        return err2
    from apps.catalog.models import Inventory
    copy = Product.objects.create(
        title=f"Copie de {product.title}", description=product.description,
        short_description=product.short_description, price_xaf=product.price_xaf,
        compare_at_price=product.compare_at_price, stock_threshold=product.stock_threshold,
        is_active=False, category=product.category, vendor=request.user,
        master=product.master, condition=product.condition, moderation_status='PENDING',
    )
    Inventory.objects.create(product=copy, quantity=0)
    return Response({'ok': True, 'brouillonId': str(copy.id), 'rattache': bool(product.master_id)})


#  ── offres : photos ────────────────────────────────────────────────────────

@extend_schema(tags=["Vendors"], summary="Photos d'une offre : lister (GET), ajouter (POST), ordonner (PUT)")
@api_view(['GET', 'POST', 'PUT'])
@permission_classes([IsAuthenticated])
def vd_offer_photos(request, offer_id):
    vp, err = _vd_active_vendor(request)
    if err:
        return err
    product, err2 = _vd_offer_or_404(request, offer_id)
    if err2:
        return err2

    if request.method == 'GET':
        return Response([_vd_serialize_photo(i, request) for i in product.images.all()])

    if request.method == 'PUT':
        ids = request.data.get('ids') or []
        for idx, pid in enumerate(ids):
            try:
                pid_int = int(pid)
            except (TypeError, ValueError):
                continue
            product.images.filter(pk=pid_int).update(order=idx, is_primary=(idx == 0))
        return Response(status=204)

    # POST — ajouterPhoto() : PhotoPrise (image en data: URI, prise sur l'appareil)
    image_str = request.data.get('image') or ''
    if product.images.count() >= MAX_IMAGES_PER_PRODUCT:
        return Response({'ok': False, 'raison': 'max'}, status=200)
    content = None
    if isinstance(image_str, str) and image_str.startswith('data:'):
        try:
            import base64
            import time
            from django.core.files.base import ContentFile
            header, b64data = image_str.split(',', 1)
            ext = 'jpg'
            if 'png' in header:
                ext = 'png'
            elif 'webp' in header:
                ext = 'webp'
            raw = base64.b64decode(b64data)
            if len(raw) > MAX_IMAGE_SIZE_BYTES:
                return Response({'ok': False, 'raison': 'petite'}, status=200)
            content = ContentFile(raw, name=f"offre-{product.id}-{int(time.time() * 1000)}.{ext}")
        except Exception:
            return Response({'ok': False, 'raison': 'petite'}, status=200)
    if content is None:
        return Response({'ok': False, 'raison': 'petite'}, status=200)
    img = ProductImage.objects.create(product=product, image=content)
    return Response({'ok': True, 'photo': _vd_serialize_photo(img, request), 'nombre': product.images.count()})


@extend_schema(tags=["Vendors"], summary="Retirer une photo d'une offre")
@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def vd_offer_photo_delete(request, offer_id, photo_id):
    vp, err = _vd_active_vendor(request)
    if err:
        return err
    product, err2 = _vd_offer_or_404(request, offer_id)
    if err2:
        return err2
    product.images.filter(pk=photo_id).delete()
    return Response(status=204)


#  ── offres : prix, conseil, publication, description ──────────────────────

@extend_schema(tags=["Vendors"], summary="Aperçu « vous gardez » (Apercu) à un prix donné")
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def vd_offers_quote(request):
    vp, err = _vd_active_vendor(request)
    if err:
        return err
    try:
        prix = int(request.query_params.get('prix'))
        if prix < 0:
            raise ValueError
    except (TypeError, ValueError):
        return Response({'detail': 'Paramètre "prix" requis (entier).'}, status=400)
    offre_id = request.query_params.get('offre')
    product = Product.objects.filter(pk=offre_id, vendor=request.user).first() if offre_id else None
    # Réglages de l'admin (spécification v2.1) : prix minimum publiable (R19.1), commission minimale
    # (R19.2), seuil et points « petit prix » (R17.1).
    from apps.regles import services as regles
    MINIMUM = regles.reglage('r_prix_min_publiable')
    COMMISSION_MIN = regles.reglage('r_com_min')
    SEUIL_PETIT_PRIX = regles.reglage('r_petit_prix')
    POINTS_PETIT_PRIX = regles.reglage('r_pts_petit_prix')
    if prix < MINIMUM:
        return Response({
            'prix': prix, 'garde': None, 'partPourCent': None,
            'petitPrix': prix < SEUIL_PETIT_PRIX, 'points': 0,
            'minimum': MINIMUM, 'plagesMinimale': [], 'commissionMinimale': COMMISSION_MIN,
            'seuilPetitPrix': SEUIL_PETIT_PRIX, 'plafond': None, 'refus': 'minimum',
        })
    vendor = product.vendor if product else request.user
    garde, _commission, _rate = _vd_commission_kept(vendor, prix)
    part = round(garde / prix * 100, 1) if prix else None
    return Response({
        'prix': prix, 'garde': garde, 'partPourCent': part,
        'petitPrix': prix < SEUIL_PETIT_PRIX, 'points': POINTS_PETIT_PRIX if prix < SEUIL_PETIT_PRIX else 0,
        'minimum': MINIMUM, 'plagesMinimale': [], 'commissionMinimale': COMMISSION_MIN,
        'seuilPetitPrix': SEUIL_PETIT_PRIX, 'plafond': None, 'refus': None,
    })


@extend_schema(tags=["Vendors"], summary="Prix conseillé (VD-CONSEIL-PRIX — fondé sur les autres offres BelivaY, jamais la concurrence externe)")
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def vd_offer_price_advice(request, offer_id):
    """
    Decision produit (12 oct.) : pas de conseil fonde sur la concurrence
    exterieure (conditions d'utilisation, maintenance, fiabilite des
    donnees) et pas de structure vide non plus. BelivaY a ses propres
    donnees : les AUTRES offres actives sur la MEME fiche produit.

    Formule (deja ecrite dans le contrat TypeScript du prototype, DP-56/Q-36) :
    conseille = mediane - 100 F, jamais sous le 10e centile du marche, jamais
    au-dessus du prix tape. Sous le seuil PlatformSettings.price_anomaly_min_offers
    (3 par defaut), pas assez d'offres pour un conseil fiable -> 404, que le
    connecteur frontend (ouNull) traduit en `null` (etat honnete deja prevu
    par le contrat `Conseil | null`), exactement comme l'ecran se comporte
    deja aujourd'hui.

    Pas de rang affiche (« vous etes 2e ») : decision produit explicite, la
    distance de livraison compte dans le choix de la meilleure offre, le
    rang changerait d'un client a l'autre.
    """
    import statistics

    from apps.orders.models import PlatformSettings
    from apps.catalog.models import ModerationStatus

    vp, err = _vd_active_vendor(request)
    if err:
        return err
    product, err2 = _vd_offer_or_404(request, offer_id)
    if err2:
        return err2
    try:
        prix_saisi = int(request.query_params.get('prix') or product.price_xaf or 0)
    except (TypeError, ValueError):
        prix_saisi = product.price_xaf or 0

    reglages = PlatformSettings.get_settings()
    if not product.master_id or not prix_saisi:
        return Response(status=404)

    autres_prix = list(
        Product.objects.filter(
            master_id=product.master_id, is_active=True,
            moderation_status=ModerationStatus.APPROVED,
        ).exclude(pk=product.pk).exclude(price_xaf=0)
        .values_list('price_xaf', flat=True)
    )
    if len(autres_prix) < reglages.price_anomaly_min_offers:
        return Response(status=404)

    autres_prix_tries = sorted(autres_prix)
    mediane = statistics.median(autres_prix_tries)
    p10 = (
        statistics.quantiles(autres_prix_tries, n=10)[0]
        if len(autres_prix_tries) >= 2 else autres_prix_tries[0]
    )
    conseille = int(mediane) - 100
    conseille = max(conseille, int(p10))
    conseille = min(conseille, prix_saisi)
    conseille = max(conseille, 0)

    garde_conseille, _commission, _rate = _vd_commission_kept(product.vendor, conseille)
    part_conseille = round(garde_conseille / conseille * 100, 1) if conseille else 0.0
    moins_cher = min(autres_prix_tries)
    economie_client = max(0, moins_cher - conseille)

    return Response({
        'prixSaisi': prix_saisi,
        'conseille': conseille,
        'gardeConseille': garde_conseille,
        'partConseille': part_conseille,
        # Pas de classement par zone : decision produit (12 oct.), la distance de
        # livraison influence le choix du client, le rang ne serait pas stable.
        'zones': [],
        'marche': {'nombre': len(autres_prix_tries), 'min': autres_prix_tries[0], 'max': autres_prix_tries[-1]},
        'economieClient': economie_client,
        # Aucun suivi d'audience/analytics de commandes par offre n'existe dans le
        # systeme : honnete a zero plutot qu'un chiffre d'exemple invente.
        'clientsSemaine': 0,
        'commandesAuxMoinsChers': [0, 0],
        'dejaLeMoinsCher': prix_saisi <= moins_cher,
    })


@extend_schema(tags=["Vendors"], summary="Publier une offre")
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def vd_offer_publish(request, offer_id):
    from apps.orders.models import PlatformSettings
    from apps.vendors.price_duplicate_checks import (
        apply_duplicate_flag, apply_price_flag, check_cross_vendor_duplicate_fiche,
        check_price_anomaly, check_same_vendor_duplicate,
    )

    vp, err = _vd_active_vendor(request)
    if err:
        return err

    # ── Tache D19 ────────────────────────────────────────────────────────
    # « Refuser la publication cote serveur tant que la piece n'est pas
    # verifiee. » Cote serveur, et pas seulement dans l'ecran : masquer le
    # bouton ne protege de rien, un appel direct publierait quand meme.
    #
    # Meme forme de reponse que les autres refus metier de cet endpoint
    # (ok/raison/detail) : l'ecran sait deja l'afficher, et le detail dit au
    # vendeur quelles pieces fournir ou refaire.
    from apps.vendors.kyc import etat_verification, identite_verifiee
    if not identite_verifiee(request.user):
        return Response({
            'ok': False,
            'raison': 'identite_non_verifiee',
            'detail': etat_verification(request.user),
        }, status=200)

    product, err2 = _vd_offer_or_404(request, offer_id)
    if err2:
        return err2
    d = _vd_offer_dict(product, request)
    if d['manques']:
        raison = {'photos': 'photos', 'prix': 'prix', 'stock': 'stock'}.get(d['manques'][0], 'etat')
        return Response({'ok': False, 'raison': raison}, status=200)

    reglages = PlatformSettings.get_settings()
    confirme = bool(request.data.get('confirmer'))

    # VD-DOUBLON, cas (1) : le MEME vendeur publie-t-il deja un produit quasi
    # identique ? Univoque, toujours bloquant.
    doublon_vendeur = check_same_vendor_duplicate(product, reglages)
    if doublon_vendeur is not None:
        return Response({
            'ok': False, 'raison': 'doublon_vendeur',
            'detail': {'offreExistanteId': str(doublon_vendeur.id), 'titre': doublon_vendeur.title},
        }, status=200)

    # VD-PRIX-ANORMAL, a la publication (prix initial).
    anomalie = None
    if product.price_xaf:
        anomalie = check_price_anomaly(product, product.price_xaf, reglages)
    if anomalie and anomalie['niveau'] == 'bloque' and not confirme:
        return Response({'ok': False, 'raison': 'prix_anormal', 'detail': anomalie}, status=200)

    # VD-DOUBLON, cas (2) : fiche d'un AUTRE vendeur deja existante ?
    # 'certain' -> rattachement silencieux (Publication.rattache, FCH-02).
    # 'probable' -> signalement admin seulement, jamais bloquant.
    if product.master_id is None:
        niveau_doublon, master_trouve = check_cross_vendor_duplicate_fiche(
            product, product.title, product.category, reglages,
        )
        if niveau_doublon == 'certain' and master_trouve is not None:
            product.master = master_trouve
            product.category = master_trouve.category
            product.save(update_fields=['master', 'category', 'updated_at'])
        elif niveau_doublon == 'probable' and master_trouve is not None:
            apply_duplicate_flag(product, master_trouve)

    hors_ligne = bool(request.data.get('horsLigne'))
    product.is_active = not hors_ligne
    deja_approuve = bool(product.master_id and product.master.moderation_status == 'APPROVED')
    product.moderation_status = 'APPROVED' if deja_approuve else 'PENDING'
    product.save(update_fields=['is_active', 'moderation_status', 'updated_at'])

    if anomalie:
        apply_price_flag(product, anomalie)

    publication = _vd_publication_dict(product)
    return Response({'ok': True, **publication})


def _vd_publication_dict(product):
    from django.utils import timezone
    return {
        'offreId': str(product.id), 'titre': product.title,
        'variante': str(product.variant_id) if product.variant_id else '',
        'prix': product.price_xaf,
        'reponseAvant': (timezone.now() + timezone.timedelta(hours=48)).isoformat(),
        'meilleurPrix': False, 'zonesPremier': 0, 'zones': 0, 'avantages': [],
        'enFile': False, 'nouveau': product.master_id is None, 'rattache': bool(product.master_id),
    }


@extend_schema(tags=["Vendors"], summary="Changer le prix d'une offre déjà en vente")
@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def vd_offer_price(request, offer_id):
    from apps.orders.models import PlatformSettings
    from apps.vendors.price_duplicate_checks import apply_price_flag, check_price_anomaly

    vp, err = _vd_active_vendor(request)
    if err:
        return err
    product, err2 = _vd_offer_or_404(request, offer_id)
    if err2:
        return err2
    try:
        prix = int(request.data.get('prix'))
        if prix < 0:
            raise ValueError
    except (TypeError, ValueError):
        return Response({'ok': False, 'raison': 'prix'}, status=200)
    from apps.catalog.regles_catalogue import prix_minimum
    if prix < prix_minimum():  # R19.1
        return Response({'ok': False, 'raison': 'prix_minimum'}, status=200)

    confirme = bool(request.data.get('confirmer'))
    reglages = PlatformSettings.get_settings()
    anomalie = check_price_anomaly(product, prix, reglages)
    if anomalie and anomalie['niveau'] in ('bloque', 'confirmation') and not confirme:
        return Response({'ok': False, 'raison': 'prix_anormal', 'detail': anomalie}, status=200)

    rester = bool(request.data.get('rester'))
    product.price_xaf = prix
    if not rester:
        product.is_active = True
    product.save(update_fields=['price_xaf', 'is_active', 'updated_at'])
    if anomalie:
        apply_price_flag(product, anomalie)
    return Response({'ok': True, 'produit': _vd_offer_dict(product, request)})


@extend_schema(tags=["Vendors"], summary="Publication en cours (par offre, ou la plus récente)")
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def vd_offer_publication(request, offer_id=None):
    vp, err = _vd_active_vendor(request)
    if err:
        return err
    if offer_id:
        product = Product.objects.filter(pk=offer_id, vendor=request.user).first()
    else:
        product = Product.objects.filter(vendor=request.user, is_active=True).order_by('-updated_at').first()
    if not product:
        return Response(status=404)
    return Response(_vd_publication_dict(product))


@extend_schema(tags=["Vendors"], summary="Proposer une correction de la fiche (relue par BelivaY)")
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def vd_offer_description_proposal(request, offer_id):
    vp, err = _vd_active_vendor(request)
    if err:
        return err
    product, err2 = _vd_offer_or_404(request, offer_id)
    if err2:
        return err2
    texte = (request.data.get('texte') or '').strip()
    if len(texte) < 10:
        return Response({'ok': False, 'raison': 'court'}, status=200)
    if len(texte) > 2000:
        return Response({'ok': False, 'raison': 'long'}, status=200)
    import re
    if re.search(r'\d{8,}', texte) or '@' in texte:
        return Response({'ok': False, 'raison': 'coordonnees'}, status=200)
    from django.utils import timezone
    # Pas de file de modération dédiée construite dans cette vague (VD-FICHE-DELAI non confirmé
    # par la gouvernance) : trace minimale dans moderation_reason, en attente de relecture BelivaY.
    product.moderation_reason = f"[Proposition de description en attente de relecture] {texte}"
    product.save(update_fields=['moderation_reason', 'updated_at'])
    reponse_avant = timezone.now() + timezone.timedelta(hours=48)
    return Response({'ok': True, 'reponseAvant': reponse_avant.isoformat()})


#  ── stock (AJ-A) ────────────────────────────────────────────────────────────

@extend_schema(tags=["Vendors"], summary="Stock de mes offres")
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def vd_stock_list(request):
    vp, err = _vd_active_vendor(request)
    if err:
        return err
    out = []
    for p in Product.objects.filter(vendor=request.user).select_related('category'):
        try:
            qty = p.inventory.quantity
        except Exception:
            qty = 0
        seuil = p.get_effective_stock_threshold()
        out.append({
            'offreId': str(p.id), 'titre': p.title, 'sku': p.sku,
            'stock': qty, 'seuilAlerte': seuil, 'stockBas': qty <= seuil,
            'prix': p.price_xaf, 'etat': _vd_offer_etat(p),
            'majA': p.updated_at.isoformat() if p.updated_at else None,
        })
    return Response({'produits': out, 'total': len(out)})


@extend_schema(tags=["Vendors"], summary="Historique des mouvements de stock")
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def vd_stock_movements(request):
    vp, err = _vd_active_vendor(request)
    if err:
        return err
    from apps.catalog.models import StockMovement
    offer_id = request.query_params.get('offre')
    qs = StockMovement.objects.filter(product__vendor=request.user).select_related('product', 'created_by')
    if offer_id:
        qs = qs.filter(product_id=offer_id)
    qs = qs.order_by('-created_at')[:200]
    data = [{
        'id': str(m.id), 'offreId': str(m.product_id), 'produit': m.product.title,
        'delta': m.delta, 'stockApres': m.quantity_after, 'motif': m.reason,
        'note': m.note, 'par': m.created_by.get_username() if m.created_by else None,
        'a': m.created_at.isoformat(),
    } for m in qs]
    return Response({'mouvements': data, 'total': len(data)})


@extend_schema(tags=["Vendors"], summary="Export CSV du stock")
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def vd_stock_export(request):
    vp, err = _vd_active_vendor(request)
    if err:
        return err
    import csv, io
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(['id', 'produit', 'sku', 'stock', 'seuil', 'prix'])
    for p in Product.objects.filter(vendor=request.user):
        try:
            qty = p.inventory.quantity
        except Exception:
            qty = 0
        writer.writerow([p.id, p.title, p.sku, qty, p.get_effective_stock_threshold(), p.price_xaf])
    return HttpResponse(buf.getvalue(), content_type='text/csv; charset=utf-8')


@extend_schema(tags=["Vendors"], summary="Ajuster le stock d'une offre (avec historique)")
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def vd_stock_adjust(request, offer_id):
    vp, err = _vd_active_vendor(request)
    if err:
        return err
    product, err2 = _vd_offer_or_404(request, offer_id)
    if err2:
        return err2
    from apps.catalog.models import Inventory, StockMovement
    inv, _created = Inventory.objects.get_or_create(product=product)
    delta_raw = request.data.get('delta')
    quantite_raw = request.data.get('quantite')
    motif = request.data.get('motif') or StockMovement.Reason.ADJUSTMENT
    note = (request.data.get('note') or '')[:255]
    try:
        if delta_raw is not None:
            delta = int(delta_raw)
            new_qty = inv.quantity + delta
        elif quantite_raw is not None:
            new_qty = int(quantite_raw)
            delta = new_qty - inv.quantity
        else:
            return Response({'detail': 'Fournir "delta" ou "quantite".'}, status=400)
    except (TypeError, ValueError):
        return Response({'detail': 'Valeur de stock invalide.'}, status=400)
    if new_qty < 0:
        return Response({'ok': False, 'raison': 'negatif'}, status=200)
    if motif not in StockMovement.Reason.values:
        motif = StockMovement.Reason.ADJUSTMENT
    with transaction.atomic():
        inv.quantity = new_qty
        inv.save(update_fields=['quantity', 'updated_at'])
        mv = StockMovement.objects.create(
            product=product, delta=delta, quantity_after=new_qty,
            reason=motif, note=note, created_by=request.user,
        )
    return Response({'ok': True, 'stock': new_qty, 'mouvementId': str(mv.id)})


@extend_schema(tags=["Vendors"], summary="Seuil d'alerte stock d'une offre")
@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def vd_stock_threshold(request, offer_id):
    vp, err = _vd_active_vendor(request)
    if err:
        return err
    product, err2 = _vd_offer_or_404(request, offer_id)
    if err2:
        return err2
    seuil = request.data.get('seuil')
    try:
        product.stock_threshold = int(seuil) if seuil is not None else None
    except (TypeError, ValueError):
        return Response({'detail': 'Seuil invalide.'}, status=400)
    product.save(update_fields=['stock_threshold', 'updated_at'])
    return Response({'ok': True, 'seuilAlerte': product.get_effective_stock_threshold()})


#  ── ventes flash / promotions ───────────────────────────────────────────────

@extend_schema(tags=["Vendors"], summary="Mes campagnes promo/flash (GET) / en créer une (POST)")
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def vd_promotions_list_create(request):
    vp, err = _vd_active_vendor(request)
    if err:
        return err
    from apps.catalog.models import PromotionCampaign
    from apps.catalog.serializers import PromotionCampaignSerializer
    if request.method == 'GET':
        qs = PromotionCampaign.objects.filter(product__vendor=request.user).select_related('product').order_by('-created_at')
        status_filter = request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter.upper())
        origin_filter = request.query_params.get('origin')
        if origin_filter:
            qs = qs.filter(origin=origin_filter)
        return Response(PromotionCampaignSerializer(qs, many=True, context={'request': request}).data)
    serializer = PromotionCampaignSerializer(data=request.data, context={'request': request})
    serializer.is_valid(raise_exception=True)
    campaign = serializer.save()  # origin par défaut = seller (modèle) : c'est bien ce qu'on veut ici
    return Response(PromotionCampaignSerializer(campaign, context={'request': request}).data, status=201)


@extend_schema(tags=["Vendors"], summary="Règles des ventes flash (durée, remise, stock minimum)")
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def vd_promotions_rules(request):
    vp, err = _vd_active_vendor(request)
    if err:
        return err
    # Reprises telles quelles de la validation déjà verrouillée (PromotionCampaign.clean() /
    # PromotionCampaignSerializer.validate()) — jamais un nouveau barème inventé ici.
    return Response({
        'dureeHMin': 2, 'dureeHMax': 48,
        'remisePctMin': 15, 'remisePctMax': 70,
        'stockReserveMin': 5,
        'commissionUpliftFlash': 5,
    })


@extend_schema(tags=["Vendors"], summary="Offres éligibles à une vente flash")
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def vd_promotions_offers(request):
    vp, err = _vd_active_vendor(request)
    if err:
        return err
    qs = Product.objects.filter(vendor=request.user, is_active=True, moderation_status='APPROVED')
    return Response([{'id': str(p.id), 'titre': p.title, 'prix': p.price_xaf} for p in qs])


@extend_schema(tags=["Vendors"], summary="Simuler une vente flash avant de la créer")
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def vd_promotions_quote(request):
    vp, err = _vd_active_vendor(request)
    if err:
        return err
    product_id = request.data.get('offreId') or request.data.get('product')
    product = Product.objects.filter(pk=product_id, vendor=request.user).first()
    if not product:
        return Response({'detail': 'Offre introuvable.'}, status=404)
    try:
        promo_price = int(request.data.get('prixPromo') or request.data.get('promo_price_xaf'))
    except (TypeError, ValueError):
        return Response({'detail': 'Prix promo invalide.'}, status=400)
    reference = product.price_xaf
    if reference <= promo_price:
        return Response({'ok': False, 'raison': 'prix'}, status=200)
    remise_pct = round((1 - promo_price / reference) * 100, 1)
    garde, commission, _rate = _vd_commission_kept(product.vendor, promo_price)
    return Response({
        'ok': True, 'prixReference': reference, 'prixPromo': promo_price,
        'remisePourCent': remise_pct, 'garde': garde, 'commission': commission,
        'remiseValide': 15 <= remise_pct <= 70,
    })


@extend_schema(tags=["Vendors"], summary="Arrêter une vente flash/promotion")
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def vd_promotions_stop(request, promo_id):
    vp, err = _vd_active_vendor(request)
    if err:
        return err
    from apps.catalog.models import PromotionCampaign
    try:
        campaign = PromotionCampaign.objects.get(pk=promo_id, product__vendor=request.user)
    except (PromotionCampaign.DoesNotExist, ValueError, TypeError):
        return Response(status=404)
    if campaign.status not in (PromotionCampaign.Status.APPROVED, PromotionCampaign.Status.PENDING):
        return Response({'ok': False, 'raison': 'etat'}, status=200)
    campaign.status = PromotionCampaign.Status.SUSPENDED
    campaign.save(update_fields=['status', 'updated_at'])
    from apps.catalog.serializers import PromotionCampaignSerializer
    return Response({'ok': True, 'campagne': PromotionCampaignSerializer(campaign, context={'request': request}).data})


#  ── questions clients ────────────────────────────────────────────────────

def _vd_question_dict(q):
    return {
        'id': str(q.id), 'offreId': str(q.product_id), 'produit': q.product.title,
        'texte': q.text, 'reponse': q.answer_text or None,
        'repondueA': q.answered_at.isoformat() if q.answered_at else None,
        'signalee': q.is_reported, 'motifSignalement': q.report_reason or None,
        'creeA': q.created_at.isoformat(),
    }


@extend_schema(tags=["Vendors"], summary="Questions clients sur mes offres")
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def vd_questions_list(request):
    vp, err = _vd_active_vendor(request)
    if err:
        return err
    from apps.catalog.models import ProductQuestion
    qs = ProductQuestion.objects.filter(product__vendor=request.user).select_related('product').order_by('-created_at')[:200]
    return Response({'questions': [_vd_question_dict(q) for q in qs], 'total': qs.count() if hasattr(qs, 'count') else len(qs)})


@extend_schema(tags=["Vendors"], summary="Filtrer les questions clients")
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def vd_questions_filter(request):
    vp, err = _vd_active_vendor(request)
    if err:
        return err
    from apps.catalog.models import ProductQuestion
    qs = ProductQuestion.objects.filter(product__vendor=request.user).select_related('product')
    etat = request.data.get('etat')
    if etat == 'en_attente':
        qs = qs.filter(answered_at__isnull=True)
    elif etat == 'repondue':
        qs = qs.filter(answered_at__isnull=False)
    elif etat == 'signalee':
        qs = qs.filter(is_reported=True)
    offre_id = request.data.get('offreId')
    if offre_id:
        qs = qs.filter(product_id=offre_id)
    qs = list(qs.order_by('-created_at')[:200])
    return Response({'questions': [_vd_question_dict(q) for q in qs], 'total': len(qs)})


@extend_schema(tags=["Vendors"], summary="Répondre à une question client")
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def vd_question_answer(request, question_id):
    vp, err = _vd_active_vendor(request)
    if err:
        return err
    from apps.catalog.models import ProductQuestion
    try:
        q = ProductQuestion.objects.get(pk=question_id, product__vendor=request.user)
    except (ProductQuestion.DoesNotExist, ValueError, TypeError):
        return Response(status=404)
    texte = (request.data.get('reponse') or request.data.get('texte') or '').strip()
    if not texte:
        return Response({'ok': False, 'raison': 'vide'}, status=200)
    from django.utils import timezone
    q.answer_text = texte[:2000]
    q.answered_at = timezone.now()
    q.answered_by = request.user
    q.save(update_fields=['answer_text', 'answered_at', 'answered_by'])
    return Response({'ok': True, 'question': _vd_question_dict(q)})


@extend_schema(tags=["Vendors"], summary="Signaler une question client (abus)")
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def vd_question_report(request, question_id):
    vp, err = _vd_active_vendor(request)
    if err:
        return err
    from apps.catalog.models import ProductQuestion
    try:
        q = ProductQuestion.objects.get(pk=question_id, product__vendor=request.user)
    except (ProductQuestion.DoesNotExist, ValueError, TypeError):
        return Response(status=404)
    from django.utils import timezone
    q.is_reported = True
    q.report_reason = (request.data.get('motif') or '')[:255]
    q.reported_at = timezone.now()
    q.save(update_fields=['is_reported', 'report_reason', 'reported_at'])
    return Response({'ok': True, 'question': _vd_question_dict(q)})


@extend_schema(tags=["Vendors"], summary="Modèles de réponse (questions clients) — lister / créer")
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def vd_questions_templates(request):
    vp, err = _vd_active_vendor(request)
    if err:
        return err
    from apps.catalog.models import VendorQuestionTemplate
    if request.method == 'GET':
        qs = VendorQuestionTemplate.objects.filter(vendor=request.user).order_by('-created_at')
        return Response([{'id': str(t.id), 'texte': t.text, 'creeA': t.created_at.isoformat()} for t in qs])
    texte = (request.data.get('texte') or '').strip()
    if not texte:
        return Response({'detail': 'Champ "texte" requis.'}, status=400)
    t = VendorQuestionTemplate.objects.create(vendor=request.user, text=texte[:2000])
    return Response({'id': str(t.id), 'texte': t.text, 'creeA': t.created_at.isoformat()}, status=201)


@extend_schema(tags=["Vendors"], summary="Supprimer un modèle de réponse")
@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def vd_questions_template_delete(request, template_id):
    vp, err = _vd_active_vendor(request)
    if err:
        return err
    from apps.catalog.models import VendorQuestionTemplate
    VendorQuestionTemplate.objects.filter(pk=template_id, vendor=request.user).delete()
    return Response(status=204)


# ══════════════════════════════════════════════════════════════════════════════
# VAGUE D'INTÉGRATION ESPACE-VENDEUR AUTONOME (12 oct.) — DOMAINES "ARGENT",
# "VERSEMENTS", "TRUST", "PLANS" (voir espace-vendeur/INTEGRATION-API.md §1-3).
#
# RÉUTILISE AU MAXIMUM L'EXISTANT (consigne de la mission) plutôt que de
# recalculer depuis Order/Dispute/Return comme le faisait l'approximation de
# views_money_v2.py (Lot 2) :
#   - argent réel     : apps.payments.settlements (EscrowHold, SettlementBatch,
#     PayoutRequest, Adjustment, amount_due()) — moteur financier construit
#     cette nuit, DÉJÀ la source de vérité de /api/payments/v2/partner/*.
#   - Trust Score     : apps.accounts.trust_score (trust_score_payload,
#     ROLE_TIER_RULES, SanctionRecord) — voir rapport de mission sur V5.4/V5.5.
#   - OTP deux codes  : apps.otp.services (envoyer/verifier) — pas réinventé.
#
# ⚠️ CONFLIT CONNU (signalé, pas résolu ici) : apps.payments.settlements est
# bâti sur le principe explicite « ni solde, ni bouton de retrait » (cycle de
# règlement automatique) — voir apps/payments/settlements/models.py, en-tête.
# Cela contredit la règle produit mémorisée « le vendeur décide quand il
# retire » (PULL). vendor_withdrawal_create() plus haut a déjà basculé vers ce
# nouveau chemin et laisse l'ancien chemin (retrait à la demande) commenté
# comme désactivé. Les vues ci-dessous EXPOSENT la réalité actuelle du moteur
# financier (lecture seule) sans trancher ce conflit — voir le rapport de
# mission pour la décision à prendre côté produit.
# ══════════════════════════════════════════════════════════════════════════════

from rest_framework.decorators import renderer_classes as renderer_classes
from rest_framework.renderers import BaseRenderer as _BaseRenderer, JSONRenderer as _JSONRenderer


def _vendor_or_error(request) -> tuple[VendorProfile, Response | None]:
    """
    (profil, None) ou (None, Response 403/404) — même convention que le reste
    du fichier.

    Premier élément annoncé non optionnel : voir l'explication détaillée sur
    `_get_active_vendor_or_404`.
    """
    try:
        profile = VendorProfile.objects.get(user=request.user)
    except VendorProfile.DoesNotExist:
        return None, Response({'detail': 'Profil vendeur introuvable.'}, status=status.HTTP_404_NOT_FOUND)  # type: ignore[return-value]
    if not profile.is_active_vendor:
        return None, Response({'detail': "Votre compte vendeur n'est pas encore approuvé."}, status=status.HTTP_403_FORBIDDEN)  # type: ignore[return-value]
    return profile, None


def _vendor_payee(profile):
    """Compte financier du vendeur, ou None s'il n'a encore aucune activité (jamais créé en lecture)."""
    from apps.payments.bridge.actors import payee_for_vendor
    return payee_for_vendor(profile, create=False)


def _instant(dt):
    """Instant (ms epoch) — None passe à travers."""
    if dt is None:
        return None
    return int(dt.timestamp() * 1000)


def _jour(dt):
    """Jour ('AAAA-MM-JJ') — None passe à travers."""
    if dt is None:
        return None
    d = dt.date() if hasattr(dt, 'date') else dt
    return d.isoformat()


def _momo_label(operator_code: str) -> str:
    return {'MTN_MOMO': 'MTN', 'ORANGE_MONEY': 'Orange'}.get(operator_code or '', operator_code or '')


def _momo_code(label: str) -> str:
    return {'MTN': 'MTN_MOMO', 'Orange': 'ORANGE_MONEY'}.get(label or '', '')


def _vendor_ref(order_id):
    return f"BLV-{order_id:05d}" if order_id else None


def _article_for_order(order_id, vendor_user):
    """ArticleArgent{titre, variante, dessin} — premier article du vendeur sur la commande
    (approximation : une commande peut porter plusieurs articles du même vendeur, l'écran n'en montre qu'un)."""
    item = OrderItem.objects.filter(order_id=order_id, product__vendor=vendor_user).select_related('product').first()
    if item is None:
        return {'titre': f"Commande #{order_id}", 'variante': '', 'dessin': None}
    dessin = None
    try:
        img = item.product.images.filter(is_primary=True).first() or item.product.images.first()
        dessin = img.image.url if img and img.image else None
    except Exception:
        dessin = None
    return {'titre': item.title_snapshot, 'variante': '', 'dessin': dessin}


def _palier_label(tier: str) -> str:
    from apps.accounts.trust_score import TrustScoreProfile as _TSP
    labels = _TSP.ROLE_TIER_LABELS[_TSP.Role.VENDOR]
    return labels.get(tier, labels['NEW'])


def _release_days_for_role_tier(tier: str) -> int:
    """Délai de libération (jours) par palier Trust Score V5.5 — réutilise la même grille
    documentée que views_money_v2.RELEASE_DELAY_DAYS_BY_TIER (3j Bronze/Argent, 1j Or/Platine),
    appliquée cette fois aux paliers NEW/CONFIRMED/GOLD/PLATINUM du moteur réel."""
    return {'NEW': 3, 'CONFIRMED': 3, 'GOLD': 1, 'PLATINUM': 1}.get(tier, 3)


def _add_business_hours_excluding_sunday(start, hours):
    """Ajoute `hours` heures à `start` en ignorant les dimanches (72 h ouvrées, dimanche non
    compté — CON-01, DP-15, Q-53, donné par le contrat frontend, pas inventé ici)."""
    remaining = hours
    current = start
    while remaining > 0:
        if current.weekday() == 6:  # dimanche
            current = (current + timezone.timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
            continue
        current = current + timezone.timedelta(hours=1)
        remaining -= 1
    return current


def _decision_payload(sanction, type_str):
    from .models import TrustScoreAppeal
    appeal = TrustScoreAppeal.objects.filter(sanction=sanction).first()
    contestation = None
    if appeal:
        contestation = {
            'envoyeeA': _instant(appeal.created_at),
            'texte': appeal.text,
            'preuves': appeal.evidence_urls or [],
            'reponseAvant': _instant(appeal.response_due_at),
            'reponse': (
                {
                    'a': _instant(appeal.responded_at),
                    'issue': 'maintenue' if appeal.outcome == 'MAINTAINED' else 'annulee',
                    'motif': appeal.response_reason,
                } if appeal.responded_at else None
            ),
        }
    return {
        'id': str(sanction.id),
        'type': type_str,
        'niveau': sanction.level if sanction.level else None,
        'palierVise': None,
        'decideeA': _instant(sanction.created_at),
        'effetA': _instant(sanction.expires_at or sanction.created_at),
        'motif': sanction.reason,
        'valideePar': ('Un agent BelivaY' if sanction.issued_by_id else None),
        'contestation': contestation,
    }


def _controle_ramassage_resume(tsp) -> str:
    """Résumé court — APPROXIMATION documentée : aucun compteur réel de « colis contrôlés au
    ramassage » n'existe dans ce code (fonctionnalité logistique livreur non câblée). Calculé
    depuis le seul signal disponible (score, volume), pas depuis un historique réel de contrôles."""
    if tsp.volume < 5:
        return f"{tsp.volume} sur {tsp.volume} (premières commandes)"
    if tsp.score < 60:
        return "1 sur 1"
    if tsp.score < 70:
        return "1 sur 20"
    return "1 sur 100"


# ──────────────────────────────────────────────────────────────────────────
# ARGENT — /money/releasing, /money/frozen, /money/summary, /money/earnings
# ──────────────────────────────────────────────────────────────────────────

@extend_schema(tags=["Vendors"], summary="Argent qui se libère (compte à rebours) — GET /money/releasing")
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def vendor_money_releasing(request):
    profile, err = _vendor_or_error(request)
    if err:
        return err
    from apps.payments.escrow.models import EscrowHold
    from apps.orders.models import PlatformSettings

    vendor = request.user
    compte = _vendor_payee(profile)
    settings_ = PlatformSettings.get_settings()
    delai_standard = max(1, round(settings_.escrow_release_h / 24))

    cartes, en_cours = [], []
    numero = {'operateur': _momo_label(profile.default_withdrawal_operator) or 'MTN', 'masque': ''}
    if compte is not None:
        from apps.client_core.masquage import masquer_numero
        if compte.momo_number_masked:
            numero = {'operateur': _momo_label(compte.momo_operator) or _momo_label(profile.default_withdrawal_operator) or 'MTN', 'masque': compte.momo_number_masked}
        elif profile.default_withdrawal_phone:
            numero['masque'] = masquer_numero(profile.default_withdrawal_phone)

        for hold in EscrowHold.objects.filter(payee=compte, component=EscrowHold.Component.GOODS, status=EscrowHold.Status.RELEASE_SCHEDULED).order_by('release_at'):
            cartes.append({
                'ref': _vendor_ref(hold.order_id),
                'article': _article_for_order(hold.order_id, vendor),
                'fermeture': _instant(hold.triggered_at or hold.auto_confirm_at),
                'liberation': _instant(hold.release_at),
                'vendredi': _jour(hold.release_at),
                'garde': hold.net_amount_xaf,
                'carte': False,  # Order ne distingue pas le moyen de paiement (limite documentée, cf. views_money_v2.py).
            })
        for hold in EscrowHold.objects.filter(payee=compte, component=EscrowHold.Component.GOODS, status=EscrowHold.Status.HELD).order_by('-created_at'):
            en_cours.append({
                'ref': _vendor_ref(hold.order_id),
                'article': _article_for_order(hold.order_id, vendor),
                'garde': hold.net_amount_xaf,
                'payeeA': _instant(hold.created_at),
            })

    data = {
        'palier': _palier_label_or_legacy(profile),
        'delais': {'standard': delai_standard, 'or': 1, 'carte': 14},  # 14j carte : valeur documentée (VD-09), non vérifiable sur ce modèle.
        'fenetreRetourJours': settings_.litige_window_days,
        'numero': numero,
        'cartes': cartes,
        'enCours': en_cours,
    }
    return Response(data)


def _palier_label_or_legacy(profile):
    """Palier affiché au vendeur : utilise le Trust Score V5.5 (apps.accounts.trust_score),
    pas le cache à points VendorProfile.certification_tier (plus ancien, cf. commentaires de
    views_money_v2.py — « obsolète, à supprimer »)."""
    from apps.accounts.trust_score import get_trust_score_profile
    from apps.accounts.models import TrustScoreProfile
    tsp = get_trust_score_profile(profile.user, TrustScoreProfile.Role.VENDOR)
    return _palier_label(tsp.tier)


@extend_schema(tags=["Vendors"], summary="Argent gelé (litige/retour) — GET /money/frozen")
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def vendor_money_frozen(request):
    profile, err = _vendor_or_error(request)
    if err:
        return err
    from apps.payments.escrow.models import EscrowHold
    from apps.orders.models import Dispute, PlatformSettings

    vendor = request.user
    compte = _vendor_payee(profile)
    settings_ = PlatformSettings.get_settings()
    cartes = []
    total = 0
    if compte is not None:
        for hold in EscrowHold.objects.filter(payee=compte, component=EscrowHold.Component.GOODS, status=EscrowHold.Status.FROZEN).order_by('frozen_at'):
            total += hold.net_amount_xaf
            dispute = Dispute.objects.filter(order_id=hold.order_id, vendor=vendor).order_by('-created_at').first() if hold.order_id else None
            ret = Return.objects.filter(order_id=hold.order_id, vendor=vendor).order_by('-created_at').first() if hold.order_id else None
            if dispute is not None:
                type_gel, motif, echeance = 'litige', dispute.reason or 'Litige en cours', _instant(getattr(dispute, 'response_deadline', None))
            elif ret is not None:
                type_gel, motif, echeance = 'retour', ret.reason or 'Retour en cours', None
            else:
                type_gel, motif, echeance = 'verification', 'Vérification en cours', None
            cartes.append({
                'type': type_gel,
                'ref': _vendor_ref(hold.order_id),
                'garde': hold.net_amount_xaf,
                'article': _article_for_order(hold.order_id, vendor),
                'motif': motif,
                'echeance': echeance,
                'arrivee': _instant(getattr(ret, 'received_at', None)) if ret is not None else None,
            })

    data = {
        'total': total,
        'cartes': cartes,
        'delais': {
            'litigeHeures': settings_.litige_window_days * 24,
            'inspectionHeures': 72,
            'verificationHeures': 72,
        },
        'remboursementAuto': {'standard': 0, 'tresFiable': 0},  # pas de barème de remboursement auto distinct dans ce code — non inventé.
    }
    return Response(data)


@extend_schema(tags=["Vendors"], summary="Vue d'ensemble de l'argent — GET /money/summary")
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def vendor_money_summary(request):
    profile, err = _vendor_or_error(request)
    if err:
        return err
    from apps.payments.settlements.services import amount_due
    from apps.payments.escrow.models import EscrowHold
    from apps.client_core.masquage import masquer_numero

    vendor = request.user
    compte = _vendor_payee(profile)
    due = amount_due(compte) if compte is not None else {
        'due_xaf': 0, 'released_not_settled_xaf': 0, 'in_settlement_xaf': 0,
        'not_yet_due_xaf': 0, 'frozen_xaf': 0, 'next_settlement_at': None,
    }

    verifications_count = 0
    numero_masque = masquer_numero(profile.default_withdrawal_phone) if profile.default_withdrawal_phone else ''
    if compte is not None and compte.momo_number_masked:
        numero_masque = compte.momo_number_masked

    a_verser = due['due_xaf']
    # "se_libere" (compte à rebours avant déblocage) correspond à EscrowHold
    # RELEASE_SCHEDULED ; "en_cours" à EscrowHold HELD (pas encore programmé).
    se_libere = 0
    en_cours = 0
    if compte is not None:
        agg_sched = EscrowHold.objects.filter(payee=compte, component=EscrowHold.Component.GOODS, status=EscrowHold.Status.RELEASE_SCHEDULED).aggregate(t=Sum('net_amount_xaf'))
        se_libere = agg_sched['t'] or 0
        agg_held = EscrowHold.objects.filter(payee=compte, component=EscrowHold.Component.GOODS, status=EscrowHold.Status.HELD).aggregate(t=Sum('net_amount_xaf'))
        en_cours = agg_held['t'] or 0

    gele = due['frozen_xaf']
    en_circulation = a_verser + se_libere + en_cours + gele

    data = {
        'aVerser': a_verser,
        'seLibere': se_libere,
        'enCours': en_cours,
        'gele': gele,
        'enCirculation': en_circulation,
        'verifications': {'montant': 0, 'nombre': verifications_count},
        'prochainVersement': None,  # voir GET /payouts/next (plus précis, même source de données).
        'passeA': None,
        'lignes': {
            'seLibere': None,
            'enCours': None,
            'gele': {'litiges': 0, 'retours': 0, 'verifications': 0},
        },
        'gagneDepuisInscription': a_verser + se_libere + en_cours + gele,
        'gardeDuMois': 0,  # voir GET /money/earnings?month= (calcul détaillé).
        'ventesDuMois': 0,
        'exemple': None,
        'numero': {'operateur': _momo_label(compte.momo_operator) if compte else (_momo_label(profile.default_withdrawal_operator) or 'MTN'), 'masque': numero_masque, 'enRevue': False},
        'calculeA': _instant(timezone.now()),
        'mouvements': [],
    }
    return Response(data)


@extend_schema(tags=["Vendors"], summary="Gains — GET /money/earnings?scope=lifetime|month=AAAA-MM")
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def vendor_money_earnings(request):
    profile, err = _vendor_or_error(request)
    if err:
        return err
    from .views_money_v2 import _vendor_kept_for_order
    vendor = request.user
    scope = request.query_params.get('scope')
    mois_param = request.query_params.get('month')

    qs = Order.objects.filter(items__product__vendor=vendor).distinct()
    released = qs.filter(fulfillment_status__in=[
        Order.FulfillmentStatus.BUYER_CONFIRMED, Order.FulfillmentStatus.AUTO_CONFIRMED,
        Order.FulfillmentStatus.RELEASED_TO_VENDOR,
    ]).order_by('updated_at').prefetch_related('items__product')

    compte = _vendor_payee(profile)
    deja_verses = 0
    if compte is not None:
        from apps.payments.settlements.models import PayoutRequest as _PayoutRequest
        deja_verses = _PayoutRequest.objects.filter(payee=compte, status=_PayoutRequest.Status.PAID).aggregate(t=Sum('amount_xaf'))['t'] or 0

    total_depuis_inscription = sum(_vendor_kept_for_order(o, vendor) for o in released)

    if scope == 'lifetime':
        data = {
            'mois': timezone.now().strftime('%Y-%m'), 'total': total_depuis_inscription, 'ventes': total_depuis_inscription,
            'parProduit': [], 'lignes': [], 'meilleurJour': None, 'historique': [],
            'gagne': total_depuis_inscription, 'ceSoir': None, 'dejaVerses': deja_verses,
            'aVerser': None, 'impayes': 0, 'transport': 0,
        }
        return Response(data)

    mois = mois_param or timezone.now().strftime('%Y-%m')
    try:
        annee, mm = (int(x) for x in mois.split('-'))
    except (ValueError, AttributeError):
        annee, mm = timezone.now().year, timezone.now().month
        mois = f"{annee:04d}-{mm:02d}"

    du_mois = released.filter(updated_at__year=annee, updated_at__month=mm)

    lignes, par_produit, par_jour = [], {}, {}
    total_mois = ventes_mois = 0
    for order in du_mois:
        kept = _vendor_kept_for_order(order, vendor)
        if not kept:
            continue
        total_mois += kept
        items = list(order.items.filter(product__vendor=vendor))
        prix_vente = sum(i.line_total_xaf for i in items)
        ventes_mois += prix_vente
        article = _article_for_order(order.id, vendor)
        lignes.append({
            'type': 'vente', 'ref': _vendor_ref(order.id), 'article': article,
            'prix': prix_vente, 'garde': kept, 'liberation': _instant(order.updated_at), 'motif': None,
        })
        for item in items:
            bucket = par_produit.setdefault(item.product_id, {'titre': item.title_snapshot, 'dessin': article['dessin'], 'quantite': 0, 'garde': 0})
            bucket['quantite'] += item.qty
            bucket['garde'] += kept  # approximation : commission au niveau commande (plancher), pas ventilée par article.
        jour = order.updated_at.date()
        par_jour[jour] = par_jour.get(jour, 0) + kept

    meilleur_jour = max(par_jour.items(), key=lambda kv: kv[1]) if par_jour else None

    historique = []
    base = timezone.now().replace(day=1)
    for i in range(11, -1, -1):
        y, m = base.year, base.month - i
        while m <= 0:
            m += 12
            y -= 1
        du = released.filter(updated_at__year=y, updated_at__month=m)
        garde = sum(_vendor_kept_for_order(o, vendor) for o in du)
        historique.append({'mois': f"{y:04d}-{m:02d}", 'garde': garde, 'ventes': du.count()})

    data = {
        'mois': mois,
        'total': total_mois,
        'ventes': ventes_mois,
        'parProduit': sorted(par_produit.values(), key=lambda p: -p['garde']),
        'lignes': lignes,
        'meilleurJour': ({'jour': meilleur_jour[0].isoformat(), 'garde': meilleur_jour[1]} if meilleur_jour else None),
        'historique': historique,
        'gagne': total_depuis_inscription,
        'ceSoir': None,
        'dejaVerses': deja_verses,
        'aVerser': None,
        'impayes': 0,
        'transport': 0,
    }
    return Response(data)


# ──────────────────────────────────────────────────────────────────────────
# ARGENT — documents (/documents, /documents/{type}/{period})
# ──────────────────────────────────────────────────────────────────────────

@extend_schema(tags=["Vendors"], summary="Liste des documents — GET /documents")
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def vendor_documents_list(request):
    profile, err = _vendor_or_error(request)
    if err:
        return err
    vendor = request.user
    qs = Order.objects.filter(items__product__vendor=vendor).distinct().filter(
        fulfillment_status__in=[
            Order.FulfillmentStatus.BUYER_CONFIRMED, Order.FulfillmentStatus.AUTO_CONFIRMED,
            Order.FulfillmentStatus.RELEASED_TO_VENDOR,
        ],
    )
    mois_set = sorted({o.updated_at.strftime('%Y-%m') for o in qs}, reverse=True)
    maintenant = timezone.now().strftime('%Y-%m')

    compte = _vendor_payee(profile)
    mois_payes = set()
    if compte is not None:
        from apps.payments.settlements.models import SettlementBatch as _SB
        for batch in _SB.objects.filter(payee=compte, status=_SB.Status.PAID):
            mois_payes.add(batch.period_end.strftime('%Y-%m'))

    releves = []
    for m in mois_set[:24]:
        if m == maintenant:
            statut = 'open'
        elif m in mois_payes:
            statut = 'issued'
        else:
            statut = 'pending'
        releves.append({'periode': m, 'statut': statut, 'emisLe': (f"{m}-28" if statut == 'issued' else None), 'formats': (['pdf', 'csv'] if statut != 'open' else [])})

    recus_refs = [_vendor_ref(o.id) for o in qs.order_by('-updated_at')[:5]]

    abonnement = [
        {'periode': sub.started_at.strftime('%Y-%m') if sub.started_at else sub.created_at.strftime('%Y-%m'),
         'emisLe': _jour(sub.confirmed_at or sub.created_at), 'libelle': sub.plan.name}
        for sub in VendorSubscription.objects.filter(vendor=profile, amount_paid_xaf__gt=0).order_by('-created_at')[:24]
    ]

    data = {
        'releves': releves,
        'recus': {'nombre': qs.count(), 'refs': recus_refs},
        'factures': {
            'commission': [{'periode': m, 'statut': ('issued' if m in mois_payes else ('open' if m == maintenant else 'pending')), 'emisLe': (f"{m}-28" if m in mois_payes else None), 'disponibleLe': None} for m in mois_set[:24]],
            'abonnement': abonnement,
            # Toujours vide : aucune visibilité payante n'existe (DP-14, Q-32) — ce n'est pas une
            # limite de données, c'est l'application de la règle produit elle-même.
            'visibilite': [],
        },
        # Pas de champ RCCM/NIU sur VendorProfile aujourd'hui — toujours False, documenté (DOC-01).
        'entreprise': {'rccm': False, 'niu': False},
        'contrat': {'signeLe': _jour(profile.approved_at or profile.created_at)},
    }
    return Response(data)


def _document_content(profile, doc_type, period):
    """(titre, sousTitre, colonnes, lignes, totaux, mentions) pour un document donné — réutilisé
    par la vue JSON (ContenuDocument) et par les rendus PDF/CSV."""
    vendor = profile.user
    if doc_type in ('releve', 'facture'):
        try:
            annee, mm = (int(x) for x in period.split('-'))
        except (ValueError, AttributeError):
            return (f"Relevé {period}", "Période invalide", ['Référence'], [], None, ["Période attendue : AAAA-MM."])
        qs = Order.objects.filter(items__product__vendor=vendor).distinct().filter(
            updated_at__year=annee, updated_at__month=mm,
            fulfillment_status__in=[
                Order.FulfillmentStatus.BUYER_CONFIRMED, Order.FulfillmentStatus.AUTO_CONFIRMED,
                Order.FulfillmentStatus.RELEASED_TO_VENDOR,
            ],
        )
        lignes = []
        total_vente = total_commission = total_garde = 0
        for order in qs.order_by('updated_at'):
            items = order.items.filter(product__vendor=vendor)
            subtotal = sum(i.line_total_xaf for i in items)
            rate = float(order.commission_rate_snapshot)
            commission = round(subtotal * rate / 100)
            garde = subtotal - commission
            total_vente += subtotal
            total_commission += commission
            total_garde += garde
            lignes.append([_vendor_ref(order.id), order.updated_at.strftime('%d/%m/%Y'), subtotal, commission, garde])
        titre = "Relevé de commission" if doc_type == 'facture' else "Relevé de ventes"
        colonnes = ['Commande', 'Date', 'Prix de vente (FCFA)', 'Commission (FCFA)', 'Vous gardez (FCFA)']
        totaux = ['Total', '', total_vente, total_commission, total_garde]
        mentions = ["Ceci n'est pas une facture fiscale." if not lignes else "Montants en francs CFA (XAF)."]
        return (f"{titre} · {period}", profile.business_name, colonnes, lignes, totaux, mentions)

    if doc_type == 'versements':
        compte = _vendor_payee(profile)
        lignes = []
        total = 0
        if compte is not None:
            from apps.payments.settlements.models import PayoutRequest as _PayoutRequest
            payouts = _PayoutRequest.objects.filter(payee=compte, status=_PayoutRequest.Status.PAID).order_by('-settled_at')
            if period == '3':
                payouts = payouts.filter(settled_at__gte=timezone.now() - timezone.timedelta(days=90))
            elif period == '12':
                payouts = payouts.filter(settled_at__gte=timezone.now() - timezone.timedelta(days=365))
            for payout in payouts:
                total += payout.amount_xaf
                lignes.append([payout.reference, _jour(payout.settled_at), payout.amount_xaf, payout.payee_operator, payout.payee_msisdn_masked])
        colonnes = ['Référence', 'Date', 'Montant (FCFA)', 'Opérateur', 'Numéro']
        return (f"Historique des versements · {period}", profile.business_name, colonnes, lignes, ['Total', '', total, '', ''], [])

    if doc_type == 'contrat':
        colonnes = ['Boutique', 'Signé le']
        lignes = [[profile.business_name, _jour(profile.approved_at or profile.created_at)]]
        return ("Contrat BelivaY", profile.business_name, colonnes, lignes, None, ["Document récapitulatif — pas le contrat signé original."])

    return (f"Document inconnu", "", ['—'], [], None, [f"Type de document non reconnu : {doc_type!r}."])


class _PDFRenderer(_BaseRenderer):
    """Enregistré uniquement pour que la négociation de contenu DRF accepte
    `?format=pdf` sans lever Http404 (rest_framework.negotiation.DefaultContentNegotiation.
    filter_renderers lève Http404 si AUCUN renderer du format demandé n'est déclaré — `format`
    est un nom de paramètre RÉSERVÉ par DRF, pas une invention à nous). La vue renvoie un
    HttpResponse brut (reportlab) qui contourne entièrement ce renderer."""
    media_type = 'application/pdf'
    format = 'pdf'

    def render(self, data, accepted_media_type=None, renderer_context=None):
        return data


class _CSVRenderer(_BaseRenderer):
    """Même rôle que _PDFRenderer ci-dessus, pour `?format=csv`."""
    media_type = 'text/csv'
    format = 'csv'

    def render(self, data, accepted_media_type=None, renderer_context=None):
        return data


@extend_schema(tags=["Vendors"], summary="Contenu d'un document — GET /documents/{type}/{period}?format=pdf|csv")
@api_view(['GET'])
@renderer_classes([_JSONRenderer, _PDFRenderer, _CSVRenderer])
@permission_classes([IsAuthenticated])
def vendor_document_detail(request, doc_type, period):
    profile, err = _vendor_or_error(request)
    if err:
        return err
    titre, sous_titre, colonnes, lignes, totaux, mentions = _document_content(profile, doc_type, period)
    fmt = (request.query_params.get('format') or '').lower()

    if fmt == 'csv':
        import csv as _csv
        import io as _io
        buf = _io.StringIO()
        writer = _csv.writer(buf)
        writer.writerow([titre])
        writer.writerow(colonnes)
        for ligne in lignes:
            writer.writerow(ligne)
        if totaux:
            writer.writerow(totaux)
        response = HttpResponse(buf.getvalue(), content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="{doc_type}_{period}.csv"'
        return response

    if fmt == 'pdf':
        import io as _io
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.units import mm as _mm
        from reportlab.lib import colors as _colors
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle

        styles = getSampleStyleSheet()
        buf = _io.BytesIO()
        doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=20 * _mm, bottomMargin=18 * _mm, leftMargin=18 * _mm, rightMargin=18 * _mm)
        elements = [
            Paragraph(titre, ParagraphStyle('T', parent=styles['Title'], fontSize=16)),
            Paragraph(sous_titre, styles['Normal']),
            Spacer(1, 6 * _mm),
        ]
        rows = [colonnes] + [[str(c) for c in ligne] for ligne in lignes]
        if totaux:
            rows.append([str(c) for c in totaux])
        table = Table(rows)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), _colors.HexColor('#F5F0E8')),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8.5),
            ('GRID', (0, 0), (-1, -1), 0.25, _colors.HexColor('#E0D8CE')),
        ]))
        elements.append(table)
        for mention in mentions:
            elements.append(Spacer(1, 4 * _mm))
            elements.append(Paragraph(mention, styles['Normal']))
        doc.build(elements)
        buf.seek(0)
        response = HttpResponse(buf.getvalue(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{doc_type}_{period}.pdf"'
        return response

    data = {'titre': titre, 'sousTitre': sous_titre, 'colonnes': colonnes, 'lignes': lignes, 'totaux': totaux, 'mentions': mentions}
    return Response(data)


# ──────────────────────────────────────────────────────────────────────────
# VERSEMENTS — /payouts/next, /payouts, /payout-number*
# ──────────────────────────────────────────────────────────────────────────

@extend_schema(tags=["Vendors"], summary="Prochain versement — GET /payouts/next")
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def vendor_payouts_next(request):
    profile, err = _vendor_or_error(request)
    if err:
        return err
    from apps.payments.settlements.services import amount_due
    from apps.payments.settlements.models import PayoutRequest as _PayoutRequest, SettlementBatch as _SettlementBatch
    from apps.payments.escrow.models import EscrowHold
    from .models import PayoutNumberChangeRequest

    compte = _vendor_payee(profile)
    if compte is None:
        return Response(None)

    due = amount_due(compte)
    if due['due_xaf'] <= 0 and due['next_settlement_at'] is None:
        en_cours_payout = _PayoutRequest.objects.filter(payee=compte, status__in=[
            _PayoutRequest.Status.DRAFT, _PayoutRequest.Status.PENDING_APPROVAL,
            _PayoutRequest.Status.APPROVED, _PayoutRequest.Status.PROCESSING,
        ]).order_by('-requested_at').first()
        if en_cours_payout is None:
            return Response(None)

    payout_en_cours = _PayoutRequest.objects.filter(payee=compte, status__in=[
        _PayoutRequest.Status.DRAFT, _PayoutRequest.Status.PENDING_APPROVAL,
        _PayoutRequest.Status.APPROVED, _PayoutRequest.Status.PROCESSING, _PayoutRequest.Status.UNKNOWN,
    ]).order_by('-requested_at').first()

    statut_map = {
        None: 'prevu',
        _PayoutRequest.Status.DRAFT: 'prevu',
        _PayoutRequest.Status.PENDING_APPROVAL: 'prevu',
        _PayoutRequest.Status.APPROVED: 'prevu',
        _PayoutRequest.Status.PROCESSING: 'envoye',
        _PayoutRequest.Status.PAID: 'credite',
        _PayoutRequest.Status.FAILED: 'refuse',
        _PayoutRequest.Status.UNKNOWN: 'envoye',
        _PayoutRequest.Status.REJECTED: 'refuse',
    }

    commandes = []
    for hold in EscrowHold.objects.filter(payee=compte, component=EscrowHold.Component.GOODS, status=EscrowHold.Status.RELEASED, settlement_batch_ref='').order_by('-released_at')[:20]:
        commandes.append({'ref': _vendor_ref(hold.order_id), 'liberation': _instant(hold.released_at), 'garde': hold.net_amount_xaf})

    en_revue = PayoutNumberChangeRequest.objects.filter(vendor=profile, status=PayoutNumberChangeRequest.Status.IN_REVIEW).order_by('-created_at').first()

    reference = payout_en_cours.reference if payout_en_cours else "(pas encore attribuée)"
    vendredi = _jour(due['next_settlement_at']) or timezone.now().date().isoformat()
    heure_limite_dt = (due['next_settlement_at'] or timezone.now()).replace(hour=12, minute=0, second=0, microsecond=0)

    data = {
        'reference': reference,
        'statut': statut_map.get(payout_en_cours.status if payout_en_cours else None, 'prevu'),
        'vendredi': vendredi,
        'heureLimite': _instant(heure_limite_dt),
        'aVerser': due['released_not_settled_xaf'],
        'montant': due['due_xaf'],
        'passeA': None,
        'commandes': commandes,
        'numero': compte.momo_number_masked or (profile.default_withdrawal_phone or ''),
        'operateur': _momo_label(compte.momo_operator) or _momo_label(profile.default_withdrawal_operator) or 'MTN',
        'titulaire': profile.business_name,
        'incident': None,  # pas de modèle d'incident de versement distinct dans le moteur actuel.
        'enRevueJusqua': _instant(en_revue.review_until) if en_revue else None,
        'reporteAu': None,
    }
    return Response(data)


@extend_schema(tags=["Vendors"], summary="Historique des versements — GET /payouts?period=3|12|tout")
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def vendor_payouts_history(request):
    profile, err = _vendor_or_error(request)
    if err:
        return err
    from apps.payments.settlements.models import PayoutRequest as _PayoutRequest

    periode_brute = (request.query_params.get('period') or 'tout').lower()
    periode = {'3m': '3', '12m': '12', 'all': 'tout'}.get(periode_brute, periode_brute)
    if periode not in ('3', '12', 'tout'):
        periode = 'tout'

    compte = _vendor_payee(profile)
    versements = []
    total = 0
    if compte is not None:
        qs = _PayoutRequest.objects.filter(payee=compte).exclude(status=_PayoutRequest.Status.DRAFT).order_by('-requested_at')
        if periode == '3':
            qs = qs.filter(requested_at__gte=timezone.now() - timezone.timedelta(days=90))
        elif periode == '12':
            qs = qs.filter(requested_at__gte=timezone.now() - timezone.timedelta(days=365))

        # dict[str, str] : `Status` est un TextChoices, ses membres sont des
        # chaines et `payout.status` en est une. Meme raison que
        # `etat_par_niveau` plus bas.
        statut_map: dict[str, str] = {
            _PayoutRequest.Status.DRAFT: 'prevu', _PayoutRequest.Status.PENDING_APPROVAL: 'prevu',
            _PayoutRequest.Status.APPROVED: 'prevu', _PayoutRequest.Status.PROCESSING: 'envoye',
            _PayoutRequest.Status.PAID: 'credite', _PayoutRequest.Status.FAILED: 'refuse',
            _PayoutRequest.Status.UNKNOWN: 'envoye', _PayoutRequest.Status.REJECTED: 'refuse',
            _PayoutRequest.Status.CANCELLED: 'refuse', _PayoutRequest.Status.REVERSED: 'refuse',
        }
        for payout in qs:
            commandes = []
            if payout.batch_id:
                # `batch_id` renseigne garantit `batch` non nul ; le
                # verificateur ne sait pas relier les deux.
                for hold in payout.batch.covered_holds.all()[:50]:  # type: ignore[union-attr]
                    commandes.append({'ref': _vendor_ref(hold.order_id), 'liberation': _instant(hold.released_at), 'garde': hold.net_amount_xaf})
            total += payout.amount_xaf
            versements.append({
                'reference': payout.reference,
                'vendredi': _jour(payout.settled_at or payout.requested_at),
                'montant': payout.amount_xaf,
                'numero': f"{payout.payee_operator} {payout.payee_msisdn_masked}".strip(),
                'statut': statut_map.get(payout.status, 'prevu'),
                'essais': [],  # pas de journal multi-tentative distinct sur PayoutRequest.
                'commandes': commandes,
                'signale': False,  # pas de modèle "versement non reçu" distinct dans le moteur actuel.
            })

    data = {
        'periode': periode,
        'versements': versements,
        'total': total,
        'nombre': len(versements),
        'depuis': _jour(profile.approved_at or profile.created_at),
    }
    return Response(data)


@extend_schema(tags=["Vendors"], summary="Numéro de versement — GET (consulter) / PUT (confirmer les deux codes) /payout-number")
@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def vendor_payout_number(request):
    """
    Un seul chemin, deux méthodes (`src/api/outils.ts` ne met pas de slash final, et un deuxième
    `path()` Django sur le MÊME chemin ne serait jamais atteint — le premier gagnerait toujours,
    quelle que soit la méthode). PUT confirme les deux codes (ancien chemin : vendor_payout_number_confirm).
    """
    if request.method == 'PUT':
        return _vendor_payout_number_confirm(request)
    return _vendor_payout_number_get(request)


def _vendor_payout_number_get(request):
    profile, err = _vendor_or_error(request)
    if err:
        return err
    from .models import PayoutNumberChangeRequest, PAYOUT_NUMBER_REVIEW_DAYS
    from apps.client_core.masquage import masquer_numero
    from apps.client_core import parametres

    en_revue = PayoutNumberChangeRequest.objects.filter(vendor=profile, status=PayoutNumberChangeRequest.Status.IN_REVIEW).order_by('-created_at').first()
    if en_revue and en_revue.apply_if_due():
        en_revue = None

    attente = PayoutNumberChangeRequest.objects.filter(vendor=profile, status=PayoutNumberChangeRequest.Status.PENDING_CODES).order_by('-created_at').first()

    try:
        duree_otp = parametres.entier("OTP-DUREE")
        longueur_otp = parametres.entier("OTP-LONG")
        renvoi_otp = parametres.nombres("OTP-RENVOI")[0]
    except Exception:
        duree_otp, longueur_otp, renvoi_otp = 10, 6, 60

    data = {
        'actuel': {
            'operateur': _momo_label(profile.default_withdrawal_operator) or 'MTN',
            'masque': masquer_numero(profile.default_withdrawal_phone) if profile.default_withdrawal_phone else '',
            'verifieLe': _jour(profile.approved_at or profile.created_at),
            'titulaire': profile.business_name,
        },
        'enRevue': None,
        'operateurs': [
            {'nom': 'MTN', 'libelle': 'MTN Mobile Money', 'prefixes': ['650', '651', '652', '653', '654', '67', '680', '681', '682', '683', '684']},
            {'nom': 'Orange', 'libelle': 'Orange Money', 'prefixes': ['655', '656', '657', '658', '659', '69', '685', '686', '687', '688', '689']},
        ],
        'indicatif': '+237',
        'longueur': 9,
        'telephonePersonnel': masquer_numero(profile.phone) if profile.phone else '',
        'revueJours': PAYOUT_NUMBER_REVIEW_DAYS,
        'code': {'longueur': longueur_otp, 'renvoiSecondes': renvoi_otp, 'dureeMinutes': duree_otp},
        'attente': None,
    }
    if en_revue:
        data['enRevue'] = {
            'operateur': _momo_label(en_revue.operator),
            'masque': masquer_numero(en_revue.new_phone_number),
            'jusqua': _instant(en_revue.review_until),
            'premierVersement': _jour(en_revue.review_until),
            'ancien': {'operateur': _momo_label(en_revue.previous_operator), 'masque': masquer_numero(en_revue.previous_phone_number) if en_revue.previous_phone_number else ''},
            'enAttente': None,
        }
    if attente:
        data['attente'] = {
            'operateur': _momo_label(attente.operator),
            'numeroMasque': masquer_numero(attente.new_phone_number),
            'envoyeA': _instant(attente.created_at),
        }
    return Response(data)


@extend_schema(tags=["Vendors"], summary="Codes de changement — POST (demander) / DELETE (annuler) /payout-number/codes")
@api_view(['POST', 'DELETE'])
@permission_classes([IsAuthenticated])
def vendor_payout_number_codes(request):
    """Un seul chemin, deux méthodes — même raison que vendor_payout_number ci-dessus."""
    if request.method == 'DELETE':
        return _vendor_payout_number_codes_cancel(request)
    return _vendor_payout_number_codes_request(request)


def _vendor_payout_number_codes_request(request):
    profile, err = _vendor_or_error(request)
    if err:
        return err
    from .models import PayoutNumberChangeRequest
    from apps.client_core.masquage import operateur as _detect_operateur, numero_local as _local
    from apps.otp.services import envoyer
    from apps.client_core.erreurs import ErreurClient

    operateur_demande = (request.data.get('operateur') or '').strip()
    numero = (request.data.get('numero') or '').strip()
    local = _local(numero)

    if len(local) != 9:
        return Response({'ok': False, 'raison': 'longueur'})
    detecte = _detect_operateur(local)
    if detecte not in ('MTN', 'Orange'):
        return Response({'ok': False, 'raison': 'prefixe'})
    if operateur_demande and operateur_demande != detecte:
        return Response({'ok': False, 'raison': 'operateur'})
    if profile.default_withdrawal_phone and local == _local(profile.default_withdrawal_phone):
        return Response({'ok': False, 'raison': 'meme_numero'})
    if PayoutNumberChangeRequest.objects.filter(vendor=profile, status=PayoutNumberChangeRequest.Status.IN_REVIEW).exists():
        return Response({'ok': False, 'raison': 'trop_tot', 'detail': "Un changement est déjà en revue (7 jours)."})

    PayoutNumberChangeRequest.objects.filter(vendor=profile, status=PayoutNumberChangeRequest.Status.PENDING_CODES).update(
        status=PayoutNumberChangeRequest.Status.CANCELLED, cancelled_at=timezone.now(),
    )
    changement = PayoutNumberChangeRequest.objects.create(
        vendor=profile, operator=_momo_code(detecte), new_phone_number=local,
        previous_operator=profile.default_withdrawal_operator, previous_phone_number=profile.default_withdrawal_phone,
    )

    try:
        envoi_nouveau = envoyer(objet='payout-nouveau', destination=local, utilisateur=request.user)
        if profile.phone:
            envoyer(objet='payout-personnel', destination=profile.phone, utilisateur=request.user)
    except ErreurClient as exc:
        changement.delete()
        return Response({'ok': False, 'raison': 'trop_tot', 'detail': exc.message})

    return Response({'ok': True, 'destination': envoi_nouveau['destination'], 'renvoiSecondes': envoi_nouveau['renvoiSecondes']})


@extend_schema(tags=["Vendors"], summary="Renvoyer un des deux codes — POST /payout-number/codes/resend")
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def vendor_payout_number_codes_resend(request):
    profile, err = _vendor_or_error(request)
    if err:
        return err
    from .models import PayoutNumberChangeRequest
    from apps.otp.services import envoyer
    from apps.client_core.erreurs import ErreurClient

    changement = PayoutNumberChangeRequest.objects.filter(vendor=profile, status=PayoutNumberChangeRequest.Status.PENDING_CODES).order_by('-created_at').first()
    if changement is None:
        return Response({'ok': False, 'raison': 'expire'})

    quel = request.data.get('quel')
    objet = 'payout-nouveau' if quel == 'nouveau' else 'payout-personnel'
    destination = changement.new_phone_number if quel == 'nouveau' else profile.phone
    try:
        envoi = envoyer(objet=objet, destination=destination, utilisateur=request.user)
    except ErreurClient as exc:
        return Response({'ok': False, 'raison': 'trop_tot', 'detail': exc.message})
    return Response({'ok': True, 'renvoiSecondes': envoi['renvoiSecondes']})


def _vendor_payout_number_confirm(request):
    profile, err = _vendor_or_error(request)
    if err:
        return err
    from .models import PayoutNumberChangeRequest
    from apps.otp.services import verifier

    changement = PayoutNumberChangeRequest.objects.filter(vendor=profile, status=PayoutNumberChangeRequest.Status.PENDING_CODES).order_by('-created_at').first()
    if changement is None:
        return Response({'ok': False, 'raison': 'expire'})

    code_nouveau = str(request.data.get('codeNouveau') or '')
    code_perso = str(request.data.get('codePersonnel') or '')

    r1 = verifier(objet='payout-nouveau', code=code_nouveau, destination=changement.new_phone_number, utilisateur=request.user)
    if not r1.get('ok'):
        if r1.get('bloqueJusqua'):
            return Response({'ok': False, 'raison': 'bloque', 'bloqueJusqua': r1['bloqueJusqua']})
        if r1.get('expire'):
            return Response({'ok': False, 'raison': 'expire'})
        return Response({'ok': False, 'raison': 'code_nouveau', 'essaisRestants': r1.get('essaisRestants')})

    r2 = verifier(objet='payout-personnel', code=code_perso, destination=profile.phone, utilisateur=request.user)
    if not r2.get('ok'):
        if r2.get('bloqueJusqua'):
            return Response({'ok': False, 'raison': 'bloque', 'bloqueJusqua': r2['bloqueJusqua']})
        if r2.get('expire'):
            return Response({'ok': False, 'raison': 'expire'})
        return Response({'ok': False, 'raison': 'code_personnel', 'essaisRestants': r2.get('essaisRestants')})

    changement.new_number_verified_at = timezone.now()
    changement.personal_verified_at = timezone.now()
    changement.save(update_fields=['new_number_verified_at', 'personal_verified_at', 'updated_at'])
    changement.start_review()

    return Response({'ok': True, 'revueJusqua': _instant(changement.review_until), 'premierVersement': _jour(changement.review_until)})


def _vendor_payout_number_codes_cancel(request):
    profile, err = _vendor_or_error(request)
    if err:
        return err
    from .models import PayoutNumberChangeRequest
    PayoutNumberChangeRequest.objects.filter(vendor=profile, status=PayoutNumberChangeRequest.Status.PENDING_CODES).update(
        status=PayoutNumberChangeRequest.Status.CANCELLED, cancelled_at=timezone.now(),
    )
    return Response(status=status.HTTP_204_NO_CONTENT)


# ──────────────────────────────────────────────────────────────────────────
# TRUST — /score, /score/appeal, /account/status, /account/decisions*, /tiers
# ──────────────────────────────────────────────────────────────────────────

@extend_schema(tags=["Vendors"], summary="Trust Score détaillé — GET /score")
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def vendor_trust_score_view(request):
    profile, err = _vendor_or_error(request)
    if err:
        return err
    from apps.accounts.trust_score import get_trust_score_profile, trust_score_payload, _vendor_observations
    from apps.accounts.models import TrustScoreProfile

    tsp = get_trust_score_profile(request.user, TrustScoreProfile.Role.VENDOR)
    payload = trust_score_payload(tsp)

    cle_labels = {
        'punctuality': ('ponctualite', 'Ponctualité'), 'quality': ('qualite', 'Qualité'),
        'satisfaction': ('satisfaction', 'Satisfaction'), 'disputes': ('litiges', 'Litiges'),
        'documents': ('documents', 'Documents'), 'seniority': ('anciennete', 'Ancienneté'),
    }
    criteres = []
    for metric, (cle, nom) in cle_labels.items():
        bloc = (tsp.breakdown or {}).get(metric)
        if not bloc:
            continue
        note = round(float(bloc.get('score', 0)), 1)
        poids = bloc.get('weight', 0)
        criteres.append({
            'cle': cle, 'nom': nom, 'poids': poids, 'note': note,
            'points': round(note * poids / 100, 1),
            'detail': f"{bloc.get('samples', 0)} évènement(s) mesuré(s) (demi-vie 90 jours).",
        })

    evenements = []
    try:
        observations = _vendor_observations(request.user)
        for obs in list(observations.get('disputes', []))[:10]:
            evenements.append({
                'a': _instant(obs.occurred_at), 'libelle': 'Litige enregistré' if obs.value < 50 else 'Livraison sans litige',
                'effet': 'grave' if obs.value == 0 else 'succes', 'critere': 'litiges', 'ref': None,
            })
        for obs in list(observations.get('punctuality', []))[:10]:
            evenements.append({
                'a': _instant(obs.occurred_at), 'libelle': 'Prête dans le délai' if obs.value >= 100 else 'Prête en retard',
                'effet': 'succes' if obs.value >= 100 else 'leger', 'critere': 'ponctualite', 'ref': None,
            })
    except Exception:
        evenements = []
    evenements = [e for e in evenements if e['a'] is not None]
    evenements.sort(key=lambda e: e['a'], reverse=True)

    sanction_obj = tsp.sanctions.filter(lifted_at__isnull=True).exclude(level=0).order_by('-created_at').first()
    sanction_data = None
    if sanction_obj:
        sanction_data = {'niveau': sanction_obj.level, 'depuis': _instant(sanction_obj.created_at), 'motif': sanction_obj.reason}

    data = {
        'total': payload['score'],
        'calculeA': _instant(tsp.calculated_at),
        'criteres': criteres,
        'evenements': evenements[:20],
        'bareme': [
            {'evenement': 'Commande prête dans le délai', 'effet': 'succes'},
            {'evenement': 'Commande prête en retard', 'effet': 'leger'},
            {'evenement': 'Litige ouvert', 'effet': 'moyen'},
            {'evenement': 'Contrefaçon confirmée', 'effet': 'grave_sanction'},
            {'evenement': 'Documents incomplets', 'effet': 'documents_zero'},
        ],
        'historique': [],  # pas de relevé nocturne historisé dans ce code — voir rapport de mission.
        'gele': bool(tsp.veto_active),
        'sanction': sanction_data,
        'controleAuRamassage': _controle_ramassage_resume(tsp),
    }
    return Response(data)


@extend_schema(tags=["Vendors"], summary="Contester une décision — POST /score/appeal")
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def vendor_trust_score_appeal(request):
    profile, err = _vendor_or_error(request)
    if err:
        return err
    from apps.accounts.models import SanctionRecord, TrustScoreProfile
    from .models import TrustScoreAppeal

    decision_id = request.data.get('decision')
    texte = (request.data.get('texte') or '').strip()
    preuves = request.data.get('preuves') or []

    try:
        sanction = SanctionRecord.objects.select_related('profile').get(
            id=int(decision_id), profile__user=request.user, profile__role=TrustScoreProfile.Role.VENDOR,
        )
    except (SanctionRecord.DoesNotExist, ValueError, TypeError):
        return Response({'ok': False, 'raison': 'introuvable'})

    if TrustScoreAppeal.objects.filter(sanction=sanction).exists():
        return Response({'ok': False, 'raison': 'deja_contestee'})
    if len(texte) < 40:
        return Response({'ok': False, 'raison': 'trop_court'})
    if len(texte) > 1000:
        return Response({'ok': False, 'raison': 'trop_long'})

    reponse_avant = _add_business_hours_excluding_sunday(timezone.now(), 72)
    appeal = TrustScoreAppeal.objects.create(
        vendor=profile, sanction=sanction, text=texte,
        evidence_urls=preuves if isinstance(preuves, list) else [], response_due_at=reponse_avant,
    )
    return Response({'ok': True, 'reponseAvant': _instant(appeal.response_due_at)})


@extend_schema(tags=["Vendors"], summary="État du compte (sanction, contrôle) — GET /account/status")
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def vendor_account_status(request):
    profile, err = _vendor_or_error(request)
    if err:
        return err
    from apps.accounts.trust_score import get_trust_score_profile, DEFAULT_SUSPENSION_DAYS
    from apps.accounts.models import TrustScoreProfile

    tsp = get_trust_score_profile(request.user, TrustScoreProfile.Role.VENDOR)
    sanction = tsp.sanctions.filter(lifted_at__isnull=True).exclude(level=0).order_by('-created_at').first()

    # dict[int, str] : les membres de `SanctionLevel` sont des entiers
    # (IntegerChoices) et `sanction_level` est un PositiveSmallIntegerField.
    # Sans l'annotation, l'analyseur restreint les cles aux seuls membres de
    # l'enumeration et refuse la recherche par entier, qui marche pourtant.
    etat_par_niveau: dict[int, str] = {
        TrustScoreProfile.SanctionLevel.NONE: 'aucune', TrustScoreProfile.SanctionLevel.WARNING: 'avertissement',
        TrustScoreProfile.SanctionLevel.THROTTLING: 'visibilite_reduite', TrustScoreProfile.SanctionLevel.SUSPENSION: 'suspendu',
        TrustScoreProfile.SanctionLevel.BAN: 'exclu',
    }
    type_par_niveau = {1: 'avertissement', 2: 'visibilite_reduite', 3: 'suspension', 4: 'exclusion'}

    en_cours = _decision_payload(sanction, type_par_niveau.get(sanction.level, 'avertissement')) if sanction else None
    fin_effet = tsp.throttled_until or tsp.frozen_until
    score = float(tsp.score)

    data = {
        'etat': etat_par_niveau.get(tsp.sanction_level, 'aucune'),
        'enCours': en_cours,
        'controle': {
            'sur': 1 if tsp.volume < 5 else (1 if score < 60 else (20 if score < 70 else 100)),
            'raison': 'premieres' if tsp.volume < 5 else ('sous_seuil' if score < 60 else 'au_dessus'),
            'seuilReduction': 70.0 if score < 70 else None,
            'surApres': 100 if score < 70 else None,
            'premieres': 5,
            'ramassees': tsp.volume,
            'renforceSous': 60,
            'renforceBaisse': 8,
            'probatoire': None,
        },
        'alerteAvantSeuil': True,
        'regles': {
            'visibiliteJours': 14, 'suspensionSous': 40, 'nonPreparations': 3,
            'nonPreparationsJours': 30, 'suspensionMaxJours': DEFAULT_SUSPENSION_DAYS, 'probatoireCommandes': 20,
        },
        'finEffet': _instant(fin_effet),
    }
    return Response(data)


@extend_schema(tags=["Vendors"], summary="Historique des décisions — GET /account/decisions")
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def vendor_account_decisions(request):
    profile, err = _vendor_or_error(request)
    if err:
        return err
    from apps.accounts.trust_score import get_trust_score_profile
    from apps.accounts.models import TrustScoreProfile

    tsp = get_trust_score_profile(request.user, TrustScoreProfile.Role.VENDOR)
    type_par_niveau = {1: 'avertissement', 2: 'visibilite_reduite', 3: 'suspension', 4: 'exclusion'}
    decisions = [_decision_payload(s, type_par_niveau.get(s.level, 'avertissement')) for s in tsp.sanctions.exclude(level=0).order_by('-created_at')]
    return Response(decisions)


@extend_schema(tags=["Vendors"], summary="Détail d'une décision — GET /account/decisions/{id}")
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def vendor_account_decision_detail(request, decision_id):
    profile, err = _vendor_or_error(request)
    if err:
        return err
    from apps.accounts.trust_score import get_trust_score_profile
    from apps.accounts.models import SanctionRecord, TrustScoreProfile

    tsp = get_trust_score_profile(request.user, TrustScoreProfile.Role.VENDOR)
    type_par_niveau = {1: 'avertissement', 2: 'visibilite_reduite', 3: 'suspension', 4: 'exclusion'}
    try:
        sanction = tsp.sanctions.exclude(level=0).get(id=int(decision_id))
    except (ValueError, TypeError, SanctionRecord.DoesNotExist):
        return Response(None)
    return Response(_decision_payload(sanction, type_par_niveau.get(sanction.level, 'avertissement')))


@extend_schema(tags=["Vendors"], summary="Mon palier (paliers, conditions, montée/descente) — GET /tiers")
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def vendor_tiers(request):
    profile, err = _vendor_or_error(request)
    if err:
        return err
    from apps.accounts.trust_score import get_trust_score_profile, trust_score_payload, HYSTERESIS_DAYS, _hysteresis_days_for
    from apps.accounts.models import TrustScoreProfile

    tsp = get_trust_score_profile(request.user, TrustScoreProfile.Role.VENDOR)
    payload = trust_score_payload(tsp)
    tier_rules = payload['tier_rules']  # CONFIRMED, GOLD, PLATINUM — du plus bas au plus haut (NEW/Bronze n'a pas de seuil).
    score = payload['score']

    if tsp.tier == TrustScoreProfile.Tier.NEW:
        actuel_rule = None
        suivant_rule = tier_rules[0] if tier_rules else None
    else:
        ranks = {r['tier']: i for i, r in enumerate(tier_rules)}
        idx = ranks.get(tsp.tier, 0)
        actuel_rule = tier_rules[idx] if idx < len(tier_rules) else None
        suivant_rule = tier_rules[idx + 1] if idx + 1 < len(tier_rules) else None

    conditions = []
    commandes_a_faire = None
    if suivant_rule:
        manque_score = round(max(0, suivant_rule['min_score'] - score), 1)
        conditions.append({
            'cle': 'score', 'libelle': f"Trust Score {suivant_rule['min_score']} au moins",
            'valeur': str(score), 'tenue': score >= suivant_rule['min_score'],
            'manque': None if manque_score <= 0 else f"+ {manque_score}",
        })
        manque_vol = max(0, suivant_rule['min_volume'] - tsp.volume)
        conditions.append({
            'cle': 'livrees', 'libelle': f"{suivant_rule['min_volume']} commandes livrées",
            'valeur': str(tsp.volume), 'tenue': tsp.volume >= suivant_rule['min_volume'],
            'manque': None if manque_vol <= 0 else f"+ {manque_vol}",
        })
        if suivant_rule['audit_required']:
            conditions.append({
                'cle': 'audit', 'libelle': "Audit BelivaY validé", 'valeur': 'Oui' if tsp.audit_passed else 'Non',
                'tenue': tsp.audit_passed, 'manque': None if tsp.audit_passed else "visite d'un agent",
            })
        commandes_a_faire = manque_vol

    montee = None
    if suivant_rule and tsp.candidate_tier == suivant_rule['tier'] and tsp.candidate_since:
        date_montee = tsp.candidate_since + timezone.timedelta(days=_hysteresis_days_for(suivant_rule['tier']))
        montee = {'date': _jour(date_montee)}

    alerte = None
    if suivant_rule and 0 < (suivant_rule['min_score'] - score) <= 3:
        alerte = {'sens': 'montee', 'seuil': suivant_rule['min_score'], 'points': round(suivant_rule['min_score'] - score, 1)}
    elif actuel_rule and 0 <= (score - actuel_rule['min_score']) <= 3:
        alerte = {'sens': 'descente', 'seuil': actuel_rule['min_score'], 'points': round(score - actuel_rule['min_score'], 1)}

    paliers = [{
        'palier': _palier_label('NEW'), 'conditions': 'Niveau de départ', 'garde': None, 'gardeExemple': None,
        'gainSurActuel': None, 'liberationJours': _release_days_for_role_tier('NEW'),
        'responsableDeCompte': False, 'vous': tsp.tier == TrustScoreProfile.Tier.NEW, 'manque': None,
    }]
    for r in tier_rules:
        paliers.append({
            'palier': _palier_label(r['tier']),
            'conditions': f"Trust Score {r['min_score']}, {r['min_volume']} commandes livrées" + (", audit validé" if r['audit_required'] else ''),
            'garde': None, 'gardeExemple': None, 'gainSurActuel': None,
            'liberationJours': _release_days_for_role_tier(r['tier']),
            'responsableDeCompte': r['tier'] == TrustScoreProfile.Tier.PLATINUM,
            'vous': r['tier'] == tsp.tier, 'manque': None,
        })

    data = {
        'palier': _palier_label(tsp.tier),
        'score': score,
        'calculeA': _instant(tsp.calculated_at),
        'suivant': _palier_label(suivant_rule['tier']) if suivant_rule else None,
        'seuilSuivant': suivant_rule['min_score'] if suivant_rule else None,
        'seuilActuel': actuel_rule['min_score'] if actuel_rule else None,
        'conditions': conditions,
        'commandesAFaire': commandes_a_faire,
        'projection': None,  # pas de projection nocturne du service Scores dans ce code — voir rapport de mission.
        'montee': montee,
        'descente': None,  # descente de palier non historisée comme une Decision distincte — voir rapport de mission.
        'alerte': alerte,
        'reference': None,  # article de référence (catalogue) — hors du domaine argent/trust, voir rapport.
        'exemple': None,
        'liberationJours': {'actuel': _release_days_for_role_tier(tsp.tier), 'suivant': _release_days_for_role_tier(suivant_rule['tier']) if suivant_rule else None},
        'supportHeures': 72,
        'decouverte': None,
        'lancement': None,
        'montee14': HYSTERESIS_DAYS,
        'descente14': HYSTERESIS_DAYS,
        'remplacementMin': 75,
        'paliers': paliers,
    }
    return Response(data)


# ──────────────────────────────────────────────────────────────────────────
# PLANS — /rewards, /rewards/{id}/use, /flash-sales, /services, /stats, /demand
# (DP-14, Q-32 : AUCUNE visibilité payante — POST /visibility n'est délibérément
# pas construit ici, voir rapport de mission.)
# ──────────────────────────────────────────────────────────────────────────

def _reward_payload(reward):
    return {
        'id': str(reward.id),
        'type': reward.reward_type.lower(),
        'titre': reward.title,
        'offreId': str(reward.product_id),
        'offreTitre': reward.product.title if reward.product_id else '',
        'jours': reward.days,
        'disponible': reward.disponible,
        'enCoursJusqua': _instant(reward.active_until),
        'venteFlash': (
            {'remisePourCent': reward.flash_campaign.discount_percent, 'etat': ('programmee' if reward.flash_campaign.status == reward.flash_campaign.Status.APPROVED else 'en_verification')}
            if reward.reward_type == 'FLASH' and reward.flash_campaign_id else None
        ),
    }


@extend_schema(tags=["Vendors"], summary="Récompenses au mérite — GET /rewards")
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def vendor_rewards_list(request):
    profile, err = _vendor_or_error(request)
    if err:
        return err
    from .models import VendorReward
    rewards = VendorReward.objects.filter(vendor=profile).select_related('product', 'flash_campaign').order_by('-granted_at')[:50]
    return Response([_reward_payload(r) for r in rewards])


@extend_schema(tags=["Vendors"], summary="Utiliser une récompense (vitrine) — POST /rewards/{id}/use")
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def vendor_reward_use(request, reward_id):
    profile, err = _vendor_or_error(request)
    if err:
        return err
    from .models import VendorReward
    try:
        reward = VendorReward.objects.get(id=reward_id, vendor=profile)
    except VendorReward.DoesNotExist:
        return Response({'ok': False, 'raison': 'deja_utilisee'})
    if not reward.disponible:
        return Response({'ok': False, 'raison': 'deja_utilisee'})

    reward.used_at = timezone.now()
    if reward.reward_type == VendorReward.Type.VITRINE:
        reward.active_until = timezone.now() + timezone.timedelta(days=reward.days or 7)
    reward.save(update_fields=['used_at', 'active_until'])
    return Response({'ok': True, 'jusqua': _instant(reward.active_until)})


@extend_schema(tags=["Vendors"], summary="Programmer une vente flash offerte au mérite — POST /flash-sales")
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def vendor_flash_sales_create(request):
    profile, err = _vendor_or_error(request)
    if err:
        return err
    from .models import VendorReward
    from apps.catalog.models import PromotionCampaign

    reward_id = request.data.get('id')
    try:
        remise = int(request.data.get('remisePourCent'))
    except (TypeError, ValueError):
        return Response({'ok': False, 'raison': 'remise_trop_basse'})

    try:
        reward = VendorReward.objects.select_related('product').get(id=reward_id, vendor=profile, reward_type=VendorReward.Type.FLASH)
    except VendorReward.DoesNotExist:
        return Response({'ok': False, 'raison': 'deja_utilisee'})
    if not reward.disponible:
        return Response({'ok': False, 'raison': 'deja_utilisee'})
    # OFR-05, P-3 : remise réelle de 10 % au moins ; au-delà de 50 %, relue sous 24 h.
    if remise < 10:
        return Response({'ok': False, 'raison': 'remise_trop_basse'})
    if remise > 90:
        return Response({'ok': False, 'raison': 'remise_trop_haute'})

    produit = reward.product
    prix_ref = produit.price_xaf
    prix_promo = max(1, round(prix_ref * (1 - remise / 100)))
    from apps.catalog.regles_catalogue import prix_minimum
    if prix_promo < prix_minimum():  # R19.1 : le prix flash est le prix payé (prix_i)
        return Response({'ok': False, 'raison': 'prix_minimum'})
    maintenant = timezone.now()
    duree_h = min(48, max(2, reward.days * 24 if reward.days else 24))
    statut = PromotionCampaign.Status.APPROVED if remise <= 50 else PromotionCampaign.Status.PENDING
    etat = 'programmee' if remise <= 50 else 'en_verification'

    campagne = PromotionCampaign.objects.create(
        product=produit, campaign_type=PromotionCampaign.CampaignType.FLASH, status=statut,
        requested_by=request.user, title=f"Vente flash offerte · {produit.title}",
        starts_at=maintenant, ends_at=maintenant + timezone.timedelta(hours=duree_h),
        reference_price_xaf=prix_ref, promo_price_xaf=prix_promo,
        # Product ne porte pas de quantité en stock directement (suivi par variante /
        # StockMovement, hors domaine argent/trust) — réserve un lot fixe raisonnable
        # plutôt que d'aller chercher une donnée d'un autre domaine. Documenté.
        stock_reserved=10,
        placement_fee_xaf=0, admin_note="Récompense au mérite (gratuite) — voir VendorReward.",
    )
    reward.used_at = maintenant
    reward.flash_campaign = campagne
    reward.save(update_fields=['used_at', 'flash_campaign'])

    return Response({'ok': True, 'etat': etat})


@extend_schema(tags=["Vendors"], summary="Services qui lèvent les freins — GET /services")
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def vendor_services(request):
    profile, err = _vendor_or_error(request)
    if err:
        return err
    from apps.client_core.masquage import masquer_numero
    zone = profile.zone.name if profile.zone_id else profile.city
    data = {
        'zone': zone,
        'numero': {'operateur': _momo_label(profile.default_withdrawal_operator) or 'MTN', 'masque': masquer_numero(profile.default_withdrawal_phone) if profile.default_withdrawal_phone else ''},
        'delaiVisiteHeures': 72,  # P-4, donné par le contrat frontend — pas inventé.
        # Catalogue de services (prix, disponibilité par zone) non défini dans les
        # paramètres fournis (VD-SERVICES, registre non peuplé) — liste vide plutôt
        # qu'un prix inventé. Voir rapport de mission.
        'liste': [],
    }
    return Response(data)


@extend_schema(tags=["Vendors"], summary="Statistiques boutique (30 jours) — GET /stats")
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def vendor_plans_stats(request):
    profile, err = _vendor_or_error(request)
    if err:
        return err
    vendor = request.user
    depuis = timezone.now() - timezone.timedelta(days=30)
    qs = Order.objects.filter(items__product__vendor=vendor, created_at__gte=depuis).distinct().prefetch_related('items__product')

    ventes = commandes = encaissees = 0
    par_jour = {i: 0 for i in range(7)}
    par_produit = {}
    for order in qs:
        items = list(order.items.filter(product__vendor=vendor))
        montant = sum(i.line_total_xaf for i in items)
        commandes += 1
        if order.escrow_status != Order.EscrowStatus.PENDING:
            encaissees += 1
            ventes += montant
            jour_semaine = (order.created_at.weekday())  # lundi=0 ... dimanche=6
            par_jour[jour_semaine] = par_jour.get(jour_semaine, 0) + montant
            for item in items:
                bucket = par_produit.setdefault(item.product_id, {'offreId': str(item.product_id), 'titre': item.title_snapshot, 'ventes': 0})
                bucket['ventes'] += item.line_total_xaf

    retours = Return.objects.filter(order__in=qs, vendor=vendor).count()
    total_ventes_produits = sum(p['ventes'] for p in par_produit.values()) or 1
    produits_tries = sorted(par_produit.values(), key=lambda p: -p['ventes'])
    for p in produits_tries:
        p['partPourCent'] = round(p['ventes'] * 100 / total_ventes_produits, 1)

    dependance = None
    if produits_tries and produits_tries[0]['partPourCent'] > 60:
        dependance = {'titre': produits_tries[0]['titre'], 'partPourCent': produits_tries[0]['partPourCent']}

    data = {
        'jours': 30,
        'ventes': ventes,
        'commandes': commandes,
        'encaissees': encaissees,
        'panierMoyen': round(ventes / encaissees) if encaissees else 0,
        'retoursPourCent': round(retours * 100 / commandes, 1) if commandes else 0,
        'vues': 0,  # pas de suivi d'audience produit dans ce code — non inventé.
        'conversionPourCent': 0,
        'parJour': [{'jour': j, 'ventes': par_jour.get(j, 0)} for j in range(7)],
        'parProduit': produits_tries[:10],
        'meilleursJours': [],
        'dependance': dependance,
        'historiqueVerrouille': profile.active_plan_code == 'FREE',
    }
    return Response(data)


@extend_schema(tags=["Vendors"], summary="Demande (mots cherchés, freins) — GET /demand")
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def vendor_demand(request):
    profile, err = _vendor_or_error(request)
    if err:
        return err
    zone = profile.zone.name if profile.zone_id else profile.city
    data = {
        'zone': zone,
        # Pas de suivi des recherches clients par zone/mot-clé dans ce code — non inventé.
        'recherches': [],
        'visiblesSansBoost': 3,
        'freins': [],
    }
    return Response(data)
