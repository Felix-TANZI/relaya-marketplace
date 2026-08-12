# backend/apps/payments/reporting/dashboard.py
# Synthese financiere de la plateforme.
#
# ─────────────────────────────────────────────────────────────────────────────
# A QUELLE QUESTION CE MODULE REPOND
#
#   « Est-ce que tout va bien ce matin ? »
#
# Trente ecrans d'administration ne repondent pas a cette question : ils
# repondent a trente questions precises. Une exploitation quotidienne a
# besoin d'une SYNTHESE, et surtout de savoir OU REGARDER quand quelque
# chose cloche.
#
# LECTURE SEULE, SANS AUCUN EFFET DE BORD. Consulter un tableau de bord ne
# doit jamais modifier l'etat du systeme — ni creer un compte, ni declencher
# une reconciliation, ni interroger le prestataire.
#
# Le solde du prestataire est la SEULE donnee externe, et elle est
# optionnelle : sans reseau, le reste du tableau reste lisible.
# ─────────────────────────────────────────────────────────────────────────────

from __future__ import annotations

import logging
from datetime import timedelta

from django.db.models import Count, Sum
from django.utils import timezone

logger = logging.getLogger("apps.payments.reporting")

#: Gravites, par ordre decroissant.
CRITIQUE = "CRITIQUE"
ALERTE = "ALERTE"
ATTENTION = "ATTENTION"
NORMAL = "NORMAL"

ORDRE = {CRITIQUE: 0, ALERTE: 1, ATTENTION: 2, NORMAL: 3}


def _signal(gravite: str, titre: str, detail: str = "",
            action: str = "") -> dict:
    """
    Un point d'attention.

    `action` est ce qui distingue une alerte utile d'une alerte ignoree :
    une exploitation doit savoir QUOI FAIRE, pas seulement que ca va mal.
    """
    return {"gravite": gravite, "titre": titre, "detail": detail,
            "action": action}


# ─────────────────────────────────────────────────────────────────────────────
# SECTIONS
# ─────────────────────────────────────────────────────────────────────────────

def tresorerie(interroger_prestataire: bool = True) -> dict:
    """
    Ce que la plateforme detient, et ce qu'elle doit.

    L'ecart entre les deux est LA question de solvabilite.
    """
    from apps.payments.ledger import chart_of_accounts as coa
    from apps.payments.ledger.balances import balance, third_party_liabilities

    registre = sum(balance(code) for code in coa.PSP_CODES) + balance(
        coa.BANK_BELIVAY)
    transit = balance(coa.PSP_IN_TRANSIT)
    dettes = third_party_liabilities()

    donnees = {
        "ledger_treasury_xaf": registre,
        "in_transit_xaf": transit,
        "escrow_xaf": balance(coa.ESCROW_LIABILITY),
        "payables_xaf": dettes["total"] - balance(coa.ESCROW_LIABILITY),
        "third_party_liabilities_xaf": dettes["total"],
        "provider_total_xaf": None,
        "provider_per_operator": {},
        "coverage_xaf": None,
    }

    if interroger_prestataire:
        try:
            from apps.payments.infrastructure.providers.registry import (
                get_active_provider,
            )
            solde = get_active_provider().balance()
            donnees["provider_total_xaf"] = solde.total_xaf
            donnees["provider_per_operator"] = solde.per_operator
            donnees["coverage_xaf"] = solde.total_xaf - dettes["total"]
        except Exception as exc:
            donnees["provider_error"] = str(exc)[:200]

    return donnees


def sequestres() -> dict:
    """Repartition des fonds sous sequestre par etat."""
    from apps.payments.escrow.models import EscrowHold

    par_statut = {}
    for ligne in (EscrowHold.objects.values("status")
                  .annotate(n=Count("id"), total=Sum("net_amount_xaf"))):
        par_statut[ligne["status"]] = {
            "count": ligne["n"], "total_xaf": ligne["total"] or 0,
        }

    maintenant = timezone.now()
    return {
        "by_status": par_statut,
        "due_for_auto_confirm": EscrowHold.objects.filter(
            status=EscrowHold.Status.HELD,
            auto_confirm_at__isnull=False,
            auto_confirm_at__lte=maintenant).count(),
        "due_for_release": EscrowHold.objects.filter(
            status=EscrowHold.Status.RELEASE_SCHEDULED,
            release_at__isnull=False,
            release_at__lte=maintenant).count(),
        "frozen_xaf": par_statut.get("FROZEN", {}).get("total_xaf", 0),
    }


