# backend/apps/vendor_team/services.py
# Fonctions partagées par les vues : envoi/vérification de code, distance GPS, masquage du téléphone.
# Réutilise l'infrastructure SMS déjà écrite pour l'espace client (apps.otp.prestataires) plutôt que d'en
# récrire une : seul le modèle de code change (voir models.py pour la raison).

import logging
import math
import secrets
from datetime import timedelta

from django.core.mail import send_mail
from django.utils import timezone

from apps.otp.prestataires import sms

logger = logging.getLogger("apps.vendor_team")

# Au-delà de cette distance, un lieu déplacé repasse « à vérifier » (Q-91). Valeur donnée explicitement par
# INTEGRATION-API.md §8 (pas une estimation) : « au-delà de 200 m : a_verifier ».
SEUIL_DEPLACEMENT_METRES = 200

# Paramètre proposé par INTEGRATION-API.md §8 : « VD-LIEUX-MAX = 5 (console) ».
VD_LIEUX_MAX = 5


def masquer_numero(numero: str) -> str:
    numero = (numero or "").strip()
    if len(numero) < 4:
        return "••••"
    return f"{numero[:3]}••••{numero[-2:]}"


# Motifs des gestes sensibles du propriétaire (code au téléphone personnel avant d'agir).
MOTIF_RETRAIT = "retrait"
MOTIF_DROITS = "droits"
MOTIF_REACTIVATION = "reactivation"
MOTIF_INVITATION = "invitation"
MOTIF_LIEU_PRINCIPAL = "lieu_principal"
MOTIF_CHANGE_REQUEST = "change_request"


def envoyer_code_proprietaire(vendor, motif: str, cible=None) -> bool:
    """Feuille de route D6 : un seul système de codes. Le code part au téléphone du propriétaire par apps.otp et se
    range sous la boutique, le motif et le membre visé. Faux si rien n'est parti (pas de numéro, trop d'envois)."""
    from apps.client_core.erreurs import ErreurClient
    from apps.otp import services as otp
    from apps.otp.models import CodeOtp

    telephone = (vendor.phone or "").strip()
    if not telephone:
        return False
    try:
        otp.envoyer(objet=CodeOtp.Objet.VENDEUR_SECURITE, destination=telephone, utilisateur=vendor.user,
                    cle=_cle_proprietaire(vendor, motif, cible))
    except ErreurClient:
        return False
    return True


def code_proprietaire_valide(vendor, motif: str, cible, code: str) -> bool:
    from apps.otp import services as otp
    from apps.otp.models import CodeOtp

    resultat = otp.verifier(objet=CodeOtp.Objet.VENDEUR_SECURITE, code=code,
                            cle=_cle_proprietaire(vendor, motif, cible))
    return bool(resultat.get("ok"))


def _cle_proprietaire(vendor, motif: str, cible) -> str:
    return f"boutique:{vendor.pk}:{motif}:{getattr(cible, 'pk', '') or ''}"


def generer_code(longueur: int = 6) -> str:
    return f"{secrets.randbelow(10 ** longueur):0{longueur}d}"


def envoyer_code_sms(numero: str, code: str, minutes: int, canal: str = "sms") -> None:
    texte = f"BelivaY : ton code est {code}. Il est valable {minutes} minutes. Ne le donne à personne."
    sms().envoyer(numero, texte, canal)


def envoyer_code_email(email: str, code: str, minutes: int) -> None:
    send_mail(
        "Ton code BelivaY",
        f"Ton code est {code}. Il est valable {minutes} minutes. Ne le donne à personne.",
        None,
        [email],
    )


def distance_metres(lat1, lon1, lat2, lon2) -> int:
    """Distance géodésique approchée (haversine), en mètres."""
    lat1, lon1, lat2, lon2 = (float(v) for v in (lat1, lon1, lat2, lon2))
    r = 6371000.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return round(r * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a)))


def fenetre_recente(queryset, minutes: int):
    return queryset.filter(created_at__gte=timezone.now() - timedelta(minutes=minutes))
