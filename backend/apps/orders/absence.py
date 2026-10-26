# backend/apps/orders/absence.py
# Client absent, refus à la porte, déplacement inutile — spec v2.1, BV-DEV-01 :
#
#   R51.1  le livreur appelle r_client_appels fois et attend r_client_attente_min, avec une preuve (journal d'appels,
#          position, photo)
#   R51.2  le colis part au relais de la zone du client, sans 2e passage ; SI ce relais ne peut pas le garder (plein
#          ou absent), il est traité comme un XL (R51.6)
#   R51.3  message au client, mot pour mot
#   R51.4  frais_absence = r_absence_sup + Σ (part(format) + r_garde_relais_jour) des colis transférés
#   R51.5  payés dans l'application (Mobile Money avec R02.6) ou au relais par Mobile Money, jamais en espèces ; le code
#          de retrait se débloque après ce paiement ; BelivaY ne paie rien
#   R51.6  XL : frais_absence = r_absence_sup une fois ; le colis attend à l'agence de l'entreprise ; 2e passage sur un
#          nouveau créneau (pas encore de créneaux dans l'application : l'équipe logistique est alertée)
#   R85.1  le colis n'est jamais ouvert à la porte
#   R85.2  refus d'un colis conforme : retour au vendeur, la livraison n'est plus offerte ; rembourse = max(0 ;
#          arrondi(produits − couv_concernee − r_refus_sup)) ; livraison payée et frais Mobile Money gardés (R72.2)
#   R85.3  déplacement inutile (boutique fermée, produit non conforme au ramassage) : r_deplacement_inutile facturés au
#          vendeur (et payés à l'entreprise, avec sa grille)
#   R85.4  couv_concernee = couverture × produits ÷ st

from datetime import timedelta
from fractions import Fraction

from django.db import transaction
from django.utils import timezone

from apps.regles import services as regles

MESSAGE_R51_3 = ("Ta commande a été transférée au relais {nom}. Frais d'absence : {frais_absence} F, "
                 "à payer avant le retrait.")


class AbsenceRefusee(Exception):
    def __init__(self, champ: str, message: str):
        super().__init__(message)
        self.champ, self.message = champ, message


# ── Ce qui reste à payer au relais avant la remise (R42.4 comptoir, R51.5 absence) ──────────────────────────────

def dus_au_relais(order) -> dict:
    """Montants encore dus au relais, frais Mobile Money compris : le code de retrait reste caché tant qu'il en reste."""
    comptoir = 0
    if order.payment_status == order.PaymentStatus.VALIDATED:
        comptoir = int(order.reste_comptoir_xaf or 0) + int(order.frais_momo_comptoir_xaf or 0)
    absence = 0
    if order.frais_absence_xaf and not order.frais_absence_paye_le:
        absence = int(order.frais_absence_xaf) + int(order.frais_momo_absence_xaf or 0)
    return {"comptoir": comptoir, "absence": absence, "total": comptoir + absence}


# ── R51 : client absent ──────────────────────────────────────────────────────────────────────────────────────

def formats_du_colis(shipment) -> list[str]:
    """Formats des colis de cette boutique dans la commande, lus dans les frais figés (R64)."""
    for b in (shipment.order.frais_detail or {}).get("boutiques") or []:
        if b.get("vendeur") == shipment.vendor_id:
            return list(b.get("colis_b") or ["P"])
    return ["P"]


def relais_de_la_zone(order):
    """R51.2 : le relais actif et approuvé de la zone du client qui peut garder le colis, le plus proche de son
    adresse ; None si aucun (plein ou absent)."""
    from apps.accounts.models import RelayPointProfile
    from apps.shipping.garde import relais_sature
    from apps.shipping.views import _haversine_km

    from .frais import destination_relais

    zone = getattr(order.zone, "code", None)
    candidats = []
    for relais in RelayPointProfile.objects.filter(is_active=True, status=RelayPointProfile.Status.APPROVED):
        try:
            if zone and destination_relais(relais).zone_dest != zone:
                continue
        except Exception:
            continue
        if relais_sature(relais):
            continue
        d = (_haversine_km(order.delivery_latitude, order.delivery_longitude, relais.latitude, relais.longitude)
             if order.delivery_latitude and relais.latitude else 0)
        candidats.append((d, relais.pk, relais))
    return min(candidats)[2] if candidats else None


