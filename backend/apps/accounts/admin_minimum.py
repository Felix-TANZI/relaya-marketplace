# backend/apps/accounts/admin_minimum.py
# Administration minimum — feuille de route D24 : « Livrer les pages Support et tickets, Sécurité et fraude, Vue
# d'ensemble des livreurs. Livrer la file des pièces vendeur. » Réservé à l'équipe (is_staff).
#
#   GET  /api/auth/admin/support/                 fils du support (messagerie client, D6) : à traiter d'abord
#   GET  /api/auth/admin/support/<id>/            un fil
#   POST /api/auth/admin/support/<id>/            répondre {texte} ; {resolue: true} pour clore
#   GET  /api/auth/admin/fraud/                   signaux de fraude réunis (lecture) ; liens vers les écrans d'action
#   GET  /api/auth/admin/couriers/overview/       effectifs, missions, SOS, livreurs à suivre
#   GET  /api/auth/admin/kyc/pieces/              file des pièces vendeur (D19), la plus en retard d'abord
#   POST /api/auth/admin/kyc/pieces/<id>/         décider une pièce {decision: APPROVED|REJECTED, motif}
#
# Les pièces s'ouvrent par /api/auth/compliance-documents/<id>/file/ (accès restreint, D19).

from django.db import transaction
from django.db.models import Count, Q
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from apps.client_core.masquage import nettoyer_message
from apps.common.droits import Partie

from .models import (
    ComplianceDocument,
    CourierProfile,
    PartnerBlacklist,
    SanctionRecord,
    TrustScoreProfile,
    UserNotification,
)

TAG = ["Administration minimum (D24)"]


def _iso(dt):
    return dt.isoformat() if dt else None


# ── Support et tickets ────────────────────────────────────────────────────────────────────────────────


def _fil(c, avec_messages=False) -> dict:
    from apps.messaging.models import Message

    messages = list(c.messages.all())
    reponse = max((m.cree_le for m in messages if m.de == Message.De.EUX), default=None)
    attente = [m for m in messages if m.de in (Message.De.MOI, Message.De.PHOTO) and (reponse is None or m.cree_le > reponse)]
    d = {
        "id": c.pk, "client": c.client.get_full_name() or c.client.username, "client_id": c.client_id,
        "titre": c.titre, "resolue": c.resolue, "maj": _iso(c.maj_le),
        "sans_reponse": len(attente), "attente_depuis": _iso(attente[0].cree_le) if attente else None,
        "dernier": messages[-1].texte[:160] if messages else "",
    }
    if avec_messages:
        d["messages"] = [{"de": m.de, "qui": m.qui, "texte": m.texte, "photo": bool(m.photo), "le": _iso(m.cree_le)}
                         for m in messages]
    return d


@extend_schema(tags=TAG, summary="Fils du support, ceux qui attendent une réponse d'abord")
@api_view(["GET"])
@permission_classes([Partie("support")])  # sécurité main 2 : droits par partie
def support_liste(request):
    from apps.messaging.models import Conversation

    fils = (Conversation.objects.filter(type=Conversation.Type.SUPPORT, messages__isnull=False).distinct()
            .select_related("client").prefetch_related("messages"))
    if request.query_params.get("etat") == "resolus":
        fils = fils.filter(resolue=True)
    elif request.query_params.get("etat") != "tous":
        fils = fils.filter(resolue=False)
    donnees = [_fil(c) for c in fils[:300]]
    donnees.sort(key=lambda d: (d["sans_reponse"] == 0, d["attente_depuis"] or d["maj"] or ""))
    return Response({"fils": donnees, "a_traiter": sum(1 for d in donnees if d["sans_reponse"])})


@extend_schema(tags=TAG, summary="Un fil du support ; répondre ou clore")
@api_view(["GET", "POST"])
@permission_classes([Partie("support")])  # sécurité main 2 : droits par partie
def support_fil(request, pk):
    from apps.messaging.models import Conversation, Message
    from apps.messaging.services import QUI_SUPPORT

    c = Conversation.objects.filter(pk=pk, type=Conversation.Type.SUPPORT).select_related("client").first()
    if c is None:
        return Response({"detail": "Fil introuvable."}, status=status.HTTP_404_NOT_FOUND)
    if request.method == "POST":
        texte = str(request.data.get("texte") or "").strip()
        maintenant = timezone.now()
        with transaction.atomic():
            if texte:
                propre, masques = nettoyer_message(texte)  # CMS-04, comme pour le client et le vendeur
                Message.objects.create(conversation=c, de=Message.De.EUX, qui=QUI_SUPPORT, texte=propre,
                                       masques=masques, cree_le=maintenant)
            champs = {"maj_le": maintenant} if texte else {}
            if "resolue" in request.data:
                champs["resolue"] = bool(request.data.get("resolue"))
            if champs:
                Conversation.objects.filter(pk=c.pk).update(**champs)
        if texte:
            UserNotification.objects.create(
                user=c.client, title="Le support BelivaY t'a répondu", message=texte[:200],
                notification_type=UserNotification.NotificationType.SUPPORT, action_url="/messages/support",
            )
        c.refresh_from_db()
    return Response(_fil(c, avec_messages=True))


