# backend/apps/payments/bridge/events_in.py
# CONTRAT D'EVENEMENTS — la seule porte d'entree du metier vers le financier.
#
# ─────────────────────────────────────────────────────────────────────────────
# PRINCIPE P9 : LE DOMAINE FINANCIER NE JUGE PAS LES FAITS METIER
#
# Il ne decide jamais qu'une livraison est valide, qu'un colis est remis ou
# qu'un litige est fonde. Il CONSOMME des evenements emis par les domaines
# competents, APRES leurs propres controles.
#
# Sans ce principe, le module financier finirait par contenir de la logique
# de validation logistique, dupliquee et divergente de celle du domaine
# livraison. On aurait deux verites sur « est-ce livre ? », dont une decide
# du versement de l'argent.
#
# CONTRAT DE L'EMETTEUR
#   Un evenement est IRREVOCABLE et VERIFIE. DELIVERY_PROOF_VALIDATED n'est
#   emis qu'apres que le domaine livraison a controle photo, scan, signature
#   ou code, selon sa politique. Le module financier ne reexamine pas la
#   preuve — il ne saurait pas le faire, et ce n'est pas son role.
#
#   Chaque evenement porte un `event_id` unique : le rejouer n'a aucun effet
#   supplementaire.
# ─────────────────────────────────────────────────────────────────────────────
#
# EXEMPLES D'APPEL depuis apps.orders :
#
#     from apps.payments.bridge import events_in
#
#     events_in.buyer_confirmed_receipt(
#         order_id=order.id,
#         event_id=f"receipt-{order.id}",
#         emitter="apps.orders.ConfirmReceiptView",
#     )

from __future__ import annotations

import logging
import uuid

from django.db import transaction as db_transaction
from django.utils import timezone

from apps.payments.escrow.models import EscrowEvent, EscrowHold
from apps.payments.escrow.services import (
    EscrowError,
    cancel_hold,
    freeze_hold,
    trigger_release,
    unfreeze_hold,
)

logger = logging.getLogger("apps.payments.escrow")


class EventRejected(Exception):
    """L'evenement ne peut pas etre traite."""


def _journalise(kind, event_id, *, emitter="", order_id=None,
                intent_reference="", component="", payload=None,
                occurred_at=None) -> tuple[EscrowEvent, bool]:
    """
    Journalise l'evenement. Retourne (evenement, est_nouveau).

    IDEMPOTENCE : un event_id deja vu retourne l'evenement existant sans
    rien reappliquer.
    """
    identifiant = (event_id or "").strip() or f"auto-{uuid.uuid4()}"
    existant = EscrowEvent.objects.filter(event_id=identifiant).first()
    if existant is not None:
        return existant, False

    evenement = EscrowEvent.objects.create(
        event_id=identifiant,
        kind=kind,
        emitter=emitter,
        order_id=order_id,
        intent_reference=intent_reference,
        component=component,
        payload=payload or {},
        occurred_at=occurred_at or timezone.now(),
    )
    return evenement, True


def _cloture(evenement: EscrowEvent, outcome: str, note: str = "",
             affected: int = 0) -> EscrowEvent:
    EscrowEvent.objects.filter(pk=evenement.pk).update(
        outcome=outcome, note=note[:2000], affected_holds=affected,
    )
    evenement.refresh_from_db()
    return evenement


# ─────────────────────────────────────────────────────────────────────────────
# LIBERATIONS — un declencheur par composant
# ─────────────────────────────────────────────────────────────────────────────

@db_transaction.atomic
def buyer_confirmed_receipt(*, order_id: int, event_id: str = "",
                            emitter: str = "", occurred_at=None) -> EscrowEvent:
    """
    L'acheteur confirme avoir recu sa commande.

    Libere le composant GOODS de CETTE commande, et lui seul. Le transport
    et la remise en relais ont leurs propres declencheurs.

    A APPELER depuis apps.orders.ConfirmReceiptView.
    """
    evenement, nouveau = _journalise(
        EscrowEvent.Kind.BUYER_RECEIPT_CONFIRMED, event_id,
        emitter=emitter, order_id=order_id,
        component=EscrowHold.Component.GOODS, occurred_at=occurred_at,
    )
    if not nouveau:
        return evenement

    return _appliquer_declencheur(
        evenement,
        holds=EscrowHold.objects.filter(
            order_id=order_id, component=EscrowHold.Component.GOODS,
        ),
        trigger=EscrowHold.Trigger.BUYER_RECEIPT_CONFIRMED,
        contexte=f"commande #{order_id}",
    )


