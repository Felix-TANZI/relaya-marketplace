# backend/apps/wallet/urls.py
# Inclus sous /api/ par apps.client_core.urls_api ; chemins de routes.json, sans barre finale.

from django.urls import path

from . import views

urlpatterns = [
    path("me/wallet", views.Portefeuille.as_view()),
    path("me/wallet/topups", views.Recharges.as_view()),
    path("me/wallet/withdrawal-fee", views.FraisRetrait.as_view()),
    path("me/wallet/withdrawals", views.Retraits.as_view()),
    path("me/moyens-paiement", views.Moyens.as_view()),
    path("me/moyens-paiement/<str:id>", views.UnMoyen.as_view()),
    path("me/moyens-paiement/<str:id>/verify", views.VerifierMoyen.as_view()),
    path("me/cartes", views.Cartes.as_view()),
    path("me/cartes/<str:id>", views.UneCarte.as_view()),
    path("me/factures", views.Factures.as_view()),
    path("orders/<str:id>/invoice.pdf", views.FacturePdf.as_view()),
]
