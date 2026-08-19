from __future__ import annotations

import math
from collections import defaultdict
from dataclasses import dataclass
from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from apps.orders.models import Dispute, Order, OrderHistory
from apps.shipping.models import RelayParcel, Shipment, ShipmentEvidence

from .models import CourierProfile, RelayPointProfile, TrustScoreProfile


WEIGHTS = {
    TrustScoreProfile.Role.VENDOR: {
        "punctuality": 25,
        "quality": 20,
        "satisfaction": 20,
        "disputes": 15,
        "documents": 10,
        "seniority": 10,
    },
    TrustScoreProfile.Role.COURIER: {
        "punctuality": 30,
        "quality": 25,
        "disputes": 20,
        "seniority": 15,
        "training": 10,
    },
    TrustScoreProfile.Role.RELAY_POINT: {
        "punctuality": 25,
        "security": 25,
        "satisfaction": 20,
        "disputes": 15,
        "seniority": 15,
    },
}

HALF_LIFE_DAYS = 90
PRIOR_SCORE = 70.0
PRIOR_WEIGHT = 5.0
TIER_CONFIRM_THRESHOLD = 70.0
TIER_GOLD_THRESHOLD = 85.0
HYSTERESIS_POINTS = 5.0
HYSTERESIS_DAYS = 14


@dataclass(frozen=True)
class Observation:
    value: float
    occurred_at: object


def _decay(occurred_at) -> float:
    if not occurred_at:
        return 1.0
    age_days = max(0.0, (timezone.now() - occurred_at).total_seconds() / 86400)
    return math.exp(-math.log(2) * age_days / HALF_LIFE_DAYS)


def _bayesian_score(observations: list[Observation]) -> float:
    if not observations:
        return PRIOR_SCORE
    weighted_sum = PRIOR_SCORE * PRIOR_WEIGHT
    total_weight = PRIOR_WEIGHT
    for observation in observations:
        weight = _decay(observation.occurred_at)
        weighted_sum += max(0.0, min(100.0, observation.value)) * weight
        total_weight += weight
    return weighted_sum / total_weight


def _wilson_satisfaction(observations: list[Observation]) -> float:
    if not observations:
        return PRIOR_SCORE
    # Prior modéré 18/20 : évite qu'un nouvel acteur soit écrasé par un seul avis.
    positive = 18.0
    total = 20.0
    for observation in observations:
        weight = _decay(observation.occurred_at)
        total += weight
        if observation.value >= 80:
            positive += weight
    ratio = positive / total
    z = 1.96
    denominator = 1 + (z * z / total)
    centre = ratio + (z * z / (2 * total))
    margin = z * math.sqrt((ratio * (1 - ratio) + z * z / (4 * total)) / total)
    return max(0.0, min(100.0, ((centre - margin) / denominator) * 100))


def _seniority_observation(user) -> Observation:
    days = max(0, (timezone.now() - user.date_joined).days)
    return Observation(min(100.0, 50.0 + days * 50.0 / 365.0), timezone.now())


def _dispute_observations(shipments, disputes) -> list[Observation]:
    values = [Observation(100.0, shipment.updated_at) for shipment in shipments]
    values.extend(Observation(0.0, dispute.created_at) for dispute in disputes)
    return values


