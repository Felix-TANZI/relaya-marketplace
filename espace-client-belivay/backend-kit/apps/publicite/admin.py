# backend/apps/publicite/admin.py
from django.contrib import admin

from .models import Campagne, Clic, Mouvement, Signalement, SoldePublicitaire


@admin.register(Campagne)
class CampagneAdmin(admin.ModelAdmin):
    list_display = ("id", "boutique", "type", "statut", "enchere", "prix", "debut", "fin", "impressions")
    list_filter = ("type", "statut")


@admin.register(SoldePublicitaire)
class SoldeAdmin(admin.ModelAdmin):
    list_display = ("boutique", "solde")


@admin.register(Mouvement)
class MouvementAdmin(admin.ModelAdmin):
    list_display = ("boutique", "type", "statut", "montant", "libelle", "a")
    list_filter = ("type", "statut")


@admin.register(Clic)
class ClicAdmin(admin.ModelAdmin):
    list_display = ("campagne", "client", "jour", "cout", "vente", "repetitions")


@admin.register(Signalement)
class SignalementAdmin(admin.ModelAdmin):
    list_display = ("campagne", "motif", "client", "a", "traite")
    list_filter = ("motif", "traite")