# ── Sécurité et fraude ────────────────────────────────────────────────────────────────────────────────


@extend_schema(tags=TAG, summary="Signaux de fraude réunis")
@api_view(["GET"])
@permission_classes([Partie("fraude")])  # sécurité main 2 : droits par partie
def fraude(request):
    from apps.orders.models import Dispute
    from apps.otp.models import CodeOtp
    from apps.shipping.models import RelayPickupAttempt, Shipment

    maintenant = timezone.now()
    vetos = TrustScoreProfile.objects.filter(veto_active=True).select_related("user")
    sanctions = SanctionRecord.objects.filter(lifted_at__isnull=True).filter(
        Q(expires_at__isnull=True) | Q(expires_at__gt=maintenant)).select_related("profile__user")
    codes_bloques = CodeOtp.objects.filter(bloque_jusqua__gt=maintenant)
    # Sécurité avant main 2 : les relais dont les remises sont bloquées par trop de codes de retrait faux sur la
    # période (r_code_relais_echecs en r_code_relais_fenetre_h) ; les codes bloqués d'un colis (R66.1) sont plus bas.
    from apps.regles import services as regles

    retraits_bloques = (RelayPickupAttempt.objects.filter(
        success=False, created_at__gte=maintenant - timezone.timedelta(hours=regles.reglage("r_code_relais_fenetre_h")))
        .values("relay_point__name").annotate(n=Count("id"))
        .filter(n__gte=max(1, regles.reglage("r_code_relais_echecs"))))
    colis_bloques = [s for s in Shipment.objects.exclude(codes_essais={}).only("id", "order_id", "codes_essais")
                     if any((v or {}).get("bloque_jusqu") for v in (s.codes_essais or {}).values())]
    litigants = (Dispute.objects.filter(created_at__gte=maintenant - timezone.timedelta(days=90))
                 .values("opened_by__id", "opened_by__username").annotate(n=Count("id")).filter(n__gte=2).order_by("-n"))
    remboursements = []
    try:
        from apps.payments.settlements.models import Refund

        remboursements = list(Refund.objects.filter(status=Refund.Status.PENDING_APPROVAL)
                              .values("reference", "amount_xaf", "reason", "created_at")[:50])
    except Exception:  # module financier absent : la page reste utile
        pass
    return Response({
        "compteurs": {
            "vetos": vetos.count(), "sanctions": sanctions.count(), "codes_bloques": codes_bloques.count(),
            "retraits_bloques": len(retraits_bloques), "colis_codes_bloques": len(colis_bloques),
            "liste_noire": PartnerBlacklist.objects.count(), "remboursements_a_approuver": len(remboursements),
        },
        "vetos": [{"user": p.user.username, "user_id": p.user_id, "role": p.role, "score": float(p.score),
                   "motif": p.veto_reason} for p in vetos[:100]],
        "sanctions": [{"user": s.profile.user.username, "user_id": s.profile.user_id, "niveau": s.level,
                       "motif": s.reason, "jusqu": _iso(s.expires_at)} for s in sanctions[:100]],
        "codes_bloques": [{"objet": c.objet, "destination": c.destination_masquee, "jusqu": _iso(c.bloque_jusqua)}
                          for c in codes_bloques.order_by("-bloque_jusqua")[:100]],
        "retraits_bloques": [{"relais": r["relay_point__name"] or "", "essais_faux": r["n"]}
                             for r in retraits_bloques[:100]],
        "colis_codes_bloques": [{"colis": s.id, "commande": s.order_id} for s in colis_bloques[:100]],
        "litiges_repetes": [{"user": d["opened_by__username"], "user_id": d["opened_by__id"], "litiges_90j": d["n"]}
                            for d in litigants[:100]],
        "remboursements_a_approuver": [{**r, "created_at": _iso(r["created_at"])} for r in remboursements],
    })


# ── Vue d'ensemble des livreurs ───────────────────────────────────────────────────────────────────────


