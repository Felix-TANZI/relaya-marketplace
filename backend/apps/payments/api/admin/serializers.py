# backend/apps/payments/api/admin/serializers.py
# Vues completes, destinees a l'administration financiere.
#
# ─────────────────────────────────────────────────────────────────────────────
# CE QUI DISTINGUE CES SERIALIZERS DE CEUX DU PARTENAIRE
#
# Cote partenaire, on masque : l'identite des autres, les commissions qui ne
# le concernent pas, les references internes.
#
# Ici, l'administrateur voit TOUT — c'est son metier. Mais chaque etat porte
# aussi son EXPLICATION et l'action recommandee : un ecran financier doit
# dire quoi faire, pas seulement ou on en est.
# ─────────────────────────────────────────────────────────────────────────────

from rest_framework import serializers

from apps.payments.escrow.models import EscrowEvent, EscrowHold
from apps.payments.intents.models import PaymentAttempt, PaymentIntent
from apps.payments.payees.models import PayeeAccount
from apps.payments.reconciliation.models import Discrepancy, ReconciliationRun
from apps.payments.risk.models import RiskAssessment, TrustScore
from apps.payments.settlements.models import (
    Adjustment, PayoutRequest, Refund, SettlementBatch,
)
from apps.payments.tasks.models import TaskRun


# ─────────────────────────────────────────────────────────────────────────────
# EXPLICATIONS — la semantique au meme endroit que le backend
# ─────────────────────────────────────────────────────────────────────────────

#: Ce que chaque etat signifie, et ce qu'il faut en faire.
#: Ces phrases sont celles du tableau de bord : le frontend les reprend au
#: lieu de les reinventer, sinon deux ecrans traduiraient UNKNOWN
#: differemment.
PAYOUT_GUIDANCE = {
    "DRAFT": ("Brouillon.", ""),
    "PENDING_APPROVAL": (
        "En attente d'approbation.",
        "Le demandeur ne peut pas approuver sa propre demande."),
    "APPROVED": (
        "Approuve, pas encore emis.",
        "L'argent partira au prochain passage de l'ordonnanceur."),
    "PROCESSING": ("Emission en cours aupres du prestataire.", ""),
    "PAID": ("Verse.", ""),
    "FAILED": (
        "Refuse par le prestataire.",
        "Verifier le motif, puis creer une NOUVELLE demande."),
    "UNKNOWN": (
        "Issue INCONNUE : on ignore si l'argent est parti.",
        "NE JAMAIS RETENTER. Seule la reconciliation tranche."),
    "REJECTED": ("Rejete.", ""),
    "CANCELLED": ("Annule.", ""),
    "REVERSED": ("Contre-passe.", ""),
}

ESCROW_GUIDANCE = {
    "PENDING": ("En attente de paiement.", ""),
    "HELD": (
        "Fonds sous sequestre.",
        "Hors d'atteinte de toute compensation : la commande est vivante."),
    "RELEASE_SCHEDULED": ("Liberation programmee.", ""),
    "RELEASED": ("Libere. La dette est devenue exigible.", ""),
    "FROZEN": (
        "Gele par un litige.",
        "Seul CE sequestre est gele — les autres du meme paiement ne le "
        "sont pas."),
    "REFUNDED": ("Rembourse. Cet argent n'ira jamais au partenaire.", ""),
    "PARTIALLY_REFUNDED": ("Partiellement rembourse.", ""),
    "CANCELLED": (
        "Annule.",
        "L'argent reste detenu tant qu'aucun remboursement n'est execute."),
}

REFUND_GUIDANCE = {
    "PENDING_APPROVAL": (
        "En attente d'approbation par un TIERS.",
        "Sans cette barriere, ouvrir un litige et le faire trancher "
        "suffirait a encaisser."),
    "APPROVED": ("Approuve, pas encore emis.", ""),
    "PROCESSING": ("Emission en cours.", ""),
    "PAID": ("Rembourse au payeur.", ""),
    "FAILED": ("Refuse par le prestataire.", "Creer une NOUVELLE demande."),
    "UNKNOWN": (
        "Issue INCONNUE.",
        "NE JAMAIS RETENTER : l'argent est peut-etre deja parti."),
    "REJECTED": (
        "Rejete.",
        "Le sequestre reste GELE : le litige n'est pas tranche pour autant."),
}


def _guidance(table: dict, statut: str) -> dict:
    sens, action = table.get(str(statut), ("", ""))
    return {"meaning": sens, "action": action}


# ─────────────────────────────────────────────────────────────────────────────
# BENEFICIAIRE
# ─────────────────────────────────────────────────────────────────────────────

