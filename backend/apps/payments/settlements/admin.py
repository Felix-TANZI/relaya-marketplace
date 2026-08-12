# backend/apps/payments/settlements/admin.py
# Administration des reglements.
#
# CONSULTATION TOTALE : montant du, lots detailles ligne par ligne,
# ajustements, approbations, part de reglements hors cycle.
#
# ECRITURE CONTROLEE : toutes les operations passent par la couche de
# service. Aucune approbation par edition de champ — la separation des roles
# doit rester verifiable.

from django.contrib import admin, messages
from django.utils.html import format_html
from django.utils.safestring import mark_safe

from .models import (
    Adjustment, PayoutApproval, PayoutRequest, Refund, SettlementBatch,
)
from .services import (
    SettlementError, approve_adjustment, approve_payout, approve_refund,
    confirm_batch, exceptional_share, execute_payout, execute_refund,
    reject_payout, request_payout,
)

BATCH_COLORS = {
    "DRAFT": "#6B7280", "CONFIRMED": "#2563EB", "PENDING_APPROVAL": "#D97706",
    "APPROVED": "#7C3AED", "PROCESSING": "#2563EB", "PAID": "#16A34A",
    "FAILED": "#DC2626", "PARTIAL": "#D97706",
}

PAYOUT_COLORS = {
    "DRAFT": "#6B7280", "PENDING_APPROVAL": "#D97706", "APPROVED": "#7C3AED",
    "PROCESSING": "#2563EB", "PAID": "#16A34A", "FAILED": "#DC2626",
    "UNKNOWN": "#DC2626", "REJECTED": "#6B7280", "CANCELLED": "#6B7280",
    "REVERSED": "#7C3AED",
}


def _fmt(montant) -> str:
    valeur = int(montant or 0)
    signe = "-" if valeur < 0 else ""
    return f"{signe}{abs(valeur):,}".replace(",", " ") + " FCFA"


