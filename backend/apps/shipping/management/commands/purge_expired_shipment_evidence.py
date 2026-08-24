from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.shipping.models import ShipmentEvidence


class Command(BaseCommand):
    help = "Supprime les fichiers de chaîne de garde arrivés à J+8 sans litige."

    def handle(self, *args, **options):
        now = timezone.now()
        candidates = ShipmentEvidence.objects.filter(
            retain_until__lte=now,
            litigation_hold=False,
            purged_at__isnull=True,
        ).select_related("shipment__order")
        purged = 0
        held = 0
        for evidence in candidates.iterator():
            has_dispute = evidence.shipment.order.disputes.exists()
            if has_dispute:
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
        self.stdout.write(self.style.SUCCESS(f"Preuves purgées: {purged}; placées sous gel litige: {held}."))
