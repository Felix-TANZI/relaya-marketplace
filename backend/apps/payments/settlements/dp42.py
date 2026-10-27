# backend/apps/payments/settlements/dp42.py
# DP-42 : double validation de tout versement, par deux personnes différentes.
#
#   - le comptable (Finance) valide en premier, le porteur (Direction) en second ; jamais la même personne
#   - la liste du vendredi se valide en bloc : total et détail, chaque demande gardant ses deux approbations
#   - toute sortie d'argent manuelle (versement exceptionnel, remboursement à la main) passe aussi par deux personnes ;
#     le remboursement automatique et le retrait Wallet restent automatiques
#   - rappels aux valideurs le vendredi tôt (r_rappel_valideurs_h1), puis un second (r_rappel_valideurs_h2), avant
#     r_versement_heure (R22.2)
#   - un valideur de secours, accordé pour au plus r_secours_jours_max jours, tracé (ValideurSecours)
#
# Rôles : groupes Django « finance-comptable » et « direction ». Un superutilisateur n'a AUCUN rôle par défaut :
# sinon une seule personne pourrait tenir les deux places.

from __future__ import annotations

import logging
from datetime import timedelta

from django.contrib.auth.models import User
from django.db import transaction as db_transaction
from django.db.models import Q, Sum
from django.utils import timezone

from apps.regles import services as regles

from .models import PayoutApproval, PayoutRequest, RappelValidation, ValideurSecours

logger = logging.getLogger("apps.payments")

COMPTABLE = ValideurSecours.Role.COMPTABLE
DIRECTION = ValideurSecours.Role.DIRECTION
ORDRE = (COMPTABLE, DIRECTION)
GROUPES = {COMPTABLE: "finance-comptable", DIRECTION: "direction"}
LIBELLES = {COMPTABLE: "le comptable (Finance)", DIRECTION: "le porteur (Direction)"}


class Dp42Error(Exception):
    pass


def secours_actif(user, role, quand=None):
    quand = quand or timezone.now()
    return (ValideurSecours.objects.filter(user=user, role=role, revoque_le__isnull=True, debut__lte=quand,
                                           fin__gt=quand).order_by("-fin").first())


def roles_de(user, quand=None) -> set:
    if not user or not getattr(user, "is_authenticated", False) or not user.is_active:
        return set()
    roles = {role for role, groupe in GROUPES.items() if user.groups.filter(name=groupe).exists()}
    return roles | {role for role in ORDRE if secours_actif(user, role, quand)}


def etape(payout: PayoutRequest) -> str | None:
    """Le rôle attendu pour la prochaine validation de cette demande, ou None si les deux sont faites."""
    faits = set(payout.approvals.values_list("role", flat=True))
    return next((r for r in ORDRE if r not in faits), None)


def controler(payout: PayoutRequest, user) -> dict:
    """Le titre auquel `user` peut valider maintenant ; lève Dp42Error sinon. {"role", "secours"}."""
    attendu = etape(payout)
    if attendu is None:
        raise Dp42Error(f"Le versement {payout.reference} a déjà ses deux validations (DP-42).")
    if attendu not in roles_de(user):
        raise Dp42Error(f"DP-42 : cette validation revient à {LIBELLES[attendu]}"
                        + (" ; le comptable valide en premier." if attendu == COMPTABLE else "."))
    if payout.approvals.filter(approved_by=user).exists():
        raise Dp42Error("DP-42 : les deux validations sont faites par deux personnes différentes.")
    groupe = user.groups.filter(name=GROUPES[attendu]).exists()
    return {"role": attendu, "secours": None if groupe else secours_actif(user, attendu)}


def valideurs(role) -> list:
    """Les personnes qui peuvent tenir ce rôle maintenant (groupe ou secours actif)."""
    maintenant = timezone.now()
    par_groupe = Q(groups__name=GROUPES[role])
    par_secours = Q(secours_dp42__role=role, secours_dp42__revoque_le__isnull=True,
                    secours_dp42__debut__lte=maintenant, secours_dp42__fin__gt=maintenant)
    return list(User.objects.filter(is_active=True).filter(par_groupe | par_secours).distinct())


# ── Valideur de secours ────────────────────────────────────────────────────────────────────────────────────

def accorder_secours(*, user, role, fin, motif: str, par, debut=None) -> ValideurSecours:
    """Le porteur (Direction, titulaire) accorde un accès de secours, limité dans le temps et motivé."""
    if role not in ORDRE:
        raise Dp42Error("Rôle inconnu.")
    if not (par.groups.filter(name=GROUPES[DIRECTION]).exists() or par.is_superuser):
        raise Dp42Error("DP-42 : seul le porteur (Direction) accorde un accès de secours.")
    if user.pk == par.pk:
        raise Dp42Error("DP-42 : on ne s'accorde pas un accès de secours à soi-même.")
    if not (motif or "").strip():
        raise Dp42Error("Le motif de l'accès de secours est obligatoire (traçabilité).")
    debut = debut or timezone.now()
    jours = regles.reglage("r_secours_jours_max")
    if fin <= debut or fin > debut + timedelta(days=jours):
        raise Dp42Error(f"DP-42 : un accès de secours dure au plus {jours} jour(s).")
    return ValideurSecours.objects.create(user=user, role=role, debut=debut, fin=fin, motif=motif.strip(),
                                          accorde_par=par)


def revoquer_secours(secours: ValideurSecours, *, par) -> ValideurSecours:
    if secours.revoque_le is None:
        secours.revoque_le, secours.revoque_par = timezone.now(), par
        secours.save(update_fields=["revoque_le", "revoque_par"])
    return secours