@extend_schema(tags=TAG, summary="Vue d'ensemble des livreurs")
@api_view(["GET"])
@permission_classes([Partie("logistique")])  # sécurité main 2 : droits par partie
def livreurs_vue(request):
    from apps.shipping.models import CourierSOSAlert, Shipment

    actifs = [Shipment.Status.ASSIGNED, Shipment.Status.PICKED_UP, Shipment.Status.IN_TRANSIT,
              Shipment.Status.OUT_FOR_DELIVERY]
    livreurs = CourierProfile.objects.select_related("user", "delivery_organization").annotate(
        en_cours=Count("shipments", filter=Q(shipments__status__in=actifs), distinct=True),
        sos=Count("sos_alerts", filter=Q(sos_alerts__status="OPEN"), distinct=True),
    )
    approuves = livreurs.filter(is_approved=True, is_active=True)
    lignes = [{
        "id": c.id, "nom": c.user.get_full_name() or c.user.username, "entreprise": getattr(c.delivery_organization,
                                                                                       "company_name", "") or "",
        "ville": c.city, "en_ligne": c.is_online, "disponibilite": c.availability_status, "vehicule": c.vehicle_type,
        "missions_en_cours": c.en_cours, "capacite": c.max_active_shipments, "sos_ouverts": c.sos,
    } for c in approuves.order_by("-sos", "-en_cours")[:300]]
    return Response({
        "compteurs": {
            "inscrits": livreurs.count(),
            "a_valider": livreurs.filter(is_approved=False).count(),
            "actifs": approuves.count(),
            "en_ligne": approuves.filter(is_online=True).count(),
            "disponibles": approuves.filter(availability_status=CourierProfile.AvailabilityStatus.AVAILABLE).count(),
            "en_mission": sum(1 for l in lignes if l["missions_en_cours"]),
            "missions_en_cours": Shipment.objects.filter(status__in=actifs).count(),
            "missions_sans_livreur": Shipment.objects.filter(courier__isnull=True, status__in=[
                Shipment.Status.CREATED, Shipment.Status.WAITING_MANUAL_ASSIGNMENT]).count(),
            "sos_ouverts": CourierSOSAlert.objects.filter(status="OPEN").count(),
        },
        "livreurs": lignes,
    })


# ── File des pièces vendeur (D19) ─────────────────────────────────────────────────────────────────────


def _piece(d: ComplianceDocument) -> dict:
    from apps.vendors.kyc import LIBELLES, echeance_examen, examen_en_retard

    profil = getattr(d.user, "vendor_profile", None)
    return {
        "id": d.id, "type": d.document_type, "libelle": LIBELLES.get(d.document_type, d.document_type),
        "statut": d.status, "motif": d.review_note, "vendeur": getattr(profil, "business_name", "") or d.user.username,
        "vendeur_id": getattr(profil, "pk", None), "user_id": d.user_id, "depose": _iso(d.created_at),
        "maj": _iso(d.updated_at), "echeance": _iso(echeance_examen(d.created_at)),
        "en_retard": examen_en_retard(d),
        "fichier": f"/api/auth/compliance-documents/{d.id}/file/" if d.file else None,
        "video": (d.file.name or "").lower().rsplit(".", 1)[-1] in ("mp4", "mov", "webm", "m4v", "3gp") if d.file else False,
    }


@extend_schema(tags=TAG, summary="File des pièces vendeur, la plus en retard d'abord")
@api_view(["GET"])
@permission_classes([Partie("conformite")])  # sécurité main 2 : droits par partie
def kyc_file(request):
    statut = request.query_params.get("statut", ComplianceDocument.Status.PENDING)
    pieces = (ComplianceDocument.objects.filter(owner_role=ComplianceDocument.OwnerRole.VENDOR)
              .select_related("user", "user__vendor_profile").order_by("created_at"))
    if statut != "tous":
        pieces = pieces.filter(status=statut)
    donnees = [_piece(d) for d in pieces[:500]]
    return Response({"pieces": donnees, "en_retard": sum(1 for d in donnees if d["en_retard"])})


@extend_schema(tags=TAG, summary="Décider une pièce vendeur (motif obligatoire pour un refus)")
@api_view(["POST"])
@permission_classes([Partie("conformite")])  # sécurité main 2 : droits par partie
def kyc_decision(request, pk):
    from apps.vendors.kyc import LIBELLES, identite_verifiee

    d = ComplianceDocument.objects.filter(pk=pk, owner_role=ComplianceDocument.OwnerRole.VENDOR).select_related(
        "user").first()
    if d is None:
        return Response({"detail": "Pièce introuvable."}, status=status.HTTP_404_NOT_FOUND)
    decision = str(request.data.get("decision") or "").upper()
    motif = str(request.data.get("motif") or "").strip()
    if decision not in (ComplianceDocument.Status.APPROVED, ComplianceDocument.Status.REJECTED):
        return Response({"decision": "APPROVED ou REJECTED."}, status=status.HTTP_400_BAD_REQUEST)
    if decision == ComplianceDocument.Status.REJECTED and not motif:
        return Response({"motif": "Donnez le motif du refus : le vendeur le lira."}, status=status.HTTP_400_BAD_REQUEST)
    d.status = decision
    d.review_note = motif if decision == ComplianceDocument.Status.REJECTED else ""
    d.save(update_fields=["status", "review_note", "updated_at"])

    libelle = LIBELLES.get(d.document_type, d.document_type)
    if decision == ComplianceDocument.Status.REJECTED:
        titre, texte = f"Pièce refusée : {libelle}", f"Motif : {motif}. Déposez une nouvelle pièce depuis votre espace."
    elif identite_verifiee(d.user):
        titre, texte = "Identité vérifiée", "Vos trois pièces sont validées : vous pouvez publier et être versé."
    else:
        titre, texte = f"Pièce validée : {libelle}", "Il reste des pièces à valider avant de publier."
    UserNotification.objects.create(user=d.user, title=titre[:160], message=texte,
                                    notification_type=UserNotification.NotificationType.SYSTEM,
                                    action_url="/seller/v2/verification")
    return Response(_piece(d))
