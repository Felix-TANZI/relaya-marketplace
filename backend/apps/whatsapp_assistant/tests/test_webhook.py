# backend/apps/whatsapp_assistant/tests/test_webhook.py
# Étape 2 — premier contact : Meta vérifie le webhook, le client écrit,
# l'assistant répond. Aucun appel réseau : requests.post est simulé.

import hashlib
import hmac
import json
from unittest.mock import MagicMock, patch

import pytest

from apps.whatsapp_assistant.models import WhatsAppContact, WhatsAppMessage

pytestmark = pytest.mark.django_db

URL = "/api/whatsapp/webhook/"
APP_SECRET = "secret-de-test"
POST_PATH = "apps.whatsapp_assistant.providers.meta_cloud.requests.post"


@pytest.fixture(autouse=True)
def _whatsapp_settings(settings):
    settings.WHATSAPP_ASSISTANT_ENABLED = "1"
    settings.WHATSAPP_VERIFY_TOKEN = "jeton-verification"
    settings.WHATSAPP_APP_SECRET = APP_SECRET
    settings.WHATSAPP_ACCESS_TOKEN = "jeton-acces"
    settings.WHATSAPP_PHONE_NUMBER_ID = "1234567890"


def _meta_response(status=200, body=None):
    response = MagicMock(status_code=status)
    response.json.return_value = body if body is not None else {"messages": [{"id": "wamid.REPONSE"}]}
    response.text = json.dumps(response.json.return_value)
    return response


def _text_webhook(text="Bonjour", message_id="wamid.CLIENT1", wa_id="237690000001", name="Owen Test"):
    return {
        "object": "whatsapp_business_account",
        "entry": [{
            "id": "WABA_ID",
            "changes": [{
                "field": "messages",
                "value": {
                    "messaging_product": "whatsapp",
                    "metadata": {"display_phone_number": "15551951934", "phone_number_id": "1234567890"},
                    "contacts": [{"wa_id": wa_id, "profile": {"name": name}}],
                    "messages": [{
                        "from": wa_id, "id": message_id, "timestamp": "1757940000",
                        "type": "text", "text": {"body": text},
                    }],
                },
            }],
        }],
    }


def _post_signed(client, payload, secret=APP_SECRET):
    body = json.dumps(payload).encode()
    signature = "sha256=" + hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    return client.post(URL, data=body, content_type="application/json", HTTP_X_HUB_SIGNATURE_256=signature)


# ── Vérification de l'abonnement (GET) ─────────────────────────────────────

def test_meta_verifie_le_webhook_avec_le_bon_jeton(client):
    resp = client.get(URL, {"hub.mode": "subscribe", "hub.verify_token": "jeton-verification", "hub.challenge": "42"})

    assert resp.status_code == 200
    assert resp.content == b"42"


def test_verification_refusee_avec_un_mauvais_jeton(client):
    resp = client.get(URL, {"hub.mode": "subscribe", "hub.verify_token": "pirate", "hub.challenge": "42"})

    assert resp.status_code == 403


def test_module_desactive_repond_404(client, settings):
    settings.WHATSAPP_ASSISTANT_ENABLED = "0"

    assert client.get(URL, {"hub.mode": "subscribe"}).status_code == 404


# ── Réception des messages (POST) ──────────────────────────────────────────

def test_signature_invalide_rejetee_sans_rien_enregistrer(client):
    with patch(POST_PATH) as post:
        resp = _post_signed(client, _text_webhook(), secret="mauvaise-cle")

    assert resp.status_code == 403
    assert not WhatsAppMessage.objects.exists()
    post.assert_not_called()


def test_bonjour_du_client_recoit_le_choix_de_la_langue(client):
    with patch(POST_PATH, return_value=_meta_response()) as post:
        resp = _post_signed(client, _text_webhook("Bonjour"))

    assert resp.status_code == 200
    contact = WhatsAppContact.objects.get(wa_id="237690000001")
    assert contact.profile_name == "Owen Test"
    assert contact.messages.filter(direction="IN", text="Bonjour").exists()

    # Deux appels à Meta : accusé de lecture, puis le choix de la langue (boutons).
    reply_payload = post.call_args_list[-1].kwargs["json"]
    assert reply_payload["to"] == "237690000001"
    assert reply_payload["type"] == "interactive"
    assert "BelivaY" in reply_payload["interactive"]["body"]["text"]
    button_ids = [b["reply"]["id"] for b in reply_payload["interactive"]["action"]["buttons"]]
    assert button_ids == ["lang:fr", "lang:en"]
    assert post.call_args_list[-1].args[0].endswith("/1234567890/messages")
    assert post.call_args_list[-1].kwargs["headers"]["Authorization"] == "Bearer jeton-acces"

    outbound = contact.messages.get(direction="OUT")
    assert outbound.provider_message_id == "wamid.REPONSE"
    assert outbound.error == ""


def test_un_webhook_renvoye_par_meta_n_est_traite_qu_une_fois(client):
    with patch(POST_PATH, return_value=_meta_response()) as post:
        _post_signed(client, _text_webhook(message_id="wamid.DOUBLON"))
        _post_signed(client, _text_webhook(message_id="wamid.DOUBLON"))

    assert WhatsAppMessage.objects.filter(direction="IN").count() == 1
    assert WhatsAppMessage.objects.filter(direction="OUT").count() == 1
    assert post.call_count == 2  # une lecture + une réponse, pas davantage


def test_les_accuses_de_lecture_sont_ignores(client):
    payload = {
        "object": "whatsapp_business_account",
        "entry": [{"changes": [{"field": "messages", "value": {
            "statuses": [{"id": "wamid.X", "status": "delivered", "recipient_id": "237690000001"}],
        }}]}],
    }
    with patch(POST_PATH) as post:
        resp = _post_signed(client, payload)

    assert resp.status_code == 200
    assert not WhatsAppMessage.objects.exists()
    post.assert_not_called()


def test_un_message_non_livre_signale_par_meta_est_journalise(client):
    with patch(POST_PATH, return_value=_meta_response()):
        _post_signed(client, _text_webhook())
    failure = {
        "object": "whatsapp_business_account",
        "entry": [{"changes": [{"field": "messages", "value": {"statuses": [{
            "id": "wamid.REPONSE", "status": "failed", "recipient_id": "237690000001",
            "errors": [{"code": 131053, "title": "Media upload error",
                        "error_data": {"details": "Unable to download the media"}}],
        }]}}]}],
    }

    resp = _post_signed(client, failure)

    assert resp.status_code == 200
    outbound = WhatsAppMessage.objects.get(direction="OUT", provider_message_id="wamid.REPONSE")
    assert "Unable to download the media" in outbound.error


def test_un_echec_d_envoi_est_journalise_sans_bloquer_le_webhook(client):
    refus = _meta_response(401, {"error": {"message": "Jeton expiré"}})
    with patch(POST_PATH, return_value=refus):
        resp = _post_signed(client, _text_webhook())

    assert resp.status_code == 200
    outbound = WhatsAppMessage.objects.get(direction="OUT")
    assert "Jeton expiré" in outbound.error
    assert outbound.provider_message_id == ""
