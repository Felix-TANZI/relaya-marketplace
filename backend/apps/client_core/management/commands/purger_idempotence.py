# backend/apps/client_core/management/commands/purger_idempotence.py
# Supprime les clés d'idempotence de plus de 24 h (à lancer chaque jour : cron ou tâche Celery).
from django.core.management.base import BaseCommand

from apps.client_core.idempotence import purger


class Command(BaseCommand):
    help = "Supprime les clés d'idempotence de plus de 24 h (CAP-03)."

    def handle(self, *args, **opts):
        self.stdout.write(f"{purger()} clé(s) supprimée(s).")
