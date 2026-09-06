# backend/apps/accounts/management/commands/run_trust_score_maintenance.py
#
# Entretien périodique du Trust Score V5.5 :
#   - lève les sanctions arrivées à échéance (niveau 2 : simple levée ;
#     niveau 3 : réhabilitation par re-cold-start, jamais restauration du
#     score gelé) ;
#   - balaie les numéros Mobile Money partagés entre plusieurs comptes
#     acheteur distincts (dédup MoMo, §9) et les signale (niveau 1).
#
# À planifier périodiquement (cron / tâche planifiée) — non déclenché
# automatiquement, comme les autres commandes de ce type dans le projet.

from django.core.management.base import BaseCommand

from apps.accounts.trust_score import lift_expired_sanctions, scan_shared_momo_across_buyers


class Command(BaseCommand):
    help = "Lève les sanctions expirées (réhabilitation) et signale les numéros Mobile Money partagés entre acheteurs."

    def handle(self, *args, **options):
        lifted = lift_expired_sanctions()
        flagged = scan_shared_momo_across_buyers()
        self.stdout.write(self.style.SUCCESS(
            f"{lifted['throttling_lifted']} throttling levé(s), "
            f"{lifted['suspensions_lifted']} suspension(s) réhabilitée(s) par re-cold-start, "
            f"{len(flagged)} numéro(s) Mobile Money signalé(s) (partagés entre acheteurs)."
        ))
