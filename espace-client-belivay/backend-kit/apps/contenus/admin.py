# backend/apps/contenus/admin.py
# L'équipe remplace photos et textes ici (REPRISE-BACKEND.md, « Photos et contenus remplaçables »).
from django.contrib import admin
from django.utils.html import format_html

from . import services
from .models import BandeauAccueil, CarteConfiance, CategorieAccueil, Media, PageContenu, ReglagesAccueil


def _apercu(media):
    p = services.photo(media)
    return (
        format_html('<img src="{}" alt="" style="max-height:60px;max-width:120px;object-fit:cover;border-radius:6px">', p["url"])
        if p
        else "—"
    )


@admin.register(Media)
class MediaAdmin(admin.ModelAdmin):
    list_display = ("__str__", "apercu", "largeur", "hauteur", "cree_le")
    search_fields = ("alt", "fichier", "url_externe")
    readonly_fields = ("apercu", "largeur", "hauteur", "variantes", "par", "cree_le")

    @admin.display(description="aperçu")
    def apercu(self, obj):
        return _apercu(obj)

    def save_model(self, request, obj, form, change):
        if "fichier" in form.changed_data:
            obj.variantes = []
            obj.par = request.user.pk
        services.preparer(obj)
        super().save_model(request, obj, form, change)


class _AvecPhoto(admin.ModelAdmin):
    list_editable = ("ordre", "actif")
    autocomplete_fields = ("image",)

    @admin.display(description="photo")
    def apercu(self, obj):
        return _apercu(obj.image)


@admin.register(BandeauAccueil)
class BandeauAccueilAdmin(_AvecPhoto):
    list_display = ("titre", "apercu", "lien", "produits", "ordre", "actif")


@admin.register(CategorieAccueil)
class CategorieAccueilAdmin(_AvecPhoto):
    list_display = ("titre", "apercu", "lien", "ordre", "actif")


@admin.register(CarteConfiance)
class CarteConfianceAdmin(admin.ModelAdmin):
    list_display = ("titre", "icone", "lien", "ordre", "actif")
    list_editable = ("ordre", "actif")


@admin.register(ReglagesAccueil)
class ReglagesAccueilAdmin(admin.ModelAdmin):
    list_display = ("__str__", "flash_titre", "confiance_question", "maj_le")
    autocomplete_fields = ("fond_arrivee",)

    def has_add_permission(self, request):  # une seule ligne
        return not ReglagesAccueil.objects.exists()


@admin.register(PageContenu)
class PageContenuAdmin(admin.ModelAdmin):
    list_display = ("slug", "langue", "titre", "publie", "maj_le")
    list_filter = ("langue", "publie")
    search_fields = ("slug", "titre")
    autocomplete_fields = ("image",)
