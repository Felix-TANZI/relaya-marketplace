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


def push() -> Push:
    return import_string(getattr(settings, "BELIVAY_PUSH", "apps.notifications_client.prestataires.PushConsole"))()
