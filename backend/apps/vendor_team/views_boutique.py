# backend/apps/vendor_team/views_boutique.py
# Emplacements et demandes de modification (INTEGRATION-API.md §8, vague « équipe » du 6 oct.). Backend
# seulement : le branchement frontend de ces méthodes vit dans src/api/domaines/boutique.ts (domaine
# « boutique »), hors du périmètre de cet agent (session/compte/équipe) — voir le rapport final pour le
# détail à donner à l'agent propriétaire de ce fichier.
#
# Réutilise vendors.VendorLocation (ÉTAPE 1 du mandat : ce modèle existe déjà) plutôt que de le dupliquer ;
# seuls les champs que le nouveau contrat exige en plus (type de lieu, horaires, vérification GPS) vivent
# dans un modèle séparé propre à cette app. Les demandes de modification utilisent en revanche un modèle
# DÉDIÉ (VendorChangeRequest), et non vendors.ShopModificationRequest (déjà utilisé par un flux admin
# existant à granularité différente) : voir models.py pour la justification détaillée de ce choix.

from datetime import timedelta

from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.client_core.masquage import masquer_numero
from apps.vendors.models import VendorLocation

from . import services
from .common import vendeur_actif
from .models import (
    VendorChangeRequest,
    VendorLocationMeta,
    VendorLocationVerification,
    VendorOwnerSecurityCode,
)

TAG = ["Vendors"]


def _ms(dt):
    return int(dt.timestamp() * 1000) if dt else None


def _jour(dt):
    return dt.date().isoformat() if dt else None


def _envoyer_code(vendor, motif):
    code = services.generer_code(VendorOwnerSecurityCode.LONGUEUR)
    enregistrement = VendorOwnerSecurityCode(
        vendor=vendor, motif=motif, expires_at=timezone.now() + timedelta(minutes=VendorOwnerSecurityCode.VALIDE_MINUTES),
    )
    enregistrement.set_code(code)
    enregistrement.save()
    if vendor.phone:
        services.envoyer_code_sms(vendor.phone, code, VendorOwnerSecurityCode.VALIDE_MINUTES)
    return enregistrement


def _code_valide(vendor, motif, code):
    enregistrement = VendorOwnerSecurityCode.objects.filter(
        vendor=vendor, motif=motif, target_employee__isnull=True, used_at__isnull=True,
    ).order_by("-created_at").first()
    return enregistrement is not None and enregistrement.check_code(code)


# ── Lieux ────────────────────────────────────────────────────────────────────────────────────────────────


def _lieu_payload(location: VendorLocation) -> dict:
    meta = getattr(location, "meta_nouveau_frontend", None)
    attente = getattr(location, "verification_en_attente", None)
    return {
        "id": str(location.id),
        "nom": location.name,
        "type": meta.type_lieu if meta else VendorLocationMeta.TypeLieu.AUTRE,
        "principal": location.is_main,
        "position": {
            "lat": float(location.latitude) if location.latitude is not None else None,
            "lon": float(location.longitude) if location.longitude is not None else None,
        },
        "zone": None,  # calcul de zone à partir du point : hors du périmètre de cet agent
        "quartier": None,
        "adresse": location.address,
        "repere": location.description,
        "horaires": meta.horaires if meta else None,
        "statut": "a_verifier" if attente else "verifie",
        "point": {
            "poseLe": _jour(location.created_at),
            "verifieLe": None if attente else _jour(location.updated_at),
            "enAttente": (
                {"lat": float(attente.lat_attente), "lon": float(attente.lon_attente), "a": _ms(attente.created_at)}
                if attente else None
            ),
        },
        "centre": None,  # centres BelivaY (GET /hubs) : non intégrés par ce mandat
    }


@extend_schema(tags=TAG, summary="Shop — list locations, or create one")
@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def shop_locations(request):
    vendor = vendeur_actif(request)
    if request.method == "GET":
        return Response(_shop_locations_payload(vendor))
    return _shop_locations_create(request, vendor)


def _shop_locations_payload(vendor) -> dict:
    locations = VendorLocation.objects.filter(vendor=vendor, is_active=True).select_related(
        "meta_nouveau_frontend", "verification_en_attente",
    ).order_by("-is_main", "name")
    return {
        "lieux": [_lieu_payload(l) for l in locations],
        "max": services.VD_LIEUX_MAX,
        "centres": [],  # GET /hubs, non intégré (voir rapport)
    }


