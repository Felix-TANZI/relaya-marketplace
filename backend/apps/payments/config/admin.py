# backend/apps/payments/config/admin.py
# Administration Django de la configuration financiere.
#
# CONSULTATION TOTALE : chaque version, chaque diff, chaque justification,
# chaque approbateur est consultable, filtrable et cherchable.
#
# ECRITURE VERROUILLEE : aucune version de configuration ne se modifie ni ne
# se supprime depuis l'admin. Le SEUL chemin de changement est la demande
# ConfigChangeRequest, avec justification et approbation par un tiers.
#
# Consequence voulue : un compte admin compromis ne peut pas, a lui seul,
# rediriger les frais ou ramener un delai d'escrow a zero.

from django.contrib import admin, messages
from django.utils.html import format_html
from django.utils.safestring import mark_safe

from .change_control import (
    ChangeControlError,
    approve_change,
    reject_change,
    rollback_change,
)
from .models import (
    RelayCompensationRule,
    ConfigChangeRequest,
    DistributionRule,
    EscrowPolicy,
    FeeRule,
    GovernanceLevel,
    PayoutPolicy,
    ProviderConfig,
    SettlementCycle,
    VehicleClass,
)

GOVERNANCE_COLORS = {
    GovernanceLevel.N1: "#6B7280",
    GovernanceLevel.N2: "#D97706",
    GovernanceLevel.N3: "#DC2626",
}


class ReadOnlyVersionedAdmin(admin.ModelAdmin):
    """Base : consultation complete, aucune ecriture."""

    list_per_page = 50
    ordering = ("config_key", "-version")

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    def has_view_permission(self, request, obj=None):
        return request.user.is_staff

    def get_readonly_fields(self, request, obj=None):
        return [f.name for f in self.model._meta.fields]

    @admin.display(description="Etat")
    def state_badge(self, obj):
        if obj.is_current:
            return mark_safe('<span style="color:#16A34A;font-weight:700;">● En vigueur</span>')
        if obj.is_active:
            return mark_safe('<span style="color:#D97706;font-weight:700;">● Programmee</span>')
        return mark_safe('<span style="color:#9CA3AF;">● Cloturee</span>')

    @admin.display(description="Gouvernance")
    def governance_badge(self, obj):
        niveau = self.model.GOVERNANCE_LEVEL
        return format_html(
            '<span style="color:{};font-weight:700;">{}</span>',
            GOVERNANCE_COLORS.get(niveau, "#6B7280"), niveau,
        )


@admin.register(VehicleClass)
class VehicleClassAdmin(admin.ModelAdmin):
    """Seule table de configuration directement editable : aucun impact monetaire."""
    list_display = ("code", "label", "max_weight_kg", "max_volume_l", "sort_order", "is_active")
    list_filter = ("is_active",)
    search_fields = ("code", "label")
    ordering = ("sort_order", "code")


@admin.register(ProviderConfig)
class ProviderConfigAdmin(ReadOnlyVersionedAdmin):
    list_display = (
        "config_key", "version", "provider_code", "mode",
        "is_enabled", "is_payout_enabled", "priority",
        "state_badge", "governance_badge", "valid_from",
    )
    list_filter = ("provider_code", "mode", "is_enabled", "is_payout_enabled", "is_active")
    search_fields = ("config_key", "provider_code")
    fieldsets = (
        ("Identite", {"fields": ("config_key", "version", "provider_code", "mode")}),
        ("Activation", {
            "fields": ("is_enabled", "is_payout_enabled", "priority", "supported_operators"),
            "description": "Les versements se coupent independamment des encaissements.",
        }),
        ("Bornes", {"fields": (
            "min_amount_xaf", "max_amount_xaf",
            "daily_collect_cap_xaf", "daily_payout_cap_xaf",
        )}),
        ("Comportement reseau", {"fields": (
            "collect_timeout_s", "poll_interval_s", "max_poll_duration_s",
            "retry_policy", "circuit_breaker_threshold",
        )}),
        ("Securite", {
            "fields": ("webhook_ip_allowlist",),
            "description": "Les secrets (jeton API, cle webhook) ne sont JAMAIS ici — "
                           "uniquement en variables d'environnement.",
        }),
        ("Capacites prestataire", {
            "fields": ("exposes_balance_per_operator",),
            "description": "A confirmer au Jalon A. Conditionne le plan comptable PSP.",
        }),
        ("Versionnement", {
            "fields": ("is_active", "valid_from", "valid_until", "notes",
                       "created_by", "created_at"),
            "classes": ("collapse",),
        }),
    )


