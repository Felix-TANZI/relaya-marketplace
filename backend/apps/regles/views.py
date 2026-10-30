# backend/apps/regles/views.py
# Lecture des tables t_… en vigueur : par la console (toutes), et par les écrans client, vendeur et relais pour celles
# qui ne disent rien de confidentiel (grille de garde, créneaux, univers, formats de colis).

from drf_spectacular.utils import extend_schema
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from . import services

TABLES_PUBLIQUES = {"t_garde", "t_creneaux", "t_univers", "t_formats"}


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
