from datetime import timedelta

from rest_framework import serializers
from rest_framework.exceptions import PermissionDenied
from django.utils import timezone
from django.shortcuts import get_object_or_404
from django.http import Http404
from apps.orders.models import Dispute, Order
from apps.accounts.models import CourierProfile, UserNotification
from .models import (
    CourierSOSAlert,
    RelayParcel,
    RelayPointReview,
    Shipment,
    ShipmentEvent,
    ShipmentEvidence,
    ShipmentLocation,
    ShipmentMessage,
)

# Shipment.parcel_size est un champ libre cote livraison : on traduit les
# valeurs connues et on retombe sur un libelle neutre pour les autres.
PARCEL_SIZE_LABELS = {
    "SMALL": "Petit colis",
    "STANDARD": "Colis standard",
    "LARGE": "Gros colis",
    "BULKY": "Encombrant",
}


class ShipmentEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = ShipmentEvent
        fields = ["id", "status", "message", "location", "created_at"]


class ShipmentEvidenceSerializer(serializers.ModelSerializer):
    stage_label = serializers.CharField(source='get_stage_display', read_only=True)
    uploaded_by_name = serializers.SerializerMethodField()
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = ShipmentEvidence
        fields = [
            "id", "stage", "stage_label", "actor_role",
            "uploaded_by_name", "file_url", "description", "created_at",
        ]
        read_only_fields = fields

    def get_uploaded_by_name(self, obj):
        return obj.uploaded_by.get_full_name() or obj.uploaded_by.username

    def get_file_url(self, obj):
        request = self.context.get('request')
        if not obj.file:
            return None
        return request.build_absolute_uri(obj.file.url) if request else obj.file.url


class ShipmentLocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = ShipmentLocation
        fields = [
            "id",
            "latitude",
            "longitude",
            "accuracy_m",
            "speed_mps",
            "heading_deg",
            "source",
            "captured_at",
        ]


class ShipmentLocationCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ShipmentLocation
        fields = ["latitude", "longitude", "accuracy_m", "speed_mps", "heading_deg", "source", "captured_at"]
        extra_kwargs = {
            "source": {"required": False},
            "captured_at": {"required": False},
        }

    def validate_latitude(self, value):
        if value < -90 or value > 90:
            raise serializers.ValidationError("La latitude doit être comprise entre -90 et 90.")
        return value

    def validate_longitude(self, value):
        if value < -180 or value > 180:
            raise serializers.ValidationError("La longitude doit être comprise entre -180 et 180.")
        return value

    def validate_accuracy_m(self, value):
        if value is not None and (value < 0 or value > 5000):
            raise serializers.ValidationError("La précision GPS doit être comprise entre 0 et 5000 mètres.")
        return value

    def validate_speed_mps(self, value):
        if value is not None and (value < 0 or value > 100):
            raise serializers.ValidationError("La vitesse GPS doit être comprise entre 0 et 100 m/s.")
        return value

    def validate_heading_deg(self, value):
        if value is not None and (value < 0 or value > 360):
            raise serializers.ValidationError("Le cap GPS doit être compris entre 0 et 360 degrés.")
        return value

    def validate_captured_at(self, value):
        if value > timezone.now() + timedelta(minutes=5):
            raise serializers.ValidationError("La date GPS ne peut pas être dans le futur.")
        return value


