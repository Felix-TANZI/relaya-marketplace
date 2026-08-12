# backend/apps/payments/settlements/services.py
# Cycle de reglement : agregation, compensation, versement.
#
# CHAINE COMPLETE
#   sequestres liberes  ->  lot agrege  ->  ajustements imputes
#   ->  demande de versement  ->  approbation(s)  ->  UN appel /withdraw/
#
# TROIS REGLES DE SURETE, toutes verrouillees par des tests
#   1. Un versement n'est JAMAIS rejoue. Sur timeout -> etat UNKNOWN, gel.
#   2. La compensation ne touche QUE des montants devenus exigibles.
#   3. Le demandeur n'est jamais l'approbateur.

from __future__ import annotations

import logging
from datetime import timedelta
from decimal import ROUND_FLOOR, Decimal

from django.db import transaction as db_transaction
from django.db.models import Sum
from django.utils import timezone

from apps.payments.escrow.models import EscrowHold
from apps.payments.escrow.services import payable_account_for
from apps.payments.infrastructure.providers.base import (
    ProviderStatus,
    ProviderTimeout,
    WithdrawRequest,
)
from apps.payments.infrastructure.providers.registry import get_active_provider
from apps.payments.ledger import chart_of_accounts as coa
from apps.payments.ledger.models import LedgerTransaction
from apps.payments.ledger.posting import credit, debit, post
from apps.payments.payees.models import PayeeAccount
from apps.payments.payees.services import payout_blockers

from .models import (
    Adjustment, PayoutApproval, PayoutRequest, Refund, SettlementBatch,
)

logger = logging.getLogger("apps.payments.settlements")

DEFAULT_MAX_OFFSET_PERCENT = Decimal("50.00")


class SettlementError(Exception):
    """Erreur du cycle de reglement."""


# ─────────────────────────────────────────────────────────────────────────────
# POLITIQUE
# ─────────────────────────────────────────────────────────────────────────────

def payout_policy_for(payee: PayeeAccount):
    """Politique de versement applicable. Aucune valeur en dur (principe P2)."""
    from apps.payments.config.models import PayoutPolicy

    return (
        PayoutPolicy.current().filter(payee_type=payee.payee_type)
        .order_by("-priority").first()
        or PayoutPolicy.current().filter(payee_type="").order_by("-priority").first()
    )


def _politique_valeur(politique, champ, defaut):
    if politique is None:
        return defaut
    valeur = getattr(politique, champ, None)
    return defaut if valeur is None else valeur


# ─────────────────────────────────────────────────────────────────────────────
# 1. AGREGATION
# ─────────────────────────────────────────────────────────────────────────────

@db_transaction.atomic
def build_batch(payee: PayeeAccount, *, period_start=None, period_end=None,
                cycle_key: str = "", is_exceptional: bool = False,
                exceptional_reason: str = "") -> SettlementBatch | None:
    """
    Agrege les sequestres liberes et non encore regles d'un beneficiaire.

    Un vendeur avec 40 commandes liberees genere UN versement, pas 40.
    Chaque appel /withdraw/ a un cout, un risque d'echec, et ajoute une
    ligne de reconciliation.

    Retourne None si rien n'est a regler.
    """
    fin = period_end or timezone.now()
    debut = period_start or (fin - timedelta(days=3650))

    liberes = list(
        EscrowHold.objects.select_for_update()
        .filter(
            payee=payee,
            status=EscrowHold.Status.RELEASED,
            settlement_batch_ref="",
            released_at__gte=debut,
            released_at__lte=fin,
        )
        .order_by("released_at")
    )
    if not liberes:
        return None

    brut = sum(h.payable_amount_xaf for h in liberes)
    if brut <= 0:
        return None

    lot = SettlementBatch(
        payee=payee, cycle_key=cycle_key or payee.settlement_cycle_key,
        period_start=debut, period_end=fin,
        gross_amount_xaf=brut, adjustments_xaf=0, net_amount_xaf=brut,
        status=SettlementBatch.Status.DRAFT,
        is_exceptional=is_exceptional,
        exceptional_reason=exceptional_reason.strip(),
    )
    lot.save()
    lot.covered_holds.set(liberes)

    EscrowHold.objects.filter(pk__in=[h.pk for h in liberes]).update(
        settlement_batch_ref=lot.reference,
    )

    apply_adjustments(lot)
    return lot


@db_transaction.atomic
def apply_adjustments(batch: SettlementBatch) -> SettlementBatch:
    """
    Impute les ajustements sur un lot, dans la limite du plafond de retenue.

    ─────────────────────────────────────────────────────────────────────────
    POURQUOI UN PLAFOND
      Sans lui, un partenaire qui doit autant qu'on lui doit touche ZERO. Il
      ne peut plus s'approvisionner ni livrer, et la retenue integrale
      s'apparente juridiquement a une saisie.

      Une petite creance ne doit pas non plus geler l'integralite des
      reglements : elle s'impute progressivement. Le gel total reste reserve
      a la fraude, au KYC et au litige majeur.
    ─────────────────────────────────────────────────────────────────────────
    """
    politique = payout_policy_for(batch.payee)
    plafond_pct = Decimal(str(_politique_valeur(
        politique, "max_offset_percent", DEFAULT_MAX_OFFSET_PERCENT,
    )))
    plancher = int(_politique_valeur(politique, "min_settlement_after_offset_xaf", 0))

    retenue_max = int(
        (Decimal(batch.gross_amount_xaf) * plafond_pct / Decimal(100))
        .to_integral_value(rounding=ROUND_FLOOR)
    )
    if plancher:
        retenue_max = min(retenue_max, max(0, batch.gross_amount_xaf - plancher))

    # Bonus et compensations dus AU partenaire : ajoutes sans plafond.
    credits_du = list(
        Adjustment.objects.select_for_update().filter(
            payee=batch.payee, direction=Adjustment.Direction.DEBIT,
            status=Adjustment.Status.APPROVED, remaining_xaf__gt=0,
        ).order_by("created_at")
    )
    # Creances DU partenaire : retenues, dans la limite du plafond.
    dettes = list(
        Adjustment.objects.select_for_update().filter(
            payee=batch.payee, direction=Adjustment.Direction.CREDIT,
            status=Adjustment.Status.APPROVED, remaining_xaf__gt=0,
        ).order_by("created_at")
    )

    imputes = []
    total_ajustement = 0

    for ajustement in credits_du:
        montant = ajustement.remaining_xaf
        total_ajustement += montant
        Adjustment.objects.filter(pk=ajustement.pk).update(
            remaining_xaf=0, status=Adjustment.Status.APPLIED,
        )
        imputes.append(ajustement)

    reste_retenue = retenue_max
    for ajustement in dettes:
        if reste_retenue <= 0:
            break
        surcharge = ajustement.max_offset_percent
        if surcharge is not None:
            limite_propre = int(
                (Decimal(batch.gross_amount_xaf) * Decimal(str(surcharge)) / Decimal(100))
                .to_integral_value(rounding=ROUND_FLOOR)
            )
            disponible = min(reste_retenue, limite_propre)
        else:
            disponible = reste_retenue

        montant = min(ajustement.remaining_xaf, disponible)
        if montant <= 0:
            continue

        total_ajustement -= montant
        reste_retenue -= montant
        restant = ajustement.remaining_xaf - montant
        Adjustment.objects.filter(pk=ajustement.pk).update(
            remaining_xaf=restant,
            status=(Adjustment.Status.APPLIED if restant == 0
                    else Adjustment.Status.APPROVED),
        )
        imputes.append(ajustement)

    net = batch.gross_amount_xaf + total_ajustement
    if net < 0:
        net = 0

    SettlementBatch.objects.filter(pk=batch.pk).update(
        adjustments_xaf=total_ajustement, net_amount_xaf=net,
    )
    batch.refresh_from_db()
    if imputes:
        batch.applied_adjustments.set(imputes)
    return batch


