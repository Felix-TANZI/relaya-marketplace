# backend/apps/payments/infrastructure/providers/base.py
# Interface des prestataires de paiement.
#
# Le reste du module ne connait QUE cette interface. Ajouter CamPay (Lot 6),
# Fapshi ou tout autre prestataire consiste a ecrire une classe qui l'implemente
# et a creer une ligne de configuration. Aucune migration, aucune refonte.
#
# LES RESULTATS SONT DES DONNEES, PAS DES EXCEPTIONS
#   Un echec metier (solde insuffisant, numero invalide) retourne un resultat
#   avec un code d'erreur. Seuls les incidents techniques (reseau, timeout)
#   levent une exception. La distinction compte : un echec metier est un etat
#   final connu, un incident technique laisse l'issue INCONNUE.

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum


class ProviderError(Exception):
    """Incident technique. L'issue de l'operation reste inconnue."""


class ProviderTimeout(ProviderError):
    """
    Delai depasse sans reponse.

    CAS CRITIQUE sur un versement : on NE SAIT PAS si l'argent est parti.
    Ne jamais retenter aveuglement — voir l'etat UNKNOWN de la machine PAYOUT.
    """


class ProviderUnavailable(ProviderError):
    """Prestataire injoignable ou coupe-circuit ouvert."""


class ProviderStatus(str, Enum):
    """
    Statuts normalises. Chaque adaptateur traduit vers ceux-ci.

    __str__ retourne la VALEUR et non "ProviderStatus.X" : sans cela, une
    serialisation en base produit une chaine de 25 caracteres la ou on en
    attend 10, et l'ecriture echoue silencieusement en production.
    """
    PENDING = "PENDING"
    SUCCESSFUL = "SUCCESSFUL"
    FAILED = "FAILED"
    UNKNOWN = "UNKNOWN"

    def __str__(self) -> str:
        return self.value


@dataclass(frozen=True)
class CollectRequest:
    external_reference: str
    amount_xaf: int
    msisdn: str
    operator: str
    description: str = ""
    metadata: dict = field(default_factory=dict)


@dataclass(frozen=True)
class CollectResult:
    accepted: bool
    provider_reference: str = ""
    status: ProviderStatus = ProviderStatus.PENDING
    raw_status: str = ""
    error_code: str = ""
    error_message: str = ""
    raw_response: dict = field(default_factory=dict)


@dataclass(frozen=True)
class TransactionStatus:
    """
    Etat d'une transaction tel que rapporte par le prestataire.

    C'est la SOURCE DE VERITE : un webhook n'est qu'un signal, cette
    reponse-la fait foi (principe P6).
    """
    provider_reference: str
    status: ProviderStatus
    raw_status: str = ""
    amount_xaf: int = 0
    operator: str = ""
    external_reference: str = ""
    error_code: str = ""
    error_message: str = ""
    raw_response: dict = field(default_factory=dict)


@dataclass(frozen=True)
class WithdrawRequest:
    external_reference: str
    amount_xaf: int
    msisdn: str
    operator: str
    description: str = ""


@dataclass(frozen=True)
class WithdrawResult:
    accepted: bool
    provider_reference: str = ""
    status: ProviderStatus = ProviderStatus.PENDING
    raw_status: str = ""
    error_code: str = ""
    error_message: str = ""
    raw_response: dict = field(default_factory=dict)


@dataclass(frozen=True)
class ProviderBalance:
    total_xaf: int
    per_operator: dict = field(default_factory=dict)
    is_per_operator_authoritative: bool = False
    raw_response: dict = field(default_factory=dict)


class PaymentProvider(ABC):
    """Contrat que tout prestataire doit honorer."""

    #: Code unique, correspond a ProviderConfig.provider_code
    code: str = ""

    def __init__(self, config=None):
        self.config = config

    # ── Encaissement ─────────────────────────────────────────────────────────

    @abstractmethod
    def collect(self, request: CollectRequest) -> CollectResult:
        """
        Demande un encaissement.

        `external_reference` est NOTRE cle d'idempotence : deux appels avec la
        meme valeur ne doivent jamais encaisser deux fois.
        """

    @abstractmethod
    def get_transaction(self, provider_reference: str) -> TransactionStatus:
        """
        Etat reel d'une transaction. SOURCE DE VERITE.

        Appelee par le polling ET a la reception de chaque webhook.
        """

    # ── Versement — Lot 8 ────────────────────────────────────────────────────

    def withdraw(self, request: WithdrawRequest) -> WithdrawResult:
        raise NotImplementedError(
            f"Le prestataire {self.code} n'implemente pas encore les versements."
        )

    def balance(self) -> ProviderBalance:
        raise NotImplementedError(
            f"Le prestataire {self.code} n'expose pas de solde."
        )

    # ── Historique — indispensable a la reconciliation (Lot 10) ──────────────

    def history(self, *, start_date, end_date) -> list:
        """
        Transactions du prestataire sur une periode.

        C'est le SEUL moyen de repondre a « l'argent est-il parti ? » sur un
        versement a issue inconnue. On resout par LECTURE, jamais en
        renvoyant la demande : un renvoi peut doubler un versement reel.

        Chaque ligne normalisee contient au minimum :
            provider_reference · status · amount_xaf · fee_xaf · operator
            phone_number · description · occurred_at · endpoint
        """
        raise NotImplementedError(
            f"Le prestataire {self.code} n'expose pas d'historique. "
            "La reconciliation transactionnelle sera indisponible."
        )

    # ── Capacites ────────────────────────────────────────────────────────────

    @property
    def exposes_balance_per_operator(self) -> bool:
        """
        Le prestataire expose-t-il un solde par operateur ?

        Conditionne le plan comptable : si faux, le mode degrade s'applique
        et la ventilation MTN/Orange devient une estimation non opposable.
        """
        if self.config is not None:
            return bool(getattr(self.config, "exposes_balance_per_operator", False))
        return False

    def supports_operator(self, operator: str) -> bool:
        if self.config is None:
            return True
        supportes = getattr(self.config, "supported_operators", None) or []
        if not supportes:
            return True
        return (operator or "").upper() in [o.upper() for o in supportes]

    def check_amount(self, amount_xaf: int) -> str:
        """Retourne un motif de refus, ou une chaine vide si le montant passe."""
        if self.config is None:
            return ""
        minimum = getattr(self.config, "min_amount_xaf", 0) or 0
        maximum = getattr(self.config, "max_amount_xaf", 0) or 0
        if minimum and amount_xaf < minimum:
            return f"Montant {amount_xaf} inferieur au minimum {minimum} du prestataire."
        if maximum and amount_xaf > maximum:
            return f"Montant {amount_xaf} superieur au maximum {maximum} du prestataire."
        return ""