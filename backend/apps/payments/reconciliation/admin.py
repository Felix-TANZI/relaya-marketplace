# backend/apps/payments/reconciliation/admin.py
# Administration de la reconciliation.
#
# Un ecart sans piste d'action finit ignore. Chaque ecart affiche donc son
# ACTION SUGGEREE en evidence, et la resolution exige une note explicative.

import json

from django.contrib import admin, messages
from django.utils.html import format_html
from django.utils.safestring import mark_safe

from .models import Discrepancy, ReconciliationRun
from .services import open_discrepancies_summary

RUN_COLORS = {
    "RUNNING": "#2563EB", "CLEAN": "#16A34A",
    "DISCREPANCIES": "#D97706", "ERROR": "#DC2626",
}
SEVERITY_COLORS = {
    "CRITICAL": "#DC2626", "HIGH": "#EA580C", "MEDIUM": "#D97706",
    "LOW": "#2563EB", "INFO": "#6B7280",
}
RESOLUTION_COLORS = {
    "OPEN": "#DC2626", "INVESTIGATING": "#D97706", "RESOLVED": "#16A34A",
    "ACCEPTED": "#6B7280", "FALSE_POSITIVE": "#6B7280",
}


def _fmt(montant) -> str:
    valeur = int(montant or 0)
    signe = "-" if valeur < 0 else ""
    return f"{signe}{abs(valeur):,}".replace(",", " ") + " FCFA"


def _json(donnees) -> str:
    if not donnees:
        return "—"
    texte = json.dumps(donnees, indent=2, ensure_ascii=False, default=str)
    return mark_safe(
        '<pre style="background:#f6f6f6;padding:12px;border-radius:6px;'
        'max-height:340px;overflow:auto;font-size:12px;">{}</pre>'.format(
            texte.replace("<", "&lt;").replace(">", "&gt;")))


class DiscrepancyInline(admin.TabularInline):
    model = Discrepancy
    extra = 0
    can_delete = False
    fields = ("kind", "severity", "subject_ref", "gap_display",
              "resolution", "detail")
    readonly_fields = fields

    def has_add_permission(self, request, obj=None):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    @admin.display(description="Ecart")
    def gap_display(self, obj):
        return _fmt(obj.gap_xaf)


@admin.register(ReconciliationRun)
class ReconciliationRunAdmin(admin.ModelAdmin):
    list_display = ("started_at", "reference", "level", "status_badge",
                    "checked_count", "discrepancy_count", "gap_display")
    list_filter = ("level", "status", "started_at")
    search_fields = ("reference", "error")
    date_hierarchy = "started_at"
    ordering = ("-started_at",)
    inlines = [DiscrepancyInline]

    readonly_fields = ("id", "reference", "level", "status", "period_start",
                       "period_end", "checked_count", "discrepancy_count",
                       "gap_display", "summary_view", "error",
                       "started_at", "finished_at", "overview")

    fieldsets = (
        ("Execution", {"fields": ("id", "reference", "level", "status",
                                  "period_start", "period_end",
                                  "started_at", "finished_at")}),
        ("Resultat", {"fields": ("checked_count", "discrepancy_count",
                                 "gap_display", "summary_view", "error")}),
        ("Ecarts ouverts — tous niveaux", {"fields": ("overview",)}),
    )

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    @admin.display(description="Statut", ordering="status")
    def status_badge(self, obj):
        return format_html(
            '<span style="color:{};font-weight:700;">● {}</span>',
            RUN_COLORS.get(obj.status, "#6B7280"), obj.get_status_display())

    @admin.display(description="Ecart total", ordering="total_gap_xaf")
    def gap_display(self, obj):
        if not obj.total_gap_xaf:
            return "—"
        return format_html('<b style="color:#DC2626;">{}</b>',
                           _fmt(obj.total_gap_xaf))

    @admin.display(description="Detail")
    def summary_view(self, obj):
        return _json(obj.summary)

    @admin.display(description="Vue d'ensemble")
    def overview(self, obj):
        resume = open_discrepancies_summary()
        couleur = "#DC2626" if resume["must_freeze_payouts"] else "#16A34A"
        lignes = "".join(
            format_html("<li>{} : <b>{}</b></li>", severite, nombre)
            for severite, nombre in resume["by_severity"].items() if nombre)
        return format_html(
            '<div style="padding:10px;background:#F3F4F6;'
            'border-left:4px solid {};">'
            "<b>{} ecart(s) ouvert(s)</b> — {} au total<ul "
            "style='margin:6px 0 0 18px;'>{}</ul>{}</div>",
            couleur, resume["open_total"], _fmt(resume["total_gap_xaf"]),
            lignes or "<li>aucun</li>",
            mark_safe(
                "<br><b style='color:#DC2626;'>GEL DES VERSEMENTS REQUIS</b>"
            ) if resume["must_freeze_payouts"] else "")


