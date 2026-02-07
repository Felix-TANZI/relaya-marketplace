# backend/apps/vendors/serializers.py
# Serializers pour l'espace vendeur

from rest_framework import serializers
from .models import VendorProfile
from apps.orders.models import Order, OrderItem


#  SERIALIZERS PROFIL VENDEUR 

class VendorProfileSerializer(serializers.ModelSerializer):
    """Serializer pour le profil vendeur"""
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    
    class Meta:
        model = VendorProfile
        fields = [
            'id', 'username', 'email', 'business_name', 'business_description',
            'phone', 'address', 'city', 'id_document', 'status',
            'created_at', 'updated_at', 'approved_at'
        ]
        read_only_fields = ['id', 'status', 'created_at', 'updated_at', 'approved_at']


class VendorApplicationSerializer(serializers.ModelSerializer):
    """Serializer pour la demande de devenir vendeur"""
    
    class Meta:
        model = VendorProfile
        fields = [
            'business_name', 'business_description', 'phone',
            'address', 'city', 'id_document'
        ]
    
    def validate(self, data):
        """Vérifier que l'utilisateur n'est pas déjà vendeur"""
        user = self.context['request'].user
        if VendorProfile.objects.filter(user=user).exists():
            raise serializers.ValidationError("Vous avez déjà une demande vendeur.")
        return data
    
    def create(self, validated_data):
        """Créer le profil vendeur"""
        user = self.context['request'].user
        return VendorProfile.objects.create(user=user, **validated_data)


class VendorStatsSerializer(serializers.Serializer):
    """Serializer pour les statistiques du vendeur"""
    total_products = serializers.IntegerField()
    active_products = serializers.IntegerField()
    total_orders = serializers.IntegerField()
    total_revenue = serializers.DecimalField(max_digits=10, decimal_places=2)


#  SERIALIZERS COMMANDES 

class VendorOrderItemSerializer(serializers.ModelSerializer):
    """Serializer pour les items de commande du vendeur"""
    product_title = serializers.CharField(source='title_snapshot', read_only=True)
    product_price = serializers.IntegerField(source='price_xaf_snapshot', read_only=True)
    product_image = serializers.SerializerMethodField()
    
    class Meta:
        model = OrderItem
        fields = [
            'id', 
            'product', 
            'product_title',
            'product_price',
            'product_image',
            'qty', 
            'line_total_xaf',
            'created_at'
        ]
        read_only_fields = fields
    
    def get_product_image(self, obj):
        """Retourner l'URL de la première image du produit"""
        if obj.product and hasattr(obj.product, 'images'):
            first_image = obj.product.images.filter(is_primary=True).first() or obj.product.images.first()
            if first_image and first_image.image:
                request = self.context.get('request')
                if request:
                    return request.build_absolute_uri(first_image.image.url)
                return first_image.image.url
        return None


class VendorOrderSerializer(serializers.ModelSerializer):
    """
    Serializer pour les commandes vendeur avec séparation payment/fulfillment status
    """
    items = serializers.SerializerMethodField()
    customer_name = serializers.SerializerMethodField()
    vendor_total = serializers.SerializerMethodField()
    
    # Champs calculés en lecture seule
    is_paid = serializers.ReadOnlyField()
    can_be_fulfilled = serializers.ReadOnlyField()
    
    # Labels lisibles pour les statuts
    payment_status_display = serializers.CharField(
        source='get_payment_status_display',
        read_only=True
    )
    fulfillment_status_display = serializers.CharField(
        source='get_fulfillment_status_display',
        read_only=True
    )
    
    class Meta:
        model = Order
        fields = [
            'id',
            'customer_name',
            'customer_email',
            'customer_phone',
            'city',
            'address',
            'note',
            'payment_status',
            'payment_status_display',
            'fulfillment_status',
            'fulfillment_status_display',
            'items',
            'vendor_total',
            'subtotal_xaf',
            'delivery_fee_xaf',
            'total_xaf',
            'is_paid',
            'can_be_fulfilled',
            'created_at',
            'updated_at'
        ]
        read_only_fields = fields
    
    def get_items(self, obj):
        """Retourner uniquement les items du vendeur"""
        vendor = self.context.get('vendor')
        if vendor:
            vendor_items = obj.items.filter(product__vendor=vendor)
            return VendorOrderItemSerializer(vendor_items, many=True, context=self.context).data
        return []
    
    def get_customer_name(self, obj):
        """Retourner le nom du client"""
        if obj.user:
            return f"{obj.user.first_name} {obj.user.last_name}".strip() or obj.user.username
        return "Client anonyme"
    
    def get_vendor_total(self, obj):
        """Calculer le total pour ce vendeur uniquement"""
        vendor = self.context.get('vendor')
        if vendor:
            total = sum(
                item.line_total_xaf 
                for item in obj.items.filter(product__vendor=vendor)
            )
            return total
        return 0


