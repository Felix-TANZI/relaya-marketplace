# backend/apps/vendor_team/views_session.py
# Domaine « session » : le sous-ensemble explicitement confié à cet agent (INTEGRATION-API.md) —
# POST /auth/otp, POST /auth/verify, POST /auth/password-reset, POST /shops, POST /shops/{id}/kyc,
# POST /contract/sign, GET/POST/PUT /assisted-entry*, DELETE /devices/current.
#
# Ce qui N'EST PAS construit ici (hors mandat, voir le rapport final) : POST /auth/login + /auth/2fa (mot
# de passe classique, second facteur d'un appareil inconnu), la suite de l'ouverture en trois étapes
# (GET/POST /shops/current*, payout-number, envoyerPourVerification), l'arrivée depuis l'espace client,
# Face ID. POST /shops ici crée directement le VendorProfile pour un utilisateur déjà authentifié (il n'y
# a pas de parcours non authentifié « ouvrir puis vérifier le numéro » dans ce périmètre) ; KYC et
# signature du contrat supposent donc un compte déjà connecté.

import re
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import NotFound
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from apps.client_core.erreurs import ErreurClient
from apps.client_core.masquage import masquer_numero, numero_local
from apps.otp import services as otp_services
from apps.otp.models import CodeOtp
from apps.vendors.models import VendorLocation, VendorProfile

from . import services
from .common import client_ip, vendeur_ou_404
from .models import (
    VendorAssistedEntry,
    VendorContractSignature,
    VendorShopMeta,
)

TAG = ["Vendors"]


def _ms(dt):
    return int(dt.timestamp() * 1000) if dt else None


# ── Connexion par numéro + code (pré-authentification) ─────────────────────────────────────────────────


@extend_schema(tags=TAG, summary="Session — request a login code by phone number, or poll a pending one")
@api_view(["GET", "POST"])
@permission_classes([AllowAny])
def auth_otp(request):
    if request.method == "GET":
        return auth_otp_poll(request)
    return _auth_otp_request(request)


def _auth_otp_request(request):
    phone_brut = str(request.data.get("telephone") or "").strip()
    canal = str(request.data.get("canal") or "sms").strip()
    device = str(request.data.get("appareil") or "").strip()
    phone = numero_local(phone_brut)
    if not phone or not re.fullmatch(r"6\d{8}", phone):
        return Response({"ok": False, "raison": "numero"})
    # VendorProfile.phone n'est pas toujours stocké au même format (vu sur les données de démonstration :
    # « +237690000001 » au lieu de « 690000001 ») : comparaison sur les 9 derniers chiffres plutôt qu'une
    # égalité stricte, pour ne pas dépendre d'une normalisation que ce mandat ne corrige pas partout.
    profil = VendorProfile.objects.filter(phone__endswith=phone).select_related("user").first()
    if profil is None:
        return Response({"ok": False, "raison": "inconnu"})
    if not device:
        return Response({"ok": False, "raison": "numero"})

    # Feuille de route D6 : un seul système de codes (apps.otp). Le code part au numéro et se range sous l'appareil,
    # que l'écran présente ensuite pour le vérifier.
    try:
        envoi = otp_services.envoyer(objet=CodeOtp.Objet.VENDEUR_CONNEXION, destination=phone, canal=canal,
                                     utilisateur=profil.user, cle=f"appareil:{device[:120]}")
    except ErreurClient as erreur:
        return Response({"ok": False, "raison": "limite",
                         "jusqua": _ms(timezone.now() + timedelta(hours=1)), "detail": erreur.message})
    enregistrement = otp_services.en_cours(objet=CodeOtp.Objet.VENDEUR_CONNEXION, cle=f"appareil:{device[:120]}")
    return Response({"ok": True, "envoi": _envoi_payload(enregistrement, envoi)})


