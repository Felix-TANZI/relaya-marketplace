from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.orders.models import Dispute, DisputeEvidence


class Command(BaseCommand):
    help = "Supprime les preuves de litige (DisputeEvidence) au-delà du délai de rétention — Addendum Décisions v1.0 §4.4."

    def handle(self, *args, **options):
        now = timezone.now()
        candidates = DisputeEvidence.objects.filter(
            retain_until__lte=now,
            litigation_hold=False,
            purged_at__isnull=True,
        ).select_related("dispute")
        open_statuses = {Dispute.STATUS_CHOICES[0][0], Dispute.STATUS_CHOICES[1][0]}  # OPEN, IN_PROGRESS
        purged = 0
        held = 0
        for evidence in candidates.iterator():
            if evidence.dispute.status in open_statuses:
                evidence.litigation_hold = True
                evidence.save(update_fields=["litigation_hold"])
                held += 1
                continue
            if evidence.file:
                evidence.file.delete(save=False)
            evidence.file = ""
            evidence.purged_at = now
            evidence.save(update_fields=["file", "purged_at"])
            purged += 1
        self.stdout.write(self.style.SUCCESS(f"Preuves de litige purgées: {purged}; gelées (litige actif): {held}."))
