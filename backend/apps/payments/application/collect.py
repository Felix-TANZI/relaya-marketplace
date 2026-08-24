# backend/apps/payments/application/collect.py
# Cas d'usage de l'encaissement.
#
# C'est ici que les briques precedentes travaillent ensemble :
#
#   config/   resout les regles de frais et de repartition
#   domain/   calcule le plan, sans jamais toucher la base
#   payees/   identifie les beneficiaires
#   ledger/   enregistre les mouvements
#   providers/ dialogue avec le prestataire
#
# TROIS GARANTIES
#   1. Idempotence : rejouer une operation n'a aucun effet monetaire nouveau
#   2. Verrou pessimiste : deux confirmations simultanees n'ecrivent qu'une fois
#   3. Le prestataire est la source de verite : on ne conclut jamais seul

from __future__ import annotations

import logging
import uuid
from dataclasses import dataclass
from datetime import timedelta

from django.db import transaction as db_transaction
from django.utils import timezone

from apps.payments.domain.distribution import ComponentInput, DistributionPlan
from apps.payments.domain.enums import FeeScope, PaymentIntentStatus
from apps.payments.domain.money import Money
from apps.payments.infrastructure.providers.base import (
    CollectRequest,
    ProviderStatus,
    ProviderTimeout,
)
from apps.payments.infrastructure.providers.registry import (
    get_active_provider,
    get_provider_for,
)
from apps.payments.intents.models import PaymentAttempt, PaymentIntent
from apps.payments.ledger import chart_of_accounts as coa
from apps.payments.ledger.models import LedgerTransaction
from apps.payments.ledger.posting import credit, debit, post

logger = logging.getLogger("apps.payments.collect")

DEFAULT_EXPIRY_MINUTES = 30


class CollectError(Exception):
    """Erreur du parcours d'encaissement."""


@dataclass
class CollectOutcome:
    """Resultat d'une operation, lisible sans interpreter des exceptions."""
    intent: PaymentIntent
    attempt: PaymentAttempt | None = None
    status: str = ""
    message: str = ""
    requires_action: bool = False


# ─────────────────────────────────────────────────────────────────────────────
# 1. CREATION DE L'INTENTION
# ─────────────────────────────────────────────────────────────────────────────

@db_transaction.atomic
def create_payment_intent(
    *,
    buyer,
    idempotency_key: str,
    components: list[ComponentInput],
    payee_codes: dict,
    payee_types: dict,
    payer_msisdn: str,
    payer_operator: str,
    correlation_id: str = "",
    expiry_minutes: int = DEFAULT_EXPIRY_MINUTES,
) -> PaymentIntent:
    """
    Cree une intention et FIGE le plan de repartition.

    Le plan est calcule maintenant et jamais recalcule : modifier une regle
    en administration demain n'affectera pas cette intention (principe P3).
    """
    if not idempotency_key or not idempotency_key.strip():
        raise CollectError("La cle d'idempotence est obligatoire.")

    # IDEMPOTENCE : une cle deja vue renvoie l'intention existante.
    existante = PaymentIntent.objects.filter(
        idempotency_key=idempotency_key
    ).first()
    if existante is not None:
        return existante

    if not components:
        raise CollectError("Aucun composant a encaisser.")

    from apps.payments.config.resolver import build_plan_for

    plan: DistributionPlan = build_plan_for(components, payee_codes, payee_types)
    total = plan.total_distributed

    if total.amount <= 0:
        raise CollectError("Le montant total a encaisser est nul.")

    intent = PaymentIntent(
        idempotency_key=idempotency_key.strip(),
        buyer=buyer,
        amount_xaf=total.amount,
        currency=str(total.currency),
        distribution_plan=plan.as_snapshot(),
        correlation_id=correlation_id or str(uuid.uuid4()),
        expires_at=timezone.now() + timedelta(minutes=expiry_minutes),
    )
    intent.set_payer(payer_msisdn, payer_operator)
    intent.payer_relationship = _detect_relationship(buyer, intent.payer_msisdn_fingerprint)
    intent.payer_first_seen_at = _first_seen(buyer, intent.payer_msisdn_fingerprint)
    intent.config_snapshot = _config_snapshot(total, payer_operator)
    intent.save()

    return intent


