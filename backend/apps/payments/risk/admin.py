# backend/apps/payments/risk/admin.py
# Administration du risque.
#
# Chaque evaluation montre SES SIGNAUX et leur poids : un score sans le
# detail de ce qui l'a produit est inexploitable pour decider.

import json

from django.contrib import admin, messages
from django.utils.html import format_html
from django.utils.safestring import mark_safe

from .models import RiskAssessment, RiskSignal, TrustScore

DECISION_COLORS = {"ALLOW": "#16A34A", "REVIEW": "#D97706", "BLOCK": "#DC2626"}
SEVERITY_COLORS = {"HIGH": "#DC2626", "MEDIUM": "#D97706",
                   "LOW": "#2563EB", "INFO": "#6B7280"}


def _json(donnees) -> str:
    if not donnees:
        return "—"
    texte = json.dumps(donnees, indent=2, ensure_ascii=False, default=str)
    return mark_safe(
        '<pre style="background:#f6f6f6;padding:12px;border-radius:6px;'
        'max-height:300px;overflow:auto;font-size:12px;">{}</pre>'.format(
            texte.replace("<", "&lt;").replace(">", "&gt;")))


class RiskSignalInline(admin.TabularInline):
    model = RiskSignal
    extra = 0
    can_delete = False
    fields = ("kind", "severity_badge", "weight", "detail")
    readonly_fields = fields

    def has_add_permission(self, request, obj=None):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    @admin.display(description="Severite")
    def severity_badge(self, obj):
        return format_html('<span style="color:{};font-weight:700;">{}</span>',
                           SEVERITY_COLORS.get(obj.severity, "#6B7280"),
                           obj.get_severity_display())


@admin.register(RiskAssessment)
class RiskAssessmentAdmin(admin.ModelAdmin):
    list_display = ("created_at", "subject_type", "subject_ref",
                    "score_badge", "decision_badge", "signals_count",
                    "overridden_by")
    list_filter = ("subject_type", "decision", "created_at")
    search_fields = ("subject_ref", "note", "override_reason")
    date_hierarchy = "created_at"
    ordering = ("-created_at",)
    inlines = [RiskSignalInline]

    readonly_fields = ("id", "subject_type", "subject_ref", "score_badge",
                       "decision", "note", "policy_key", "policy_view",
                       "philosophy", "overridden_by", "override_reason",
                       "overridden_at", "created_at")

    fieldsets = (
        ("Evaluation", {"fields": ("id", "subject_type", "subject_ref",
                                   "score_badge", "decision", "note",
                                   "created_at")}),
        ("Approche", {"fields": ("philosophy",)}),
        ("Decision manuelle", {
            "fields": ("overridden_by", "override_reason", "overridden_at"),
            "description": "Une decision humaine prime toujours sur le score. "
                           "Elle est tracee.",
        }),
        ("Politique appliquee", {"fields": ("policy_key", "policy_view"),
                                 "classes": ("collapse",)}),
    )

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    @admin.display(description="Score", ordering="score")
    def score_badge(self, obj):
        couleur = ("#DC2626" if obj.score >= 70
                   else "#D97706" if obj.score >= 40 else "#16A34A")
        return format_html('<b style="color:{};font-size:14px;">{}/100</b>',
                           couleur, obj.score)

    @admin.display(description="Decision", ordering="decision")
    def decision_badge(self, obj):
        marque = " (manuelle)" if obj.overridden_by_id else ""
        return format_html('<span style="color:{};font-weight:700;">● {}{}</span>',
                           DECISION_COLORS.get(obj.decision, "#6B7280"),
                           obj.get_decision_display(), marque)

    @admin.display(description="Signaux")
    def signals_count(self, obj):
        return obj.signals.count()

    @admin.display(description="Politique figee")
    def policy_view(self, obj):
        return _json(obj.policy_snapshot)

    @admin.display(description="Comment lire ce score")
    def philosophy(self, obj):
        return mark_safe(
            '<div style="padding:10px;background:#EFF6FF;'
            'border-left:4px solid #2563EB;">'
            "<b>On marque, on ne bloque pas.</b><br>"
            "Le blocage automatique est desactive par defaut : un score "
            "eleve produit une alerte et une recommandation de revue, pas "
            "un refus. Un faux positif coute un <b>client</b> ; le laisser "
            "passer coute une <b>transaction</b>.<br><br>"
            "<b>Le payeur tiers n'est pas un suspect.</b> Payer pour un "
            "proche est le cas nominal du segment diaspora, principal "
            "moteur de marge. Son poids dans le score est volontairement "
            "faible. Le signal reellement discriminant est un <b>meme "
            "numero servant un nombre anormal de comptes distincts</b>.</div>"
        )

    @admin.action(description="Autoriser (decision manuelle)")
    def allow_selected(self, request, queryset):
        ok = 0
        for evaluation in queryset.exclude(decision=RiskAssessment.Decision.ALLOW):
            evaluation.override(
                decision=RiskAssessment.Decision.ALLOW,
                reason=f"Autorise manuellement par {request.user.username}.",
                user=request.user)
            ok += 1
        if ok:
            self.message_user(request, f"{ok} evaluation(s) autorisee(s).")

    actions = ["allow_selected"]


