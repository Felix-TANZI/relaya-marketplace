# backend/apps/payments/domain/money.py
# Objet-valeur monetaire du domaine financier BelivaY.
#
# REGLES ABSOLUES
#   1. Les montants sont des ENTIERS en unites mineures. XAF n'ayant aucune
#      subdivision, 1 unite mineure = 1 franc.
#   2. Les taux sont des Decimal.
#   3. Le float est INTERDIT. Toute tentative leve FloatForbidden.
#   4. Money est IMMUABLE. Toute operation retourne une nouvelle instance.
#   5. La repartition CONSERVE le total. Aucun franc cree, aucun perdu.

from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal, ROUND_CEILING, ROUND_FLOOR, ROUND_HALF_UP, InvalidOperation
from typing import Iterable, Sequence

from .enums import CURRENCY_EXPONENT, Currency, Rounding
from .exceptions import (
    ConservationViolation,
    CurrencyMismatch,
    FloatForbidden,
    NegativeAmount,
)

_ROUNDING_MAP = {
    Rounding.UP: ROUND_CEILING,
    Rounding.DOWN: ROUND_FLOOR,
    Rounding.HALF_UP: ROUND_HALF_UP,
}


def to_decimal(value) -> Decimal:
    """
    Convertit en Decimal de maniere sure.

    Accepte int, str, Decimal. REFUSE float, pour ne pas laisser entrer
    une valeur deja degradee par la representation binaire.
    """
    if isinstance(value, Decimal):
        return value
    if isinstance(value, bool):
        raise FloatForbidden("Un booleen n'est pas une valeur monetaire.")
    if isinstance(value, float):
        raise FloatForbidden(
            f"float interdit dans le domaine financier (recu {value!r}). "
            "Utiliser int, str ou Decimal."
        )
    if isinstance(value, int):
        return Decimal(value)
    if isinstance(value, str):
        try:
            return Decimal(value)
        except InvalidOperation as exc:
            raise FloatForbidden(f"Valeur monetaire invalide : {value!r}") from exc
    raise FloatForbidden(f"Type non supporte pour un calcul monetaire : {type(value).__name__}")


