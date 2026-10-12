import secrets
import uuid
from unittest.mock import patch

from django.contrib.auth.models import User
from django.test import override_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.orders.models import Order

from django.urls import reverse

from .models import CourierProfile, DeliveryOrganizationProfile, RelayPointProfile, TrustScoreProfile, UserProfile

# Mot de passe de fixture : jamais relu, juste exige par create_user()/les
# serializers d'inscription. Genere plutot qu'ecrit en dur pour ne pas faire
# remonter de faux positifs sur les scanners de secrets.
TEST_PASSWORD = secrets.token_urlsafe(16)


@override_settings(GOOGLE_CLIENT_ID="belivay-test.apps.googleusercontent.com")
class GoogleLoginTests(APITestCase):
    endpoint = "/api/auth/google/"
    identity = {
        "sub": "google-subject-123",
        "email": "client.google@example.com",
        "email_verified": True,
        "given_name": "Client",
        "family_name": "Google",
    }

    def test_credential_is_required(self):
        response = self.client.post(self.endpoint, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch("google.oauth2.id_token.verify_oauth2_token")
    def test_google_login_creates_client_and_returns_belivay_tokens(self, verify):
        verify.return_value = self.identity

        response = self.client.post(self.endpoint, {"credential": "valid-token"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["created"])
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        user = User.objects.get(email=self.identity["email"])
        self.assertFalse(user.has_usable_password())

    @patch("google.oauth2.id_token.verify_oauth2_token")
    def test_google_login_reuses_existing_email(self, verify):
        User.objects.create_user(
            username="existing_google_client",
            email=self.identity["email"],
            password=TEST_PASSWORD,
        )
        verify.return_value = self.identity

        response = self.client.post(self.endpoint, {"credential": "valid-token"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["created"])
        self.assertEqual(User.objects.filter(email=self.identity["email"]).count(), 1)

    @patch("google.oauth2.id_token.verify_oauth2_token", side_effect=ValueError("invalid"))
    def test_invalid_google_token_is_rejected(self, _verify):
        response = self.client.post(self.endpoint, {"credential": "invalid-token"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class ClientRegistrationUniquenessTests(APITestCase):
    endpoint = "/api/auth/register/"

    def payload(self, **overrides):
        data = {
            "username": "nouveau_client",
            "email": "nouveau.client@example.com",
            "phone": "+237690123456",
            "password": TEST_PASSWORD,
            "password2": TEST_PASSWORD,
            "first_name": "Nouveau",
            "last_name": "Client",
        }
        data.update(overrides)
        return data

    def test_existing_email_returns_an_explicit_error(self):
        User.objects.create_user("client_email_existant", email="nouveau.client@example.com")
        response = self.client.post(self.endpoint, self.payload(), format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data["email"][0],
            "Cette adresse email existe deja. Connectez-vous ou utilisez-en une autre.",
        )

    def test_existing_phone_in_any_profile_returns_an_explicit_error(self):
        existing = User.objects.create_user("client_phone_existant")
        UserProfile.objects.create(user=existing, phone="+237690123456")
        response = self.client.post(self.endpoint, self.payload(), format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data["phone"][0],
            "Ce numero de telephone existe deja. Connectez-vous ou utilisez-en un autre.",
        )

    def test_phone_is_normalized_and_saved_on_success(self):
        response = self.client.post(self.endpoint, self.payload(phone="690 12 34 56"), format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        user = User.objects.get(username="nouveau_client")
        self.assertEqual(user.profile.phone, "+237690123456")


class TrustScoreV55Tests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user("trust_courier", password=TEST_PASSWORD)
        CourierProfile.objects.create(
            user=self.user,
            phone="+237670123456",
            city="Yaounde",
            id_card="TRUST-CNI",
            is_active=True,
            is_approved=True,
        )

    def test_cold_start_is_new_with_75000_cap(self):
        from .trust_score import calculate_trust_score

        profile = calculate_trust_score(self.user, TrustScoreProfile.Role.COURIER)
        self.assertEqual(profile.tier, TrustScoreProfile.Tier.NEW)
        self.assertEqual(profile.parcel_value_cap_xaf, 75000)

    @patch("apps.accounts.trust_score._courier_observations")
    def test_gold_tier_requires_hysteresis_and_veto_caps_score(self, observations):
        from .trust_score import Observation, calculate_trust_score

        # V5.5 : prior neutre µ=50, k=10 (au lieu de µ=70, k=5 en V5.4) — il en
        # faut davantage pour franchir un palier. (50*10 + 100*n)/(10+n) >= 90
        # exige n >= 40.
        high = [Observation(100, timezone.now()) for _ in range(45)]
        observations.return_value = {
            "punctuality": high,
            "quality": high,
            "disputes": high,
            "seniority": high,
            "training": high,
        }
        profile = calculate_trust_score(self.user, TrustScoreProfile.Role.COURIER)
        self.assertEqual(profile.tier, TrustScoreProfile.Tier.NEW)
        self.assertEqual(profile.candidate_tier, TrustScoreProfile.Tier.GOLD)

        profile.candidate_since = timezone.now() - timezone.timedelta(days=15)
        profile.save(update_fields=["candidate_since"])
        profile = calculate_trust_score(self.user, TrustScoreProfile.Role.COURIER)
        self.assertEqual(profile.tier, TrustScoreProfile.Tier.GOLD)
        self.assertIsNone(profile.parcel_value_cap_xaf)

        profile.veto_active = True
        profile.veto_reason = "Fraude documentaire confirmée"
        profile.save(update_fields=["veto_active", "veto_reason"])
        profile = calculate_trust_score(self.user, TrustScoreProfile.Role.COURIER)
        self.assertLessEqual(float(profile.score), 39)
        self.assertEqual(profile.tier, TrustScoreProfile.Tier.NEW)

    @patch("apps.accounts.trust_score._vendor_observations")
    def test_vendor_confirmed_tier_requires_minimum_order_volume(self, observations):
        from .trust_score import Observation, calculate_trust_score

        vendor = User.objects.create_user("trust_vendor_volume", password=TEST_PASSWORD)
        high = [Observation(100, timezone.now()) for _ in range(20)]
        base_obs = {
            "punctuality": high, "quality": high, "satisfaction": high,
            "disputes": high, "documents": high, "seniority": high,
        }

        observations.return_value = {**base_obs, "__volume__": 3}
        profile = calculate_trust_score(vendor, TrustScoreProfile.Role.VENDOR)
        self.assertEqual(profile.tier, TrustScoreProfile.Tier.NEW)
        self.assertEqual(profile.candidate_tier, "")  # score haut mais volume < 10 : pas meme candidat

        observations.return_value = {**base_obs, "__volume__": 10}
        profile = calculate_trust_score(vendor, TrustScoreProfile.Role.VENDOR)
        self.assertEqual(profile.candidate_tier, TrustScoreProfile.Tier.CONFIRMED)

    @patch("apps.accounts.trust_score._vendor_observations")
    def test_vendor_gold_tier_requires_audit_passed(self, observations):
        from .trust_score import Observation, calculate_trust_score

        vendor = User.objects.create_user("trust_vendor_audit", password=TEST_PASSWORD)
        # 35 observations -> score ~88.9 : au-dessus du seuil Or (80) mais
        # sous le seuil Platine (90), pour isoler le blocage "audit requis".
        high = [Observation(100, timezone.now()) for _ in range(35)]

        def make_obs():
            # Nouveau dict a chaque appel : calculate_trust_score() fait
            # observations.pop("__volume__") sur ce qu'il recoit — reutiliser
            # le meme dict entre deux appels le viderait de sa cle volume.
            return {
                "punctuality": high, "quality": high, "satisfaction": high,
                "disputes": high, "documents": high, "seniority": high,
                "__volume__": 60,
            }

        observations.side_effect = lambda user: make_obs()

        profile = calculate_trust_score(vendor, TrustScoreProfile.Role.VENDOR)
        self.assertEqual(profile.candidate_tier, TrustScoreProfile.Tier.CONFIRMED)  # jamais Or sans audit

        profile.audit_passed = True
        profile.save(update_fields=["audit_passed"])
        profile = calculate_trust_score(vendor, TrustScoreProfile.Role.VENDOR)
        self.assertEqual(profile.candidate_tier, TrustScoreProfile.Tier.GOLD)


class TrustScoreCatastrophicVetoTests(APITestCase):
    """Hard filter V5.5 : une contrefaçon confirmée gèle le vendeur, quel que soit le reste."""

    def setUp(self):
        from apps.catalog.models import Category, Product
        from apps.orders.models import Dispute, Order, OrderItem

        self.vendor = User.objects.create_user("veto_vendor", password=TEST_PASSWORD)
        self.buyer = User.objects.create_user("veto_buyer", password=TEST_PASSWORD)
        category = Category.objects.create(name="Veto", slug="veto")
        product = Product.objects.create(
            title="Article veto", slug="article-veto", price_xaf=5000,
            category=category, vendor=self.vendor,
        )
        order = Order.objects.create(
            user=self.buyer, customer_phone="+237650000066", city="Yaoundé", address="Mvan",
            fulfillment_status=Order.FulfillmentStatus.DELIVERED, total_xaf=5000,
        )
        item = OrderItem.objects.create(
            order=order, product=product, title_snapshot=product.title,
            price_xaf_snapshot=5000, qty=1, line_total_xaf=5000,
        )
        self.dispute = Dispute.objects.create(
            order=order, order_item=item, product=product, vendor=self.vendor,
            opened_by=self.buyer, reason="COUNTERFEIT", description="Test",
        )

    def test_confirmed_counterfeit_triggers_veto(self):
        from .trust_score import apply_veto_for_catastrophic_dispute

        self.dispute.resolution = "REFUND"
        self.dispute.save(update_fields=["resolution"])

        apply_veto_for_catastrophic_dispute(self.dispute)

        profile = TrustScoreProfile.objects.get(user=self.vendor, role=TrustScoreProfile.Role.VENDOR)
        self.assertTrue(profile.veto_active)
        self.assertIn(str(self.dispute.id), profile.veto_reason)

    def test_rejected_counterfeit_dispute_does_not_trigger_veto(self):
        from .trust_score import apply_veto_for_catastrophic_dispute

        self.dispute.resolution = "REJECTED"
        self.dispute.save(update_fields=["resolution"])

        apply_veto_for_catastrophic_dispute(self.dispute)

        self.assertFalse(TrustScoreProfile.objects.filter(user=self.vendor, veto_active=True).exists())

    def test_non_counterfeit_reason_never_triggers_veto(self):
        from .trust_score import apply_veto_for_catastrophic_dispute

        self.dispute.reason = "DAMAGED"
        self.dispute.resolution = "REFUND"
        self.dispute.save(update_fields=["reason", "resolution"])

        apply_veto_for_catastrophic_dispute(self.dispute)

        self.assertFalse(TrustScoreProfile.objects.filter(user=self.vendor, veto_active=True).exists())


class EnterpriseTrustScoreRollupTests(APITestCase):
    """V5.5 : Trust_Ent = 0.8 x moyenne ponderee par volume + 0.2 x pire livreur."""

    def setUp(self):
        org_user = User.objects.create_user("rollup_org", password=TEST_PASSWORD)
        self.organization = DeliveryOrganizationProfile.objects.create(
            user=org_user, company_name="Rollup Logistics", phone="+237690300001",
            city="Yaounde", status=DeliveryOrganizationProfile.Status.APPROVED,
        )

    def _courier_with_score(self, username, score, volume):
        user = User.objects.create_user(username, password=TEST_PASSWORD)
        CourierProfile.objects.create(
            user=user, delivery_organization=self.organization, phone="+237690300002",
            city="Yaounde", id_card=f"CNI-{username}", is_active=True, is_approved=True,
        )
        TrustScoreProfile.objects.create(
            user=user, role=TrustScoreProfile.Role.COURIER, score=score, volume=volume,
        )
        return user

    def test_one_bad_courier_drags_the_whole_organization_down(self):
        from .trust_score import calculate_enterprise_trust_score

        self._courier_with_score("rollup_good_1", 90, 100)
        self._courier_with_score("rollup_good_2", 90, 100)
        self._courier_with_score("rollup_bad", 20, 5)

        result = calculate_enterprise_trust_score(self.organization)

        # Moyenne ponderee par volume (quasi 90, le mauvais pese peu) puis
        # 20% du pire (20) : le score entreprise reste net en dessous de 90.
        self.assertLess(result["score"], 85)
        self.assertEqual(result["worst_courier_score"], 20)
        self.assertEqual(result["sample_size"], 3)

    def test_no_active_couriers_returns_no_score(self):
        from .trust_score import calculate_enterprise_trust_score

        result = calculate_enterprise_trust_score(self.organization)

        self.assertIsNone(result["score"])
        self.assertEqual(result["sample_size"], 0)


class BuyerIFATests(APITestCase):
    """IFA acheteur (V5.5 §6) : indice interne, jamais un Trust Score public."""

    def setUp(self):
        self.buyer = User.objects.create_user("ifa_buyer", password=TEST_PASSWORD)

    def _order(self, *, status_, suffix, buyer=None):
        from apps.catalog.models import Category, Product
        from apps.orders.models import OrderItem

        category, _ = Category.objects.get_or_create(name="IFA", slug="ifa")
        vendor = User.objects.create_user(f"ifa_vendor_{suffix}", password=TEST_PASSWORD)
        product = Product.objects.create(
            title=f"Article IFA {suffix}", slug=f"article-ifa-{suffix}", price_xaf=5000,
            category=category, vendor=vendor,
        )
        order = Order.objects.create(
            user=buyer or self.buyer, customer_phone="+237650000077", city="Yaoundé", address="Mvan",
            fulfillment_status=status_, total_xaf=5000,
        )
        OrderItem.objects.create(
            order=order, product=product, title_snapshot=product.title,
            price_xaf_snapshot=5000, qty=1, line_total_xaf=5000,
        )
        return order

    def test_confirmed_orders_without_dispute_raise_ifa(self):
        from .trust_score import calculate_trust_score

        for i in range(12):
            self._order(status_=Order.FulfillmentStatus.BUYER_CONFIRMED, suffix=i)

        profile = calculate_trust_score(self.buyer, TrustScoreProfile.Role.BUYER)

        self.assertGreater(float(profile.score), 50.0)  # au-dessus du prior neutre
        self.assertEqual(profile.volume, 12)

    def test_rejected_dispute_drags_ifa_down(self):
        from apps.orders.models import Dispute

        from .trust_score import calculate_trust_score

        confirmed = [self._order(status_=Order.FulfillmentStatus.BUYER_CONFIRMED, suffix=i) for i in range(10)]
        for order in confirmed[:4]:
            Dispute.objects.create(
                order=order, order_item=order.items.first(), product=order.items.first().product,
                vendor=order.items.first().product.vendor, opened_by=self.buyer,
                reason="OTHER", description="Litige non fondé", resolution="REJECTED",
            )

        with_disputes = calculate_trust_score(self.buyer, TrustScoreProfile.Role.BUYER)

        # Les 4 commandes contestées par cet acheteur sortent du "confirmé
        # sans litige" ET ajoutent une observation à 0 chacune : score net
        # sous celui d'un acheteur sans aucun litige rejeté.
        clean_buyer = User.objects.create_user("ifa_buyer_clean", password=TEST_PASSWORD)
        for i in range(10):
            self._order(status_=Order.FulfillmentStatus.BUYER_CONFIRMED, suffix=f"clean-{i}", buyer=clean_buyer)
        clean_profile = calculate_trust_score(clean_buyer, TrustScoreProfile.Role.BUYER)

        self.assertLess(float(with_disputes.score), float(clean_profile.score))

    def test_ifa_has_no_tier_ladder_unlike_public_roles(self):
        from .trust_score import ROLE_TIER_RULES, calculate_trust_score

        # L'IFA reste un indice interne composite, jamais un Trust Score
        # public a paliers (Confirmé/Or/Platine) comme VENDOR/COURIER/RELAY_POINT.
        self.assertNotIn(TrustScoreProfile.Role.BUYER, ROLE_TIER_RULES)

        for i in range(12):
            self._order(status_=Order.FulfillmentStatus.BUYER_CONFIRMED, suffix=i)
        profile = calculate_trust_score(self.buyer, TrustScoreProfile.Role.BUYER)
        self.assertEqual(profile.tier, TrustScoreProfile.Tier.NEW)  # jamais promu, pas de palier defini


class SanctionsLadderTests(APITestCase):
    """Échelle de sanctions 1→4 complète (V5.5 §8)."""

    def setUp(self):
        self.user = User.objects.create_user("sanction_target", password=TEST_PASSWORD)
        CourierProfile.objects.create(
            user=self.user, phone="+237699000000", city="Douala", id_card="SANCTION-CNI-000",
            is_active=True, is_approved=True,
        )
        self.profile = TrustScoreProfile.objects.create(user=self.user, role=TrustScoreProfile.Role.COURIER)

    def test_level_1_warning_only_notifies_and_logs(self):
        from .models import SanctionRecord, UserNotification
        from .trust_score import apply_sanction

        record = apply_sanction(self.profile, TrustScoreProfile.SanctionLevel.WARNING, "Premier retard signalé.")

        self.profile.refresh_from_db()
        self.assertEqual(self.profile.sanction_level, TrustScoreProfile.SanctionLevel.NONE)  # aucun champ mécanique
        self.assertFalse(self.profile.veto_active)
        self.assertEqual(record.level, TrustScoreProfile.SanctionLevel.WARNING)
        self.assertTrue(UserNotification.objects.filter(user=self.user, message="Premier retard signalé.").exists())
        self.assertTrue(SanctionRecord.objects.filter(profile=self.profile, level=TrustScoreProfile.SanctionLevel.WARNING).exists())

    def test_level_2_throttling_sets_expiry_and_is_throttled_flag(self):
        from .trust_score import DEFAULT_THROTTLE_DAYS, apply_sanction

        apply_sanction(self.profile, TrustScoreProfile.SanctionLevel.THROTTLING, "Retards répétés.")

        self.profile.refresh_from_db()
        self.assertEqual(self.profile.sanction_level, TrustScoreProfile.SanctionLevel.THROTTLING)
        self.assertTrue(self.profile.is_throttled)
        self.assertAlmostEqual(
            (self.profile.throttled_until - timezone.now()).days, DEFAULT_THROTTLE_DAYS, delta=1,
        )
        self.assertFalse(self.profile.veto_active)  # dispatch réduit, pas de gel du compte

    def test_level_3_suspension_freezes_account(self):
        from .trust_score import apply_sanction

        apply_sanction(self.profile, TrustScoreProfile.SanctionLevel.SUSPENSION, "Litige grave — suspension 30 jours.")

        self.profile.refresh_from_db()
        self.assertEqual(self.profile.sanction_level, TrustScoreProfile.SanctionLevel.SUSPENSION)
        self.assertTrue(self.profile.veto_active)
        self.assertIsNotNone(self.profile.frozen_until)

    def test_level_4_ban_is_permanent_and_blacklists_identifiers(self):
        from .models import PartnerBlacklist
        from .trust_score import apply_sanction

        CourierProfile.objects.filter(user=self.user).update(phone="+237699000011", id_card="BAN-CNI-001")
        # La mise à jour ci-dessus passe par le SQL brut (update()) : elle ne
        # rafraîchit pas le cache Python de la relation inverse déjà posé sur
        # `self.user` par CourierProfile.objects.create(user=self.user, ...)
        # dans setUp — sans quoi `_blacklist_profile_identifiers` verrait
        # encore l'ancien id_card/phone.
        self.user.refresh_from_db()
        apply_sanction(self.profile, TrustScoreProfile.SanctionLevel.BAN, "Récidive grave — bannissement définitif.")

        self.profile.refresh_from_db()
        self.assertEqual(self.profile.sanction_level, TrustScoreProfile.SanctionLevel.BAN)
        self.assertTrue(self.profile.veto_active)
        self.assertIsNone(self.profile.frozen_until)  # jamais de levée automatique
        self.assertTrue(PartnerBlacklist.is_blacklisted(PartnerBlacklist.IdentifierType.CNI, "BAN-CNI-001"))
        self.assertTrue(PartnerBlacklist.is_blacklisted(PartnerBlacklist.IdentifierType.MOMO, "+237699000011"))

    def test_lift_expired_sanctions_resets_throttling(self):
        from .trust_score import apply_sanction, lift_expired_sanctions

        apply_sanction(self.profile, TrustScoreProfile.SanctionLevel.THROTTLING, "Test.", duration_days=1)
        self.profile.refresh_from_db()
        self.profile.throttled_until = timezone.now() - timezone.timedelta(hours=1)
        self.profile.save(update_fields=["throttled_until"])

        result = lift_expired_sanctions()

        self.profile.refresh_from_db()
        self.assertEqual(result["throttling_lifted"], 1)
        self.assertEqual(self.profile.sanction_level, TrustScoreProfile.SanctionLevel.NONE)
        self.assertIsNone(self.profile.throttled_until)

    def test_lift_expired_suspension_rehabilitates_via_re_cold_start(self):
        from .trust_score import PRIOR_SCORE, apply_sanction, lift_expired_sanctions

        self.profile.score = 39
        self.profile.tier = TrustScoreProfile.Tier.CONFIRMED
        self.profile.sample_size = 50
        self.profile.save(update_fields=["score", "tier", "sample_size"])
        apply_sanction(self.profile, TrustScoreProfile.SanctionLevel.SUSPENSION, "Test.", duration_days=1)
        self.profile.refresh_from_db()
        self.profile.frozen_until = timezone.now() - timezone.timedelta(hours=1)
        self.profile.save(update_fields=["frozen_until"])

        result = lift_expired_sanctions()

        self.profile.refresh_from_db()
        self.assertEqual(result["suspensions_lifted"], 1)
        self.assertEqual(self.profile.sanction_level, TrustScoreProfile.SanctionLevel.NONE)
        self.assertFalse(self.profile.veto_active)
        # Re-cold-start : jamais restauration du score gelé, repart neutre.
        self.assertEqual(float(self.profile.score), PRIOR_SCORE)
        self.assertEqual(self.profile.tier, TrustScoreProfile.Tier.NEW)
        self.assertEqual(self.profile.sample_size, 0)

    def test_level_4_ban_is_never_lifted(self):
        from .trust_score import apply_sanction, lift_expired_sanctions

        apply_sanction(self.profile, TrustScoreProfile.SanctionLevel.BAN, "Bannissement définitif.")
        result = lift_expired_sanctions()

        self.profile.refresh_from_db()
        self.assertEqual(result["suspensions_lifted"], 0)
        self.assertEqual(self.profile.sanction_level, TrustScoreProfile.SanctionLevel.BAN)


class SanctionEscalationTests(APITestCase):
    """Récidive après contrefaçon confirmée : suspension puis bannissement (V5.5 §8)."""

    def setUp(self):
        from apps.catalog.models import Category, Product
        from apps.orders.models import Dispute, OrderItem

        self.vendor = User.objects.create_user("escalation_vendor", password=TEST_PASSWORD)
        self.buyer = User.objects.create_user("escalation_buyer", password=TEST_PASSWORD)
        category = Category.objects.create(name="Escalation", slug="escalation")

        def make_dispute(suffix):
            product = Product.objects.create(
                title=f"Contrefaçon {suffix}", slug=f"contrefacon-{suffix}", price_xaf=5000,
                category=category, vendor=self.vendor,
            )
            order = Order.objects.create(
                user=self.buyer, customer_phone="+237650000088", city="Yaoundé", address="Mvan",
                fulfillment_status=Order.FulfillmentStatus.DELIVERED, total_xaf=5000,
            )
            item = OrderItem.objects.create(
                order=order, product=product, title_snapshot=product.title,
                price_xaf_snapshot=5000, qty=1, line_total_xaf=5000,
            )
            return Dispute.objects.create(
                order=order, order_item=item, product=product, vendor=self.vendor,
                opened_by=self.buyer, reason="COUNTERFEIT", description="Test",
                resolution="REFUND",
            )

        self.first_dispute = make_dispute("1")
        self.second_dispute = make_dispute("2")

    def test_first_offense_is_suspension_second_is_permanent_ban(self):
        from .trust_score import apply_veto_for_catastrophic_dispute

        apply_veto_for_catastrophic_dispute(self.first_dispute)
        profile = TrustScoreProfile.objects.get(user=self.vendor, role=TrustScoreProfile.Role.VENDOR)
        self.assertEqual(profile.sanction_level, TrustScoreProfile.SanctionLevel.SUSPENSION)
        self.assertIsNotNone(profile.frozen_until)

        apply_veto_for_catastrophic_dispute(self.second_dispute)
        profile.refresh_from_db()
        self.assertEqual(profile.sanction_level, TrustScoreProfile.SanctionLevel.BAN)
        self.assertIsNone(profile.frozen_until)

    def test_re_running_the_same_dispute_is_idempotent(self):
        from .models import SanctionRecord
        from .trust_score import apply_veto_for_catastrophic_dispute

        apply_veto_for_catastrophic_dispute(self.first_dispute)
        apply_veto_for_catastrophic_dispute(self.first_dispute)

        profile = TrustScoreProfile.objects.get(user=self.vendor, role=TrustScoreProfile.Role.VENDOR)
        self.assertEqual(SanctionRecord.objects.filter(profile=profile).count(), 1)
        self.assertEqual(profile.sanction_level, TrustScoreProfile.SanctionLevel.SUSPENSION)  # pas d'escalade fantôme


class AntiCollusionTests(APITestCase):
    """
    Anti-collusion sous anonymat (V5.5 §9) : détection de rings device/MoMo.

    La détection (`detect_self_dealing`, `scan_shared_momo_across_buyers`)
    lit les paiements réussis via `PaymentIntent.payer_msisdn_fingerprint`
    (apps.payments.intents) — c'est le seul chemin de création de paiement
    actif en production depuis la refonte du 12/08/2026 (`PaymentTransaction`
    est réduit en lecture seule, cf. apps/payments/urls.py). Ces tests
    créaient auparavant des `PaymentTransaction`, un modèle que la détection
    ne lit plus : les 3 tests positifs échouaient silencieusement en CI
    depuis leur ajout (04/09/2026), sans lien avec la production réelle.
    """

    def _create_succeeded_payment(self, order, payer_phone, amount_xaf=None):
        from apps.payments.bridge.intent_orders import link_orders
        from apps.payments.intents.models import PaymentIntent

        intent = PaymentIntent(
            buyer=order.user,
            idempotency_key=f"test-collusion-{uuid.uuid4()}",
            amount_xaf=amount_xaf or order.total_xaf,
            status=PaymentIntent.Status.SUCCEEDED,
        )
        intent.set_payer(payer_phone, "MTN")
        intent.save()
        link_orders(intent, [order])
        return intent

    def setUp(self):
        from apps.catalog.models import Category, Product
        from apps.orders.models import OrderItem
        from apps.vendors.models import VendorProfile

        self.buyer = User.objects.create_user("collusion_buyer", password=TEST_PASSWORD)
        self.vendor_user = User.objects.create_user("collusion_vendor", password=TEST_PASSWORD)
        VendorProfile.objects.create(
            user=self.vendor_user, business_name="Complice SARL", phone="+237699111111", city="Douala",
        )
        category = Category.objects.create(name="Collusion", slug="collusion")
        product = Product.objects.create(
            title="Article collusion", slug="article-collusion", price_xaf=8000,
            category=category, vendor=self.vendor_user,
        )
        self.order = Order.objects.create(
            user=self.buyer, customer_phone="+237699111111", city="Douala", address="Akwa",
            total_xaf=8000,
        )
        OrderItem.objects.create(
            order=self.order, product=product, title_snapshot=product.title,
            price_xaf_snapshot=8000, qty=1, line_total_xaf=8000,
        )

    def test_same_momo_number_as_buyer_and_vendor_is_detected(self):
        from .trust_score import detect_self_dealing

        self._create_succeeded_payment(self.order, "+237699111111")

        involved = detect_self_dealing(self.order)

        self.assertIn((TrustScoreProfile.Role.VENDOR, self.vendor_user.id), involved)

    def test_apply_collusion_veto_bans_buyer_and_vendor(self):
        from .trust_score import apply_collusion_veto_for_order

        self._create_succeeded_payment(self.order, "+237699111111")

        records = apply_collusion_veto_for_order(self.order)

        self.assertEqual(len(records), 2)
        buyer_profile = TrustScoreProfile.objects.get(user=self.buyer, role=TrustScoreProfile.Role.BUYER)
        vendor_profile = TrustScoreProfile.objects.get(user=self.vendor_user, role=TrustScoreProfile.Role.VENDOR)
        self.assertEqual(buyer_profile.sanction_level, TrustScoreProfile.SanctionLevel.BAN)
        self.assertEqual(vendor_profile.sanction_level, TrustScoreProfile.SanctionLevel.BAN)

    def test_different_payer_number_triggers_no_veto(self):
        from .trust_score import apply_collusion_veto_for_order

        self._create_succeeded_payment(self.order, "+237600000000")

        records = apply_collusion_veto_for_order(self.order)

        self.assertEqual(records, [])

    def test_shared_momo_across_three_buyers_flags_warning_only(self):
        from .trust_score import scan_shared_momo_across_buyers

        shared_phone = "+237677000000"
        for i in range(3):
            buyer = User.objects.create_user(f"shared_buyer_{i}", password=TEST_PASSWORD)
            order = Order.objects.create(
                user=buyer, customer_phone=shared_phone, city="Douala", address="Bonanjo", total_xaf=3000,
            )
            self._create_succeeded_payment(order, shared_phone, amount_xaf=3000)

        flagged = scan_shared_momo_across_buyers(min_accounts=3)

        self.assertEqual(len(flagged), 3)
        for record in flagged:
            self.assertEqual(record.level, TrustScoreProfile.SanctionLevel.WARNING)

    def test_two_buyers_sharing_a_phone_is_not_flagged(self):
        from .trust_score import scan_shared_momo_across_buyers

        shared_phone = "+237677111111"
        for i in range(2):
            buyer = User.objects.create_user(f"family_buyer_{i}", password=TEST_PASSWORD)
            order = Order.objects.create(
                user=buyer, customer_phone=shared_phone, city="Douala", address="Bonanjo", total_xaf=3000,
            )
            self._create_succeeded_payment(order, shared_phone, amount_xaf=3000)

        flagged = scan_shared_momo_across_buyers(min_accounts=3)

        self.assertEqual(flagged, [])


class BlacklistEnforcementTests(APITestCase):
    """
    Bannissement niveau 4 (V5.5 §8) : une CNI ou un numéro Mobile Money
    bloqué ne doit pas pouvoir revenir sous un nouveau compte, aux deux
    points d'entrée en libre-service (candidature vendeur / candidature livreur).
    """

    def setUp(self):
        from .models import PartnerBlacklist

        PartnerBlacklist.objects.create(
            identifier_type=PartnerBlacklist.IdentifierType.CNI,
            identifier_hash=PartnerBlacklist.hash_identifier("BLACKLISTED-CNI-999"),
            reason="Test — bannissement.",
        )
        PartnerBlacklist.objects.create(
            identifier_type=PartnerBlacklist.IdentifierType.MOMO,
            identifier_hash=PartnerBlacklist.hash_identifier("+237600999999"),
            reason="Test — bannissement.",
        )

    def test_vendor_application_rejects_blacklisted_id_document(self):
        from django.urls import reverse

        user = User.objects.create_user("blacklist_vendor_cni", password=TEST_PASSWORD)
        self.client.force_authenticate(user)

        response = self.client.post(reverse("vendors:apply-vendor"), {
            "business_name": "Boutique Test", "business_description": "Description test",
            "phone": "+237611111111", "address": "Akwa", "city": "Douala",
            "id_document": "BLACKLISTED-CNI-999",
        })

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_vendor_application_rejects_blacklisted_momo_number(self):
        from django.urls import reverse

        user = User.objects.create_user("blacklist_vendor_momo", password=TEST_PASSWORD)
        self.client.force_authenticate(user)

        response = self.client.post(reverse("vendors:apply-vendor"), {
            "business_name": "Boutique Test", "business_description": "Description test",
            "phone": "+237600999999", "address": "Akwa", "city": "Douala",
            "id_document": "CNI-PROPRE-001",
        })

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_vendor_application_with_clean_identifiers_still_succeeds(self):
        from django.urls import reverse

        user = User.objects.create_user("clean_vendor", password=TEST_PASSWORD)
        self.client.force_authenticate(user)

        response = self.client.post(reverse("vendors:apply-vendor"), {
            "business_name": "Boutique Propre", "business_description": "Description test",
            "phone": "+237622222222", "address": "Bonanjo", "city": "Douala",
            "id_document": "CNI-PROPRE-002",
        })

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_courier_application_rejects_blacklisted_id_card(self):
        from django.urls import reverse

        user = User.objects.create_user("blacklist_courier_cni", password=TEST_PASSWORD)
        self.client.force_authenticate(user)

        response = self.client.post(reverse("courier-application"), {
            "phone": "+237633333333", "city": "Douala", "zones": ["Douala"],
            "vehicle_type": "MOTORBIKE", "id_card": "BLACKLISTED-CNI-999",
        })

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_courier_application_rejects_blacklisted_momo_number(self):
        from django.urls import reverse

        user = User.objects.create_user("blacklist_courier_momo", password=TEST_PASSWORD)
        self.client.force_authenticate(user)

        response = self.client.post(reverse("courier-application"), {
            "phone": "+237600999999", "city": "Douala", "zones": ["Douala"],
            "vehicle_type": "MOTORBIKE", "id_card": "CNI-PROPRE-003",
        })

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_courier_application_with_clean_identifiers_still_succeeds(self):
        from django.urls import reverse

        user = User.objects.create_user("clean_courier", password=TEST_PASSWORD)
        self.client.force_authenticate(user)

        response = self.client.post(reverse("courier-application"), {
            "phone": "+237644444444", "city": "Douala", "zones": ["Douala"],
            "vehicle_type": "MOTORBIKE", "id_card": "CNI-PROPRE-004",
        })

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_admin_cannot_create_a_delivery_org_with_a_blacklisted_momo_number(self):
        from django.urls import reverse

        admin = User.objects.create_superuser("blacklist_admin", password=TEST_PASSWORD)
        self.client.force_authenticate(admin)

        response = self.client.post(reverse("auth-admin-create-user"), {
            "role": "delivery_org", "username": "org_blacklisted", "password": "pass12345",
            "phone": "+237600999999", "company_name": "Org Bloquee", "city": "Douala",
        })

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(User.objects.filter(username="org_blacklisted").exists())


class AppReleaseEndpointTests(APITestCase):
    """
    Distribution des applis partenaires hors Play Store : le portail web lit
    cet endpoint pour afficher le bouton de téléchargement de l'APK.
    """

    def setUp(self):
        from .models import AppRelease

        self.AppRelease = AppRelease
        self.user = User.objects.create_user("app_release_user", password=TEST_PASSWORD)
        self.client.force_authenticate(self.user)

    def test_returns_the_configured_release_for_a_portal(self):
        from django.urls import reverse

        self.AppRelease.objects.create(
            portal=self.AppRelease.Portal.VENDOR, version="1.2.0",
            apk_url="https://belivay.com/downloads/vendeur.apk",
        )

        response = self.client.get(reverse("app-release-latest"), {"portal": "vendor"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["version"], "1.2.0")
        self.assertEqual(response.data["apk_url"], "https://belivay.com/downloads/vendeur.apk")

    def test_returns_404_when_no_release_configured_yet(self):
        from django.urls import reverse

        response = self.client.get(reverse("app-release-latest"), {"portal": "courier"})

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_rejects_an_unknown_portal(self):
        from django.urls import reverse

        response = self.client.get(reverse("app-release-latest"), {"portal": "not-a-real-portal"})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_requires_authentication(self):
        from django.urls import reverse

        self.client.force_authenticate(None)
        response = self.client.get(reverse("app-release-latest"), {"portal": "vendor"})

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class AccountDeletionTests(APITestCase):
    endpoint = "/api/auth/me/"

    def setUp(self):
        self.user = User.objects.create_user(
            username="client_delete", email="client.delete@example.com",
            password="Secret-pass-123", first_name="Awa", last_name="Client",
        )
        UserProfile.objects.create(user=self.user, phone="+237650000099", bio="bio")
        self.client.force_authenticate(self.user)

    def test_wrong_password_is_rejected(self):
        response = self.client.delete(self.endpoint, {"password": "wrong"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.user.refresh_from_db()
        self.assertTrue(self.user.is_active)

    def test_deletion_anonymizes_and_deactivates_but_keeps_orders(self):
        order = Order.objects.create(
            user=self.user, customer_email="client.delete@example.com", customer_phone="+237650000099",
            city="Yaoundé", address="Mvan", fulfillment_status=Order.FulfillmentStatus.BUYER_CONFIRMED,
            total_xaf=5000,
        )

        response = self.client.delete(self.endpoint, {"password": "Secret-pass-123"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.user.refresh_from_db()
        self.assertFalse(self.user.is_active)
        self.assertEqual(self.user.email, "")
        self.assertEqual(self.user.first_name, "")
        self.assertTrue(self.user.username.startswith("deleted_"))
        self.assertFalse(self.user.has_usable_password())
        self.assertIsNone(self.user.profile.phone)
        order.refresh_from_db()
        self.assertEqual(order.user_id, self.user.id)
        self.assertIsNone(order.customer_email)
        self.assertEqual(order.customer_phone, "")
        self.assertEqual(order.address, "")
        self.assertEqual(order.total_xaf, 5000)

    def test_deletion_is_blocked_while_an_order_is_in_progress(self):
        Order.objects.create(
            user=self.user, customer_phone="+237650000099", city="Yaoundé", address="Mvan",
            fulfillment_status=Order.FulfillmentStatus.OUT_FOR_DELIVERY, total_xaf=5000,
        )

        response = self.client.delete(self.endpoint, {"password": "Secret-pass-123"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.user.refresh_from_db()
        self.assertTrue(self.user.is_active)

    def test_social_account_confirms_without_password(self):
        self.user.set_unusable_password()
        self.user.save()

        self.assertEqual(self.client.delete(self.endpoint, {}, format="json").status_code, status.HTTP_400_BAD_REQUEST)
        response = self.client.delete(self.endpoint, {"confirm": "SUPPRIMER"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.user.refresh_from_db()
        self.assertFalse(self.user.is_active)

    @override_settings(APPLE_TEAM_ID="TEAM", APPLE_KEY_ID="KEY", APPLE_PRIVATE_KEY="dummy")
    @patch("apps.accounts.apple.revoke_token")
    def test_apple_authorization_is_revoked(self, revoke):
        from . import apple
        from .models import AppleIdentity

        AppleIdentity.objects.create(
            user=self.user, subject="apple-sub", client_id="com.belivay.client",
            refresh_token_encrypted=apple.encrypt_token("apple-refresh"),
        )

        response = self.client.delete(self.endpoint, {"password": "Secret-pass-123"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        revoke.assert_called_once_with("apple-refresh", "com.belivay.client")
        self.assertFalse(AppleIdentity.objects.filter(user=self.user).exists())

    def test_deleted_account_can_no_longer_log_in(self):
        self.client.delete(self.endpoint, {"password": "Secret-pass-123"}, format="json")
        self.client.force_authenticate(None)

        response = self.client.post(
            "/api/auth/login/", {"username": "client_delete", "password": "Secret-pass-123"}, format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class RelayNotificationPreferencesTests(APITestCase):
    """
    Les reglages de notification du comptoir.

    Ce que ces tests tiennent : un reglage qui ne se souvient pas est pire
    qu'un reglage absent, parce que le gerant croit l'avoir pose. Et la
    reponse doit dire ce qui est REELLEMENT applique, sans quoi l'ecran
    promettrait un telephone qui sonne alors qu'aucun canal n'existe.
    """

    def setUp(self):
        self.url = reverse("relay-point-notification-preferences")
        self.relay_user = User.objects.create_user("prefs_relay", password="Relay2026")
        RelayPointProfile.objects.create(
            user=self.relay_user,
            name="Relais Preferences",
            phone="+237690500001",
            city="Yaounde",
            status=RelayPointProfile.Status.APPROVED,
            is_active=True,
        )
        self.autre = User.objects.create_user("prefs_autre", password="Client2026")

    def test_valeurs_par_defaut_a_la_premiere_lecture(self):
        """La premiere ouverture cree les preferences, elle n'echoue pas."""
        self.client.force_authenticate(self.relay_user)
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["push_enabled"])
        self.assertEqual(response.data["digest_hour"], 7)
        self.assertEqual(response.data["quiet_from_hour"], 22)

    def test_reglage_modifie_est_conserve(self):
        self.client.force_authenticate(self.relay_user)
        self.client.patch(self.url, {"push_enabled": False, "digest_hour": 9}, format="json")

        relu = self.client.get(self.url)

        self.assertFalse(relu.data["push_enabled"])
        self.assertEqual(relu.data["digest_hour"], 9)
        # Les reglages non touches ne bougent pas.
        self.assertTrue(relu.data["settlements"])

    def test_resume_refuse_avant_sept_heures(self):
        """
        Un relais ouvre rarement avant 7 h.

        Une alerte a 5 h du matin est une alerte qu'on apprend a ignorer —
        et c'est toute la chaine de notification qui perd sa credibilite.
        """
        self.client.force_authenticate(self.relay_user)
        response = self.client.patch(self.url, {"digest_hour": 5}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("digest_hour", response.data)
        self.assertEqual(self.client.get(self.url).data["digest_hour"], 7)

    def test_heure_hors_cadran_refusee(self):
        self.client.force_authenticate(self.relay_user)
        response = self.client.patch(self.url, {"quiet_from_hour": 26}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_heure_non_numerique_refusee(self):
        self.client.force_authenticate(self.relay_user)
        response = self.client.patch(self.url, {"digest_hour": "sept"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_requete_sans_reglage_connu_refusee(self):
        self.client.force_authenticate(self.relay_user)
        response = self.client.patch(self.url, {"couleur": "bleu"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_reponse_annonce_ce_qui_est_applique(self):
        """
        `honored` est vide tant qu'aucun canal n'existe.

        Le portail s'en sert pour avertir le gerant. Le jour ou un canal
        arrive, il s'ajoute a cette liste et l'avertissement disparait tout
        seul — ce test tombera alors, et c'est le signal attendu.
        """
        self.client.force_authenticate(self.relay_user)
        response = self.client.get(self.url)
        self.assertEqual(response.data["honored"], [])

    def test_preferences_privees_a_chaque_relais(self):
        self.client.force_authenticate(self.relay_user)
        self.client.patch(self.url, {"push_enabled": False}, format="json")

        voisin = User.objects.create_user("prefs_voisin", password="Relay2026")
        RelayPointProfile.objects.create(
            user=voisin,
            name="Relais Voisin",
            phone="+237690500002",
            city="Yaounde",
            status=RelayPointProfile.Status.APPROVED,
            is_active=True,
        )
        self.client.force_authenticate(voisin)

        self.assertTrue(self.client.get(self.url).data["push_enabled"])

    def test_compte_non_relais_refuse(self):
        self.client.force_authenticate(self.autre)
        self.assertEqual(self.client.get(self.url).status_code, status.HTTP_403_FORBIDDEN)

class RelayTeamTests(APITestCase):
    """
    Le registre des personnes autorisees au guichet.

    Ce que ces tests tiennent : la limite de trois, l'impossibilite de
    retirer le responsable, et surtout le drapeau `enforced`. Ce dernier dit
    au portail que les permissions ne sont PAS appliquees a l'acces — le
    taire ferait partager l'identifiant du relais a la legere.
    """

    def setUp(self):
        from .models import RelayEmployee
        self.RelayEmployee = RelayEmployee
        self.url = reverse("relay-point-team")
        self.relay_user = User.objects.create_user("equipe_relay", password="Relay2026")
        self.relay_point = RelayPointProfile.objects.create(
            user=self.relay_user,
            name="Relais Equipe",
            phone="+237690600001",
            city="Yaounde",
            status=RelayPointProfile.Status.APPROVED,
            is_active=True,
        )
        self.autre = User.objects.create_user("equipe_autre", password="Client2026")

    def _ajouter(self, nom):
        return self.client.post(self.url, {"display_name": nom}, format="json")

    def test_equipe_vide_au_depart(self):
        self.client.force_authenticate(self.relay_user)
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["members"], [])
        self.assertEqual(response.data["active_count"], 0)
        self.assertEqual(response.data["max_active"], 3)

    def test_ajout_ouvre_le_comptoir_pas_l_argent(self):
        """
        Un employe recoit et remet par defaut ; l'argent et les reglages
        restent fermes. On OUVRE un acces, on ne le referme pas apres coup.
        """
        self.client.force_authenticate(self.relay_user)
        response = self._ajouter("Aicha N.")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data["can_receive"])
        self.assertTrue(response.data["can_hand_over"])
        self.assertFalse(response.data["can_money"])
        self.assertFalse(response.data["can_settings"])

    def test_nom_vide_refuse(self):
        self.client.force_authenticate(self.relay_user)
        self.assertEqual(self._ajouter("   ").status_code, status.HTTP_400_BAD_REQUEST)

    def test_quatrieme_personne_refusee(self):
        self.client.force_authenticate(self.relay_user)
        for nom in ("Un", "Deux", "Trois"):
            self.assertEqual(self._ajouter(nom).status_code, status.HTTP_201_CREATED)

        response = self._ajouter("Quatre")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(self.client.get(self.url).data["active_count"], 3)

    def test_retirer_un_acces_libere_une_place(self):
        """La limite porte sur les ACTIFS : un depart libere une place."""
        self.client.force_authenticate(self.relay_user)
        ids = [self._ajouter(nom).data["id"] for nom in ("Un", "Deux", "Trois")]

        self.client.patch(self.url, {"id": ids[0], "is_active": False}, format="json")
        response = self._ajouter("Quatre")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        # Le partant reste au registre : son passage ne s'efface pas.
        self.assertEqual(len(self.client.get(self.url).data["members"]), 4)
        self.assertEqual(self.client.get(self.url).data["active_count"], 3)

    def test_reactivation_refusee_si_le_comptoir_est_plein(self):
        self.client.force_authenticate(self.relay_user)
        ids = [self._ajouter(nom).data["id"] for nom in ("Un", "Deux", "Trois")]
        self.client.patch(self.url, {"id": ids[0], "is_active": False}, format="json")
        self._ajouter("Quatre")

        response = self.client.patch(self.url, {"id": ids[0], "is_active": True}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_responsable_non_desactivable(self):
        """Un relais sans responsable n'a plus personne pour repondre."""
        proprietaire = self.RelayEmployee.objects.create(
            relay_point=self.relay_point,
            display_name="Franck Penga",
            role=self.RelayEmployee.Role.OWNER,
        )
        self.client.force_authenticate(self.relay_user)

        response = self.client.patch(
            self.url, {"id": proprietaire.id, "is_active": False}, format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        proprietaire.refresh_from_db()
        self.assertTrue(proprietaire.is_active)

    def test_permissions_modifiables(self):
        self.client.force_authenticate(self.relay_user)
        membre_id = self._ajouter("Aicha N.").data["id"]

        response = self.client.patch(
            self.url, {"id": membre_id, "can_money": True}, format="json",
        )

        self.assertTrue(response.data["can_money"])

    def test_equipe_d_un_autre_relais_inaccessible(self):
        voisin_user = User.objects.create_user("equipe_voisin", password="Relay2026")
        voisin = RelayPointProfile.objects.create(
            user=voisin_user,
            name="Relais Voisin",
            phone="+237690600002",
            city="Yaounde",
            status=RelayPointProfile.Status.APPROVED,
            is_active=True,
        )
        etranger = self.RelayEmployee.objects.create(
            relay_point=voisin, display_name="Chez le voisin",
        )

        self.client.force_authenticate(self.relay_user)
        response = self.client.patch(
            self.url, {"id": etranger.id, "can_money": True}, format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_permissions_annoncees_comme_non_appliquees(self):
        """
        `enforced` est faux tant qu'aucune authentification par personne
        n'existe : un relais, un compte.

        Ce test tombera le jour ou chaque employe se connectera vraiment —
        et c'est le signal attendu pour retirer l'avertissement du portail.
        """
        self.client.force_authenticate(self.relay_user)
        self.assertFalse(self.client.get(self.url).data["enforced"])

    def test_compte_non_relais_refuse(self):
        self.client.force_authenticate(self.autre)
        self.assertEqual(self.client.get(self.url).status_code, status.HTTP_403_FORBIDDEN)

class RelayAccessPinTests(APITestCase):
    """
    La connexion par PIN du portail point relais.

    Quatre chiffres ne valent que par ce qui les entoure. Ces tests tiennent
    exactement cela : le PIN ne s'etablit que contre un code valide, il est
    hache, cinq echecs ferment la porte, et aucune reponse ne dit a un
    inconnu si un numero appartient a un relais.
    """

    def setUp(self):
        from .models import RelayAccessPin
        self.RelayAccessPin = RelayAccessPin
        self.url_code = reverse("relay-pin-request-code")
        self.url_set = reverse("relay-pin-set")
        self.url_login = reverse("relay-pin-login")
        self.url_status = reverse("relay-pin-status")

        self.phone = "+237691248350"
        self.user = User.objects.create_user(
            "pin_relay", email="pin.relay@example.com", password="Relay2026",
            first_name="Franck",
        )
        RelayPointProfile.objects.create(
            user=self.user,
            name="Relais PIN",
            phone=self.phone,
            city="Yaounde",
            status=RelayPointProfile.Status.APPROVED,
            is_active=True,
        )

    def _poser_pin(self, pin="1974"):
        acces, _ = self.RelayAccessPin.objects.get_or_create(user=self.user, defaults={"pin_hash": ""})
        acces.set_pin(pin)
        acces.save()
        return acces

    # ── Format ──────────────────────────────────────────────────────────────

    def test_pin_faible_refuse(self):
        """
        « 1111 » et « 1234 » se devinent avant d'etre attaques.

        Les refuser a la source coute une seconde au gerant, et retire les
        deux premiers essais de quiconque tente sa chance au comptoir.
        """
        for faible in ("1111", "0000", "1234", "4321"):
            self.assertFalse(self.RelayAccessPin.valide_format(faible), faible)
        for correct in ("1974", "2608", "9513"):
            self.assertTrue(self.RelayAccessPin.valide_format(correct), correct)

    def test_longueur_et_chiffres_exiges(self):
        for mauvais in ("", "123", "12345", "12a4", "    "):
            self.assertFalse(self.RelayAccessPin.valide_format(mauvais), repr(mauvais))

    def test_pin_jamais_stocke_en_clair(self):
        acces = self._poser_pin("1974")
        self.assertNotIn("1974", acces.pin_hash)
        self.assertTrue(len(acces.pin_hash) > 20)

    # ── Mise en place ───────────────────────────────────────────────────────

    def test_pin_refuse_sans_code_valide(self):
        """Le code OTP est la seule porte : sans lui, pas de PIN."""
        response = self.client.post(
            self.url_set, {"phone": self.phone, "code": "000000", "pin": "1974"}, format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(self.RelayAccessPin.objects.filter(user=self.user).exists())

    def test_pin_pose_avec_un_code_valide(self):
        from .models import OTPCode
        OTPCode.objects.create(
            user=self.user, code="123456", purpose="2FA_LOGIN",
            expires_at=timezone.now() + timezone.timedelta(minutes=10),
        )

        response = self.client.post(
            self.url_set, {"phone": self.phone, "code": "123456", "pin": "1974"}, format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertTrue(self.RelayAccessPin.objects.get(user=self.user).check_pin("1974"))

    def test_code_a_usage_unique(self):
        """Un code qui resservirait laisserait reposer le PIN a volonte."""
        from .models import OTPCode
        OTPCode.objects.create(
            user=self.user, code="123456", purpose="2FA_LOGIN",
            expires_at=timezone.now() + timezone.timedelta(minutes=10),
        )
        self.client.post(
            self.url_set, {"phone": self.phone, "code": "123456", "pin": "1974"}, format="json",
        )

        rejoue = self.client.post(
            self.url_set, {"phone": self.phone, "code": "123456", "pin": "8520"}, format="json",
        )

        self.assertEqual(rejoue.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(self.RelayAccessPin.objects.get(user=self.user).check_pin("1974"))

    def test_code_expire_refuse(self):
        from .models import OTPCode
        OTPCode.objects.create(
            user=self.user, code="123456", purpose="2FA_LOGIN",
            expires_at=timezone.now() - timezone.timedelta(minutes=1),
        )

        response = self.client.post(
            self.url_set, {"phone": self.phone, "code": "123456", "pin": "1974"}, format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # ── Connexion ───────────────────────────────────────────────────────────

    def test_connexion_rend_un_jeton(self):
        self._poser_pin("1974")

        response = self.client.post(
            self.url_login, {"phone": self.phone, "pin": "1974"}, format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertIn("access", response.data)
        self.assertEqual(response.data["first_name"], "Franck")

    def test_mauvais_pin_refuse_et_compte(self):
        self._poser_pin("1974")

        response = self.client.post(
            self.url_login, {"phone": self.phone, "pin": "8520"}, format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(response.data["attempts_left"], 4)

    def test_cinq_echecs_ferment_trente_minutes(self):
        """
        Le compteur est tenu par le SERVEUR.

        Un compteur cote ecran ne protege de rien : il suffit d'appeler
        l'API directement. Quatre chiffres tombent alors en quelques
        milliers d'essais.
        """
        self._poser_pin("1974")
        for _ in range(5):
            self.client.post(self.url_login, {"phone": self.phone, "pin": "8520"}, format="json")

        # Meme le BON code est refuse pendant le blocage.
        response = self.client.post(
            self.url_login, {"phone": self.phone, "pin": "1974"}, format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
        self.assertEqual(response.data["locked_minutes"], self.RelayAccessPin.LOCK_MINUTES)

    def test_compteur_remis_a_zero_seulement_sur_succes(self):
        """
        Le vider a l'expiration du blocage offrirait cinq essais toutes les
        trente minutes, indefiniment.
        """
        acces = self._poser_pin("1974")
        for _ in range(3):
            self.client.post(self.url_login, {"phone": self.phone, "pin": "8520"}, format="json")
        acces.refresh_from_db()
        self.assertEqual(acces.failed_attempts, 3)

        self.client.post(self.url_login, {"phone": self.phone, "pin": "1974"}, format="json")

        acces.refresh_from_db()
        self.assertEqual(acces.failed_attempts, 0)

    def test_numero_inconnu_repond_comme_un_mauvais_pin(self):
        """Separer les deux indiquerait ou insister."""
        self._poser_pin("1974")

        inconnu = self.client.post(
            self.url_login, {"phone": "+237600000000", "pin": "1974"}, format="json",
        )

        self.assertEqual(inconnu.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertNotIn("attempts_left", inconnu.data)

    def test_compte_sans_relais_refuse(self):
        """Un PIN relais n'ouvre que le portail relais."""
        autre = User.objects.create_user("pin_client", password="Client2026")
        from .models import RelayAccessPin
        acces = RelayAccessPin(user=autre)
        acces.set_pin("1974")
        acces.save()

        response = self.client.post(
            self.url_login, {"phone": autre.username, "pin": "1974"}, format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    # ── Envoi du code, et enumeration ───────────────────────────────────────

    def test_envoi_de_code_ne_revele_pas_les_numeros(self):
        """
        Repondre 404 sur un numero inconnu ferait de cet endpoint un
        annuaire des points relais : il suffirait de balayer les numeros.
        """
        connu = self.client.post(self.url_code, {"phone": self.phone}, format="json")
        inconnu = self.client.post(self.url_code, {"phone": "+237600000000"}, format="json")

        self.assertEqual(connu.status_code, status.HTTP_200_OK)
        self.assertEqual(inconnu.status_code, status.HTTP_200_OK)
        self.assertEqual(connu.data["detail"], inconnu.data["detail"])

    def test_canal_annonce_est_l_email(self):
        """
        La maquette annonce un SMS. Aucun envoi SMS n'existe.

        Ce test tombera le jour ou un fournisseur sera branche — et c'est
        le signal attendu pour changer le texte des ecrans.
        """
        response = self.client.post(self.url_code, {"phone": self.phone}, format="json")
        self.assertEqual(response.data["channel"], "email")

    def test_statut_oriente_l_ecran(self):
        sans = self.client.get(self.url_status, {"phone": self.phone})
        self.assertFalse(sans.data["has_pin"])
        self.assertEqual(sans.data["first_name"], "")

        self._poser_pin("1974")
        avec = self.client.get(self.url_status, {"phone": self.phone})

        self.assertTrue(avec.data["has_pin"])
        self.assertEqual(avec.data["first_name"], "Franck")
        self.assertEqual(avec.data["max_attempts"], 5)
        self.assertEqual(avec.data["lock_minutes"], 30)
