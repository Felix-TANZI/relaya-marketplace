# backend/apps/orders/admin.py
# Enregistrement complet des modèles orders dans Django Admin.
# Remplace le fichier vide existant.
# Note : Shipment/ShipmentEvent sont dans l'app shipping — voir shipping/admin.py

from django.contrib import admin
from django.utils.html import format_html
from django.utils import timezone
from .models import (
    Order,
    OrderItem,
    OrderHistory,
    Dispute,
    DisputeMessage,
    DisputeEvidence,
    PlatformSettings,
)


# ─── INLINE : Articles d'une commande ────────────────────────────────────────

class OrderItemInline(admin.TabularInline):
    model           = OrderItem
    extra           = 0
    readonly_fields = ('product', 'title_snapshot', 'price_xaf_snapshot', 'qty', 'line_total_xaf')
    can_delete      = False

    def has_add_permission(self, request, obj=None):
        return False


# ─── INLINE : Historique d'une commande ──────────────────────────────────────

class OrderHistoryInline(admin.TabularInline):
    model           = OrderHistory
    extra           = 0
    readonly_fields = ('user', 'action', 'field_name', 'old_value', 'new_value', 'timestamp', 'ip_address')
    can_delete      = False

    def has_add_permission(self, request, obj=None):
        return False


# ─── COMMANDES ────────────────────────────────────────────────────────────────

