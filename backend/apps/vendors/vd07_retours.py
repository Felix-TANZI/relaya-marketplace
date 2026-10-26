# backend/apps/vendors/vd07_retours.py
# Domaine « retours » de l'espace vendeur (espace-client-belivay/espace-vendeur) — VD-07.
# Contrat exact : src/donnees/domaines/retours.ts + src/api/domaines/retours.ts (déjà livrés).
# Réutilise apps.orders.models.Return (modèle déjà en production, vu par l'ancien vendor_return_list
# / vendor_return_review) et le même pattern de preuve que les litiges (apps.orders.evidence),
# simplement appliqué à un nouveau modèle léger ReturnPhoto plutôt qu'à DisputeEvidence.
#
# Dans le NOUVEAU flux VD-07, le retour arrive déjà approuvé par BelivaY (triage amont) : les
# statuts REQUESTED/REJECTED (ancien flux vendor_return_review, encore utilisé par
# frontend/src/features/vendors/SellerOrderDetailPage.tsx) sont donc exclus de cette liste —
# seuls les retours déjà engagés (AWAITING_DROPOFF et après) sont pertinents pour cet écran.
#
# Valeurs numériques (RET-*) : voir backend/apps/vendors/vd07_constants.py. RET-TRAJET et la part
# de livraison remboursée (livraisonDuColis / livraisonRetour) ne sont calculées nulle part côté
# Django aujourd'hui (le moteur qui les calcule, backend/belivay_moteurs/annulation.py, est le
# prototype du CEO, explicitement hors scope) : Retour.couts est donc toujours `null` tant que
# cela n'est pas confirmé/branché — voir le rapport de cet agent.

import logging
import re

from datetime import timedelta

from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.orders.evidence import create_return_photo, decode_data_uri
from apps.orders.models import Return, ReturnPhoto

from . import vd07_constants as C
from .models import VendorProfile
from .vd07_idempotence import idempotent_vendor

logger = logging.getLogger("apps.vendors.vd07")

_REF_RE = re.compile(r"^BLV-0*(\d+)$", re.IGNORECASE)

# Statuts du pré-triage BelivaY (ancien flux vendor_return_review / admin), pas encore pertinents
# pour l'écran VD-07 (qui ne voit un retour qu'une fois engagé).
_STATUTS_NON_ENGAGES = (Return.Status.REQUESTED, Return.Status.REJECTED)


# ─────────────────────────────────────────────────────────────────────────────
# Outils communs (mêmes conventions que vd07_litiges.py)
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
    return f"BLV-{order_id:05d}"


def _parse_ref(ref: str):
    m = _REF_RE.match((ref or '').strip())
    return int(m.group(1)) if m else None


def _ms(dt):
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


def find_return_by_ref(vendor, ref: str):
    order_id = _parse_ref(ref)
    if order_id is None:
        return None
    return (
        Return.objects.filter(order_id=order_id, vendor=vendor)
        .exclude(status__in=_STATUTS_NON_ENGAGES)
        .select_related('order', 'order_item', 'order_item__product', 'order_item__product__category')
        .prefetch_related('photos__uploaded_by')
        .order_by('-created_at')
        .first()
    )


def _item_amount(ret) -> int:
    """Montant de l'article retourné (proxy de 'gele' — voir vd07_litiges._vendor_amount_at_stake)."""
    return int(ret.order_item.line_total_xaf or 0)


def _order_delivered_at(order):
    """Meilleure estimation de la remise réelle de la commande (retireA).

    Aucun champ dédié `delivered_at` n'existe sur Order/Shipment aujourd'hui : on cherche
    d'abord un ShipmentEvent de remise, sinon on retombe sur order.updated_at si le statut
    indique une livraison confirmée, sinon order.created_at. À remplacer si un champ dédié
    apparaît côté domaine commandes/livraison."""
    try:
        from apps.shipping.models import ShipmentEvent
        ev = (
            ShipmentEvent.objects
            .filter(shipment__order=order, status__in=['DELIVERED', 'CUSTOMER_DELIVERY', 'BUYER_CONFIRMED'])
            .order_by('created_at')
            .first()
        )
        if ev:
            return ev.created_at
    except Exception:
        logger.exception("Lecture ShipmentEvent impossible pour estimer retireA — commande #%s.", order.id)
    if order.fulfillment_status in ('DELIVERED', 'BUYER_CONFIRMED', 'AUTO_CONFIRMED', 'RELEASED_TO_VENDOR'):
        return order.updated_at
    return order.created_at


