# backend/apps/vendor_team/views_equipe.py
# Domaine « équipe » (INTEGRATION-API.md §8, propriétaire seulement) : droits par employé, invitation avec
# code SMS au propriétaire, suspension sans code (coupe tout de suite), retrait et changement de droits
# avec code, journal des actions signées.
#
# VD-EQUIPE-MAX : voir models.VendorEmployee — valeur par défaut (5), À CONFIRMER par le CEO/porteur.

from datetime import timedelta

from django.db import transaction
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.vendors.models import VendorProfile

from . import services
from .models import (
    DROITS_ASSIGNABLES,
    VendorEmployee,
    VendorEmployeeActionLog,
    VendorEmployeeInvitation,
    VendorOwnerSecurityCode,
)

TAG = ["Vendors"]

# Rôle « Préparation » par défaut quand l'invitation ne précise pas de droits (equipe.ts : « rôle
# Préparation par défaut »).
PRESET_PREPARATION = ["commandes.voir", "commandes.preparer", "commandes.remettre"]

RENVOI_SECONDES_INVITATION = 60


def _owner_only():
    return Response({"detail": "Réservé au propriétaire de la boutique.", "code": "owner_only"}, status=403)


def _vendor_for_team(request):
    """VendorProfile si request.user EST le propriétaire ; None sinon (appelant employé ou inconnu)."""
    try:
        return VendorProfile.objects.get(user=request.user)
    except VendorProfile.DoesNotExist:
        return None


def _ms(dt) -> int | None:
    return int(dt.timestamp() * 1000) if dt else None


def _membre_payload(m: VendorEmployee) -> dict:
    invitation = getattr(m, "invitation", None)
    derniere = m.action_logs.order_by("-created_at").first() if m.pk else None
    initiales = ((m.first_name[:1] or "") + (m.last_name[:1] or "")).upper() or (m.first_name[:2] or "").upper()
    return {
        "id": str(m.id),
        "prenom": m.first_name,
        "nom": m.last_name,
        "initiales": initiales,
        "telephone": services.masquer_numero(m.phone),
        "role": "proprietaire" if m.role == VendorEmployee.Role.OWNER else "preparation",
        "profil": None if m.role == VendorEmployee.Role.OWNER else "personnalise",
        "droits": m.droits,
        "depuis": _ms(m.created_at),
        "etat": m.etat,
        "inviteJusqua": _ms(invitation.expires_at) if (invitation and invitation.est_valide) else None,
        "suspenduLe": _ms(m.suspended_at),
        "derniereAction": {"texte": derniere.texte, "a": _ms(derniere.created_at)} if derniere else None,
    }


def _equipe_payload(vendor: VendorProfile) -> dict:
    membres = list(
        VendorEmployee.objects.filter(vendor=vendor).select_related("invitation").order_by("-role", "created_at")
    )
    historique_logs = VendorEmployeeActionLog.objects.filter(
        vendor=vendor, domaine="equipe",
    ).order_by("-created_at")[:50]
    historique = [
        {
            "a": _ms(l.created_at),
            "action": l.categorie or "ajout",
            "par": "vous",
            "membre": l.employee_label or (l.employee.first_name if l.employee else ""),
            "detail": l.texte,
        }
        for l in historique_logs
    ]
    return {
        "membres": [_membre_payload(m) for m in membres],
        "maxEmployes": VendorEmployee.MAX_ACTIFS_PAR_BOUTIQUE,
        "employes": sum(1 for m in membres if m.role == VendorEmployee.Role.EMPLOYEE),
        "historique": historique,
    }


def _revoke_user_sessions(user) -> None:
    """Coupe toutes les sessions actives d'un compte (suspension, retrait : EQU-04). Même mécanique que
    apps.accounts.views.revoke_all_sessions, réutilisée ici sans la dupliquer dans une autre app."""
    if user is None:
        return
    from apps.accounts.models import UserSession
    from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken

    sessions = UserSession.objects.filter(user=user, is_active=True)
    for session in sessions:
        try:
            outstanding = OutstandingToken.objects.filter(jti=session.jti).first()
            if outstanding:
                BlacklistedToken.objects.get_or_create(token=outstanding)
        except Exception:
            pass
    sessions.update(is_active=False)


