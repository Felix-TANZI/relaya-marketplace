# backend/apps/payments/urls.py
# L'ancien module de paiement — reduit a ce qui reste legitime.
#
# ─────────────────────────────────────────────────────────────────────────────
# CE QUI A ETE RETIRE, ET POURQUOI
#
#   init/                        Le nouveau module cree les intentions. Deux
#                                chemins de creation produiraient deux
#                                paiements pour une meme commande.
#
#   <id>/simulate-success/       MARQUAIT UN PAIEMENT REUSSI SANS QU'UN
#   <id>/simulate-failure/       FRANC NE BOUGE. En production, un POST sur
#                                cette route validait une commande
#                                gratuitement — il suffisait de connaitre un
#                                identifiant.
#
# Les vues restent dans `views.py` : c'est l'ACCES qui disparait, pas le
# code. Un retrait complet viendra avec la suppression du modele, une fois
# les donnees historiques migrees.
#
# Les trois routes conservees sont en LECTURE SEULE et servent encore
# l'affichage de l'historique.
# ─────────────────────────────────────────────────────────────────────────────

from django.urls import path

from .views import (
    MyPaymentsView,
    PaymentDetailView,
    PaymentListByOrderView,
)

urlpatterns = [
    path("list/", PaymentListByOrderView.as_view(),
         name="payment-list-by-order"),
    path("mine/", MyPaymentsView.as_view(), name="payment-list-mine"),
    path("<uuid:id>/", PaymentDetailView.as_view(), name="payment-detail"),
]