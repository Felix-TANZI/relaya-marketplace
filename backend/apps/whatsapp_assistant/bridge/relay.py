# backend/apps/whatsapp_assistant/bridge/relay.py
# Pont vers les POINTS RELAIS : SEUL fichier du module qui lit les colis d'un
# relais, les receptionne et les remet au client.
#
# Confidentialite : le portail relais anonymise deja le livreur (« BV-L-007 »)
# et ne montre pas le vendeur. Meme regle ici, et aucun numero de client n'en
# sort. Le code de retrait n'est jamais ENVOYE : il est seulement verifie quand
# le gerant le saisit, comme il le ferait dans son application.

import logging
from dataclasses import dataclass, field
from datetime import timedelta

from django.db import transaction
from django.db.models.signals import post_save, pre_save
from django.utils import timezone

logger = logging.getLogger("apps.whatsapp_assistant")

# Colis qui demandent encore quelque chose au gerant.
TO_RECEIVE = ("EXPECTED",)
IN_STORE = ("RECEIVED", "STORED")
ACTIVE_STATUSES = TO_RECEIVE + IN_STORE
WINDOW_DAYS = 60
MAX_PARCELS = 10


@dataclass(frozen=True)
class Relay:
    id: int                     # RelayPointProfile
    user_id: int
    name: str
    wa_id: str                  # 2376XXXXXXXX, vide si le numero n'est pas valide
    language: str               # le relais n'a pas de langue enregistree : fr par defaut
    can_work: bool              # actif ET approuve, la regle du portail
    capacity: int               # 0 = illimitee
    stored: int


@dataclass(frozen=True)
class Parcel:
    id: int
    reference: str              # BVY-<commande>-<colis>, comme partout ailleurs
    order_id: int
    status: str
    slot_code: str              # emplacement de rangement, interne au relais
    items_count: int
    courier_ref: str            # « BV-L-007 » — jamais le nom du livreur
    received_on: str            # 16/09, vide tant qu'il n'est pas recu
    free_until: str             # fin de la garde gratuite
    deadline: str               # echeance au-dela de laquelle le colis repart
    fee_due: int                # frais de garde dus a ce jour
    late: bool
    to_receive: bool
    extras: dict = field(default_factory=dict)


# ── Qui nous ecrit ─────────────────────────────────────────────────────────

def relays_with_phone(wa_id: str) -> list[int]:
    """Points relais dont le numero enregistre est ce numero WhatsApp."""
    from apps.accounts.models import RelayPointProfile

    if len(wa_id) < 9:
        return []
    national = wa_id[-9:]

    def matching(rows):
        return [relay_id for relay_id, phone in rows if to_wa_id(phone) == wa_id]

    found = matching(RelayPointProfile.objects.filter(phone__endswith=national).values_list("id", "phone"))
    if found:
        return found
    # Numeros ecrits avec des espaces ou des tirets : on normalise en Python.
    return matching(RelayPointProfile.objects.filter(is_active=True).values_list("id", "phone"))


def get_relay(relay_id: int) -> Relay | None:
    from apps.accounts.models import RelayPointProfile
    from apps.shipping.models import RelayParcel

    profile = RelayPointProfile.objects.select_related("user").filter(pk=relay_id).first()
    if profile is None:
        return None
    return Relay(
        id=profile.id,
        user_id=profile.user_id,
        name=profile.name,
        wa_id=to_wa_id(profile.phone),
        language="fr",
        # La regle exacte du portail relais (shipping/views.py : _get_active_relay_point).
        can_work=profile.is_active and profile.status == "APPROVED",
        capacity=profile.storage_capacity or 0,
        stored=RelayParcel.objects.filter(relay_point=profile, status__in=IN_STORE).count(),
    )


def relay_of_user(user_id: int) -> Relay | None:
    from apps.accounts.models import RelayPointProfile

    profile = RelayPointProfile.objects.filter(user_id=user_id).only("id").first()
    return get_relay(profile.id) if profile else None


def to_wa_id(phone: str) -> str:
    from apps.whatsapp_assistant.bridge.deliveries import to_wa_id as normalise

    return normalise(phone)


# ── Ce que le gerant a sur les bras ────────────────────────────────────────

