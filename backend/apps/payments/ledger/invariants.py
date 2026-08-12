# backend/apps/payments/ledger/invariants.py
# Les invariants du registre comptable.
#
# Chaque invariant repond a une question precise :
#
#   1. Somme nulle          — chaque transaction est-elle equilibree ?
#   2. Balance generale     — le registre entier est-il equilibre ?
#   3. Chaine d'integrite   — l'historique a-t-il ete altere ?
#   4. Solvabilite globale  — detenons-nous au moins ce que nous devons ?
#   5. Liquidite par porteur— pouvons-nous payer sur CE pool operateur ?
#   6. Non-transit produit  — un passif de tiers a-t-il ete pris pour un revenu ?
#   7. Comptes reserves     — un compte hors perimetre a-t-il ete mouvemente ?
#
# Les invariants 4 et 5 sont ceux qui protegent l'argent reel. Le 6 protege
# la base fiscale. Le 3 protege contre l'alteration a posteriori.
#
# NOTE : l'invariant "equation de sequestre" (solde 2010 = somme des holds)
# ne peut etre verifie qu'a partir du Lot 7, quand EscrowHold existera.
# Il est declare ici et retourne un statut NON_APPLICABLE en attendant —
# plutot que d'etre absent et oublie.

from __future__ import annotations

from dataclasses import dataclass, field

from . import chart_of_accounts as coa
from .balances import (
    balance,
    psp_treasury,
    third_party_liabilities,
    trial_balance_total,
)
from .models import LedgerAccount, LedgerEntry, LedgerTransaction

OK = "OK"
VIOLATED = "VIOLATED"
NOT_APPLICABLE = "NOT_APPLICABLE"
WARNING = "WARNING"


@dataclass
class InvariantResult:
    code: str
    name: str
    status: str
    detail: str = ""
    data: dict = field(default_factory=dict)
    blocking: bool = True

    @property
    def is_ok(self) -> bool:
        return self.status in (OK, NOT_APPLICABLE)


# ── 1. Somme nulle par transaction ───────────────────────────────────────────

def check_transaction_balance(limit: int | None = None) -> InvariantResult:
    desequilibrees = []
    qs = LedgerTransaction.objects.prefetch_related("entries").order_by("-seq")
    if limit:
        qs = qs[:limit]
    for tx in qs:
        ecart = tx.imbalance()
        if ecart != 0:
            desequilibrees.append({"reference": tx.reference, "ecart": ecart})

    if desequilibrees:
        return InvariantResult(
            "I1", "Somme nulle par transaction", VIOLATED,
            f"{len(desequilibrees)} transaction(s) desequilibree(s).",
            {"transactions": desequilibrees[:20]},
        )
    return InvariantResult("I1", "Somme nulle par transaction", OK)


# ── 2. Balance generale ──────────────────────────────────────────────────────

def check_trial_balance() -> InvariantResult:
    total = trial_balance_total()
    if total != 0:
        return InvariantResult(
            "I2", "Balance generale equilibree", VIOLATED,
            f"La somme des soldes vaut {total} au lieu de 0. Registre corrompu.",
            {"total": total},
        )
    return InvariantResult("I2", "Balance generale equilibree", OK)


# ── 3. Chaine d'integrite ────────────────────────────────────────────────────

def check_hash_chain(limit: int | None = None) -> InvariantResult:
    """
    Verifie le chainage par empreinte.

    Une transaction alteree apres coup casse son propre hash ET le lien avec
    la suivante. C'est ce qui rend une modification silencieuse detectable.
    """
    qs = LedgerTransaction.objects.prefetch_related("entries__account").order_by("seq")
    if limit:
        qs = qs.reverse()[:limit]
        qs = sorted(qs, key=lambda t: t.seq)

    ruptures = []
    hash_attendu = None
    for tx in qs:
        if not tx.entry_hash:
            ruptures.append({"reference": tx.reference, "motif": "empreinte absente"})
            continue
        if hash_attendu is not None and tx.previous_hash != hash_attendu:
            ruptures.append({
                "reference": tx.reference,
                "motif": "chainon rompu",
                "attendu": hash_attendu[:16],
                "trouve": (tx.previous_hash or "")[:16],
            })
        if not tx.verify_hash():
            ruptures.append({
                "reference": tx.reference,
                "motif": "contenu altere apres ecriture",
            })
        hash_attendu = tx.entry_hash

    if ruptures:
        return InvariantResult(
            "I3", "Chaine d'integrite", VIOLATED,
            f"{len(ruptures)} rupture(s) detectee(s). Alteration de l'historique.",
            {"ruptures": ruptures[:20]},
        )
    return InvariantResult("I3", "Chaine d'integrite", OK)


