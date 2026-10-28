# backend/apps/vendeur_boutique/admin.py
from django.contrib import admin

from .models import (
    AppareilVendeur,
    HistoriqueEquipe,
    InvitationMembre,
    MessageSupportVendeur,
    ProfilMembre,
    QuestionAideVendeur,
    ReglagesNotificationsVendeur,
    ReponseAvis,
)


class _LectureSeule(admin.ModelAdmin):
    """Journal : rien ne se modifie dans l'admin."""

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(ProfilMembre)
class ProfilMembreAdmin(admin.ModelAdmin):
    list_display = ("membre", "face_id", "export_demande_le", "cloture_demandee_le")
    exclude = ("photo",)


@admin.register(AppareilVendeur)
class AppareilVendeurAdmin(admin.ModelAdmin):
    list_display = ("membre", "nom", "lieu", "vu_a", "ouvertures", "revoque_le")
    list_filter = ("type",)


@admin.register(InvitationMembre)
class InvitationMembreAdmin(admin.ModelAdmin):
    list_display = ("boutique", "prenom", "nom", "cree_le", "confirmee_le")


@admin.register(HistoriqueEquipe)
class HistoriqueEquipeAdmin(_LectureSeule):
    list_display = ("boutique", "a", "action", "par", "membre")


@admin.register(MessageSupportVendeur)
class MessageSupportVendeurAdmin(admin.ModelAdmin):
    """Le support répond ici (de = support) ; les messages du vendeur ne se modifient pas (preuve)."""

    list_display = ("boutique", "de", "auteur", "a", "ref")
    list_filter = ("de",)


@admin.register(ReponseAvis)
class ReponseAvisAdmin(_LectureSeule):
    list_display = ("boutique", "avis_id", "n", "a")


@admin.register(ReglagesNotificationsVendeur)
class ReglagesNotificationsVendeurAdmin(admin.ModelAdmin):
    list_display = ("membre", "versements", "avis", "conseils", "son_distinct")


@admin.register(QuestionAideVendeur)
class QuestionAideVendeurAdmin(admin.ModelAdmin):
    list_display = ("ordre", "cle", "theme", "question", "actif")
    list_editable = ("actif",)
