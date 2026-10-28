# backend/apps/shipping/codes.py
# Codes de chaque changement de main d'un colis (spec v2.1, BV-DEV-05, R66 ; feuille de route D11, D15).
#
#   R66.1  trois codes de r_code_chiffres chiffres par colis, à usage unique : remise (vendeur -> livreur), dépôt
#          (livreur -> relais), retrait (relais -> client) ; r_code_essais essais faux bloquent le code r_code_blocage_h
#   D11    à domicile, la remise au client se fait aussi avec un code : celui que le client lit dans son suivi
#
# Le code de retrait au relais garde son propre compteur (RelayPickupAttempt) ; les trois autres comptent leurs essais
# sur le colis (Shipment.codes_essais).

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
}


def nouveau_code() -> str:
    """R66.1 : code de r_code_chiffres chiffres, tiré au hasard (secrets)."""
    n = regles.reglage("r_code_chiffres")
    return f"{secrets.randbelow(10 ** n):0{n}d}"


def verifier(shipment, sorte: str, attendu: str, soumis: str, champ: str):
    """Vérifie un code (R66.1) ; lève une erreur de validation sur `champ` si le code est faux ou bloqué."""
    essais = dict(shipment.codes_essais or {})
    etat = dict(essais.get(sorte) or {})
    maintenant = timezone.now()
    bloque = parse_datetime(etat["bloque_jusqu"]) if etat.get("bloque_jusqu") else None
    if bloque and bloque > maintenant:
        raise serializers.ValidationError(
            {champ: f"Code bloqué jusqu'à {timezone.localtime(bloque):%d/%m à %H:%M} après trop d'essais faux (R66.1)."})

    if (soumis or "").strip() == attendu and attendu:
        if etat:
            essais.pop(sorte, None)
            shipment.codes_essais = essais
            shipment.save(update_fields=["codes_essais"])
        return

    n = (0 if bloque else int(etat.get("n", 0))) + 1
    etat = {"n": n}
    restants = regles.reglage("r_code_essais") - n
    if restants <= 0:
        etat["bloque_jusqu"] = (maintenant + timedelta(hours=regles.reglage("r_code_blocage_h"))).isoformat()
    essais[sorte] = etat
    shipment.codes_essais = essais
    shipment.save(update_fields=["codes_essais"])
    suite = f" Il reste {restants} essai(s)." if restants > 0 else " Code bloqué (R66.1)."
    raise serializers.ValidationError({champ: MESSAGES[sorte] + suite})
