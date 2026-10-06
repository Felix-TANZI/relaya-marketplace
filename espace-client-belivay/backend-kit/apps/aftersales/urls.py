# backend/apps/aftersales/urls.py
# Routes de l'après-vente, sous /api/ (apps.client_core.urls_api), sans barre finale : « orders/<id> » ne masque pas
# le « orders/<id>/ » de relaya (détail d'une commande).

from django.urls import path

from . import views

urlpatterns = [
    path("me/disputes", views.LitigesVue.as_view()),
    path("disputes", views.OuvrirLitigeVue.as_view()),
    path("disputes/<str:id>", views.LitigeVue.as_view()),
    path("disputes/<str:id>/photos", views.PreuveVue.as_view()),
    path("disputes/<str:id>/arrangement", views.ArrangementVue.as_view()),
    path("disputes/<str:id>/appeal", views.RecoursVue.as_view()),
    path("disputes/<str:id>/withdraw", views.RetirerVue.as_view()),
    path("returns/<str:id>/deposit", views.DepotRetourVue.as_view()),
    path("orders/<str:id>", views.CommandeLitigeVue.as_view()),
    path("orders/<str:id>/replacement", views.RemplacementVue.as_view()),
    path("orders/<str:id>/reviews", views.AvisVue.as_view()),
    path("reviews/<str:id>/vote", views.VoteVue.as_view()),
]
