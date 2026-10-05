# backend/apps/extras/urls.py
# Chemins de la spécification, sous /api/ (apps.client_core.urls_api), sans barre finale.
from django.urls import path

from . import views

urlpatterns = [
    # Cotisations (FF-EX02)
    path("me/pools", views.MesCotisations.as_view(), name="client-pools"),
    path("me/pools/<str:id>/price-rise", views.DeciderHausse.as_view(), name="client-pool-price-rise"),
    path("pools/<str:code>", views.CotisationPublique.as_view(), name="client-pool-public"),
    path("pools/<str:code>/contributions", views.Participer_.as_view(), name="client-pool-contributions"),
    # Mises de côté (FF-EX03)
    path("me/layaways", views.MesCotes.as_view(), name="client-layaways"),
    path("me/layaways/<str:id>/installments", views.Versement.as_view(), name="client-layaway-installments"),
    path("me/layaways/<str:id>/cancel", views.AnnulerCote.as_view(), name="client-layaway-cancel"),
    # Ventes flash (FF-FLASH)
    path("flash-deals", views.VentesFlash.as_view(), name="client-flash-deals"),
    # Rentrée (FF-EX01)
    path("school-lists", views.ListesRentree.as_view(), name="client-school-lists"),
    path("school-lists/photo", views.ListePapierVue.as_view(), name="client-school-list-photo"),
    path("school-lists/<str:id>/order", views.CommanderRentree.as_view(), name="client-school-list-order"),
    path("school-lists/<str:id>/publish", views.PublierRentree.as_view(), name="client-school-list-publish"),
    # Panier famille (FF-EX05)
    path("me/family-baskets", views.MesPaniersFamille.as_view(), name="client-family-baskets"),
    path("me/family-baskets/recipient", views.DestinataireVue.as_view(), name="client-family-basket-recipient"),
    path("me/family-baskets/<str:id>", views.PanierFamille_.as_view(), name="client-family-basket"),
    path("me/family-baskets/<str:id>/pay", views.PayerFamille_.as_view(), name="client-family-basket-pay"),
    # Reprise (FF-EX04)
    path("me/trades", views.MesTrocs.as_view(), name="client-trades"),
    path("me/trades/<str:id>", views.TrocVue.as_view(), name="client-trade"),
    path("me/trades/<str:id>/answer", views.RepondreTroc.as_view(), name="client-trade-answer"),
    path("me/trades/<str:id>/contest", views.ContesterTroc.as_view(), name="client-trade-contest"),
    path("me/trades/<str:id>/pay", views.PayerTroc.as_view(), name="client-trade-pay"),
    # WhatsApp (FF-EX06) : a_finir
    path("whatsapp/conversation", views.whatsapp, name="client-whatsapp"),
    path("whatsapp/conversation/messages", views.whatsapp_messages, name="client-whatsapp-messages"),
]