@db_transaction.atomic
def confirm_batch(batch: SettlementBatch) -> SettlementBatch:
    """Fige un lot : plus aucun sequestre ne s'y ajoute."""
    if batch.status != SettlementBatch.Status.DRAFT:
        return batch
    if batch.net_amount_xaf <= 0:
        raise SettlementError(
            f"Le lot {batch.reference} a un net nul apres imputation : "
            "rien a verser."
        )
    return batch.transition_to(SettlementBatch.Status.CONFIRMED)


def build_batches_for_cycle(cycle_key: str = "", *, now=None,
                            payee_type: str = "") -> list[SettlementBatch]:
    """Construit les lots de tous les beneficiaires eligibles d'un cycle."""
    moment = now or timezone.now()
    qs = PayeeAccount.objects.filter(is_active=True)
    if cycle_key:
        qs = qs.filter(settlement_cycle_key=cycle_key)
    if payee_type:
        qs = qs.filter(payee_type=payee_type)

    lots = []
    for beneficiaire in qs:
        try:
            lot = build_batch(beneficiaire, period_end=moment, cycle_key=cycle_key)
            if lot is not None:
                lots.append(lot)
        except Exception as exc:
            logger.warning("Lot impossible pour %s : %s",
                           beneficiaire.payee_code, exc)
    return lots


# ─────────────────────────────────────────────────────────────────────────────
# 2. DEMANDE DE VERSEMENT
# ─────────────────────────────────────────────────────────────────────────────

@db_transaction.atomic
def request_payout(batch: SettlementBatch, *, requested_by,
                   justification: str = "") -> PayoutRequest:
    """
    Cree une demande de versement pour un lot confirme.

    Verifie AVANT creation toutes les conditions d'eligibilite du
    beneficiaire — KYC, gel, numero, periode de refroidissement.
    """
    if batch.status not in (SettlementBatch.Status.CONFIRMED,
                            SettlementBatch.Status.FAILED,
                            SettlementBatch.Status.PARTIAL):
        raise SettlementError(
            f"Le lot {batch.reference} est en {batch.status} : "
            "seul un lot confirme peut donner lieu a un versement."
        )
    if hasattr(batch, "payout") and batch.payout is not None:
        return batch.payout

    blocages = payout_blockers(batch.payee)
    if blocages:
        raise SettlementError(
            f"Versement impossible pour {batch.payee.payee_code} : "
            + " ".join(blocages)
        )

    politique = payout_policy_for(batch.payee)
    montant = batch.net_amount_xaf

    minimum = int(_politique_valeur(politique, "min_payout_xaf", 0))
    maximum = int(_politique_valeur(politique, "max_payout_xaf", 0))
    if minimum and montant < minimum:
        raise SettlementError(
            f"Montant {montant} inferieur au minimum de versement {minimum}."
        )
    if maximum and montant > maximum:
        raise SettlementError(
            f"Montant {montant} superieur au maximum de versement {maximum}."
        )

    if batch.is_exceptional:
        _verifier_exception(batch, politique)
        requises = int(_politique_valeur(politique, "exceptional_required_approvals", 2))
    else:
        requises = int(_politique_valeur(politique, "required_approvals", 1))
        seuil = int(_politique_valeur(politique, "dual_approval_threshold_xaf", 0))
        if seuil and montant >= seuil:
            requises = max(requises, 2)

    demande = PayoutRequest(
        batch=batch, payee=batch.payee, amount_xaf=montant,
        required_approvals=requises,
        payee_msisdn_masked=batch.payee.momo_number_masked,
        payee_operator=batch.payee.momo_operator,
        requested_by=requested_by,
        justification=justification.strip(),
        status=PayoutRequest.Status.DRAFT,
    )
    demande.save()
    demande.transition_to(PayoutRequest.Status.PENDING_APPROVAL)

    batch.transition_to(SettlementBatch.Status.PENDING_APPROVAL)
    return demande


def _verifier_exception(batch: SettlementBatch, politique) -> None:
    """
    Controles specifiques au reglement hors cycle.

    Le risque n'est pas UNE exception : c'est qu'elle devienne la norme. Un
    partenaire pouvant reclamer son argent quand il veut fait de BelivaY un
    detenteur de monnaie electronique.
    """
    if not _politique_valeur(politique, "allow_exceptional_settlement", False):
        raise SettlementError(
            "Les reglements hors cycle sont desactives. Les activer dans "
            "PayoutPolicy via une demande de changement approuvee."
        )
    if not batch.exceptional_reason.strip():
        raise SettlementError(
            "Un reglement hors cycle exige une justification ecrite."
        )

    plafond = int(_politique_valeur(politique, "exceptional_max_amount_xaf", 0))
    if plafond and batch.net_amount_xaf > plafond:
        raise SettlementError(
            f"Montant {batch.net_amount_xaf} superieur au plafond "
            f"exceptionnel de {plafond}."
        )

    quota = int(_politique_valeur(politique, "exceptional_max_per_month", 0))
    if quota:
        debut_mois = timezone.now().replace(
            day=1, hour=0, minute=0, second=0, microsecond=0,
        )
        deja = SettlementBatch.objects.filter(
            payee=batch.payee, is_exceptional=True,
            created_at__gte=debut_mois,
        ).exclude(pk=batch.pk).count()
        if deja >= quota:
            raise SettlementError(
                f"Quota mensuel de reglements exceptionnels atteint "
                f"({deja}/{quota}) pour {batch.payee.payee_code}."
            )


