# backend/apps/payments/bridge/checkout_v2.py
# Creer l'intention SANS eclater la commande.
#
# ─────────────────────────────────────────────────────────────────────────────
# POURQUOI UN SECOND CHEMIN
#
# `checkout()` eclate le panier en N commandes mono-vendeur. Il datait
# d'avant la regle mere « un colis par vendeur ET PAR COMMANDE » :
# `OrderCreateSerializer` cree deja un Shipment par vendeur SUR LA MEME
# commande.
#
# Appeler les deux arrachait les articles des vendeurs 2..N vers de
# nouvelles commandes, laissant les Shipment orphelins de leurs articles.
# L'appel a donc ete retire — et le module financier s'est retrouve
# DEBRANCHE : plus aucune intention, plus aucun sequestre.
#
# Cette fonction retablit le lien sans toucher aux commandes.
#
# ─────────────────────────────────────────────────────────────────────────────
# UN COMPOSANT PAR VENDEUR, SUR LA MEME COMMANDE
#
# La cle d'unicite d'un sequestre est (intent, order_id, payee, component).
# Le `payee` distingue deja les vendeurs : deux vendeurs sur une commande
# produisent deux sequestres GOODS, sans conflit.
#
# Chaque composant porte donc SON `payee_code`, au lieu de laisser la
# repartition deviner un beneficiaire unique.
# ─────────────────────────────────────────────────────────────────────────────

from __future__ import annotations

import logging
import uuid
from collections import defaultdict
from decimal import Decimal

from django.db import transaction as db_transaction

logger = logging.getLogger("apps.payments.bridge.checkout_v2")


class CheckoutError(Exception):
    """Le paiement ne peut pas etre prepare."""


def _lignes_par_vendeur(order) -> dict:
    """
    Regroupe les articles d'une commande par vendeur.

    On s'appuie sur `OrderItem.product.vendor`, la meme source que celle qui
    a servi a creer les Shipment. Deux verites divergentes produiraient des
    sequestres qui ne correspondent a aucun colis.
    """
    groupes: dict = defaultdict(int)
    for ligne in order.items.select_related("product").all():
        produit = getattr(ligne, "product", None)
        vendeur = getattr(produit, "vendor", None) if produit else None
        if vendeur is None:
            # Un article sans vendeur ne peut etre attribue a personne. On
            # l'ignore plutot que de l'affecter au hasard — le controle de
            # coherence plus bas le detectera.
            continue
        groupes[vendeur] += int(ligne.line_total_xaf or 0)
    return dict(groupes)