class ShipmentSerializer(serializers.ModelSerializer):
    events = ShipmentEventSerializer(many=True, read_only=True)
    courier = serializers.SerializerMethodField()
    customer_name = serializers.SerializerMethodField()
    customer_phone = serializers.SerializerMethodField()
    delivery_address = serializers.SerializerMethodField()
    delivery_district = serializers.SerializerMethodField()
    delivery_latitude = serializers.SerializerMethodField()
    delivery_longitude = serializers.SerializerMethodField()
    delivery_location_precision = serializers.SerializerMethodField()
    city = serializers.SerializerMethodField()
    authorized_pickup_name = serializers.CharField(source="order.authorized_pickup_name", read_only=True)
    authorized_pickup_phone = serializers.CharField(source="order.authorized_pickup_phone", read_only=True)
    order_total_xaf = serializers.SerializerMethodField()
    courier_payout_xaf = serializers.SerializerMethodField()
    fulfillment_status = serializers.SerializerMethodField()
    vendor_names = serializers.SerializerMethodField()
    assignment = serializers.SerializerMethodField()
    relay_parcel = serializers.SerializerMethodField()
    latest_location = serializers.SerializerMethodField()
    location_history = serializers.SerializerMethodField()
    receipt_confirmation_code = serializers.SerializerMethodField()
    delivery_evidences = serializers.SerializerMethodField()
    estimated_availability_at = serializers.SerializerMethodField()

    def get_estimated_availability_at(self, obj):
        return obj.estimated_availability_at()

    def get_delivery_evidences(self, obj):
        # Cote acheteur, seules les preuves de REMISE (a domicile ou au
        # guichet relais) sont pertinentes — les etapes d'enlevement vendeur
        # / reception relais ne le concernent pas directement. "Preuves de
        # remise consultables (photo, signature, horodatage)".
        qs = obj.evidences.filter(stage__in=[
            ShipmentEvidence.Stage.CUSTOMER_DELIVERY,
            ShipmentEvidence.Stage.RELAY_RELEASED,
            ShipmentEvidence.Stage.RELAY_RELEASED_SIGNATURE,
        ])
        return ShipmentEvidenceSerializer(qs, many=True, context=self.context).data

    class Meta:
        model = Shipment
        fields = [
            "id",
            "order",
            "status",
            "courier",
            "courier_name",
            "courier_phone",
            "customer_name",
            "customer_phone",
            "delivery_address",
            "delivery_district",
            "delivery_latitude",
            "delivery_longitude",
            "delivery_location_precision",
            "city",
            "authorized_pickup_name",
            "authorized_pickup_phone",
            "order_total_xaf",
            "courier_payout_xaf",
            "fulfillment_status",
            "vendor_names",
            "relay_point",
            "required_vehicle_type",
            "parcel_size",
            "assignment",
            "relay_parcel",
            "latest_location",
            "location_history",
            "receipt_confirmation_code",
            "delivery_evidences",
            "estimated_availability_at",
            "created_at",
            "updated_at",
            "events",
        ]

    def get_courier(self, obj):
        if not obj.courier:
            return None
        return {
            "id": obj.courier.id,
            "user_id": obj.courier.user_id,
            "phone": obj.courier.phone,
            "city": obj.courier.city,
            "vehicle_type": obj.courier.vehicle_type,
            "is_online": obj.courier.is_online,
        }

    def get_customer_name(self, obj):
        user = getattr(obj.order, "user", None)
        if user:
            full_name = f"{user.first_name} {user.last_name}".strip()
            if full_name:
                return full_name
            return user.username
        return obj.order.customer_email or f"Client #{obj.order_id}"

    def get_customer_phone(self, obj):
        return obj.order.customer_phone

    def get_delivery_address(self, obj):
        return obj.order.address

    def get_delivery_district(self, obj):
        return obj.order.district

    def get_delivery_latitude(self, obj):
        return obj.order.delivery_latitude

    def get_delivery_longitude(self, obj):
        return obj.order.delivery_longitude

    def get_delivery_location_precision(self, obj):
        return obj.order.address_precision or {}

    def get_city(self, obj):
        return obj.order.city

    def get_order_total_xaf(self, obj):
        request = self.context.get("request")
        if request and hasattr(request.user, "courier_profile") and not request.user.is_staff:
            return self.get_courier_payout_xaf(obj)
        return obj.order.total_xaf

    def get_courier_payout_xaf(self, obj):
        return max(1000, round((obj.order.delivery_fee_xaf or 0) * 0.75)) if obj.order.delivery_fee_xaf else 1500

    def get_fulfillment_status(self, obj):
        return obj.order.fulfillment_status

    def get_vendor_names(self, obj):
        names = []
        items = obj.order.items.select_related("product__vendor__vendor_profile")
        for item in items:
            vendor_user = getattr(item.product, "vendor", None)
            if not vendor_user:
                continue
            vendor_profile = getattr(vendor_user, "vendor_profile", None)
            names.append(
                vendor_profile.business_name
                if vendor_profile and vendor_profile.business_name
                else vendor_user.get_full_name().strip() or vendor_user.username
            )
        return list(dict.fromkeys(names))

    def get_assignment(self, obj):
        return {
            "issue_code": obj.assignment_issue_code,
            "issue_message": obj.assignment_issue_message,
            "is_blocked": obj.status in [
                Shipment.Status.WAITING_MANUAL_ASSIGNMENT,
                Shipment.Status.ZONE_UNCOVERED,
                Shipment.Status.CAPACITY_BLOCKED,
                Shipment.Status.VEHICLE_INCOMPATIBLE,
                Shipment.Status.VALUE_LIMIT_EXCEEDED,
            ],
        }

    def get_relay_parcel(self, obj):
        parcel = getattr(obj, "relay_parcel", None)
        if not parcel:
            return None
        return RelayParcelSerializer(parcel).data

    def _tracking_locations(self, obj):
        cache = getattr(obj, "_tracking_locations_cache", None)
        if cache is None:
            cache = list(obj.locations.order_by("-captured_at", "-id")[:100])
            obj._tracking_locations_cache = cache
        return cache

    def get_latest_location(self, obj):
        locations = self._tracking_locations(obj)
        return ShipmentLocationSerializer(locations[0]).data if locations else None

    def get_location_history(self, obj):
        locations = list(reversed(self._tracking_locations(obj)))
        return ShipmentLocationSerializer(locations, many=True).data

    def get_receipt_confirmation_code(self, obj):
        # Le code de remise ne doit jamais fuiter vers le client : seul le
        # livreur assigne peut le consulter pour le presenter physiquement.
        request = self.context.get("request")
        if not request or not request.user or not request.user.is_authenticated:
            return None
        if obj.courier and obj.courier.user_id == request.user.id:
            return obj.ensure_receipt_confirmation_code()
        return None


