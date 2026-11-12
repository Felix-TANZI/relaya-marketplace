"""
DEV-SRV-01 v1.8, C04 : paiement des vendeurs (remplace la libération J+3 / J+1 et le versement du vendredi pour eux).

- Le client confirme lui-même la réception (application, ou code du livreur) ; le gérant ou le livreur ne confirme
  jamais à sa place (apps.orders.ConfirmReceiptView, apps.shipping.RelayParcelPickupSerializer).
- Le montant est versé r_versement_vendeur_j jour(s) après la confirmation, quel que soit le palier : un versement
  automatique par jour et par vendeur, vers son numéro Mobile Money vérifié, r_versement à sa charge.
- Nouveau compte (ses r_nouveau_ventes premières ventes) : un article au-delà de r_nouveau_gel_article reste gelé
  r_nouveau_gel_j jours ; son premier versement est validé par un opérateur.
- Fraude confirmée par un opérateur (FraudeConfirmee, jamais un simple signalement) : r_fraude_delai_j jours et
  validation par un opérateur pendant r_fraude_periode_j jours sans incident (× r_fraude_recidive_x à la deuxième).
- Validation humaine seulement sur les cas signalés : premier versement, montant inhabituel, litige ouvert, forte baisse
  du Trust Score, changement de numéro (dont le blocage de r_blocage_numero_j jours, payees.services).
- Litige ou retour ouvert : la somme est gelée jusqu'à la décision (events_in, inchangé). Un défaut caché signalé après
  le versement est repris sur les versements suivants (reprendre_defaut_cache).
- Points relais et entreprises de livraison : versement du vendredi, inchangé (bridge.vendredi).
Tous les délais et seuils sont des réglages r_… (regles, migration 0009).
"""
from __future__ import annotations

import logging
from datetime import timedelta

from django.db.models import Avg, Max
from django.utils import timezone

from apps.regles import services as regles

logger = logging.getLogger("apps.payments")

LISTE_PREFIXE = "vendeur-jour-"


def cle_du_jour(quand=None) -> str:
    """La liste des versements vendeurs d'un jour : au plus un versement par vendeur et par jour."""
    return f"{LISTE_PREFIXE}{timezone.localtime(quand or timezone.now()):%Y-%m-%d}"


def est_versement_vendeur(liste: str) -> bool:
    return bool(liste) and liste.startswith(LISTE_PREFIXE)


# ── Qui est le vendeur ───────────────────────────────────────────────────────────────────────────────────────────

def vendeur_du_compte(payee):
    from .models import PayeeLink

    lien = PayeeLink.objects.filter(payee_account=payee, vendor__isnull=False).select_related("vendor__user").first()
    return lien.vendor.user if lien else None


# ── Situation du vendeur ─────────────────────────────────────────────────────────────────────────────────────────

def fraude_active(vendeur, quand=None) -> bool:
    """Une fraude confirmée il y a moins de r_fraude_periode_j jours (× r_fraude_recidive_x dès la deuxième)."""
    from .models import FraudeConfirmee

    fraudes = FraudeConfirmee.objects.filter(vendeur=vendeur)
    derniere = fraudes.order_by("-confirmee_le").first()
    if derniere is None:
        return False
    jours = regles.reglage("r_fraude_periode_j")
    if fraudes.count() >= 2:
        jours *= regles.reglage("r_fraude_recidive_x")
    return (quand or timezone.now()) < derniere.confirmee_le + timedelta(days=jours)


def ventes_conclues(payee) -> int:
    """Nombre de commandes dont la marchandise de ce vendeur a déjà été libérée."""
    from apps.payments.escrow.models import EscrowHold

    return (EscrowHold.objects.filter(payee=payee, component=EscrowHold.Component.GOODS,
                                      status=EscrowHold.Status.RELEASED)
            .values("order_id").distinct().count())


def nouveau_compte(payee) -> bool:
    return ventes_conclues(payee) < regles.reglage("r_nouveau_ventes")


def article_le_plus_cher(order_id: int, vendeur) -> int:
    from apps.orders.models import OrderItem

    return (OrderItem.objects.filter(order_id=order_id, product__vendor=vendeur)
            .aggregate(m=Max("price_xaf_snapshot"))["m"] or 0)


def delai_liberation(vendeur, payee, order_id: int, quand=None) -> tuple[int, str]:
    """(jours entre la confirmation du client et la libération, raison) pour la marchandise de ce vendeur."""
    if fraude_active(vendeur, quand):
        return regles.reglage("r_fraude_delai_j"), "C04 : fraude confirmée"
    if nouveau_compte(payee) and article_le_plus_cher(order_id, vendeur) > regles.reglage("r_nouveau_gel_article"):
        return regles.reglage("r_nouveau_gel_j"), "C04 : nouveau compte, article au-delà du seuil"
    return regles.reglage("r_versement_vendeur_j"), "C04 : versement après confirmation"


# ── Les cas qui demandent la validation d'un opérateur ───────────────────────────────────────────────────────────

