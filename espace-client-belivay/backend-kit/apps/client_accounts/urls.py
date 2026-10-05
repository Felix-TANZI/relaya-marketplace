# backend/apps/client_accounts/urls.py
# Sous /api/ (apps.client_core.urls_api) ; chemins de routes.json, sans barre finale.
from django.urls import path

from . import views as v

urlpatterns = [
    path("me", v.Moi.as_view(), name="moi"),
    path("me/menu", v.Menu.as_view(), name="menu"),
    path("me/email/check", v.EmailControle.as_view(), name="email-controle"),
    path("me/email", v.Email.as_view(), name="email"),
    path("me/phone/check", v.NumeroControle.as_view(), name="numero-controle"),
    path("me/phone/last-change", v.DernierChangementNumero.as_view(), name="numero-dernier-changement"),
    path("me/phone", v.Numero.as_view(), name="numero"),
    path("me/security", v.Securite.as_view(), name="securite"),
    path("me/identities", v.Identites.as_view(), name="identites"),
    path("me/identities/<str:provider>", v.Identite.as_view(), name="identite"),
    path("me/privacy", v.Confidentialite.as_view(), name="confidentialite"),
    path("me/search-history", v.HistoriqueRecherches.as_view(), name="historique-recherches"),
    path("me/viewed", v.HistoriqueVus.as_view(), name="historique-vus"),
    path("me/deletion", v.Suppression.as_view(), name="suppression"),
    path("me/adresses", v.Adresses.as_view(), name="adresses"),
    path("me/adresses/<str:id>", v.AdresseDetail.as_view(), name="adresse"),
    path("me/relais-habituel", v.RelaisHabituel.as_view(), name="relais-habituel"),
    path("me/interets", v.Interets.as_view(), name="interets"),
    path("legal/<str:doc>", v.LegalPublic.as_view(), name="legal"),
    path("me/legal", v.LegalCompte.as_view(), name="legal-compte"),
    path("me/legal/accept", v.LegalAccepter.as_view(), name="legal-accepter"),
    path("me/shop", v.Boutique.as_view(), name="boutique"),
    path("me/business", v.Business.as_view(), name="business"),
    path("me/preferences", v.Preferences.as_view(), name="preferences"),
    path("me/favorites/<str:id>", v.AlerteFavoriVue.as_view(), name="alerte-favori"),
]