class ShipmentCreateSerializer(serializers.Serializer):
    """
    Créer un Shipment pour une commande.
    V1 : l’admin/support crée et assigne éventuellement un livreur.
    """
    order_id = serializers.IntegerField()
    courier_id = serializers.IntegerField(required=False)
    courier_name = serializers.CharField(required=False, allow_blank=True)
    courier_phone = serializers.CharField(required=False, allow_blank=True)
    relay_point = serializers.CharField(required=False, allow_blank=True, default="")
    required_vehicle_type = serializers.CharField(required=False, allow_blank=True, default="")
    parcel_size = serializers.CharField(required=False, allow_blank=True, default="STANDARD")

    def validate_order_id(self, value):
        if not Order.objects.filter(id=value).exists():
            raise serializers.ValidationError("Order not found")
        return value

    def create(self, validated_data):
        order_id = validated_data["order_id"]
        shipment, created = Shipment.objects.get_or_create(order_id=order_id)
        courier_id = validated_data.get("courier_id")

        if courier_id:
            from apps.accounts.models import CourierProfile

            courier = CourierProfile.objects.filter(
                id=courier_id,
                is_active=True,
                is_approved=True,
            ).select_related("user").first()
            if not courier:
                raise serializers.ValidationError({"courier_id": "Courier not found or not approved"})
            shipment.courier = courier
            shipment.courier_name = courier.user.get_full_name().strip() or courier.user.username
            shipment.courier_phone = courier.phone

        if "courier_name" in validated_data:
            shipment.courier_name = validated_data["courier_name"]
        if "courier_phone" in validated_data:
            shipment.courier_phone = validated_data["courier_phone"]
        shipment.relay_point = validated_data.get("relay_point", shipment.relay_point)
        shipment.required_vehicle_type = validated_data.get("required_vehicle_type", shipment.required_vehicle_type)
        shipment.parcel_size = validated_data.get("parcel_size", shipment.parcel_size or "STANDARD")

        # Si livreur renseigné => ASSIGNED, sinon tentative d'affectation partenaire.
        if shipment.courier_name or shipment.courier_phone:
            shipment.status = Shipment.Status.ASSIGNED
            shipment.assignment_issue_code = ""
            shipment.assignment_issue_message = ""
            shipment.save()
        else:
            shipment.save()
            from .assignment import assign_shipment_or_mark_blocked

            shipment = assign_shipment_or_mark_blocked(shipment, required_vehicle_type=shipment.required_vehicle_type)

        # Ajoute un event (V1 simple)
        ShipmentEvent.objects.create(
            shipment=shipment,
            status=shipment.status,
            message="Shipment created" if created else "Shipment updated",
            location="",
        )

        if shipment.courier_id:
            UserNotification.objects.create(
                user=shipment.courier.user,
                title=f"Nouvelle livraison #{shipment.order_id}",
                message=(
                    f"Une commande a ete assignee a ta tournee: "
                    f"{shipment.order.city} - {shipment.order.address}."
                ),
                notification_type=UserNotification.NotificationType.ORDER,
                action_url="/courier",
            )

        return shipment


