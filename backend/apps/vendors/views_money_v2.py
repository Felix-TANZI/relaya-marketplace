# backend/apps/vendors/views_money_v2.py
#
# Lot 2 / socle Lot 3 — espace vendeur v2 "Mon argent".
# Endpoint ADDITIF, lecture seule : GET /api/vendors/v2/money-summary/
#
# But : donner une approximation, à partir des données EXISTANTES (Order /
# escrow_status), des 5 états VD-09 (à verser, se libère, en cours, gelé,
# versé) et du délai de libération t_libération, sans migration ni nouveau
# champ. Source de la règle métier : espace_vendeur_synthese_detail/
# batch6_VD09-10.md ("VD-09 — Argent et versements").
#
# ─────────────────────────────────────────────────────────────────────────
# LIMITES CONNUES (documentées ici plutôt que résolues par une migration,
# conformément à la consigne de la mission) :
#
# 1. "À verser" vs "Versé" : le modèle Order n'a qu'un état escrow RELEASED
#    unique — il ne distingue pas "libéré mais pas encore transféré au
#    vendeur (à verser)" de "déjà transféré (versé)" (VD-D10.A16/A17 décrivent
#    une tâche planifiée de versement hebdomadaire qui n'existe pas encore
#    dans ce code). Approximation retenue : on répartit le total "gardé" des
#    commandes RELEASED entre "à verser" et "versé" en utilisant le seul
#    signal disponible aujourd'hui côté paiement sortant — les
#    WithdrawalRequest APPROVED du vendeur (ancien système de retrait à la
#    demande, pas le nouveau versement hebdomadaire sans frais de VD-09) :
#      à_verser ≈ max(0, total_released_kept − total_withdrawn_approved)
#      versé    ≈ total_withdrawn_approved
#    C'est une approximation raisonnable, pas un calcul fidèle : elle sera
#    remplacée quand la tâche planifiée de versement du vendredi (VER-01)
#    sera implémentée avec sa propre table Payout/BLV-VS-nnnn.
#
# 2. t_fermeture (VD-09) = min(confirmation client ; retrait + 7 jours).
#    Order n'a pas de champ confirmed_at dédié ; on utilise updated_at comme
#    proxy du moment où le statut est passé à BUYER_CONFIRMED/AUTO_CONFIRMED
#    (c'est la dernière écriture avant le passage en RELEASE_PENDING dans le
#    code actuel de Order.buyer_confirm()/auto_confirm()). La branche
#    "retrait + 7 jours" n'est pas calculable du tout (pas de champ de date
#    de retrait livreur distinct) et est donc ignorée ici.
#
# 3. Δ (délai après fermeture) documenté = 3 j (Bronze/Argent), 1 j
#    (Or/Platine), 14 j (carte bancaire). Le modèle VendorProfile actuel n'a
#    que 4 paliers BRONZE/SILVER/GOLD/DIAMOND (ancien système à points, DIAMOND
#    doit être supprimé selon VD-D11.A01) — pas encore le système Bronze/
#    Argent/Or/Platine du Trust Score V5.5. On mappe donc BRONZE/SILVER → 3 j
#    et GOLD/DIAMOND → 1 j. Le cas "carte bancaire → 14 j" n'est pas
#    implémentable : Order n'a aucun champ de moyen de paiement (pas de
#    distinction carte / Mobile Money) — toujours traité comme non-carte ici.
#
# 4. "Gelé" est approximé par : commandes dont au moins un article du vendeur
#    a un litige (Dispute) ouvert/en cours, OU un retour (Return) non clos,
#    quel que soit l'escrow_status affiché par ailleurs — cohérent avec la
#    règle LIB-02 ("un litige ou un retour gèle aussitôt la somme, même
#    pendant le compte à rebours").
#
# Aucune migration, aucun nouveau modèle : uniquement des lectures sur les
# modèles Order / Dispute / Return / VendorProfile / WithdrawalRequest déjà
# en base.

from datetime import timedelta

from django.contrib.auth.models import User
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.orders.models import Dispute, Order, Return

from .models import VendorProfile, WithdrawalRequest

# Δ (jours) après t_fermeture, par palier — voir limite n°3 ci-dessus.
RELEASE_DELAY_DAYS_BY_TIER = {
    VendorProfile.CertificationTier.BRONZE: 3,
    VendorProfile.CertificationTier.SILVER: 3,   # "Argent"
    VendorProfile.CertificationTier.GOLD: 1,     # "Or"
    VendorProfile.CertificationTier.DIAMOND: 1,  # palier obsolète (A supprimer, VD-D11.A01) ; traité comme Or/Platine
}


def _vendor_kept_for_order(order: Order, vendor: User) -> int:
    """Montant gardé par le vendeur sur cette commande (ses articles uniquement),
    avec le taux de commission actuel (commission_rate_snapshot) — même logique
    que vendor_payment_summary(), pas le nouveau barème M01 (les commandes
    existantes n'ont pas de famille produit ni de palier figés au paiement)."""
    items = order.items.filter(product__vendor=vendor)
    subtotal = sum(i.line_total_xaf for i in items)
    if not subtotal:
        return 0
    rate = float(order.commission_rate_snapshot)
    commission = round(subtotal * rate / 100)
    return subtotal - commission