# ─────────────────────────────────────────────────────────────────────────────
# Construction du Retour (voir src/donnees/domaines/retours.ts)
# ─────────────────────────────────────────────────────────────────────────────

_CATEGORIE_PAR_REASON = {
    'DAMAGED': 'abime',
    'COUNTERFEIT': 'contrefacon',
    'HIDDEN_DEFECT': 'defaut_cache',
    'NOT_AS_DESCRIBED': 'non_conforme',
    'WRONG_ITEM': 'non_conforme',
    'OTHER': 'non_conforme',
}

_ETAT_PAR_SUITE = {'en_route': 'en_route', 'rembourse': 'clos'}


def _build_suite(ret) -> dict:
    if ret.status in (Return.Status.REFUNDED, Return.Status.CLOSED_NO_REFUND):
        return {'type': 'rembourse', 'le': _ms(ret.updated_at), 'auto': False}
    if ret.status == Return.Status.REPLACEMENT_READY:
        return {'type': 'remplacement', 'expedierAvant': _ms(ret.replacement_ship_deadline), 'pretA': _ms(ret.replacement_ready_at)}
    if ret.status == Return.Status.REPLACEMENT_PENDING:
        return {'type': 'remplacement', 'expedierAvant': _ms(ret.replacement_ship_deadline), 'pretA': None}
    if ret.status == Return.Status.MEDIATION:
        base = ret.inspected_at or ret.received_at or ret.updated_at
        return {'type': 'mediation', 'decisionAvant': _ms(base + timedelta(hours=C.LIT_DECISION_H))}
    if ret.received_at is None:
        return {'type': 'en_route'}
    if ret.inspection_passed is None:
        return {'type': 'a_inspecter'}
    # inspection_passed == True (défaut confirmé) et aucun remède choisi encore
    return {'type': 'a_choisir'}


def _build_article(ret) -> dict:
    product = ret.order_item.product
    image_url = ''
    img = product.images.filter(is_primary=True).first() or product.images.first()
    if img and img.image:
        image_url = img.image.url
    return {
        'offreId': str(product.id),
        'titre': ret.order_item.title_snapshot,
        'variante': '',
        'etat': product.condition.name if product.condition_id else '',
        'dessin': image_url,
        'categorie': product.category.name if product.category_id else '',
    }


def _product_stock(product) -> int:
    """Product n'a pas de quantité directe : le stock vit dans Inventory (OneToOne,
    apps.catalog.models), comme pour le reste de l'espace vendeur (ex. PUT /offers/{id} {stock})."""
    inv = getattr(product, 'inventory', None)
    return inv.quantity if inv else 0


def _build_remplacement(ret) -> dict:
    product = ret.order_item.product
    image_url = ''
    img = product.images.filter(is_primary=True).first() or product.images.first()
    if img and img.image:
        image_url = img.image.url
    return {
        'offreId': str(product.id),
        'titre': product.title,
        'variante': '',
        'dessin': image_url,
        'stock': _product_stock(product),
    }


def _build_photo(photo) -> dict:
    return {
        'id': str(photo.id),
        'photo': photo.file.url if photo.file else '',
        'quoi': 'vendeur',
        'a': _ms(photo.created_at),
        'ajouteePar': _display_name(photo.uploaded_by),
        'retirable': ret_inspection_is_open(photo.return_obj),
    }


def ret_inspection_is_open(ret) -> bool:
    return ret.inspection_passed is None


def _build_inspection(ret):
    if ret.inspection_passed is None:
        return None
    return {
        'verdict': 'conforme' if ret.inspection_passed else 'non_conforme',
        'controles': ret.inspection_controles or {'scelle': False, 'serie': False},
        'photos': [_build_photo(p) for p in ret.photos.all()],
        'a': _ms(ret.inspected_at),
        'par': _display_name(ret.inspected_by),
    }


