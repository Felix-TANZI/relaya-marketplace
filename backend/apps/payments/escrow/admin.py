# backend/apps/payments/escrow/admin.py
# Administration des sequestres.
#
# CONSULTATION TOTALE : montants, echeances, politique figee, chronologie,
# ecritures comptables liees, evenements declencheurs.
#
# ECRITURE CONTROLEE : aucune edition de champ. Trois actions seulement,
# toutes passant par la couche de service, avec motif obligatoire pour
# celles qui deplacent de l'argent hors du cycle normal.

import json

from django.contrib import admin, messages
from django.utils.html import format_html
from django.utils.safestring import mark_safe

from .models import EscrowEvent, EscrowHold
from .services import EscrowError, freeze_hold, release_hold, unfreeze_hold

STATUS_COLORS = {
    "PENDING": "#6B7280", "HELD": "#2563EB", "RELEASE_SCHEDULED": "#D97706",
    "RELEASED": "#16A34A", "FROZEN": "#DC2626", "REFUNDED": "#7C3AED",
    "PARTIALLY_REFUNDED": "#7C3AED", "CANCELLED": "#6B7280",
}

COMPONENT_COLORS = {
    "GOODS": "#2563EB", "TRANSPORT": "#D97706", "RELAY_HANDLING": "#7C3AED",
}


def _fmt(montant) -> str:
    return f"{int(montant or 0):,}".replace(",", " ") + " FCFA"


def _json(donnees) -> str:
    if not donnees:
        return "—"
    texte = json.dumps(donnees, indent=2, ensure_ascii=False)
    return mark_safe(
        '<pre style="background:#f6f6f6;padding:12px;border-radius:6px;'
        'max-height:340px;overflow:auto;font-size:12px;">{}</pre>'.format(
            texte.replace("<", "&lt;").replace(">", "&gt;")
        )
    )