def _detect_relationship(buyer, fingerprint: str) -> str:
    """
    L'acheteur paie-t-il lui-meme ?

    Au Cameroun, payer pour un proche est le cas NOMINAL du segment diaspora,
    principal moteur de marge. On le detecte pour ADAPTER les seuils
    anti-fraude, jamais pour bloquer par defaut.
    """
    deja_vu = PaymentIntent.objects.filter(
        buyer=buyer,
        payer_msisdn_fingerprint=fingerprint,
        status=PaymentIntent.Status.SUCCEEDED,
    ).exists()
    if deja_vu:
        return PaymentIntent.Relationship.SELF

    from apps.payments.payees import crypto

    telephone = (getattr(buyer, "username", "") or "").strip()
    if telephone and crypto.fingerprint(telephone) == fingerprint:
        return PaymentIntent.Relationship.SELF

    return PaymentIntent.Relationship.THIRD_PARTY


def _first_seen(buyer, fingerprint: str):
    premiere = (
        PaymentIntent.objects
        .filter(buyer=buyer, payer_msisdn_fingerprint=fingerprint)
        .order_by("created_at")
        .values_list("created_at", flat=True)
        .first()
    )
    return premiere or timezone.now()


def _config_snapshot(total: Money, operator: str) -> dict:
    """Fige les frais resolus. Aucun recalcul ulterieur."""
    from apps.payments.config.resolver import resolve_fee_for

    try:
        frais = resolve_fee_for(
            total, scope=FeeScope.COLLECT, provider=None, operator=operator,
        )
        return {
            "collect_fee": {
                "amount_xaf": frais.fee.amount,
                "bearer": str(frais.bearer),
                "rule_version_id": frais.rule_version_id,
                "rule_name": frais.rule_name,
                "computed": frais.computed,
            },
            "trace": [
                {"rule": e.name, "matched": e.matched,
                 "reason": e.failed_on or ", ".join(e.matched_on)}
                for e in frais.trace
            ],
        }
    except Exception as exc:
        # Une configuration incomplete doit etre VISIBLE, pas absorbee.
        return {"collect_fee": None, "error": str(exc)}


# ─────────────────────────────────────────────────────────────────────────────
# 2. DEMANDE D'ENCAISSEMENT
# ─────────────────────────────────────────────────────────────────────────────

@db_transaction.atomic
def initiate_collect(intent: PaymentIntent, *, provider_code: str = "") -> CollectOutcome:
    """
    Emet la demande d'encaissement aupres du prestataire.

    Idempotent : si une tentative est deja ouverte pour cette intention,
    elle est reutilisee au lieu d'en creer une seconde.
    """
    intent = PaymentIntent.objects.select_for_update().get(pk=intent.pk)

    if intent.status == PaymentIntent.Status.SUCCEEDED:
        return CollectOutcome(intent=intent, status="ALREADY_SUCCEEDED",
                              message="Cette intention est deja encaissee.")
    if intent.is_final:
        raise CollectError(
            f"L'intention {intent.reference} est dans un etat final "
            f"({intent.status}) : aucun encaissement possible."
        )
    if intent.is_expired:
        intent.transition_to(PaymentIntent.Status.EXPIRED)
        return CollectOutcome(intent=intent, status="EXPIRED",
                              message="Delai de paiement depasse.")

    ouverte = intent.attempts.filter(
        status__in=PaymentAttempt.OPEN_STATUSES
    ).order_by("-created_at").first()
    if ouverte is not None:
        return CollectOutcome(
            intent=intent, attempt=ouverte, status="ATTEMPT_IN_PROGRESS",
            message="Une demande est deja en cours sur votre telephone.",
            requires_action=True,
        )

    prestataire = (
        get_provider_for(provider_code) if provider_code else get_active_provider()
    )

    refus = prestataire.check_amount(intent.amount_xaf)
    if refus:
        raise CollectError(refus)
    if not prestataire.supports_operator(intent.payer_operator):
        raise CollectError(
            f"L'operateur {intent.payer_operator} n'est pas supporte par "
            f"{prestataire.code}."
        )

    reference_externe = f"{intent.reference}-A{intent.attempts.count() + 1:02d}"

    tentative = PaymentAttempt.objects.create(
        intent=intent,
        external_reference=reference_externe,
        provider_code=prestataire.code,
        amount_xaf=intent.amount_xaf,
        payer_msisdn_masked=intent.payer_msisdn_masked,
        payer_operator=intent.payer_operator,
        request_payload={
            "amount_xaf": intent.amount_xaf,
            "operator": intent.payer_operator,
            "msisdn_masked": intent.payer_msisdn_masked,
        },
    )

    intent.provider_code = prestataire.code
    if intent.status == PaymentIntent.Status.DRAFT:
        intent.transition_to(PaymentIntent.Status.REQUIRES_ACTION, save=False)
    intent.save(update_fields=["provider_code", "status", "updated_at"])

    try:
        resultat = prestataire.collect(CollectRequest(
            external_reference=reference_externe,
            amount_xaf=intent.amount_xaf,
            msisdn=intent.payer_msisdn,
            operator=intent.payer_operator,
            description=f"BelivaY {intent.reference}",
        ))
    except ProviderTimeout as exc:
        # Issue INCONNUE : on ne conclut rien, la tentative reste ouverte et
        # le polling tranchera. Conclure a l'echec risquerait un double debit.
        tentative.status = PaymentAttempt.Status.PENDING
        tentative.error_message = str(exc)
        tentative.save(update_fields=["status", "error_message", "updated_at"])
        return CollectOutcome(
            intent=intent, attempt=tentative, status="UNKNOWN",
            message="Le prestataire n'a pas repondu. Verification en cours.",
            requires_action=True,
        )

    tentative.provider_reference = resultat.provider_reference
    tentative.provider_status_raw = resultat.raw_status
    tentative.response_payload = resultat.raw_response
    tentative.error_code = resultat.error_code
    tentative.error_message = resultat.error_message

    if not resultat.accepted:
        tentative.status = PaymentAttempt.Status.FAILED
        tentative.save()
        # L'intention reste ouverte : l'acheteur peut retenter avec un
        # autre numero. Seule l'expiration ou l'annulation la ferme.
        return CollectOutcome(
            intent=intent, attempt=tentative, status="FAILED",
            message=resultat.error_message or "Encaissement refuse.",
        )

    tentative.status = PaymentAttempt.Status.PENDING
    tentative.save()

    intent.transition_to(PaymentIntent.Status.PROCESSING)

    return CollectOutcome(
        intent=intent, attempt=tentative, status="PENDING",
        message="Composez votre code secret sur votre telephone.",
        requires_action=True,
    )


