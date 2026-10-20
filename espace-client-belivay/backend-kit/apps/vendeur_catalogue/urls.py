# backend/apps/vendeur_catalogue/urls.py
# Monté sous /api/vendors/ (apps.vendeur_core.urls) ; chemins SANS barre finale.
from django.urls import path

from . import views as v

urlpatterns = [
    # Produits (VD-08 : mes produits)
    path("offers", v.Offres.as_view()),
    path("offers/export", v.Exporter.as_view()),
    path("offers/import", v.Importer.as_view()),
    path("offers/draft", v.Brouillon.as_view()),
    path("offers/quote", v.Apercu.as_view()),
    path("offers/publication", v.Publication.as_view()),
    path("offers/<int:pk>", v.Offre.as_view()),
    path("offers/<int:pk>/stock", v.Stock.as_view()),
    path("offers/<int:pk>/pause", v.Pause.as_view()),
    path("offers/<int:pk>/duplicate", v.Dupliquer.as_view()),
    path("offers/<int:pk>/restore", v.Restaurer.as_view()),
    path("offers/<int:pk>/price-advice", v.Conseil.as_view()),
    path("offers/<int:pk>/publish", v.Publier.as_view()),
    path("offers/<int:pk>/price", v.Prix.as_view()),
    path("offers/<int:pk>/publication", v.Publication.as_view()),
    path("offers/<int:pk>/description-proposal", v.ProposerDescription.as_view()),
    path("offers/<int:pk>/attach", v.Rattacher.as_view()),
    path("offers/<int:pk>/delivery", v.LivraisonProduit.as_view()),
    path("offers/new", v.Creer.as_view()),
    path("offers/<str:cible>/photos", v.Photos.as_view()),
    path("offers/<str:cible>/photos/<str:photo>", v.Photo.as_view()),
    path("sheets/<str:fiche>/variants", v.Variantes.as_view()),
    # Nouveau produit (VD-08, DP-58 : une seule page, recherche d'abord ; produit nouveau = offers/new)
    path("config", v.Reglages.as_view()),
    path("catalog/search", v.Rechercher.as_view()),
    path("catalog/suggest", v.Suggerer.as_view()),
    path("catalog/barcode/<str:code>", v.CodeBarres.as_view()),
    path("catalog/recognize", v.Reconnaitre.as_view()),
    # Stock et inventaire, livraison et colis (AJ-A, DP-58)
    path("stock", v.Inventaire.as_view()),
    path("stock/movements", v.Mouvements.as_view()),
    path("stock/export", v.ExporterStock.as_view()),
    path("stock/<str:offre>/adjust", v.Ajuster.as_view()),
    path("stock/<str:offre>/threshold", v.Seuil.as_view()),
    path("delivery-settings", v.ReglagesLivraison.as_view()),
    path("delivery-settings/slots/<str:id>", v.CreneauPrefere.as_view()),
    path("delivery-settings/relays/<str:id>", v.RelaisPrefere.as_view()),
]