def _build_journal(ret):
    events = [{'a': _ms(ret.created_at), 'code': 'signale', 'auteur': None, 'detail': ret.description or None}]
    if ret.received_at:
        events.append({'a': _ms(ret.received_at), 'code': 'recu', 'auteur': _display_name(ret.received_by), 'detail': None})
    for p in ret.photos.all():
        events.append({'a': _ms(p.created_at), 'code': 'photo', 'auteur': _display_name(p.uploaded_by), 'detail': None})
    if ret.inspected_at:
        events.append({
            'a': _ms(ret.inspected_at), 'code': 'inspecte', 'auteur': _display_name(ret.inspected_by),
            'detail': ret.inspection_note or None,
        })
    if ret.status == Return.Status.MEDIATION:
        events.append({'a': _ms(ret.inspected_at or ret.updated_at), 'code': 'mediation', 'auteur': None, 'detail': None})
    if ret.replacement_choice == Return.ReplacementChoice.REPLACE:
        events.append({'a': _ms(ret.updated_at), 'code': 'remplacement', 'auteur': _display_name(ret.vendor), 'detail': None})
    if ret.replacement_ready_at:
        events.append({'a': _ms(ret.replacement_ready_at), 'code': 'pret', 'auteur': _display_name(ret.vendor), 'detail': None})
    if ret.status == Return.Status.REFUNDED:
        events.append({'a': _ms(ret.updated_at), 'code': 'rembourse', 'auteur': None, 'detail': None})
    events.sort(key=lambda e: e['a'] or 0)
    return events


def build_retour(ret) -> dict:
    suite = _build_suite(ret)
    etat = _ETAT_PAR_SUITE.get(suite['type'], 'a_decider')
    retire_a = _order_delivered_at(ret.order)
    heures = max(0.0, (ret.created_at - retire_a).total_seconds() / 3600) if retire_a else 0.0
    return {
        'ref': order_ref(ret.order_id),
        'etat': etat,
        'suite': suite,
        'categorie': _CATEGORIE_PAR_REASON.get(ret.reason, 'non_conforme'),
        'motif': ret.get_reason_display(),
        'phraseClient': ret.description,
        'article': _build_article(ret),
        'volumineux': ret.transport_mode == Return.TransportMode.COURIER_PICKUP,
        'gele': None if etat == 'clos' else _item_amount(ret),
        'arrivee': None,  # créneau de dépôt/ramassage pas modélisé côté Django aujourd'hui
        'recuA': _ms(ret.received_at),
        'inspecterAvant': _ms(ret.received_at + timedelta(hours=C.RET_INSPECTION_H)) if ret.received_at else None,
        'retireA': _ms(retire_a),
        'signaleA': _ms(ret.created_at),
        'signalement': {
            'heures': round(heures, 1),
            'limiteH': C.RET_SIGNALEMENT_H,
            'recevable': heures <= C.RET_SIGNALEMENT_H,
        },
        'inspection': _build_inspection(ret),
        'brouillon': ret.draft_inspection or None,
        # RET-TRAJET et la part de livraison (livraisonDuColis) ne sont confirmés/calculés nulle
        # part côté Django : couts reste `null` plutôt qu'un montant inventé (voir rapport).
        'couts': None,
        'remplacement': _build_remplacement(ret),
        'journal': _build_journal(ret),
    }


# ─────────────────────────────────────────────────────────────────────────────
# Vues
# ─────────────────────────────────────────────────────────────────────────────

@extend_schema(tags=["Vendors"], summary="Compteurs retours (espace vendeur VD-07)")
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def return_counts(request):
    _, err = _require_active_vendor(request)
    if err:
        return err
    vendor = request.user
    returns = (
        Return.objects.filter(vendor=vendor)
        .exclude(status__in=_STATUTS_NON_ENGAGES)
        .select_related('order', 'order_item__product')
    )
    items = [build_retour(r) for r in returns]
    return Response({
        'a_decider': sum(1 for it in items if it['etat'] == 'a_decider'),
        'en_route': sum(1 for it in items if it['etat'] == 'en_route'),
        'clos': sum(1 for it in items if it['etat'] == 'clos'),
    })


@extend_schema(tags=["Vendors"], summary="Lister les retours (espace vendeur VD-07)")
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def return_list_v2(request):
    _, err = _require_active_vendor(request)
    if err:
        return err
    vendor = request.user
    returns = (
        Return.objects.filter(vendor=vendor)
        .exclude(status__in=_STATUTS_NON_ENGAGES)
        .select_related('order', 'order_item', 'order_item__product', 'order_item__product__category')
        .prefetch_related('photos__uploaded_by')
    )
    state = request.query_params.get('state')
    items = [build_retour(r) for r in returns]
    if state:
        items = [it for it in items if it['etat'] == state]
    return Response(items)


@extend_schema(tags=["Vendors"], summary="Détail d'un retour (espace vendeur VD-07)")
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def return_detail_v2(request, ref):
    _, err = _require_active_vendor(request)
    if err:
        return err
    ret = find_return_by_ref(request.user, ref)
    if not ret:
        return Response(status=status.HTTP_404_NOT_FOUND)
    return Response(build_retour(ret))