def _vendor_observations(user) -> dict[str, list[Observation]]:
    from apps.catalog.models import ProductReview

    orders = Order.objects.filter(items__product__vendor=user).distinct()
    delivered = orders.filter(
        fulfillment_status__in=[
            Order.FulfillmentStatus.DELIVERED,
            Order.FulfillmentStatus.BUYER_CONFIRMED,
            Order.FulfillmentStatus.AUTO_CONFIRMED,
            Order.FulfillmentStatus.RELEASED_TO_VENDOR,
        ]
    )
    punctuality = []
    for order in orders.exclude(vendor_reply_deadline__isnull=True):
        ready_event = OrderHistory.objects.filter(
            order=order,
            new_value=Order.FulfillmentStatus.READY_FOR_PICKUP,
        ).order_by("timestamp").first()
        if ready_event:
            punctuality.append(Observation(100 if ready_event.timestamp <= order.vendor_reply_deadline else 0, ready_event.timestamp))

    reviews = ProductReview.objects.filter(product__vendor=user, is_approved=True)
    review_observations = [Observation(review.rating * 20, review.created_at) for review in reviews]
    disputes = Dispute.objects.filter(vendor=user)
    profile = getattr(user, "vendor_profile", None)
    docs_value = 100 if profile and str(profile.status).lower() == "approved" else 40
    return {
        "punctuality": punctuality,
        "quality": review_observations,
        "satisfaction": review_observations,
        "disputes": _dispute_observations(list(delivered), list(disputes)),
        "documents": [Observation(docs_value, timezone.now())],
        "seniority": [_seniority_observation(user)],
    }


def _courier_observations(user) -> dict[str, list[Observation]]:
    courier = CourierProfile.objects.get(user=user)
    shipments = list(Shipment.objects.filter(courier=courier).prefetch_related("events"))
    completed = [item for item in shipments if item.status in [Shipment.Status.DELIVERED, Shipment.Status.FAILED]]
    punctuality = []
    for shipment in completed:
        pickup = next((event for event in shipment.events.all() if event.status == Shipment.Status.PICKED_UP), None)
        delivered = next((event for event in shipment.events.all() if event.status == Shipment.Status.DELIVERED), None)
        if pickup and delivered:
            hours = (delivered.created_at - pickup.created_at).total_seconds() / 3600
            punctuality.append(Observation(100 if hours <= 24 else max(0, 100 - (hours - 24) * 5), delivered.created_at))
    disputes = list(Dispute.objects.filter(order__shipment__courier=courier).distinct())
    return {
        "punctuality": punctuality,
        "quality": [Observation(100 if item.status == Shipment.Status.DELIVERED else 0, item.updated_at) for item in completed],
        "disputes": _dispute_observations(completed, disputes),
        "seniority": [_seniority_observation(user)],
        "training": [Observation(100 if courier.is_approved else 0, courier.updated_at)],
    }


def _relay_observations(user) -> dict[str, list[Observation]]:
    relay = RelayPointProfile.objects.get(user=user)
    parcels = list(RelayParcel.objects.filter(relay_point=relay).select_related("shipment"))
    handled = [parcel for parcel in parcels if parcel.picked_up_at]
    punctuality = []
    for parcel in handled:
        start = parcel.received_at or parcel.created_at
        hours = (parcel.picked_up_at - start).total_seconds() / 3600
        punctuality.append(Observation(100 if hours <= 72 else max(0, 100 - (hours - 72) * 2), parcel.picked_up_at))
    security = []
    for parcel in parcels:
        has_proof = ShipmentEvidence.objects.filter(
            shipment=parcel.shipment,
            stage__in=[ShipmentEvidence.Stage.RELAY_RECEIVED, ShipmentEvidence.Stage.RELAY_RELEASED],
            purged_at__isnull=True,
        ).exists()
        security.append(Observation(100 if has_proof else 40, parcel.updated_at))
    disputes = list(Dispute.objects.filter(order__shipment__relay_parcel__relay_point=relay).distinct())
    return {
        "punctuality": punctuality,
        "security": security,
        "satisfaction": [],
        "disputes": _dispute_observations([parcel.shipment for parcel in handled], disputes),
        "seniority": [_seniority_observation(user)],
    }


def _target_tier(score: float, sample_size: int) -> str:
    if sample_size < 5:
        return TrustScoreProfile.Tier.NEW
    if score >= TIER_GOLD_THRESHOLD:
        return TrustScoreProfile.Tier.GOLD
    if score >= TIER_CONFIRM_THRESHOLD:
        return TrustScoreProfile.Tier.CONFIRMED
    return TrustScoreProfile.Tier.NEW