#  NOUVEAUX SERIALIZERS (MISE À JOUR STATUTS) 

class UpdateFulfillmentStatusSerializer(serializers.Serializer):
    """
    Serializer pour mettre à jour le statut de livraison d'une commande
    Le vendeur ne peut modifier que le fulfillment_status, pas le payment_status
    """
    fulfillment_status = serializers.ChoiceField(
        choices=Order.FulfillmentStatus.choices,
        help_text="Nouveau statut de livraison : PENDING, PROCESSING, SHIPPED, DELIVERED, CANCELLED"
    )
    
    def validate_fulfillment_status(self, value):
        """Valider le changement de statut"""
        order = self.context.get('order')
        
        if not order:
            raise serializers.ValidationError("Commande non fournie dans le contexte")
        
        # Règles de transition de statuts
        current_status = order.fulfillment_status
        
        # Une commande annulée ne peut pas changer de statut
        if current_status == Order.FulfillmentStatus.CANCELLED:
            raise serializers.ValidationError(
                "Impossible de modifier le statut d'une commande annulée"
            )
        
        # Une commande livrée ne peut être que annulée (retour)
        if current_status == Order.FulfillmentStatus.DELIVERED:
            if value != Order.FulfillmentStatus.CANCELLED:
                raise serializers.ValidationError(
                    "Une commande livrée ne peut être qu'annulée"
                )
        
        # La commande doit être payée avant d'être traitée (sauf pour annulation)
        if value != Order.FulfillmentStatus.CANCELLED:
            if not order.is_paid:
                raise serializers.ValidationError(
                    "La commande doit être payée avant de pouvoir être traitée"
                )
        
        return value
    
    def update(self, instance, validated_data):
        """Mettre à jour le statut de livraison"""
        instance.fulfillment_status = validated_data['fulfillment_status']
        instance.save()
        return instance


class UpdatePaymentStatusSerializer(serializers.Serializer):
    """
    Serializer pour mettre à jour le statut de paiement d'une commande
    Utilisé par l'app payments principalement, mais peut être utilisé manuellement par le vendeur
    """
    payment_status = serializers.ChoiceField(
        choices=Order.PaymentStatus.choices,
        help_text="Nouveau statut de paiement : PENDING, PAID, FAILED, REFUNDED"
    )
    
    def validate_payment_status(self, value):
        """Valider le changement de statut de paiement"""
        order = self.context.get('order')
        
        if not order:
            raise serializers.ValidationError("Commande non fournie dans le contexte")
        
        current_status = order.payment_status
        
        # Une fois payé, on peut seulement rembourser
        if current_status == Order.PaymentStatus.PAID:
            if value not in [Order.PaymentStatus.PAID, Order.PaymentStatus.REFUNDED]:
                raise serializers.ValidationError(
                    "Une commande payée ne peut être que maintenue payée ou remboursée"
                )
        
        # Un remboursement est définitif
        if current_status == Order.PaymentStatus.REFUNDED:
            raise serializers.ValidationError(
                "Impossible de modifier le statut d'une commande remboursée"
            )
        
        return value
    
    def update(self, instance, validated_data):
        """Mettre à jour le statut de paiement"""
        instance.payment_status = validated_data['payment_status']
        instance.save()
        return instance
    

#  ADMIN DASHBOARD STATS 

