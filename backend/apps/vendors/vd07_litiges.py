# backend/apps/vendors/vd07_litiges.py
# Domaine « litiges » de l'espace vendeur (espace-client-belivay/espace-vendeur) — VD-07.
# Contrat exact : src/donnees/domaines/litiges.ts + src/api/domaines/litiges.ts (déjà livrés).
# Réutilise les modèles orders.Dispute / DisputeMessage / DisputeEvidence / DisputeEvidenceRequest
# et l'infrastructure de preuve existante (apps.orders.evidence) — rien n'est reconstruit depuis
# zéro : ces vues ajoutent la forme de réponse attendue par le nouveau frontend et les
# comportements manquants (brouillon, recours), sans toucher aux anciennes routes
# `disputes/`, `disputes/<id>/reply/`, `.../messages/`, `.../evidences/` encore utilisées par
# l'ancien frontend (frontend/src/services/api/vendors.ts, frontend/src/features/vendors/...).
#
# Routage (voir backend/apps/vendors/urls.py) : les deux seules routes qui auraient collisionné
# avec l'ancien frontend (listes GET /disputes et /returns) sont servies sous /disputes/v2 et
# /returns/v2 ; tout le reste (rules, counts, <ref>, .../evidence, .../draft, .../answer,
# .../appeal) ne collisionne pas (segments différents ou `ref` non numérique vs <int:dispute_id>
# de l'ancien jeu de routes) — litiges.ts et retours.ts ont été mis à jour pour appeler ces deux
# chemins /v2.
#
# Valeurs numériques (LIT-*, RET-*) : voir backend/apps/vendors/vd07_constants.py — chaque valeur
# cite sa source exacte dans le dépôt ; aucune n'est inventée.

import logging
import re

from django.db.models import Sum
from django.utils import timezone
from datetime import timedelta
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.orders.evidence import create_evidence, decode_data_uri
from apps.orders.models import Dispute, DisputeEvidence, DisputeEvidenceRequest, OrderItem

from . import vd07_constants as C
from .models import VendorProfile
from .vd07_idempotence import idempotent_vendor

logger = logging.getLogger("apps.vendors.vd07")

_REF_RE = re.compile(r"^BLV-0*(\d+)$", re.IGNORECASE)


# ─────────────────────────────────────────────────────────────────────────────
# Outils communs
# ─────────────────────────────────────────────────────────────────────────────

def _require_active_vendor(request):
    try:
        profile = VendorProfile.objects.get(user=request.user)
    except VendorProfile.DoesNotExist:
        return None, Response({'detail': 'Profil vendeur introuvable.'}, status=status.HTTP_404_NOT_FOUND)
    if not profile.is_active_vendor:
        return None, Response(
            {'detail': "Votre compte vendeur n'est pas encore approuvé."},
            status=status.HTTP_403_FORBIDDEN,
        )
    return profile, None


def order_ref(order_id: int) -> str:
    """BLV-00008 — même convention que VendorDisputeListSerializer.get_order_ref (serializers.py)."""
    return f"BLV-{order_id:05d}"


def _parse_ref(ref: str):
    m = _REF_RE.match((ref or '').strip())
    return int(m.group(1)) if m else None


def _ms(dt):
    """Instant (epoch ms) attendu par le frontend (src/donnees/communs.ts: Instant = number)."""
    if not dt:
        return None
    return int(dt.timestamp() * 1000)


def _display_name(user):
    if not user:
        return None
    profile = getattr(user, 'vendor_profile', None)
    if profile:
        return profile.business_name
    return user.get_full_name() or user.username


def _vendor_amount_at_stake(order, vendor) -> int:
    """Proxy de 'gele' / 'frozen_amount' : part du vendeur dans la commande (OrderItem.line_total_xaf).

    Le champ frozen_amount officiel sur Order appartient au domaine commandes (voir rapport) —
    cette valeur est calculée ici sans y toucher, uniquement pour l'affichage litiges/retours.
    """
    total = OrderItem.objects.filter(order=order, product__vendor=vendor).aggregate(s=Sum('line_total_xaf'))['s']
    return int(total or 0)