def exceptional_share(days: int = 90) -> dict:
    """
    Part des reglements exceptionnels — LE garde-fou reglementaire.

    Si cette part devient importante, le modele s'apparente de fait a un
    portefeuille, quelle que soit l'etiquette portee par les tables.
    """
    depuis = timezone.now() - timedelta(days=days)
    total = SettlementBatch.objects.filter(created_at__gte=depuis).count()
    exceptionnels = SettlementBatch.objects.filter(
        created_at__gte=depuis, is_exceptional=True,
    ).count()

    montant_total = SettlementBatch.objects.filter(
        created_at__gte=depuis
    ).aggregate(t=Sum("net_amount_xaf"))["t"] or 0
    montant_exceptionnel = SettlementBatch.objects.filter(
        created_at__gte=depuis, is_exceptional=True,
    ).aggregate(t=Sum("net_amount_xaf"))["t"] or 0

    part_nombre = round(exceptionnels / total * 100, 2) if total else 0.0
    part_montant = (
        round(montant_exceptionnel / montant_total * 100, 2) if montant_total else 0.0
    )

    from apps.payments.config.models import PayoutPolicy
    politique = PayoutPolicy.current().order_by("-priority").first()
    seuil = float(_politique_valeur(politique, "exceptional_alert_share_percent", 10))

    return {
        "period_days": days,
        "total_batches": total,
        "exceptional_batches": exceptionnels,
        "share_by_count_percent": part_nombre,
        "share_by_amount_percent": part_montant,
        "alert_threshold_percent": seuil,
        "alert": part_montant > seuil or part_nombre > seuil,
    }


# ─────────────────────────────────────────────────────────────────────────────
# 3. APPROBATION
# ─────────────────────────────────────────────────────────────────────────────

@db_transaction.atomic
def approve_payout(payout: PayoutRequest, *, approved_by,
                   comment: str = "") -> PayoutRequest:
    """
    Enregistre une approbation. Le demandeur ne peut jamais approuver.

    Controle double : ici pour un message clair, et en base par une
    contrainte — un contournement par requete directe echoue aussi.
    """
    payout = PayoutRequest.objects.select_for_update().get(pk=payout.pk)

    if payout.status != PayoutRequest.Status.PENDING_APPROVAL:
        raise SettlementError(
            f"Le versement {payout.reference} est en {payout.status} : "
            "seule une demande en attente peut etre approuvee."
        )
    if approved_by.id == payout.requested_by_id:
        raise SettlementError(
            "Separation des roles : le demandeur ne peut pas approuver son "
            "propre versement."
        )
    if payout.approvals.filter(approved_by=approved_by).exists():
        raise SettlementError(
            f"{approved_by} a deja approuve ce versement. "
            "Une seule approbation par personne."
        )

    PayoutApproval.objects.create(
        payout=payout, approved_by=approved_by, comment=comment,
    )
    payout.refresh_from_db()

    if payout.is_fully_approved:
        payout.transition_to(PayoutRequest.Status.APPROVED)
        if payout.batch_id:
            payout.batch.transition_to(SettlementBatch.Status.APPROVED)
    return payout


@db_transaction.atomic
def reject_payout(payout: PayoutRequest, *, rejected_by, reason: str) -> PayoutRequest:
    if not reason.strip():
        raise SettlementError("Le motif de rejet est obligatoire.")
    payout = PayoutRequest.objects.select_for_update().get(pk=payout.pk)
    if payout.status != PayoutRequest.Status.PENDING_APPROVAL:
        raise SettlementError("Seule une demande en attente peut etre rejetee.")
    if rejected_by.id == payout.requested_by_id:
        raise SettlementError("Le demandeur ne peut pas rejeter sa propre demande.")

    payout.error_message = reason.strip()
    payout.transition_to(PayoutRequest.Status.REJECTED, save=False)
    payout.save(update_fields=["status", "error_message"])
    _liberer_lot(payout)
    return payout


def _liberer_lot(payout: PayoutRequest) -> None:
    """Un lot rejete redevient confirme : les sequestres restent couverts."""
    if payout.batch_id:
        lot = payout.batch
        if lot.status == SettlementBatch.Status.PENDING_APPROVAL:
            SettlementBatch.objects.filter(pk=lot.pk).update(
                status=SettlementBatch.Status.CONFIRMED,
            )


# ─────────────────────────────────────────────────────────────────────────────
# 4. EXECUTION — le moment ou l'argent sort
# ─────────────────────────────────────────────────────────────────────────────

@db_transaction.atomic
def execute_payout(payout: PayoutRequest) -> PayoutRequest:
    """
    Emet le versement aupres du prestataire.

    ─────────────────────────────────────────────────────────────────────────
    JAMAIS DE REESSAI. Sur timeout, l'etat devient UNKNOWN et l'argent est
    porte en transit. Il n'existe AUCUNE transition UNKNOWN -> PROCESSING :
    retenter aveuglement peut doubler un versement reel, et c'est
    irrecuperable. Seule la reconciliation tranche.
    ─────────────────────────────────────────────────────────────────────────

    Ecritures en cas de succes :
        DEBIT  2020/2022/2023  dette envers le beneficiaire
        DEBIT  5011            frais PSP — CHARGE PLATEFORME
        CREDIT 1011/1012/1010  tresorerie PSP

    Le partenaire recoit l'INTEGRALITE de son net : aucun frais n'est
    retenu (referentiel §7.1).
    """
    payout = PayoutRequest.objects.select_for_update().select_related("payee").get(
        pk=payout.pk
    )

    if payout.status == PayoutRequest.Status.PAID:
        return payout
    if payout.status != PayoutRequest.Status.APPROVED:
        raise SettlementError(
            f"Le versement {payout.reference} est en {payout.status} : "
            "seule une demande approuvee peut etre executee."
        )

    blocages = payout_blockers(payout.payee)
    if blocages:
        raise SettlementError(
            f"Versement bloque pour {payout.payee.payee_code} : "
            + " ".join(blocages)
        )

    prestataire = get_active_provider()
    payout.provider_code = prestataire.code
    payout.transition_to(PayoutRequest.Status.PROCESSING, save=False)
    payout.executed_at = timezone.now()
    payout.save(update_fields=["provider_code", "status", "executed_at"])
    if payout.batch_id:
        payout.batch.transition_to(SettlementBatch.Status.PROCESSING)

    try:
        resultat = prestataire.withdraw(WithdrawRequest(
            external_reference=payout.provider_external_reference,
            amount_xaf=payout.amount_xaf,
            msisdn=payout.payee.momo_number,
            operator=payout.payee.momo_operator,
            description=f"BelivaY {payout.reference}",
        ))
    except ProviderTimeout as exc:
        return _issue_inconnue(payout, str(exc))
    except Exception as exc:
        return _issue_inconnue(
            payout, f"Incident technique : {type(exc).__name__} — {exc}",
        )

    payout.provider_reference = resultat.provider_reference
    payout.provider_status_raw = resultat.raw_status
    payout.response_payload = resultat.raw_response or {}
    payout.error_code = resultat.error_code
    payout.error_message = resultat.error_message

    if not resultat.accepted:
        payout.transition_to(PayoutRequest.Status.FAILED, save=False)
        payout.save()
        if payout.batch_id:
            payout.batch.transition_to(SettlementBatch.Status.FAILED)
        if resultat.error_code == "ER301":
            logger.error(
                "SOLDE MARCHAND INSUFFISANT sur %s. Gel des reglements requis.",
                payout.reference,
            )
        return payout

    payout.save()
    _comptabiliser_versement(payout)

    payout.transition_to(PayoutRequest.Status.PAID, save=False)
    payout.settled_at = timezone.now()
    payout.save(update_fields=["status", "settled_at"])
    if payout.batch_id:
        payout.batch.transition_to(SettlementBatch.Status.PAID)

    logger.info("Versement %s execute : %s XAF vers %s",
                payout.reference, payout.amount_xaf, payout.payee.payee_code)
    return payout


