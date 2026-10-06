# backend/apps/otp/admin.py
# Lecture seule : ni le code ni le jeton ne sont gardés en clair (empreintes).
from django.contrib import admin

from .models import CodeOtp, JetonMdp


class LectureSeule(admin.ModelAdmin):
    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False


@admin.register(CodeOtp)
class CodeOtpAdmin(LectureSeule):
    list_display = ("objet", "canal", "destination_masquee", "utilisateur", "essais", "expire_le", "utilise_le", "cree_le")
    list_filter = ("objet", "canal")
    exclude = ("code_empreinte", "destination_empreinte")


@admin.register(JetonMdp)
class JetonMdpAdmin(LectureSeule):
    list_display = ("utilisateur", "expire_le", "utilise_le", "cree_le")
    exclude = ("jeton_empreinte",)
