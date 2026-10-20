# backend/apps/subscriptions/admin.py

from django.contrib import admin

from .models import Abonnement, AbonnementOffert, CodeParrainage, CreditCagnotte, EssaiUtilise, Parrainage, Prelevement


@admin.register(Abonnement)
class AbonnementAdmin(admin.ModelAdmin):
    list_display = ("client", "palier", "formule", "debut", "prochain", "fin", "resilie", "echec_le")
    list_filter = ("palier", "formule")


@admin.register(Prelevement)
class PrelevementAdmin(admin.ModelAdmin):
    list_display = ("reference", "abonnement", "montant", "etat", "le")
    list_filter = ("etat",)


@admin.register(AbonnementOffert)
class AbonnementOffertAdmin(admin.ModelAdmin):
    list_display = ("ref", "offrant", "numero_masque", "palier", "mois", "montant", "beneficiaire")
    exclude = ("numero_chiffre",)


@admin.register(CreditCagnotte)
class CreditCagnotteAdmin(admin.ModelAdmin):
    list_display = ("client", "order_id", "montant", "reste", "etat", "expire_le")
    list_filter = ("etat",)


admin.site.register(EssaiUtilise)
admin.site.register(CodeParrainage)
admin.site.register(Parrainage)
