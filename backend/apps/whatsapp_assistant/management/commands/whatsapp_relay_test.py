# backend/apps/whatsapp_assistant/management/commands/whatsapp_relay_test.py
# Essai de bout en bout du volet point relais : fait ramasser un colis chez le
# vendeur, exactement comme le livreur dans son application, ce qui déclenche
# le vrai signal et donc le vrai message WhatsApp au gérant.
#
#   python manage.py whatsapp_relay_test --list
#   python manage.py whatsapp_relay_test --shipment 31

from django.core.management.base import BaseCommand, CommandError

from apps.whatsapp_assistant.bridge import relay
from apps.whatsapp_assistant.conf import get_config


class Command(BaseCommand):
    help = "Fait ramasser un colis d'essai pour vérifier la notification WhatsApp du point relais."

    def add_arguments(self, parser):
        parser.add_argument("--list", action="store_true", help="Lister les relais et leurs colis.")
        parser.add_argument("--shipment", type=int, help="Numéro du colis à faire ramasser.")

    def handle(self, *args, **options):
        config = get_config()
        if not (config.enabled and config.relay_notifications):
            self.stdout.write(self.style.WARNING(
                "WHATSAPP_ASSISTANT_ENABLED ou WHATSAPP_RELAY_NOTIFICATIONS est à 0 : "
                "le colis sera ramassé, mais aucun message ne partira."
            ))
        if options["list"]:
            return self._show_candidates()

        shipment_id = options["shipment"]
        if not shipment_id:
            raise CommandError("Indiquez --shipment <n°>. La liste : --list")

        from apps.shipping.models import RelayParcel

        parcel = RelayParcel.objects.filter(shipment_id=shipment_id).first()
        if parcel is None:
            raise CommandError(
                f"Le colis {shipment_id} ne va pas dans un point relais : "
                "c'est une livraison à domicile, personne à prévenir ici."
            )
        point = relay.get_relay(parcel.relay_point_id)
        if point is None:
            raise CommandError(f"Point relais {parcel.relay_point_id} introuvable.")

        destination = config.relay_notify_override or point.wa_id
        etat = "prêt" if (point.can_work and point.wa_id) else "INJOIGNABLE"
        self.stdout.write(f"Point relais : {point.name} · +{point.wa_id or '—'} · {etat}")
        if config.relay_notify_override:
            self.stdout.write(self.style.WARNING(f"Envoi dérouté vers +{destination} (numéro d'essai)."))

        relay.pickup_for_test(shipment_id)
        self.stdout.write(self.style.SUCCESS(
            f"Colis {shipment_id} ramassé chez le vendeur (colis relais n° {parcel.id})."
        ))
        self.stdout.write(
            "\nVérifiez le résultat :\n"
            "  • sur le téléphone du gérant ;\n"
            "  • dans l'admin Django, « Messages points relais » (motif d'échec le cas échéant)."
        )

    def _show_candidates(self):
        from apps.accounts.models import RelayPointProfile
        from apps.shipping.models import RelayParcel

        self.stdout.write(self.style.MIGRATE_HEADING("Points relais"))
        for profile in RelayPointProfile.objects.order_by("id")[:20]:
            point = relay.get_relay(profile.id)
            phone = f"+{point.wa_id}" if point.wa_id else "numéro invalide"
            flags = "" if point.can_work else "  (inactif ou non approuvé)"
            place = f"{point.stored}/{point.capacity}" if point.capacity else f"{point.stored} (illimité)"
            self.stdout.write(f"  {profile.id:>4}  {point.name} · {phone} · stockage {place}{flags}")

        self.stdout.write(self.style.MIGRATE_HEADING("\nColis attendus (à faire ramasser)"))
        parcels = (
            RelayParcel.objects.filter(status="EXPECTED")
            .select_related("shipment").order_by("-id")[:20]
        )
        if not parcels:
            self.stdout.write("  Aucun. Passez une commande à retirer en point relais.")
        for parcel in parcels:
            self.stdout.write(
                f"  --shipment {parcel.shipment_id:>4}  colis relais n° {parcel.id} · "
                f"relais {parcel.relay_point_id}"
            )
