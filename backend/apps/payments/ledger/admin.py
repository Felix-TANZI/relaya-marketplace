# backend/apps/payments/ledger/admin.py
# Administration du registre comptable.
#
# CONSULTATION TOTALE : plan comptable, transactions, ecritures, soldes,
# balance generale, chaine d'integrite — tout est visible et cherchable.
#
# ECRITURE IMPOSSIBLE : aucun ajout, aucune modification, aucune suppression.
# Le registre ne s'edite pas a la main. Une correction se fait par
# contre-passation, qui est elle-meme une nouvelle ecriture tracee.

from django.contrib import admin, messages
from django.utils.html import format_html
from django.utils.safestring import mark_safe

from . import chart_of_accounts as coa
from .balances import balance, raw_balance
from .models import LedgerAccount, LedgerEntry, LedgerTransaction
from .posting import PostingError, reverse as reverse_transaction

TYPE_COLORS = {
    coa.ASSET: "#2563EB",
    coa.LIABILITY: "#D97706",
    coa.REVENUE: "#16A34A",
    coa.EXPENSE: "#DC2626",
    coa.SUSPENSE: "#7C3AED",
}


def _fmt(montant: int) -> str:
    signe = "-" if montant < 0 else ""
    return f"{signe}{abs(montant):,}".replace(",", " ") + " FCFA"


