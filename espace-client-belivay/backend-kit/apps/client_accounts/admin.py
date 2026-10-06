# backend/apps/client_accounts/admin.py
# Données chiffrées (numéro, repères, position) jamais affichées : seules les formes masquées le sont.
from django.contrib import admin

from . import models as m


@admin.register(m.ProfilClient)
class ProfilClientAdmin(admin.ModelAdmin):
    list_display = ("user", "numero_masque", "operateur", "numero_verifie_le", "type_compte", "devise", "cgu_version", "supprime_le")
    list_filter = ("type_compte", "devise", "langue")
    search_fields = ("user__username", "user__email", "numero_masque")
    exclude = ("numero_chiffre", "numero_empreinte")


@admin.register(m.ChangementNumero)
class ChangementNumeroAdmin(admin.ModelAdmin):
    list_display = ("user", "ancien_masque", "nouveau_masque", "le")


@admin.register(m.Adresse)
class AdresseAdmin(admin.ModelAdmin):
    list_display = ("user", "nom", "quartier", "principale", "cree_le")
    exclude = ("reperes_chiffre", "instructions_chiffre", "destinataire_chiffre", "coords_chiffre")


@admin.register(m.VersionLegale)
class VersionLegaleAdmin(admin.ModelAdmin):
    list_display = ("version", "publiee_le")


@admin.register(m.ConsentementLegal)
class ConsentementLegalAdmin(admin.ModelAdmin):
    list_display = ("user", "doc", "version", "le", "ip")
    list_filter = ("doc", "version")

    def has_change_permission(self, request, obj=None):
        return False  # preuve : jamais modifiée

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(m.IdentiteLiee)
class IdentiteLieeAdmin(admin.ModelAdmin):
    list_display = ("user", "fournisseur", "email_masque", "liee_le")


@admin.register(m.BoutiqueClient)
class BoutiqueClientAdmin(admin.ModelAdmin):
    list_display = ("nom", "code", "user", "type", "piece", "vendor_id", "cree_le")
    list_filter = ("piece", "type")


@admin.register(m.DemandeBusiness)
class DemandeBusinessAdmin(admin.ModelAdmin):
    list_display = ("user", "etat", "le")
    list_filter = ("etat",)
    list_editable = ("etat",)


admin.site.register(m.Recherche)
admin.site.register(m.ProduitVu)
admin.site.register(m.AlerteFavori)
