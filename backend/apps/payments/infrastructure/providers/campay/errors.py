# backend/apps/payments/infrastructure/providers/campay/errors.py
# Codes d'erreur CamPay et traduction vers le domaine.
#
# Source : documentation officielle CamPay, section « Error codes reference ».
# Chaque code est classe selon sa NATURE, parce que la nature determine le
# comportement : un echec metier est definitif, un incident technique laisse
# l'issue inconnue.

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class ErrorSpec:
    code: str
    #: Message affichable a l'acheteur — clair, sans jargon technique
    user_message: str
    #: L'acheteur peut-il corriger et retenter ?
    retryable_by_user: bool
    #: Faut-il alerter l'exploitation ?
    alerts_ops: bool
    #: Description technique
    detail: str


CAMPAY_ERRORS = {
    "ER101": ErrorSpec(
        code="ER101",
        user_message="Numero invalide. Il doit commencer par 237.",
        retryable_by_user=True,
        alerts_ops=False,
        detail="Numero de telephone invalide. Le code pays est obligatoire.",
    ),
    "ER102": ErrorSpec(
        code="ER102",
        user_message="Operateur non supporte. Seuls MTN et Orange sont acceptes.",
        retryable_by_user=True,
        alerts_ops=False,
        detail="Porteur non supporte par CamPay.",
    ),
    "ER201": ErrorSpec(
        code="ER201",
        user_message="Une erreur technique est survenue. Reessayez.",
        retryable_by_user=False,
        alerts_ops=True,
        detail=(
            "Montant invalide : les decimales sont refusees. "
            "Ne devrait JAMAIS survenir — BelivaY travaille en entiers. "
            "Si ce code apparait, il y a un bug de serialisation."
        ),
    ),
    "ER301": ErrorSpec(
        code="ER301",
        user_message="Solde insuffisant sur votre compte Mobile Money.",
        retryable_by_user=True,
        alerts_ops=False,
        detail=(
            "Solde insuffisant. Sur un ENCAISSEMENT : c'est le compte de "
            "l'acheteur. Sur un VERSEMENT : c'est le solde marchand BelivaY "
            "pour ce porteur — alerte critique, gel des reglements requis."
        ),
    ),
}

#: Sur un versement, ER301 signifie que la PLATEFORME n'a pas les fonds.
#: C'est le signal le plus grave du systeme.
CRITICAL_ON_WITHDRAW = frozenset({"ER301"})

UNKNOWN_ERROR = ErrorSpec(
    code="UNKNOWN",
    user_message="Le paiement n'a pas abouti. Reessayez dans un instant.",
    retryable_by_user=True,
    alerts_ops=True,
    detail="Code d'erreur non repertorie. A investiguer et a ajouter ici.",
)


def describe(code: str) -> ErrorSpec:
    return CAMPAY_ERRORS.get((code or "").strip().upper(), UNKNOWN_ERROR)


def is_critical_on_withdraw(code: str) -> bool:
    return (code or "").strip().upper() in CRITICAL_ON_WITHDRAW


def extract_error_code(payload: dict) -> str:
    """
    Extrait le code d'erreur d'une reponse CamPay.

    CamPay le place selon les cas dans `error_code`, `code`, ou dans le
    texte de `message`. On tente les trois plutot que de rater le code.
    """
    if not isinstance(payload, dict):
        return ""

    for cle in ("error_code", "errorCode", "code"):
        valeur = payload.get(cle)
        if isinstance(valeur, str) and valeur.upper().startswith("ER"):
            return valeur.upper()

    for cle in ("message", "detail", "error", "reason"):
        texte = payload.get(cle)
        if isinstance(texte, str):
            for connu in CAMPAY_ERRORS:
                if connu in texte.upper():
                    return connu

    return ""