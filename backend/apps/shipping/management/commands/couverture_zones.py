# backend/apps/shipping/management/commands/couverture_zones.py
# Spec v2.1, R59.3 : au moins r_ent_min_zone entreprises actives par zone exploitée ; en dessous, alerte à l'équipe
# logistique, sans blocage. À programmer chaque jour (tâche planifiée du serveur).

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand

from apps.accounts.models import UserNotification
from apps.regles import services as regles
from apps.shipping.entreprises import zones_sous_le_minimum


class Command(BaseCommand):
    help = "Zones exploitées avec moins d'entreprises de livraison actives que r_ent_min_zone (R59.3)."

    def handle(self, *args, **options):
        manque = zones_sous_le_minimum()
        if not manque:
            self.stdout.write(self.style.SUCCESS("Chaque zone exploitée a assez d'entreprises actives."))
            return
        minimum = regles.reglage("r_ent_min_zone")
        detail = ", ".join(f"{z} ({n})" for z, n in sorted(manque.items()))
        message = f"Zones exploitées sous {minimum} entreprises de livraison actives : {detail}."
        for admin in User.objects.filter(is_staff=True, is_active=True):
            UserNotification.objects.create(user=admin, title="Couverture des zones (R59.3)", message=message,
                                            notification_type=UserNotification.NotificationType.SYSTEM,
                                            action_url="/admin/operations")
        self.stdout.write(self.style.WARNING(message))
