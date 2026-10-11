# backend/apps/vendeur_catalogue/admin.py
from django.contrib import admin

from .models import DemandeFiche, PhotoOffre, PublicationOffre, RechercheCatalogue


@admin.register(PhotoOffre)
class PhotoOffreAdmin(admin.ModelAdmin):
    list_display = ("__str__", "boutique", "offre", "cible", "largeur", "hauteur", "lieu", "prise")
    search_fields = ("boutique__nom", "lieu")
    readonly_fields = ("variantes", "octets_avant", "octets_apres", "cree_le")


@admin.register(DemandeFiche)
class DemandeFicheAdmin(admin.ModelAdmin):
    list_display = ("recherche", "marque", "categorie", "boutique", "statut", "prioritaire", "envoyee_a", "reponse_avant")
    list_filter = ("statut", "prioritaire")
    search_fields = ("recherche", "marque")


@admin.register(RechercheCatalogue)
class RechercheCatalogueAdmin(admin.ModelAdmin):
    """Journal des recherches : lecture seule."""

    list_display = ("q", "zone", "exacts", "boutique", "a")
    list_filter = ("zone",)
    search_fields = ("q",)

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False


@admin.register(PublicationOffre)
class PublicationOffreAdmin(admin.ModelAdmin):
    list_display = ("offre", "a", "reponse_avant", "en_file")
