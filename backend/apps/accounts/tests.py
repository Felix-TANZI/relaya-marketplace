from unittest.mock import patch

from django.contrib.auth.models import User
from django.test import override_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from .models import CourierProfile, TrustScoreProfile, UserProfile


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
            password="Existing2026",
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
            "password": "ClientSolide2026!",
            "password2": "ClientSolide2026!",
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


class TrustScoreV54Tests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user("trust_courier", password="Trust2026!")
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

        high = [Observation(100, timezone.now()) for _ in range(30)]
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
