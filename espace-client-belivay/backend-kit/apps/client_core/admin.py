# backend/apps/client_core/admin.py
from django.contrib import admin

from .models import CleIdempotence, Interrupteur, ParametreMetier


@admin.register(ParametreMetier)
class ParametreMetierAdmin(admin.ModelAdmin):
    list_display = ("code", "valeur", "gouvernance", "modifie_le", "modifie_par")
    list_filter = ("gouvernance", "categorie")
    search_fields = ("code", "valeur", "sens")
    readonly_fields = ("modifie_le", "modifie_par")

    def save_model(self, request, obj, form, change):
        obj.modifie_par = request.user
        super().save_model(request, obj, form, change)


@admin.register(Interrupteur)
class InterrupteurAdmin(admin.ModelAdmin):
    list_display = ("code", "ouvert", "note", "modifie_le")
    list_editable = ("ouvert",)


@admin.register(CleIdempotence)
class CleIdempotenceAdmin(admin.ModelAdmin):
    list_display = ("cle", "utilisateur", "auteur", "methode", "chemin", "statut", "cree_le")
    search_fields = ("cle", "chemin")

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