def _shop_locations_create(request, vendor):
    nom = str(request.data.get("nom") or "").strip()
    type_lieu = str(request.data.get("type") or "autre").strip()
    adresse = str(request.data.get("adresse") or "").strip()
    repere = str(request.data.get("repere") or "").strip()
    horaires = request.data.get("horaires")
    position = request.data.get("position") or {}

    if not nom:
        return Response({"ok": False, "raison": "nom"})
    if not repere:
        return Response({"ok": False, "raison": "repere"})
    if position.get("lat") is None or position.get("lon") is None:
        return Response({"ok": False, "raison": "position"})
    if VendorLocation.objects.filter(vendor=vendor, is_active=True).count() >= services.VD_LIEUX_MAX:
        return Response({"ok": False, "raison": "plein"})

    location = VendorLocation.objects.create(
        vendor=vendor, name=nom[:200], address=adresse[:500], description=repere,
        phone=vendor.phone, representative_name="", representative_phone=vendor.phone,
        latitude=position["lat"], longitude=position["lon"],
    )
    VendorLocationMeta.objects.create(
        location=location,
        type_lieu=type_lieu if type_lieu in VendorLocationMeta.TypeLieu.values else VendorLocationMeta.TypeLieu.AUTRE,
        horaires=horaires,
    )
    return Response({"ok": True, "lieu": _lieu_payload(location)}, status=201)