def _parcels_of(relay_id: int):
    from apps.shipping.models import RelayParcel

    return (
        RelayParcel.objects
        .filter(relay_point_id=relay_id, created_at__gte=timezone.now() - timedelta(days=WINDOW_DAYS))
        .select_related("shipment", "shipment__order")
        .order_by("status", "created_at")
    )


def active_parcels(relay_id: int) -> list[Parcel]:
    """Colis attendus puis colis en attente de retrait, les plus urgents d'abord."""
    parcels = [_to_parcel(item) for item in _parcels_of(relay_id).filter(status__in=ACTIVE_STATUSES)]
    return sorted(parcels, key=lambda item: (not item.to_receive, not item.late, item.deadline or "~"))[:MAX_PARCELS]


def get_parcel(parcel_id: int, relay_id: int) -> Parcel | None:
    """Un colis, et seulement s'il est bien dans CE relais."""
    item = _parcels_of(relay_id).filter(pk=parcel_id).first()
    return _to_parcel(item) if item else None


def _to_parcel(item) -> Parcel:
    shipment = item.shipment
    order = shipment.order if shipment else None
    received = item.received_at
    deadline = item.garde_deadline if received else None
    return Parcel(
        id=item.id,
        reference=f"BVY-{shipment.order_id}-{shipment.id}" if shipment else f"#{item.id}",
        order_id=shipment.order_id if shipment else 0,
        status=item.status,
        slot_code=item.slot_code or "",
        items_count=sum(shipment.order_items.values_list("qty", flat=True)) if shipment else 0,
        courier_ref=f"BV-L-{shipment.courier_id:03d}" if shipment and shipment.courier_id else "",
        received_on=timezone.localtime(received).strftime("%d/%m") if received else "",
        free_until=timezone.localtime(item.garde_free_until).strftime("%d/%m") if received else "",
        deadline=timezone.localtime(deadline).strftime("%d/%m") if deadline else "",
        fee_due=item.garde_fee_due() if received else 0,
        late=bool(deadline and deadline < timezone.now()),
        to_receive=item.status in TO_RECEIVE,
        extras={"city": order.city if order else ""},
    )


# ── Actions : receptionner, remettre ───────────────────────────────────────

class ActionResult:
    DONE = "done"
    ALREADY = "already"             # deja receptionne, ou deja retire
    NOT_YOURS = "not_yours"         # ce colis n'est pas dans ce relais
    FULL = "full"                   # capacite de stockage atteinte
    BAD_CODE = "bad_code"           # code de retrait inconnu ici
    NEEDS_APP = "needs_app"         # le coeur demande plus que ce que WhatsApp peut fournir
    INACTIVE = "inactive"           # relais suspendu ou non approuve
    REFUSED = "refused"


def receive_parcel(parcel_id: int, relay_id: int) -> str:
    """
    « Colis recu » : passe par le serializer du portail relais, qui verifie la
    capacite, genere le code de retrait et previent l'acheteur.
    """
    from rest_framework.exceptions import ValidationError

    from apps.accounts.models import RelayPointProfile
    from apps.shipping.models import RelayParcel
    from apps.shipping.serializers import RelayParcelReceiveSerializer

    profile = RelayPointProfile.objects.filter(pk=relay_id).first()
    if profile is None or not (profile.is_active and profile.status == "APPROVED"):
        return ActionResult.INACTIVE

    with transaction.atomic():
        parcel = (
            RelayParcel.objects.select_for_update()
            .select_related("shipment").filter(pk=parcel_id, relay_point_id=relay_id).first()
        )
        if parcel is None:
            return ActionResult.NOT_YOURS
        if parcel.status in IN_STORE:
            return ActionResult.ALREADY
        if parcel.status not in TO_RECEIVE:
            return ActionResult.REFUSED

        serializer = RelayParcelReceiveSerializer(
            data={"shipment_id": parcel.shipment_id},
            context={"relay_point": profile},
        )
        try:
            serializer.is_valid(raise_exception=True)
            serializer.save()
        except ValidationError as error:
            detail = str(error.detail).lower()
            if "capacit" in detail or "complet" in detail or "full" in detail:
                return ActionResult.FULL
            logger.info("Relais %s : reception du colis %s refusee (%s)", relay_id, parcel_id, error.detail)
            return ActionResult.REFUSED
    return ActionResult.DONE


