# Aide des tests : DP-42 exige deux validations par deux personnes, le comptable (Finance) puis le porteur
# (Direction). Les tests qui ont besoin d'un versement approuvé passent par ici.

from django.contrib.auth.models import Group, User


def avec_role(user, *groupes):
    for nom in groupes:
        user.groups.add(Group.objects.get_or_create(name=nom)[0])
    return user


def porteur_de_test():
    n = User.objects.filter(username__startswith="porteur-dp42-").count() + 1
    return avec_role(User.objects.create_user(f"porteur-dp42-{n}", f"p{n}@belivay.cm", "x"), "direction")


def valider_dp42(demande, comptable, porteur=None):
    """Les deux validations DP-42 : `comptable` reçoit le rôle Finance, un porteur est créé s'il manque."""
    from apps.payments.settlements.services import approve_payout

    avec_role(comptable, "finance-comptable")
    demande = approve_payout(demande, approved_by=comptable)
    return approve_payout(demande, approved_by=porteur or porteur_de_test())
