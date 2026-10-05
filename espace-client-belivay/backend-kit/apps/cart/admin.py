# backend/apps/cart/admin.py
from django.contrib import admin

from .models import FicheLogistique, LignePanier, Panier, PanierPartage


@admin.register(FicheLogistique)
class FicheLogistiqueAdmin(admin.ModelAdmin):
    list_display = ("product_id", "classe", "poids_g", "gros")
    list_filter = ("classe", "gros")
    search_fields = ("product_id",)


class LigneInline(admin.TabularInline):
    model = LignePanier
    extra = 0


@admin.register(Panier)
class PanierAdmin(admin.ModelAdmin):
    list_display = ("client", "mode", "relay_id", "mis_a_jour")
    inlines = [LigneInline]


@admin.register(PanierPartage)
class PanierPartageAdmin(admin.ModelAdmin):
    list_display = ("token", "client", "total", "order_id", "cree_le")
    search_fields = ("token",)
