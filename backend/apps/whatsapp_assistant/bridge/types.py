# backend/apps/whatsapp_assistant/bridge/types.py
# Ce que le cerveau de l'assistant sait d'une catégorie et d'un article,
# quelle que soit la source du catalogue (base locale ou Belivay.com).

from dataclasses import dataclass


class CatalogUnavailable(Exception):
    """La source du catalogue ne répond pas (site en ligne injoignable…)."""


@dataclass(frozen=True)
class CategoryItem:
    id: int
    name: str
    parent_id: int | None
    children_count: int      # sous-catégories directes
    product_count: int       # articles en vente, sous-catégories comprises
    image_ref: str | None    # chemin dans le stockage Belivay, ou URL https


@dataclass(frozen=True)
class ProductItem:
    id: int
    title: str
    price: int
    compare_at_price: int | None
    shop: str | None
    rating: float | None
    reviews: int
    short_description: str
    image_ref: str | None
    master_slug: str | None   # fiche du produit sur le site : /product/<master_slug>
