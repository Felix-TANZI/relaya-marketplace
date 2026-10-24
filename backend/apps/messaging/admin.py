# backend/apps/messaging/admin.py
from django.contrib import admin

from .models import Conversation, DemandeRappel, EtatService, Message, QuestionFaq, ThemeFaq


class MessageEnLigne(admin.TabularInline):
    model = Message
    extra = 0
    fields = ("de", "qui", "texte", "photo", "cree_le")


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ("cle", "type", "titre", "client", "resolue", "maj_le")
    list_filter = ("type", "resolue")
    search_fields = ("cle", "titre")
    inlines = [MessageEnLigne]


class QuestionEnLigne(admin.StackedInline):
    model = QuestionFaq
    extra = 0


@admin.register(ThemeFaq)
class ThemeFaqAdmin(admin.ModelAdmin):
    list_display = ("titre", "cle", "langue", "ordre")
    list_filter = ("langue",)
    inlines = [QuestionEnLigne]


@admin.register(EtatService)
class EtatServiceAdmin(admin.ModelAdmin):
    list_display = ("nom", "ok", "detail", "ordre", "actif")
    list_editable = ("ok", "detail", "ordre", "actif")


@admin.register(DemandeRappel)
class DemandeRappelAdmin(admin.ModelAdmin):
    list_display = ("client", "sujet", "commande", "creneau", "date_appel", "annule_le", "appele_le")
    list_filter = ("date_appel",)
