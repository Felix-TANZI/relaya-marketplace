# backend/apps/payments/bridge/checkout.py
# Eclatement du panier par vendeur — Option A du referentiel.
#
# ─────────────────────────────────────────────────────────────────────────────
# POURQUOI ECLATER
#
#   Un panier contenant les produits de trois vendeurs pose une question
#   simple et sans reponse propre : que se passe-t-il si le vendeur A livre
#   et que le vendeur B annule ?
#
#   Avec UNE commande multi-vendeurs, le statut de livraison devient
#   ambigu, le litige est scope au panier entier, et le sequestre ne peut
#   pas etre libere partiellement sans bricolage.
#
#   Avec N commandes MONO-VENDEUR rattachees a UN paiement :
#     - l'acheteur paie une seule fois
#     - chaque commande a son propre cycle logistique
#     - chaque sequestre se libere independamment
#     - un litige sur A ne gele pas B
# ─────────────────────────────────────────────────────────────────────────────
#
# APPROCHE DELIBEREMENT CHIRURGICALE
#   On ne reecrit PAS OrderCreateSerializer. Le serializer continue de creer
#   sa commande avec sa propre logique — frais de livraison, snapshot de
#   commission, notifications, expedition, historique. On EGRENE ensuite
#   cette commande en N si elle contient plusieurs vendeurs.
#
#   Moins de code touche, moins de regressions possibles, retour arriere
#   trivial.
#
# LES FRAIS DE LIVRAISON RESTENT SUR LA COMMANDE PRINCIPALE
#   Ils sont MUTUALISES sur le panier : une seule course, un seul trajet.
#   Les repartir entre vendeurs serait arbitraire. Cote financier, le
#   composant TRANSPORT est de niveau PAIEMENT, avec order_id nul —
#   exactement coherent.

from __future__ import annotations

import logging
import uuid

from django.db import transaction as db_transaction

logger = logging.getLogger("apps.payments.checkout")


class CheckoutError(Exception):
    """Erreur d'eclatement ou de creation d'intention."""


def vendors_of(order) -> set:
    """Utilisateurs vendeurs presents dans une commande."""
    return {
        item.product.vendor
        for item in order.items.select_related("product")
        if getattr(item.product, "vendor_id", None)
    }


def is_multi_vendor(order) -> bool:
    return len(vendors_of(order)) > 1


@db_transaction.atomic
def split_order_by_vendor(order) -> list:
    """
    Egrene une commande multi-vendeurs en N commandes mono-vendeur.

    La commande d'origine est CONSERVEE et devient la commande du premier
    vendeur : son identifiant reste valide, aucun lien casse, aucune
    notification deja emise invalidee.

    Retourne la liste complete des commandes, la principale en tete.
    Idempotent : une commande deja mono-vendeur est retournee telle quelle.
    """
    from apps.orders.models import Order, OrderItem

    order = Order.objects.select_for_update().get(pk=order.pk)

    if order.payment_status != Order.PaymentStatus.PENDING:
        raise CheckoutError(
            f"La commande #{order.pk} est en {order.payment_status} : "
            "l'eclatement n'est possible qu'avant paiement."
        )

    articles = list(order.items.select_related("product").all())
    groupes: dict = {}
    for article in articles:
        vendeur = getattr(article.product, "vendor_id", None)
        groupes.setdefault(vendeur, []).append(article)

    if len(groupes) <= 1:
        return [order]

    # Le premier groupe reste sur la commande d'origine.
    cles = list(groupes)
    principale_cle = cles[0]
    resultat = [order]

    for cle in cles[1:]:
        lignes = groupes[cle]
        sous_total = sum(a.line_total_xaf for a in lignes)

        nouvelle = Order.objects.create(
            user=order.user,
            customer_email=order.customer_email,
            customer_phone=order.customer_phone,
            delivery_method=order.delivery_method,
            city=order.city,
            address=order.address,
            note=order.note,
            subtotal_xaf=sous_total,
            # Les frais de livraison restent sur la commande principale :
            # une seule course, un seul trajet, un cout mutualise.
            delivery_fee_xaf=0,
            total_xaf=sous_total,
            commission_rate_snapshot=order.commission_rate_snapshot,
            payment_status=Order.PaymentStatus.PENDING,
            fulfillment_status=Order.FulfillmentStatus.CREATED,
            escrow_status=Order.EscrowStatus.PENDING,
        )
        OrderItem.objects.filter(pk__in=[a.pk for a in lignes]).update(order=nouvelle)
        resultat.append(nouvelle)

    # Recalcul de la commande principale, une fois ses articles determines.
    restants = groupes[principale_cle]
    sous_total_principal = sum(a.line_total_xaf for a in restants)
    Order.objects.filter(pk=order.pk).update(
        subtotal_xaf=sous_total_principal,
        total_xaf=sous_total_principal + order.delivery_fee_xaf,
    )
    order.refresh_from_db()

    logger.info("Commande #%s eclatee en %s commandes mono-vendeur",
                order.pk, len(resultat))
    return resultat


