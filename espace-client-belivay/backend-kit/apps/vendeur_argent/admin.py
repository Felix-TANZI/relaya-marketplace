# backend/apps/vendeur_argent/admin.py
from django.contrib import admin

from .models import ActionEnFile, ChangementNumero, EtatAccueil, Reprise, Versement, VersementCommande


class LectureSeule(admin.ModelAdmin):
    """Journal : rien ne s'écrit à la main (les versements passent par la machine VERSEMENT)."""

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


class CommandesVersees(admin.TabularInline):
    model = VersementCommande
    extra = 0
    can_delete = False
    readonly_fields = ("commande", "garde", "liberation")


@admin.register(Versement)
class VersementAdmin(LectureSeule):
    list_display = ("reference", "boutique", "vendredi", "montant", "statut", "numero_masque", "signale_le")
    list_filter = ("statut",)
    search_fields = ("reference", "boutique__nom")
    inlines = [CommandesVersees]


@admin.register(Reprise)
class RepriseAdmin(LectureSeule):
    list_display = ("commande", "boutique", "montant", "deduit", "decidee_le")


@admin.register(ChangementNumero)
class ChangementNumeroAdmin(LectureSeule):
    list_display = ("boutique", "operateur", "masque", "codes_envoyes_le", "valide_le", "revue_jusqua", "applique_le", "annule_le")
    exclude = ("numero_chiffre",)


@admin.register(EtatAccueil)
class EtatAccueilAdmin(LectureSeule):
    list_display = ("boutique", "alerte_masquee_le", "alerte_seuil", "hors_ligne_depuis")


@admin.register(ActionEnFile)
class ActionEnFileAdmin(LectureSeule):
    list_display = ("boutique", "type", "objet", "auteur", "origine", "etat")
    list_filter = ("type", "etat")