def hand_over(pickup_code: str, relay_id: int) -> tuple[str, list[str]]:
    """
    « Remettre au client » : le gerant saisit le code annonce par le client,
    exactement comme au guichet. Renvoie (resultat, references des colis remis).
    """
    from rest_framework.exceptions import ValidationError

    from apps.accounts.models import RelayPointProfile
    from apps.shipping.models import RelayParcel
    from apps.shipping.serializers import RelayParcelPickupSerializer

    profile = RelayPointProfile.objects.filter(pk=relay_id).first()
    if profile is None or not (profile.is_active and profile.status == "APPROVED"):
        return ActionResult.INACTIVE, []

    code = (pickup_code or "").strip().upper()
    concerned = list(
        RelayParcel.objects.select_related("shipment")
        .filter(relay_point_id=relay_id, pickup_code=code, status__in=IN_STORE)
    )
    if not concerned:
        deja = RelayParcel.objects.filter(
            relay_point_id=relay_id, pickup_code=code, status="PICKED_UP",
        ).exists()
        return (ActionResult.ALREADY if deja else ActionResult.BAD_CODE), []

    references = [f"BVY-{item.shipment.order_id}-{item.shipment_id}" for item in concerned]
    serializer = RelayParcelPickupSerializer(
        data={"pickup_code": code, "proof_note": "Remise confirmée depuis WhatsApp"},
        context={"relay_point": profile},
    )
    try:
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            serializer.save()
    except ValidationError as error:
        detail = str(error.detail).lower()
        # Un tiers est autorise a retirer : le coeur exige une piece d'identite,
        # que WhatsApp ne peut pas recueillir proprement.
        if "identit" in detail or "id_reference" in detail or "mandataire" in detail:
            return ActionResult.NEEDS_APP, references
        logger.info("Relais %s : remise refusee (%s)", relay_id, error.detail)
        return ActionResult.BAD_CODE, []
    return ActionResult.DONE, references


# ── Ecoute du ramassage chez le vendeur ────────────────────────────────────

_UNKNOWN = object()
PICKED_UP = "PICKED_UP"


def connect_pickup_signal(on_picked_up, is_enabled) -> None:
    """
    Appelle on_picked_up(parcel_id) apres validation en base, quand un colis
    destine a un point relais vient d'etre ramasse chez le vendeur : c'est le
    moment ou il se met reellement en route.
    """
    from apps.shipping.models import Shipment

    def remember_previous_status(sender, instance, raw=False, update_fields=None, **kwargs):
        if raw or not is_enabled():
            return
        if update_fields is not None and "status" not in set(update_fields):
            return
        instance._whatsapp_previous_shipment_status = (
            sender.objects.filter(pk=instance.pk).values_list("status", flat=True).first()
            if instance.pk else None
        )

    def notify_relay(sender, instance, raw=False, **kwargs):
        previous = instance.__dict__.pop("_whatsapp_previous_shipment_status", _UNKNOWN)
        if raw or previous is _UNKNOWN or previous == PICKED_UP:
            return
        if instance.status != PICKED_UP:
            return
        shipment_id = instance.pk
        transaction.on_commit(lambda: _relay_parcel_then(shipment_id, on_picked_up))

    pre_save.connect(remember_previous_status, sender=Shipment, weak=False,
                     dispatch_uid="whatsapp_assistant.relay_remember_status")
    post_save.connect(notify_relay, sender=Shipment, weak=False,
                      dispatch_uid="whatsapp_assistant.relay_notify_pickup")


def _relay_parcel_then(shipment_id: int, on_picked_up) -> None:
    from apps.shipping.models import RelayParcel

    parcel_id = (
        RelayParcel.objects.filter(shipment_id=shipment_id).values_list("id", flat=True).first()
    )
    if parcel_id:                                   # sinon : livraison a domicile, rien a dire
        on_picked_up(parcel_id)


def relay_of_parcel(parcel_id: int) -> int | None:
    from apps.shipping.models import RelayParcel

    return RelayParcel.objects.filter(pk=parcel_id).values_list("relay_point_id", flat=True).first()


# ── Outils d'essai ─────────────────────────────────────────────────────────

def pickup_for_test(shipment_id: int) -> None:
    """Le livreur ramasse le colis chez le vendeur, comme dans l'application."""
    from apps.shipping.models import Shipment

    with transaction.atomic():
        shipment = Shipment.objects.get(pk=shipment_id)
        shipment.status = Shipment.Status.PICKED_UP
        shipment.save(update_fields=["status", "updated_at"])
