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


AVANCE, COMPTOIR = "avance", "comptoir"


def acompte_par_vendeur(order, groupes: dict) -> dict:
    """
    Spec v2.1, R42.3 (feuille de route D14) : la part des articles comprise dans l'avance d'une commande payee au
    comptoir (avance - frais_client, soit r_relais quand la livraison est offerte). Elle est prise sur les vendeurs
    dans l'ordre du panier, sans depasser la part de chacun ; le reste des articles se paie au comptoir.
    """
    reste = max(0, int(order.avance_xaf or 0) - int(order.delivery_fee_xaf or 0))
    parts = {}
    for vendeur_user, montant in groupes.items():
        parts[vendeur_user] = min(reste, max(0, montant))
        reste -= parts[vendeur_user]
    return parts


def _part(phase: str, montant: int, acompte: int) -> int:
    if phase == AVANCE:
        return acompte
    if phase == COMPTOIR:
        return montant - acompte
    return montant


@db_transaction.atomic
def prepare_payment(order, *, payer_msisdn: str, payer_operator: str,
                    idempotency_key: str = "", phase: str = ""):
    """
    Cree l'intention de paiement d'une commande, telle qu'elle est.

    Ne decoupe rien, ne deplace aucun article. Retourne l'intention creee.

    Une commande payee au comptoir du relais (spec v2.1, R42) a deux intentions : l'avance a la commande (phase
    AVANCE, choisie d'office), puis le reste au comptoir (phase COMPTOIR, `prepare_payment_comptoir`).

    Leve `CheckoutError` si le paiement ne peut pas etre prepare — l'appelant
    decide alors s'il annule la commande ou la laisse impayee.
    """
    if not phase and getattr(order, "paiement_comptoir", False):
        phase = AVANCE
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

    acomptes = acompte_par_vendeur(order, groupes) if phase else {}
    for vendeur_user, total_vendeur in groupes.items():
        montant = _part(phase, total_vendeur, acomptes.get(vendeur_user, 0))
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

        # Spec v2.1 : la commission de la sous-commande est celle que le service de commission a figee a la
        # commande (A7, R13.2) ; avec la TVA, c'est ce que le vendeur ne recoit pas (net_b, R22.1). Une commande
        # anterieure, sans commission figee, garde son taux d'origine.
        from apps.orders.models import CommissionSousCommande
        figee = CommissionSousCommande.objects.filter(order=order, vendor=vendeur_user).first()
        retenue = Money(figee.commission_b + figee.tva_b) if figee is not None else None
        if retenue is not None and phase:
            # R42 : la retenue est prise d'abord sur la part payee au comptoir, le reste sur l'acompte.
            sur_comptoir = min(retenue.amount, total_vendeur - acomptes.get(vendeur_user, 0))
            retenue = Money(sur_comptoir if phase == COMPTOIR else retenue.amount - sur_comptoir)

        # Chaque composant porte SON beneficiaire : sans cela, la
        # repartition attribuerait tout au dernier vendeur rencontre.
        composants.append(ComponentInput(
            EconomicComponent.GOODS,
            Money(montant),
            order_id=order.pk,
            payee_code=compte.payee_code,
            commission_rate=commission,
            commission_amount=retenue,
        ))
        types[compte.payee_code] = DomainPayeeType.VENDOR
        codes.setdefault(DomainPayeeType.VENDOR, compte.payee_code)

    # ── Le transport, de niveau paiement ─────────────────────────────────
    frais = int(order.delivery_fee_xaf or 0) if phase != COMPTOIR else 0
    if frais > 0:
        composants.append(ComponentInput(
            EconomicComponent.TRANSPORT, Money(frais),
        ))
        # Le transporteur n'est presque jamais connu au checkout : la part
        # reste en attente et sera reallouee a l'assignation. C'est le
        # comportement nominal, pas une anomalie.
        _resoudre_transporteur(order, codes, types)

    # ── Les frais Mobile Money payes par le client (spec v2.1, R02.2, R02.3) ──
    # L'intention vaut alors total_a_payer = base_paiement + frais_momo : BelivaY recoit au moins base_paiement
    # apres les frais du prestataire. Toute la part va a la plateforme, sans sequestre.
    frais_momo = int(getattr(order, "frais_momo_xaf", 0) or 0)
    if phase == COMPTOIR:  # R42.4, R02.6 : les frais Mobile Money du reste paye au comptoir
        frais_momo = int(order.frais_momo_comptoir_xaf or 0)
    if frais_momo > 0:
        composants.append(ComponentInput(EconomicComponent.PAYMENT_FEE, Money(frais_momo)))

    if not composants:
        raise CheckoutError(
            f"La commande #{order.pk} ne contient aucun montant a repartir."
        )

    # ── L'intention ──────────────────────────────────────────────────────
    # La cle d'idempotence porte l'identifiant de commande : un acheteur qui
    # valide deux fois ne cree qu'UNE intention.
    cle = idempotency_key or (f"order-{order.pk}-comptoir" if phase == COMPTOIR else f"order-{order.pk}")

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


