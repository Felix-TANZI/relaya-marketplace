# backend/apps/payments/webhooks/receiver.py
# Reception et traitement des webhooks — sept couches de defense.
#
#   1. Allowlist IP            (nginx, en amont — puis controle applicatif)
#   2. Limitation de debit     (throttling DRF)
#   3. Journalisation du BRUT  avant tout parsing
#   4. Anti-rejeu              (empreinte + fenetre temporelle)
#   5. Verification signature  (premier niveau — voir signature.py)
#   6. RE-INTERROGATION        <- C'EST ELLE QUI FAIT FOI
#   7. Application de l'etat   sous transaction + verrou pessimiste
#
# La couche 6 est la seule authentification reelle : la signature CamPay ne
# lie pas le contenu a la transaction, elle est donc rejouable sur un corps
# forge. Meme si elle etait absente ou compromise, le systeme reste sur.
#
# L'endpoint repond 200 des la couche 3 : CamPay ne doit pas retenter
# inutilement pendant qu'on travaille.

from __future__ import annotations

import json
import logging
from datetime import timedelta

from django.db import transaction as db_transaction
from django.utils import timezone

from apps.payments.infrastructure.providers.base import ProviderError, ProviderStatus
from apps.payments.infrastructure.providers.campay import mapper
from apps.payments.infrastructure.providers.registry import get_provider_for
from apps.payments.intents.models import PaymentAttempt

from .models import WebhookEvent, WebhookReplayGuard
from .signature import verify as verify_signature

logger = logging.getLogger("apps.payments.webhooks")

#: Fenetre de l'anti-rejeu.
REPLAY_WINDOW = timedelta(hours=24)


class WebhookRejected(Exception):
    """Le message est refuse avant tout traitement."""


# ─────────────────────────────────────────────────────────────────────────────
# COUCHE 1 — ALLOWLIST IP
# ─────────────────────────────────────────────────────────────────────────────

def client_ip(request) -> str:
    """
    IP reelle du client, derriere nginx.

    On lit X-Forwarded-For en prenant la PREMIERE adresse, car nginx ajoute
    la sienne en fin de chaine.
    """
    transmis = request.META.get("HTTP_X_FORWARDED_FOR", "")
    if transmis:
        return transmis.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR", "") or ""


def ip_allowed(ip: str, provider_code: str) -> tuple[bool, str]:
    """
    L'IP est-elle autorisee ?

    Une liste VIDE autorise tout — c'est volontaire : bloquer par defaut
    empecherait toute reception tant que CamPay n'a pas communique ses
    plages. Le controle devient effectif des que la liste est renseignee
    en administration.
    """
    try:
        from apps.payments.config.models import ProviderConfig
        config = (
            ProviderConfig.current()
            .filter(provider_code=provider_code)
            .order_by("-priority")
            .first()
        )
    except Exception:
        return True, "Configuration prestataire indisponible."

    if config is None:
        return True, "Aucune configuration prestataire."

    autorisees = config.webhook_ip_allowlist or []
    if not autorisees:
        if config.mode == "LIVE":
            logger.warning(
                "Webhook %s recu en mode LIVE sans allowlist IP configuree.",
                provider_code,
            )
        return True, "Aucune allowlist configuree."

    import ipaddress
    try:
        adresse = ipaddress.ip_address(ip)
    except ValueError:
        return False, f"IP illisible : {ip!r}"

    for entree in autorisees:
        try:
            if "/" in str(entree):
                if adresse in ipaddress.ip_network(entree, strict=False):
                    return True, ""
            elif adresse == ipaddress.ip_address(entree):
                return True, ""
        except ValueError:
            continue

    return False, f"IP {ip} hors de la liste autorisee."


# ─────────────────────────────────────────────────────────────────────────────
# COUCHE 3 — JOURNALISATION DU BRUT
# ─────────────────────────────────────────────────────────────────────────────

SENSITIVE_HEADERS = frozenset({
    "HTTP_AUTHORIZATION", "HTTP_COOKIE", "HTTP_X_API_KEY",
})


def _collect_headers(request) -> dict:
    entetes = {}
    for cle, valeur in request.META.items():
        if not cle.startswith("HTTP_"):
            continue
        if cle in SENSITIVE_HEADERS:
            entetes[cle] = "***"
            continue
        entetes[cle] = str(valeur)[:400]
    return entetes