@admin.register(Discrepancy)
class DiscrepancyAdmin(admin.ModelAdmin):
    list_display = ("created_at", "kind", "severity_badge", "subject_ref",
                    "gap_display", "resolution_badge", "resolved_by")
    list_filter = ("kind", "severity", "resolution", "created_at")
    search_fields = ("subject_ref", "provider_reference", "detail",
                     "resolution_note")
    date_hierarchy = "created_at"
    ordering = ("-created_at",)
    list_select_related = ("run", "resolved_by")

    readonly_fields = ("id", "run_link", "kind", "severity", "subject_type",
                       "subject_ref", "provider_reference", "expected_display",
                       "observed_display", "gap_display", "detail",
                       "action_view", "evidence_view", "resolved_by",
                       "resolved_at", "created_at")

    fieldsets = (
        ("Ecart", {"fields": ("id", "run_link", "kind", "severity",
                              "created_at")}),
        ("Sujet", {"fields": ("subject_type", "subject_ref",
                              "provider_reference")}),
        ("Montants", {"fields": ("expected_display", "observed_display",
                                 "gap_display")}),
        ("Constat", {"fields": ("detail", "evidence_view")}),
        ("Action suggeree", {"fields": ("action_view",)}),
        ("Resolution", {"fields": ("resolution", "resolution_note",
                                   "resolved_by", "resolved_at"),
                        "description": "Une resolution exige une note "
                                       "explicative. La trace reste."}),
    )

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    @admin.display(description="Execution")
    def run_link(self, obj):
        return format_html(
            '<a href="/django-admin/payments/reconciliationrun/{}/change/">'
            "{}</a>", obj.run_id, obj.run.reference)

    @admin.display(description="Severite", ordering="severity")
    def severity_badge(self, obj):
        return format_html(
            '<span style="color:{};font-weight:700;">● {}</span>',
            SEVERITY_COLORS.get(obj.severity, "#6B7280"),
            obj.get_severity_display())

    @admin.display(description="Resolution", ordering="resolution")
    def resolution_badge(self, obj):
        return format_html(
            '<span style="color:{};font-weight:700;">{}</span>',
            RESOLUTION_COLORS.get(obj.resolution, "#6B7280"),
            obj.get_resolution_display())

    @admin.display(description="Attendu")
    def expected_display(self, obj):
        return _fmt(obj.expected_xaf)

    @admin.display(description="Observe")
    def observed_display(self, obj):
        return _fmt(obj.observed_xaf)

    @admin.display(description="Ecart", ordering="gap_xaf")
    def gap_display(self, obj):
        if not obj.gap_xaf:
            return "—"
        return format_html('<b style="color:#DC2626;">{}</b>', _fmt(obj.gap_xaf))

    @admin.display(description="Que faire")
    def action_view(self, obj):
        if not obj.suggested_action:
            return "—"
        return format_html(
            '<div style="padding:10px;background:#FEF3C7;'
            'border-left:4px solid #D97706;">{}</div>', obj.suggested_action)

    @admin.display(description="Elements")
    def evidence_view(self, obj):
        return _json(obj.evidence)

    @admin.action(description="Marquer en investigation")
    def investigate_selected(self, request, queryset):
        compte = queryset.filter(
            resolution=Discrepancy.Resolution.OPEN
        ).update(resolution=Discrepancy.Resolution.INVESTIGATING)
        self.message_user(request, f"{compte} ecart(s) en investigation.")

    actions = ["investigate_selected"]