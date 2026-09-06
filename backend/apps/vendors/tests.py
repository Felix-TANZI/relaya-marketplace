from datetime import datetime, time, timedelta

from django.contrib.auth.models import User
from django.core.management import call_command
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import UserNotification
from apps.catalog.models import Category, Product
from apps.orders.models import Dispute, Order, OrderItem
from apps.vendors.business_hours import add_business_hours
from apps.vendors.models import VendorProfile


class AddBusinessHoursTests(TestCase):
    """Bon de préparation — heures ouvrées verrouillées 8h-18h, Lun-Sam."""

    def _dt(self, year, month, day, hour, minute=0):
        return timezone.make_aware(datetime(year, month, day, hour, minute))

    def test_stays_within_the_same_business_day(self):
        start = self._dt(2026, 9, 2, 14, 0)  # mercredi 14h
        result = add_business_hours(start, 4, closed_days=[])
        self.assertEqual(result, self._dt(2026, 9, 2, 18, 0))

    def test_spills_over_to_the_next_business_day(self):
        start = self._dt(2026, 9, 2, 16, 0)  # mercredi 16h, 2h dispo avant 18h
        result = add_business_hours(start, 4, closed_days=[])
        self.assertEqual(result, self._dt(2026, 9, 3, 10, 0))  # jeudi 8h + 2h restantes

    def test_sunday_is_always_closed(self):
        start = self._dt(2026, 9, 5, 10, 0)  # samedi 10h (samedi = jour ouvré)
        result = add_business_hours(start, 10, closed_days=[])  # 8h dispo samedi -> deborde dimanche (ferme) -> lundi
        self.assertEqual(result, self._dt(2026, 9, 7, 10, 0))  # lundi 8h + 2h restantes

    def test_starting_outside_business_hours_jumps_to_next_opening(self):
        start = self._dt(2026, 9, 2, 20, 0)  # mercredi 20h, hors plage
        result = add_business_hours(start, 1, closed_days=[])
        self.assertEqual(result, self._dt(2026, 9, 3, 9, 0))  # jeudi 8h + 1h

    def test_vendor_closed_day_is_skipped(self):
        # Mardi (weekday=1) ferme pour ce vendeur.
        start = self._dt(2026, 9, 7, 16, 0)  # lundi 16h, 2h dispo
        result = add_business_hours(start, 4, closed_days=[1])
        # mardi ferme -> mercredi 8h + 2h restantes
        self.assertEqual(result, self._dt(2026, 9, 9, 10, 0))


