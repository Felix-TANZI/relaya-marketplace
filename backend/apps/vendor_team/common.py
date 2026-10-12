# backend/apps/vendor_team/common.py
# Petites briques partagées par les vues : récupérer le VendorProfile actif de request.user, même patron
# que apps/vendors/views.py (VendorProfile.objects.get(user=request.user) + 404/403).

from rest_framework.exceptions import NotFound, PermissionDenied

from apps.vendors.models import VendorProfile


def vendeur_actif(request) -> VendorProfile:
    """VendorProfile de request.user ; 404 sans profil, 403 si pas APPROVED (même règle que le reste de
    apps.vendors : is_active_vendor)."""
    try:
        profile = VendorProfile.objects.get(user=request.user)
    except VendorProfile.DoesNotExist:
        raise NotFound("Profil vendeur introuvable.")
    if not profile.is_active_vendor:
        raise PermissionDenied("Boutique non approuvée.")
    return profile


def vendeur_ou_404(request) -> VendorProfile:
    """Variante sans le contrôle is_active_vendor : utile pendant l'ouverture (KYC, contrat), avant
    l'approbation."""
    try:
        return VendorProfile.objects.get(user=request.user)
    except VendorProfile.DoesNotExist:
        raise NotFound("Profil vendeur introuvable.")


def client_ip(request):
    xff = request.META.get("HTTP_X_FORWARDED_FOR")
    if xff:
        return xff.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")
