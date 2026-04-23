from django.contrib import admin

from .models import Shipment, ShipmentEvent


class ShipmentEventInline(admin.TabularInline):
    model = ShipmentEvent
    extra = 0
    readonly_fields = ("created_at",)


@admin.register(Shipment)
class ShipmentAdmin(admin.ModelAdmin):
    list_display = ("order", "status", "courier", "courier_name", "courier_phone", "updated_at")
    list_filter = ("status", "updated_at", "created_at")
    search_fields = ("order__id", "courier_name", "courier_phone", "courier__user__username")
    autocomplete_fields = ("courier",)
    inlines = [ShipmentEventInline]


@admin.register(ShipmentEvent)
class ShipmentEventAdmin(admin.ModelAdmin):
    list_display = ("shipment", "status", "location", "created_at")
    list_filter = ("status", "created_at")
    search_fields = ("shipment__order__id", "message", "location")
