# backend/apps/payments/risk/services.py
# Detection du risque et calcul du Trust Score.
#
# ─────────────────────────────────────────────────────────────────────────────
# DEUX PRINCIPES QUI SE TIENNENT
#
#   1. ON MARQUE, ON NE BLOQUE PAS
#      Le blocage automatique est desactive par defaut. Un score eleve
#      produit une ALERTE et une recommandation de revue, pas un refus.
#      Un faux positif coute un CLIENT ; le laisser passer coute une
#      TRANSACTION. Les deux couts ne sont pas du meme ordre.
#
#   2. LE PAYEUR TIERS N'EST PAS UN SUSPECT
#      Payer pour un proche est le cas nominal du segment diaspora. Son
#      poids dans le score est volontairement faible. Le signal vraiment
#      discriminant est un MEME NUMERO servant un nombre anormal de comptes.
# ─────────────────────────────────────────────────────────────────────────────

from __future__ import annotations

import logging
from datetime import timedelta
from decimal import Decimal

from django.db.models import Avg, Count
from django.utils import timezone

from apps.payments.intents.models import PaymentAttempt, PaymentIntent
from apps.payments.payees.models import PayeeAccount

from .models import RiskAssessment, RiskSignal, TrustScore

logger = logging.getLogger("apps.payments.risk")

#: Repli si aucune politique n'est configuree. Volontairement permissif :
#: en l'absence de regles, on n'invente pas de restrictions.
FALLBACK = {
    "shared_msisdn_payee_threshold": 2,
    "shared_msisdn_buyer_threshold": 5,
    "shared_msisdn_window_days": 30,
    "velocity_intents_per_hour": 10,
    "velocity_failed_attempts": 5,
    "amount_anomaly_multiplier": Decimal("5.00"),
    "amount_review_threshold_xaf": 500000,
    "momo_change_lookback_days": 7,
    "weight_shared_msisdn": 40,
    "weight_velocity": 20,
    "weight_amount": 15,
    "weight_new_payer": 5,
    "weight_momo_change": 50,
    "weight_failed_burst": 10,
    "review_score_threshold": 50,
    "block_score_threshold": 90,
    "auto_block_enabled": False,
    "trust_initial_score": 70,
    "trust_dispute_penalty": 10,
    "trust_late_penalty": 5,
    "trust_success_bonus": 1,
    "trust_window_days": 90,
    "trust_adjustment_review_xaf": 50000,
}


def current_policy():
    """Politique de risque en vigueur, ou None."""
    try:
        from apps.payments.config.models import RiskPolicy
        return RiskPolicy.current().order_by("-priority").first()
    except Exception:
        return None


def _p(politique, champ):
    if politique is None:
        return FALLBACK[champ]
    valeur = getattr(politique, champ, None)
    return FALLBACK[champ] if valeur is None else valeur


def _snapshot(politique) -> dict:
    return {champ: str(_p(politique, champ)) for champ in FALLBACK}


# ─────────────────────────────────────────────────────────────────────────────
# EVALUATION D'UNE INTENTION DE PAIEMENT
# ─────────────────────────────────────────────────────────────────────────────

def assess_intent(intent: PaymentIntent) -> RiskAssessment:
    """
    Evalue une intention de paiement.

    Ne bloque JAMAIS de sa propre initiative : elle produit un score, une
    recommandation, et la trace des signaux. La decision de refuser reste
    conditionnee a `auto_block_enabled`, desactive par defaut.
    """
    politique = current_policy()
    evaluation = RiskAssessment.objects.create(
        subject_type=RiskAssessment.Subject.PAYMENT_INTENT,
        subject_ref=intent.reference,
        policy_key=getattr(politique, "config_key", ""),
        policy_snapshot=_snapshot(politique),
    )

    signaux = []
    signaux += _signal_numero_partage_acheteurs(intent, politique)
    signaux += _signal_cadence(intent, politique)
    signaux += _signal_rafale_echecs(intent, politique)
    signaux += _signal_montant(intent, politique)
    signaux += _signal_payeur_tiers(intent, politique)

    for donnees in signaux:
        RiskSignal.objects.create(assessment=evaluation, **donnees)

    return _conclure(evaluation, signaux, politique)


