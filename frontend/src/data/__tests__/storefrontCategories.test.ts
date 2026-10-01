import { describe, expect, it } from "vitest";
import {
  buildStorefrontCategories,
  productInStorefrontCategory,
  toStorefrontCategory,
} from "@/data/storefrontCategories";
import { CATEGORY_THEMES } from "@/data/categoryThemes";
import type { CategoryTreeNode } from "@/services/api/categories";

function node(partial: Partial<CategoryTreeNode> & Pick<CategoryTreeNode, "id" | "name" | "slug">): CategoryTreeNode {
  return {
    parent: null,
    level: 0,
    icon_name: "",
    image_url: null,
    description: "",
    display_order: 0,
    is_active: true,
    is_deprecated: false,
    requires_admin_approval: false,
    children: [],
    ...partial,
  };
}

const robes = node({ id: 11, name: "Robes", slug: "robes", parent: 10, level: 1, image_url: "https://cdn.test/robes.webp" });
const wax = node({ id: 12, name: "Pagnes & Wax", slug: "wax", parent: 10, level: 1 });
const mode = node({
  id: 10, name: "Mode Femme", slug: "mode-femme", display_order: 2,
  image_url: "https://cdn.test/mode.webp", children: [robes, wax],
});
const sport = node({ id: 20, name: "Sport", slug: "sport-db", display_order: 1 });
const inconnue = node({ id: 30, name: "Quincaillerie", slug: "quincaillerie", display_order: 3 });

describe("buildStorefrontCategories", () => {
  it("replie sur les thèmes statiques quand la base n'a rien renvoyé", () => {
    const categories = buildStorefrontCategories([]);
    expect(categories.map((c) => c.slug)).toEqual(CATEGORY_THEMES.map((t) => t.slug));
    expect(categories.every((c) => c.node === null)).toBe(true);
  });

  it("met « Tout voir » en tête puis les racines dans l'ordre de l'admin", () => {
    const categories = buildStorefrontCategories([mode, inconnue, sport]);
    expect(categories.map((c) => c.slug)).toEqual(["all", "sport-db", "mode-femme", "quincaillerie"]);
    expect(categories[0].count).toBe("");
  });
});

describe("toStorefrontCategory", () => {
  it("affiche l'image de l'admin et ses sous-catégories", () => {
    const category = toStorefrontCategory(mode);
    expect(category.image).toBe("https://cdn.test/mode.webp");
    expect(category.thumb).toBe("https://cdn.test/mode.webp");
    expect(category.hasOwnImage).toBe(true);
    expect(category.facets).toEqual(["Robes", "Pagnes & Wax"]);
    expect(category.subtitle).toBe("2 sous-catégories");
  });

  it("emprunte la photo du thème rapproché tant que l'admin n'a pas d'image", () => {
    const category = toStorefrontCategory(sport);
    const theme = CATEGORY_THEMES.find((t) => t.slug === "sport");
    expect(category.themeSlug).toBe("sport");
    expect(category.image).toBe(theme?.image);
    expect(category.hasOwnImage).toBe(false);
  });

  it("reste sans image quand aucun thème ne correspond", () => {
    const category = toStorefrontCategory(inconnue);
    expect(category.themeSlug).toBeNull();
    expect(category.image).toBe("");
    expect(category.thumb).toBe("");
  });
});

describe("productInStorefrontCategory", () => {
  const [, , modeCategory] = buildStorefrontCategories([sport, mode]);

  it("inclut les produits des sous-catégories", () => {
    expect(productInStorefrontCategory({ category: { id: 11 } }, modeCategory)).toBe(true);
    expect(productInStorefrontCategory({ category: { id: 10 } }, modeCategory)).toBe(true);
    expect(productInStorefrontCategory({ category: { id: 20 } }, modeCategory)).toBe(false);
  });

  it("accepte tout pour « Tout voir » et rapproche la démo par thème", () => {
    const all = buildStorefrontCategories([mode])[0];
    expect(productInStorefrontCategory({ category: { id: 999 } }, all)).toBe(true);

    const sportCategory = toStorefrontCategory(sport);
    expect(
      productInStorefrontCategory({ category: { id: 3, slug: "sport", name: "Sport" } }, sportCategory, { mock: true }),
    ).toBe(true);
  });
});
