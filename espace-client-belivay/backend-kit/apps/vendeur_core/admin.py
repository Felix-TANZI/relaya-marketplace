# backend/apps/vendeur_core/admin.py
from django.contrib import admin

from .models import Boutique, CommandeVendeur, EntreeJournal, FermetureBoutique, FicheCatalogue, Horloge, Livreur, Membre, Offre


class MembreEnLigne(admin.TabularInline):
    model = Membre
    extra = 0
    fields = ("prenom", "nom", "telephone", "role", "actif", "depuis")


@admin.register(Boutique)
class BoutiqueAdmin(admin.ModelAdmin):
    list_display = ("nom", "identifiant", "zone", "palier", "trust_score", "plan", "approuve_le")
    list_filter = ("palier", "plan", "statut")
    search_fields = ("nom", "identifiant")
    exclude = ("numero_chiffre",)  # chiffré : jamais affiché en clair
    inlines = [MembreEnLigne]


@admin.register(FicheCatalogue)
class FicheAdmin(admin.ModelAdmin):
    list_display = ("titre", "marque", "categorie", "rayon", "publiee")
    search_fields = ("titre", "marque")


@admin.register(Offre)
class OffreAdmin(admin.ModelAdmin):
    list_display = ("__str__", "boutique", "etat", "prix", "stock", "verification_avant")
    list_filter = ("etat",)
    actions = ["valider", "refuser"]

    @admin.action(description="Valider les offres en vérification (modération)")
    def valider(self, request, qs):
        from django.utils import timezone

        from .services import publier_produit

        for o in qs.filter(etat=Offre.Etat.EN_VERIFICATION):
            o.etat, o.verifiee_a = Offre.Etat.EN_VENTE, timezone.now()
            o.save(update_fields=["etat", "verifiee_a"])
            publier_produit(o)

    @admin.action(description="Refuser (motif à écrire ensuite dans la fiche de l'offre)")
    def refuser(self, request, qs):
        qs.filter(etat=Offre.Etat.EN_VERIFICATION).update(etat=Offre.Etat.REFUSEE)


class JournalEnLigne(admin.TabularInline):
    model = EntreeJournal
    extra = 0
    can_delete = False
    readonly_fields = ("a", "auteur", "role", "action", "detail", "avant", "apres")


@admin.register(CommandeVendeur)
class CommandeAdmin(admin.ModelAdmin):
    list_display = ("ref", "boutique", "payee_a", "prix", "garde", "prete_a", "remise_a", "annulee_a")
    search_fields = ("ref",)
    exclude = ("code_chiffre",)
    inlines = [JournalEnLigne]


admin.site.register(Livreur)
admin.site.register(FermetureBoutique)
admin.site.register(Horloge)