@db_transaction.atomic
def record_event(request, provider_code: str) -> WebhookEvent:
    """
    Journalise le message BRUT, avant tout parsing.

    Si une attaque exploite l'analyseur, la trace existe quand meme.
    """
    corps = ""
    try:
        corps = request.body.decode("utf-8", errors="replace")[:20000]
    except Exception:
        corps = "<corps illisible>"

    return WebhookEvent.objects.create(
        provider_code=provider_code,
        http_method=request.method,
        raw_body=corps,
        raw_query=request.META.get("QUERY_STRING", "")[:4000],
        raw_headers=_collect_headers(request),
        source_ip=client_ip(request) or None,
    )


# ─────────────────────────────────────────────────────────────────────────────
# COUCHE 4 — ANTI-REJEU
# ─────────────────────────────────────────────────────────────────────────────

def check_replay(event: WebhookEvent) -> tuple[bool, str]:
    """
    Cette empreinte a-t-elle deja ete vue ?

    Retourne (est_un_rejeu, motif). Un rejeu n'est pas une erreur : CamPay
    peut legitimement renvoyer le meme evenement. Il est simplement ignore.
    """
    limite = timezone.now() - REPLAY_WINDOW
    garde = WebhookReplayGuard.objects.filter(body_sha256=event.body_sha256).first()

    if garde is None:
        WebhookReplayGuard.objects.create(
            body_sha256=event.body_sha256, provider_code=event.provider_code,
        )
        return False, ""

    WebhookReplayGuard.objects.filter(pk=garde.pk).update(hit_count=garde.hit_count + 1)

    if garde.first_seen_at < limite:
        return False, "Empreinte connue mais hors fenetre de rejeu."

    return True, (
        f"Message deja recu le {garde.first_seen_at:%Y-%m-%d %H:%M:%S} "
        f"({garde.hit_count + 1} occurrences)."
    )


# ─────────────────────────────────────────────────────────────────────────────
# EXTRACTION — analyseur defensif
# ─────────────────────────────────────────────────────────────────────────────

def extract_fields(request, event: WebhookEvent) -> dict:
    """
    Extrait les champs, quel que soit le mode de livraison.

    CamPay documente le callback en GET (parametres de requete), mais un
    POST JSON reste possible. On accepte les deux plutot que de rater
    silencieusement des evenements — l'echec le plus vicieux qui soit.
    """
    donnees = {}

    if request.GET:
        donnees.update({cle: valeur for cle, valeur in request.GET.items()})

    if request.method == "POST":
        contenu = (request.content_type or "").lower()
        if "json" in contenu and event.raw_body:
            try:
                charge = json.loads(event.raw_body)
                if isinstance(charge, dict):
                    donnees.update(charge)
            except (ValueError, TypeError):
                pass
        elif request.POST:
            donnees.update({cle: valeur for cle, valeur in request.POST.items()})

    return donnees


# ─────────────────────────────────────────────────────────────────────────────
# TRAITEMENT COMPLET
# ─────────────────────────────────────────────────────────────────────────────

def handle(request, provider_code: str = "CAMPAY") -> WebhookEvent:
    """
    Traite un webhook de bout en bout.

    Ne leve JAMAIS vers l'appelant : tout aboutit a un evenement journalise
    avec un statut. L'endpoint repond 200 dans tous les cas ou le message a
    ete enregistre, pour que CamPay cesse de retenter.
    """
    event = record_event(request, provider_code)

    # Couche 1
    autorisee, motif = ip_allowed(event.source_ip or "", provider_code)
    if not autorisee:
        logger.warning("Webhook rejete — %s", motif)
        return event.mark(WebhookEvent.Status.REJECTED, error=motif)

    donnees = extract_fields(request, event)
    if not donnees:
        return event.mark(
            WebhookEvent.Status.REJECTED,
            error="Message vide : ni parametres de requete, ni corps exploitable.",
        )

    transaction = mapper.parse_transaction(donnees)
    WebhookEvent.objects.filter(pk=event.pk).update(
        provider_reference=transaction["provider_reference"],
        external_reference=transaction["external_reference"],
        reported_status=transaction["raw_status"],
        endpoint=transaction["endpoint"],
    )
    event.refresh_from_db()

    # Couche 5 — premier niveau seulement
    controle = verify_signature(transaction["signature"])
    etat_signature = {
        True: WebhookEvent.SignatureState.VALID,
        False: WebhookEvent.SignatureState.INVALID,
        None: WebhookEvent.SignatureState.UNVERIFIABLE,
    }[controle.valid]
    WebhookEvent.objects.filter(pk=event.pk).update(
        signature_state=etat_signature, signature_reason=controle.reason,
    )
    event.refresh_from_db()

    if controle.is_rejected:
        logger.warning("Webhook a signature invalide : %s", controle.reason)
        return event.mark(WebhookEvent.Status.REJECTED, error=controle.reason)

    # Couche 4
    rejeu, motif_rejeu = check_replay(event)
    if rejeu:
        return event.mark(WebhookEvent.Status.IGNORED, note=motif_rejeu)

    if not transaction["provider_reference"]:
        return event.mark(
            WebhookEvent.Status.REJECTED,
            error="Aucune reference de transaction : rien a verifier.",
        )

    # Couches 6 et 7
    return process(event)


