# backend/apps/whatsapp_assistant/admin.py
# Consultation des échanges dans l'admin Django (/admin/) : utile pour suivre
# et déboguer l'assistant. Lecture seule : les messages ne se modifient pas.

from django.contrib import admin
from django.utils.html import format_html

from .models import CourierNotification, WhatsAppContact, WhatsAppMedia, WhatsAppMessage, WhatsAppPoster


@admin.register(WhatsAppPoster)
class WhatsAppPosterAdmin(admin.ModelAdmin):
    """Affiches publicitaires envoyées avant l'accueil (rotation entre les actives)."""

    list_display = ("preview", "title", "placement", "is_active", "display_order", "starts_at", "ends_at")
    list_display_links = ("preview", "title")
    list_editable = ("is_active", "display_order")
    list_filter = ("placement", "is_active")
    readonly_fields = ("preview_large", "created_at")
    fieldsets = (
        (None, {"fields": ("title", "placement", "image", "preview_large")}),
        ("Légendes", {"fields": ("caption_fr", "caption_en")}),
        ("Diffusion", {"fields": ("is_active", "display_order", "starts_at", "ends_at", "created_at")}),
    )

    @admin.display(description="Aperçu")
    def preview(self, obj):
        return format_html('<img src="{}" style="height:48px;border-radius:6px">', obj.image.url) if obj.image else "—"

    @admin.display(description="Aperçu")
    def preview_large(self, obj):
        return format_html('<img src="{}" style="max-height:320px;border-radius:10px">', obj.image.url) if obj.image else "—"


@admin.register(WhatsAppMedia)
class WhatsAppMediaAdmin(admin.ModelAdmin):
    list_display = ("source_name", "media_id", "uploaded_at")
    search_fields = ("source_name",)

    def has_add_permission(self, request):
        return False


class WhatsAppMessageInline(admin.TabularInline):
    model = WhatsAppMessage
    fields = ("created_at", "direction", "message_type", "text", "error")
    readonly_fields = fields
    extra = 0
    can_delete = False
    ordering = ("-created_at",)
    show_change_link = True

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(WhatsAppContact)
class WhatsAppContactAdmin(admin.ModelAdmin):
    list_display = ("wa_id", "profile_name", "language", "first_seen_at", "last_inbound_at")
    search_fields = ("wa_id", "profile_name")
    list_filter = ("language",)
    readonly_fields = ("wa_id", "first_seen_at", "last_inbound_at")
    inlines = [WhatsAppMessageInline]


@admin.register(WhatsAppMessage)
class WhatsAppMessageAdmin(admin.ModelAdmin):
    list_display = ("created_at", "contact", "direction", "message_type", "short_text", "has_error")
    list_filter = ("direction", "message_type")
    search_fields = ("contact__wa_id", "contact__profile_name", "text")
    readonly_fields = [f.name for f in WhatsAppMessage._meta.fields]

    @admin.display(description="Texte")
    def short_text(self, obj):
        return obj.text[:60]

    @admin.display(boolean=True, description="Échec")
    def has_error(self, obj):
        return bool(obj.error)

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False


@admin.register(CourierNotification)
class CourierNotificationAdmin(admin.ModelAdmin):
    """Messages envoyes aux livreurs : sert a verifier qu'une assignation a bien ete annoncee."""

    list_display = ("created_at", "kind", "target", "courier_id", "recipient", "language", "has_error")
    list_filter = ("kind", "language")
    search_fields = ("shipment_id", "tournee_id", "courier_id", "recipient", "provider_message_id")
    readonly_fields = [f.name for f in CourierNotification._meta.fields]

    @admin.display(description="Colis / tournee")
    def target(self, obj):
        return f"colis {obj.shipment_id}" if obj.shipment_id else f"tournee {obj.tournee_id}"

    @admin.display(boolean=True, description="Echec")
    def has_error(self, obj):
        return bool(obj.error)

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
