# backend/apps/payments/admin.py
# Enregistrement des modèles payments dans Django Admin.
# Remplace le fichier vide existant.

from django.contrib import admin
from django.utils.html import format_html
from .models import PaymentTransaction


@admin.register(PaymentTransaction)
class PaymentTransactionAdmin(admin.ModelAdmin):
    list_display  = (
        'id', 'order_ref', 'provider', 'status_badge',
        'amount_xaf_fmt', 'payer_phone', 'external_ref', 'created_at',
    )
    list_filter   = ('status', 'provider')
    search_fields = ('id', 'order__id', 'payer_phone', 'external_ref')
    readonly_fields = (
        'id', 'order', 'provider', 'amount_xaf', 'payer_phone',
        'external_ref', 'raw_payload', 'created_at', 'updated_at',
    )
    ordering      = ('-created_at',)

    fieldsets = (
        ('Transaction', {
            'fields': ('id', 'order', 'provider', 'payer_phone', 'amount_xaf'),
        }),
        ('Statut', {
            'fields': ('status', 'external_ref'),
        }),
        ('Payload brut', {
            'fields': ('raw_payload',),
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

    def amount_xaf_fmt(self, obj):
        return f"{obj.amount_xaf:,} FCFA".replace(',', ' ')
    amount_xaf_fmt.short_description = 'Montant'

    def status_badge(self, obj):
        colors = {
            'INITIATED': 'gray',
            'PENDING':   'orange',
            'SUCCESS':   'green',
            'FAILED':    'red',
            'CANCELLED': 'gray',
        }
        color = colors.get(obj.status, 'gray')
        return format_html(
            '<span style="color:{}; font-weight:bold;">● {}</span>',
            color, obj.get_status_display()
        )
    status_badge.short_description = 'Statut'

    actions = ['simulate_success', 'mark_failed']

    def simulate_success(self, request, queryset):
        """Action DEV — simule un paiement réussi (comme le endpoint /simulate-success/)."""
        count = 0
        for tx in queryset.filter(status__in=['INITIATED', 'PENDING']):
            tx.status = 'SUCCESS'
            tx.raw_payload = {**(tx.raw_payload or {}), 'admin_simulated': True}
            tx.save(update_fields=['status', 'raw_payload', 'updated_at'])
            # Mettre à jour le statut de la commande
            tx.order.payment_status = 'PAID'
            tx.order.save(update_fields=['payment_status', 'updated_at'])
            count += 1
        self.message_user(request, f"{count} paiement(s) simulé(s) comme réussi(s).")
    simulate_success.short_description = "[DEV] Simuler paiement réussi"

    def mark_failed(self, request, queryset):
        count = queryset.filter(status__in=['INITIATED', 'PENDING']).update(status='FAILED')
        self.message_user(request, f"{count} paiement(s) marqué(s) comme échoué(s).")
    mark_failed.short_description = "Marquer comme échoué"

    def has_add_permission(self, request):
        # Les transactions se créent via l'API
        return False