@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display  = (
        'reference', 'user', 'customer_phone', 'city',
        'payment_badge', 'fulfillment_badge',
        'total_xaf_fmt', 'created_at',
    )
    list_filter   = ('payment_status', 'fulfillment_status', 'city')
    search_fields = ('id', 'user__username', 'user__email', 'customer_email', 'customer_phone')
    readonly_fields = (
        'subtotal_xaf', 'delivery_fee_xaf', 'total_xaf',
        'commission_rate_snapshot', 'vendor_reply_deadline',
        'created_at', 'updated_at',
    )
    inlines       = [OrderItemInline, OrderHistoryInline]
    ordering      = ('-created_at',)

    fieldsets = (
        ('Client', {
            'fields': ('user', 'customer_email', 'customer_phone'),
        }),
        ('Livraison', {
            'fields': ('city', 'address', 'note'),
        }),
        ('Statuts', {
            'fields': ('payment_status', 'fulfillment_status', 'escrow_status'),
        }),
        ('Montants (lecture seule)', {
            'fields': ('subtotal_xaf', 'delivery_fee_xaf', 'total_xaf', 'commission_rate_snapshot'),
        }),
        ('Escrow & Délais', {
            'fields': ('vendor_reply_deadline',),
            'classes': ('collapse',),
        }),
        ('Dates', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )

    def reference(self, obj):
        return format_html('<strong>BLV-{:05d}</strong>', obj.id)
    reference.short_description = 'Référence'

    def total_xaf_fmt(self, obj):
        return f"{obj.total_xaf:,} FCFA".replace(',', ' ')
    total_xaf_fmt.short_description = 'Total'

    def payment_badge(self, obj):
        colors = {
            'PENDING':  'orange',
            'PAID':     'green',
            'FAILED':   'red',
            'REFUNDED': 'gray',
        }
        color = colors.get(obj.payment_status, 'gray')
        return format_html(
            '<span style="color:{}; font-weight:bold;">● {}</span>',
            color, obj.get_payment_status_display()
        )
    payment_badge.short_description = 'Paiement'

    def fulfillment_badge(self, obj):
        colors = {
            'CREATED':          'gray',
            'PAID_IN_ESCROW':   'blue',
            'PREPARING':        'purple',
            'DELIVERED':        'green',
            'CANCELLED':        'red',
            'DISPUTED':         'orange',
        }
        color = colors.get(obj.fulfillment_status, 'gray')
        label = obj.get_fulfillment_status_display()
        return format_html(
            '<span style="color:{}; font-weight:bold;">● {}</span>',
            color, label
        )
    fulfillment_badge.short_description = 'Livraison'

    actions = ['mark_paid', 'mark_cancelled']

    def mark_paid(self, request, queryset):
        count = queryset.filter(payment_status='PENDING').update(payment_status='PAID')
        self.message_user(request, f"{count} commande(s) marquée(s) comme payée(s).")
    mark_paid.short_description = "Marquer comme payée (PAID)"

    def mark_cancelled(self, request, queryset):
        count = queryset.update(fulfillment_status='CANCELLED')
        self.message_user(request, f"{count} commande(s) annulée(s).")
    mark_cancelled.short_description = "Annuler les commandes sélectionnées"


# ─── INLINE : Messages d'un litige ───────────────────────────────────────────

class DisputeMessageInline(admin.StackedInline):
    model       = DisputeMessage
    extra       = 1
    fields      = ('sender', 'sender_role', 'message', 'is_internal')
    readonly_fields = ('created_at',)

    def get_extra(self, request, obj=None, **kwargs):
        if obj and obj.status in ('RESOLVED', 'CLOSED'):
            return 0
        return 1


# ─── INLINE : Preuves d'un litige ────────────────────────────────────────────

class DisputeEvidenceInline(admin.TabularInline):
    model           = DisputeEvidence
    extra           = 0
    fields          = ('uploaded_by', 'file', 'description', 'created_at')
    readonly_fields = ('created_at',)


# ─── LITIGES ─────────────────────────────────────────────────────────────────

@admin.register(Dispute)
class DisputeAdmin(admin.ModelAdmin):
    list_display  = (
        'id', 'order_ref', 'opened_by', 'reason_display',
        'status_badge', 'vendor_contacted', 'vendor_replied',
        'assigned_admin', 'created_at',
    )
    list_filter   = ('status', 'reason', 'vendor_contacted', 'vendor_replied')
    search_fields = ('id', 'order__id', 'opened_by__username', 'description')
    readonly_fields = (
        'opened_by', 'order', 'created_at', 'updated_at',
        'vendor_replied', 'vendor_reply_type', 'vendor_reply_text',
        'vendor_proposed_amount', 'vendor_replied_at',
    )
    inlines       = [DisputeMessageInline, DisputeEvidenceInline]
    ordering      = ('-created_at',)

    fieldsets = (
        ('Litige', {
            'fields': ('order', 'opened_by', 'reason', 'description'),
        }),
        ('Gestion Admin', {
            'fields': (
                'status', 'assigned_admin',
                'vendor_contacted',
                'resolution', 'resolution_note', 'refund_amount_xaf',
                'resolved_by', 'resolved_at',
            ),
        }),
        ('Réponse Vendeur (lecture seule)', {
            'fields': (
                'vendor_replied', 'vendor_reply_type',
                'vendor_reply_text', 'vendor_proposed_amount', 'vendor_replied_at',
            ),
            'classes': ('collapse',),
        }),
        ('Dates', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )

    def order_ref(self, obj):
        return f"BLV-{obj.order_id:05d}"
    order_ref.short_description = 'Commande'

    def reason_display(self, obj):
        return obj.get_reason_display()
    reason_display.short_description = 'Motif'

    def status_badge(self, obj):
        colors = {
            'OPEN':        'orange',
            'IN_PROGRESS': 'blue',
            'RESOLVED':    'green',
            'CLOSED':      'gray',
        }
        color = colors.get(obj.status, 'gray')
        return format_html(
            '<span style="color:{}; font-weight:bold;">● {}</span>',
            color, obj.get_status_display()
        )
    status_badge.short_description = 'Statut'

    actions = ['mark_vendor_contacted', 'mark_resolved', 'mark_closed']

    def mark_vendor_contacted(self, request, queryset):
        count = queryset.filter(vendor_contacted=False).update(vendor_contacted=True)
        self.message_user(request, f"{count} litige(s) : vendeur marqué contacté.")
    mark_vendor_contacted.short_description = "Marquer vendeur contacté"

    def mark_resolved(self, request, queryset):
        count = queryset.exclude(status='RESOLVED').update(
            status='RESOLVED',
            resolved_by=request.user,
            resolved_at=timezone.now(),
        )
        self.message_user(request, f"{count} litige(s) résolu(s).")
    mark_resolved.short_description = "Marquer comme résolu"

    def mark_closed(self, request, queryset):
        count = queryset.exclude(status='CLOSED').update(status='CLOSED')
        self.message_user(request, f"{count} litige(s) clôturé(s).")
    mark_closed.short_description = "Clôturer les litiges"


# ─── MESSAGES DE LITIGE ───────────────────────────────────────────────────────

@admin.register(DisputeMessage)
class DisputeMessageAdmin(admin.ModelAdmin):
    list_display    = ('id', 'dispute', 'sender', 'sender_role', 'is_internal', 'created_at')
    list_filter     = ('sender_role', 'is_internal')
    search_fields   = ('dispute__id', 'sender__username', 'message')
    readonly_fields = ('created_at',)
    ordering        = ('-created_at',)


# ─── PARAMÈTRES PLATEFORME ────────────────────────────────────────────────────

@admin.register(PlatformSettings)
class PlatformSettingsAdmin(admin.ModelAdmin):
    """Singleton — un seul objet, toujours l'id=1."""

    def has_add_permission(self, request):
        return not PlatformSettings.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False

    fieldsets = (
        ('Commission & Montants', {
            'fields': (
                'platform_commission_percent',
                'minimum_order_amount_xaf',
                'minimum_withdrawal_amount_xaf',
                'withdrawal_fee_percent',
                'default_delivery_days',
            ),
        }),
        ('Frais de livraison', {
            'fields': ('delivery_fees',),
            'description': 'JSON : {"Yaoundé": 1000, "Douala": 1500, ...}',
        }),
        ('Paiements', {
            'fields': ('mtn_momo_enabled', 'orange_money_enabled'),
        }),
        ('Contacts', {
            'fields': ('admin_email', 'support_email'),
        }),
        ('Maintenance', {
            'fields': ('maintenance_mode', 'maintenance_message'),
        }),
    )