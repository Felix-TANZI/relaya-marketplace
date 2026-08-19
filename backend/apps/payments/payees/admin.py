# backend/apps/payments/payees/admin.py
# Administration des comptes beneficiaires.
#
# CONSULTATION TOTALE : statut KYC, gel, numero MASQUE, historique des
# changements, motifs de blocage d'un versement, partage de numero.
#
# ECRITURE CONTROLEE : les operations sensibles passent par des ACTIONS
# qui alimentent le journal d'audit, jamais par l'edition d'un champ.
# Le numero Mobile Money n'est jamais affiche en clair, ni modifiable ici.

from django.contrib import admin, messages
from django.utils.html import format_html
from django.utils.safestring import mark_safe

from apps.payments.bridge.models import PayeeLink

from .models import KycStatus, PayeeAccount, PayeeMomoChange
from .services import (
    PayeeError,
    payout_blockers,
    release_hold,
    shared_number_payees,
    verify_kyc,
)

KYC_COLORS = {
    KycStatus.PENDING: "#D97706",
    KycStatus.VERIFIED: "#16A34A",
    KycStatus.REJECTED: "#DC2626",
    KycStatus.SUSPENDED: "#6B7280",
}


class PayeeLinkInline(admin.StackedInline):
    model = PayeeLink
    extra = 0
    can_delete = False
    fields = ("subject_label", "is_platform", "created_at")
    readonly_fields = ("subject_label", "is_platform", "created_at")

    def has_add_permission(self, request, obj=None):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    @admin.display(description="Entite metier")
    def subject_label(self, obj):
        return obj.subject_label


class PayeeMomoChangeInline(admin.TabularInline):
    model = PayeeMomoChange
    extra = 0
    can_delete = False
    fields = (
        "created_at", "previous_masked", "new_masked",
        "previous_operator", "new_operator", "changed_by", "reason", "source_ip",
    )
    readonly_fields = fields
    ordering = ("-created_at",)

    def has_add_permission(self, request, obj=None):
        return False

    def has_change_permission(self, request, obj=None):
        return False