def preuve_absence(shipment, latitude, longitude, maintenant=None) -> None:
    """R51.1 : appels passés et attente faite, position et photo de l'absence. Lève AbsenceRefusee sinon."""
    from apps.shipping import appels
    from apps.shipping.models import ShipmentEvidence

    maintenant = maintenant or timezone.now()
    if appels.appels_au_client(shipment) < regles.reglage("r_client_appels"):
        raise AbsenceRefusee("appels", f"Appelez d'abord le client {regles.reglage('r_client_appels')} fois "
                                       "avec le bouton « Appeler le client » (R51.1).")
    premier = (shipment.appels_masques.filter(sens="LIVREUR_CLIENT", ok=True).exclude(
        prestataire=appels.AppelConsole.nom).order_by("le").values_list("le", flat=True).first())
    if premier is None or maintenant < premier + timedelta(minutes=regles.reglage("r_client_attente_min")):
        raise AbsenceRefusee("attente", f"Attendez {regles.reglage('r_client_attente_min')} min après le premier "
                                        "appel (R51.1).")
    if latitude in (None, "") or longitude in (None, ""):
        raise AbsenceRefusee("position", "La position du livreur est demandée (R51.1).")
    if not ShipmentEvidence.objects.filter(shipment=shipment, stage=ShipmentEvidence.Stage.CUSTOMER_ABSENT).exists():
        raise AbsenceRefusee("photo", "Prenez la photo devant l'adresse du client (R51.1).")


@transaction.atomic
def declarer_absence(shipment, livreur_user, latitude, longitude) -> dict:
    """R51.2 à R51.6 : le colis part au relais de la zone, ou attend à l'agence s'il est XL ou si aucun relais ne
    peut le garder. Retourne {"relais": nom | None, "frais_absence": F}."""
    from apps.accounts.models import UserNotification
    from apps.shipping.models import RelayParcel, Shipment, ShipmentEvent

    from .bascule import _alerter

    order = shipment.order
    if order.relay_point_id:
        raise AbsenceRefusee("action", "« Client absent » ne vaut que pour une livraison à domicile.")
    preuve_absence(shipment, latitude, longitude)
    m = regles.moteur()
    formats = formats_du_colis(shipment)
    relais = None if "XL" in formats else relais_de_la_zone(order)
    lieu = f"{latitude},{longitude}"
    if relais is None:  # R51.6 : traité comme un XL, attend à l'agence de l'entreprise
        frais = int(regles.reglage("r_absence_sup"))
        shipment.status = Shipment.Status.INCIDENT
        shipment.save(update_fields=["status", "updated_at"])
        ShipmentEvent.record(shipment=shipment, status=shipment.status, location=lieu, actor=livreur_user,
                             actor_role="COURIER",
                             message="Client absent (R51.1) : colis à l'agence de l'entreprise, 2e passage sur un "
                                     "nouveau créneau (R51.6).")
        _alerter(order, f"Client absent, 2e passage à programmer · commande #{order.pk}",
                 f"Colis gardé à l'agence de l'entreprise (R51.6) : proposer un nouveau créneau au client sous "
                 f"{regles.reglage('r_xl_garde_agence_j')} jours, sinon retour au vendeur (R51.7).")
    else:
        frais = int(m.frais_absence(formats))
        order.relay_point = relais
        order.save(update_fields=["relay_point"])
        RelayParcel.objects.update_or_create(shipment=shipment, defaults={
            "relay_point": relais, "status": RelayParcel.Status.EXPECTED})
        shipment.relay_point = relais.name
        shipment.status = Shipment.Status.PICKED_UP  # le livreur garde le colis jusqu'au dépôt au relais
        shipment.save(update_fields=["relay_point", "status", "updated_at"])
        shipment.ensure_depot_code()  # R66.1 : dépôt au relais avec son code
        ShipmentEvent.record(shipment=shipment, status=shipment.status, location=lieu, actor=livreur_user,
                             actor_role="COURIER",
                             message=f"Client absent (R51.1) : colis transféré au relais {relais.name} (R51.2).")
    order.frais_absence_xaf = frais
    order.frais_momo_absence_xaf = int(m.frais_momo(frais))  # R51.5 avec R02.6
    order.save(update_fields=["frais_absence_xaf", "frais_momo_absence_xaf"])
    if order.user_id and relais is not None:
        UserNotification.objects.create(
            user=order.user, title=f"Commande transférée au relais · commande #{order.pk}",
            message=MESSAGE_R51_3.format(nom=relais.name, frais_absence=frais),
            notification_type=UserNotification.NotificationType.ORDER, action_url=f"/orders/{order.pk}")
    return {"relais": relais.name if relais else None, "frais_absence": frais}


