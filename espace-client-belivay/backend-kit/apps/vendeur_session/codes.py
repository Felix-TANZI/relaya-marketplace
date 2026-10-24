# backend/apps/vendeur_session/codes.py
# Codes à 6 chiffres du vendeur (CNX-04, CNX-06 ; OTP-LONG, OTP-DUREE, OTP-ESSAIS, OTP-RENVOI ; DP-52) : envoi et
# vérification par apps.otp (le code n'est jamais gardé en clair), défi gardé ici (DefiVendeur) et lié à l'appareil
# ou au compte. Formes de sortie du site : EnvoiCode, ResultatCode, ResultatRenvoi (src/donnees/domaines/session.ts).
#
# Heure des codes : celle d'apps.otp (timezone.now), pour que « renvoi dans 60 s », la validité et les limites d'envoi
# restent cohérentes avec les codes eux-mêmes (le décalage de l'horloge d'essai ne s'applique pas aux codes).
import math
import re
import secrets
from datetime import timedelta

from django.utils import timezone
from rest_framework import status

from apps.client_core import parametres
from apps.client_core.chiffrement import chiffrer, dechiffrer
from apps.client_core.erreurs import ErreurClient
from apps.client_core.masquage import numero_local
from apps.client_core.temps import ms
from apps.otp import services as otp
from apps.otp.models import CodeOtp

from .models import DefiVendeur

# Objet du code chez apps.otp (un code valable à la fois par objet et par numéro).
OBJETS_OTP = {
    DefiVendeur.Objet.DEUX_FACTEURS: "vendeur-2fa",
    DefiVendeur.Objet.NUMERO: "vendeur-numero",
    DefiVendeur.Objet.MOT_DE_PASSE: "vendeur-mdp",
    DefiVendeur.Objet.OUVERTURE: "vendeur-ouverture",
    DefiVendeur.Objet.VERSEMENT: "vendeur-versement",
}


def numero_valide(telephone: str) -> str | None:
    """9 chiffres camerounais commençant par 6 (« +237 6 77 12 42 17 » → « 677124217 ») ; None sinon."""
    n = numero_local(telephone or "")
    return n if re.fullmatch(r"6\d{8}", n) else None


def masquer(n: str) -> str:
    """« 677 •• •• 90 » (forme du site vendeur)."""
    return f"{n[:3]} •• •• {n[-2:]}" if len(n) == 9 else n


def _regles() -> tuple[int, int, int]:
    """(validité en minutes, secondes entre deux envois, envois par heure)."""
    entre, par_heure = parametres.nombres("OTP-RENVOI")[:2]
    return parametres.entier("OTP-DUREE"), entre, par_heure


def _envois(objet: str, n: str):
    """Codes envoyés à ce numéro pour cet objet depuis une heure (le plus récent d'abord)."""
    depuis = timezone.now() - timedelta(hours=1)
    return list(
        CodeOtp.objects.filter(objet=OBJETS_OTP[objet], destination_empreinte=otp._empreinte(n), cree_le__gte=depuis).order_by("-cree_le")
    )


def numero_de(d: DefiVendeur) -> str:
    return dechiffrer(d.telephone_chiffre)


def envoi(d: DefiVendeur) -> dict:
    """EnvoiCode du site (jamais le code)."""
    duree, entre, par_heure = _regles()
    n = numero_de(d)
    envois = _envois(d.objet, n)
    dernier = envois[0].cree_le if envois else d.demande_a
    attente = (dernier + timedelta(seconds=entre) - timezone.now()).total_seconds()
    return {
        "id": d.public_id,
        "canal": d.canal,
        "destination": masquer(n),
        "envoyeA": ms(dernier),
        "valideMinutes": duree,
        "renvoiSecondes": max(0, math.ceil(attente)),
        "renvoisRestants": max(0, par_heure - len(envois)),
    }


