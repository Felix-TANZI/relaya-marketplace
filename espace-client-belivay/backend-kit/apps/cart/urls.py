# backend/apps/cart/urls.py
# Chemins de la spécification, sous /api/ (apps.client_core.urls_api), sans barre finale.
from django.urls import path

from . import views

urlpatterns = [
    path("cart", views.PanierVue.as_view(), name="client-cart"),
    path("cart/lines", views.LignesVue.as_view(), name="client-cart-lines"),
    path("cart/lines/<str:id>", views.LigneVue.as_view(), name="client-cart-line"),
    path("cart/lines/<str:id>/save", views.SauverLigne.as_view(), name="client-cart-line-save"),
    path("cart/lines/<str:id>/swap-offer", views.ChangerOffre.as_view(), name="client-cart-line-swap"),
    path("carts/<str:id>/share", views.Partager.as_view(), name="client-cart-share"),
    path("gift-links/<str:token>", views.PanierPartageVue.as_view(), name="client-gift-link"),
    path("me/gift-links", views.MesPaniersPartages.as_view(), name="client-my-gift-links"),
    path("gift-payments", views.PayerPanierPartage.as_view(), name="client-gift-payments"),
    path("checkout", views.Commander.as_view(), name="client-checkout"),
    path("checkout/confirm", views.Confirmer.as_view(), name="client-checkout-confirm"),
    path("orders/<str:id>/receipt", views.Recu.as_view(), name="client-order-receipt"),
    path("orders/<str:id>/counter-payment", views.PayerComptoir.as_view(), name="client-order-counter-payment"),
    path("me/pending-payments", views.EnAttente.as_view(), name="client-pending-payments"),
    path("payments/<str:id>/resend", views.Relancer.as_view(), name="client-payment-resend"),
    path("payments/<str:id>/cancel", views.AnnulerPaiement.as_view(), name="client-payment-cancel"),
    path("payments/<str:id>/abandon", views.AnnulerPaiement.as_view(), name="client-payment-abandon"),
]
