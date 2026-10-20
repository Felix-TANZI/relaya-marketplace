# backend/apps/otp/urls.py
# Sous /api/ (apps.client_core.urls_api) ; chemins de routes.json, sans barre finale.
from django.urls import path

from . import views

urlpatterns = [
    path("auth/otp/send", views.EnvoyerCode.as_view(), name="otp-envoyer"),
    path("auth/otp/verify", views.VerifierCode.as_view(), name="otp-verifier"),
    path("auth/password/forgot", views.OublierMotDePasse.as_view(), name="mdp-oublie"),
    path("auth/password/reset", views.NouveauMotDePasse.as_view(), name="mdp-nouveau"),
]
