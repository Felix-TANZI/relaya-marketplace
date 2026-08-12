# backend/apps/payments/tasks/jobs.py
# Les taches planifiees du module financier.
#
# ─────────────────────────────────────────────────────────────────────────────
# POURQUOI L'ORDONNANCEUR N'EST PAS OPTIONNEL
#
# La documentation CamPay est explicite :
#     « Your callback url will be notified when a transaction is
#       SUCCESSFUL or FAILED. »
#
# AUCUN webhook n'est emis pour une transaction restee en PENDING. Un
# acheteur qui ne compose jamais son code ne genere donc jamais de
# notification : le polling n'est pas un filet de securite en cas de panne,
# c'est le SEUL moyen de detecter ces transactions bloquees.
#
# Sans ordonnanceur, trois choses ne se produisent JAMAIS :
#   - les paiements bloques restent invisibles pour toujours
#   - les sequestres ne s'auto-confirment pas, donc aucun vendeur n'est paye
#   - les lots de reglement ne se construisent pas
# ─────────────────────────────────────────────────────────────────────────────

from __future__ import annotations

import logging

from django.utils import timezone

from .base import payments_task

logger = logging.getLogger("apps.payments.tasks")


# ─────────────────────────────────────────────────────────────────────────────
# ENCAISSEMENTS
# ─────────────────────────────────────────────────────────────────────────────

@payments_task(
    "poll_pending_payments", lock_timeout=300, critical=True,
    description=(
        "Interroge le prestataire sur les paiements en attente. "
        "SEUL moyen de detecter une transaction bloquee : CamPay ne notifie "
        "que sur SUCCESSFUL ou FAILED."
    ),
)
def poll_pending_payments(limit: int = 100) -> dict:
    from apps.payments.application.collect import poll_pending_attempts
    return poll_pending_attempts(limit=limit)


@payments_task(
    "expire_stale_intents", lock_timeout=300,
    description="Expire les intentions de paiement dont le delai est depasse.",
)
def expire_stale_intents() -> dict:
    from apps.payments.application.collect import expire_stale_intents as expirer
    return {"expired": expirer()}


# ─────────────────────────────────────────────────────────────────────────────
# SEQUESTRES
# ─────────────────────────────────────────────────────────────────────────────

@payments_task(
    "escrow_auto_confirm", lock_timeout=600, critical=True,
    description=(
        "Confirme automatiquement les sequestres dont le delai sans litige "
        "est echu. Sans cette tache, un acheteur qui ne confirme jamais sa "
        "reception empeche definitivement le paiement du vendeur."
    ),
)
def escrow_auto_confirm(limit: int = 200) -> dict:
    from apps.payments.escrow.services import auto_confirm_due_holds
    return auto_confirm_due_holds(limit=limit)


@payments_task(
    "escrow_release", lock_timeout=600, critical=True,
    description=(
        "Libere les sequestres dont l'echeance est atteinte. Ecrit au "
        "registre : la dette de sequestre devient une dette exigible."
    ),
)
def escrow_release(limit: int = 200) -> dict:
    from apps.payments.escrow.services import release_due_holds
    return release_due_holds(limit=limit)


# ─────────────────────────────────────────────────────────────────────────────
# REGLEMENTS
# ─────────────────────────────────────────────────────────────────────────────

@payments_task(
    "build_settlements", lock_timeout=900, critical=True,
    description=(
        "Construit les lots de reglement du cycle : agrege les sequestres "
        "liberes et impute les ajustements."
    ),
)
def build_settlements(cycle_key: str = "", confirm: bool = True) -> dict:
    from apps.payments.settlements.services import (
        SettlementError, build_batches_for_cycle, confirm_batch, exceptional_share,
    )

    lots = build_batches_for_cycle(cycle_key=cycle_key)
    confirmes, erreurs = 0, []
    if confirm:
        for lot in lots:
            try:
                confirm_batch(lot)
                confirmes += 1
            except SettlementError as exc:
                erreurs.append(f"{lot.reference} : {exc}")

    part = exceptional_share()
    if part["alert"]:
        logger.error(
            "ALERTE REGLEMENTAIRE : %s %% des montants regles le sont hors "
            "cycle (seuil %s %%). Le modele s'apparente de fait a un "
            "portefeuille.",
            part["share_by_amount_percent"], part["alert_threshold_percent"],
        )

    return {
        "batches": len(lots),
        "confirmed": confirmes,
        "errors": erreurs[:20],
        "total_net_xaf": sum(l.net_amount_xaf for l in lots),
        "exceptional_alert": part["alert"],
        "exceptional_share_percent": part["share_by_amount_percent"],
    }


@payments_task(
    "execute_payouts", lock_timeout=1800, critical=True,
    description=(
        "Execute les versements approuves. UN SEUL processus a la fois — "
        "prudence operationnelle, jamais un mecanisme de surete."
    ),
)
def execute_payouts(limit: int = 50) -> dict:
    from apps.payments.settlements.services import execute_approved_payouts

    resultats = execute_approved_payouts(limit=limit)
    if resultats.get("inconnus"):
        logger.error(
            "%s versement(s) a issue INCONNUE. Ne JAMAIS retenter sans "
            "reconciliation : l'argent est peut-etre deja parti.",
            resultats["inconnus"],
        )
    return resultats