@admin.register(Adjustment)
class AdjustmentAdmin(admin.ModelAdmin):
    list_display = (
        "reference", "payee_link", "direction_badge", "category",
        "amount_display", "remaining_display", "status_badge",
        "created_by", "approved_by", "created_at",
    )
    list_filter = ("direction", "category", "status", "created_at")
    search_fields = ("reference", "payee__payee_code", "reason", "source_event")
    date_hierarchy = "created_at"
    ordering = ("-created_at",)
    list_select_related = ("payee", "created_by", "approved_by")

    readonly_fields = (
        "id", "reference", "payee", "direction", "category",
        "amount_display", "remaining_display", "status",
        "created_by", "approved_by", "approved_at",
        "offset_note", "ledger_view", "created_at", "updated_at",
    )

    fieldsets = (
        ("Ajustement", {
            "fields": ("id", "reference", "payee", "direction", "category",
                       "amount_display", "remaining_display", "status"),
        }),
        ("Motif", {"fields": ("reason", "evidence_url", "source_order_id",
                              "source_event")}),
        ("Retenue", {
            "fields": ("max_offset_percent", "offset_note"),
            "description": "Vide = plafond de la PayoutPolicy.",
        }),
        ("Validation", {"fields": ("created_by", "approved_by", "approved_at")}),
        ("Comptabilite", {"fields": ("ledger_view",)}),
        ("Horodatage", {"fields": ("created_at", "updated_at"),
                        "classes": ("collapse",)}),
    )

    def has_delete_permission(self, request, obj=None):
        return False

    @admin.display(description="Beneficiaire", ordering="payee__payee_code")
    def payee_link(self, obj):
        return format_html(
            '<a href="/django-admin/payments/payeeaccount/{}/change/">{}</a>',
            obj.payee_id, obj.payee.payee_code,
        )

    @admin.display(description="Sens", ordering="direction")
    def direction_badge(self, obj):
        if obj.is_debt:
            return mark_safe(
                '<span style="color:#DC2626;font-weight:700;" '
                'title="Le partenaire doit a BelivaY">creance</span>'
            )
        return mark_safe(
            '<span style="color:#16A34A;font-weight:700;" '
            'title="BelivaY doit au partenaire">a verser</span>'
        )

    @admin.display(description="Montant", ordering="amount_xaf")
    def amount_display(self, obj):
        return _fmt(obj.amount_xaf)

    @admin.display(description="Reste")
    def remaining_display(self, obj):
        if obj.remaining_xaf == 0:
            return mark_safe('<span style="color:#16A34A;">solde</span>')
        return format_html('<b style="color:#D97706;">{}</b>', _fmt(obj.remaining_xaf))

    @admin.display(description="Statut", ordering="status")
    def status_badge(self, obj):
        couleurs = {"PENDING_APPROVAL": "#D97706", "APPROVED": "#2563EB",
                    "APPLIED": "#16A34A", "CANCELLED": "#6B7280",
                    "DISPUTED": "#DC2626"}
        return format_html(
            '<span style="color:{};font-weight:700;">● {}</span>',
            couleurs.get(obj.status, "#6B7280"), obj.get_status_display(),
        )

    @admin.display(description="Regle de retenue")
    def offset_note(self, obj):
        if not obj.is_debt:
            return "Un montant du au partenaire s'ajoute sans plafond."
        return mark_safe(
            '<div style="padding:10px;background:#FEF3C7;'
            'border-left:4px solid #D97706;">'
            "Une creance ne peut retenir qu'une PART d'un reglement.<br>"
            "Sans plafond, un partenaire qui doit autant qu'on lui doit "
            "toucherait <b>zero</b> : il ne pourrait plus s'approvisionner "
            "ni livrer, et la retenue integrale s'apparente juridiquement "
            "a une saisie.<br>"
            "Le solde est recupere sur les reglements suivants.</div>"
        )

    @admin.display(description="Ecritures")
    def ledger_view(self, obj):
        from apps.payments.ledger.models import LedgerTransaction
        transactions = LedgerTransaction.objects.filter(
            source_type="Adjustment", source_ref=obj.reference,
        )
        if not transactions:
            return "— aucune ecriture —"
        return mark_safe("<br>".join(
            f'<a href="/django-admin/payments/ledgertransaction/{t.pk}/change/">'
            f"{t.reference}</a> — {_fmt(t.total_debit())}" for t in transactions
        ))

    @admin.action(description="Approuver (le createur ne peut pas)")
    def approve_selected(self, request, queryset):
        ok = 0
        for ajustement in queryset.filter(status=Adjustment.Status.PENDING_APPROVAL):
            try:
                approve_adjustment(ajustement, approved_by=request.user)
                ok += 1
            except SettlementError as exc:
                self.message_user(request, f"{ajustement.reference} : {exc}",
                                  level=messages.ERROR)
        if ok:
            self.message_user(request, f"{ok} ajustement(s) approuve(s).")

    actions = ["approve_selected"]


class PayoutApprovalInline(admin.TabularInline):
    model = PayoutApproval
    extra = 0
    can_delete = False
    fields = ("approved_by", "comment", "approved_at")
    readonly_fields = fields

    def has_add_permission(self, request, obj=None):
        return False

    def has_change_permission(self, request, obj=None):
        return False


