# backend/apps/vendeur_session/urls.py
# Monté sous /api/vendors/ (apps.vendeur_core.urls) ; chemins SANS barre finale (noms du paquet, api-vendeur.json).
from django.urls import path

from . import views as v

urlpatterns = [
    path("session", v.Session.as_view()),
    # Connexion (VD-03 ; routes d'authentification de relaya sous /api/vendors/, DP-57 T-1)
    path("auth/login", v.Connexion.as_view()),
    path("auth/2fa", v.DeuxFacteurs.as_view()),
    path("auth/2fa/resend", v.DeuxFacteursRenvoi.as_view()),
    path("auth/otp", v.CodeNumero.as_view()),
    path("auth/otp/resend", v.CodeNumeroRenvoi.as_view()),
    path("auth/verify", v.VerifierNumero.as_view()),
    path("auth/password-reset", v.MotDePasseOublie.as_view()),
    path("auth/password-reset/open", v.LienMotDePasse.as_view()),
    path("auth/password-reset/confirm", v.ChoisirMotDePasse.as_view()),
    path("auth/logout", v.Deconnexion.as_view()),
    path("auth/devices/forget", v.OublierAppareil.as_view()),
    path("me/biometrics", v.Biometrie.as_view()),
    # Ouverture (OUV, KYC, contrat)
    path("categories", v.Categories.as_view()),
    path("zone", v.ZoneDuPoint.as_view()),
    path("shops", v.Ouvrir.as_view()),
    path("shops/current", v.Ouverture.as_view()),
    path("shops/current/code", v.CodeOuverture.as_view()),
    path("shops/current/verify", v.VerifierOuverture.as_view()),
    path("shops/current/resend", v.RenvoiOuverture.as_view()),
    path("shops/from-client", v.DepuisClient.as_view()),
    path("shops/<str:ref>/kyc", v.Kyc.as_view()),
    path("shops/<str:ref>/payout-number", v.NumeroVersement.as_view()),
    path("shops/<str:ref>/payout-number/verify", v.VerifierVersement.as_view()),
    path("shops/<str:ref>/submit", v.EnvoyerVerification.as_view()),
    path("contract/sign", v.SignerContrat.as_view()),
    # Saisie assistée (SAI)
    path("assisted-entry", v.SaisieAssistee.as_view()),
    path("assisted-entry/approve", v.ValiderFiches.as_view()),
    path("assisted-entry/<str:pk>", v.ModifierFiche.as_view()),
]
