# backend/apps/payments/reconciliation/services.py
# Les trois niveaux de reconciliation, plus la resolution des versements
# a issue inconnue.
#
# PRINCIPE : ON CONSTATE, ON NE CORRIGE PAS.
# Chaque ecart est qualifie, documente, assorti d'une action suggeree, et
# soumis a une decision humaine. Seule exception : la resolution d'un
# versement UNKNOWN, et uniquement avec une PREUVE issue du prestataire.

from __future__ import annotations

import logging
from datetime import timedelta

from django.db import transaction as db_transaction
from django.db.models import Sum
from django.utils import timezone

from apps.payments.escrow.models import EscrowHold
from apps.payments.infrastructure.providers.base import ProviderError
from apps.payments.infrastructure.providers.registry import get_active_provider
from apps.payments.intents.models import PaymentAttempt
from apps.payments.ledger import chart_of_accounts as coa
from apps.payments.ledger.balances import balance, third_party_liabilities
from apps.payments.settlements.models import PayoutRequest

from .models import Discrepancy, ReconciliationRun

logger = logging.getLogger("apps.payments.reconciliation")

#: Etats de sequestre qui immobilisent encore des fonds au compte 2010.
#: CANCELLED en fait partie : le sequestre est annule mais l'argent reste
#: detenu tant que le remboursement n'a pas ete execute.
HOLDING_STATUSES = (
    EscrowHold.Status.PENDING,
    EscrowHold.Status.HELD,
    EscrowHold.Status.RELEASE_SCHEDULED,
    EscrowHold.Status.FROZEN,
    EscrowHold.Status.CANCELLED,
)


def _ecart(run, *, kind, severity, detail, expected=0, observed=0,
           subject_type="", subject_ref="", provider_reference="",
           evidence=None, action="") -> Discrepancy:
    return Discrepancy.objects.create(
        run=run, kind=kind, severity=severity, detail=detail[:4000],
        expected_xaf=expected, observed_xaf=observed,
        gap_xaf=observed - expected,
        subject_type=subject_type, subject_ref=subject_ref,
        provider_reference=provider_reference,
        evidence=evidence or {}, suggested_action=action,
    )


# ─────────────────────────────────────────────────────────────────────────────
# NIVEAU 1 — SOLVABILITE
# ─────────────────────────────────────────────────────────────────────────────

def reconcile_solvency() -> ReconciliationRun:
    """
    Detenons-nous au moins ce que nous devons ?

    Compare le solde REEL chez le prestataire au total des dettes envers les
    tiers. Un deficit est l'alerte la plus grave du systeme : la plateforme
    ne peut plus honorer ses engagements.
    """
    run = ReconciliationRun.objects.create(level=ReconciliationRun.Level.SOLVENCY)

    try:
        solde = get_active_provider().balance()
    except Exception as exc:
        return run.finish(error=f"Solde prestataire indisponible : {exc}")

    dettes = third_party_liabilities()
    detenu_registre = sum(balance(c) for c in coa.PSP_CODES) + balance(coa.BANK_BELIVAY)

    resume = {
        "provider_total_xaf": solde.total_xaf,
        "provider_per_operator": solde.per_operator,
        "per_operator_authoritative": solde.is_per_operator_authoritative,
        "ledger_treasury_xaf": detenu_registre,
        "third_party_liabilities_xaf": dettes["total"],
    }

    if solde.total_xaf < dettes["total"]:
        _ecart(
            run, kind=Discrepancy.Kind.INSOLVENCY,
            severity=Discrepancy.Severity.CRITICAL,
            expected=dettes["total"], observed=solde.total_xaf,
            detail=(
                f"Le prestataire detient {solde.total_xaf} XAF alors que "
                f"BelivaY doit {dettes['total']} XAF a des tiers. "
                f"Deficit de {dettes['total'] - solde.total_xaf} XAF."
            ),
            evidence=resume,
            action=(
                "GELER IMMEDIATEMENT les versements. Verifier qu'aucun "
                "encaissement n'a ete comptabilise sans etre recu, et "
                "qu'aucun versement n'est parti en double."
            ),
        )

    ecart_tresorerie = solde.total_xaf - detenu_registre
    if ecart_tresorerie != 0:
        _ecart(
            run, kind=Discrepancy.Kind.AMOUNT_MISMATCH,
            severity=(Discrepancy.Severity.HIGH if abs(ecart_tresorerie) > 1000
                      else Discrepancy.Severity.MEDIUM),
            expected=detenu_registre, observed=solde.total_xaf,
            subject_type="Treasury", subject_ref="PSP",
            detail=(
                f"Le registre indique {detenu_registre} XAF de tresorerie, "
                f"le prestataire {solde.total_xaf} XAF. "
                f"Ecart de {ecart_tresorerie} XAF."
            ),
            evidence=resume,
            action=("Lancer le rapprochement transactionnel (N3) pour "
                    "identifier les mouvements manquants."),
        )

    if solde.is_per_operator_authoritative:
        for operateur, montant in solde.per_operator.items():
            compte = coa.PSP_BY_OPERATOR.get(operateur)
            if compte is None:
                continue
            attendu = balance(compte)
            if montant != attendu:
                _ecart(
                    run, kind=Discrepancy.Kind.OPERATOR_LIQUIDITY,
                    severity=Discrepancy.Severity.MEDIUM,
                    expected=attendu, observed=montant,
                    subject_type="Treasury", subject_ref=operateur,
                    detail=(f"Pool {operateur} : registre {attendu} XAF, "
                            f"prestataire {montant} XAF."),
                    action=(f"Un solde {operateur} insuffisant provoquera un "
                            "ER301 au prochain versement sur ce porteur."),
                )

    run.checked_count = 1
    run.save(update_fields=["checked_count"])
    return run.finish(summary=resume)


