# backend/apps/vendeur_core/urls.py
# Routes de l'espace vendeur, sous /api/vendors/ (préfixe de relaya, Q-51 ; table de correspondance des noms du paquet
# dans logique-metier/vendeur/api-vendeur.json, champ route_relaya). Chemins SANS barre finale : ils coexistent avec les
# routes existantes de relaya (/api/vendors/orders/, avec barre) sans les masquer. Une application vendeur absente est
# simplement absente.
from django.apps import apps
from django.urls import include, path

APPLICATIONS = (
    "vendeur_session",
    "vendeur_commandes",
    "vendeur_litiges",
    "vendeur_catalogue",
    "vendeur_argent",
    "vendeur_croissance",
    "vendeur_boutique",
)

urlpatterns = [path("vendors/", include(f"apps.{a}.urls")) for a in APPLICATIONS if apps.is_installed(f"apps.{a}")]

if apps.is_installed("apps.publicite"):  # publicité du vendeur (DP-59) : /api/vendors/ads/…
    urlpatterns.append(path("vendors/", include("apps.publicite.urls_vendeur")))