def _issue_inconnue(payout: PayoutRequest, message: str) -> PayoutRequest:
    """
    Timeout ou incident : on NE SAIT PAS si l'argent est parti.

    L'argent est porte en TRANSIT — ni encore chez le beneficiaire, ni
    encore disponible. Conclure a l'echec exposerait a un double versement
    au reessai.
    """
    logger.error(
        "Issue INCONNUE sur le versement %s : %s. "
        "Ne JAMAIS retenter sans reconciliation.",
        payout.reference, message,
    )
    payout.error_message = message
    payout.transition_to(PayoutRequest.Status.UNKNOWN, save=False)
    payout.save(update_fields=["status", "error_message"])

    post(
        kind=LedgerTransaction.Kind.PAYOUT,
        lines=[
            debit(coa.PSP_IN_TRANSIT, payout.amount_xaf,
                  label=f"Versement a issue inconnue {payout.reference}"),
            credit(coa.psp_account_for(payout.payee_operator, degraded=True),
                   payout.amount_xaf, label="Sortie de tresorerie presumee"),
        ],
        description=(
            f"Versement {payout.reference} — issue INCONNUE. "
            "Reconciliation obligatoire."
        ),
        source_type="PayoutRequest", source_ref=payout.reference,
        created_by_label="settlements.services.execute_payout",
    )
    return payout


def _comptabiliser_versement(payout: PayoutRequest) -> None:
    from apps.payments.config.resolver import resolve_fee_for
    from apps.payments.domain.enums import FeeScope
    from apps.payments.domain.money import Money

    frais = 0
    try:
        resolution = resolve_fee_for(
            Money(payout.amount_xaf), scope=FeeScope.PAYOUT,
            provider=payout.provider_code, operator=payout.payee_operator,
        )
        if str(resolution.bearer) == "PLATFORM":
            frais = resolution.fee.amount
    except Exception:
        frais = 0

    # ─────────────────────────────────────────────────────────────────────────
    # LA COMPENSATION DOIT SOLDER LA CREANCE AU REGISTRE
    #
    # Si 5 000 ont ete retenus sur un reglement, la dette envers le
    # partenaire s'eteint pour son montant BRUT, et la creance de BelivaY
    # disparait d'autant. Ne debiter que le net laisserait la dette
    # partiellement ouverte ET la creance intacte : on reclamerait deux fois
    # le meme argent.
    # ─────────────────────────────────────────────────────────────────────────
    ajustements = payout.batch.adjustments_xaf if payout.batch_id else 0
    brut = payout.batch.gross_amount_xaf if payout.batch_id else payout.amount_xaf

    lignes = [
        debit(payable_account_for(payout.payee), brut,
              payee_code=payout.payee.payee_code,
              label=f"Versement {payout.reference}"),
    ]

    if ajustements < 0:
        # Creance recouvree : elle s'eteint au registre.
        lignes.append(credit(
            coa.RECEIVABLE_PARTNER, -ajustements,
            payee_code=payout.payee.payee_code,
            label=f"Creance recouvree sur {payout.reference}",
        ))
    elif ajustements > 0:
        # Bonus verse : la dette d'ajustement s'eteint.
        lignes.append(debit(
            coa.PAYABLE_ADJUSTMENT, ajustements,
            payee_code=payout.payee.payee_code,
            label=f"Compensation versee sur {payout.reference}",
        ))

    if frais > 0:
        lignes.append(debit(coa.EXPENSE_PSP_PAYOUT, frais,
                            label="Frais prestataire sur versement"))

    lignes.append(credit(
        coa.psp_account_for(payout.payee_operator, degraded=True),
        payout.amount_xaf + frais, label="Sortie de tresorerie",
    ))

    post(
        kind=LedgerTransaction.Kind.PAYOUT,
        lines=lignes,
        description=f"Versement {payout.reference} vers {payout.payee.payee_code}",
        source_type="PayoutRequest", source_ref=payout.reference,
        created_by_label="settlements.services.execute_payout",
    )
    payout.psp_fee_xaf = frais
    PayoutRequest.objects.filter(pk=payout.pk).update(psp_fee_xaf=frais)


def execute_approved_payouts(limit: int = 50) -> dict:
    """
    Execute les versements approuves.

    UN SEUL WORKER doit appeler cette fonction. C'est une PRUDENCE
    OPERATIONNELLE, jamais un mecanisme de surete : la surete vient de
    l'idempotence, des contraintes en base, des verrous et de la machine
    a etats.
    """
    approuves = PayoutRequest.objects.filter(
        status=PayoutRequest.Status.APPROVED
    ).order_by("requested_at")[:limit]

    resultats = {"examines": 0, "verses": 0, "echoues": 0,
                 "inconnus": 0, "montant_xaf": 0}
    for demande in approuves:
        resultats["examines"] += 1
        try:
            issue = execute_payout(demande)
            if issue.status == PayoutRequest.Status.PAID:
                resultats["verses"] += 1
                resultats["montant_xaf"] += issue.amount_xaf
            elif issue.status == PayoutRequest.Status.UNKNOWN:
                resultats["inconnus"] += 1
            else:
                resultats["echoues"] += 1
        except SettlementError as exc:
            resultats["echoues"] += 1
            logger.warning("Versement impossible pour %s : %s",
                           demande.reference, exc)
    return resultats


