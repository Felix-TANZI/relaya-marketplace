# backend/apps/payments/infrastructure/providers/registry.py
# Registre des prestataires de paiement.
#
# La selection se fait depuis la CONFIGURATION, jamais par un import en dur.
# Basculer de MOCK a CAMPAY, ou activer un secours, se fait en administration
# via une demande de changement approuvee — sans redeploiement.

from __future__ import annotations

from .base import PaymentProvider, ProviderUnavailable
from .campay.provider import CampayProvider
from .mock import MockProvider

#: Classes disponibles. CamPay s'ajoute au Lot 6, Fapshi apres benchmark.
_CLASSES: dict[str, type[PaymentProvider]] = {
    MockProvider.code: MockProvider,
    CampayProvider.code: CampayProvider,
}


def register(cls: type[PaymentProvider]) -> None:
    """Enregistre une classe de prestataire. Appele a l'import du module."""
    if not cls.code:
        raise ValueError(f"{cls.__name__} n'a pas d'attribut `code`.")
    _CLASSES[cls.code] = cls


def available_codes() -> list[str]:
    return sorted(_CLASSES)


def build(provider_code: str, config=None) -> PaymentProvider:
    """Instancie un prestataire par son code."""
    cls = _CLASSES.get((provider_code or "").upper())
    if cls is None:
        raise ProviderUnavailable(
            f"Prestataire inconnu : '{provider_code}'. "
            f"Disponibles : {', '.join(available_codes())}."
        )
    return cls(config=config)


def get_active_provider() -> PaymentProvider:
    """
    Prestataire actif de plus haute priorite, selon la configuration.

    Leve ProviderUnavailable si aucun n'est actif — plutot que de retomber
    silencieusement sur un prestataire factice, ce qui masquerait une
    configuration cassee en production.
    """
    from apps.payments.config.resolver import active_provider

    config = active_provider()
    if config is None:
        raise ProviderUnavailable(
            "Aucun prestataire de paiement actif. "
            "Verifier ProviderConfig en administration (is_enabled)."
        )
    return build(config.provider_code, config=config)


def get_provider_for(provider_code: str) -> PaymentProvider:
    """
    Prestataire designe, avec sa configuration en vigueur.

    Utilise pour reprendre une tentative ancienne : elle doit etre interrogee
    aupres du MEME prestataire, meme si l'actif a change depuis.
    """
    from apps.payments.config.models import ProviderConfig

    config = (
        ProviderConfig.current()
        .filter(provider_code=provider_code)
        .order_by("-priority")
        .first()
    )
    return build(provider_code, config=config)