class VendorPrepDeadlineTests(TestCase):
    """Le bon de préparation démarre à l'accusé de réception, jamais à la création."""

    def setUp(self):
        self.vendor_user = User.objects.create_user("prep_vendor", password="Vendor2026")
        self.vendor_profile = VendorProfile.objects.create(
            user=self.vendor_user,
            business_name="Boutique Prep",
            business_description="Test",
            phone="+237690200001",
            address="Mvan",
            city="Yaounde",
            status=VendorProfile.STATUS_CHOICES[1][0],  # APPROVED
        )
        category = Category.objects.create(name="Prep", slug="prep")
        self.product = Product.objects.create(
            title="Article prep", slug="article-prep", price_xaf=5000,
            category=category, vendor=self.vendor_user,
        )
        self.order = Order.objects.create(
            user=self.vendor_user,
            customer_phone="+237690200002",
            city="Yaounde",
            address="Mvan",
            payment_status=Order.PaymentStatus.PAID,
            fulfillment_status=Order.FulfillmentStatus.PAID_IN_ESCROW,
            total_xaf=5000,
        )
        OrderItem.objects.create(
            order=self.order, product=self.product, title_snapshot=self.product.title,
            price_xaf_snapshot=5000, qty=1, line_total_xaf=5000,
        )
        self.api = APIClient()

    def test_acknowledging_the_order_sets_a_4_business_hour_deadline(self):
        self.api.force_authenticate(self.vendor_user)
        with self.settings(USE_TZ=True):
            response = self.api.patch(
                reverse("vendors:update-fulfillment-status", args=[self.order.id]),
                {"fulfillment_status": "VENDOR_ACKNOWLEDGED"},
                format="json",
            )
        self.assertEqual(response.status_code, 200, response.data)
        self.order.refresh_from_db()
        self.assertIsNotNone(self.order.prep_deadline)
        self.assertGreater(self.order.prep_deadline, timezone.now())

    def test_prep_deadline_uses_vendor_closed_days(self):
        self.vendor_profile.closed_days = [self.order.created_at.weekday()]
        # On force un vendeur ferme aujourd'hui pour verifier que le delai deborde.
        weekday_today = timezone.now().weekday()
        self.vendor_profile.closed_days = [weekday_today]
        self.vendor_profile.save(update_fields=["closed_days"])

        self.api.force_authenticate(self.vendor_user)
        response = self.api.patch(
            reverse("vendors:update-fulfillment-status", args=[self.order.id]),
            {"fulfillment_status": "VENDOR_ACKNOWLEDGED"},
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.order.refresh_from_db()
        self.assertNotEqual(self.order.prep_deadline.weekday(), weekday_today)


class VendorPrepEscalationTests(TestCase):
    def setUp(self):
        self.vendor_user = User.objects.create_user("escalation_vendor", password="Vendor2026")
        category = Category.objects.create(name="Escalation", slug="escalation")
        self.product = Product.objects.create(
            title="Article escalade", slug="article-escalade", price_xaf=5000,
            category=category, vendor=self.vendor_user,
        )
        self.order = Order.objects.create(
            user=self.vendor_user,
            customer_phone="+237690200003",
            city="Yaounde",
            address="Mvan",
            payment_status=Order.PaymentStatus.PAID,
            fulfillment_status=Order.FulfillmentStatus.VENDOR_ACKNOWLEDGED,
            total_xaf=5000,
            prep_deadline=timezone.now() - timedelta(hours=1),
        )
        OrderItem.objects.create(
            order=self.order, product=self.product, title_snapshot=self.product.title,
            price_xaf_snapshot=5000, qty=1, line_total_xaf=5000,
        )
        self.admin = User.objects.create_user("escalation_admin", password="Admin2026", is_staff=True)

    def test_reminder_sent_once_deadline_is_passed(self):
        call_command("check_vendor_prep_deadlines")

        self.order.refresh_from_db()
        self.assertIsNotNone(self.order.prep_reminder_sent_at)
        self.assertTrue(
            UserNotification.objects.filter(user=self.vendor_user, title__icontains="Retard de préparation").exists()
        )

    def test_admin_alert_after_six_hours(self):
        self.order.prep_deadline = timezone.now() - timedelta(hours=3)
        self.order.save(update_fields=["prep_deadline"])

        call_command("check_vendor_prep_deadlines")

        self.order.refresh_from_db()
        self.assertIsNotNone(self.order.prep_admin_alert_sent_at)
        self.assertTrue(
            UserNotification.objects.filter(user=self.admin, title__icontains="Vendeur en retard").exists()
        )

    def test_does_not_re_notify_once_already_flagged(self):
        call_command("check_vendor_prep_deadlines")
        first_count = UserNotification.objects.filter(user=self.vendor_user).count()

        call_command("check_vendor_prep_deadlines")
        second_count = UserNotification.objects.filter(user=self.vendor_user).count()

        self.assertEqual(first_count, second_count)


class AdminDisputeResolutionMotiveTests(TestCase):
    """Arbitrage motivé : un motif trop court n'est pas un arbitrage, c'est un clic."""

    def setUp(self):
        self.admin = User.objects.create_superuser("dispute_admin", "dispute_admin@test.local", "pass")
        self.buyer = User.objects.create_user("dispute_buyer", password="pass")
        self.vendor = User.objects.create_user("dispute_vendor", password="pass")
        category = Category.objects.create(name="Arbitrage", slug="arbitrage")
        product = Product.objects.create(
            title="Article arbitrage", slug="article-arbitrage", price_xaf=7000,
            category=category, vendor=self.vendor,
        )
        order = Order.objects.create(
            user=self.buyer, customer_phone="+237650000088", city="Yaoundé", address="Mvan",
            fulfillment_status=Order.FulfillmentStatus.DELIVERED, total_xaf=7000,
        )
        item = OrderItem.objects.create(
            order=order, product=product, title_snapshot=product.title,
            price_xaf_snapshot=7000, qty=1, line_total_xaf=7000,
        )
        self.dispute = Dispute.objects.create(
            order=order, order_item=item, product=product, vendor=self.vendor,
            opened_by=self.buyer, reason="DAMAGED", description="Test",
        )
        self.api = APIClient()
        self.api.force_authenticate(self.admin)
        self.url = reverse("vendors:admin-resolve-dispute", args=[self.dispute.id])

    def test_a_short_note_is_rejected(self):
        response = self.api.post(self.url, {"resolution": "REJECTED", "resolution_note": "Refusé."}, format="json")

        self.assertEqual(response.status_code, 400)
        self.assertIn("resolution_note", response.data)
        self.dispute.refresh_from_db()
        self.assertEqual(self.dispute.status, "OPEN")

    def test_an_empty_note_is_rejected(self):
        response = self.api.post(self.url, {"resolution": "REJECTED"}, format="json")

        self.assertEqual(response.status_code, 400)
        self.assertIn("resolution_note", response.data)

    def test_a_note_of_40_characters_or_more_is_accepted(self):
        note = "Photos C1 conformes, aucun défaut visible constaté."
        self.assertGreaterEqual(len(note), 40)

        response = self.api.post(self.url, {"resolution": "REJECTED", "resolution_note": note}, format="json")

        self.assertEqual(response.status_code, 200, response.data)
        self.dispute.refresh_from_db()
        self.assertEqual(self.dispute.status, "RESOLVED")
        self.assertEqual(self.dispute.resolution_note, note)