# ── 4. Solvabilite globale ───────────────────────────────────────────────────

def check_solvency() -> InvariantResult:
    """
    Detenons-nous au moins ce que nous devons ?

    Violation = la plateforme doit plus qu'elle ne detient.
    C'est l'alerte la plus grave du systeme.
    """
    tresorerie = psp_treasury()
    dettes = third_party_liabilities()
    detenu = tresorerie["total"] + balance(coa.BANK_BELIVAY)
    du = dettes["total"]

    if detenu < du:
        return InvariantResult(
            "I4", "Solvabilite globale", VIOLATED,
            f"Detenu {detenu} XAF, du {du} XAF. Deficit de {du - detenu} XAF. "
            "Gel immediat des versements requis.",
            {"detenu": detenu, "du": du, "deficit": du - detenu},
        )
    return InvariantResult(
        "I4", "Solvabilite globale", OK,
        f"Detenu {detenu} XAF pour {du} XAF dus.",
        {"detenu": detenu, "du": du, "marge": detenu - du},
    )


# ── 5. Liquidite par porteur ─────────────────────────────────────────────────

def check_operator_liquidity(pending_by_operator: dict | None = None,
                             degraded: bool = True) -> InvariantResult:
    """
    Disposons-nous du solde sur LE BON pool operateur ?

    Le code ER301 de CamPay porte sur le solde du porteur specifique :
    MTN et Orange sont des pools distincts. Un invariant global ne peut
    structurellement pas prevenir un ER301.

    En mode degrade (le prestataire n'expose pas de solde par operateur),
    le controle devient PREVENTIF et non bloquant : on ne peut pas
    reconcilier une information qu'on n'a pas.
    """
    if pending_by_operator is None:
        pending_by_operator = {}

    if degraded:
        return InvariantResult(
            "I5", "Liquidite par porteur", NOT_APPLICABLE,
            "Mode degrade : le prestataire n'expose pas de solde par operateur. "
            "Controle preventif uniquement (voir Jalon A).",
            blocking=False,
        )

    manques = {}
    for operateur, attendu in pending_by_operator.items():
        code = coa.PSP_BY_OPERATOR.get(operateur.upper())
        if code is None:
            continue
        disponible = balance(code)
        if disponible < attendu:
            manques[operateur] = {
                "disponible": disponible,
                "requis": attendu,
                "manque": attendu - disponible,
            }

    if manques:
        return InvariantResult(
            "I5", "Liquidite par porteur", VIOLATED,
            "Solde insuffisant sur un ou plusieurs pools operateur. "
            "Risque d'ER301 au prochain cycle de reglement.",
            {"manques": manques},
        )
    return InvariantResult("I5", "Liquidite par porteur", OK)


# ── 6. Non-transit par un compte de produit ──────────────────────────────────

def check_no_escrow_revenue_transit() -> InvariantResult:
    """
    Un montant du a un tiers a-t-il ete comptabilise en produit ?

    Principe P8 : seules les commissions et la part plateforme constituent
    le chiffre d'affaires. Comptabiliser les encaissements bruts en produit
    conduirait a surpayer massivement l'impot.

    Detection : une transaction ou le compte de sequestre est DEBITE et un
    compte de produit CREDITE dans le meme mouvement, hors contre-passation.
    """
    suspectes = []
    qs = (
        LedgerTransaction.objects
        .exclude(kind=LedgerTransaction.Kind.REVERSAL)
        .prefetch_related("entries__account")
    )
    for tx in qs:
        lignes = list(tx.entries.all())
        escrow_debite = any(
            e.account.code == coa.ESCROW_LIABILITY
            and e.direction == LedgerEntry.Direction.DEBIT
            for e in lignes
        )
        produit_credite = any(
            e.account.code in coa.REVENUE_CODES
            and e.direction == LedgerEntry.Direction.CREDIT
            for e in lignes
        )
        if escrow_debite and produit_credite:
            suspectes.append(tx.reference)

    if suspectes:
        return InvariantResult(
            "I6", "Sequestre jamais reconnu en produit", VIOLATED,
            f"{len(suspectes)} transaction(s) transferent du sequestre vers un produit. "
            "Base fiscale faussee.",
            {"transactions": suspectes[:20]},
        )
    return InvariantResult("I6", "Sequestre jamais reconnu en produit", OK)