@admin.register(RiskSignal)
class RiskSignalAdmin(admin.ModelAdmin):
    """Vue transversale — utile pour reperer une vague de signaux identiques."""

    list_display = ("created_at", "kind", "severity_badge", "weight",
                    "assessment_link", "detail_short")
    list_filter = ("kind", "severity", "created_at")
    search_fields = ("detail", "assessment__subject_ref")
    date_hierarchy = "created_at"
    ordering = ("-created_at",)
    list_select_related = ("assessment",)

    def get_readonly_fields(self, request, obj=None):
        return [f.name for f in self.model._meta.fields] + ["evidence_view"]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    @admin.display(description="Severite", ordering="severity")
    def severity_badge(self, obj):
        return format_html('<span style="color:{};font-weight:700;">{}</span>',
                           SEVERITY_COLORS.get(obj.severity, "#6B7280"),
                           obj.get_severity_display())

    @admin.display(description="Evaluation")
    def assessment_link(self, obj):
        return format_html(
            '<a href="/django-admin/payments/riskassessment/{}/change/">{}</a>',
            obj.assessment_id, obj.assessment.subject_ref)

    @admin.display(description="Constat")
    def detail_short(self, obj):
        return obj.detail[:110]

    @admin.display(description="Elements")
    def evidence_view(self, obj):
        return _json(obj.evidence)


@admin.register(TrustScore)
class TrustScoreAdmin(admin.ModelAdmin):
    list_display = ("computed_at", "payee_link", "score_badge", "delta_badge",
                    "orders_count", "disputes_count", "cancelled_count")
    list_filter = ("computed_at", "policy_key")
    search_fields = ("payee__payee_code", "payee__display_label")
    date_hierarchy = "computed_at"
    ordering = ("-computed_at",)
    list_select_related = ("payee",)

    def get_readonly_fields(self, request, obj=None):
        return [f.name for f in self.model._meta.fields] + [
            "breakdown_view", "history_view", "governance_note"]

    fieldsets = (
        ("Score", {"fields": ("id", "payee", "score", "previous_score",
                              "window_days", "computed_at")}),
        ("Faits observes", {"fields": ("orders_count", "disputes_count",
                                       "late_count", "cancelled_count")}),
        ("Detail du calcul", {"fields": ("breakdown_view",)}),
        ("Historique", {"fields": ("history_view",)}),
        ("Gouvernance", {"fields": ("governance_note",)}),
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
            obj.payee_id, obj.payee.payee_code)

    @admin.display(description="Score", ordering="score")
    def score_badge(self, obj):
        couleur = ("#16A34A" if obj.score >= 70
                   else "#D97706" if obj.score >= 40 else "#DC2626")
        return format_html('<b style="color:{};font-size:14px;">{}/100</b>',
                           couleur, obj.score)

    @admin.display(description="Evolution")
    def delta_badge(self, obj):
        if obj.previous_score is None:
            return "premier calcul"
        ecart = obj.delta
        if ecart == 0:
            return "stable"
        couleur = "#16A34A" if ecart > 0 else "#DC2626"
        return format_html('<b style="color:{};">{}{}</b>',
                           couleur, "+" if ecart > 0 else "", ecart)

    @admin.display(description="Composition")
    def breakdown_view(self, obj):
        return _json(obj.breakdown)

    @admin.display(description="Douze derniers calculs")
    def history_view(self, obj):
        historique = TrustScore.objects.filter(
            payee=obj.payee).order_by("-computed_at")[:12]
        lignes = "".join(
            format_html("<tr><td style='padding:3px 12px;'>{}</td>"
                        "<td style='padding:3px 12px;'><b>{}</b></td>"
                        "<td style='padding:3px 12px;'>{}</td></tr>",
                        h.computed_at.strftime("%Y-%m-%d %H:%M"), h.score,
                        f"{'+' if h.delta > 0 else ''}{h.delta}"
                        if h.previous_score is not None else "—")
            for h in historique)
        return format_html(
            "<table style='border-collapse:collapse;'>"
            "<tr style='background:#eee;'>"
            "<th style='padding:5px 12px;text-align:left;'>Date</th>"
            "<th style='padding:5px 12px;'>Score</th>"
            "<th style='padding:5px 12px;'>Evolution</th></tr>{}</table>"
            "<p style='margin-top:8px;color:#6B7280;'>Un partenaire qui "
            "descend de 80 a 55 en trois semaines pose un probleme different "
            "d'un partenaire stable a 55.</p>", lignes)

    @admin.display(description="Application financiere")
    def governance_note(self, obj):
        return mark_safe(
            '<div style="padding:10px;background:#FEF3C7;'
            'border-left:4px solid #D97706;">'
            "Ce score ne deduit RIEN tout seul.<br>"
            "Tout ajustement financier qui en decoule passe par le seuil "
            "<code>trust_adjustment_review_xaf</code> : au-dela, "
            "<b>validation humaine obligatoire</b>.<br>"
            "Un bug de calcul applique en masse viderait des partenaires "
            "avant qu'on le detecte.</div>")