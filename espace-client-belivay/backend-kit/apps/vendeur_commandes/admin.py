# backend/apps/vendeur_commandes/admin.py
# Suivi des ruptures (lecture seule : écrit par les gestes du vendeur, jamais à la main).
from django.contrib import admin

from .models import BasculeColis, CommandeCedee


class LectureSeule(admin.ModelAdmin):
    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(BasculeColis)
class BasculeColisAdmin(LectureSeule):
    list_display = ("order_id", "n", "tentatives", "essayes", "modifie_le")


@admin.register(CommandeCedee)
class CommandeCedeeAdmin(LectureSeule):
    list_display = ("ref", "commande", "n", "a")