def reglements() -> dict:
    """Etat des lots et des versements."""
    from apps.payments.settlements.models import PayoutRequest, SettlementBatch

    lots = {}
    for ligne in (SettlementBatch.objects.values("status")
                  .annotate(n=Count("id"), total=Sum("net_amount_xaf"))):
        lots[ligne["status"]] = {
            "count": ligne["n"], "total_xaf": ligne["total"] or 0,
        }

    versements = {}
    for ligne in (PayoutRequest.objects.values("status")
                  .annotate(n=Count("id"), total=Sum("amount_xaf"))):
        versements[ligne["status"]] = {
            "count": ligne["n"], "total_xaf": ligne["total"] or 0,
        }

    from apps.payments.settlements.services import exceptional_share

    return {
        "batches_by_status": lots,
        "payouts_by_status": versements,
        "awaiting_approval": versements.get(
            "PENDING_APPROVAL", {}).get("count", 0),
        "unknown_payouts": versements.get("UNKNOWN", {}).get("count", 0),
        "unknown_xaf": versements.get("UNKNOWN", {}).get("total_xaf", 0),
        "exceptional": exceptional_share(),
    }


def integrite() -> dict:
    """Invariants comptables et ecarts de reconciliation ouverts."""
    from apps.payments.ledger.balances import trial_balance_total
    from apps.payments.ledger.invariants import run_all
    from apps.payments.reconciliation.services import open_discrepancies_summary

    rapport = run_all(limit=500)
    return {
        "trial_balance": trial_balance_total(),
        "invariants_ok": rapport["ok"],
        "must_freeze_payouts": rapport["must_freeze_payouts"],
        "violations": [
            {"code": v.code, "name": v.name, "detail": v.detail[:200],
             "blocking": v.blocking}
            for v in rapport["violations"]
        ],
        "discrepancies": open_discrepancies_summary(),
    }


def ordonnanceur() -> dict:
    """Les taches planifiees tournent-elles ?"""
    from apps.payments.tasks.models import TaskRun

    sante = TaskRun.health(max_age_minutes=180)
    return {
        "tasks": sante,
        "stale": [s["task_name"] for s in sante if s["stale"]],
        "critical_alerts": [s["task_name"] for s in sante if s["alert"]],
        "never_run": all(s["last_success_at"] is None for s in sante),
    }


def activite(jours: int = 7) -> dict:
    """Volume recent — pour distinguer « tout va bien » de « rien ne bouge »."""
    from apps.payments.intents.models import PaymentIntent

    depuis = timezone.now() - timedelta(days=jours)
    recentes = PaymentIntent.objects.filter(created_at__gte=depuis)

    par_statut = dict(
        recentes.values_list("status").annotate(n=Count("id"))
    )
    encaisse = recentes.filter(
        status=PaymentIntent.Status.SUCCEEDED
    ).aggregate(t=Sum("amount_xaf"))["t"] or 0

    return {
        "period_days": jours,
        "intents_by_status": par_statut,
        "intents_total": recentes.count(),
        "collected_xaf": encaisse,
        "pending": par_statut.get(PaymentIntent.Status.PROCESSING, 0)
                   + par_statut.get(PaymentIntent.Status.REQUIRES_ACTION, 0),
    }


# ─────────────────────────────────────────────────────────────────────────────
# SYNTHESE
# ─────────────────────────────────────────────────────────────────────────────

def build(interroger_prestataire: bool = True, jours: int = 7) -> dict:
    """Tableau de bord complet, avec ses signaux ordonnes par gravite."""
    donnees = {
        "generated_at": timezone.now(),
        "treasury": tresorerie(interroger_prestataire),
        "escrow": sequestres(),
        "settlements": reglements(),
        "integrity": integrite(),
        "scheduler": ordonnanceur(),
        "activity": activite(jours),
    }
    donnees["signals"] = _analyser(donnees)
    donnees["worst"] = (
        donnees["signals"][0]["gravite"] if donnees["signals"] else NORMAL
    )
    return donnees


