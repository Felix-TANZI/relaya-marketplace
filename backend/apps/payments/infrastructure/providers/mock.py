# backend/apps/payments/infrastructure/providers/mock.py
# Prestataire factice — developpement, tests et mode ombre (Phase 1).
#
# DETERMINISTE PAR CONSTRUCTION
#   Le comportement depend du DERNIER CHIFFRE du numero payeur. Aucun hasard :
#   un test qui passe passera toujours, et on peut provoquer a volonte le
#   scenario qu'on veut eprouver.
#
#     ...0  -> echec immediat (solde insuffisant)
#     ...1  -> echec immediat (numero invalide)
#     ...2  -> refus immediat (operateur non supporte)
#     ...8  -> reste PENDING indefiniment (simule un abandon acheteur)
#     ...9  -> incident technique (leve ProviderTimeout)
#     autre -> PENDING, puis SUCCESSFUL au 2e appel a get_transaction
#
# CE PRESTATAIRE NE DEPLACE AUCUN ARGENT. Il sert a valider tout le parcours
# — repartition, ecritures, etats — avant de risquer un seul franc.

from __future__ import annotations

import uuid

from .base import (
    CollectRequest,
    CollectResult,
    PaymentProvider,
    ProviderBalance,
    ProviderStatus,
    ProviderTimeout,
    TransactionStatus,
    WithdrawRequest,
    WithdrawResult,
)

#: Etat en memoire des transactions factices, partage par processus.
#: Suffisant pour les tests et le developpement ; jamais utilise en production.
_TRANSACTIONS: dict[str, dict] = {}

FAIL_INSUFFICIENT = "0"
FAIL_INVALID_NUMBER = "1"
FAIL_UNSUPPORTED = "2"
STAY_PENDING = "8"
RAISE_TIMEOUT = "9"

#: Nombre d'appels a get_transaction avant passage a SUCCESSFUL.
POLLS_BEFORE_SUCCESS = 2


def reset_mock_state() -> None:
    """A appeler entre deux tests pour repartir d'un etat propre."""
    _TRANSACTIONS.clear()


