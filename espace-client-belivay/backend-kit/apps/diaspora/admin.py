# backend/apps/diaspora/admin.py
from django.contrib import admin

from .models import CodeFamille, CommandeDiaspora, CompteDiaspora, DemandeProche, Invitation, LienFamille

for _m in (CompteDiaspora, CodeFamille, Invitation, LienFamille, DemandeProche, CommandeDiaspora):
    admin.site.register(_m)
