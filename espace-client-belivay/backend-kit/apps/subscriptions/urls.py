# backend/apps/subscriptions/urls.py
# Inclus sous /api/ par apps.client_core.urls_api ; chemins de routes.json, sans barre finale.

from django.urls import path

from . import views

urlpatterns = [
    path("me/subscription", views.MonAbonnement.as_view()),
    path("me/subscription/pay", views.PayerAbonnement.as_view()),
    path("me/subscription/cancel", views.Resilier.as_view()),
    path("me/subscription/resume", views.Reprendre.as_view()),
    path("subscription-gifts", views.Offrir.as_view()),
    path("me/cagnotte/payout", views.VerserCagnotte.as_view()),
]
