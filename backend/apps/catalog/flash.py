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


def flash_ouvert() -> bool:
    """Interrupteur FF-FLASH. Fermé, une vente flash ne fait plus le prix nulle part (liste, fiche, panier, commande) :
    pas seulement la vitrine des Flash Deals (sécurité avant main 2)."""
    from apps.client_core import interrupteurs

    return interrupteurs.ouvert("FF-FLASH")


def choisir(campagnes):
    """La campagne qui fait le prix parmi celles d'un produit (déjà chargées), ou None."""
    actives = [c for c in campagnes if c.is_active_now]
    if actives and not flash_ouvert():
        actives = [c for c in actives if c.campaign_type != PromotionCampaign.CampaignType.FLASH]
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
    if not flash_ouvert():
        return PromotionCampaign.objects.none()
    return (PromotionCampaign.objects
            .filter(campaign_type=PromotionCampaign.CampaignType.FLASH, status=PromotionCampaign.Status.APPROVED,
                    starts_at__lte=maintenant, ends_at__gte=maintenant, stock_reserved__gt=F("stock_claimed"))
            .select_related("product", "product__category"))


# ── R34.5 : une hausse de plus de r_hausse_badge en r_hausse_badge_j retire l'accès aux ventes flash ────────────────

def hausse_recente(produit, maintenant=None) -> bool:
    """Vrai si le prix actuel dépasse de plus de r_hausse_badge le plus bas prix des r_hausse_badge_j derniers jours."""
    from datetime import timedelta
    from fractions import Fraction

    from apps.regles import services as regles

    from .models import PrixHistorique

    maintenant = maintenant or timezone.now()
    depuis = maintenant - timedelta(days=regles.reglage("r_hausse_badge_j"))
    prix = list(PrixHistorique.objects.filter(product=produit, le__gte=depuis).values_list("price_xaf", flat=True))
    # Le prix en vigueur au début de la période compte aussi : c'est le dernier relevé d'avant.
    avant = (PrixHistorique.objects.filter(product=produit, le__lt=depuis).values_list("price_xaf", flat=True)
             .first())
    if avant is not None:
        prix.append(avant)
    if not prix:
        return False
    plus_bas = min(prix)
    return Fraction(produit.price_xaf) > Fraction(plus_bas) * (1 + Fraction(str(regles.reglage("r_hausse_badge"))))


def noter_prix(produit) -> None:
    """Relève le prix d'une offre ; une hausse R34.5 suspend ses Flash Deals en cours ou en attente."""
    from .models import PrixHistorique

    dernier = PrixHistorique.objects.filter(product=produit).values_list("price_xaf", flat=True).first()
    if dernier == produit.price_xaf:
        return
    PrixHistorique.objects.create(product=produit, price_xaf=produit.price_xaf)
    if dernier is not None and hausse_recente(produit):
        PromotionCampaign.objects.filter(
            product=produit, campaign_type=PromotionCampaign.CampaignType.FLASH,
            status__in=[PromotionCampaign.Status.APPROVED, PromotionCampaign.Status.PENDING],
        ).update(status=PromotionCampaign.Status.SUSPENDED,
                 admin_note="R34.5 : hausse de prix de plus de r_hausse_badge en r_hausse_badge_j.")