class MockProvider(PaymentProvider):
    code = "MOCK"

    # ── Encaissement ─────────────────────────────────────────────────────────

    def collect(self, request: CollectRequest) -> CollectResult:
        numero = (request.msisdn or "").strip()
        dernier = numero[-1] if numero else ""

        if dernier == RAISE_TIMEOUT:
            raise ProviderTimeout(
                "MOCK : incident technique simule. L'issue reste inconnue."
            )

        # Idempotence : meme external_reference -> meme transaction
        existante = next(
            (t for t in _TRANSACTIONS.values()
             if t["external_reference"] == request.external_reference),
            None,
        )
        if existante is not None:
            return CollectResult(
                accepted=existante["status"] != ProviderStatus.FAILED,
                provider_reference=existante["provider_reference"],
                status=existante["status"],
                raw_status=existante["raw_status"],
                error_code=existante.get("error_code", ""),
                raw_response={"idempotent_replay": True},
            )

        if dernier == FAIL_INSUFFICIENT:
            return CollectResult(
                accepted=False, status=ProviderStatus.FAILED,
                raw_status="INSUFFICIENT_BALANCE", error_code="ER301",
                error_message="Solde insuffisant sur le compte payeur.",
            )
        if dernier == FAIL_INVALID_NUMBER:
            return CollectResult(
                accepted=False, status=ProviderStatus.FAILED,
                raw_status="INVALID_NUMBER", error_code="ER101",
                error_message="Numero invalide. Il doit commencer par 237.",
            )
        if dernier == FAIL_UNSUPPORTED:
            return CollectResult(
                accepted=False, status=ProviderStatus.FAILED,
                raw_status="UNSUPPORTED_CARRIER", error_code="ER102",
                error_message="Operateur non supporte.",
            )

        from django.utils import timezone as _tz
        reference = str(uuid.uuid4())
        _TRANSACTIONS[reference] = {
            "provider_reference": reference,
            "external_reference": request.external_reference,
            "amount_xaf": request.amount_xaf,
            "operator": request.operator,
            "msisdn": numero,
            "msisdn_last": dernier,
            "description": request.description,
            "endpoint": "collect",
            "occurred_at": _tz.now(),
            "status": ProviderStatus.PENDING,
            "raw_status": "PENDING",
            "polls": 0,
        }
        return CollectResult(
            accepted=True,
            provider_reference=reference,
            status=ProviderStatus.PENDING,
            raw_status="PENDING",
            raw_response={"mock": True, "reference": reference},
        )

    def get_transaction(self, provider_reference: str) -> TransactionStatus:
        etat = _TRANSACTIONS.get(provider_reference)
        if etat is None:
            return TransactionStatus(
                provider_reference=provider_reference,
                status=ProviderStatus.UNKNOWN,
                raw_status="NOT_FOUND",
                error_message="Transaction inconnue du prestataire.",
            )

        etat["polls"] += 1

        if (etat["status"] == ProviderStatus.PENDING
                and etat["msisdn_last"] != STAY_PENDING
                and etat["polls"] >= POLLS_BEFORE_SUCCESS):
            etat["status"] = ProviderStatus.SUCCESSFUL
            etat["raw_status"] = "SUCCESSFUL"

        return TransactionStatus(
            provider_reference=provider_reference,
            status=etat["status"],
            raw_status=etat["raw_status"],
            amount_xaf=etat["amount_xaf"],
            operator=etat["operator"],
            external_reference=etat["external_reference"],
            raw_response={"mock": True, "polls": etat["polls"]},
        )

    # ── Versement ────────────────────────────────────────────────────────────

    def withdraw(self, request: WithdrawRequest) -> WithdrawResult:
        numero = (request.msisdn or "").strip()
        dernier = numero[-1] if numero else ""

        if dernier == RAISE_TIMEOUT:
            raise ProviderTimeout(
                "MOCK : timeout sur versement. L'argent est-il parti ? Inconnu."
            )
        if dernier == FAIL_INSUFFICIENT:
            return WithdrawResult(
                accepted=False, status=ProviderStatus.FAILED,
                raw_status="INSUFFICIENT_BALANCE", error_code="ER301",
                error_message="Solde marchand insuffisant sur ce porteur.",
            )

        from django.utils import timezone as _tz
        reference = str(uuid.uuid4())
        _TRANSACTIONS[reference] = {
            "provider_reference": reference,
            "external_reference": request.external_reference,
            "amount_xaf": request.amount_xaf,
            "operator": request.operator,
            "msisdn": numero,
            "msisdn_last": dernier,
            "description": request.description,
            "endpoint": "withdraw",
            "occurred_at": _tz.now(),
            "status": ProviderStatus.SUCCESSFUL,
            "raw_status": "SUCCESSFUL",
            "polls": 0,
        }
        return WithdrawResult(
            accepted=True, provider_reference=reference,
            status=ProviderStatus.SUCCESSFUL, raw_status="SUCCESSFUL",
            raw_response={"mock": True},
        )

    # ── Capacites ────────────────────────────────────────────────────────────

    def balance(self) -> ProviderBalance:
        """
        Le prestataire factice N'EXPOSE PAS de solde par operateur.

        C'est volontaire : le mode degrade est le cas par defaut tant que
        le Jalon A n'a pas confirme les capacites reelles de CamPay.
        """
        return ProviderBalance(
            total_xaf=0,
            per_operator={},
            is_per_operator_authoritative=False,
            raw_response={"mock": True},
        )

    def history(self, *, start_date, end_date) -> list:
        """
        Historique factice, construit depuis l'etat en memoire.

        Permet de tester la reconciliation de bout en bout — y compris la
        resolution d'un versement a issue inconnue — sans reseau.
        """
        from django.utils import timezone

        lignes = []
        for etat in _TRANSACTIONS.values():
            lignes.append({
                "provider_reference": etat["provider_reference"],
                "operator_code": "",
                "operator_tx_code": "",
                "status": str(etat["status"]),
                "amount_xaf": etat["amount_xaf"],
                "fee_xaf": 0,
                "operator": etat.get("operator", ""),
                "phone_number": etat.get("msisdn", ""),
                "description": etat.get("description", ""),
                "external_user": "",
                "endpoint": etat.get("endpoint", "collect"),
                "occurred_at": etat.get("occurred_at") or timezone.now(),
                "raw": {"mock": True},
            })
        return lignes

    @property
    def exposes_balance_per_operator(self) -> bool:
        return False