class AdminPayeeSerializer(serializers.ModelSerializer):
    payee_type_label = serializers.CharField(
        source="get_payee_type_display", read_only=True)
    blockers = serializers.SerializerMethodField()

    class Meta:
        model = PayeeAccount
        fields = [
            "payee_code", "payee_type", "payee_type_label", "display_label",
            "momo_operator", "momo_number_masked", "momo_changed_at",
            "kyc_status", "payout_hold", "payout_hold_reason",
            "settlement_cycle_key", "is_active", "blockers", "created_at",
        ]
        read_only_fields = fields

    def get_blockers(self, obj) -> list:
        from apps.payments.payees.services import payout_blockers
        return payout_blockers(obj)


class PayeeBriefSerializer(serializers.ModelSerializer):
    """Version courte, pour les listes."""

    class Meta:
        model = PayeeAccount
        fields = ["payee_code", "payee_type", "display_label"]
        read_only_fields = fields


# ─────────────────────────────────────────────────────────────────────────────
# PAIEMENTS
# ─────────────────────────────────────────────────────────────────────────────

class AdminAttemptSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentAttempt
        fields = [
            "external_reference", "provider_code", "provider_reference",
            "status", "amount_xaf", "payer_operator", "payer_msisdn_masked",
            "error_code", "error_message", "poll_count",
            "created_at", "settled_at",
        ]
        read_only_fields = fields


class AdminIntentListSerializer(serializers.ModelSerializer):
    status_label = serializers.CharField(source="get_status_display",
                                         read_only=True)
    buyer_username = serializers.CharField(source="buyer.username",
                                           read_only=True)

    class Meta:
        model = PaymentIntent
        fields = [
            "reference", "status", "status_label", "amount_xaf",
            "amount_captured_xaf", "amount_refunded_xaf",
            "payer_operator", "payer_msisdn_masked", "payer_relationship",
            "buyer_username", "risk_score", "created_at", "confirmed_at",
        ]
        read_only_fields = fields


class AdminIntentDetailSerializer(AdminIntentListSerializer):
    attempts = AdminAttemptSerializer(many=True, read_only=True)
    distribution_plan = serializers.JSONField(read_only=True)
    orders = serializers.SerializerMethodField()
    escrow_holds = serializers.SerializerMethodField()
    needs_reallocation = serializers.SerializerMethodField()

    class Meta(AdminIntentListSerializer.Meta):
        fields = AdminIntentListSerializer.Meta.fields + [
            "idempotency_key", "correlation_id", "expires_at",
            "failure_reason", "distribution_plan", "attempts", "orders",
            "escrow_holds", "needs_reallocation",
        ]
        read_only_fields = fields

    def get_orders(self, obj) -> list:
        from apps.payments.bridge.intent_orders import PaymentIntentOrder
        return list(PaymentIntentOrder.objects.filter(intent=obj)
                    .values_list("order_id", flat=True))

    def get_escrow_holds(self, obj) -> list:
        return AdminEscrowListSerializer(
            obj.escrow_holds.select_related("payee"), many=True).data

    def get_needs_reallocation(self, obj) -> bool:
        return bool((obj.distribution_plan or {}).get("needs_reallocation"))


# ─────────────────────────────────────────────────────────────────────────────
# SEQUESTRES
# ─────────────────────────────────────────────────────────────────────────────

class AdminEscrowListSerializer(serializers.ModelSerializer):
    status_label = serializers.CharField(source="get_status_display",
                                         read_only=True)
    component_label = serializers.CharField(source="get_component_display",
                                            read_only=True)
    payee = PayeeBriefSerializer(read_only=True)
    payable_xaf = serializers.IntegerField(source="payable_amount_xaf",
                                           read_only=True)
    guidance = serializers.SerializerMethodField()

    class Meta:
        model = EscrowHold
        fields = [
            "reference", "component", "component_label", "order_id",
            "payee", "status", "status_label",
            "gross_amount_xaf", "commission_xaf", "net_amount_xaf",
            "refunded_amount_xaf", "payable_xaf",
            "release_trigger", "auto_confirm_at", "release_at",
            "frozen_reason", "settlement_batch_ref", "guidance", "created_at",
        ]
        read_only_fields = fields

    def get_guidance(self, obj) -> dict:
        return _guidance(ESCROW_GUIDANCE, obj.status)