def _envoyer(objet: str, n: str, canal: str) -> dict | None:
    """Envoie un code ; None si parti, sinon le refus du site (trop_tot : secondes ; limite : jusqua)."""
    try:
        otp.envoyer(objet=OBJETS_OTP[objet], destination=n, canal=canal)
    except ErreurClient as e:
        if e.code == "trop_tot":
            return {"ok": False, "raison": "trop_tot", "secondes": max(1, int((e.data or {}).get("renvoiSecondes", 1)))}
        if e.code == "trop_d_envois":
            envois = _envois(objet, n)
            debut = envois[-1].cree_le if envois else timezone.now()
            return {"ok": False, "raison": "limite", "jusqua": ms(debut + timedelta(hours=1))}
        raise
    return None


def creer(
    objet: str,
    telephone: str,
    *,
    canal: str = "sms",
    user=None,
    appareil: str = "",
    appareil_nom: str = "",
    lieu: str = "",
    se_souvenir: bool = True,
    jeton: str = "",
    dossier=None,
):
    """Nouveau défi : le code part (ou, demandé à nouveau dans les 60 s, le code déjà parti vaut encore). Rend
    (défi, None) ou (None, refus « limite ») quand plus aucun envoi n'est possible dans l'heure."""
    refus = _envoyer(objet, telephone, canal)
    if refus is not None and refus["raison"] == "limite":
        return None, refus
    t = timezone.now()
    # Le défi précédent du même objet, pour le même appareil ou le même compte, cesse de valoir.
    anciens = DefiVendeur.objects.filter(objet=objet, termine_le__isnull=True)
    if appareil:
        anciens.filter(appareil=appareil).update(termine_le=t)
    if user is not None:
        anciens.filter(user=user).update(termine_le=t)
    if dossier is not None:
        anciens.filter(dossier=dossier).update(termine_le=t)
    d = DefiVendeur.objects.create(
        public_id=secrets.token_hex(8),
        objet=objet,
        user=user,
        appareil=appareil,
        appareil_nom=appareil_nom[:80],
        lieu=lieu,
        telephone_chiffre=chiffrer(telephone),
        canal=canal,
        se_souvenir=se_souvenir,
        demande_a=t,
        jeton=jeton,
        dossier=dossier,
    )
    return d, None


def renvoyer(d: DefiVendeur, canal: str | None = None) -> dict:
    """ResultatRenvoi : nouvel envoi, ou trop tôt, ou plus d'envoi possible dans l'heure."""
    canal = canal if canal in ("sms", "whatsapp") else d.canal
    refus = _envoyer(d.objet, numero_de(d), canal)
    if refus is not None:
        return refus
    d.canal = canal
    d.save(update_fields=["canal"])
    return {"ok": True, "envoi": envoi(d)}


def verifier(d: DefiVendeur | None, code: str) -> dict:
    """ResultatCode : bon (le défi est terminé), faux (essais restants), trop d'essais (reprise), expiré."""
    if d is None or d.termine_le is not None:
        return {"ok": False, "raison": "expire"}
    r = otp.verifier(objet=OBJETS_OTP[d.objet], code=str(code or ""), destination=numero_de(d))
    if r.get("ok"):
        d.termine_le = timezone.now()
        d.save(update_fields=["termine_le"])
        return {"ok": True}
    if r.get("expire"):
        return {"ok": False, "raison": "expire"}
    if "bloqueJusqua" in r:
        return {"ok": False, "raison": "bloque", "jusqua": r["bloqueJusqua"]}
    return {"ok": False, "raison": "code", "essaisRestants": r.get("essaisRestants", 0)}


def en_cours(objet: str, **filtre) -> DefiVendeur | None:
    return DefiVendeur.objects.filter(objet=objet, termine_le__isnull=True, **filtre).first()


def appareil_absent() -> ErreurClient:
    return ErreurClient(status.HTTP_400_BAD_REQUEST, "appareil", "Identifiant de l'appareil manquant.")