def _conclure(evaluation, signaux, politique) -> RiskAssessment:
    score = min(100, sum(s["weight"] for s in signaux))
    seuil_revue = int(_p(politique, "review_score_threshold"))
    seuil_blocage = int(_p(politique, "block_score_threshold"))
    blocage_actif = bool(_p(politique, "auto_block_enabled"))

    if score >= seuil_blocage and blocage_actif:
        decision = RiskAssessment.Decision.BLOCK
        note = (f"Score {score} au-dela du seuil de blocage {seuil_blocage}, "
                "blocage automatique actif.")
    elif score >= seuil_blocage:
        decision = RiskAssessment.Decision.REVIEW
        note = (f"Score {score} au-dela du seuil de blocage {seuil_blocage}, "
                "mais le blocage automatique est DESACTIVE. "
                "Revue manuelle urgente recommandee.")
    elif score >= seuil_revue:
        decision = RiskAssessment.Decision.REVIEW
        note = f"Score {score} au-dela du seuil de revue {seuil_revue}."
    else:
        decision = RiskAssessment.Decision.ALLOW
        note = f"Score {score}, sous le seuil de revue."

    RiskAssessment.objects.filter(pk=evaluation.pk).update(
        score=score, decision=decision, note=note,
    )
    evaluation.refresh_from_db()

    if decision != RiskAssessment.Decision.ALLOW:
        logger.warning("Risque %s sur %s %s : %s",
                       score, evaluation.subject_type,
                       evaluation.subject_ref, note)
    return evaluation


# ─────────────────────────────────────────────────────────────────────────────
# SIGNAUX
# ─────────────────────────────────────────────────────────────────────────────

def _signal_numero_partage_acheteurs(intent, politique) -> list:
    """
    LE signal discriminant d'une mule financiere.

    Pas « un tiers paie » — mais un MEME NUMERO finançant un nombre anormal
    d'acheteurs DISTINCTS. Le seuil est volontairement genereux : un numero
    diaspora finance legitimement plusieurs proches.
    """
    if not intent.payer_msisdn_fingerprint:
        return []

    fenetre = timezone.now() - timedelta(
        days=int(_p(politique, "shared_msisdn_window_days")))
    acheteurs = (
        PaymentIntent.objects
        .filter(payer_msisdn_fingerprint=intent.payer_msisdn_fingerprint,
                created_at__gte=fenetre)
        .values("buyer_id").distinct().count()
    )
    seuil = int(_p(politique, "shared_msisdn_buyer_threshold"))
    if acheteurs <= seuil:
        return []

    poids = int(_p(politique, "weight_shared_msisdn"))
    return [{
        "kind": RiskSignal.Kind.SHARED_MSISDN_BUYER,
        "severity": RiskSignal.Severity.HIGH,
        "weight": poids,
        "detail": (
            f"Ce numero a finance {acheteurs} acheteurs distincts en "
            f"{_p(politique, 'shared_msisdn_window_days')} jours "
            f"(seuil : {seuil}). Un numero diaspora finance legitimement "
            "plusieurs proches — c'est le VOLUME qui interpelle."
        ),
        "evidence": {"distinct_buyers": acheteurs, "threshold": seuil,
                     "msisdn_masked": intent.payer_msisdn_masked},
    }]


def _signal_cadence(intent, politique) -> list:
    depuis = timezone.now() - timedelta(hours=1)
    recentes = PaymentIntent.objects.filter(
        buyer=intent.buyer, created_at__gte=depuis).count()
    seuil = int(_p(politique, "velocity_intents_per_hour"))
    if recentes <= seuil:
        return []
    return [{
        "kind": RiskSignal.Kind.VELOCITY,
        "severity": RiskSignal.Severity.MEDIUM,
        "weight": int(_p(politique, "weight_velocity")),
        "detail": (f"{recentes} intentions creees dans l'heure par cet "
                   f"acheteur (seuil : {seuil})."),
        "evidence": {"intents_last_hour": recentes, "threshold": seuil},
    }]


