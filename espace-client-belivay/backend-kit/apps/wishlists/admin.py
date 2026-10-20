# backend/apps/wishlists/admin.py
from django.contrib import admin

from .models import (
    ArticleListe,
    ColisEchange,
    EnvoiEchange,
    ListeEnvies,
    ListeSuivie,
    Merci,
    MiseEnStatut,
    ParticipationCagnotte,
    ProcheConnu,
    RechercheProche,
)

for _m in (
    ListeEnvies,
    ArticleListe,
    MiseEnStatut,
    ColisEchange,
    ProcheConnu,
    RechercheProche,
    EnvoiEchange,
    ListeSuivie,
    Merci,
    ParticipationCagnotte,
):
    admin.site.register(_m)