# ─────────────────────────────────────────────────────────────────────────────
# REMBOURSEMENTS
# ─────────────────────────────────────────────────────────────────────────────
#
# ─────────────────────────────────────────────────────────────────────────────
# LE REMBOURSEMENT EST UN VERSEMENT VERS LE PAYEUR
#
# CamPay n'expose AUCUN endpoint de remboursement. Techniquement, rembourser
# c'est appeler /withdraw/ vers le numero qui a paye. Le chemin est donc le
# MEME que pour un versement partenaire — une seule sortie de fonds, une
# seule surface a securiser.
#
# LE RETOUR SE FAIT VERS LA SOURCE D'ORIGINE, jamais ailleurs. Rembourser
# sur un autre numero cree un transfert de valeur non consenti et constitue,
# en matiere de lutte anti-blanchiment, un schema classique : encaisser d'un
# cote, ressortir de l'autre.
#
# ACHETEUR ≠ PAYEUR : dans le segment diaspora, c'est le cas nominal. Le
# remboursement retourne au PAYEUR, pas a l'acheteur — c'est lui qui a
# avance l'argent.
# ─────────────────────────────────────────────────────────────────────────────


@db_transaction.atomic
def create_refund(intent, *, amount_xaf: int, reason: str, requested_by,
                  detail: str = "", holds=None):
    """
    Cree une demande de remboursement.

    Ne rembourse RIEN : la sortie de fonds passe par `execute_refund`, apres
    approbation par un tiers.
    """
    from apps.payments.escrow.models import EscrowHold
    from apps.payments.intents.models import PaymentIntent

    intent = PaymentIntent.objects.select_for_update().get(pk=intent.pk)

    if intent.status != PaymentIntent.Status.SUCCEEDED:
        raise SettlementError(
            f"L'intention {intent.reference} n'est pas encaissee : "
            "il n'y a rien a rembourser."
        )
    if amount_xaf <= 0:
        raise SettlementError("Le montant doit etre strictement positif.")

    # On ne rembourse jamais plus que ce qui reste encaisse.
    deja = Refund.objects.filter(
        intent=intent,
        status__in=[Refund.Status.APPROVED, Refund.Status.PROCESSING,
                    Refund.Status.PAID, Refund.Status.UNKNOWN],
    ).aggregate(t=Sum("amount_xaf"))["t"] or 0

    disponible = intent.amount_xaf - deja
    if amount_xaf > disponible:
        raise SettlementError(
            f"Remboursement de {amount_xaf} XAF impossible : {deja} XAF ont "
            f"deja ete rembourses sur {intent.amount_xaf} XAF encaisses. "
            f"Reste {disponible} XAF."
        )

    sequestres = list(holds) if holds is not None else list(
        EscrowHold.objects.filter(
            intent=intent,
            status__in=[EscrowHold.Status.HELD,
                        EscrowHold.Status.FROZEN,
                        EscrowHold.Status.CANCELLED],
        )
    )

    remboursement = Refund(
        intent=intent, amount_xaf=amount_xaf, reason=reason,
        detail=detail.strip(), requested_by=requested_by,
        status=Refund.Status.PENDING_APPROVAL,
    )
    remboursement.save()
    if sequestres:
        remboursement.source_holds.set(sequestres)

    logger.info("Remboursement %s cree : %s XAF sur %s",
                remboursement.reference, amount_xaf, intent.reference)
    return remboursement


@db_transaction.atomic
def approve_refund(refund, *, approved_by):
    """
    Approuve un remboursement. Le demandeur ne peut jamais approuver.

    Une sortie de fonds vers un acheteur merite la meme separation des roles
    qu'un versement partenaire : c'est le meme argent et le meme risque.
    """
    refund = Refund.objects.select_for_update().get(pk=refund.pk)

    if refund.status != Refund.Status.PENDING_APPROVAL:
        raise SettlementError(
            f"Le remboursement {refund.reference} est en {refund.status}."
        )
    if approved_by.id == refund.requested_by_id:
        raise SettlementError(
            "Separation des roles : le demandeur ne peut pas approuver son "
            "propre remboursement."
        )

    refund.status = Refund.Status.APPROVED
    refund.approved_by = approved_by
    refund.approved_at = timezone.now()
    refund.save(update_fields=["status", "approved_by", "approved_at"])
    return refund


@db_transaction.atomic
def execute_refund(refund):
    """
    Rembourse le PAYEUR, via le meme chemin qu'un versement.

    ─────────────────────────────────────────────────────────────────────────
    JAMAIS DE REESSAI, comme pour un versement. Sur timeout, l'etat devient
    UNKNOWN et l'argent est porte en transit. Seule la reconciliation
    tranche.
    ─────────────────────────────────────────────────────────────────────────

    Ecritures en cas de succes :
        DEBIT  2010 dette de sequestre
        CREDIT 1010 tresorerie PSP

    Le sequestre rembourse passe en REFUNDED : cet argent n'ira jamais au
    partenaire.
    """
    from apps.payments.escrow.models import EscrowHold

    refund = Refund.objects.select_for_update().select_related(
        "intent").get(pk=refund.pk)

    if refund.status == Refund.Status.PAID:
        return refund
    if refund.status != Refund.Status.APPROVED:
        raise SettlementError(
            f"Le remboursement {refund.reference} est en {refund.status} : "
            "seule une demande approuvee peut etre executee."
        )

    intent = refund.intent
    numero = intent.payer_msisdn
    if not numero:
        raise SettlementError(
            f"Le numero du payeur est introuvable sur {intent.reference}. "
            "Un remboursement ne peut PAS partir vers un autre numero."
        )

    prestataire = get_active_provider()

    # Le remboursement emprunte le meme chemin qu'un versement : on cree
    # une PayoutRequest pour beneficier de sa machine a etats, de son
    # UUID4, et de son traitement de l'issue inconnue.
    from apps.payments.bridge.actors import payee_for_buyer

    beneficiaire = payee_for_buyer(intent.buyer, create=True)
    beneficiaire.set_momo_number(numero, intent.payer_operator or "MTN")
    beneficiaire.save(update_fields=[
        "momo_number_enc", "momo_number_masked", "momo_fingerprint",
        "momo_operator", "updated_at",
    ])

    versement = PayoutRequest(
        batch=None, payee=beneficiaire, amount_xaf=refund.amount_xaf,
        required_approvals=0,
        payee_msisdn_masked=intent.payer_msisdn_masked,
        payee_operator=intent.payer_operator,
        requested_by=refund.requested_by,
        justification=f"Remboursement {refund.reference} — {refund.reason}",
        provider_code=prestataire.code,
        status=PayoutRequest.Status.DRAFT,
    )
    versement.save()
    versement.transition_to(PayoutRequest.Status.PENDING_APPROVAL, save=False)
    versement.transition_to(PayoutRequest.Status.APPROVED, save=False)
    versement.transition_to(PayoutRequest.Status.PROCESSING, save=False)
    versement.executed_at = timezone.now()
    versement.save()

    refund.payout = versement
    refund.status = Refund.Status.PROCESSING
    refund.save(update_fields=["payout", "status"])

    try:
        resultat = prestataire.withdraw(WithdrawRequest(
            external_reference=versement.provider_external_reference,
            amount_xaf=refund.amount_xaf,
            msisdn=numero,
            operator=intent.payer_operator or "",
            description=f"BelivaY {refund.reference}",
        ))
    except ProviderTimeout as exc:
        return _remboursement_inconnu(refund, versement, str(exc))
    except Exception as exc:
        return _remboursement_inconnu(
            refund, versement,
            f"Incident technique : {type(exc).__name__} — {exc}")

    versement.provider_reference = resultat.provider_reference
    versement.provider_status_raw = resultat.raw_status
    versement.response_payload = resultat.raw_response or {}
    versement.error_code = resultat.error_code
    versement.error_message = resultat.error_message

    if not resultat.accepted:
        versement.transition_to(PayoutRequest.Status.FAILED, save=False)
        versement.save()
        refund.status = Refund.Status.FAILED
        refund.save(update_fields=["status"])
        return refund

    versement.save()

    # L'argent quitte le sequestre pour retourner a l'acheteur.
    post(
        kind=LedgerTransaction.Kind.REFUND,
        lines=[
            debit(coa.ESCROW_LIABILITY, refund.amount_xaf,
                  label=f"Remboursement {refund.reference}"),
            credit(coa.psp_account_for(intent.payer_operator, degraded=True),
                   refund.amount_xaf, label="Sortie de tresorerie"),
        ],
        description=(
            f"Remboursement {refund.reference} vers le payeur de "
            f"{intent.reference} — {refund.reason}"
        ),
        source_type="Refund", source_ref=refund.reference,
        correlation_id=intent.correlation_id,
        created_by_label="settlements.services.execute_refund",
    )

    versement.transition_to(PayoutRequest.Status.PAID, save=False)
    versement.settled_at = timezone.now()
    versement.save(update_fields=["status", "settled_at"])

    refund.status = Refund.Status.PAID
    refund.save(update_fields=["status"])

    _solder_sequestres(refund)

    logger.info("Remboursement %s execute : %s XAF vers le payeur de %s",
                refund.reference, refund.amount_xaf, intent.reference)
    return refund


