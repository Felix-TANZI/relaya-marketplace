# backend/apps/payments/ledger/posting.py
# SEUL point d'ecriture du registre comptable.
#
# Aucun autre module ne cree de LedgerTransaction ni de LedgerEntry
# directement. Toute ecriture passe par post(). Un seul chemin d'ecriture
# signifie une seule surface a securiser et a auditer.

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional, Sequence

from django.db import transaction as db_transaction
from django.db.models import Max
from django.utils import timezone

from apps.payments.domain.money import Money

from . import chart_of_accounts as coa
from .models import (
    LedgerAccount,
    LedgerEntry,
    LedgerTransaction,
    UnbalancedTransaction,
)


class PostingError(Exception):
    """Erreur d'ecriture au registre."""


@dataclass(frozen=True)
class Line:
    """
    Une ligne a ecrire.

    `amount` est un Money ou un entier positif. Le sens porte le signe :
    on n'ecrit jamais de montant negatif.
    """
    account_code: str
    direction: str  # DEBIT | CREDIT
    amount: object
    payee_code: str = ""
    label: str = ""

    def amount_int(self) -> int:
        if isinstance(self.amount, Money):
            return self.amount.amount
        if isinstance(self.amount, bool) or not isinstance(self.amount, int):
            raise PostingError(
                f"Montant invalide pour {self.account_code} : "
                f"{type(self.amount).__name__}. Attendu Money ou int."
            )
        return self.amount


def debit(account_code: str, amount, payee_code: str = "", label: str = "") -> Line:
    return Line(account_code, LedgerEntry.Direction.DEBIT, amount, payee_code, label)


def credit(account_code: str, amount, payee_code: str = "", label: str = "") -> Line:
    return Line(account_code, LedgerEntry.Direction.CREDIT, amount, payee_code, label)


def _next_reference(kind: str, moment) -> str:
    annee = moment.year
    compteur = LedgerTransaction.objects.filter(
        created_at__year=annee
    ).count() + 1
    return f"BLV-LDG-{annee}-{compteur:07d}"


@db_transaction.atomic
def post(
    *,
    kind: str,
    lines: Sequence[Line],
    description: str = "",
    source_type: str = "",
    source_ref: str = "",
    correlation_id: str = "",
    occurred_at=None,
    reverses: Optional[LedgerTransaction] = None,
    created_by_label: str = "",
) -> LedgerTransaction:
    """
    Ecrit une transaction equilibree.

    Verifie AVANT ecriture :
      - au moins deux lignes
      - tous les montants strictement positifs
      - somme des debits = somme des credits
      - payee_code coherent avec le caractere auxiliaire du compte
      - aucun compte reserve mouvemente

    Puis chaine l'empreinte sous verrou, pour qu'une ecriture concurrente
    ne casse pas la chaine d'integrite.
    """
    if len(lines) < 2:
        raise PostingError(
            "Une transaction comptable exige au moins deux lignes "
            f"(recu : {len(lines)})."
        )

    moment = occurred_at or timezone.now()

    # ── Validation prealable, avant toute ecriture ───────────────────────────
    codes = {ligne.account_code for ligne in lines}
    comptes = {c.code: c for c in LedgerAccount.objects.filter(code__in=codes)}

    manquants = codes - set(comptes)
    if manquants:
        raise PostingError(
            f"Comptes inconnus : {', '.join(sorted(manquants))}. "
            "Lancer seed_chart_of_accounts."
        )

    total = 0
    for ligne in lines:
        montant = ligne.amount_int()
        if montant <= 0:
            raise PostingError(
                f"Montant nul ou negatif sur {ligne.account_code} ({montant}). "
                "Le sens porte le signe, jamais le montant."
            )
        compte = comptes[ligne.account_code]
        if compte.is_reserved:
            raise PostingError(
                f"Le compte {compte.code} ({compte.name}) est reserve : "
                "aucun mouvement autorise en Phase 1."
            )
        if compte.is_auxiliary and not ligne.payee_code:
            raise PostingError(
                f"Le compte auxiliaire {compte.code} exige un payee_code."
            )
        if not compte.is_auxiliary and ligne.payee_code:
            raise PostingError(
                f"Le compte {compte.code} n'est pas auxiliaire : "
                "payee_code doit rester vide."
            )
        total += montant if ligne.direction == LedgerEntry.Direction.DEBIT else -montant

    if total != 0:
        debits = sum(
            l.amount_int() for l in lines if l.direction == LedgerEntry.Direction.DEBIT
        )
        credits = sum(
            l.amount_int() for l in lines if l.direction == LedgerEntry.Direction.CREDIT
        )
        raise UnbalancedTransaction(
            f"Transaction desequilibree : debits {debits}, credits {credits}, "
            f"ecart {total} XAF. Aucune ecriture n'a ete effectuee."
        )

    # ── Verrou de chainage ───────────────────────────────────────────────────
    # On serialise la creation pour que previous_hash reste coherent.
    derniere = (
        LedgerTransaction.objects.select_for_update()
        .order_by("-seq")
        .first()
    )
    precedent_hash = derniere.entry_hash if derniere else ""

    tx = LedgerTransaction(
        reference=_next_reference(kind, moment),
        kind=kind,
        occurred_at=moment,
        description=description,
        source_type=source_type,
        source_ref=source_ref,
        correlation_id=correlation_id,
        reverses=reverses,
        previous_hash=precedent_hash,
        created_by_label=created_by_label,
    )
    LedgerTransaction.objects.bulk_create([tx])
    tx.refresh_from_db()

    ecritures = [
        LedgerEntry(
            transaction=tx,
            account=comptes[ligne.account_code],
            direction=ligne.direction,
            amount_xaf=ligne.amount_int(),
            payee_code=ligne.payee_code,
            label=ligne.label,
        )
        for ligne in lines
    ]
    LedgerEntry.objects.bulk_create(ecritures)

    tx.refresh_from_db()
    tx.entry_hash = tx.compute_hash()
    LedgerTransaction.objects.filter(pk=tx.pk).update(entry_hash=tx.entry_hash)

    return tx


@db_transaction.atomic
def reverse(
    original: LedgerTransaction,
    *,
    reason: str,
    created_by_label: str = "",
) -> LedgerTransaction:
    """
    Contre-passe une transaction : memes comptes, sens inverses.

    On ne modifie ni ne supprime jamais l'originale. Les deux transactions
    coexistent, et leur somme est nulle. L'historique reste complet.
    """
    if not reason or not reason.strip():
        raise PostingError("Le motif de contre-passation est obligatoire.")

    deja = LedgerTransaction.objects.filter(reverses=original).first()
    if deja is not None:
        raise PostingError(
            f"La transaction {original.reference} est deja contre-passee "
            f"par {deja.reference}."
        )

    inverse = LedgerEntry.Direction
    lignes = [
        Line(
            account_code=e.account.code,
            direction=(
                inverse.CREDIT if e.direction == inverse.DEBIT else inverse.DEBIT
            ),
            amount=e.amount_xaf,
            payee_code=e.payee_code,
            label=f"Contre-passation : {e.label}" if e.label else "Contre-passation",
        )
        for e in original.entries.select_related("account").order_by("id")
    ]

    return post(
        kind=LedgerTransaction.Kind.REVERSAL,
        lines=lignes,
        description=f"Contre-passation de {original.reference}. {reason.strip()}",
        source_type=original.source_type,
        source_ref=original.source_ref,
        correlation_id=original.correlation_id,
        reverses=original,
        created_by_label=created_by_label,
    )