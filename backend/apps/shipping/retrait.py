# backend/apps/shipping/retrait.py
# Le retrait au comptoir du relais (relais -> client), sécurité avant main 2 :
#
#   R66.2  le relais scanne d'abord le QR du colis ; le code se vérifie ensuite sur CE colis
#   R66.1  r_code_essais codes faux bloquent le code de ce colis r_code_blocage_h heures (Shipment.codes_essais)
#          + limite par relais : r_code_relais_echecs codes faux en r_code_relais_fenetre_h heures bloquent ses remises
#   DP-02  le code n'est comparé que par son empreinte HMAC ; il n'est jamais gardé en clair
#
# Partagé par l'écran du comptoir (RelayPickupCodeCheckSerializer, RelayParcelPickupSerializer) et l'assistant
# WhatsApp du relais, qui suivent donc exactement les mêmes règles.

import json
import re

from apps.shipping import codes
from apps.shipping.models import RelayParcel, RelayPickupAttempt

EN_STOCK = (RelayParcel.Status.RECEIVED, RelayParcel.Status.STORED)


REFERENCE = re.compile(r"BVY?-(\d+)-(\d+)")


def reference_du_colis(valeur) -> tuple[int, int] | None:
    """La référence imprimée du colis, BVY-<commande>-<colis> (celle de WhatsApp) : (commande, colis) ou None."""
    m = REFERENCE.fullmatch(str(valeur or "").strip().upper())
    return (int(m.group(1)), int(m.group(2))) if m else None


def lire_le_colis(relay_point, colis):
    """R66.2, revue du 29/10 (D1) : le colis du comptoir, (colis en stock ou None, saisie_manuelle).

    - le jeton du QR scanné : {"shipment_id": …, "depot_code": …} ; le code de dépôt doit être celui du colis ;
    - à défaut (QR illisible), la référence BVY-<commande>-<colis> tapée par le gérant : saisie manuelle, tracée.
    Un identifiant interne seul (parcel_id, numéro du colis) n'est plus accepté depuis l'application du relais."""
    en_stock = RelayParcel.objects.select_related("shipment", "shipment__order", "relay_point").filter(
        relay_point=relay_point, status__in=EN_STOCK)
    brut = str(colis or "").strip()
    if brut.startswith("{"):
        try:
            donnees = json.loads(brut)
            shipment_id, jeton = int(donnees.get("shipment_id")), str(donnees.get("depot_code") or "")
        except (ValueError, TypeError, AttributeError):
            return None, False
        parcel = en_stock.filter(shipment_id=shipment_id).first()
        if parcel is None or not jeton or jeton != (parcel.shipment.depot_code or ""):
            return None, False
        return parcel, False
    ref = reference_du_colis(brut)
    if ref is None:
        return None, False
    commande, shipment_id = ref
    return en_stock.filter(shipment_id=shipment_id, shipment__order_id=commande).first(), True


def controler(relay_point, parcel, code: str, saisie_manuelle: bool = False) -> dict:
    """Vérifie le code sur le colis scanné et compte l'essai. Ne lève pas.
    {"ok", "locked", "locked_until", "attempts_left", "parcels" (les colis de la commande remis par ce code, §8.3)}."""
    bloque = RelayPickupAttempt.relais_bloque_jusqua(relay_point)
    if bloque:
        return {"ok": False, "locked": True, "locked_until": bloque, "attempts_left": 0, "parcels": [], "relais": True}
    essai = codes.essayer(parcel.shipment, "retrait", parcel.code_correct(code))
    if essai["compte"]:
        RelayPickupAttempt.register(relay_point, code, success=essai["ok"], shipment=parcel.shipment,
                                    saisie_manuelle=saisie_manuelle)
    if not essai["ok"]:
        fin = essai["bloque_jusqu"]
        relais = None if fin else RelayPickupAttempt.relais_bloque_jusqua(relay_point)
        return {"ok": False, "locked": bool(fin or relais), "locked_until": fin or relais,
                "attempts_left": 0 if (fin or relais) else essai["restants"], "parcels": [], "relais": bool(relais)}
    parcels = list(RelayParcel.objects.select_related("shipment", "shipment__order", "relay_point").filter(
        relay_point=relay_point, status__in=EN_STOCK, shipment__order_id=parcel.shipment.order_id,
        pickup_code_empreinte=parcel.pickup_code_empreinte))
    return {"ok": True, "locked": False, "locked_until": None, "attempts_left": essai["restants"], "parcels": parcels}


def code_de_refus(resultat: dict) -> str:
    """Revue du 29/10 (D2) : un code d'erreur dédié par cause, lu par WhatsApp (jamais le texte du message)."""
    if resultat.get("relais"):
        return "relais_bloque"
    return "code_bloque" if resultat.get("locked") else "code_faux"


def message_de_refus(resultat: dict) -> str:
    if resultat.get("relais"):
        return ("Trop de codes faux à ce relais : les remises reprennent le "
                f"{resultat['locked_until']:%d/%m à %H:%M}. Contactez le support BelivaY.")
    if resultat.get("locked"):
        return codes.message_bloque(resultat["locked_until"]) + " Seul le support peut débloquer."
    return codes.MESSAGES["retrait"] + f" Il reste {resultat['attempts_left']} essai(s)."
