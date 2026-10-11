# backend/apps/publicite/urls.py
# Routes client de la publicité (DP-59), sous /api/, sans barre finale.
from django.urls import path

from . import views

urlpatterns = [
    path("sponsored/placements", views.PlacementsVue.as_view()),
    path("sponsored/home", views.AccueilVue.as_view()),
    path("sponsored/clicks", views.CliquerVue.as_view()),
    path("sponsored/impressions", views.VoirVue.as_view()),
    path("sponsored/reports", views.SignalerVue.as_view()),
]
