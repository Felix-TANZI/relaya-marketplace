# backend/apps/payments/intents/admin.py
# Administration des intentions de paiement.
#
# CONSULTATION TOTALE : montants, statuts, plan de repartition fige,
# instantane de configuration, trace de resolution des regles, payloads
# bruts, chronologie des tentatives.
#
# ECRITURE IMPOSSIBLE : une intention ne s'edite pas. Les seules actions
# disponibles sont l'interrogation du prestataire et l'annulation, toutes
# deux passant par la couche applicative.

import json

from django.contrib import admin, messages
from django.utils.html import format_html
from django.utils.safestring import mark_safe

from .models import PaymentAttempt, PaymentIntent

STATUS_COLORS = {
    "DRAFT": "#6B7280",
    "REQUIRES_ACTION": "#D97706",
    "PROCESSING": "#2563EB",
    "SUCCEEDED": "#16A34A",
    "FAILED": "#DC2626",
    "EXPIRED": "#6B7280",
    "CANCELLED": "#6B7280",
    "PARTIALLY_REFUNDED": "#7C3AED",
    "REFUNDED": "#7C3AED",
}

ATTEMPT_COLORS = {
    "INITIATED": "#6B7280",
    "PENDING": "#D97706",
    "SUCCESSFUL": "#16A34A",
    "FAILED": "#DC2626",
    "TIMEOUT": "#DC2626",
}


def _fmt(montant) -> str:
    return f"{int(montant or 0):,}".replace(",", " ") + " FCFA"


def _json_block(donnees) -> str:
    if not donnees:
        return "—"
    texte = json.dumps(donnees, indent=2, ensure_ascii=False)
    return mark_safe(
        '<pre style="background:#f6f6f6;padding:12px;border-radius:6px;'
        'max-height:420px;overflow:auto;font-size:12px;">{}</pre>'.format(
            texte.replace("<", "&lt;").replace(">", "&gt;")
        )
    )


class PaymentAttemptInline(admin.TabularInline):
    model = PaymentAttempt
    extra = 0
    can_delete = False
    fields = (
        "external_reference", "provider_code", "status_badge",
        "provider_reference", "error_code", "poll_count",
        "settled_at", "created_at",
    )
    readonly_fields = fields
    ordering = ("-created_at",)

    def has_add_permission(self, request, obj=None):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    @admin.display(description="Statut")
    def status_badge(self, obj):
        return format_html(
            '<span style="color:{};font-weight:700;">● {}</span>',
            ATTEMPT_COLORS.get(obj.status, "#6B7280"), obj.get_status_display(),
        )


