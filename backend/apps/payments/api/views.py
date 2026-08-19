# backend/apps/payments/api/views.py
# API de lecture et d'action du module financier.
#
# DEUX ESPACES, DEUX REGLES
#
#   ACHETEUR   — voit ses paiements et l'etat du sequestre qui le protege.
#                N'apprend JAMAIS l'identite d'un vendeur.
#
#   PARTENAIRE — voit son montant du, ses releves detailles, ses
#                ajustements avec leur motif.
#                NE PEUT PAS declencher un versement (principe P10 : il
#                n'existe ni solde, ni bouton de retrait).
#
# Le filtrage se fait au QUERYSET : un objet qui ne devrait pas etre visible
# n'est jamais charge.

import logging

from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.payments.escrow.models import EscrowHold
from apps.payments.intents.models import PaymentIntent
from apps.payments.settlements.models import (
    Adjustment, PayoutRequest, SettlementBatch,
)

from .permissions import IsPartner, resolve_partner_payee
from .serializers import (
    BuyerEscrowSerializer, BuyerIntentSerializer, BuyerRefundSerializer,
    InitiatePaymentSerializer,
    PartnerAdjustmentSerializer, PartnerDueSerializer,
    PartnerEscrowSerializer, PartnerPayoutSerializer,
    PartnerSettlementSerializer, RelayTariffSerializer,
)

logger = logging.getLogger("apps.payments.api")


# ═══════════════════════════════════════════════════════════════════════════
# ESPACE ACHETEUR
# ═══════════════════════════════════════════════════════════════════════════

@extend_schema(tags=["Payments · Acheteur"], summary="Mes paiements")
class MyPaymentsView(generics.ListAPIView):
    serializer_class = BuyerIntentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            PaymentIntent.objects.filter(buyer=self.request.user)
            .prefetch_related("attempts").order_by("-created_at")
        )


@extend_schema(tags=["Payments · Acheteur"], summary="Detail d'un paiement")
class MyPaymentDetailView(generics.RetrieveAPIView):
    serializer_class = BuyerIntentSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = "reference"

    def get_queryset(self):
        # Filtrage au QUERYSET : le paiement d'un autre n'est jamais charge.
        return PaymentIntent.objects.filter(
            buyer=self.request.user).prefetch_related("attempts")


@extend_schema(
    tags=["Payments · Acheteur"],
    summary="Declencher le paiement",
    request=InitiatePaymentSerializer,
    description=(
        "Emet la demande d'encaissement aupres du prestataire. "
        "Idempotent : une demande deja en cours est reutilisee plutot que "
        "dupliquee."
    ),
)
class InitiatePaymentView(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = InitiatePaymentSerializer

    def post(self, request, reference):
        from apps.payments.application.collect import CollectError, initiate_collect

        intent = get_object_or_404(
            PaymentIntent, reference=reference, buyer=request.user)

        entree = InitiatePaymentSerializer(data=request.data)
        entree.is_valid(raise_exception=True)
        numero = entree.validated_data.get("payer_msisdn", "")
        operateur = entree.validated_data.get("payer_operator", "")

        if numero:
            # Changer de numero AVANT emission est legitime : l'acheteur
            # retente avec un autre compte Mobile Money.
            intent.set_payer(numero, operateur or intent.payer_operator)
            intent.save(update_fields=[
                "payer_msisdn_enc", "payer_msisdn_masked",
                "payer_msisdn_fingerprint", "payer_operator", "updated_at",
            ])

        try:
            issue = initiate_collect(intent)
        except CollectError as exc:
            return Response({"detail": str(exc)},
                            status=status.HTTP_400_BAD_REQUEST)

        return Response({
            "reference": issue.intent.reference,
            "status": issue.status,
            "message": issue.message,
            "requires_action": issue.requires_action,
            "payment": BuyerIntentSerializer(issue.intent).data,
        })


@extend_schema(
    tags=["Payments · Acheteur"],
    summary="Verifier l'etat d'un paiement",
    description=(
        "Re-interroge le prestataire. C'est LUI qui fait foi, jamais l'etat "
        "local (principe P6)."
    ),
)
class CheckPaymentView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, reference):
        from apps.payments.application.collect import poll_attempt

        intent = get_object_or_404(
            PaymentIntent, reference=reference, buyer=request.user)

        tentative = intent.attempts.exclude(
            provider_reference="").order_by("-created_at").first()
        if tentative is None:
            return Response({
                "reference": intent.reference, "status": intent.status,
                "message": "Aucune demande de paiement emise.",
            })

        try:
            issue = poll_attempt(tentative)
        except Exception as exc:
            logger.warning("Verification impossible pour %s : %s",
                           intent.reference, exc)
            return Response({
                "reference": intent.reference, "status": intent.status,
                "message": "Verification temporairement indisponible.",
            })

        return Response({
            "reference": issue.intent.reference,
            "status": issue.status,
            "message": issue.message,
            "payment": BuyerIntentSerializer(issue.intent).data,
        })


