# -*- coding: utf-8 -*-
"""
Jeu de démonstration pour la section « Pour information » des notifications.

─────────────────────────────────────────────────────────────────────────────
CE QUE CETTE COMMANDE POSE, ET CE QU'ELLE NE POSE PAS

Elle crée des `UserNotification` — ce qui s'est passé, et que le gérant peut
lire plus tard. Elle ne touche pas à la section « À traiter » : celle-ci est
DÉRIVÉE de l'état réel du relais (colis annoncés, colis à faire partir,
pièces réclamées) et se remplit toute seule avec les autres jeux de
démonstration.

Un Trust Score est également posé, parce que deux des trois messages y
renvoient : annoncer « 2 points du seuil » sans score derrière donnerait au
gérant un chiffre qu'il ne retrouverait nulle part dans son portail.

Idempotente.
"""
from datetime import timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from apps.accounts.models import RelayPointProfile, TrustScoreProfile, UserNotification

# Les messages de démonstration portent ce préfixe interne dans leur URL
# d'action : c'est par là que la purge les reconnaît.
MARQUEUR = "/demo-notif"


class Command(BaseCommand):
    help = "Pose les messages « Pour information » de l'ecran Notifications."

    def add_arguments(self, parser):
        parser.add_argument("--relay", default=None, help="Nom d'utilisateur du point relais.")

    def handle(self, *args, **options):
        relay_point = self._relay_point(options.get("relay"))
        user = relay_point.user
        self.stdout.write(f"Point relais : {relay_point.name} ({user.username})")

        retires = UserNotification.objects.filter(user=user, action_url__startswith=MARQUEUR).delete()[0]
        if retires:
            self.stdout.write(f"Scenario precedent retire ({retires} messages).")

        maintenant = timezone.now()

        # Le score qui donne leur sens aux deux messages de palier.
        profil, _ = TrustScoreProfile.objects.update_or_create(
            user=user,
            role=TrustScoreProfile.Role.RELAY_POINT,
            defaults={"score": Decimal("72.00"), "tier": TrustScoreProfile.Tier.CONFIRMED},
        )

        messages = [
            (
                "PAYMENT",
                "Versement envoye",
                "Voir le detail · ref. BLV-VP-2281",
                f"{MARQUEUR}/versements",
                4,
            ),
            (
                "SYSTEM",
                "Seuil proche",
                f"Trust Score {int(profil.score)} : a 2 points du seuil de 70 ({profil.get_tier_display()})",
                f"{MARQUEUR}/trust",
                6,
            ),
            (
                "SYSTEM",
                "Trust Score +2",
                "Aucune reserve sur vos 30 derniers colis",
                f"{MARQUEUR}/trust",
                7,
            ),
        ]

        for type_, titre, corps, url, jours in messages:
            notification = UserNotification.objects.create(
                user=user,
                title=titre,
                message=corps,
                notification_type=type_,
                action_url=url,
                is_read=True,
            )
            # `created_at` est en auto_now_add : il faut le repositionner apres
            # coup pour etaler les messages sur la semaine, sinon ils portent
            # tous la meme heure et la colonne de droite ne dit plus rien.
            UserNotification.objects.filter(pk=notification.pk).update(
                created_at=maintenant - timedelta(days=jours),
            )

        self.stdout.write(self.style.SUCCESS(
            f"Scenario pose : 3 messages « Pour information », Trust Score {int(profil.score)}."
        ))

    def _relay_point(self, username):
        qs = RelayPointProfile.objects.filter(
            status=RelayPointProfile.Status.APPROVED, is_active=True,
        )
        if username:
            relay_point = qs.filter(user__username=username).first()
            if not relay_point:
                raise CommandError(f"Aucun point relais approuve pour « {username} ».")
            return relay_point
        if qs.count() != 1:
            raise CommandError(
                f"{qs.count()} points relais approuves : precisez lequel avec --relay <utilisateur>."
            )
        return qs.first()
