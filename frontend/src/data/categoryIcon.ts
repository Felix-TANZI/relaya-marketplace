// frontend/src/data/categoryIcon.ts
// Icône d'une catégorie côté acheteur. Module neutre (sans composant) pour être
// partagé par la sidebar, le tiroir mobile et la vitrine sans import circulaire.

import {
  Baby,
  Dumbbell,
  Footprints,
  Home,
  Laptop,
  LayoutGrid,
  Package,
  Shirt,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { CATEGORY_THEMES } from "@/data/categoryThemes";

const ICONS: Record<string, LucideIcon> = {
  Baby, Dumbbell, Footprints, Home, Laptop, LayoutGrid, Package, Shirt,
  ShoppingBag, ShoppingCart, Smartphone, Sparkles,
};

const THEME_BY_SLUG = new Map(CATEGORY_THEMES.map((theme) => [theme.slug, theme]));

export function categoryIcon(category: { name: string; slug: string; iconName?: string }): LucideIcon {
  const theme = THEME_BY_SLUG.get(category.slug);
  if (theme) return theme.icon;
  if (category.iconName && ICONS[category.iconName]) return ICONS[category.iconName];
  const value = `${category.slug} ${category.name}`.toLowerCase();
  if (value.includes("phone") || value.includes("télé") || value.includes("smart")) return Smartphone;
  if (value.includes("électron") || value.includes("electron") || value.includes("ordinateur")) return Laptop;
  if (value.includes("mode") || value.includes("vêtement") || value.includes("vetement")) return Shirt;
  if (value.includes("chauss")) return Footprints;
  if (value.includes("sport")) return Dumbbell;
  if (value.includes("bébé") || value.includes("bebe") || value.includes("enfant")) return Baby;
  if (value.includes("maison") || value.includes("bureau")) return Home;
  if (value.includes("aliment") || value.includes("marché") || value.includes("marche")) return ShoppingCart;
  if (value.includes("beauté") || value.includes("beaute") || value.includes("santé")) return Sparkles;
  return category.slug === "all" ? ShoppingBag : Package;
}
