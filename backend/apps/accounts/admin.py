# backend/apps/accounts/admin.py
# Enregistrement complet des modèles accounts dans Django Admin.
# Remplace le fichier vide existant.

from django.contrib import admin
from django.utils.html import format_html
from django.contrib.auth.models import User
from .models import (
    UserProfile,
    UserActivityLog,
    UserFavorite,
    UserNotification,
    RewardAccount,
    RewardTransaction,
    UserSession,
    OTPCode,
)


# ─── PROFIL UTILISATEUR ───────────────────────────────────────────────────────

class UserProfileInline(admin.StackedInline):
    """Profil étendu visible directement depuis la fiche User."""
    model           = UserProfile
    can_delete      = False
    verbose_name    = "Profil étendu"
    fields          = (
        'phone', 'bio', 'avatar',
        'newsletter_subscribed', 'sms_notifications',
        'two_factor_enabled', 'two_factor_method', 'two_factor_phone',
        'is_banned', 'ban_reason', 'banned_at', 'banned_by',
    )
    readonly_fields = ('banned_at',)


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display  = ('user', 'phone', 'is_banned', 'two_factor_enabled', 'newsletter_subscribed', 'created_at')
    list_filter   = ('is_banned', 'two_factor_enabled', 'two_factor_method', 'newsletter_subscribed')
    search_fields = ('user__username', 'user__email', 'phone')
    readonly_fields = ('created_at', 'updated_at')
    ordering      = ('-created_at',)

    fieldsets = (
        ('Utilisateur', {
            'fields': ('user', 'phone', 'bio', 'avatar'),
        }),
        ('Préférences', {
            'fields': ('newsletter_subscribed', 'sms_notifications'),
        }),
        ('Double authentification', {
            'fields': ('two_factor_enabled', 'two_factor_method', 'two_factor_phone'),
        }),
        ('Modération', {
            'fields': ('is_banned', 'ban_reason', 'banned_at', 'banned_by'),
        }),
        ('Dates', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )

    def has_add_permission(self, request):
        # Les profils se créent automatiquement à l'inscription
        return False


# ─── JOURNAL D'ACTIVITÉ ───────────────────────────────────────────────────────

@admin.register(UserActivityLog)
class UserActivityLogAdmin(admin.ModelAdmin):
    list_display  = ('user', 'action', 'performed_by', 'ip_address', 'timestamp')
    list_filter   = ('action',)
    search_fields = ('user__username', 'action', 'description', 'ip_address')
    readonly_fields = ('user', 'action', 'description', 'performed_by', 'ip_address', 'user_agent', 'timestamp')
    ordering      = ('-timestamp',)

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False


# ─── FAVORIS ─────────────────────────────────────────────────────────────────

@admin.register(UserFavorite)
class UserFavoriteAdmin(admin.ModelAdmin):
    list_display  = ('user', 'product', 'created_at')
    list_filter   = ('created_at',)
    search_fields = ('user__username', 'product__title')
    readonly_fields = ('created_at',)
    ordering      = ('-created_at',)


# ─── NOTIFICATIONS ────────────────────────────────────────────────────────────

@admin.register(UserNotification)
class UserNotificationAdmin(admin.ModelAdmin):
    list_display  = ('user', 'title', 'notification_type', 'is_read', 'created_at')
    list_filter   = ('notification_type', 'is_read')
    search_fields = ('user__username', 'title', 'message')
    readonly_fields = ('created_at', 'updated_at')
    ordering      = ('-created_at',)

    actions = ['mark_as_read', 'mark_as_unread']

    def mark_as_read(self, request, queryset):
        count = queryset.update(is_read=True)
        self.message_user(request, f"{count} notification(s) marquée(s) comme lue(s).")
    mark_as_read.short_description = "Marquer comme lue"

    def mark_as_unread(self, request, queryset):
        count = queryset.update(is_read=False)
        self.message_user(request, f"{count} notification(s) marquée(s) comme non lue(s).")
    mark_as_unread.short_description = "Marquer comme non lue"


class RewardTransactionInline(admin.TabularInline):
    model = RewardTransaction
    extra = 0
    readonly_fields = ('delta', 'source', 'reason', 'reference', 'created_by', 'created_at')
    can_delete = False

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(RewardAccount)
class RewardAccountAdmin(admin.ModelAdmin):
    list_display = ('user', 'role', 'points_balance', 'lifetime_points', 'trust_score', 'tier', 'updated_at')
    list_filter = ('role', 'tier')
    search_fields = ('user__username', 'user__email')
    readonly_fields = ('created_at', 'updated_at')
    inlines = [RewardTransactionInline]


@admin.register(RewardTransaction)
class RewardTransactionAdmin(admin.ModelAdmin):
    list_display = ('account', 'delta', 'source', 'reason', 'reference', 'created_at')
    list_filter = ('source', 'created_at')
    search_fields = ('account__user__username', 'reason', 'reference')
    readonly_fields = ('account', 'delta', 'source', 'reason', 'reference', 'created_by', 'created_at')

    def has_add_permission(self, request):
        return False


# ─── SESSIONS ACTIVES ─────────────────────────────────────────────────────────

@admin.register(UserSession)
class UserSessionAdmin(admin.ModelAdmin):
    list_display  = ('user', 'device_name', 'browser', 'os_name', 'ip_address', 'is_active', 'last_activity')
    list_filter   = ('is_active', 'browser', 'os_name')
    search_fields = ('user__username', 'device_name', 'ip_address', 'jti')
    readonly_fields = ('jti', 'created_at', 'last_activity')
    ordering      = ('-last_activity',)

    actions = ['revoke_sessions']

    def revoke_sessions(self, request, queryset):
        count = queryset.update(is_active=False)
        self.message_user(request, f"{count} session(s) révoquée(s).")
    revoke_sessions.short_description = "Révoquer les sessions sélectionnées"


# ─── CODES OTP ────────────────────────────────────────────────────────────────

@admin.register(OTPCode)
class OTPCodeAdmin(admin.ModelAdmin):
    list_display  = ('user', 'purpose', 'code', 'is_used', 'expires_at', 'created_at')
    list_filter   = ('purpose', 'is_used')
    search_fields = ('user__username', 'code')
    readonly_fields = ('created_at',)
    ordering      = ('-created_at',)

    def has_add_permission(self, request):
        # Les codes OTP se génèrent via le système
        return False
