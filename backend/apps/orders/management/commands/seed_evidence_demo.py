import hashlib
from datetime import timedelta

from django.contrib.auth.models import User
from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.accounts.models import CourierProfile, DeliveryOrganizationProfile, RelayPointProfile
from apps.catalog.models import Category, Product
from apps.orders.models import Dispute, DisputeEvidence, DisputeEvidenceRequest, DisputeMessage, Order, OrderItem
from apps.shipping.models import RelayParcel, Shipment
from apps.vendors.models import VendorProfile


class Command(BaseCommand):
    help = "Crée le scénario visuel du workflow de preuves de litige."

    def handle(self, *args, **options):
        admin = self._user("preuve_admin", "PreuveAdmin2026!", is_staff=True, is_superuser=True)
        client = self._user("preuve_client", "PreuveClient2026!")
        vendor = self._user("preuve_vendeur", "PreuveVendeur2026!")
        organization_user = self._user("preuve_organisation", "PreuveOrga2026!")
        courier_user = self._user("preuve_livreur", "PreuveLivreur2026!")
        relay_user = self._user("preuve_relais", "PreuveRelais2026!")

        VendorProfile.objects.update_or_create(
            user=vendor,
            defaults={
                "business_name": "Maison Mvan",
                "business_description": "Boutique de démonstration BelivaY",
                "phone": "+237650140001",
                "address": "Mvan, Yaoundé",
                "city": "Yaoundé",
                "status": "APPROVED",
            },
        )
        organization, _ = DeliveryOrganizationProfile.objects.update_or_create(
            user=organization_user,
            defaults={
                "company_name": "BelivaY Express Centre",
                "manager_name": "Responsable opérations",
                "phone": "+237650140002",
                "city": "Yaoundé",
                "zones": ["Mvan", "Bastos"],
                "address": "Mvan, Yaoundé",
                "status": "APPROVED",
            },
        )
        courier, _ = CourierProfile.objects.update_or_create(
            user=courier_user,
            defaults={
                "delivery_organization": organization,
                "phone": "+237650140003",
                "city": "Yaoundé",
                "zones": ["Mvan"],
                "id_card": "BLV-LIV-PREUVE",
                "is_active": True,
                "is_approved": True,
                "is_online": True,
            },
        )
        relay, _ = RelayPointProfile.objects.update_or_create(
            user=relay_user,
            defaults={
                "name": "Point Relais Mvan Centre",
                "manager_name": "Agent relais",
                "phone": "+237650140004",
                "city": "Yaoundé",
                "zones": ["Mvan"],
                "address": "Mvan Carrefour, Yaoundé",
                "relay_code": "PR-MVAN-01",
                "opening_hours": "08:00 - 19:00",
                "storage_capacity": 80,
                "status": "APPROVED",
            },
        )

        category, _ = Category.objects.update_or_create(
            slug="demo-preuves",
            defaults={"name": "Démonstration preuves", "is_active": True},
        )
        product, _ = Product.objects.update_or_create(
            slug="smartphone-demo-preuves",
            defaults={
                "title": "Smartphone BelivaY Nova",
                "short_description": "Téléphone de démonstration du workflow litige.",
                "description": "Article de démonstration reçu avec un écran endommagé.",
                "price_xaf": 149000,
                "category": category,
                "vendor": vendor,
                "is_active": True,
                "moderation_status": "APPROVED",
            },
        )
        order, _ = Order.objects.update_or_create(
            user=client,
            customer_email="preuve.client@belivay.test",
            defaults={
                "customer_phone": "+237650140005",
                "city": "Yaoundé",
                "address": "Mvan Carrefour, Yaoundé",
                "payment_status": Order.PaymentStatus.PAID,
                "fulfillment_status": Order.FulfillmentStatus.DISPUTED,
                "escrow_status": Order.EscrowStatus.BLOCKED,
                "subtotal_xaf": 149000,
                "delivery_fee_xaf": 1500,
                "total_xaf": 150500,
            },
        )
        item, _ = OrderItem.objects.update_or_create(
            order=order,
            product=product,
            defaults={
                "title_snapshot": product.title,
                "price_xaf_snapshot": 149000,
                "qty": 1,
                "line_total_xaf": 149000,
            },
        )
        form_order, _ = Order.objects.update_or_create(
            user=client,
            customer_email="preuve.client.form@belivay.test",
            defaults={
                "customer_phone": "+237650140005",
                "city": "Yaoundé",
                "address": "Bastos, Yaoundé",
                "payment_status": Order.PaymentStatus.PAID,
                "fulfillment_status": Order.FulfillmentStatus.DELIVERED,
                "escrow_status": Order.EscrowStatus.BLOCKED,
                "subtotal_xaf": 149000,
                "delivery_fee_xaf": 1500,
                "total_xaf": 150500,
            },
        )
        OrderItem.objects.update_or_create(
            order=form_order,
            product=product,
            defaults={
                "title_snapshot": product.title,
                "price_xaf_snapshot": 149000,
                "qty": 1,
                "line_total_xaf": 149000,
            },
        )
        shipment, _ = Shipment.objects.update_or_create(
            order=order,
            defaults={
                "status": Shipment.Status.DELIVERED,
                "courier": courier,
                "courier_name": courier_user.get_full_name() or courier_user.username,
                "courier_phone": courier.phone,
                "relay_point": relay.name,
            },
        )
        RelayParcel.objects.update_or_create(
            shipment=shipment,
            defaults={
                "relay_point": relay,
                "status": RelayParcel.Status.PICKED_UP,
                "slot_code": "A-014",
                "pickup_code": "741926",
                "proof_note": "Colis remis avec scellé intact.",
                "received_at": timezone.now() - timedelta(days=1, hours=2),
                "picked_up_at": timezone.now() - timedelta(days=1),
            },
        )
        dispute, _ = Dispute.objects.update_or_create(
            order=order,
            order_item=item,
            opened_by=client,
            defaults={
                "product": product,
                "vendor": vendor,
                "reason": "DAMAGED",
                "status": "IN_PROGRESS",
                "description": "L'écran présente une fissure visible après ouverture du colis.",
                "assigned_admin": admin,
                "vendor_contacted": True,
                "vendor_can_reply": True,
                "courier_can_reply": True,
            },
        )
        dispute.messages.all().delete()
        DisputeMessage.objects.create(
            dispute=dispute,
            sender=client,
            sender_role=DisputeMessage.SenderRole.CLIENT,
            message=dispute.description,
        )
        DisputeMessage.objects.create(
            dispute=dispute,
            sender=admin,
            sender_role=DisputeMessage.SenderRole.ADMIN,
            message="Le dossier est pris en charge. Les preuves de transfert sont en cours de collecte.",
        )
        dispute.evidences.all().delete()
        payload = b"BelivaY demonstration evidence 14-08-2026"
        evidence = DisputeEvidence(
            dispute=dispute,
            uploaded_by=client,
            evidence_type=DisputeEvidence.EvidenceType.PHOTO,
            uploader_role="CLIENT",
            content_type="image/png",
            size_bytes=len(payload),
            sha256=hashlib.sha256(payload).hexdigest(),
            description="Photo de la fissure fournie à l'ouverture",
        )
        evidence.file.save("preuve-client-14-08-2026.png", ContentFile(payload), save=True)

        dispute.evidence_requests.all().delete()
        recipients = [
            ("CLIENT", client, "Ajoutez une photo nette de l'écran allumé et de l'étiquette IMEI."),
            ("VENDOR", vendor, "Fournissez les photos de l'article et de l'emballage avant expédition."),
            ("COURIER", courier_user, "Fournissez la photo du scellé prise lors de l'enlèvement."),
            ("LOGISTICS", organization_user, "Transmettez le bordereau d'affectation et la preuve de contrôle interne."),
            ("RELAY_POINT", relay_user, "Fournissez les photos du colis à la réception et lors de la remise."),
        ]
        for role, recipient, instructions in recipients:
            DisputeEvidenceRequest.objects.create(
                dispute=dispute,
                requested_by=admin,
                requested_from=recipient,
                recipient_role=role,
                evidence_types=["PHOTO", "DOCUMENT"],
                instructions=instructions,
                due_at=timezone.now() + timedelta(hours=48),
            )

        self.stdout.write(self.style.SUCCESS(
            f"Scénario créé: order={order.id}, form_order={form_order.id}, dispute={dispute.id}. Comptes preuve_* prêts."
        ))

    def _user(self, username, password, **flags):
        user, _ = User.objects.get_or_create(username=username)
        for field, value in flags.items():
            setattr(user, field, value)
        user.email = f"{username}@belivay.test"
        user.first_name = "Démo"
        user.last_name = username.replace("preuve_", "").title()
        user.set_password(password)
        user.save()
        return user
