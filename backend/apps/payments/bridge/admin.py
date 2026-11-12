# DEV-SRV-01 v1.8, C04 : une fraude se CONFIRME ici, par un opérateur (Finance ou Direction) — jamais sur un simple
# signalement. Pendant la période qui suit, le vendeur est versé à r_fraude_delai_j jours et chaque versement attend un
# opérateur (bridge.versement_vendeur). Une fraude confirmée ne se modifie ni ne se supprime.
from django.contrib import admin
from django.core.exceptions import PermissionDenied

from .models import FraudeConfirmee, RepereVersementVendeur


@admin.register(FraudeConfirmee)
class FraudeConfirmeeAdmin(admin.ModelAdmin):
    list_display = ("vendeur", "commande_id", "confirmee_par", "confirmee_le")
    search_fields = ("vendeur__username", "vendeur__email", "motif")
    readonly_fields = ("confirmee_par", "confirmee_le")
    raw_id_fields = ("vendeur",)

    def _operateur(self, request) -> bool:
        from apps.payments.settlements import dp42

        return bool(dp42.roles_de(request.user)) or request.user.is_superuser

    def has_add_permission(self, request):
        return self._operateur(request)

    def has_change_permission(self, request, obj=None):
        return obj is None and self._operateur(request)  # liste visible, fiche jamais modifiée

    def has_delete_permission(self, request, obj=None):
        return False

    def save_model(self, request, obj, form, change):
        if change or not self._operateur(request):
            raise PermissionDenied("Une fraude confirmée ne se modifie pas.")
        obj.confirmee_par = request.user
        super().save_model(request, obj, form, change)


@admin.register(RepereVersementVendeur)
class RepereVersementVendeurAdmin(admin.ModelAdmin):
    list_display = ("vendeur", "score", "le")
    readonly_fields = ("vendeur", "score", "le")

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
