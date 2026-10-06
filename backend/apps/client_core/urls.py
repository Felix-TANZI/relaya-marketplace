# backend/apps/client_core/urls.py
from django.urls import path

from . import views

urlpatterns = [
    path("config/flags", views.Interrupteurs.as_view(), name="client-config-flags"),
]