@extend_schema(tags=["Vendors"], summary="Réceptionner un retour (espace vendeur VD-07)")
@api_view(['POST'])
@permission_classes([IsAuthenticated])
@idempotent_vendor
def return_receive(request, ref):
    _, err = _require_active_vendor(request)
    if err:
        return err
    ret = find_return_by_ref(request.user, ref)
    if not ret:
        return Response({'ok': False, 'raison': 'introuvable'})
    if ret.received_at is not None:
        return Response({'ok': False, 'raison': 'deja_recu'})

    ret.received_at = timezone.now()
    ret.received_by = request.user
    if ret.status not in (Return.Status.MEDIATION, Return.Status.REPLACEMENT_PENDING, Return.Status.REPLACEMENT_READY):
        ret.status = Return.Status.RECEIVED
    ret.save(update_fields=['received_at', 'received_by', 'status', 'updated_at'])
    inspecter_avant = ret.received_at + timedelta(hours=C.RET_INSPECTION_H)
    return Response({'ok': True, 'inspecterAvant': _ms(inspecter_avant)})


@extend_schema(tags=["Vendors"], summary="Ajouter une photo d'inspection (espace vendeur VD-07)")
@api_view(['POST'])
@permission_classes([IsAuthenticated])
@idempotent_vendor
def return_photos_add(request, ref):
    _, err = _require_active_vendor(request)
    if err:
        return err
    vendor = request.user
    ret = find_return_by_ref(vendor, ref)
    if not ret:
        return Response({'ok': False, 'raison': 'introuvable'})
    if ret.inspection_passed is not None:
        return Response({'ok': False, 'raison': 'deja_inspecte'})

    upload = decode_data_uri(request.data.get('photo'), filename=f"retour-{ret.id}.jpg")
    if not upload:
        return Response({'detail': 'Format photo invalide : data URI attendu.'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        photo = create_return_photo(return_obj=ret, user=vendor, upload=upload)
    except ValidationError as exc:
        return Response({'detail': exc.detail}, status=status.HTTP_400_BAD_REQUEST)

    ret.updated_at = timezone.now()
    ret.save(update_fields=['updated_at'])
    return Response({'ok': True, 'piece': _build_photo(photo)}, status=status.HTTP_201_CREATED)


@extend_schema(tags=["Vendors"], summary="Retirer une photo d'inspection (espace vendeur VD-07)")
@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def return_photo_remove(request, ref, photo_id):
    _, err = _require_active_vendor(request)
    if err:
        return err
    ret = find_return_by_ref(request.user, ref)
    if not ret:
        return Response(status=status.HTTP_404_NOT_FOUND)
    try:
        photo = ret.photos.get(id=photo_id)
    except ReturnPhoto.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)
    photo.file.delete(save=False)
    photo.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema(tags=["Vendors"], summary="Garder le brouillon d'inspection (espace vendeur VD-07)")
@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def return_draft(request, ref):
    _, err = _require_active_vendor(request)
    if err:
        return err
    ret = find_return_by_ref(request.user, ref)
    if not ret:
        return Response(status=status.HTTP_404_NOT_FOUND)
    ret.draft_inspection = request.data if request.data else None
    ret.save(update_fields=['draft_inspection'])
    return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema(tags=["Vendors"], summary="Trancher l'inspection d'un retour (espace vendeur VD-07)")
@api_view(['POST'])
@permission_classes([IsAuthenticated])
@idempotent_vendor
def return_inspection(request, ref):
    _, err = _require_active_vendor(request)
    if err:
        return err
    ret = find_return_by_ref(request.user, ref)
    if not ret:
        return Response({'ok': False, 'raison': 'introuvable'})
    if ret.received_at is None:
        return Response({'ok': False, 'raison': 'pas_recu'})
    if ret.inspection_passed is not None:
        return Response({'ok': False, 'raison': 'deja_inspecte'})

    verdict = request.data.get('verdict')
    controles = request.data.get('controles') or {}
    photos_count = ret.photos.count()

    if verdict not in ('conforme', 'non_conforme'):
        return Response({'ok': False, 'raison': 'verdict'})
    if not isinstance(controles, dict) or 'scelle' not in controles or 'serie' not in controles:
        return Response({'ok': False, 'raison': 'controles'})
    if photos_count < C.RET_INSPECTION_MIN_PHOTOS:
        return Response({'ok': False, 'raison': 'photos'})

    ret.inspection_passed = (verdict == 'conforme')
    ret.inspection_controles = {'scelle': bool(controles.get('scelle')), 'serie': bool(controles.get('serie'))}
    ret.inspected_at = timezone.now()
    ret.inspected_by = request.user
    ret.draft_inspection = None
    ret.status = Return.Status.MEDIATION if verdict == 'non_conforme' else Return.Status.RECEIVED
    ret.save(update_fields=[
        'inspection_passed', 'inspection_controles', 'inspected_at', 'inspected_by',
        'draft_inspection', 'status', 'updated_at',
    ])
    from apps.orders.retours import attribuer_frais_de_retour

    attribuer_frais_de_retour(ret)  # R69.1
    return Response({'ok': True})


@extend_schema(tags=["Vendors"], summary="Choisir remplacement ou remboursement (espace vendeur VD-07)")
@api_view(['POST'])
@permission_classes([IsAuthenticated])
@idempotent_vendor
def return_replacement(request, ref):
    _, err = _require_active_vendor(request)
    if err:
        return err
    vendor = request.user
    ret = find_return_by_ref(vendor, ref)
    if not ret:
        return Response({'ok': False, 'raison': 'introuvable'})
    if ret.replacement_choice is not None or ret.status in (Return.Status.REFUNDED, Return.Status.CLOSED_NO_REFUND):
        return Response({'ok': False, 'raison': 'deja_choisi'})
    if ret.inspection_passed is not True:
        return Response({'ok': False, 'raison': 'pas_conforme'})

    choix = request.data.get('choix')
    if choix not in ('remplacer', 'rembourser'):
        return Response({'detail': 'choix invalide (remplacer|rembourser).'}, status=status.HTTP_400_BAD_REQUEST)

    if choix == 'rembourser':
        montant = _item_amount(ret)
        ret.replacement_choice = Return.ReplacementChoice.REFUND
        ret.status = Return.Status.REFUNDED
        ret.refund_amount_xaf = montant
        ret.save(update_fields=['replacement_choice', 'status', 'refund_amount_xaf', 'updated_at'])
        try:
            from apps.payments.bridge import events_in
            from apps.orders.frais import part_frais_momo
            events_in.return_completed(
                order_id=ret.order_id, outcome='REFUND', refund_amount_xaf=montant,
                frais_momo_xaf=part_frais_momo(ret.order, montant),  # R72.1 : retour validé
                event_id=f"return-{ret.id}-vendor-refund",
                emitter="apps.vendors.vd07_retours.return_replacement",
            )
        except Exception:
            logger.exception("Evenement return_completed (remboursement vendeur) non transmis — retour #%s.", ret.id)
        return Response({'ok': True})

    from apps.catalog.models import Inventory

    product = ret.order_item.product
    inventory, _created = Inventory.objects.get_or_create(product=product)
    if inventory.quantity < 1:
        return Response({'ok': False, 'raison': 'stock'})

    # "remplacer réserve une unité du stock" (api/routes/retours.ts) — décrément direct, pas de
    # file de réservation séparée construite ici (hors scope litiges/retours).
    inventory.quantity = inventory.quantity - 1
    inventory.save(update_fields=['quantity'])

    deadline = timezone.now() + timedelta(hours=C.RET_REMPLACEMENT_DELAI_H)
    ret.replacement_choice = Return.ReplacementChoice.REPLACE
    ret.status = Return.Status.REPLACEMENT_PENDING
    ret.replacement_ship_deadline = deadline
    ret.save(update_fields=['replacement_choice', 'status', 'replacement_ship_deadline', 'updated_at'])
    return Response({'ok': True, 'expedierAvant': _ms(deadline)})


@extend_schema(tags=["Vendors"], summary="Signaler le remplacement prêt (espace vendeur VD-07)")
@api_view(['POST'])
@permission_classes([IsAuthenticated])
@idempotent_vendor
def return_replacement_ready(request, ref):
    _, err = _require_active_vendor(request)
    if err:
        return err
    ret = find_return_by_ref(request.user, ref)
    if not ret:
        return Response({'ok': False, 'raison': 'introuvable'})
    if ret.status != Return.Status.REPLACEMENT_PENDING:
        return Response({'ok': False, 'raison': 'introuvable'})

    ret.status = Return.Status.REPLACEMENT_READY
    ret.replacement_ready_at = timezone.now()
    ret.save(update_fields=['status', 'replacement_ready_at', 'updated_at'])
    return Response({'ok': True})
