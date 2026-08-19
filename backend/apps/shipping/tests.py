from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.utils import timezone
from datetime import timedelta
from django.urls import reverse
from rest_framework import serializers, status
from rest_framework.test import APITestCase

from apps.accounts.models import ComplianceDocument, CourierProfile, DeliveryOrganizationProfile, DeliveryVehicle, RelayPointProfile
from apps.orders.models import Dispute, Order

from .models import RelayParcel, Shipment, ShipmentEvent, ShipmentEvidence, ShipmentLocation
from .serializers import RelayParcelReceiveSerializer


class ShipmentTrackingTests(APITestCase):
    def setUp(self):
        self.client_user = User.objects.create_user("tracking_client", password="Client2026")
        self.organization_user = User.objects.create_user("tracking_org", password="Org2026")
        self.organization = DeliveryOrganizationProfile.objects.create(
            user=self.organization_user,
            company_name="BelivaY Tracking Logistics",
            phone="+237690000001",
            city="Yaounde",
            zones=["Mvan", "Bastos"],
            status=DeliveryOrganizationProfile.Status.APPROVED,
        )
        self.courier_user = User.objects.create_user("tracking_courier", password="Courier2026")
        self.courier = CourierProfile.objects.create(
            user=self.courier_user,
            delivery_organization=self.organization,
            phone="+237690000002",
            city="Yaounde",
            zones=["Mvan", "Bastos"],
            id_card="TRACK-CNI-001",
            is_active=True,
            is_approved=True,
            is_online=True,
        )
        self.other_courier_user = User.objects.create_user("other_courier", password="Courier2026")
        CourierProfile.objects.create(
            user=self.other_courier_user,
            phone="+237690000003",
            city="Yaounde",
            id_card="TRACK-CNI-002",
            is_active=True,
            is_approved=True,
        )
        self.order = Order.objects.create(
            user=self.client_user,
            customer_email="tracking.client@example.com",
            customer_phone="+237690000004",
            city="YAOUNDE",
            address="Mvan, Yaounde",
            subtotal_xaf=15000,
            delivery_fee_xaf=1500,
            total_xaf=16500,
        )
        self.shipment = Shipment.objects.create(
            order=self.order,
            courier=self.courier,
            courier_name="Tracking Courier",
            courier_phone=self.courier.phone,
            status=Shipment.Status.OUT_FOR_DELIVERY,
        )
        self.location_url = reverse("shipping-my-shipments-location", args=[self.shipment.id])
        self.relay_user = User.objects.create_user("tracking_relay", password="Relay2026")
        self.relay_point = RelayPointProfile.objects.create(
            user=self.relay_user,
            name="Relais Tracking Mvan",
            phone="+237690000005",
            city="Yaounde",
            status=RelayPointProfile.Status.APPROVED,
            is_active=True,
        )

    def publish(self, latitude, longitude, **extra):
        self.client.force_authenticate(self.courier_user)
        payload = {
            "latitude": latitude,
            "longitude": longitude,
            "accuracy_m": 8,
            "source": "SIMULATION",
            **extra,
        }
        return self.client.post(self.location_url, payload, format="json")

    def test_assigned_courier_publishes_location(self):
        response = self.publish(3.848000, 11.502100, speed_mps=6.5, heading_deg=90)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(ShipmentLocation.objects.filter(shipment=self.shipment).count(), 1)
        self.courier.refresh_from_db()
        self.assertTrue(self.courier.gps_permission_granted)

    def test_other_courier_cannot_publish_location(self):
        self.client.force_authenticate(self.other_courier_user)
        response = self.client.post(
            self.location_url,
            {"latitude": 3.848, "longitude": 11.502},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_invalid_coordinates_are_rejected(self):
        response = self.publish(190, 11.502)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(ShipmentLocation.objects.count(), 0)

    def test_completed_mission_rejects_new_location(self):
        self.shipment.status = Shipment.Status.DELIVERED
        self.shipment.save(update_fields=["status", "updated_at"])
        response = self.publish(3.848, 11.502)
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)

    def test_client_tracking_contains_latest_position_and_ordered_history(self):
        first = self.publish(3.848000, 11.502100).data
        second = self.publish(3.852500, 11.507800).data

        self.client.force_authenticate(self.client_user)
        response = self.client.get(reverse("order-tracking", args=[self.order.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["latest_location"]["id"], second["id"])
        self.assertEqual(
            [item["id"] for item in response.data["location_history"]],
            [first["id"], second["id"]],
        )

    def test_organization_mission_contains_courier_tracking(self):
        location = self.publish(3.856200, 11.514300).data

        self.client.force_authenticate(self.organization_user)
        response = self.client.get(reverse("delivery-organization-active-missions"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["latest_location"]["id"], location["id"])
        self.assertEqual(len(response.data[0]["location_history"]), 1)

    def test_unrelated_user_cannot_read_legacy_tracking_endpoint(self):
        unrelated_user = User.objects.create_user("tracking_outsider", password="Client2026")
        self.client.force_authenticate(unrelated_user)

        response = self.client.get(reverse("shipping-track"), {"order_id": self.order.id})

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_relay_cannot_receive_a_parcel_again_after_pickup(self):
        parcel = RelayParcel.objects.create(
            shipment=self.shipment,
            relay_point=self.relay_point,
            status=RelayParcel.Status.PICKED_UP,
            pickup_code="ABC123",
        )
        serializer = RelayParcelReceiveSerializer(
            data={"shipment_id": self.shipment.id},
            context={"relay_point": self.relay_point},
        )
        serializer.is_valid(raise_exception=True)

        with self.assertRaisesMessage(serializers.ValidationError, "deja ete retire"):
            serializer.save()

        parcel.refresh_from_db()
        self.assertEqual(parcel.status, RelayParcel.Status.PICKED_UP)
        self.assertEqual(ShipmentEvent.objects.filter(shipment=self.shipment).count(), 0)

    def test_relay_manager_updates_capacity_and_hours(self):
        self.client.force_authenticate(self.relay_user)

        response = self.client.patch(
            reverse("relay-point-profile"),
            {"storage_capacity": 45, "opening_hours": "Lun-Sam 08:00-18:00"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.relay_point.refresh_from_db()
        self.assertEqual(self.relay_point.storage_capacity, 45)
        self.assertEqual(self.relay_point.opening_hours, "Lun-Sam 08:00-18:00")

    def test_organization_owns_and_assigns_vehicle_to_available_courier(self):
        self.client.force_authenticate(self.organization_user)
        create_response = self.client.post(
            reverse("delivery-organization-vehicles"),
            {"label": "Moto centre", "registration": "CE-123-AA", "vehicle_type": "MOTORBIKE"},
            format="json",
        )
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)

        vehicle_id = create_response.data["id"]
        assign_response = self.client.patch(
            reverse("delivery-organization-vehicles"),
            {"vehicle_id": vehicle_id, "courier_id": self.courier.id},
            format="json",
        )

        self.assertEqual(assign_response.status_code, status.HTTP_200_OK)
        vehicle = DeliveryVehicle.objects.get(id=vehicle_id)
        self.assertEqual(vehicle.organization, self.organization)
        self.assertEqual(vehicle.assigned_courier, self.courier)

    def test_absent_courier_cannot_receive_company_vehicle(self):
        self.courier.availability_status = CourierProfile.AvailabilityStatus.ABSENT
        self.courier.save(update_fields=["availability_status", "updated_at"])
        vehicle = DeliveryVehicle.objects.create(
            organization=self.organization,
            label="Moto secours",
            registration="CE-456-BB",
            vehicle_type=CourierProfile.VehicleType.MOTORBIKE,
        )
        self.client.force_authenticate(self.organization_user)

        response = self.client.patch(
            reverse("delivery-organization-vehicles"),
            {"vehicle_id": vehicle.id, "courier_id": self.courier.id},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        vehicle.refresh_from_db()
        self.assertIsNone(vehicle.assigned_courier)

    def test_relay_uploads_compliance_document_for_review(self):
        self.client.force_authenticate(self.relay_user)
        upload = SimpleUploadedFile("local.png", b"fake-image-content", content_type="image/png")

        response = self.client.post(
            reverse("compliance-documents"),
            {"document_type": "PREMISES_PHOTOS", "file": upload},
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        document = ComplianceDocument.objects.get(user=self.relay_user, document_type="PREMISES_PHOTOS")
        self.assertEqual(document.owner_role, ComplianceDocument.OwnerRole.RELAY_POINT)
        self.assertEqual(document.status, ComplianceDocument.Status.PENDING)

    def test_organization_assigns_queued_mission_with_company_vehicle(self):
        vehicle = DeliveryVehicle.objects.create(
            organization=self.organization,
            label="Moto affectation",
            registration="CE-789-CC",
            vehicle_type=CourierProfile.VehicleType.MOTORBIKE,
            assigned_courier=self.courier,
        )
        queued_order = Order.objects.create(
            user=self.client_user,
            customer_email="queue.client@example.com",
            customer_phone="+237690000006",
            city="Yaounde",
            address="Mvan, Yaounde",
            subtotal_xaf=10000,
            delivery_fee_xaf=1000,
            total_xaf=11000,
        )
        queued_shipment = Shipment.objects.create(
            order=queued_order,
            status=Shipment.Status.WAITING_MANUAL_ASSIGNMENT,
            required_vehicle_type=vehicle.vehicle_type,
        )
        self.client.force_authenticate(self.organization_user)

        response = self.client.post(
            reverse("delivery-organization-assign-mission", args=[queued_shipment.id]),
            {"courier_id": self.courier.id},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        queued_shipment.refresh_from_db()
        self.assertEqual(queued_shipment.courier, self.courier)
        self.assertEqual(queued_shipment.status, Shipment.Status.ASSIGNED)

    def test_new_courier_cannot_receive_parcel_above_75000_xaf(self):
        vehicle = DeliveryVehicle.objects.create(
            organization=self.organization,
            label="Moto plafond trust",
            registration="CE-TRUST-01",
            vehicle_type=CourierProfile.VehicleType.MOTORBIKE,
            assigned_courier=self.courier,
        )
        expensive_order = Order.objects.create(
            user=self.client_user,
            customer_email="valuable.client@example.com",
            customer_phone="+237690000007",
            city="Yaounde",
            address="Mvan, Yaounde",
            subtotal_xaf=90000,
            delivery_fee_xaf=1500,
            total_xaf=91500,
        )
        queued_shipment = Shipment.objects.create(
            order=expensive_order,
            status=Shipment.Status.WAITING_MANUAL_ASSIGNMENT,
            required_vehicle_type=vehicle.vehicle_type,
        )
        self.client.force_authenticate(self.organization_user)

        response = self.client.post(
            reverse("delivery-organization-assign-mission", args=[queued_shipment.id]),
            {"courier_id": self.courier.id},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(response.data["code"], "VALUE_LIMIT_EXCEEDED")
        self.assertEqual(response.data["trust_score"]["tier"], "NEW")
        self.assertEqual(response.data["trust_score"]["parcel_value_cap_xaf"], 75000)

    def test_expired_operational_evidence_is_purged_without_dispute(self):
        evidence = ShipmentEvidence.objects.create(
            shipment=self.shipment,
            stage=ShipmentEvidence.Stage.COURIER_PICKUP_VENDOR,
            uploaded_by=self.courier_user,
            actor_role="COURIER",
            file=SimpleUploadedFile("pickup.png", b"pickup-proof", content_type="image/png"),
            retain_until=timezone.now() - timedelta(minutes=1),
        )

        call_command("purge_expired_shipment_evidence")

        evidence.refresh_from_db()
        self.assertFalse(bool(evidence.file))
        self.assertIsNotNone(evidence.purged_at)
        self.assertFalse(evidence.litigation_hold)

    def test_dispute_places_expired_operational_evidence_on_hold(self):
        evidence = ShipmentEvidence.objects.create(
            shipment=self.shipment,
            stage=ShipmentEvidence.Stage.CUSTOMER_DELIVERY,
            uploaded_by=self.courier_user,
            actor_role="COURIER",
            file=SimpleUploadedFile("delivery.png", b"delivery-proof", content_type="image/png"),
            retain_until=timezone.now() - timedelta(minutes=1),
        )
        Dispute.objects.create(
            order=self.order,
            opened_by=self.client_user,
            reason="DAMAGED",
            description="Preuve à conserver pendant le litige.",
        )

        call_command("purge_expired_shipment_evidence")

        evidence.refresh_from_db()
        self.assertTrue(bool(evidence.file))
        self.assertTrue(evidence.litigation_hold)
        self.assertIsNone(evidence.purged_at)
