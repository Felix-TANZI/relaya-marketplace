# backend/apps/notifications_client/services.py
# Réglages, abonnements push et envoi des notifications du client (CL-10 ; CAP-17, CAP-19).
#
#   reglages(user)                 → ReglagesNotifications (créés au besoin)
#   donnees_reglages(user)         → ReglagesNotifications du site
#   enregistrer_appareil(user, type, abonnement) / revoquer_appareils(user) (déconnexion, CAP-17)
#   envoyer_notification(user, type, titre, texte, lien="", critique=False) → dict (ce qui a été fait)
#
# envoyer_notification, la seule porte d'envoi des autres applications :
#   1. CAP-19 : jamais un motif à 6 chiffres (code de retrait, OTP) dans le titre ou le texte → TexteInterdit levée ;
#   2. centre de notifications : toujours (relaya accounts.UserNotification, par settings.BELIVAY_MODELES
#      « notification ») ;
#   3. push : Commande, Retrait, Incident, Paiement toujours ; messages, suivi, promotions selon les choix du client ;
#      flash selon l'alerte flash ; promotions limitées par PUSH-PROMO ; heures calmes : pas de push, sauf critique ;
#   4. repli SMS (ou WhatsApp, avec FF-WHATSAPP-CANAL et le consentement) : seulement pour une alerte critique
#      quand aucun appareil n'a reçu le push.

import hashlib
import logging
from datetime import timedelta

from django.apps import apps as registre_apps
from django.conf import settings
from django.db import transaction
from django.utils import timezone

from apps.client_core import parametres
from apps.client_core.interrupteurs import ouvert
from apps.client_core.masquage import masquer_numero
from apps.client_core.temps import YAOUNDE, depuis_ms

from . import regles
from .models import Appareil, ConsentementCanal, JournalNotification, ReglagesNotifications
from .prestataires import push, verifier_texte

logger = logging.getLogger("apps.notifications_client")

TYPES_RELAYA = {
    "commande": "ORDER",
    "retrait": "ORDER",
    "incident": "ORDER",
    "suivi": "ORDER",
    "paiement": "PAYMENT",
    "promotions": "PROMOTION",
    "flash": "PROMOTION",
    "messages": "SUPPORT",
}


def _comptes(fonction: str, *args, defaut=None):
    try:
        from apps.client_accounts import services
    except ImportError:
        return defaut
    return getattr(services, fonction)(*args)


def reglages(user) -> ReglagesNotifications:
    return ReglagesNotifications.objects.get_or_create(user=user)[0]


def choix(r: ReglagesNotifications) -> dict:
    return {"messages": r.messages, "suivi": r.suivi, "promotions": r.promotions}


def donnees_reglages(user) -> dict:
    r = reglages(user)
    numero = _comptes("numero_verifie", user)
    return {
        "numero": masquer_numero(numero) if numero else None,
        "verifie": bool(numero),
        "canal": r.canal,
        "choix": choix(r),
        "calme": {"actif": r.calme_actif, "debut": r.calme_debut, "fin": r.calme_fin},
    }


def consentement_whatsapp(user) -> bool:
    return ConsentementCanal.objects.filter(user=user, canal="whatsapp", retire_le__isnull=True).exists()


def consentir(user, canal: str, request=None) -> ConsentementCanal:
    return ConsentementCanal.objects.create(
        user=user,
        canal=canal,
        ip=(request.META.get("REMOTE_ADDR") or None) if request is not None else None,
        appareil=(request.headers.get("User-Agent", "") if request is not None else "")[:200],
    )


# ── Appareils (CAP-17) ──────────────────────────────────────────────────────────────────────────────────


def empreinte_endpoint(endpoint: str) -> str:
    return hashlib.sha256(endpoint.encode("utf-8")).hexdigest()


def enregistrer_appareil(user, type_: str, abonnement: dict) -> Appareil:
    """Un abonnement par adresse : réenregistré, il revient à ce compte (appareil partagé, reconnexion)."""
    endpoint = abonnement["endpoint"]
    cle = empreinte_endpoint(endpoint)
    expire = abonnement.get("expirationTime")
    with transaction.atomic():
        Appareil.objects.filter(endpoint_empreinte=cle, revoque_le__isnull=True).exclude(user=user).update(revoque_le=timezone.now())
        a = Appareil.objects.filter(user=user, endpoint_empreinte=cle, revoque_le__isnull=True).first() or Appareil(user=user)
        a.type, a.endpoint, a.endpoint_empreinte = type_, endpoint, cle
        a.cles = dict(abonnement.get("keys") or {})
        a.expire_le = depuis_ms(expire) if expire else None
        a.save()
    return a


