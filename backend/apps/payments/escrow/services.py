# backend/apps/payments/escrow/services.py
# Cycle de vie des sequestres.
#
# QUATRE ETAPES
#   1. Materialisation — depuis le plan FIGE a la confirmation du paiement
#   2. Declenchement   — sur evenement metier, par composant
#   3. Liberation      — apres delai, avec ecriture au registre
#   4. Gel / degel     — sur litige, SCOPE au sequestre concerne
#
# Chaque etape est idempotente et protegee par verrou pessimiste.

from __future__ import annotations

import logging
from datetime import timedelta

from django.db import transaction as db_transaction
from django.utils import timezone

from apps.payments.domain.enums import EconomicComponent, PayeeType
from apps.payments.intents.models import PaymentIntent
from apps.payments.ledger import chart_of_accounts as coa
from apps.payments.ledger.models import LedgerTransaction
from apps.payments.ledger.posting import credit, debit, post
from apps.payments.payees.models import PayeeAccount

from .models import EscrowHold

logger = logging.getLogger("apps.payments.escrow")


class EscrowError(Exception):
    """Erreur du cycle de sequestre."""


#: Compte de dette a crediter selon le type de beneficiaire.
PAYABLE_BY_TYPE = {
    PayeeType.VENDOR.value: coa.PAYABLE_VENDOR,
    PayeeType.DELIVERY_COMPANY.value: coa.PAYABLE_DELIVERY_COMPANY,
    PayeeType.RELAY_POINT.value: coa.PAYABLE_RELAY_POINT,
}


def payable_account_for(payee: PayeeAccount) -> str:
    compte = PAYABLE_BY_TYPE.get(payee.payee_type)
    if compte is None:
        raise EscrowError(
            f"Aucun compte de dette pour le type {payee.payee_type}. "
            "Type non actif en Phase 1."
        )
    return compte


# ─────────────────────────────────────────────────────────────────────────────
# 1. MATERIALISATION
# ─────────────────────────────────────────────────────────────────────────────

@db_transaction.atomic
def materialize_holds(intent: PaymentIntent) -> list[EscrowHold]:
    """
    Cree les sequestres depuis le plan FIGE a la creation de l'intention.

    Le plan n'est JAMAIS recalcule ici : modifier une regle de repartition
    en administration ne doit pas changer la ventilation d'un paiement deja
    encaisse (principe P3).

    Idempotent : appelee deux fois, elle ne cree rien la seconde fois.
    """
    intent = PaymentIntent.objects.select_for_update().get(pk=intent.pk)

    if intent.status != PaymentIntent.Status.SUCCEEDED:
        raise EscrowError(
            f"L'intention {intent.reference} n'est pas encaissee "
            f"(statut : {intent.status}). Aucun sequestre a materialiser."
        )

    existants = list(EscrowHold.objects.filter(intent=intent))
    if existants:
        return existants

    plan = intent.distribution_plan or {}
    lignes = plan.get("holds") or []
    if not lignes:
        raise EscrowError(
            f"L'intention {intent.reference} n'a aucun plan de repartition."
        )

    from apps.payments.config.resolver import resolve_policy_for

    crees = []
    maintenant = timezone.now()

    for ligne in lignes:
        code = ligne.get("payee_code")
        beneficiaire = PayeeAccount.objects.filter(payee_code=code).first()
        if beneficiaire is None:
            raise EscrowError(
                f"Beneficiaire {code} introuvable pour l'intention "
                f"{intent.reference}. Aucun sequestre cree."
            )

        composant = ligne.get("component")
        politique = resolve_policy_for(
            payee_type=beneficiaire.payee_type, component=composant,
        )

        hold = EscrowHold(
            intent=intent,
            order_id=ligne.get("order_id"),
            payee=beneficiaire,
            component=composant,
            gross_amount_xaf=int(ligne.get("gross", 0)),
            commission_xaf=int(ligne.get("commission", 0)),
            net_amount_xaf=int(ligne.get("net", 0)),
            currency=plan.get("currency", "XAF"),
            status=EscrowHold.Status.PENDING,
            release_trigger=politique.release_trigger.value,
            policy_snapshot=politique.as_snapshot(),
        )
        hold.full_clean(exclude=["reference"])
        hold.save()

        # Le paiement est confirme : le sequestre est immediatement actif.
        hold.transition_to(EscrowHold.Status.HELD, save=False)
        if politique.auto_confirm_hours:
            hold.auto_confirm_at = maintenant + timedelta(
                hours=politique.auto_confirm_hours
            )
        hold.dispute_window_ends_at = maintenant + timedelta(
            days=politique.dispute_window_days
        )
        hold.save(update_fields=[
            "status", "auto_confirm_at", "dispute_window_ends_at", "updated_at",
        ])
        crees.append(hold)

    logger.info(
        "%s sequestre(s) materialise(s) pour %s", len(crees), intent.reference,
    )
    return crees