def _envoyer_code_proprietaire(vendor: VendorProfile, motif: str, target_employee=None) -> VendorOwnerSecurityCode:
    code = services.generer_code(VendorOwnerSecurityCode.LONGUEUR)
    enregistrement = VendorOwnerSecurityCode(
        vendor=vendor,
        motif=motif,
        target_employee=target_employee,
        expires_at=timezone.now() + timedelta(minutes=VendorOwnerSecurityCode.VALIDE_MINUTES),
    )
    enregistrement.set_code(code)
    enregistrement.save()
    phone = (vendor.phone or "").strip()
    if phone:
        services.envoyer_code_sms(phone, code, VendorOwnerSecurityCode.VALIDE_MINUTES)
    return enregistrement


def _dernier_code_valide(vendor, motif, target_employee, code: str) -> bool:
    qs = VendorOwnerSecurityCode.objects.filter(
        vendor=vendor, motif=motif, target_employee=target_employee, used_at__isnull=True,
    ).order_by("-created_at")
    enregistrement = qs.first()
    if enregistrement is None:
        return False
    return enregistrement.check_code(code)


# ── GET/POST /shop/members ──────────────────────────────────────────────────────────────────────────────


@extend_schema(tags=TAG, summary="Team — list members, or invite one")
@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def shop_members(request):
    vendor = _vendor_for_team(request)
    if vendor is None:
        return _owner_only()
    if request.method == "GET":
        return Response(_equipe_payload(vendor))
    return _shop_members_invite(request, vendor)


def _shop_members_invite(request, vendor):
    prenom_nom = str(request.data.get("prenomNom") or "").strip()
    telephone = str(request.data.get("telephone") or "").strip()
    droits = request.data.get("droits")

    if not prenom_nom:
        return Response({"ok": False, "raison": "nom"})
    if not telephone or len(telephone) < 8:
        return Response({"ok": False, "raison": "telephone"})
    if VendorEmployee.objects.filter(vendor=vendor, phone=telephone, is_active=True).exists():
        return Response({"ok": False, "raison": "deja"})
    if droits is not None and (not isinstance(droits, list) or not all(isinstance(d, str) for d in droits)):
        return Response({"ok": False, "raison": "droits"})

    if VendorEmployee.objects.filter(vendor=vendor, role=VendorEmployee.Role.EMPLOYEE).count() >= VendorEmployee.MAX_ACTIFS_PAR_BOUTIQUE:
        return Response({"ok": False, "raison": "plein"})

    parts = prenom_nom.split(None, 1)
    first_name, last_name = parts[0], (parts[1] if len(parts) > 1 else "")
    droits_initiaux = [d for d in (droits or PRESET_PREPARATION) if d in DROITS_ASSIGNABLES]

    with transaction.atomic():
        membre = VendorEmployee.objects.create(
            vendor=vendor, first_name=first_name[:80], last_name=last_name[:80], phone=telephone[:20],
            role=VendorEmployee.Role.EMPLOYEE, droits=droits_initiaux,
        )
        invitation = VendorEmployeeInvitation.objects.create(
            vendor=vendor, employee=membre, token=VendorEmployeeInvitation.nouveau_jeton(),
            expires_at=timezone.now() + timedelta(days=VendorEmployeeInvitation.JOURS_VALIDITE),
        )
        _envoyer_code_proprietaire(vendor, VendorOwnerSecurityCode.Motif.INVITATION, membre)
        VendorEmployeeActionLog.consigner(
            vendor=vendor, employee=membre, domaine="equipe", texte=f"Invitation envoyée à {prenom_nom}",
            categorie="ajout",
        )

    return Response({"ok": True, "invitation": str(invitation.id), "masque": services.masquer_numero(vendor.phone)})