def revoquer_appareil(user, ident: str) -> bool:
    """`ident` : l'identifiant de l'appareil, ou le sha256 de son adresse Web Push (le site ne garde pas l'identifiant)."""
    qs = Appareil.objects.filter(user=user, revoque_le__isnull=True)
    qs = qs.filter(pk=int(ident)) if str(ident).isdigit() else qs.filter(endpoint_empreinte=str(ident).lower())
    return qs.update(revoque_le=timezone.now()) > 0


def revoquer_appareils(user) -> int:
    """Déconnexion ou suppression du compte (CAP-17) : plus aucun push vers ce compte."""
    return Appareil.objects.filter(user=user, revoque_le__isnull=True).update(revoque_le=timezone.now())


def oublier(user) -> None:
    """Suppression du compte : abonnements révoqués, consentements gardés (preuve), réglages remis par défaut."""
    revoquer_appareils(user)
    ReglagesNotifications.objects.filter(user=user).delete()


def appareils_actifs(user):
    maintenant = timezone.now()
    return [a for a in Appareil.objects.filter(user=user, revoque_le__isnull=True) if a.expire_le is None or a.expire_le > maintenant]


# ── Envoi ───────────────────────────────────────────────────────────────────────────────────────────────


def _heure(moment=None) -> float:
    t = (moment or timezone.now()).astimezone(YAOUNDE)
    return t.hour + t.minute / 60


def _centre(user, type_: str, titre: str, texte: str, lien: str) -> bool:
    try:
        Notification = registre_apps.get_model(getattr(settings, "BELIVAY_MODELES", {}).get("notification", "accounts.UserNotification"))
    except (LookupError, ValueError):
        return False
    Notification.objects.create(
        user=user, title=titre[:160], message=texte, notification_type=TYPES_RELAYA.get(type_, "SYSTEM"), action_url=lien[:255]
    )
    return True


def _raison_sans_push(user, r: ReglagesNotifications, type_: str, critique: bool) -> str:
    if type_ in regles.AU_CHOIX and not getattr(r, type_):
        return "choix"
    if type_ == "flash" and not r.flash:
        return "choix"
    if not critique and regles.dans_heures_calmes(_heure(), r.calme_actif, r.calme_debut, r.calme_fin):
        return "calme"
    if type_ in ("promotions", "flash"):
        semaine = timezone.now() - timedelta(days=7)
        envoyees = JournalNotification.objects.filter(user=user, type__in=("promotions", "flash"), pousses__gt=0, le__gte=semaine).count()
        if not regles.promo_permise(_heure(), envoyees, parametres.nombres("PUSH-PROMO")):
            return "limite"
    return ""


def envoyer_notification(user, type: str, titre: str, texte: str, lien: str = "", critique: bool = False) -> dict:  # noqa: A002 - nom du contrat
    verifier_texte(titre, texte)  # CAP-19 : lève TexteInterdit
    r = reglages(user)
    centre = _centre(user, type, titre, texte, lien)
    raison = _raison_sans_push(user, r, type, critique)
    pousses = 0
    if not raison:
        p = push()
        for a in appareils_actifs(user):
            try:
                envoi = p.envoyer(a, titre, texte, lien)
            except Exception:  # un prestataire en panne ne bloque pas l'action métier
                logger.exception("Push vers l'appareil %s échoué", a.pk)
                continue
            if envoi.expire:
                a.revoque_le = timezone.now()
                a.save(update_fields=["revoque_le"])
            elif envoi.ok:
                pousses += 1
        if not pousses:
            raison = "aucun_appareil"
    sms = ""
    if critique and not pousses:
        numero = _comptes("numero_verifie", user)
        if numero:
            from apps.otp.prestataires import sms as prestataire_sms

            canal = "whatsapp" if r.canal == "whatsapp" and ouvert("FF-WHATSAPP-CANAL") and consentement_whatsapp(user) else "sms"
            if prestataire_sms().envoyer(numero, f"BelivaY : {titre}. {texte}", canal).ok:
                sms = canal
    JournalNotification.objects.create(
        user=user, type=type, titre=titre[:160], critique=critique, centre=centre, pousses=pousses, sms=sms, raison=raison
    )
    return {"centre": centre, "pousses": pousses, "sms": sms or None, "raison": raison or None}


def notifier(user, titre: str, texte: str, lien: str = "", type: str = "suivi") -> bool:  # noqa: A002 - nom du contrat
    """Raccourci pour les autres applications du kit (listes, échanges, diaspora, modules CL-15) : une notification
    « Suivi » non critique, selon les choix du client. Faux si le texte est refusé (CAP-19) ou rien n'est parti."""
    try:
        r = envoyer_notification(user, type, titre, texte, lien)
    except ValueError:
        return False
    return bool(r)
