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


def identifiant_du_colis(valeur) -> int | None:
    """L'expédition désignée par le QR du colis ou sa référence : {"shipment_id": …}, SHIP-<id>, BVY-<cmd>-<id>, <id>."""
    if isinstance(valeur, int):
        return valeur
    brut = str(valeur or "").strip()
    if not brut:
        return None
    if brut.startswith("{"):
        try:
            return int(json.loads(brut).get("shipment_id"))
        except (ValueError, TypeError, AttributeError):
            return None
    brut = brut.upper()
    m = re.fullmatch(r"SHIP-(\d+)", brut) or re.fullmatch(r"BVY?-\d+-(\d+)", brut) or re.fullmatch(r"(\d+)", brut)
    return int(m.group(1)) if m else None


def colis_en_stock(relay_point, *, parcel_id=None, colis=None):
    """Le colis scanné, s'il est en stock dans ce relais (sinon None)."""
    qs = RelayParcel.objects.select_related("shipment", "shipment__order", "relay_point").filter(
        relay_point=relay_point, status__in=EN_STOCK)
    if parcel_id:
        return qs.filter(pk=parcel_id).first()
    shipment_id = identifiant_du_colis(colis)
    return qs.filter(shipment_id=shipment_id).first() if shipment_id else None


def controler(relay_point, parcel, code: str) -> dict:
    """Vérifie le code sur le colis scanné et compte l'essai. Ne lève pas.
    {"ok", "locked", "locked_until", "attempts_left", "parcels" (les colis de la commande remis par ce code, §8.3)}."""
    bloque = RelayPickupAttempt.relais_bloque_jusqua(relay_point)
    if bloque:
        return {"ok": False, "locked": True, "locked_until": bloque, "attempts_left": 0, "parcels": [], "relais": True}
    essai = codes.essayer(parcel.shipment, "retrait", parcel.code_correct(code))
    if essai["compte"]:
        RelayPickupAttempt.register(relay_point, code, success=essai["ok"], shipment=parcel.shipment)
    if not essai["ok"]:
        fin = essai["bloque_jusqu"]
        relais = None if fin else RelayPickupAttempt.relais_bloque_jusqua(relay_point)
        return {"ok": False, "locked": bool(fin or relais), "locked_until": fin or relais,
                "attempts_left": 0 if (fin or relais) else essai["restants"], "parcels": [], "relais": bool(relais)}
    parcels = list(RelayParcel.objects.select_related("shipment", "shipment__order", "relay_point").filter(
        relay_point=relay_point, status__in=EN_STOCK, shipment__order_id=parcel.shipment.order_id,
        pickup_code_empreinte=parcel.pickup_code_empreinte))
    return {"ok": True, "locked": False, "locked_until": None, "attempts_left": essai["restants"], "parcels": parcels}


def message_de_refus(resultat: dict) -> str:
    if resultat.get("relais"):
        return ("Trop de codes faux à ce relais : les remises reprennent le "
                f"{resultat['locked_until']:%d/%m à %H:%M}. Contactez le support BelivaY.")
    if resultat.get("locked"):
        return codes.message_bloque(resultat["locked_until"]) + " Seul le support peut débloquer."
    return codes.MESSAGES["retrait"] + f" Il reste {resultat['attempts_left']} essai(s)."