# ─────────────────────────────────────────────────────────────────────────────
# NIVEAU 2 — COHERENCE DU SEQUESTRE
# ─────────────────────────────────────────────────────────────────────────────

def reconcile_escrow() -> ReconciliationRun:
    """
    Le compte 2010 dit-il la meme chose que les sequestres ?

    Equation : solde 2010 == somme des montants exigibles des sequestres qui
    immobilisent encore des fonds.

    Un ecart signale un BUG DE CODE, pas une fraude — mais se traite avec la
    meme severite : l'argent des tiers n'est plus correctement represente.
    """
    run = ReconciliationRun.objects.create(level=ReconciliationRun.Level.ESCROW)

    solde_registre = balance(coa.ESCROW_LIABILITY)
    holds = EscrowHold.objects.filter(status__in=HOLDING_STATUSES)
    somme_holds = sum(h.payable_amount_xaf for h in holds)

    resume = {
        "ledger_escrow_xaf": solde_registre,
        "sum_active_holds_xaf": somme_holds,
        "holds_count": holds.count(),
        "gap_xaf": somme_holds - solde_registre,
    }

    if solde_registre != somme_holds:
        par_statut = {
            statut: (EscrowHold.objects.filter(status=statut)
                     .aggregate(t=Sum("net_amount_xaf"))["t"] or 0)
            for statut in HOLDING_STATUSES
        }
        _ecart(
            run, kind=Discrepancy.Kind.ESCROW_MISMATCH,
            severity=Discrepancy.Severity.CRITICAL,
            expected=somme_holds, observed=solde_registre,
            subject_type="Ledger", subject_ref=coa.ESCROW_LIABILITY,
            detail=(
                f"Le compte de sequestre indique {solde_registre} XAF, la "
                f"somme des sequestres actifs vaut {somme_holds} XAF. "
                f"Ecart de {somme_holds - solde_registre} XAF."
            ),
            evidence={**resume, "by_status": par_statut},
            action=(
                "BUG DE CODE probable. Verifier qu'une liberation n'a pas ete "
                "ecrite deux fois, ou qu'un sequestre n'a pas ete cree sans "
                "ecriture d'encaissement. Ne rien corriger a la main."
            ),
        )

    run.checked_count = holds.count()
    run.save(update_fields=["checked_count"])
    return run.finish(summary=resume)


# ─────────────────────────────────────────────────────────────────────────────
# NIVEAU 3 — RAPPROCHEMENT TRANSACTIONNEL
# ─────────────────────────────────────────────────────────────────────────────

