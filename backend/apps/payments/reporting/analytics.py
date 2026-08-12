# backend/apps/payments/reporting/analytics.py
# Series temporelles et analyse d'activite.
#
# ─────────────────────────────────────────────────────────────────────────────
# UN ECRAN SEPARE DU TABLEAU DE BORD
#
# Le tableau de bord repond a « dois-je agir ce matin ? ». Celui-ci repond a
# « comment ca evolue ? ».
#
# Les melanger nuirait aux deux : une alerte perdue au milieu de graphiques
# est une alerte manquee, et un graphique coince entre deux avertissements
# n'est jamais lu.
#
# LECTURE SEULE, comme tout le module `reporting`. Aucun effet de bord.
# ─────────────────────────────────────────────────────────────────────────────

from __future__ import annotations

import logging
from datetime import timedelta

from django.db.models import Avg, Count, F, Q, Sum
from django.db.models.functions import TruncDate
from django.utils import timezone

logger = logging.getLogger("apps.payments.analytics")


def _bornes(days: int):
    fin = timezone.now()
    debut = fin - timedelta(days=days)
    return debut, fin


def _serie_vide(days: int) -> list:
    """
    Une ligne par jour, meme sans activite.

    Un graphique qui saute les jours creux ment sur la tendance : trois
    ventes le lundi et trois le vendredi ressembleraient a six jours
    d'activite continue.
    """
    aujourdhui = timezone.now().date()
    return [
        {"date": (aujourdhui - timedelta(days=decalage)).isoformat(),
         "collected_xaf": 0, "count": 0, "refunded_xaf": 0}
        for decalage in range(days - 1, -1, -1)
    ]


# ─────────────────────────────────────────────────────────────────────────────
# ENCAISSEMENTS
# ─────────────────────────────────────────────────────────────────────────────

def collections_series(days: int = 30) -> list:
    """Encaissements confirmes, jour par jour."""
    from apps.payments.intents.models import PaymentIntent
    from apps.payments.settlements.models import Refund

    debut, _ = _bornes(days)
    serie = {ligne["date"]: ligne for ligne in _serie_vide(days)}

    encaisses = (
        PaymentIntent.objects
        .filter(status=PaymentIntent.Status.SUCCEEDED,
                confirmed_at__gte=debut)
        .annotate(jour=TruncDate("confirmed_at"))
        .values("jour")
        .annotate(total=Sum("amount_xaf"), n=Count("id"))
    )
    for ligne in encaisses:
        cle = ligne["jour"].isoformat()
        if cle in serie:
            serie[cle]["collected_xaf"] = ligne["total"] or 0
            serie[cle]["count"] = ligne["n"]

    # Les remboursements sur la MEME echelle : un pic d'encaissement suivi
    # d'un pic de remboursement n'est pas une bonne semaine.
    rembourses = (
        Refund.objects
        .filter(status=Refund.Status.PAID, created_at__gte=debut)
        .annotate(jour=TruncDate("created_at"))
        .values("jour")
        .annotate(total=Sum("amount_xaf"))
    )
    for ligne in rembourses:
        cle = ligne["jour"].isoformat()
        if cle in serie:
            serie[cle]["refunded_xaf"] = ligne["total"] or 0

    return list(serie.values())


def collections_summary(days: int = 30) -> dict:
    """Chiffres cles de la periode, et comparaison avec la precedente."""
    from apps.payments.intents.models import PaymentIntent

    fin = timezone.now()
    debut = fin - timedelta(days=days)
    debut_precedent = debut - timedelta(days=days)

    def _mesurer(depuis, jusqu):
        lot = PaymentIntent.objects.filter(
            status=PaymentIntent.Status.SUCCEEDED,
            confirmed_at__gte=depuis, confirmed_at__lt=jusqu,
        )
        agrege = lot.aggregate(
            total=Sum("amount_xaf"), n=Count("id"), moyen=Avg("amount_xaf"))
        return {
            "collected_xaf": agrege["total"] or 0,
            "count": agrege["n"] or 0,
            "average_xaf": int(agrege["moyen"] or 0),
        }

    actuel = _mesurer(debut, fin)
    precedent = _mesurer(debut_precedent, debut)

    def _variation(maintenant: int, avant: int):
        # Une variation depuis zero n'a pas de sens : on retourne None
        # plutot qu'un « +∞ » qui n'informe personne.
        if avant == 0:
            return None
        return round(((maintenant - avant) / avant) * 100, 1)

    return {
        "period_days": days,
        "current": actuel,
        "previous": precedent,
        "change_percent": {
            "collected": _variation(actuel["collected_xaf"],
                                    precedent["collected_xaf"]),
            "count": _variation(actuel["count"], precedent["count"]),
        },
    }


# ─────────────────────────────────────────────────────────────────────────────
# CONVERSION
# ─────────────────────────────────────────────────────────────────────────────

