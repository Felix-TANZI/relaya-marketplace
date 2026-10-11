# Outils des tests de la session vendeur : le dernier code envoyé à un numéro (SMS console).
import re

from apps.otp.prestataires import SmsConsole


def code(numero="677124217") -> str:
    for e in reversed(SmsConsole.ENVOYES):
        if e["numero"].endswith(numero[-9:]):
            m = re.search(r"(?<!\d)(\d{6})(?!\d)", e["texte"])
            if m:
                return m.group(1)
    raise AssertionError("aucun code")
