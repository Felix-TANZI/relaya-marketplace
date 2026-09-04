# backend/apps/orders/management/commands/check_dispute_silence.py
#
# Réponse aux litiges — 3 postures (accepter / contester / proposer un
# arrangement), 48h à compter du contact vendeur. Passé ce délai sans
# réponse formelle : PAS un arbitrage automatique en faveur de l'acheteur —
# un arbitrage BelivaY sur pièces (photos C1, etc.), avec présomption
# favorable à l'acheteur. Le silence coûte au vendeur (incident, dossier
# tranché sans lui) sans jamais inverser la charge de la preuve : si les
# pièces montrent que le vendeur avait raison, le silence ne doit pas faire
# perdre un dossier qu'il aurait gagné.
#
# Cette commande NE TRANCHE RIEN. Elle signale, une seule fois, pour qu'un
# admin arbitre sur pièces avec la présomption ci-dessus en tête.

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.accounts.models import UserNotification
from apps.orders.models import Dispute


class Command(BaseCommand):
    help = "Signale les litiges où le vendeur n'a pas répondu sous 48h (arbitrage sur pièces, présomption acheteur)."

    def handle(self, *args, **options):
        now = timezone.now()
        silent = Dispute.objects.filter(
            vendor_contacted=True,
            vendor_replied=False,
            status__in=["OPEN", "IN_PROGRESS"],
            vendor_reply_deadline__isnull=False,
            vendor_reply_deadline__lte=now,
            silence_flagged_at__isnull=True,
        )

        flagged = 0
        for dispute in silent:
            dispute.silence_flagged_at = now
            dispute.status = Dispute.STATUS_CHOICES[1][0]  # IN_PROGRESS
            dispute.save(update_fields=["silence_flagged_at", "status", "updated_at"])

            for admin_user in User.objects.filter(is_staff=True):
                UserNotification.objects.create(
                    user=admin_user,
                    title=f"Litige #{dispute.id} — silence vendeur (48h)",
                    message=(
                        f"Le vendeur n'a pas répondu sous 48h au litige #{dispute.id} "
                        f"(commande #{dispute.order_id}). Arbitrage sur pièces requis, "
                        "avec présomption favorable à l'acheteur — vérifiez d'abord si les "
                        "preuves existantes (photos C1, etc.) suffisent à trancher autrement."
                    ),
                    notification_type=UserNotification.NotificationType.SYSTEM,
                    action_url=f"/admin/operations/disputes/{dispute.id}",
                )
            flagged += 1

        self.stdout.write(self.style.SUCCESS(f"{flagged} litige(s) signalé(s) pour arbitrage sur silence."))
