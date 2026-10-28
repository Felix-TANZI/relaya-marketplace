# backend/apps/publicite/urls_vendeur.py
# Routes vendeur de la publicité (DP-59), montées sous /api/vendors/ par apps.vendeur_core.urls, sans barre finale.
from django.urls import path

from . import views

urlpatterns = [
    path("ads", views.ApercuVue.as_view()),
    path("ads/dashboard", views.TableauVue.as_view()),
    path("ads/products", views.ProduitsVue.as_view()),
    path("ads/ledger", views.MouvementsVue.as_view()),
    path("ads/quote", views.EstimerVue.as_view()),
    path("ads/top-up", views.RechargerVue.as_view()),
    path("ads/top-up/<str:id>", views.RechargeVue.as_view()),
    path("ads/campaigns", views.CampagnesVue.as_view()),
    path("ads/campaigns/new", views.CreerVue.as_view()),
    path("ads/campaigns/<str:id>", views.CampagneVue.as_view()),
    path("ads/campaigns/<str:id>/pause", views.PauseVue.as_view()),
    path("ads/campaigns/<str:id>/stop", views.ArreterVue.as_view()),
    path("ads/campaigns/<str:id>/resume", views.ReprendreVue.as_view()),
    path("ads/campaigns/<str:id>/bid", views.EnchereVue.as_view()),
    path("ads/slots", views.EmplacementsVue.as_view()),
    path("ads/slots/book", views.ReserverVue.as_view()),
    path("ads/boost", views.BoostVue.as_view()),
    path("ads/flash", views.FlashVue.as_view()),
    path("ads/invoices/<str:mois>", views.FactureVue.as_view()),
]
