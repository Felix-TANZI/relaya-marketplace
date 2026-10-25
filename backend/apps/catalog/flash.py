# backend/apps/catalog/flash.py
# Un seul prix flash partout — feuille de route D9 ; spec v2.1, R27.2 (prix affiché = vente flash, sinon promotion,
# sinon prix normal) :
#
#   « Utiliser l'heure du serveur pour le compte à rebours et servir un seul prix flash pour la liste, la fiche, le
#     panier et la commande. »
#
# La liste et la fiche (ProductSerializer), l'offre (ProductOfferSerializer) et la commande (annotate_effective_price,
# en SQL) choisissent la même campagne : active, FLASH d'abord, puis la plus ancienne (id). Le test de la fiche unique
# compare le calcul Python et le calcul SQL.

from django.utils import timezone

from .models import PromotionCampaign


def choisir(campagnes):
    """La campagne qui fait le prix parmi celles d'un produit (déjà chargées), ou None."""
    actives = [c for c in campagnes if c.is_active_now]
    if not actives:
        return None
    return min(actives, key=lambda c: (c.campaign_type != PromotionCampaign.CampaignType.FLASH, c.id))


def campagne_active(produit):
    return choisir(produit.promotion_campaigns.all())


def prix_final(produit, campagne=None) -> int:
    """R27.2 : le prix payé aujourd'hui (le même que annotate_effective_price)."""
    if campagne is not None:
        return campagne.promo_price_xaf
    if produit.compare_at_price and produit.compare_at_price > produit.price_xaf:
        return produit.price_xaf
    if produit.discount > 0:
        return produit.price_xaf - (produit.price_xaf * produit.discount // 100)
    return produit.price_xaf


def flash_actives(maintenant=None):
    """Les Flash Deals en cours, stock restant, pour tous les clients (prix, stock et compte à rebours identiques)."""
    from django.db.models import F

    maintenant = maintenant or timezone.now()
    return (PromotionCampaign.objects
            .filter(campaign_type=PromotionCampaign.CampaignType.FLASH, status=PromotionCampaign.Status.APPROVED,
                    starts_at__lte=maintenant, ends_at__gte=maintenant, stock_reserved__gt=F("stock_claimed"))
            .select_related("product", "product__category"))