def prepare_payment_comptoir(order, *, payer_msisdn: str, payer_operator: str):
    """Spec v2.1, R42.4 : l'intention du reste a payer au comptoir, une fois l'avance encaissee."""
    from apps.orders.models import Order

    if not order.paiement_comptoir or order.payment_status != Order.PaymentStatus.VALIDATED:
        raise CheckoutError(f"La commande #{order.pk} n'a pas de reste a payer au comptoir.")
    return prepare_payment(order, payer_msisdn=payer_msisdn, payer_operator=payer_operator, phase=COMPTOIR)


def prepare_payment_absence(order, *, payer_msisdn: str, payer_operator: str):
    """
    Spec v2.1, R51.4 et R51.5 : l'intention des frais d'absence, payes avant le retrait. Ils remunerent l'entreprise
    (supplement « client absent ») et le relais (part et garde du jour) par leurs propres circuits : tout va donc au
    produit de la plateforme, sans sequestre ; le client paie aussi les frais Mobile Money (R02.6).
    """
    import uuid as _uuid
    from datetime import timedelta

    from django.utils import timezone

    from apps.payments.application.collect import _config_snapshot
    from apps.payments.domain.money import Money
    from apps.payments.intents.models import PaymentIntent

    from .intent_orders import link_orders

    montant = int(order.frais_absence_xaf or 0) + int(order.frais_momo_absence_xaf or 0)
    if montant <= 0 or order.frais_absence_paye_le:
        raise CheckoutError(f"La commande #{order.pk} n'a pas de frais d'absence a payer.")
    cle = f"order-{order.pk}-absence"
    existante = PaymentIntent.objects.filter(idempotency_key=cle).first()
    if existante is not None:
        return existante
    intent = PaymentIntent(
        idempotency_key=cle, buyer=order.user, amount_xaf=montant, currency="XAF",
        distribution_plan={"total_distributed": montant, "currency": "XAF", "platform_revenue": montant,
                           "unresolved_rules": [], "needs_reallocation": False, "psp_cost": 0, "holds": []},
        correlation_id=str(_uuid.uuid4()), expires_at=timezone.now() + timedelta(minutes=30))
    intent.set_payer(payer_msisdn, payer_operator)
    intent.config_snapshot = _config_snapshot(Money(montant), payer_operator)
    intent.save()
    link_orders(intent, [order])
    return intent


def prepare_payment_course_retour(ret, *, payer_msisdn: str, payer_operator: str):
    """
    Spec v2.1, R69.1 : le client en tort paie la course de retour (r_retour), plus les frais Mobile Money (R02.6).
    BelivaY a deja paye la course a l'entreprise (grille, A10) : tout va au produit de la plateforme, sans sequestre.
    """
    import uuid as _uuid
    from datetime import timedelta

    from django.utils import timezone

    from apps.orders.retours import course_de_retour_due
    from apps.payments.application.collect import _config_snapshot
    from apps.payments.domain.money import Money
    from apps.payments.intents.models import PaymentIntent

    from .intent_orders import link_orders

    montant = course_de_retour_due(ret)
    if montant <= 0:
        raise CheckoutError(f"Le retour #{ret.pk} n'a pas de course de retour a payer.")
    cle = f"return-{ret.pk}-course-retour"
    existante = PaymentIntent.objects.filter(idempotency_key=cle).first()
    if existante is not None and not (existante.is_final or existante.is_expired):
        return existante
    if existante is not None:
        cle = f"{cle}-{_uuid.uuid4().hex[:8]}-course-retour"
    intent = PaymentIntent(
        idempotency_key=cle, buyer=ret.order.user, amount_xaf=montant, currency="XAF",
        distribution_plan={"total_distributed": montant, "currency": "XAF", "platform_revenue": montant,
                           "unresolved_rules": [], "needs_reallocation": False, "psp_cost": 0, "holds": []},
        correlation_id=str(_uuid.uuid4()), expires_at=timezone.now() + timedelta(minutes=30))
    intent.set_payer(payer_msisdn, payer_operator)
    intent.config_snapshot = _config_snapshot(Money(montant), payer_operator)
    intent.save()
    link_orders(intent, [ret.order])
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