def reconcile_transactions(*, days: int = 1, now=None) -> ReconciliationRun:
    """
    Chaque transaction du prestataire a-t-elle sa contrepartie chez nous ?

    Detecte les TRANSACTIONS FANTOMES : celles qui n'existent que d'un cote.
    Une transaction chez CamPay absente chez nous, c'est de l'argent recu ou
    parti sans trace comptable.
    """
    fin = now or timezone.now()
    debut = fin - timedelta(days=days)
    run = ReconciliationRun.objects.create(
        level=ReconciliationRun.Level.TRANSACTIONAL,
        period_start=debut, period_end=fin,
    )

    try:
        lignes = get_active_provider().history(
            start_date=debut.date(), end_date=fin.date())
    except NotImplementedError:
        return run.finish(error="Le prestataire actif n'expose pas d'historique.")
    except Exception as exc:
        return run.finish(error=f"Historique indisponible : {exc}")

    index = {}
    for t in PaymentAttempt.objects.filter(
            created_at__gte=debut - timedelta(days=1)).exclude(provider_reference=""):
        index[t.provider_reference] = ("PaymentAttempt", t)
    for v in PayoutRequest.objects.filter(
            requested_at__gte=debut - timedelta(days=1)).exclude(provider_reference=""):
        index[v.provider_reference] = ("PayoutRequest", v)

    vus, fantomes = set(), 0
    for ligne in lignes:
        reference = ligne.get("provider_reference", "")
        if not reference:
            continue
        vus.add(reference)

        correspondance = index.get(reference) or _chercher_par_description(
            ligne.get("description", ""))

        if correspondance is None:
            fantomes += 1
            _ecart(
                run, kind=Discrepancy.Kind.MISSING_LOCALLY,
                severity=Discrepancy.Severity.HIGH,
                observed=ligne.get("amount_xaf", 0),
                provider_reference=reference,
                detail=(
                    f"Transaction {reference} presente chez le prestataire "
                    f"({ligne.get('amount_xaf')} XAF, {ligne.get('status')}) "
                    "mais introuvable chez BelivaY."
                ),
                evidence={k: str(v) for k, v in ligne.items() if k != "raw"},
                action=("De l'argent a circule sans contrepartie comptable. "
                        "Identifier l'origine avant toute ecriture."),
            )
            continue

        genre, objet = correspondance
        _comparer(run, ligne, genre, objet)

    manquants = 0
    for tentative in PaymentAttempt.objects.filter(
            status=PaymentAttempt.Status.SUCCESSFUL,
            settled_at__gte=debut, settled_at__lte=fin).exclude(provider_reference=""):
        if tentative.provider_reference not in vus:
            manquants += 1
            _ecart(
                run, kind=Discrepancy.Kind.MISSING_AT_PROVIDER,
                severity=Discrepancy.Severity.HIGH,
                expected=tentative.amount_xaf,
                subject_type="PaymentAttempt",
                subject_ref=tentative.external_reference,
                provider_reference=tentative.provider_reference,
                detail=(
                    f"Encaissement {tentative.external_reference} confirme "
                    "chez BelivaY mais absent de l'historique du prestataire."
                ),
                action=("Verifier la periode interrogee, puis re-interroger. "
                        "Un encaissement fictif fausserait la solvabilite."),
            )

    run.checked_count = len(lignes)
    run.save(update_fields=["checked_count"])
    return run.finish(summary={
        "provider_rows": len(lignes),
        "ghost_at_provider": fantomes,
        "missing_at_provider": manquants,
        "period_start": debut.isoformat(),
        "period_end": fin.isoformat(),
    })


def _chercher_par_description(description: str):
    """
    Rapprochement par le champ description.

    /history/ ne renvoie PAS external_reference. Nous placons donc notre
    reference dans `description` au moment de l'appel — c'est le seul lien
    exploitable a la lecture.
    """
    texte = (description or "").strip()
    if not texte:
        return None
    for mot in texte.replace(",", " ").split():
        if mot.startswith("BLV-OUT-"):
            v = PayoutRequest.objects.filter(reference=mot).first()
            if v is not None:
                return ("PayoutRequest", v)
        if mot.startswith("BLV-PAY-"):
            t = PaymentAttempt.objects.filter(
                external_reference__startswith=mot).first()
            if t is not None:
                return ("PaymentAttempt", t)
    return None


