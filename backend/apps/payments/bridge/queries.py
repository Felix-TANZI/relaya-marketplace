# backend/apps/payments/bridge/queries.py
# Ce que le reste de l'application peut DEMANDER au module financier.
#
# ─────────────────────────────────────────────────────────────────────────────
# UNE SEULE PORTE, DANS LES DEUX SENS
#
# `events_in` fait entrer les evenements metier. Ce fichier fait sortir les
# reponses : « combien coutent ces frais ? », « quelle est la part du
# livreur sur ce colis ? ».
#
# Sans lui, chaque application refait le calcul dans son coin — avec ses
# propres montants en dur. C'est ce qui s'etait produit : 500 et 1000 XAF
# dans `orders/serializers.py`, 70 % dans `shipping/views.py`, 500 XAF
# d'indemnite dans `orders/views.py`.
#
# Quatre valeurs financieres, dans trois fichiers, hors de toute
# configuration et hors de toute gouvernance.
#
# ─────────────────────────────────────────────────────────────────────────────
# CES FONCTIONS NE LEVENT JAMAIS
#
# Un appelant qui affiche une estimation de frais ne doit pas planter parce
# qu'une regle manque. Chacune retourne une valeur de repli documentee, et
# journalise ce qui manque.
# ─────────────────────────────────────────────────────────────────────────────

from __future__ import annotations

import logging
from decimal import Decimal

logger = logging.getLogger("apps.payments.bridge.queries")


# ─────────────────────────────────────────────────────────────────────────────
# FRAIS DE LIVRAISON
# ─────────────────────────────────────────────────────────────────────────────

def delivery_fee_xaf(*, delivery_mode: str, vendors, destination_zone=None,
                     city: str = "") -> int:
    """
    Frais de livraison factures a l'acheteur.

    `vendors` : la liste des utilisateurs vendeurs du panier, dans l'ordre.

    Le premier est couvert par la base ; chaque suivant ajoute un supplement
    selon qu'il partage ou non la zone des precedents.

    Retourne 0 si aucun vendeur — il n'y a alors rien a livrer.
    """
    from apps.payments.config.delivery_pricing import resolve_pricing

    vendeurs = [v for v in (vendors or []) if v is not None]
    if not vendeurs:
        return 0

    bareme = resolve_pricing(delivery_mode, city)
    if bareme is None:
        # Aucun bareme configure. On le SIGNALE plutot que de facturer zero :
        # une livraison gratuite par accident coute a chaque commande.
        logger.error(
            "Aucun tarif de livraison configure pour le mode %s (ville %s). "
            "Frais factures a 0 — creer une DeliveryPricingRule.",
            delivery_mode, city or "toutes",
        )
        return 0

    total = bareme.base_xaf

    def _zone(vendeur):
        profil = getattr(vendeur, "vendor_profile", None)
        return getattr(profil, "zone_id", None) if profil else None

    zones_vues = set()
    premiere = _zone(vendeurs[0])
    if premiere:
        zones_vues.add(premiere)

    for vendeur in vendeurs[1:]:
        zone = _zone(vendeur)
        if zone and zone in zones_vues:
            total += bareme.extra_vendor_same_zone_xaf
        else:
            total += bareme.extra_vendor_other_zone_xaf
            if zone:
                zones_vues.add(zone)

    # La majoration de zone eloignee vient du modele logistique, pas du
    # bareme : elle depend de la destination, pas du mode de livraison.
    if bareme.apply_zone_surcharge and destination_zone is not None:
        tier = getattr(destination_zone, "tier", None)
        seuil = getattr(getattr(destination_zone, "Tier", None), "VAGUE_3", None)
        if tier is not None and seuil is not None and tier == seuil:
            total += int(getattr(destination_zone, "surcharge_xaf", 0) or 0)

    return int(total)


# ─────────────────────────────────────────────────────────────────────────────
# PART DU TRANSPORTEUR
# ─────────────────────────────────────────────────────────────────────────────

def carrier_share_ratio() -> Decimal:
    """
    Part des frais de transport revenant a l'entreprise de livraison.

    Lue depuis la REGLE DE REPARTITION active, jamais devinee. Un taux ecrit
    en dur ailleurs divergerait de ce que le module verse reellement — et
    l'ecart ne se verrait qu'au moment ou un partenaire compterait son du.
    """
    from apps.payments.config.models import DistributionRule

    try:
        regle = DistributionRule.current().filter(
            component=DistributionRule.Component.TRANSPORT,
            payee_type=DistributionRule.PayeeType.DELIVERY_COMPANY,
            basis=DistributionRule.Basis.PERCENT_OF_COMPONENT,
        ).first()
        if regle is not None and regle.value:
            return Decimal(str(regle.value)) / Decimal("100")
    except Exception:
        logger.debug("Regle de part transporteur illisible.", exc_info=True)

    # Aucune regle active : on retourne zero plutot qu'un taux invente.
    # Afficher 0 attire l'attention ; afficher 70 % laisserait croire que
    # tout va bien.
    logger.warning(
        "Aucune regle de repartition TRANSPORT vers DELIVERY_COMPANY. "
        "La part transporteur est annoncee a 0."
    )
    return Decimal("0")


def courier_share_xaf(*, delivery_fee_xaf: int, parcels_count: int = 1) -> int:
    """
    Part revenant au transporteur pour UN colis.

    Les frais de la commande sont divises entre ses colis, puis la part
    transporteur s'applique. C'est une ESTIMATION d'affichage : le montant
    reellement verse est celui du sequestre TRANSPORT.
    """
    if delivery_fee_xaf <= 0 or parcels_count <= 0:
        return 0
    part_colis = Decimal(delivery_fee_xaf) / Decimal(parcels_count)
    return int(part_colis * carrier_share_ratio())