@db_transaction.atomic
def prepare_payment(order, *, payer_msisdn: str, payer_operator: str,
                    idempotency_key: str = ""):
    """
    Cree l'intention de paiement d'une commande, telle qu'elle est.

    Ne decoupe rien, ne deplace aucun article. Retourne l'intention creee.

    Leve `CheckoutError` si le paiement ne peut pas etre prepare — l'appelant
    decide alors s'il annule la commande ou la laisse impayee.
    """
    from apps.payments.application.collect import create_payment_intent
    from apps.payments.domain.distribution import ComponentInput
    from apps.payments.domain.enums import EconomicComponent
    from apps.payments.domain.enums import PayeeType as DomainPayeeType
    from apps.payments.domain.money import Money

    from .actors import payee_for_vendor
    from .intent_orders import link_orders

    if order is None:
        raise CheckoutError("Aucune commande a couvrir.")

    total = int(order.total_xaf or 0)
    if total <= 0:
        raise CheckoutError("Le montant de la commande est nul.")

    composants: list[ComponentInput] = []
    codes: dict = {}
    types: dict = {}
    commission = Decimal(str(order.commission_rate_snapshot or 0))

    # ── Un composant GOODS par vendeur ───────────────────────────────────
    groupes = _lignes_par_vendeur(order)
    total_articles = sum(groupes.values())

    if total_articles and total_articles != int(order.subtotal_xaf or 0):
        # Un ecart signale un article sans vendeur, ou un sous-total qui ne
        # correspond plus aux lignes. On refuse plutot que de repartir un
        # montant faux.
        raise CheckoutError(
            f"Incoherence sur la commande #{order.pk} : les lignes totalisent "
            f"{total_articles} XAF pour un sous-total de "
            f"{order.subtotal_xaf} XAF."
        )

    from apps.vendors.models import VendorProfile

    for vendeur_user, montant in groupes.items():
        if montant <= 0:
            continue
        profil = VendorProfile.objects.filter(user=vendeur_user).first()
        if profil is None:
            raise CheckoutError(
                f"Le vendeur {vendeur_user} n'a pas de profil vendeur. "
                "Impossible de lui attribuer sa part."
            )
        compte = payee_for_vendor(profil, create=True)
        if compte is None:
            raise CheckoutError(
                f"Aucun compte financier pour le vendeur {vendeur_user}."
            )

        # Chaque composant porte SON beneficiaire : sans cela, la
        # repartition attribuerait tout au dernier vendeur rencontre.
        composants.append(ComponentInput(
            EconomicComponent.GOODS,
            Money(montant),
            order_id=order.pk,
            payee_code=compte.payee_code,
            commission_rate=commission,
        ))
        types[compte.payee_code] = DomainPayeeType.VENDOR
        codes.setdefault(DomainPayeeType.VENDOR, compte.payee_code)

    # ── Le transport, de niveau paiement ─────────────────────────────────
    frais = int(order.delivery_fee_xaf or 0)
    if frais > 0:
        composants.append(ComponentInput(
            EconomicComponent.TRANSPORT, Money(frais),
        ))
        # Le transporteur n'est presque jamais connu au checkout : la part
        # reste en attente et sera reallouee a l'assignation. C'est le
        # comportement nominal, pas une anomalie.
        _resoudre_transporteur(order, codes, types)

    if not composants:
        raise CheckoutError(
            f"La commande #{order.pk} ne contient aucun montant a repartir."
        )

    # ── L'intention ──────────────────────────────────────────────────────
    # La cle d'idempotence porte l'identifiant de commande : un acheteur qui
    # valide deux fois ne cree qu'UNE intention.
    cle = idempotency_key or f"order-{order.pk}"

    intent = create_payment_intent(
        buyer=order.user,
        idempotency_key=cle,
        components=composants,
        payee_codes=codes,
        payee_types=types,
        payer_msisdn=payer_msisdn,
        payer_operator=payer_operator,
    )

    link_orders(intent, [order])

    logger.info(
        "Intention %s creee pour la commande #%s : %s XAF, %s composant(s), "
        "%s vendeur(s).",
        intent.reference, order.pk, intent.amount_xaf, len(composants),
        len(groupes),
    )
    return intent


def _resoudre_transporteur(order, codes: dict, types: dict) -> None:
    """
    Rattache l'entreprise de livraison SI elle est deja connue.

    Au checkout c'est rare : le transporteur est assigne plus tard. La part
    reste alors dans `unresolved_rules` et `reallocate_unresolved` lui
    trouvera son beneficiaire a l'assignation.
    """
    from apps.payments.domain.enums import PayeeType as DomainPayeeType

    from .actors import payee_for_delivery_company

    try:
        from apps.shipping.models import Shipment

        expedition = Shipment.objects.filter(
            order=order, courier__isnull=False,
        ).select_related("courier__delivery_organization").first()
        if expedition is None:
            return

        organisation = getattr(
            getattr(expedition, "courier", None),
            "delivery_organization", None,
        )
        if organisation is None:
            return

        compte = payee_for_delivery_company(organisation, create=True)
        if compte is not None:
            codes[DomainPayeeType.DELIVERY_COMPANY] = compte.payee_code
            types[compte.payee_code] = DomainPayeeType.DELIVERY_COMPANY

    except Exception:
        # Un transporteur non resolu n'est pas une erreur : c'est le cas
        # nominal. On ne casse jamais un paiement pour cela.
        logger.debug("Transporteur non resolu pour la commande #%s.",
                     order.pk, exc_info=True)