# ── R85.2 : refus d'un colis conforme à la porte ─────────────────────────────────────────────────────────────

def montant_refus_porte(shipment) -> int:
    """R85.2, R85.4 : ce qui revient au client pour les produits de ce colis."""
    order = shipment.order
    produits = sum(int(i.line_total_xaf or 0) for i in order.items.filter(product__vendor_id=shipment.vendor_id))
    st = int(order.subtotal_xaf or 0)
    couv = Fraction(int(order.couverture_xaf or 0)) * produits / st if st else 0
    return int(regles.moteur().rembourse_refus_porte(produits, couv))


@transaction.atomic
def refus_a_la_porte(shipment, livreur_user, message: str = "") -> dict:
    from apps.accounts.models import UserNotification
    from apps.shipping.models import Shipment, ShipmentEvent

    from .bascule import _alerter
    from .models import Order

    order = shipment.order
    if order.relay_point_id:
        raise AbsenceRefusee("action", "Le refus à la porte ne vaut que pour une livraison à domicile.")
    rembourse = montant_refus_porte(shipment)
    shipment.status = Shipment.Status.FAILED
    shipment.save(update_fields=["status", "updated_at"])
    ShipmentEvent.record(shipment=shipment, status=shipment.status, actor=livreur_user, actor_role="COURIER",
                         message=("Refus d'un colis conforme à la porte (R85.2), colis non ouvert (R85.1) : retour au "
                                  f"vendeur. {message}").strip())
    if not order.shipments.exclude(status__in=[Shipment.Status.FAILED, Shipment.Status.CANCELLED]).exists():
        Order.objects.filter(pk=order.pk).update(fulfillment_status=Order.FulfillmentStatus.CANCELLED)
    resultat = {"ok": False, "remboursement": None}
    if order.is_paid:
        from apps.payments.bridge.porte import rendre_au_client

        resultat = rendre_au_client(order, shipment.vendor, rembourse,
                                    f"Refus d'un colis conforme à la porte (R85.2), commande #{order.pk}.")
    if order.user_id:
        UserNotification.objects.create(
            user=order.user, title=f"Colis refusé · commande #{order.pk}",
            message=(f"Tu as refusé le colis : il repart au vendeur. {rembourse} F te reviennent ; la livraison et "
                     "les frais Mobile Money ne sont pas rendus (R85.2)."),
            notification_type=UserNotification.NotificationType.ORDER, action_url=f"/orders/{order.pk}")
    _alerter(order, f"Refus à la porte · commande #{order.pk}",
             f"Retour au vendeur (R85.2). {rembourse} F au client"
             + (f" : demande {resultat['remboursement']} à approuver." if resultat.get("ok")
                else " : séquestre gelé, à régler à la main." if order.is_paid else "."))
    return {"rembourse": rembourse, **resultat}


# ── R85.3 : déplacement inutile ──────────────────────────────────────────────────────────────────────────────

def deplacement_inutile(shipment, livreur_user, motif: str) -> str | None:
    """Boutique fermée ou produit non conforme au ramassage : r_deplacement_inutile facturés au vendeur (créance
    approuvée par un tiers)."""
    from apps.payments.bridge.actors import payee_for_vendor
    from apps.payments.settlements.models import Adjustment
    from apps.payments.settlements.services import _systeme, create_adjustment
    from apps.shipping.models import ShipmentEvent

    if not motif.strip():
        raise AbsenceRefusee("message", "Dites pourquoi le déplacement était inutile (boutique fermée, produit non "
                                        "conforme…).")
    ShipmentEvent.record(shipment=shipment, status=shipment.status, actor=livreur_user, actor_role="COURIER",
                         message=f"Déplacement inutile (R85.3) : {motif}")
    profil = getattr(shipment.vendor, "vendor_profile", None)
    payee = payee_for_vendor(profil, create=True) if profil else None
    if payee is None:
        return None
    evenement = f"R85.3:colis-{shipment.pk}"
    if Adjustment.objects.filter(payee=payee, source_event=evenement).exists():
        return None
    a = create_adjustment(payee=payee, direction=Adjustment.Direction.CREDIT, category=Adjustment.Category.REBILLING,
                          amount_xaf=regles.reglage("r_deplacement_inutile"),
                          reason=f"R85.3 : déplacement inutile (colis #{shipment.pk}) — {motif}"[:255],
                          created_by=_systeme(), source_order_id=shipment.order_id, source_event=evenement)
    return a.reference