# ─────────────────────────────────────────────────────────────────────────────
# 3. VERIFICATION AUPRES DU PRESTATAIRE
# ─────────────────────────────────────────────────────────────────────────────

def poll_attempt(attempt: PaymentAttempt) -> CollectOutcome:
    """
    Interroge le prestataire — SOURCE DE VERITE (principe P6).

    Appelee par le polling periodique ET a chaque reception de webhook.
    Un webhook n'est qu'un signal : c'est cette reponse qui fait foi.
    """
    if not attempt.provider_reference:
        return CollectOutcome(
            intent=attempt.intent, attempt=attempt, status="NO_REFERENCE",
            message="Aucune reference prestataire : rien a interroger.",
        )

    prestataire = get_provider_for(attempt.provider_code)

    try:
        etat = prestataire.get_transaction(attempt.provider_reference)
    except ProviderTimeout as exc:
        PaymentAttempt.objects.filter(pk=attempt.pk).update(
            poll_count=attempt.poll_count + 1,
            last_polled_at=timezone.now(),
            error_message=str(exc),
        )
        attempt.refresh_from_db()
        return CollectOutcome(intent=attempt.intent, attempt=attempt,
                              status="UNKNOWN", message=str(exc))

    PaymentAttempt.objects.filter(pk=attempt.pk).update(
        poll_count=attempt.poll_count + 1,
        last_polled_at=timezone.now(),
        provider_status_raw=etat.raw_status,
    )
    attempt.refresh_from_db()

    if etat.status == ProviderStatus.SUCCESSFUL:
        return confirm_payment(attempt, provider_status=etat)

    if etat.status == ProviderStatus.FAILED:
        return _mark_failed(attempt, etat.error_message or "Paiement refuse.",
                            etat.error_code)

    return CollectOutcome(
        intent=attempt.intent, attempt=attempt, status="PENDING",
        message="Paiement toujours en attente de confirmation.",
        requires_action=True,
    )


@db_transaction.atomic
def _mark_failed(attempt: PaymentAttempt, message: str, code: str = "") -> CollectOutcome:
    attempt = PaymentAttempt.objects.select_for_update().get(pk=attempt.pk)
    if attempt.status == PaymentAttempt.Status.SUCCESSFUL:
        return CollectOutcome(intent=attempt.intent, attempt=attempt,
                              status="ALREADY_SUCCEEDED")
    attempt.status = PaymentAttempt.Status.FAILED
    attempt.error_message = message
    attempt.error_code = code
    attempt.save(update_fields=["status", "error_message", "error_code", "updated_at"])
    return CollectOutcome(intent=attempt.intent, attempt=attempt,
                          status="FAILED", message=message)