@extend_schema(tags=TAG, summary="Team — confirm an invitation (owner's SMS code)")
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def shop_members_invitation_confirm(request, invitation_id):
    vendor = _vendor_for_team(request)
    if vendor is None:
        return _owner_only()

    invitation = VendorEmployeeInvitation.objects.select_related("employee").filter(
        id=invitation_id, vendor=vendor,
    ).first()
    if invitation is None:
        return Response({"ok": False, "raison": "expire"})
    if invitation.status != VendorEmployeeInvitation.Status.PENDING or invitation.expires_at <= timezone.now():
        invitation.status = VendorEmployeeInvitation.Status.EXPIRED
        invitation.save(update_fields=["status"])
        return Response({"ok": False, "raison": "expire"})

    code = str(request.data.get("code") or "").strip()
    if not _dernier_code_valide(vendor, VendorOwnerSecurityCode.Motif.INVITATION, invitation.employee, code):
        return Response({"ok": False, "raison": "code"})

    membre = invitation.employee
    with transaction.atomic():
        if membre.user_id is None:
            from django.contrib.auth import get_user_model

            User = get_user_model()
            username = f"vendeur-{membre.vendor_id}-{membre.id}"
            n = 1
            base = username
            while User.objects.filter(username=username).exists():
                n += 1
                username = f"{base}-{n}"
            user = User.objects.create(username=username, first_name=membre.first_name, last_name=membre.last_name)
            user.set_unusable_password()
            user.save()
            membre.user = user
            membre.save(update_fields=["user"])
            # SMS d'installation : invite le membre à choisir son mot de passe (lien générique ; le flux
            # d'ouverture de ce lien n'est pas construit par cet agent — voir le rapport final).
            services.envoyer_code_sms(
                membre.phone,
                "BelivaY : vous avez été ajouté à l'équipe d'une boutique. Ouvrez l'application pour choisir "
                "votre mot de passe.",
                0,
            ) if membre.phone else None
        invitation.status = VendorEmployeeInvitation.Status.ACCEPTED
        invitation.accepted_at = timezone.now()
        invitation.save(update_fields=["status", "accepted_at"])
        VendorEmployeeActionLog.consigner(
            vendor=vendor, employee=membre, domaine="equipe", texte="Invitation acceptée", categorie="ajout",
        )

    return Response({"ok": True, "membre": _membre_payload(membre)})


@extend_schema(tags=TAG, summary="Team — resend an invitation")
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def shop_member_resend(request, member_id):
    vendor = _vendor_for_team(request)
    if vendor is None:
        return _owner_only()

    membre = VendorEmployee.objects.filter(id=member_id, vendor=vendor).select_related("invitation").first()
    if membre is None or not hasattr(membre, "invitation"):
        return Response({"detail": "Invitation introuvable."}, status=404)
    invitation = membre.invitation

    if invitation.last_resent_at and invitation.last_resent_at > timezone.now() - timedelta(seconds=RENVOI_SECONDES_INVITATION):
        return Response({"ok": False, "raison": "trop_tot"})

    with transaction.atomic():
        invitation.expires_at = timezone.now() + timedelta(days=VendorEmployeeInvitation.JOURS_VALIDITE)
        invitation.last_resent_at = timezone.now()
        invitation.status = VendorEmployeeInvitation.Status.PENDING
        invitation.save(update_fields=["expires_at", "last_resent_at", "status"])
        _envoyer_code_proprietaire(vendor, VendorOwnerSecurityCode.Motif.INVITATION, membre)

    return Response({"ok": True, "jusqua": _ms(invitation.expires_at)})