def find_dispute_by_ref(vendor, ref: str):
    """Résout `ref` (BLV-00008, même convention que le domaine commandes) vers le litige du
    vendeur sur cette commande. S'il existe plusieurs litiges pour la même commande/vendeur
    (plusieurs order_item concernés), on rend le plus récent — limite connue tant qu'un litige
    reste modélisé par commande côté écran (voir rapport)."""
    order_id = _parse_ref(ref)
    if order_id is None:
        return None
    return (
        Dispute.objects.filter(order_id=order_id, order__items__product__vendor=vendor)
        .distinct()
        .select_related('order', 'vendor', 'order_item', 'product')
        .prefetch_related('evidences__uploaded_by')
        .order_by('-created_at')
        .first()
    )


# ─────────────────────────────────────────────────────────────────────────────
# Construction du Litige (voir src/donnees/domaines/litiges.ts)
# ─────────────────────────────────────────────────────────────────────────────

_ATTENTE_PAR_MOTIF = {
    'REFUND_REQUEST': 'remboursement',
    'PAYMENT_NOT_RECOGNIZED': 'remboursement',
    'COUNTERFEIT': 'signal',
}


def _infer_attente(reason: str) -> str:
    # Dispute n'a pas de champ dédié « ce que veut le client » (AttenteClient) : approximation
    # par motif. À remplacer si l'assistant de litige du client (app acheteur) capture ce choix.
    return _ATTENTE_PAR_MOTIF.get(reason, 'remboursement')


def _build_article(dispute) -> dict:
    product = dispute.product or (dispute.order_item.product if dispute.order_item else None)
    image_url = ''
    if product is not None:
        img = product.images.filter(is_primary=True).first() or product.images.first()
        if img and img.image:
            image_url = img.image.url
    return {
        'offreId': str(product.id) if product else '',
        'titre': dispute.order_item.title_snapshot if dispute.order_item else (product.title if product else ''),
        'variante': '',
        'etat': product.condition.name if (product and product.condition_id) else '',
        'dessin': image_url,
        'categorie': product.category.name if (product and product.category_id) else '',
    }


_QUOI_PAR_ROLE = {
    DisputeEvidenceRequest.RecipientRole.CLIENT: 'client',
    DisputeEvidenceRequest.RecipientRole.VENDOR: 'vendeur',
    DisputeEvidenceRequest.RecipientRole.COURIER: 'ramassage',
    DisputeEvidenceRequest.RecipientRole.LOGISTICS: 'ramassage',
    DisputeEvidenceRequest.RecipientRole.RELAY_POINT: 'comptoir',
}


def _build_piece_dossier(ev, dispute) -> dict:
    return {
        'id': str(ev.id),
        'photo': ev.file.url if ev.file else '',
        'quoi': _QUOI_PAR_ROLE.get(ev.uploader_role, 'comptoir'),
        'a': _ms(ev.created_at),
        'ajouteePar': _display_name(ev.uploaded_by) if ev.uploader_role == DisputeEvidenceRequest.RecipientRole.VENDOR else None,
        'retirable': ev.uploader_role == DisputeEvidenceRequest.RecipientRole.VENDOR and not dispute.vendor_replied,
    }


def _echeance(dispute):
    if dispute.vendor_reply_deadline:
        return dispute.vendor_reply_deadline
    # Avant que l'admin ne "contacte" formellement le vendeur, vendor_reply_deadline est vide
    # (règle existante, orders/models.py) : estimation d'affichage à partir de LIT-VENDEUR-H.
    return dispute.created_at + timedelta(hours=C.LIT_VENDEUR_H)


def _decision_avant(dispute):
    return _echeance(dispute) + timedelta(hours=C.LIT_DECISION_H)


def _compute_etat(dispute) -> str:
    if dispute.status == 'OPEN':
        return 'a_repondre'
    if dispute.status == 'IN_PROGRESS':
        return 'en_mediation'
    return 'clos'  # RESOLVED / CLOSED


