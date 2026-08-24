# backend/apps/payments/infrastructure/providers/campay/provider.py
# Adaptateur CamPay — implemente l'interface PaymentProvider.
#
# Le reste du module ne voit que l'interface. Toute la connaissance du
# protocole CamPay est confinee dans client.py, mapper.py et errors.py.

from __future__ import annotations

import logging

from ..base import (
    CollectRequest,
    CollectResult,
    PaymentProvider,
    ProviderBalance,
    ProviderError,
    ProviderStatus,
    ProviderTimeout,
    TransactionStatus,
    WithdrawRequest,
    WithdrawResult,
)
from . import mapper
from .client import build_client
from .errors import describe, is_critical_on_withdraw

logger = logging.getLogger("apps.payments.campay")


class CampayProvider(PaymentProvider):
    code = "CAMPAY"

    def __init__(self, config=None, client=None):
        super().__init__(config=config)
        self._client = client or build_client(config)

    # ── Encaissement ─────────────────────────────────────────────────────────

    def collect(self, request: CollectRequest) -> CollectResult:
        corps = mapper.build_collect_body(
            amount_xaf=request.amount_xaf,
            msisdn=request.msisdn,
            external_reference=request.external_reference,
            description=request.description,
        )

        # Un encaissement N'EST PAS rejoue automatiquement : meme avec une
        # cle d'idempotence, on prefere laisser le polling trancher plutot
        # que de multiplier les invites sur le telephone de l'acheteur.
        reponse = self._client.post("/collect/", corps, allow_retry=False)
        donnees = reponse.payload

        if reponse.status_code >= 400:
            spec = describe(mapper.clean(donnees.get("error_code"))
                            or _code_from(donnees))
            # ─────────────────────────────────────────────────────────────
            # LE MESSAGE DU PRESTATAIRE EST CONSERVE
            #
            # `spec.user_message` est destine a l'ACHETEUR : clair, sans
            # jargon. Mais l'ecraser purement et simplement fait perdre
            # l'information dont l'EXPLOITANT a besoin.
            #
            # Cas reel : CamPay repond « This is a demo system. Maximum
            # amount is 25.00 XAF » et ER201 le traduit en « une erreur
            # technique est survenue ». Le diagnostic devenait impossible
            # sans aller lire response_payload a la main.
            #
            # On garde les deux : le libelle client d'abord, la cause
            # exacte ensuite.
            # ─────────────────────────────────────────────────────────────
            brut = mapper.clean(donnees.get("message")) or mapper.clean(
                donnees.get("reason"))
            message = spec.user_message
            if brut and brut.lower() not in message.lower():
                message = f"{spec.user_message} [{brut}]"

            return CollectResult(
                accepted=False,
                status=ProviderStatus.FAILED,
                raw_status=str(reponse.status_code),
                error_code=spec.code if spec.code != "UNKNOWN" else "",
                error_message=message,
                raw_response=mapper.parse_transaction(donnees)["raw"],
            )

        transaction = mapper.parse_transaction(donnees)

        if not transaction["provider_reference"]:
            # Reponse 2xx sans reference : on ne sait pas si la demande est
            # partie. Traite comme INCONNU, jamais comme un echec.
            raise ProviderError(
                "CamPay a repondu sans reference de transaction. "
                "L'issue de la demande est inconnue."
            )

        return CollectResult(
            accepted=transaction["status"] != ProviderStatus.FAILED,
            provider_reference=transaction["provider_reference"],
            status=transaction["status"] or ProviderStatus.PENDING,
            raw_status=transaction["raw_status"] or "PENDING",
            error_code=transaction["error_code"],
            error_message=transaction["error_message"],
            raw_response=transaction["raw"],
        )

    def get_transaction(self, provider_reference: str) -> TransactionStatus:
        """
        SOURCE DE VERITE (principe P6).

        Appelee par le polling ET a chaque webhook. La signature CamPay ne
        liant pas le contenu a la transaction, c'est le SEUL mecanisme
        d'authentification reel d'un evenement.
        """
        if not provider_reference:
            raise ProviderError("Reference de transaction vide.")

        reponse = self._client.get(f"/transaction/{provider_reference}/")

        if reponse.status_code == 404:
            return TransactionStatus(
                provider_reference=provider_reference,
                status=ProviderStatus.UNKNOWN,
                raw_status="NOT_FOUND",
                error_message="Transaction inconnue de CamPay.",
                raw_response=reponse.payload,
            )
        if reponse.status_code >= 400:
            raise ProviderError(
                f"CamPay : statut {reponse.status_code} sur la consultation "
                f"de {provider_reference}."
            )

        transaction = mapper.parse_transaction(reponse.payload)
        return TransactionStatus(
            provider_reference=transaction["provider_reference"] or provider_reference,
            status=transaction["status"],
            raw_status=transaction["raw_status"],
            amount_xaf=transaction["amount_xaf"],
            operator=transaction["operator"],
            external_reference=transaction["external_reference"],
            error_code=transaction["error_code"],
            error_message=transaction["error_message"],
            raw_response=transaction["raw"],
        )

    # ── Versement ────────────────────────────────────────────────────────────

    def withdraw(self, request: WithdrawRequest) -> WithdrawResult:
        """
        Emet un versement.

        JAMAIS DE REESSAI AUTOMATIQUE. Sur un timeout, on ne sait pas si
        l'argent est parti ; retenter peut doubler un versement reel. La
        reconciliation tranche, pas le code.
        """
        corps = mapper.build_withdraw_body(
            amount_xaf=request.amount_xaf,
            msisdn=request.msisdn,
            external_reference=request.external_reference,
            description=request.description,
        )

        try:
            reponse = self._client.post("/withdraw/", corps, allow_retry=False)
        except ProviderTimeout:
            logger.error(
                "Timeout sur versement %s. Issue INCONNUE — "
                "ne jamais retenter sans reconciliation.",
                request.external_reference,
            )
            raise

        donnees = reponse.payload

        if reponse.status_code >= 400:
            code = _code_from(donnees)
            spec = describe(code)
            if is_critical_on_withdraw(code):
                logger.error(
                    "SOLDE MARCHAND INSUFFISANT (%s) sur le versement %s. "
                    "Gel des reglements requis.",
                    code, request.external_reference,
                )
            return WithdrawResult(
                accepted=False,
                status=ProviderStatus.FAILED,
                raw_status=str(reponse.status_code),
                error_code=code,
                error_message=spec.detail,
                raw_response=donnees,
            )

        transaction = mapper.parse_transaction(donnees)
        if not transaction["provider_reference"]:
            raise ProviderError(
                "CamPay a accepte le versement sans renvoyer de reference. "
                "Issue INCONNUE — reconciliation obligatoire."
            )

        return WithdrawResult(
            accepted=True,
            provider_reference=transaction["provider_reference"],
            status=transaction["status"] or ProviderStatus.PENDING,
            raw_status=transaction["raw_status"] or "PENDING",
            raw_response=transaction["raw"],
        )

    # ── Solde ────────────────────────────────────────────────────────────────

    def balance(self) -> ProviderBalance:
        reponse = self._client.get("/balance/")
        if reponse.status_code >= 400:
            raise ProviderError(
                f"CamPay : statut {reponse.status_code} sur la consultation du solde."
            )
        solde = mapper.parse_balance(reponse.payload)
        return ProviderBalance(
            total_xaf=solde["total_xaf"],
            per_operator=solde["per_operator"],
            is_per_operator_authoritative=solde["per_operator_available"],
            raw_response=reponse.payload,
        )

    def history(self, *, start_date, end_date) -> list:
        """
        Historique des transactions — POST /api/history/.

        Le corps exige start_date et end_date au format YYYY-MM-DD.
        C'est cet endpoint qui permet de resoudre un versement dont l'issue
        est inconnue, PAR LECTURE et jamais par un renvoi.
        """
        corps = {
            "start_date": start_date.isoformat()
            if hasattr(start_date, "isoformat") else str(start_date),
            "end_date": end_date.isoformat()
            if hasattr(end_date, "isoformat") else str(end_date),
        }
        reponse = self._client.post("/history/", corps, allow_retry=True)
        if reponse.status_code >= 400:
            raise ProviderError(
                f"CamPay : statut {reponse.status_code} sur l'historique."
            )
        return mapper.parse_history(reponse.payload)

    def holder_info(self, msisdn: str) -> str:
        """
        Nom associe a un numero.

        Utile en controle anti-fraude : verifier que le numero de versement
        appartient bien au partenaire declare.
        """
        numero = mapper.normalise_msisdn(msisdn)
        reponse = self._client.get(f"/holder_info/?phone_number={numero}")
        if reponse.status_code >= 400:
            return ""
        return mapper.clean(reponse.payload.get("full_name"))

    @property
    def exposes_balance_per_operator(self) -> bool:
        """
        A CONFIRMER AU JALON A.

        Tant que la configuration ne l'affirme pas, on reste en mode degrade :
        un plan comptable elegant mais irreconciliable est pire qu'un plan
        grossier mais fidele.
        """
        if self.config is not None:
            return bool(getattr(self.config, "exposes_balance_per_operator", False))
        return False


def _code_from(payload) -> str:
    from .errors import extract_error_code
    return extract_error_code(payload if isinstance(payload, dict) else {})