class AdminDashboardStatsSerializer(serializers.Serializer):
    """Serializer pour les statistiques du dashboard admin"""
    
    # Utilisateurs
    total_users = serializers.IntegerField()
    new_users_today = serializers.IntegerField() # Nombre de nouveaux utilisateurs inscrits aujourd'hui
    new_users_week = serializers.IntegerField()
    new_users_month = serializers.IntegerField()
    
    # Vendeurs
    total_vendors = serializers.IntegerField()
    pending_vendors = serializers.IntegerField()
    approved_vendors = serializers.IntegerField()
    rejected_vendors = serializers.IntegerField()
    suspended_vendors = serializers.IntegerField()
    
    # Produits
    total_products = serializers.IntegerField()
    active_products = serializers.IntegerField()
    inactive_products = serializers.IntegerField()
    
    # Commandes
    total_orders = serializers.IntegerField()
    pending_orders = serializers.IntegerField()
    processing_orders = serializers.IntegerField()
    shipped_orders = serializers.IntegerField()
    delivered_orders = serializers.IntegerField()
    cancelled_orders = serializers.IntegerField()
    
    # Revenus
    revenue_total = serializers.IntegerField()
    revenue_today = serializers.IntegerField()
    revenue_week = serializers.IntegerField()
    revenue_month = serializers.IntegerField()
    
    # Paiements
    paid_orders = serializers.IntegerField()
    unpaid_orders = serializers.IntegerField()
    failed_payments = serializers.IntegerField()    


    #  ADMIN DASHBOARD - DONNÉES GRAPHIQUES 

class RevenueDataPointSerializer(serializers.Serializer):
    """Point de données pour le graphique revenus"""
    date = serializers.DateField()
    revenue = serializers.IntegerField()


class TopProductSerializer(serializers.Serializer):
    """Produit le plus vendu"""
    product_id = serializers.IntegerField()
    product_title = serializers.CharField()
    total_quantity = serializers.IntegerField()
    total_revenue = serializers.IntegerField()


class TopVendorSerializer(serializers.Serializer):
    """Vendeur le plus performant"""
    vendor_id = serializers.IntegerField()
    vendor_name = serializers.CharField()
    business_name = serializers.CharField()
    total_revenue = serializers.IntegerField()
    total_orders = serializers.IntegerField()


class RecentActivitySerializer(serializers.Serializer):
    """Activité récente sur la plateforme"""
    type = serializers.CharField()  # 'order', 'vendor', 'product'
    description = serializers.CharField()
    timestamp = serializers.DateTimeField()
    user = serializers.CharField(required=False)
    amount = serializers.IntegerField(required=False)


class AdminAnalyticsSerializer(serializers.Serializer):
    """Données analytiques complètes pour le dashboard"""
    revenue_chart = RevenueDataPointSerializer(many=True)
    top_products = TopProductSerializer(many=True)
    top_vendors = TopVendorSerializer(many=True)
    recent_activity = RecentActivitySerializer(many=True)
    
    # Métriques avancées
    average_order_value = serializers.IntegerField()
    conversion_rate = serializers.FloatField()
    total_revenue_growth = serializers.FloatField()  # % croissance vs mois dernier


#  ADMIN PRODUCTS MANAGEMENT 

class AdminProductListSerializer(serializers.ModelSerializer):
    """Serializer pour la liste admin des produits"""
    vendor_name = serializers.CharField(source='vendor.username', read_only=True)
    vendor_business = serializers.CharField(source='vendor.vendor_profile.business_name', read_only=True, default='N/A')
    category_name = serializers.CharField(source='category.name', read_only=True)
    stock_quantity = serializers.SerializerMethodField()
    images_count = serializers.SerializerMethodField()
    
    class Meta:
        from apps.catalog.models import Product
        model = Product
        fields = [
            'id', 'title', 'slug', 'price_xaf', 'is_active',
            'vendor', 'vendor_name', 'vendor_business',
            'category', 'category_name',
            'stock_quantity', 'images_count',
            'created_at', 'updated_at'
        ]
    
    def get_stock_quantity(self, obj):
        try:
            return obj.inventory.quantity
        except:
            return 0
    
    def get_images_count(self, obj):
        return obj.images.count()


class AdminProductUpdateSerializer(serializers.ModelSerializer):
    """Serializer pour la modification admin d'un produit"""
    
    class Meta:
        from apps.catalog.models import Product
        model = Product
        fields = ['title', 'description', 'price_xaf', 'is_active', 'category']    


#  ADMIN ORDERS MANAGEMENT 

