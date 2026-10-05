# backend/apps/recus/urls.py
# Chemins de la spécification, sous /api/ (apps.client_core.urls_api), sans barre finale.
from django.urls import path

from . import views

urlpatterns = [
    path("me/inbox", views.Boite.as_view(), name="client-inbox"),
    path("me/inbox/<str:id>", views.Detail.as_view(), name="client-inbox-item"),
    path("me/inbox/<str:id>/actions", views.Action.as_view(), name="client-inbox-actions"),
    path("me/inbox/<str:id>/thanks", views.Merci.as_view(), name="client-inbox-thanks"),
    path("me/outbox", views.Envoyer.as_view(), name="client-outbox"),
]