class AdminEscrowDetailSerializer(AdminEscrowListSerializer):
    intent_reference = serializers.CharField(source="intent.reference",
                                             read_only=True)
    policy_snapshot = serializers.JSONField(read_only=True)
    siblings = serializers.SerializerMethodField()

    class Meta(AdminEscrowListSerializer.Meta):
        fields = AdminEscrowListSerializer.Meta.fields + [
            "intent_reference", "policy_snapshot", "dispute_window_ends_at",
            "triggered_at", "released_at", "frozen_at", "siblings",
        ]
        read_only_fields = fields

    def get_siblings(self, obj) -> list:
        """
        Les autres sequestres du meme paiement.

        Geler celui-ci ne gele PAS les autres — c'est ce que la cle a quatre
        dimensions rend possible, et l'ecran doit le montrer pour eviter
        qu'un operateur croie bloquer tout le paiement.
        """
        freres = EscrowHold.objects.filter(intent_id=obj.intent_id).exclude(
            pk=obj.pk).select_related("payee")
        return [
            {"reference": f.reference, "component": f.component,
             "order_id": f.order_id, "status": f.status,
             "payee_code": f.payee.payee_code,
             "net_amount_xaf": f.net_amount_xaf}
            for f in freres[:20]
        ]


# ─────────────────────────────────────────────────────────────────────────────
# REGLEMENTS ET VERSEMENTS
# ─────────────────────────────────────────────────────────────────────────────

class AdminBatchListSerializer(serializers.ModelSerializer):
    status_label = serializers.CharField(source="get_status_display",
                                         read_only=True)
    payee = PayeeBriefSerializer(read_only=True)
    payout_reference = serializers.SerializerMethodField()

    class Meta:
        model = SettlementBatch
        fields = [
            "reference", "payee", "status", "status_label", "cycle_key",
            "period_start", "period_end", "gross_amount_xaf",
            "adjustments_xaf", "net_amount_xaf", "is_exceptional",
            "exceptional_reason", "payout_reference", "created_at",
        ]
        read_only_fields = fields

    def get_payout_reference(self, obj) -> str:
        demande = getattr(obj, "payout", None)
        return demande.reference if demande else ""


class AdminBatchDetailSerializer(AdminBatchListSerializer):
    lines = serializers.SerializerMethodField()
    adjustments = serializers.SerializerMethodField()

    class Meta(AdminBatchListSerializer.Meta):
        fields = AdminBatchListSerializer.Meta.fields + ["lines", "adjustments"]
        read_only_fields = fields

    def get_lines(self, obj) -> list:
        return [
            {"reference": h.reference, "component": h.component,
             "order_id": h.order_id, "gross_xaf": h.gross_amount_xaf,
             "commission_xaf": h.commission_xaf,
             "net_xaf": h.payable_amount_xaf, "released_at": h.released_at}
            for h in obj.covered_holds.all()[:300]
        ]

    def get_adjustments(self, obj) -> list:
        return AdminAdjustmentSerializer(
            obj.applied_adjustments.select_related("payee"), many=True).data


class AdminPayoutListSerializer(serializers.ModelSerializer):
    status_label = serializers.CharField(source="get_status_display",
                                         read_only=True)
    payee = PayeeBriefSerializer(read_only=True)
    approvals_count = serializers.IntegerField(read_only=True)
    is_fully_approved = serializers.BooleanField(read_only=True)
    guidance = serializers.SerializerMethodField()

    class Meta:
        model = PayoutRequest
        fields = [
            "reference", "payee", "status", "status_label", "amount_xaf",
            "psp_fee_xaf", "required_approvals", "approvals_count",
            "is_fully_approved", "payee_operator", "payee_msisdn_masked",
            "provider_code", "error_code", "guidance",
            "requested_at", "settled_at",
        ]
        read_only_fields = fields

    def get_guidance(self, obj) -> dict:
        return _guidance(PAYOUT_GUIDANCE, obj.status)


class AdminPayoutDetailSerializer(AdminPayoutListSerializer):
    batch_reference = serializers.SerializerMethodField()
    approvals = serializers.SerializerMethodField()
    requested_by_username = serializers.CharField(
        source="requested_by.username", read_only=True)

    class Meta(AdminPayoutListSerializer.Meta):
        fields = AdminPayoutListSerializer.Meta.fields + [
            "provider_external_reference", "provider_reference",
            "provider_status_raw", "error_message", "response_payload",
            "justification", "batch_reference", "approvals",
            "requested_by_username", "executed_at",
        ]
        read_only_fields = fields

    def get_batch_reference(self, obj) -> str:
        return obj.batch.reference if obj.batch_id else ""

    def get_approvals(self, obj) -> list:
        return [
            {"by": a.approved_by.username, "at": a.approved_at,
             "comment": a.comment}
            for a in obj.approvals.select_related("approved_by")
        ]