def _compute_issue(dispute) -> str:
    if dispute.vendor_replied and dispute.vendor_reply_type == Dispute.VendorReplyType.ACCEPT:
        return 'accepte'
    if dispute.status in ('RESOLVED', 'CLOSED') and dispute.resolution:
        if dispute.resolution == 'REJECTED':
            return 'gagne'
        if dispute.resolution in ('REFUND', 'PARTIAL_REFUND', 'EXCHANGE'):
            return 'perdu'
    return 'attente'


def _build_reponse(dispute):
    if not dispute.vendor_replied:
        return None
    posture_map = {'ACCEPT': 'accepte', 'CONTEST': 'conteste', 'COMPROMISE': 'arrangement'}
    return {
        'posture': posture_map.get(dispute.vendor_reply_type, 'conteste'),
        'arrangement': dispute.vendor_arrangement_type.lower() if dispute.vendor_arrangement_type else None,
        'texte': dispute.vendor_reply_text,
        'envoyeeA': _ms(dispute.vendor_replied_at),
        'par': _display_name(dispute.vendor),
    }


def _build_decision(dispute):
    if dispute.status not in ('RESOLVED', 'CLOSED') or not dispute.resolution:
        return None
    issue = _compute_issue(dispute)
    if issue not in ('gagne', 'perdu'):
        return None
    return {
        'a': _ms(dispute.resolved_at) or _ms(dispute.updated_at),
        'issue': issue,
        'motif': dispute.resolution_note or dispute.get_resolution_display(),
        'par': 'Médiation BelivaY',
        'effetScore': dispute.decision_score_effect,
        # Libération/versement : propriété du domaine argent/commandes (frozen_amount), pas
        # construits ici pour éviter de dupliquer une source de vérité qui n'est pas la mienne.
        'liberation': None,
        'versement': None,
        'versementVers': None,
    }


def _build_recours(dispute):
    decision = _build_decision(dispute)
    if not decision:
        return {
            'jusqua': None, 'possible': False,
            'deposeA': _ms(dispute.appeal_filed_at), 'texte': dispute.appeal_text or None,
        }
    jusqua = (dispute.resolved_at or dispute.updated_at) + timedelta(hours=C.LIT_RECOURS_H)
    possible = (
        decision['issue'] == 'perdu'
        and not dispute.appeal_filed_at
        and timezone.now() < jusqua
    )
    return {
        'jusqua': _ms(jusqua),
        'possible': possible,
        'deposeA': _ms(dispute.appeal_filed_at),
        'texte': dispute.appeal_text or None,
    }


def _gele(dispute, vendor, recours):
    if dispute.status in ('RESOLVED', 'CLOSED') and not recours['possible']:
        return None
    return _vendor_amount_at_stake(dispute.order, vendor)


def _build_journal(dispute):
    events = [{'a': _ms(dispute.created_at), 'code': 'ouvert', 'auteur': None, 'detail': None}]
    for ev in dispute.evidences.all():
        events.append({
            'a': _ms(ev.created_at),
            'code': 'preuve_ajoutee',
            'auteur': _display_name(ev.uploaded_by) if ev.uploader_role == DisputeEvidenceRequest.RecipientRole.VENDOR else None,
            'detail': ev.description or None,
        })
    if dispute.vendor_replied_at:
        events.append({'a': _ms(dispute.vendor_replied_at), 'code': 'reponse', 'auteur': _display_name(dispute.vendor), 'detail': None})
    decision = _build_decision(dispute)
    if decision:
        events.append({'a': decision['a'], 'code': 'decision', 'auteur': decision['par'], 'detail': decision['motif']})
    if dispute.appeal_filed_at:
        events.append({'a': _ms(dispute.appeal_filed_at), 'code': 'recours', 'auteur': _display_name(dispute.appeal_filed_by), 'detail': dispute.appeal_text or None})
    if dispute.status in ('RESOLVED', 'CLOSED'):
        events.append({'a': _ms(dispute.updated_at), 'code': 'clos', 'auteur': None, 'detail': None})
    events.sort(key=lambda e: e['a'] or 0)
    return events


