# backend/apps/orders/reassignment.py
#
# Spec v2.1, R35 (bascule vers un autre vendeur) — remplace les 4 conditions du cas 6.2 décrites ci-dessous pour le
# choix de la remplaçante (find_reassignment_candidate) ; le reste du mécanisme est inchangé.
#
# Cas 6.2 (Regles_Systeme_DEV v2.0 §6.2) — réattribution automatique d'un
# article dont le vendeur ne prépare pas à temps. N'AGIT que si les 4
# conditions strictes sont réunies simultanément :
#   - même Master Produit
#   - même état (neuf, reconditionné, occasion)
#   - prix inférieur ou égal
#   - même zone que le vendeur remplacé
# "Si une seule condition manque, on propose au client, on n'impose pas."
# → cette fonction ne fait RIEN d'autre que chercher un remplaçant et
# basculer l'article quand les 4 conditions tiennent ; sinon elle retourne
# None sans rien modifier, laissant la décision à un humain.

from apps.catalog.models import Product


def _destination(order):
    """Destination de la commande, comme au paiement (A1, A9)."""
    from apps.orders import frais

    if order.delivery_method == "PICKUP" and order.relay_point_id:
        return frais.destination_relais(order.relay_point)
    return frais.destination_domicile(order.district, order.delivery_latitude, order.delivery_longitude)


def find_reassignment_candidate(order_item):
    """Spec v2.1, R35.2 : parmi les autres offres en course pour la destination de la commande (A6), celles dont
    trust ≥ r_trust_rempl et dont prix − prix payé ≤ min(r_ecart_rempl × prix payé ; commission_b) ; la remplaçante
    est celle de plus grand retard, puis de plus grand score (moteur BV-DEV-09). Une remplaçante plus chère suppose
    l'avance de l'écart par BelivaY (R35.3), qui relève du module financier : elle n'est pas retenue ici. Même fiche
    maître, même état. None sans remplaçante (le reste est décidé par un humain)."""
    from apps.catalog.meilleure_offre import journaliser, meilleure_offre
    from apps.orders.frais import FraisImpossibles
    from apps.orders.models import CommissionSousCommande
    from apps.regles import services as regles

    product = order_item.product
    if not product.master_id:
        return None
    autres = Product.objects.filter(master_id=product.master_id, is_active=True, moderation_status="APPROVED",
                                    inventory__quantity__gt=0).exclude(vendor_id=product.vendor_id)
    if product.condition_id:
        autres = autres.filter(condition_id=product.condition_id)
    if product.variant_id:
        autres = autres.filter(variant_id=product.variant_id)
    try:
        destination = _destination(order_item.order)
    except FraisImpossibles:
        return None
    r = meilleure_offre(list(autres.select_related("vendor", "master", "inventory")), destination)
    if r is None:
        return None
    prix_paye = order_item.price_xaf_snapshot
    figee = CommissionSousCommande.objects.filter(order=order_item.order, vendor_id=product.vendor_id).first()
    commission_b = figee.commission_b if figee is not None else prix_paye
    candidates = [{"id": o["id"], "prix": o["prix"], "trust": o["trust"], "retard": o["retard"], "score": o["score"]}
                  for o in r["en_course"] if o["prix"] <= prix_paye]
    choix = regles.moteur().bascule(prix_paye, commission_b, candidates)
    if choix["remplacante"] is None:
        return None
    journaliser(product.master, destination, {**r, "retenue": choix["remplacante"]}, "bascule", order_item.order)  # R27.7
    return Product.objects.get(pk=choix["remplacante"])


def attempt_automatic_reassignment(order_item, *, reason: str = ""):
    """
    Bascule l'article sur la remplaçante si elle existe (apps.orders.bascule : nouveau colis, échéance et commission
    propres, prix payé par le client inchangé, séquestre du vendeur défaillant gelé). Retourne la remplaçante, ou
    None sans rien modifier.
    """
    from .bascule import basculer

    replacement = find_reassignment_candidate(order_item)
    if replacement is None:
        return None
    basculer(order_item, replacement, reason)
    return replacement
