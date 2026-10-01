# backend/apps/whatsapp_assistant/webhooks.py
# Point d'entrée public des messages WhatsApp.
#
# L'ENDPOINT EST VOLONTAIREMENT MINCE : il vérifie, délègue, et répond.
#   GET  → vérification de l'abonnement par Meta (hub.challenge)
#   POST → messages des clients, signés par Meta
# Il répond 200 même si le traitement d'un message échoue : sinon Meta
# renverrait le webhook en boucle. L'erreur est dans les journaux.

import hmac
import json
import logging

from django.http import Http404, HttpResponse, HttpResponseBadRequest, HttpResponseForbidden
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from .conf import get_config
from .inbox import receive
from .models import WhatsAppMessage
from .providers import get_provider

logger = logging.getLogger("apps.whatsapp_assistant")


@csrf_exempt
@require_http_methods(["GET", "POST"])
def webhook(request):
    config = get_config()
    if not config.enabled:
        raise Http404("Assistant WhatsApp désactivé.")
    if request.method == "GET":
        return _verify_subscription(request, config)
    return _receive_messages(request, config)


def _verify_subscription(request, config):
    mode = request.GET.get("hub.mode", "")
    token = request.GET.get("hub.verify_token", "")
    challenge = request.GET.get("hub.challenge", "")
    if mode == "subscribe" and config.verify_token and hmac.compare_digest(token, config.verify_token):
        logger.info("Webhook WhatsApp vérifié par le fournisseur.")
        return HttpResponse(challenge, content_type="text/plain")
    logger.warning("Vérification du webhook WhatsApp refusée (jeton invalide).")
    return HttpResponseForbidden("Jeton de vérification invalide.")


def _receive_messages(request, config):
    provider = get_provider(config)
    if not provider.verify_signature(request.body, request.headers):
        logger.warning("Webhook WhatsApp rejeté : signature absente ou invalide.")
        return HttpResponseForbidden("Signature invalide.")

    try:
        payload = json.loads(request.body or b"{}")
    except ValueError:
        return HttpResponseBadRequest("JSON invalide.")

    for message in provider.parse_webhook(payload):
        try:
            receive(message, provider)
        except Exception:  # noqa: BLE001 — un message en échec ne doit pas bloquer les autres
            logger.exception("Traitement du message WhatsApp %s en échec.", message.message_id)

    # Envois refusés après coup (image injoignable, numéro invalide…) : motif au journal.
    for message_id, reason in provider.parse_failures(payload):
        logger.warning("Message WhatsApp %s non livré : %s", message_id, reason)
        WhatsAppMessage.objects.filter(
            direction=WhatsAppMessage.Direction.OUTBOUND, provider_message_id=message_id,
        ).update(error=reason[:1000])
    return HttpResponse("OK")
