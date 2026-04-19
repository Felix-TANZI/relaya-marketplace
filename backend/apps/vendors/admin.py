# backend/apps/vendors/admin.py
# Interface admin pour gérer les vendeurs

from django.contrib import admin
from django.utils.html import format_html
from django.utils import timezone
from datetime import timedelta
from .models import (
    VendorProfile, SubscriptionPlan, VendorSubscription,
    RequiredDocumentType, ShopModificationRequest, ShopModificationDocument,
    VendorLocation, WithdrawalRequest, VendorOrderNote,
)


@admin.register(VendorProfile)
class VendorProfileAdmin(admin.ModelAdmin):
    list_display = ['business_name', 'user', 'status', 'city', 'created_at', 'status_badge']
    list_filter = ['status', 'city', 'created_at']
    search_fields = ['business_name', 'user__username', 'user__email', 'phone']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Informations de base', {
            'fields': ('user', 'business_name', 'business_description')
        }),
        ('Contact', {
            'fields': ('phone', 'address', 'city')
        }),
        ('Documents', {
            'fields': ('id_document',)
        }),
        ('Statut', {
            'fields': ('status', 'approved_at')
        }),
        ('Dates', {
            'fields': ('created_at', 'updated_at')
        }),
    )
    
    def status_badge(self, obj):
        colors = {
            'PENDING': 'orange',
            'APPROVED': 'green',
            'REJECTED': 'red',
            'SUSPENDED': 'gray'
        }
        color = colors.get(obj.status, 'gray')
        return format_html(
            '<span style="color: {}; font-weight: bold;">●</span> {}',
            color,
            obj.get_status_display()
        )
    status_badge.short_description = 'Statut'
    
    actions = ['approve_vendors', 'reject_vendors', 'suspend_vendors']
    
    def approve_vendors(self, request, queryset):
        from django.utils import timezone
        updated = queryset.update(status='APPROVED', approved_at=timezone.now())
        self.message_user(request, f"{updated} vendeur(s) approuvé(s).")
    approve_vendors.short_description = "Approuver les vendeurs sélectionnés"
    
    def reject_vendors(self, request, queryset):
        updated = queryset.update(status='REJECTED')
        self.message_user(request, f"{updated} vendeur(s) rejeté(s).")
    reject_vendors.short_description = "Rejeter les vendeurs sélectionnés"
    
    def suspend_vendors(self, request, queryset):
        updated = queryset.update(status='SUSPENDED')
        self.message_user(request, f"{updated} vendeur(s) suspendu(s).")
    suspend_vendors.short_description = "Suspendre les vendeurs sélectionnés"


@admin.register(SubscriptionPlan)
class SubscriptionPlanAdmin(admin.ModelAdmin):
    list_display  = ['code', 'name', 'price_monthly_xaf', 'commission_rate', 'max_products', 'trial_days', 'plan_duration_days', 'is_active', 'display_order']
    list_editable = ['price_monthly_xaf', 'commission_rate', 'max_products', 'trial_days', 'plan_duration_days', 'is_active', 'display_order']
    list_filter   = ['is_active']
    ordering      = ['display_order']
    fieldsets = (
        ('Identification', {
            'fields': ('code', 'name', 'description', 'display_order', 'is_active')
        }),
        ('Tarification', {
            'fields': ('price_monthly_xaf', 'price_annual_xaf', 'commission_rate', 'plan_duration_days')
        }),
        ('Limites', {
            'fields': ('max_products', 'max_boosts_month', 'features')
        }),
        ('Essai gratuit', {
            'fields': ('trial_days',),
            'description': '0 = pas d\'essai gratuit. Le vendeur peut l\'activer depuis la page Plans.'
        }),
    )
 
 
@admin.register(VendorSubscription)
class VendorSubscriptionAdmin(admin.ModelAdmin):
    list_display  = ['payment_reference', 'vendor_name', 'plan', 'billing_cycle', 'is_trial', 'amount_paid_xaf', 'sub_status', 'expires_at', 'created_at']
    list_filter   = ['sub_status', 'is_trial', 'billing_cycle', 'operator']
    search_fields = ['vendor__business_name', 'payment_reference', 'phone_number']
    readonly_fields = ['payment_reference', 'created_at']
    ordering      = ['-created_at']
    actions       = ['approve_subscription']
 
    def vendor_name(self, obj):
        return obj.vendor.business_name
    vendor_name.short_description = 'Boutique'
 
    @admin.action(description="Approuver et activer les abonnements sélectionnés")
    def approve_subscription(self, request, queryset):
        now = timezone.now()
        count = 0
        for sub in queryset.filter(sub_status='PENDING', is_trial=False):
            duration = sub.plan.plan_duration_days
            if sub.billing_cycle == 'ANNUAL':
                duration = sub.plan.plan_duration_days * 12
            expires_at = now + timedelta(days=duration)
 
            sub.sub_status    = 'ACTIVE'
            sub.started_at    = now
            sub.expires_at    = expires_at
            sub.confirmed_by  = request.user
            sub.confirmed_at  = now
            sub.save()
 
            # Mettre à jour le profil vendeur
            VendorProfile.objects.filter(pk=sub.vendor.pk).update(
                current_plan    = sub.plan,
                plan_expires_at = expires_at,
            )
            count += 1
        self.message_user(request, f"{count} abonnement(s) activé(s).")
 
 
