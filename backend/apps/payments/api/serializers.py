# backend/apps/payments/api/serializers.py
# Serializers de la couche HTTP du module financier.
#
# ─────────────────────────────────────────────────────────────────────────────
# ANONYMAT ACHETEUR — REGLE ABSOLUE
#
# Un paiement expose une repartition entre beneficiaires. Cote ACHETEUR,
# aucune information identifiant un vendeur ne doit sortir : ni nom, ni
# libelle, ni code beneficiaire.
#
# Le code PAY-VND-000341 est un identifiant STABLE : le correler entre deux
# commandes revelerait qu'elles viennent du meme vendeur. C'est une fuite
# d'anonymat, meme sans nom.
#
# Les serializers acheteur exposent donc le MONTANT et l'ETAT, jamais le
# BENEFICIAIRE.
# ─────────────────────────────────────────────────────────────────────────────

from rest_framework import serializers

from apps.payments.escrow.models import EscrowHold
from apps.payments.intents.models import PaymentAttempt, PaymentIntent
from apps.payments.settlements.models import (
    Adjustment, PayoutRequest, Refund, SettlementBatch,
)


# ─────────────────────────────────────────────────────────────────────────────
# ESPACE ACHETEUR
# ─────────────────────────────────────────────────────────────────────────────

class BuyerAttemptSerializer(serializers.ModelSerializer):
    """Tentative de paiement, vue acheteur. Aucun detail prestataire."""

    status_label = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = PaymentAttempt
        fields = [
            "external_reference", "status", "status_label",
            "amount_xaf", "payer_operator", "payer_msisdn_masked",
            "error_code", "created_at", "settled_at",
        ]
        read_only_fields = fields


class BuyerIntentSerializer(serializers.ModelSerializer):
    """
    Intention de paiement, vue acheteur.

    N'EXPOSE AUCUN BENEFICIAIRE. Le plan de repartition est resume en
    montants par composant — l'acheteur a le droit de savoir combien va au
    transport, pas a QUI.
    """

    status_label = serializers.CharField(source="get_status_display", read_only=True)
    breakdown = serializers.SerializerMethodField()
    orders = serializers.SerializerMethodField()
    attempts = BuyerAttemptSerializer(many=True, read_only=True)
    can_retry = serializers.SerializerMethodField()

    class Meta:
        model = PaymentIntent
        fields = [
            "reference", "status", "status_label",
            "amount_xaf", "amount_captured_xaf", "amount_refunded_xaf",
            "currency", "payer_operator", "payer_msisdn_masked",
            "expires_at", "confirmed_at", "failure_reason",
            "breakdown", "orders", "attempts", "can_retry", "created_at",
        ]
        read_only_fields = fields

    def get_breakdown(self, obj) -> dict:
        """
        Repartition par COMPOSANT, jamais par beneficiaire.

        L'acheteur voit ce qu'il paie pour la marchandise et pour la
        livraison. Il ne voit ni le code, ni le libelle, ni la commission
        d'un vendeur.

        ─────────────────────────────────────────────────────────────────────
        LA SOMME DOIT TOUJOURS EGALER LE MONTANT PAYE.

        Un composant integralement attribue a la plateforme — la livraison,
        quand aucun transporteur n'est encore assigne — ne cree AUCUN
        sequestre. Le sommer depuis les seuls sequestres afficherait donc
        moins que ce que l'acheteur a paye.

        Le reliquat est expose sous `delivery_and_services_xaf` plutot que
        passe sous silence : montrer 20 000 a quelqu'un qui en a paye 22 000
        est un probleme de transparence, pas un detail d'affichage.
        ─────────────────────────────────────────────────────────────────────
        """
        plan = obj.distribution_plan or {}
        totaux: dict = {}
        for hold in plan.get("holds", []):
            composant = hold.get("component", "AUTRE")
            totaux.setdefault(composant, 0)
            totaux[composant] += int(hold.get("gross", 0))

        reliquat = max(0, obj.amount_xaf - sum(totaux.values()))

        return {
            "by_component_xaf": totaux,
            "delivery_and_services_xaf": reliquat,
            "total_xaf": obj.amount_xaf,
            # Garantie verifiable par le client : les parts somment au total.
            "is_complete": sum(totaux.values()) + reliquat == obj.amount_xaf,
        }

    def get_orders(self, obj) -> list:
        try:
            from apps.payments.bridge.intent_orders import PaymentIntentOrder
        except ImportError:
            return []
        return list(
            PaymentIntentOrder.objects.filter(intent=obj)
            .values_list("order_id", flat=True)
        )

    def get_can_retry(self, obj) -> bool:
        return obj.status in (
            PaymentIntent.Status.DRAFT,
            PaymentIntent.Status.REQUIRES_ACTION,
        ) and not obj.is_expired


