# backend/apps/whatsapp_assistant/management/commands/whatsapp_courier_test.py
# Essai de bout en bout du volet livreur : assigne un colis (ou compose une
# tournée) exactement comme le font les portails, ce qui déclenche le vrai
# signal et donc le vrai message WhatsApp.
#
#   python manage.py whatsapp_courier_test --list
#   python manage.py whatsapp_courier_test --shipment 12 --courier 3
#   python manage.py whatsapp_courier_test --tour 12 13 14 --courier 3

from django.core.management.base import BaseCommand, CommandError

from apps.whatsapp_assistant.bridge import deliveries
from apps.whatsapp_assistant.conf import get_config


class Command(BaseCommand):
    help = "Assigne un colis de test à un livreur pour vérifier la notification WhatsApp."

    def add_arguments(self, parser):
        parser.add_argument("--list", action="store_true", help="Lister les colis et les livreurs.")
        parser.add_argument("--shipment", type=int, help="Numéro du colis à assigner.")
        parser.add_argument("--tour", type=int, nargs="+", metavar="COLIS",
                            help="Composer une tournée de test avec ces colis.")
        parser.add_argument("--courier", type=int, help="Numéro du profil livreur.")

    def handle(self, *args, **options):
        config = get_config()
        if not (config.enabled and config.courier_notifications):
            self.stdout.write(self.style.WARNING(
                "WHATSAPP_ASSISTANT_ENABLED ou WHATSAPP_COURIER_NOTIFICATIONS est à 0 : "
                "l'assignation aura lieu, mais aucun message ne partira."
            ))
        if options["list"]:
            return self._show_candidates()

        courier_id = options["courier"]
        if not courier_id:
            raise CommandError("Indiquez --courier <n°>. La liste : --list")
        courier = deliveries.get_courier(courier_id)
        if courier is None:
            raise CommandError(f"Aucun profil livreur n° {courier_id}.")
        if not courier.wa_id:
            raise CommandError(
                f"Le livreur {courier.name} n'a pas de numéro camerounais valide : "
                "corrigez son téléphone dans l'admin, sinon WhatsApp ne peut pas le joindre."
            )
        if not courier.can_work:
            self.stdout.write(self.style.WARNING(
                "Ce livreur n'est pas approuvé ou pas actif : aucun message ne lui sera envoyé."
            ))

        destination = config.courier_notify_override or courier.wa_id
        self.stdout.write(f"Livreur : {courier.name} (+{courier.wa_id}, {courier.language})")
        if config.courier_notify_override:
            self.stdout.write(self.style.WARNING(f"Envoi dérouté vers +{destination} (numéro d'essai)."))

        if options["tour"]:
            tournee_id = deliveries.tour_for_test(options["tour"], courier_id)
            self.stdout.write(self.style.SUCCESS(
                f"Tournée n° {tournee_id} composée avec {len(options['tour'])} colis. "
                "Le livreur reçoit un message par colis, puis le récapitulatif."
            ))
        elif options["shipment"]:
            deliveries.assign_for_test(options["shipment"], courier_id)
            mission = deliveries.get_mission(options["shipment"])
            self.stdout.write(self.style.SUCCESS(f"Colis {mission.reference} assigné."))
        else:
            raise CommandError("Indiquez --shipment <n°> ou --tour <n°> <n°>…")

        self.stdout.write(
            "\nVérifiez le résultat :\n"
            "  • sur le téléphone du livreur ;\n"
            "  • dans l'admin Django, « Messages livreurs » (motif d'échec le cas échéant)."
        )

    def _show_candidates(self):
        from apps.accounts.models import CourierProfile
        from apps.shipping.models import Shipment

        self.stdout.write(self.style.MIGRATE_HEADING("Livreurs"))
        for profile in CourierProfile.objects.select_related("user").order_by("id")[:20]:
            courier = deliveries.get_courier(profile.id)
            flags = "" if courier.can_work else "  (inactif ou non approuvé)"
            phone = f"+{courier.wa_id}" if courier.wa_id else "numéro invalide"
            self.stdout.write(f"  --courier {profile.id:>4}  {courier.name} · {phone}{flags}")

        self.stdout.write(self.style.MIGRATE_HEADING("\nColis assignables"))
        shipments = (
            Shipment.objects.select_related("order")
            .filter(status__in=("PENDING", "ASSIGNED"))
            .order_by("-id")[:20]
        )
        if not shipments:
            self.stdout.write("  Aucun colis en attente. Passez une commande de test côté client.")
        for shipment in shipments:
            self.stdout.write(
                f"  --shipment {shipment.id:>4}  BVY-{shipment.order_id}-{shipment.id} · "
                f"{shipment.status} · livreur {shipment.courier_id or '—'}"
            )