# ─────────────────────────────────────────────────────────────────────────────
# 2. DECLENCHEMENT
# ─────────────────────────────────────────────────────────────────────────────

@db_transaction.atomic
def trigger_release(hold: EscrowHold, *, trigger: str, now=None) -> EscrowHold:
    """
    Programme la liberation d'un sequestre.

    Le declencheur DOIT correspondre a celui attendu par le composant : une
    preuve de livraison ne libere pas la marchandise, et une confirmation de
    reception ne libere pas le transport.
    """
    hold = EscrowHold.objects.select_for_update().get(pk=hold.pk)
    maintenant = now or timezone.now()

    if hold.status == EscrowHold.Status.RELEASE_SCHEDULED:
        return hold
    if hold.is_final:
        raise EscrowError(
            f"Le sequestre {hold.reference} est en etat final ({hold.status})."
        )
    if hold.status == EscrowHold.Status.FROZEN:
        raise EscrowError(
            f"Le sequestre {hold.reference} est gele : {hold.frozen_reason}. "
            "Resoudre le litige avant toute liberation."
        )

    attendu = hold.release_trigger
    accepte = trigger == attendu or (
        attendu == EscrowHold.Trigger.BUYER_RECEIPT_CONFIRMED
        and trigger == EscrowHold.Trigger.AUTO_CONFIRMED
    )
    if not accepte:
        raise EscrowError(
            f"Declencheur inadapte pour {hold.reference} : recu {trigger}, "
            f"attendu {attendu}. Le declencheur depend du COMPOSANT."
        )

    politique = hold.policy_snapshot or {}
    delai = int(politique.get("release_delay_hours", 24) or 0)

    hold.transition_to(EscrowHold.Status.RELEASE_SCHEDULED, save=False)
    hold.triggered_at = maintenant
    hold.release_at = maintenant + timedelta(hours=delai)
    hold.save(update_fields=[
        "status", "triggered_at", "release_at", "updated_at",
    ])
    _refleter(hold)
    return hold


# ─────────────────────────────────────────────────────────────────────────────
# 3. LIBERATION — le moment ou la dette devient exigible
# ─────────────────────────────────────────────────────────────────────────────