@admin.register(EscrowHold)
class EscrowHoldAdmin(admin.ModelAdmin):
    list_display = (
        "reference", "component_badge", "status_badge", "order_link",
        "payee_link", "net_display", "trigger_short",
        "auto_confirm_at", "release_at", "created_at",
    )
    list_filter = ("status", "component", "release_trigger", "created_at")
    search_fields = (
        "reference", "intent__reference", "payee__payee_code",
        "payee__display_label", "order_id", "settlement_batch_ref",
    )
    date_hierarchy = "created_at"
    ordering = ("-created_at",)
    list_per_page = 50
    list_select_related = ("intent", "payee")

    readonly_fields = (
        "id", "reference", "intent_link", "order_id", "payee_link", "component",
        "gross_display", "commission_display", "net_display", "refunded_display",
        "payable_display", "status", "release_trigger",
        "auto_confirm_at", "release_at", "dispute_window_ends_at",
        "triggered_at", "released_at", "frozen_reason", "frozen_at",
        "policy_view", "ledger_view", "events_view", "isolation_note",
        "settlement_batch_ref", "created_at", "updated_at",
    )

    fieldsets = (
        ("Sequestre", {
            "fields": ("id", "reference", "intent_link", "order_id",
                       "payee_link", "component", "status"),
            "description": "Cle a quatre dimensions : paiement x commande x "
                           "beneficiaire x composant.",
        }),
        ("Montants", {
            "fields": ("gross_display", "commission_display", "net_display",
                       "refunded_display", "payable_display"),
        }),
        ("Cycle de liberation", {
            "fields": ("release_trigger", "auto_confirm_at", "release_at",
                       "dispute_window_ends_at", "triggered_at", "released_at"),
            "description": "Le declencheur depend du COMPOSANT, pas du "
                           "beneficiaire.",
        }),
        ("Gel", {"fields": ("frozen_reason", "frozen_at")}),
        ("Portee", {"fields": ("isolation_note",)}),
        ("Politique figee", {
            "fields": ("policy_view",),
            "classes": ("collapse",),
            "description": "Delais resolus a la creation. Une modification en "
                           "administration n'affecte pas ce sequestre.",
        }),
        ("Rattachements", {"fields": ("ledger_view", "events_view",
                                      "settlement_batch_ref")}),
        ("Horodatage", {"fields": ("created_at", "updated_at"),
                        "classes": ("collapse",)}),
    )

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    # ── Colonnes ─────────────────────────────────────────────────────────────

    @admin.display(description="Composant", ordering="component")
    def component_badge(self, obj):
        return format_html(
            '<span style="color:{};font-weight:700;">{}</span>',
            COMPONENT_COLORS.get(obj.component, "#6B7280"),
            obj.get_component_display(),
        )

    @admin.display(description="Statut", ordering="status")
    def status_badge(self, obj):
        return format_html(
            '<span style="color:{};font-weight:700;">● {}</span>',
            STATUS_COLORS.get(obj.status, "#6B7280"), obj.get_status_display(),
        )

    @admin.display(description="Commande", ordering="order_id")
    def order_link(self, obj):
        if obj.order_id is None:
            return mark_safe(
                '<span style="color:#9CA3AF;" title="Le transport est de '
                'niveau paiement : les frais sont mutualises sur le panier.">'
                "— niveau paiement —</span>"
            )
        return format_html(
            '<a href="/django-admin/orders/order/{}/change/">{}</a>',
            obj.order_id, f"BLV-{obj.order_id:05d}",
        )

    @admin.display(description="Beneficiaire", ordering="payee__payee_code")
    def payee_link(self, obj):
        return format_html(
            '<a href="/django-admin/payments/payeeaccount/{}/change/">{}</a>'
            "<br><small>{}</small>",
            obj.payee_id, obj.payee.payee_code, obj.payee.display_label[:40],
        )

    @admin.display(description="Intention")
    def intent_link(self, obj):
        return format_html(
            '<a href="/django-admin/payments/paymentintent/{}/change/">{}</a>',
            obj.intent_id, obj.intent.reference,
        )

    @admin.display(description="Brut")
    def gross_display(self, obj):
        return _fmt(obj.gross_amount_xaf)

    @admin.display(description="Commission")
    def commission_display(self, obj):
        return format_html('<span style="color:#DC2626;">{}</span>',
                           _fmt(obj.commission_xaf))

    @admin.display(description="Net", ordering="net_amount_xaf")
    def net_display(self, obj):
        return format_html('<b style="color:#16A34A;">{}</b>',
                           _fmt(obj.net_amount_xaf))

    @admin.display(description="Rembourse")
    def refunded_display(self, obj):
        return _fmt(obj.refunded_amount_xaf) if obj.refunded_amount_xaf else "—"

    @admin.display(description="Exigible")
    def payable_display(self, obj):
        return format_html("<b>{}</b>", _fmt(obj.payable_amount_xaf))

    @admin.display(description="Declencheur")
    def trigger_short(self, obj):
        return obj.get_release_trigger_display()

    @admin.display(description="Politique appliquee")
    def policy_view(self, obj):
        return _json(obj.policy_snapshot)

    @admin.display(description="Portee du gel")
    def isolation_note(self, obj):
        freres = EscrowHold.objects.filter(intent=obj.intent).exclude(pk=obj.pk)
        if not freres:
            return "Seul sequestre de ce paiement."
        lignes = "".join(
            format_html(
                "<li>{} — {} — {} — <b>{}</b></li>",
                f.reference, f.get_component_display(),
                f.payee.payee_code, f.get_status_display(),
            )
            for f in freres.select_related("payee")[:20]
        )
        return format_html(
            "<div>Autres sequestres du meme paiement, <b>non affectes</b> par "
            "un gel de celui-ci :<ul style='margin:6px 0 0 18px;'>{}</ul></div>",
            lignes,
        )

    @admin.display(description="Ecritures comptables")
    def ledger_view(self, obj):
        from apps.payments.ledger.models import LedgerTransaction
        transactions = LedgerTransaction.objects.filter(
            source_type="EscrowHold", source_ref=obj.reference,
        )
        if not transactions:
            return "— aucune ecriture —"
        return mark_safe("<br>".join(
            f'<a href="/django-admin/payments/ledgertransaction/{t.pk}/change/">'
            f"{t.reference}</a> — {t.kind} — {_fmt(t.total_debit())}"
            for t in transactions
        ))

    @admin.display(description="Evenements declencheurs")
    def events_view(self, obj):
        if obj.order_id is None:
            evenements = EscrowEvent.objects.filter(
                intent_reference=obj.intent.reference,
            )
        else:
            evenements = EscrowEvent.objects.filter(order_id=obj.order_id)
        evenements = evenements.order_by("-received_at")[:10]
        if not evenements:
            return "— aucun evenement —"
        return mark_safe("<br>".join(
            f"{e.received_at:%Y-%m-%d %H:%M} — {e.kind} — {e.outcome}"
            for e in evenements
        ))

    # ── Actions ──────────────────────────────────────────────────────────────

    @admin.action(description="Liberer maintenant (forcage, motif requis)")
    def force_release(self, request, queryset):
        ok = 0
        for hold in queryset:
            try:
                release_hold(
                    hold, force=True,
                    reason=f"Liberation forcee par {request.user.username} "
                           "depuis l'administration.",
                )
                ok += 1
            except (EscrowError, Exception) as exc:
                self.message_user(request, f"{hold.reference} : {exc}",
                                  level=messages.ERROR)
        if ok:
            self.message_user(request, f"{ok} sequestre(s) libere(s).")

    @admin.action(description="Geler (ce sequestre uniquement)")
    def freeze_selected(self, request, queryset):
        ok = 0
        for hold in queryset:
            try:
                freeze_hold(hold, reason=f"Gel administratif par "
                                         f"{request.user.username}.")
                ok += 1
            except EscrowError as exc:
                self.message_user(request, f"{hold.reference} : {exc}",
                                  level=messages.ERROR)
        if ok:
            self.message_user(
                request,
                f"{ok} sequestre(s) gele(s). Les autres sequestres des memes "
                "paiements ne sont pas affectes.",
            )

    @admin.action(description="Degeler")
    def unfreeze_selected(self, request, queryset):
        ok = 0
        for hold in queryset.filter(status=EscrowHold.Status.FROZEN):
            unfreeze_hold(hold, reason=f"Degel par {request.user.username}.")
            ok += 1
        if ok:
            self.message_user(request, f"{ok} sequestre(s) degele(s).")

    actions = ["force_release", "freeze_selected", "unfreeze_selected"]


