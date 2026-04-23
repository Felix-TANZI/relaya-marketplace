from django.contrib import admin

from .models import CourierProfile, UserActivityLog, UserFavorite, UserNotification, UserProfile


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "phone", "newsletter_subscribed", "sms_notifications", "is_banned", "created_at")
    list_filter = ("newsletter_subscribed", "sms_notifications", "is_banned", "created_at")
    search_fields = ("user__username", "user__email", "phone")


@admin.register(UserActivityLog)
class UserActivityLogAdmin(admin.ModelAdmin):
    list_display = ("user", "action", "performed_by", "timestamp")
    list_filter = ("action", "timestamp")
    search_fields = ("user__username", "description", "performed_by__username")


@admin.register(UserFavorite)
class UserFavoriteAdmin(admin.ModelAdmin):
    list_display = ("user", "product", "created_at")
    list_filter = ("created_at",)
    search_fields = ("user__username", "product__title")


@admin.register(UserNotification)
class UserNotificationAdmin(admin.ModelAdmin):
    list_display = ("user", "title", "notification_type", "is_read", "created_at")
    list_filter = ("notification_type", "is_read", "created_at")
    search_fields = ("user__username", "title", "message")


@admin.register(CourierProfile)
class CourierProfileAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "phone",
        "city",
        "vehicle_type",
        "is_approved",
        "is_active",
        "is_online",
        "created_at",
    )
    list_filter = ("city", "vehicle_type", "is_approved", "is_active", "is_online", "created_at")
    search_fields = ("user__username", "user__email", "phone", "id_card", "city")
    filter_horizontal = ()
