# backend/apps/aftersales/admin.py
from django.contrib import admin

from .models import AvisCommande, Litige, PreuveLitige, Remplacement, Retour, VoteAvis


class PreuveEnLigne(admin.TabularInline):
    model = PreuveLitige
    extra = 0


@admin.register(Litige)
class LitigeAdmin(admin.ModelAdmin):
    list_display = ("__str__", "client", "etat", "souhait", "montant", "ouvert_le", "clos_le")
    list_filter = ("etat", "souhait", "origine")
    search_fields = ("order_id", "produit")
    inlines = [PreuveEnLigne]


admin.site.register(Retour)
admin.site.register(Remplacement)
admin.site.register(AvisCommande)
admin.site.register(VoteAvis)