@admin.register(PaymentIntent)
class PaymentIntentAdmin(admin.ModelAdmin):
    list_display = (
        "reference", "status_badge", "amount_display", "captured_display",
        "buyer", "payer_badge", "payer_msisdn_masked",
        "provider_code", "attempts_count", "created_at",
    )
    list_filter = (
        "status", "provider_code", "payer_relationship",
        "payer_operator", "created_at",
    )
    search_fields = (
        "reference", "idempotency_key", "correlation_id",
        "payer_msisdn_masked", "buyer__username", "buyer__email",
    )
    date_hierarchy = "created_at"
    ordering = ("-created_at",)
    list_per_page = 50
    list_select_related = ("buyer",)
    inlines = [PaymentAttemptInline]

    readonly_fields = (
        "id", "reference", "idempotency_key", "buyer",
        "payer_relationship", "payer_msisdn_masked", "payer_operator",
        "payer_first_seen_at", "payer_msisdn_fingerprint",
        "amount_display", "captured_display", "refunded_display",
        "status", "provider_code",
        "distribution_view", "config_view", "trace_view",
        "orders_view", "ledger_view",
        "risk_score", "expires_at", "confirmed_at", "failed_at",
        "failure_reason", "correlation_id", "created_at", "updated_at",
    )

    fieldsets = (
        ("Intention", {
            "fields": ("id", "reference", "idempotency_key", "status",
                       "provider_code", "correlation_id"),
        }),
        ("Montants", {
            "fields": ("amount_display", "captured_display", "refunded_display"),
        }),
        ("Acheteur et payeur", {
            "fields": ("buyer", "payer_relationship", "payer_msisdn_masked",
                       "payer_operator", "payer_first_seen_at", "refund_target"),
            "description": "Payer pour un proche est le cas nominal du segment "
                           "diaspora. Le remboursement retourne TOUJOURS vers la "
                           "source de paiement d'origine.",
        }),
        ("Repartition figee", {
            "fields": ("distribution_view",),
            "description": "Calculee a la creation, jamais recalculee. Modifier "
                           "une regle en administration n'affecte pas cette intention.",
        }),
        ("Regles appliquees", {
            "fields": ("config_view", "trace_view"),
            "classes": ("collapse",),
        }),
        ("Rattachements", {"fields": ("orders_view", "ledger_view")}),
        ("Cycle de vie", {
            "fields": ("expires_at", "confirmed_at", "failed_at",
                       "failure_reason", "risk_score",
                       "created_at", "updated_at"),
            "classes": ("collapse",),
        }),
    )

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    # ── Colonnes ─────────────────────────────────────────────────────────────

    @admin.display(description="Statut", ordering="status")
    def status_badge(self, obj):
        return format_html(
            '<span style="color:{};font-weight:700;">● {}</span>',
            STATUS_COLORS.get(obj.status, "#6B7280"), obj.get_status_display(),
        )

    @admin.display(description="Montant", ordering="amount_xaf")
    def amount_display(self, obj):
        return _fmt(obj.amount_xaf)

    @admin.display(description="Encaisse")
    def captured_display(self, obj):
        if not obj.amount_captured_xaf:
            return "—"
        return format_html('<b style="color:#16A34A;">{}</b>',
                           _fmt(obj.amount_captured_xaf))

    @admin.display(description="Rembourse")
    def refunded_display(self, obj):
        if not obj.amount_refunded_xaf:
            return "—"
        return format_html('<b style="color:#7C3AED;">{}</b>',
                           _fmt(obj.amount_refunded_xaf))

    @admin.display(description="Payeur")
    def payer_badge(self, obj):
        if obj.payer_relationship == PaymentIntent.Relationship.SELF:
            return mark_safe('<span style="color:#16A34A;">lui-meme</span>')
        return mark_safe(
            '<span style="color:#D97706;" title="Cas nominal du segment '
            'diaspora. Seuils anti-fraude adaptes, pas de blocage.">tiers</span>'
        )

    @admin.display(description="Tentatives")
    def attempts_count(self, obj):
        return obj.attempts.count()

    # ── Blocs de detail ──────────────────────────────────────────────────────

    @admin.display(description="Plan de repartition")
    def distribution_view(self, obj):
        plan = obj.distribution_plan or {}
        holds = plan.get("holds", [])
        if not holds:
            return _json_block(plan)

        lignes = "".join(
            format_html(
                "<tr><td style='padding:4px 12px;'>{}</td>"
                "<td style='padding:4px 12px;'>{}</td>"
                "<td style='padding:4px 12px;'>{}</td>"
                "<td style='padding:4px 12px;text-align:right;'>{}</td>"
                "<td style='padding:4px 12px;text-align:right;color:#DC2626;'>{}</td>"
                "<td style='padding:4px 12px;text-align:right;color:#16A34A;'><b>{}</b></td>"
                "<td style='padding:4px 12px;font-size:11px;'>{}</td></tr>",
                h.get("component", ""), h.get("order_id") or "—",
                h.get("payee_code", ""), _fmt(h.get("gross")),
                _fmt(h.get("commission")), _fmt(h.get("net")),
                h.get("release_trigger", ""),
            )
            for h in holds
        )
        return format_html(
            "<table style='border-collapse:collapse;'>"
            "<tr style='background:#eee;'>"
            "<th style='padding:6px 12px;text-align:left;'>Composant</th>"
            "<th style='padding:6px 12px;text-align:left;'>Commande</th>"
            "<th style='padding:6px 12px;text-align:left;'>Beneficiaire</th>"
            "<th style='padding:6px 12px;'>Brut</th>"
            "<th style='padding:6px 12px;'>Commission</th>"
            "<th style='padding:6px 12px;'>Net</th>"
            "<th style='padding:6px 12px;text-align:left;'>Declencheur</th></tr>{}"
            "<tr style='background:#f6f6f6;'><td colspan='5' style='padding:6px 12px;'>"
            "<b>Chiffre d'affaires BelivaY</b></td>"
            "<td style='padding:6px 12px;text-align:right;'><b>{}</b></td><td></td></tr>"
            "</table>",
            lignes, _fmt(plan.get("platform_revenue")),
        )

    @admin.display(description="Frais resolus")
    def config_view(self, obj):
        return _json_block(obj.config_snapshot)

    @admin.display(description="Trace de resolution")
    def trace_view(self, obj):
        return _json_block(obj.resolution_trace)

    @admin.display(description="Commandes couvertes")
    def orders_view(self, obj):
        try:
            from apps.payments.bridge.intent_orders import PaymentIntentOrder
        except ImportError:
            return "—"
        liens = PaymentIntentOrder.objects.filter(intent=obj)
        if not liens:
            return "— aucune commande rattachee —"
        return mark_safe(
            " · ".join(
                f'<a href="/django-admin/orders/order/{l.order_id}/change/">'
                f"BLV-{l.order_id:05d}</a>" for l in liens
            )
        )

    @admin.display(description="Ecritures comptables")
    def ledger_view(self, obj):
        from apps.payments.ledger.models import LedgerTransaction
        transactions = LedgerTransaction.objects.filter(
            source_type="PaymentIntent", source_ref=obj.reference,
        )
        if not transactions:
            return "— aucune ecriture —"
        return mark_safe(
            "<br>".join(
                f'<a href="/django-admin/payments/ledgertransaction/{t.pk}/change/">'
                f"{t.reference}</a> — {t.kind} — {_fmt(t.total_debit())}"
                for t in transactions
            )
        )

    # ── Actions ──────────────────────────────────────────────────────────────

    @admin.action(description="Interroger le prestataire (verification)")
    def requery_selected(self, request, queryset):
        from apps.payments.application.collect import poll_attempt

        traitees = 0
        for intent in queryset:
            tentative = intent.attempts.exclude(provider_reference="").order_by(
                "-created_at"
            ).first()
            if tentative is None:
                continue
            try:
                issue = poll_attempt(tentative)
                traitees += 1
                self.message_user(
                    request, f"{intent.reference} : {issue.status} — {issue.message}"
                )
            except Exception as exc:
                self.message_user(request, f"{intent.reference} : {exc}",
                                  level=messages.ERROR)
        if not traitees:
            self.message_user(request, "Aucune tentative interrogeable.",
                              level=messages.WARNING)

    @admin.action(description="Annuler l'intention")
    def cancel_selected(self, request, queryset):
        from apps.payments.application.collect import CollectError, cancel_intent

        ok = 0
        for intent in queryset:
            try:
                cancel_intent(intent, reason="Annulee depuis l'administration.")
                ok += 1
            except CollectError as exc:
                self.message_user(request, f"{intent.reference} : {exc}",
                                  level=messages.ERROR)
        if ok:
            self.message_user(request, f"{ok} intention(s) annulee(s).")

    actions = ["requery_selected", "cancel_selected"]


