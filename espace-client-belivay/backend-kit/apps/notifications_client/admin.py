# backend/apps/notifications_client/admin.py
from django.contrib import admin

from .models import Appareil, ConsentementCanal, JournalNotification, ReglagesNotifications


@admin.register(ReglagesNotifications)
class ReglagesNotificationsAdmin(admin.ModelAdmin):
    list_display = ("user", "messages", "suivi", "promotions", "flash", "canal", "calme_actif", "modifie_le")


@admin.register(ConsentementCanal)
class ConsentementCanalAdmin(admin.ModelAdmin):
    list_display = ("user", "canal", "le", "retire_le")


@admin.register(Appareil)
class AppareilAdmin(admin.ModelAdmin):
    list_display = ("user", "type", "cree_le", "revoque_le")
    exclude = ("cles",)


@admin.register(JournalNotification)
class JournalNotificationAdmin(admin.ModelAdmin):
    list_display = ("user", "type", "titre", "critique", "centre", "pousses", "sms", "raison", "le")
    list_filter = ("type", "critique", "raison")
