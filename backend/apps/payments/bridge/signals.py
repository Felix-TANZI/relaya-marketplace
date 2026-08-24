# backend/apps/payments/bridge/signals.py
# Crochets metier -> domaine financier.
#
# ─────────────────────────────────────────────────────────────────────────────
# POURQUOI UN SIGNAL PLUTOT QUE DES APPELS EXPLICITES
#
# L'assignation d'un livreur se produit a AU MOINS trois endroits :
#   - CourierClaimShipmentView   (le livreur se saisit d'une mission)
#   - ShipmentCreateSerializer   (l'administration assigne)
#   - CourierShipmentActionView  (action du livreur sur sa mission)
#
# Et la livraison est constatee a au moins deux :
#   - CourierShipmentScanView    (scan du colis)
#   - CourierShipmentActionView
#
# Rustiner chacun de ces points, c'est accepter d'en oublier un. Et un point
# oublie ne produit AUCUNE erreur : le sequestre transport ne serait
# simplement jamais libere, et le transporteur jamais paye. Un defaut
# silencieux, comme celui de `delivery_organization`.
#
# UN SEUL CROCHET sur Shipment couvre tous les chemins, presents et futurs.
# ─────────────────────────────────────────────────────────────────────────────
#
# TROIS GARANTIES
#
#   1. IDEMPOTENCE — chaque evenement porte un identifiant stable. Le signal
#      se declenche a chaque sauvegarde, mais l'evenement n'est applique
#      qu'une fois. Inutile de detecter les transitions.
#
#   2. APRES VALIDATION — l'emission est differee au COMMIT. Une transaction
#      annulee n'emet rien : on ne libere pas d'argent sur un fait qui n'a
#      pas eu lieu.
#
#   3. JAMAIS BLOQUANT — un echec cote financier ne doit pas empecher un
#      livreur de scanner son colis. L'incident est journalise, la
#      reconciliation le verra.
#
# PRINCIPE P9 : le domaine financier ne juge pas ces faits. C'est le domaine
# LIVRAISON qui decide qu'un colis est livre, selon ses propres controles.
# Le signal ne fait que transmettre sa decision.

from __future__ import annotations

import logging

from django.db import transaction
from django.db.models.signals import post_save
from django.dispatch import receiver

logger = logging.getLogger("apps.payments.signals")


def register() -> None:
    """
    Branche les crochets. Appele depuis PaymentsConfig.ready().

    Import PARESSEUX : si l'application livraison n'est pas installee, le
    module financier doit rester utilisable.
    """
    try:
        from apps.shipping.models import Shipment
    except Exception:
        logger.info(
            "apps.shipping indisponible : les crochets financiers de "
            "livraison ne sont pas branches.")
        return

    post_save.connect(
        _on_shipment_saved, sender=Shipment,
        dispatch_uid="payments_bridge_shipment",
    )

    # ── Colis en point relais ────────────────────────────────────────────
    # Meme raisonnement que pour Shipment : la reception et la remise se
    # produisent a plusieurs endroits, et un point d'appel oublie ne
    # produirait AUCUNE erreur — le point relais ne serait simplement
    # jamais paye.
    try:
        from apps.shipping.models import RelayParcel
    except Exception:
        logger.info("RelayParcel indisponible : crochet relais non branche.")
        return

    post_save.connect(
        _on_relay_parcel_saved, sender=RelayParcel,
        dispatch_uid="payments_bridge_relay_parcel",
    )


def _on_shipment_saved(sender, instance, **kwargs) -> None:
    """
    Une expedition a ete sauvegardee. Deux faits nous interessent.

    On ne detecte PAS les transitions : les evenements sont idempotents, et
    detecter une transition demanderait de connaitre l'etat precedent — une
    information fragile que plusieurs chemins de code peuvent contourner.
    """
    transaction.on_commit(lambda: _traiter(instance.pk))


def _traiter(shipment_id: int) -> None:
    """Emis APRES commit : le fait metier est definitif."""
    try:
        from apps.shipping.models import Shipment

        expedition = (
            Shipment.objects
            .select_related("order", "courier", "courier__delivery_organization")
            .filter(pk=shipment_id).first()
        )
        if expedition is None:
            return

        _signaler_transporteur(expedition)
        _signaler_livraison(expedition)

    except Exception:
        # Un echec cote financier ne doit JAMAIS empecher un livreur de
        # travailler. L'incident est trace, la reconciliation le verra.
        logger.exception(
            "Crochet financier en echec pour l'expedition #%s. "
            "Le fait metier reste valide.", shipment_id,
        )


def _signaler_transporteur(expedition) -> None:
    """
    Un transporteur est assigne : sa part du transport lui revient.

    Au checkout, aucun transporteur n'etait connu — sa part avait ete
    provisoirement comptabilisee en produit plateforme. Cet evenement la
    remet ou elle doit etre.
    """
    livreur = getattr(expedition, "courier", None)
    if livreur is None:
        return

    organisation = getattr(livreur, "delivery_organization", None)
    if organisation is None:
        # Livreur independant, sans organisation contractuelle : il n'y a
        # pas d'entreprise a payer. La part reste a la plateforme.
        return

    from . import events_in

    events_in.carrier_assigned(
        order_id=expedition.order_id,
        delivery_organization=organisation,
        event_id=f"carrier-{expedition.pk}-{organisation.pk}",
        emitter="apps.shipping (signal)",
    )