@admin.register(PaymentAttempt)
class PaymentAttemptAdmin(admin.ModelAdmin):
    """Vue transversale — utile pour reperer une vague d'echecs sur un operateur."""

    list_display = (
        "external_reference", "intent_link", "provider_code", "status_badge",
        "amount_display", "payer_operator", "error_code",
        "poll_count", "last_polled_at", "created_at",
    )
    list_filter = ("status", "provider_code", "payer_operator", "error_code", "created_at")
    search_fields = (
        "external_reference", "provider_reference",
        "intent__reference", "error_message",
    )
    date_hierarchy = "created_at"
    ordering = ("-created_at",)
    list_select_related = ("intent",)

    readonly_fields = (
        "id", "intent", "external_reference", "provider_code",
        "provider_reference", "status", "provider_status_raw",
        "error_code", "error_message", "amount_display",
        "payer_msisdn_masked", "payer_operator",
        "request_view", "response_view",
        "poll_count", "last_polled_at", "settled_at",
        "created_at", "updated_at",
    )

    fieldsets = (
        ("Tentative", {
            "fields": ("id", "intent", "external_reference",
                       "provider_code", "provider_reference"),
        }),
        ("Resultat", {
            "fields": ("status", "provider_status_raw", "error_code",
                       "error_message", "settled_at"),
        }),
        ("Montant et payeur", {
            "fields": ("amount_display", "payer_msisdn_masked", "payer_operator"),
        }),
        ("Echanges avec le prestataire", {
            "fields": ("request_view", "response_view", "poll_count", "last_polled_at"),
            "classes": ("collapse",),
            "description": "Contenu tel qu'echange. Aucun secret n'y est stocke.",
        }),
        ("Horodatage", {"fields": ("created_at", "updated_at"), "classes": ("collapse",)}),
    )

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    @admin.display(description="Intention", ordering="intent__reference")
    def intent_link(self, obj):
        return format_html(
            '<a href="/django-admin/payments/paymentintent/{}/change/">{}</a>',
            obj.intent_id, obj.intent.reference,
        )

    @admin.display(description="Statut", ordering="status")
    def status_badge(self, obj):
        return format_html(
            '<span style="color:{};font-weight:700;">● {}</span>',
            ATTEMPT_COLORS.get(obj.status, "#6B7280"), obj.get_status_display(),
        )

    @admin.display(description="Montant", ordering="amount_xaf")
    def amount_display(self, obj):
        return _fmt(obj.amount_xaf)

    @admin.display(description="Requete")
    def request_view(self, obj):
        return _json_block(obj.request_payload)

    @admin.display(description="Reponse")
    def response_view(self, obj):
        return _json_block(obj.response_payload)