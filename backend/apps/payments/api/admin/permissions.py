# backend/apps/payments/api/admin/permissions.py
# Controle d'acces a l'administration financiere.
#
# ─────────────────────────────────────────────────────────────────────────────
# POURQUOI is_staff NE SUFFIT PAS
#
# Aujourd'hui, tout membre du personnel peut ouvrir l'administration Django et
# approuver un versement de 400 000 FCFA. Le seul obstacle est l'inconfort de
# l'interface — ce n'est pas un controle d'acces.
#
# Une interface soignee supprime cet obstacle. Il faut donc un vrai controle
# AVANT de la construire, pas apres.
# ─────────────────────────────────────────────────────────────────────────────

from django.contrib.auth.models import Group
from rest_framework.permissions import BasePermission

#: Groupe Django portant l'habilitation financiere.
FINANCE_GROUP = "finance"


def is_finance_staff(user) -> bool:
    """
    Cet utilisateur peut-il consulter les donnees financieres ?

    Un SUPERUTILISATEUR passe toujours. Sans cette porte, personne ne
    pourrait creer le groupe le jour du deploiement — on se retrouverait
    enferme dehors.

    Il n'existe AUCUN repli sur `is_staff` : un repli silencieux annulerait
    la protection tout en donnant l'illusion qu'elle existe.
    """
    if not user or not user.is_authenticated:
        return False
    if user.is_superuser:
        return True
    return user.groups.filter(name=FINANCE_GROUP).exists()


def can_approve_money(user) -> bool:
    """
    Cet utilisateur peut-il APPROUVER un mouvement d'argent ?

    Aujourd'hui identique a la lecture. Le distinguer des maintenant permet
    de resserrer plus tard sans toucher aux vues — par exemple en exigeant
    un second groupe pour les montants eleves.
    """
    return is_finance_staff(user)


class IsFinanceStaff(BasePermission):
    """Lecture des donnees financieres."""

    message = (
        "L'espace financier est reserve aux membres habilites. "
        "Demandez votre rattachement au groupe « finance »."
    )

    def has_permission(self, request, view):
        return is_finance_staff(request.user)


class CanApproveMoney(BasePermission):
    """Actions qui deplacent de l'argent."""

    message = (
        "Vous n'etes pas habilite a valider un mouvement d'argent."
    )

    def has_permission(self, request, view):
        return can_approve_money(request.user)


def ensure_finance_group() -> Group:
    """Cree le groupe s'il n'existe pas. Idempotent."""
    groupe, _ = Group.objects.get_or_create(name=FINANCE_GROUP)
    return groupe