class RelayParcelSerializer(serializers.ModelSerializer):
    shipment_id = serializers.IntegerField(source="shipment.id", read_only=True)
    order_id = serializers.IntegerField(source="shipment.order_id", read_only=True)
    relay_point_name = serializers.CharField(source="relay_point.name", read_only=True)
    customer_phone = serializers.CharField(source="shipment.order.customer_phone", read_only=True)
    delivery_address = serializers.CharField(source="shipment.order.address", read_only=True)
    city = serializers.CharField(source="shipment.order.city", read_only=True)
    authorized_pickup_name = serializers.CharField(source="shipment.order.authorized_pickup_name", read_only=True)
    authorized_pickup_phone = serializers.CharField(source="shipment.order.authorized_pickup_phone", read_only=True)
    parcel_size = serializers.CharField(source="shipment.parcel_size", read_only=True)
    parcel_size_label = serializers.SerializerMethodField()
    courier_ref = serializers.SerializerMethodField()
    courier_vehicle_label = serializers.SerializerMethodField()

    # Le point relais ne doit jamais voir le vendeur ni l'identite du livreur :
    # il manipule une reference anonymisee stable, suffisante pour la double
    # signature et la tracabilite du transfert de responsabilite.
    def get_parcel_size_label(self, obj):
        return PARCEL_SIZE_LABELS.get(getattr(obj.shipment, "parcel_size", "") or "", "Taille non renseignee")

    def get_courier_ref(self, obj):
        courier_id = getattr(obj.shipment, "courier_id", None)
        return f"BV-L-{courier_id:03d}" if courier_id else ""

    def get_courier_vehicle_label(self, obj):
        courier = getattr(obj.shipment, "courier", None)
        if not courier:
            return ""
        return dict(CourierProfile.VehicleType.choices).get(courier.vehicle_type, courier.vehicle_type or "")

    garde_free_until = serializers.DateTimeField(read_only=True)
    garde_deadline = serializers.DateTimeField(read_only=True)
    garde_fee_due_xaf = serializers.SerializerMethodField()

    def get_garde_fee_due_xaf(self, obj):
        return obj.garde_fee_due()

    class Meta:
        model = RelayParcel
        fields = [
            "id",
            "shipment_id",
            "order_id",
            "relay_point",
            "relay_point_name",
            "status",
            "slot_code",
            "pickup_code",
            "proof_note",
            "customer_phone",
            "delivery_address",
            "city",
            "authorized_pickup_name",
            "authorized_pickup_phone",
            "parcel_size",
            "parcel_size_label",
            "courier_ref",
            "courier_vehicle_label",
            "received_at",
            "picked_up_at",
            "returned_at",
            "garde_extended",
            "garde_free_until",
            "garde_deadline",
            "garde_fee_due_xaf",
            "picked_up_by_name",
            "picked_up_by_id_reference",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class RelayParcelReceiveSerializer(serializers.Serializer):
    shipment_id = serializers.IntegerField(required=False)
    order_id = serializers.IntegerField(required=False)
    slot_code = serializers.CharField(required=False, allow_blank=True, default="")
    proof_note = serializers.CharField(required=False, allow_blank=True, default="")
    # ─────────────────────────────────────────────────────────────────────
    # LA CATEGORIE N'EST PAS CHOISIE PAR LE GERANT
    #
    # Elle est deduite du contenu de la commande. Accepter une valeur
    # envoyee par le client permettrait a un point relais de surclasser
    # ses colis pour etre mieux paye — le verrou de l'interface ne suffit
    # pas, un appel direct le contournerait.
    #
    # Le champ reste declare pour que d'anciens clients ne recoivent pas
    # d'erreur, mais sa valeur est IGNOREE.
    # ─────────────────────────────────────────────────────────────────────
    parcel_size = serializers.CharField(
        required=False, allow_blank=True, default="", write_only=True,
    )

    def validate(self, attrs):
        if not attrs.get("shipment_id") and not attrs.get("order_id"):
            raise serializers.ValidationError("shipment_id ou order_id est obligatoire.")
        return attrs

    def save(self, **kwargs):
        relay_point = self.context["relay_point"]
        shipment_qs = Shipment.objects.select_related("order")
        if self.validated_data.get("shipment_id"):
            shipment = get_object_or_404(shipment_qs, id=self.validated_data["shipment_id"])
        else:
            # Une commande peut avoir plusieurs colis (un par vendeur) : sans
            # shipment_id precis, on ne peut receptionner que si un seul colis
            # existe pour cette commande.
            candidates = list(shipment_qs.filter(order_id=self.validated_data["order_id"]))
            if not candidates:
                raise Http404()
            if len(candidates) > 1:
                raise serializers.ValidationError(
                    {"shipment_id": "Cette commande a plusieurs colis — precisez shipment_id."}
                )
            shipment = candidates[0]

        # Le colis peut deja exister a l'etat EXPECTED : c'est le cas nominal,
        # l'arrivee a ete annoncee au relais avant que le livreur se presente.
        existing_parcel = RelayParcel.objects.filter(shipment=shipment).first()
        if existing_parcel:
            if existing_parcel.relay_point_id != relay_point.id:
                raise serializers.ValidationError({"shipment_id": "Ce colis est rattache a un autre point relais."})
            if existing_parcel.status in [RelayParcel.Status.RECEIVED, RelayParcel.Status.STORED]:
                return existing_parcel
            if existing_parcel.status != RelayParcel.Status.EXPECTED:
                raise serializers.ValidationError(
                    {"shipment_id": "Ce colis a deja ete retire ou retourne et ne peut plus etre receptionne."}
                )

        active_count = RelayParcel.objects.filter(
            relay_point=relay_point,
            status__in=[RelayParcel.Status.RECEIVED, RelayParcel.Status.STORED],
        ).count()
        capacity = relay_point.storage_capacity or 0
        if capacity and active_count >= capacity:
            raise serializers.ValidationError({"capacity": "Capacite point relais atteinte."})

        import secrets

        # La categorie vient du SERVEUR, jamais du client.
        from apps.shipping.parcel_sizing import suggest_for_shipment

        deduction = suggest_for_shipment(shipment)
        taille = deduction.get("parcel_size") or ""
        if taille and taille != shipment.parcel_size:
            shipment.parcel_size = taille
            shipment.save(update_fields=["parcel_size"])

        parcel = existing_parcel or RelayParcel(shipment=shipment, relay_point=relay_point)
        parcel.relay_point = relay_point
        parcel.status = RelayParcel.Status.STORED
        parcel.slot_code = self.validated_data.get("slot_code") or parcel.slot_code or f"SL-{relay_point.id}-{shipment.id}"
        parcel.proof_note = self.validated_data.get("proof_note", "")
        parcel.received_at = timezone.now()
        parcel.save()

        # Regle en dur #3 : le code de retrait ne part qu'a l'arrivee REELLE
        # du (dernier) colis au relais. Sur une commande multi-colis, un seul
        # code est partage (§8.3) — genere seulement quand plus aucun colis
        # frere n'est en attente.
        siblings = list(RelayParcel.objects.filter(shipment__order=shipment.order))
        still_pending = [p for p in siblings if p.id != parcel.id and p.status == RelayParcel.Status.EXPECTED]
        if not still_pending:
            code = next((p.pickup_code for p in siblings if p.pickup_code), "") or secrets.token_hex(3).upper()
            RelayParcel.objects.filter(id__in=[p.id for p in siblings]).exclude(pickup_code=code).update(pickup_code=code)
            parcel.refresh_from_db(fields=["pickup_code"])
            if shipment.order.user_id:
                UserNotification.objects.create(
                    user=shipment.order.user,
                    title=f"Colis prêt au retrait · commande #{shipment.order_id}",
                    message=f"Votre commande est arrivée au point relais {relay_point.name}. Code de retrait : {code}.",
                    notification_type=UserNotification.NotificationType.ORDER,
                    action_url=f"/orders/{shipment.order_id}",
                )

        shipment.relay_point = relay_point.name
        shipment.status = Shipment.Status.IN_TRANSIT
        shipment.assignment_issue_code = ""
        shipment.assignment_issue_message = ""
        shipment.save(update_fields=["relay_point", "status", "assignment_issue_code", "assignment_issue_message", "updated_at"])
        ShipmentEvent.objects.create(
            shipment=shipment,
            status=Shipment.Status.IN_TRANSIT,
            message=f"Colis recu et stocke au point relais {relay_point.name}",
            location=relay_point.name,
        )
        return parcel


class RelayParcelPickupSerializer(serializers.Serializer):
    """
    Remise au guichet. §8.3 : sur une commande a plusieurs colis, un seul
    code de retrait est partage — le saisir remet TOUS les colis de ce
    compte encore en stock a ce relais en une seule action, jamais un par un.
    """

    parcel_id = serializers.IntegerField(required=False)
    pickup_code = serializers.CharField()
    proof_note = serializers.CharField(required=False, allow_blank=True, default="")
    picked_up_by_name = serializers.CharField(required=False, allow_blank=True, default="")
    picked_up_by_id_reference = serializers.CharField(required=False, allow_blank=True, default="")

    def save(self, **kwargs):
        relay_point = self.context["relay_point"]
        code = self.validated_data["pickup_code"]
        parcels = list(
            RelayParcel.objects.select_related("shipment", "shipment__order", "relay_point")
            .filter(
                relay_point=relay_point,
                pickup_code=code,
                status__in=[RelayParcel.Status.RECEIVED, RelayParcel.Status.STORED],
            )
        )
        if not parcels:
            raise serializers.ValidationError({"pickup_code": "Code de retrait incorrect ou colis deja retire."})

        # Retrait par un tiers : si l'acheteur a designe une personne
        # autorisee, le relais doit loguer sa piece d'identite avant de
        # valider la remise (Addendum Decisions v1.0, Parcours acheteur).
        id_reference = self.validated_data.get("picked_up_by_id_reference", "")
        if any(p.shipment.order.authorized_pickup_name for p in parcels) and not id_reference:
            raise serializers.ValidationError({
                "picked_up_by_id_reference": "Cette commande est retiree par un tiers autorise : renseignez sa piece d'identite avant de valider.",
            })

        proof_note = self.validated_data.get("proof_note", "")
        picked_up_by_name = self.validated_data.get("picked_up_by_name", "")
        now = timezone.now()
        for parcel in parcels:
            parcel.status = RelayParcel.Status.PICKED_UP
            parcel.proof_note = proof_note or parcel.proof_note
            parcel.picked_up_at = now
            parcel.picked_up_by_name = picked_up_by_name
            parcel.picked_up_by_id_reference = id_reference
            parcel.save()

            shipment = parcel.shipment
            shipment.status = Shipment.Status.DELIVERED
            shipment.save(update_fields=["status", "updated_at"])
            ShipmentEvent.objects.create(
                shipment=shipment,
                status=Shipment.Status.DELIVERED,
                message=f"Colis retire au point relais {relay_point.name}",
                location=relay_point.name,
            )
        # Un seul appel par commande (tous les colis partagent la meme
        # commande quand ils partagent un code) — mark_delivered() est
        # idempotent sur le statut de la commande.
        parcels[0].shipment.order.mark_delivered()
        return parcels[0]


class RelayParcelReturnSerializer(serializers.Serializer):
    parcel_id = serializers.IntegerField()
    destination = serializers.ChoiceField(choices=["VENDOR", "BELIVAY"])
    proof_note = serializers.CharField(required=False, allow_blank=True, default="")

    def save(self, **kwargs):
        relay_point = self.context["relay_point"]
        parcel = get_object_or_404(
            RelayParcel.objects.select_related("shipment", "relay_point"),
            id=self.validated_data["parcel_id"],
            relay_point=relay_point,
        )
        destination = self.validated_data["destination"]
        parcel.status = RelayParcel.Status.RETURNED_TO_VENDOR if destination == "VENDOR" else RelayParcel.Status.RETURNED_TO_BELIVAY
        parcel.proof_note = self.validated_data.get("proof_note", parcel.proof_note)
        parcel.returned_at = timezone.now()
        parcel.save()

        ShipmentEvent.objects.create(
            shipment=parcel.shipment,
            status=parcel.shipment.status,
            message=f"Retour point relais vers {'vendeur' if destination == 'VENDOR' else 'BelivaY'}",
            location=relay_point.name,
        )
        return parcel


class ShipmentEventCreateSerializer(serializers.Serializer):
    """
    Ajouter un event au shipment.
    V1 : livreur/support/admin
    """
    order_id = serializers.IntegerField()
    status = serializers.ChoiceField(choices=Shipment.Status.choices)
    message = serializers.CharField(required=False, allow_blank=True, default="")
    location = serializers.CharField(required=False, allow_blank=True, default="")

    def validate_order_id(self, value):
        if not Shipment.objects.filter(order_id=value).exists():
            raise serializers.ValidationError("Shipment not found for this order")
        return value

    def create(self, validated_data):
        shipment = Shipment.objects.get(order_id=validated_data["order_id"])

        shipment.status = validated_data["status"]
        shipment.save(update_fields=["status", "updated_at"])

        event = ShipmentEvent.objects.create(
            shipment=shipment,
            status=validated_data["status"],
            message=validated_data.get("message", ""),
            location=validated_data.get("location", ""),
        )
        return event


class CourierShipmentActionSerializer(serializers.Serializer):
    action = serializers.ChoiceField(
        choices=[
            "ACCEPT",
            "DECLINE",
            "PICKED_UP",
            "OUT_FOR_DELIVERY",
            "DELIVERED",
            "INCIDENT",
            "FAILED",
            "NOTE",
        ]
    )
    message = serializers.CharField(required=False, allow_blank=True, default="")
    location = serializers.CharField(required=False, allow_blank=True, default="")
    pickup_code = serializers.CharField(required=False, allow_blank=True, default="")

    def validate(self, attrs):
        if attrs.get("action") == "INCIDENT" and not attrs.get("message", "").strip():
            raise serializers.ValidationError(
                {"message": "Décrivez l'incident rencontré avant de le signaler au client."}
            )
        return attrs

    def save(self, **kwargs):
        shipment = self.context["shipment"]
        request = self.context["request"]
        courier = getattr(request.user, "courier_profile", None)
        if not courier or not courier.is_approved or not courier.is_active:
            raise PermissionDenied("Courier account is not active or approved")
        if shipment.courier_id != courier.id:
            raise PermissionDenied("Shipment not assigned to this courier")

        action = self.validated_data["action"]
        message = self.validated_data.get("message", "")
        location = self.validated_data.get("location", "")
        order = shipment.order

        if action == "ACCEPT":
            shipment.status = Shipment.Status.ASSIGNED
            shipment.accepted_at = timezone.now()
            shipment.penalty_notified_at = None
            shipment.ensure_pickup_confirmation_code()
            order.assign_driver()
        elif action == "DECLINE":
            shipment.status = Shipment.Status.CREATED
            shipment.courier = None
            shipment.courier_name = ""
            shipment.courier_phone = ""
            shipment.accepted_at = None
            order.mark_ready_for_pickup()
        elif action == "PICKED_UP":
            # Code de remise (§8.2, vendeur -> livreur) : controle C1 de
            # conformite au ramassage. Le vendeur lit le code affiche dans
            # son espace ; le livreur le saisit ici pour valider le transfert.
            expected = shipment.ensure_pickup_confirmation_code()
            submitted = (self.validated_data.get("pickup_code") or "").strip()
            if submitted != expected:
                raise serializers.ValidationError(
                    {"pickup_code": "Code de remise incorrect — demandez-le au vendeur."}
                )
            shipment.status = Shipment.Status.PICKED_UP
            order.mark_picked_up()
        elif action == "OUT_FOR_DELIVERY":
            shipment.status = Shipment.Status.OUT_FOR_DELIVERY
            order.mark_out_for_delivery()
        elif action == "DELIVERED":
            shipment.status = Shipment.Status.DELIVERED
            order.mark_delivered()
        elif action == "INCIDENT":
            shipment.status = Shipment.Status.INCIDENT
        elif action == "FAILED":
            shipment.status = Shipment.Status.FAILED

        shipment.save(update_fields=["status", "courier", "courier_name", "courier_phone", "accepted_at", "penalty_notified_at", "updated_at"])

        ShipmentEvent.objects.create(
            shipment=shipment,
            status=shipment.status,
            message=message or action.replace("_", " ").title(),
            location=location,
        )

        if action == "INCIDENT" and order.user_id:
            UserNotification.objects.create(
                user=order.user,
                title=f"Incident signalé · commande #{order.id}",
                message=message,
                notification_type=UserNotification.NotificationType.ORDER,
                action_url=f"/orders/{order.id}",
            )

        return shipment


class CourierDashboardLeaderboardSerializer(serializers.Serializer):
    name = serializers.CharField()
    score = serializers.CharField()
    badge = serializers.CharField()
    tone = serializers.CharField()


class CourierDashboardZoneSerializer(serializers.Serializer):
    zone = serializers.CharField()
    demand_percent = serializers.IntegerField()
    hint = serializers.CharField()


class CourierDashboardWeekSerializer(serializers.Serializer):
    label = serializers.CharField()
    earnings_xaf = serializers.IntegerField()
    deliveries = serializers.IntegerField()
    percent = serializers.IntegerField()


class CourierDashboardSerializer(serializers.Serializer):
    active_shipments = serializers.IntegerField()
    delivered_shipments = serializers.IntegerField()
    today_earnings_xaf = serializers.IntegerField()
    month_earnings_xaf = serializers.IntegerField()
    monthly_target_xaf = serializers.IntegerField()
    monthly_goal_percent = serializers.IntegerField()
    average_payout_xaf = serializers.IntegerField()
    online_minutes = serializers.IntegerField()
    status_label = serializers.CharField()
    distance_km = serializers.FloatField()
    average_delivery_minutes = serializers.IntegerField()
    performance_percent = serializers.IntegerField()
    trust_score = serializers.DictField()
    recommended_departure = serializers.CharField()
    traffic_label = serializers.CharField()
    weather_label = serializers.CharField()
    leaderboard = CourierDashboardLeaderboardSerializer(many=True)
    zone_heatmap = CourierDashboardZoneSerializer(many=True)
    weekly_progress = CourierDashboardWeekSerializer(many=True)


class CourierNetworkShopSerializer(serializers.Serializer):
    vendor_id = serializers.IntegerField()
    vendor_name = serializers.CharField()
    shop_slug = serializers.CharField(allow_blank=True)
    city = serializers.CharField(allow_blank=True)
    address = serializers.CharField(allow_blank=True)
    phone = serializers.CharField(allow_blank=True)
    is_online = serializers.BooleanField()
    location_name = serializers.CharField(allow_blank=True)
    representative_name = serializers.CharField(allow_blank=True)
    representative_phone = serializers.CharField(allow_blank=True)
    latitude = serializers.FloatField(allow_null=True)
    longitude = serializers.FloatField(allow_null=True)


class CourierNetworkRelayPointSerializer(serializers.Serializer):
    name = serializers.CharField()
    city = serializers.CharField(allow_blank=True)
    address = serializers.CharField(allow_blank=True)
    shipments_count = serializers.IntegerField()


class CourierNetworkSerializer(serializers.Serializer):
    shops = CourierNetworkShopSerializer(many=True)
    relay_points = CourierNetworkRelayPointSerializer(many=True)


class CourierDisputeSerializer(serializers.ModelSerializer):
    ref = serializers.SerializerMethodField()
    label = serializers.SerializerMethodField()
    detail = serializers.CharField(source="description", read_only=True)
    status_display = serializers.SerializerMethodField()
    reason_display = serializers.SerializerMethodField()
    can_reply = serializers.BooleanField(source="courier_can_reply", read_only=True)

    class Meta:
        model = Dispute
        fields = [
            "id",
            "ref",
            "label",
            "status",
            "status_display",
            "reason",
            "reason_display",
            "detail",
            "can_reply",
            "created_at",
            "updated_at",
        ]

    def get_ref(self, obj):
        return f"LIT-{obj.id:03d}"

    def get_label(self, obj):
        return f"Commande #{obj.order_id}"

    def get_status_display(self, obj):
        return obj.get_status_display()

    def get_reason_display(self, obj):
        return obj.get_reason_display()


class ShipmentMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.SerializerMethodField()

    class Meta:
        model = ShipmentMessage
        fields = [
            "id",
            "shipment",
            "channel",
            "sender_role",
            "sender_name",
            "message",
            "created_at",
        ]
        read_only_fields = fields

    def get_sender_name(self, obj):
        full_name = obj.sender.get_full_name().strip()
        return full_name or obj.sender.username


class ShipmentMessageCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ShipmentMessage
        fields = ["channel", "message"]


class CourierShipmentScanSerializer(serializers.Serializer):
    code = serializers.CharField()
    action = serializers.ChoiceField(choices=["PICKED_UP", "OUT_FOR_DELIVERY", "DELIVERED"])


class CourierSettingsSerializer(serializers.Serializer):
    is_online = serializers.BooleanField(required=False)
    city = serializers.CharField(max_length=80, required=False)
    zones = serializers.ListField(
        child=serializers.CharField(max_length=60),
        required=False,
        allow_empty=False,
    )
    vehicle_type = serializers.ChoiceField(choices=[], required=False)
    preferred_language = serializers.ChoiceField(choices=["fr", "en"], required=False)
    gps_permission_granted = serializers.BooleanField(required=False)
    camera_permission_granted = serializers.BooleanField(required=False)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        from apps.accounts.models import CourierProfile

        self.fields["vehicle_type"].choices = CourierProfile.VehicleType.choices

    def to_representation(self, courier):
        return {
            "id": courier.id,
            "is_online": courier.is_online,
            "city": courier.city,
            "zones": courier.zones or [],
            "vehicle_type": courier.vehicle_type,
            "preferred_language": courier.preferred_language or "fr",
            "gps_permission_granted": courier.gps_permission_granted,
            "camera_permission_granted": courier.camera_permission_granted,
            "updated_at": courier.updated_at,
        }

    def update(self, instance, validated_data):
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save(update_fields=[*validated_data.keys(), "updated_at"])
        return instance


class CourierSOSAlertSerializer(serializers.ModelSerializer):
    courier_name = serializers.SerializerMethodField()

    class Meta:
        model = CourierSOSAlert
        fields = [
            "id",
            "courier",
            "courier_name",
            "status",
            "message",
            "location",
            "latitude",
            "longitude",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "courier", "courier_name", "status", "created_at", "updated_at"]

    def get_courier_name(self, obj):
        full_name = obj.courier.user.get_full_name().strip()
        return full_name or obj.courier.user.username


class CourierSOSCreateSerializer(serializers.Serializer):
    message = serializers.CharField(required=False, allow_blank=True, default="")
    location = serializers.CharField(required=False, allow_blank=True, default="")
    latitude = serializers.DecimalField(max_digits=9, decimal_places=6, required=False, allow_null=True)
    longitude = serializers.DecimalField(max_digits=9, decimal_places=6, required=False, allow_null=True)


class RelayPointReviewSerializer(serializers.ModelSerializer):
    """L'acheteur n'est expose que par ses initiales (anonymat V5 ch.1)."""

    author_initials = serializers.CharField(read_only=True)
    parcel_ref = serializers.SerializerMethodField()

    class Meta:
        model = RelayPointReview
        fields = ["id", "rating", "comment", "author_initials", "parcel_ref", "thanked_at", "created_at"]
        read_only_fields = fields

    def get_parcel_ref(self, obj):
        parcel = obj.relay_parcel
        return f"BV-{parcel.shipment.order_id}" if parcel else ""