def _comparer(run, ligne: dict, genre: str, objet) -> None:
    montant_prestataire = ligne.get("amount_xaf", 0)
    montant_local = objet.amount_xaf

    if montant_prestataire != montant_local:
        _ecart(
            run, kind=Discrepancy.Kind.AMOUNT_MISMATCH,
            severity=Discrepancy.Severity.CRITICAL,
            expected=montant_local, observed=montant_prestataire,
            subject_type=genre, subject_ref=str(objet.reference),
            provider_reference=ligne.get("provider_reference", ""),
            detail=(f"{genre} {objet.reference} : BelivaY enregistre "
                    f"{montant_local} XAF, le prestataire "
                    f"{montant_prestataire} XAF."),
            evidence={k: str(v) for k, v in ligne.items() if k != "raw"},
            action="Ne rien corriger sans avoir identifie la cause.",
        )

    statut_prestataire = ligne.get("status", "")
    statut_local = getattr(objet, "status", "")
    equivalents = {
        "SUCCESSFUL": {"SUCCESSFUL", "PAID"},
        "FAILED": {"FAILED"},
        "PENDING": {"PENDING", "INITIATED", "PROCESSING"},
    }
    attendus = equivalents.get(statut_prestataire, set())
    if attendus and statut_local not in attendus:
        _ecart(
            run, kind=Discrepancy.Kind.STATUS_MISMATCH,
            severity=Discrepancy.Severity.HIGH,
            subject_type=genre, subject_ref=str(objet.reference),
            provider_reference=ligne.get("provider_reference", ""),
            detail=(f"{genre} {objet.reference} : BelivaY dit {statut_local}, "
                    f"le prestataire dit {statut_prestataire}."),
            evidence={k: str(v) for k, v in ligne.items() if k != "raw"},
            action=("Le prestataire fait foi (principe P6). Re-interroger "
                    "la transaction pour aligner l'etat local."),
        )


# ─────────────────────────────────────────────────────────────────────────────
# RESOLUTION DES VERSEMENTS A ISSUE INCONNUE
# ─────────────────────────────────────────────────────────────────────────────

