# backend/apps/payments/infrastructure/providers/cinetpay/provider.py
# Adaptateur CinetPay — implemente l'interface PaymentProvider.
#
# Chemins d'API et forme des requetes/reponses CONFIRMES EMPIRIQUEMENT contre
# le vrai bac a sable (30 septembre 2026) : POST /v1/payment (initiation),
# GET /v1/payment/{merchant_transaction_id} (statut) — voir mapper.py pour
# le detail des reponses observees et ce qui reste hypothese (statuts
# terminaux de paiement, non encore observes faute de paiement mene a son
# terme via une carte de test).
#
# CinetPay est un prestataire "carte" par PAGE HEBERGEE : contrairement a
# CamPay (collect() debite directement un msisdn via une invite USSD),
# create_checkout() renvoie une URL vers laquelle rediriger l'acheteur. Le
# numero de carte ne transite jamais par BelivaY (voir CheckoutRequest dans
# base.py) — aucune conformite PCI-DSS a porter cote plateforme.
#
# collect() reste implemente (obligatoire : @abstractmethod sur
# PaymentProvider) mais leve explicitement : ce prestataire n'a pas
# d'equivalent "encaissement direct par numero".

from __future__ import annotations

import logging

from ..base import (
    CheckoutRequest,
    CheckoutResult,
    CollectRequest,
    CollectResult,
    PaymentProvider,
    ProviderError,
    ProviderStatus,
    TransactionStatus,
)
from . import mapper
from .client import build_client
from .errors import describe

logger = logging.getLogger("apps.payments.cinetpay")


class CinetPayProvider(PaymentProvider):
    code = "CINETPAY"

    def __init__(self, config=None, client=None):
        super().__init__(config=config)
        self._client = client or build_client(config)

    # ── Encaissement direct — NON SUPPORTE par ce prestataire ───────────────

    def collect(self, request: CollectRequest) -> CollectResult:
        raise NotImplementedError(
            "CinetPay (carte) ne supporte pas l'encaissement direct par "
            "numero — utiliser create_checkout() pour rediriger l'acheteur "
            "vers la page de paiement hebergee."
        )

    # ── Paiement par page hebergee ───────────────────────────────────────────

    def create_checkout(self, request: CheckoutRequest) -> CheckoutResult:
        corps = mapper.build_checkout_body(
            amount_xaf=request.amount_xaf,
            external_reference=request.external_reference,
            description=request.description,
            customer_name=request.customer_name,
            customer_surname=request.customer_surname,
            customer_email=request.customer_email,
            customer_phone=request.customer_phone,
            return_url=request.return_url,
            failed_url=request.failed_url,
            notify_url=request.notify_url,
        )

        reponse = self._client.post("/v1/payment", corps, allow_retry=False)
        resultat = mapper.parse_checkout_response(reponse.payload)

        if not resultat["success"]:
            code = resultat["code"]
            spec = describe(code)
            message = resultat["message"] or spec.user_message
            if resultat["validation_errors"]:
                # Erreur de validation cote BelivaY (champ manquant/mal
                # forme) — alerte ops, jamais presente a l'acheteur telle
                # quelle (voir errors.py, code 1004).
                logger.error(
                    "CinetPay a rejete l'initiation %s : %s",
                    request.external_reference, resultat["validation_errors"],
                )
            return CheckoutResult(
                accepted=False,
                status=ProviderStatus.FAILED,
                raw_status=resultat["status"],
                error_code=code or spec.code,
                error_message=message,
                raw_response=reponse.payload,
            )

        return CheckoutResult(
            accepted=True,
            payment_url=resultat["payment_url"],
            payment_token=resultat["payment_token"],
            provider_reference=request.external_reference,
            status=ProviderStatus.PENDING,
            raw_status=resultat["status"],
            raw_response=reponse.payload,
        )

    def get_transaction(self, provider_reference: str) -> TransactionStatus:
        """
        SOURCE DE VERITE (principe P6, voir campay/provider.py).

        A appeler systematiquement a la reception du webhook notify_url —
        ne JAMAIS faire confiance au contenu du webhook seul, uniquement a
        ce que cet appel renvoie. `provider_reference` est ICI notre
        merchant_transaction_id : GET /v1/payment/{merchant_transaction_id}
        l'exige directement dans l'URL (confirme empiriquement).
        """
        if not provider_reference:
            raise ProviderError("Reference de transaction vide.")

        reponse = self._client.request(
            "GET", f"/v1/payment/{provider_reference}", allow_retry=True,
        )
        if reponse.status_code == 404:
            return TransactionStatus(
                provider_reference=provider_reference,
                status=ProviderStatus.UNKNOWN,
                raw_status="NOT_FOUND",
                error_message="Transaction inconnue de CinetPay.",
                raw_response=reponse.payload,
            )
        if reponse.status_code >= 400:
            raise ProviderError(
                f"CinetPay : statut HTTP {reponse.status_code} sur la "
                f"consultation de {provider_reference}."
            )

        transaction = mapper.parse_transaction(reponse.payload)
        return TransactionStatus(
            provider_reference=provider_reference,
            status=transaction["status"],
            raw_status=transaction["raw_status"],
            amount_xaf=transaction["amount_xaf"],
            external_reference=provider_reference,
            error_code=transaction["error_code"],
            error_message=transaction["error_message"],
            raw_response=transaction["raw"],
        )