def conversion_funnel(days: int = 30) -> dict:
    """
    Combien d'intentions aboutissent ?

    Le taux d'echec est le chiffre le plus actionnable de cet ecran : une
    hausse soudaine signale un incident prestataire bien avant qu'un client
    n'ecrive au support.
    """
    from apps.payments.intents.models import PaymentIntent

    debut, _ = _bornes(days)
    lot = PaymentIntent.objects.filter(created_at__gte=debut)

    total = lot.count()
    par_statut = dict(
        lot.values_list("status").annotate(n=Count("id")),
    )

    reussis = par_statut.get(PaymentIntent.Status.SUCCEEDED, 0)
    echoues = par_statut.get(PaymentIntent.Status.FAILED, 0)
    expires = par_statut.get(PaymentIntent.Status.EXPIRED, 0)
    en_cours = (par_statut.get(PaymentIntent.Status.PROCESSING, 0)
                + par_statut.get(PaymentIntent.Status.REQUIRES_ACTION, 0))

    def _part(valeur: int) -> float:
        return round((valeur / total) * 100, 1) if total else 0.0

    return {
        "period_days": days,
        "total": total,
        "succeeded": reussis,
        "failed": echoues,
        "expired": expires,
        "pending": en_cours,
        "success_rate": _part(reussis),
        "failure_rate": _part(echoues),
        # Un abandon n'est pas un echec technique : l'acheteur n'a pas
        # compose son code. Les confondre masquerait un vrai incident.
        "abandon_rate": _part(expires),
        "by_status": par_statut,
    }


def failure_reasons(days: int = 30, limit: int = 8) -> list:
    """Motifs d'echec les plus frequents, tels que le prestataire les donne."""
    from apps.payments.intents.models import PaymentAttempt

    debut, _ = _bornes(days)
    return list(
        PaymentAttempt.objects
        .filter(created_at__gte=debut, status=PaymentAttempt.Status.FAILED)
        .exclude(error_code="")
        .values("error_code")
        .annotate(count=Count("id"))
        .order_by("-count")[:limit]
    )


def operator_split(days: int = 30) -> list:
    """
    Repartition MTN / Orange.

    Un desequilibre soudain revele souvent une panne d'operateur avant
    qu'elle ne soit annoncee.
    """
    from apps.payments.intents.models import PaymentIntent

    debut, _ = _bornes(days)
    lignes = (
        PaymentIntent.objects
        .filter(created_at__gte=debut)
        .exclude(payer_operator="")
        .values("payer_operator")
        .annotate(
            total=Count("id"),
            succeeded=Count("id", filter=Q(
                status=PaymentIntent.Status.SUCCEEDED)),
            amount_xaf=Sum("amount_xaf", filter=Q(
                status=PaymentIntent.Status.SUCCEEDED)),
        )
        .order_by("-total")
    )
    return [
        {
            "operator": ligne["payer_operator"],
            "total": ligne["total"],
            "succeeded": ligne["succeeded"],
            "amount_xaf": ligne["amount_xaf"] or 0,
            "success_rate": round(
                (ligne["succeeded"] / ligne["total"]) * 100, 1,
            ) if ligne["total"] else 0.0,
        }
        for ligne in lignes
    ]


# ─────────────────────────────────────────────────────────────────────────────
# PARTENAIRES ET REVENUS
# ─────────────────────────────────────────────────────────────────────────────

def payouts_series(days: int = 30) -> list:
    """Versements executes, jour par jour."""
    from apps.payments.settlements.models import PayoutRequest

    debut, _ = _bornes(days)
    aujourdhui = timezone.now().date()
    serie = {
        (aujourdhui - timedelta(days=d)).isoformat():
            {"date": (aujourdhui - timedelta(days=d)).isoformat(),
             "paid_xaf": 0, "count": 0}
        for d in range(days - 1, -1, -1)
    }

    lignes = (
        PayoutRequest.objects
        .filter(status=PayoutRequest.Status.PAID, settled_at__gte=debut)
        .annotate(jour=TruncDate("settled_at"))
        .values("jour")
        .annotate(total=Sum("amount_xaf"), n=Count("id"))
    )
    for ligne in lignes:
        cle = ligne["jour"].isoformat()
        if cle in serie:
            serie[cle]["paid_xaf"] = ligne["total"] or 0
            serie[cle]["count"] = ligne["n"]

    return list(serie.values())


def top_payees(days: int = 30, limit: int = 10) -> list:
    """Partenaires les plus regles sur la periode."""
    from apps.payments.settlements.models import PayoutRequest

    debut, _ = _bornes(days)
    lignes = (
        PayoutRequest.objects
        .filter(status=PayoutRequest.Status.PAID, settled_at__gte=debut)
        .values("payee__payee_code", "payee__payee_type",
                "payee__display_label")
        .annotate(total=Sum("amount_xaf"), count=Count("id"))
        .order_by("-total")[:limit]
    )
    return [
        {
            "payee_code": ligne["payee__payee_code"],
            "payee_type": ligne["payee__payee_type"],
            "display_label": ligne["payee__display_label"],
            "total_xaf": ligne["total"] or 0,
            "count": ligne["count"],
        }
        for ligne in lignes
    ]