@db_transaction.atomic
def release_hold(hold: EscrowHold, *, force: bool = False, reason: str = "",
                 now=None) -> EscrowHold:
    """
    Libere un sequestre et ecrit au registre.

        DEBIT  2010 dette de sequestre
        CREDIT 2020/2022/2023 dette envers le beneficiaire

    Le montant sort du sequestre et devient EXIGIBLE. C'est a partir de ce
    moment, et pas avant, qu'un ajustement peut s'y imputer (§11.2 du
    document d'architecture).

    Strictement idempotente.
    """
    hold = EscrowHold.objects.select_for_update().select_related("payee").get(pk=hold.pk)

    if hold.status == EscrowHold.Status.RELEASED:
        return hold

    if not force:
        if hold.status != EscrowHold.Status.RELEASE_SCHEDULED:
            raise EscrowError(
                f"Le sequestre {hold.reference} est en {hold.status} : "
                "seul un sequestre programme peut etre libere."
            )
        # `now` doit etre celui de l'appelant : sans cela, l'ordonnanceur
        # selectionne des sequestres qu'il ne peut ensuite pas liberer.
        maintenant = now or timezone.now()
        if hold.release_at and hold.release_at > maintenant:
            raise EscrowError(
                f"Le sequestre {hold.reference} n'est liberable qu'a partir "
                f"du {hold.release_at:%Y-%m-%d %H:%M}."
            )
    elif not reason.strip():
        raise EscrowError("Une liberation forcee exige un motif.")

    montant = hold.payable_amount_xaf
    if montant <= 0:
        hold.transition_to(EscrowHold.Status.RELEASED, save=False)
        hold.released_at = now or timezone.now()
        hold.save(update_fields=["status", "released_at", "updated_at"])
        _refleter(hold)
        return hold

    post(
        kind=LedgerTransaction.Kind.ESCROW_RELEASE,
        lines=[
            debit(coa.ESCROW_LIABILITY, montant,
                  label=f"Liberation {hold.reference}"),
            credit(payable_account_for(hold.payee), montant,
                   payee_code=hold.payee.payee_code,
                   label=f"{hold.component} — {hold.reference}"),
        ],
        description=(
            f"Liberation du sequestre {hold.reference}"
            + (f" (forcee : {reason.strip()})" if force else "")
        ),
        source_type="EscrowHold",
        source_ref=hold.reference,
        correlation_id=hold.intent.correlation_id,
        created_by_label="escrow.services.release_hold",
    )

    hold.transition_to(EscrowHold.Status.RELEASED, save=False)
    hold.released_at = now or timezone.now()
    hold.save(update_fields=["status", "released_at", "updated_at"])

    _refleter(hold)
    logger.info("Sequestre %s libere : %s XAF vers %s",
                hold.reference, montant, hold.payee.payee_code)
    return hold


# ─────────────────────────────────────────────────────────────────────────────
# 4. GEL ET DEGEL
# ─────────────────────────────────────────────────────────────────────────────

@db_transaction.atomic
def freeze_hold(hold: EscrowHold, *, reason: str) -> EscrowHold:
    """
    Gele un sequestre — CELUI-CI SEUL.

    Un litige sur un colis ne doit jamais geler les autres colis du meme
    paiement, ni les autres beneficiaires. C'est precisement ce que la
    granularite a quatre dimensions rend possible.
    """
    if not reason or not reason.strip():
        raise EscrowError("Le motif de gel est obligatoire.")

    hold = EscrowHold.objects.select_for_update().get(pk=hold.pk)

    if hold.status == EscrowHold.Status.FROZEN:
        return hold
    if hold.is_final:
        raise EscrowError(
            f"Le sequestre {hold.reference} est en etat final ({hold.status}) : "
            "gel impossible."
        )

    hold.transition_to(EscrowHold.Status.FROZEN, save=False)
    hold.frozen_reason = reason.strip()
    hold.frozen_at = timezone.now()
    hold.save(update_fields=["status", "frozen_reason", "frozen_at", "updated_at"])
    _refleter(hold)
    return hold


@db_transaction.atomic
def unfreeze_hold(hold: EscrowHold, *, reason: str = "") -> EscrowHold:
    """Litige tranche en faveur du partenaire : le cycle normal reprend."""
    hold = EscrowHold.objects.select_for_update().get(pk=hold.pk)
    if hold.status != EscrowHold.Status.FROZEN:
        return hold

    hold.transition_to(EscrowHold.Status.HELD, save=False)
    hold.frozen_reason = ""
    hold.frozen_at = None
    hold.save(update_fields=["status", "frozen_reason", "frozen_at", "updated_at"])
    _refleter(hold)
    return hold


@db_transaction.atomic
def cancel_hold(hold: EscrowHold, *, reason: str = "") -> EscrowHold:
    """Annule un sequestre — commande annulee avant expedition."""
    hold = EscrowHold.objects.select_for_update().get(pk=hold.pk)
    if hold.status == EscrowHold.Status.CANCELLED:
        return hold
    hold.transition_to(EscrowHold.Status.CANCELLED, save=False)
    hold.frozen_reason = reason.strip()
    hold.save(update_fields=["status", "frozen_reason", "updated_at"])
    _refleter(hold)
    return hold