def _solder_sequestres(refund) -> None:
    """
    Marque les sequestres rembourses : cet argent n'ira jamais au partenaire.

    Un remboursement PARTIEL laisse le sequestre actif pour le reste — c'est
    exactement le cas d'un geste commercial sur une commande conservee.
    """
    from apps.payments.escrow.models import EscrowHold

    restant = refund.amount_xaf
    for hold in refund.source_holds.select_for_update().all():
        if restant <= 0:
            break
        part = min(restant, hold.payable_amount_xaf)
        if part <= 0:
            continue

        nouveau = hold.refunded_amount_xaf + part
        integral = nouveau >= hold.net_amount_xaf

        EscrowHold.objects.filter(pk=hold.pk).update(
            refunded_amount_xaf=nouveau,
            status=(EscrowHold.Status.REFUNDED if integral
                    else EscrowHold.Status.PARTIALLY_REFUNDED),
        )

        # ─────────────────────────────────────────────────────────────────
        # LE MIROIR DOIT SUIVRE
        #
        # `update()` sur un queryset ne declenche NI signal NI methode du
        # modele : le miroir vers Order.escrow_status serait donc manque, et
        # la commande resterait affichee comme « fonds securises » alors que
        # l'argent est retourne a l'acheteur.
        #
        # Ce defaut a ete trouve par l'epreuve de bout en bout, via
        # compare_all() — aucun test unitaire ne le voyait.
        # ─────────────────────────────────────────────────────────────────
        hold.refresh_from_db()
        _refleter_sequestre(hold)

        restant -= part

    if restant > 0:
        logger.warning(
            "Remboursement %s : %s XAF n'ont pu etre imputes a aucun "
            "sequestre. Verifier la coherence.", refund.reference, restant,
        )


def _refleter_sequestre(hold) -> None:
    """
    Reporte l'etat du sequestre sur la commande.

    Echec ABSORBE : un miroir en echec ne doit jamais annuler un
    remboursement deja effectue. L'argent prime sur l'affichage.
    """
    try:
        from apps.payments.bridge.events_out import mirror_hold
        mirror_hold(hold)
    except Exception:
        logger.exception(
            "Miroir metier indisponible apres remboursement du sequestre %s.",
            hold.reference,
        )


def _remboursement_inconnu(refund, versement, message: str):
    """
    Timeout : on NE SAIT PAS si l'argent est parti vers l'acheteur.

    Meme traitement que pour un versement partenaire — conclure a l'echec
    exposerait a un double remboursement au reessai.
    """
    logger.error(
        "Issue INCONNUE sur le remboursement %s : %s. "
        "Ne JAMAIS retenter sans reconciliation.", refund.reference, message,
    )
    versement.error_message = message
    versement.transition_to(PayoutRequest.Status.UNKNOWN, save=False)
    versement.save(update_fields=["status", "error_message"])

    post(
        kind=LedgerTransaction.Kind.REFUND,
        lines=[
            debit(coa.PSP_IN_TRANSIT, refund.amount_xaf,
                  label=f"Remboursement a issue inconnue {refund.reference}"),
            credit(coa.psp_account_for(refund.intent.payer_operator,
                                       degraded=True),
                   refund.amount_xaf, label="Sortie presumee"),
        ],
        description=(
            f"Remboursement {refund.reference} — issue INCONNUE. "
            "Reconciliation obligatoire."
        ),
        source_type="Refund", source_ref=refund.reference,
        created_by_label="settlements.services.execute_refund",
    )

    refund.status = Refund.Status.UNKNOWN
    refund.save(update_fields=["status"])
    return refund


def execute_approved_refunds(limit: int = 50) -> dict:
    """Execute les remboursements approuves. UN SEUL worker."""
    approuves = Refund.objects.filter(
        status=Refund.Status.APPROVED).order_by("created_at")[:limit]

    resultats = {"examines": 0, "rembourses": 0, "echoues": 0,
                 "inconnus": 0, "montant_xaf": 0}
    for demande in approuves:
        resultats["examines"] += 1
        try:
            issue = execute_refund(demande)
            if issue.status == Refund.Status.PAID:
                resultats["rembourses"] += 1
                resultats["montant_xaf"] += issue.amount_xaf
            elif issue.status == Refund.Status.UNKNOWN:
                resultats["inconnus"] += 1
            else:
                resultats["echoues"] += 1
        except SettlementError as exc:
            resultats["echoues"] += 1
            logger.warning("Remboursement impossible pour %s : %s",
                           demande.reference, exc)
    return resultats


