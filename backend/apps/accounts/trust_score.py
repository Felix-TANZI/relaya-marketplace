from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from apps.orders.models import Dispute, Order, OrderHistory
from apps.shipping.models import RelayParcel, RelayPointReview, Shipment, ShipmentEvidence

from .models import CourierProfile, PartnerBlacklist, RelayPointProfile, SanctionRecord, TrustScoreProfile, UserNotification


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
    # IFA (V5.5 §6/§19) : un seul critere composite ("fiabilite"), pas de
    # ponderation multi-criteres comme les 3 roles publics — l'IFA reste
    # interne, jamais affichee comme un Trust Score classique.
    TrustScoreProfile.Role.BUYER: {
        "reliability": 100,
    },
}

HALF_LIFE_DAYS = 90
# Trust Score V5.5 §Cold start : C = (k·µ + n·x) / (k + n), µ=50 (neutre, "ni
# cadeau ni punition"), k≈10. La V5.4 anterieure demarrait a 70 — corrige ici.
PRIOR_SCORE = 50.0
PRIOR_WEIGHT = 10.0
TIER_CONFIRM_THRESHOLD = 70.0
TIER_GOLD_THRESHOLD = 85.0
HYSTERESIS_POINTS = 5.0
HYSTERESIS_DAYS = 14
# Platine (vendeur uniquement) : score tenu "6 mois", pas 14 jours.
PLATINUM_HYSTERESIS_DAYS = 180
VETO_SCORE_CAP = 39.0

# Paliers par role (V5.5) : (tier, score minimum, volume minimum, audit requis).
# Verifies dans l'ordre — le premier qui passe (score+volume+audit) l'emporte.
# Constantes "PROPOSITION" du referentiel — tunables, pas figees.
ROLE_TIER_RULES = {
    TrustScoreProfile.Role.VENDOR: [
        (TrustScoreProfile.Tier.PLATINUM, 90.0, 0, True),
        (TrustScoreProfile.Tier.GOLD, 80.0, 50, True),
        (TrustScoreProfile.Tier.CONFIRMED, TIER_CONFIRM_THRESHOLD - 5.0, 10, False),
    ],
    TrustScoreProfile.Role.COURIER: [
        (TrustScoreProfile.Tier.GOLD, TIER_GOLD_THRESHOLD, 0, False),
        (TrustScoreProfile.Tier.CONFIRMED, TIER_CONFIRM_THRESHOLD, 0, False),
    ],
    TrustScoreProfile.Role.RELAY_POINT: [
        (TrustScoreProfile.Tier.GOLD, 75.0, 101, False),
        (TrustScoreProfile.Tier.CONFIRMED, 65.0, 31, False),
    ],
}
TIER_RANK = {
    TrustScoreProfile.Tier.NEW: 0,
    TrustScoreProfile.Tier.CONFIRMED: 1,
    TrustScoreProfile.Tier.GOLD: 2,
    TrustScoreProfile.Tier.PLATINUM: 3,
}

# Hard filter / VETO (V5.5) : un evenement catastrophique plafonne le score a
# 39 ("Gelé") quels que soient les autres criteres, et ne decroit JAMAIS dans
# le temps (contrairement aux observations normales, demi-vie 90 jours).
CATASTROPHIC_DISPUTE_REASONS = {"COUNTERFEIT"}
CATASTROPHIC_CONFIRMING_RESOLUTIONS = {"REFUND", "PARTIAL_REFUND", "EXCHANGE"}


@dataclass(frozen=True)
class Observation:
    value: float
    occurred_at: object
    permanent: bool = False


def _decay(observation: "Observation") -> float:
    if observation.permanent or not observation.occurred_at:
        return 1.0
    age_days = max(0.0, (timezone.now() - observation.occurred_at).total_seconds() / 86400)
    return math.exp(-math.log(2) * age_days / HALF_LIFE_DAYS)


def _bayesian_score(observations: list[Observation]) -> float:
    if not observations:
        return PRIOR_SCORE
    weighted_sum = PRIOR_SCORE * PRIOR_WEIGHT
    total_weight = PRIOR_WEIGHT
    for observation in observations:
        weight = _decay(observation)
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
        weight = _decay(observation)
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
    for dispute in disputes:
        catastrophic = (
            dispute.reason in CATASTROPHIC_DISPUTE_REASONS
            and dispute.resolution in CATASTROPHIC_CONFIRMING_RESOLUTIONS
        )
        values.append(Observation(0.0, dispute.created_at, permanent=catastrophic))
    return values