# ─────────────────────────────────────────────────────────────────────────────
# REALLOCATION D'UNE PART PROVISOIREMENT ATTRIBUEE A LA PLATEFORME
# ─────────────────────────────────────────────────────────────────────────────
#
# LE PROBLEME QUE CETTE FONCTION RESOUT
#
#   Au checkout, aucun transporteur n'est assigne. La regle « 70 % du
#   transport a l'entreprise de livraison » est donc ecartee et sa part
#   revient au reliquat, c'est-a-dire a la PLATEFORME — comptabilisee en
#   PRODUIT.
#
#   Ce n'est pas la verite economique : ces 3 500 FCFA appartiennent a un
#   transporteur pas encore designe. Le chiffre d'affaires est
#   provisoirement surestime et la dette envers le transporteur absente.
#
#   Quand le transporteur est assigne, cette fonction remet les choses en
#   place :
#
#       DEBIT  4010 produit          (le revenu n'etait pas acquis)
#       CREDIT 2010 dette de sequestre
#       + creation du sequestre TRANSPORT au nom du transporteur
#
#   Le montant utilise est celui FIGE dans le plan (principe P3) : modifier
#   la regle demain ne change pas ce qui est du sur une transaction deja
#   encaissee.

@db_transaction.atomic
def reallocate_unresolved(intent, *, payee: PayeeAccount,
                          payee_type: str = "DELIVERY_COMPANY",
                          component: str = "TRANSPORT") -> EscrowHold | None:
    """
    Attribue a son beneficiaire reel une part provisoirement gardee par la
    plateforme.

    Idempotent : si le sequestre existe deja, il est retourne tel quel.
    Retourne None si aucune part n'est a reallouer.
    """
    from apps.payments.intents.models import PaymentIntent

    intent = PaymentIntent.objects.select_for_update().get(pk=intent.pk)

    if intent.status != PaymentIntent.Status.SUCCEEDED:
        raise EscrowError(
            f"L'intention {intent.reference} n'est pas encaissee : "
            "aucune reallocation possible."
        )

    # ── IDEMPOTENCE D'ABORD ──────────────────────────────────────────────
    # La reallocation VIDE `unresolved_rules` une fois faite. Chercher les
    # candidats en premier ferait donc retourner None au second appel, au
    # lieu du sequestre deja cree — et l'appelant conclurait a tort qu'il
    # n'y avait rien a reallouer.
    existant = EscrowHold.objects.filter(
        intent=intent, payee=payee, component=component,
    ).first()
    if existant is not None:
        return existant

    plan = intent.distribution_plan or {}
    candidates = [
        r for r in plan.get("unresolved_rules", [])
        if r.get("payee_type") == payee_type and r.get("component") == component
    ]
    if not candidates:
        return None

    montant = sum(int(r.get("amount_xaf", 0)) for r in candidates)
    if montant <= 0:
        logger.warning(
            "Reallocation impossible pour %s : le plan ne porte aucun "
            "montant fige pour %s/%s.",
            intent.reference, component, payee_type,
        )
        return None

    # ─────────────────────────────────────────────────────────────────────
    # LE NIVEAU DU COMPOSANT DETERMINE order_id
    #
    # TRANSPORT est de niveau PAIEMENT : les frais sont mutualises sur le
    # panier, order_id reste nul.
    #
    # RELAY_HANDLING est de niveau COMMANDE : chaque colis a son point
    # relais et sa remise. Creer son sequestre sans order_id fait echouer
    # la validation du modele — a juste titre, puisqu'un litige sur cette
    # remise doit pouvoir etre scope a un colis.
    # ─────────────────────────────────────────────────────────────────────
    NIVEAU_COMMANDE = {
        EscrowHold.Component.GOODS,
        EscrowHold.Component.RELAY_HANDLING,
    }
    order_id = None
    if component in NIVEAU_COMMANDE:
        identifiants = {r.get("order_id") for r in candidates
                        if r.get("order_id") is not None}
        if not identifiants:
            logger.warning(
                "Reallocation impossible pour %s : le composant %s est de "
                "niveau commande mais le plan ne porte aucun order_id.",
                intent.reference, component,
            )
            return None
        if len(identifiants) > 1:
            logger.warning(
                "Reallocation ambigue pour %s : le composant %s couvre "
                "plusieurs commandes %s. Traitement manuel requis.",
                intent.reference, component, sorted(identifiants),
            )
            return None
        order_id = identifiants.pop()

    from apps.payments.config.resolver import resolve_policy_for

    politique = resolve_policy_for(
        payee_type=payee.payee_type, component=component)
    maintenant = timezone.now()

    hold = EscrowHold(
        intent=intent, order_id=order_id, payee=payee, component=component,
        gross_amount_xaf=montant, commission_xaf=0, net_amount_xaf=montant,
        currency=plan.get("currency", "XAF"),
        status=EscrowHold.Status.PENDING,
        release_trigger=politique.release_trigger.value,
        policy_snapshot=politique.as_snapshot(),
    )
    hold.full_clean(exclude=["reference"])
    hold.save()

    hold.transition_to(EscrowHold.Status.HELD, save=False)
    if politique.auto_confirm_hours:
        hold.auto_confirm_at = maintenant + timedelta(
            hours=politique.auto_confirm_hours)
    hold.dispute_window_ends_at = maintenant + timedelta(
        days=politique.dispute_window_days)
    hold.save(update_fields=[
        "status", "auto_confirm_at", "dispute_window_ends_at", "updated_at",
    ])

    # Le revenu n'etait pas acquis : il redevient une dette envers un tiers.
    post(
        kind=LedgerTransaction.Kind.ADJUSTMENT,
        lines=[
            debit(coa.REVENUE_COMMISSION, montant,
                  label=f"Part {component} non acquise — {hold.reference}"),
            credit(coa.ESCROW_LIABILITY, montant,
                   label=f"Mise sous sequestre apres assignation "
                         f"({payee.payee_code})"),
        ],
        description=(
            f"Reallocation de la part {component} de {intent.reference} "
            f"vers {payee.payee_code}. Le produit provisoire est repris."
        ),
        source_type="EscrowHold", source_ref=hold.reference,
        correlation_id=intent.correlation_id,
        created_by_label="escrow.services.reallocate_unresolved",
    )

    # Le plan garde la trace de la reallocation effectuee.
    reste = [
        r for r in plan.get("unresolved_rules", [])
        if not (r.get("payee_type") == payee_type
                and r.get("component") == component)
    ]
    plan["unresolved_rules"] = reste
    plan["needs_reallocation"] = bool(reste)
    plan.setdefault("reallocations", []).append({
        "component": component, "payee_code": payee.payee_code,
        "amount_xaf": montant, "hold": hold.reference,
        "at": maintenant.isoformat(),
    })
    PaymentIntent.objects.filter(pk=intent.pk).update(distribution_plan=plan)

    logger.info(
        "Part %s de %s reallouee : %s XAF vers %s (%s)",
        component, intent.reference, montant, payee.payee_code, hold.reference,
    )
    return hold