def _analyser(d: dict) -> list:
    """
    Traduit les chiffres en points d'attention ACTIONNABLES.

    L'ordre importe : le plus grave en premier. Une exploitation lit les
    trois premieres lignes, rarement les quinze.
    """
    signaux = []
    integrite_ = d["integrity"]
    tresorerie_ = d["treasury"]
    reglements_ = d["settlements"]
    ordonnanceur_ = d["scheduler"]

    # ── Comptabilite ────────────────────────────────────────────────────────
    if integrite_["trial_balance"] != 0:
        signaux.append(_signal(
            CRITIQUE, "Balance generale desequilibree",
            f"Ecart de {integrite_['trial_balance']} XAF.",
            "Le registre est corrompu. GELER les versements et identifier "
            "l'ecriture fautive avant toute autre operation.",
        ))

    if integrite_["must_freeze_payouts"]:
        codes = ", ".join(v["code"] for v in integrite_["violations"]
                          if v["blocking"])
        signaux.append(_signal(
            CRITIQUE, "Invariant bloquant viole",
            f"Invariant(s) : {codes}.",
            "GELER les versements. Lancer : python manage.py "
            "verify_ledger_integrity",
        ))

    # ── Solvabilite ─────────────────────────────────────────────────────────
    couverture = tresorerie_.get("coverage_xaf")
    if couverture is not None and couverture < 0:
        signaux.append(_signal(
            CRITIQUE, "Insolvabilite",
            f"Deficit de {abs(couverture)} XAF entre le solde prestataire "
            f"et les dettes envers les tiers.",
            "GELER les versements. Verifier qu'aucun encaissement n'a ete "
            "comptabilise sans etre recu, et qu'aucun versement n'est parti "
            "en double.",
        ))
    elif tresorerie_.get("provider_error"):
        signaux.append(_signal(
            ATTENTION, "Solde prestataire indisponible",
            tresorerie_["provider_error"],
            "La solvabilite ne peut pas etre verifiee. Controler l'acces au "
            "prestataire.",
        ))

    # ── Versements a issue inconnue ─────────────────────────────────────────
    if reglements_["unknown_payouts"]:
        signaux.append(_signal(
            ALERTE,
            f"{reglements_['unknown_payouts']} versement(s) a issue INCONNUE",
            f"{reglements_['unknown_xaf']} XAF en transit.",
            "NE JAMAIS RETENTER. Lancer : python manage.py payments_tick "
            "--only resolve_unknown_payouts",
        ))

    # ── Ecarts de reconciliation ────────────────────────────────────────────
    ecarts = integrite_["discrepancies"]
    if ecarts["critical_open"]:
        signaux.append(_signal(
            ALERTE, f"{ecarts['critical_open']} ecart(s) CRITIQUE(S) ouvert(s)",
            f"{ecarts['total_gap_xaf']} XAF au total.",
            "Consulter les ecarts de reconciliation dans l'administration. "
            "Chacun porte une action suggeree.",
        ))
    elif ecarts["open_total"]:
        signaux.append(_signal(
            ATTENTION, f"{ecarts['open_total']} ecart(s) ouvert(s)",
            "Aucun n'est critique.",
            "A traiter sans urgence.",
        ))

    # ── Ordonnanceur ────────────────────────────────────────────────────────
    if ordonnanceur_["never_run"]:
        signaux.append(_signal(
            ALERTE, "Aucune tache planifiee n'a jamais tourne",
            "Les paiements bloques restent invisibles, les sequestres ne "
            "s'auto-confirment pas, et aucun vendeur n'est paye.",
            "Planifier : python manage.py payments_tick --crontab",
        ))
    elif ordonnanceur_["critical_alerts"]:
        signaux.append(_signal(
            ALERTE,
            f"{len(ordonnanceur_['critical_alerts'])} tache(s) CRITIQUE(S) "
            "muette(s)",
            ", ".join(ordonnanceur_["critical_alerts"]),
            "Verifier le crontab et le journal des executions.",
        ))
    elif ordonnanceur_["stale"]:
        signaux.append(_signal(
            ATTENTION,
            f"{len(ordonnanceur_['stale'])} tache(s) en retard",
            ", ".join(ordonnanceur_["stale"]),
            "Aucune n'est critique.",
        ))

    # ── Exposition reglementaire ────────────────────────────────────────────
    exceptionnel = reglements_["exceptional"]
    if exceptionnel["alert"]:
        signaux.append(_signal(
            ALERTE, "Part de reglements hors cycle trop elevee",
            f"{exceptionnel['share_by_amount_percent']} % des montants "
            f"(seuil {exceptionnel['alert_threshold_percent']} %).",
            "Le modele s'apparente de fait a un PORTEFEUILLE, ce que le "
            "referentiel interdit. Restreindre les derogations.",
        ))

    # ── Files d'attente ─────────────────────────────────────────────────────
    if reglements_["awaiting_approval"]:
        signaux.append(_signal(
            ATTENTION,
            f"{reglements_['awaiting_approval']} versement(s) en attente "
            "d'approbation",
            "Des partenaires attendent leur reglement.",
            "Approuver dans l'administration — le demandeur ne peut pas "
            "approuver sa propre demande.",
        ))

    echu = d["escrow"]["due_for_release"] + d["escrow"]["due_for_auto_confirm"]
    if echu:
        signaux.append(_signal(
            ATTENTION, f"{echu} sequestre(s) a echeance depassee",
            "Ils devraient avoir ete traites par l'ordonnanceur.",
            "Lancer : python manage.py payments_tick --group regular",
        ))

    signaux.sort(key=lambda s: ORDRE[s["gravite"]])
    return signaux