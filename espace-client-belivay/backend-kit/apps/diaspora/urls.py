# backend/apps/diaspora/urls.py
# Chemins de la spécification, sous /api/ (apps.client_core.urls_api), sans barre finale.
from django.urls import path

from . import views

urlpatterns = [
    path("auth/diaspora/register", views.Inscrire.as_view(), name="client-diaspora-register"),
    path("auth/social/lookup", views.IdentiteFournisseur.as_view(), name="client-social-lookup"),
    path("auth/social/diaspora", views.InscrireSocial.as_view(), name="client-social-diaspora"),
    path("me/active-relative", views.ProcheActifVue.as_view(), name="client-active-relative"),
    path("me/family-links", views.Liens.as_view(), name="client-family-links"),
    path("me/family-links/code", views.CodeFamille.as_view(), name="client-family-links-code"),
    path("me/family-links/invite", views.Inviter.as_view(), name="client-family-links-invite"),
    path("me/family-links/invitation", views.LienInvitation.as_view(), name="client-family-links-invitation"),
    path("me/family-links/invitation/<str:code>/accept", views.AccepterInvitation.as_view(), name="client-family-links-accept"),
    path("me/family-links/<str:id>", views.Lien.as_view(), name="client-family-link"),
    path("me/family-links/<str:id>/answer", views.RepondreLien.as_view(), name="client-family-link-answer"),
    path("me/family-links/<str:id>/delivery", views.LivraisonLien.as_view(), name="client-family-link-delivery"),
    path("me/family-links/<str:id>/requests", views.EnvoyerDemande.as_view(), name="client-family-link-requests"),
    path("me/family-requests", views.Demandes.as_view(), name="client-family-requests"),
    path("me/family-requests/<str:id>", views.AnnulerDemande.as_view(), name="client-family-request"),
    path("me/family-requests/<str:id>/decline", views.RefuserDemande.as_view(), name="client-family-request-decline"),
    path("family-links/<str:id>/orders", views.CommanderPour.as_view(), name="client-family-link-orders"),
]