def build_litige(dispute, vendor) -> dict:
    recours = _build_recours(dispute)
    evidences = list(dispute.evidences.all())
    return {
        'ref': order_ref(dispute.order_id),
        'etat': _compute_etat(dispute),
        'issue': _compute_issue(dispute),
        # 'comptoir' (litige ouvert au comptoir du relais, VD07-R03) n'est pas modélisé côté
        # Django aujourd'hui : toujours 'application' tant que ce flux n'existe pas.
        'origine': 'application',
        'ouvertA': _ms(dispute.created_at),
        'echeance': _ms(_echeance(dispute)),
        'decisionAvant': _ms(_decision_avant(dispute)),
        'motif': dispute.get_reason_display(),
        'ceQueDitLeClient': dispute.description,
        'attente': _infer_attente(dispute.reason),
        'article': _build_article(dispute),
        'photosClient': [
            _build_piece_dossier(e, dispute) for e in evidences
            if e.uploader_role == DisputeEvidenceRequest.RecipientRole.CLIENT
        ],
        'preuves': [
            _build_piece_dossier(e, dispute) for e in evidences
            if e.uploader_role != DisputeEvidenceRequest.RecipientRole.CLIENT
        ],
        'gele': _gele(dispute, vendor, recours),
        # RET-TRAJET / part de livraison (livraisonDuColis) : voir vd07_constants.py et le
        # rapport de livraison — aucune des deux n'est calculée côté Django aujourd'hui.
        'trajetRetour': C.RET_TRAJET,
        'livraisonRetour': None,
        'reponse': _build_reponse(dispute),
        'decision': _build_decision(dispute),
        'recours': recours,
        'brouillon': dispute.draft_answer or None,
        'journal': _build_journal(dispute),
    }


# ─────────────────────────────────────────────────────────────────────────────
# Vues
# ─────────────────────────────────────────────────────────────────────────────

@extend_schema(tags=["Vendors"], summary="Règles litiges/retours (espace vendeur VD-07)")
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dispute_rules(request):
    _, err = _require_active_vendor(request)
    if err:
        return err
    return Response(C.regles_litiges_payload())


@extend_schema(tags=["Vendors"], summary="Compteurs litiges (espace vendeur VD-07)")
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dispute_counts(request):
    _, err = _require_active_vendor(request)
    if err:
        return err
    vendor = request.user
    disputes = Dispute.objects.filter(order__items__product__vendor=vendor).distinct().select_related('order')
    items = [build_litige(d, vendor) for d in disputes]
    return Response({
        'a_repondre': sum(1 for it in items if it['etat'] == 'a_repondre'),
        'en_mediation': sum(1 for it in items if it['etat'] == 'en_mediation'),
        'clos': sum(1 for it in items if it['etat'] == 'clos'),
        'gele': sum(it['gele'] or 0 for it in items),
    })


@extend_schema(tags=["Vendors"], summary="Lister les litiges (espace vendeur VD-07)")
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dispute_list_v2(request):
    _, err = _require_active_vendor(request)
    if err:
        return err
    vendor = request.user
    disputes = (
        Dispute.objects.filter(order__items__product__vendor=vendor)
        .distinct()
        .select_related('order', 'vendor', 'order_item', 'product')
        .prefetch_related('evidences__uploaded_by')
    )
    state = request.query_params.get('state')
    items = [build_litige(d, vendor) for d in disputes]
    if state:
        items = [it for it in items if it['etat'] == state]
    items.sort(key=lambda it: it['echeance'] or 0)
    return Response(items)


@extend_schema(tags=["Vendors"], summary="Détail d'un litige (espace vendeur VD-07)")
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dispute_detail_v2(request, ref):
    _, err = _require_active_vendor(request)
    if err:
        return err
    dispute = find_dispute_by_ref(request.user, ref)
    if not dispute:
        return Response(status=status.HTTP_404_NOT_FOUND)
    return Response(build_litige(dispute, request.user))


