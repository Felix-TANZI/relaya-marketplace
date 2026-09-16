# backend/apps/whatsapp_assistant/providers/meta_cloud.py
# Fournisseur « WhatsApp Cloud API » hébergé par Meta.
# Documentation : https://developers.facebook.com/docs/whatsapp/cloud-api

import hashlib
import hmac
import logging

import requests

from .base import Button, IncomingMessage, ListSection, ProviderError, WhatsAppProvider

logger = logging.getLogger("apps.whatsapp_assistant")

GRAPH_URL = "https://graph.facebook.com"
TIMEOUT_SECONDS = 10

# Limites imposées par Meta : au-delà, le message est refusé en entier.
MAX_BUTTONS, BUTTON_TITLE = 3, 20
MAX_LIST_ROWS, ROW_TITLE, ROW_DESCRIPTION = 10, 24, 72
LIST_BUTTON, SECTION_TITLE, HEADER_TEXT, FOOTER_TEXT, BODY_TEXT = 20, 24, 60, 60, 1024


def _fit(text: str, limit: int) -> str:
    text = (text or "").strip()
    return text if len(text) <= limit else text[: limit - 1].rstrip() + "…"


class MetaCloudProvider(WhatsAppProvider):
    name = "meta"

    def __init__(self, config):
        self.config = config

    # ── Réception ───────────────────────────────────────────────────────────

    def verify_signature(self, body: bytes, headers) -> bool:
        """
        Meta signe chaque webhook avec la clé secrète de l'application
        (en-tête X-Hub-Signature-256 = « sha256=<hmac> »). Sans clé configurée,
        on refuse tout : un webhook non vérifié accepterait n'importe quel faux message.
        """
        secret = self.config.app_secret
        signature = headers.get("X-Hub-Signature-256", "")
        if not secret or not signature.startswith("sha256="):
            return False
        expected = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
        return hmac.compare_digest(signature.removeprefix("sha256="), expected)

    def parse_webhook(self, payload: dict) -> list[IncomingMessage]:
        if payload.get("object") != "whatsapp_business_account":
            return []
        messages = []
        for entry in payload.get("entry", []):
            for change in entry.get("changes", []):
                if change.get("field") != "messages":
                    continue
                value = change.get("value", {})
                names = {
                    contact.get("wa_id"): contact.get("profile", {}).get("name", "")
                    for contact in value.get("contacts", [])
                }
                # « statuses » (envoyé, distribué, lu) : ignorés à ce stade.
                for message in value.get("messages", []):
                    messages.append(self._to_incoming(message, names))
        return messages

    def parse_failures(self, payload: dict) -> list[tuple[str, str]]:
        failures = []
        for entry in payload.get("entry", []):
            for change in entry.get("changes", []):
                for status in change.get("value", {}).get("statuses", []):
                    if status.get("status") != "failed":
                        continue
                    reasons = [
                        " : ".join(filter(None, [e.get("title"), e.get("error_data", {}).get("details")]))
                        for e in status.get("errors", [])
                    ]
                    failures.append((status.get("id", ""), " | ".join(filter(None, reasons)) or "échec"))
        return failures

    def _to_incoming(self, message: dict, names: dict) -> IncomingMessage:
        kind = message.get("type", "unknown")
        text, reply_id = "", ""
        if kind == "text":
            text = message.get("text", {}).get("body", "")
        elif kind == "interactive":
            interactive = message.get("interactive", {})
            choice = interactive.get(interactive.get("type", ""), {})  # button_reply / list_reply
            text, reply_id = choice.get("title", ""), choice.get("id", "")
        elif kind == "button":  # bouton de réponse rapide d'un modèle
            button = message.get("button", {})
            text, reply_id = button.get("text", ""), button.get("payload", "")
        sender = message.get("from", "")
        return IncomingMessage(
            message_id=message.get("id", ""),
            wa_id=sender,
            profile_name=names.get(sender, ""),
            type=kind,
            text=text.strip(),
            reply_id=reply_id,
            raw=message,
        )

    # ── Envoi ───────────────────────────────────────────────────────────────

    def send_text(self, to: str, text: str) -> str | None:
        return self._post({
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": to,
            "type": "text",
            "text": {"preview_url": False, "body": text},
        })

    def send_buttons(self, to, body, buttons: list[Button], image_id=None, footer="") -> str | None:
        interactive = {
            "type": "button",
            "body": {"text": _fit(body, BODY_TEXT)},
            "action": {"buttons": [
                {"type": "reply", "reply": {"id": button.id, "title": _fit(button.title, BUTTON_TITLE)}}
                for button in buttons[:MAX_BUTTONS]
            ]},
        }
        if image_id:
            interactive["header"] = {"type": "image", "image": {"id": image_id}}
        if footer:
            interactive["footer"] = {"text": _fit(footer, FOOTER_TEXT)}
        return self._send_interactive(to, interactive)

    def send_list(self, to, body, button_label, sections: list[ListSection], header="", footer="") -> str | None:
        remaining = MAX_LIST_ROWS
        wa_sections = []
        for section in sections:
            rows = section.rows[:remaining]
            remaining -= len(rows)
            if not rows:
                continue
            wa_sections.append({
                "title": _fit(section.title, SECTION_TITLE),
                "rows": [
                    {"id": row.id, "title": _fit(row.title, ROW_TITLE),
                     **({"description": _fit(row.description, ROW_DESCRIPTION)} if row.description else {})}
                    for row in rows
                ],
            })
        interactive = {
            "type": "list",
            "body": {"text": _fit(body, BODY_TEXT)},
            "action": {"button": _fit(button_label, LIST_BUTTON), "sections": wa_sections},
        }
        if header:
            interactive["header"] = {"type": "text", "text": _fit(header, HEADER_TEXT)}
        if footer:
            interactive["footer"] = {"text": _fit(footer, FOOTER_TEXT)}
        return self._send_interactive(to, interactive)

    def send_link_button(self, to, body, button_text, url, image_id=None, footer="") -> str | None:
        interactive = {
            "type": "cta_url",
            "body": {"text": _fit(body, BODY_TEXT)},
            "action": {"name": "cta_url", "parameters": {
                "display_text": _fit(button_text, BUTTON_TITLE), "url": url,
            }},
        }
        if image_id:
            interactive["header"] = {"type": "image", "image": {"id": image_id}}
        if footer:
            interactive["footer"] = {"text": _fit(footer, FOOTER_TEXT)}
        return self._send_interactive(to, interactive)

    def send_image(self, to, media_id, caption="") -> str | None:
        image = {"id": media_id}
        if caption:
            image["caption"] = _fit(caption, BODY_TEXT)
        return self._post({
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": to,
            "type": "image",
            "image": image,
        })

    def send_template(self, to, name, language, body_params=(), button_payloads=()) -> str | None:
        components = []
        if body_params:
            components.append({"type": "body", "parameters": [
                {"type": "text", "text": _template_param(value)} for value in body_params
            ]})
        for index, payload in enumerate(button_payloads):
            components.append({
                "type": "button", "sub_type": "quick_reply", "index": str(index),
                "parameters": [{"type": "payload", "payload": payload}],
            })
        return self._post({
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": to,
            "type": "template",
            "template": {"name": name, "language": {"code": language}, "components": components},
        })

    def send_location(self, to, latitude, longitude, name="", address="") -> str | None:
        location = {"latitude": float(latitude), "longitude": float(longitude)}
        if name:
            location["name"] = _fit(name, 100)
        if address:
            location["address"] = _fit(address, 200)
        return self._post({
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": to,
            "type": "location",
            "location": location,
        })

    # ── Modèles (compte WhatsApp Business, pas le numéro) ───────────────────

    def create_template(self, definition: dict) -> dict:
        return self._account_request("post", json=definition)

    def list_templates(self, name: str = "") -> list[dict]:
        params = {"fields": "name,language,status,category,rejected_reason,components", "limit": 100}
        if name:
            params["name"] = name
        return self._account_request("get", params=params).get("data", [])

    def _account_request(self, method: str, **kwargs) -> dict:
        account_id = self.config.business_account_id
        if not (self.config.access_token and account_id):
            raise ProviderError("WHATSAPP_ACCESS_TOKEN ou WHATSAPP_BUSINESS_ACCOUNT_ID manquant.")
        url = f"{GRAPH_URL}/{self.config.graph_api_version}/{account_id}/message_templates"
        try:
            response = requests.request(
                method, url, headers={"Authorization": f"Bearer {self.config.access_token}"},
                timeout=TIMEOUT_SECONDS, **kwargs,
            )
        except requests.RequestException as error:
            raise ProviderError(f"Meta injoignable : {error}") from error
        if response.status_code >= 400:
            raise ProviderError(f"Meta a refusé ({response.status_code}) : {_error_detail(response)}")
        return response.json()

    def upload_media(self, content: bytes, mime_type: str, filename: str) -> str:
        if not (self.config.access_token and self.config.phone_number_id):
            raise ProviderError("WHATSAPP_ACCESS_TOKEN ou WHATSAPP_PHONE_NUMBER_ID manquant.")
        url = f"{GRAPH_URL}/{self.config.graph_api_version}/{self.config.phone_number_id}/media"
        try:
            response = requests.post(
                url,
                data={"messaging_product": "whatsapp", "type": mime_type},
                files={"file": (filename, content, mime_type)},
                headers={"Authorization": f"Bearer {self.config.access_token}"},
                timeout=30,
            )
        except requests.RequestException as error:
            raise ProviderError(f"Meta injoignable : {error}") from error
        if response.status_code >= 400:
            raise ProviderError(f"Dépôt d'image refusé ({response.status_code}) : {response.text[:200]}")
        media_id = response.json().get("id")
        if not media_id:
            raise ProviderError("Meta n'a pas renvoyé d'identifiant pour l'image.")
        return media_id

    def _send_interactive(self, to: str, interactive: dict) -> str | None:
        return self._post({
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": to,
            "type": "interactive",
            "interactive": interactive,
        })

    def mark_as_read(self, message_id: str) -> None:
        self._post({"messaging_product": "whatsapp", "status": "read", "message_id": message_id})

    def _post(self, payload: dict) -> str | None:
        if not (self.config.access_token and self.config.phone_number_id):
            raise ProviderError("WHATSAPP_ACCESS_TOKEN ou WHATSAPP_PHONE_NUMBER_ID manquant.")
        url = f"{GRAPH_URL}/{self.config.graph_api_version}/{self.config.phone_number_id}/messages"
        try:
            response = requests.post(
                url,
                json=payload,
                headers={"Authorization": f"Bearer {self.config.access_token}"},
                timeout=TIMEOUT_SECONDS,
            )
        except requests.RequestException as error:
            raise ProviderError(f"Meta injoignable : {error}") from error

        if response.status_code >= 400:
            raise ProviderError(f"Meta a refusé l'envoi ({response.status_code}) : {_error_detail(response)}")

        sent = response.json().get("messages") or []
        return sent[0].get("id") if sent else None


def _error_detail(response) -> str:
    try:
        error = response.json().get("error", {})
    except ValueError:
        return response.text[:200]
    # error_user_msg explique souvent le refus d'un modèle mieux que message.
    return " · ".join(filter(None, [error.get("message", ""), error.get("error_user_msg", "")]))


def _template_param(value) -> str:
    """
    Meta refuse les paramètres de modèle vides, avec retour à la ligne,
    tabulation ou plus de 4 espaces d'affilée.
    """
    text = " ".join(str(value or "").split())
    return _fit(text, 200) or "—"