@admin.register(FeeRule)
class FeeRuleAdmin(ReadOnlyVersionedAdmin):
    list_display = (
        "config_key", "version", "name", "scope", "basis",
        "value_display", "bearer", "priority", "filters_summary", "state_badge",
    )
    list_filter = ("scope", "basis", "bearer", "is_active", "filter_operator", "filter_provider")
    search_fields = ("config_key", "name")

    @admin.display(description="Valeur")
    def value_display(self, obj):
        if obj.basis == FeeRule.Basis.PERCENT:
            return f"{obj.value} %"
        if obj.basis == FeeRule.Basis.FIXED:
            return f"{int(obj.value):,} FCFA".replace(",", " ")
        return f"{len(obj.tiers or [])} palier(s)"

    @admin.display(description="Filtres")
    def filters_summary(self, obj):
        actifs = [
            f"{nom}={getattr(obj, f'filter_{nom}')}"
            for nom in ("provider", "operator", "payee_type", "category", "city")
            if getattr(obj, f"filter_{nom}")
        ]
        return ", ".join(actifs) or "— generique —"


@admin.register(DistributionRule)
class DistributionRuleAdmin(ReadOnlyVersionedAdmin):
    list_display = (
        "config_key", "version", "name", "component", "payee_type",
        "basis", "value", "priority", "state_badge",
    )
    list_filter = ("component", "payee_type", "basis", "is_active")
    search_fields = ("config_key", "name")


@admin.register(EscrowPolicy)
class EscrowPolicyAdmin(ReadOnlyVersionedAdmin):
    list_display = (
        "config_key", "version", "name", "payee_type", "component",
        "auto_confirm_hours", "release_delay_hours", "dispute_window_days",
        "priority", "state_badge",
    )
    list_filter = ("payee_type", "component", "is_active")
    search_fields = ("config_key", "name")


@admin.register(SettlementCycle)
class SettlementCycleAdmin(ReadOnlyVersionedAdmin):
    list_display = (
        "config_key", "version", "name", "frequency", "anchor_day",
        "cutoff_hours", "minimum_amount_xaf", "state_badge", "governance_badge",
    )
    list_filter = ("frequency", "is_active", "default_payee_type")
    search_fields = ("config_key", "name")


@admin.register(PayoutPolicy)
class PayoutPolicyAdmin(ReadOnlyVersionedAdmin):
    list_display = (
        "config_key", "version", "name", "payee_type",
        "required_approvals", "dual_approval_threshold_xaf",
        "momo_change_cooling_hours", "auto_execute_on_approval", "state_badge",
    )
    list_filter = ("payee_type", "auto_execute_on_approval", "require_kyc_verified", "is_active")
    search_fields = ("config_key", "name")


