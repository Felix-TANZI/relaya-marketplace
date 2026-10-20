# backend/apps/vendor_team/admin.py
from django.contrib import admin

from .models import (
    VendorAccountClosure,
    VendorAssistedEntry,
    VendorChangeRequest,
    VendorContractSignature,
    VendorEmployee,
    VendorEmployeeActionLog,
    VendorEmployeeInvitation,
    VendorKycPiece,
    VendorLocationMeta,
    VendorLocationVerification,
    VendorOwnerSecurityCode,
    VendorShopMeta,
    VendorVerificationCode,
)


@admin.register(VendorEmployee)
class VendorEmployeeAdmin(admin.ModelAdmin):
    list_display = ("id", "vendor", "first_name", "last_name", "role", "is_active", "is_suspended", "created_at")
    list_filter = ("role", "is_active", "is_suspended")
    search_fields = ("first_name", "last_name", "phone", "vendor__business_name")


@admin.register(VendorEmployeeInvitation)
class VendorEmployeeInvitationAdmin(admin.ModelAdmin):
    list_display = ("id", "vendor", "employee", "status", "expires_at", "created_at")
    list_filter = ("status",)


@admin.register(VendorEmployeeActionLog)
class VendorEmployeeActionLogAdmin(admin.ModelAdmin):
    list_display = ("id", "vendor", "employee", "domaine", "categorie", "texte", "created_at")
    list_filter = ("domaine", "categorie")


@admin.register(VendorOwnerSecurityCode)
class VendorOwnerSecurityCodeAdmin(admin.ModelAdmin):
    list_display = ("id", "vendor", "motif", "target_employee", "used_at", "expires_at", "created_at")
    list_filter = ("motif",)


@admin.register(VendorLocationMeta)
class VendorLocationMetaAdmin(admin.ModelAdmin):
    list_display = ("id", "location", "type_lieu")


@admin.register(VendorLocationVerification)
class VendorLocationVerificationAdmin(admin.ModelAdmin):
    list_display = ("id", "location", "metres", "created_at")


@admin.register(VendorChangeRequest)
class VendorChangeRequestAdmin(admin.ModelAdmin):
    list_display = ("id", "vendor", "champ", "status", "created_at", "decided_at")
    list_filter = ("champ", "status")


@admin.register(VendorAccountClosure)
class VendorAccountClosureAdmin(admin.ModelAdmin):
    list_display = ("id", "vendor", "requested_at", "effective_at", "cancelled_at")


@admin.register(VendorAssistedEntry)
class VendorAssistedEntryAdmin(admin.ModelAdmin):
    list_display = ("id", "vendor", "titre", "statut", "created_at")
    list_filter = ("statut",)


@admin.register(VendorShopMeta)
class VendorShopMetaAdmin(admin.ModelAdmin):
    list_display = ("id", "vendor", "categorie", "statut")


@admin.register(VendorKycPiece)
class VendorKycPieceAdmin(admin.ModelAdmin):
    list_display = ("id", "vendor", "piece", "etat", "created_at")
    list_filter = ("piece", "etat")


@admin.register(VendorContractSignature)
class VendorContractSignatureAdmin(admin.ModelAdmin):
    list_display = ("id", "vendor", "version", "immatricule", "signed_at")


@admin.register(VendorVerificationCode)
class VendorVerificationCodeAdmin(admin.ModelAdmin):
    list_display = ("id", "phone", "purpose", "used_at", "expires_at", "created_at")
    list_filter = ("purpose",)
