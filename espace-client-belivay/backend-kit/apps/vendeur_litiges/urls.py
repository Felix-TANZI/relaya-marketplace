# backend/apps/vendeur_litiges/urls.py
# Monté sous /api/vendors/ (apps.vendeur_core.urls) ; chemins sans barre finale ; routes fixes avant « <ref> ».
from django.urls import path

from . import views

urlpatterns = [
    path("disputes", views.LitigesVue.as_view()),
    path("disputes/rules", views.ReglesLitigesVue.as_view()),
    path("disputes/counts", views.CompteursLitigesVue.as_view()),
    path("disputes/<str:ref>", views.LitigeVue.as_view()),
    path("disputes/<str:ref>/evidence", views.PreuveVue.as_view()),
    path("disputes/<str:ref>/evidence/<str:ident>", views.RetirerPreuveVue.as_view()),
    path("disputes/<str:ref>/draft", views.BrouillonLitigeVue.as_view()),
    path("disputes/<str:ref>/answer", views.ReponseVue.as_view()),
    path("disputes/<str:ref>/appeal", views.RecoursVue.as_view()),
    path("returns", views.RetoursVue.as_view()),
    path("returns/counts", views.CompteursRetoursVue.as_view()),
    path("returns/<str:ref>", views.RetourVue.as_view()),
    path("returns/<str:ref>/receive", views.RecevoirVue.as_view()),
    path("returns/<str:ref>/photos", views.PhotoRetourVue.as_view()),
    path("returns/<str:ref>/photos/<str:ident>", views.RetirerPhotoRetourVue.as_view()),
    path("returns/<str:ref>/draft", views.BrouillonInspectionVue.as_view()),
    path("returns/<str:ref>/inspection", views.InspectionVue.as_view()),
    path("returns/<str:ref>/replacement", views.RemplacementVue.as_view()),
    path("returns/<str:ref>/replacement/ready", views.RemplacementPretVue.as_view()),
]