class OrderHistorySerializer(serializers.ModelSerializer):
    """Serializer pour l'historique des modifications"""
    user_name = serializers.CharField(source='user.username', read_only=True, default='Système')
    
    class Meta:
        from apps.orders.models import OrderHistory
        model = OrderHistory
        fields = [
            'id', 'user', 'user_name', 'action', 'field_name',
            'old_value', 'new_value', 'timestamp', 'ip_address'
        ]


class AdminOrderItemSerializer(serializers.Serializer):
    """Items de commande pour admin"""
    id = serializers.IntegerField()
    product_id = serializers.IntegerField()
    product_title = serializers.CharField()
    product_image = serializers.CharField(allow_null=True)
    vendor_name = serializers.CharField()
    qty = serializers.IntegerField()
    price_xaf_snapshot = serializers.IntegerField()
    line_total_xaf = serializers.IntegerField()


class AdminOrderListSerializer(serializers.ModelSerializer):
    """Serializer pour liste admin des commandes"""
    customer_name = serializers.SerializerMethodField()
    items_count = serializers.SerializerMethodField()
    vendor_names = serializers.SerializerMethodField()
    
    class Meta:
        from apps.orders.models import Order
        model = Order
        fields = [
            'id', 'customer_name', 'customer_email', 'customer_phone',
            'city', 'payment_status', 'fulfillment_status',
            'subtotal_xaf', 'delivery_fee_xaf', 'total_xaf',
            'items_count', 'vendor_names',
            'created_at', 'updated_at'
        ]
    
    def get_customer_name(self, obj):
        if obj.user:
            return f"{obj.user.first_name} {obj.user.last_name}".strip() or obj.user.username
        return "Invité"
    
    def get_items_count(self, obj):
        return obj.items.count()
    
    def get_vendor_names(self, obj):
        vendors = obj.items.values_list('product__vendor__username', flat=True).distinct()
        return list(vendors)


class AdminOrderDetailSerializer(serializers.ModelSerializer):
    """Serializer détaillé pour une commande admin"""
    customer_name = serializers.SerializerMethodField()
    items = serializers.SerializerMethodField()
    history = OrderHistorySerializer(many=True, read_only=True)
    payment_transactions = serializers.SerializerMethodField()
    
    class Meta:
        from apps.orders.models import Order
        model = Order
        fields = [
            'id', 'user', 'customer_name', 'customer_email', 'customer_phone',
            'city', 'address', 'note',
            'payment_status', 'fulfillment_status',
            'subtotal_xaf', 'delivery_fee_xaf', 'total_xaf',
            'items', 'history', 'payment_transactions',
            'created_at', 'updated_at'
        ]
    
    def get_customer_name(self, obj):
        if obj.user:
            return f"{obj.user.first_name} {obj.user.last_name}".strip() or obj.user.username
        return "Invité"
    
    def get_items(self, obj):
        items_data = []
        for item in obj.items.select_related('product', 'product__vendor').prefetch_related('product__images'):
            primary_image = item.product.images.filter(is_primary=True).first()
            image_url = None
            if primary_image:
                request = self.context.get('request')
                if request:
                    image_url = request.build_absolute_uri(primary_image.image.url)
            
            items_data.append({
                'id': item.id,
                'product_id': item.product.id,
                'product_title': item.title_snapshot,
                'product_image': image_url,
                'vendor_name': item.product.vendor.username if item.product.vendor else 'N/A',
                'qty': item.qty,
                'price_xaf_snapshot': item.price_xaf_snapshot,
                'line_total_xaf': item.line_total_xaf,
            })
        return items_data
    
    def get_payment_transactions(self, obj):
        """Récupérer les transactions de paiement"""
        from apps.payments.models import PaymentTransaction
        transactions = PaymentTransaction.objects.filter(order=obj).order_by('-created_at')
        
        return [
            {
                'id': str(tx.id),
                'provider': tx.provider,
                'status': tx.status,
                'amount_xaf': tx.amount_xaf,
                'payer_phone': tx.payer_phone,
                'external_ref': tx.external_ref,
                'created_at': tx.created_at,
            }
            for tx in transactions
        ]


class AdminOrderUpdateSerializer(serializers.Serializer):
    """Serializer pour modifier une commande (admin)"""
    payment_status = serializers.ChoiceField(
        choices=['PENDING', 'PAID', 'FAILED', 'REFUNDED'],
        required=False
    )
    fulfillment_status = serializers.ChoiceField(
        choices=['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'],
        required=False
    )
    note = serializers.CharField(required=False, allow_blank=True)        