# ─────────────────────────────────────────────────────────────────────────────
# 4. CONFIRMATION — le moment ou l'argent devient reel
# ─────────────────────────────────────────────────────────────────────────────

@db_transaction.atomic
def confirm_payment(attempt: PaymentAttempt, *, provider_status=None) -> CollectOutcome:
    """
    Confirme un encaissement et ecrit au registre.

    STRICTEMENT IDEMPOTENT : appelee deux fois — par le webhook et par le
    polling, ce qui arrivera —, elle n'ecrit qu'une seule fois. Le verrou
    pessimiste et le controle d'etat le garantissent.

    Ecritures produites :
        DEBIT  tresorerie PSP        montant net encaisse
        DEBIT  frais PSP             frais preleves par le prestataire
        CREDIT dette de sequestre    somme des nets dus aux tiers
        CREDIT produits              commissions + part plateforme

    La commission N'ENTRE JAMAIS en sequestre : elle est reconnue directement
    en produit (principe P8).
    """
    attempt = PaymentAttempt.objects.select_for_update().select_related("intent").get(
        pk=attempt.pk
    )
    intent = PaymentIntent.objects.select_for_update().get(pk=attempt.intent_id)

    if intent.status == PaymentIntent.Status.SUCCEEDED:
        return CollectOutcome(intent=intent, attempt=attempt,
                              status="ALREADY_SUCCEEDED",
                              message="Encaissement deja confirme.")

    if intent.is_final:
        raise CollectError(
            f"L'intention {intent.reference} est en etat final ({intent.status}) : "
            "confirmation impossible."
        )

    plan = intent.distribution_plan or {}
    if not plan.get("holds") and not plan.get("platform_revenue"):
        raise CollectError(
            f"L'intention {intent.reference} n'a pas de plan de repartition. "
            "Impossible de ventiler l'encaissement."
        )

    montant = intent.amount_xaf
    frais = _collect_fee_amount(intent)
    net_encaisse = montant - frais
    if net_encaisse <= 0:
        raise CollectError(
            f"Frais ({frais}) superieurs ou egaux au montant encaisse ({montant})."
        )

    sequestre = sum(h["net"] for h in plan.get("holds", []))
    produits = plan.get("platform_revenue", 0)

    lignes = [
        debit(coa.psp_account_for(intent.payer_operator, degraded=True),
              net_encaisse, label=f"Encaissement {intent.reference}"),
    ]
    if frais > 0:
        lignes.append(debit(coa.EXPENSE_PSP_COLLECT, frais,
                            label="Frais prestataire sur encaissement"))
    if sequestre > 0:
        lignes.append(credit(coa.ESCROW_LIABILITY, sequestre,
                             label="Mise sous sequestre"))
    if produits > 0:
        lignes.append(credit(coa.REVENUE_COMMISSION, produits,
                             label="Commission et part plateforme"))

    ecart = montant - (sequestre + produits)
    if ecart != 0:
        raise CollectError(
            f"Plan de repartition incoherent pour {intent.reference} : "
            f"montant {montant}, reparti {sequestre + produits}, ecart {ecart}. "
            "Aucune ecriture effectuee."
        )

    post(
        kind=LedgerTransaction.Kind.COLLECT,
        lines=lignes,
        description=f"Encaissement {intent.reference}",
        source_type="PaymentIntent",
        source_ref=intent.reference,
        correlation_id=intent.correlation_id,
        created_by_label="application.collect.confirm_payment",
    )

    maintenant = timezone.now()
    attempt.status = PaymentAttempt.Status.SUCCESSFUL
    attempt.settled_at = maintenant
    if provider_status is not None:
        attempt.provider_status_raw = provider_status.raw_status
    attempt.save(update_fields=[
        "status", "settled_at", "provider_status_raw", "updated_at",
    ])

    if intent.status == PaymentIntent.Status.REQUIRES_ACTION:
        intent.transition_to(PaymentIntent.Status.PROCESSING, save=False)
    intent.transition_to(PaymentIntent.Status.SUCCEEDED, save=False)
    intent.amount_captured_xaf = montant
    intent.confirmed_at = maintenant
    intent.save(update_fields=[
        "status", "amount_captured_xaf", "confirmed_at", "updated_at",
    ])

    # ── Materialisation des sequestres (Lot 7) ───────────────────────────────
    # Depuis le plan FIGE, jamais recalcule. Un echec ici ne doit pas annuler
    # l'encaissement : l'argent est encaisse et les ecritures sont passees.
    # On journalise et on laisse l'administration rattraper.
    try:
        from apps.payments.escrow.services import materialize_holds
        materialize_holds(intent)
        # Miroir metier : les commandes couvertes passent en PAID (Lot 12).
        from apps.payments.bridge.events_out import mirror_payment_confirmed
        mirror_payment_confirmed(intent)
    except Exception as exc:
        logger.exception(
            "Materialisation des sequestres echouee pour %s. "
            "L'encaissement reste valide, les sequestres sont a creer "
            "manuellement.", intent.reference,
        )

    return CollectOutcome(
        intent=intent, attempt=attempt, status="SUCCEEDED",
        message="Paiement confirme.",
    )