# ─────────────────────────────────────────────────────────────────────────────
# REMBOURSEMENTS ET AJUSTEMENTS
# ─────────────────────────────────────────────────────────────────────────────

class AdminRefundSerializer(serializers.ModelSerializer):
    status_label = serializers.CharField(source="get_status_display",
                                         read_only=True)
    reason_label = serializers.CharField(source="get_reason_display",
                                         read_only=True)
    intent_reference = serializers.CharField(source="intent.reference",
                                             read_only=True)
    payer_msisdn_masked = serializers.CharField(
        source="intent.payer_msisdn_masked", read_only=True)
    requested_by_username = serializers.CharField(
        source="requested_by.username", read_only=True)
    approved_by_username = serializers.SerializerMethodField()
    payout_reference = serializers.SerializerMethodField()
    guidance = serializers.SerializerMethodField()

    class Meta:
        model = Refund
        fields = [
            "reference", "intent_reference", "amount_xaf",
            "reason", "reason_label", "detail", "status", "status_label",
            "payer_msisdn_masked", "requested_by_username",
            "approved_by_username", "approved_at", "payout_reference",
            "guidance", "created_at",
        ]
        read_only_fields = fields

    def get_approved_by_username(self, obj) -> str:
        return obj.approved_by.username if obj.approved_by_id else ""

    def get_payout_reference(self, obj) -> str:
        return obj.payout.reference if obj.payout_id else ""

    def get_guidance(self, obj) -> dict:
        return _guidance(REFUND_GUIDANCE, obj.status)


class AdminAdjustmentSerializer(serializers.ModelSerializer):
    direction_label = serializers.SerializerMethodField()
    category_label = serializers.CharField(source="get_category_display",
                                           read_only=True)
    status_label = serializers.CharField(source="get_status_display",
                                         read_only=True)
    payee = PayeeBriefSerializer(read_only=True)
    created_by_username = serializers.CharField(
        source="created_by.username", read_only=True)
    approved_by_username = serializers.SerializerMethodField()

    class Meta:
        model = Adjustment
        fields = [
            "reference", "payee", "direction", "direction_label",
            "category", "category_label", "amount_xaf", "remaining_xaf",
            "reason", "evidence_url", "source_order_id", "source_event",
            "source_contract", "status", "status_label",
            "max_offset_percent", "created_by_username",
            "approved_by_username", "approved_at", "created_at",
        ]
        read_only_fields = fields

    def get_direction_label(self, obj) -> str:
        return ("Le partenaire doit a BelivaY" if obj.is_debt
                else "BelivaY doit au partenaire")

    def get_approved_by_username(self, obj) -> str:
        if obj.approved_by_id:
            return obj.approved_by.username
        if obj.source_contract:
            return "(autorise par contrat)"
        return ""


# ─────────────────────────────────────────────────────────────────────────────
# RECONCILIATION, RISQUE, ORDONNANCEUR
# ─────────────────────────────────────────────────────────────────────────────

class AdminReconciliationRunSerializer(serializers.ModelSerializer):
    level_label = serializers.CharField(source="get_level_display",
                                        read_only=True)
    status_label = serializers.CharField(source="get_status_display",
                                         read_only=True)

    class Meta:
        model = ReconciliationRun
        fields = [
            "reference", "level", "level_label", "status", "status_label",
            "period_start", "period_end", "checked_count",
            "discrepancy_count", "total_gap_xaf", "summary", "error",
            "started_at", "finished_at",
        ]
        read_only_fields = fields


class AdminDiscrepancySerializer(serializers.ModelSerializer):
    kind_label = serializers.CharField(source="get_kind_display",
                                       read_only=True)
    severity_label = serializers.CharField(source="get_severity_display",
                                           read_only=True)
    resolution_label = serializers.CharField(source="get_resolution_display",
                                             read_only=True)
    run_reference = serializers.CharField(source="run.reference",
                                          read_only=True)
    resolved_by_username = serializers.SerializerMethodField()

    class Meta:
        model = Discrepancy
        fields = [
            "id", "run_reference", "kind", "kind_label",
            "severity", "severity_label", "subject_type", "subject_ref",
            "provider_reference", "expected_xaf", "observed_xaf", "gap_xaf",
            "detail", "evidence", "suggested_action",
            "resolution", "resolution_label", "resolution_note",
            "resolved_by_username", "resolved_at", "created_at",
        ]
        read_only_fields = fields

    def get_resolved_by_username(self, obj) -> str:
        return obj.resolved_by.username if obj.resolved_by_id else ""