def _tier_change_allowed(current: str, target: str, score: float) -> bool:
    if current == target:
        return False
    thresholds = {
        (TrustScoreProfile.Tier.NEW, TrustScoreProfile.Tier.CONFIRMED): TIER_CONFIRM_THRESHOLD + HYSTERESIS_POINTS,
        (TrustScoreProfile.Tier.NEW, TrustScoreProfile.Tier.GOLD): TIER_GOLD_THRESHOLD + HYSTERESIS_POINTS,
        (TrustScoreProfile.Tier.CONFIRMED, TrustScoreProfile.Tier.GOLD): TIER_GOLD_THRESHOLD + HYSTERESIS_POINTS,
        (TrustScoreProfile.Tier.CONFIRMED, TrustScoreProfile.Tier.NEW): TIER_CONFIRM_THRESHOLD - HYSTERESIS_POINTS,
        (TrustScoreProfile.Tier.GOLD, TrustScoreProfile.Tier.CONFIRMED): TIER_GOLD_THRESHOLD - HYSTERESIS_POINTS,
        (TrustScoreProfile.Tier.GOLD, TrustScoreProfile.Tier.NEW): TIER_CONFIRM_THRESHOLD - HYSTERESIS_POINTS,
    }
    threshold = thresholds[(current, target)]
    return score >= threshold if target in [TrustScoreProfile.Tier.CONFIRMED, TrustScoreProfile.Tier.GOLD] else score < threshold


@transaction.atomic
def calculate_trust_score(user, role: str) -> TrustScoreProfile:
    profile, _ = TrustScoreProfile.objects.select_for_update().get_or_create(user=user, role=role)
    observations_by_role = {
        TrustScoreProfile.Role.VENDOR: _vendor_observations,
        TrustScoreProfile.Role.COURIER: _courier_observations,
        TrustScoreProfile.Role.RELAY_POINT: _relay_observations,
    }
    observations = observations_by_role[role](user)
    weights = WEIGHTS[role]
    breakdown = {}
    sample_size = 0
    for metric, weight in weights.items():
        metric_observations = observations.get(metric, [])
        sample_size += len(metric_observations)
        value = _wilson_satisfaction(metric_observations) if metric == "satisfaction" else _bayesian_score(metric_observations)
        breakdown[metric] = {"score": round(value, 2), "weight": weight, "samples": len(metric_observations)}

    score = sum(item["score"] * item["weight"] / 100 for item in breakdown.values())
    if profile.veto_active:
        score = min(score, 39.0)
    score = round(max(0.0, min(100.0, score)), 2)

    target = TrustScoreProfile.Tier.NEW if profile.veto_active else _target_tier(score, sample_size)
    now = timezone.now()
    if profile.veto_active:
        profile.tier = TrustScoreProfile.Tier.NEW
        profile.candidate_tier = ""
        profile.candidate_since = None
    elif target == profile.tier:
        profile.candidate_tier = ""
        profile.candidate_since = None
    elif _tier_change_allowed(profile.tier, target, score):
        if profile.candidate_tier != target:
            profile.candidate_tier = target
            profile.candidate_since = now
        elif profile.candidate_since and now - profile.candidate_since >= timedelta(days=HYSTERESIS_DAYS):
            profile.tier = target
            profile.candidate_tier = ""
            profile.candidate_since = None

    profile.score = score
    profile.breakdown = breakdown
    profile.sample_size = sample_size
    profile.calculated_at = now
    profile.save()
    return profile


def trust_score_payload(profile: TrustScoreProfile) -> dict:
    cap = profile.parcel_value_cap_xaf
    return {
        "score": float(profile.score),
        "tier": profile.tier,
        "tier_display": profile.get_tier_display(),
        "parcel_value_cap_xaf": cap,
        "requires_insurance": profile.tier == TrustScoreProfile.Tier.GOLD,
        "veto_active": profile.veto_active,
        "veto_reason": profile.veto_reason,
        "breakdown": profile.breakdown,
        "sample_size": profile.sample_size,
        "candidate_tier": profile.candidate_tier,
        "candidate_since": profile.candidate_since,
        "calculated_at": profile.calculated_at,
    }
