from __future__ import annotations

from dataclasses import dataclass

from django.core.cache import cache
from django.db.models import Avg, Count, Q

from apps.catalog.models import Product, ProductReview
from apps.orders.models import Dispute, Order, OrderItem

# Les stats vendeur (trust score, avis, ventes livrees, litiges) sont cheres a
# calculer (le trust score pose meme un verrou DB) et sont partagees par tous
# les produits d'un meme vendeur affiches sur une page catalogue. Une fraicheur
# a quelques minutes pres est largement suffisante ici : on met en cache un
# bundle par vendeur plutot que de tout recalculer a chaque produit affiche.
VENDOR_CATALOG_STATS_CACHE_TTL_SECONDS = 300


def _cached_vendor_catalog_stats(vendor) -> dict:
    from apps.accounts.models import TrustScoreProfile
    from apps.accounts.trust_score import calculate_trust_score

    cache_key = f"catalog:vendor_stats:{vendor.id}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    trust = calculate_trust_score(vendor, TrustScoreProfile.Role.VENDOR)
    trust_breakdown = trust.breakdown or {}
    satisfaction = trust_breakdown.get("satisfaction", {}).get("score")
    vendor_rating = None
    if satisfaction is None:
        vendor_rating = _approved_reviews_for_vendor(vendor.id).aggregate(avg=Avg("rating"))["avg"] or 0

    delivered_items = OrderItem.objects.filter(
        product__vendor_id=vendor.id,
        order__fulfillment_status__in=[
            Order.FulfillmentStatus.DELIVERED,
            Order.FulfillmentStatus.BUYER_CONFIRMED,
            Order.FulfillmentStatus.AUTO_CONFIRMED,
            Order.FulfillmentStatus.RELEASED_TO_VENDOR,
        ],
    ).count()
    vendor_disputes = Dispute.objects.filter(vendor_id=vendor.id).exclude(status="CLOSED").count()

    stats = {
        "trust_score": float(trust.score),
        "veto_active": bool(trust.veto_active),
        "satisfaction": satisfaction,
        "vendor_rating": vendor_rating,
        "delivered_items": delivered_items,
        "vendor_disputes": vendor_disputes,
    }
    cache.set(cache_key, stats, VENDOR_CATALOG_STATS_CACHE_TTL_SECONDS)
    return stats


@dataclass(frozen=True)
class OfferScoreBreakdown:
    price_score: float
    vendor_rating_score: float
    product_rating_score: float
    sales_score: float
    stock_score: float
    reliability_score: float
    penalty_score: float

    @property
    def total(self) -> float:
        return round(
            self.price_score
            + self.vendor_rating_score
            + self.product_rating_score
            + self.sales_score
            + self.stock_score
            + self.reliability_score
            - self.penalty_score,
            2,
        )


def _price_final(product: Product) -> int:
    if product.compare_at_price and product.compare_at_price > product.price_xaf:
        return product.price_xaf
    if product.discount > 0:
        return product.price_xaf - (product.price_xaf * product.discount // 100)
    return product.price_xaf


def _stock_quantity(product: Product) -> int:
    try:
        return int(product.inventory.quantity)
    except Exception:
        return 0


def _approved_reviews_for_vendor(vendor_id: int):
    return ProductReview.objects.filter(
        product__vendor_id=vendor_id,
        is_approved=True,
    )


def calculate_offer_score(product: Product, cheapest_price: int | None = None) -> OfferScoreBreakdown:
    """
    Score BelivaY V1 pour départager les offres d'une fiche master.

    Inspiration marketplace type Featured Offer :
    prix compétitif, stock, avis produit, santé vendeur, ventes réussies,
    litiges et fiabilité opérationnelle.
    """
    price = max(_price_final(product), 1)
    cheapest = max(cheapest_price or price, 1)
    price_score = max(0.0, min(30.0, 30.0 * cheapest / price))

    product_reviews = ProductReview.objects.filter(product=product, is_approved=True)
    product_rating = product_reviews.aggregate(avg=Avg("rating"))["avg"] or 0
    product_rating_score = min(15.0, float(product_rating) * 3.0)

    vendor_rating_score = 0.0
    reliability_score = 0.0
    sales_score = 0.0
    penalty_score = 0.0
    if product.vendor_id:
        stats = _cached_vendor_catalog_stats(product.vendor)
        satisfaction = stats["satisfaction"]
        vendor_rating = stats["vendor_rating"] or 0
        vendor_rating_score = min(20.0, float(satisfaction) * 0.2) if satisfaction is not None else min(20.0, float(vendor_rating) * 4.0)

        sales_score = min(10.0, stats["delivered_items"] * 0.5)

        penalty_score = min(25.0, stats["vendor_disputes"] * 5.0)
        reliability_score = min(10.0, stats["trust_score"] * 0.1)
        if stats["veto_active"]:
            penalty_score = max(penalty_score, 25.0)

    stock = _stock_quantity(product)
    stock_score = 0.0 if stock <= 0 else min(10.0, 4.0 + stock / 5.0)

    return OfferScoreBreakdown(
        price_score=round(price_score, 2),
        vendor_rating_score=round(vendor_rating_score, 2),
        product_rating_score=round(product_rating_score, 2),
        sales_score=round(sales_score, 2),
        stock_score=round(stock_score, 2),
        reliability_score=round(reliability_score, 2),
        penalty_score=round(penalty_score, 2),
    )


def ranked_offers(queryset):
    offers = list(queryset)
    if not offers:
        return []
    cheapest = min(_price_final(product) for product in offers)
    scored = [
        (calculate_offer_score(product, cheapest_price=cheapest).total, _price_final(product), product)
        for product in offers
    ]
    scored.sort(key=lambda item: (-item[0], item[1], item[2].id))
    return [product for _, _, product in scored]


def seller_score(vendor_id: int) -> dict:
    reviews = _approved_reviews_for_vendor(vendor_id)
    avg_rating = reviews.aggregate(avg=Avg("rating"))["avg"] or 0
    delivered_items = OrderItem.objects.filter(
        product__vendor_id=vendor_id,
        order__fulfillment_status__in=[
            Order.FulfillmentStatus.DELIVERED,
            Order.FulfillmentStatus.BUYER_CONFIRMED,
            Order.FulfillmentStatus.AUTO_CONFIRMED,
            Order.FulfillmentStatus.RELEASED_TO_VENDOR,
        ],
    ).count()
    open_disputes = Dispute.objects.filter(vendor_id=vendor_id).exclude(status="CLOSED").count()
    total = round(min(100.0, float(avg_rating) * 14 + min(20, delivered_items) - open_disputes * 6), 2)
    return {
        "vendor_id": vendor_id,
        "score": max(0.0, total),
        "avg_rating": round(float(avg_rating), 2),
        "reviews_count": reviews.count(),
        "delivered_items": delivered_items,
        "open_disputes": open_disputes,
    }