@extend_schema(tags=TAG, summary="Shop — edit a location")
@api_view(["PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def shop_location_update(request, location_id):
    vendor = vendeur_actif(request)
    location = VendorLocation.objects.filter(id=location_id, vendor=vendor).first()
    if location is None:
        return Response({"ok": False, "raison": "introuvable"})

    if request.method == "DELETE":
        if location.is_main:
            return Response({"ok": False, "raison": "principal"})
        location.delete()
        return Response({"ok": True, "lieux": _shop_locations_payload(vendor)})

    if "nom" in request.data:
        nom = str(request.data["nom"]).strip()
        if not nom:
            return Response({"ok": False, "raison": "nom"})
        location.name = nom[:200]
    if "adresse" in request.data:
        location.address = str(request.data["adresse"])[:500]
    if "repere" in request.data:
        repere = str(request.data["repere"]).strip()
        if not repere:
            return Response({"ok": False, "raison": "repere"})
        location.description = repere
    location.save()

    if "horaires" in request.data:
        meta, _c = VendorLocationMeta.objects.get_or_create(location=location)
        meta.horaires = request.data["horaires"]
        meta.save(update_fields=["horaires"])

    return Response({"ok": True, "lieu": _lieu_payload(location)})


@extend_schema(tags=TAG, summary="Shop — move a location's GPS point")
@api_view(["PUT"])
@permission_classes([IsAuthenticated])
def shop_location_point(request, location_id):
    vendor = vendeur_actif(request)
    location = VendorLocation.objects.filter(id=location_id, vendor=vendor).first()
    if location is None:
        return Response({"ok": False, "raison": "introuvable"})

    lat, lon = request.data.get("lat"), request.data.get("lon")
    if lat is None or lon is None:
        return Response({"ok": False, "raison": "introuvable"})

    if location.latitude is not None and location.longitude is not None:
        metres = services.distance_metres(location.latitude, location.longitude, lat, lon)
    else:
        metres = 0

    if metres > services.SEUIL_DEPLACEMENT_METRES:
        VendorLocationVerification.objects.update_or_create(
            location=location, defaults={"lat_attente": lat, "lon_attente": lon, "metres": metres},
        )
        nouvelle_verification = True
    else:
        location.latitude, location.longitude = lat, lon
        location.save(update_fields=["latitude", "longitude", "updated_at"])
        VendorLocationVerification.objects.filter(location=location).delete()
        nouvelle_verification = False

    return Response({
        "ok": True, "lieu": _lieu_payload(location), "nouvelleVerification": nouvelle_verification, "metres": metres,
    })


@extend_schema(tags=TAG, summary="Shop — request a code to change the main location")
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def shop_locations_principal_code(request):
    vendor = vendeur_actif(request)
    _envoyer_code(vendor, VendorOwnerSecurityCode.Motif.LIEU_PRINCIPAL)
    return Response({"masque": masquer_numero(vendor.phone)})


@extend_schema(tags=TAG, summary="Shop — make a location the main one")
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def shop_location_make_principal(request, location_id):
    vendor = vendeur_actif(request)
    location = VendorLocation.objects.filter(id=location_id, vendor=vendor).first()
    if location is None:
        return Response({"ok": False, "raison": "introuvable"})
    if hasattr(location, "verification_en_attente"):
        return Response({"ok": False, "raison": "a_verifier"})

    code = str(request.data.get("code") or "").strip()
    if not _code_valide(vendor, VendorOwnerSecurityCode.Motif.LIEU_PRINCIPAL, code):
        return Response({"ok": False, "raison": "code"})

    location.is_main = True
    location.save()  # VendorLocation.save() retire le is_main des autres lieux (déjà prévu par ce modèle)
    return Response({"ok": True, "lieux": _shop_locations_payload(vendor)})


@extend_schema(tags=TAG, summary="Shop — BelivaY hubs (relay points / zone centers)")
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def hubs_list(request):
    # Non intégré par ce mandat (pas de croisement relais/zones exploitées dans ce périmètre) : liste vide,
    # plutôt qu'une donnée inventée. Voir le rapport final.
    return Response([])


# ── Demandes de modification ────────────────────────────────────────────────────────────────────────────

_CHAMP_VERS_VENDOR_FIELD = {
    VendorChangeRequest.Champ.NOM: "business_name",
}


def _demande_payload(d: VendorChangeRequest) -> dict:
    historique = [{"a": _ms(d.created_at), "texte": "Demande envoyée", "par": "vous"}]
    if d.decided_at:
        historique.append({
            "a": _ms(d.decided_at),
            "texte": d.motif_refus if d.status == VendorChangeRequest.Status.REFUSEE else "Demande acceptée",
            "par": "belivay",
        })
    return {
        "id": str(d.id),
        "champ": d.champ,
        "avant": d.avant or None,
        "valeur": d.valeur,
        "motif": d.motif,
        "pieces": d.pieces,
        "statut": {
            VendorChangeRequest.Status.EN_ATTENTE: "en_attente",
            VendorChangeRequest.Status.ACCEPTEE: "acceptee",
            VendorChangeRequest.Status.REFUSEE: "refusee",
            VendorChangeRequest.Status.ANNULEE: "annulee",
        }[d.status],
        "creeeLe": _ms(d.created_at),
        "reponseAvant": _ms(d.created_at + timedelta(hours=72)),  # VD-CONTESTATION-REPONSE : 72h ouvrées
        # approximées (jours calendaires) — clé de registre non versée à ce jour, voir rapport.
        "historique": historique,
        "motifRefus": d.motif_refus or None,
    }


@extend_schema(tags=TAG, summary="Shop — list change requests, or submit one")
@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def shop_change_requests(request):
    vendor = vendeur_actif(request)
    if request.method == "POST":
        return _shop_change_requests_create(request, vendor)
    demandes = VendorChangeRequest.objects.filter(vendor=vendor)
    return Response([_demande_payload(d) for d in demandes])


@extend_schema(tags=TAG, summary="Shop — request a code before a change request")
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def shop_change_requests_code(request):
    vendor = vendeur_actif(request)
    _envoyer_code(vendor, VendorOwnerSecurityCode.Motif.CHANGE_REQUEST)
    return Response({"masque": masquer_numero(vendor.phone)})


def _shop_change_requests_create(request, vendor):
    champ = str(request.data.get("champ") or "").strip()
    valeur = str(request.data.get("valeur") or "").strip()
    motif = str(request.data.get("motif") or "").strip()
    pieces = request.data.get("pieces") or []
    rccm = str(request.data.get("rccm") or "").strip()
    niu = str(request.data.get("niu") or "").strip()
    code = str(request.data.get("code") or "").strip()

    if champ not in VendorChangeRequest.Champ.values:
        return Response({"ok": False, "raison": "valeur"})
    if not valeur:
        return Response({"ok": False, "raison": "valeur"})
    if not motif:
        return Response({"ok": False, "raison": "motif"})
    if not pieces:
        return Response({"ok": False, "raison": "pieces"})
    if champ == VendorChangeRequest.Champ.OFFICIEL and not rccm:
        return Response({"ok": False, "raison": "rccm"})
    if champ == VendorChangeRequest.Champ.OFFICIEL and not niu:
        return Response({"ok": False, "raison": "niu"})
    if VendorChangeRequest.objects.filter(
        vendor=vendor, champ=champ, status=VendorChangeRequest.Status.EN_ATTENTE,
    ).exists():
        return Response({"ok": False, "raison": "deja"})
    if not _code_valide(vendor, VendorOwnerSecurityCode.Motif.CHANGE_REQUEST, code):
        return Response({"ok": False, "raison": "code"})

    avant = ""
    field = _CHAMP_VERS_VENDOR_FIELD.get(champ)
    if field:
        avant = getattr(vendor, field, "") or ""

    demande = VendorChangeRequest.objects.create(
        vendor=vendor, champ=champ, avant=avant[:255], valeur=valeur[:255], rccm=rccm[:60], niu=niu[:60],
        motif=motif, pieces=pieces,
    )
    return Response({"ok": True, "demande": _demande_payload(demande)}, status=201)


@extend_schema(tags=TAG, summary="Shop — cancel a pending change request")
@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def shop_change_request_cancel(request, request_id):
    vendor = vendeur_actif(request)
    demande = VendorChangeRequest.objects.filter(id=request_id, vendor=vendor).first()
    if demande is None:
        return Response({"ok": False, "raison": "introuvable"})
    if demande.status != VendorChangeRequest.Status.EN_ATTENTE:
        return Response({"ok": False, "raison": "etat"})
    demande.status = VendorChangeRequest.Status.ANNULEE
    demande.decided_at = timezone.now()
    demande.save(update_fields=["status", "decided_at"])
    return Response({"ok": True, "demande": _demande_payload(demande)})
