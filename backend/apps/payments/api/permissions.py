# backend/apps/payments/api/permissions.py
# Controle d'acces de l'API financiere.
#
# REGLE : chacun ne voit que CE QUI LE CONCERNE.
#   - un acheteur voit ses propres paiements
#   - un partenaire voit son propre compte financier
#   - personne ne voit le compte d'un autre
#
# Le filtrage se fait au niveau du QUERYSET, jamais par un controle a
# l'affichage : un objet qui ne devrait pas etre visible n'est jamais charge.
#
# ─────────────────────────────────────────────────────────────────────────────
# CE FICHIER N'IMPORTE AUCUNE APPLICATION METIER (principe P1)
#
# La resolution d'un utilisateur vers son profil partenaire vit dans
# bridge/actors.py — seul module autorise a connaitre VendorProfile,
# RelayPointProfile et les organisations de livraison.
#
# Un test d'integration continue verifie cette regle : il a d'ailleurs
# attrape une premiere version de ce fichier qui importait apps.vendors
# directement.
# ─────────────────────────────────────────────────────────────────────────────

from rest_framework.permissions import BasePermission

from apps.payments.bridge.actors import (  # noqa: F401
    has_partner_profile, partner_payee_for_user,
)

#: Nom historique, conserve pour la lisibilite des vues.
resolve_partner_payee = partner_payee_for_user


class IsPartner(BasePermission):
    """
    L'utilisateur est-il un partenaire ?

    On verifie l'existence d'un PROFIL, pas d'un compte financier. Un vendeur
    fraichement approuve n'a pas encore de PayeeAccount : lui repondre 403
    reviendrait a lui dire « cet espace ne vous concerne pas » alors qu'il
    n'a simplement aucune activite. Il doit voir un etat VIDE.
    """

    message = (
        "Cet espace est reserve aux vendeurs, entreprises de livraison et "
        "points relais."
    )

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return has_partner_profile(request.user)