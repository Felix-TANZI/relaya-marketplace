# backend/apps/vendor_team/views_compte.py
# Domaine « compte » : périmètre confié à cet agent (INTEGRATION-API.md) — POST /me/email, POST /me/phone,
# POST/DELETE /account/closure. GET /account/status N'EST PAS construit ici : c'est la route du domaine
# « trust » (Score, Suspension — cf. compte.ts : « account/status » est la route du domaine trust),
# propriété d'un autre agent.
#
# Réutilise apps.otp (ÉTAPE 1 du mandat) : son catalogue d'« objet » couvre déjà exactement ce besoin
# (EMAIL_SMS/EMAIL_ADRESSE pour le changement d'e-mail à deux codes, NUMERO_ANCIEN/NUMERO_NOUVEAU pour le
# changement de numéro, SUPPRESSION pour la clôture, PROFIL pour un code générique) : pas de nouveau
# modèle de code pour ce domaine.

from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.client_core.erreurs import ErreurClient
from apps.client_core.masquage import masquer_numero
from apps.otp import services as otp_services
from apps.otp.models import CodeOtp

from .common import vendeur_ou_404
from .models import VendorAccountClosure

TAG = ["Vendors"]

Objet = CodeOtp.Objet

MOTIF_VERS_OBJET = {
    "profil": Objet.PROFIL,
    "email": Objet.EMAIL_SMS,
    "telephone": Objet.NUMERO_ANCIEN,
    "mot_de_passe": Objet.PROFIL,  # CodeOtp n'a pas d'objet dédié "mot de passe" : réutilisation documentée
    "export": Objet.PROFIL,
    "cloture": Objet.SUPPRESSION,
    "appareil": Objet.PROFIL,
}

CACHE_TTL_SECONDES = 20 * 60  # large marge au-dessus des deux fenêtres OTP-DUREE (10 min) consécutives


def _cache_key(kind: str, vendor_id: int) -> str:
    return f"vendor_team:{kind}:{vendor_id}"


def _envoyer(objet: str, destination: str, user, canal: str = "sms"):
    """Enveloppe apps.otp.services.envoyer : renvoie None sur 429 (trop_tot / trop_d_envois) pour que
    l'appelant rende un Resultat { ok:false, raison:'trop_tot' } au lieu de laisser filer une erreur HTTP."""
    try:
        return otp_services.envoyer(objet=objet, destination=destination, utilisateur=user, canal=canal)
    except ErreurClient as e:
        if e.code in ("trop_tot", "trop_d_envois"):
            return None
        raise


# ── POST /me/codes {motif} — code générique au téléphone personnel (compte.demanderCode) ──────────────────


@extend_schema(tags=TAG, summary="Account — request a generic security code")
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def me_codes(request):
    vendor = vendeur_ou_404(request)
    motif = str(request.data.get("motif") or "").strip()
    objet = MOTIF_VERS_OBJET.get(motif)
    if objet is None:
        return Response({"detail": "Motif inconnu."}, status=400)
    phone = (vendor.phone or "").strip()
    if not phone:
        return Response({"detail": "Numéro personnel introuvable."}, status=400)

    envoi = _envoyer(objet, phone, request.user)
    if envoi is None:
        return Response({"ok": False, "raison": "trop_tot"})
    return Response({"ok": True, "masque": envoi["destination"], "renvoiSecondes": envoi["renvoiSecondes"]})


# ── E-mail (deux codes : SMS au téléphone personnel + code à la nouvelle adresse) ─────────────────────────


@extend_schema(tags=TAG, summary="Account — request an e-mail change code")
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def me_email_code(request):
    vendor = vendeur_ou_404(request)
    email = str(request.data.get("email") or "").strip().lower()
    if not email or "@" not in email:
        return Response({"ok": False, "raison": "email"})
    if email == (request.user.email or "").lower():
        return Response({"ok": False, "raison": "meme"})
    User = get_user_model()
    if User.objects.filter(email__iexact=email).exclude(pk=request.user.pk).exists():
        return Response({"ok": False, "raison": "pris"})

    envoi = _envoyer(Objet.EMAIL_ADRESSE, email, request.user, canal="email")
    if envoi is None:
        return Response({"ok": False, "raison": "email"})
    cache.set(_cache_key("email_change", vendor.id), email, CACHE_TTL_SECONDES)
    return Response({"ok": True})


@extend_schema(tags=TAG, summary="Account — confirm an e-mail change (two codes)")
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def me_email_confirm(request):
    vendor = vendeur_ou_404(request)
    code_sms = str(request.data.get("codeSms") or "").strip()
    code_email = str(request.data.get("codeEmail") or "").strip()

    phone = (vendor.phone or "").strip()
    nouvel_email = cache.get(_cache_key("email_change", vendor.id))
    if not phone or not nouvel_email:
        return Response({"ok": False, "raison": "code"})

    r_sms = otp_services.verifier(objet=Objet.EMAIL_SMS, code=code_sms, destination=phone, utilisateur=request.user)
    r_email = otp_services.verifier(objet=Objet.EMAIL_ADRESSE, code=code_email, destination=nouvel_email, utilisateur=request.user)
    if not (r_sms.get("ok") and r_email.get("ok")):
        return Response({"ok": False, "raison": "code"})

    request.user.email = nouvel_email
    request.user.save(update_fields=["email"])
    cache.delete(_cache_key("email_change", vendor.id))
    return Response({"ok": True, "profil": {"email": nouvel_email}})


