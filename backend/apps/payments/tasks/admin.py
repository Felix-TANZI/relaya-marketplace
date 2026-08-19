# backend/apps/payments/tasks/admin.py
# Administration des executions de taches.
#
# Sans cet ecran, une tache qui cesse de tourner est INVISIBLE : rien
# n'echoue, rien n'alerte, et on decouvre le probleme quand un vendeur
# reclame un reglement qui n'est jamais parti.

import json

from django.contrib import admin, messages
from django.utils.html import format_html
from django.utils.safestring import mark_safe

from .base import REGISTRY, run_task
from .models import TaskRun

STATUS_COLORS = {
    "RUNNING": "#2563EB", "SUCCESS": "#16A34A",
    "ERROR": "#DC2626", "SKIPPED": "#D97706",
}


@admin.register(TaskRun)
class TaskRunAdmin(admin.ModelAdmin):
    list_display = (
        "started_at", "task_name", "status_badge", "critical_badge",
        "duration_display", "summary", "hostname",
    )
    list_filter = ("status", "task_name", "started_at")
    search_fields = ("task_name", "error", "note")
    date_hierarchy = "started_at"
    ordering = ("-started_at",)
    list_per_page = 50

    readonly_fields = (
        "id", "task_name", "status", "result_view", "note", "error",
        "traceback_view", "hostname", "duration_ms",
        "started_at", "finished_at", "health_view",
    )

    fieldsets = (
        ("Execution", {
            "fields": ("id", "task_name", "status", "hostname",
                       "started_at", "finished_at", "duration_ms"),
        }),
        ("Resultat", {"fields": ("result_view", "note")}),
        ("Erreur", {"fields": ("error", "traceback_view"),
                    "classes": ("collapse",)}),
        ("Sante globale", {"fields": ("health_view",)}),
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
            STATUS_COLORS.get(obj.status, "#6B7280"), obj.get_status_display(),
        )

    @admin.display(description="")
    def critical_badge(self, obj):
        info = REGISTRY.get(obj.task_name)
        if info and info["critical"]:
            return mark_safe(
                '<span style="color:#DC2626;font-weight:700;" '
                'title="Sans cette tache, des vendeurs ne sont jamais payes '
                'ou des paiements restent invisibles.">CRITIQUE</span>'
            )
        return "—"

    @admin.display(description="Duree", ordering="duration_ms")
    def duration_display(self, obj):
        if obj.duration_ms < 1000:
            return f"{obj.duration_ms} ms"
        return f"{obj.duration_ms / 1000:.1f} s"

    @admin.display(description="Resultat")
    def summary(self, obj):
        if obj.error:
            return format_html('<span style="color:#DC2626;">{}</span>',
                               obj.error[:80])
        if obj.note:
            return obj.note[:80]
        if not obj.result:
            return "—"
        interessants = [
            (cle, valeur) for cle, valeur in obj.result.items()
            if isinstance(valeur, (int, bool)) and valeur
        ]
        if not interessants:
            return "aucun element traite"
        return " · ".join(f"{cle}={valeur}" for cle, valeur in interessants[:5])

    @admin.display(description="Detail")
    def result_view(self, obj):
        if not obj.result:
            return "—"
        texte = json.dumps(obj.result, indent=2, ensure_ascii=False)
        return mark_safe(
            '<pre style="background:#f6f6f6;padding:12px;border-radius:6px;'
            'max-height:340px;overflow:auto;font-size:12px;">{}</pre>'.format(
                texte.replace("<", "&lt;").replace(">", "&gt;")
            )
        )

    @admin.display(description="Trace")
    def traceback_view(self, obj):
        if not obj.traceback_text:
            return "—"
        return mark_safe(
            '<pre style="background:#FEE2E2;padding:12px;border-radius:6px;'
            'max-height:400px;overflow:auto;font-size:11px;">{}</pre>'.format(
                obj.traceback_text.replace("<", "&lt;").replace(">", "&gt;")
            )
        )

    @admin.display(description="Etat des taches")
    def health_view(self, obj):
        sante = TaskRun.health(max_age_minutes=120)
        lignes = "".join(
            format_html(
                "<tr><td style='padding:4px 12px;'>{}</td>"
                "<td style='padding:4px 12px;'>{}</td>"
                "<td style='padding:4px 12px;color:{};font-weight:{};'>{}</td></tr>",
                item["task_name"],
                item["last_success_at"].strftime("%Y-%m-%d %H:%M")
                if item["last_success_at"] else "jamais",
                "#DC2626" if item["alert"] else ("#D97706" if item["stale"] else "#16A34A"),
                "700" if item["alert"] else "400",
                "ALERTE" if item["alert"] else ("en retard" if item["stale"] else "a jour"),
            )
            for item in sante
        )
        return format_html(
            "<table style='border-collapse:collapse;'>"
            "<tr style='background:#eee;'>"
            "<th style='padding:6px 12px;text-align:left;'>Tache</th>"
            "<th style='padding:6px 12px;text-align:left;'>Dernier succes</th>"
            "<th style='padding:6px 12px;text-align:left;'>Etat</th></tr>{}</table>",
            lignes,
        )

    @admin.action(description="Relancer la tache selectionnee")
    def rerun_selected(self, request, queryset):
        noms = sorted({execution.task_name for execution in queryset})
        for nom in noms:
            resultat = run_task(nom)
            if resultat.get("error"):
                self.message_user(request, f"{nom} : {resultat['error']}",
                                  level=messages.ERROR)
            else:
                self.message_user(request, f"{nom} : {resultat}")

    actions = ["rerun_selected"]