#  ADMIN USERS MANAGEMENT 

class UserActivityLogSerializer(serializers.ModelSerializer):
    """Serializer pour le journal d'activité"""
    performed_by_name = serializers.CharField(source='performed_by.username', read_only=True, default='Système')
    
    class Meta:
        from apps.accounts.models import UserActivityLog
        model = UserActivityLog
        fields = [
            'id', 'action', 'description', 'performed_by', 'performed_by_name',
            'ip_address', 'user_agent', 'timestamp'
        ]


class AdminUserListSerializer(serializers.ModelSerializer):
    """Serializer pour liste admin des utilisateurs"""
    is_vendor = serializers.SerializerMethodField()
    is_banned = serializers.SerializerMethodField()
    total_orders = serializers.SerializerMethodField()
    total_spent = serializers.SerializerMethodField()
    
    class Meta:
        from django.contrib.auth.models import User
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'is_staff', 'is_active', 'is_superuser',
            'is_vendor', 'is_banned',
            'total_orders', 'total_spent',
            'date_joined', 'last_login'
        ]
    
    def get_is_vendor(self, obj):
        return hasattr(obj, 'vendor_profile')
    
    def get_is_banned(self, obj):
        if hasattr(obj, 'profile'):
            return obj.profile.is_banned
        return False
    
    def get_total_orders(self, obj):
        from apps.orders.models import Order
        return Order.objects.filter(user=obj).count()
    
    def get_total_spent(self, obj):
        from apps.orders.models import Order
        from django.db.models import Sum
        total = Order.objects.filter(
            user=obj, 
            payment_status='PAID'
        ).aggregate(total=Sum('total_xaf'))['total']
        return total or 0


class AdminUserDetailSerializer(serializers.ModelSerializer):
    """Serializer détaillé pour un utilisateur"""
    is_vendor = serializers.SerializerMethodField()
    vendor_profile = serializers.SerializerMethodField()
    profile = serializers.SerializerMethodField()
    activity_logs = UserActivityLogSerializer(many=True, read_only=True)
    stats = serializers.SerializerMethodField()
    
    class Meta:
        from django.contrib.auth.models import User
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'is_staff', 'is_active', 'is_superuser',
            'date_joined', 'last_login',
            'is_vendor', 'vendor_profile', 'profile',
            'activity_logs', 'stats'
        ]
    
    def get_is_vendor(self, obj):
        return hasattr(obj, 'vendor_profile')
    
    def get_vendor_profile(self, obj):
        if hasattr(obj, 'vendor_profile'):
            from apps.vendors.serializers import VendorProfileSerializer
            return VendorProfileSerializer(obj.vendor_profile).data
        return None
    
    def get_profile(self, obj):
        if hasattr(obj, 'profile'):
            return {
                'phone': obj.profile.phone,
                'bio': obj.profile.bio,
                'is_banned': obj.profile.is_banned,
                'ban_reason': obj.profile.ban_reason,
                'banned_at': obj.profile.banned_at,
                'banned_by': obj.profile.banned_by.username if obj.profile.banned_by else None,
                'newsletter_subscribed': obj.profile.newsletter_subscribed,
            }
        return None
    
    def get_stats(self, obj):
        from apps.orders.models import Order
        from django.db.models import Sum, Count
        
        orders = Order.objects.filter(user=obj)
        paid_orders = orders.filter(payment_status='PAID')
        
        stats = {
            'total_orders': orders.count(),
            'paid_orders': paid_orders.count(),
            'pending_orders': orders.filter(payment_status='PENDING').count(),
            'total_spent': paid_orders.aggregate(total=Sum('total_xaf'))['total'] or 0,
            'average_order_value': 0,
        }
        
        if stats['paid_orders'] > 0:
            stats['average_order_value'] = int(stats['total_spent'] / stats['paid_orders'])
        
        # Si vendeur
        if hasattr(obj, 'vendor_profile'):
            from apps.catalog.models import Product
            vendor_products = Product.objects.filter(vendor=obj)
            stats['total_products'] = vendor_products.count()
            stats['active_products'] = vendor_products.filter(is_active=True).count()
        
        return stats


