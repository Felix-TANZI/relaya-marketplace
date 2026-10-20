# backend/apps/client_core/views.py
from drf_spectacular.utils import extend_schema
from rest_framework.response import Response

from . import interrupteurs
from .vues import VuePublique


@extend_schema(tags=["Espace client · socle"], summary="Interrupteurs de module (CAP-13)")
class Interrupteurs(VuePublique):
    """État des interrupteurs FF-* ; un module fermé répond 404 sur ses routes."""

    def get(self, request):
        return Response(interrupteurs.etat())
