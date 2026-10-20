# backend/apps/recus/admin.py
from django.contrib import admin

from .models import EnvoiRecu


@admin.register(EnvoiRecu)
class EnvoiRecuAdmin(admin.ModelAdmin):
    list_display = ("id", "type", "de_prenom", "pour_prenom", "etat", "le")
    list_filter = ("type", "etat")
    exclude = ("a_chiffre",)
    readonly_fields = ("a_empreinte", "actions", "merci")
