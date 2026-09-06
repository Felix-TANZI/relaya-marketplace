import secrets
from datetime import timedelta

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.accounts.models import (
    CourierProfile,
    DeliveryOrganizationProfile,
    RelayPointProfile,
    RelayTrainingCompletion,
)
from apps.orders.models import Order
from apps.orders.models import Dispute
from apps.shipping.models import RelayParcel, RelayPointReview, Shipment, ShipmentEvidence

DEMO_PASSWORD = "Demo12345!"
DEMO_BUYER = "acheteur_demo"
DEMO_RELAY = "relais_demo"
DEMO_ORG = "org_demo"
DEMO_COURIER = "livreur_demo_relais"

# Tailles utilisees pour les arrivees de demonstration, dans l'ordre.
DEMO_SIZES = ["STANDARD", "LARGE", "SMALL", "BULKY"]

# Scenario d'activite : (statut, taille, heures depuis la reception).
# Deux arrivees a receptionner, deux colis en stock, deux retraits effectues.
DEMO_ACTIVITY = [
    ("EXPECTED", "STANDARD", None),
    ("EXPECTED", "LARGE", None),
    ("STORED", "SMALL", 30),
    ("STORED", "STANDARD", 8),
    ("PICKED_UP", "STANDARD", 52),
    ("PICKED_UP", "BULKY", 26),
]

# Grille contractuelle du relais de demonstration : (categorie, montant, acceptee).
DEMO_TARIFF = [
    ("SMALL", 100, True),
    ("STANDARD", 150, True),
    ("LARGE", 250, True),
    ("BULKY", 400, False),
]

# Versements MoMo hebdomadaires deja executes : (semaines dans le passe, montant).
DEMO_PAYOUTS = [(1, 4500), (2, 6300), (3, 3900)]

DEMO_PAYOUT_MARKER = "Versement hebdomadaire — jeu de demonstration BelivaY."

# Modules de formation deja valides dans le jeu de demonstration.
DEMO_TRAINING = ["reception", "cni", "litige"]

# Avis de demonstration : (prenom, nom, note, commentaire).
DEMO_REVIEWS = [
    ("Owen", "Pierre", 5, "Accueil rapide, colis bien range et en parfait etat. Merci !"),
    ("Therese", "Ramba", 5, "Tres pro, la dame a verifie ma CNI poliment. Je recommande."),
    ("Kevin", "Loum", 4, "Bon point relais mais un peu d'attente a midi."),
    ("Adele", "Nkou", 5, "Colis garde 4 jours sans souci, personnel agreable."),
    ("Serge", "Mbarga", 3, "Correct, mais les horaires du samedi ne sont pas clairs."),
    ("Laure", "Etoga", 5, "Retrait en deux minutes avec le code recu par SMS."),
    ("Ibrahim", "Sali", 2, "Boutique fermee alors que l'app annoncait ouvert."),
    ("Nadege", "Foka", 5, "Parfait, on m'a meme aide a porter le carton."),
]


