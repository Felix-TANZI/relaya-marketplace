# backend/apps/payments/webhooks/admin.py
# Administration du journal des webhooks.
#
# CONSULTATION TOTALE : corps brut, en-tetes, IP, etat de signature avec son
# motif, resultat de la re-interrogation, et note de traitement.
#
# ECRITURE IMPOSSIBLE. Une seule action : rejouer le traitement — sure grace
# a l'idempotence de la confirmation.

import json

from django.contrib import admin, messages
from django.utils.html import format_html
from django.utils.safestring import mark_safe

from .models import WebhookEvent, WebhookReplayGuard
from .receiver import reprocess

STATUS_COLORS = {
    "RECEIVED": "#6B7280", "VERIFIED": "#2563EB", "PROCESSED": "#16A34A",
    "IGNORED": "#D97706", "REJECTED": "#DC2626", "ERROR": "#DC2626",
}

SIGNATURE_COLORS = {
    "VALID": "#16A34A", "INVALID": "#DC2626", "UNVERIFIABLE": "#D97706",
}


def _block(contenu, langue="") -> str:
    if not contenu:
        return "—"
    if isinstance(contenu, (dict, list)):
        contenu = json.dumps(contenu, indent=2, ensure_ascii=False)
    texte = str(contenu).replace("<", "&lt;").replace(">", "&gt;")
    return mark_safe(
        '<pre style="background:#f6f6f6;padding:12px;border-radius:6px;'
        'max-height:400px;overflow:auto;font-size:12px;">{}</pre>'.format(texte)
    )


@admin.register(WebhookEvent)
class WebhookEventAdmin(admin.ModelAdmin):
    list_display = (
        "received_at", "provider_code", "http_method", "status_badge",
        "signature_badge", "provider_reference", "reported_status",
        "verified_status", "endpoint", "source_ip",
    )
    list_filter = (
        "status", "signature_state", "provider_code",
        "endpoint", "http_method", "received_at",
    )
    search_fields = (
        "provider_reference", "external_reference",
        "body_sha256", "raw_body", "raw_query", "source_ip",
    )
    date_hierarchy = "received_at"
    ordering = ("-received_at",)
    list_per_page = 50

    readonly_fields = (
        "id", "provider_code", "http_method", "source_ip", "body_sha256",
        "raw_body_view", "raw_query_view", "raw_headers_view",
        "signature_state", "signature_reason",
        "provider_reference", "external_reference", "reported_status", "endpoint",
        "status", "processing_note", "processing_error",
        "verified_status", "verified_payload_view", "authority_note",
        "received_at", "processed_at",
    )

    fieldsets = (
        ("Reception", {
            "fields": ("id", "provider_code", "http_method", "source_ip",
                       "received_at", "body_sha256"),
        }),
        ("Contenu recu — NON FAISANT FOI", {
            "fields": ("raw_query_view", "raw_body_view", "raw_headers_view",
                       "provider_reference", "external_reference",
                       "reported_status", "endpoint"),
            "description": "Ce que le message PRETEND. Aucune decision n'est "
                           "prise sur cette base.",
        }),
        ("Signature", {
            "fields": ("signature_state", "signature_reason", "authority_note"),
        }),
        ("Verification aupres du prestataire — FAIT FOI", {
            "fields": ("verified_status", "verified_payload_view"),
            "description": "Resultat de la re-interrogation. C'est cette "
                           "reponse, et elle seule, qui declenche une transition.",
        }),
        ("Traitement", {
            "fields": ("status", "processing_note", "processing_error", "processed_at"),
        }),
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

    @admin.display(description="Signature", ordering="signature_state")
    def signature_badge(self, obj):
        return format_html(
            '<span style="color:{};font-weight:700;" title="{}">{}</span>',
            SIGNATURE_COLORS.get(obj.signature_state, "#6B7280"),
            obj.signature_reason[:180], obj.get_signature_state_display(),
        )

    @admin.display(description="Portee de la signature")
    def authority_note(self, obj):
        return mark_safe(
            '<div style="padding:10px;background:#FEF3C7;'
            'border-left:4px solid #D97706;">'
            "<b>La signature CamPay ne fait pas autorite.</b><br>"
            "C'est un JWT qui atteste d'une emission par CamPay, mais qui ne "
            "contient <b>aucune empreinte du contenu</b> : elle reste valide "
            "sur un corps forge.<br>"
            "L'authentification reelle est la <b>re-interrogation</b> du "
            "prestataire, dont le resultat figure ci-dessous.</div>"
        )

    @admin.display(description="Corps brut")
    def raw_body_view(self, obj):
        return _block(obj.raw_body)

    @admin.display(description="Chaine de requete")
    def raw_query_view(self, obj):
        return _block(obj.raw_query)

    @admin.display(description="En-tetes")
    def raw_headers_view(self, obj):
        return _block(obj.raw_headers)

    @admin.display(description="Reponse verifiee")
    def verified_payload_view(self, obj):
        return _block(obj.verified_payload)

    @admin.action(description="Rejouer le traitement")
    def reprocess_selected(self, request, queryset):
        ok = 0
        for evenement in queryset:
            try:
                resultat = reprocess(evenement)
                ok += 1
                self.message_user(
                    request, f"{resultat.provider_reference or resultat.id} : "
                             f"{resultat.status} — {resultat.processing_note[:120]}"
                )
            except Exception as exc:
                self.message_user(request, f"{evenement.id} : {exc}",
                                  level=messages.ERROR)
        if ok:
            self.message_user(request, f"{ok} evenement(s) rejoue(s).")

    actions = ["reprocess_selected"]


@admin.register(WebhookReplayGuard)
class WebhookReplayGuardAdmin(admin.ModelAdmin):
    list_display = ("body_sha256_short", "provider_code", "hit_count", "first_seen_at")
    list_filter = ("provider_code", "first_seen_at")
    search_fields = ("body_sha256",)
    ordering = ("-first_seen_at",)

    def get_readonly_fields(self, request, obj=None):
        return [f.name for f in self.model._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    @admin.display(description="Empreinte", ordering="body_sha256")
    def body_sha256_short(self, obj):
        return f"{obj.body_sha256[:24]}…"