@admin.register(SettlementBatch)
class SettlementBatchAdmin(admin.ModelAdmin):
    list_display = (
        "reference", "payee_link", "status_badge", "exceptional_badge",
        "gross_display", "adjustments_display", "net_display",
        "period_end", "created_at",
    )
    list_filter = ("status", "is_exceptional", "cycle_key", "created_at")
    search_fields = ("reference", "payee__payee_code", "exceptional_reason")
    date_hierarchy = "created_at"
    ordering = ("-created_at",)
    list_select_related = ("payee",)

    readonly_fields = (
        "id", "reference", "payee", "cycle_key", "period_start", "period_end",
        "gross_display", "adjustments_display", "net_display", "status",
        "is_exceptional", "exceptional_reason", "detail_view",
        "payout_view", "regulatory_note", "created_at", "updated_at",
    )

    fieldsets = (
        ("Lot", {
            "fields": ("id", "reference", "payee", "cycle_key",
                       "period_start", "period_end", "status"),
        }),
        ("Montants", {
            "fields": ("gross_display", "adjustments_display", "net_display"),
        }),
        ("Detail du releve", {
            "fields": ("detail_view",),
            "description": "L'agregation est FINANCIERE, pas informationnelle : "
                           "le partenaire voit chaque ligne.",
        }),
        ("Hors cycle", {
            "fields": ("is_exceptional", "exceptional_reason", "regulatory_note"),
        }),
        ("Versement", {"fields": ("payout_view",)}),
        ("Horodatage", {"fields": ("created_at", "updated_at"),
                        "classes": ("collapse",)}),
    )

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    @admin.display(description="Beneficiaire", ordering="payee__payee_code")
    def payee_link(self, obj):
        return format_html(
            '<a href="/django-admin/payments/payeeaccount/{}/change/">{}</a>',
            obj.payee_id, obj.payee.payee_code,
        )

    @admin.display(description="Statut", ordering="status")
    def status_badge(self, obj):
        return format_html(
            '<span style="color:{};font-weight:700;">● {}</span>',
            BATCH_COLORS.get(obj.status, "#6B7280"), obj.get_status_display(),
        )

    @admin.display(description="Cycle", ordering="is_exceptional")
    def exceptional_badge(self, obj):
        if not obj.is_exceptional:
            return mark_safe('<span style="color:#16A34A;">contractuel</span>')
        return format_html(
            '<span style="color:#DC2626;font-weight:700;" title="{}">HORS CYCLE</span>',
            obj.exceptional_reason[:150],
        )

    @admin.display(description="Brut", ordering="gross_amount_xaf")
    def gross_display(self, obj):
        return _fmt(obj.gross_amount_xaf)

    @admin.display(description="Ajustements")
    def adjustments_display(self, obj):
        if not obj.adjustments_xaf:
            return "—"
        couleur = "#DC2626" if obj.adjustments_xaf < 0 else "#16A34A"
        return format_html('<b style="color:{};">{}</b>',
                           couleur, _fmt(obj.adjustments_xaf))

    @admin.display(description="Net", ordering="net_amount_xaf")
    def net_display(self, obj):
        return format_html('<b style="color:#16A34A;">{}</b>',
                           _fmt(obj.net_amount_xaf))

    @admin.display(description="Releve detaille")
    def detail_view(self, obj):
        lignes = "".join(
            format_html(
                "<tr><td style='padding:4px 12px;'>{}</td>"
                "<td style='padding:4px 12px;'>{}</td>"
                "<td style='padding:4px 12px;'>{}</td>"
                "<td style='padding:4px 12px;text-align:right;'>{}</td></tr>",
                h.reference, h.get_component_display(),
                f"#{h.order_id}" if h.order_id else "—",
                _fmt(h.payable_amount_xaf),
            )
            for h in obj.covered_holds.all()[:100]
        )
        ajustements = "".join(
            format_html(
                "<tr style='background:#FEF3C7;'><td style='padding:4px 12px;'>{}</td>"
                "<td style='padding:4px 12px;' colspan='2'>{}</td>"
                "<td style='padding:4px 12px;text-align:right;'>{}</td></tr>",
                a.reference, a.get_category_display(),
                ("-" if a.is_debt else "+") + _fmt(a.amount_xaf),
            )
            for a in obj.applied_adjustments.all()[:50]
        )
        return format_html(
            "<table style='border-collapse:collapse;'>"
            "<tr style='background:#eee;'>"
            "<th style='padding:6px 12px;text-align:left;'>Reference</th>"
            "<th style='padding:6px 12px;text-align:left;'>Composant</th>"
            "<th style='padding:6px 12px;text-align:left;'>Commande</th>"
            "<th style='padding:6px 12px;'>Montant</th></tr>{}{}</table>",
            lignes, ajustements,
        )

    @admin.display(description="Portee reglementaire")
    def regulatory_note(self, obj):
        part = exceptional_share()
        couleur = "#DC2626" if part["alert"] else "#16A34A"
        return format_html(
            '<div style="padding:10px;background:#F3F4F6;border-left:4px solid {};">'
            "<b>Part des reglements hors cycle sur 90 jours</b><br>"
            "En nombre : {} % &nbsp;·&nbsp; En montant : {} % &nbsp;·&nbsp; "
            "Seuil d'alerte : {} %<br><br>"
            "Le risque n'est pas UNE exception, c'est qu'elle devienne la "
            "norme. Si une part importante des reglements est exceptionnelle, "
            "un regulateur verra un <b>portefeuille</b> quelle que soit "
            "l'etiquette portee par les tables.</div>",
            couleur, part["share_by_count_percent"],
            part["share_by_amount_percent"], part["alert_threshold_percent"],
        )

    @admin.display(description="Versement")
    def payout_view(self, obj):
        demande = getattr(obj, "payout", None)
        if demande is None:
            return "— aucun versement —"
        return format_html(
            '<a href="/django-admin/payments/payoutrequest/{}/change/">{}</a> — {}',
            demande.pk, demande.reference, demande.get_status_display(),
        )

    @admin.action(description="Confirmer (figer le lot)")
    def confirm_selected(self, request, queryset):
        ok = 0
        for lot in queryset.filter(status=SettlementBatch.Status.DRAFT):
            try:
                confirm_batch(lot)
                ok += 1
            except SettlementError as exc:
                self.message_user(request, f"{lot.reference} : {exc}",
                                  level=messages.ERROR)
        if ok:
            self.message_user(request, f"{ok} lot(s) confirme(s).")

    @admin.action(description="Demander le versement")
    def request_payout_selected(self, request, queryset):
        ok = 0
        for lot in queryset.filter(status=SettlementBatch.Status.CONFIRMED):
            try:
                request_payout(lot, requested_by=request.user)
                ok += 1
            except SettlementError as exc:
                self.message_user(request, f"{lot.reference} : {exc}",
                                  level=messages.ERROR)
        if ok:
            self.message_user(
                request,
                f"{ok} demande(s) creee(s). Un AUTRE compte doit les approuver.",
            )

    actions = ["confirm_selected", "request_payout_selected"]


