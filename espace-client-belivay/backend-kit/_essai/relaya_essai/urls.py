# Serveur d'essai : routes existantes de relaya imitées (barre finale, comme chez eux) et routes réservées à l'essai.
from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from . import essai, views

urlpatterns = [
    # relaya : apps/accounts
    path("auth/register/", views.Inscription.as_view()),
    path("auth/login/", views.Connexion.as_view()),
    path("auth/refresh/", TokenRefreshView.as_view()),
    path("auth/logout/", views.Deconnexion.as_view()),
    path("auth/me/", views.Moi.as_view()),
    path("auth/change-password/", views.ChangerMotDePasse.as_view()),
    path("auth/notifications/", views.Notifications.as_view()),
    path("auth/notifications/read-all/", views.NotificationsToutesLues.as_view()),
    path("auth/notifications/<int:pk>/read/", views.NotificationLue.as_view()),
    path("auth/sessions/", views.Sessions.as_view()),
    path("auth/sessions/revoke-all/", views.SessionsToutesRevoquer.as_view()),
    path("auth/sessions/<str:jti>/revoke/", views.SessionRevoquer.as_view()),
    path("auth/favorites/", views.Favoris.as_view()),
    path("auth/favorites/<int:pk>/", views.Favori.as_view()),
    # relaya : apps/catalog
    path("catalog/products/", views.Produits.as_view()),
    path("catalog/products/<int:pk>/", views.Produit.as_view()),
    path("catalog/products/<int:pk>/reviews/", views.AvisProduit.as_view()),
    # relaya : apps/orders
    path("orders/my-orders/", views.MesCommandes.as_view()),
    path("orders/<int:pk>/", views.Commande.as_view()),
    path("orders/<int:pk>/confirm-receipt/", views.ConfirmerReception.as_view()),
    # relaya : apps/shipping, apps/contact
    path("shipping/relay-points/nearby/", views.RelaisProches.as_view()),
    path("contact/", views.Contact.as_view()),
    # Réservé à l'essai (settings.BELIVAY_ESSAI_ROUTES)
    path("_essai/codes", essai.Codes.as_view()),
    path("_essai/paiements", essai.Paiements.as_view()),
    path("_essai/paiements/confirmer", essai.ConfirmerPaiement.as_view()),
    path("_essai/commandes/<str:ref>/avancer", essai.Avancer.as_view()),
    path("_essai/commandes/<str:ref>/remettre", essai.Remettre.as_view()),
    path("_essai/3ds/<str:reference>", essai.banque_3ds),
    path("_essai/produits/<int:pk>/prix", essai.Prix.as_view()),
    path("_essai/limites", essai.Limites.as_view()),
]
