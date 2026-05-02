# backend/apps/shipping/admin.py
# Enregistrement des modèles shipping dans Django Admin.

from django.contrib import admin
from django.utils.html import format_html
from .models import Shipment, ShipmentEvent, ShipmentMessage


# ─── INLINE : Événements d'une livraison ─────────────────────────────────────

class ShipmentEventInline(admin.TabularInline):
    model           = ShipmentEvent
    extra           = 1
    fields          = ('status', 'message', 'location', 'created_at')
    readonly_fields = ('created_at',)
    ordering        = ('created_at',)


# ─── LIVRAISONS ───────────────────────────────────────────────────────────────

@admin.register(Shipment)
class ShipmentAdmin(admin.ModelAdmin):
    list_display  = ('id', 'order_ref', 'status_badge', 'courier_name', 'courier_phone', 'created_at')
    list_filter   = ('status',)
    search_fields = ('order__id', 'courier_name', 'courier_phone')
    readonly_fields = ('created_at', 'updated_at')
    inlines       = [ShipmentEventInline]
    ordering      = ('-created_at',)

    fieldsets = (
        ('Commande', {
            'fields': ('order',),
        }),
        ('Statut', {
            'fields': ('status',),
        }),
        ('Livreur', {
            'fields': ('courier_name', 'courier_phone', 'relay_point'),
        }),
        ('Dates', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )

    def order_ref(self, obj):
        return f"BLV-{obj.order_id:05d}"
    order_ref.short_description = 'Commande'

    def status_badge(self, obj):
        colors = {
            'CREATED':          'gray',
            'ASSIGNED':         'blue',
            'PICKED_UP':        'purple',
            'IN_TRANSIT':       'orange',
            'OUT_FOR_DELIVERY': 'blue',
            'DELIVERED':        'green',
            'FAILED':           'red',
            'CANCELLED':        'gray',
        }
        color = colors.get(obj.status, 'gray')
        return format_html(
            '<span style="color:{}; font-weight:bold;">● {}</span>',
            color, obj.status
        )
    status_badge.short_description = 'Statut'

    actions = ['mark_delivered', 'mark_failed']

    def mark_delivered(self, request, queryset):
        count = queryset.exclude(status='DELIVERED').update(status='DELIVERED')
        self.message_user(request, f"{count} livraison(s) marquée(s) comme livrée(s).")
    mark_delivered.short_description = "Marquer comme livré"

    def mark_failed(self, request, queryset):
        count = queryset.exclude(status__in=['DELIVERED', 'CANCELLED']).update(status='FAILED')
        self.message_user(request, f"{count} livraison(s) marquée(s) comme échouée(s).")
    mark_failed.short_description = "Marquer comme échoué"


# ─── ÉVÉNEMENTS DE LIVRAISON ──────────────────────────────────────────────────

@admin.register(ShipmentEvent)
class ShipmentEventAdmin(admin.ModelAdmin):
    list_display  = ('id', 'shipment', 'status', 'message', 'location', 'created_at')
    list_filter   = ('status',)
    search_fields = ('shipment__order__id', 'message', 'location')
    readonly_fields = ('created_at',)
    ordering      = ('-created_at',)


@admin.register(ShipmentMessage)
class ShipmentMessageAdmin(admin.ModelAdmin):
    list_display = ("id", "shipment", "channel", "sender", "sender_role", "created_at")
    list_filter = ("channel", "sender_role")
    search_fields = ("shipment__order__id", "sender__username", "message")
    readonly_fields = ("created_at",)
    ordering = ("-created_at",)