@db_transaction.atomic
def delivery_proof_validated(*, intent_reference: str = "", order_id: int | None = None,
                             event_id: str = "", emitter: str = "",
                             occurred_at=None) -> EscrowEvent:
    """
    Le domaine livraison a VALIDE la preuve de livraison.

    Le module financier ne reexamine ni la photo, ni la signature, ni le
    code : il fait confiance au controle deja effectue.

    Le transport etant de niveau PAIEMENT, on cible l'intention. Si seul un
    order_id est fourni, on remonte a l'intention via le pont.
    """
    reference = intent_reference
    if not reference and order_id is not None:
        from .intent_orders import PaymentIntentOrder
        lien = PaymentIntentOrder.objects.filter(
            order_id=order_id
        ).select_related("intent").first()
        reference = lien.intent.reference if lien else ""

    evenement, nouveau = _journalise(
        EscrowEvent.Kind.DELIVERY_PROOF_VALIDATED, event_id,
        emitter=emitter, order_id=order_id, intent_reference=reference,
        component=EscrowHold.Component.TRANSPORT, occurred_at=occurred_at,
    )
    if not nouveau:
        return evenement

    if not reference:
        return _cloture(
            evenement, EscrowEvent.Outcome.REJECTED,
            "Aucune intention de paiement identifiable : "
            "ni intent_reference, ni commande rattachee.",
        )

    return _appliquer_declencheur(
        evenement,
        holds=EscrowHold.objects.filter(
            intent__reference=reference, component=EscrowHold.Component.TRANSPORT,
        ),
        trigger=EscrowHold.Trigger.DELIVERY_PROOF_VALIDATED,
        contexte=f"paiement {reference}",
    )


@db_transaction.atomic
def relay_handover_scanned(*, order_id: int, event_id: str = "",
                           emitter: str = "", occurred_at=None) -> EscrowEvent:
    """Le point relais a scanne la remise au client."""
    evenement, nouveau = _journalise(
        EscrowEvent.Kind.RELAY_HANDOVER_SCANNED, event_id,
        emitter=emitter, order_id=order_id,
        component=EscrowHold.Component.RELAY_HANDLING, occurred_at=occurred_at,
    )
    if not nouveau:
        return evenement

    return _appliquer_declencheur(
        evenement,
        holds=EscrowHold.objects.filter(
            order_id=order_id, component=EscrowHold.Component.RELAY_HANDLING,
        ),
        trigger=EscrowHold.Trigger.RELAY_HANDOVER_SCANNED,
        contexte=f"commande #{order_id}",
    )


def _appliquer_declencheur(evenement, *, holds, trigger, contexte) -> EscrowEvent:
    concernes = list(holds.exclude(status__in=[
        EscrowHold.Status.RELEASED, EscrowHold.Status.REFUNDED,
        EscrowHold.Status.CANCELLED,
    ]))

    if not concernes:
        return _cloture(
            evenement, EscrowEvent.Outcome.IGNORED,
            f"Aucun sequestre actif pour {contexte}. "
            "Deja libere, ou paiement non encaisse.",
        )

    appliques, ignores, erreurs = 0, [], []
    for hold in concernes:
        try:
            trigger_release(hold, trigger=trigger)
            appliques += 1
        except EscrowError as exc:
            if hold.status == EscrowHold.Status.FROZEN:
                ignores.append(f"{hold.reference} gele")
            else:
                erreurs.append(f"{hold.reference} : {exc}")

    notes = [f"{appliques} sequestre(s) programme(s) pour {contexte}."]
    if ignores:
        notes.append("Ignores : " + ", ".join(ignores) + ".")
    if erreurs:
        notes.append("Erreurs : " + " | ".join(erreurs))

    issue = (
        EscrowEvent.Outcome.APPLIED if appliques
        else (EscrowEvent.Outcome.ERROR if erreurs else EscrowEvent.Outcome.IGNORED)
    )
    return _cloture(evenement, issue, " ".join(notes), appliques)


# ─────────────────────────────────────────────────────────────────────────────
# ASSIGNATION D'UN TRANSPORTEUR
# ─────────────────────────────────────────────────────────────────────────────

