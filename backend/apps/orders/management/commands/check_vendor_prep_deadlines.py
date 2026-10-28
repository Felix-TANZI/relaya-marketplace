# backend/apps/orders/management/commands/check_vendor_prep_deadlines.py
#
# Bon de préparation vendeur (4h ouvrées) — escalier (proposition validée,
# à défaut d'un chiffre écrit dans les PDF de référence) :
#   4h  : rappel automatique au vendeur
#   6h  : alerte admin, incident léger
#   fin du 2e créneau supplémentaire : réattribution automatique (cas 6.2)
#         si les 4 conditions strictes sont réunies (même Master Produit,
#         même état, prix ≤, même zone) ; sinon décision manuelle signalée
#         à l'admin — "si une seule condition manque, on propose au client,
#         on n'impose pas".
#
# À planifier périodiquement (cron / tâche planifiée), comme les autres
# commandes de ce type dans le projet.

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.accounts.models import UserNotification
from apps.orders.models import Order
from apps.shipping.tournees import _slot_boundaries

ADMIN_ALERT_DELAY_HOURS = 2   # +2h après le rappel de 4h = 6h depuis l'accusé vendeur
REASSIGNMENT_FALLBACK_HOURS = 12  # si pas de zone (ex. Douala) : pas de créneaux à compter


class Command(BaseCommand):
    help = "Vérifie les délais de préparation vendeur (bon de préparation) et applique l'escalier."

    def handle(self, *args, **options):
        now = timezone.now()
        candidates = Order.objects.filter(
            fulfillment_status__in=[
                Order.FulfillmentStatus.VENDOR_ACKNOWLEDGED,
                Order.FulfillmentStatus.PREPARING,
            ],
            prep_deadline__isnull=False,
            prep_deadline__lte=now,
        ).select_related("zone")

        reminders = alerts = reassignments = 0

        for order in candidates:
            vendor_users = {
                item.product.vendor for item in order.items.select_related("product")
                if item.product.vendor_id
            }

            if order.prep_reminder_sent_at is None:
                for vendor_user in vendor_users:
                    UserNotification.objects.create(
                        user=vendor_user,
                        title=f"Retard de préparation — commande #{order.id}",
                        message="Le délai de préparation (4h ouvrées) est dépassé. Préparez ce colis en priorité.",
                        notification_type=UserNotification.NotificationType.ORDER,
                        action_url="/seller/orders",
                    )
                order.prep_reminder_sent_at = now
                order.save(update_fields=["prep_reminder_sent_at"])
                reminders += 1

            admin_alert_at = order.prep_deadline + timezone.timedelta(hours=ADMIN_ALERT_DELAY_HOURS)
            if now >= admin_alert_at and order.prep_admin_alert_sent_at is None:
                for admin_user in User.objects.filter(is_staff=True):
                    UserNotification.objects.create(
                        user=admin_user,
                        title=f"Vendeur en retard (6h) — commande #{order.id}",
                        message=f"Aucun colis prêt 6h après l'accusé de réception vendeur pour la commande #{order.id}.",
                        notification_type=UserNotification.NotificationType.SYSTEM,
                        action_url=f"/admin/operations/orders/{order.id}",
                    )
                order.prep_admin_alert_sent_at = now
                order.save(update_fields=["prep_admin_alert_sent_at"])
                alerts += 1

            # Spec v2.1, R35.1 : la bascule se déclenche quand l'échéance du vendeur (R44.2), figée au paiement sur son
            # colis, est dépassée. Commande antérieure sans échéance : l'ancien calcul (créneaux supplémentaires).
            echeances = [e for e in order.shipments.values_list("echeance_vendeur", flat=True) if e is not None]
            if echeances:
                reassignment_at = min(echeances)
            elif order.zone_id:
                boundaries = _slot_boundaries(order.zone, admin_alert_at, admin_alert_at + timezone.timedelta(days=3))
                reassignment_at = boundaries[1] if len(boundaries) >= 2 else None
            else:
                reassignment_at = admin_alert_at + timezone.timedelta(hours=REASSIGNMENT_FALLBACK_HOURS)

            if reassignment_at and now >= reassignment_at and order.prep_reassignment_flagged_at is None:
                # Spec v2.1, R35.1 : échéance dépassée ; bascule (R35.2, R35.3) ou remboursement intégral (R35.4).
                from apps.orders.bascule import ECHEANCE, declencher

                for vendeur in vendor_users:
                    declencher(order, vendeur, ECHEANCE)
                order.prep_reassignment_flagged_at = now
                order.save(update_fields=["prep_reassignment_flagged_at"])
                reassignments += 1

        self.stdout.write(self.style.SUCCESS(
            f"{reminders} rappel(s) vendeur, {alerts} alerte(s) admin, {reassignments} réattribution(s) signalée(s)."
        ))