@dataclass(frozen=True, order=False)
class Money:
    """
    Montant monetaire immuable.

    >>> Money(50000) + Money(1500)
    Money(amount=51500, currency='XAF')
    >>> Money(50000).percent("2.00")
    Money(amount=1000, currency='XAF')
    """

    amount: int
    currency: Currency = Currency.XAF

    def __post_init__(self):
        if isinstance(self.amount, bool) or not isinstance(self.amount, int):
            raise FloatForbidden(
                f"Money.amount doit etre un int, recu {type(self.amount).__name__}. "
                "Utiliser Money.from_decimal() pour convertir."
            )
        if not isinstance(self.currency, Currency):
            object.__setattr__(self, "currency", Currency(self.currency))

    # ── Constructeurs ────────────────────────────────────────────────────────

    @classmethod
    def zero(cls, currency: Currency = Currency.XAF) -> "Money":
        return cls(0, currency)

    @classmethod
    def from_decimal(
        cls,
        value: Decimal,
        currency: Currency = Currency.XAF,
        rounding: Rounding = Rounding.HALF_UP,
    ) -> "Money":
        """Convertit un Decimal en Money, arrondi selon la regle demandee."""
        dec = to_decimal(value)
        exponent = CURRENCY_EXPONENT[currency]
        quantum = Decimal(1).scaleb(-exponent)
        rounded = dec.quantize(quantum, rounding=_ROUNDING_MAP[rounding])
        return cls(int(rounded.scaleb(exponent)), currency)

    # ── Garde ────────────────────────────────────────────────────────────────

    def _same_currency(self, other: "Money") -> None:
        if not isinstance(other, Money):
            raise CurrencyMismatch(f"Operation Money avec {type(other).__name__}.")
        if self.currency != other.currency:
            raise CurrencyMismatch(
                f"Devises incompatibles : {self.currency} et {other.currency}."
            )

    # ── Arithmetique ─────────────────────────────────────────────────────────

    def __add__(self, other: "Money") -> "Money":
        self._same_currency(other)
        return Money(self.amount + other.amount, self.currency)

    def __sub__(self, other: "Money") -> "Money":
        self._same_currency(other)
        return Money(self.amount - other.amount, self.currency)

    def __neg__(self) -> "Money":
        return Money(-self.amount, self.currency)

    def __abs__(self) -> "Money":
        return Money(abs(self.amount), self.currency)

    def times(self, factor, rounding: Rounding = Rounding.HALF_UP) -> "Money":
        """Multiplie par un facteur (int, str ou Decimal — jamais float)."""
        result = Decimal(self.amount) * to_decimal(factor)
        return Money.from_decimal(result, self.currency, rounding)

    def percent(self, rate, rounding: Rounding = Rounding.HALF_UP) -> "Money":
        """
        Pourcentage de ce montant.

        >>> Money(45000).percent("12")
        Money(amount=5400, currency='XAF')
        """
        result = Decimal(self.amount) * to_decimal(rate) / Decimal(100)
        return Money.from_decimal(result, self.currency, rounding)

    # ── Comparaisons ─────────────────────────────────────────────────────────

    def __lt__(self, other: "Money") -> bool:
        self._same_currency(other)
        return self.amount < other.amount

    def __le__(self, other: "Money") -> bool:
        self._same_currency(other)
        return self.amount <= other.amount

    def __gt__(self, other: "Money") -> bool:
        self._same_currency(other)
        return self.amount > other.amount

    def __ge__(self, other: "Money") -> bool:
        self._same_currency(other)
        return self.amount >= other.amount

    # ── Predicats ────────────────────────────────────────────────────────────

    @property
    def is_zero(self) -> bool:
        return self.amount == 0

    @property
    def is_positive(self) -> bool:
        return self.amount > 0

    @property
    def is_negative(self) -> bool:
        return self.amount < 0

    def require_non_negative(self, label: str = "montant") -> "Money":
        if self.amount < 0:
            raise NegativeAmount(f"{label} negatif : {self.amount} {self.currency}.")
        return self

    # ── Bornes ───────────────────────────────────────────────────────────────

    def clamp(self, minimum: "Money | None" = None, maximum: "Money | None" = None) -> "Money":
        """Applique un plancher et un plafond optionnels."""
        result = self
        if minimum is not None:
            self._same_currency(minimum)
            if result < minimum:
                result = minimum
        if maximum is not None:
            self._same_currency(maximum)
            if result > maximum:
                result = maximum
        return result

    # ── Repartition conservatrice ────────────────────────────────────────────

    def allocate(self, weights: Sequence) -> list["Money"]:
        """
        Repartit ce montant selon des poids, en CONSERVANT le total.

        Le reliquat d'arrondi est distribue un par un aux parts ayant le plus
        gros reste fractionnaire (methode du plus fort reste). C'est la methode
        la moins arbitraire : elle ne privilegie pas systematiquement le
        premier beneficiaire de la liste.

        >>> Money(100).allocate([1, 1, 1])
        [Money(amount=34, currency='XAF'), Money(amount=33, ...), Money(amount=33, ...)]
        >>> sum(m.amount for m in Money(100).allocate([1, 1, 1]))
        100
        """
        if not weights:
            return []

        decimal_weights = [to_decimal(w) for w in weights]
        total_weight = sum(decimal_weights)
        if total_weight <= 0:
            raise ConservationViolation("La somme des poids doit etre strictement positive.")

        exact = [Decimal(self.amount) * w / total_weight for w in decimal_weights]
        floors = [int(e.to_integral_value(rounding=ROUND_FLOOR)) for e in exact]
        remainder = self.amount - sum(floors)

        # Distribution du reliquat aux plus forts restes fractionnaires
        fractions = sorted(
            range(len(exact)),
            key=lambda i: (exact[i] - floors[i]),
            reverse=True,
        )
        step = 1 if remainder >= 0 else -1
        for k in range(abs(remainder)):
            floors[fractions[k % len(floors)]] += step

        parts = [Money(f, self.currency) for f in floors]
        assert_conservation(self, parts)
        return parts

    def split_evenly(self, n: int) -> list["Money"]:
        """Repartition egale en n parts, total conserve."""
        if n <= 0:
            raise ConservationViolation("Le nombre de parts doit etre positif.")
        return self.allocate([1] * n)

    # ── Representation ───────────────────────────────────────────────────────

    def format(self) -> str:
        """1234567 -> '1 234 567 FCFA'"""
        symbol = "FCFA" if self.currency == Currency.XAF else str(self.currency)
        sign = "-" if self.amount < 0 else ""
        return f"{sign}{abs(self.amount):,}".replace(",", " ") + f" {symbol}"

    def __str__(self) -> str:
        return self.format()


# ── Fonctions utilitaires ────────────────────────────────────────────────────

def money_sum(items: Iterable[Money], currency: Currency = Currency.XAF) -> Money:
    """Somme d'une collection de Money. Retourne zero si vide."""
    total = Money.zero(currency)
    for item in items:
        total = total + item
    return total


def assert_conservation(expected_total: Money, parts: Sequence[Money]) -> None:
    """
    Invariant fondamental : la somme des parts egale exactement le total.

    Leve ConservationViolation en cas d'ecart. Cette fonction ne devrait
    JAMAIS declencher en production ; si elle declenche, le calcul est faux
    et la transaction doit echouer plutot que de deplacer un montant errone.
    """
    actual = money_sum(parts, expected_total.currency)
    if actual.amount != expected_total.amount:
        raise ConservationViolation(
            f"Conservation violee : attendu {expected_total.amount}, "
            f"obtenu {actual.amount} (ecart {actual.amount - expected_total.amount}). "
            f"Parts : {[p.amount for p in parts]}"
        )