def resolve_unknown_payouts(*, days: int = 7, now=None) -> ReconciliationRun:
    """
    Repond a la question qu'un versement UNKNOWN laisse ouverte :
    L'ARGENT EST-IL PARTI ?

    ─────────────────────────────────────────────────────────────────────────
    ON RESOUT PAR LECTURE, JAMAIS PAR ECRITURE.
    Renvoyer la demande « pour voir » peut doubler un versement reel.
    ─────────────────────────────────────────────────────────────────────────

    TROIS NIVEAUX DE CERTITUDE, par ordre decroissant :
      1. reference_uuid connue      -> DETERMINISTE
      2. reference dans description -> FIABLE, notre propre marquage
      3. numero + montant + fenetre -> CANDIDAT, arbitrage humain obligatoire

    /history/ ne renvoyant pas external_reference, le niveau 1 n'existe que
    si le prestataire avait deja repondu avant le timeout.
    """
    fin = now or timezone.now()
    debut = fin - timedelta(days=days)
    run = ReconciliationRun.objects.create(
        level=ReconciliationRun.Level.UNKNOWN_PAYOUTS,
        period_start=debut, period_end=fin,
    )

    inconnus = list(PayoutRequest.objects.filter(
        status=PayoutRequest.Status.UNKNOWN,
        requested_at__gte=debut).select_related("payee"))
    if not inconnus:
        return run.finish(summary={"unknown_payouts": 0})

    try:
        lignes = get_active_provider().history(
            start_date=debut.date(), end_date=fin.date())
    except NotImplementedError:
        return run.finish(error=(
            "Le prestataire n'expose pas d'historique. "
            "La resolution devra etre manuelle."))
    except Exception as exc:
        return run.finish(error=f"Historique indisponible : {exc}")

    resolus, candidats, sans_trace = 0, 0, 0

    for versement in inconnus:
        correspondance, certitude = _apparier_versement(versement, lignes)

        if correspondance is None:
            sans_trace += 1
            _ecart(
                run, kind=Discrepancy.Kind.UNKNOWN_PAYOUT_PENDING,
                severity=Discrepancy.Severity.HIGH,
                expected=versement.amount_xaf,
                subject_type="PayoutRequest", subject_ref=versement.reference,
                detail=(
                    f"Versement {versement.reference} "
                    f"({versement.amount_xaf} XAF) : aucune trace dans "
                    f"l'historique sur {days} jours. L'argent n'est "
                    "probablement PAS parti."
                ),
                evidence={"payee": versement.payee.payee_code,
                          "msisdn_masked": versement.payee_msisdn_masked},
                action=("Probablement non emis. Confirmer aupres du support "
                        "prestataire AVANT de creer un NOUVEAU versement — "
                        "jamais en rejouant celui-ci."),
            )
            continue

        if certitude == "CANDIDATE":
            candidats += 1
            _ecart(
                run, kind=Discrepancy.Kind.UNKNOWN_PAYOUT_PENDING,
                severity=Discrepancy.Severity.CRITICAL,
                expected=versement.amount_xaf,
                observed=correspondance.get("amount_xaf", 0),
                subject_type="PayoutRequest", subject_ref=versement.reference,
                provider_reference=correspondance.get("provider_reference", ""),
                detail=(
                    f"Versement {versement.reference} : une transaction "
                    "CORRESPOND par numero, montant et date, mais sans "
                    "identifiant certain. Rapprochement NON DETERMINISTE."
                ),
                evidence={k: str(v) for k, v in correspondance.items()
                          if k != "raw"},
                action=("ARBITRAGE HUMAIN REQUIS. Confirmer aupres du "
                        "beneficiaire ou du support prestataire. Ne jamais "
                        "conclure automatiquement sur cette base."),
            )
            continue

        resolus += 1
        _resoudre_versement(run, versement, correspondance, certitude)

    return run.finish(summary={
        "unknown_payouts": len(inconnus),
        "resolved": resolus,
        "candidates_needing_human": candidats,
        "no_trace": sans_trace,
        "provider_rows": len(lignes),
    })


def _apparier_versement(versement: PayoutRequest, lignes: list) -> tuple:
    """Retourne (ligne, certitude) — EXACT, DESCRIPTION ou CANDIDATE."""
    if versement.provider_reference:
        for ligne in lignes:
            if ligne.get("provider_reference") == versement.provider_reference:
                return ligne, "EXACT"

    for ligne in lignes:
        if versement.reference in (ligne.get("description") or ""):
            return ligne, "DESCRIPTION"

    emis = versement.executed_at or versement.requested_at
    for ligne in lignes:
        if ligne.get("amount_xaf") != versement.amount_xaf:
            continue
        if ligne.get("endpoint") and ligne["endpoint"] != "withdraw":
            continue
        horodatage = ligne.get("occurred_at")
        if horodatage and emis and abs((horodatage - emis).total_seconds()) > 3600:
            continue
        return ligne, "CANDIDATE"

    return None, ""


