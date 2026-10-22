# backend/apps/payments/infrastructure/providers/cinetpay/mapper.py
# Traduction CinetPay <-> domaine BelivaY.
#
# CONTRAT CONFIRME EMPIRIQUEMENT contre le vrai bac a sable (voir
# cinetpay_selftest --checkout / --status), le 30 septembre 2026. Champs et
# formes de reponse observes reellement :
#
#   POST /v1/payment (initialisation) — corps requis :
#     merchant_transaction_id, amount, currency, designation,
#     success_url, failed_url, notify_url
#     (optionnels observes fonctionnels : lang, client_email,
#      client_first_name, client_last_name, client_phone_number, channel)
#
#   Reponse d'initialisation reelle (succes) :
#     {"code": 200, "status": "OK",
#      "payment_token": "...", "notify_token": "...",
#      "transaction_id": "<id CinetPay>",
#      "merchant_transaction_id": "<notre reference>",
#      "payment_url": "https://secure.cinetpay.net/checkout/...",
#      "details": {"code": 2001, "status": "INITIATED",
#                   "message": "...", "must_be_redirected": true}}
#
#   PIEGE : le code/status DE PREMIER NIVEAU vaut TOUJOURS 200/"OK" — meme
#   quand la requete est rejetee pour champs manquants. Le vrai resultat
#   (succes d'INITIATION vs erreur de validation) est dans `details`.
#
#   GET /v1/payment/{merchant_transaction_id} (statut) — reponse reelle :
#     {"code": 2001, "status": "INITIATED",
#      "merchant_transaction_id": "...", "transaction_id": "...", "user": null}
#
# ENCORE A CONFIRMER : les codes/status de statut TERMINAL (paiement reussi
# ou refuse) — seul "INITIATED" (code 2001) a ete observe, un paiement
# sandbox n'ayant pas encore ete mene a son terme via payment_url. A
# completer des qu'un paiement de bout en bout aura ete teste dans un
# navigateur avec une carte de test CinetPay.

from __future__ import annotations

from ..base import ProviderStatus

#: Valeurs de `details.status` (initialisation) / `status` (consultation)
#: confirmees ou raisonnablement deduites. INITIATED est CONFIRME ; les
#: autres sont des hypotheses usuelles pour ce type d'API, A CONFIRMER par
#: un vrai paiement termine.
STATUS_MAP = {
    "INITIATED": ProviderStatus.PENDING,
    "PENDING": ProviderStatus.PENDING,
    "ACCEPTED": ProviderStatus.SUCCESSFUL,      # hypothese, non confirmee
    "SUCCES": ProviderStatus.SUCCESSFUL,        # hypothese, non confirmee
    "SUCCESS": ProviderStatus.SUCCESSFUL,       # hypothese, non confirmee
    "REFUSED": ProviderStatus.FAILED,           # hypothese, non confirmee
    "FAILED": ProviderStatus.FAILED,            # hypothese, non confirmee
    "CANCELLED": ProviderStatus.FAILED,         # hypothese, non confirmee
    "EXPIRED": ProviderStatus.FAILED,           # hypothese, non confirmee
}


def clean(valeur) -> str:
    if valeur is None:
        return ""
    return str(valeur).strip()


def to_status(raw: str) -> ProviderStatus:
    """
    Un statut INCONNU devient UNKNOWN, jamais FAILED ni SUCCESSFUL : seul
    "INITIATED" est confirme aujourd'hui, conclure a tort sur un statut
    terminal non verifie risquerait de valider un paiement qui n'a pas eu
    lieu, ou d'en rejeter un qui a reussi.
    """
    return STATUS_MAP.get(clean(raw).upper(), ProviderStatus.UNKNOWN)


def build_checkout_body(*, amount_xaf: int, external_reference: str,
                         description: str = "", customer_name: str = "",
                         customer_surname: str = "", customer_email: str = "",
                         customer_phone: str = "", return_url: str = "",
                         failed_url: str = "", notify_url: str = "",
                         lang: str = "fr", currency: str = "XAF") -> dict:
    """Corps d'une demande d'initialisation de paiement (POST /v1/payment)."""
    if not isinstance(amount_xaf, int) or isinstance(amount_xaf, bool):
        raise ValueError("Le montant doit etre un entier.")
    if amount_xaf <= 0:
        raise ValueError("Le montant doit etre strictement positif.")
    if not external_reference:
        raise ValueError("external_reference est obligatoire (merchant_transaction_id).")
    if not return_url or not failed_url or not notify_url:
        raise ValueError(
            "return_url (succes), failed_url et notify_url sont tous les "
            "trois obligatoires pour CinetPay."
        )

    return {
        "merchant_transaction_id": external_reference,
        "amount": amount_xaf,
        "currency": currency,
        "designation": (description or "BelivaY")[:255],
        "success_url": return_url,
        "failed_url": failed_url,
        "notify_url": notify_url,
        "lang": lang,
        "client_email": customer_email or "",
        "client_first_name": customer_name or "Client",
        "client_last_name": customer_surname or "BelivaY",
        "client_phone_number": customer_phone or "",
        "channel": "ALL",
    }


def parse_checkout_response(payload: dict) -> dict:
    """Normalise la reponse de POST /v1/payment. Voir le piege documente en tete de fichier."""
    if not isinstance(payload, dict):
        return {
            "success": False, "status": "", "code": "", "message": "Reponse illisible.",
            "payment_url": "", "payment_token": "", "notify_token": "",
            "cinetpay_transaction_id": "",
        }

    details = payload.get("details") if isinstance(payload.get("details"), dict) else {}
    statut = clean(details.get("status"))

    return {
        # "INITIATED" est le seul succes d'initiation confirme aujourd'hui.
        "success": statut.upper() == "INITIATED" and bool(clean(payload.get("payment_url"))),
        "status": statut,
        "code": clean(details.get("code")) or clean(payload.get("code")),
        "message": clean(details.get("message")),
        "payment_url": clean(payload.get("payment_url")),
        "payment_token": clean(payload.get("payment_token")),
        "notify_token": clean(payload.get("notify_token")),
        "cinetpay_transaction_id": clean(payload.get("transaction_id")),
        "validation_errors": details.get("errors") if isinstance(details.get("errors"), dict) else {},
    }


def parse_transaction(payload: dict) -> dict:
    """Normalise la reponse de GET /v1/payment/{merchant_transaction_id}."""
    if not isinstance(payload, dict):
        return {
            "status": ProviderStatus.UNKNOWN, "raw_status": "", "amount_xaf": 0,
            "error_code": "", "error_message": "", "raw": {},
        }

    statut_brut = clean(payload.get("status"))

    montant = 0
    for cle in ("amount", "montant"):
        valeur = payload.get(cle)
        if valeur not in (None, ""):
            try:
                montant = int(float(valeur))
            except (TypeError, ValueError):
                montant = 0
            break

    resultat = to_status(statut_brut)
    return {
        "status": resultat,
        "raw_status": statut_brut,
        "amount_xaf": montant,
        "cinetpay_transaction_id": clean(payload.get("transaction_id")),
        "error_code": "" if resultat != ProviderStatus.UNKNOWN else clean(payload.get("code")),
        "error_message": clean(payload.get("message")),
        "raw": payload,
    }
