# backend/apps/payments/api/webhooks/views.py
# Endpoint public de reception des webhooks.
#
# L'ENDPOINT EST VOLONTAIREMENT MINCE : il journalise, delegue, et repond.
# Aucune logique metier ici. Un endpoint qui travaille longtemps provoque
# des timeouts cote prestataire, donc des renvois, donc des doublons.
#
# Il repond 200 des que le message est enregistre — meme rejete —, pour que
# CamPay cesse de retenter. Le statut reel est dans le journal, pas dans le
# code HTTP.

import logging

from django.views.decorators.csrf import csrf_exempt
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView

from apps.payments.webhooks.receiver import handle

logger = logging.getLogger("apps.payments.webhooks")


class WebhookThrottle(AnonRateThrottle):
    """Couche 2 — limitation de debit dediee."""
    scope = "payments_webhook"
    rate = "120/min"


@extend_schema(
    tags=["Payments"],
    summary="Webhook CamPay",
    description=(
        "Endpoint public de reception des callbacks CamPay. "
        "Le contenu recu n'est JAMAIS cru : le prestataire est re-interroge "
        "et c'est cette reponse qui fait foi."
    ),
    responses={200: None},
)
class CampayWebhookView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [WebhookThrottle]
    authentication_classes = []

    @csrf_exempt
    def dispatch(self, request, *args, **kwargs):
        return super().dispatch(request, *args, **kwargs)

    def get(self, request):
        """CamPay documente le callback en GET."""
        return self._receive(request)

    def post(self, request):
        """Accepte aussi POST, au cas ou la livraison changerait."""
        return self._receive(request)

    def _receive(self, request):
        try:
            evenement = handle(request, provider_code="CAMPAY")
        except Exception as exc:
            # Meme sur incident interne, on repond 200 : CamPay ne doit pas
            # marteler. L'incident est journalise pour l'exploitation.
            logger.exception("Incident lors du traitement d'un webhook CamPay")
            return Response({"received": True}, status=status.HTTP_200_OK)

        return Response(
            {"received": True, "event_id": str(evenement.id), "status": evenement.status},
            status=status.HTTP_200_OK,
        )