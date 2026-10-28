# backend/apps/shipping/preuves.py
# Chaîne de garde d'un colis et responsabilité quand une preuve manque (feuille de route D15 ; spec v2.1 R60, R66.3).
#
#   R66.3  une photo est obligatoire à chaque changement de main ; photos seulement, jamais de vidéo
#   R60.1  la responsabilité passe à celui qui reçoit le colis (code de remise, de dépôt)
#   D15    quand la preuve d'un changement de main manque, la responsabilité revient à l'acteur qui devait la prendre
#
# Chaque étape franchie sans sa photo désigne le professionnel qui devait la prendre ; la première d'entre elles, dans
# l'ordre du trajet, porte la responsabilité.

from .models import RelayParcel, Shipment, ShipmentEvent, ShipmentEvidence

S = ShipmentEvidence.Stage


def _etapes(shipment):
    """(étape, libellé, acteur, franchie) dans l'ordre du trajet du colis."""
    statuts = set(ShipmentEvent.objects.filter(shipment=shipment).values_list("status", flat=True))
    ramasse = Shipment.Status.PICKED_UP in statuts or shipment.status in (
        Shipment.Status.PICKED_UP, Shipment.Status.OUT_FOR_DELIVERY, Shipment.Status.DELIVERED)
    etapes = [(S.COURIER_PICKUP_VENDOR, "Ramassage chez le vendeur", "livreur", ramasse)]
    if shipment.order.relay_point_id:
        colis = RelayParcel.objects.filter(shipment=shipment).first()
        etapes += [
            (S.RELAY_RECEIVED, "Réception au point relais", "relais", bool(colis and colis.received_at)),
            (S.RELAY_RELEASED, "Remise au client au comptoir", "relais", bool(colis and colis.picked_up_at)),
        ]
    else:
        livre = shipment.status == Shipment.Status.DELIVERED or ShipmentEvent.objects.filter(
            shipment=shipment, status=Shipment.Status.DELIVERED, actor_role="COURIER").exists()
        etapes.append((S.CUSTOMER_DELIVERY, "Remise au client à domicile", "livreur", livre))
    return etapes


def exiger_photo(shipment, etape, champ: str = "photo") -> None:
    """R66.3, imposé par le serveur (sécurité avant main 2) : pas de changement de main sans la photo de cette étape,
    déjà envoyée. L'application l'envoie avant l'action ; un appel direct sans photo est refusé."""
    from rest_framework import serializers

    if not ShipmentEvidence.objects.filter(shipment=shipment, stage=etape).exclude(file="").exists():
        raise serializers.ValidationError(
            {champ: f"Photo obligatoire avant ce changement de main (R66.3) : {S(etape).label.lower()}."})


def chaine_de_garde(shipment) -> dict:
    """{"etapes": [...], "responsable": acteur ou None, "etape_sans_preuve": étape ou None} (D15)."""
    avec_photo = set(ShipmentEvidence.objects.filter(shipment=shipment).values_list("stage", flat=True))
    etapes = [{"etape": e, "libelle": libelle, "acteur": acteur, "franchie": franchie, "preuve": e in avec_photo}
              for e, libelle, acteur, franchie in _etapes(shipment)]
    manque = next((e for e in etapes if e["franchie"] and not e["preuve"]), None)
    return {"colis": shipment.id, "etapes": etapes, "responsable": manque["acteur"] if manque else None,
            "etape_sans_preuve": manque["etape"] if manque else None}