def _resoudre_versement(run, versement: PayoutRequest, ligne: dict,
                        certitude: str) -> None:
    """
    Applique l'issue REELLE d'un versement dont l'etat etait inconnu.

    C'est la SEULE porte de sortie de l'etat UNKNOWN, et elle n'est
    empruntee qu'avec une preuve issue du prestataire.
    """
    from apps.payments.escrow.services import payable_account_for
    from apps.payments.ledger.models import LedgerTransaction
    from apps.payments.ledger.posting import credit, debit, post

    statut = (ligne.get("status") or "").upper()

    with db_transaction.atomic():
        verrouille = PayoutRequest.objects.select_for_update().select_related(
            "payee").get(pk=versement.pk)
        if verrouille.status != PayoutRequest.Status.UNKNOWN:
            return

        if statut == "SUCCESSFUL":
            post(
                kind=LedgerTransaction.Kind.RECONCILIATION,
                lines=[
                    debit(payable_account_for(verrouille.payee),
                          verrouille.amount_xaf,
                          payee_code=verrouille.payee.payee_code,
                          label=f"Versement confirme {verrouille.reference}"),
                    credit(coa.PSP_IN_TRANSIT, verrouille.amount_xaf,
                           label="Sortie du transit apres reconciliation"),
                ],
                description=(f"Reconciliation de {verrouille.reference} : "
                             f"versement CONFIRME (certitude {certitude})."),
                source_type="PayoutRequest", source_ref=verrouille.reference,
                created_by_label="reconciliation.resolve_unknown_payouts",
            )
            verrouille.provider_reference = ligne.get("provider_reference", "")
            verrouille.transition_to(PayoutRequest.Status.PAID, save=False)
            verrouille.settled_at = timezone.now()
            verrouille.save(update_fields=["status", "settled_at",
                                           "provider_reference"])
            severite = Discrepancy.Severity.INFO
            detail = (f"Versement {verrouille.reference} CONFIRME par "
                      f"l'historique (certitude {certitude}). L'argent est "
                      "bien parti.")

        elif statut == "FAILED":
            post(
                kind=LedgerTransaction.Kind.RECONCILIATION,
                lines=[
                    debit(coa.psp_account_for(verrouille.payee_operator,
                                              degraded=True),
                          verrouille.amount_xaf,
                          label="Retour en tresorerie apres reconciliation"),
                    credit(coa.PSP_IN_TRANSIT, verrouille.amount_xaf,
                           label=f"Versement echoue {verrouille.reference}"),
                ],
                description=(f"Reconciliation de {verrouille.reference} : "
                             f"versement ECHOUE (certitude {certitude})."),
                source_type="PayoutRequest", source_ref=verrouille.reference,
                created_by_label="reconciliation.resolve_unknown_payouts",
            )
            verrouille.error_message = (
                f"Echec confirme par reconciliation : {ligne.get('status')}")
            verrouille.transition_to(PayoutRequest.Status.FAILED, save=False)
            verrouille.save(update_fields=["status", "error_message"])
            severite = Discrepancy.Severity.MEDIUM
            detail = (f"Versement {verrouille.reference} ECHOUE selon "
                      "l'historique. L'argent n'est pas parti, il revient en "
                      "tresorerie. Un NOUVEAU versement peut etre cree.")
        else:
            severite = Discrepancy.Severity.HIGH
            detail = (f"Versement {verrouille.reference} : statut "
                      f"{statut or '(vide)'} non concluant. L'etat reste "
                      "INCONNU.")

    _ecart(
        run, kind=Discrepancy.Kind.UNKNOWN_PAYOUT_RESOLVED,
        severity=severite, expected=versement.amount_xaf,
        observed=ligne.get("amount_xaf", 0),
        subject_type="PayoutRequest", subject_ref=versement.reference,
        provider_reference=ligne.get("provider_reference", ""),
        detail=detail,
        evidence={**{k: str(v) for k, v in ligne.items() if k != "raw"},
                  "match_certainty": certitude},
        action=("Aucune action requise." if severite == Discrepancy.Severity.INFO
                else "Verifier la coherence du registre."),
    )


# ─────────────────────────────────────────────────────────────────────────────
# VUE D'ENSEMBLE
# ─────────────────────────────────────────────────────────────────────────────

def open_discrepancies_summary() -> dict:
    ouverts = Discrepancy.objects.filter(
        resolution__in=[Discrepancy.Resolution.OPEN,
                        Discrepancy.Resolution.INVESTIGATING])
    par_severite = {
        severite: ouverts.filter(severity=severite).count()
        for severite, _ in Discrepancy.Severity.choices
    }
    return {
        "open_total": ouverts.count(),
        "by_severity": par_severite,
        "critical_open": par_severite.get(Discrepancy.Severity.CRITICAL, 0),
        "total_gap_xaf": sum(abs(d.gap_xaf) for d in ouverts),
        "must_freeze_payouts": par_severite.get(
            Discrepancy.Severity.CRITICAL, 0) > 0,
    }