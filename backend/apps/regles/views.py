# backend/apps/regles/views.py
# Lecture des tables t_… en vigueur : par la console (toutes), et par les écrans client, vendeur et relais pour celles
# qui ne disent rien de confidentiel (grille de garde, créneaux, univers, formats de colis).

from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import serializers
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from . import services

TABLES_PUBLIQUES = {"t_garde", "t_creneaux", "t_univers", "t_formats", "t_paliers_relais", "t_paliers_entreprise"}

# DEV-SRV-01, T02-5 / T05 : « aucun montant écrit dans le code ». Les réglages que les écrans AFFICHENT ou font
# respecter avant l'envoi (prix minimum, commission minimale, plafond d'un nouveau vendeur, course de retour) se
# lisent ici au lieu d'être recopiés. Liste fermée : aucun seuil interne (fraude, comptoir, paliers) n'en sort.
REGLAGES_PUBLICS = ("r_prix_min_publiable", "r_com_min", "r_plafond_nouveau", "r_nouveau_seuil", "r_retour",
                    # R07 : livraison offerte au relais dès r_seuil_relais, à hauteur de r_relais (textes du site client)
                    "r_seuil_relais", "r_relais")


@extend_schema(tags=["Admin"], summary="Table t_… en vigueur (spécification v2.1)")
@api_view(["GET"])
@permission_classes([AllowAny])
def table(request, nom):
    from apps.common.droits import a_la_partie

    # Revue du 29/10 (A2) : les tables non publiques s'ouvrent à l'équipe pilotage, pas à tout le personnel.
    if nom not in TABLES_PUBLIQUES and not a_la_partie(request.user, "pilotage"):
        return Response({"detail": "Réservé à la console."}, status=403)
    try:
        return Response({"nom": nom, "lignes": services.table(nom)})
    except services.ReglageAbsent:
        return Response({"detail": f"Table « {nom} » inconnue."}, status=404)


@extend_schema(
    tags=["Regles"], summary="Réglages r_… affichés par les écrans (liste fermée)", operation_id="regles_reglages_publics",
    responses=inline_serializer("ReglagesPublics", {nom: serializers.FloatField() for nom in REGLAGES_PUBLICS}),
)
@api_view(["GET"])
@permission_classes([AllowAny])
def reglages_publics(request):
    return Response({nom: services.reglage(nom) for nom in REGLAGES_PUBLICS})
