from datetime import timedelta

from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.test import TestCase, override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import UserNotification
from apps.catalog.models import Category, Inventory, MasterProduct, Product, ProductCondition
from apps.orders.evidence import _evidence_retention_deadline
from apps.orders.models import Dispute, DisputeEvidence, DisputeEvidenceRequest, Order, OrderItem
from apps.payments.models import PaymentTransaction
from apps.shipping.models import Shipment, Zone
from apps.vendors.models import VendorProfile


@override_settings(DEFAULT_FILE_STORAGE="django.core.files.storage.InMemoryStorage")
class DisputeEvidenceWorkflowTests(TestCase):
    def setUp(self):
        self.client_user = User.objects.create_user("buyer_evidence", password="pass")
        self.vendor = User.objects.create_user("vendor_evidence", password="pass")
        self.admin = User.objects.create_superuser("admin_evidence", "admin@test.local", "pass")
        self.intruder = User.objects.create_user("intruder_evidence", password="pass")
        category = Category.objects.create(name="Test evidence", slug="test-evidence")
        product = Product.objects.create(
            title="Article sous preuve",
            slug="article-sous-preuve",
            price_xaf=10000,
            category=category,
            vendor=self.vendor,
        )
        order = Order.objects.create(
            user=self.client_user,
            customer_phone="+237650000001",
            city="Yaoundé",
            address="Mvan",
            fulfillment_status=Order.FulfillmentStatus.DELIVERED,
            total_xaf=10000,
        )
        item = OrderItem.objects.create(
            order=order,
            product=product,
            title_snapshot=product.title,
            price_xaf_snapshot=10000,
            qty=1,
            line_total_xaf=10000,
        )
        self.dispute = Dispute.objects.create(
            order=order,
            order_item=item,
            product=product,
            vendor=self.vendor,
            opened_by=self.client_user,
            reason="DAMAGED",
            description="Emballage endommagé",
        )
        self.api = APIClient()

    def test_admin_request_is_visible_only_to_target_and_target_can_submit(self):
        self.api.force_authenticate(self.admin)
        response = self.api.post(
            f"/api/vendors/admin/disputes/{self.dispute.id}/request-evidence/",
            {
                "recipient_role": "VENDOR",
                "evidence_types": ["PHOTO"],
                "instructions": "Photographiez le scellé et l'étiquette.",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.data)
        evidence_request = DisputeEvidenceRequest.objects.get(dispute=self.dispute)
        self.assertEqual(evidence_request.requested_from, self.vendor)

        self.api.force_authenticate(self.client_user)
        client_view = self.api.get(f"/api/orders/{self.dispute.order_id}/disputes/")
        self.assertEqual(client_view.status_code, 200)
        self.assertEqual(client_view.data[0]["evidence_requests"], [])

        self.api.force_authenticate(self.intruder)
        denied = self.api.post(
            f"/api/orders/evidence-requests/{evidence_request.id}/respond/",
            {"files": SimpleUploadedFile("intruder.png", b"not-a-real-png", content_type="image/png")},
            format="multipart",
        )
        self.assertEqual(denied.status_code, 404)

        self.api.force_authenticate(self.vendor)
        pending = self.api.get("/api/orders/evidence-requests/pending/")
        self.assertEqual(pending.status_code, 200)
        self.assertEqual([item["id"] for item in pending.data], [evidence_request.id])
        submitted = self.api.post(
            f"/api/orders/evidence-requests/{evidence_request.id}/respond/",
            {
                "description": "Photo du scellé avant remise",
                "files": SimpleUploadedFile("seal.png", b"evidence-content", content_type="image/png"),
            },
            format="multipart",
        )
        self.assertEqual(submitted.status_code, 200, submitted.data)
        evidence_request.refresh_from_db()
        self.assertEqual(evidence_request.status, DisputeEvidenceRequest.Status.SUBMITTED)
        evidence = DisputeEvidence.objects.get(request=evidence_request)
        self.assertEqual(evidence.uploader_role, "VENDOR")
        self.assertEqual(len(evidence.sha256), 64)

    def test_client_must_attach_evidence_for_damaged_item(self):
        order = self.dispute.order
        item = self.dispute.order_item
        self.dispute.delete()
        self.api.force_authenticate(self.client_user)

        missing = self.api.post(
            f"/api/orders/{order.id}/disputes/",
            {
                "order_item": item.id,
                "reason": "DAMAGED",
                "description": "L'écran est fissuré à la réception.",
            },
            format="multipart",
        )
        self.assertEqual(missing.status_code, 400)
        self.assertIn("files", missing.data)

        # Le motif DAMAGED exige 2 photos minimum (Addendum Decisions v1.0 §4) :
        # une seule photo doit encore etre refusee.
        still_missing = self.api.post(
            f"/api/orders/{order.id}/disputes/",
            {
                "order_item": item.id,
                "reason": "DAMAGED",
                "description": "L'écran est fissuré à la réception.",
                "files": SimpleUploadedFile("screen.png", b"damaged-screen", content_type="image/png"),
            },
            format="multipart",
        )
        self.assertEqual(still_missing.status_code, 400)
        self.assertIn("files", still_missing.data)

        created = self.api.post(
            f"/api/orders/{order.id}/disputes/",
            {
                "order_item": item.id,
                "reason": "DAMAGED",
                "description": "L'écran est fissuré à la réception.",
                "files": [
                    SimpleUploadedFile("screen.png", b"damaged-screen", content_type="image/png"),
                    SimpleUploadedFile("screen-closeup.png", b"damaged-screen-closeup", content_type="image/png"),
                ],
            },
            format="multipart",
        )
        self.assertEqual(created.status_code, 201, created.data)
        evidences = DisputeEvidence.objects.filter(dispute_id=created.data["id"])
        self.assertEqual(evidences.count(), 2)
        for evidence in evidences:
            self.assertEqual(evidence.uploader_role, "CLIENT")
            self.assertEqual(evidence.evidence_type, DisputeEvidence.EvidenceType.PHOTO)

    def test_expired_dispute_evidence_is_purged_once_dispute_is_closed(self):
        self.dispute.status = "RESOLVED"
        self.dispute.save(update_fields=["status"])
        evidence = DisputeEvidence.objects.create(
            dispute=self.dispute,
            uploaded_by=self.client_user,
            uploader_role="CLIENT",
            file=SimpleUploadedFile("proof.png", b"dispute-proof", content_type="image/png"),
            retain_until=timezone.now() - timedelta(minutes=1),
        )

        call_command("purge_expired_dispute_evidence")

        evidence.refresh_from_db()
        self.assertFalse(bool(evidence.file))
        self.assertIsNotNone(evidence.purged_at)
        self.assertFalse(evidence.litigation_hold)

    def test_expired_dispute_evidence_is_held_while_dispute_still_open(self):
        evidence = DisputeEvidence.objects.create(
            dispute=self.dispute,
            uploaded_by=self.client_user,
            uploader_role="CLIENT",
            file=SimpleUploadedFile("proof.png", b"dispute-proof", content_type="image/png"),
            retain_until=timezone.now() - timedelta(minutes=1),
        )

        call_command("purge_expired_dispute_evidence")

        evidence.refresh_from_db()
        self.assertTrue(bool(evidence.file))
        self.assertTrue(evidence.litigation_hold)
        self.assertIsNone(evidence.purged_at)


class DisputeSilenceEscalationTests(TestCase):
    """3 postures (accepter / contester / arrangement), 48h depuis le contact vendeur."""

    def setUp(self):
        self.client_user = User.objects.create_user("buyer_silence", password="pass")
        self.vendor = User.objects.create_user("vendor_silence", password="pass")
        self.admin = User.objects.create_superuser("admin_silence", "admin_silence@test.local", "pass")
        category = Category.objects.create(name="Silence", slug="silence")
        product = Product.objects.create(
            title="Article silence", slug="article-silence", price_xaf=8000,
            category=category, vendor=self.vendor,
        )
        order = Order.objects.create(
            user=self.client_user, customer_phone="+237650000099", city="Yaoundé", address="Mvan",
            fulfillment_status=Order.FulfillmentStatus.DELIVERED, total_xaf=8000,
        )
        item = OrderItem.objects.create(
            order=order, product=product, title_snapshot=product.title,
            price_xaf_snapshot=8000, qty=1, line_total_xaf=8000,
        )
        self.dispute = Dispute.objects.create(
            order=order, order_item=item, product=product, vendor=self.vendor,
            opened_by=self.client_user, reason="DAMAGED", description="Test",
        )

    def test_contacting_the_vendor_starts_the_48h_clock(self):
        self.client.force_login(self.admin)
        response = self.client.post(
            reverse("admin:orders_dispute_changelist"),
            {"action": "mark_vendor_contacted", "_selected_action": [str(self.dispute.pk)]},
            follow=True,
        )
        self.assertEqual(response.status_code, 200)

        self.dispute.refresh_from_db()
        self.assertTrue(self.dispute.vendor_contacted)
        self.assertIsNotNone(self.dispute.vendor_reply_deadline)
        self.assertGreater(self.dispute.vendor_reply_deadline, timezone.now())

    def test_silence_past_48h_flags_once_and_does_not_auto_resolve(self):
        self.dispute.vendor_contacted = True
        self.dispute.vendor_reply_deadline = timezone.now() - timedelta(hours=1)
        self.dispute.save(update_fields=["vendor_contacted", "vendor_reply_deadline"])

        call_command("check_dispute_silence")

        self.dispute.refresh_from_db()
        self.assertIsNotNone(self.dispute.silence_flagged_at)
        # Le silence ne tranche jamais tout seul : pas de resolution, pas de
        # remboursement automatique — juste un signalement pour arbitrage.
        self.assertIsNone(self.dispute.resolution)
        self.assertTrue(
            UserNotification.objects.filter(user=self.admin, title__icontains="silence vendeur").exists()
        )

        call_command("check_dispute_silence")
        self.assertEqual(
            UserNotification.objects.filter(user=self.admin, title__icontains="silence vendeur").count(), 1,
        )

    def test_vendor_replying_before_deadline_is_never_flagged(self):
        self.dispute.vendor_contacted = True
        self.dispute.vendor_reply_deadline = timezone.now() + timedelta(hours=10)
        self.dispute.vendor_replied = True
        self.dispute.save(update_fields=["vendor_contacted", "vendor_reply_deadline", "vendor_replied"])

        call_command("check_dispute_silence")

        self.dispute.refresh_from_db()
        self.assertIsNone(self.dispute.silence_flagged_at)


class DisputeEvidenceRetentionByPaymentMethodTests(TestCase):
    """60 jours Mobile Money / 180 jours carte (proposition validée)."""

    def setUp(self):
        self.buyer = User.objects.create_user("buyer_retention", password="pass")
        self.vendor = User.objects.create_user("vendor_retention", password="pass")
        category = Category.objects.create(name="Retention", slug="retention")
        product = Product.objects.create(
            title="Article retention", slug="article-retention", price_xaf=6000,
            category=category, vendor=self.vendor,
        )
        self.order = Order.objects.create(
            user=self.buyer, customer_phone="+237650000077", city="Yaoundé", address="Mvan",
            fulfillment_status=Order.FulfillmentStatus.DELIVERED, total_xaf=6000,
        )
        item = OrderItem.objects.create(
            order=self.order, product=product, title_snapshot=product.title,
            price_xaf_snapshot=6000, qty=1, line_total_xaf=6000,
        )
        self.dispute = Dispute.objects.create(
            order=self.order, order_item=item, product=product, vendor=self.vendor,
            opened_by=self.buyer, reason="DAMAGED", description="Test",
        )

    def test_mobile_money_payment_keeps_the_default_60_day_retention(self):
        PaymentTransaction.objects.create(
            order=self.order, provider=PaymentTransaction.Provider.MTN_MOMO,
            status=PaymentTransaction.Status.SUCCESS, amount_xaf=6000, payer_phone="+237650000077",
        )

        deadline = _evidence_retention_deadline(self.dispute)

        self.assertLess(deadline, timezone.now() + timedelta(days=61))
        self.assertGreater(deadline, timezone.now() + timedelta(days=59))

    def test_card_payment_extends_retention_to_180_days(self):
        # "CARD" n'existe pas encore dans PaymentTransaction.Provider — ce test
        # prouve juste que la branche est prête pour le jour où ce moyen de
        # paiement sera construit, sans rien changer au comportement actuel.
        PaymentTransaction.objects.create(
            order=self.order, provider="CARD",
            status=PaymentTransaction.Status.SUCCESS, amount_xaf=6000, payer_phone="+237650000077",
        )

        deadline = _evidence_retention_deadline(self.dispute)

        self.assertLess(deadline, timezone.now() + timedelta(days=181))
        self.assertGreater(deadline, timezone.now() + timedelta(days=179))


class AutomaticReassignmentCas62Tests(TestCase):
    """
    Cas 6.2 : réattribution automatique UNIQUEMENT si les 4 conditions
    strictes sont réunies (même Master Produit, même état, prix ≤, même
    zone). Sinon rien n'est modifié — on propose au client, on n'impose pas.
    """

    def setUp(self):
        from apps.orders.reassignment import attempt_automatic_reassignment, find_reassignment_candidate
        self.attempt_automatic_reassignment = attempt_automatic_reassignment
        self.find_reassignment_candidate = find_reassignment_candidate

        self.buyer = User.objects.create_user("cas62_buyer", password="pass")
        self.late_vendor = User.objects.create_user("cas62_late_vendor", password="pass")
        self.replacement_vendor = User.objects.create_user("cas62_replacement_vendor", password="pass")
        self.zone = Zone.objects.create(name="Zone Cas62", city="Yaounde")
        VendorProfile.objects.create(
            user=self.late_vendor, business_name="Boutique en retard", business_description="x",
            phone="+237690400001", address="Mvan", city="Yaounde", status="APPROVED", zone=self.zone,
        )
        VendorProfile.objects.create(
            user=self.replacement_vendor, business_name="Boutique de secours", business_description="x",
            phone="+237690400002", address="Mvan", city="Yaounde", status="APPROVED", zone=self.zone,
        )
        category = Category.objects.create(name="Cas62", slug="cas62")
        master = MasterProduct.objects.create(title="Fiche Cas62", slug="fiche-cas62", category=category)
        condition = ProductCondition.objects.create(name="Neuf Cas62")

        self.late_product = Product.objects.create(
            title="Article (vendeur en retard)", slug="article-vendeur-en-retard", price_xaf=10000,
            category=category, vendor=self.late_vendor, master=master, condition=condition,
            moderation_status="APPROVED",
        )
        self.order = Order.objects.create(
            user=self.buyer, customer_phone="+237690400003", city="Yaounde", address="Mvan",
            fulfillment_status=Order.FulfillmentStatus.VENDOR_ACKNOWLEDGED, total_xaf=10000,
            subtotal_xaf=10000, delivery_fee_xaf=0,
        )
        self.item = OrderItem.objects.create(
            order=self.order, product=self.late_product, title_snapshot=self.late_product.title,
            price_xaf_snapshot=10000, qty=1, line_total_xaf=10000,
        )
        self.shipment = Shipment.objects.create(
            order=self.order, vendor=self.late_vendor, status=Shipment.Status.CREATED,
        )
        self.master = master
        self.condition = condition
        self.category = category

    def _make_replacement_offer(self, *, price_xaf=9000, condition=None, zone=None, vendor=None, stock=5, master=None):
        vendor = vendor or self.replacement_vendor
        offer = Product.objects.create(
            title="Article de secours", slug=f"article-secours-{vendor.id}-{price_xaf}",
            price_xaf=price_xaf, category=self.category, vendor=vendor,
            master=master or self.master, condition=condition or self.condition,
            moderation_status="APPROVED",
        )
        Inventory.objects.create(product=offer, quantity=stock)
        return offer

    def test_all_four_conditions_met_reassigns_automatically(self):
        replacement = self._make_replacement_offer(price_xaf=9000)

        result = self.attempt_automatic_reassignment(self.item, reason="Test")

        self.assertEqual(result, replacement)
        self.item.refresh_from_db()
        self.assertEqual(self.item.product_id, replacement.id)
        self.assertEqual(self.item.price_xaf_snapshot, 9000)
        self.order.refresh_from_db()
        self.assertEqual(self.order.total_xaf, 9000)
        self.shipment.refresh_from_db()
        self.assertEqual(self.shipment.status, Shipment.Status.CANCELLED)
        self.assertTrue(Shipment.objects.filter(order=self.order, vendor=self.replacement_vendor).exists())
        self.assertTrue(
            UserNotification.objects.filter(user=self.buyer, title__icontains="Article remplacé").exists()
        )

    def test_higher_price_candidate_is_never_a_match(self):
        self._make_replacement_offer(price_xaf=15000)  # plus cher : condition "prix <=" violee

        result = self.attempt_automatic_reassignment(self.item)

        self.assertIsNone(result)
        self.item.refresh_from_db()
        self.assertEqual(self.item.product_id, self.late_product.id)

    def test_different_zone_is_never_a_match(self):
        other_zone = Zone.objects.create(name="Zone Cas62 Autre", city="Yaounde")
        other_vendor = User.objects.create_user("cas62_other_zone_vendor", password="pass")
        VendorProfile.objects.create(
            user=other_vendor, business_name="Boutique zone differente", business_description="x",
            phone="+237690400004", address="Autre quartier", city="Yaounde", status="APPROVED", zone=other_zone,
        )
        self._make_replacement_offer(price_xaf=9000, vendor=other_vendor)

        result = self.attempt_automatic_reassignment(self.item)

        self.assertIsNone(result)

    def test_different_condition_is_never_a_match(self):
        other_condition = ProductCondition.objects.create(name="Occasion Cas62")
        self._make_replacement_offer(price_xaf=9000, condition=other_condition)

        result = self.attempt_automatic_reassignment(self.item)

        self.assertIsNone(result)

    def test_out_of_stock_candidate_is_never_a_match(self):
        self._make_replacement_offer(price_xaf=9000, stock=0)

        result = self.attempt_automatic_reassignment(self.item)

        self.assertIsNone(result)

    def test_price_drop_flags_admin_for_manual_refund(self):
        admin = User.objects.create_user("cas62_admin", password="pass", is_staff=True)
        self._make_replacement_offer(price_xaf=8000)

        result = self.attempt_automatic_reassignment(self.item)

        self.assertIsNotNone(result)
        self.assertTrue(
            UserNotification.objects.filter(user=admin, title__icontains="Écart de prix").exists()
        )
