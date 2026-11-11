# backend/apps/vendors/views_inscription.py
# DEV-SRV-01, T07-1 — inscription seule du vendeur (seller.belivay.com). La logique vit dans
# apps.vendors.inscription_seule ; ici, seulement la lecture de la requête.
#
#   POST /api/vendors/inscription/code   envoyer le code au numéro
#   POST /api/vendors/inscription        vérifier le code, créer le compte et la boutique (EN ATTENTE)
#
# Connecté (client qui devient vendeur, D19), la boutique s'ouvre sur son compte, sans mot de passe à choisir.
#
# Publiques (personne n'a encore de compte), donc limitées comme les autres envois de codes (portée « otp »), en plus
# des limites métier du moteur de codes (OTP-RENVOI, OTP-ESSAIS).

from drf_spectacular.utils import extend_schema
from rest_framework import serializers, status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import SimpleRateThrottle

from . import inscription_seule
from .ouverture import Refus

TAG = ["Inscription vendeur"]


class _Limite(SimpleRateThrottle):
    """Même débit que les envois de codes de l'espace client (DEFAULT_THROTTLE_RATES["otp"]), par adresse IP."""
    scope = "otp"

    def get_cache_key(self, request, view):
        return self.cache_format % {"scope": "inscription-vendeur", "ident": self.get_ident(request)}


class DemandeCodeSerializer(serializers.Serializer):
    telephone = serializers.CharField()


class EnvoiSerializer(serializers.Serializer):
    destination = serializers.CharField(help_text="Numéro masqué.")
    valideMinutes = serializers.IntegerField()
    renvoiSecondes = serializers.IntegerField()


class InscriptionSeuleSerializer(serializers.Serializer):
    telephone = serializers.CharField()
    code = serializers.CharField()
    nom = serializers.CharField(help_text="Nom de la boutique.")
    quartier = serializers.CharField(help_text="Nom d'un quartier de t_quartiers.")
    mot_de_passe = serializers.CharField(required=False, help_text="Sans compte connecté seulement.")
    latitude = serializers.FloatField(required=False, allow_null=True)
    longitude = serializers.FloatField(required=False, allow_null=True)
    reperes = serializers.CharField(required=False)


class InscriptionFaiteSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    boutique = serializers.CharField()
    statut = serializers.CharField()
    identifiant = serializers.CharField(help_text="Le numéro sert d'identifiant de connexion.")


class RefusInscriptionSerializer(serializers.Serializer):
    raison = serializers.CharField()
    detail = serializers.CharField()


def _refus(refus: Refus, code=status.HTTP_400_BAD_REQUEST):
    return Response({"raison": refus.raison, "detail": refus.message},
                    status=status.HTTP_429_TOO_MANY_REQUESTS if refus.raison == "limite" else code)


def _point(valeur):
    if valeur in (None, ""):
        return None
    try:
        return round(float(valeur), 6)
    except (TypeError, ValueError):
        return None


@extend_schema(tags=TAG, summary="Vendor sign-up — send the code to the phone number",
               operation_id="inscription_vendeur_code", request=DemandeCodeSerializer,
               responses={200: EnvoiSerializer, 400: RefusInscriptionSerializer, 429: RefusInscriptionSerializer})
@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([_Limite])
def inscription_code(request):
    try:
        envoi = inscription_seule.demander_code(str(request.data.get("telephone") or ""), user=request.user)
    except Refus as refus:
        return _refus(refus)
    return Response({"destination": envoi["destination"], "valideMinutes": envoi["valideMinutes"],
                     "renvoiSecondes": envoi["renvoiSecondes"]})


@extend_schema(tags=TAG, summary="Vendor sign-up — verify the code, create the account and the shop (pending)",
               operation_id="inscription_vendeur", request=InscriptionSeuleSerializer,
               responses={201: InscriptionFaiteSerializer, 400: RefusInscriptionSerializer})
@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([_Limite])
def inscription(request):
    d = request.data
    try:
        profil = inscription_seule.inscrire(
            telephone=str(d.get("telephone") or ""), code=str(d.get("code") or ""), nom=str(d.get("nom") or ""),
            quartier=str(d.get("quartier") or ""), mot_de_passe=str(d.get("mot_de_passe") or ""),
            latitude=_point(d.get("latitude")), longitude=_point(d.get("longitude")),
            reperes=str(d.get("reperes") or ""), user=request.user,
        )
    except Refus as refus:
        return _refus(refus)
    return Response({"id": profil.id, "boutique": profil.business_name, "statut": profil.status,
                     "identifiant": profil.phone}, status=status.HTTP_201_CREATED)
