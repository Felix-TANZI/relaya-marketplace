from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from apps.catalog.models import Category, Product
from apps.orders.models import Dispute, DisputeEvidence, DisputeEvidenceRequest, Order, OrderItem


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

        created = self.api.post(
            f"/api/orders/{order.id}/disputes/",
            {
                "order_item": item.id,
                "reason": "DAMAGED",
                "description": "L'écran est fissuré à la réception.",
                "files": SimpleUploadedFile("screen.png", b"damaged-screen", content_type="image/png"),
            },
            format="multipart",
        )
        self.assertEqual(created.status_code, 201, created.data)
        evidence = DisputeEvidence.objects.get(dispute_id=created.data["id"])
        self.assertEqual(evidence.uploader_role, "CLIENT")
        self.assertEqual(evidence.evidence_type, DisputeEvidence.EvidenceType.PHOTO)
