# backend/apps/shipping/management/commands/process_relay_garde.py
# Garde au relais et colis non retiré — spec v2.1, algorithme A4 (apps/shipping/garde.py).
#
#   R50.2  rappels par SMS aux jours r_rappel_j1 (3) et r_rappel_j2 (5) de garde ;
#   R37.2, R39.1  quand j dépasse r_garde_jours (7), les colis de la commande repartent au vendeur ;
#   R39.2  remboursement = produits − part de la livraison offerte − garde des 7 jours − frais d'absence non payés ;
#          la livraison payée et les frais Mobile Money ne sont pas rendus (R72).
#
# Le remboursement passe par le même circuit qu'avant (apps.payments.bridge.events_in) : seul le montant suit la spec.
# À lancer périodiquement (tâche planifiée du serveur) — idempotent : une commande traitée ne l'est jamais deux fois.

import logging

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.accounts.models import UserNotification
from apps.orders.models import Order
from apps.regles import services as regles
from apps.shipping import garde
from apps.shipping.models import RelayParcel, Shipment, ShipmentEvent

logger = logging.getLogger("apps.shipping")


def _sms(order, texte):
    from apps.otp.prestataires import sms

    if order.customer_phone:
        try:
            sms().envoyer(order.customer_phone, texte)
        except Exception:
            logger.exception("Rappel de garde non envoyé pour la commande #%s.", order.pk)


class Command(BaseCommand):
    help = "Garde au relais : rappels des jours 3 et 5, renvoi au vendeur après le jour 7 (spec v2.1, A4)."

    def handle(self, *args, **options):
        now = timezone.now()
        commandes = Order.objects.filter(
            shipments__relay_parcel__status__in=garde.AU_RELAIS,
            shipments__relay_parcel__non_retrait_processed_at__isnull=True,
        ).distinct()
        rappels = renvois = 0
        for order in commandes.iterator():
            colis = garde.colis_de_la_commande(order)
            j = garde.jour(order, now, colis)
            if j is None:
                continue
            if j > regles.reglage("r_garde_jours"):
                self._renvoyer(order, colis, now)
                renvois += 1
                continue
            rappels += self._rappeler(order, colis, j, now)
        self.stdout.write(self.style.SUCCESS(f"Rappels envoyés : {rappels} · non-retraits traités : {renvois}."))

    def _rappeler(self, order, colis, j, now) -> int:
        au_relais = [c for c in colis if c.status in garde.AU_RELAIS]
        relais = au_relais[0].relay_point.name if au_relais else ""
        envoyes = 0
        for reglage, champ in (("r_rappel_j1", "rappel_j1_at"), ("r_rappel_j2", "rappel_j2_at")):
            if j >= regles.reglage(reglage) and any(getattr(c, champ) is None for c in au_relais):
                total = garde.garde_commande(order, now)["total"]
                _sms(order, f"BelivaY : ta commande #{order.pk} t'attend au relais {relais} (jour {j} de garde). "
                            f"Garde à payer au retrait : {total} F. Après le jour {regles.reglage('r_garde_jours')}, "
                            f"elle repart au vendeur.")
                RelayParcel.objects.filter(pk__in=[c.pk for c in au_relais]).update(**{champ: now})
                envoyes += 1
        return envoyes

    def _renvoyer(self, order, colis, now):
        au_relais = [c for c in colis if c.status in garde.AU_RELAIS]
        rembourse = garde.rembourse_non_retire(order, au_relais)                         # R39.2
        for parcel in au_relais:
            parcel.status = RelayParcel.Status.RETURNED_TO_VENDOR
            parcel.returned_at = now
            parcel.non_retrait_processed_at = now
            parcel.proof_note = (f"{parcel.proof_note}\nNon-retrait après le jour {regles.reglage('r_garde_jours')} "
                                 f"de garde ({now:%Y-%m-%d}) — remboursement R39.2 : {rembourse} F.").strip()
            parcel.save(update_fields=["status", "returned_at", "non_retrait_processed_at", "proof_note", "updated_at"])
            ShipmentEvent.record(
                shipment=parcel.shipment,
                status=Shipment.Status.FAILED,
                message=f"Colis non retiré — retourné au vendeur après la garde ({parcel.relay_point.name}).",
                location=parcel.relay_point.name,
                actor_role=ShipmentEvent.ACTOR_ROLE_SYSTEM,
            )

        try:
            from apps.payments.bridge import events_in

            premier = au_relais[0].pk
            events_in.return_initiated(
                order_id=order.id,
                reason="Non-retrait au relais — garde dépassée (R39.1)",
                event_id=f"non-retrait-{premier}-freeze",
                emitter="apps.shipping.process_relay_garde",
            )
            events_in.return_completed(
                order_id=order.id,
                outcome="PARTIAL" if rembourse > 0 else "REJECTED",
                refund_amount_xaf=rembourse if rembourse > 0 else 0,
                event_id=f"non-retrait-{premier}-refund",
                emitter="apps.shipping.process_relay_garde",
            )
        except Exception:
            logger.exception("Evenement de non-retrait non transmis pour la commande #%s.", order.id)

        # Ancienne sanction (hors spec v2.1, gardée telle quelle) : compteur de non-retraits du client.
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
                    f"Ta commande n'a pas été retirée au relais {au_relais[0].relay_point.name} avant la fin de la garde. "
                    f"Elle repart au vendeur ; {rembourse} F te seront remboursés sur ton moyen de paiement. "
                    f"La livraison, la garde et les frais Mobile Money ne sont pas rendus."
                ),
                notification_type=UserNotification.NotificationType.ORDER,
                action_url=f"/orders/{order.id}",
            )
