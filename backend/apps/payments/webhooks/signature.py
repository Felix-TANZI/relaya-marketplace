# backend/apps/payments/webhooks/signature.py
# Verification de la signature CamPay.
#
# ─────────────────────────────────────────────────────────────────────────────
# CONSTAT DE SECURITE — A LIRE AVANT D'UTILISER CE MODULE
#
# La signature CamPay est un JWT HS256 dont l'en-tete vaut :
#     {"alg":"HS256","app":"<nom de l'app>","typ":"JWT"}
# et dont la charge utile contient un horodatage et une source :
#     {"iat":1781265404, ..., "source":"CamPay"}
#
# ELLE NE CONTIENT AUCUNE EMPREINTE DU CONTENU.
#
# Consequence : cette signature prouve que « CamPay a emis quelque chose avec
# cette cle », mais elle NE LIE RIEN a une transaction precise. Un attaquant
# qui intercepte une signature valide peut la rejouer sur un corps forge —
# montant different, reference differente, statut different.
#
# ELLE NE PEUT DONC PAS SERVIR DE MECANISME D'AUTHENTIFICATION.
#
# C'est pourquoi le principe P6 n'est pas une precaution supplementaire mais
# LE mecanisme d'authentification reel : on ne croit jamais le webhook, on
# re-interroge CamPay et c'est cette reponse qui fait foi.
#
# Ce module apporte donc une verification de PREMIER NIVEAU — filtrer le bruit
# et les tentatives grossieres —, jamais une garantie.
# ─────────────────────────────────────────────────────────────────────────────

from __future__ import annotations

import base64
import json
import logging
import time
from dataclasses import dataclass

from django.conf import settings

logger = logging.getLogger("apps.payments.webhooks")

#: Age maximal tolere pour un horodatage de signature.
DEFAULT_MAX_AGE_SECONDS = 15 * 60


@dataclass(frozen=True)
class SignatureCheck:
    #: True = verifiee · False = invalide · None = non verifiable
    valid: bool | None
    reason: str = ""
    header: dict | None = None
    payload: dict | None = None

    @property
    def is_rejected(self) -> bool:
        """Seule une signature EXPLICITEMENT invalide justifie un rejet."""
        return self.valid is False


def _b64(segment: str) -> bytes:
    segment += "=" * (-len(segment) % 4)
    return base64.urlsafe_b64decode(segment)


def decode_unverified(token: str) -> tuple[dict, dict]:
    """
    Decode l'en-tete et la charge sans verifier la signature.

    Sert a journaliser et a diagnostiquer, jamais a decider.
    """
    parties = (token or "").split(".")
    if len(parties) != 3:
        raise ValueError("Format JWT invalide.")
    return json.loads(_b64(parties[0])), json.loads(_b64(parties[1]))


def verify(token: str, *, max_age_seconds: int = DEFAULT_MAX_AGE_SECONDS) -> SignatureCheck:
    """
    Verifie la signature d'un webhook CamPay.

    Retourne un TRI-ETAT :
      True  — signature verifiee avec la cle configuree
      False — signature explicitement invalide (rejet justifie)
      None  — non verifiable (cle absente, format inattendu)

    `None` n'est PAS un echec : sans cle configuree, on ne peut simplement
    rien affirmer. Le traitement continue, et la re-interrogation tranche.
    """
    if not token:
        return SignatureCheck(valid=None, reason="Aucune signature dans le message.")

    cle = getattr(settings, "CAMPAY_WEBHOOK_KEY", "")
    if not cle:
        return SignatureCheck(
            valid=None,
            reason=("CAMPAY_WEBHOOK_KEY non configuree. Verification impossible. "
                    "La re-interrogation reste le mecanisme d'authentification."),
        )

    try:
        entete, charge = decode_unverified(token)
    except Exception as exc:
        return SignatureCheck(valid=False, reason=f"JWT illisible : {exc}")

    if entete.get("alg") != "HS256":
        return SignatureCheck(
            valid=False,
            reason=f"Algorithme inattendu : {entete.get('alg')}. Attendu HS256.",
            header=entete,
        )

    try:
        import jwt
    except ImportError:
        return SignatureCheck(
            valid=None,
            reason="PyJWT indisponible. Verification impossible.",
            header=entete,
        )

    try:
        verifiee = jwt.decode(
            token, cle, algorithms=["HS256"],
            options={"verify_exp": False, "verify_aud": False},
        )
    except Exception as exc:
        return SignatureCheck(
            valid=False,
            reason=f"Signature invalide : {type(exc).__name__} — {exc}",
            header=entete, payload=charge,
        )

    # Controle d'age : limite la fenetre de rejeu, sans la fermer.
    emis_a = verifiee.get("iat")
    if emis_a and max_age_seconds:
        age = int(time.time()) - int(emis_a)
        if age > max_age_seconds:
            return SignatureCheck(
                valid=False,
                reason=f"Signature trop ancienne ({age}s > {max_age_seconds}s). "
                       "Rejeu probable.",
                header=entete, payload=verifiee,
            )
        if age < -300:
            return SignatureCheck(
                valid=False,
                reason=f"Signature datee dans le futur ({-age}s). Horloge ou forgerie.",
                header=entete, payload=verifiee,
            )

    source = str(verifiee.get("source", "")).strip().lower()
    if source and source != "campay":
        return SignatureCheck(
            valid=False,
            reason=f"Source inattendue : {verifiee.get('source')}.",
            header=entete, payload=verifiee,
        )

    return SignatureCheck(valid=True, reason="Signature verifiee.",
                          header=entete, payload=verifiee)