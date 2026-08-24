# backend/apps/payments/ledger/balances.py
# Soldes, balance generale et agregats.
#
# Le registre est la SOURCE DE VERITE comptable. Tout solde affiche ailleurs
# dans l'application est un cache recalculable depuis ces fonctions.

from __future__ import annotations

from django.db.models import Case, IntegerField, Sum, When
from django.utils import timezone

from apps.payments.domain.money import Money

from . import chart_of_accounts as coa
from .models import LedgerAccount, LedgerEntry


def _balance_query(account_code: str, payee_code: str | None = None, at=None):
    qs = LedgerEntry.objects.filter(account__code=account_code)
    if payee_code is not None:
        qs = qs.filter(payee_code=payee_code)
    if at is not None:
        qs = qs.filter(transaction__occurred_at__lte=at)
    return qs


def raw_balance(account_code: str, payee_code: str | None = None, at=None) -> int:
    """
    Solde brut en convention DEBIT POSITIVE.

    Un compte de passif aura donc un solde negatif en convention brute.
    Preferer `balance()` qui applique le sens normal du compte.
    """
    qs = _balance_query(account_code, payee_code, at)
    agg = qs.aggregate(
        debits=Sum(
            Case(When(direction=LedgerEntry.Direction.DEBIT, then="amount_xaf"),
                 default=0, output_field=IntegerField())
        ),
        credits=Sum(
            Case(When(direction=LedgerEntry.Direction.CREDIT, then="amount_xaf"),
                 default=0, output_field=IntegerField())
        ),
    )
    return (agg["debits"] or 0) - (agg["credits"] or 0)


def balance(account_code: str, payee_code: str | None = None, at=None) -> int:
    """
    Solde dans le SENS NORMAL du compte.

    Un compte crediteur (passif, produit) retourne un nombre positif quand
    il est effectivement crediteur. C'est la lecture attendue par un
    comptable comme par un ecran d'administration.
    """
    compte = LedgerAccount.objects.filter(code=account_code).first()
    if compte is None:
        raise ValueError(f"Compte inconnu : {account_code}")
    brut = raw_balance(account_code, payee_code, at)
    return brut if compte.normal_side == coa.DEBIT else -brut


def balance_money(account_code: str, payee_code: str | None = None, at=None) -> Money:
    return Money(balance(account_code, payee_code, at))


def payee_balance(payee_code: str, account_code: str, at=None) -> int:
    """Solde individuel d'un beneficiaire sur un compte auxiliaire."""
    return balance(account_code, payee_code=payee_code, at=at)


def payee_totals(payee_code: str, at=None) -> dict:
    """
    Tout ce que BelivaY doit — ou reclame — a un beneficiaire.

    `amount_due` est le montant reglable : dette moins creance.
    """
    dettes = sum(
        balance(code, payee_code=payee_code, at=at)
        for code in (
            coa.PAYABLE_VENDOR,
            coa.PAYABLE_DELIVERY_COMPANY,
            coa.PAYABLE_RELAY_POINT,
            coa.PAYABLE_ADJUSTMENT,
        )
    )
    creances = balance(coa.RECEIVABLE_PARTNER, payee_code=payee_code, at=at)
    return {
        "payee_code": payee_code,
        "payable_xaf": dettes,
        "receivable_xaf": creances,
        "amount_due_xaf": dettes - creances,
        "as_of": at or timezone.now(),
    }


def trial_balance(at=None) -> list[dict]:
    """
    Balance generale : un solde par compte.

    La somme des soldes bruts DOIT valoir zero. C'est le controle global
    du registre.
    """
    lignes = []
    for compte in LedgerAccount.objects.all().order_by("code"):
        brut = raw_balance(compte.code, at=at)
        if brut == 0 and not LedgerEntry.objects.filter(account=compte).exists():
            continue
        lignes.append({
            "code": compte.code,
            "name": compte.name,
            "type": compte.account_type,
            "normal_side": compte.normal_side,
            "debit_xaf": brut if brut > 0 else 0,
            "credit_xaf": -brut if brut < 0 else 0,
            "balance_xaf": brut if compte.normal_side == coa.DEBIT else -brut,
        })
    return lignes


def trial_balance_total(at=None) -> int:
    """Doit valoir zero. Toute autre valeur signale une corruption."""
    return sum(
        raw_balance(compte.code, at=at)
        for compte in LedgerAccount.objects.all()
    )


def psp_treasury(at=None, degraded: bool = False) -> dict:
    """
    Etat de la tresorerie PSP, famille par famille.

    En mode degrade, la ventilation par operateur est marquee NON OPPOSABLE :
    elle est reconstruite depuis nos propres flux et non confirmee par le
    prestataire.
    """
    disponible = {
        code: balance(code, at=at)
        for code in (coa.PSP_AVAILABLE, coa.PSP_AVAILABLE_MTN, coa.PSP_AVAILABLE_ORANGE)
    }
    return {
        "available": disponible,
        "available_total": sum(disponible.values()),
        "pending_settlement": balance(coa.PSP_PENDING, at=at),
        "reserved": balance(coa.PSP_RESERVED, at=at),
        "in_transit": balance(coa.PSP_IN_TRANSIT, at=at),
        "total": sum(balance(code, at=at) for code in coa.PSP_CODES),
        "per_operator_authoritative": not degraded,
    }


def third_party_liabilities(at=None) -> dict:
    """
    Tout ce que BelivaY doit a des tiers.

    Ce total ne constitue JAMAIS un produit (principe P8) : ce sont des
    passifs, base de calcul de la solvabilite.
    """
    detail = {
        code: balance(code, at=at)
        for code in sorted(coa.THIRD_PARTY_LIABILITY_CODES)
    }
    return {"detail": detail, "total": sum(detail.values())}


def revenue_summary(at=None) -> dict:
    """
    Chiffre d'affaires BelivaY et marge nette.

    Base fiscale = produits uniquement. Les montants destines aux tiers
    n'y figurent pas.
    """
    produits = {code: balance(code, at=at) for code in sorted(coa.REVENUE_CODES)}
    charges = {
        code: balance(code, at=at)
        for code in (coa.EXPENSE_PSP_COLLECT, coa.EXPENSE_PSP_PAYOUT, coa.EXPENSE_WRITEOFF)
    }
    ca = sum(produits.values())
    total_charges = sum(charges.values())
    return {
        "revenue_detail": produits,
        "revenue_total": ca,
        "expense_detail": charges,
        "expense_total": total_charges,
        "net_margin_xaf": ca - total_charges,
        "margin_rate": (
            round((ca - total_charges) / ca * 100, 2) if ca else None
        ),
    }