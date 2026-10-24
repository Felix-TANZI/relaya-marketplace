# backend/apps/vendeur_croissance/urls.py
# Routes de la croissance du vendeur, montées sous /api/vendors/ (apps.vendeur_core.urls), sans barre finale ; noms
# du paquet (logique-metier/vendeur/api-vendeur.json, route_relaya) ; routes ajoutées : account/decisions/<id>,
# plans/state, plans/stop, payments/<id>, rewards/<id>/use, flash-sales.
from django.urls import path

from . import views

urlpatterns = [
    path("score", views.ScoreVue.as_view()),
    path("score/appeal", views.ContesterVue.as_view()),
    path("account/status", views.StatutVue.as_view()),
    path("account/decisions", views.DecisionsVue.as_view()),
    path("account/decisions/<str:id>", views.DecisionVue.as_view()),
    path("tiers", views.PaliersVue.as_view()),
    path("plans", views.PlansVue.as_view()),
    path("plans/state", views.EtatPlanVue.as_view()),
    path("plans/simulate", views.SimulerVue.as_view()),
    path("plans/subscribe", views.SouscrireVue.as_view()),
    path("plans/stop", views.ArreterVue.as_view()),
    path("payments/<str:id>", views.PaiementVue.as_view()),
    path("visibility", views.VisibiliteVue.as_view()),
    path("rewards/<str:id>/use", views.RecompenseVue.as_view()),
    path("flash-sales", views.VenteFlashVue.as_view()),
    path("promotions", views.PromotionsVue.as_view()),
    path("promotions/rules", views.ReglesPromotionsVue.as_view()),
    path("promotions/offers", views.OffresPromouvablesVue.as_view()),
    path("promotions/quote", views.ApercuPromotionVue.as_view()),
    path("promotions/<str:id>/stop", views.ArreterPromotionVue.as_view()),
    path("services", views.ServicesVue.as_view()),
    path("services/request", views.DemanderServiceVue.as_view()),
    path("stats", views.StatsVue.as_view()),
    path("demand", views.DemandeVue.as_view()),
]
