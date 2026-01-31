# backend/apps/vendors/admin.py
# Interface admin pour gérer les vendeurs

from django.contrib import admin
from django.utils.html import format_html
from .models import VendorProfile


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