class BuyerEscrowSerializer(serializers.ModelSerializer):
    """
    Sequestre, vue acheteur.

    C'est LA promesse de BelivaY rendue visible : « votre argent est bloque
    jusqu'a confirmation ». On expose l'etat et l'echeance, jamais le
    beneficiaire ni la commission.
    """

    status_label = serializers.CharField(source="get_status_display", read_only=True)
    component_label = serializers.CharField(source="get_component_display", read_only=True)
    protection = serializers.SerializerMethodField()

    class Meta:
        model = EscrowHold
        fields = [
            "reference", "component", "component_label", "order_id",
            "status", "status_label", "gross_amount_xaf",
            "auto_confirm_at", "release_at", "dispute_window_ends_at",
            "protection",
        ]
        read_only_fields = fields

    def get_protection(self, obj) -> dict:
        actif = obj.status in (
            EscrowHold.Status.HELD, EscrowHold.Status.RELEASE_SCHEDULED,
            EscrowHold.Status.FROZEN,
        )
        return {
            "funds_protected": actif,
            "message": (
                "Votre argent est conserve par BelivaY et ne sera verse "
                "qu'apres confirmation de votre reception."
                if actif else
                "Cette etape est terminee."
            ),
        }


class InitiatePaymentSerializer(serializers.Serializer):
    """Declenche l'encaissement d'une intention."""

    payer_msisdn = serializers.CharField(max_length=20, required=False,
                                         allow_blank=True)
    payer_operator = serializers.ChoiceField(choices=["MTN", "ORANGE"],
                                             required=False, allow_blank=True)


# ─────────────────────────────────────────────────────────────────────────────
# ESPACE PARTENAIRE
# ─────────────────────────────────────────────────────────────────────────────

class BuyerRefundSerializer(serializers.ModelSerializer):
    """
    Remboursement, vue acheteur.

    Sans cet ecran, un acheteur verrait son argent revenir sans explication.
    On lui dit POURQUOI et OU va l'argent — vers le numero qui a paye.
    """

    status_label = serializers.CharField(source="get_status_display",
                                         read_only=True)
    reason_label = serializers.CharField(source="get_reason_display",
                                         read_only=True)
    payment_reference = serializers.CharField(source="intent.reference",
                                              read_only=True)
    destination_masked = serializers.CharField(
        source="intent.payer_msisdn_masked", read_only=True)
    orders = serializers.SerializerMethodField()
    explanation = serializers.SerializerMethodField()

    class Meta:
        model = Refund
        fields = [
            "reference", "payment_reference", "amount_xaf",
            "reason", "reason_label", "status", "status_label",
            "destination_masked", "orders", "explanation", "created_at",
        ]
        read_only_fields = fields

    def get_orders(self, obj) -> list:
        return sorted({h.order_id for h in obj.source_holds.all()
                       if h.order_id is not None})

    def get_explanation(self, obj) -> str:
        etapes = {
            "PENDING_APPROVAL": (
                "Votre remboursement est en cours de validation par "
                "BelivaY."),
            "APPROVED": "Validé. Le virement part sous peu.",
            "PROCESSING": "Virement en cours vers votre numéro Mobile Money.",
            "PAID": ("Remboursé. L'argent est retourné sur le numéro qui "
                     "avait payé."),
            "FAILED": ("Le virement n'a pas abouti. BelivaY relance "
                       "l'opération."),
            "UNKNOWN": ("Vérification en cours auprès de l'opérateur. Vous "
                        "serez informé sous peu."),
            "REJECTED": "Cette demande de remboursement n'a pas été retenue.",
        }
        return etapes.get(str(obj.status), "")


class PartnerDueSerializer(serializers.Serializer):
    """
    Ce que BelivaY doit a un partenaire.

    IL N'Y A NI SOLDE, NI BOUTON DE RETRAIT (principe P10). Le partenaire
    voit un MONTANT DU et une DATE DE REGLEMENT. `not_yet_due_xaf`
    correspond a des commandes vivantes : l'acheteur peut encore obtenir un
    remboursement integral, ces fonds ne sont pas encore les siens.
    """

    payee_code = serializers.CharField()
    # Le TYPE est expose explicitement : deduire un type d'un prefixe de
    # chaine — PAY-VND-, PAY-DLV-, PAY-RLY- — serait fragile, et le frontend
    # en a besoin pour adapter ses libelles.
    payee_type = serializers.CharField(default="")
    payee_type_label = serializers.CharField(default="")
    display_label = serializers.CharField(default="")
    due_xaf = serializers.IntegerField()
    released_not_settled_xaf = serializers.IntegerField()
    pending_bonus_xaf = serializers.IntegerField()
    outstanding_debt_xaf = serializers.IntegerField()
    in_settlement_xaf = serializers.IntegerField()
    not_yet_due_xaf = serializers.IntegerField()
    frozen_xaf = serializers.IntegerField()
    next_settlement_cycle = serializers.CharField()
    #: Date reelle du prochain reglement. Nulle pour un cycle au seuil, qui
    #: depend du montant accumule et non du calendrier.
    next_settlement_at = serializers.DateTimeField(allow_null=True, required=False)
    blockers = serializers.ListField(child=serializers.CharField())


