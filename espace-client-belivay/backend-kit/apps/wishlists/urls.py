# backend/apps/wishlists/urls.py
# Chemins de la spécification, sous /api/ (apps.client_core.urls_api), sans barre finale.
from django.urls import path

from . import views

urlpatterns = [
    path("me/wishlists", views.MesListes.as_view(), name="client-wishlists"),
    path("me/wishlists/<str:id>", views.MaListe.as_view(), name="client-wishlist"),
    path("me/wishlists/<str:id>/items", views.ArticlesListe.as_view(), name="client-wishlist-items"),
    path("me/wishlists/<str:id>/items/<str:produit>", views.ArticleListe.as_view(), name="client-wishlist-item"),
    path("me/wishlists/<str:id>/share", views.PartageListe.as_view(), name="client-wishlist-share"),
    path("me/wishlists/<str:id>/start", views.DemarrerListe.as_view(), name="client-wishlist-start"),
    path("me/wishlists/<str:id>/status-shares", views.StatutListe.as_view(), name="client-wishlist-status"),
    path("me/wishlists/<str:id>/remind", views.RappelerInvites.as_view(), name="client-wishlist-remind"),
    path("wishlists/<str:code>", views.ListePublique.as_view(), name="client-wishlist-public"),
    path("wishlists/<str:code>/gifts", views.Offrir.as_view(), name="client-wishlist-gifts"),
    path("wishlists/<str:code>/gifts/otp", views.CodeCadeau.as_view(), name="client-wishlist-gift-otp"),
    path("wishlists/<str:code>/gifts/<str:ref>", views.SuiviCadeau.as_view(), name="client-wishlist-gift"),
    path("wishlists/<str:code>/fund", views.CagnotteListe.as_view(), name="client-wishlist-fund"),
    path("wishlists/<str:code>/items/<str:produit>/pool", views.CotiserArticle.as_view(), name="client-wishlist-pool"),
    path("me/exchanges", views.Echanges.as_view(), name="client-exchanges"),
    path("me/exchanges/send", views.EnvoyerAuxProches.as_view(), name="client-exchanges-send"),
    path("me/contacts/lookup", views.ChercherProche.as_view(), name="client-contacts-lookup"),
    path("me/followed-wishlists/<str:code>", views.SuivreListe.as_view(), name="client-followed-wishlist"),
    path("me/thanks", views.Remercier.as_view(), name="client-thanks"),
    path("me/incoming-parcels/<str:id>/answer", views.RepondreColis.as_view(), name="client-incoming-parcel-answer"),
    path("cart/send-to", views.EnvoyerPanierA.as_view(), name="client-cart-send-to"),
]
