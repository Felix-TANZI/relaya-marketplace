# backend/apps/orders/management/commands/check_dispute_silence.py
#
# Réponse aux litiges — 3 postures (accepter / contester / proposer un
# arrangement), r_litige_reponse_h à compter de l'ouverture du litige (spec v2.1,
# R70.1, feuille de route D18). Client silencieux r_litige_silence_j sur une
# demande de pièces : litige clos (R70.2). Passé ce délai sans
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
from apps.orders.models import Dispute, DisputeEvidenceRequest
from apps.regles import services as regles


class Command(BaseCommand):
    help = "Signale les litiges où le vendeur n'a pas répondu sous 48h (arbitrage sur pièces, présomption acheteur)."

    def handle(self, *args, **options):
        now = timezone.now()
        heures = regles.reglage("r_litige_reponse_h")
        silent = Dispute.objects.filter(
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
                    title=f"Litige #{dispute.id} — silence vendeur ({heures} h)",
                    message=(
                        f"Le vendeur n'a pas répondu sous {heures} h au litige #{dispute.id} "
                        f"(commande #{dispute.order_id}). Arbitrage sur pièces requis, "
                        "avec présomption favorable à l'acheteur — vérifiez d'abord si les "
                        "preuves existantes (photos C1, etc.) suffisent à trancher autrement."
                    ),
                    notification_type=UserNotification.NotificationType.SYSTEM,
                    action_url=f"/admin/operations/disputes/{dispute.id}",
                )
            flagged += 1

        # R70.2 : le client ne répond pas à une demande de pièces pendant r_litige_silence_j : le litige est clos.
        limite = now - timezone.timedelta(days=regles.reglage("r_litige_silence_j"))
        clos = 0
        for demande in DisputeEvidenceRequest.objects.filter(
            recipient_role=DisputeEvidenceRequest.RecipientRole.CLIENT,
            status=DisputeEvidenceRequest.Status.PENDING,
            created_at__lte=limite,
            dispute__status__in=["OPEN", "IN_PROGRESS"],
        ).select_related("dispute"):
            dispute = demande.dispute
            dispute.status = "CLOSED"
            dispute.resolution = "REJECTED"
            dispute.resolution_note = "Clos : le client n'a pas répondu à la demande de pièces (R70.2)."
            dispute.resolved_at = now
            dispute.save(update_fields=["status", "resolution", "resolution_note", "resolved_at", "updated_at"])
            UserNotification.objects.create(
                user=dispute.opened_by,
                title=f"Litige #{dispute.id} clos",
                message="Sans réponse de ta part à la demande de pièces, le litige est clos (R70.2).",
                notification_type=UserNotification.NotificationType.ORDER,
                action_url=f"/orders/{dispute.order_id}",
            )
            clos += 1

        self.stdout.write(self.style.SUCCESS(
            f"{flagged} litige(s) signalé(s) pour arbitrage sur silence, {clos} clos pour silence du client."))