@admin.register(PayoutRequest)
class PayoutRequestAdmin(admin.ModelAdmin):
    list_display = (
        "reference", "payee_link", "status_badge", "amount_display",
        "approvals_display", "provider_code", "error_code",
        "requested_by", "requested_at",
    )
    list_filter = ("status", "provider_code", "error_code", "requested_at")
    search_fields = (
        "reference", "provider_external_reference", "provider_reference",
        "payee__payee_code", "justification",
    )
    date_hierarchy = "requested_at"
    ordering = ("-requested_at",)
    list_select_related = ("payee", "requested_by")
    inlines = [PayoutApprovalInline]

    readonly_fields = (
        "id", "reference", "provider_external_reference", "batch_link",
        "payee", "amount_display", "psp_fee_display", "status",
        "required_approvals", "approvals_display",
        "provider_code", "provider_reference", "provider_status_raw",
        "error_code", "error_message", "payee_msisdn_masked", "payee_operator",
        "requested_by", "requested_at", "executed_at", "settled_at",
        "unknown_note", "ledger_view",
    )

    fieldsets = (
        ("Versement", {
            "fields": ("id", "reference", "provider_external_reference",
                       "batch_link", "payee", "status"),
            "description": "DEUX references : la lisible pour l'audit, "
                           "l'UUID4 exige par CamPay sur /withdraw/.",
        }),
        ("Montants", {
            "fields": ("amount_display", "psp_fee_display"),
            "description": "Les frais PSP sont une CHARGE PLATEFORME. Le "
                           "partenaire recoit l'integralite de son net.",
        }),
        ("Approbation", {
            "fields": ("required_approvals", "approvals_display", "justification"),
        }),
        ("Destinataire", {"fields": ("payee_msisdn_masked", "payee_operator")}),
        ("Prestataire", {
            "fields": ("provider_code", "provider_reference",
                       "provider_status_raw", "error_code", "error_message"),
        }),
        ("Issue inconnue", {"fields": ("unknown_note",)}),
        ("Comptabilite", {"fields": ("ledger_view",)}),
        ("Horodatage", {"fields": ("requested_by", "requested_at",
                                   "executed_at", "settled_at")}),
    )

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    @admin.display(description="Beneficiaire", ordering="payee__payee_code")
    def payee_link(self, obj):
        return format_html(
            '<a href="/django-admin/payments/payeeaccount/{}/change/">{}</a>',
            obj.payee_id, obj.payee.payee_code,
        )

    @admin.display(description="Lot")
    def batch_link(self, obj):
        if not obj.batch_id:
            return "—"
        return format_html(
            '<a href="/django-admin/payments/settlementbatch/{}/change/">{}</a>',
            obj.batch_id, obj.batch.reference,
        )

    @admin.display(description="Statut", ordering="status")
    def status_badge(self, obj):
        return format_html(
            '<span style="color:{};font-weight:700;">● {}</span>',
            PAYOUT_COLORS.get(obj.status, "#6B7280"), obj.get_status_display(),
        )

    @admin.display(description="Montant", ordering="amount_xaf")
    def amount_display(self, obj):
        return format_html("<b>{}</b>", _fmt(obj.amount_xaf))

    @admin.display(description="Frais PSP")
    def psp_fee_display(self, obj):
        return format_html(
            '{} <small style="color:#6B7280;">— charge plateforme, '
            "jamais retenue au partenaire</small>", _fmt(obj.psp_fee_xaf),
        )

    @admin.display(description="Approbations")
    def approvals_display(self, obj):
        obtenues = obj.approvals_count
        couleur = "#16A34A" if obtenues >= obj.required_approvals else "#D97706"
        return format_html('<b style="color:{};">{} / {}</b>',
                           couleur, obtenues, obj.required_approvals)

    @admin.display(description="Sur l'etat INCONNU")
    def unknown_note(self, obj):
        if obj.status != PayoutRequest.Status.UNKNOWN:
            return "—"
        return mark_safe(
            '<div style="padding:10px;background:#FEE2E2;'
            'border-left:4px solid #DC2626;">'
            "<b>NE JAMAIS RETENTER CE VERSEMENT.</b><br>"
            "Le prestataire n'a pas repondu : on ignore si l'argent est "
            "parti. L'argent est porte en TRANSIT au registre.<br>"
            "La resolution passe par la LECTURE — historique du prestataire "
            "filtre sur notre reference —, jamais par un renvoi. "
            "Un reessai peut doubler un versement reel, et c'est "
            "irrecuperable.</div>"
        )

    @admin.display(description="Ecritures")
    def ledger_view(self, obj):
        from apps.payments.ledger.models import LedgerTransaction
        transactions = LedgerTransaction.objects.filter(
            source_type="PayoutRequest", source_ref=obj.reference,
        )
        if not transactions:
            return "— aucune ecriture —"
        return mark_safe("<br>".join(
            f'<a href="/django-admin/payments/ledgertransaction/{t.pk}/change/">'
            f"{t.reference}</a> — {t.kind} — {_fmt(t.total_debit())}"
            for t in transactions
        ))

    @admin.action(description="Approuver (le demandeur ne peut pas)")
    def approve_selected(self, request, queryset):
        ok = 0
        for demande in queryset.filter(status=PayoutRequest.Status.PENDING_APPROVAL):
            try:
                approve_payout(demande, approved_by=request.user,
                               comment="Approuve depuis l'administration.")
                ok += 1
            except SettlementError as exc:
                self.message_user(request, f"{demande.reference} : {exc}",
                                  level=messages.ERROR)
        if ok:
            self.message_user(request, f"{ok} versement(s) approuve(s).")

    @admin.action(description="Executer les versements approuves")
    def execute_selected(self, request, queryset):
        ok = 0
        for demande in queryset.filter(status=PayoutRequest.Status.APPROVED):
            try:
                issue = execute_payout(demande)
                ok += 1
                if issue.status == PayoutRequest.Status.UNKNOWN:
                    self.message_user(
                        request,
                        f"{issue.reference} : issue INCONNUE. "
                        "Ne jamais retenter sans reconciliation.",
                        level=messages.ERROR,
                    )
            except SettlementError as exc:
                self.message_user(request, f"{demande.reference} : {exc}",
                                  level=messages.ERROR)
        if ok:
            self.message_user(request, f"{ok} versement(s) traite(s).")

    @admin.action(description="Rejeter")
    def reject_selected(self, request, queryset):
        ok = 0
        for demande in queryset.filter(status=PayoutRequest.Status.PENDING_APPROVAL):
            try:
                reject_payout(demande, rejected_by=request.user,
                              reason="Rejete depuis l'administration.")
                ok += 1
            except SettlementError as exc:
                self.message_user(request, f"{demande.reference} : {exc}",
                                  level=messages.ERROR)
        if ok:
            self.message_user(request, f"{ok} versement(s) rejete(s).")

    actions = ["approve_selected", "execute_selected", "reject_selected"]