@admin.register(ConfigChangeRequest)
class ConfigChangeRequestAdmin(admin.ModelAdmin):
    """
    Le SEUL point d'ecriture de la configuration financiere.

    L'approbation se fait par action groupee. Le demandeur ne peut pas
    approuver sa propre demande : la contrainte est appliquee ici, dans
    change_control, ET en base par un CHECK.
    """

    list_display = (
        "reference", "target_model", "target_key", "action",
        "governance_badge", "status_badge", "requested_by",
        "approved_by", "requested_at",
    )
    list_filter = ("status", "target_model", "governance_level", "action")
    search_fields = ("reference", "target_key", "justification")
    date_hierarchy = "requested_at"
    ordering = ("-requested_at",)

    readonly_fields = (
        "reference", "diff_display", "previous_snapshot_display",
        "status", "requested_by", "requested_at",
        "approved_by", "approved_at", "applied_at", "applied_version",
        "rejection_reason", "governance_level",
    )

    fieldsets = (
        ("Demande", {
            "fields": ("reference", "target_model", "target_key", "action",
                       "governance_level", "justification"),
        }),
        ("Changement demande", {"fields": ("payload", "diff_display")}),
        ("Etat precedent", {
            "fields": ("previous_snapshot_display",),
            "classes": ("collapse",),
            "description": "Permet le retour arriere.",
        }),
        ("Circuit de validation", {
            "fields": ("status", "requested_by", "requested_at",
                       "approved_by", "approved_at", "rejection_reason"),
        }),
        ("Application", {"fields": ("effective_at", "applied_at", "applied_version")}),
    )

    @admin.display(description="Gouvernance")
    def governance_badge(self, obj):
        return format_html(
            '<span style="color:{};font-weight:700;">{}</span>',
            GOVERNANCE_COLORS.get(obj.governance_level, "#6B7280"),
            obj.governance_level,
        )

    @admin.display(description="Statut")
    def status_badge(self, obj):
        couleurs = {
            "PENDING": "#D97706", "APPROVED": "#2563EB", "APPLIED": "#16A34A",
            "REJECTED": "#DC2626", "ROLLED_BACK": "#6B7280",
        }
        return format_html(
            '<span style="color:{};font-weight:700;">● {}</span>',
            couleurs.get(obj.status, "#6B7280"), obj.get_status_display(),
        )

    @admin.display(description="Differences")
    def diff_display(self, obj):
        if not obj.diff:
            return "—"
        lignes = "".join(
            format_html(
                "<tr><td style='padding:4px 12px;'><b>{}</b></td>"
                "<td style='padding:4px 12px;color:#DC2626;'>{}</td>"
                "<td style='padding:4px 12px;color:#16A34A;'>{}</td></tr>",
                champ, str(valeurs.get("avant")), str(valeurs.get("apres")),
            )
            for champ, valeurs in obj.diff.items()
        )
        return format_html(
            "<table style='border-collapse:collapse;'>"
            "<tr><th style='text-align:left;padding:4px 12px;'>Champ</th>"
            "<th style='text-align:left;padding:4px 12px;'>Avant</th>"
            "<th style='text-align:left;padding:4px 12px;'>Apres</th></tr>{}</table>",
            lignes,
        )

    @admin.display(description="Etat precedent")
    def previous_snapshot_display(self, obj):
        if not obj.previous_snapshot:
            return "— creation initiale —"
        lignes = "".join(
            format_html("<tr><td style='padding:2px 12px;'><b>{}</b></td>"
                        "<td style='padding:2px 12px;'>{}</td></tr>", cle, str(valeur))
            for cle, valeur in obj.previous_snapshot.items()
        )
        return format_html("<table style='border-collapse:collapse;'>{}</table>", lignes)

    def has_delete_permission(self, request, obj=None):
        return False

    def get_readonly_fields(self, request, obj=None):
        if obj and obj.status != ConfigChangeRequest.Status.PENDING:
            return [f.name for f in self.model._meta.fields] + [
                "diff_display", "previous_snapshot_display"
            ]
        return self.readonly_fields

    # ── Actions ──────────────────────────────────────────────────────────────

    @admin.action(description="Approuver et appliquer")
    def approve_selected(self, request, queryset):
        ok = 0
        for demande in queryset.filter(status=ConfigChangeRequest.Status.PENDING):
            try:
                approve_change(demande, request.user, apply_now=True)
                ok += 1
            except ChangeControlError as exc:
                self.message_user(
                    request, f"{demande.reference} : {exc}", level=messages.ERROR
                )
        if ok:
            self.message_user(request, f"{ok} demande(s) approuvee(s) et appliquee(s).")

    @admin.action(description="Rejeter (motif requis dans la justification)")
    def reject_selected(self, request, queryset):
        ok = 0
        for demande in queryset.filter(status=ConfigChangeRequest.Status.PENDING):
            try:
                reject_change(demande, request.user, "Rejetee depuis l'administration.")
                ok += 1
            except ChangeControlError as exc:
                self.message_user(
                    request, f"{demande.reference} : {exc}", level=messages.ERROR
                )
        if ok:
            self.message_user(request, f"{ok} demande(s) rejetee(s).")

    @admin.action(description="Annuler (retour a l'etat precedent)")
    def rollback_selected(self, request, queryset):
        ok = 0
        for demande in queryset.filter(status=ConfigChangeRequest.Status.APPLIED):
            try:
                rollback_change(demande, request.user, "Annulation depuis l'administration.")
                ok += 1
            except ChangeControlError as exc:
                self.message_user(
                    request, f"{demande.reference} : {exc}", level=messages.ERROR
                )
        if ok:
            self.message_user(request, f"{ok} changement(s) annule(s).")

    actions = ["approve_selected", "reject_selected", "rollback_selected"]

    def save_model(self, request, obj, form, change):
        if not change:
            obj.requested_by = request.user
            from .change_control import resolve_model
            try:
                obj.governance_level = resolve_model(obj.target_model).GOVERNANCE_LEVEL
            except ChangeControlError:
                pass
        super().save_model(request, obj, form, change)


