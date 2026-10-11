# backend/apps/vendeur_core/acces.py
# Qui parle au serveur, pour quelle boutique, avec quels droits (VD-02 p8 ; DP-55 ; VD-D10.A08).
#
#   VueVendeur          — membre actif d'une boutique (JWT de relaya, le même que le client) ; sinon 403 pas_vendeur.
#                         self.membre, self.boutique, self.proprietaire sont posés avant la méthode.
#   VueProprietaire     — en plus, propriétaire seulement : l'accès Préparation reçoit 403 owner_only (argent, prix,
#                         publication, plans, numéro de versement, équipe, achats).
#   ProprietaireSeulement — permission DRF à mettre sur une méthode : @proprietaire_seulement.
#   EstMembre           — aussi les droits d'un employé (vendeur_core.droits) : 403 forbidden_right.
#   montant(vue, x)     — x pour le propriétaire, None pour l'accès Préparation (« aucun montant », DP-55).
#
# Format d'erreur : celui du kit (CAP-04, apps.client_core.erreurs) ; le site vendeur lit le code owner_only et lève
# ReserveAuProprietaire (espace-vendeur/src/donnees/communs.ts).
from functools import wraps

from rest_framework import status
from rest_framework.permissions import BasePermission, IsAuthenticated

from apps.client_core.erreurs import ErreurClient
from apps.client_core.vues import VueClient

from .droits import droit_requis, droits_de
from .models import Membre

OWNER_ONLY = "owner_only"
FORBIDDEN_RIGHT = "forbidden_right"
MESSAGE_OWNER_ONLY = "Réservé au propriétaire de la boutique."


def refus_proprietaire() -> ErreurClient:
    return ErreurClient(status.HTTP_403_FORBIDDEN, OWNER_ONLY, MESSAGE_OWNER_ONLY)


def membre_de(user) -> Membre | None:
    if user is None or not user.is_authenticated:
        return None
    return (
        Membre.objects.select_related("boutique")
        .filter(user=user, actif=True, suspendu_le__isnull=True)
        .order_by("-role")  # « proprietaire » avant « preparation » si un compte est dans deux rôles
        .first()
    )


class EstMembre(BasePermission):
    """Membre actif d'une boutique : sinon 403 pas_vendeur (le compte client n'a pas de boutique)."""

    def has_permission(self, request, view):
        m = membre_de(request.user)
        if m is None:
            raise ErreurClient(status.HTTP_403_FORBIDDEN, "pas_vendeur", "Ce compte n'a pas de boutique.")
        view.membre = m
        view.boutique = m.boutique
        view.proprietaire = m.role == Membre.Role.PROPRIETAIRE
        if not view.proprietaire:
            # Droits par employé (INTEGRATION-API.md § 8) : 403 forbidden_right hors des droits cochés.
            d = droit_requis(request.method, request.path, getattr(request, "data", None))
            if d and d not in droits_de(m):
                raise ErreurClient(
                    status.HTTP_403_FORBIDDEN, FORBIDDEN_RIGHT, "Cette action ne fait pas partie de vos droits.", {"droit": d}
                )
        return True


class ProprietaireSeulement(BasePermission):
    def has_permission(self, request, view):
        if not getattr(view, "proprietaire", False):
            raise refus_proprietaire()
        return True


class VueVendeur(VueClient):
    permission_classes = [IsAuthenticated, EstMembre]
    membre: Membre
    boutique = None
    proprietaire = False

    def montant(self, x):
        """Montant pour le propriétaire ; None pour l'accès Préparation (aucun montant, DP-55)."""
        return x if self.proprietaire else None


class VueProprietaire(VueVendeur):
    permission_classes = [IsAuthenticated, EstMembre, ProprietaireSeulement]


def proprietaire_seulement(methode):
    """Décorateur d'une méthode de VueVendeur : 403 owner_only pour l'accès Préparation."""

    @wraps(methode)
    def enveloppe(self, request, *args, **kwargs):
        if not self.proprietaire:
            raise refus_proprietaire()
        return methode(self, request, *args, **kwargs)

    return enveloppe