@admin.register(LedgerAccount)
class LedgerAccountAdmin(admin.ModelAdmin):
    list_display = (
        "code", "name", "type_badge", "normal_side",
        "psp_family_badge", "flags", "balance_display", "entries_count",
    )
    list_filter = ("account_type", "normal_side", "psp_family", "is_auxiliary", "is_reserved")
    search_fields = ("code", "name")
    ordering = ("code",)

    def get_readonly_fields(self, request, obj=None):
        return [f.name for f in self.model._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    @admin.display(description="Type", ordering="account_type")
    def type_badge(self, obj):
        return format_html(
            '<span style="color:{};font-weight:700;">{}</span>',
            TYPE_COLORS.get(obj.account_type, "#6B7280"),
            obj.get_account_type_display(),
        )

    @admin.display(description="Famille PSP")
    def psp_family_badge(self, obj):
        if obj.psp_family == coa.FAMILY_NONE:
            return "—"
        if obj.psp_family == coa.FAMILY_DERIVABLE:
            return mark_safe('<span style="color:#16A34A;">derivable</span>')
        return mark_safe(
            '<span style="color:#D97706;" title="Reconciliable seulement si le '
            'prestataire expose l\'information (Jalon A)">dependant PSP</span>'
        )

    @admin.display(description="")
    def flags(self, obj):
        marques = []
        if obj.is_auxiliary:
            marques.append('<span style="color:#2563EB;">auxiliaire</span>')
        if obj.is_reserved:
            marques.append('<span style="color:#DC2626;font-weight:700;">RESERVE</span>')
        return mark_safe(" · ".join(marques)) if marques else "—"

    @admin.display(description="Solde")
    def balance_display(self, obj):
        montant = balance(obj.code)
        couleur = "#16A34A" if montant >= 0 else "#DC2626"
        return format_html('<b style="color:{};">{}</b>', couleur, _fmt(montant))

    @admin.display(description="Ecritures")
    def entries_count(self, obj):
        return obj.entries.count()


class LedgerEntryInline(admin.TabularInline):
    model = LedgerEntry
    extra = 0
    can_delete = False
    fields = ("account", "direction", "amount_display", "payee_code", "label")
    readonly_fields = fields

    def has_add_permission(self, request, obj=None):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    @admin.display(description="Montant")
    def amount_display(self, obj):
        couleur = "#DC2626" if obj.direction == LedgerEntry.Direction.DEBIT else "#16A34A"
        return format_html('<b style="color:{};">{}</b>', couleur, _fmt(obj.amount_xaf))


@admin.register(LedgerTransaction)
class LedgerTransactionAdmin(admin.ModelAdmin):
    list_display = (
        "reference", "seq", "kind", "occurred_at",
        "total_display", "balance_badge", "integrity_badge",
        "source_display", "reversal_badge",
    )
    list_filter = ("kind", "occurred_at", "source_type")
    search_fields = ("reference", "source_ref", "correlation_id", "description")
    date_hierarchy = "occurred_at"
    ordering = ("-seq",)
    list_per_page = 50
    inlines = [LedgerEntryInline]

    fieldsets = (
        ("Transaction", {
            "fields": ("reference", "seq", "kind", "occurred_at", "description"),
        }),
        ("Rattachement metier", {
            "fields": ("source_type", "source_ref", "correlation_id", "created_by_label"),
        }),
        ("Contre-passation", {"fields": ("reverses",)}),
        ("Chaine d'integrite", {
            "fields": ("previous_hash", "entry_hash", "integrity_detail"),
            "classes": ("collapse",),
            "description": "Chaque transaction porte l'empreinte de la precedente. "
                           "Alterer une ecriture ancienne invalide toutes les suivantes.",
        }),
        ("Horodatage", {"fields": ("created_at",), "classes": ("collapse",)}),
    )

    def get_readonly_fields(self, request, obj=None):
        return [f.name for f in self.model._meta.fields] + ["integrity_detail"]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    @admin.display(description="Total")
    def total_display(self, obj):
        return _fmt(obj.total_debit())

    @admin.display(description="Equilibre")
    def balance_badge(self, obj):
        ecart = obj.imbalance()
        if ecart == 0:
            return mark_safe('<span style="color:#16A34A;font-weight:700;">equilibree</span>')
        return format_html(
            '<span style="color:#DC2626;font-weight:700;">ECART {}</span>', ecart
        )

    @admin.display(description="Integrite")
    def integrity_badge(self, obj):
        if not obj.entry_hash:
            return mark_safe('<span style="color:#D97706;">non scellee</span>')
        if obj.verify_hash():
            return mark_safe('<span style="color:#16A34A;">intacte</span>')
        return mark_safe('<span style="color:#DC2626;font-weight:700;">ALTEREE</span>')

    @admin.display(description="Integrite (detail)")
    def integrity_detail(self, obj):
        attendu = obj.compute_hash()
        if attendu == obj.entry_hash:
            return format_html(
                '<span style="color:#16A34A;">Empreinte conforme : {}</span>',
                attendu[:32],
            )
        return format_html(
            '<div style="color:#DC2626;"><b>ALTERATION DETECTEE</b><br>'
            "Attendu : {}<br>Enregistre : {}</div>",
            attendu[:32], (obj.entry_hash or "—")[:32],
        )

    @admin.display(description="Source")
    def source_display(self, obj):
        if not obj.source_type:
            return "—"
        return f"{obj.source_type}:{obj.source_ref}"

    @admin.display(description="Contre-passation")
    def reversal_badge(self, obj):
        if obj.reverses_id:
            return format_html('<span style="color:#7C3AED;">contre-passe #{}</span>',
                               obj.reverses_id)
        contre = obj.reversed_by.first()
        if contre:
            return format_html('<span style="color:#DC2626;">annulee par {}</span>',
                               contre.reference)
        return "—"

    @admin.action(description="Contre-passer les transactions selectionnees")
    def reverse_selected(self, request, queryset):
        ok = 0
        for tx in queryset:
            try:
                reverse_transaction(
                    tx,
                    reason="Contre-passation depuis l'administration.",
                    created_by_label=request.user.username,
                )
                ok += 1
            except PostingError as exc:
                self.message_user(request, f"{tx.reference} : {exc}", level=messages.ERROR)
        if ok:
            self.message_user(request, f"{ok} transaction(s) contre-passee(s).")

    actions = ["reverse_selected"]


@admin.register(LedgerEntry)
class LedgerEntryAdmin(admin.ModelAdmin):
    """Vue transversale de toutes les ecritures — utile pour un audit par compte."""

    list_display = (
        "id", "transaction_ref", "account", "direction_badge",
        "amount_display", "payee_code", "label", "created_at",
    )
    list_filter = ("direction", "account", "created_at")
    search_fields = ("transaction__reference", "payee_code", "label", "account__code")
    date_hierarchy = "created_at"
    ordering = ("-id",)
    list_per_page = 100
    list_select_related = ("transaction", "account")

    def get_readonly_fields(self, request, obj=None):
        return [f.name for f in self.model._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    @admin.display(description="Transaction", ordering="transaction__reference")
    def transaction_ref(self, obj):
        return format_html(
            '<a href="/django-admin/payments/ledgertransaction/{}/change/">{}</a>',
            obj.transaction_id, obj.transaction.reference,
        )

    @admin.display(description="Sens", ordering="direction")
    def direction_badge(self, obj):
        couleur = "#DC2626" if obj.direction == LedgerEntry.Direction.DEBIT else "#16A34A"
        return format_html('<span style="color:{};font-weight:700;">{}</span>',
                           couleur, obj.get_direction_display())

    @admin.display(description="Montant", ordering="amount_xaf")
    def amount_display(self, obj):
        return _fmt(obj.amount_xaf)