# ─────────────────────────────────────────────────────────────────────────────
# ÉCHELLE DE SANCTIONS 1→4 (V5.5 §8) + RÉHABILITATION
# ─────────────────────────────────────────────────────────────────────────────

SANCTION_NOTIFICATION_TITLES = {
    TrustScoreProfile.SanctionLevel.WARNING: "Avertissement",
    TrustScoreProfile.SanctionLevel.THROTTLING: "Visibilité réduite",
    TrustScoreProfile.SanctionLevel.SUSPENSION: "Compte suspendu",
    TrustScoreProfile.SanctionLevel.BAN: "Compte banni définitivement",
}
DEFAULT_THROTTLE_DAYS = 14
DEFAULT_SUSPENSION_DAYS = 30


def _blacklist_profile_identifiers(profile: TrustScoreProfile, sanction: SanctionRecord, issued_by) -> None:
    """Bannissement (niveau 4) : verrouille CNI + numéro déclaré contre toute nouvelle inscription."""
    identifiers = []
    role_profile = {
        TrustScoreProfile.Role.VENDOR: "vendor_profile",
        TrustScoreProfile.Role.COURIER: "courier_profile",
        TrustScoreProfile.Role.RELAY_POINT: "relay_point_profile",
    }.get(profile.role)
    partner = getattr(profile.user, role_profile, None) if role_profile else None
    if partner is not None:
        id_value = getattr(partner, "id_document", None) or getattr(partner, "id_card", None)
        if id_value:
            identifiers.append((PartnerBlacklist.IdentifierType.CNI, id_value))
        phone = getattr(partner, "phone", "")
        if phone:
            identifiers.append((PartnerBlacklist.IdentifierType.MOMO, phone))

    for identifier_type, raw_value in identifiers:
        PartnerBlacklist.objects.get_or_create(
            identifier_type=identifier_type,
            identifier_hash=PartnerBlacklist.hash_identifier(raw_value),
            defaults={"reason": sanction.reason, "sanction": sanction, "created_by": issued_by},
        )


def apply_sanction(profile: TrustScoreProfile, level: int, reason: str, *, issued_by=None, duration_days=None) -> SanctionRecord:
    """
    Applique un palier de l'échelle 1→4 et journalise l'événement — jamais
    silencieux (règle générale de ce référentiel). `issued_by=None` signifie
    un déclenchement automatique par le système (véto anti-collusion, etc.).
    """
    now = timezone.now()
    expires_at = None

    if level == TrustScoreProfile.SanctionLevel.THROTTLING:
        profile.sanction_level = level
        profile.throttled_until = now + timedelta(days=duration_days or DEFAULT_THROTTLE_DAYS)
        expires_at = profile.throttled_until
        profile.save(update_fields=["sanction_level", "throttled_until", "updated_at"])
    elif level == TrustScoreProfile.SanctionLevel.SUSPENSION:
        profile.sanction_level = level
        profile.veto_active = True
        profile.veto_reason = reason
        profile.frozen_until = now + timedelta(days=duration_days or DEFAULT_SUSPENSION_DAYS)
        expires_at = profile.frozen_until
        profile.save(update_fields=["sanction_level", "veto_active", "veto_reason", "frozen_until", "updated_at"])
    elif level == TrustScoreProfile.SanctionLevel.BAN:
        profile.sanction_level = level
        profile.veto_active = True
        profile.veto_reason = reason
        profile.frozen_until = None  # permanent — pas de levée automatique, pas de réhabilitation
        profile.save(update_fields=["sanction_level", "veto_active", "veto_reason", "frozen_until", "updated_at"])
    # Niveau 1 (Avertissement) : log + notification uniquement, aucun champ mécanique à toucher.

    record = SanctionRecord.objects.create(
        profile=profile, level=level, reason=reason, issued_by=issued_by, expires_at=expires_at,
    )

    UserNotification.objects.create(
        user=profile.user,
        title=SANCTION_NOTIFICATION_TITLES.get(level, "Sanction appliquée"),
        message=reason,
        notification_type=UserNotification.NotificationType.SYSTEM,
        action_url="/profile",
    )

    if level == TrustScoreProfile.SanctionLevel.BAN:
        _blacklist_profile_identifiers(profile, record, issued_by)

    return record