# ─────────────────────────────────────────────────────────────────────────────
# INTEGRITE ET MAINTENANCE
# ─────────────────────────────────────────────────────────────────────────────

@payments_task(
    "verify_ledger_integrity", lock_timeout=900, critical=True,
    description=(
        "Verifie les invariants comptables et la chaine d'integrite. "
        "Une violation de solvabilite exige le gel immediat des versements."
    ),
)
def verify_ledger_integrity(limit: int | None = 1000) -> dict:
    from apps.payments.ledger.invariants import run_all

    degrade = _mode_degrade()
    rapport = run_all(degraded=degrade, limit=limit)

    violations = [
        {"code": r.code, "name": r.name, "detail": r.detail[:300]}
        for r in rapport["violations"]
    ]
    if rapport["must_freeze_payouts"]:
        logger.error(
            "INVARIANT COMPTABLE VIOLE — gel des versements requis : %s",
            violations,
        )
    return {
        "ok": rapport["ok"],
        "must_freeze_payouts": rapport["must_freeze_payouts"],
        "violations": violations,
        "degraded_mode": degrade,
    }


def _mode_degrade() -> bool:
    """Le prestataire expose-t-il un solde par operateur ?"""
    try:
        from apps.payments.config.resolver import active_provider
        config = active_provider()
        if config is None:
            return True
        return not config.exposes_balance_per_operator
    except Exception:
        return True


# ─────────────────────────────────────────────────────────────────────────────
# RECONCILIATION — Lot 10
# ─────────────────────────────────────────────────────────────────────────────

@payments_task(
    "reconcile_solvency", lock_timeout=300, critical=True,
    description=(
        "N1 — Compare le solde REEL du prestataire aux dettes envers les "
        "tiers. Un deficit est l'alerte la plus grave du systeme."
    ),
)
def reconcile_solvency_task() -> dict:
    from apps.payments.reconciliation.services import reconcile_solvency

    run = reconcile_solvency()
    critiques = run.discrepancies.filter(severity="CRITICAL").count()
    if critiques:
        logger.error(
            "INSOLVABILITE OU ECART CRITIQUE detecte (%s) — "
            "gel des versements requis. Execution %s.",
            critiques, run.reference,
        )
    return {
        "run": run.reference, "status": run.status,
        "discrepancies": run.discrepancy_count,
        "critical": critiques, "gap_xaf": run.total_gap_xaf,
    }


@payments_task(
    "reconcile_escrow", lock_timeout=600, critical=True,
    description=(
        "N2 — Verifie que le compte de sequestre correspond a la somme des "
        "sequestres actifs. Un ecart signale un bug de code."
    ),
)
def reconcile_escrow_task() -> dict:
    from apps.payments.reconciliation.services import reconcile_escrow

    run = reconcile_escrow()
    return {
        "run": run.reference, "status": run.status,
        "discrepancies": run.discrepancy_count,
        "gap_xaf": run.total_gap_xaf,
    }


@payments_task(
    "reconcile_transactions", lock_timeout=1800, critical=True,
    description=(
        "N3 — Rapproche l'historique du prestataire et le registre. Detecte "
        "les transactions fantomes, presentes d'un seul cote."
    ),
)
def reconcile_transactions_task(days: int = 1) -> dict:
    from apps.payments.reconciliation.services import reconcile_transactions

    run = reconcile_transactions(days=days)
    return {
        "run": run.reference, "status": run.status,
        "checked": run.checked_count,
        "discrepancies": run.discrepancy_count,
        "error": run.error[:200],
    }


@payments_task(
    "resolve_unknown_payouts", lock_timeout=900, critical=True,
    description=(
        "Repond a « l'argent est-il parti ? » sur les versements a issue "
        "inconnue. Resout PAR LECTURE de l'historique, jamais par un renvoi."
    ),
)
def resolve_unknown_payouts_task(days: int = 7) -> dict:
    from apps.payments.reconciliation.services import resolve_unknown_payouts

    run = resolve_unknown_payouts(days=days)
    resume = run.summary or {}
    if resume.get("candidates_needing_human"):
        logger.error(
            "%s versement(s) inconnu(s) apparie(s) de facon NON "
            "DETERMINISTE. Arbitrage humain requis — execution %s.",
            resume["candidates_needing_human"], run.reference,
        )
    return {"run": run.reference, "status": run.status, **resume}


# ─────────────────────────────────────────────────────────────────────────────
# RISQUE — Lot 11
# ─────────────────────────────────────────────────────────────────────────────

@payments_task(
    "recompute_trust_scores", lock_timeout=1800,
    description=(
        "Recalcule le score de confiance des partenaires. Signale les "
        "degradations brutales : un partenaire qui perd 15 points pose un "
        "probleme different d'un partenaire stablement bas."
    ),
)
def recompute_trust_scores(limit: int = 500) -> dict:
    from apps.payments.risk.services import recompute_all_trust_scores
    return recompute_all_trust_scores(limit=limit)


