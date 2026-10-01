// frontend/src/data/storefrontCategories.ts
// Vitrine acheteur : les catégories viennent de la base (créées par l'admin,
// avec leur image). Les thèmes statiques ne servent plus que de secours visuel
// — photo et couleur d'une catégorie encore sans image — et de repli complet
// quand l'API est injoignable.

import {
  CATEGORY_THEMES,
  findThemeForCategory,
  getCategoryTheme,
  matchesCategory,
  type CategoryTheme,
} from "@/data/categoryThemes";
import { categoryIcon } from "@/data/categoryIcon";
import { categorySubtreeIds, type CategoryTreeNode } from "@/services/api/categories";

export interface StorefrontCategory extends CategoryTheme {
  /** Catégorie en base ; `null` pour « Tout voir » et pour le repli hors ligne. */
  node: CategoryTreeNode | null;
  /** Thème statique rapproché : secours visuel et correspondance des produits de démo. */
  themeSlug: string | null;
  /** Vrai quand l'image vient de l'admin (et non d'un thème de secours). */
  hasOwnImage: boolean;
}

/* Couleurs des catégories qu'aucun thème ne rapproche, attribuées par position. */
const ACCENTS = ["#F47920", "#2563EB", "#DB2777", "#059669", "#7C3AED", "#0891B2", "#D97706", "#E11D48"];

const ALL_THEME = getCategoryTheme("all") as CategoryTheme;

function subcategoryLabel(count: number): string {
  if (count === 0) return "Catégorie principale";
  return count > 1 ? `${count} sous-catégories` : "1 sous-catégorie";
}

export function toStorefrontCategory(node: CategoryTreeNode, index = 0): StorefrontCategory {
  const theme = findThemeForCategory(node);
  const children = node.children ?? [];
  const image = node.image_url || theme?.image || "";
  const thumb = node.image_url || theme?.thumb || "";

  return {
    slug: node.slug,
    name: node.name,
    shortName: node.name,
    icon: categoryIcon({ slug: node.slug, name: node.name, iconName: node.icon_name }),
    count: "",
    accent: theme?.accent ?? ACCENTS[index % ACCENTS.length],
    label: node.name,
    title: node.name,
    subtitle: subcategoryLabel(children.length),
    description: node.description || theme?.description || "",
    image,
    thumb,
    facets: children.map((child) => child.name),
    vendors: "",
    rating: "",
    delivery: theme?.delivery ?? "24–72h",
    node,
    themeSlug: theme?.slug ?? null,
    hasOwnImage: Boolean(node.image_url),
  };
}

function fromTheme(theme: CategoryTheme): StorefrontCategory {
  return { ...theme, node: null, themeSlug: theme.slug, hasOwnImage: false };
}

/**
 * « Tout voir » puis les catégories racines de la base, dans l'ordre choisi par
 * l'admin. Sans catégorie en base (API injoignable), les thèmes statiques.
 */
export function buildStorefrontCategories(tree: CategoryTreeNode[]): StorefrontCategory[] {
  if (tree.length === 0) return CATEGORY_THEMES.map(fromTheme);
  const roots = [...tree].sort(
    (a, b) => a.display_order - b.display_order || a.name.localeCompare(b.name, "fr"),
  );
  // Le compteur statique de « Tout voir » est indicatif : on ne le mêle pas aux vraies données.
  return [{ ...fromTheme(ALL_THEME), count: "" }, ...roots.map(toStorefrontCategory)];
}

interface ProductLike {
  category?: { id?: number; slug?: string; name?: string } | null;
}

/**
 * Le produit est-il dans cette catégorie (sous-catégories comprises) ?
 * Les produits de démonstration n'ont pas d'ids réels : on les rapproche par
 * le thème, comme avant.
 */
export function productInStorefrontCategory(
  product: ProductLike,
  category: StorefrontCategory | undefined,
  { mock = false } = {},
): boolean {
  if (!category || category.slug === "all") return true;
  if (mock || !category.node) {
    return category.themeSlug ? matchesCategory(product, category.themeSlug) : false;
  }
  const id = product.category?.id;
  return id !== undefined && categorySubtreeIds(category.node).has(id);
}