def _envoi_payload(enregistrement, envoi=None) -> dict:
    duree = int((enregistrement.expire_le - enregistrement.cree_le).total_seconds() // 60)
    return {
        "id": str(enregistrement.id),
        "canal": enregistrement.canal,
        "destination": enregistrement.destination_masquee,
        "envoyeA": _ms(enregistrement.cree_le),
        "valideMinutes": (envoi or {}).get("valideMinutes", duree),
        "renvoiSecondes": (envoi or {}).get("renvoiSecondes", 0),
        "renvoisRestants": 0,
    }


def auth_otp_poll(request):
    device = str(request.query_params.get("appareil") or "").strip()
    if not device:
        raise NotFound()
    enregistrement = otp_services.en_cours(objet=CodeOtp.Objet.VENDEUR_CONNEXION, cle=f"appareil:{device[:120]}")
    if enregistrement is None:
        raise NotFound()
    return Response(_envoi_payload(enregistrement))


@extend_schema(tags=TAG, summary="Session — verify the login code by phone")
@api_view(["POST"])
@permission_classes([AllowAny])
def auth_verify(request):
    code = str(request.data.get("code") or "").strip()
    device = str(request.data.get("appareil") or "").strip()
    if not device:
        return Response({"ok": False, "raison": "expire"})

    cle = f"appareil:{device[:120]}"
    resultat = otp_services.verifier(objet=CodeOtp.Objet.VENDEUR_CONNEXION, code=code, cle=cle)
    if not resultat.get("ok"):
        if resultat.get("bloqueJusqua"):
            return Response({"ok": False, "raison": "bloque", "jusqua": resultat["bloqueJusqua"]})
        if resultat.get("expire"):
            return Response({"ok": False, "raison": "expire"})
        return Response({"ok": False, "raison": "code", "essaisRestants": resultat.get("essaisRestants", 0)})

    utilise = otp_services.dernier_utilise(objet=CodeOtp.Objet.VENDEUR_CONNEXION, cle=cle)
    profile = VendorProfile.objects.filter(user=utilise.utilisateur).select_related("user").first() if utilise else None
    if profile is None:
        return Response({"ok": False, "raison": "expire"})

    refresh = RefreshToken.for_user(profile.user)
    return Response({"ok": True, "jetons": {"access": str(refresh.access_token), "refresh": str(refresh)}})


# ── Mot de passe oublié (demande seulement : ouverture/confirmation hors mandat) ──────────────────────────


@extend_schema(tags=TAG, summary="Session — request a password reset link")
@api_view(["POST"])
@permission_classes([AllowAny])
def auth_password_reset_request(request):
    identifiant = str(request.data.get("identifiant") or "").strip()
    if not identifiant:
        return Response({"ok": False, "raison": "vide"})

    User = get_user_model()
    user = None
    if "@" in identifiant:
        user = User.objects.filter(email__iexact=identifiant, is_active=True).first()
    else:
        numero = numero_local(identifiant) or identifiant
        profile = VendorProfile.objects.filter(phone__endswith=numero).select_related("user").first()
        user = profile.user if profile else None

    minutes = 15  # LienMotDePasse.valideMinutes (VD03-R04) : constante documentée côté frontend, pas une
    # clé de registre confirmée côté serveur à ce jour (voir PWD_RESET_LINK_TTL_MIN dans session.ts).
    if user is not None:
        from apps.otp import services as otp_services

        jeton, _minutes_otp = otp_services.creer_jeton_mdp(user)
        if user.email:
            from django.conf import settings as dj_settings
            from django.core.mail import send_mail

            site = getattr(dj_settings, "BELIVAY_SITE_URL", "https://belivay.com").rstrip("/")
            send_mail(
                "Nouveau mot de passe — espace vendeur BelivaY",
                f"Pour choisir un nouveau mot de passe, ouvre ce lien (valable {minutes} minutes) :\n"
                f"{site}/vendeur/mdp-nouveau?jeton={jeton}",
                None,
                [user.email],
            )

    return Response({"ok": True, "lien": {"envoyeA": _ms(timezone.now()), "valideMinutes": minutes, "renvoiSecondes": 60}})


# ── Ouverture : POST /shops (déjà authentifié), KYC, signature du contrat ──────────────────────────────────


@extend_schema(tags=TAG, summary="Session — open a shop (creates the vendor profile)")
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def shops_open(request):
    nom = str(request.data.get("nom") or "").strip()
    categorie = str(request.data.get("categorie") or "").strip()
    statut = str(request.data.get("statut") or "particulier").strip()
    telephone = str(request.data.get("telephone") or "").strip()
    point = request.data.get("point") or None
    device = str(request.data.get("appareil") or "").strip()

    if not nom:
        return Response({"ok": False, "raison": "nom"})
    if not categorie:
        return Response({"ok": False, "raison": "categorie"})
    if not telephone or not telephone.isdigit() or len(telephone) != 9 or telephone[0] != "6":
        return Response({"ok": False, "raison": "numero"})

    # Feuille de route D19 : une seule règle d'ouverture pour tous les écrans (apps.vendors.ouverture).
    from apps.vendors.ouverture import Refus, ouvrir_boutique

    try:
        profile = ouvrir_boutique(request.user, nom=nom, telephone=telephone)
    except Refus as refus:
        return Response({"ok": False, "raison": "nom" if refus.raison == "nom_pris" else refus.raison})
    VendorShopMeta.objects.create(
        vendor=profile, categorie=categorie[:80],
        statut=statut if statut in VendorShopMeta.Statut.values else VendorShopMeta.Statut.PARTICULIER,
        device=device[:120],
    )
    if isinstance(point, dict) and point.get("lat") is not None and point.get("lon") is not None:
        VendorLocation.objects.create(
            vendor=profile, name=nom[:200], address="", phone=telephone, representative_name="",
            representative_phone=telephone, latitude=point["lat"], longitude=point["lon"], is_main=True,
        )

    # Feuille de route D6 : code de vérification du numéro par le moteur unique (apps.otp).
    try:
        envoi = otp_services.envoyer(objet=CodeOtp.Objet.VENDEUR_OUVERTURE, destination=telephone,
                                     utilisateur=request.user, exiger_utilisateur=True)
    except ErreurClient:
        envoi = None
    enregistrement = (CodeOtp.objects.filter(objet=CodeOtp.Objet.VENDEUR_OUVERTURE, utilisateur=request.user)
                      .order_by("-cree_le").first())
    return Response({"ok": True, "envoi": _envoi_payload(enregistrement, envoi) if enregistrement else None},
                    status=status.HTTP_201_CREATED)


# Pièces de l'écran vendeur -> types du verrou D19 (apps.vendors.kyc).
PIECES_KYC = {"recto": "CNI_RECTO", "verso": "CNI_VERSO", "selfie": "SELFIE_VIDEO"}


@extend_schema(tags=TAG, summary="Session — submit a KYC piece")
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def shops_kyc(request, shop_id):
    from apps.accounts.compliance import FichierRefuse, deposer_piece
    from apps.accounts.models import ComplianceDocument
    from apps.vendors import kyc

    vendeur_ou_404(request)
    piece = str(request.data.get("piece") or "").strip()
    image = request.data.get("image") or request.FILES.get("image")
    document_type = PIECES_KYC.get(piece)
    if document_type is None or not image:
        return Response({"detail": "Pièce ou image manquante."}, status=400)
    if not hasattr(image, "read"):
        # data: URL ou chemin côté client : pas un fichier, rien à stocker.
        return Response({"ok": False, "raison": "illisible"})

    # Feuille de route D19 : un seul stockage des pièces, celui que lit le verrou de publication et de versement
    # (apps.vendors.kyc) ; accès restreint (ComplianceDocumentFileView), vidéo acceptée pour le selfie.
    try:
        document, _cree = deposer_piece(request.user, ComplianceDocument.OwnerRole.VENDOR, document_type, image)
    except FichierRefuse as erreur:
        return Response({"ok": False, "raison": "illisible", "detail": erreur.message})
    etat = {ComplianceDocument.Status.APPROVED: "verifie", ComplianceDocument.Status.REJECTED: "refuse"}.get(
        document.status, "recu")
    return Response({"ok": True, "dossier": {"piece": piece, "etat": etat, "motif": document.review_note,
                                             "verification": kyc.etat_verification(request.user)}})


@extend_schema(tags=TAG, summary="Session — sign the vendor contract")
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def contract_sign(request):
    vendor = vendeur_ou_404(request)
    immatricule = bool(request.data.get("immatricule"))
    rccm = str(request.data.get("rccm") or "").strip()
    niu = str(request.data.get("niu") or "").strip()

    if hasattr(vendor, "contract_signature"):
        return Response({"ok": False, "raison": "etape"})
    if immatricule and not rccm:
        return Response({"ok": False, "raison": "rccm"})
    if immatricule and not niu:
        return Response({"ok": False, "raison": "niu"})

    VendorContractSignature.objects.create(
        vendor=vendor, immatricule=immatricule, rccm=rccm[:60], niu=niu[:60],
        ip_address=client_ip(request), device=str(request.data.get("appareil") or "")[:120],
    )
    return Response({"ok": True, "dossier": {"ref": f"VD-{vendor.id}", "etape": "signee"}})


# ── Saisie assistée (décision propriétaire seulement : publier reste au domaine produits/offres) ──────────


def _entry_payload(e: VendorAssistedEntry) -> dict:
    return {
        "id": str(e.id), "titre": e.titre, "dessin": e.dessin, "prix": e.prix, "stock": e.stock,
        "photos": e.photos, "controles": e.controles, "rattachee": e.rattachee, "mediane": e.mediane,
        "modifieeA": _ms(e.updated_at) if e.updated_at != e.created_at else None,
    }


def _assisted_entry_payload(vendor) -> dict:
    fiches = VendorAssistedEntry.objects.filter(vendor=vendor, statut=VendorAssistedEntry.Statut.A_VALIDER)
    validees = VendorAssistedEntry.objects.filter(vendor=vendor).exclude(statut=VendorAssistedEntry.Statut.A_VALIDER)[:20]
    return {
        "agent": {"prenom": "", "zone": getattr(vendor.zone, "code", "") if vendor.zone_id else ""},
        "le": timezone.now().date().isoformat(),
        "gratuite": True,
        "premieresBoutiques": 10,
        "prixSession": None,  # tarif non défini par ce mandat (paramètre produit, à confirmer)
        "fiches": [_entry_payload(e) for e in fiches],
        "validees": [
            {"id": str(e.id), "titre": e.titre, "enVerification": e.statut == VendorAssistedEntry.Statut.VALIDEE, "a": _ms(e.updated_at)}
            for e in validees
        ],
        "seuilPrix": {"basPourCent": 50, "hautFois": 3},
    }


@extend_schema(tags=TAG, summary="Session — assisted entry: list drafts")
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def assisted_entry_list(request):
    vendor = vendeur_ou_404(request)
    return Response(_assisted_entry_payload(vendor))


@extend_schema(tags=TAG, summary="Session — assisted entry: approve drafts")
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def assisted_entry_approve(request):
    vendor = vendeur_ou_404(request)
    ids = request.data.get("ids") or []
    VendorAssistedEntry.objects.filter(vendor=vendor, id__in=ids, statut=VendorAssistedEntry.Statut.A_VALIDER).update(
        statut=VendorAssistedEntry.Statut.VALIDEE,
    )
    # La création réelle de l'offre (catalogue, photos) appartient au domaine produits/offres — hors mandat.
    return Response(_assisted_entry_payload(vendor))


@extend_schema(tags=TAG, summary="Session — assisted entry: edit a draft")
@api_view(["PUT"])
@permission_classes([IsAuthenticated])
def assisted_entry_update(request, entry_id):
    vendor = vendeur_ou_404(request)
    fiche = VendorAssistedEntry.objects.filter(vendor=vendor, id=entry_id).first()
    if fiche is None:
        return Response({"detail": "Fiche introuvable."}, status=404)

    prix = request.data.get("prix")
    stock = request.data.get("stock")
    if prix is not None and (not isinstance(prix, (int, float)) or prix < 0):
        return Response({"ok": False, "raison": "prix"})
    if stock is not None and (not isinstance(stock, (int, float)) or stock < 0):
        return Response({"ok": False, "raison": "stock"})

    if prix is not None:
        fiche.prix = int(prix)
    if stock is not None:
        fiche.stock = int(stock)
    fiche.save(update_fields=["prix", "stock", "updated_at"])

    return Response({"ok": True, "saisie": _assisted_entry_payload(vendor)})


# ── DELETE /devices/current ─────────────────────────────────────────────────────────────────────────────
# Réutilise apps.accounts.UserSession (branché la nuit du 11→12 oct., générique à tous les rôles) plutôt
# que d'inventer un deuxième système « appareil » — demande explicite du mandat.


@extend_schema(tags=TAG, summary="Session — forget this device (end the current session)")
@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def devices_current_forget(request):
    from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken

    from apps.accounts.models import UserSession

    current_jti = str(getattr(request.auth, "payload", {}).get("jti", ""))
    if current_jti:
        try:
            outstanding = OutstandingToken.objects.filter(jti=current_jti).first()
            if outstanding:
                BlacklistedToken.objects.get_or_create(token=outstanding)
        except Exception:
            pass
        UserSession.objects.filter(jti=current_jti).update(is_active=False)

    return Response({"ok": True})