#: Statuts d'expedition qui valent PREUVE DE LIVRAISON.
#: Le domaine livraison a effectue ses propres controles — scan, photo,
#: signature — avant d'y parvenir. Le financier ne les reexamine pas.
STATUTS_LIVRES = {"DELIVERED"}


def _signaler_livraison(expedition) -> None:
    """
    Le colis est livre : le sequestre TRANSPORT peut etre libere.

    Sans cet evenement, le transport ne se libere JAMAIS — sa politique ne
    prevoit aucune auto-confirmation, contrairement a la marchandise.
    """
    if str(expedition.status) not in STATUTS_LIVRES:
        return

    from . import events_in

    events_in.delivery_proof_validated(
        order_id=expedition.order_id,
        event_id=f"proof-{expedition.pk}",
        emitter="apps.shipping (signal)",
    )


# ─────────────────────────────────────────────────────────────────────────────
# COLIS EN POINT RELAIS
# ─────────────────────────────────────────────────────────────────────────────

def _on_relay_parcel_saved(sender, instance, **kwargs) -> None:
    transaction.on_commit(lambda: _traiter_relais(instance.pk))


def _traiter_relais(parcel_id: int) -> None:
    try:
        from apps.shipping.models import RelayParcel

        colis = (
            RelayParcel.objects
            .select_related("shipment", "relay_point")
            .filter(pk=parcel_id).first()
        )
        if colis is None:
            return

        _signaler_point_relais(colis)
        _signaler_remise(colis)

    except Exception:
        logger.exception(
            "Crochet financier en echec pour le colis relais #%s. "
            "Le fait metier reste valide.", parcel_id,
        )


#: Statuts a partir desquels le point relais GARDE effectivement le colis.
#: C'est a ce moment que sa part lui revient.
STATUTS_EN_GARDE = {"RECEIVED", "STORED", "PICKED_UP"}


def _signaler_point_relais(colis) -> None:
    """
    Le point relais prend le colis en garde.

    Si une part RELAY_HANDLING avait ete facturee a l'acheteur, elle lui est
    reallouee ici. Dans le modele contractuel de BelivaY ce n'est pas le cas
    — la remuneration vient du contrat, pas du paiement — mais le mecanisme
    reste en place : il ne fait rien s'il n'y a rien a reallouer.
    """
    if str(colis.status) not in STATUTS_EN_GARDE:
        return

    relais = getattr(colis, "relay_point", None)
    if relais is None:
        return

    commande = getattr(colis.shipment, "order_id", None)
    if commande is None:
        return

    from . import events_in

    events_in.relay_point_assigned(
        order_id=commande, relay_profile=relais,
        event_id=f"relay-{colis.pk}-{relais.pk}",
        emitter="apps.shipping (signal relais)",
    )


#: Le colis est REMIS au client.
STATUTS_REMIS = {"PICKED_UP"}


def _signaler_remise(colis) -> None:
    """
    Le colis est remis au client, code de retrait verifie.

    Sans cet evenement, le sequestre RELAY_HANDLING ne se libere JAMAIS :
    comme le transport, il n'a pas d'auto-confirmation.

    PRINCIPE P9 : le domaine financier ne verifie pas le code de retrait.
    Le domaine livraison l'a fait avant de passer le colis en PICKED_UP.
    """
    if str(colis.status) not in STATUTS_REMIS:
        return

    commande = getattr(colis.shipment, "order_id", None)
    if commande is None:
        return

    from . import events_in

    events_in.relay_handover_scanned(
        order_id=commande,
        event_id=f"handover-{colis.pk}",
        emitter="apps.shipping (signal relais)",
    )

    # ── Remuneration contractuelle ───────────────────────────────────────
    # Le point relais est paye selon SON CONTRAT, pas sur les frais de
    # livraison. C'est une charge de la plateforme, sans lien avec ce que
    # l'acheteur a paye.
    _remunerer_relais(colis, commande)


def _remunerer_relais(colis, order_id: int) -> None:
    """
    Cree la remuneration due pour ce colis remis.

    Echec ABSORBE : une remuneration manquee se rattrape, un point relais
    empeche de rendre son colis, non.
    """
    relais = getattr(colis, "relay_point", None)
    if relais is None:
        return

    try:
        from apps.payments.settlements.services import compensate_relay_parcel

        from .actors import payee_for_relay_point

        # La categorie du colis vient de l'EXPEDITION : c'est le domaine
        # livraison qui la determine, pas le financier (principe P9).
        categorie = getattr(colis.shipment, "parcel_size", "") or ""

        compte = payee_for_relay_point(relais, create=True)
        compensate_relay_parcel(
            compte, order_id=order_id,
            parcel_reference=f"RELAY-PARCEL-{colis.pk}",
            parcel_size=categorie,
        )
    except Exception:
        logger.exception(
            "Remuneration du point relais impossible pour le colis #%s. "
            "La remise reste valide ; a rattraper manuellement.", colis.pk,
        )