@db_transaction.atomic
def carrier_assigned(*, order_id: int | None = None,
                     intent_reference: str = "",
                     delivery_organization=None,
                     event_id: str = "", emitter: str = "",
                     occurred_at=None) -> EscrowEvent:
    """
    Une entreprise de livraison a ete assignee a une expedition.

    ─────────────────────────────────────────────────────────────────────────
    POURQUOI CET EVENEMENT EXISTE

    Au checkout, aucun transporteur n'est connu : sa part du transport
    revient provisoirement a la plateforme et est comptabilisee en PRODUIT.
    Ce n'est pas la verite economique.

    Cet evenement remet les choses en place : le produit provisoire est
    repris, et la part devient une dette de sequestre envers le
    transporteur, liberable sur preuve de livraison.
    ─────────────────────────────────────────────────────────────────────────

    A APPELER depuis apps.shipping, au moment ou le livreur est affecte.

        events_in.carrier_assigned(
            order_id=order.id,
            delivery_organization=courier.delivery_organization,
            event_id=f"carrier-{shipment.id}",
            emitter="apps.shipping",
        )
    """
    from apps.payments.escrow.services import reallocate_unresolved
    from apps.payments.intents.models import PaymentIntent

    evenement, nouveau = _journalise(
        EscrowEvent.Kind.ADMIN_OVERRIDE, event_id,
        emitter=emitter, order_id=order_id,
        intent_reference=intent_reference,
        component=EscrowHold.Component.TRANSPORT,
        payload={"reason": "Assignation d'un transporteur"},
        occurred_at=occurred_at,
    )
    if not nouveau:
        return evenement

    if delivery_organization is None:
        return _cloture(
            evenement, EscrowEvent.Outcome.REJECTED,
            "Aucune entreprise de livraison fournie.",
        )

    reference = intent_reference
    if not reference and order_id is not None:
        from .intent_orders import PaymentIntentOrder
        lien = PaymentIntentOrder.objects.filter(
            order_id=order_id).select_related("intent").first()
        reference = lien.intent.reference if lien else ""

    if not reference:
        return _cloture(
            evenement, EscrowEvent.Outcome.REJECTED,
            "Aucune intention de paiement identifiable.",
        )

    intent = PaymentIntent.objects.filter(reference=reference).first()
    if intent is None:
        return _cloture(
            evenement, EscrowEvent.Outcome.IGNORED,
            f"Intention {reference} introuvable.",
        )

    from .actors import payee_for_delivery_company

    compte = payee_for_delivery_company(delivery_organization, create=True)

    try:
        hold = reallocate_unresolved(intent, payee=compte)
    except Exception as exc:
        return _cloture(
            evenement, EscrowEvent.Outcome.ERROR,
            f"Reallocation impossible : {exc}",
        )

    if hold is None:
        return _cloture(
            evenement, EscrowEvent.Outcome.IGNORED,
            f"Aucune part transport a reallouer sur {reference}. "
            "Le transporteur etait deja connu au checkout, ou la part "
            "revient legitimement a la plateforme.",
        )

    return _cloture(
        evenement, EscrowEvent.Outcome.APPLIED,
        f"Part transport de {hold.net_amount_xaf} XAF attribuee a "
        f"{compte.payee_code} — sequestre {hold.reference}. Le produit "
        "provisoirement comptabilise a ete repris.",
        1,
    )


@db_transaction.atomic
def relay_point_assigned(*, order_id: int | None = None,
                         intent_reference: str = "", relay_profile=None,
                         event_id: str = "", emitter: str = "",
                         occurred_at=None) -> EscrowEvent:
    """
    Un point relais a ete designe pour garder le colis.

    Meme situation que le transporteur : au checkout, aucun point relais
    n'est connu — l'acheteur choisit parfois, mais l'affectation reelle se
    fait a la reception du colis. Sa part de la remise revenait donc
    provisoirement a la plateforme, comptabilisee en PRODUIT.

    Cet evenement la remet ou elle doit etre : une dette de sequestre envers
    le point relais, liberable a la remise au client.

    A APPELER depuis apps.shipping, a la reception du colis au relais.
    """
    from apps.payments.escrow.services import reallocate_unresolved
    from apps.payments.intents.models import PaymentIntent

    evenement, nouveau = _journalise(
        EscrowEvent.Kind.ADMIN_OVERRIDE, event_id,
        emitter=emitter, order_id=order_id,
        intent_reference=intent_reference,
        component=EscrowHold.Component.RELAY_HANDLING,
        payload={"reason": "Assignation d'un point relais"},
        occurred_at=occurred_at,
    )
    if not nouveau:
        return evenement

    if relay_profile is None:
        return _cloture(evenement, EscrowEvent.Outcome.REJECTED,
                        "Aucun point relais fourni.")

    reference = intent_reference
    if not reference and order_id is not None:
        from .intent_orders import PaymentIntentOrder
        lien = PaymentIntentOrder.objects.filter(
            order_id=order_id).select_related("intent").first()
        reference = lien.intent.reference if lien else ""

    if not reference:
        return _cloture(evenement, EscrowEvent.Outcome.REJECTED,
                        "Aucune intention de paiement identifiable.")

    intent = PaymentIntent.objects.filter(reference=reference).first()
    if intent is None:
        return _cloture(evenement, EscrowEvent.Outcome.IGNORED,
                        f"Intention {reference} introuvable.")

    from .actors import payee_for_relay_point

    compte = payee_for_relay_point(relay_profile, create=True)

    try:
        hold = reallocate_unresolved(
            intent, payee=compte, payee_type="RELAY_POINT",
            component="RELAY_HANDLING",
        )
    except Exception as exc:
        return _cloture(evenement, EscrowEvent.Outcome.ERROR,
                        f"Reallocation impossible : {exc}")

    if hold is None:
        return _cloture(
            evenement, EscrowEvent.Outcome.IGNORED,
            f"Aucune part de remise a reallouer sur {reference}. "
            "Le point relais etait deja connu, ou aucune remise n'est "
            "facturee sur cette commande.",
        )

    return _cloture(
        evenement, EscrowEvent.Outcome.APPLIED,
        f"Part de remise de {hold.net_amount_xaf} XAF attribuee a "
        f"{compte.payee_code} — sequestre {hold.reference}. Le produit "
        "provisoirement comptabilise a ete repris.",
        1,
    )