# ── Liste du vendredi ──────────────────────────────────────────────────────────────────────────────────────

def cle_du_vendredi(quand=None) -> str:
    return f"vendredi-{timezone.localtime(quand or timezone.now()).date().isoformat()}"


def derniere_liste() -> str:
    return (PayoutRequest.objects.exclude(liste="").order_by("-requested_at").values_list("liste", flat=True)
            .first() or "")


def liste_du_vendredi(cle: str = "") -> dict:
    """Total et détail de la liste, et où en sont les deux validations."""
    cle = cle or derniere_liste()
    demandes = list(PayoutRequest.objects.filter(liste=cle).select_related("payee")
                    .prefetch_related("approvals__approved_by").order_by("payee__payee_code"))
    en_attente = [d for d in demandes if d.status == PayoutRequest.Status.PENDING_APPROVAL]
    etapes = {etape(d) for d in en_attente}
    return {
        "liste": cle,
        "total_xaf": sum(d.amount_xaf for d in demandes),
        "total_en_attente_xaf": sum(d.amount_xaf for d in en_attente),
        "nombre": len(demandes),
        "en_attente": len(en_attente),
        "etape": (etapes.pop() if len(etapes) == 1 else ("mixte" if etapes else None)),
        "detail": [{
            "reference": d.reference, "beneficiaire": d.payee.display_label, "code": d.payee.payee_code,
            "type": d.payee.payee_type, "montant_xaf": d.amount_xaf, "frais_xaf": d.psp_fee_xaf, "statut": d.status,
            "validations": [{"role": a.role, "par": a.approved_by.get_username(), "le": a.approved_at,
                             "secours": bool(a.secours_id)} for a in d.approvals.all()],
        } for d in demandes],
    }


def valider_liste(cle: str, *, par, comment: str = "", attendu_total_xaf: int | None = None) -> dict:
    """Valide en bloc toutes les demandes encore en attente de la liste, au titre de l'étape en cours.
    Tout ou rien : une seule demande refusée annule la validation de la liste entière.
    `attendu_total_xaf` : le total que le valideur a vu ; si la liste a changé depuis, rien n'est validé."""
    from .services import SettlementError, approve_payout

    with db_transaction.atomic():
        demandes = list(PayoutRequest.objects.select_for_update().filter(
            liste=cle, status=PayoutRequest.Status.PENDING_APPROVAL).order_by("requested_at"))
        if not demandes:
            raise Dp42Error("Aucune demande en attente dans cette liste.")
        total = sum(d.amount_xaf for d in demandes)
        if attendu_total_xaf is not None and int(attendu_total_xaf) != total:
            raise Dp42Error(f"La liste a changé depuis votre lecture (total {total} F) : relisez-la avant de valider.")
        for d in demandes:
            try:
                approve_payout(d, approved_by=par, comment=comment or f"Validation de la liste {cle} (DP-42).")
            except SettlementError as exc:
                raise Dp42Error(f"{d.reference} : {exc}") from exc
    return liste_du_vendredi(cle)


# ── Rappels du vendredi ────────────────────────────────────────────────────────────────────────────────────

def rappels_du_vendredi(now=None) -> dict:
    """Le vendredi, avant r_versement_heure : 1er rappel dès r_rappel_valideurs_h1, 2e dès r_rappel_valideurs_h2,
    aux personnes qui doivent valider l'étape en cours. Chaque rappel ne part qu'une fois par liste."""
    from apps.payments.bridge import notifications

    from .services import VENDREDI

    local = timezone.localtime(now or timezone.now())
    if local.weekday() != VENDREDI or local.hour >= regles.reglage("r_versement_heure"):
        return {"skipped": True}
    cle = cle_du_vendredi(local)
    etat = liste_du_vendredi(cle)
    if not etat["en_attente"]:
        return {"skipped": False, "liste": cle, "rappels": 0}
    envoyes = 0
    for numero, heure in ((1, regles.reglage("r_rappel_valideurs_h1")), (2, regles.reglage("r_rappel_valideurs_h2"))):
        if local.hour < heure or RappelValidation.objects.filter(liste=cle, numero=numero).exists():
            continue
        role = etat["etape"] if etat["etape"] in ORDRE else COMPTABLE
        destinataires = valideurs(role)
        titre = (f"{'Rappel' if numero == 1 else 'Second rappel'} : versements du vendredi à valider "
                 f"avant {regles.reglage('r_versement_heure')} h")
        message = (f"{etat['en_attente']} versement(s), {etat['total_en_attente_xaf']} F au total, attendent la "
                   f"validation de {LIBELLES[role]} (DP-42, R22.2). Liste {cle}.")
        for user in destinataires:
            notifications.prevenir(user, titre, message)
        RappelValidation.objects.create(liste=cle, numero=numero, etape=role, destinataires=len(destinataires))
        if not destinataires:
            logger.error("DP-42 : personne ne peut tenir le rôle %s pour la liste %s.", role, cle)
        envoyes += 1
    return {"skipped": False, "liste": cle, "rappels": envoyes}


def total_valide_le(cle: str) -> int:
    return int(PayoutRequest.objects.filter(liste=cle, status=PayoutRequest.Status.APPROVED)
               .aggregate(t=Sum("amount_xaf"))["t"] or 0)


def approbations_par_role(payout: PayoutRequest) -> list[PayoutApproval]:
    return list(payout.approvals.order_by("approved_at"))
