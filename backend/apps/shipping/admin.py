# backend/apps/shipping/admin.py
# Enregistrement des modèles shipping dans Django Admin.

from django.contrib import admin
from django.utils.html import format_html
from .models import DemandeAdresse, RelayParcel, Shipment, ShipmentEvent, ShipmentMessage, Zone


@admin.register(Zone)
class ZoneAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'city', 'tier', 'contour_trace', 'is_active', 'is_bootstrapping')
    list_filter = ('city', 'tier', 'is_active', 'is_bootstrapping')
    search_fields = ('name', 'city', 'code')
    # Nom, vague et quartiers des zones Z1 à Z12 suivent t_zones et t_quartiers (réglages) : on les change là-bas.
    readonly_fields = ('code',)
    fieldsets = (
        (None, {'fields': ('code', 'name', 'city', 'tier', 'districts', 'is_active')}),
        ('Contour (R75.2, R76.4)', {
            'fields': ('contour',),
            'description': "GeoJSON Polygon ou MultiPolygon, coordonnées [longitude, latitude], tracé par l'équipe logistique.",
        }),
        ('Majoration Vague 3', {'fields': ('surcharge_xaf',)}),
        ('Créneaux (§5.1)', {'fields': (
            'morning_slot_start', 'morning_slot_end', 'afternoon_slot_start', 'afternoon_slot_end',
        )}),
        ('Amorçage (§5.4)', {'fields': (
            'is_bootstrapping', 'bootstrap_budget_xaf', 'bootstrap_target_colis_per_tournee', 'bootstrap_started_at',
        )}),
    )

    @admin.display(boolean=True, description='Contour tracé')
    def contour_trace(self, obj):
        return bool(obj.contour)


@admin.register(DemandeAdresse)
class DemandeAdresseAdmin(admin.ModelAdmin):
    """Demandes non servies (R76.5) et quartiers à rattacher (R76.2) pour l'équipe logistique."""

    list_display = ('cree_le', 'type', 'quartier_saisi', 'latitude', 'longitude', 'quartier_rattache', 'traitee')
    list_filter = ('type', 'traitee')
    search_fields = ('quartier_saisi', 'quartier_rattache')
    readonly_fields = ('type', 'user', 'quartier_saisi', 'latitude', 'longitude', 'precision_m', 'cree_le')
    list_editable = ('traitee',)


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
    list_display  = ('id', 'order_ref', 'status_badge', 'courier_name', 'courier_phone', 'assignment_issue_code', 'created_at')
    list_filter   = ('status', 'required_vehicle_type', 'parcel_size')
    search_fields = ('order__id', 'courier_name', 'courier_phone', 'assignment_issue_code', 'assignment_issue_message')
    readonly_fields = ('created_at', 'updated_at')
    inlines       = [ShipmentEventInline]
    ordering      = ('-created_at',)

    fieldsets = (
        ('Commande', {
            'fields': ('order',),
        }),
        ('Statut', {
            'fields': ('status', 'assignment_issue_code', 'assignment_issue_message'),
        }),
        ('Livreur', {
            'fields': ('courier_name', 'courier_phone', 'relay_point'),
        }),
        ('Contraintes colis', {
            'fields': ('required_vehicle_type', 'parcel_size'),
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
            'WAITING_MANUAL_ASSIGNMENT': 'orange',
            'ZONE_UNCOVERED':   'red',
            'CAPACITY_BLOCKED': 'orange',
            'VEHICLE_INCOMPATIBLE': 'orange',
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


@admin.register(RelayParcel)
class RelayParcelAdmin(admin.ModelAdmin):
    list_display = ("id", "shipment", "relay_point", "status", "slot_code", "pickup_code", "updated_at")
    list_filter = ("status", "relay_point")
    search_fields = ("shipment__order__id", "relay_point__name", "slot_code", "pickup_code")
    readonly_fields = ("created_at", "updated_at", "received_at", "picked_up_at", "returned_at")
    ordering = ("-updated_at",)