# ─────────────────────────────────────────────────────────────────────────────
# LITIGES — gel SCOPE
# ─────────────────────────────────────────────────────────────────────────────

@db_transaction.atomic
def dispute_opened(*, order_id: int, reason: str, component: str = "",
                   event_id: str = "", emitter: str = "",
                   occurred_at=None) -> EscrowEvent:
    """
    Un litige est ouvert.

    GELE LE SEQUESTRE CONCERNE, ET LUI SEUL.

    Un litige sur le colis 1 ne gele pas le colis 2 du meme vendeur, ni le
    transport, ni les autres beneficiaires. C'est precisement ce que la
    granularite a quatre dimensions rend possible — et ce qu'une cle
    (paiement x beneficiaire) rendait impossible.

    Sans `component`, seule la MARCHANDISE de la commande est gelee : c'est
    l'objet habituel d'un litige acheteur. Le transport a ete execute ou non,
    independamment.
    """
    cible = component or EscrowHold.Component.GOODS

    evenement, nouveau = _journalise(
        EscrowEvent.Kind.DISPUTE_OPENED, event_id,
        emitter=emitter, order_id=order_id, component=cible,
        payload={"reason": reason}, occurred_at=occurred_at,
    )
    if not nouveau:
        return evenement

    concernes = list(EscrowHold.objects.filter(
        order_id=order_id, component=cible,
        status__in=[EscrowHold.Status.HELD, EscrowHold.Status.RELEASE_SCHEDULED],
    ))

    if not concernes:
        return _cloture(
            evenement, EscrowEvent.Outcome.IGNORED,
            f"Aucun sequestre gelable pour la commande #{order_id} "
            f"({cible}). Deja libere ou inexistant.",
        )

    for hold in concernes:
        freeze_hold(hold, reason=f"Litige : {reason}")

    return _cloture(
        evenement, EscrowEvent.Outcome.APPLIED,
        f"{len(concernes)} sequestre(s) gele(s) — commande #{order_id}, "
        f"composant {cible}. Les autres sequestres du paiement ne sont pas "
        "affectes.",
        len(concernes),
    )


@db_transaction.atomic
def dispute_resolved(*, order_id: int, resolution: str, component: str = "",
                     refund_amount_xaf: int = 0, event_id: str = "",
                     emitter: str = "", occurred_at=None) -> EscrowEvent:
    """
    Un litige est tranche.

    resolution :
      REJECTED    — litige infonde : le cycle normal reprend
      REFUND      — remboursement total (execute au Lot 8)
      PARTIAL     — remboursement partiel (execute au Lot 8)
    """
    cible = component or EscrowHold.Component.GOODS

    evenement, nouveau = _journalise(
        EscrowEvent.Kind.DISPUTE_RESOLVED, event_id,
        emitter=emitter, order_id=order_id, component=cible,
        payload={"resolution": resolution, "refund_amount_xaf": refund_amount_xaf},
        occurred_at=occurred_at,
    )
    if not nouveau:
        return evenement

    geles = list(EscrowHold.objects.filter(
        order_id=order_id, component=cible, status=EscrowHold.Status.FROZEN,
    ))
    if not geles:
        return _cloture(
            evenement, EscrowEvent.Outcome.IGNORED,
            f"Aucun sequestre gele pour la commande #{order_id}.",
        )

    decision = (resolution or "").upper()

    if decision in ("REJECTED", "DISMISSED"):
        for hold in geles:
            unfreeze_hold(hold, reason="Litige rejete.")
        return _cloture(
            evenement, EscrowEvent.Outcome.APPLIED,
            f"Litige rejete : {len(geles)} sequestre(s) degele(s). "
            "Le cycle de liberation reprend.",
            len(geles),
        )

    if decision in ("REFUND", "PARTIAL", "PARTIAL_REFUND"):
        return _rembourser(evenement, geles, decision, refund_amount_xaf)

    return _cloture(
        evenement, EscrowEvent.Outcome.IGNORED,
        f"Resolution '{decision}' inconnue. Les sequestres restent geles.",
    )


