# backend/apps/otp/prestataires.py
# Envoi des SMS (et WhatsApp) : codes à 6 chiffres, rappels de garde, alertes.
#
# Feuille de route D7 :
#   settings.BELIVAY_SMS = "apps.otp.prestataires.Aiguillage" (défaut) : un code demandé par WhatsApp part par
#     l'assistant WhatsApp (modèle « Authentification ») quand il est ouvert, sinon par SMS ;
#   settings.BELIVAY_SMS_FOURNISSEUR = le prestataire SMS réel, même interface, à brancher à la signature du contrat
#     (R78.2 : un agrégateur qui couvre les numéros +237) ; en attendant "apps.otp.prestataires.SmsConsole" :
#     le message va dans le journal et dans ENVOYES (tests), rien ne part.
# Les deux se règlent par variables d'environnement du même nom.
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


def international(numero: str) -> str:
    """Numéro au format international (+237…) pour le prestataire : 9 chiffres = numéro camerounais ; sinon le
    numéro porte déjà son indicatif (numéros étrangers, D7)."""
    chiffres = re.sub(r"\D", "", numero or "")
    if chiffres.startswith("00"):
        chiffres = chiffres[2:]
    if len(chiffres) == 9:
        chiffres = "237" + chiffres
    return f"+{chiffres}" if chiffres else ""


class Aiguillage(Sms):
    """D7 : WhatsApp quand le client le choisit pour un code et que l'assistant est ouvert ; sinon le SMS."""

    def envoyer(self, numero: str, texte: str, canal: str = "sms") -> Envoi:
        if canal == "whatsapp":
            code = re.search(r"\b(\d{4,8})\b", texte)
            envoi = _whatsapp_code(numero, code.group(1)) if code else None
            if envoi is not None and envoi.ok:
                return envoi
        fournisseur = import_string(getattr(settings, "BELIVAY_SMS_FOURNISSEUR", "apps.otp.prestataires.SmsConsole"))
        return fournisseur().envoyer(numero, texte, canal)


def _whatsapp_code(numero: str, code: str) -> Envoi | None:
    from apps.whatsapp_assistant.conf import get_config
    from apps.whatsapp_assistant.providers import get_provider

    config = get_config()
    if not config.enabled:
        return None
    try:
        reference = get_provider(config).send_code(international(numero).lstrip("+"), code)
    except Exception:  # un fournisseur en panne retombe sur le SMS
        logger.exception("Code par WhatsApp impossible, repli sur le SMS")
        return None
    return Envoi(bool(reference), reference or "")


def sms() -> Sms:
    return import_string(getattr(settings, "BELIVAY_SMS", "apps.otp.prestataires.Aiguillage"))()