@payments_task(
    "execute_refunds", lock_timeout=1800, critical=True,
    description=(
        "Execute les remboursements approuves. Sans cette tache, un "
        "acheteur qui gagne son litige ne recupere jamais son argent."
    ),
)
def execute_refunds(limit: int = 50) -> dict:
    from apps.payments.settlements.services import execute_approved_refunds

    resultats = execute_approved_refunds(limit=limit)
    if resultats.get("inconnus"):
        logger.error(
            "%s remboursement(s) a issue INCONNUE. Ne JAMAIS retenter sans "
            "reconciliation.", resultats["inconnus"],
        )
    return resultats


@payments_task(
    "purge_technical_retention", lock_timeout=900,
    description=(
        "Purge la RETENTION TECHNIQUE uniquement — empreintes anti-rejeu et "
        "corps bruts de webhooks. Ne touche JAMAIS aux pieces soumises a "
        "conservation legale."
    ),
)
def purge_technical_retention(replay_days: int = 30, body_days: int = 90) -> dict:
    from django.conf import settings

    from apps.payments.webhooks.models import WebhookEvent
    from apps.payments.webhooks.receiver import purge_replay_guards

    empreintes = purge_replay_guards(older_than_days=replay_days)

    # ─────────────────────────────────────────────────────────────────────
    # Le corps brut est efface, les METADONNEES sont conservees : reference,
    # statut, empreinte, horodatage. La piste d'audit reste complete.
    #
    # AUCUNE table de la classe CONSERVATION n'est jamais ciblee ici :
    # registre, ecritures, chaine d'audit, releves de reglement,
    # justificatifs, pieces KYC, preuves de litige.
    # ─────────────────────────────────────────────────────────────────────
    limite = timezone.now() - timezone.timedelta(days=body_days)
    corps = WebhookEvent.objects.filter(
        received_at__lt=limite,
    ).exclude(raw_body="").update(raw_body="")

    return {
        "replay_guards_purged": empreintes,
        "webhook_bodies_cleared": corps,
        "metadata_preserved": True,
    }


@payments_task(
    "refresh_task_health", lock=False,
    description="Etat de sante des taches planifiees.",
)
def refresh_task_health(max_age_minutes: int = 120) -> dict:
    from .models import TaskRun

    sante = TaskRun.health(max_age_minutes=max_age_minutes)
    alertes = [s for s in sante if s["alert"]]
    if alertes:
        logger.error(
            "Taches CRITIQUES muettes depuis plus de %s minutes : %s",
            max_age_minutes, [s["task_name"] for s in alertes],
        )
    return {
        "checked": len(sante),
        "stale": sum(1 for s in sante if s["stale"]),
        "critical_alerts": [s["task_name"] for s in alertes],
    }


# ─────────────────────────────────────────────────────────────────────────────
# CADENCE RECOMMANDEE
# ─────────────────────────────────────────────────────────────────────────────
#
# `every_minutes` sert a la fois au planificateur cron et au futur Celery
# Beat. Les valeurs sont des recommandations, pas des contraintes.

SCHEDULE = [
    {"task": "poll_pending_payments", "every_minutes": 1, "group": "fast"},
    {"task": "expire_stale_intents", "every_minutes": 5, "group": "fast"},
    {"task": "escrow_auto_confirm", "every_minutes": 15, "group": "regular"},
    {"task": "escrow_release", "every_minutes": 15, "group": "regular"},
    {"task": "refresh_task_health", "every_minutes": 30, "group": "regular"},
    {"task": "reconcile_solvency", "every_minutes": 60, "group": "hourly"},
    {"task": "reconcile_escrow", "every_minutes": 60, "group": "hourly"},
    {"task": "resolve_unknown_payouts", "every_minutes": 60, "group": "hourly"},
    {"task": "reconcile_transactions", "every_minutes": 1440, "group": "daily"},
    {"task": "verify_ledger_integrity", "every_minutes": 1440, "group": "daily"},
    {"task": "recompute_trust_scores", "every_minutes": 1440, "group": "daily"},
    {"task": "purge_technical_retention", "every_minutes": 1440, "group": "daily"},
    # Reglements : cadence portee par le CYCLE CONTRACTUEL, pas par l'horloge.
    # La tache s'execute quotidiennement et ne produit un lot que si le cycle
    # du beneficiaire l'exige.
    {"task": "build_settlements", "every_minutes": 1440, "group": "settlement"},
    {"task": "execute_payouts", "every_minutes": 10, "group": "payout"},
    {"task": "execute_refunds", "every_minutes": 10, "group": "payout"},
]

GROUPS = {
    "fast": "Toutes les minutes — detection des paiements",
    "regular": "Quart d'heure — echeances de sequestre",
    "hourly": "Horaire — solvabilite et coherence",
    "daily": "Quotidien — integrite et maintenance",
    "settlement": "Quotidien — construction des lots",
    "payout": "Sorties d'argent — UN SEUL processus",
}