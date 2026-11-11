# backend/apps/accounts/acces_provisoire.py
# DEV-SRV-01, T07-4/5 : l'agent crée le compte au nom du vendeur, qui « reçoit ensuite son accès ». Sans SMS, l'accès
# est un mot de passe provisoire remis sur place (décision du porteur du 2026-11-06) : affiché une seule fois à
# l'agent, jamais stocké en clair, valable r_acces_provisoire_h, à changer à la première connexion.

import secrets
from datetime import timedelta

from django.contrib.auth.models import User
from django.db.models.signals import pre_save
from django.dispatch import receiver
from django.utils import timezone

from apps.regles import services as regles

from .models import AccesProvisoire

#: Sans 0/O ni 1/l/I : lu à voix haute ou recopié sur un papier, il ne doit pas se tromper.
ALPHABET = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789"
LONGUEUR = 10


def donner(user: User, agent: User) -> str:
    """Pose un nouveau mot de passe provisoire et le rend (seule fois où il existe en clair)."""
    mot_de_passe = "".join(secrets.choice(ALPHABET) for _ in range(LONGUEUR))
    user._acces_provisoire_en_cours = True  # le signal ci-dessous ne doit pas effacer la fiche qu'on pose
    user.set_password(mot_de_passe)
    user.save(update_fields=["password"])
    del user._acces_provisoire_en_cours
    AccesProvisoire.objects.update_or_create(
        user=user,
        defaults={"cree_par": agent,
                  "expire_le": timezone.now() + timedelta(hours=regles.reglage("r_acces_provisoire_h"))},
    )
    return mot_de_passe


@receiver(pre_save, sender=User)
def effacer_quand_le_mot_de_passe_change(sender, instance, **kwargs):
    """Le vendeur a choisi son mot de passe (changement, oubli, réinitialisation) : l'accès provisoire n'a plus
    lieu d'être, et la première connexion n'est plus « à changer »."""
    if not instance.pk or getattr(instance, "_acces_provisoire_en_cours", False):
        return
    # La plupart des enregistrements ne touchent pas au mot de passe (dernière connexion à chaque login) : aucune
    # requête pour eux.
    champs = kwargs.get("update_fields")
    if champs is not None and "password" not in champs:
        return
    if not AccesProvisoire.objects.filter(user_id=instance.pk).exists():
        return
    ancien = User.objects.filter(pk=instance.pk).values_list("password", flat=True).first()
    if ancien is not None and ancien != instance.password:
        AccesProvisoire.objects.filter(user_id=instance.pk).delete()
