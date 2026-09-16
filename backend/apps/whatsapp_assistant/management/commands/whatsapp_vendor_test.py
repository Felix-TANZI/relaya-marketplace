# backend/apps/whatsapp_assistant/management/commands/whatsapp_vendor_test.py
# Essai de bout en bout du volet vendeur : fait basculer une commande en
# « payée » exactement comme le fait le paiement réel, ce qui déclenche le vrai
# signal et donc le vrai message WhatsApp au vendeur.
#
#   python manage.py whatsapp_vendor_test --list
#   python manage.py whatsapp_vendor_test --order 53

from django.core.management.base import BaseCommand, CommandError

from apps.whatsapp_assistant.bridge import vendor_orders
from apps.whatsapp_assistant.conf import get_config


class Command(BaseCommand):
    help = "Fait payer une commande d'essai pour vérifier la notification WhatsApp du vendeur."

    def add_arguments(self, parser):
        parser.add_argument("--list", action="store_true", help="Lister les boutiques et les commandes.")
        parser.add_argument("--order", type=int, help="Numéro de la commande à faire payer.")

    def handle(self, *args, **options):
        config = get_config()
        if not (config.enabled and config.vendor_notifications):
            self.stdout.write(self.style.WARNING(
                "WHATSAPP_ASSISTANT_ENABLED ou WHATSAPP_VENDOR_NOTIFICATIONS est à 0 : "
                "la commande sera payée, mais aucun message ne partira."
            ))
        if options["list"]:
            return self._show_candidates()

        order_id = options["order"]
        if not order_id:
            raise CommandError("Indiquez --order <n°>. La liste : --list")

        vendors = vendor_orders.vendors_of_order(order_id)
        if not vendors:
            raise CommandError(
                f"La commande {order_id} n'a aucun article rattaché à un vendeur : "
                "personne ne peut être prévenu."
            )
        for user_id in vendors:
            vendor = vendor_orders.vendor_of_user(user_id)
            if vendor is None:
                continue
            destination = config.vendor_notify_override or vendor.wa_id
            etat = "prête" if (vendor.can_sell and vendor.wa_id) else "INJOIGNABLE"
            self.stdout.write(f"Boutique : {vendor.shop} · +{vendor.wa_id or '—'} · {etat}")
            if config.vendor_notify_override:
                self.stdout.write(self.style.WARNING(f"Envoi dérouté vers +{destination} (numéro d'essai)."))

        vendor_orders.mark_paid_for_test(order_id)
        self.stdout.write(self.style.SUCCESS(f"Commande {order_id} marquée payée (fonds en escrow)."))
        self.stdout.write(
            "\nVérifiez le résultat :\n"
            "  • sur le téléphone du vendeur ;\n"
            "  • dans l'admin Django, « Messages vendeurs » (motif d'échec le cas échéant)."
        )

    def _show_candidates(self):
        from apps.orders.models import Order
        from apps.vendors.models import VendorProfile

        self.stdout.write(self.style.MIGRATE_HEADING("Boutiques"))
        for profile in VendorProfile.objects.select_related("user").order_by("id")[:20]:
            vendor = vendor_orders.get_vendor(profile.id)
            phone = f"+{vendor.wa_id}" if vendor.wa_id else "numéro invalide"
            flags = "" if vendor.can_sell else "  (boutique non approuvée)"
            self.stdout.write(f"  {profile.id:>4}  {vendor.shop} · {phone}{flags}")

        self.stdout.write(self.style.MIGRATE_HEADING("\nCommandes pas encore payées"))
        orders = (
            Order.objects.filter(fulfillment_status="CREATED")
            .order_by("-id")[:20]
        )
        if not orders:
            self.stdout.write("  Aucune. Passez une commande de test côté client.")
        for order in orders:
            vendeurs = vendor_orders.vendors_of_order(order.id)
            self.stdout.write(
                f"  --order {order.id:>4}  BVY-{order.id} · {order.city} · "
                f"{len(vendeurs)} vendeur(s) concerné(s)"
            )