@admin.register(RequiredDocumentType)
class RequiredDocumentTypeAdmin(admin.ModelAdmin):
    list_display  = ['name', 'description', 'is_active', 'created_at']
    list_editable = ['is_active']
    search_fields = ['name']
 
 
class ShopModificationDocumentInline(admin.TabularInline):
    model   = ShopModificationDocument
    extra   = 0
    readonly_fields = ['uploaded_at', 'file_link']
    fields  = ['document_type', 'file', 'file_link', 'description', 'uploaded_at']
 
    def file_link(self, obj):
        if obj.file:
            return format_html('<a href="{}" target="_blank">Voir</a>', obj.file.url)
        return '—'
    file_link.short_description = 'Lien'
 
 
@admin.register(ShopModificationRequest)
class ShopModificationRequestAdmin(admin.ModelAdmin):
    """
    L'admin gère les demandes de modification depuis ici.
    Il peut :
    - Voir les champs demandés et la justification
    - Spécifier les documents requis (required_docs)
    - Approuver → les champs sont mis à jour automatiquement
    - Rejeter → avec une note explicative
    """
    list_display  = ['id', 'vendor_name', 'fields_summary', 'status', 'created_at', 'updated_at']
    list_filter   = ['status', 'created_at']
    search_fields = ['vendor__business_name', 'reason']
    readonly_fields = ['vendor', 'fields_requested', 'reason', 'created_at', 'updated_at', 'approved_at']
    filter_horizontal = ['required_docs']
    inlines = [ShopModificationDocumentInline]
    ordering = ['-created_at']
    actions = ['approve_requests', 'reject_requests', 'ask_for_documents']
 
    fieldsets = (
        ('Demande du vendeur', {
            'fields': ('vendor', 'fields_requested', 'reason', 'created_at')
        }),
        ('Traitement admin', {
            'fields': ('status', 'admin_note', 'required_docs', 'approved_at')
        }),
    )
 
    def vendor_name(self, obj):
        return obj.vendor.business_name
    vendor_name.short_description = 'Boutique'
 
    def fields_summary(self, obj):
        if obj.fields_requested:
            return ', '.join(obj.fields_requested.keys())
        return '—'
    fields_summary.short_description = 'Champs demandés'
 
    def save_model(self, request, obj, form, change):
        """
        Si le status passe à APPROVED, appliquer les changements automatiquement.
        """
        is_new_approval = change and obj.status == 'APPROVED' and obj.approved_at is None
        if is_new_approval:
            obj.approved_by = request.user
            obj.approved_at = timezone.now()
        super().save_model(request, obj, form, change)
        if is_new_approval:
            obj.apply_approved_changes()
            self.message_user(request, f"Modification approuvée — les champs ont été mis à jour automatiquement.")
 
    @admin.action(description="Approuver les demandes sélectionnées")
    def approve_requests(self, request, queryset):
        now   = timezone.now()
        count = 0
        for req in queryset.filter(status__in=['PENDING', 'DOCS_REQUIRED', 'DOCS_UPLOADED']):
            req.status      = 'APPROVED'
            req.approved_by = request.user
            req.approved_at = now
            req.save()
            req.apply_approved_changes()
            count += 1
        self.message_user(request, f"{count} demande(s) approuvée(s) et appliquée(s).")
 
    @admin.action(description="Rejeter les demandes sélectionnées")
    def reject_requests(self, request, queryset):
        count = queryset.filter(status__in=['PENDING', 'DOCS_REQUIRED', 'DOCS_UPLOADED']).update(
            status='REJECTED', admin_note='Demande rejetée par l\'administrateur.'
        )
        self.message_user(request, f"{count} demande(s) rejetée(s).")
 
    @admin.action(description="Demander des documents complémentaires")
    def ask_for_documents(self, request, queryset):
        count = queryset.filter(status='PENDING').update(status='DOCS_REQUIRED')
        self.message_user(
            request,
            f"{count} demande(s) passée(s) en 'Documents requis'. "
            f"Allez dans chaque demande pour spécifier les documents nécessaires."
        )
 
 
@admin.register(VendorLocation)
class VendorLocationAdmin(admin.ModelAdmin):
    list_display  = ['name', 'vendor_name', 'address', 'phone', 'representative_name', 'has_coordinates', 'is_active']
    list_filter   = ['is_active']
    search_fields = ['name', 'vendor__business_name', 'address']
 
    def vendor_name(self, obj):
        return obj.vendor.business_name
    vendor_name.short_description = 'Boutique'
 
    def has_coordinates(self, obj):
        if obj.latitude and obj.longitude:
            return format_html('<span style="color:green">✓</span>')
        return format_html('<span style="color:red">✗</span>')
    has_coordinates.short_description = 'GPS'
 
 
@admin.register(WithdrawalRequest)
class WithdrawalRequestAdmin(admin.ModelAdmin):
    list_display  = ['reference', 'vendor_name', 'amount_xaf', 'net_amount_xaf', 'operator', 'status', 'created_at']
    list_filter   = ['status', 'operator']
    search_fields = ['vendor__business_name', 'reference', 'phone_number']
    readonly_fields = ['reference', 'created_at']
    ordering = ['-created_at']
 
    def vendor_name(self, obj):
        return obj.vendor.business_name
    vendor_name.short_description = 'Boutique'