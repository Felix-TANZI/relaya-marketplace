from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.utils import timezone
from datetime import timedelta
from django.urls import reverse
from rest_framework import serializers, status
from rest_framework.test import APITestCase

from apps.accounts.models import ComplianceDocument, CourierProfile, DeliveryOrganizationProfile, DeliveryVehicle, RelayPointProfile, UserNotification
from apps.orders.models import Dispute, Order

from .assignment import choose_courier_for_order
from .models import RelayParcel, Shipment, ShipmentEvent, ShipmentEvidence, ShipmentLocation, Tournee, Zone
from .serializers import RelayParcelPickupSerializer, RelayParcelReceiveSerializer, ShipmentSerializer
from .tournees import bourse_tournees_for_organization, claim_tournee_for_organization, compose_tournees_for_zone


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

    def test_relay_receives_an_expected_parcel_announced_in_advance(self):
        """Cas nominal : l'arrivee est annoncee au relais avant que le livreur se presente."""
        parcel = RelayParcel.objects.create(
            shipment=self.shipment,
            relay_point=self.relay_point,
            status=RelayParcel.Status.EXPECTED,
        )
        serializer = RelayParcelReceiveSerializer(
            data={"shipment_id": self.shipment.id, "slot_code": "A-07", "proof_note": "3 photos + double signature"},
            context={"relay_point": self.relay_point},
        )
        serializer.is_valid(raise_exception=True)
        stored = serializer.save()

        self.assertEqual(stored.pk, parcel.pk)
        self.assertEqual(stored.status, RelayParcel.Status.STORED)
        self.assertEqual(stored.slot_code, "A-07")
        self.assertEqual(stored.proof_note, "3 photos + double signature")
        self.assertTrue(stored.pickup_code)
        self.assertIsNotNone(stored.received_at)
        self.assertEqual(RelayParcel.objects.filter(shipment=self.shipment).count(), 1)
        self.assertEqual(ShipmentEvent.objects.filter(shipment=self.shipment).count(), 1)

    def test_pickup_by_authorized_third_party_requires_id_reference(self):
        self.order.authorized_pickup_name = "Jean Kamga"
        self.order.authorized_pickup_phone = "+237691112233"
        self.order.save(update_fields=["authorized_pickup_name", "authorized_pickup_phone"])
        RelayParcel.objects.create(
            shipment=self.shipment,
            relay_point=self.relay_point,
            status=RelayParcel.Status.STORED,
            pickup_code="TIERS1",
        )

        missing = RelayParcelPickupSerializer(
            data={"pickup_code": "TIERS1"},
            context={"relay_point": self.relay_point},
        )
        missing.is_valid(raise_exception=True)
        with self.assertRaisesMessage(serializers.ValidationError, "piece d'identite"):
            missing.save()

        logged = RelayParcelPickupSerializer(
            data={
                "pickup_code": "TIERS1",
                "picked_up_by_name": "Jean Kamga",
                "picked_up_by_id_reference": "CNI 1234567890",
            },
            context={"relay_point": self.relay_point},
        )
        logged.is_valid(raise_exception=True)
        parcel = logged.save()

        self.assertEqual(parcel.status, RelayParcel.Status.PICKED_UP)
        self.assertEqual(parcel.picked_up_by_name, "Jean Kamga")
        self.assertEqual(parcel.picked_up_by_id_reference, "CNI 1234567890")

    def test_relay_refuses_parcel_with_broken_seal_and_logs_evidence(self):
        self.client.force_authenticate(self.relay_user)

        response = self.client.post(
            reverse("shipping-relay-refuse"),
            {
                "shipment_id": self.shipment.id,
                "reason": "SEAL_BROKEN",
                "note": "Adhésif de sécurité découpé.",
                "file": SimpleUploadedFile("seal.png", b"broken-seal", content_type="image/png"),
            },
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.shipment.refresh_from_db()
        self.assertEqual(self.shipment.status, Shipment.Status.INCIDENT)
        parcel = RelayParcel.objects.get(shipment=self.shipment)
        self.assertEqual(parcel.status, RelayParcel.Status.REFUSED)
        self.assertIn("Scellé rompu", parcel.proof_note)
        self.assertTrue(ShipmentEvidence.objects.filter(shipment=self.shipment, stage=ShipmentEvidence.Stage.RELAY_REFUSED).exists())
        self.assertTrue(ShipmentEvent.objects.filter(shipment=self.shipment, status=Shipment.Status.INCIDENT).exists())
        self.assertTrue(
            UserNotification.objects.filter(
                user=self.shipment.order.user, title__icontains="Incident signalé",
            ).exists()
        )

    def test_relay_can_upload_a_pickup_signature_and_buyer_sees_it(self):
        parcel = RelayParcel.objects.create(
            shipment=self.shipment,
            relay_point=self.relay_point,
            status=RelayParcel.Status.STORED,
            pickup_code="SIGN01",
        )
        self.client.force_authenticate(self.relay_user)

        response = self.client.post(
            reverse("shipping-relay-evidence"),
            {
                "parcel_id": parcel.id,
                "stage": "RELAY_RELEASED_SIGNATURE",
                "file": SimpleUploadedFile("signature.png", b"signature-bytes", content_type="image/png"),
            },
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertTrue(
            ShipmentEvidence.objects.filter(
                shipment=self.shipment, stage=ShipmentEvidence.Stage.RELAY_RELEASED_SIGNATURE,
            ).exists()
        )

        serialized = ShipmentSerializer(self.shipment, context={"request": None}).data
        self.assertEqual(len(serialized["delivery_evidences"]), 1)

    def test_relay_refusal_requires_a_photo(self):
        self.client.force_authenticate(self.relay_user)

        response = self.client.post(
            reverse("shipping-relay-refuse"),
            {"shipment_id": self.shipment.id, "reason": "SEAL_BROKEN"},
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.shipment.refresh_from_db()
        self.assertNotEqual(self.shipment.status, Shipment.Status.INCIDENT)

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


class TourneeCompositionTests(APITestCase):
    """
    Composeur de tournées (Regles_Systeme_DEV v2.0 §5, règle fondatrice +
    règle verrouillée n°10) : les colis d'une zone partent toujours en
    groupe, jamais un par un, sauf sortie forcée après deux créneaux.
    """

    def setUp(self):
        self.client_user = User.objects.create_user("tournee_client", password="Client2026")
        self.zone = Zone.objects.create(name="Zone Tournée", city="Yaounde", tier=Zone.Tier.STANDARD)

        self.org_user = User.objects.create_user("tournee_org", password="Org2026")
        self.organization = DeliveryOrganizationProfile.objects.create(
            user=self.org_user,
            company_name="BelivaY Tournée Logistics",
            phone="+237690100001",
            city="Yaounde",
            zones=["Zone Tournée"],
            status=DeliveryOrganizationProfile.Status.APPROVED,
            transport_insurance_verified=True,
        )
        self.courier_user = User.objects.create_user("tournee_courier", password="Courier2026")
        self.courier = CourierProfile.objects.create(
            user=self.courier_user,
            delivery_organization=self.organization,
            phone="+237690100002",
            city="Yaounde",
            zones=["Zone Tournée"],
            id_card="TOURNEE-CNI-001",
            is_active=True,
            is_approved=True,
            is_online=True,
        )

    def _make_shipment(self, *, vendor_suffix, parcel_size="STANDARD", created_at=None):
        vendor_user = User.objects.create_user(f"tournee_vendor_{vendor_suffix}", password="Vendor2026")
        order = Order.objects.create(
            user=self.client_user,
            customer_phone="+237690100003",
            city="Yaounde",
            address="Mvan",
            zone=self.zone,
            total_xaf=10000,
        )
        shipment = Shipment.objects.create(
            order=order, vendor=vendor_user, status=Shipment.Status.CREATED, parcel_size=parcel_size,
        )
        if created_at is not None:
            Shipment.objects.filter(pk=shipment.pk).update(created_at=created_at)
            shipment.refresh_from_db()
        return shipment

    def test_zone_below_threshold_and_within_first_slot_waits(self):
        self._make_shipment(vendor_suffix=1)
        self._make_shipment(vendor_suffix=2)

        tournee = compose_tournees_for_zone(self.zone)

        self.assertIsNone(tournee)
        self.assertEqual(Shipment.objects.filter(status=Shipment.Status.CREATED, courier__isnull=True).count(), 2)

    def test_zone_reaching_threshold_composes_a_grouped_tournee(self):
        shipments = [self._make_shipment(vendor_suffix=i) for i in range(4)]

        tournee = compose_tournees_for_zone(self.zone)

        self.assertIsNotNone(tournee)
        self.assertEqual(tournee.status, Tournee.Status.DEPARTED)
        self.assertFalse(tournee.is_forced_exit)
        self.assertEqual(tournee.colis_count, 4)
        for shipment in shipments:
            shipment.refresh_from_db()
            self.assertEqual(shipment.tournee_id, tournee.id)
            self.assertEqual(shipment.courier_id, self.courier.id)
            self.assertEqual(shipment.status, Shipment.Status.ASSIGNED)
        stop_orders = sorted(s.stop_order for s in Shipment.objects.filter(tournee=tournee))
        self.assertEqual(stop_orders, [0, 1, 2, 3])

    def test_oversized_parcel_never_grouped_into_a_tournee(self):
        normal = [self._make_shipment(vendor_suffix=i) for i in range(3)]
        oversized = self._make_shipment(vendor_suffix="large", parcel_size="LARGE")

        tournee = compose_tournees_for_zone(self.zone)

        self.assertIsNone(tournee)  # seulement 3 colis eligibles, sous le seuil
        oversized.refresh_from_db()
        self.assertIsNone(oversized.tournee)
        self.assertEqual(oversized.status, Shipment.Status.CREATED)

    def test_forced_exit_after_two_slots_waited(self):
        old_shipment = self._make_shipment(
            vendor_suffix="old", created_at=timezone.now() - timedelta(hours=30),
        )

        tournee = compose_tournees_for_zone(self.zone)

        self.assertIsNotNone(tournee)
        self.assertTrue(tournee.is_forced_exit)
        old_shipment.refresh_from_db()
        self.assertEqual(old_shipment.tournee_id, tournee.id)
        self.assertEqual(old_shipment.courier_id, self.courier.id)


class BourseAuxCoursesTests(APITestCase):
    """
    Bourse aux courses V1.1 : "premier arrivé premier servi" pour les
    paquets qu'aucun livreur ne peut prendre individuellement au moment de
    la composition.
    """

    def setUp(self):
        self.client_user = User.objects.create_user("bourse_client", password="Client2026")
        # Zone sans aucune entreprise de livraison a la composition : le
        # composeur ne peut assigner personne -> publication sur la bourse.
        self.zone = Zone.objects.create(name="Zone Bourse", city="Douala", tier=Zone.Tier.STANDARD)

    def _make_shipment(self, *, vendor_suffix):
        vendor_user = User.objects.create_user(f"bourse_vendor_{vendor_suffix}", password="Vendor2026")
        order = Order.objects.create(
            user=self.client_user, customer_phone="+237690500001", city="Douala",
            address="Akwa", zone=self.zone, total_xaf=10000,
        )
        return Shipment.objects.create(order=order, vendor=vendor_user, status=Shipment.Status.CREATED)

    def _make_organization(self, username, *, city="Douala", zones=None):
        org_user = User.objects.create_user(username, password="Org2026")
        return DeliveryOrganizationProfile.objects.create(
            user=org_user, company_name=f"Livraison {username}", phone="+237690500002",
            city=city, zones=zones or [], status=DeliveryOrganizationProfile.Status.APPROVED,
            transport_insurance_verified=True,
        )

    def _make_courier(self, username, organization):
        user = User.objects.create_user(username, password="Courier2026")
        return CourierProfile.objects.create(
            user=user, delivery_organization=organization, phone="+237690500003",
            city=organization.city, zones=[self.zone.name], id_card=f"CNI-{username}",
            is_active=True, is_approved=True, is_online=True,
        )

    def test_threshold_reached_with_no_courier_publishes_to_bourse(self):
        shipments = [self._make_shipment(vendor_suffix=i) for i in range(4)]

        tournee = compose_tournees_for_zone(self.zone)

        self.assertIsNotNone(tournee)
        self.assertEqual(tournee.status, Tournee.Status.PUBLISHED)
        self.assertIsNone(tournee.courier)
        self.assertEqual(tournee.colis_count, 4)
        for shipment in shipments:
            shipment.refresh_from_db()
            self.assertEqual(shipment.tournee_id, tournee.id)
            self.assertEqual(shipment.status, Shipment.Status.CREATED)  # pas assigne individuellement
            self.assertIsNone(shipment.courier)

    def test_claim_assigns_a_courier_and_departs_the_tournee(self):
        shipments = [self._make_shipment(vendor_suffix=i) for i in range(4)]
        tournee = compose_tournees_for_zone(self.zone)

        organization = self._make_organization("bourse_org_1")
        courier = self._make_courier("bourse_courier_1", organization)

        claimed, error = claim_tournee_for_organization(tournee.id, organization)

        self.assertIsNone(error)
        self.assertEqual(claimed.status, Tournee.Status.DEPARTED)
        self.assertEqual(claimed.claimed_by_organization_id, organization.id)
        self.assertIsNotNone(claimed.claimed_at)
        for shipment in shipments:
            shipment.refresh_from_db()
            self.assertEqual(shipment.courier_id, courier.id)
            self.assertEqual(shipment.status, Shipment.Status.ASSIGNED)

    def test_second_organization_cannot_claim_an_already_claimed_tournee(self):
        self._make_shipment(vendor_suffix=1)
        for i in range(2, 5):
            self._make_shipment(vendor_suffix=i)
        tournee = compose_tournees_for_zone(self.zone)

        org_a = self._make_organization("bourse_org_a")
        self._make_courier("bourse_courier_a", org_a)
        org_b = self._make_organization("bourse_org_b")
        self._make_courier("bourse_courier_b", org_b)

        first, first_error = claim_tournee_for_organization(tournee.id, org_a)
        second, second_error = claim_tournee_for_organization(tournee.id, org_b)

        self.assertIsNone(first_error)
        self.assertIsNone(second)
        self.assertIsNotNone(second_error)

    def test_organization_without_courier_cannot_claim(self):
        for i in range(4):
            self._make_shipment(vendor_suffix=i)
        tournee = compose_tournees_for_zone(self.zone)

        organization = self._make_organization("bourse_org_empty")  # aucun livreur

        claimed, error = claim_tournee_for_organization(tournee.id, organization)

        self.assertIsNone(claimed)
        self.assertIsNotNone(error)
        tournee.refresh_from_db()
        self.assertEqual(tournee.status, Tournee.Status.PUBLISHED)  # reste disponible

    def test_bourse_listing_only_shows_published_tournees_covering_the_organization(self):
        for i in range(4):
            self._make_shipment(vendor_suffix=i)
        tournee = compose_tournees_for_zone(self.zone)

        matching_org = self._make_organization("bourse_org_match", city="Douala")
        other_city_org = self._make_organization("bourse_org_other", city="Yaounde")

        self.assertIn(tournee, list(bourse_tournees_for_organization(matching_org)))
        self.assertNotIn(tournee, list(bourse_tournees_for_organization(other_city_org)))


class AdminSupervisionDashboardTests(APITestCase):
    """Console de supervision minimale : deux listes + subvention par zone."""

    def setUp(self):
        self.admin = User.objects.create_superuser("supervision_admin", "supervision_admin@test.local", "pass")
        self.buyer = User.objects.create_user("supervision_buyer", password="pass")
        self.zone = Zone.objects.create(name="Zone Supervision", city="Yaounde", tier=Zone.Tier.STANDARD)
        self.url = reverse("shipping-admin-supervision")

    def _make_order_and_shipment(self, *, created_at, status=Shipment.Status.CREATED):
        vendor_user = User.objects.create_user(f"supervision_vendor_{Order.objects.count()}", password="pass")
        order = Order.objects.create(
            user=self.buyer, customer_phone="+237690600001", city="Yaounde",
            address="Mvan", zone=self.zone, total_xaf=8000,
        )
        Order.objects.filter(pk=order.pk).update(created_at=created_at)
        order.refresh_from_db()
        shipment = Shipment.objects.create(order=order, vendor=vendor_user, status=status)
        Shipment.objects.filter(pk=shipment.pk).update(created_at=created_at)
        shipment.refresh_from_db()
        return order, shipment

    def test_requires_admin(self):
        self.client.force_authenticate(self.buyer)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_lists_late_shipment_not_yet_delivered(self):
        # Zone STANDARD -> SLA 24h ouvrées : un colis créé il y a 3 jours et
        # toujours pas livré est en retard.
        self._make_order_and_shipment(created_at=timezone.now() - timedelta(days=3))

        self.client.force_authenticate(self.admin)
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["late_shipments_count"], 1)
        self.assertGreater(response.data["late_shipments"][0]["hours_late"], 0)

    def test_does_not_list_a_shipment_still_within_sla(self):
        self._make_order_and_shipment(created_at=timezone.now())

        self.client.force_authenticate(self.admin)
        response = self.client.get(self.url)

        self.assertEqual(response.data["late_shipments_count"], 0)

    def test_lists_unclaimed_published_tournee(self):
        Tournee.objects.create(
            zone=self.zone, slot_date=timezone.now().date(), period=Tournee.Period.MORNING,
            status=Tournee.Status.PUBLISHED, colis_count=4,
        )

        self.client.force_authenticate(self.admin)
        response = self.client.get(self.url)

        self.assertEqual(response.data["unclaimed_tournees_count"], 1)
        self.assertEqual(response.data["unclaimed_tournees"][0]["colis_count"], 4)

    def test_counts_forced_exits_as_subsidy_per_zone(self):
        Tournee.objects.create(
            zone=self.zone, slot_date=timezone.now().date(), period=Tournee.Period.MORNING,
            status=Tournee.Status.COMPLETED, colis_count=1, is_forced_exit=True,
        )
        Tournee.objects.create(
            zone=self.zone, slot_date=timezone.now().date(), period=Tournee.Period.AFTERNOON,
            status=Tournee.Status.DEPARTED, colis_count=2, is_forced_exit=True,
        )
        Tournee.objects.create(
            zone=self.zone, slot_date=timezone.now().date(), period=Tournee.Period.MORNING,
            status=Tournee.Status.DEPARTED, colis_count=4, is_forced_exit=False,
        )

        self.client.force_authenticate(self.admin)
        response = self.client.get(self.url)

        subsidy = response.data["subsidy_by_zone"]
        self.assertEqual(len(subsidy), 1)
        self.assertEqual(subsidy[0]["forced_exits"], 2)
        self.assertEqual(subsidy[0]["colis_perdus"], 3)


class SanctionThrottlingDispatchTests(APITestCase):
    """
    Sanction niveau 2 (V5.5 §8, throttling) : "visibilité/dispatch réduits",
    jamais une exclusion. Un livreur sanctionné doit rester sélectionnable,
    mais seulement en dernier recours face à un livreur non sanctionné.
    """

    def setUp(self):
        from apps.accounts.trust_score import apply_sanction

        self.apply_sanction = apply_sanction
        self.client_user = User.objects.create_user("throttle_client", password="Client2026")
        self.zone = Zone.objects.create(name="Zone Throttle", city="Yaounde", tier=Zone.Tier.STANDARD)
        org_user = User.objects.create_user("throttle_org", password="Org2026")
        self.organization = DeliveryOrganizationProfile.objects.create(
            user=org_user, company_name="Throttle Logistics", phone="+237690600001",
            city="Yaounde", zones=["Zone Throttle"],
            status=DeliveryOrganizationProfile.Status.APPROVED, transport_insurance_verified=True,
        )

    def _courier(self, suffix):
        user = User.objects.create_user(f"throttle_courier_{suffix}", password="Courier2026")
        return CourierProfile.objects.create(
            user=user, delivery_organization=self.organization, phone=f"+23769060{suffix}",
            city="Yaounde", zones=["Zone Throttle"], id_card=f"THROTTLE-CNI-{suffix}",
            is_active=True, is_approved=True, is_online=True,
        )

    def test_throttled_courier_is_picked_last_not_excluded(self):
        from apps.accounts.models import TrustScoreProfile
        from apps.accounts.trust_score import get_trust_score_profile

        sanctioned = self._courier("1")
        free = self._courier("2")
        profile = get_trust_score_profile(sanctioned.user, TrustScoreProfile.Role.COURIER)
        self.apply_sanction(profile, TrustScoreProfile.SanctionLevel.THROTTLING, "Retards répétés — throttling.")

        order = Order.objects.create(
            user=self.client_user, customer_phone="+237690600099", city="Yaounde",
            address="Bastos", zone=self.zone, total_xaf=10000,
        )
        courier, issue_code, _ = choose_courier_for_order(order)

        self.assertEqual(courier.id, free.id)
        self.assertEqual(issue_code, "")

        # Le livreur sanctionné reste éligible s'il est le seul disponible —
        # le throttling réduit la priorité, il n'exclut jamais.
        free.is_online = False
        free.save(update_fields=["is_online"])
        courier, issue_code, _ = choose_courier_for_order(order)
        self.assertEqual(courier.id, sanctioned.id)