@admin.register(Refund)
class RefundAdmin(admin.ModelAdmin):
    list_display = (
        "reference", "intent_link", "amount_display", "reason",
        "status", "requested_by", "approved_by", "created_at",
    )
    list_filter = ("status", "reason", "created_at")
    search_fields = ("reference", "intent__reference", "detail")
    date_hierarchy = "created_at"
    ordering = ("-created_at",)
    list_select_related = ("intent", "requested_by")

    readonly_fields = (
        "id", "reference", "intent_link", "amount_display", "reason",
        "status", "requested_by", "approved_by", "approved_at",
        "source_note", "prochaine_etape", "payout_view", "created_at",
    )

    fieldsets = (
        ("Remboursement", {
            "fields": ("id", "reference", "intent_link", "amount_display",
                       "reason", "detail", "status"),
        }),
        ("Destination", {
            "fields": ("source_note",),
            "description": "Le remboursement retourne vers la SOURCE DE "
                           "PAIEMENT D'ORIGINE.",
        }),
        ("Etape suivante", {"fields": ("prochaine_etape",)}),
        ("Validation", {"fields": ("requested_by", "approved_by", "approved_at")}),
        ("Versement", {"fields": ("payout_view",)}),
    )

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    @admin.display(description="Intention")
    def intent_link(self, obj):
        return format_html(
            '<a href="/django-admin/payments/paymentintent/{}/change/">{}</a>',
            obj.intent_id, obj.intent.reference,
        )

    @admin.display(description="Versement emis")
    def payout_view(self, obj):
        if obj.payout_id is None:
            return "— aucun versement emis —"
        return format_html(
            '<a href="/django-admin/payments/payoutrequest/{}/change/">{}</a>'
            " — {}",
            obj.payout_id, obj.payout.reference,
            obj.payout.get_status_display(),
        )

    @admin.display(description="Montant", ordering="amount_xaf")
    def amount_display(self, obj):
        return _fmt(obj.amount_xaf)

    @admin.action(description="Approuver (le demandeur ne peut pas)")
    def approve_selected(self, request, queryset):
        """
        Approuve un remboursement.

        C'est la SEULE porte par laquelle l'argent d'un litige retourne a
        l'acheteur. Sans elle, un remboursement cree par un litige reste
        bloque en attente indefiniment — la fonctionnalite existait mais
        etait inutilisable.
        """
        ok = 0
        for remboursement in queryset.filter(
                status=Refund.Status.PENDING_APPROVAL):
            try:
                approve_refund(remboursement, approved_by=request.user)
                ok += 1
            except SettlementError as exc:
                self.message_user(request, f"{remboursement.reference} : {exc}",
                                  level=messages.ERROR)
        if ok:
            self.message_user(
                request,
                f"{ok} remboursement(s) approuve(s). L'argent partira au "
                "prochain passage de l'ordonnanceur, ou via l'action "
                "« Executer ».",
            )

    @admin.action(description="Executer les remboursements approuves")
    def execute_selected(self, request, queryset):
        """
        Emet le versement vers le PAYEUR.

        Le remboursement retourne vers la source de paiement d'origine,
        jamais ailleurs.
        """
        ok = 0
        for remboursement in queryset.filter(status=Refund.Status.APPROVED):
            try:
                issue = execute_refund(remboursement)
                ok += 1
                if issue.status == Refund.Status.UNKNOWN:
                    self.message_user(
                        request,
                        f"{issue.reference} : issue INCONNUE. Ne jamais "
                        "retenter sans reconciliation.",
                        level=messages.ERROR,
                    )
                elif issue.status == Refund.Status.FAILED:
                    self.message_user(
                        request,
                        f"{issue.reference} : refuse par le prestataire.",
                        level=messages.WARNING,
                    )
            except SettlementError as exc:
                self.message_user(request, f"{remboursement.reference} : {exc}",
                                  level=messages.ERROR)
        if ok:
            self.message_user(request, f"{ok} remboursement(s) traite(s).")

    @admin.action(description="Rejeter")
    def reject_selected(self, request, queryset):
        """
        Rejette un remboursement. Le demandeur ne peut pas rejeter le sien.

        Le sequestre reste GELE : rejeter un remboursement ne tranche pas le
        litige en faveur du vendeur, cela refuse seulement cette demande.
        """
        ok = 0
        for remboursement in queryset.filter(
                status=Refund.Status.PENDING_APPROVAL):
            if request.user.id == remboursement.requested_by_id:
                self.message_user(
                    request,
                    f"{remboursement.reference} : le demandeur ne peut pas "
                    "rejeter sa propre demande.",
                    level=messages.ERROR,
                )
                continue
            Refund.objects.filter(pk=remboursement.pk).update(
                status=Refund.Status.REJECTED)
            ok += 1
        if ok:
            self.message_user(
                request,
                f"{ok} remboursement(s) rejete(s). Les sequestres restent "
                "GELES : le litige n'est pas tranche pour autant.",
            )

    actions = ["approve_selected", "execute_selected", "reject_selected"]

    @admin.display(description="Etape suivante")
    def prochaine_etape(self, obj):
        etapes = {
            Refund.Status.PENDING_APPROVAL: (
                "#D97706",
                "En attente d'approbation par un TIERS. Le demandeur ne peut "
                "pas approuver sa propre demande."),
            Refund.Status.APPROVED: (
                "#2563EB",
                "Approuve. L'argent partira au prochain passage de "
                "l'ordonnanceur, ou via l'action « Executer »."),
            Refund.Status.PROCESSING: (
                "#2563EB", "Emission en cours aupres du prestataire."),
            Refund.Status.PAID: (
                "#16A34A", "Rembourse. L'argent est retourne au payeur."),
            Refund.Status.FAILED: (
                "#DC2626",
                "Refuse par le prestataire. Verifier le motif, puis creer "
                "une NOUVELLE demande — ne jamais rejouer celle-ci."),
            Refund.Status.UNKNOWN: (
                "#DC2626",
                "Issue INCONNUE. NE JAMAIS RETENTER : l'argent est peut-etre "
                "deja parti. La reconciliation tranchera."),
            Refund.Status.REJECTED: (
                "#6B7280",
                "Rejete. Le sequestre reste gele : le litige n'est pas "
                "tranche pour autant."),
        }
        couleur, texte = etapes.get(obj.status, ("#6B7280", "—"))
        return format_html(
            '<div style="padding:10px;border-left:4px solid {};">{}</div>',
            couleur, texte)

    @admin.display(description="Retour vers")
    def source_note(self, obj):
        return mark_safe(
            '<div style="padding:10px;background:#EFF6FF;'
            'border-left:4px solid #2563EB;">'
            "CamPay n'expose <b>aucun endpoint de remboursement</b> : un "
            "remboursement est techniquement un versement vers le numero du "
            "<b>payeur</b>.<br>"
            "Il retourne vers la source d'origine. Rembourser ailleurs cree "
            "un transfert de valeur non consenti et constitue, en matiere de "
            "lutte anti-blanchiment, un schema classique.</div>"
        )