# ─────────────────────────────────────────────────────────────────────────────
# MIROIR VERS LE MODELE METIER — Lot 12
# ─────────────────────────────────────────────────────────────────────────────

def _refleter(hold: EscrowHold) -> None:
    """
    Reporte l'etat du sequestre sur Order.escrow_status.

    EscrowHold DECIDE, Order REFLETE. Le champ metier conserve le frontend
    existant fonctionnel pendant que la decision migre vers le module
    financier (expand-then-contract).

    Import PARESSEUX et echec ABSORBE : le miroir traverse bridge/ vers
    apps.orders, et un miroir en echec ne doit jamais annuler une liberation
    de sequestre.
    """
    try:
        from apps.payments.bridge.events_out import mirror_hold
        mirror_hold(hold)
    except Exception:
        logger.exception("Miroir metier indisponible pour %s.", hold.reference)


# ─────────────────────────────────────────────────────────────────────────────
# ORDONNANCEMENT — appele par les taches planifiees (Lot 9)
# ─────────────────────────────────────────────────────────────────────────────

def auto_confirm_due_holds(limit: int = 200, now=None) -> dict:
    """
    Confirme automatiquement les sequestres dont le delai est echu.

    NECESSAIRE et non optionnel : CamPay ne notifie que sur SUCCESSFUL ou
    FAILED, et un acheteur peut simplement ne jamais confirmer sa reception.
    Sans auto-confirmation, le vendeur ne serait jamais paye.
    """
    maintenant = now or timezone.now()
    echus = EscrowHold.objects.filter(
        status=EscrowHold.Status.HELD,
        auto_confirm_at__isnull=False,
        auto_confirm_at__lte=maintenant,
    ).order_by("auto_confirm_at")[:limit]

    resultats = {"examines": 0, "programmes": 0, "erreurs": 0}
    for hold in echus:
        resultats["examines"] += 1
        try:
            trigger_release(
                hold, trigger=EscrowHold.Trigger.AUTO_CONFIRMED, now=maintenant,
            )
            resultats["programmes"] += 1
        except EscrowError as exc:
            resultats["erreurs"] += 1
            logger.warning("Auto-confirmation impossible pour %s : %s",
                           hold.reference, exc)
    return resultats


