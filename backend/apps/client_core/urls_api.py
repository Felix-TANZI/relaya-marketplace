# backend/apps/client_core/urls_api.py
# Toutes les routes du kit, sous /api/. Une seule ligne à ajouter dans relaya/urls.py :
#
#     path("api/", include("apps.client_core.urls_api")),
#
# Les chemins du kit sont ceux de la spécification, SANS barre finale (/api/me/adresses) ; ceux de relaya en ont
# une (/api/orders/12/) : les deux coexistent sans se masquer. Les modules dont l'application n'est pas installée
# sont simplement absents.

from django.apps import apps
from django.urls import include, path

urlpatterns = [path("", include("apps.client_core.urls"))]

for _app in (
    "otp",
    "client_accounts",
    "notifications_client",
    "cart",
    "pickup",
    "aftersales",
    "messaging",
    "wallet",
    "subscriptions",
    "wishlists",
    "diaspora",
    "extras",
    "recus",
    "contenus",
):
    if apps.is_installed(f"apps.{_app}"):
        urlpatterns.append(path("", include(f"apps.{_app}.urls")))