class PartnerEscrowSerializer(serializers.ModelSerializer):
    """Sequestre, vue partenaire. Il voit SA commission — c'est la sienne."""

    status_label = serializers.CharField(source="get_status_display", read_only=True)
    component_label = serializers.CharField(source="get_component_display", read_only=True)
    payable_xaf = serializers.IntegerField(source="payable_amount_xaf",
                                           read_only=True)

    class Meta:
        model = EscrowHold
        fields = [
            "reference", "component", "component_label", "order_id",
            "status", "status_label",
            "gross_amount_xaf", "commission_xaf", "net_amount_xaf",
            "payable_xaf", "release_trigger",
            "auto_confirm_at", "release_at", "frozen_reason",
            "settlement_batch_ref", "created_at",
        ]
        read_only_fields = fields


class PartnerAdjustmentSerializer(serializers.ModelSerializer):
    """
    Ajustement, vue partenaire.

    Le MOTIF est expose : une retenue sans explication est contractuellement
    indefendable.
    """

    direction_label = serializers.SerializerMethodField()
    category_label = serializers.CharField(source="get_category_display",
                                           read_only=True)

    class Meta:
        model = Adjustment
        fields = [
            "reference", "direction", "direction_label",
            "category", "category_label", "amount_xaf", "remaining_xaf",
            "reason", "status", "created_at",
        ]
        read_only_fields = fields

    def get_direction_label(self, obj) -> str:
        return ("Vous devez a BelivaY" if obj.is_debt
                else "BelivaY vous doit")


class PartnerSettlementSerializer(serializers.ModelSerializer):
    """
    Releve de reglement, vue partenaire.

    L'agregation est FINANCIERE, pas informationnelle : un lot regroupe N
    sequestres en UN versement, mais le releve reste detaille ligne par
    ligne.
    """

    status_label = serializers.CharField(source="get_status_display", read_only=True)
    lines = serializers.SerializerMethodField()
    adjustments = serializers.SerializerMethodField()
    payout = serializers.SerializerMethodField()

    class Meta:
        model = SettlementBatch
        fields = [
            "reference", "status", "status_label",
            "period_start", "period_end",
            "gross_amount_xaf", "adjustments_xaf", "net_amount_xaf",
            "is_exceptional", "lines", "adjustments", "payout", "created_at",
        ]
        read_only_fields = fields

    def get_lines(self, obj) -> list:
        return [
            {
                "reference": hold.reference,
                "component": hold.component,
                "order_id": hold.order_id,
                "gross_xaf": hold.gross_amount_xaf,
                "commission_xaf": hold.commission_xaf,
                "net_xaf": hold.payable_amount_xaf,
                "released_at": hold.released_at,
            }
            for hold in obj.covered_holds.all()[:200]
        ]

    def get_adjustments(self, obj) -> list:
        return PartnerAdjustmentSerializer(
            obj.applied_adjustments.all()[:50], many=True).data

    def get_payout(self, obj) -> dict | None:
        demande = getattr(obj, "payout", None)
        if demande is None:
            return None
        return {
            "reference": demande.reference,
            "status": demande.status,
            "status_label": demande.get_status_display(),
            "amount_xaf": demande.amount_xaf,
            "msisdn_masked": demande.payee_msisdn_masked,
            "operator": demande.payee_operator,
            "settled_at": demande.settled_at,
        }


class PartnerPayoutSerializer(serializers.ModelSerializer):
    status_label = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = PayoutRequest
        fields = [
            "reference", "status", "status_label", "amount_xaf",
            "payee_msisdn_masked", "payee_operator",
            "requested_at", "settled_at",
        ]
        read_only_fields = fields


class RelayTariffSerializer(serializers.Serializer):
    """
    Grille tarifaire d'un point relais — son CONTRAT rendu lisible.

    Le montant varie par categorie de colis : un encombrant n'occupe pas la
    meme place qu'un petit colis. Certaines categories peuvent etre refusees.
    """

    parcel_size = serializers.CharField()
    parcel_size_label = serializers.CharField()
    amount_xaf = serializers.IntegerField()
    is_accepted = serializers.BooleanField()
    contract_reference = serializers.CharField(allow_blank=True)
    is_negotiated = serializers.BooleanField(
        help_text="Vrai si ce tarif vient d'un contrat propre a ce relais, "
                  "faux s'il vient de la grille generale.")