@extend_schema(tags=["Vendors"], summary="Ajouter une preuve à un litige (espace vendeur VD-07)")
@api_view(['POST'])
@permission_classes([IsAuthenticated])
@idempotent_vendor
def dispute_evidence_add(request, ref):
    _, err = _require_active_vendor(request)
    if err:
        return err
    vendor = request.user
    dispute = find_dispute_by_ref(vendor, ref)
    if not dispute:
        return Response({'ok': False, 'raison': 'introuvable'})
    if dispute.status in ('RESOLVED', 'CLOSED'):
        return Response({'ok': False, 'raison': 'clos'})

    upload = decode_data_uri(request.data.get('photo'), filename=f"litige-{dispute.id}.jpg")
    if not upload:
        return Response({'detail': 'Format photo invalide : data URI attendu.'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        evidence = create_evidence(
            dispute=dispute, user=vendor, upload=upload,
            uploader_role=DisputeEvidenceRequest.RecipientRole.VENDOR,
        )
    except ValidationError as exc:
        return Response({'detail': exc.detail}, status=status.HTTP_400_BAD_REQUEST)

    dispute.updated_at = timezone.now()
    dispute.save(update_fields=['updated_at'])
    return Response({'ok': True, 'piece': _build_piece_dossier(evidence, dispute)}, status=status.HTTP_201_CREATED)


@extend_schema(tags=["Vendors"], summary="Retirer une preuve d'un litige (espace vendeur VD-07)")
@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def dispute_evidence_remove(request, ref, piece_id):
    _, err = _require_active_vendor(request)
    if err:
        return err
    vendor = request.user
    dispute = find_dispute_by_ref(vendor, ref)
    if not dispute:
        return Response({'ok': False, 'raison': 'introuvable'})
    try:
        ev = dispute.evidences.get(id=piece_id, uploader_role=DisputeEvidenceRequest.RecipientRole.VENDOR)
    except DisputeEvidence.DoesNotExist:
        return Response({'ok': False, 'raison': 'introuvable'})
    if dispute.vendor_replied:
        return Response({'ok': False, 'raison': 'deja_repondu'})
    ev.file.delete(save=False)
    ev.delete()
    return Response({'ok': True})


@extend_schema(tags=["Vendors"], summary="Garder le brouillon de réponse (espace vendeur VD-07)")
@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def dispute_draft(request, ref):
    _, err = _require_active_vendor(request)
    if err:
        return err
    dispute = find_dispute_by_ref(request.user, ref)
    if not dispute:
        return Response(status=status.HTTP_404_NOT_FOUND)
    dispute.draft_answer = request.data.get('brouillon')  # None efface (contrat frontend)
    dispute.save(update_fields=['draft_answer'])
    return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema(tags=["Vendors"], summary="Répondre formellement à un litige (espace vendeur VD-07)")
@api_view(['POST'])
@permission_classes([IsAuthenticated])
@idempotent_vendor
def dispute_answer(request, ref):
    _, err = _require_active_vendor(request)
    if err:
        return err
    vendor = request.user
    dispute = find_dispute_by_ref(vendor, ref)
    if not dispute:
        return Response({'ok': False, 'raison': 'introuvable'})
    if dispute.vendor_replied:
        return Response({'ok': False, 'raison': 'deja_repondu'})
    if dispute.status in ('RESOLVED', 'CLOSED'):
        return Response({'ok': False, 'raison': 'delai_depasse'})

    posture = (request.data.get('posture') or '').strip()
    texte = (request.data.get('texte') or '').strip()
    arrangement = request.data.get('arrangement')

    if posture not in ('accepte', 'conteste', 'arrangement'):
        return Response({'detail': 'posture invalide (accepte|conteste|arrangement).'}, status=status.HTTP_400_BAD_REQUEST)
    if not texte:
        return Response({'ok': False, 'raison': 'constat_vide'})
    if posture == 'arrangement' and len(texte) < C.LIT_ARRANGEMENT_MIN_CHARS:
        return Response({'ok': False, 'raison': 'trop_court'})

    posture_to_reply_type = {'accepte': 'ACCEPT', 'conteste': 'CONTEST', 'arrangement': 'COMPROMISE'}
    dispute.vendor_replied = True
    dispute.vendor_reply_type = posture_to_reply_type[posture]
    dispute.vendor_reply_text = texte
    dispute.vendor_replied_at = timezone.now()
    dispute.vendor_arrangement_type = (
        Dispute.ArrangementType.REMPLACEMENT if arrangement == 'remplacement'
        else Dispute.ArrangementType.REMISE if arrangement == 'remise'
        else None
    )
    dispute.draft_answer = None

    issue = 'attente'
    fields = [
        'vendor_replied', 'vendor_reply_type', 'vendor_reply_text', 'vendor_replied_at',
        'vendor_arrangement_type', 'draft_answer', 'status', 'updated_at',
    ]

    if posture == 'accepte':
        # Feuille de route D18 : « Déclencher le remboursement quand le colis est récupéré et contrôlé, pas à la
        # demande. » L'acceptation ouvre un retour approuvé, déposé au point relais par défaut ; le remboursement
        # part à l'inspection, ou d'office r_inspection_h après la réception (R68.1, commande traiter_retours).
        from apps.orders.models import Return

        Return.objects.get_or_create(
            order=dispute.order, order_item=dispute.order_item, requested_by=dispute.opened_by,
            defaults={'vendor': vendor, 'reason': dispute.reason if dispute.reason in Return.Reason.values else
                      Return.Reason.NOT_AS_DESCRIBED, 'description': dispute.description,
                      'status': Return.Status.AWAITING_DROPOFF, 'reviewed_by': vendor, 'reviewed_at': timezone.now(),
                      'review_note': "Litige accepté par le vendeur (R70.1)."},
        )
        dispute.status = 'RESOLVED'
        dispute.resolution = 'REFUND'
        dispute.resolution_note = "Accepté par le vendeur : remboursement au retour du colis inspecté (R68.1)."
        dispute.resolved_at = timezone.now()
        dispute.resolved_by = vendor
        issue = 'accepte'
        fields += ['status', 'resolution', 'resolution_note', 'resolved_at', 'resolved_by']
    else:
        # conteste / arrangement : la décision finale reste BelivaY (DP-35) — pas d'arbitrage
        # automatique ici. admin_resolve_dispute (existant, inchangé) tranche ensuite.
        dispute.status = 'IN_PROGRESS'

    dispute.save(update_fields=list(dict.fromkeys(fields)))

    return Response({'ok': True, 'issue': issue})


@extend_schema(tags=["Vendors"], summary="Recours du vendeur sur un litige perdu (espace vendeur VD-07)")
@api_view(['POST'])
@permission_classes([IsAuthenticated])
@idempotent_vendor
def dispute_appeal(request, ref):
    _, err = _require_active_vendor(request)
    if err:
        return err
    dispute = find_dispute_by_ref(request.user, ref)
    if not dispute:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if dispute.appeal_filed_at:
        return Response({'ok': False, 'raison': 'deja_contestee'})
    decision = _build_decision(dispute)
    if not decision or decision['issue'] != 'perdu':
        return Response({'ok': False, 'raison': 'non_contestable'})
    recours = _build_recours(dispute)
    if not recours['possible']:
        return Response({'ok': False, 'raison': 'delai_depasse'})

    texte = (request.data.get('texte') or '').strip()
    if len(texte) < C.LIT_ARRANGEMENT_MIN_CHARS:
        # Aucun seuil dédié (LIT-RECOURS-MIN) trouvé dans le dépôt : réutilise par prudence le
        # seul seuil de longueur confirmé (arrangement, 40 caractères) pour éviter un recours
        # vide — à ajuster si un seuil propre au recours est confirmé.
        return Response({'ok': False, 'raison': 'trop_court'})

    dispute.appeal_text = texte
    dispute.appeal_filed_at = timezone.now()
    dispute.appeal_filed_by = request.user
    dispute.appeal_outcome = Dispute.AppealOutcome.PENDING
    dispute.save(update_fields=['appeal_text', 'appeal_filed_at', 'appeal_filed_by', 'appeal_outcome', 'updated_at'])
    return Response({'ok': True})
