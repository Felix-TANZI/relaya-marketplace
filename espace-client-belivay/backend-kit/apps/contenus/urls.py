# backend/apps/contenus/urls.py
# Chemins sous /api/ (apps.client_core.urls_api), sans barre finale.
from django.urls import path

from . import views

urlpatterns = [
    path("content/home", views.ContenuAccueil.as_view(), name="client-content-home"),
    path("content/pages/<slug:slug>", views.PageContenu.as_view(), name="client-content-page"),
    path("admin/media", views.TeleverserMedia.as_view(), name="client-admin-media"),
]