@admin.register(EscrowEvent)
class EscrowEventAdmin(admin.ModelAdmin):
    """
    Journal des evenements metier consommes.

    Le domaine financier ne juge pas les faits metier : il applique ce que
    les domaines competents lui annoncent, apres leurs propres controles.
    """

    list_display = (
        "received_at", "kind", "outcome_badge", "emitter",
        "order_id", "intent_reference", "component", "affected_holds",
    )
    list_filter = ("kind", "outcome", "component", "received_at")
    search_fields = ("event_id", "intent_reference", "order_id", "note", "emitter")
    date_hierarchy = "received_at"
    ordering = ("-received_at",)

    readonly_fields = (
        "id", "event_id", "kind", "emitter", "order_id", "intent_reference",
        "component", "payee_code", "payload_view", "outcome", "note",
        "affected_holds", "occurred_at", "received_at", "contract_note",
    )

    fieldsets = (
        ("Evenement", {
            "fields": ("id", "event_id", "kind", "emitter", "occurred_at",
                       "received_at"),
            "description": "event_id garantit l'idempotence : rejouer un "
                           "evenement n'a aucun effet supplementaire.",
        }),
        ("Cible", {"fields": ("order_id", "intent_reference", "component",
                              "payee_code")}),
        ("Contenu", {"fields": ("payload_view",)}),
        ("Resultat", {"fields": ("outcome", "note", "affected_holds")}),
        ("Contrat", {"fields": ("contract_note",)}),
    )

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    @admin.display(description="Resultat", ordering="outcome")
    def outcome_badge(self, obj):
        couleurs = {"APPLIED": "#16A34A", "IGNORED": "#D97706",
                    "REJECTED": "#DC2626", "ERROR": "#DC2626"}
        return format_html(
            '<span style="color:{};font-weight:700;">● {}</span>',
            couleurs.get(obj.outcome, "#6B7280"), obj.get_outcome_display(),
        )

    @admin.display(description="Contenu")
    def payload_view(self, obj):
        return _json(obj.payload)

    @admin.display(description="Contrat d'emission")
    def contract_note(self, obj):
        return mark_safe(
            '<div style="padding:10px;background:#EFF6FF;'
            'border-left:4px solid #2563EB;">'
            "<b>Le domaine financier ne juge pas les faits metier.</b><br>"
            "Cet evenement a ete emis par un domaine competent APRES ses "
            "propres controles — preuve de livraison, scan de remise, "
            "instruction d'un litige.<br>"
            "Le module financier ne reexamine pas la preuve : il ne saurait "
            "pas le faire, et ce n'est pas son role.</div>"
        )