# ── Numéro personnel (deux codes : ancien puis nouveau) ────────────────────────────────────────────────────


@extend_schema(tags=TAG, summary="Account — request a phone change code")
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def me_phone_codes(request):
    vendor = vendeur_ou_404(request)
    numero = str(request.data.get("numero") or "").strip()
    if not numero or not numero.isdigit() or len(numero) != 9 or numero[0] != "6":
        return Response({"ok": False, "raison": "prefixe"})
    if numero == (vendor.phone or "").strip()[-9:]:
        return Response({"ok": False, "raison": "meme"})
    from apps.vendors.models import VendorProfile

    if VendorProfile.objects.filter(phone__endswith=numero).exclude(pk=vendor.pk).exists():
        return Response({"ok": False, "raison": "pris"})

    ancien = (vendor.phone or "").strip()
    if ancien:
        if _envoyer(Objet.NUMERO_ANCIEN, ancien, request.user) is None:
            return Response({"ok": False, "raison": "prefixe"})
    if _envoyer(Objet.NUMERO_NOUVEAU, numero, request.user) is None:
        return Response({"ok": False, "raison": "prefixe"})

    cache.set(_cache_key("phone_change", vendor.id), numero, CACHE_TTL_SECONDES)
    return Response({"ok": True})


@extend_schema(tags=TAG, summary="Account — confirm a phone change (two codes)")
@api_view(["PUT"])
@permission_classes([IsAuthenticated])
def me_phone_confirm(request):
    vendor = vendeur_ou_404(request)
    code_ancien = str(request.data.get("codeAncien") or "").strip()
    code_nouveau = str(request.data.get("codeNouveau") or "").strip()

    nouveau_numero = cache.get(_cache_key("phone_change", vendor.id))
    ancien = (vendor.phone or "").strip()
    if not nouveau_numero:
        return Response({"ok": False, "raison": "code"})

    if ancien:
        r_ancien = otp_services.verifier(objet=Objet.NUMERO_ANCIEN, code=code_ancien, destination=ancien, utilisateur=request.user)
        if not r_ancien.get("ok"):
            return Response({"ok": False, "raison": "code"})
    r_nouveau = otp_services.verifier(objet=Objet.NUMERO_NOUVEAU, code=code_nouveau, destination=nouveau_numero, utilisateur=request.user)
    if not r_nouveau.get("ok"):
        return Response({"ok": False, "raison": "code"})

    vendor.phone = nouveau_numero
    vendor.save(update_fields=["phone"])
    cache.delete(_cache_key("phone_change", vendor.id))
    return Response({"ok": True, "profil": {"telephone": nouveau_numero}})


# ── Clôture de compte (préavis, Q-23) ──────────────────────────────────────────────────────────────────────


@extend_schema(tags=TAG, summary="Account — request closure, or cancel a pending one")
@api_view(["POST", "DELETE"])
@permission_classes([IsAuthenticated])
def account_closure(request):
    vendor = vendeur_ou_404(request)
    if request.method == "DELETE":
        return _account_closure_cancel(request, vendor)

    if hasattr(vendor, "closure_request") and vendor.closure_request.cancelled_at is None:
        return Response({"ok": False, "raison": "deja"})

    code = str(request.data.get("code") or "").strip()
    phone = (vendor.phone or "").strip()
    r = otp_services.verifier(objet=Objet.SUPPRESSION, code=code, destination=phone, utilisateur=request.user)
    if not r.get("ok"):
        return Response({"ok": False, "raison": "code"})

    effective_at = timezone.now() + timedelta(days=VendorAccountClosure.PREAVIS_JOURS_DEFAUT)
    closure, _created = VendorAccountClosure.objects.update_or_create(
        vendor=vendor,
        defaults={
            "motif": str(request.data.get("motif") or "")[:2000],
            "effective_at": effective_at,
            "cancelled_at": None,
        },
    )
    return Response({"ok": True, "le": int(closure.effective_at.timestamp() * 1000), "aSolder": []})


def _account_closure_cancel(request, vendor):
    closure = getattr(vendor, "closure_request", None)
    if closure is not None and closure.cancelled_at is None:
        closure.cancelled_at = timezone.now()
        closure.save(update_fields=["cancelled_at"])

    return Response({
        "faceId": False,
        "telephoneMasque": masquer_numero(vendor.phone) if vendor.phone else "",
        "exportDemandeLe": None,
        "exportPretLe": None,
        "clotureDemandeeLe": int(closure.requested_at.timestamp() * 1000) if closure else None,
        "clotureLe": None,
        "aSolder": [],
    })