@extend_schema(tags=TAG, summary="Team — cancel a pending invitation")
@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def shop_member_invitation_cancel(request, invitation_id):
    vendor = _vendor_for_team(request)
    if vendor is None:
        return _owner_only()

    invitation = VendorEmployeeInvitation.objects.select_related("employee").filter(
        id=invitation_id, vendor=vendor, status=VendorEmployeeInvitation.Status.PENDING,
    ).first()
    if invitation is None:
        return Response({"ok": False, "raison": "introuvable"})

    with transaction.atomic():
        invitation.status = VendorEmployeeInvitation.Status.REVOKED
        invitation.save(update_fields=["status"])
        VendorEmployeeActionLog.consigner(
            vendor=vendor, employee=invitation.employee, domaine="equipe",
            texte=f"Invitation annulée pour {invitation.employee.first_name}", categorie="annulation",
        )
        invitation.employee.delete()

    return Response({"ok": True, "equipe": _equipe_payload(vendor)})


@extend_schema(tags=TAG, summary="Team — request a removal code")
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def shop_member_removal_code(request, member_id):
    vendor = _vendor_for_team(request)
    if vendor is None:
        return _owner_only()
    membre = VendorEmployee.objects.filter(id=member_id, vendor=vendor).first()
    if membre is None:
        return Response({"detail": "Membre introuvable."}, status=404)
    _envoyer_code_proprietaire(vendor, VendorOwnerSecurityCode.Motif.RETRAIT, membre)
    return Response({"masque": services.masquer_numero(vendor.phone)})


@extend_schema(tags=TAG, summary="Team — request a security code (rights/reactivation)")
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def shop_member_code(request, member_id):
    vendor = _vendor_for_team(request)
    if vendor is None:
        return _owner_only()
    membre = VendorEmployee.objects.filter(id=member_id, vendor=vendor).first()
    if membre is None:
        return Response({"detail": "Membre introuvable."}, status=404)

    motif = str(request.data.get("motif") or "").strip()
    mapping = {
        "retrait": VendorOwnerSecurityCode.Motif.RETRAIT,
        "droits": VendorOwnerSecurityCode.Motif.DROITS,
        "reactivation": VendorOwnerSecurityCode.Motif.REACTIVATION,
    }
    if motif not in mapping:
        return Response({"detail": "Motif inconnu."}, status=400)

    _envoyer_code_proprietaire(vendor, mapping[motif], membre)
    return Response({"masque": services.masquer_numero(vendor.phone)})


@extend_schema(tags=TAG, summary="Team — change a member's rights")
@api_view(["PUT"])
@permission_classes([IsAuthenticated])
def shop_member_rights(request, member_id):
    vendor = _vendor_for_team(request)
    if vendor is None:
        return _owner_only()
    membre = VendorEmployee.objects.filter(id=member_id, vendor=vendor).first()
    if membre is None:
        return Response({"detail": "Membre introuvable."}, status=404)
    if membre.role == VendorEmployee.Role.OWNER:
        return Response({"ok": False, "raison": "proprietaire"})

    code = str(request.data.get("code") or "").strip()
    if not _dernier_code_valide(vendor, VendorOwnerSecurityCode.Motif.DROITS, membre, code):
        return Response({"ok": False, "raison": "code"})

    droits = request.data.get("droits")
    if not isinstance(droits, list) or not all(isinstance(d, str) for d in droits):
        return Response({"ok": False, "raison": "droits"})

    # Les droits interdits à un employé sont retirés d'office (VendorEmployee.clean_rights, appelé par save()).
    membre.droits = droits
    membre.save()
    VendorEmployeeActionLog.consigner(
        vendor=vendor, employee=membre, domaine="equipe", texte="Droits modifiés", categorie="droits",
    )
    return Response({"ok": True, "membre": _membre_payload(membre)})