def _collect_fee_amount(intent: PaymentIntent) -> int:
    """
    Frais preleves par le prestataire, lus dans l'instantane fige.

    Le referentiel les met a la charge de la PLATEFORME : ils reduisent le
    net encaisse et deviennent une charge, jamais une retenue sur les tiers.
    """
    snapshot = (intent.config_snapshot or {}).get("collect_fee")
    if not snapshot:
        return 0
    if snapshot.get("bearer") != "PLATFORM":
        # Un autre porteur modifie la structure des ecritures : on refuse
        # plutot que de produire une comptabilite fausse silencieusement.
        raise CollectError(
            f"Porteur de frais non supporte a ce lot : {snapshot.get('bearer')}. "
            "Seul PLATFORM est implemente (referentiel §7.4)."
        )
    return int(snapshot.get("amount_xaf", 0))


# ─────────────────────────────────────────────────────────────────────────────
# 5. ANNULATION ET EXPIRATION
# ─────────────────────────────────────────────────────────────────────────────

@db_transaction.atomic
def cancel_intent(intent: PaymentIntent, *, reason: str = "") -> CollectOutcome:
    intent = PaymentIntent.objects.select_for_update().get(pk=intent.pk)
    if intent.status == PaymentIntent.Status.SUCCEEDED:
        raise CollectError(
            "Une intention encaissee ne s'annule pas : elle se rembourse."
        )
    if intent.is_final:
        return CollectOutcome(intent=intent, status=intent.status)

    intent.failure_reason = reason
    intent.transition_to(PaymentIntent.Status.CANCELLED, save=False)
    intent.save(update_fields=["status", "failure_reason", "updated_at"])
    return CollectOutcome(intent=intent, status="CANCELLED", message=reason)


@db_transaction.atomic
def expire_intent(intent: PaymentIntent) -> CollectOutcome:
    intent = PaymentIntent.objects.select_for_update().get(pk=intent.pk)
    if intent.is_final or intent.status == PaymentIntent.Status.SUCCEEDED:
        return CollectOutcome(intent=intent, status=intent.status)
    intent.transition_to(PaymentIntent.Status.EXPIRED, save=False)
    intent.failure_reason = "Delai de paiement depasse."
    intent.save(update_fields=["status", "failure_reason", "updated_at"])
    return CollectOutcome(intent=intent, status="EXPIRED")


def expire_stale_intents(now=None) -> int:
    """Balaie les intentions echues. Appelee par l'ordonnanceur au Lot 9."""
    moment = now or timezone.now()
    echues = PaymentIntent.objects.filter(
        expires_at__lt=moment,
        status__in=[
            PaymentIntent.Status.DRAFT,
            PaymentIntent.Status.REQUIRES_ACTION,
        ],
    )
    compteur = 0
    for intent in echues:
        try:
            expire_intent(intent)
            compteur += 1
        except Exception:
            continue
    return compteur


def poll_pending_attempts(limit: int = 100) -> dict:
    """
    Filet de securite du webhook.

    Si le webhook ne vient jamais — panne, mauvaise configuration, incident
    prestataire — le paiement est quand meme detecte.
    """
    en_attente = (
        PaymentAttempt.objects
        .filter(status__in=PaymentAttempt.OPEN_STATUSES)
        .exclude(provider_reference="")
        .order_by("last_polled_at")[:limit]
    )
    resultats = {"polled": 0, "succeeded": 0, "failed": 0, "pending": 0, "unknown": 0}
    for tentative in en_attente:
        issue = poll_attempt(tentative)
        resultats["polled"] += 1
        cle = {
            "SUCCEEDED": "succeeded", "ALREADY_SUCCEEDED": "succeeded",
            "FAILED": "failed", "PENDING": "pending",
        }.get(issue.status, "unknown")
        resultats[cle] += 1
    return resultats