class AdminUserUpdateSerializer(serializers.Serializer):
    """Serializer pour modification utilisateur (admin)"""
    is_staff = serializers.BooleanField(required=False)
    is_active = serializers.BooleanField(required=False)
    is_superuser = serializers.BooleanField(required=False)
    first_name = serializers.CharField(required=False, allow_blank=True)
    last_name = serializers.CharField(required=False, allow_blank=True)
    email = serializers.EmailField(required=False)    


#  ADMIN DISPUTES MANAGEMENT 

class DisputeMessageSerializer(serializers.ModelSerializer):
    """Serializer pour message de litige"""
    sender_name = serializers.CharField(source='sender.username', read_only=True)
    
    class Meta:
        from apps.orders.models import DisputeMessage
        model = DisputeMessage
        fields = ['id', 'sender', 'sender_name', 'message', 'is_internal', 'created_at']


class DisputeEvidenceSerializer(serializers.ModelSerializer):
    """Serializer pour preuve de litige"""
    uploaded_by_name = serializers.CharField(source='uploaded_by.username', read_only=True)
    file_url = serializers.SerializerMethodField()
    
    class Meta:
        from apps.orders.models import DisputeEvidence
        model = DisputeEvidence
        fields = ['id', 'uploaded_by', 'uploaded_by_name', 'file', 'file_url', 'description', 'created_at']
    
    def get_file_url(self, obj):
        request = self.context.get('request')
        if request and obj.file:
            return request.build_absolute_uri(obj.file.url)
        return None


class AdminDisputeListSerializer(serializers.ModelSerializer):
    """Serializer pour liste admin des litiges"""
    order_id = serializers.IntegerField(source='order.id', read_only=True)
    customer_name = serializers.SerializerMethodField()
    opened_by_name = serializers.CharField(source='opened_by.username', read_only=True)
    messages_count = serializers.SerializerMethodField()
    
    class Meta:
        from apps.orders.models import Dispute
        model = Dispute
        fields = [
            'id', 'order', 'order_id', 'opened_by', 'opened_by_name',
            'customer_name', 'reason', 'status', 'resolution',
            'messages_count', 'created_at', 'updated_at'
        ]
    
    def get_customer_name(self, obj):
        if obj.order.user:
            return obj.order.user.username
        return obj.order.customer_email or 'Invité'
    
    def get_messages_count(self, obj):
        return obj.messages.count()


class AdminDisputeDetailSerializer(serializers.ModelSerializer):
    """Serializer détaillé pour un litige"""
    order_detail = serializers.SerializerMethodField()
    opened_by_name = serializers.CharField(source='opened_by.username', read_only=True)
    resolved_by_name = serializers.CharField(source='resolved_by.username', read_only=True, default=None)
    messages = DisputeMessageSerializer(many=True, read_only=True)
    evidences = DisputeEvidenceSerializer(many=True, read_only=True)
    
    class Meta:
        from apps.orders.models import Dispute
        model = Dispute
        fields = [
            'id', 'order', 'order_detail', 'opened_by', 'opened_by_name',
            'reason', 'status', 'description',
            'resolution', 'resolution_note', 'resolved_by', 'resolved_by_name', 'resolved_at',
            'refund_amount_xaf',
            'messages', 'evidences',
            'created_at', 'updated_at'
        ]
    
    def get_order_detail(self, obj):
        return {
            'id': obj.order.id,
            'total_xaf': obj.order.total_xaf,
            'customer_email': obj.order.customer_email,
            'customer_phone': obj.order.customer_phone,
            'payment_status': obj.order.payment_status,
            'fulfillment_status': obj.order.fulfillment_status,
            'created_at': obj.order.created_at,
        }


class AdminDisputeUpdateSerializer(serializers.Serializer):
    """Serializer pour modification litige (admin)"""
    status = serializers.ChoiceField(
        choices=['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'],
        required=False
    )
    resolution = serializers.ChoiceField(
        choices=['REFUND', 'EXCHANGE', 'PARTIAL_REFUND', 'REJECTED', 'OTHER'],
        required=False
    )
    resolution_note = serializers.CharField(required=False, allow_blank=True)
    refund_amount_xaf = serializers.IntegerField(required=False, allow_null=True)


class DisputeMessageCreateSerializer(serializers.Serializer):
    """Serializer pour créer un message"""
    message = serializers.CharField()
    is_internal = serializers.BooleanField(default=False)    