class Command(BaseCommand):
    help = (
        "Remet a zero le jeu de demonstration du portail point relais : recree le compte, "
        "son organisation partenaire, un livreur, et des arrivees en attente de reception."
    )

    def add_arguments(self, parser):
        parser.add_argument("--arrivals", type=int, default=2, help="Nombre d'arrivees a annoncer (defaut 2).")
        parser.add_argument("--reviews", type=int, default=6, help="Nombre d'avis acheteurs a generer (defaut 6).")
        parser.add_argument(
            "--keep-stock",
            action="store_true",
            help="Conserve les colis deja receptionnes au lieu de repartir d'un stock vide.",
        )

    def handle(self, *args, **options):
        wanted = max(1, min(options["arrivals"], len(DEMO_SIZES)))

        relay = self._relay_point()
        organization = self._organization()
        courier = self._courier(organization)
        buyer, _ = User.objects.get_or_create(username=DEMO_BUYER, defaults={"email": "acheteur.demo@belivay.com"})

        # On ne touche qu'aux colis de demonstration : ceux rattaches a l'acheteur
        # demo. Les colis reels du relais ne sont jamais supprimes.
        demo_parcels = RelayParcel.objects.filter(relay_point=relay, shipment__order__user=buyer)
        if options["keep_stock"]:
            demo_parcels = demo_parcels.filter(status=RelayParcel.Status.EXPECTED)
        order_ids = list(demo_parcels.values_list("shipment__order_id", flat=True))
        removed = demo_parcels.count()
        demo_parcels.delete()
        Order.objects.filter(id__in=order_ids).delete()

        tarifs = self._tariff(relay)
        created = self._activity(relay, courier, buyer)
        litige = self._dispute(relay, buyer)
        versements = self._payouts(relay)

        reviews = self._reviews(relay, max(0, min(options["reviews"], len(DEMO_REVIEWS))))
        modules = self._training(relay)

        self.stdout.write(self.style.SUCCESS(f"Jeu de demonstration remis a zero pour {relay.name}."))
        self.stdout.write(f"  colis de demo supprimes : {removed}")
        for statut, parcel_id, shipment_id, size in created:
            self.stdout.write(f"  {statut:<10} colis #{parcel_id} · mission {shipment_id} · {size}")
        self.stdout.write(f"  litige ouvert : {litige}")
        self.stdout.write(f"  grille tarifaire : {tarifs}")
        self.stdout.write(f"  versements MoMo : {versements}")
        self.stdout.write(f"  avis acheteurs : {reviews}")
        self.stdout.write(f"  modules de formation valides : {modules}/6")
        self.stdout.write(f"  Trust Score recalcule : {self._trust(relay)}/100")
        self.stdout.write("")
        self.stdout.write(f"  Portail point relais : http://localhost:5179 ({DEMO_RELAY} / {DEMO_PASSWORD})")
        self.stdout.write("  Onglet « Reception colis » : les arrivees ci-dessus attendent d'etre scannees.")
        self.stdout.write("  Astuce : sans camera, saisissez l'ID de mission dans la modale de scan.")

    def _account(self, username, email, first_name, last_name):
        user, _ = User.objects.get_or_create(username=username, defaults={"email": email})
        user.email = email
        user.first_name = first_name
        user.last_name = last_name
        user.is_active = True
        user.set_password(DEMO_PASSWORD)
        user.save()
        return user

    def _relay_point(self):
        user = self._account(DEMO_RELAY, "relais.demo@belivay.com", "Point", "Relais")
        relay, _ = RelayPointProfile.objects.update_or_create(
            user=user,
            defaults={
                "name": "Relais Akwa Centre",
                "manager_name": "Point Relais Demo",
                "phone": "+237690000004",
                "city": "Douala",
                "zones": ["Akwa"],
                "address": "Rue Joss, Akwa, Douala",
                "relay_code": "RLY-DEMO-001",
                "opening_hours": "08h-19h",
                "storage_capacity": 120,
                "status": RelayPointProfile.Status.APPROVED,
                "is_active": True,
            },
        )
        return relay

    def _organization(self):
        user = self._account(DEMO_ORG, "org.demo@belivay.com", "Organisation", "Demo")
        organization, _ = DeliveryOrganizationProfile.objects.update_or_create(
            user=user,
            defaults={
                "company_name": "Transport Demo SARL",
                "manager_name": "Organisation Demo",
                "phone": "+237690000003",
                "city": "Douala",
                "zones": ["Akwa", "Bonapriso", "Deido"],
                "address": "Akwa, Douala",
                "contract_reference": "CTR-DEMO-001",
                "allowed_vehicle_types": ["MOTORBIKE", "CAR"],
                "max_active_shipments": 50,
                "status": DeliveryOrganizationProfile.Status.APPROVED,
                "is_active": True,
            },
        )
        return organization

    def _courier(self, organization):
        user = self._account(DEMO_COURIER, "livreur.relais@belivay.com", "Livreur", "Demo")
        courier, _ = CourierProfile.objects.update_or_create(
            user=user,
            defaults={
                "delivery_organization": organization,
                "phone": "+237690000021",
                "city": "Douala",
                "zones": ["Akwa"],
                "vehicle_type": CourierProfile.VehicleType.MOTORBIKE,
                "id_card": "CNI-DEMO-L1",
                "is_active": True,
                "is_approved": True,
            },
        )
        return courier

    def _reviews(self, relay, wanted):
        """Avis de demonstration, reconstruits a chaque passage."""
        RelayPointReview.objects.filter(relay_point=relay, author__username__startswith="avis_demo_").delete()
        for index, (first_name, last_name, rating, comment) in enumerate(DEMO_REVIEWS[:wanted]):
            author, _ = User.objects.get_or_create(
                username=f"avis_demo_{index + 1}",
                defaults={"email": f"avis.demo{index + 1}@belivay.com"},
            )
            author.first_name = first_name
            author.last_name = last_name
            author.save(update_fields=["first_name", "last_name", "email"])
            RelayPointReview.objects.create(relay_point=relay, author=author, rating=rating, comment=comment)
        return wanted

    def _training(self, relay):
        """Parcours de formation partiel : le tronc obligatoire reste incomplet."""
        RelayTrainingCompletion.objects.filter(relay_point=relay).delete()
        for module_key in DEMO_TRAINING:
            RelayTrainingCompletion.objects.create(relay_point=relay, module_key=module_key)
        return len(DEMO_TRAINING)

    def _activity(self, relay, courier, buyer):
        """Colis couvrant les trois etats visibles : attendu, en stock, retire."""
        created = []
        now = timezone.now()
        for statut, size, hours in DEMO_ACTIVITY:
            order = Order.objects.create(
                user=buyer,
                city=relay.city or "Douala",
                address=relay.address or "Akwa, Douala",
            )
            shipment = Shipment.objects.create(
                order=order,
                courier=courier,
                parcel_size=size,
                courier_name="Livreur demo",
                courier_phone=courier.phone,
                relay_point=relay.name,
            )
            parcel = RelayParcel(shipment=shipment, relay_point=relay, status=statut)

            if statut != RelayParcel.Status.EXPECTED:
                received = now - timedelta(hours=hours)
                parcel.received_at = received
                parcel.slot_code = f"A-{len(created) + 1:02d}"
                parcel.pickup_code = secrets.token_hex(3).upper()
                parcel.proof_note = (
                    f"Réception V5 · mission {shipment.id} · photos preuve : face, dos, étiquette "
                    f"· double signature : gérant {relay.manager_name} + livreur BV-L-{courier.id:03d}"
                )
                if statut == RelayParcel.Status.PICKED_UP:
                    # Retrait sous 24 h : le Trust « Ponctualite » recompense ce delai.
                    parcel.picked_up_at = received + timedelta(hours=20)
            parcel.save()

            self._evidences(parcel, relay, statut)
            created.append((statut, parcel.id, shipment.id, size))
        return created

    def _evidences(self, parcel, relay, statut):
        """Preuves de chaine de garde : elles nourrissent le Trust « Securite »."""
        if statut == RelayParcel.Status.EXPECTED:
            return
        stages = [ShipmentEvidence.Stage.RELAY_RECEIVED]
        if statut == RelayParcel.Status.PICKED_UP:
            stages.append(ShipmentEvidence.Stage.RELAY_RELEASED)
        for stage in stages:
            ShipmentEvidence.objects.create(
                shipment=parcel.shipment,
                stage=stage,
                uploaded_by=relay.user,
                actor_role="RELAY_POINT",
                description="Preuve de démonstration (face, dos, étiquette).",
                content_type="image/jpeg",
                size_bytes=120_000,
            )

    def _dispute(self, relay, buyer):
        """Un litige ouvert sur un colis encore en stock."""
        Dispute.objects.filter(order__user=buyer, order__shipments__relay_parcel__relay_point=relay).delete()
        parcel = (
            RelayParcel.objects
            .filter(relay_point=relay, status=RelayParcel.Status.STORED)
            .select_related("shipment__order")
            .first()
        )
        if parcel is None:
            return "aucun"
        dispute = Dispute.objects.create(
            order=parcel.shipment.order,
            opened_by=buyer,
            reason="DAMAGED",
            status="OPEN",
            description=(
                "Le carton présente un enfoncement sur le côté. Photos de réception "
                "disponibles côté point relais, colis conservé au slot "
                f"{parcel.slot_code} en attendant l'arbitrage."
            ),
        )
        return f"#{dispute.id} (colis {parcel.slot_code})"

    def _payouts(self, relay):
        """
        Versements MoMo deja executes.

        Un PayoutRequest deplace de l'argent reel : le modele en interdit la
        suppression. Le jeu de demonstration ne les recree donc qu'une fois.
        """
        from apps.payments.bridge.actors import payee_for_relay_point
        from apps.payments.settlements.models import PayoutRequest

        payee = payee_for_relay_point(relay, create=True)
        existants = PayoutRequest.objects.filter(payee=payee, justification=DEMO_PAYOUT_MARKER)
        if existants.exists():
            return f"{existants.count()} deja presents (non recrees)"

        now = timezone.now()
        for weeks, amount in DEMO_PAYOUTS:
            executed = now - timedelta(weeks=weeks)
            PayoutRequest.objects.create(
                payee=payee,
                amount_xaf=amount,
                status=PayoutRequest.Status.PAID,
                provider_code="MOCK",
                provider_status_raw="SUCCESSFUL",
                payee_msisdn_masked="+2376****004",
                payee_operator="MTN",
                requested_by=relay.user,
                executed_at=executed,
                settled_at=executed + timedelta(minutes=3),
                justification=DEMO_PAYOUT_MARKER,
            )
        return f"{len(DEMO_PAYOUTS)} crees"

    def _trust(self, relay):
        from apps.accounts.models import TrustScoreProfile
        from apps.accounts.trust_score import calculate_trust_score

        profile = calculate_trust_score(relay.user, TrustScoreProfile.Role.RELAY_POINT)
        return round(float(profile.score), 1)

    def _tariff(self, relay):
        """Grille contractuelle : sans elle, aucun colis ne remunere le relais."""
        from apps.payments.bridge.actors import payee_for_relay_point
        from apps.payments.config.models import RelayCompensationRule
        from apps.payments.payees.models import KycStatus

        payee = payee_for_relay_point(relay, create=True)

        # Sans KYC verifie ni numero MoMo, tout reversement reste bloque et la
        # page Finances n'afficherait que des blocages.
        if not payee.momo_number_enc:
            payee.set_momo_number(relay.phone or "+237690000004", "MTN")
        payee.kyc_status = KycStatus.VERIFIED
        payee.payout_hold = False
        payee.is_active = True
        # Le delai anti-fraude de 72 h apres enregistrement du numero est une
        # vraie protection : on l'antidate ici pour que la demonstration montre
        # un compte deja operationnel, sans toucher a la regle elle-meme.
        payee.momo_changed_at = timezone.now() - timedelta(days=7)
        payee.save()
        for size, amount, accepted in DEMO_TARIFF:
            RelayCompensationRule.objects.update_or_create(
                config_key=f"relay-demo-{size.lower()}",
                defaults={
                    "name": f"Relais demo — {size}",
                    "payee_code": payee.payee_code,
                    "parcel_size": size,
                    "basis": RelayCompensationRule.Basis.PER_PARCEL,
                    "amount_xaf": amount,
                    "is_accepted": accepted,
                    "is_active": True,
                },
            )
        return f"{len(DEMO_TARIFF)} categories"
