# backend/apps/vendors/admin.py
# Enregistrement complet des modèles vendors dans Django Admin.
# Remplace le fichier existant — ajoute VendorLocation, WithdrawalRequest, VendorOrderNote
# et complète VendorProfile avec tous ses champs.

from django.contrib import admin
from django.utils.html import format_html
from django.utils import timezone
from datetime import timedelta
from .models import (
    VendorProfile,
    SubscriptionPlan,
    VendorSubscription,
    RequiredDocumentType,
    ShopModificationRequest,
    ShopModificationDocument,
    VendorLocation,
    WithdrawalRequest,
    VendorOrderNote,
)


# ─── INLINE : Emplacements d'une boutique ────────────────────────────────────

class VendorLocationInline(admin.TabularInline):
    model  = VendorLocation
    extra  = 0
    fields = ('name', 'address', 'phone', 'email', 'representative_name', 'latitude', 'longitude')


# ─── PROFIL VENDEUR ───────────────────────────────────────────────────────────

@admin.register(VendorProfile)
class VendorProfileAdmin(admin.ModelAdmin):
    list_display  = (
        'business_name', 'user', 'status_badge', 'city',
        'certification_tier', 'current_plan', 'is_online', 'created_at',
    )
    list_filter   = ('status', 'city', 'certification_tier', 'is_online')
    search_fields = ('business_name', 'user__username', 'user__email', 'phone', 'shop_slug')
    readonly_fields = (
        'shop_slug', 'total_points', 'certification_tier',
        'created_at', 'updated_at', 'approved_at',
    )
    inlines       = [VendorLocationInline]
    ordering      = ('-created_at',)

    fieldsets = (
        ('Identité', {
            'fields': (
                'user', 'business_name', 'business_description',
                'phone', 'address', 'city',
            ),
        }),
        ('Boutique publique', {
            'fields': (
                'shop_slug', 'profile_photo', 'banner_image',
                'whatsapp_phone', 'is_online',
            ),
        }),
        ('Retrait Mobile Money préférentiel', {
            'fields': ('default_withdrawal_operator', 'default_withdrawal_phone'),
        }),
        ('Certification', {
            'fields': ('total_points', 'certification_tier'),
        }),
        ('Plan & Abonnement', {
            'fields': ('current_plan', 'plan_expires_at'),
        }),
        ('Statut & Documents', {
            'fields': ('status', 'id_document', 'approved_at'),
        }),
        ('Dates', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )

    def status_badge(self, obj):
        colors = {
            'PENDING':   'orange',
            'APPROVED':  'green',
            'REJECTED':  'red',
            'SUSPENDED': 'gray',
        }
        color = colors.get(obj.status, 'gray')
        return format_html(
            '<span style="color:{}; font-weight:bold;">● {}</span>',
            color, obj.get_status_display()
        )
    status_badge.short_description = 'Statut'

    actions = ['approve_vendors', 'reject_vendors', 'suspend_vendors']

    def approve_vendors(self, request, queryset):
        count = queryset.update(status='APPROVED', approved_at=timezone.now())
        self.message_user(request, f"{count} vendeur(s) approuvé(s).")
    approve_vendors.short_description = "Approuver les vendeurs sélectionnés"

    def reject_vendors(self, request, queryset):
        count = queryset.update(status='REJECTED')
        self.message_user(request, f"{count} vendeur(s) rejeté(s).")
    reject_vendors.short_description = "Rejeter les vendeurs sélectionnés"

    def suspend_vendors(self, request, queryset):
        count = queryset.update(status='SUSPENDED')
        self.message_user(request, f"{count} vendeur(s) suspendu(s).")
    suspend_vendors.short_description = "Suspendre les vendeurs sélectionnés"


# ─── EMPLACEMENTS BOUTIQUE ────────────────────────────────────────────────────

@admin.register(VendorLocation)
class VendorLocationAdmin(admin.ModelAdmin):
    list_display  = ('name', 'vendor', 'address', 'phone', 'latitude', 'longitude')
    list_filter   = ('vendor',)
    search_fields = ('name', 'vendor__business_name', 'address', 'phone')
    ordering      = ('vendor', 'name')


# ─── PLANS D'ABONNEMENT ───────────────────────────────────────────────────────

@admin.register(SubscriptionPlan)
class SubscriptionPlanAdmin(admin.ModelAdmin):
    list_display  = (
        'name', 'code', 'price_monthly_xaf', 'price_annual_xaf',
        'commission_rate', 'max_products', 'trial_days', 'is_active', 'display_order',
    )
    list_editable = ('is_active', 'display_order')
    list_filter   = ('is_active',)
    search_fields = ('name', 'code')
    ordering      = ('display_order',)

    fieldsets = (
        ('Plan', {
            'fields': ('name', 'code', 'is_active', 'display_order'),
        }),
        ('Tarification', {
            'fields': ('price_monthly_xaf', 'price_annual_xaf', 'plan_duration_days', 'trial_days'),
        }),
        ('Conditions', {
            'fields': ('commission_rate', 'max_products', 'max_boosts_month'),
        }),
        ('Fonctionnalités', {
            'fields': ('features',),
            'description': 'Liste JSON. Ex: ["QR Code boutique", "Support prioritaire"]',
        }),
    )


# ─── ABONNEMENTS VENDEURS ─────────────────────────────────────────────────────

@admin.register(VendorSubscription)
class VendorSubscriptionAdmin(admin.ModelAdmin):
    list_display  = (
        'payment_reference', 'vendor_name', 'plan', 'billing_cycle',
        'is_trial', 'amount_paid_xaf', 'sub_status', 'expires_at', 'created_at',
    )
    list_filter   = ('sub_status', 'is_trial', 'billing_cycle', 'operator')
    search_fields = ('vendor__business_name', 'payment_reference', 'phone_number')
    readonly_fields = ('payment_reference', 'created_at')
    ordering      = ('-created_at',)

    actions = ['approve_subscription']

    def vendor_name(self, obj):
        return obj.vendor.business_name
    vendor_name.short_description = 'Boutique'

    @admin.action(description="Approuver et activer les abonnements sélectionnés")
    def approve_subscription(self, request, queryset):
        now   = timezone.now()
        count = 0
        for sub in queryset.filter(sub_status='PENDING', is_trial=False):
            duration = sub.plan.plan_duration_days
            if sub.billing_cycle == 'ANNUAL':
                duration = sub.plan.plan_duration_days * 12
            expires_at = now + timedelta(days=duration)

            sub.sub_status   = 'ACTIVE'
            sub.started_at   = now
            sub.expires_at   = expires_at
            sub.confirmed_by = request.user
            sub.confirmed_at = now
            sub.save()

            VendorProfile.objects.filter(pk=sub.vendor.pk).update(
                current_plan    = sub.plan,
                plan_expires_at = expires_at,
            )
            count += 1
        self.message_user(request, f"{count} abonnement(s) activé(s).")


# ─── DEMANDES DE RETRAIT ──────────────────────────────────────────────────────

@admin.register(WithdrawalRequest)
class WithdrawalRequestAdmin(admin.ModelAdmin):
    list_display  = (
        'reference', 'vendor_name', 'operator', 'phone_number',
        'amount_xaf', 'fee_amount_xaf', 'net_amount_xaf',
        'status_badge', 'created_at',
    )
    list_filter   = ('status', 'operator')
    search_fields = ('reference', 'vendor__business_name', 'phone_number')
    readonly_fields = (
        'reference', 'vendor', 'amount_xaf', 'fee_amount_xaf', 'net_amount_xaf',
        'created_at', 'updated_at',
    )
    ordering      = ('-created_at',)

    fieldsets = (
        ('Demande', {
            'fields': ('vendor', 'reference', 'operator', 'phone_number'),
        }),
        ('Montants (lecture seule)', {
            'fields': ('amount_xaf', 'fee_amount_xaf', 'net_amount_xaf'),
        }),
        ('Traitement', {
            'fields': ('status', 'admin_note', 'processed_at', 'processed_by'),
        }),
        ('Dates', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )

    def vendor_name(self, obj):
        return obj.vendor.business_name
    vendor_name.short_description = 'Boutique'

    def status_badge(self, obj):
        colors = {
            'PENDING':   'orange',
            'APPROVED':  'green',
            'REJECTED':  'red',
            'CANCELLED': 'gray',
        }
        color = colors.get(obj.status, 'gray')
        return format_html(
            '<span style="color:{}; font-weight:bold;">● {}</span>',
            color, obj.get_status_display()
        )
    status_badge.short_description = 'Statut'

    actions = ['approve_withdrawal', 'reject_withdrawal']

    def approve_withdrawal(self, request, queryset):
        count = queryset.filter(status='PENDING').update(
            status='APPROVED',
            processed_at=timezone.now(),
            processed_by=request.user,
        )
        self.message_user(request, f"{count} retrait(s) approuvé(s).")
    approve_withdrawal.short_description = "Approuver les retraits sélectionnés"

    def reject_withdrawal(self, request, queryset):
        count = queryset.filter(status='PENDING').update(
            status='REJECTED',
            processed_at=timezone.now(),
            processed_by=request.user,
        )
        self.message_user(request, f"{count} retrait(s) rejeté(s).")
    reject_withdrawal.short_description = "Rejeter les retraits sélectionnés"


# ─── NOTES INTERNES VENDEUR SUR COMMANDES ────────────────────────────────────

@admin.register(VendorOrderNote)
class VendorOrderNoteAdmin(admin.ModelAdmin):
    list_display  = ('id', 'order_ref', 'vendor_name', 'created_at')
    search_fields = ('order__id', 'vendor__business_name', 'note')
    readonly_fields = ('created_at', 'updated_at')
    ordering      = ('-created_at',)

    def order_ref(self, obj):
        return f"BLV-{obj.order_id:05d}"
    order_ref.short_description = 'Commande'

    def vendor_name(self, obj):
        return obj.vendor.business_name
    vendor_name.short_description = 'Boutique'


# ─── TYPES DE DOCUMENTS REQUIS ────────────────────────────────────────────────

@admin.register(RequiredDocumentType)
class RequiredDocumentTypeAdmin(admin.ModelAdmin):
    list_display  = ('name', 'description', 'is_active', 'created_at')
    list_editable = ('is_active',)
    search_fields = ('name',)


# ─── DEMANDES DE MODIFICATION BOUTIQUE ───────────────────────────────────────

class ShopModificationDocumentInline(admin.TabularInline):
    model       = ShopModificationDocument
    extra       = 0
    readonly_fields = ('uploaded_at', 'file_link')
    fields      = ('document_type', 'file', 'file_link', 'description', 'uploaded_at')

    def file_link(self, obj):
        if obj.file:
            return format_html('<a href="{}" target="_blank">Voir</a>', obj.file.url)
        return '—'
    file_link.short_description = 'Lien'


@admin.register(ShopModificationRequest)
class ShopModificationRequestAdmin(admin.ModelAdmin):
    list_display  = (
        'id', 'vendor_name', 'fields_list', 'status_badge',
        'approved_by', 'created_at',
    )
    list_filter   = ('status',)
    search_fields = ('vendor__business_name', 'reason')
    readonly_fields = ('vendor', 'fields_requested', 'reason', 'created_at', 'updated_at')
    inlines       = [ShopModificationDocumentInline]
    ordering      = ('-created_at',)

    fieldsets = (
        ('Demande (lecture seule)', {
            'fields': ('vendor', 'fields_requested', 'reason'),
        }),
        ('Traitement Admin', {
            'fields': ('status', 'admin_note', 'required_docs', 'approved_by', 'approved_at'),
        }),
        ('Dates', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )

    def vendor_name(self, obj):
        return obj.vendor.business_name
    vendor_name.short_description = 'Boutique'

    def fields_list(self, obj):
        if obj.fields_requested:
            return ', '.join(obj.fields_requested.keys())
        return '—'
    fields_list.short_description = 'Champs demandés'

    def status_badge(self, obj):
        colors = {
            'PENDING':       'orange',
            'DOCS_REQUIRED': 'blue',
            'DOCS_UPLOADED': 'purple',
            'APPROVED':      'green',
            'REJECTED':      'red',
        }
        color = colors.get(obj.status, 'gray')
        return format_html(
            '<span style="color:{}; font-weight:bold;">● {}</span>',
            color, obj.get_status_display()
        )
    status_badge.short_description = 'Statut'

    actions = ['approve_requests', 'reject_requests']

    def approve_requests(self, request, queryset):
        count = 0
        for mod_req in queryset.filter(status='DOCS_UPLOADED'):
            mod_req.apply_approved_changes()
            mod_req.status      = 'APPROVED'
            mod_req.approved_by = request.user
            mod_req.approved_at = timezone.now()
            mod_req.save()
            count += 1
        self.message_user(request, f"{count} demande(s) approuvée(s) et appliquée(s).")
    approve_requests.short_description = "Approuver et appliquer les modifications"

    def reject_requests(self, request, queryset):
        count = queryset.exclude(status='APPROVED').update(status='REJECTED')
        self.message_user(request, f"{count} demande(s) rejetée(s).")
    reject_requests.short_description = "Rejeter les demandes sélectionnées"