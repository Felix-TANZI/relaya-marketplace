# backend/apps/shipping/management/commands/process_relay_garde.py
# Garde au relais / non-retrait — Addendum Décisions v1.0 §3.2.
#
# Gratuite J0->J+3, 200F/jour de J+3 a J+7 (ou J+11 si prolongee une fois).
# A l'echeance : retour au vendeur, frais de livraison + garde deduits de
# l'escrow, le reste rembourse a l'acheteur. Sanction : baisse de l'IFA
# (jamais une penalite monetaire au-dela des frais+garde).
#
# A lancer periodiquement (cron / celery beat) — idempotent : ne retraite
# jamais un colis deja marque non_retrait_processed_at.

import logging

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.accounts.models import UserNotification
from apps.shipping.models import RelayParcel, Shipment, ShipmentEvent

logger = logging.getLogger("apps.shipping")


class Command(BaseCommand):
    help = "Traite les colis en garde au relais qui ont depasse l'echeance de retrait (J+7, ou J+11 si prolonge)."

    def handle(self, *args, **options):
        now = timezone.now()
        candidates = RelayParcel.objects.filter(
            status__in=[RelayParcel.Status.RECEIVED, RelayParcel.Status.STORED],
            received_at__isnull=False,
            non_retrait_processed_at__isnull=True,
        ).select_related("shipment", "shipment__order", "relay_point")

        processed = 0
        for parcel in candidates.iterator():
            if now < parcel.garde_deadline:
                continue
            self._process_non_retrait(parcel, now)
            processed += 1

        self.stdout.write(self.style.SUCCESS(f"Non-retraits traités : {processed}."))

    def _process_non_retrait(self, parcel, now):
        shipment = parcel.shipment
        order = shipment.order
        garde_fee = parcel.garde_fee_due(at=now)
        delivery_fee = order.delivery_fee_xaf or 0
        deduction = garde_fee + delivery_fee
        refund_amount = max(0, order.subtotal_xaf - deduction)

        parcel.status = RelayParcel.Status.RETURNED_TO_VENDOR
        parcel.returned_at = now
        parcel.non_retrait_processed_at = now
        parcel.proof_note = (
            f"{parcel.proof_note}\nNon-retrait a l'echeance ({now:%Y-%m-%d}) — "
            f"frais garde {garde_fee} F + livraison {delivery_fee} F deduits."
        ).strip()
        parcel.save(update_fields=["status", "returned_at", "non_retrait_processed_at", "proof_note", "updated_at"])

        ShipmentEvent.objects.create(
            shipment=shipment,
            status=Shipment.Status.FAILED,
            message=f"Colis non retiré — retourné au vendeur après échéance de garde ({parcel.relay_point.name}).",
            location=parcel.relay_point.name,
        )

        # Gel puis remboursement partiel — reutilise le meme circuit que le
        # retour (P9 : le financier ne juge pas la raison, il consomme
        # l'evenement). Voir apps.payments.bridge.events_in.
        try:
            from apps.payments.bridge import events_in

            events_in.return_initiated(
                order_id=order.id,
                reason="Non-retrait au relais — échéance de garde dépassée",
                event_id=f"non-retrait-{parcel.id}-freeze",
                emitter="apps.shipping.process_relay_garde",
            )
            if refund_amount > 0:
                events_in.return_completed(
                    order_id=order.id,
                    outcome="PARTIAL",
                    refund_amount_xaf=refund_amount,
                    event_id=f"non-retrait-{parcel.id}-refund",
                    emitter="apps.shipping.process_relay_garde",
                )
            else:
                events_in.return_completed(
                    order_id=order.id,
                    outcome="REJECTED",
                    event_id=f"non-retrait-{parcel.id}-refund",
                    emitter="apps.shipping.process_relay_garde",
                )
        except Exception:
            logger.exception(
                "Evenement de non-retrait non transmis pour la commande #%s.", order.id,
            )

        # Sanction IFA — jamais monetaire au-dela des frais+garde deja deduits.
        if order.user_id:
            profile = getattr(order.user, "profile", None)
            if profile is not None:
                profile.non_retrait_count = (profile.non_retrait_count or 0) + 1
                if profile.non_retrait_count >= 2:
                    profile.requires_prepayment = True
                profile.save(update_fields=["non_retrait_count", "requires_prepayment"])

            UserNotification.objects.create(
                user=order.user,
                title=f"Colis retourné au vendeur · commande #{order.id}",
                message=(
                    f"Vous n'avez pas retiré votre colis au point relais {parcel.relay_point.name} "
                    f"dans le délai imparti. Il a été retourné au vendeur. "
                    f"{garde_fee + delivery_fee} F de frais ont été déduits ; "
                    f"{refund_amount} F vous seront remboursés."
                ),
                notification_type=UserNotification.NotificationType.ORDER,
                action_url=f"/orders/{order.id}",
            )
