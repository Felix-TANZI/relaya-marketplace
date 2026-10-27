# backend/apps/shipping/codes.py
# Codes de chaque changement de main d'un colis (spec v2.1, BV-DEV-05, R66 ; feuille de route D11, D15).
#
#   R66.1  trois codes de r_code_chiffres chiffres par colis, à usage unique : remise (vendeur -> livreur), dépôt
#          (livreur -> relais), retrait (relais -> client) ; r_code_essais essais faux bloquent le code r_code_blocage_h
#   D11    à domicile, la remise au client se fait aussi avec un code : celui que le client lit dans son suivi
#
# Les quatre codes comptent leurs essais sur le colis (Shipment.codes_essais) ; le code de retrait au relais, vérifié
# par empreinte (DP-02), a en plus une limite par relais (RelayPickupAttempt.relais_bloque_jusqua).

import secrets
from datetime import timedelta

from django.utils import timezone
from django.utils.dateparse import parse_datetime
from rest_framework import serializers

from apps.regles import services as regles

MESSAGES = {
    "remise": "Code de remise incorrect — demandez-le au vendeur.",
    "depot": "Code de dépôt incorrect — demandez au livreur de montrer le QR du colis.",
    "livraison": "Code de livraison incorrect — demandez-le au client.",
    "retrait": "Code de retrait incorrect — demandez au client le code reçu par SMS.",
}


def nouveau_code() -> str:
    """R66.1 : code de r_code_chiffres chiffres, tiré au hasard (secrets)."""
    n = regles.reglage("r_code_chiffres")
    return f"{secrets.randbelow(10 ** n):0{n}d}"


def bloque_jusqua(shipment, sorte: str):
    """Fin du blocage de ce code (R66.1), ou None s'il n'est pas bloqué."""
    etat = (shipment.codes_essais or {}).get(sorte) or {}
    bloque = parse_datetime(etat["bloque_jusqu"]) if etat.get("bloque_jusqu") else None
    return bloque if bloque and bloque > timezone.now() else None


def essayer(shipment, sorte: str, correct: bool) -> dict:
    """Compte un essai du code `sorte` sur ce colis (R66.1), sans lever.
    {"ok", "bloque_jusqu" (fin du blocage ou None), "restants", "compte" (faux si le code était déjà bloqué)}."""
    bloque = bloque_jusqua(shipment, sorte)
    if bloque:
        return {"ok": False, "bloque_jusqu": bloque, "restants": 0, "compte": False}
    essais = dict(shipment.codes_essais or {})
    etat = dict(essais.get(sorte) or {})
    if correct:
        if etat:
            essais.pop(sorte, None)
            shipment.codes_essais = essais
            shipment.save(update_fields=["codes_essais"])
        return {"ok": True, "bloque_jusqu": None, "restants": regles.reglage("r_code_essais"), "compte": True}

    n = (0 if etat.get("bloque_jusqu") else int(etat.get("n", 0))) + 1
    etat = {"n": n}
    restants = max(0, regles.reglage("r_code_essais") - n)
    fin = None
    if restants <= 0:
        fin = timezone.now() + timedelta(hours=regles.reglage("r_code_blocage_h"))
        etat["bloque_jusqu"] = fin.isoformat()
    essais[sorte] = etat
    shipment.codes_essais = essais
    shipment.save(update_fields=["codes_essais"])
    return {"ok": False, "bloque_jusqu": fin, "restants": restants, "compte": True}


def message_bloque(fin) -> str:
    return f"Code bloqué jusqu'à {timezone.localtime(fin):%d/%m à %H:%M} après trop d'essais faux (R66.1)."


def verifier(shipment, sorte: str, attendu: str, soumis: str, champ: str):
    """Vérifie un code (R66.1) ; lève une erreur de validation sur `champ` si le code est faux ou bloqué."""
    essai = essayer(shipment, sorte, bool(attendu) and (soumis or "").strip() == attendu)
    if essai["ok"]:
        return
    if not essai["compte"]:
        raise serializers.ValidationError({champ: message_bloque(essai["bloque_jusqu"])})
    restants = essai["restants"]
    suite = f" Il reste {restants} essai(s)." if restants > 0 else " Code bloqué (R66.1)."
    raise serializers.ValidationError({champ: MESSAGES[sorte] + suite})
