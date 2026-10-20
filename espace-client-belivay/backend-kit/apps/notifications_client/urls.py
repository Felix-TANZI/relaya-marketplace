# backend/apps/notifications_client/urls.py
# Sous /api/ (apps.client_core.urls_api) ; chemins de routes.json, sans barre finale.
from django.urls import path

from . import views

urlpatterns = [
    path("me/notification-settings", views.Reglages.as_view(), name="reglages-notifications"),
    path("me/consents", views.Consentements.as_view(), name="consentements"),
    path("devices", views.Appareils.as_view(), name="appareils"),
    path("devices/<str:id>", views.AppareilDetail.as_view(), name="appareil"),
]