def _signal_rafale_echecs(intent, politique) -> list:
    depuis = timezone.now() - timedelta(hours=1)
    echecs = PaymentAttempt.objects.filter(
        intent__buyer=intent.buyer,
        status=PaymentAttempt.Status.FAILED,
        created_at__gte=depuis).count()
    seuil = int(_p(politique, "velocity_failed_attempts"))
    if echecs < seuil:
        return []
    return [{
        "kind": RiskSignal.Kind.FAILED_BURST,
        "severity": RiskSignal.Severity.MEDIUM,
        "weight": int(_p(politique, "weight_failed_burst")),
        "detail": (f"{echecs} tentatives echouees dans l'heure "
                   f"(seuil : {seuil}). Possible essai de numeros."),
        "evidence": {"failed_attempts": echecs, "threshold": seuil},
    }]


def _signal_montant(intent, politique) -> list:
    signaux = []
    seuil_revue = int(_p(politique, "amount_review_threshold_xaf"))
    if seuil_revue and intent.amount_xaf >= seuil_revue:
        signaux.append({
            "kind": RiskSignal.Kind.LARGE_AMOUNT,
            "severity": RiskSignal.Severity.LOW,
            "weight": int(_p(politique, "weight_amount")),
            "detail": (f"Montant de {intent.amount_xaf} XAF au-dela du seuil "
                       f"de revue ({seuil_revue} XAF)."),
            "evidence": {"amount_xaf": intent.amount_xaf,
                         "threshold": seuil_revue},
        })

    moyenne = (
        PaymentIntent.objects
        .filter(buyer=intent.buyer, status=PaymentIntent.Status.SUCCEEDED)
        .exclude(pk=intent.pk)
        .aggregate(m=Avg("amount_xaf"))["m"]
    )
    if moyenne:
        multiplicateur = Decimal(str(_p(politique, "amount_anomaly_multiplier")))
        plafond = Decimal(str(moyenne)) * multiplicateur
        if Decimal(intent.amount_xaf) > plafond:
            signaux.append({
                "kind": RiskSignal.Kind.AMOUNT_ANOMALY,
                "severity": RiskSignal.Severity.MEDIUM,
                "weight": int(_p(politique, "weight_amount")),
                "detail": (
                    f"Montant de {intent.amount_xaf} XAF contre une moyenne "
                    f"de {int(moyenne)} XAF pour cet acheteur "
                    f"(x{multiplicateur})."
                ),
                "evidence": {"amount_xaf": intent.amount_xaf,
                             "buyer_average_xaf": int(moyenne),
                             "multiplier": str(multiplicateur)},
            })
    return signaux


def _signal_payeur_tiers(intent, politique) -> list:
    """
    Premier paiement par un tiers.

    POIDS VOLONTAIREMENT FAIBLE. C'est le cas nominal du segment diaspora,
    principal moteur de marge. Ce signal sert a CONTEXTUALISER une
    evaluation, jamais a la faire basculer a lui seul.
    """
    if intent.payer_relationship != PaymentIntent.Relationship.THIRD_PARTY:
        return []

    deja_vu = PaymentIntent.objects.filter(
        buyer=intent.buyer,
        payer_msisdn_fingerprint=intent.payer_msisdn_fingerprint,
        status=PaymentIntent.Status.SUCCEEDED,
    ).exclude(pk=intent.pk).exists()
    if deja_vu:
        return []

    return [{
        "kind": RiskSignal.Kind.NEW_THIRD_PARTY_PAYER,
        "severity": RiskSignal.Severity.INFO,
        "weight": int(_p(politique, "weight_new_payer")),
        "detail": (
            "Premier paiement de ce numero pour cet acheteur. "
            "CAS NOMINAL du segment diaspora — signal de contexte, "
            "pas de suspicion."
        ),
        "evidence": {"msisdn_masked": intent.payer_msisdn_masked},
    }]


# ─────────────────────────────────────────────────────────────────────────────
# EVALUATION D'UN VERSEMENT
# ─────────────────────────────────────────────────────────────────────────────

