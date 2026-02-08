# backend/apps/contact/admin.py
# Interface d'administration pour les messages de contact

from django.contrib import admin
from django.utils.html import format_html
from django.utils import timezone
from .models import ContactMessage


@admin.register(ContactMessage)
class ContactMessageAdmin(admin.ModelAdmin):
    """
    Interface admin complète pour gérer les messages de contact
    """
    
    list_display = [
        'id', 'name', 'email', 'subject', 
        'status_badge', 'created_at', 'assigned_to'
    ]
    
    list_filter = [
        'status', 
        'created_at', 
        'assigned_to'
    ]
    
    search_fields = [
        'name', 
        'email', 
        'subject', 
        'message', 
        'phone'
    ]
    
    readonly_fields = [
        'created_at', 
        'updated_at', 
        'ip_address', 
        'user_agent',
        'resolved_at'
    ]
    
    fieldsets = (
        ('Informations expéditeur', {
            'fields': ('name', 'email', 'phone')
        }),
        ('Message', {
            'fields': ('subject', 'message')
        }),
        ('Traitement', {
            'fields': ('status', 'assigned_to', 'admin_notes')
        }),
        ('Métadonnées', {
            'fields': ('ip_address', 'user_agent', 'created_at', 'updated_at', 'resolved_at'),
            'classes': ('collapse',)
        }),
    )
    
    actions = ['mark_as_resolved', 'mark_as_closed', 'mark_as_in_progress']
    
    def status_badge(self, obj):
        """Badge coloré pour le statut"""
        colors = {
            'NEW': '#3B82F6',          # Bleu
            'IN_PROGRESS': '#F59E0B',  # Orange
            'RESOLVED': '#10B981',     # Vert
            'CLOSED': '#6B7280',       # Gris
        }
        color = colors.get(obj.status, '#6B7280')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: 600;">{}</span>',
            color,
            obj.get_status_display()
        )
    status_badge.short_description = 'Statut'
    
    def mark_as_resolved(self, request, queryset):
        """Action pour marquer comme résolu"""
        count = 0
        for message in queryset:
            message.mark_as_resolved()
            count += 1
        self.message_user(request, f"{count} message(s) marqué(s) comme résolu(s).")
    mark_as_resolved.short_description = "Marquer comme résolu"
    
    def mark_as_closed(self, request, queryset):
        """Action pour marquer comme fermé"""
        count = queryset.update(status='CLOSED')
        self.message_user(request, f"{count} message(s) marqué(s) comme fermé(s).")
    mark_as_closed.short_description = "Marquer comme fermé"
    
    def mark_as_in_progress(self, request, queryset):
        """Action pour marquer en cours"""
        count = queryset.update(status='IN_PROGRESS')
        self.message_user(request, f"{count} message(s) marqué(s) en cours.")
    mark_as_in_progress.short_description = "Marquer en cours"