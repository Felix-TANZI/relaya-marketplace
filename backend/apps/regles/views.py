# backend/apps/regles/views.py
# Lecture des tables t_… en vigueur pour les écrans d'administration (ex. liste des univers d'une fiche maître).

from drf_spectacular.utils import extend_schema
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response

from . import services


@extend_schema(tags=["Admin"], summary="Table t_… en vigueur (spécification v2.1)")
@api_view(["GET"])
@permission_classes([IsAdminUser])
def table(request, nom):
    try:
        return Response({"nom": nom, "lignes": services.table(nom)})
    except services.ReglageAbsent:
        return Response({"detail": f"Table « {nom} » inconnue."}, status=404)
