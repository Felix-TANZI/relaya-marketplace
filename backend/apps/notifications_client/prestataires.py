# backend/apps/notifications_client/prestataires.py
# Envoi des notifications push aux appareils enregistrés (POST /api/devices).
#
# settings.BELIVAY_PUSH :
#   "apps.notifications_client.prestataires.PushConsole" : développement et essais (journal + ENVOYES) ;
#   à écrire : Web Push (VAPID, bibliothèque pywebpush ; clés VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY, la publique
#   étant aussi donnée au site) et FCM pour l'application mobile (FCM_CREDENTIALS). Voir REPRISE-BACKEND.md.
#
# CAP-19 : jamais de code de retrait, d'OTP ni de montant sensible dans un push ; le texte est vérifié avant
# l'envoi (motif à 6 chiffres refusé).

import logging
import re
from dataclasses import dataclass

from django.conf import settings
from django.utils.module_loading import import_string

logger = logging.getLogger("apps.notifications_client")

SIX_CHIFFRES = re.compile(r"(?<!\d)\d{6}(?!\d)")


class TexteInterdit(ValueError):
    """Un texte de push contient un motif à 6 chiffres (CAP-19)."""


@dataclass(frozen=True)
class EnvoiPush:
    ok: bool
    expire: bool = False  # l'abonnement n'est plus valable (410 du service push) : le supprimer


def verifier_texte(titre: str, texte: str) -> None:
    if SIX_CHIFFRES.search(f"{titre} {texte}"):
        raise TexteInterdit("motif à 6 chiffres dans une notification push (CAP-19)")


class Push:
    def envoyer(self, appareil, titre: str, texte: str, lien: str = "") -> EnvoiPush:  # pragma: no cover - interface
        raise NotImplementedError


class PushConsole(Push):
    ENVOYES: list[dict] = []

    def envoyer(self, appareil, titre, texte, lien=""):
        verifier_texte(titre, texte)
        PushConsole.ENVOYES.append({"appareil": appareil.pk, "titre": titre, "texte": texte, "lien": lien})
        logger.info("Push (console) → appareil %s : %s", appareil.pk, titre)
        return EnvoiPush(True)


_firebase_app = None


def _get_firebase_app():
    """Une seule initialisation par process (firebase_admin leve une erreur si on
    initialise deux fois une app du meme nom)."""
    global _firebase_app
    if _firebase_app is None:
        import firebase_admin
        from firebase_admin import credentials

        chemin = getattr(settings, "FCM_CREDENTIALS_PATH", "")
        if not chemin:
            raise RuntimeError(
                "FCM_CREDENTIALS_PATH non configuré : pas de projet Firebase branché (D21)."
            )
        _firebase_app = firebase_admin.initialize_app(credentials.Certificate(chemin))
    return _firebase_app


class FCMPush(Push):
    """
    Firebase Cloud Messaging — mobile (Android et iOS si l'app embarque le SDK
    Firebase, qui relaie vers APNs). `android.priority="high"` (D21) : sans ça,
    les telephones Tecno/Infinix/itel (gestion d'energie agressive) retardent
    ou perdent la notification en arriere-plan.

    Necessite settings.FCM_CREDENTIALS_PATH (fichier JSON du compte de
    service, cree depuis la console Firebase > Parametres du projet > Comptes
    de service > Generer une nouvelle cle privee). Rien a changer dans ce
    fichier une fois la cle fournie — seul le reglage BELIVAY_PUSH l'active.
    """

    def envoyer(self, appareil, titre, texte, lien=""):
        verifier_texte(titre, texte)
        from firebase_admin import messaging

        message = messaging.Message(
            token=appareil.endpoint,
            notification=messaging.Notification(title=titre, body=texte),
            data={"lien": lien} if lien else None,
            android=messaging.AndroidConfig(
                priority="high",
                notification=messaging.AndroidNotification(sound="default"),
            ),
            apns=messaging.APNSConfig(
                headers={"apns-priority": "10"},
                payload=messaging.APNSPayload(aps=messaging.Aps(sound="default")),
            ),
        )
        try:
            messaging.send(message, app=_get_firebase_app())
            return EnvoiPush(True)
        except messaging.UnregisteredError:
            # Le jeton n'est plus valide (app desinstallee, etc.) : l'appelant le revoque.
            return EnvoiPush(False, expire=True)
        except Exception:
            logger.exception("Push FCM vers l'appareil %s échoué", appareil.pk)
            return EnvoiPush(False)


def push() -> Push:
    return import_string(getattr(settings, "BELIVAY_PUSH", "apps.notifications_client.prestataires.PushConsole"))()