@extend_schema(tags=TAG, summary="Team — suspend a member (no code: cuts access immediately)")
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def shop_member_suspend(request, member_id):
    vendor = _vendor_for_team(request)
    if vendor is None:
        return _owner_only()
    membre = VendorEmployee.objects.filter(id=member_id, vendor=vendor).first()
    if membre is None:
        return Response({"detail": "Membre introuvable."}, status=404)
    if membre.role == VendorEmployee.Role.OWNER:
        return Response({"ok": False, "raison": "proprietaire"})
    if membre.is_suspended:
        return Response({"ok": False, "raison": "etat"})

    membre.is_suspended = True
    membre.suspended_at = timezone.now()
    membre.save(update_fields=["is_suspended", "suspended_at", "updated_at"])
    _revoke_user_sessions(membre.user)
    VendorEmployeeActionLog.consigner(
        vendor=vendor, employee=membre, domaine="equipe", texte="Accès suspendu", categorie="suspension",
    )
    return Response({"ok": True, "membre": _membre_payload(membre)})


@extend_schema(tags=TAG, summary="Team — reactivate a suspended member")
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def shop_member_reactivate(request, member_id):
    vendor = _vendor_for_team(request)
    if vendor is None:
        return _owner_only()
    membre = VendorEmployee.objects.filter(id=member_id, vendor=vendor).first()
    if membre is None:
        return Response({"detail": "Membre introuvable."}, status=404)
    if membre.role == VendorEmployee.Role.OWNER:
        return Response({"ok": False, "raison": "proprietaire"})
    if not membre.is_suspended:
        return Response({"ok": False, "raison": "etat"})

    code = str(request.data.get("code") or "").strip()
    if not _dernier_code_valide(vendor, VendorOwnerSecurityCode.Motif.REACTIVATION, membre, code):
        return Response({"ok": False, "raison": "code"})

    membre.is_suspended = False
    membre.suspended_at = None
    membre.save(update_fields=["is_suspended", "suspended_at", "updated_at"])
    VendorEmployeeActionLog.consigner(
        vendor=vendor, employee=membre, domaine="equipe", texte="Accès réactivé", categorie="reactivation",
    )
    return Response({"ok": True, "membre": _membre_payload(membre)})


@extend_schema(tags=TAG, summary="Team — a member's signed action log")
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def shop_member_journal(request, member_id):
    vendor = _vendor_for_team(request)
    if vendor is None:
        return _owner_only()
    membre = VendorEmployee.objects.filter(id=member_id, vendor=vendor).first()
    if membre is None:
        return Response({"detail": "Membre introuvable."}, status=404)

    logs = VendorEmployeeActionLog.objects.filter(vendor=vendor, employee=membre).order_by("-created_at")
    return Response([
        {"a": _ms(l.created_at), "texte": l.texte, "domaine": l.domaine, "ref": l.ref or None, "route": l.route or None}
        for l in logs
    ])


@extend_schema(tags=TAG, summary="Team — remove a member")
@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def shop_member_remove(request, member_id):
    vendor = _vendor_for_team(request)
    if vendor is None:
        return _owner_only()
    membre = VendorEmployee.objects.filter(id=member_id, vendor=vendor).first()
    if membre is None:
        return Response({"detail": "Membre introuvable."}, status=404)
    if membre.role == VendorEmployee.Role.OWNER:
        return Response({"ok": False, "raison": "proprietaire"})

    code = str(request.data.get("code") or "").strip()
    if not _dernier_code_valide(vendor, VendorOwnerSecurityCode.Motif.RETRAIT, membre, code):
        return Response({"ok": False, "raison": "code"})

    with transaction.atomic():
        _revoke_user_sessions(membre.user)
        label = f"{membre.first_name} {membre.last_name}".strip()
        VendorEmployeeActionLog.objects.filter(vendor=vendor, employee=membre).update(employee_label=label)
        VendorEmployeeActionLog.consigner(
            vendor=vendor, employee=None, domaine="equipe", texte=f"{label} retiré de l'équipe",
            categorie="retrait", employee_label=label,
        )
        membre.delete()

    return Response({"ok": True, "equipe": _equipe_payload(vendor)})