def process(event: WebhookEvent) -> WebhookEvent:
    """
    Re-interroge le prestataire et applique l'etat.

    LE CONTENU DU WEBHOOK N'EST PAS UTILISE POUR DECIDER. Seule la reponse
    de get_transaction() fait foi (principe P6). C'est ce qui rend le
    systeme sur malgre une signature non liante.
    """
    from apps.payments.application.collect import _mark_failed, confirm_payment

    try:
        prestataire = get_provider_for(event.provider_code)
        etat = prestataire.get_transaction(event.provider_reference)
    except ProviderError as exc:
        logger.warning("Re-interrogation impossible pour %s : %s",
                       event.provider_reference, exc)
        return event.mark(
            WebhookEvent.Status.ERROR,
            error=f"Re-interrogation echouee : {exc}. Le polling reprendra.",
        )

    WebhookEvent.objects.filter(pk=event.pk).update(
        verified_status=str(etat.status),
        verified_payload=etat.raw_response or {},
        status=WebhookEvent.Status.VERIFIED,
    )
    event.refresh_from_db()

    tentative = PaymentAttempt.objects.filter(
        provider_reference=event.provider_reference,
    ).select_related("intent").first()

    if tentative is None and event.external_reference:
        tentative = PaymentAttempt.objects.filter(
            external_reference=event.external_reference,
        ).select_related("intent").first()

    if tentative is None:
        return event.mark(
            WebhookEvent.Status.IGNORED,
            note=(
                f"Aucune tentative BelivaY pour {event.provider_reference}. "
                "Evenement hors perimetre (versement ou transaction tierce)."
            ),
        )

    if etat.status == ProviderStatus.SUCCESSFUL:
        try:
            issue = confirm_payment(tentative, provider_status=etat)
        except Exception as exc:
            logger.exception("Confirmation echouee pour %s", tentative.external_reference)
            return event.mark(WebhookEvent.Status.ERROR, error=str(exc))
        return event.mark(
            WebhookEvent.Status.PROCESSED,
            note=f"{tentative.external_reference} : {issue.status} — {issue.message}",
        )

    if etat.status == ProviderStatus.FAILED:
        _mark_failed(tentative, etat.error_message or "Paiement refuse.",
                     etat.error_code)
        return event.mark(
            WebhookEvent.Status.PROCESSED,
            note=f"{tentative.external_reference} : echec confirme par le prestataire.",
        )

    return event.mark(
        WebhookEvent.Status.PROCESSED,
        note=(
            f"Statut verifie : {etat.status}. Aucune transition. "
            "Le polling continuera de surveiller."
        ),
    )


def reprocess(event: WebhookEvent) -> WebhookEvent:
    """Rejoue le traitement d'un evenement. Sur, grace a l'idempotence."""
    if not event.provider_reference:
        return event.mark(WebhookEvent.Status.REJECTED,
                          error="Aucune reference : rien a rejouer.")
    return process(event)


def purge_replay_guards(older_than_days: int = 30) -> int:
    """
    Purge les empreintes anti-rejeu.

    RETENTION TECHNIQUE uniquement. Le journal WebhookEvent, lui, releve de
    la conservation legale et n'est JAMAIS purge par cette fonction.
    """
    limite = timezone.now() - timedelta(days=older_than_days)
    supprimees, _ = WebhookReplayGuard.objects.filter(first_seen_at__lt=limite).delete()
    return supprimees