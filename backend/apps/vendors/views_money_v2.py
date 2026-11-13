# backend/apps/vendors/views_money_v2.py
#
# Lot 2 / socle Lot 3 — espace vendeur v2 "Mon argent".
# Endpoint ADDITIF, lecture seule : GET /api/vendors/v2/money-summary/
#
# DEV-SRV-01 v1.8, C04 : lit les VRAIS séquestres (payments.escrow) et versements (payments.settlements) du vendeur ;
# l'ancienne approximation par commande (escrow_status, updated_at, WithdrawalRequest) est retirée. Versement chaque
# jour, r_versement_vendeur_j jour après la confirmation du client (payments.bridge.versement_vendeur).

from django.contrib.auth.models import User
from django.utils import timezone
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.orders.models import Order

from .models import VendorProfile


def _vendor_kept_for_order(order: Order, vendor: User) -> int:
    """Montant gardé par le vendeur sur cette commande (ses articles uniquement) : net_b figé à la commande (spec
    v2.1, R22.1) ; une commande antérieure garde le calcul par son taux d'origine."""
    from apps.orders.commission import net_vendeur

    return net_vendeur(order, vendor)


@extend_schema(
    tags=["Vendors V2"],
    summary="Vendor money summary (v2, C04 : séquestres et versements réels)",
    description=(
        "États de l'argent du vendeur lus sur ses séquestres et versements réels (DEV-SRV-01 v1.8, C04) : "
        "en cours (attend la confirmation du client), se libère (confirmé, date de libération), gelé, "
        "à verser, versé. Versement chaque jour, r_versement_vendeur_j jour après la confirmation."
    ),
    responses={200: OpenApiTypes.OBJECT},
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

    return Response(resume_argent_vendeur(vendor_profile))


def resume_argent_vendeur(vendor_profile) -> dict:
    """DEV-SRV-01 v1.8, C04 : les états de l'argent du vendeur, lus sur les VRAIS séquestres et versements
    (payments), plus sur une approximation par commande. Même forme de réponse qu'avant, pour les écrans.

      in_progress : séquestres qui attendent la confirmation du client (HELD) ;
      releasing   : le client a confirmé — le montant s'affiche tout de suite, avec sa date de libération
                    (RELEASE_SCHEDULED, r_versement_vendeur_j jour après la confirmation) ;
      frozen      : litige ou retour ouvert, gelé jusqu'à la décision (FROZEN) ;
      to_pay      : libéré, pas encore versé (dû + versements en préparation ou en attente de validation) ;
      paid_out    : versements payés sur le numéro Mobile Money vérifié (1 % de frais à la charge du vendeur).
    """
    from django.db.models import Min, Sum

    from apps.payments.bridge.actors import payee_for_vendor
    from apps.payments.escrow.models import EscrowHold
    from apps.payments.settlements.models import PayoutRequest
    from apps.payments.settlements.services import amount_due
    from apps.regles import services as regles

    delai = regles.reglage("r_versement_vendeur_j")
    vide = {
        "to_pay": {"amount_xaf": 0}, "releasing": {"amount_xaf": 0, "next_release_at": None, "days_left": None},
        "in_progress": {"amount_xaf": 0}, "frozen": {"amount_xaf": 0, "orders": []}, "paid_out": {"amount_xaf": 0},
        "in_circulation_xaf": 0, "tier": vendor_profile.certification_tier, "release_delay_days": delai,
        "payout_rhythm": "daily", "awaiting_validation_xaf": 0, "limitations": [],
    }
    payee = payee_for_vendor(vendor_profile)
    if payee is None:
        return vide

    marchandise = EscrowHold.objects.filter(payee=payee, component=EscrowHold.Component.GOODS)

    def somme(statut):
        return marchandise.filter(status=statut).aggregate(t=Sum("net_amount_xaf"))["t"] or 0

    en_cours = somme(EscrowHold.Status.HELD)
    programme = marchandise.filter(status=EscrowHold.Status.RELEASE_SCHEDULED)
    se_libere = programme.aggregate(t=Sum("net_amount_xaf"))["t"] or 0
    prochaine = programme.aggregate(m=Min("release_at"))["m"]
    geles = list(marchandise.filter(status=EscrowHold.Status.FROZEN).values("order_id", "net_amount_xaf"))
    du = amount_due(payee)
    a_verser = du["due_xaf"] + du["in_settlement_xaf"]
    verse = (PayoutRequest.objects.filter(payee=payee, status=PayoutRequest.Status.PAID)
             .aggregate(t=Sum("amount_xaf"))["t"] or 0)
    a_valider = (PayoutRequest.objects.filter(payee=payee, status=PayoutRequest.Status.PENDING_APPROVAL)
                 .aggregate(t=Sum("amount_xaf"))["t"] or 0)
    gele = sum(g["net_amount_xaf"] for g in geles)
    jours_restants = (prochaine - timezone.now()).total_seconds() / 86400 if prochaine else None
    return {
        **vide,
        "to_pay": {"amount_xaf": a_verser},
        "releasing": {"amount_xaf": se_libere, "next_release_at": prochaine.isoformat() if prochaine else None,
                      "days_left": round(max(jours_restants, 0), 2) if jours_restants is not None else None},
        "in_progress": {"amount_xaf": en_cours},
        "frozen": {"amount_xaf": gele, "orders": [{"order_id": g["order_id"], "amount_xaf": g["net_amount_xaf"],
                                                   "reason": "dispute_or_return"} for g in geles]},
        "paid_out": {"amount_xaf": verse},
        "in_circulation_xaf": a_verser + se_libere + en_cours + gele,
        "awaiting_validation_xaf": a_valider,
    }


# Statuts d'un versement réel (payments.PayoutRequest) ramenés aux quatre états que l'écran Versements sait afficher.
_STATUT_ECRAN = {
    "PAID": ("APPROVED", "Versé"),
    "DRAFT": ("PENDING", "En préparation"),
    "PENDING_APPROVAL": ("PENDING", "En attente de validation"),
    "APPROVED": ("PENDING", "Envoi en cours"),
    "PROCESSING": ("PENDING", "Envoi en cours"),
    "UNKNOWN": ("PENDING", "Vérification en cours"),
    "FAILED": ("REJECTED", "Refusé par l'opérateur"),
    "REJECTED": ("REJECTED", "Refusé"),
    "CANCELLED": ("CANCELLED", "Annulé"),
}
_OPERATEUR_ECRAN = {"MTN": "MTN_MOMO", "ORANGE": "ORANGE_MONEY"}


@extend_schema(
    tags=["Vendors V2"],
    summary="Vendor payouts (v2, C04 : versements réels)",
    description=(
        "Les versements réels du vendeur (un par jour au plus, DEV-SRV-01 v1.8, C04), sous la forme de l'historique "
        "de l'écran Versements, et le versement en cours s'il y en a un."
    ),
    responses={200: OpenApiTypes.OBJECT},
)
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def vendor_payouts_v2(request):
    from apps.payments.bridge.actors import payee_for_vendor
    from apps.payments.settlements.models import PayoutRequest

    vendor_profile = VendorProfile.objects.filter(user=request.user).first()
    if vendor_profile is None:
        return Response({"detail": "Profil vendeur introuvable."}, status=404)
    payee = payee_for_vendor(vendor_profile)
    if payee is None:
        return Response({"payouts": [], "pending": None})
    lignes, en_cours = [], None
    for v in PayoutRequest.objects.filter(payee=payee).order_by("-requested_at")[:200]:
        statut, libelle = _STATUT_ECRAN.get(v.status, ("PENDING", v.status))
        operateur = _OPERATEUR_ECRAN.get(v.payee_operator, "MTN_MOMO")
        brut = v.amount_xaf + v.psp_fee_xaf
        lignes.append({
            "id": v.pk, "reference": v.reference, "amount_xaf": brut, "fee_percent_snapshot": "",
            "fee_amount_xaf": v.psp_fee_xaf, "net_amount_xaf": v.amount_xaf, "operator": operateur,
            "operator_display": operateur.replace("_", " ").title(), "phone_number": v.payee_msisdn_masked,
            "status": statut, "status_display": libelle, "admin_note": v.error_message or "",
            "processed_at": v.executed_at.isoformat() if v.executed_at else None,
            "created_at": v.requested_at.isoformat(), "updated_at": v.requested_at.isoformat(),
        })
        if en_cours is None and statut == "PENDING":
            en_cours = {"id": v.pk, "reference": v.reference, "amount_xaf": brut, "fee_xaf": v.psp_fee_xaf,
                        "net_xaf": v.amount_xaf,
                        "operator": operateur, "phone": v.payee_msisdn_masked,
                        "created_at": v.requested_at.isoformat(), "status": statut}
    return Response({"payouts": lignes, "pending": en_cours})
