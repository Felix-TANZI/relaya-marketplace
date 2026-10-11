# backend/apps/vendeur_argent/urls.py
# Monté sous /api/vendors/ (apps.vendeur_core.urls) ; chemins SANS barre finale (Q-51).
from django.urls import path

from . import views

urlpatterns = [
    # Argent (propriétaire seulement)
    path("money/summary", views.ResumeVue.as_view()),
    path("money/releasing", views.SeLibereVue.as_view()),
    path("money/frozen", views.GeleVue.as_view()),
    path("money/earnings", views.GainsVue.as_view()),
    path("documents", views.DocumentsVue.as_view()),
    path("documents/content", views.ContenuDocumentVue.as_view()),
    # Versements (propriétaire seulement)
    path("payouts/next", views.ProchainVue.as_view()),
    path("payouts", views.HistoriqueVue.as_view()),
    path("payouts/<str:reference>/incident", views.IncidentVue.as_view()),
    path("payout-number", views.NumeroVue.as_view()),
    path("payout-number/codes", views.CodesVue.as_view()),
    path("payout-number/codes/resend", views.RenvoiVue.as_view()),
    # Accueil
    path("seller/today", views.AujourdhuiVue.as_view()),
    path("seller/today/hide-alert", views.MasquerAlerteVue.as_view()),
    path("seller/calm", views.CalmeVue.as_view()),
    path("seller/onboarding", views.PremierJourVue.as_view()),
    path("seller/suspension", views.SuspensionVue.as_view()),
    path("seller/activity", views.ActiviteVue.as_view()),
    path("seller/goal", views.ObjectifVue.as_view()),
    path("offline-queue", views.FileVue.as_view()),
    path("offline-queue/send", views.EnvoyerFileVue.as_view()),
    path("offline-queue/network", views.ReseauVue.as_view()),
    path("offline-queue/<str:ident>", views.ActionVue.as_view()),
]