def lift_expired_sanctions(now=None) -> dict:
    """
    Réhabilitation (V5.5 §8, PROPOSITION) : niveau 2 se lève simplement ;
    niveau 3 se lève par RE-COLD-START — jamais restauration du score gelé,
    le compte repart neutre et doit reconstruire son historique. Niveau 4
    n'est jamais levé ici (définitif par construction).
    """
    now = now or timezone.now()
    throttling_lifted = 0
    suspensions_lifted = 0

    throttled = TrustScoreProfile.objects.filter(
        sanction_level=TrustScoreProfile.SanctionLevel.THROTTLING, throttled_until__lte=now,
    )
    for profile in throttled:
        profile.sanction_level = TrustScoreProfile.SanctionLevel.NONE
        profile.throttled_until = None
        profile.save(update_fields=["sanction_level", "throttled_until", "updated_at"])
        throttling_lifted += 1

    suspended = TrustScoreProfile.objects.filter(
        sanction_level=TrustScoreProfile.SanctionLevel.SUSPENSION, frozen_until__lte=now,
    )
    for profile in suspended:
        profile.sanction_level = TrustScoreProfile.SanctionLevel.NONE
        profile.frozen_until = None
        profile.veto_active = False
        profile.veto_reason = ""
        # Re-cold-start : le compte repart neutre, pas avec le score gelé.
        profile.score = PRIOR_SCORE
        profile.tier = TrustScoreProfile.Tier.NEW
        profile.candidate_tier = ""
        profile.candidate_since = None
        profile.breakdown = {}
        profile.sample_size = 0
        profile.volume = 0
        profile.save()
        SanctionRecord.objects.filter(profile=profile, level=TrustScoreProfile.SanctionLevel.SUSPENSION, lifted_at__isnull=True).update(lifted_at=now)
        suspensions_lifted += 1

    return {"throttling_lifted": throttling_lifted, "suspensions_lifted": suspensions_lifted}


def apply_veto_for_catastrophic_dispute(dispute) -> None:
    """
    Hard filter V5.5 : une contrefaçon confirmée suspend le vendeur (niveau
    3) ; une récidive après une première suspension passe au bannissement
    définitif (niveau 4, "récidive grave"). A appeler au moment ou un litige
    est résolu (ex. apps.vendors.views.admin_resolve_dispute).
    """
    if dispute.reason not in CATASTROPHIC_DISPUTE_REASONS:
        return
    if dispute.resolution not in CATASTROPHIC_CONFIRMING_RESOLUTIONS:
        return
    if not dispute.vendor_id:
        return
    profile, _ = TrustScoreProfile.objects.get_or_create(
        user_id=dispute.vendor_id, role=TrustScoreProfile.Role.VENDOR,
    )
    dispute_marker = f"litige #{dispute.id}"
    if profile.sanctions.filter(reason__icontains=dispute_marker).exists():
        return  # déjà traité pour ce litige précis (idempotent)

    prior_catastrophic = profile.sanctions.filter(level__gte=TrustScoreProfile.SanctionLevel.SUSPENSION).exists()
    level = TrustScoreProfile.SanctionLevel.BAN if prior_catastrophic else TrustScoreProfile.SanctionLevel.SUSPENSION
    reason = f"Contrefaçon confirmée — {dispute_marker}."
    if level == TrustScoreProfile.SanctionLevel.BAN:
        reason += " Récidive : bannissement définitif."
    apply_sanction(profile, level, reason, duration_days=None if level == TrustScoreProfile.SanctionLevel.BAN else DEFAULT_SUSPENSION_DAYS)


# ─────────────────────────────────────────────────────────────────────────────
# ANTI-COLLUSION SOUS ANONYMAT (V5.5 §9/§15) — détection de rings device/MoMo
# ─────────────────────────────────────────────────────────────────────────────

