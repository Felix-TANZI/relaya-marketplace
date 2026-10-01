# backend/apps/whatsapp_assistant/bridge/catalog.py
# Porte d'entrée du catalogue pour le cerveau de l'assistant. Elle choisit la
# source selon WHATSAPP_CATALOG_SOURCE :
#   local  (défaut) : la base Belivay du serveur — en production, sur le même serveur
#   remote          : le site en ligne (WHATSAPP_CATALOG_API_URL), en temps réel
# Le cerveau ne voit que CategoryItem / ProductItem, identiques pour les deux.

from apps.whatsapp_assistant.conf import get_config

from .sources import local, remote
from .types import CatalogUnavailable, CategoryItem, ProductItem

__all__ = [
    "CatalogUnavailable", "CategoryItem", "ProductItem",
    "root_categories", "child_categories", "get_category",
    "product_ids_in_category", "search_product_ids", "products_by_ids", "get_product", "buy_url",
]


def _source():
    return remote if get_config().catalog_source == "remote" else local


def root_categories() -> list[CategoryItem]:
    return _source().category_tree().roots()


def child_categories(category_id: int) -> list[CategoryItem]:
    return _source().category_tree().children_of(category_id)


def get_category(category_id: int) -> CategoryItem | None:
    return _source().category_tree().get(category_id)


def product_ids_in_category(category_id: int) -> list[int]:
    """Articles de la catégorie et de toutes ses sous-catégories, les plus récents d'abord."""
    return _source().product_ids_in_category(category_id)


def search_product_ids(query: str) -> tuple[list[int], str]:
    """Recherche du site (fautes tolérées). Renvoie (ids, mode) ; mode = exact, fuzzy, related, empty."""
    return _source().search_product_ids(query)


def products_by_ids(ids: list[int]) -> list[ProductItem]:
    """Fiches demandées, dans l'ordre demandé (les articles disparus entre-temps sont omis)."""
    return _source().products_by_ids(ids)


def get_product(product_id: int) -> ProductItem | None:
    items = products_by_ids([product_id])
    return items[0] if items else None


def buy_url(product: ProductItem) -> str | None:
    """Page du produit où l'acheter, ou None si elle ne s'ouvre pas encore (fiche non publiée)."""
    return _source().buy_url(product.master_slug)