@extend_schema(
    tags=["Payments · Acheteur"],
    summary="Protection de ma commande",
    description=(
        "Etat du sequestre qui protege une commande. C'est la promesse "
        "BelivaY rendue visible."
    ),
)
class MyOrderEscrowView(generics.ListAPIView):
    serializer_class = BuyerEscrowSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Seuls les sequestres des commandes de CET acheteur.
        return EscrowHold.objects.filter(
            order_id=self.kwargs["order_id"],
            intent__buyer=self.request.user,
        ).order_by("component")


@extend_schema(
    tags=["Payments · Acheteur"],
    summary="Mes remboursements",
    description=(
        "Sans cet ecran, un acheteur verrait son argent revenir sans "
        "explication."
    ),
)
class MyRefundsView(generics.ListAPIView):
    serializer_class = BuyerRefundSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        from apps.payments.settlements.models import Refund

        # Filtrage au QUERYSET : le remboursement d'un autre n'est jamais
        # charge.
        return (
            Refund.objects.filter(intent__buyer=self.request.user)
            .select_related("intent").prefetch_related("source_holds")
            .order_by("-created_at")
        )


# ═══════════════════════════════════════════════════════════════════════════
# ESPACE PARTENAIRE
# ═══════════════════════════════════════════════════════════════════════════

@extend_schema(
    tags=["Payments · Partenaire"],
    summary="Mon montant du",
    responses={200: PartnerDueSerializer},
    description=(
        "IL N'EXISTE NI SOLDE, NI BOUTON DE RETRAIT. Le partenaire voit un "
        "MONTANT DU et une date de reglement. `not_yet_due_xaf` correspond "
        "a des commandes vivantes : l'acheteur peut encore obtenir un "
        "remboursement integral."
    ),
)
class MyDueView(APIView):
    permission_classes = [IsAuthenticated, IsPartner]

    def get(self, request):
        from apps.payments.settlements.services import amount_due

        compte = resolve_partner_payee(request.user)
        if compte is None:
            # Partenaire sans activite : etat VIDE, pas une erreur.
            return Response(PartnerDueSerializer({
                "payee_code": "", "payee_type": "", "payee_type_label": "",
                "display_label": "", "due_xaf": 0,
                "released_not_settled_xaf": 0, "pending_bonus_xaf": 0,
                "outstanding_debt_xaf": 0, "in_settlement_xaf": 0,
                "not_yet_due_xaf": 0, "frozen_xaf": 0,
                "next_settlement_cycle": "(aucune activite)",
                "blockers": [],
            }).data)
        donnees = amount_due(compte)
        donnees.update({
            "payee_type": compte.payee_type,
            "payee_type_label": compte.get_payee_type_display(),
            "display_label": compte.display_label,
        })
        return Response(PartnerDueSerializer(donnees).data)