def _order_has_active_freeze(order: Order, vendor: User) -> bool:
    """True si un litige ouvert ou un retour non clos concerne un article du
    vendeur sur cette commande (règle LIB-02 : gel prioritaire sur tout le
    reste)."""
    has_open_dispute = Dispute.objects.filter(
        order=order, vendor=vendor, status__in=["OPEN", "IN_PROGRESS"],
    ).exists()
    if has_open_dispute:
        return True
    has_open_return = Return.objects.filter(
        order=order,
        vendor=vendor,
        status__in=[
            Return.Status.REQUESTED,
            Return.Status.APPROVED,
            Return.Status.AWAITING_DROPOFF,
            Return.Status.RECEIVED,
        ],
    ).exists()
    return has_open_return


def _t_liberation(order: Order, tier: str) -> "tuple[object, float]":
    """Approxime t_libération = t_fermeture + Δ (voir limite n°2 et n°3).
    Retourne (datetime ou None, jours_restants ou None)."""
    if order.fulfillment_status not in (
        Order.FulfillmentStatus.BUYER_CONFIRMED,
        Order.FulfillmentStatus.AUTO_CONFIRMED,
    ):
        return None, None
    t_fermeture = order.updated_at  # proxy — voir limite n°2
    delta_days = RELEASE_DELAY_DAYS_BY_TIER.get(tier, 3)
    t_liberation = t_fermeture + timedelta(days=delta_days)
    days_left = (t_liberation - timezone.now()).total_seconds() / 86400
    return t_liberation, days_left


@extend_schema(
    tags=["Vendors V2"],
    summary="Vendor money summary (v2, approximation VD-09)",
    description=(
        "Vue additive lecture seule pour l'espace vendeur v2 (Lot 2/3). "
        "Approxime les 5 états VD-09 (à verser, se libère, en cours, gelé, "
        "versé) à partir des données existantes (Order.escrow_status), sans "
        "aucune migration. Voir les commentaires du module pour les limites "
        "connues de chaque approximation."
    ),
)
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def vendor_money_summary_v2(request):
    try:
        vendor_profile = VendorProfile.objects.get(user=request.user)
    except VendorProfile.DoesNotExist:
        return Response({"detail": "Profil vendeur introuvable."}, status=404)

    if not vendor_profile.is_active_vendor:
        return Response(
            {"detail": "Votre compte vendeur n'est pas encore approuvé."},
            status=403,
        )

    vendor = request.user
    tier = vendor_profile.certification_tier

    qs = Order.objects.filter(items__product__vendor=vendor).distinct().prefetch_related(
        "items__product"
    )

    en_cours_xaf = 0        # escrow BLOCKED, pas de gel actif
    se_libere_xaf = 0       # escrow RELEASE_PENDING, pas de gel actif
    gele_xaf = 0            # litige/retour actif, quel que soit l'escrow_status
    gele_orders = []
    released_total_xaf = 0  # escrow RELEASED (voir limite n°1)

    soonest_release_at = None
    soonest_release_days_left = None

    for order in qs:
        kept = _vendor_kept_for_order(order, vendor)
        if not kept:
            continue

        if _order_has_active_freeze(order, vendor):
            gele_xaf += kept
            gele_orders.append({
                "order_id": order.id,
                "amount_xaf": kept,
                "reason": "dispute_or_return",
            })
            continue

        if order.escrow_status == Order.EscrowStatus.BLOCKED:
            en_cours_xaf += kept
        elif order.escrow_status == Order.EscrowStatus.RELEASE_PENDING:
            se_libere_xaf += kept
            t_lib, days_left = _t_liberation(order, tier)
            if t_lib is not None and (
                soonest_release_at is None or t_lib < soonest_release_at
            ):
                soonest_release_at = t_lib
                soonest_release_days_left = days_left
        elif order.escrow_status == Order.EscrowStatus.RELEASED:
            released_total_xaf += kept
        # PENDING / REFUNDED / PARTIAL_REFUNDED : pas d'argent dû au vendeur, ignoré ici.

    # Voir limite n°1 : approximation "à verser" / "versé" via WithdrawalRequest.
    total_withdrawn_xaf = sum(
        w.net_amount_xaf for w in WithdrawalRequest.objects.filter(
            vendor=vendor_profile, status=WithdrawalRequest.WithdrawalStatus.APPROVED,
        )
    )
    a_verser_xaf = max(0, released_total_xaf - total_withdrawn_xaf)
    verse_xaf = total_withdrawn_xaf

    en_circulation_xaf = a_verser_xaf + se_libere_xaf + en_cours_xaf + gele_xaf

    data = {
        "to_pay": {
            "amount_xaf": a_verser_xaf,
            "note": "Approximation (voir limite n°1 du module) — pas encore la tâche de versement hebdomadaire VER-01.",
        },
        "releasing": {
            "amount_xaf": se_libere_xaf,
            "next_release_at": soonest_release_at.isoformat() if soonest_release_at else None,
            "days_left": round(soonest_release_days_left, 2) if soonest_release_days_left is not None else None,
        },
        "in_progress": {
            "amount_xaf": en_cours_xaf,
        },
        "frozen": {
            "amount_xaf": gele_xaf,
            "orders": gele_orders,
        },
        "paid_out": {
            "amount_xaf": verse_xaf,
            "note": "Approximation via WithdrawalRequest APPROVED — pas un vrai historique de versement hebdomadaire (voir limite n°1).",
        },
        "in_circulation_xaf": en_circulation_xaf,
        "tier": tier,
        "release_delay_days": RELEASE_DELAY_DAYS_BY_TIER.get(tier, 3),
        "limitations": [
            "à_verser/versé approximés via WithdrawalRequest (pas de table Payout dédiée).",
            "t_fermeture approximé via updated_at (pas de champ confirmed_at dédié).",
            "Δ=14j carte bancaire non implémenté (Order n'a pas de champ moyen de paiement).",
        ],
    }
    return Response(data)