def assess_payout(payout) -> RiskAssessment:
    """
    Evalue une demande de versement.

    Le scenario redoute : compte compromis, numero change, versement
    demande. La periode de refroidissement du Lot 4 le bloque deja ; ce
    signal le rend VISIBLE a l'operateur qui approuve.
    """
    politique = current_policy()
    evaluation = RiskAssessment.objects.create(
        subject_type=RiskAssessment.Subject.PAYOUT_REQUEST,
        subject_ref=payout.reference,
        policy_key=getattr(politique, "config_key", ""),
        policy_snapshot=_snapshot(politique),
    )

    signaux = []
    signaux += _signal_numero_partage_beneficiaires(payout.payee, politique)
    signaux += _signal_changement_recent(payout.payee, politique)
    signaux += _signal_kyc(payout.payee, politique)

    seuil = int(_p(politique, "amount_review_threshold_xaf"))
    if seuil and payout.amount_xaf >= seuil:
        signaux.append({
            "kind": RiskSignal.Kind.LARGE_AMOUNT,
            "severity": RiskSignal.Severity.LOW,
            "weight": int(_p(politique, "weight_amount")),
            "detail": f"Versement de {payout.amount_xaf} XAF au-dela du seuil.",
            "evidence": {"amount_xaf": payout.amount_xaf, "threshold": seuil},
        })

    for donnees in signaux:
        RiskSignal.objects.create(assessment=evaluation, **donnees)

    return _conclure(evaluation, signaux, politique)


def _signal_numero_partage_beneficiaires(payee, politique) -> list:
    """
    Plusieurs BENEFICIAIRES partageant un numero de versement.

    C'est un signal bien plus fort que du cote acheteur : il n'existe aucune
    raison legitime pour que deux vendeurs distincts soient payes sur le
    meme numero.
    """
    if not payee.momo_fingerprint:
        return []

    autres = PayeeAccount.objects.filter(
        momo_fingerprint=payee.momo_fingerprint).exclude(pk=payee.pk)
    seuil = int(_p(politique, "shared_msisdn_payee_threshold"))
    total = autres.count() + 1
    if total < seuil:
        return []

    return [{
        "kind": RiskSignal.Kind.SHARED_MSISDN_PAYEE,
        "severity": RiskSignal.Severity.HIGH,
        "weight": int(_p(politique, "weight_shared_msisdn")),
        "detail": (
            f"{total} beneficiaires distincts partagent ce numero de "
            "versement. Aucune raison legitime ne justifie que deux "
            "partenaires soient payes sur le meme numero."
        ),
        "evidence": {"shared_count": total, "threshold": seuil,
                     "payees": [p.payee_code for p in autres[:10]]},
    }]


def _signal_changement_recent(payee, politique) -> list:
    if not payee.momo_changed_at:
        return []
    jours = int(_p(politique, "momo_change_lookback_days"))
    limite = timezone.now() - timedelta(days=jours)
    if payee.momo_changed_at < limite:
        return []

    return [{
        "kind": RiskSignal.Kind.RECENT_MOMO_CHANGE,
        "severity": RiskSignal.Severity.HIGH,
        "weight": int(_p(politique, "weight_momo_change")),
        "detail": (
            f"Numero modifie le {payee.momo_changed_at:%Y-%m-%d %H:%M}, "
            f"il y a moins de {jours} jours. C'est le scenario d'un compte "
            "compromis : la periode de refroidissement bloque deja le "
            "versement, ce signal le rend visible a l'approbateur."
        ),
        "evidence": {"changed_at": payee.momo_changed_at.isoformat(),
                     "lookback_days": jours},
    }]


def _signal_kyc(payee, politique) -> list:
    if payee.kyc_status == "VERIFIED":
        return []
    return [{
        "kind": RiskSignal.Kind.KYC_INCOMPLETE,
        "severity": RiskSignal.Severity.HIGH,
        "weight": 30,
        "detail": f"KYC en statut {payee.kyc_status}.",
        "evidence": {"kyc_status": payee.kyc_status},
    }]


# ─────────────────────────────────────────────────────────────────────────────
# TRUST SCORE
# ─────────────────────────────────────────────────────────────────────────────

