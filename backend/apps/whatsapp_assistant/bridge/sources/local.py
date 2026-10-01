# backend/apps/whatsapp_assistant/bridge/sources/local.py
# Source « local » : la base Belivay du serveur, avec les règles de la boutique :
#   - catégories : celles de l'admin, actives, non deprecated, hors branche masquée
#   - produits   : approuvés par l'admin, actifs, hors catégorie masquée
#   - prix, note : calculés par le serializer du site (même résultat)

from collections import Counter

from django.conf import settings

from apps.catalog.models import Category, MasterProduct, ModerationStatus, Product
from apps.catalog.search import smart_product_search
from apps.catalog.serializers import ProductSerializer

from ..tree import CategoryTree, RawCategory
from ..types import ProductItem

MAX_PRODUCTS = 100


def _sellable_products():
    return (
        Product.objects.filter(moderation_status=ModerationStatus.APPROVED, is_active=True)
        .exclude(category_id__in=Category.hidden_subtree_ids())
    )


def category_tree() -> CategoryTree:
    visible = (
        Category.objects.filter(is_active=True, is_deprecated=False)
        .exclude(id__in=Category.hidden_subtree_ids())
        .order_by("display_order", "name")
    )
    raw = [
        RawCategory(c.id, c.name, c.parent_id, c.image.name if c.image else None)
        for c in visible
    ]
    return CategoryTree(raw, Counter(_sellable_products().values_list("category_id", flat=True)))


def product_ids_in_category(category_id: int) -> list[int]:
    category = Category.objects.filter(pk=category_id).first()
    if category is None:
        return []
    return list(
        _sellable_products()
        .filter(category_id__in=category.get_subtree_ids())
        .order_by("-created_at")
        .values_list("id", flat=True)[:MAX_PRODUCTS]
    )


def search_product_ids(query: str) -> tuple[list[int], str]:
    results, meta = smart_product_search(_sellable_products(), query)
    ids = list(results.values_list("id", flat=True)[:MAX_PRODUCTS])
    return ids, ((meta or {}).get("mode", "exact") if ids else "empty")


def products_by_ids(ids: list[int]) -> list[ProductItem]:
    products = {
        p.id: p
        for p in _sellable_products()
        .filter(id__in=ids)
        .select_related("category", "vendor", "master")
        .prefetch_related("images", "promotion_campaigns", "master__images")
    }
    return [_to_item(products[i]) for i in ids if i in products]


def _to_item(product) -> ProductItem:
    data = ProductSerializer(product).data
    price = int(data.get("price_final") or product.price_xaf)
    vendor = product.vendor
    profile = getattr(vendor, "vendor_profile", None) if vendor else None
    return ProductItem(
        id=product.id,
        title=product.title,
        price=price,
        compare_at_price=_old_price(product.compare_at_price, product.price_xaf, price),
        shop=profile.business_name if profile else None,
        rating=data.get("rating_average"),
        reviews=int(data.get("reviews_count") or 0),
        short_description=product.short_description or "",
        image_ref=_image_name(product),
        master_slug=product.master.slug if product.master else None,
    )


def buy_url(master_slug: str | None) -> str | None:
    """Page d'achat du produit, seulement si elle s'ouvre (fiche publiée) et si le site est en HTTPS."""
    base = str(getattr(settings, "PUBLIC_SITE_URL", "") or "").rstrip("/")
    if not master_slug or not base.startswith("https://"):
        return None
    published = MasterProduct.objects.filter(slug=master_slug, moderation_status=ModerationStatus.APPROVED).exists()
    return f"{base}/product/{master_slug}" if published else None


def _old_price(compare_at: int | None, price_xaf: int, price: int) -> int | None:
    if compare_at and compare_at > price:
        return compare_at
    return price_xaf if price_xaf > price else None


def _image_name(product) -> str | None:
    for image in sorted(product.images.all(), key=lambda i: (not i.is_primary, i.order or 0)):
        if image.image:
            return image.image.name
    if product.master is not None:
        for image in product.master.images.all():
            if image.image:
                return image.image.name
    return None