def signalements(payee, vendeur, montant_xaf: int, quand=None) -> list[str]:
    """Les raisons pour lesquelles ce versement attend un opérateur ; [] = il part tout seul."""
    from apps.accounts.models import TrustScoreProfile
    from apps.orders.models import Dispute
    from apps.payments.settlements.models import PayoutRequest

    quand = quand or timezone.now()
    raisons = []
    payes = PayoutRequest.objects.filter(payee=payee, status=PayoutRequest.Status.PAID)
    if not payes.exists():
        raisons.append("premier versement")
    else:
        moyenne = payes.filter(executed_at__gte=quand - timedelta(days=30)).aggregate(m=Avg("amount_xaf"))["m"]
        if moyenne and montant_xaf > regles.reglage("r_montant_inhabituel_x") * moyenne:
            raisons.append("montant inhabituel")
    if fraude_active(vendeur, quand):
        raisons.append("fraude confirmée")
    if Dispute.objects.filter(vendor=vendeur, status__in=["OPEN", "IN_PROGRESS"]).exists():
        raisons.append("litige ouvert")
    from .models import RepereVersementVendeur

    repere = RepereVersementVendeur.objects.filter(vendeur=vendeur).first()
    score = (TrustScoreProfile.objects.filter(user=vendeur, role=TrustScoreProfile.Role.VENDOR)
             .values_list("score", flat=True).first())
    if repere is not None and score is not None and repere.score - score >= regles.reglage("r_baisse_trust_points"):
        raisons.append("forte baisse du Trust Score")
    change = getattr(payee, "momo_changed_at", None)
    if change and not payes.filter(executed_at__gt=change).exists() and payes.exists():
        raisons.append("changement de numéro")
    return raisons


def _noter_repere(vendeur) -> None:
    from apps.accounts.models import TrustScoreProfile

    from .models import RepereVersementVendeur

    score = (TrustScoreProfile.objects.filter(user=vendeur, role=TrustScoreProfile.Role.VENDOR)
             .values_list("score", flat=True).first())
    if score is not None:
        RepereVersementVendeur.objects.update_or_create(vendeur=vendeur, defaults={"score": score})


# ── Le versement automatique du jour ─────────────────────────────────────────────────────────────────────────────

def versements_vendeurs_du_jour(now=None) -> dict:
    """Pour chaque vendeur : ce qui a été libéré et n'est pas encore versé part, au plus une fois par jour. Sans cas
    signalé, le versement est approuvé par le système et part ; sinon il attend un opérateur (Finance ou Direction)."""
    from apps.payments.payees.models import PayeeAccount, PayeeType
    from apps.payments.settlements.models import PayoutRequest
    from apps.payments.settlements.services import _systeme, build_batch, confirm_batch, request_payout

    from .vendredi import refus_metier

    now = now or timezone.now()
    liste = cle_du_jour(now)
    systeme = _systeme()
    automatiques, a_valider, erreurs = 0, 0, []
    for payee in PayeeAccount.objects.filter(is_active=True, payee_type=PayeeType.VENDOR):
        if PayoutRequest.objects.filter(payee=payee, liste=liste).exists():
            continue  # un versement par jour et par vendeur
        vendeur = vendeur_du_compte(payee)
        if vendeur is None:
            continue
        motif = refus_metier(payee)  # D19 : dossier complet avant tout versement
        if motif:
            erreurs.append(f"{payee.payee_code} : {motif}")
            continue
        try:
            lot = build_batch(payee, period_end=now)
            if lot is None:
                continue
            confirm_batch(lot)
            raisons = signalements(payee, vendeur, lot.net_amount_xaf, now)
            demande = request_payout(
                lot, requested_by=systeme, liste=liste, automatique=True, signalements=raisons,
                justification=("Versement vendeur du jour (C04)."
                               + (f" À valider : {', '.join(raisons)}." if raisons else "")))
            _noter_repere(vendeur)
            if demande.status == PayoutRequest.Status.APPROVED:
                automatiques += 1
            else:
                a_valider += 1
        except Exception as exc:  # un vendeur bloqué (numéro en refroidissement, gel) n'arrête pas les autres
            erreurs.append(f"{payee.payee_code} : {exc}")
    return {"liste": liste, "automatiques": automatiques, "a_valider": a_valider, "errors": erreurs[:20]}


# ── Défaut caché signalé après le versement ──────────────────────────────────────────────────────────────────────

def reprendre_defaut_cache(*, vendeur, commande_id: int, montant_xaf: int, motif: str, par):
    """Un défaut caché signalé après le versement est repris sur les versements suivants : une créance sur le vendeur
    (ajustement « le partenaire doit à BelivaY »), validée par une seconde personne puis retenue sur ses lots."""
    from apps.payments.settlements.models import Adjustment
    from apps.payments.settlements.services import create_adjustment

    from .models import PayeeLink

    lien = PayeeLink.objects.select_related("payee_account").get(vendor__user=vendeur)
    return create_adjustment(
        payee=lien.payee_account, direction=Adjustment.Direction.CREDIT, category=Adjustment.Category.REBILLING,
        amount_xaf=montant_xaf, reason=f"Défaut caché après versement (C04), commande #{commande_id} : {motif}",
        created_by=par, source_order_id=commande_id, source_event="C04-defaut-cache",
    )