# ─────────────────────────────────────────────────────────────────────────────
# 5. AJUSTEMENTS
# ─────────────────────────────────────────────────────────────────────────────

@db_transaction.atomic
def create_adjustment(*, payee: PayeeAccount, direction: str, category: str,
                      amount_xaf: int, reason: str, created_by,
                      source_order_id=None, source_event: str = "",
                      max_offset_percent=None) -> Adjustment:
    if not reason.strip():
        raise SettlementError("Le motif d'un ajustement est obligatoire.")
    if amount_xaf <= 0:
        raise SettlementError("Le montant doit etre strictement positif.")

    ajustement = Adjustment(
        payee=payee, direction=direction, category=category,
        amount_xaf=amount_xaf, remaining_xaf=amount_xaf,
        reason=reason.strip(), created_by=created_by,
        source_order_id=source_order_id, source_event=source_event,
        max_offset_percent=max_offset_percent,
    )
    ajustement.save()
    return ajustement


@db_transaction.atomic
def approve_adjustment(adjustment: Adjustment, *, approved_by) -> Adjustment:
    """
    Approuve un ajustement. Le createur ne peut jamais approuver.

    Un ajustement de categorie TRUST_SCORE au-dela d'un seuil exige aussi
    une validation humaine : un bug de calcul applique en masse viderait des
    partenaires avant qu'on le detecte.
    """
    if adjustment.status != Adjustment.Status.PENDING_APPROVAL:
        raise SettlementError(
            f"L'ajustement {adjustment.reference} est en {adjustment.status}."
        )
    if approved_by.id == adjustment.created_by_id:
        raise SettlementError(
            "Separation des roles : le createur ne peut pas approuver son "
            "propre ajustement."
        )

    adjustment.status = Adjustment.Status.APPROVED
    adjustment.approved_by = approved_by
    adjustment.approved_at = timezone.now()
    adjustment.save(update_fields=[
        "status", "approved_by", "approved_at", "updated_at",
    ])

    _comptabiliser_ajustement(adjustment)
    return adjustment


def _comptabiliser_ajustement(adjustment: Adjustment) -> None:
    if adjustment.is_debt:
        lignes = [
            debit(coa.RECEIVABLE_PARTNER, adjustment.amount_xaf,
                  payee_code=adjustment.payee.payee_code,
                  label=f"{adjustment.category} — {adjustment.reference}"),
            credit(coa.REVENUE_COMMISSION, adjustment.amount_xaf,
                   label=f"Penalite {adjustment.reference}"),
        ]
    else:
        lignes = [
            debit(coa.EXPENSE_WRITEOFF, adjustment.amount_xaf,
                  label=f"{adjustment.category} — {adjustment.reference}"),
            credit(coa.PAYABLE_ADJUSTMENT, adjustment.amount_xaf,
                   payee_code=adjustment.payee.payee_code,
                   label=f"Compensation {adjustment.reference}"),
        ]

    post(
        kind=LedgerTransaction.Kind.ADJUSTMENT,
        lines=lignes,
        description=f"{adjustment.get_category_display()} — {adjustment.reason[:120]}",
        source_type="Adjustment", source_ref=adjustment.reference,
        created_by_label="settlements.services.approve_adjustment",
    )


# ─────────────────────────────────────────────────────────────────────────────
# REMUNERATION CONTRACTUELLE D'UN POINT RELAIS
# ─────────────────────────────────────────────────────────────────────────────
#
# Un point relais n'est PAS paye par l'acheteur. Sa remuneration decoule du
# contrat signe avec BelivaY : c'est une CHARGE de la plateforme, pas une
# part du paiement.
#
# Elle rejoint le cycle de reglement par un AJUSTEMENT, comme n'importe
# quelle somme due a un partenaire. Aucun sequestre : il n'y a rien a
# proteger, l'argent ne vient pas d'un acheteur.

def relay_compensation_rule(payee: PayeeAccount, parcel_size: str = ""):
    """
    Regle applicable a ce point relais pour cette categorie de colis.

    ─────────────────────────────────────────────────────────────────────────
    QUATRE NIVEAUX, DU PLUS PRECIS AU PLUS GENERAL

        1. ce relais    + cette categorie   ← le contrat negocie
        2. ce relais    + toutes categories ← son tarif unique
        3. tout relais  + cette categorie   ← la grille generale
        4. tout relais  + toutes categories ← le filet

    Le plus precis gagne, toujours. Un relais qui a negocie un tarif
    d'encombrant garde le tarif general pour ses colis standard.

    Une taille inconnue — le champ `Shipment.parcel_size` est libre —
    tombe sur les niveaux 2 et 4 plutot que d'echouer.
    ─────────────────────────────────────────────────────────────────────────
    """
    try:
        from apps.payments.config.models import RelayCompensationRule
    except Exception:
        return None

    taille = (parcel_size or "").strip().upper()
    actives = RelayCompensationRule.current()

    combinaisons = [
        (payee.payee_code, taille),
        (payee.payee_code, ""),
        ("", taille),
        ("", ""),
    ]
    deja_vues = set()
    for code, categorie in combinaisons:
        if (code, categorie) in deja_vues:
            continue          # sans taille fournie, deux paires coincident
        deja_vues.add((code, categorie))

        regle = (
            actives.filter(payee_code=code, parcel_size=categorie)
            .order_by("-priority").first()
        )
        if regle is not None:
            return regle
    return None


def relay_accepts_size(payee: PayeeAccount, parcel_size: str) -> bool:
    """
    Ce point relais accepte-t-il cette categorie de colis ?

    ─────────────────────────────────────────────────────────────────────────
    LECTURE OFFERTE AU DOMAINE LIVRAISON

    La grille tarifaire EST le contrat : c'est elle qui dit qu'un local
    exigu ne prend pas d'encombrant. Le domaine livraison peut donc
    l'interroger AVANT de router un colis, plutot que de decouvrir le refus
    a l'arrivee du livreur.

    Le module financier ne DECIDE pas du routage — il expose ce que le
    contrat prevoit (principe P9).
    ─────────────────────────────────────────────────────────────────────────

    Sans regle du tout, on repond True : l'absence de contrat ne vaut pas
    refus, et bloquer un colis faute de configuration serait pire.
    """
    regle = relay_compensation_rule(payee, parcel_size)
    if regle is None:
        return True
    return bool(regle.is_accepted)


