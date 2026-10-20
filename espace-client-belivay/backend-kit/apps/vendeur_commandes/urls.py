# backend/apps/vendeur_commandes/urls.py
# Monté sous /api/vendors/ (apps.vendeur_core.urls) ; chemins SANS barre finale (Q-51 : ils coexistent avec les routes
# de relaya /api/vendors/orders/…). Noms du paquet (api-vendeur.json, route_relaya) ; ajoutés : handover,
# handovers, handover-code/renew, receipts, slip/open, slip/checks, slip/verify.
from django.urls import path

from . import views

urlpatterns = [
    path("orders", views.CommandesVue.as_view()),
    path("orders/<str:ref>", views.CommandeVue.as_view()),
    path("orders/<str:ref>/journal", views.JournalVue.as_view()),
    path("orders/<str:ref>/ready", views.PretVue.as_view()),
    path("orders/<str:ref>/stockout", views.RuptureVue.as_view()),
    path("orders/<str:ref>/extend", views.DelaiVue.as_view()),
    path("orders/<str:ref>/slip", views.BonVue.as_view()),
    path("orders/<str:ref>/slip/open", views.BonOuvertVue.as_view()),
    path("orders/<str:ref>/slip/checks", views.CocheVue.as_view()),
    path("orders/<str:ref>/slip/verify", views.ReferenceVue.as_view()),
    path("orders/<str:ref>/handover", views.RemiseVue.as_view()),
    path("orders/<str:ref>/handover-code", views.CodeVue.as_view()),
    path("orders/<str:ref>/handover-code/renew", views.NouveauCodeVue.as_view()),
    path("orders/<str:ref>/receipt", views.RecuVue.as_view()),
    path("orders/<str:ref>/not-ready", views.ColisNonPretVue.as_view()),
    path("handovers", views.RemisesVue.as_view()),
    path("pickups", views.RamassagesVue.as_view()),
    path("receipts", views.RecusVue.as_view()),
]