def detect_self_dealing(order) -> list[tuple[str, int]]:
    """
    "Mêmes clusters device/MoMo qui transactent/notent en boucle" : le même
    numéro Mobile Money finance ET encaisse sur une même commande — un
    acheteur qui se paie lui-même via un compte vendeur/livreur/relais
    complice. Retourne [(role, user_id), ...] des complices détectés.
    """
    # Les empreintes remplacent les numeros en clair : comparer suffit a
    # detecter une collusion, sans jamais manipuler le numero lui-meme.
    from apps.payments.bridge import queries

    payer_numbers = queries.payer_fingerprints_for_order(order.pk)
    if not payer_numbers:
        return []

    involved = []
    for item in order.items.select_related("product__vendor__vendor_profile"):
        vendor_profile = getattr(item.product.vendor, "vendor_profile", None)
        if vendor_profile and queries.fingerprint_of(
            vendor_profile.phone
        ) in payer_numbers:
            involved.append((TrustScoreProfile.Role.VENDOR, item.product.vendor_id))

    for shipment in order.shipments.select_related("courier__user").prefetch_related("relay_parcel__relay_point"):
        if shipment.courier_id and queries.fingerprint_of(
            shipment.courier.phone
        ) in payer_numbers:
            involved.append((TrustScoreProfile.Role.COURIER, shipment.courier.user_id))
        relay_parcel = getattr(shipment, "relay_parcel", None)
        if relay_parcel and queries.fingerprint_of(
            relay_parcel.relay_point.phone
        ) in payer_numbers:
            involved.append((TrustScoreProfile.Role.RELAY_POINT, relay_parcel.relay_point.user_id))

    return list(dict.fromkeys(involved))


def apply_collusion_veto_for_order(order, *, issued_by=None) -> list[SanctionRecord]:
    """Bannit (niveau 4) l'acheteur et chaque partenaire complice détecté sur cette commande."""
    involved = detect_self_dealing(order)
    if not involved:
        return []

    reason = f"Auto-collusion détectée — commande #{order.id} : même numéro Mobile Money côté acheteur et partenaire."
    records = []
    buyer_profile, _ = TrustScoreProfile.objects.get_or_create(user=order.user, role=TrustScoreProfile.Role.BUYER)
    records.append(apply_sanction(buyer_profile, TrustScoreProfile.SanctionLevel.BAN, reason, issued_by=issued_by))
    for role, user_id in involved:
        partner_profile, _ = TrustScoreProfile.objects.get_or_create(user_id=user_id, role=role)
        records.append(apply_sanction(partner_profile, TrustScoreProfile.SanctionLevel.BAN, reason, issued_by=issued_by))
    return records