@db_transaction.atomic
def compensate_relay_parcel(payee: PayeeAccount, *, order_id: int,
                            parcel_reference: str, parcel_size: str = "",
                            created_by=None):
    """
    Cree la remuneration due pour un colis remis.

    ─────────────────────────────────────────────────────────────────────────
    AUCUNE APPROBATION HUMAINE, ET C'EST DELIBERE

    La decision a ete prise a la SIGNATURE DU CONTRAT, pas colis par colis.
    Exiger une approbation pour chaque remise rendrait le dispositif
    inutilisable et pousserait a approuver en masse sans lire — ce qui est
    pire qu'une approbation absente.

    `approved_by` reste NUL et `source_contract` porte la regle qui a
    autorise le montant. La contrainte maker-checker est satisfaite, et la
    piste d'audit remonte au contrat plutot qu'a une personne.
    ─────────────────────────────────────────────────────────────────────────

    Idempotent : un colis deja remunere ne l'est pas deux fois.
    """
    from django.contrib.auth.models import User

    regle = relay_compensation_rule(payee, parcel_size)
    if regle is None:
        logger.warning(
            "Aucune regle de remuneration pour le point relais %s "
            "(categorie %s). Le colis %s ne sera pas remunere.",
            payee.payee_code, parcel_size or "non precisee", parcel_reference,
        )
        return None

    if not regle.is_accepted:
        # Le contrat exclut cette categorie. Le colis a tout de meme ete
        # remis — c'est un fait metier —, mais rien n'est du. L'incident
        # merite d'etre vu : il signale un routage contraire au contrat.
        logger.error(
            "Le point relais %s a traite un colis de categorie %s que son "
            "contrat EXCLUT (colis %s). Aucune remuneration due. Verifier "
            "le routage.",
            payee.payee_code, parcel_size or "non precisee", parcel_reference,
        )
        return None

    if regle.amount_xaf <= 0:
        return None

    # Idempotence : la reference du colis identifie la prestation.
    existant = Adjustment.objects.filter(
        payee=payee, source_event=parcel_reference,
        category=Adjustment.Category.REBILLING,
    ).first()
    if existant is not None:
        return existant

    auteur = created_by
    if auteur is None:
        auteur, _ = User.objects.get_or_create(
            username="belivay-system",
            defaults={"is_active": False, "email": ""},
        )

    ajustement = Adjustment(
        payee=payee,
        # DEBIT : BelivaY doit au partenaire.
        direction=Adjustment.Direction.DEBIT,
        category=Adjustment.Category.REBILLING,
        amount_xaf=regle.amount_xaf,
        remaining_xaf=regle.amount_xaf,
        reason=(
            f"Remuneration contractuelle — colis {parcel_reference} remis"
            + (f" (categorie {regle.parcel_size})" if regle.parcel_size
               else f" (categorie {parcel_size})" if parcel_size else "")
            + f". Regle {regle.config_key} v{regle.version}"
            + (f", contrat {regle.contract_reference}"
               if regle.contract_reference else "")
        ),
        source_order_id=order_id,
        source_event=parcel_reference,
        source_contract=f"{regle.config_key}#v{regle.version}",
        # Autorise par le contrat : aucun approbateur humain.
        status=Adjustment.Status.APPROVED,
        approved_by=None,
        approved_at=timezone.now(),
        created_by=auteur,
    )
    ajustement.save()

    _comptabiliser_ajustement(ajustement)

    logger.info(
        "Remuneration relais %s : %s XAF pour le colis %s (%s)",
        payee.payee_code, regle.amount_xaf, parcel_reference,
        ajustement.reference,
    )
    return ajustement


# ─────────────────────────────────────────────────────────────────────────────
# 6. MONTANT DU — ce que le partenaire voit
# ─────────────────────────────────────────────────────────────────────────────

def _prochaine_date(payee: PayeeAccount):
    """
    Date du prochain reglement, ou None.

    Retourne None plutot qu'une approximation quand le cycle est au seuil :
    annoncer une date qui ne tiendrait pas est pire que ne rien annoncer.
    """
    from apps.payments.config.models import SettlementCycle

    cycle = None
    if payee.settlement_cycle_key:
        cycle = SettlementCycle.current().filter(
            config_key=payee.settlement_cycle_key).first()
    if cycle is None:
        cycle = SettlementCycle.current().filter(
            default_payee_type=payee.payee_type).first()
    if cycle is None:
        cycle = SettlementCycle.current().filter(
            default_payee_type="").first()
    if cycle is None:
        return None

    try:
        return cycle.next_run_at()
    except Exception:
        logger.exception(
            "Calcul de la prochaine date impossible pour le cycle %s.",
            cycle.config_key,
        )
        return None


def amount_due(payee: PayeeAccount) -> dict:
    """
    Ce que BelivaY doit a un partenaire, et ce qui ne l'est pas encore.

    IL N'Y A NI SOLDE NI BOUTON DE RETRAIT. `not_yet_due_xaf` correspond a
    des commandes VIVANTES : l'acheteur peut encore obtenir un remboursement
    integral, ces fonds ne sont donc pas la propriete du partenaire.
    """
    from apps.payments.escrow.services import payee_escrow_summary

    sequestre = payee_escrow_summary(payee)

    exigible = EscrowHold.objects.filter(
        payee=payee, status=EscrowHold.Status.RELEASED, settlement_batch_ref="",
    ).aggregate(t=Sum("net_amount_xaf"))["t"] or 0

    creances = Adjustment.objects.filter(
        payee=payee, direction=Adjustment.Direction.CREDIT,
        status__in=[Adjustment.Status.APPROVED, Adjustment.Status.APPLIED],
        remaining_xaf__gt=0,
    ).aggregate(t=Sum("remaining_xaf"))["t"] or 0

    bonus = Adjustment.objects.filter(
        payee=payee, direction=Adjustment.Direction.DEBIT,
        status=Adjustment.Status.APPROVED, remaining_xaf__gt=0,
    ).aggregate(t=Sum("remaining_xaf"))["t"] or 0

    en_cours = SettlementBatch.objects.filter(
        payee=payee,
        status__in=[
            SettlementBatch.Status.CONFIRMED,
            SettlementBatch.Status.PENDING_APPROVAL,
            SettlementBatch.Status.APPROVED,
            SettlementBatch.Status.PROCESSING,
        ],
    ).aggregate(t=Sum("net_amount_xaf"))["t"] or 0

    return {
        "payee_code": payee.payee_code,
        "due_xaf": max(0, exigible + bonus - creances),
        "released_not_settled_xaf": exigible,
        "pending_bonus_xaf": bonus,
        "outstanding_debt_xaf": creances,
        "in_settlement_xaf": en_cours,
        "not_yet_due_xaf": sequestre["not_offsettable_xaf"],
        "frozen_xaf": sequestre["frozen_xaf"],
        "next_settlement_cycle": payee.settlement_cycle_key or "(non defini)",
        "next_settlement_at": _prochaine_date(payee),
        "blockers": payout_blockers(payee),
    }