def release_due_holds(limit: int = 200, now=None) -> dict:
    """Libere les sequestres dont l'echeance est atteinte."""
    maintenant = now or timezone.now()
    echus = EscrowHold.objects.filter(
        status=EscrowHold.Status.RELEASE_SCHEDULED,
        release_at__isnull=False,
        release_at__lte=maintenant,
    ).order_by("release_at")[:limit]

    resultats = {"examines": 0, "liberes": 0, "montant_xaf": 0, "erreurs": 0}
    for hold in echus:
        resultats["examines"] += 1
        try:
            montant = hold.payable_amount_xaf
            release_hold(hold, now=maintenant)
            resultats["liberes"] += 1
            resultats["montant_xaf"] += montant
        except Exception as exc:
            resultats["erreurs"] += 1
            logger.warning("Liberation impossible pour %s : %s", hold.reference, exc)
    return resultats


# ─────────────────────────────────────────────────────────────────────────────
# LECTURE
# ─────────────────────────────────────────────────────────────────────────────

def holds_for_order(order_id: int, component: str = ""):
    qs = EscrowHold.objects.filter(order_id=order_id)
    return qs.filter(component=component) if component else qs


def holds_for_intent(intent: PaymentIntent, component: str = ""):
    qs = EscrowHold.objects.filter(intent=intent)
    return qs.filter(component=component) if component else qs


def payee_escrow_summary(payee: PayeeAccount) -> dict:
    """
    Vue financiere d'un beneficiaire.

    `held_xaf` est HORS D'ATTEINTE de toute compensation : ces fonds
    correspondent a des commandes vivantes et peuvent encore retourner a
    l'acheteur (§11.2 du document d'architecture).
    """
    from django.db.models import Sum

    def somme(statuts):
        total = EscrowHold.objects.filter(
            payee=payee, status__in=statuts,
        ).aggregate(t=Sum("net_amount_xaf"))["t"]
        return total or 0

    return {
        "payee_code": payee.payee_code,
        "held_xaf": somme([EscrowHold.Status.HELD]),
        "release_scheduled_xaf": somme([EscrowHold.Status.RELEASE_SCHEDULED]),
        "frozen_xaf": somme([EscrowHold.Status.FROZEN]),
        "released_xaf": somme([EscrowHold.Status.RELEASED]),
        "not_offsettable_xaf": somme([
            EscrowHold.Status.HELD, EscrowHold.Status.RELEASE_SCHEDULED,
        ]),
    }