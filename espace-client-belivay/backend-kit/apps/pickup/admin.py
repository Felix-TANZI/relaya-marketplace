# backend/apps/pickup/admin.py
from django.contrib import admin

from .models import ChangementLieu, CompteComptoir, GroupeRemise, HorairesRelais, LigneSousCommande, MontantsCommande, SousCommande


@admin.register(MontantsCommande)
class MontantsCommandeAdmin(admin.ModelAdmin):
    list_display = ("order_id", "client", "mode", "total", "frais_service", "comptoir", "etat_paiement", "rembourse", "version_parametres")
    list_filter = ("mode", "comptoir", "etat_paiement")
    search_fields = ("order_id",)


class LigneInline(admin.TabularInline):
    model = LigneSousCommande
    extra = 0


@admin.register(SousCommande)
class SousCommandeAdmin(admin.ModelAdmin):
    list_display = ("order_id", "n", "boutique", "classe", "sous_total", "etat", "relay_id")
    list_filter = ("etat", "classe")
    inlines = [LigneInline]


@admin.register(GroupeRemise)
class GroupeRemiseAdmin(admin.ModelAdmin):
    list_display = ("order_id", "relay_id", "accuse_fort_le", "essais_faux", "retire_le", "renvoye_le")
    exclude = ("code_chiffre", "code_empreinte")  # jamais le code dans l'administration (CAP-18)


admin.site.register(HorairesRelais)
admin.site.register(CompteComptoir)
admin.site.register(ChangementLieu)