def _rembourser(evenement, geles, decision: str, montant: int):
    """
    Cree la demande de remboursement d'un litige tranche en faveur de
    l'acheteur.

    ─────────────────────────────────────────────────────────────────────────
    ON CREE, ON N'EXECUTE PAS

    Le remboursement exige une approbation par un TIERS avant que l'argent
    ne sorte — meme regle que pour un versement partenaire, c'est le meme
    argent et le meme risque.

    Un litige tranche automatiquement suivi d'un virement automatique
    ouvrirait la porte a la fraude par litige : ouvrir un litige, le faire
    trancher, encaisser.
    ─────────────────────────────────────────────────────────────────────────
    """
    from apps.payments.settlements.models import Refund
    from apps.payments.settlements.services import SettlementError, create_refund

    intent = geles[0].intent
    total = sum(h.payable_amount_xaf for h in geles)

    if decision == "REFUND":
        a_rembourser = total
    else:
        a_rembourser = int(montant or 0)
        if a_rembourser <= 0:
            return _cloture(
                evenement, EscrowEvent.Outcome.REJECTED,
                "Un remboursement PARTIEL exige un montant strictement "
                "positif.",
            )
        if a_rembourser > total:
            return _cloture(
                evenement, EscrowEvent.Outcome.REJECTED,
                f"Remboursement partiel de {a_rembourser} XAF superieur au "
                f"montant sous sequestre ({total} XAF).",
            )

    demandeur = _demandeur_systeme()
    try:
        remboursement = create_refund(
            intent, amount_xaf=a_rembourser,
            reason=Refund.Reason.DISPUTE,
            requested_by=demandeur,
            detail=(
                f"Litige tranche en {decision} sur la commande "
                f"#{geles[0].order_id}."
            ),
            holds=geles,
        )
    except SettlementError as exc:
        return _cloture(evenement, EscrowEvent.Outcome.ERROR,
                        f"Remboursement impossible : {exc}")

    return _cloture(
        evenement, EscrowEvent.Outcome.APPLIED,
        f"Remboursement {remboursement.reference} de {a_rembourser} XAF cree, "
        "EN ATTENTE D'APPROBATION. L'argent ne sortira qu'apres validation "
        "par un tiers.",
        len(geles),
    )


def _demandeur_systeme():
    """
    Auteur des demandes creees par un evenement metier.

    Il ne peut pas approuver : le compte est inactif et la separation des
    roles impose de toute facon un approbateur different.
    """
    from django.contrib.auth.models import User

    utilisateur, _ = User.objects.get_or_create(
        username="belivay-system",
        defaults={"is_active": False, "email": ""},
    )
    return utilisateur


@db_transaction.atomic
def order_cancelled(*, order_id: int, reason: str = "", event_id: str = "",
                    emitter: str = "", occurred_at=None) -> EscrowEvent:
    """Une commande est annulee avant expedition."""
    evenement, nouveau = _journalise(
        EscrowEvent.Kind.ORDER_CANCELLED, event_id,
        emitter=emitter, order_id=order_id,
        payload={"reason": reason}, occurred_at=occurred_at,
    )
    if not nouveau:
        return evenement

    annulables = list(EscrowHold.objects.filter(
        order_id=order_id,
        status__in=[EscrowHold.Status.PENDING, EscrowHold.Status.HELD],
    ))
    if not annulables:
        return _cloture(
            evenement, EscrowEvent.Outcome.IGNORED,
            f"Aucun sequestre annulable pour la commande #{order_id}.",
        )

    for hold in annulables:
        cancel_hold(hold, reason=reason or "Commande annulee.")

    return _cloture(
        evenement, EscrowEvent.Outcome.APPLIED,
        f"{len(annulables)} sequestre(s) annule(s). Le remboursement de "
        "l'acheteur releve du Lot 8.",
        len(annulables),
    )