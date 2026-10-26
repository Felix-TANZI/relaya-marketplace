# backend/apps/orders/management/commands/traiter_retours.py
# Feuille de route D18 ; spec v2.1 :
#   R68.1  colis retourné reçu et non inspecté r_inspection_h après sa réception : le remboursement part d'office
#   R70.2  remplacement non prêt r_remplacement_h après le choix du vendeur : remboursement
# Le remboursement passe par le circuit existant (events_in.return_completed) : une demande, approuvée par un tiers.
# À planifier toutes les heures.

import logging
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.orders.models import Return
from apps.regles import services as regles

logger = logging.getLogger("apps.orders")


def rembourser(ret, motif: str) -> None:
    from apps.orders.frais import part_frais_momo

    montant = int(ret.order_item.line_total_xaf or 0)
    frais = part_frais_momo(ret.order, montant)  # R72.1 : retour validé, le client n'est pas en faute
    ret.status = Return.Status.REFUNDED
    ret.refund_amount_xaf = montant
    ret.save(update_fields=["status", "refund_amount_xaf", "updated_at"])
    try:
        from apps.payments.bridge import events_in

        events_in.return_completed(order_id=ret.order_id, outcome="REFUND", refund_amount_xaf=montant,
                                   frais_momo_xaf=frais,
                                   event_id=f"return-{ret.id}-office", emitter=f"traiter_retours ({motif})")
    except Exception:
        logger.exception("Remboursement d'office non transmis — retour #%s.", ret.id)
    from apps.accounts.models import UserNotification

    UserNotification.objects.create(
        user=ret.requested_by, title=f"Remboursement en cours · commande #{ret.order_id}",
        message=f"{montant + frais} F te reviennent sur ton moyen de paiement d'origine ({motif}).",
        notification_type=UserNotification.NotificationType.ORDER, action_url=f"/orders/{ret.order_id}",
    )


class Command(BaseCommand):
    help = "Retours : remboursement d'office sans inspection (R68.1) ou sans remplacement à temps (R70.2)."

    def handle(self, *args, **options):
        maintenant = timezone.now()
        non_inspectes = Return.objects.filter(
            status=Return.Status.RECEIVED, inspected_at__isnull=True,
            received_at__lte=maintenant - timedelta(hours=regles.reglage("r_inspection_h")),
        )
        sans_remplacement = Return.objects.filter(
            status=Return.Status.REPLACEMENT_PENDING, replacement_ready_at__isnull=True,
            replacement_ship_deadline__lte=maintenant,
        )
        n = 0
        for ret in non_inspectes.select_related("order_item", "requested_by"):
            rembourser(ret, "inspection non faite à temps, R68.1")
            n += 1
        for ret in sans_remplacement.select_related("order_item", "requested_by"):
            rembourser(ret, "remplacement non prêt à temps, R70.2")
            n += 1
        self.stdout.write(self.style.SUCCESS(f"{n} remboursement(s) d'office."))