# ─────────────────────────────────────────────────────────────────────────────
# INDEMNITES CONTRACTUELLES
# ─────────────────────────────────────────────────────────────────────────────

def course_cancellation_indemnity_xaf() -> int:
    """
    Indemnite due au livreur quand une course acceptee est annulee.

    Elle vivait en dur dans `orders/views.py` : 500 XAF, invisible et non
    modifiable sans recompiler.

    Retourne 0 si aucune regle n'est configuree — et le SIGNALE. Verser un
    montant invente serait pire que ne rien verser : personne ne saurait
    d'ou il vient.
    """
    from apps.payments.config.delivery_pricing import (
        CourierIndemnityRule, resolve_indemnity,
    )

    try:
        regle = resolve_indemnity(CourierIndemnityRule.Kind.COURSE_CANCELLED)
        if regle is not None:
            return int(regle.amount_xaf or 0)
    except Exception:
        logger.debug("Regle d'indemnite illisible.", exc_info=True)

    logger.warning(
        "Aucune indemnite de course annulee configuree. Aucun montant ne "
        "sera verse — creer une CourierIndemnityRule."
    )
    return 0

# ─────────────────────────────────────────────────────────────────────────────
# NUMEROS PAYEURS — DETECTION ANTI-FRAUDE
#
# `trust_score.py` interrogeait `PaymentTransaction.payer_phone`, l'ancien
# modele, qui stockait le numero EN CLAIR.
#
# Le nouveau module le chiffre et n'expose qu'une EMPREINTE. C'est mieux :
# comparer des empreintes suffit a detecter un numero partage, sans jamais
# manipuler le numero lui-meme.
# ─────────────────────────────────────────────────────────────────────────────


def payer_fingerprints_for_order(order_id: int) -> set[str]:
    """
    Empreintes des numeros ayant paye cette commande avec succes.

    Sert a reperer un acheteur qui se paie lui-meme via un compte complice.
    """
    from apps.payments.intents.models import PaymentIntent

    try:
        return {
            emp for emp in PaymentIntent.objects.filter(
                order_links__order_id=order_id,
                status=PaymentIntent.Status.SUCCEEDED,
            ).values_list("payer_msisdn_fingerprint", flat=True) if emp
        }
    except Exception:
        logger.debug("Empreintes payeur illisibles pour la commande %s.",
                     order_id, exc_info=True)
        return set()


def fingerprint_of(msisdn: str) -> str:
    """
    Empreinte d'un numero, pour le comparer sans le stocker.

    Permet a l'appelant de verifier « ce vendeur a-t-il paye sa propre
    commande ? » sans jamais dechiffrer quoi que ce soit.
    """
    if not msisdn:
        return ""
    try:
        from apps.payments.payees import crypto

        return crypto.fingerprint(str(msisdn).strip())
    except Exception:
        logger.debug("Empreinte incalculable.", exc_info=True)
        return ""


def shared_payer_numbers(min_accounts: int = 3) -> list[dict]:
    """
    Numeros ayant paye pour plusieurs acheteurs distincts.

    Retourne [{"fingerprint": ..., "buyer_ids": [...], "count": N}, ...].

    Un meme numero servant a trois comptes differents signale soit une
    famille, soit une fraude — c'est a l'analyse de trancher, pas a cette
    fonction.
    """
    from django.db.models import Count

    from apps.payments.intents.models import PaymentIntent

    try:
        partages = (
            PaymentIntent.objects
            .filter(status=PaymentIntent.Status.SUCCEEDED)
            .exclude(payer_msisdn_fingerprint="")
            .values("payer_msisdn_fingerprint")
            .annotate(distinct_buyers=Count("buyer", distinct=True))
            .filter(distinct_buyers__gte=min_accounts)
        )

        resultat = []
        for ligne in partages:
            empreinte = ligne["payer_msisdn_fingerprint"]
            acheteurs = list(
                PaymentIntent.objects
                .filter(payer_msisdn_fingerprint=empreinte,
                        status=PaymentIntent.Status.SUCCEEDED)
                .values_list("buyer_id", flat=True).distinct()
            )
            resultat.append({
                "fingerprint": empreinte,
                "buyer_ids": [b for b in acheteurs if b is not None],
                "count": ligne["distinct_buyers"],
            })
        return resultat

    except Exception:
        logger.debug("Detection de numeros partages impossible.",
                     exc_info=True)
        return []


def payments_of_order(order_id: int) -> list[dict]:
    """
    Historique des paiements d'une commande, pour affichage.

    Le numero n'est retourne que MASQUE : un ecran d'administration n'a pas
    besoin du numero complet, et l'afficher creerait une fuite a chaque
    capture d'ecran.
    """
    from apps.payments.intents.models import PaymentIntent

    try:
        intentions = PaymentIntent.objects.filter(
            order_links__order_id=order_id,
        ).order_by("-created_at")

        return [
            {
                "id": str(i.reference),
                "provider": i.provider_code or "",
                "status": i.status,
                "amount_xaf": i.amount_xaf,
                "payer_phone_masked": i.payer_msisdn_masked or "",
                # La reference prestataire vit sur la TENTATIVE : c'est
                # elle qui dialogue avec CamPay. On prend la derniere.
                "external_ref": (
                    getattr(i.attempts.order_by("-id").first(),
                            "provider_reference", "") or ""
                ),
                "created_at": i.created_at,
            }
            for i in intentions
        ]
    except Exception:
        logger.debug("Historique de paiement illisible pour la commande %s.",
                     order_id, exc_info=True)
        return []