def compute_trust_score(payee: PayeeAccount, *, now=None) -> TrustScore:
    """
    Calcule le score de confiance d'un partenaire sur une fenetre glissante.

    Le score part d'une valeur initiale et evolue selon les faits observes :
    litiges, retards, annulations, livraisons reussies.

    IMPORTANT : ce calcul ne DEDUIT rien tout seul. Il produit un score.
    L'application d'un ajustement financier issu de ce score passe par
    `trust_adjustment_review_xaf` : au-dela du seuil, validation humaine
    obligatoire. Un bug de calcul applique en masse viderait des partenaires
    avant qu'on le detecte.
    """
    from apps.payments.escrow.models import EscrowHold

    moment = now or timezone.now()
    politique = current_policy()
    fenetre = int(_p(politique, "trust_window_days"))
    depuis = moment - timedelta(days=fenetre)

    holds = EscrowHold.objects.filter(payee=payee, created_at__gte=depuis)
    total = holds.count()
    litiges = holds.filter(status=EscrowHold.Status.FROZEN).count()
    annules = holds.filter(status=EscrowHold.Status.CANCELLED).count()
    reussis = holds.filter(status__in=[
        EscrowHold.Status.RELEASED,
    ]).count()

    # ─────────────────────────────────────────────────────────────────────
    # LE RETARD DE LIVRAISON N'EST PAS CALCULE ICI (principe P9)
    #
    # Le domaine financier ne juge pas les faits metier. Un retard de
    # livraison est constate par le domaine LIVRAISON, selon ses propres
    # regles — delai contractuel, jours ouvres, cas de force majeure.
    #
    # Le module financier consommera un evenement dedie quand ce domaine
    # l'emettra. En attendre le calcul ici reviendrait a dupliquer une
    # logique logistique qui divergerait de la sienne.
    # ─────────────────────────────────────────────────────────────────────
    retards = 0

    initial = int(_p(politique, "trust_initial_score"))
    penalite_litige = int(_p(politique, "trust_dispute_penalty"))
    penalite_retard = int(_p(politique, "trust_late_penalty"))
    bonus = int(_p(politique, "trust_success_bonus"))

    score = initial
    score -= litiges * penalite_litige
    score -= annules * penalite_retard
    score += min(reussis * bonus, 30)      # le bonus est plafonne
    score = max(0, min(100, score))

    precedent = TrustScore.latest_for(payee)

    return TrustScore.objects.create(
        payee=payee, score=score,
        previous_score=precedent.score if precedent else None,
        orders_count=total, disputes_count=litiges,
        # late_count reste a zero tant que le domaine livraison n'emet pas
        # d'evenement de retard : le financier ne le calcule pas lui-meme.
        late_count=retards, cancelled_count=annules,
        policy_key=getattr(politique, "config_key", ""),
        window_days=fenetre,
        breakdown={
            "initial": initial,
            "disputes": -litiges * penalite_litige,
            "cancelled": -annules * penalite_retard,
            "success_bonus": min(reussis * bonus, 30),
            "successful_holds": reussis,
        },
    )


def recompute_all_trust_scores(limit: int = 500) -> dict:
    """Recalcule les scores. Appelee par l'ordonnanceur."""
    comptes = PayeeAccount.objects.filter(is_active=True).exclude(
        payee_type="BUYER")[:limit]
    calcules, degrades = 0, []
    for compte in comptes:
        try:
            score = compute_trust_score(compte)
            calcules += 1
            if score.delta <= -15:
                degrades.append({"payee": compte.payee_code,
                                 "score": score.score, "delta": score.delta})
        except Exception as exc:
            logger.warning("Trust Score impossible pour %s : %s",
                           compte.payee_code, exc)
    if degrades:
        logger.warning("Degradations de Trust Score : %s", degrades[:10])
    return {"computed": calcules, "sharp_drops": len(degrades),
            "drops": degrades[:10]}


def trust_adjustment_needs_review(amount_xaf: int) -> bool:
    """
    Un ajustement issu du Trust Score exige-t-il une validation humaine ?

    Au-dela du seuil, oui — systematiquement. Un bug de calcul applique en
    masse viderait des partenaires avant qu'on le detecte.
    """
    politique = current_policy()
    seuil = int(_p(politique, "trust_adjustment_review_xaf"))
    return bool(seuil) and amount_xaf >= seuil