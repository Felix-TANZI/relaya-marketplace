# backend/apps/whatsapp_assistant/bridge/tree.py
# Arbre des catégories et effectifs, commun aux deux sources du catalogue.

from collections import Counter
from dataclasses import dataclass

from .types import CategoryItem


@dataclass(frozen=True)
class RawCategory:
    id: int
    name: str
    parent_id: int | None
    image_ref: str | None


class CategoryTree:
    """Catégories dans l'ordre de l'admin, avec l'effectif de chaque branche."""

    def __init__(self, categories: list[RawCategory], direct_counts: Counter):
        self._by_id = {c.id: c for c in categories}
        self._children: dict[int | None, list[RawCategory]] = {}
        for category in categories:
            parent = category.parent_id if category.parent_id in self._by_id else None
            self._children.setdefault(parent, []).append(category)
        self._totals: dict[int, int] = {}
        for category in categories:
            self._total(category.id, direct_counts)

    def _total(self, category_id: int, direct: Counter) -> int:
        if category_id not in self._totals:
            self._totals[category_id] = 0   # garde-fou anti-boucle
            self._totals[category_id] = direct.get(category_id, 0) + sum(
                self._total(child.id, direct) for child in self._children.get(category_id, [])
            )
        return self._totals[category_id]

    def _item(self, category: RawCategory) -> CategoryItem:
        return CategoryItem(
            id=category.id,
            name=category.name,
            parent_id=category.parent_id,
            children_count=len(self._children.get(category.id, [])),
            product_count=self._totals.get(category.id, 0),
            image_ref=category.image_ref,
        )

    def roots(self) -> list[CategoryItem]:
        return [self._item(c) for c in self._children.get(None, [])]

    def children_of(self, category_id: int) -> list[CategoryItem]:
        return [self._item(c) for c in self._children.get(category_id, [])]

    def get(self, category_id: int) -> CategoryItem | None:
        category = self._by_id.get(category_id)
        return self._item(category) if category else None

    def subtree_ids(self, category_id: int) -> set[int]:
        ids, stack = set(), [category_id]
        while stack:
            current = stack.pop()
            if current in ids or current not in self._by_id:
                continue
            ids.add(current)
            stack.extend(child.id for child in self._children.get(current, []))
        return ids
