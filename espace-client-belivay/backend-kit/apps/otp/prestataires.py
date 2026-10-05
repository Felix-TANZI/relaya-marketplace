# backend/apps/otp/prestataires.py
# Envoi des SMS (et WhatsApp) : codes à 6 chiffres, rappels de garde, alertes.
#
# settings.BELIVAY_SMS = chemin pointé de la classe :
#   "apps.otp.prestataires.SmsConsole"  — développement et essais : le message va dans le journal et dans
#                                         ENVOYES (tests), rien ne part ;
#   à écrire : un prestataire réel (SMS-SECOURS « à désigner » au registre ; Orange SMS API, Africa's Talking,
#   Twilio…), même interface. Voir REPRISE-BACKEND.md, « Prestataires ».
#
# Règle CAP-19 : jamais un code dans une notification push ni sur l'écran verrouillé ; le SMS du code ne contient
# que le code et sa validité.

import logging
import re
from dataclasses import dataclass

from django.conf import settings
from django.utils.module_loading import import_string

logger = logging.getLogger("apps.otp")


@dataclass(frozen=True)
class Envoi:
    ok: bool
    reference: str = ""
    erreur: str = ""


class Sms:
    """Interface d'un prestataire SMS / WhatsApp."""

    def envoyer(self, numero: str, texte: str, canal: str = "sms") -> Envoi:  # pragma: no cover - interface
        raise NotImplementedError


class SmsConsole(Sms):
    ENVOYES: list[dict] = []

    def envoyer(self, numero: str, texte: str, canal: str = "sms") -> Envoi:
        SmsConsole.ENVOYES.append({"numero": numero, "texte": texte, "canal": canal})
        # Jamais un code dans un journal (CAP-19) : les suites de 6 chiffres sont masquées.
        logger.info("SMS (console) %s → ••%s : %s", canal, numero[-2:], re.sub(r"\d{6}", "••••••", texte))
        return Envoi(True, f"console-{len(SmsConsole.ENVOYES)}")


def sms() -> Sms:
    return import_string(getattr(settings, "BELIVAY_SMS", "apps.otp.prestataires.SmsConsole"))()