# ── 7. Comptes reserves ──────────────────────────────────────────────────────

def check_reserved_accounts() -> InvariantResult:
    mouvementes = (
        LedgerEntry.objects
        .filter(account__is_reserved=True)
        .values_list("account__code", flat=True)
        .distinct()
    )
    codes = sorted(set(mouvementes))
    if codes:
        return InvariantResult(
            "I7", "Comptes reserves non mouvementes", VIOLATED,
            f"Comptes hors perimetre Phase 1 mouvementes : {', '.join(codes)}.",
            {"comptes": codes},
        )
    return InvariantResult("I7", "Comptes reserves non mouvementes", OK)


# ── 8. Equation de sequestre — activee au Lot 7 ──────────────────────────────

def check_escrow_equation() -> InvariantResult:
    """
    solde 2010 == somme des sequestres qui immobilisent encore des fonds.

    ACTIVE AU LOT 10.

    Un ecart signale un BUG DE CODE, pas une fraude — mais se traite avec la
    meme severite : l'argent des tiers n'est plus correctement represente.

    CANCELLED compte parmi les etats immobilisants : le sequestre est annule
    mais l'argent reste detenu tant que le remboursement n'est pas execute.
    """
    try:
        from apps.payments.escrow.models import EscrowHold
    except ImportError:
        return InvariantResult(
            "I8", "Equation de sequestre", NOT_APPLICABLE,
            "EscrowHold n'existe pas encore.", blocking=False,
        )

    immobilisants = (
        EscrowHold.Status.PENDING, EscrowHold.Status.HELD,
        EscrowHold.Status.RELEASE_SCHEDULED, EscrowHold.Status.FROZEN,
        EscrowHold.Status.CANCELLED,
    )
    holds = EscrowHold.objects.filter(status__in=immobilisants)
    attendu = sum(h.payable_amount_xaf for h in holds)
    observe = balance(coa.ESCROW_LIABILITY)

    if attendu != observe:
        return InvariantResult(
            "I8", "Equation de sequestre", VIOLATED,
            f"Compte 2010 : {observe} XAF. Somme des sequestres actifs : "
            f"{attendu} XAF. Ecart de {attendu - observe} XAF. "
            "Bug de code probable — ne rien corriger a la main.",
            {"ledger": observe, "holds": attendu, "gap": attendu - observe,
             "holds_count": holds.count()},
        )
    return InvariantResult(
        "I8", "Equation de sequestre", OK,
        f"{holds.count()} sequestre(s) actif(s) pour {attendu} XAF.",
        {"ledger": observe, "holds": attendu},
    )


# ── Execution groupee ────────────────────────────────────────────────────────

def run_all(degraded: bool = True, limit: int | None = None) -> dict:
    """
    Execute tous les invariants.

    `degraded` doit refleter la capacite reelle du prestataire
    (ProviderConfig.exposes_balance_per_operator).
    """
    resultats = [
        check_transaction_balance(limit=limit),
        check_trial_balance(),
        check_hash_chain(limit=limit),
        check_solvency(),
        check_operator_liquidity(degraded=degraded),
        check_no_escrow_revenue_transit(),
        check_reserved_accounts(),
        check_escrow_equation(),
    ]
    violations = [r for r in resultats if r.status == VIOLATED]
    bloquantes = [r for r in violations if r.blocking]

    return {
        "ok": not violations,
        "must_freeze_payouts": bool(bloquantes),
        "results": resultats,
        "violations": violations,
    }