@admin.register(RelayCompensationRule)
class RelayCompensationRuleAdmin(ReadOnlyVersionedAdmin):
    """
    Remuneration contractuelle des points relais.

    C'est ICI que se gere le montant negocie avec chaque point relais. Une
    regle nominative prime sur la regle par defaut.
    """

    list_display = ("config_key", "version", "cible", "categorie", "montant",
                    "contract_reference", "priority", "statut")
    list_filter = ("is_active", "basis", "parcel_size", "is_accepted")
    search_fields = ("config_key", "name", "payee_code",
                     "contract_reference")
    ordering = ("payee_code", "parcel_size", "-priority", "-version")

    fieldsets = (
        ("Regle", {
            "fields": ("config_key", "version", "name", "priority"),
        }),
        ("Point relais", {
            "fields": ("payee_code", "contract_reference"),
            "description": (
                "Laisser le code VIDE pour definir le tarif par defaut. "
                "Une regle nominative prime toujours sur le defaut."
            ),
        }),
        ("Categorie de colis", {
            "fields": ("parcel_size", "is_accepted"),
            "description": (
                "Laisser VIDE pour appliquer a toutes les categories. "
                "La regle la plus PRECISE gagne : relais + categorie, puis "
                "relais seul, puis categorie seule, puis le filet general.<br>"
                "Decocher « acceptee » si ce relais REFUSE cette categorie — "
                "un local exigu ne prend pas d'encombrant."
            ),
        }),
        ("Montant", {
            "fields": ("basis", "amount_xaf"),
            "description": (
                "Le point relais n'est PAS paye par l'acheteur : ce montant "
                "est une charge de BelivaY, issue du contrat. Il rejoint le "
                "cycle de reglement par un ajustement automatique a chaque "
                "colis remis."
            ),
        }),
        ("Cycle de vie", {
            "fields": ("is_active",),
            "classes": ("collapse",),
        }),
    )

    @admin.display(description="Point relais", ordering="payee_code")
    def cible(self, obj):
        if not obj.payee_code:
            return mark_safe(
                '<span style="color:#6B7280;">tarif par defaut</span>')
        return format_html("<b>{}</b>", obj.payee_code)

    @admin.display(description="Montant", ordering="amount_xaf")
    def montant(self, obj):
        montant = f"{obj.amount_xaf:,}".replace(",", " ")
        return format_html(
            '<b style="color:#16A34A;">{} FCFA</b> <small>par colis</small>',
            montant)

    @admin.display(description="Statut", ordering="is_active")
    def statut(self, obj):
        if obj.is_active:
            return mark_safe(
                '<span style="color:#16A34A;font-weight:700;">en vigueur</span>')
        return mark_safe('<span style="color:#6B7280;">archivee</span>')


    @admin.display(description="Categorie", ordering="parcel_size")
    def categorie(self, obj):
        libelle = obj.get_parcel_size_display() if obj.parcel_size else None
        if not obj.is_accepted:
            return format_html(
                '<span style="color:#DC2626;font-weight:700;">{} — REFUSE</span>',
                libelle or "toutes",
            )
        if libelle is None:
            return mark_safe(
                '<span style="color:#6B7280;">toutes categories</span>')
        return format_html("<b>{}</b>", libelle)