class AdminRiskAssessmentSerializer(serializers.ModelSerializer):
    decision_label = serializers.CharField(source="get_decision_display",
                                           read_only=True)
    signals = serializers.SerializerMethodField()
    overridden_by_username = serializers.SerializerMethodField()

    class Meta:
        model = RiskAssessment
        fields = [
            "id", "subject_type", "subject_ref", "score",
            "decision", "decision_label", "note", "policy_key",
            "signals", "overridden_by_username", "override_reason",
            "overridden_at", "created_at",
        ]
        read_only_fields = fields

    def get_signals(self, obj) -> list:
        return [
            {"kind": s.kind, "severity": s.severity, "weight": s.weight,
             "detail": s.detail, "evidence": s.evidence}
            for s in obj.signals.all()
        ]

    def get_overridden_by_username(self, obj) -> str:
        return obj.overridden_by.username if obj.overridden_by_id else ""


class AdminTrustScoreSerializer(serializers.ModelSerializer):
    payee = PayeeBriefSerializer(read_only=True)
    delta = serializers.IntegerField(read_only=True)

    class Meta:
        model = TrustScore
        fields = [
            "id", "payee", "score", "previous_score", "delta",
            "orders_count", "disputes_count", "late_count",
            "cancelled_count", "breakdown", "window_days", "computed_at",
        ]
        read_only_fields = fields


class AdminTaskRunSerializer(serializers.ModelSerializer):
    status_label = serializers.CharField(source="get_status_display",
                                         read_only=True)

    class Meta:
        model = TaskRun
        fields = [
            "id", "task_name", "status", "status_label", "result", "note",
            "error", "hostname", "duration_ms", "started_at", "finished_at",
        ]
        read_only_fields = fields


class AdminEscrowEventSerializer(serializers.ModelSerializer):
    kind_label = serializers.CharField(source="get_kind_display",
                                       read_only=True)
    outcome_label = serializers.CharField(source="get_outcome_display",
                                          read_only=True)

    class Meta:
        model = EscrowEvent
        fields = [
            "id", "event_id", "kind", "kind_label", "emitter",
            "order_id", "intent_reference", "component", "payload",
            "outcome", "outcome_label", "note", "affected_holds",
            "occurred_at", "received_at",
        ]
        read_only_fields = fields


# ─────────────────────────────────────────────────────────────────────────────
# ENTREES D'ACTION
# ─────────────────────────────────────────────────────────────────────────────

class ReasonInputSerializer(serializers.Serializer):
    """Motif obligatoire — toute action hors cycle normal doit s'expliquer."""

    reason = serializers.CharField(max_length=2000)

    def validate_reason(self, valeur):
        if not valeur.strip():
            raise serializers.ValidationError("Le motif ne peut pas etre vide.")
        return valeur.strip()


class OptionalCommentSerializer(serializers.Serializer):
    comment = serializers.CharField(max_length=2000, required=False,
                                    allow_blank=True, default="")


class CreateAdjustmentSerializer(serializers.Serializer):
    payee_code = serializers.CharField(max_length=40)
    direction = serializers.ChoiceField(choices=Adjustment.Direction.choices)
    category = serializers.ChoiceField(choices=Adjustment.Category.choices)
    amount_xaf = serializers.IntegerField(min_value=1)
    reason = serializers.CharField(max_length=2000)
    source_order_id = serializers.IntegerField(required=False, allow_null=True)
    max_offset_percent = serializers.DecimalField(
        max_digits=5, decimal_places=2, required=False, allow_null=True)

    def validate_reason(self, valeur):
        if not valeur.strip():
            raise serializers.ValidationError("Le motif est obligatoire.")
        return valeur.strip()


class CreateRefundSerializer(serializers.Serializer):
    intent_reference = serializers.CharField(max_length=40)
    amount_xaf = serializers.IntegerField(min_value=1)
    reason = serializers.ChoiceField(choices=Refund.Reason.choices)
    detail = serializers.CharField(max_length=2000, required=False,
                                   allow_blank=True, default="")


class ResolveDiscrepancySerializer(serializers.Serializer):
    resolution = serializers.ChoiceField(choices=Discrepancy.Resolution.choices)
    note = serializers.CharField(max_length=2000)

    def validate_note(self, valeur):
        if not valeur.strip():
            raise serializers.ValidationError(
                "Une resolution exige une note explicative.")
        return valeur.strip()


class BuildSettlementsSerializer(serializers.Serializer):
    cycle_key = serializers.CharField(max_length=120, required=False,
                                      allow_blank=True, default="")
    payee_type = serializers.CharField(max_length=30, required=False,
                                       allow_blank=True, default="")
    confirm = serializers.BooleanField(default=True)