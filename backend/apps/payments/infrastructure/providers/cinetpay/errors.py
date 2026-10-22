# backend/apps/payments/infrastructure/providers/cinetpay/errors.py
# Codes d'erreur CinetPay et traduction vers le domaine.
#
# CODES CONFIRMES EMPIRIQUEMENT contre le vrai bac a sable (30 septembre
# 2026, voir cinetpay_selftest). Les codes de refus METIER d'un paiement
# termine (carte refusee, fonds insuffisants...) restent A CONFIRMER : seule
# l'initiation d'un paiement a ete testee de bout en bout, pas son issue
# finale via une carte de test dans le navigateur.

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class ErrorSpec:
    code: str
    #: Message affichable a l'acheteur — clair, sans jargon technique.
    user_message: str
    #: L'acheteur peut-il corriger et retenter ?
    retryable_by_user: bool
    #: Faut-il alerter l'exploitation ?
    alerts_ops: bool
    #: Description technique.
    detail: str


CINETPAY_ERRORS = {
    "1004": ErrorSpec(
        code="1004",
        user_message="Une erreur technique est survenue. Reessayez.",
        retryable_by_user=False,
        alerts_ops=True,
        detail=(
            "INVALID_PARAMS — un champ obligatoire manque ou est mal forme "
            "(voir payload.details.errors pour le detail champ par champ). "
            "Ne devrait jamais survenir en production si build_checkout_body "
            "est correct : signale un bug cote BelivaY, pas un refus client."
        ),
    ),
    "2011": ErrorSpec(
        code="2011",
        user_message="Une erreur technique est survenue. Reessayez plus tard.",
        retryable_by_user=False,
        alerts_ops=True,
        detail=(
            "NOT_ALLOWED — adresse IP non presente dans la liste blanche du "
            "tableau de bord CinetPay (API & securite -> Liste Blanche IP). "
            "A verifier en priorite si ce code apparait apres un changement "
            "d'infrastructure (nouveau serveur, IP de sortie modifiee)."
        ),
    ),
}

UNKNOWN_ERROR = ErrorSpec(
    code="UNKNOWN",
    user_message="Le paiement n'a pas abouti. Reessayez dans un instant.",
    retryable_by_user=True,
    alerts_ops=True,
    detail="Code d'erreur CinetPay non repertorie. A investiguer et a ajouter ici.",
)


def describe(code) -> ErrorSpec:
    return CINETPAY_ERRORS.get(str(code or "").strip(), UNKNOWN_ERROR)


def extract_error_code(payload: dict) -> str:
    """Extrait le code renvoye par CinetPay, quel que soit son emplacement."""
    if not isinstance(payload, dict):
        return ""
    details = payload.get("details") if isinstance(payload.get("details"), dict) else {}
    for source in (details, payload):
        valeur = source.get("code")
        if valeur not in (None, "", 200):
            return str(valeur)
    return ""
