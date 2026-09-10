"""Seed demo data for the authenticated Google Maps workflow screenshots."""

from decimal import Decimal

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from django.utils.text import slugify

from apps.accounts.models import CourierProfile, DeliveryOrganizationProfile, RelayPointProfile
from apps.catalog.models import Category, Product
from apps.orders.models import Order, OrderHistory, OrderItem
from apps.shipping.models import RelayParcel, Shipment, ShipmentEvent, ShipmentLocation, Zone
from apps.vendors.models import VendorLocation, VendorProfile


DEMO_PASSWORD = "BelivayMaps2026!"
USERNAMES = {
    "admin": "maps_admin_demo",
    "client": "maps_client_demo",
    "seller": "maps_seller_demo",
    "courier": "maps_courier_demo",
    "organization": "maps_org_demo",
    "relay": "maps_relay_demo",
}


class Command(BaseCommand):
    help = "Cree des acteurs demo authentifiables et un workflow livraison avec positions GPS."

    @transaction.atomic
    def handle(self, *args, **options):
        actors = self._actors()
        zone = self._zone()
        vendor = self._vendor(actors["seller"], zone)
        relay = self._relay(actors["relay"])
        organization = self._organization(actors["organization"])
        courier = self._courier(actors["courier"], organization)
        product = self._product(vendor)
        order, item = self._order(actors["client"], product, zone, relay)
        shipment = self._shipment(order, item, vendor, courier, relay)

        self.stdout.write(self.style.SUCCESS("Workflow cartes BelivaY pret."))
        self.stdout.write(f"  commande demo : #{order.id}")
        self.stdout.write(f"  shipment demo : #{shipment.id}")
        self.stdout.write(f"  mot de passe   : {DEMO_PASSWORD}")
        for role, username in USERNAMES.items():
            self.stdout.write(f"  {role:<13}: {username}")

    def _user(self, username, email, first_name, last_name, *, staff=False, superuser=False):
        user, _ = User.objects.get_or_create(username=username, defaults={"email": email})
        user.email = email
        user.first_name = first_name
        user.last_name = last_name
        user.is_active = True
        user.is_staff = staff
        user.is_superuser = superuser
        user.set_password(DEMO_PASSWORD)
        user.save()
        return user

    def _actors(self):
        return {
            "admin": self._user(USERNAMES["admin"], "maps.admin@belivay.test", "Admin", "Maps", staff=True, superuser=True),
            "client": self._user(USERNAMES["client"], "maps.client@belivay.test", "Client", "Maps"),
            "seller": self._user(USERNAMES["seller"], "maps.seller@belivay.test", "Vendeur", "Maps"),
            "courier": self._user(USERNAMES["courier"], "maps.courier@belivay.test", "Livreur", "Maps"),
            "organization": self._user(USERNAMES["organization"], "maps.org@belivay.test", "Organisation", "Maps"),
            "relay": self._user(USERNAMES["relay"], "maps.relay@belivay.test", "Relais", "Maps"),
        }

    def _zone(self):
        zone, _ = Zone.objects.update_or_create(
            name="Yaounde Centre Maps Demo",
            defaults={
                "city": "Yaoundé",
                "tier": Zone.Tier.STANDARD,
                "districts": ["Mokolo", "Biyem-Assi", "Jouvence", "Mvan", "Odza", "Essos"],
                "is_active": True,
            },
        )
        return zone

    def _vendor(self, user, zone):
        vendor, _ = VendorProfile.objects.update_or_create(
            user=user,
            defaults={
                "business_name": "BelivaY Maps Store Mokolo",
                "business_description": "Boutique demo pour valider le workflow de localisation BelivaY.",
                "phone": "+237690100001",
                "whatsapp_phone": "+237690100001",
                "address": "Marché Mokolo, Yaoundé",
                "city": "Yaoundé",
                "zone": zone,
                "status": VendorProfile.Status.APPROVED,
                "approved_at": timezone.now(),
                "is_online": True,
                "certification_tier": VendorProfile.CertificationTier.GOLD,
                "total_points": 1240,
                "default_withdrawal_operator": "MTN_MOMO",
                "default_withdrawal_phone": "+237690100001",
            },
        )
        VendorLocation.objects.update_or_create(
            vendor=vendor,
            name="Boutique principale Mokolo",
            defaults={
                "address": "Entrée principale du marché Mokolo, Yaoundé",
                "description": "Portail orange côté pharmacie, appeler le responsable à l'arrivée.",
                "phone": "+237690100001",
                "representative_name": "Vendeur Maps",
                "representative_phone": "+237690100001",
                "latitude": Decimal("3.872000"),
                "longitude": Decimal("11.513000"),
                "is_active": True,
                "is_main": True,
            },
        )
        VendorLocation.objects.update_or_create(
            vendor=vendor,
            name="Dépôt Bastos",
            defaults={
                "address": "Bastos, Yaoundé",
                "description": "Petit dépôt secondaire près de la route principale.",
                "phone": "+237690100002",
                "representative_name": "Assistant Maps",
                "representative_phone": "+237690100002",
                "latitude": Decimal("3.890000"),
                "longitude": Decimal("11.505000"),
                "is_active": True,
                "is_main": False,
            },
        )
        return vendor

    def _relay(self, user):
        relay, _ = RelayPointProfile.objects.update_or_create(
            user=user,
            defaults={
                "name": "Relais Maps Jouvence",
                "manager_name": "Relais Maps",
                "phone": "+237690100006",
                "city": "Yaoundé",
                "zones": ["Jouvence", "Biyem-Assi"],
                "address": "Jouvence, Yaoundé",
                "relay_code": "RLY-MAPS-001",
                "opening_hours": "08h-19h",
                "latitude": Decimal("3.840000"),
                "longitude": Decimal("11.475000"),
                "storage_capacity": 80,
                "status": RelayPointProfile.Status.APPROVED,
                "is_active": True,
            },
        )
        return relay

    def _organization(self, user):
        org, _ = DeliveryOrganizationProfile.objects.update_or_create(
            user=user,
            defaults={
                "company_name": "BelivaY Fleet Maps",
                "manager_name": "Organisation Maps",
                "phone": "+237690100004",
                "city": "Yaoundé",
                "zones": ["Mokolo", "Biyem-Assi", "Jouvence", "Mvan"],
                "address": "Centre opérationnel, Yaoundé",
                "contract_reference": "CTR-MAPS-001",
                "allowed_vehicle_types": ["MOTORBIKE", "CAR"],
                "max_active_shipments": 50,
                "transport_insurance_verified": True,
                "status": DeliveryOrganizationProfile.Status.APPROVED,
                "is_active": True,
            },
        )
        return org

    def _courier(self, user, organization):
        courier, _ = CourierProfile.objects.update_or_create(
            user=user,
            defaults={
                "delivery_organization": organization,
                "phone": "+237690100005",
                "city": "Yaoundé",
                "zones": ["Mokolo", "Biyem-Assi", "Jouvence"],
                "vehicle_type": CourierProfile.VehicleType.MOTORBIKE,
                "id_card": "CNI-MAPS-001",
                "gps_permission_granted": True,
                "camera_permission_granted": True,
                "is_active": True,
                "is_approved": True,
                "is_online": True,
            },
        )
        return courier

    def _product(self, vendor):
        category = Category.objects.filter(is_active=True).order_by("id").first()
        if category is None:
            category = Category.objects.create(name="Demo Maps", slug="demo-maps")
        slug = "maps-workflow-smartphone"
        product, _ = Product.all_objects.update_or_create(
            slug=slug,
            defaults={
                "title": "Smartphone workflow maps",
                "description": "Produit demo pour le workflow complet des cartes.",
                "short_description": "Produit demo cartes Google Maps.",
                "price_xaf": 145000,
                "compare_at_price": 165000,
                "discount": 12,
                "sku": "MAPS-WF-001",
                "stock_threshold": 12,
                "is_active": True,
                "category": category,
                "vendor": vendor.user,
                "moderation_status": "APPROVED",
                "moderated_at": timezone.now(),
                "seller_note": "Produit seed pour captures workflow.",
            },
        )
        return product

    def _order(self, client, product, zone, relay):
        existing = Order.objects.filter(user=client, customer_email="maps.client@belivay.test").order_by("-id").first()
        if existing:
            existing.items.all().delete()
            existing.shipments.all().delete()
            existing.delete()

        order = Order.objects.create(
            user=client,
            customer_email="maps.client@belivay.test",
            customer_phone="+237690100003",
            delivery_method=Order.DeliveryMethod.DELIVERY,
            city="Yaoundé",
            region="Centre",
            district="Biyem-Assi",
            zone=zone,
            address="Biyem-Assi, entrée pharmacie, portail vert",
            address_precision={
                "district": "Biyem-Assi",
                "landmarks": ["Pharmacie", "Portail vert", "Carrefour Biyem-Assi"],
                "driverHint": "Entrer par la route de la pharmacie, appeler au portail vert.",
                "precisionScore": 88,
                "needsMoreDetail": False,
            },
            delivery_latitude=Decimal("3.835000"),
            delivery_longitude=Decimal("11.482000"),
            relay_point=relay,
            note="Livraison demo workflow maps.",
            payment_status=Order.PaymentStatus.PAID,
            fulfillment_status=Order.FulfillmentStatus.OUT_FOR_DELIVERY,
            escrow_status=Order.EscrowStatus.BLOCKED,
            subtotal_xaf=145000,
            delivery_fee_xaf=1500,
            total_xaf=146500,
            vendor_reply_deadline=timezone.now() + timezone.timedelta(hours=20),
            prep_deadline=timezone.now() + timezone.timedelta(hours=3),
        )
        item = OrderItem.objects.create(
            order=order,
            product=product,
            title_snapshot=product.title,
            price_xaf_snapshot=product.price_xaf,
            qty=1,
            line_total_xaf=product.price_xaf,
        )
        for action, message in [
            ("PAYMENT_CONFIRMED", "Paiement confirmé et fonds bloqués en escrow."),
            ("VENDOR_READY", "Boutique prête pour enlèvement."),
            ("COURIER_PICKED_UP", "Livreur a récupéré le colis."),
            ("OUT_FOR_DELIVERY", "Colis en route vers le client."),
        ]:
            OrderHistory.objects.create(order=order, user=client, action=action, new_value=message)
        return order, item

    def _shipment(self, order, item, vendor, courier, relay):
        shipment = Shipment.objects.create(
            order=order,
            vendor=vendor.user,
            status=Shipment.Status.OUT_FOR_DELIVERY,
            courier=courier,
            courier_name=f"{courier.user.first_name} {courier.user.last_name}".strip(),
            courier_phone=courier.phone,
            parcel_size="STANDARD",
            relay_point=relay.name,
            accepted_at=timezone.now() - timezone.timedelta(hours=2),
        )
        shipment.ensure_receipt_confirmation_code()
        shipment.ensure_pickup_confirmation_code()

        for status, message, location in [
            (Shipment.Status.ASSIGNED, "Livreur assigné par BelivaY Fleet Maps.", "Mokolo"),
            (Shipment.Status.PICKED_UP, "Colis récupéré chez le vendeur.", "Boutique principale Mokolo"),
            (Shipment.Status.IN_TRANSIT, "Colis en transit.", "Melen"),
            (Shipment.Status.OUT_FOR_DELIVERY, "Arrivée proche du client.", "Biyem-Assi"),
        ]:
            ShipmentEvent.objects.create(shipment=shipment, status=status, message=message, location=location)

        ShipmentLocation.objects.filter(shipment=shipment).delete()
        now = timezone.now()
        for index, (lat, lng) in enumerate([
            ("3.872000", "11.513000"),
            ("3.865000", "11.505000"),
            ("3.853000", "11.497000"),
            ("3.842000", "11.489000"),
        ]):
            ShipmentLocation.objects.create(
                shipment=shipment,
                courier=courier,
                latitude=Decimal(lat),
                longitude=Decimal(lng),
                accuracy_m=12,
                source=ShipmentLocation.Source.SIMULATION,
                captured_at=now - timezone.timedelta(minutes=(4 - index) * 8),
            )

        RelayParcel.objects.update_or_create(
            shipment=shipment,
            defaults={
                "relay_point": relay,
                "status": RelayParcel.Status.EXPECTED,
                "slot_code": "M-01",
                "pickup_code": "MAPS01",
                "proof_note": "Colis demo attendu par le point relais.",
            },
        )
        return shipment
