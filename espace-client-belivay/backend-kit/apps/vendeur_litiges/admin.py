# backend/apps/vendeur_litiges/admin.py
from django.contrib import admin

from .models import BrouillonReponse, Dossier, EvenementDossier, PieceVendeur


class LectureSeule(admin.ModelAdmin):
    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(Dossier)
class DossierAdmin(admin.ModelAdmin):
    list_display = ("commande", "voie", "categorie", "posture", "verdict", "choix", "recours_a")
    list_filter = ("voie", "categorie", "posture", "verdict")
    search_fields = ("commande__ref",)
    raw_id_fields = ("litige", "boutique", "commande")


@admin.register(PieceVendeur)
class PieceVendeurAdmin(LectureSeule):
    list_display = ("dossier", "usage", "a", "par", "retiree_a")


@admin.register(BrouillonReponse)
class BrouillonReponseAdmin(LectureSeule):
    list_display = ("dossier", "posture", "garde_a")


@admin.register(EvenementDossier)
class EvenementDossierAdmin(LectureSeule):
    list_display = ("dossier", "a", "code", "auteur", "detail")
