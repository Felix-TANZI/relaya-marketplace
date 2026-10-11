# backend/apps/vendeur_session/admin.py
# Console : dossiers d'ouverture (jamais les numéros en clair ni les pièces en lien public), saisie assistée ; les
# appareils, tentatives et codes envoyés sont des journaux (lecture seule).
from django.contrib import admin

from .models import AppareilVendeur, DefiVendeur, DossierOuverture, FicheAgent, PreferenceBiometrie, TentativesConnexion, VisiteAgent


class LectureSeule(admin.ModelAdmin):
    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False


@admin.register(DossierOuverture)
class DossierAdmin(admin.ModelAdmin):
    list_display = ("ref", "nom", "categorie", "zone_code", "etape", "refus", "envoye_a", "reponse_avant", "signe_a")
    list_filter = ("etape", "depuis_client", "zone_code")
    search_fields = ("ref", "nom")
    exclude = ("telephone_chiffre", "versement_chiffre", "versement_attente_chiffre", "recto", "verso", "selfie")
    readonly_fields = ("ref", "user", "boutique", "elements", "signature_ip", "signature_appareil")


@admin.register(AppareilVendeur)
class AppareilAdmin(LectureSeule):
    list_display = ("user", "nom", "reconnu_le", "vu_le", "oublie_le")


@admin.register(TentativesConnexion)
class TentativesAdmin(LectureSeule):
    list_display = ("cle", "echecs", "bloque_jusqua")


@admin.register(DefiVendeur)
class DefiAdmin(LectureSeule):
    list_display = ("public_id", "objet", "user", "canal", "demande_a", "termine_le")
    exclude = ("telephone_chiffre",)


@admin.register(PreferenceBiometrie)
class BiometrieAdmin(LectureSeule):
    list_display = ("user", "proposee", "active", "modifiee_le")


class FicheEnLigne(admin.TabularInline):
    model = FicheAgent
    extra = 0
    fields = ("titre", "categorie", "rayon", "prix", "stock", "photos", "mediane_relevee", "validee_a")


@admin.register(VisiteAgent)
class VisiteAdmin(admin.ModelAdmin):
    list_display = ("boutique", "agent", "zone", "le", "gratuite")
    inlines = [FicheEnLigne]
