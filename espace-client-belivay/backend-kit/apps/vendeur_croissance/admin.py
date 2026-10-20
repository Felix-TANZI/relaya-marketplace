# backend/apps/vendeur_croissance/admin.py
from django.contrib import admin

from .models import (
    Contestation,
    CritereScore,
    Decision,
    DemandePaiement,
    EtatAbonnement,
    EvenementScore,
    FreinReleve,
    MeriteVisibilite,
    ProjectionScore,
    RechercheZone,
    ReleveScore,
    UtilisationRecompense,
    VuesOffre,
)


class LectureSeule(admin.ModelAdmin):
    """Journal : lecture seule (ajout par le service Scores seulement)."""

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(EvenementScore)
class EvenementScoreAdmin(LectureSeule):
    list_display = ("boutique", "a", "libelle", "effet", "critere", "ref")
    list_filter = ("effet", "critere")


@admin.register(ReleveScore)
class ReleveScoreAdmin(LectureSeule):
    list_display = ("boutique", "jour", "score", "commandes_livrees", "note")


class ContestationEnLigne(admin.StackedInline):
    model = Contestation
    extra = 0


@admin.register(Decision)
class DecisionAdmin(admin.ModelAdmin):
    list_display = ("ident", "boutique", "type", "niveau", "decidee_a", "effet_a", "validee_par", "levee_a", "annulee_a")
    list_filter = ("type",)
    search_fields = ("ident", "motif")
    inlines = [ContestationEnLigne]


@admin.register(DemandePaiement)
class DemandePaiementAdmin(admin.ModelAdmin):
    list_display = ("pk", "boutique", "objet", "montant", "statut", "envoyee_a", "confirmee_a")
    list_filter = ("statut", "quoi")


@admin.register(RechercheZone)
class RechercheZoneAdmin(admin.ModelAdmin):
    list_display = ("zone", "mots", "fois", "periode_jours")
    list_filter = ("zone",)


for m in (CritereScore, ProjectionScore, EtatAbonnement, MeriteVisibilite, UtilisationRecompense, VuesOffre, FreinReleve):
    admin.site.register(m)