def scan_shared_momo_across_buyers(min_accounts: int = 3) -> list[SanctionRecord]:
    """
    Dédup MoMo (V5.5 §9) : un même numéro utilisé par plusieurs comptes
    acheteur distincts (abus "première commande"). Signale seulement
    (niveau 1) — un numéro de famille/boutique partagé reste possible
    légitimement, ce n'est pas une preuve de fraude à lui seul.
    """
    from apps.payments.bridge import queries

    flagged = []
    for ligne in queries.shared_payer_numbers(min_accounts):
        for user_id in ligne["buyer_ids"]:
            profile, _ = TrustScoreProfile.objects.get_or_create(
                user_id=user_id, role=TrustScoreProfile.Role.BUYER,
            )
            empreinte = ligne["fingerprint"]
            marker = f"partagé entre {ligne['count']} comptes"
            if profile.sanctions.filter(reason__icontains=empreinte).exists():
                continue
            flagged.append(apply_sanction(
                profile, TrustScoreProfile.SanctionLevel.WARNING,
                f"Numéro Mobile Money {empreinte} {marker} acheteur distincts.",
            ))
    return flagged


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
    docs_value = 100 if (
        profile
        and str(profile.status).lower() == "approved"
        and profile.has_required_location
    ) else 40
    return {
        "punctuality": punctuality,
        "quality": review_observations,
        "satisfaction": review_observations,
        "disputes": _dispute_observations(list(delivered), list(disputes)),
        "documents": [Observation(docs_value, timezone.now())],
        "seniority": [_seniority_observation(user)],
        "__volume__": delivered.count(),
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
    disputes = list(Dispute.objects.filter(order__shipments__courier=courier).distinct())
    return {
        "punctuality": punctuality,
        "quality": [Observation(100 if item.status == Shipment.Status.DELIVERED else 0, item.updated_at) for item in completed],
        "disputes": _dispute_observations(completed, disputes),
        "seniority": [_seniority_observation(user)],
        "training": [Observation(100 if courier.is_approved else 0, courier.updated_at)],
        "__volume__": len([item for item in completed if item.status == Shipment.Status.DELIVERED]),
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
    disputes = list(Dispute.objects.filter(order__shipments__relay_parcel__relay_point=relay).distinct())
    satisfaction = [
        Observation(review.rating * 20, review.created_at)
        for review in RelayPointReview.objects.filter(relay_point=relay)
    ]
    return {
        "punctuality": punctuality,
        "security": security,
        "satisfaction": satisfaction,
        "disputes": _dispute_observations([parcel.shipment for parcel in handled], disputes),
        "seniority": [_seniority_observation(user)],
        "__volume__": len(handled),
    }


def _buyer_observations(user) -> dict[str, list[Observation]]:
    """
    IFA — indice de fiabilite acheteur (V5.5 §6/§19), usage strictement
    interne : throttling anti-abus, priorisation support, et si le COD est
    active un jour, gating du paiement a la livraison. Jamais de Trust Score
    public cote acheteur.
    """
    from apps.payments.models import PaymentTransaction

    orders = Order.objects.filter(user=user)
    confirmed_without_dispute = orders.filter(
        fulfillment_status__in=[
            Order.FulfillmentStatus.BUYER_CONFIRMED,
            Order.FulfillmentStatus.AUTO_CONFIRMED,
            Order.FulfillmentStatus.RELEASED_TO_VENDOR,
        ],
    ).exclude(disputes__opened_by=user)

    payments = PaymentTransaction.objects.filter(order__user=user)
    successful_payments = payments.filter(status=PaymentTransaction.Status.SUCCESS)
    failed_payments = payments.filter(status__in=[PaymentTransaction.Status.FAILED, PaymentTransaction.Status.CANCELLED])

    reliability = []
    reliability += [Observation(100.0, order.updated_at) for order in confirmed_without_dispute]
    reliability += [Observation(90.0, tx.created_at) for tx in successful_payments]
    # Échec / abandon de paiement répété — g1 (baisse legere).
    reliability += [Observation(25.0, tx.created_at) for tx in failed_payments]

    # Refus de reception injustifie — g2. Reutilise le compteur non-retrait
    # deja construit (Addendum §3.2) plutot que de dupliquer la detection.
    profile = getattr(user, "profile", None)
    non_retrait_count = getattr(profile, "non_retrait_count", 0) or 0
    reliability += [Observation(10.0, timezone.now()) for _ in range(non_retrait_count)]

    # Litige abusif (tort acheteur confirme) — g2/g3. Un litige REJECTED est
    # le proxy le plus proche d'un "tort acheteur" dans le modele actuel.
    rejected_disputes = Dispute.objects.filter(opened_by=user, resolution="REJECTED")
    reliability += [Observation(0.0, d.resolved_at or d.created_at) for d in rejected_disputes]

    return {
        "reliability": reliability,
        "__volume__": confirmed_without_dispute.count(),
    }


def _target_tier(role: str, score: float, volume: int, audit_passed: bool) -> str:
    for tier, min_score, min_volume, requires_audit in ROLE_TIER_RULES.get(role, []):
        if score >= min_score and volume >= min_volume and (not requires_audit or audit_passed):
            return tier
    return TrustScoreProfile.Tier.NEW


def _tier_change_allowed(role: str, current: str, target: str, score: float) -> bool:
    if current == target:
        return False
    rules = {tier: (min_score, min_volume, requires_audit) for tier, min_score, min_volume, requires_audit in ROLE_TIER_RULES.get(role, [])}
    promoting = TIER_RANK[target] > TIER_RANK[current]
    if promoting:
        min_score = rules.get(target, (TIER_CONFIRM_THRESHOLD, 0, False))[0]
        return score >= min_score + HYSTERESIS_POINTS
    # Retrogradation : ne redescend que si le score tombe sous le plancher du
    # palier ACTUEL diminue de la marge d'hysteresis.
    current_floor = rules.get(current, (TIER_CONFIRM_THRESHOLD, 0, False))[0]
    return score < current_floor - HYSTERESIS_POINTS


def _hysteresis_days_for(target: str) -> int:
    return PLATINUM_HYSTERESIS_DAYS if target == TrustScoreProfile.Tier.PLATINUM else HYSTERESIS_DAYS


def get_trust_score_profile(user, role: str) -> TrustScoreProfile:
    """
    Lecture rapide, sans verrou ni recalcul, du score deja stocke.

    A utiliser pour CLASSER ou FILTRER des candidats (ex. choisir un livreur
    parmi plusieurs disponibles) — jamais pour afficher un score cense etre
    a jour a la seconde pres. `calculate_trust_score` reste la fonction a
    appeler pour recalculer reellement un score suite a un evenement qui le
    concerne (livraison terminee, litige tranche, veto...).

    Avant cette fonction, `choose_courier_for_order` appelait
    `calculate_trust_score` — verrou + recalcul complet + ecriture SQL — une
    fois PAR livreur candidat, a CHAQUE commande passee par n'importe quel
    client. Sous charge, ces verrous sur les memes lignes de livreurs
    populaires serialisaient les commandes entre elles.
    """
    profile, _ = TrustScoreProfile.objects.get_or_create(user=user, role=role)
    return profile


@transaction.atomic
def calculate_trust_score(user, role: str) -> TrustScoreProfile:
    profile, _ = TrustScoreProfile.objects.select_for_update().get_or_create(user=user, role=role)
    observations_by_role = {
        TrustScoreProfile.Role.VENDOR: _vendor_observations,
        TrustScoreProfile.Role.COURIER: _courier_observations,
        TrustScoreProfile.Role.RELAY_POINT: _relay_observations,
        TrustScoreProfile.Role.BUYER: _buyer_observations,
    }
    observations = observations_by_role[role](user)
    volume = observations.pop("__volume__", 0)
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
        score = min(score, VETO_SCORE_CAP)
    score = round(max(0.0, min(100.0, score)), 2)

    target = TrustScoreProfile.Tier.NEW if profile.veto_active else _target_tier(role, score, volume, profile.audit_passed)
    now = timezone.now()
    if profile.veto_active:
        profile.tier = TrustScoreProfile.Tier.NEW
        profile.candidate_tier = ""
        profile.candidate_since = None
    elif target == profile.tier:
        profile.candidate_tier = ""
        profile.candidate_since = None
    elif _tier_change_allowed(role, profile.tier, target, score):
        if profile.candidate_tier != target:
            profile.candidate_tier = target
            profile.candidate_since = now
        elif profile.candidate_since and now - profile.candidate_since >= timedelta(days=_hysteresis_days_for(target)):
            profile.tier = target
            profile.candidate_tier = ""
            profile.candidate_since = None

    profile.score = score
    profile.breakdown = breakdown
    profile.sample_size = sample_size
    profile.volume = volume
    profile.calculated_at = now
    profile.save()
    return profile


def calculate_enterprise_trust_score(organization) -> dict:
    """
    Remontee entreprise (V5.5) : Trust_Ent = 0.8 x moyenne ponderee par volume
    des livreurs actifs + 0.2 x pire livreur actif. Un seul mauvais livreur
    tire toute l'entreprise vers le bas — elle doit gerer ses gens (les
    vehicules appartiennent a l'organisation, pas au livreur individuel).
    """
    couriers = CourierProfile.objects.filter(delivery_organization=organization, is_active=True).select_related("user")
    entries = []
    for courier in couriers:
        profile = get_trust_score_profile(courier.user, TrustScoreProfile.Role.COURIER)
        entries.append({"courier_id": courier.id, "score": float(profile.score), "volume": profile.volume})
    if not entries:
        return {"score": None, "sample_size": 0, "worst_courier_score": None}

    total_volume = sum(item["volume"] for item in entries)
    if total_volume > 0:
        weighted_avg = sum(item["score"] * item["volume"] for item in entries) / total_volume
    else:
        weighted_avg = sum(item["score"] for item in entries) / len(entries)
    worst = min(item["score"] for item in entries)
    score = round(0.8 * weighted_avg + 0.2 * worst, 2)
    return {"score": score, "sample_size": len(entries), "worst_courier_score": worst}


def trust_score_payload(profile: TrustScoreProfile) -> dict:
    cap = profile.parcel_value_cap_xaf
    return {
        "score": float(profile.score),
        "tier": profile.tier,
        "tier_display": profile.get_role_tier_display(),
        "parcel_value_cap_xaf": cap,
        "requires_insurance": profile.tier in (TrustScoreProfile.Tier.GOLD, TrustScoreProfile.Tier.PLATINUM),
        "veto_active": profile.veto_active,
        "veto_reason": profile.veto_reason,
        "audit_passed": profile.audit_passed,
        "volume": profile.volume,
        "breakdown": profile.breakdown,
        "sample_size": profile.sample_size,
        "candidate_tier": profile.candidate_tier,
        "candidate_tier_display": profile.get_role_tier_display(profile.candidate_tier) if profile.candidate_tier else "",
        "candidate_since": profile.candidate_since,
        "calculated_at": profile.calculated_at,
    }