@admin.register(PayeeAccount)
class PayeeAccountAdmin(admin.ModelAdmin):
    list_display = (
        "payee_code", "payee_type", "display_label",
        "kyc_badge", "hold_badge", "momo_display",
        "payout_badge", "is_active", "created_at",
    )
    list_filter = ("payee_type", "kyc_status", "payout_hold", "is_active", "momo_operator")
    search_fields = ("payee_code", "display_label", "momo_number_masked")
    ordering = ("payee_type", "payee_code")
    list_per_page = 50
    inlines = [PayeeLinkInline, PayeeMomoChangeInline]

    readonly_fields = (
        "id", "payee_code", "payee_type",
        "kyc_status", "kyc_verified_at", "kyc_verified_by", "kyc_note",
        "payout_hold", "payout_hold_reason", "payout_hold_at", "payout_hold_by",
        "momo_operator", "momo_number_masked", "momo_fingerprint", "momo_changed_at",
        "payout_status_detail", "shared_number_warning", "subject_link",
        "created_at", "updated_at",
    )

    fieldsets = (
        ("Identite financiere", {
            "fields": ("id", "payee_code", "payee_type", "display_label",
                       "subject_link", "is_active"),
        }),
        ("Eligibilite au reglement", {
            "fields": ("payout_status_detail",),
            "description": "Tous les motifs de blocage, pas seulement le premier.",
        }),
        ("KYC", {
            "fields": ("kyc_status", "kyc_verified_at", "kyc_verified_by", "kyc_note"),
        }),
        ("Gel administratif", {
            "fields": ("payout_hold", "payout_hold_reason",
                       "payout_hold_at", "payout_hold_by"),
            "description": "A reserver aux cas graves : fraude, KYC, litige majeur. "
                           "Une petite creance s'impute sur le prochain reglement.",
        }),
        ("Mobile Money", {
            "fields": ("momo_operator", "momo_number_masked",
                       "momo_changed_at", "shared_number_warning"),
            "description": "Le numero est chiffre au repos et n'est JAMAIS affiche "
                           "en clair. Un changement declenche une periode de "
                           "refroidissement avant tout versement.",
        }),
        ("Reglement", {"fields": ("settlement_cycle_key",)}),
        ("Horodatage", {"fields": ("created_at", "updated_at"), "classes": ("collapse",)}),
    )

    def has_delete_permission(self, request, obj=None):
        return False

    def has_add_permission(self, request):
        # Les comptes naissent du rattachement metier (bridge.actors),
        # jamais d'une saisie manuelle.
        return False

    # ── Colonnes ─────────────────────────────────────────────────────────────

    @admin.display(description="KYC", ordering="kyc_status")
    def kyc_badge(self, obj):
        return format_html(
            '<span style="color:{};font-weight:700;">● {}</span>',
            KYC_COLORS.get(obj.kyc_status, "#6B7280"), obj.get_kyc_status_display(),
        )

    @admin.display(description="Gel", ordering="payout_hold")
    def hold_badge(self, obj):
        if not obj.payout_hold:
            return "—"
        return format_html(
            '<span style="color:#DC2626;font-weight:700;" title="{}">GELE</span>',
            obj.payout_hold_reason[:120],
        )

    @admin.display(description="Mobile Money")
    def momo_display(self, obj):
        if not obj.momo_number_masked:
            return mark_safe('<span style="color:#DC2626;">aucun</span>')
        return f"{obj.momo_operator} {obj.momo_number_masked}"

    @admin.display(description="Reglable")
    def payout_badge(self, obj):
        motifs = payout_blockers(obj)
        if not motifs:
            return mark_safe('<span style="color:#16A34A;font-weight:700;">oui</span>')
        return format_html(
            '<span style="color:#DC2626;font-weight:700;" title="{}">non ({})</span>',
            " · ".join(motifs), len(motifs),
        )

    @admin.display(description="Etat detaille")
    def payout_status_detail(self, obj):
        motifs = payout_blockers(obj)
        if not motifs:
            return mark_safe(
                '<div style="color:#16A34A;font-weight:700;">'
                "Ce beneficiaire peut recevoir un reglement.</div>"
            )
        lignes = "".join(
            format_html("<li style='margin:4px 0;'>{}</li>", motif) for motif in motifs
        )
        return format_html(
            '<div style="color:#DC2626;"><b>Versement impossible :</b>'
            "<ul style='margin:6px 0 0 18px;'>{}</ul></div>", lignes,
        )

    @admin.display(description="Numero partage")
    def shared_number_warning(self, obj):
        autres = shared_number_payees(obj)
        if not autres:
            return mark_safe('<span style="color:#16A34A;">numero unique</span>')
        codes = ", ".join(c.payee_code for c in autres[:10])
        return format_html(
            '<div style="color:#DC2626;font-weight:700;">'
            "ALERTE : ce numero sert aussi a {} autre(s) beneficiaire(s)<br>"
            '<span style="font-weight:400;">{}</span><br>'
            '<span style="font-weight:400;font-style:italic;">Un meme numero '
            "servant plusieurs comptes est le motif d'une mule financiere.</span></div>",
            len(autres), codes,
        )

    @admin.display(description="Entite metier")
    def subject_link(self, obj):
        lien = PayeeLink.objects.filter(payee_account=obj).first()
        return lien.subject_label if lien else "— non rattache —"

    # ── Actions ──────────────────────────────────────────────────────────────

    @admin.action(description="Valider le KYC")
    def verify_kyc_selected(self, request, queryset):
        ok = 0
        for compte in queryset.exclude(kyc_status=KycStatus.VERIFIED):
            try:
                verify_kyc(compte, verified_by=request.user,
                           note="Valide depuis l'administration.")
                ok += 1
            except PayeeError as exc:
                self.message_user(request, f"{compte.payee_code} : {exc}",
                                  level=messages.ERROR)
        if ok:
            self.message_user(request, f"{ok} KYC valide(s).")

    @admin.action(description="Lever le gel des versements")
    def release_hold_selected(self, request, queryset):
        ok = 0
        for compte in queryset.filter(payout_hold=True):
            release_hold(compte, released_by=request.user,
                         reason="Leve depuis l'administration.")
            ok += 1
        if ok:
            self.message_user(request, f"{ok} gel(s) leve(s).")

    actions = ["verify_kyc_selected", "release_hold_selected"]


@admin.register(PayeeMomoChange)
class PayeeMomoChangeAdmin(admin.ModelAdmin):
    """Journal transversal — permet de reperer une vague de changements suspecte."""

    list_display = (
        "created_at", "payee", "previous_masked", "new_masked",
        "previous_operator", "new_operator", "changed_by", "source_ip",
    )
    list_filter = ("new_operator", "created_at")
    search_fields = ("payee__payee_code", "new_masked", "reason")
    date_hierarchy = "created_at"
    ordering = ("-created_at",)
    list_select_related = ("payee", "changed_by")

    def get_readonly_fields(self, request, obj=None):
        return [f.name for f in self.model._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(PayeeLink)
class PayeeLinkAdmin(admin.ModelAdmin):
    list_display = ("payee_account", "subject_label", "is_platform", "created_at")
    list_filter = ("is_platform",)
    search_fields = ("payee_account__payee_code", "payee_account__display_label")
    list_select_related = ("payee_account", "vendor", "delivery_company", "user")

    def get_readonly_fields(self, request, obj=None):
        return [f.name for f in self.model._meta.fields] + ["subject_label"]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    @admin.display(description="Entite metier")
    def subject_label(self, obj):
        return obj.subject_label