def revenue_breakdown(days: int = 30) -> dict:
    """
    Ce que la plateforme a gagne, et ce qu'elle a paye pour l'encaisser.

    Les frais du prestataire sont une CHARGE de BelivaY, jamais une retenue
    sur le partenaire — c'est ce que le referentiel impose, et le voir ici
    permet de verifier que la marge nette reste positive.
    """
    from apps.payments.ledger import chart_of_accounts as coa
    from apps.payments.ledger.balances import balance, revenue_summary

    debut, _ = _bornes(days)

    # ─────────────────────────────────────────────────────────────────────
    # LES FRAIS SE LISENT AU REGISTRE, PAS SUR LES MODELES
    #
    # `PaymentAttempt` ne porte aucun champ de frais : ils sont ecrits
    # directement aux comptes 5010 et 5011. Le registre est la seule source
    # qui les connaisse tous, y compris ceux d'une correction manuelle.
    # ─────────────────────────────────────────────────────────────────────
    frais_encaissement = balance(coa.EXPENSE_PSP_COLLECT)
    frais_versement = balance(coa.EXPENSE_PSP_PAYOUT)

    revenus = revenue_summary()
    total_frais = frais_encaissement + frais_versement

    return {
        "period_days": days,
        "revenue_total_xaf": revenus.get("revenue_total", 0),
        "psp_fees_collect_xaf": frais_encaissement,
        "psp_fees_payout_xaf": frais_versement,
        "psp_fees_total_xaf": total_frais,
        "net_margin_xaf": revenus.get("revenue_total", 0) - total_frais,
    }


def escrow_aging(buckets=(2, 7, 14, 30)) -> list:
    """
    Depuis combien de temps les sequestres actifs attendent-ils ?

    Un sequestre vieux de plus de trente jours signale une commande
    oubliee : ni confirmee, ni contestee, ni auto-confirmee. C'est de
    l'argent immobilise qui n'interesse personne — jusqu'a ce qu'un
    partenaire le reclame.
    """
    from apps.payments.escrow.models import EscrowHold

    maintenant = timezone.now()
    actifs = EscrowHold.objects.filter(
        status__in=[EscrowHold.Status.HELD,
                    EscrowHold.Status.RELEASE_SCHEDULED,
                    EscrowHold.Status.FROZEN],
    )

    tranches = []
    precedent = 0
    for limite in buckets:
        lot = actifs.filter(
            created_at__lt=maintenant - timedelta(days=precedent),
            created_at__gte=maintenant - timedelta(days=limite),
        ).aggregate(total=Sum("net_amount_xaf"), n=Count("id"))
        tranches.append({
            "label": f"{precedent}–{limite} j",
            "max_days": limite,
            "count": lot["n"] or 0,
            "total_xaf": lot["total"] or 0,
        })
        precedent = limite

    reste = actifs.filter(
        created_at__lt=maintenant - timedelta(days=precedent),
    ).aggregate(total=Sum("net_amount_xaf"), n=Count("id"))
    tranches.append({
        "label": f"plus de {precedent} j",
        "max_days": None,
        "count": reste["n"] or 0,
        "total_xaf": reste["total"] or 0,
    })

    return tranches


def dispute_stats(days: int = 30) -> dict:
    """
    Litiges et leur issue.

    Le taux de litige est un signal de qualite : au-dela de quelques
    pourcents, le probleme n'est pas financier mais commercial.
    """
    from apps.payments.escrow.models import EscrowHold
    from apps.payments.settlements.models import Refund

    debut, _ = _bornes(days)

    geles = EscrowHold.objects.filter(
        frozen_at__gte=debut).count()
    rembourses = Refund.objects.filter(
        created_at__gte=debut, reason=Refund.Reason.DISPUTE).count()
    total_commandes = EscrowHold.objects.filter(
        created_at__gte=debut, component=EscrowHold.Component.GOODS).count()

    return {
        "period_days": days,
        "disputes_opened": geles,
        "refunds_from_disputes": rembourses,
        "orders_with_escrow": total_commandes,
        "dispute_rate": round(
            (geles / total_commandes) * 100, 2,
        ) if total_commandes else 0.0,
    }


# ─────────────────────────────────────────────────────────────────────────────
# SYNTHESE
# ─────────────────────────────────────────────────────────────────────────────

def build(days: int = 30) -> dict:
    """Tout l'ecran de pilotage, en une requete."""
    return {
        "generated_at": timezone.now(),
        "period_days": days,
        "summary": collections_summary(days),
        "collections": collections_series(days),
        "payouts": payouts_series(days),
        "funnel": conversion_funnel(days),
        "failure_reasons": failure_reasons(days),
        "operators": operator_split(days),
        "top_payees": top_payees(days),
        "revenue": revenue_breakdown(days),
        "escrow_aging": escrow_aging(),
        "disputes": dispute_stats(days),
    }