@extend_schema(tags=["Payments · Partenaire"], summary="Mes sequestres")
class MyEscrowView(generics.ListAPIView):
    serializer_class = PartnerEscrowSerializer
    permission_classes = [IsAuthenticated, IsPartner]

    def get_queryset(self):
        compte = resolve_partner_payee(self.request.user)
        if compte is None:
            return EscrowHold.objects.none()
        qs = EscrowHold.objects.filter(payee=compte)
        statut = self.request.query_params.get("status")
        if statut:
            qs = qs.filter(status=statut)
        return qs.order_by("-created_at")


@extend_schema(tags=["Payments · Partenaire"], summary="Mes releves de reglement")
class MySettlementsView(generics.ListAPIView):
    serializer_class = PartnerSettlementSerializer
    permission_classes = [IsAuthenticated, IsPartner]

    def get_queryset(self):
        compte = resolve_partner_payee(self.request.user)
        if compte is None:
            return SettlementBatch.objects.none()
        return (
            SettlementBatch.objects.filter(payee=compte)
            .prefetch_related("covered_holds", "applied_adjustments", "payout")
            .order_by("-created_at")
        )


@extend_schema(tags=["Payments · Partenaire"], summary="Detail d'un releve")
class MySettlementDetailView(generics.RetrieveAPIView):
    serializer_class = PartnerSettlementSerializer
    permission_classes = [IsAuthenticated, IsPartner]
    lookup_field = "reference"

    def get_queryset(self):
        compte = resolve_partner_payee(self.request.user)
        if compte is None:
            return SettlementBatch.objects.none()
        return SettlementBatch.objects.filter(
            payee=compte).prefetch_related("covered_holds", "applied_adjustments")


@extend_schema(
    tags=["Payments · Partenaire"],
    summary="Mes ajustements",
    description=(
        "Penalites et compensations, AVEC LEUR MOTIF. Une retenue sans "
        "explication est contractuellement indefendable."
    ),
)
class MyAdjustmentsView(generics.ListAPIView):
    serializer_class = PartnerAdjustmentSerializer
    permission_classes = [IsAuthenticated, IsPartner]

    def get_queryset(self):
        compte = resolve_partner_payee(self.request.user)
        if compte is None:
            return Adjustment.objects.none()
        return Adjustment.objects.filter(payee=compte).order_by("-created_at")


@extend_schema(tags=["Payments · Partenaire"], summary="Mes versements")
class MyPayoutsView(generics.ListAPIView):
    serializer_class = PartnerPayoutSerializer
    permission_classes = [IsAuthenticated, IsPartner]

    def get_queryset(self):
        compte = resolve_partner_payee(self.request.user)
        if compte is None:
            return PayoutRequest.objects.none()
        return PayoutRequest.objects.filter(payee=compte).order_by("-requested_at")


@extend_schema(
    tags=["Payments · Partenaire"],
    summary="Ma grille tarifaire",
    responses={200: RelayTariffSerializer(many=True)},
    description=(
        "Reservee aux points relais. Montant du par categorie de colis, et "
        "categories refusees — le contrat rendu lisible."
    ),
)
class MyRelayTariffView(APIView):
    permission_classes = [IsAuthenticated, IsPartner]

    def get(self, request):
        from apps.payments.config.models import RelayCompensationRule
        from apps.payments.payees.models import PayeeType
        from apps.payments.settlements.services import relay_compensation_rule

        compte = resolve_partner_payee(request.user)
        if compte is None or compte.payee_type != PayeeType.RELAY_POINT:
            return Response(
                {"detail": "Cette grille concerne les points relais."},
                status=status.HTTP_403_FORBIDDEN,
            )

        lignes = []
        for taille, libelle in RelayCompensationRule.ParcelSize.choices:
            regle = relay_compensation_rule(compte, taille)
            if regle is None:
                continue
            lignes.append({
                "parcel_size": taille,
                "parcel_size_label": libelle,
                "amount_xaf": regle.amount_xaf,
                "is_accepted": regle.is_accepted,
                "contract_reference": regle.contract_reference,
                # Le partenaire a le droit de savoir si son tarif vient d'un
                # contrat propre ou de la grille generale.
                "is_negotiated": regle.payee_code == compte.payee_code,
            })
        return Response(RelayTariffSerializer(lignes, many=True).data)