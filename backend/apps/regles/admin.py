# backend/apps/regles/admin.py
# L'admin change la valeur d'un réglage ou les lignes d'une table ; il n'en crée ni n'en supprime (la liste est celle
# de BV-DEV-07). Chaque changement est journalisé (AuditLog, voir models._Journalise).

from django.contrib import admin

from .models import Reglage, TableReglee


class _SansAjoutNiSuppression(admin.ModelAdmin):
    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    def save_model(self, request, obj, form, change):
        obj.modifie_par = request.user
        super().save_model(request, obj, form, change)


@admin.register(Reglage)
class ReglageAdmin(_SansAjoutNiSuppression):
    list_display = ("nom", "valeur", "unite", "libelle", "regles", "modifie_le", "modifie_par")
    list_filter = ("unite",)
    search_fields = ("nom", "libelle", "regles")
    fields = ("nom", "libelle", "regles", "unite", "valeur", "exact", "modifie_le", "modifie_par")
    readonly_fields = ("nom", "libelle", "regles", "unite", "exact", "modifie_le", "modifie_par")


@admin.register(TableReglee)
class TableRegleeAdmin(_SansAjoutNiSuppression):
    list_display = ("nom", "modifie_le", "modifie_par")
    search_fields = ("nom",)
    fields = ("nom", "lignes", "modifie_le", "modifie_par")
    readonly_fields = ("nom", "modifie_le", "modifie_par")
