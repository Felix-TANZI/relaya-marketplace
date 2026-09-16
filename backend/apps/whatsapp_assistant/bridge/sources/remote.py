# backend/apps/whatsapp_assistant/bridge/sources/remote.py
# Source « remote » : le catalogue tel que le montre le site en ligne, lu par
# son API publique (WHATSAPP_CATALOG_API_URL, ex. https://belivay.com).
# L'assistant présente exactement ce que voit un visiteur de Belivay.com,
# rafraîchi toutes les WHATSAPP_CATALOG_CACHE_SECONDS (défaut : 60 s).

import logging
from collections import Counter

import requests
from django.core.cache import cache

from apps.whatsapp_assistant.conf import get_config

from ..tree import CategoryTree, RawCategory
from ..types import CatalogUnavailable, ProductItem

logger = logging.getLogger("apps.whatsapp_assistant")

TIMEOUT_SECONDS = 10
MAX_PAGES = 10          # 10 × 100 articles
MAX_PRODUCTS = 100
CACHE_PREFIX = "whatsapp:catalog:"


def _base() -> str:
    return get_config().catalog_api_url.rstrip("/")


def _get(path_or_url: str, params: dict | None = None) -> dict | list:
    url = path_or_url if path_or_url.startswith("http") else f"{_base()}{path_or_url}"
    try:
        response = requests.get(url, params=params, timeout=TIMEOUT_SECONDS, headers={"Accept": "application/json"})
    except requests.RequestException as error:
        raise CatalogUnavailable(f"{url} injoignable : {error}") from error
    if response.status_code == 404:
        return {}
    if response.status_code >= 400:
        raise CatalogUnavailable(f"{url} a répondu {response.status_code}")
    try:
        return response.json()
    except ValueError as error:
        raise CatalogUnavailable(f"{url} n'a pas renvoyé de JSON") from error


def _cached(key: str, loader):
    value = cache.get(CACHE_PREFIX + key)
    if value is None:
        value = loader()
        cache.set(CACHE_PREFIX + key, value, get_config().catalog_cache_seconds)
    return value


# ── Catégories ──────────────────────────────────────────────────────────────

def _raw_tree() -> list:
    return _cached("tree", lambda: _get("/api/catalog/categories/tree/") or [])


def category_tree() -> CategoryTree:
    raw: list[RawCategory] = []

    def walk(nodes, parent_id):
        for node in sorted(nodes, key=lambda n: (n.get("display_order", 0), n.get("name", ""))):
            if not node.get("is_active", True) or node.get("is_deprecated"):
                continue
            raw.append(RawCategory(node["id"], node["name"], parent_id, node.get("image_url")))
            walk(node.get("children") or [], node["id"])

    walk(_raw_tree(), None)
    direct = Counter(_category_id(p) for p in _all_products().values())
    return CategoryTree(raw, direct)


# ── Produits ────────────────────────────────────────────────────────────────

def _load_all_products() -> dict:
    products, url, params = {}, "/api/catalog/products/", {"page_size": 100, "is_active": "true"}
    for _ in range(MAX_PAGES):
        page = _get(url, params)
        results = page.get("results", []) if isinstance(page, dict) else page
        for product in results:
            products[product["id"]] = product
        url, params = (page.get("next") if isinstance(page, dict) else None), None
        if not url:
            break
    return products


def _all_products() -> dict:
    return _cached("products", _load_all_products)


def _category_id(product: dict) -> int | None:
    category = product.get("category")
    return category.get("id") if isinstance(category, dict) else category


def product_ids_in_category(category_id: int) -> list[int]:
    wanted = category_tree().subtree_ids(category_id)
    products = [p for p in _all_products().values() if _category_id(p) in wanted]
    products.sort(key=lambda p: p.get("created_at") or "", reverse=True)
    return [p["id"] for p in products[:MAX_PRODUCTS]]


def search_product_ids(query: str) -> tuple[list[int], str]:
    def load():
        return _get("/api/catalog/products/", {"search": query, "page_size": MAX_PRODUCTS, "is_active": "true"})

    page = _cached(f"search:{query.lower()[:80]}", load)
    results = page.get("results", []) if isinstance(page, dict) else []
    for product in results:                          # pour les fiches ouvertes ensuite
        cache.set(f"{CACHE_PREFIX}product:{product['id']}", product, get_config().catalog_cache_seconds)
    mode = (page.get("search_meta") or {}).get("mode", "exact") if results else "empty"
    return [p["id"] for p in results], mode


def products_by_ids(ids: list[int]) -> list[ProductItem]:
    known = _all_products()
    items = []
    for product_id in ids:
        product = known.get(product_id) or cache.get(f"{CACHE_PREFIX}product:{product_id}")
        if product is None:
            product = _get(f"/api/catalog/products/{product_id}/") or None
        if product:
            items.append(_to_item(product))
    return items


def _to_item(product: dict) -> ProductItem:
    price_xaf = int(product.get("price_xaf") or 0)
    price = int(product.get("price_final") or price_xaf)
    compare_at = product.get("compare_at_price")
    if compare_at and int(compare_at) > price:
        old = int(compare_at)
    else:
        old = price_xaf if price_xaf > price else None
    images = sorted(product.get("images") or [], key=lambda i: (not i.get("is_primary"), i.get("order") or 0))
    image = next((i.get("image_url") or i.get("image") for i in images if i.get("image_url") or i.get("image")), None)
    return ProductItem(
        id=product["id"],
        title=product.get("title", ""),
        price=price,
        compare_at_price=old,
        shop=None,                                    # l'API publique ne l'expose pas
        rating=product.get("rating_average"),
        reviews=int(product.get("reviews_count") or 0),
        short_description=product.get("short_description") or "",
        image_ref=image if image and image.startswith("https://") else None,
        master_slug=product.get("master_slug"),
    )


def buy_url(master_slug: str | None) -> str | None:
    """
    Page d'achat du produit sur le site, seulement si elle s'ouvre : la page
    /product/<slug> charge la fiche maître, qui n'est publique qu'une fois validée.
    """
    if not master_slug:
        return None
    published = _cached(f"master:{master_slug}", lambda: bool(_get(f"/api/catalog/masters/{master_slug}/")))
    return f"{_base()}/product/{master_slug}" if published else None