# ─────────────────────────────────────────────────────────────────────────────
# INTENTION DE PAIEMENT COUVRANT LES N COMMANDES
# ─────────────────────────────────────────────────────────────────────────────

@db_transaction.atomic
def build_intent_for_orders(orders: list, *, buyer, payer_msisdn: str,
                            payer_operator: str, idempotency_key: str = ""):
    """
    Cree UNE intention de paiement couvrant N commandes.

    L'acheteur paie une seule fois, quel que soit le nombre de vendeurs.
    Chaque composant GOODS porte son order_id ; le composant TRANSPORT est
    de niveau PAIEMENT et n'en porte aucun.
    """
    from decimal import Decimal

    from apps.payments.application.collect import create_payment_intent
    from apps.payments.domain.distribution import ComponentInput
    from apps.payments.domain.enums import EconomicComponent
    from apps.payments.domain.enums import PayeeType as DomainPayeeType
    from apps.payments.domain.money import Money
    from apps.payments.payees.models import PayeeType

    from .actors import payee_for_vendor
    from .intent_orders import link_orders

    if not orders:
        raise CheckoutError("Aucune commande a couvrir.")

    composants = []
    codes: dict = {}
    types: dict = {}
    frais_livraison = 0

    for commande in orders:
        frais_livraison += commande.delivery_fee_xaf or 0
        if not commande.subtotal_xaf:
            continue

        vendeurs = vendors_of(commande)
        if len(vendeurs) > 1:
            raise CheckoutError(
                f"La commande #{commande.pk} contient encore "
                f"{len(vendeurs)} vendeurs. Eclater avant de creer "
                "l'intention (Option A)."
            )

        code = None
        if vendeurs:
            from apps.vendors.models import VendorProfile
            profil = VendorProfile.objects.filter(
                user=next(iter(vendeurs))).first()
            if profil is not None:
                compte = payee_for_vendor(profil, create=True)
                code = compte.payee_code
                codes[DomainPayeeType.VENDOR] = code
                types[code] = DomainPayeeType.VENDOR

        composants.append(ComponentInput(
            EconomicComponent.GOODS,
            Money(commande.subtotal_xaf),
            order_id=commande.pk,
            commission_rate=Decimal(str(commande.commission_rate_snapshot or 0)),
        ))

    if frais_livraison > 0:
        composants.append(ComponentInput(
            EconomicComponent.TRANSPORT, Money(frais_livraison),
        ))
        # Le transporteur n'est pas encore connu au checkout : le composant
        # est calcule et le beneficiaire resolu a l'assignation (Lot 7).
        _ajouter_transporteur_si_connu(orders, codes, types)

    if not composants:
        raise CheckoutError("Aucun montant a encaisser.")

    cle = idempotency_key or f"cart-{orders[0].pk}-{uuid.uuid4().hex[:8]}"

    intent = create_payment_intent(
        buyer=buyer, idempotency_key=cle, components=composants,
        payee_codes=codes, payee_types=types,
        payer_msisdn=payer_msisdn, payer_operator=payer_operator,
        correlation_id=f"cart-{orders[0].pk}",
    )
    link_orders(intent, orders)
    return intent


def _ajouter_transporteur_si_connu(orders, codes, types) -> None:
    """
    Resout le transporteur si une expedition lui est deja affectee.

    Au checkout, c'est rarement le cas : la part transport revient alors
    entierement a la plateforme, conformement a la regle de repartition qui
    attribue le reliquat au PLATFORM.
    """
    from apps.payments.domain.enums import PayeeType as DomainPayeeType

    from .actors import payee_for_delivery_company

    for commande in orders:
        expedition = getattr(commande, "shipment", None)
        livreur = getattr(expedition, "courier", None) if expedition else None
        organisation = getattr(livreur, "delivery_organization", None) if livreur else None
        if organisation is not None:
            compte = payee_for_delivery_company(organisation, create=True)
            codes[DomainPayeeType.DELIVERY_COMPANY] = compte.payee_code
            types[compte.payee_code] = DomainPayeeType.DELIVERY_COMPANY
            return


# ─────────────────────────────────────────────────────────────────────────────
# POINT D'ENTREE UNIQUE
# ─────────────────────────────────────────────────────────────────────────────

@db_transaction.atomic
def checkout(order, *, payer_msisdn: str, payer_operator: str,
             idempotency_key: str = "") -> tuple:
    """
    Eclate le panier et cree l'intention de paiement.

    UNE SEULE LIGNE a appeler depuis OrderCreateView :

        orders, intent = checkout(
            order, payer_msisdn=..., payer_operator=...,
        )

    Retourne (commandes, intention).
    """
    commandes = split_order_by_vendor(order)
    intent = build_intent_for_orders(
        commandes, buyer=order.user, payer_msisdn=payer_msisdn,
        payer_operator=payer_operator, idempotency_key=idempotency_key,
    )
    return commandes, intent


def orders_of_intent(intent) -> list:
    from .intent_orders import orders_for_intent
    return list(orders_for_intent(intent))